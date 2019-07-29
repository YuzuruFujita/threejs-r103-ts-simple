const path = require('path')

module.exports = {
  entry: './index.ts',
  output: {
    path: `${__dirname}/build`,
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader'
      }
    ]
  },
  resolve: {
    extensions: [
      '.ts',
      '.js'
    ],
    alias: {
      "three": path.resolve(__dirname, "three.combined"),
    }
  },
  devtool: 'source-map'
};