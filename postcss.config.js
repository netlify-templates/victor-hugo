// module.exports = {
//   plugins: {
//     "postcss-import": {},
//     "postcss-preset-env": {
//       browsers: "last 2 versions"
//     },
//     autoprefixer: {}
//   }
// };
class TailwindExtractor {
  static extract(content) {
    return content.match(/[A-z0-9-:\/]+/g)
  }
}

module.exports = {
  plugins: [
    require('postcss-import')(
      {
        path: ["src/css"],
      }
    ),
    require('tailwindcss')('./src/css/tailwind.config.js'),
    require('autoprefixer'),
    require('postcss-preset-env')({
      browsers: ['last 2 versions', '> 5%'],
    }),
  ],
};