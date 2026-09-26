// Locates the reference xsltproc and runs it.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function findXsltproc() {
  if (process.env.XSLTPROC) return process.env.XSLTPROC;
  try {
    const prefix = execFileSync('brew', ['--prefix', 'libxslt'], { encoding: 'utf8' }).trim();
    const path = join(prefix, 'bin', 'xsltproc');
    if (existsSync(path)) return path;
  } catch {}
  throw new Error('xsltproc not found: install libxslt with Homebrew or set XSLTPROC');
}

const options = ['--nonet', '--nowrite', '--nomkdir'];

export function xsltproc(args) {
  return spawnSync(findXsltproc(), [...options, ...args], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
}

/** libxslt reports some stylesheet errors yet exits with status 0. */
export const failed = (r) => r.status !== 0 || /compilation error|XPath error/.test(r.stderr);
