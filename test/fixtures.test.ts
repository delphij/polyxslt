// Runs every case under test/fixtures and compares the result with xsltproc's output.
import { expect, test } from 'vitest';
import { XSLTError } from '../src/errors';
import { compileStylesheet } from '../src/xslt/compile';
import { run } from '../src/xslt/transform';
import { canon, canonExpected } from './support/canon';

interface Case {
  'in.xml'?: string;
  'style.xsl'?: string;
  'expected.html'?: string;
  'expected.err'?: string;
}

const files = import.meta.glob<string>('./fixtures/**/*.{xml,xsl,html,err}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const cases = new Map<string, Case>();
for (const [path, content] of Object.entries(files)) {
  const i = path.lastIndexOf('/');
  const dir = path.slice('./fixtures/'.length, i);
  const name = path.slice(i + 1) as keyof Case;
  const c = cases.get(dir) ?? {};
  c[name] = content;
  cases.set(dir, c);
}

function parseXML(text: string, name: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(`${name}: not well-formed`);
  return doc;
}

for (const [name, c] of cases) {
  test(name, () => {
    const exec = () => {
      const source = parseXML(c['in.xml'] ?? '', 'in.xml');
      return run(compileStylesheet(parseXML(c['style.xsl'] ?? '', 'style.xsl')), source, source);
    };
    if (c['expected.err'] !== undefined) {
      expect(exec).toThrow(XSLTError);
      return;
    }
    const { fragment, method } = exec();
    const output = c['expected.html'] ?? '';
    if (output.startsWith('<?xml')) expect(method).toBe('xml');
    const ours = method === 'text' ? JSON.stringify(fragment.textContent) : canon(fragment);
    expect(ours).toBe(canonExpected(output, fragment, method));
  });
}
