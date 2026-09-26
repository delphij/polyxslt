// Document order for large node-sets, which uses precomputed positions (xpath/axes.ts).
import { expect, test } from 'vitest';
import { evaluate } from '../src/xpath/index';
import { nodeSet } from '../src/xpath/value';

const byDom = (a: Node, b: Node) => (a.compareDocumentPosition(b) & 4 ? -1 : 1);

function doc(n: number): Document {
  let s = '<r>';
  for (let i = 0; i < n; i++) s += `<e a="${i}" b="${i}"><f>${i}</f>t${i}</e>`;
  return new DOMParser().parseFromString(`${s}</r>`, 'application/xml');
}

test('large unions are in document order', () => {
  const d = doc(300);
  const nodes = nodeSet(evaluate('//f | //@b | //e/text() | //@a | //e[position() mod 7 = 0]', d));
  expect(nodes.length).toBe(300 * 4 + 42);
  expect(nodes).toEqual([...nodes].sort(byDom));
});

test('positions are recomputed after the document changes', () => {
  const d = doc(100);
  evaluate('//f | //e', d);
  const r = d.documentElement;
  r.insertBefore(d.createElement('f'), r.firstChild);
  r.appendChild(d.createElement('f'));
  const nodes = nodeSet(evaluate('//f | //e', d));
  expect(nodes.length).toBe(202);
  expect(nodes).toEqual([...nodes].sort(byDom));
});
