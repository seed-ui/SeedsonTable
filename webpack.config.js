const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const base = (inFile, outFile, target) => ({
  devtool: 'source-map',
  target,
  entry: {
    [outFile]: `./src/${inFile}`,
  },
  output: {
    filename: '[name]',
    path: path.join(__dirname, './web'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          use: {
            loader: 'css-loader',
            query: {
              minimize: true,
            },
          },
        }),
      },
      {
        test: /\.pug$/,
        loader: 'pug-loader',
        query: {
          pretty: true,
        },
      },
      {
        test: /\.(svg|ttf|woff2?|eot)$/,
        use: {
          loader: "url-loader",
          query: {
            limit: 8092,
          },
        }
      }
    ],
    noParse: [path.join(__dirname, 'node_modules/handsontable/dist/handsontable.full.js')],
  },
  node: {
    __filename: false,
    __dirname: false,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: {
      'handsontable': path.join(__dirname, 'node_modules/handsontable/dist/handsontable.full.js'),
      'handsontable.css': path.join(__dirname, 'node_modules/handsontable/dist/handsontable.full.css'),
    },
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({ sourceMap: true }),
    new ExtractTextPlugin('[name]'),
    new HtmlWebpackPlugin({ filename: 'index.html', template: './src/index.pug' }),
    new CopyWebpackPlugin([
      { from: "./src/package.json", to: "." },
      { from: "./src/schema_example.js", to: "." },
    ]),
  ],
});

module.exports = [
  base("index.ts", "index.js", "electron"),
  base("main.ts", "main.js", "electron-renderer"),
  base("main.css", "main.css", "web"),
];