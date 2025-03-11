const webpack = require('webpack');
const path = require('path');
const isProd = process.env.NODE_ENV === 'production';
const CopyWebpackPlugin = require('copy-webpack-plugin');

const envPlugin = new webpack.EnvironmentPlugin({
  NODE_ENV: 'development',
});

const rules = [
  {
    test: /\.tsx?$/,
    exclude: [/(node_modules|.webpack)/],
    rules: [
      {
        loader: 'ts-loader',
        options: {
          configFile: 'tsconfig.json',
          transpileOnly: true,
        },
      },
    ],
  },
  {
    test: /\.node$/,
    use: 'node-loader',
  },
];

module.exports = [
  {
    mode: isProd ? 'production' : 'development',
    entry: {
      lib: path.join(__dirname, 'src', 'lib.ts'),
    },
    target: 'webworker',
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.js'],
    },
    node: {
      __dirname: true,
    },
    module: {
      rules: [...rules],
    },
    output: {
      publicPath: '',
      path: __dirname + '/build',
      filename: `[name].js`,
      libraryTarget: 'umd',
      globalObject: 'this',
      umdNamedDefine: true,
    },
    plugins: [
      envPlugin,
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'node_modules/tlsn-wasm/tlsn_wasm.js',
            to: path.join(__dirname, 'build'),
            force: true,
          },
          {
            from: 'node_modules/tlsn-wasm/tlsn_wasm_bg.wasm',
            to: path.join(__dirname, 'build'),
            force: true,
          },
          {
            from: 'node_modules/tlsn-wasm/spawn.js',
            to: path.join(__dirname, 'build'),
            force: true,
          },
          {
            from: 'node_modules/tlsn-wasm/snippets',
            to: path.join(__dirname, 'build', 'snippets'),
            force: true,
          },
        ],
      }),
    ],
  },
];
