// Robustness: malformed and unusual input may only produce a result or an XSLTError, never
// another exception.  FUZZ_RUNS raises the number of runs for longer local sessions.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { XSLTError } from '../src/errors';
import { evaluate } from '../src/xpath/index';
import { compileStylesheet } from '../src/xslt/compile';
import { run } from '../src/xslt/transform';

declare const __FUZZ_RUNS__: number;
const runs = __FUZZ_RUNS__;
const timeout = Math.max(15000, runs * 20);
const parse = (s: string) => new DOMParser().parseFromString(s, 'application/xml');

function allowed(f: () => unknown): boolean {
  try {
    f();
    return true;
  } catch (e) {
    if (e instanceof XSLTError) return true;
    throw e;
  }
}

const doc = parse(
  '<r xmlns:p="urn:p" a="1"><x p:b="2">t<!--c--><?pi d?><![CDATA[c]]></x><y><x/>9</y></r>',
);

const TOKENS = [
  ...'/ // . .. @ * ( ) [ ] , | + - = != < <= > >= $ : ::'.split(' '),
  ...'and or div mod x y r p:b a node() text() comment() processing-instruction()'.split(' '),
  ...'child ancestor descendant-or-self following preceding attribute namespace self'.split(' '),
  ...'count( sum( substring( concat( position() last() id( lang( name( translate('.split(' '),
  "'s'",
  '"q"',
  '1',
  '0.5',
  '1e3',
  '-',
  ' ',
];

test(
  'XPath: token sequences',
  () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...TOKENS), { maxLength: 14 }), (toks) => {
        expect(allowed(() => evaluate(toks.join(''), doc, { resolve: () => 'urn:p' }))).toBe(true);
      }),
      { numRuns: runs },
    );
  },
  timeout,
);

test(
  'XPath: arbitrary strings',
  () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 30 }), (s) => {
        expect(allowed(() => evaluate(s, doc))).toBe(true);
      }),
      { numRuns: runs },
    );
  },
  timeout,
);

// Stylesheets from the fixtures, mutated at the text level; only well-formed results are
// transformed.
const sheets = Object.values(
  import.meta.glob<string>('./fixtures/*/*/style.xsl', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
);
const input = Object.values(
  import.meta.glob<string>('./fixtures/requirements/*/in.xml', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
);

const insertions = [
  '<xsl:apply-templates/>',
  '<xsl:apply-templates select="."/>',
  '<xsl:value-of select="//*"/>',
  '<xsl:for-each select="//node()"><b/></xsl:for-each>',
  '<xsl:variable name="v"/>',
  '<xsl:attribute name="{.}">v</xsl:attribute>',
  '<xsl:element name="{name()}"/>',
  '<xsl:sort lang="{.}"/>',
  '{',
  '}',
  '"',
  '$v',
  'xsl:',
];

const mutation = fc.record({
  sheet: fc.nat(),
  doc: fc.nat(),
  at: fc.nat(),
  cut: fc.nat({ max: 40 }),
  insert: fc.constantFrom(...insertions),
});

test(
  'XSLT: mutated stylesheets',
  () => {
    fc.assert(
      fc.property(mutation, (m) => {
        const src = sheets[m.sheet % sheets.length] as string;
        const at = m.at % src.length;
        const mutated = src.slice(0, at) + m.insert + src.slice(at + m.cut);
        const xsl = parse(mutated);
        fc.pre(!xsl.getElementsByTagName('parsererror').length);
        const source = parse(input[m.doc % input.length] as string);
        expect(
          allowed(() => run(compileStylesheet(xsl), source, source, { maxNodes: 100000 })),
        ).toBe(true);
      }),
      { numRuns: runs },
    );
  },
  timeout,
);
