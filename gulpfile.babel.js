import gulp from "gulp";
import {spawn} from "child_process";
import hugoBin from "hugo-bin";
import gutil from "gulp-util";
import flatten from "gulp-flatten";
import postcss from "gulp-postcss";
import cssImport from "postcss-import";
import cssnext from "postcss-cssnext";
import BrowserSync from "browser-sync";
import webpack from "webpack";
import webpackConfig from "./webpack.conf";
import sass from "gulp-sass";
import autoprefixer from "gulp-autoprefixer";
import sourcemaps from "gulp-sourcemaps";
const browserSync = BrowserSync.create();
import runSequence from "run-sequence";
import imagemin from "gulp-imagemin";
import cache from "gulp-cache";
import discardUnused from "postcss-discard-unused";

// Hugo arguments
const hugoArgsDefault = ["-d", "../dist", "-s", "site", "-v"];
const hugoArgsPreview = ["--buildDrafts", "--buildFuture"];

// Development tasks
gulp.task("hugo", (cb) => buildSite(cb));
gulp.task("hugo-preview", (cb) => buildSite(cb, hugoArgsPreview));

// Run server tasks
gulp.task("server", ["hugo", "build-css", "js", "fonts"], (cb) => runServer(cb));
gulp.task("server-preview", ["hugo-preview", "build-css", "js", "fonts"], (cb) => runServer(cb));

// Build/production tasks
gulp.task("build", ["build-css", "js", "fonts"], (cb) => buildSite(cb, [], "production"));
gulp.task("build-preview", ["build-css", "js", "fonts"], (cb) => buildSite(cb, hugoArgsPreview, "production"));

/// build SCSS to CSS
gulp.task("build-css", function(callback) {
  runSequence("compile-scss",
    "css",
    callback);
});


// Compile CSS with PostCSS
gulp.task("css", () => (
  gulp.src("./src/css/*.css")
    .pipe(postcss([discardUnused(), cssImport({from: "./src/css/main.css"}), cssnext()]))
    .pipe(gulp.dest("./dist/css"))
    .pipe(browserSync.stream())
));

gulp.task("compile-scss", function() {
  return gulp.src("./src/scss/**/*.scss")
    .pipe(sourcemaps.init())
    .pipe(sass().on("error", sass.logError))
    .pipe(autoprefixer())
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("./src/css"))
    .pipe(browserSync.reload({
      stream: true
    }));
});

// Compile Javascript
gulp.task("js", (cb) => {
  const myConfig = Object.assign({}, webpackConfig);

  webpack(myConfig, (err, stats) => {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log("[webpack]", stats.toString({
      colors: true,
      progress: true
    }));
    browserSync.reload();
    cb();
  });
});

gulp.task("cache:clear", function(callback) {
  return cache.clearAll(callback);
});

gulp.task("images", function() {
  return gulp.src("./src/img/**/*.+(png|jpg|jpeg|gif|svg)")
    // Caching images that ran through imagemin
    .pipe(cache(imagemin([
      imagemin.gifsicle({interlaced: true}),
      imagemin.jpegtran({progressive: true}),
      imagemin.optipng({optimizationLevel: 5}),
      imagemin.svgo({plugins: [{removeViewBox: true}]})
    ], {
      verbose: true
    })))
    .pipe(gulp.dest("./site/static/img/"));
});

gulp.task("build-images", function(callback) {
  runSequence("cache:clear",
    "images",
    callback);
});
// Move all fonts in a flattened directory
gulp.task("fonts", () => (
  gulp.src("./src/fonts/**/*")
    .pipe(flatten())
    .pipe(gulp.dest("./dist/fonts"))
    .pipe(browserSync.stream())
));

// Development server with browsersync
function runServer() {
  browserSync.init({
    server: {
      baseDir: "./dist"
    }
  });
  gulp.watch("./src/js/**/*.js", ["js"]);
  gulp.watch("./src/css/**/*.css", ["css"]);
  gulp.watch("./src/fonts/**/*", ["fonts"]);
  gulp.watch("./site/**/*", ["hugo"]);
}

/**
 * Run hugo and build the site
 */
function buildSite(cb, options, environment = "development") {
  const args = options ? hugoArgsDefault.concat(options) : hugoArgsDefault;

  process.env.NODE_ENV = environment;

  return spawn(hugoBin, args, {stdio: "inherit"}).on("close", (code) => {
    if (code === 0) {
      browserSync.reload();
      cb();
    } else {
      browserSync.notify("Hugo build failed :(");
      cb("Hugo build failed");
    }
  });
}
