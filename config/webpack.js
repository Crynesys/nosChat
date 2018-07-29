const path = require('path');
const options = require('../utils/commandOptions');

module.exports = {
    commonn: {
        convertPxToRem: {
            enable: false,
            options: {
                rootValue: 108, // per tre
                propList: ['*', '!border'],
                unitPrecision: 4,
                replace: true,
            },
        },
        autoPrefix: {
            enable: true,
            options: {
                browsers: ['last 3 versions'],
            },
        },
    },
    build: {
        env: {
            NODE_ENV: '"production"',
        },
        index: path.resolve(__dirname, '../dist/index.html'),
        assetsRoot: path.resolve(__dirname, '../dist/nchat'),
        assetsSubDirectory: options.subDirectory || '.',
        assetsPublicPath: options.publicPath || '/',
        productionSourceMap: false,
        productionGzip: false,
        productionGzipExtensions: ['js', 'css'],
        bundleAnalyzerReport: process.env.npm_config_report,
    },
    dev: {
        env: {
            NODE_ENV: '"development"',
        },
        host: '0.0.0.0',
        port: 8989,
        autoOpenBrowser: true,
        assetsSubDirectory: 'static',
        assetsPublicPath: '/',
        proxyTable: {},
        cssSourceMap: false,
    },
};
