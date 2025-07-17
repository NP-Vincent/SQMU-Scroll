const esbuild = require('esbuild');

const bundles = [
  { entry: 'src/metamask.js', outfile: 'docs/metamask-sdk.js' },
  { entry: 'src/web3auth.js', outfile: 'docs/web3auth.js' },
  { entry: 'src/safe.js', outfile: 'docs/safe-core-sdk.js' },
  { entry: 'src/across.js', outfile: 'docs/across-sdk.js' },
];

for (const b of bundles) {
  esbuild.buildSync({
    entryPoints: [b.entry],
    bundle: true,
    minify: true,
    outfile: b.outfile,
    format: 'iife',
  });
}
