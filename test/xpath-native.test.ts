// Differential test against the browser's native XPath (document.evaluate).  Generated
// expressions stay within what both implement the same way: no variables, no namespaces,
// no number-to-string conversion, and no axis after an attribute step (where libxslt, and
// therefore this implementation, departs from the specification).
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { evaluate } from '../src/xpath/index';
import { nodeSet } from '../src/xpath/value';

const XML = `<r>
  <a x="1"><b y="2">t1<c/>t2</b><!--m--><b>t3</b></a>
  <a x="2" y="3"><?p d?><c x="1">t4<a/></c><b><c/><c>t5</c></b></a>
  <c/>
</r>`;

const doc = new DOMParser().parseFromString(XML, 'application/xml');

const axis = fc.constantFrom(
  'child',
  'descendant',
  'parent',
  'ancestor',
  'following-sibling',
  'preceding-sibling',
  'following',
  'preceding',
  'self',
  'descendant-or-self',
  'ancestor-or-self',
);
const nodeTest = fc.constantFrom('a', 'b', 'c', '*', 'node()', 'text()', 'comment()');
const attrStep = fc.constantFrom('@x', '@y', '@*');

const { path } = fc.letrec<{ path: string; relPath: string; step: string; pred: string }>(
  (tie) => ({
    pred: fc.oneof(
      fc.constantFrom('1', '2', '3', 'last()', 'position() < 3', 'position() = last()'),
      tie('relPath'),
      fc.tuple(tie('relPath'), fc.constantFrom("'1'", "'t3'", '2')).map(([p, v]) => `${p} = ${v}`),
      tie('relPath').map((p) => `count(${p}) > 1`),
      tie('relPath').map((p) => `not(${p})`),
    ),
    step: fc.oneof(
      { weight: 4, arbitrary: fc.tuple(axis, nodeTest).map(([a, t]) => `${a}::${t}`) },
      { weight: 2, arbitrary: nodeTest.filter((t) => t !== 'comment()') },
      { weight: 1, arbitrary: fc.constantFrom('.', '..') },
      {
        weight: 1,
        arbitrary: fc
          .tuple(
            fc.tuple(axis, nodeTest).map(([a, t]) => `${a}::${t}`),
            tie('pred'),
          )
          .map(([s, p]) => `${s}[${p}]`),
      },
    ),
    relPath: fc
      .tuple(
        fc.array(tie('step'), { minLength: 1, maxLength: 3 }),
        fc.option(attrStep, { nil: undefined }),
      )
      .map(([steps, attr]) => [...steps, ...(attr ? [attr] : [])].join('/')),
    path: fc
      .tuple(fc.constantFrom('', '/', '//'), tie('relPath'))
      .map(([prefix, p]) => `${prefix}${p}`),
  }),
);

const R = XPathResult;

// XPath leaves the relative order of attributes implementation-dependent, and Chromium does
// not keep source order; attributes of one element are therefore compared as a set.
function normalize(nodes: Node[]): Node[] {
  const out = [...nodes];
  const owner = (n: Node) => (n.nodeType === 2 ? (n as Attr).ownerElement : null);
  for (let i = 0; i < out.length; ) {
    let j = i + 1;
    while (
      owner(out[i] as Node) &&
      j < out.length &&
      owner(out[j] as Node) === owner(out[i] as Node)
    )
      j++;
    out.splice(i, j - i, ...out.slice(i, j).sort((a, b) => a.nodeName.localeCompare(b.nodeName)));
    i = j;
  }
  return out;
}

function native(expr: string, type: number): unknown {
  const r = doc.evaluate(expr, doc, null, type, null);
  switch (type) {
    case R.NUMBER_TYPE:
      return r.numberValue;
    case R.BOOLEAN_TYPE:
      return r.booleanValue;
    case R.STRING_TYPE:
      return r.stringValue;
    default:
      return Array.from({ length: r.snapshotLength }, (_, i) => r.snapshotItem(i));
  }
}

const forms: [(p: string) => string, number][] = [
  [(p) => p, R.ORDERED_NODE_SNAPSHOT_TYPE],
  [(p) => `count(${p})`, R.NUMBER_TYPE],
  [(p) => `boolean(${p})`, R.BOOLEAN_TYPE],
  [(p) => `${p} = '1'`, R.BOOLEAN_TYPE],
  [(p) => `string-length(${p})`, R.NUMBER_TYPE],
  [(p) => `name(${p})`, R.STRING_TYPE],
  [(p) => `string(${p})`, R.STRING_TYPE],
];

test('agrees with document.evaluate', () => {
  fc.assert(
    fc.property(path, fc.integer({ min: 0, max: forms.length - 1 }), (p, f) => {
      const [wrap, type] = forms[f] as [(p: string) => string, number];
      // The first attribute of @* depends on attribute order.
      fc.pre(
        type === R.ORDERED_NODE_SNAPSHOT_TYPE ||
          type === R.NUMBER_TYPE ||
          type === R.BOOLEAN_TYPE ||
          !p.includes('@*'),
      );
      const expr = wrap(p);
      const ours = evaluate(expr, doc);
      const theirs = native(expr, type);
      if (type === R.ORDERED_NODE_SNAPSHOT_TYPE)
        expect(normalize(nodeSet(ours))).toEqual(normalize(theirs as Node[]));
      else expect([expr, ours]).toEqual([expr, theirs]);
    }),
    { numRuns: 1000 },
  );
});
