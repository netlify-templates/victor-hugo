const webpack = require("webpack");
const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: {
    main: path.join(process.cwd(), "src/index.js")
  },

  output: {
    path: path.join(process.cwd(), "dist"),
    publicPath: "/"
  },

  module: {
    rules: [
      {
        test: /\.((png)|(eot)|(woff)|(woff2)|(ttf)|(svg)|(gif))(\?v=\d+\.\d+\.\d+)?$/,
        loader: "file-loader?name=/[hash].[ext]"
      },

      {test: /\.json$/, loader: "json-loader"},

      {
        loader: "babel-loader",
        test: /\.js?$/,
        exclude: /node_modules/,
        query: {cacheDirectory: true}
      },

      {
        test: /\.(sa|sc|c)ss$/,
        exclude: /node_modules/,
        use: ["style-loader", MiniCssExtractPlugin.loader, "css-loader", "postcss-loader", "sass-loader"]
      }
    ]
  },

  plugins: [
    new CleanWebpackPlugin(["dist/**/*.js", "dist/**/*.css"]),

    new HtmlWebpackPlugin({
      template: path.resolve(process.cwd(), "dist/index.html"),
      inject: true
    }),

    new webpack.ProvidePlugin({
      fetch: "imports-loader?this=>global!exports-loader?global.fetch!whatwg-fetch"
    }),

    new CopyWebpackPlugin([
      {
        from: "./src/fonts/",
        to: "fonts/",
        flatten: true
      }
    ])
  ]
};
