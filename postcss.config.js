// module.exports = {
//   plugins: {
//     "postcss-import": {},
//     "postcss-preset-env": {
//       browsers: "last 2 versions"
//     },
//     autoprefixer: {}
//   }
// };

module.exports = {
  plugins: [
    require('postcss-import')(),
    require('tailwindcss')('./src/css/tailwind.config.js'),
    require('autoprefixer'),
    require('postcss-preset-env')({
      browsers: ['last 2 versions', '> 5%'],
    }),
  ],
};