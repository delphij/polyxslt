// Builds the release files into release/<version>/:
//
//   xslt-polyfill.min.js, polyxslt.mjs   minified builds, with their source maps
//   polyxslt-<version>.tar.xz            source archive of the release tag (git archive)
//   SHA256SUMS                           checksums of all of the above
//   SRI.txt                              Subresource Integrity hashes of the builds
//
// The working tree must be clean and HEAD must carry the tag v<version>.  With
// --snapshot, the current commit is used instead and the files are named after it.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const fail = (msg) => {
  console.error(`release: ${msg}`);
  process.exit(1);
};

const snapshot = process.argv.includes('--snapshot');
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));

if (git('status', '--porcelain')) fail('the working tree is not clean');
const tag = `v${version}`;
let ref = tag;
let name = version;
if (snapshot) {
  ref = git('rev-parse', 'HEAD');
  name = `${version}-${ref.slice(0, 12)}`;
} else {
  const tagged = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${tag}^{commit}`], {
    encoding: 'utf8',
  }).stdout.trim();
  if (!tagged) fail(`tag ${tag} does not exist; create it or use --snapshot`);
  if (tagged !== git('rev-parse', 'HEAD')) fail(`HEAD is not at ${tag}`);
}

const out = join('release', name);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

execFileSync('pnpm', ['build'], { stdio: 'inherit' });
const builds = ['xslt-polyfill.min.js', 'polyxslt.mjs'];
for (const f of builds) {
  copyFileSync(join('dist', f), join(out, f));
  copyFileSync(join('dist', `${f}.map`), join(out, `${f}.map`));
}

// git archive stamps entries with the commit time, and single-threaded xz output depends
// only on its input, so the archive is the same every time for the same tag.
const archive = `polyxslt-${name}.tar.xz`;
const tar = execFileSync('git', ['archive', '--format=tar', `--prefix=polyxslt-${name}/`, ref], {
  maxBuffer: 1 << 30,
});
writeFileSync(
  join(out, archive),
  execFileSync('xz', ['-9', '-T1', '-c'], { input: tar, maxBuffer: 1 << 30 }),
);

const files = [...builds.flatMap((f) => [f, `${f}.map`]), archive];
const digest = (f, alg, enc) =>
  createHash(alg)
    .update(readFileSync(join(out, f)))
    .digest(enc);
writeFileSync(
  join(out, 'SHA256SUMS'),
  files.map((f) => `${digest(f, 'sha256', 'hex')}  ${f}\n`).join(''),
);
writeFileSync(
  join(out, 'SRI.txt'),
  builds.map((f) => `${f}  sha384-${digest(f, 'sha384', 'base64')}\n`).join(''),
);

console.log(`release files in ${out}:`);
for (const f of [...files, 'SHA256SUMS', 'SRI.txt']) console.log(`  ${f}`);
