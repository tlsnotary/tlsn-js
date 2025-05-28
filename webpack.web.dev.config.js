const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';

const envPlugin = new webpack.EnvironmentPlugin({
  NODE_ENV: 'development',
  LOCAL_NOTARY: true,
  LOCAL_WS: false,
  HEADLESS: false,
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

const entry = {
  'full-integration': path.join(__dirname, 'test', 'e2e', 'full-integration.spec.ts'),
  'simple-verify': path.join(__dirname, 'test', 'e2e', 'simple-verify.spec.ts'),
  // add more entries as needed
};

module.exports = [
  {
    target: 'web',
    mode: isProd ? 'production' : 'development',
    entry,
    output: {
      path: __dirname + '/test-build',
      publicPath: '/',
      filename: `[name].js`,
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.png', '.svg'],
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
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'node_modules/tlsn-wasm',
            to: path.join(__dirname, 'test-build'),
            force: true,
          },
        ],
      }),
      // Generate an HTML file for each entry
      ...Object.keys(entry).map(
        (name) =>
          new HtmlWebpackPlugin({
            template: './test/test.ejs',
            filename: `${name}.html`,
            chunks: [name],
            inject: true,
            testName: name,
          })
      ),
      // Add an index page listing all test pages
      new HtmlWebpackPlugin({
        templateContent: () => `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>tlsn-js test index</title>
            </head>
            <body>
              <h1>tlsn-js test index</h1>
              <ul>
                ${Object.keys(entry)
            .map(
              (name) =>
                `<li><a href="${name}.html">${name}</a></li>`
            )
            .join('\n')}
              </ul>
            </body>
          </html>
        `,
        filename: 'index.html',
        inject: false,
      }),
    ],
    stats: 'minimal',
    devServer: {
      historyApiFallback: true,
    },
  },
];
