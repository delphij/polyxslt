// Compares the production stylesheets with xsltproc; run through `pnpm verify:private`.
import { expect, test } from 'vitest';
import { commands } from 'vitest/browser';
import { compileStylesheet } from '../../src/xslt/compile';
import { run } from '../../src/xslt/transform';
import { canon, canonExpected } from '../support/canon';

declare const __PRIVATE_CASES__: { xml: string; xsl: string; expected: string }[];

declare module 'vitest/browser' {
  interface BrowserCommands {
    readPrivate(path: string): Promise<string>;
  }
}

const parse = (s: string) => new DOMParser().parseFromString(s, 'application/xml');

for (const c of __PRIVATE_CASES__) {
  test(c.xml, async () => {
    const [xml, xsl, expected] = await Promise.all(
      [c.xml, c.xsl, c.expected].map((p) => commands.readPrivate(p)),
    );
    const source = parse(xml as string);
    const t0 = performance.now();
    const { fragment, method } = run(compileStylesheet(parse(xsl as string)), source, source);
    const ms = performance.now() - t0;
    expect(canon(fragment)).toBe(canonExpected(expected as string, fragment, method));
    expect(ms).toBeLessThan(2000);
  });
}
