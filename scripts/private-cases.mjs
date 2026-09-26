import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The XML documents with a stylesheet under each site directory of `dir`. */
export function privateCases(dir) {
  const cases = [];
  for (const site of readdirSync(dir, { withFileTypes: true })) {
    if (!site.isDirectory() || site.name.startsWith('.')) continue;
    for (const f of readdirSync(join(dir, site.name)).filter((n) => n.endsWith('.xml'))) {
      const xml = join(site.name, f);
      const pi = readFileSync(join(dir, xml), 'utf8').match(/<\?xml-stylesheet[^>]*href="([^"]+)"/);
      if (!pi?.[1]) continue;
      const xsl = join(site.name, pi[1].replace(/^\//, ''));
      cases.push({ site: site.name, xml, xsl, expected: join('.expected', `${xml}.html`) });
    }
  }
  return cases;
}
