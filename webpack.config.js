const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

let library = 'Centrifuge';

const config = {
  entry: {
    'centrifuge': __dirname + '/src/index.js',
    'centrifuge.protobuf': __dirname + '/src/index_protobuf.js'
  },
  devtool: 'source-map',
  output: {
    globalObject: "this",
    library: library,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  target: ['web', 'es5'], // TODO: remove this line for v3
  resolve: {
    modules: [path.resolve('./node_modules'), path.resolve('./src')],
    extensions: ['.json', '.js']
  },
  plugins: [
    new ESLintPlugin({}),
  ]
};

module.exports = config;
