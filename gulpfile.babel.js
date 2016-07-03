import gulp from 'gulp';
import babel from 'gulp-babel';
import cp from 'child_process';
import gutil from 'gulp-util';
import webpack from 'webpack';
import webpackConfig from './webpack.conf';
import WebpackDevServer from 'webpack-dev-server';


gulp.task('hugo', (cb) => {
  const args = ['-d', '../dist', '-s', 'site'];
  return cp.spawn('hugo', args, {stdio: 'inherit'}).on('close', cb);
});

gulp.task('webpack', (cb) => {
  const myConfig = Object.assign({}, webpackConfig);

  // run webpack
  webpack(myConfig, (err, stats) => {
    if (err) throw new gutil.PluginError('webpack', err);
    gutil.log('[webpack]', stats.toString({
      colors: true,
      progress: true
    }));
    cb();
  });
});

gulp.task('build', ['webpack', 'hugo']);

gulp.task('server', ['build'], (cb) => {
  gulp.watch('site/**', ['hugo']);

  const myConfig = Object.assign({}, webpackConfig);
	myConfig.devtool = 'cheap-module-eval-source-map';
	myConfig.debug = true;

  for (const key in myConfig.entry) {
    myConfig.entry[key].unshift("webpack-dev-server/client?http://localhost:3009/");
  }

  // Start a webpack-dev-server
	new WebpackDevServer(webpack(myConfig), {
    contentBase: './dist',
    publicPath: 'http://localhost:3009/',
		stats: {
			colors: true
		},
		hot: false
	}).listen(3009, 'localhost', function(err) {
		if(err) throw new gutil.PluginError('webpack-dev-server', err);
		gutil.log('[webpack-dev-server]', 'http://localhost:3009/');
	});
});
