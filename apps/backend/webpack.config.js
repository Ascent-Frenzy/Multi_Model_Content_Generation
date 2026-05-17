const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = (options) => ({
  ...options,
  // Keep node_modules external — prevents webpack from bundling native binaries
  // (bcrypt, sharp, etc.) which break under webpack's static analysis.
  // Workspace packages (@app/*) are explicitly allowed so they ARE bundled;
  // their package.json "main" points to .ts which Node cannot load at runtime.
  externals: [
    nodeExternals({
      modulesDir: path.resolve(__dirname, '../../node_modules'),
      // @app/* packages are TypeScript source — bundle them instead of
      // leaving them external (external = Node tries to require .ts at runtime).
      allowlist: [/^@app\//],
    }),
  ],
});
