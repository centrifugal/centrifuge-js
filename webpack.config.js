const path = require('path');
const env = require('yargs').argv.env;

let library = 'Centrifuge';

let plugins = [], outputFile;

if (env === 'build') {
  outputFile = '[name].min.js';
} else {
  outputFile = '[name].js';
}

const config = {
  entry: {
    'centrifuge': __dirname + '/src/index.js',
    'centrifuge.protobuf': __dirname + '/src/index_protobuf.js'
  },
  devtool: 'source-map',
  output: {
    path: __dirname + '/dist',
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
      },
      {
        test: /(\.jsx|\.js)$/,
        loader: 'eslint-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    modules: [path.resolve('./node_modules'), path.resolve('./src')],
    extensions: ['.json', '.js']
  },
  plugins: plugins
};

module.exports = config;
