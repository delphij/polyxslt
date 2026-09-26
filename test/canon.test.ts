import { describe, expect, test } from 'vitest';
import { canon, canonExpected } from './support/canon';

const XHTML = 'http://www.w3.org/1999/xhtml';

function fragment(build: (doc: Document) => Node[]): DocumentFragment {
  const f = document.createDocumentFragment();
  f.append(...build(document));
  return f;
}

describe('canon', () => {
  test('sorts attributes and merges adjacent text', () => {
    const f = fragment((d) => {
      const p = d.createElementNS(XHTML, 'p');
      p.setAttribute('title', 't');
      p.setAttribute('class', 'c');
      p.append('a', 'b');
      return [p];
    });
    expect(canon(f)).toBe('<p class="c" title="t">\n  "ab"');
  });

  test('distinguishes elements outside the XHTML namespace', () => {
    const f = fragment((d) => [d.createElementNS(null, 'p')]);
    expect(canon(f)).toBe('<{}p>');
  });

  test('drops encoding meta elements', () => {
    const doc = new DOMParser().parseFromString(
      '<meta charset="UTF-8"><meta http-equiv="Content-Type" content="text/html"><title>x</title>',
      'text/html',
    );
    expect(canon(doc.head)).toBe('<head>\n  <title>\n    "x"');
  });

  test('compares body content when the result is not a whole document', () => {
    const f = fragment((d) => [d.createElementNS(XHTML, 'b')]);
    expect(canonExpected('<b></b>', f)).toBe(canon(f));
  });
});
