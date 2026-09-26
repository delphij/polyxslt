// Regenerates reference output with xsltproc.
//
// XSLT cases: every directory under test/fixtures holding in.xml and style.xsl.  On
// success xsltproc's output is written to expected.html; on failure its diagnostics go to
// expected.err instead.  libxslt reports some stylesheet errors ("compilation error") yet
// exits with status 0 and an empty result, so those are treated as failures as well.
//
// XPath cases: every test/xpath/<name>.json table.  Each case is wrapped in a stylesheet
// (see xpathStylesheet) and the results are written to test/xpath/<name>.expected.json.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { FIELD, NODE } from '../test/support/xpath-format.mjs';
import { failed, findXsltproc, xsltproc } from './xsltproc.mjs';

function* cases(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  if (entries.some((e) => e.isFile() && e.name === 'style.xsl')) yield dir;
  for (const e of entries) if (e.isDirectory()) yield* cases(join(dir, e.name));
}

const run = xsltproc;
const xsltprocPath = findXsltproc();
const tmp = mkdtempSync(join(tmpdir(), 'polyxslt-golden-'));

function fixtures() {
  const root = 'test/fixtures';
  // Only the versions in use; the build-time versions differ between Homebrew's bottles.
  const version = execFileSync(xsltprocPath, ['--version'], { encoding: 'utf8' }).split('\n')[0];
  writeFileSync(join(root, 'XSLTPROC_VERSION'), `${version}\n`);
  let count = 0;
  for (const dir of cases(root)) {
    const html = join(dir, 'expected.html');
    const err = join(dir, 'expected.err');
    const style = join(tmp, 'style.xsl');

    let r = run(['scripts/no-indent.xsl', join(dir, 'style.xsl')]);
    if (r.status === 0) {
      writeFileSync(style, r.stdout);
      r = run([style, join(dir, 'in.xml')]);
    }
    if (!failed(r)) {
      writeFileSync(html, r.stdout);
      rmSync(err, { force: true });
    } else {
      writeFileSync(err, `exit ${r.status}\n${r.stderr.replaceAll(tmp, relative('.', dir))}`);
      rmSync(html, { force: true });
    }
    count++;
  }
  return count;
}

const xmlEscape = (s) => s.replace(/[&<"\t\n\r]/g, (c) => `&#${c.charCodeAt(0)};`);

// Prints string(), number() and boolean() of the expression, separated by FIELD, and for
// node-set cases each node as FIELD <path> NODE <string value>.  A node path lists child
// positions (counted over XPath nodes) and @name for attributes.
function xpathStylesheet(table, c) {
  const ns = Object.entries(table.ns ?? {})
    .map(([p, u]) => ` xmlns:${p}="${xmlEscape(u)}"`)
    .join('');
  const vars = Object.entries(c.vars ?? {})
    .map(([n, e]) => `<xsl:variable name="${n}" select="${xmlEscape(e)}"/>`)
    .join('');
  const e = xmlEscape(c.expr);
  const nodes = c.nodes
    ? `<xsl:for-each select="${e}"><xsl:text>${FIELD}</xsl:text><xsl:call-template name="path"/>` +
      `<xsl:text>${NODE}</xsl:text><xsl:value-of select="."/></xsl:for-each>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"${ns}>
<xsl:output method="text" encoding="UTF-8"/>
<xsl:template match="/"><xsl:for-each select="(${xmlEscape(c.ctx ?? '/')})[1]">${vars}<xsl:value-of select="string(${e})"/><xsl:text>${FIELD}</xsl:text><xsl:value-of select="number(${e})"/><xsl:text>${FIELD}</xsl:text><xsl:value-of select="boolean(${e})"/>${nodes}</xsl:for-each></xsl:template>
<xsl:template name="path"><xsl:for-each select="ancestor-or-self::node()[parent::node()]"><xsl:text>/</xsl:text><xsl:choose><xsl:when test="count(. | ../@*) = count(../@*)">@<xsl:value-of select="name()"/></xsl:when><xsl:otherwise><xsl:value-of select="count(preceding-sibling::node()) + 1"/></xsl:otherwise></xsl:choose></xsl:for-each></xsl:template>
</xsl:stylesheet>
`;
}

function xpathTables() {
  const root = 'test/xpath';
  let count = 0;
  for (const name of readdirSync(root).filter((f) => /^[^.]+\.json$/.test(f))) {
    const table = JSON.parse(readFileSync(join(root, name), 'utf8'));
    const expected = table.cases.map((c) => {
      const xml = join(tmp, 'in.xml');
      const style = join(tmp, 'style.xsl');
      writeFileSync(xml, c.xml ?? table.xml);
      writeFileSync(style, xpathStylesheet(table, c));
      const r = run([style, xml]);
      count++;
      return failed(r)
        ? {
            error:
              r.stderr
                .replaceAll(tmp, '<tmp>')
                .split('\n')
                .find((l) => l) ?? `exit ${r.status}`,
          }
        : r.stdout;
    });
    writeFileSync(
      join(root, name.replace(/\.json$/, '.expected.json')),
      `${JSON.stringify(expected, null, 1)}\n`,
    );
  }
  return count;
}

try {
  const f = fixtures();
  const x = xpathTables();
  console.log(`${f} fixture(s) and ${x} XPath case(s) regenerated with ${xsltprocPath}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
