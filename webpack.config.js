const webpack = require('webpack');
const path = require('path');
const isProductionMode = process.argv.indexOf('-p') !== -1;

let fn = function () {
    let config = {
        entry: './src/centrifuge.js',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'centrifuge.js'
        },
        module: {
            loaders: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    loader: 'babel-loader'
                },
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    loader: 'ts-loader'
                }
            ]
        },
        plugins: []
    };

    if (isProductionMode) {
        config.plugins.unshift(new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: '"production"'
            }
        }));
        config.plugins.push(new webpack.optimize.UglifyJsPlugin({
            beautify: false,
            output: {
                comments: false
            },
            mangle: {
                screw_ie8: true
            },
            compress: {
                screw_ie8: true,
                warnings: false,
                conditionals: true,
                unused: true,
                comparisons: true,
                sequences: true,
                dead_code: true,
                evaluate: true,
                if_return: true,
                join_vars: true,
                negate_iife: false
            }
        }));
    } else {
        config.devServer = {
            contentBase: webPath,
            inline: true,
            noInfo: true,
            compress: true,
            host: 'localhost',
            port: 81
        };
    }

    return config;

};

module.exports = fn();
