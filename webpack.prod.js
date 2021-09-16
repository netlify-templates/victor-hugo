const { merge } = require('webpack-merge')
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

const common = require("./webpack.common.js");

module.exports = merge(common, {
  mode: "production",

  output: {
    filename: "[name].[contenthash:5].js",
    chunkFilename: "[id].[contenthash:5].css"
  },

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true
      }),

      new MiniCssExtractPlugin({
        filename: "[name].[contenthash:5].css",
        chunkFilename: "[id].[contenthash:5].css"
      }),

      new CssMinimizerPlugin({})
    ]
  }
});
