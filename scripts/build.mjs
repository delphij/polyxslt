// Builds the IIFE (auto mode) and ESM bundles.  `--dev` keeps diagnostics and skips minification.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { build } from 'esbuild';
import { minify } from 'terser';

const dev = process.argv.includes('--dev');
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const outdir = dev ? 'dist/dev' : 'dist';

const common = {
  bundle: true,
  target: 'es2022',
  sourcemap: true,
  minify: !dev,
  // Property names used only internally, which can be shortened.
  mangleProps:
    /^(axis|preds|steps|start|root|doe|up|output|other|globals|byName|sel|order|desc|num|cmp|args|key|pr|op)$/,
  define: { __DEV__: String(dev) },
  banner: { js: `/*! polyxslt ${version} | MIT License */` },
  legalComments: 'none',
  logLevel: 'info',
};

await Promise.all([
  build({
    ...common,
    entryPoints: ['src/host/auto.ts'],
    format: 'iife',
    outfile: `${outdir}/xslt-polyfill${dev ? '' : '.min'}.js`,
  }),
  build({
    ...common,
    entryPoints: ['src/index.ts'],
    format: 'esm',
    outfile: `${outdir}/polyxslt.mjs`,
  }),
]);

// A second pass with terser saves a few percent over esbuild's minifier.
async function squeeze(file, module) {
  const result = await minify(readFileSync(file, 'utf8'), {
    ecma: 2022,
    module,
    compress: { passes: 3 },
    mangle: true,
    format: { comments: /^!/ },
    sourceMap: { content: readFileSync(`${file}.map`, 'utf8'), url: `${basename(file)}.map` },
  });
  writeFileSync(file, result.code);
  writeFileSync(`${file}.map`, result.map);
}

if (!dev) {
  await squeeze(`${outdir}/xslt-polyfill.min.js`, false);
  await squeeze(`${outdir}/polyxslt.mjs`, true);
  execFileSync('tsc', ['-p', 'tsconfig.build.json'], { stdio: 'inherit' });
}
