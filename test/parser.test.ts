// The browser's XML parser, which parses stylesheets and documents, is relied on not to
// fetch external entities and to limit entity expansion (SECURITY.md).
import { expect, test } from 'vitest';

const parse = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const failed = (d: Document) => d.getElementsByTagName('parsererror').length > 0;

test('external entities and DTDs are not fetched', async () => {
  const url = `${location.origin}/polyxslt-external-entity-${Date.now()}`;
  const docs = [
    parse(`<!DOCTYPE d [<!ENTITY e SYSTEM "${url}/entity">]><d>&e;</d>`),
    parse(`<!DOCTYPE d SYSTEM "${url}/dtd"><d>x</d>`),
    parse(`<!DOCTYPE d [<!ENTITY % p SYSTEM "${url}/param"> %p;]><d>x</d>`),
  ];
  for (const d of docs) {
    if (!failed(d)) expect(d.documentElement.textContent).not.toContain('polyxslt');
  }
  await new Promise((r) => setTimeout(r, 200));
  const fetched = performance.getEntriesByType('resource').filter((e) => e.name.startsWith(url));
  expect(fetched).toEqual([]);
});

test('entity expansion is bounded', () => {
  let dtd = '<!ENTITY e0 "xxxxxxxxxx">';
  for (let i = 1; i < 10; i++) dtd += `<!ENTITY e${i} "${`&e${i - 1};`.repeat(10)}">`;
  const t0 = performance.now();
  const d = parse(`<!DOCTYPE d [${dtd}]><d>&e9;</d>`);
  const ms = performance.now() - t0;
  // Either the parser rejects the document or the expansion stays small.
  if (!failed(d)) expect(d.documentElement.textContent?.length ?? 0).toBeLessThan(1e7);
  expect(ms).toBeLessThan(5000);
});
