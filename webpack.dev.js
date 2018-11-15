const merge = require("webpack-merge");
const path = require("path");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const common = require("./webpack.common");

module.exports = merge(common, {
  mode: "development",

  output: {
    filename: "[name].js",
    chunkFilename: "[id].css"
  },

  devServer: {
    port: process.env.PORT || 3000,
    contentBase: path.join(process.cwd(), "./dist"),
    stats: "none",
    quiet: false,
    open: true
  },

  plugins: [
    new CleanWebpackPlugin(["dist/**/*.js", "dist/**/*.css"]),

    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css"
    })
  ]
});
