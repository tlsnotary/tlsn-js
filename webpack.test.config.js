const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
const { compilerOptions } = require('./tsconfig.json');

const isProd = process.env.NODE_ENV === 'production';

const devServerEntries = [
  // 'webpack-dev-server/client?http://localhost:8080',
  // 'webpack/hot/only-dev-server',
];

const envPlugin = new webpack.EnvironmentPlugin({
  NODE_ENV: 'development',
});

const rules = [
  {
    test: /\.node$/,
    use: 'node-loader',
  },
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|.webpack)/,
    use: [
      {
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
];

const rendererRules = [];

module.exports = [
  {
    target: 'web',
    mode: isProd ? 'production' : 'development',
    entry: {
      test: path.join(__dirname, 'utils', 'test.ts'),
    },
    output: {
      path: __dirname + '/test-build',
      publicPath: isProd ? '/' : 'http://localhost:8080/',
      filename: `[name].js`,
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.png', '.svg'],
      modules: [
        path.resolve('./node_modules'),
        path.resolve(__dirname, compilerOptions.baseUrl),
      ],
      fallback: {
        browserify: require.resolve('browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        crypto: require.resolve('crypto-browserify'),
        os: require.resolve('os-browserify/browser'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        assert: require.resolve('assert/'),
        events: require.resolve('events/'),
        'ansi-html-community': require.resolve('ansi-html-community'),
        'html-entities': require.resolve('html-entities'),
        constants: false,
        fs: false,
      },
    },
    module: {
      rules: [...rules, ...rendererRules],
    },
    plugins: [
      envPlugin,
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
      new webpack.ProvidePlugin({
        process: 'process',
      }),
      new HtmlWebpackPlugin({
        template: './static/index.template.ejs',
        filename: `index.html`,
        title: process.env.APP_TITLE || 'Zkitter',
        inject: true,
      }),
      new webpack.ContextReplacementPlugin(/gun/),
    ],
    stats: 'minimal',
    devServer: {
      historyApiFallback: true,
      proxy: {
        '/ns': {
          target: `https://127.0.0.1:7074`,
          secure: true,
        },
      },
    },
    // optimization: {
    //     runtimeChunk: 'single'
    // },
  },
];
