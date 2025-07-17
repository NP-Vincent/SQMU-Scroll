const esbuild = require('esbuild');
const { polyfillNode } = require('esbuild-plugin-polyfill-node');

const bundles = [
  { entry: 'src/metamask.js', outfile: 'docs/metamask-sdk.js', globalName: 'MetaMaskSDK' },
  { entry: 'src/web3auth.js', outfile: 'docs/web3auth.js' },
  { entry: 'src/safe.js', outfile: 'docs/safe-core-sdk.js' },
  { entry: 'src/across.js', outfile: 'docs/across-sdk.js' },
];

for (const b of bundles) {
  esbuild.buildSync({
    entryPoints: [b.entry],
    bundle: true,
    minify: true,
    platform: 'browser',
    plugins: [polyfillNode()],
    outfile: b.outfile,
    format: 'iife',
    globalName: b.globalName,
  });
}
