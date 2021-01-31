const path = require('path');
const env = require('yargs').argv.env;
const ESLintPlugin = require('eslint-webpack-plugin');

let library = 'Centrifuge';

let outputFile, minimize;

if (env === 'build') {
  outputFile = '[name].min.js';
  minimize = true;
} else {
  outputFile = '[name].js';
  minimize = false;
}

const config = {
  entry: {
    'centrifuge': __dirname + '/src/index.js',
    'centrifuge.protobuf': __dirname + '/src/index_protobuf.js'
  },
  devtool: 'source-map',
  output: {
    globalObject: 'this',
    filename: outputFile,
    library: library,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        loader: 'babel-loader',
        exclude: /(node_modules|bower_components)/
      }
    ]
  },
  target: ['web', 'es5'], // TODO: remove this line for v3
  resolve: {
    modules: [path.resolve('./node_modules'), path.resolve('./src')],
    extensions: ['.json', '.js']
  },
  plugins: [
    new ESLintPlugin({}),
  ],
  optimization: {
    minimize: minimize
  }
};

module.exports = config;
