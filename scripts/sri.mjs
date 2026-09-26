// Prints Subresource Integrity hashes of the files to be published.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

for (const f of ['dist/xslt-polyfill.min.js', 'dist/polyxslt.mjs']) {
  const hash = createHash('sha384').update(readFileSync(f)).digest('base64');
  console.log(`${f}  sha384-${hash}`);
}
