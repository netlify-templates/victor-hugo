const {merge} = require("webpack-merge");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

const common = require("./webpack.common.js");

module.exports = merge(common, {
  mode: "production",

  output: {
    filename: "[name].[hash:5].js",
    chunkFilename: "[id].[hash:5].css",
    path: path.resolve(__dirname, "dist"),
  },

  optimization: {
    minimize: true,
    minimizer: [
      new MiniCssExtractPlugin({
        filename: "[name].[hash:5].css",
        chunkFilename: "[id].[hash:5].css",
      }),
      new TerserPlugin(),
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [new HtmlWebpackPlugin()],
});
