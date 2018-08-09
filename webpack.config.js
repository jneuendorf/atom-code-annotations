const path = require('path')
const util = require('util')

const webpack = require('webpack')


const {NODE_ENV='development'} = process.env
const config = {
    mode: NODE_ENV,
    target: 'electron-main',
    context: __dirname,
    entry: './lib/annotation-manager.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'commonjs2',
        libraryExport: 'default',
        library: '',
    },
    externals: {
        express: 'express',
        season: 'season',
        atom: 'atom',
        remote: 'remote',
    },
    module: {
        rules: [
            {
                test: /.js$/,
                exclude: /(node_modules)/,
                use: [
                    {loader: 'babel-loader'},
                ],
            },
        ],
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(NODE_ENV),
            },
        }),
    ],
    // devtool: NODE_ENV === 'production' ? undefined : 'eval',
}

console.log(util.inspect(config, {depth: Infinity}))

module.exports = config
