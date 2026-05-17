const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = (options) => ({
  ...options,
  externals: [
    nodeExternals({
      modulesDir: path.resolve(__dirname, '../../node_modules'),
      allowlist: [/^@app\//],
    }),
  ],
});
