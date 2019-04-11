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
    alias: {
      'three': path.resolve('./node_modules/three/src/Three.js'),
      '../../../build/three.module.js': path.resolve('./node_modules/three/src/Three.js')
    },
    extensions: [
      '.ts',
      '.js'
    ]
  },
  devtool: 'source-map'
};