const webpack = require('webpack');
const path = require('path');
const isProd = process.env.NODE_ENV === 'production';

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
      index: path.join(__dirname, 'src', 'index.ts'),
    },
    target: 'node',
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
      path: __dirname + '/build',
      filename: `[name].js`,
      libraryTarget: 'umd',
      globalObject: 'this',
      umdNamedDefine: true,
    },
    plugins: [
      envPlugin,
    ],
  },
];
