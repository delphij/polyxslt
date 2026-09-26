// Local acceptance against production stylesheets that are kept outside the repository.
//
// POLYXSLT_PRIVATE names a directory with one subdirectory per site, holding XML documents
// and the stylesheets their <?xml-stylesheet?> instructions refer to (an href of /feed.xsl is
// looked up as <site>/feed.xsl).  Reference output is written to <dir>/.expected, and the
// comparison runs in the browsers with vitest.private.config.ts.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { privateCases } from './private-cases.mjs';
import { failed, xsltproc } from './xsltproc.mjs';

const dir = process.env.POLYXSLT_PRIVATE;
if (!dir) throw new Error('set POLYXSLT_PRIVATE to the directory with the samples');

const tmp = mkdtempSync(join(tmpdir(), 'polyxslt-private-'));
try {
  for (const c of privateCases(dir)) {
    const style = join(tmp, 'style.xsl');
    let r = xsltproc(['scripts/no-indent.xsl', join(dir, c.xsl)]);
    if (r.status === 0) {
      writeFileSync(style, r.stdout);
      r = xsltproc([style, join(dir, c.xml)]);
    }
    mkdirSync(join(dir, '.expected', c.site), { recursive: true });
    writeFileSync(join(dir, c.expected), failed(r) ? '' : r.stdout);
    console.log(`${c.xml}: reference ${failed(r) ? 'FAILED' : 'written'}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const v = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.private.config.ts'], {
  stdio: 'inherit',
});
process.exit(v.status ?? 1);
