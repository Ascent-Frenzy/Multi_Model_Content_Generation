const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = (options) => ({
  ...options,
  // Keep node_modules external — prevents webpack from bundling native binaries
  // (bcrypt, sharp, etc.) which break under webpack's static analysis.
  externals: [
    nodeExternals({ modulesDir: path.resolve(__dirname, '../../node_modules') }),
  ],
});
