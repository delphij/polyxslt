// The XPath 1.0 core function library (XPath 1.0 §4).
import { rootOf, sortUnique } from './axes';
import type { Context, FnDef } from './compile';
import { XML_NS } from './parse';
import { type NodeSet, nodeSet, stringValue, toBool, toNum, toStr, type Value } from './value';

// The argument, or the context node as a node-set when the argument is omitted.
const arg = (c: Context, a: Value[]): Value => a[0] ?? [c.n];
const str = (c: Context, a: Value[]) => toStr(arg(c, a));
const chars = (s: string) => [...s];

function firstNode(c: Context, a: Value[]): Node | undefined {
  return nodeSet(arg(c, a))[0];
}

function nameOf(n: Node | undefined, local: boolean): string {
  if (!n) return '';
  if (n.nodeType === 7) return n.nodeName;
  if (n.nodeType !== 1 && n.nodeType !== 2) return '';
  const e = n as Element;
  return local || !e.prefix ? e.localName : `${e.prefix}:${e.localName}`;
}

// Elements by xml:id, per document.  Attributes declared as ID in a DTD are not visible
// through the DOM and are not supported.
const ids = new WeakMap<Node, Map<string, Element>>();

function idIndex(root: Node): Map<string, Element> {
  let m = ids.get(root);
  if (!m) {
    const index = new Map<string, Element>();
    const walker = (root.ownerDocument ?? (root as Document)).createTreeWalker(root, 1);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const id = (n as Element).getAttributeNS(XML_NS, 'id');
      if (id !== null && !index.has(id)) index.set(id, n as Element);
    }
    ids.set(root, index);
    m = index;
  }
  return m;
}

function id(c: Context, [v]: Value[]): NodeSet {
  const values = Array.isArray(v) ? v.map(stringValue) : [toStr(v as Value)];
  const index = idIndex(rootOf(c.n));
  const out: Node[] = [];
  for (const s of values) {
    for (const t of s.split(/[\x20\t\r\n]+/)) {
      const e = t && index.get(t);
      if (e) out.push(e);
    }
  }
  return sortUnique(out);
}

function lang(c: Context, [v]: Value[]): boolean {
  const want = toStr(v as Value).toLowerCase();
  for (
    let n: Node | null = c.n;
    n;
    n = n.nodeType === 2 ? (n as Attr).ownerElement : n.parentNode
  ) {
    const l = n.nodeType === 1 ? (n as Element).getAttributeNS(XML_NS, 'lang') : null;
    if (l !== null) {
      const have = l.toLowerCase();
      return have === want || have.startsWith(`${want}-`);
    }
  }
  return false;
}

function substring(_: Context, [v, start, len]: Value[]): string {
  const from = Math.round(toNum(start as Value));
  const end = len === undefined ? Number.POSITIVE_INFINITY : from + Math.round(toNum(len));
  if (Number.isNaN(from) || Number.isNaN(end)) return '';
  let res = '';
  let pos = 1;
  for (const ch of toStr(v as Value)) {
    if (pos >= end) break;
    if (pos >= from) res += ch;
    pos++;
  }
  return res;
}

function translate(_: Context, a: Value[]): string {
  const [s = [], from = [], to = []] = a.map((v) => chars(toStr(v)));
  const map = new Map<string, string>();
  from.forEach((ch, i) => {
    if (!map.has(ch)) map.set(ch, to[i] ?? '');
  });
  return s.map((ch) => map.get(ch) ?? ch).join('');
}

type S = string;
const s2 = (f: (a: S, b: S) => Value): FnDef => [
  2,
  2,
  (_, [a, b]) => f(toStr(a as Value), toStr(b as Value)),
];
const n1 = (f: (x: number) => number): FnDef => [1, 1, (_, [a]) => f(toNum(a as Value))];

export const coreFunctions: ReadonlyMap<string, FnDef> = new Map<string, FnDef>([
  ['last', [0, 0, (c) => c.s]],
  ['position', [0, 0, (c) => c.p]],
  ['count', [1, 1, (_, [a]) => nodeSet(a as Value).length]],
  ['id', [1, 1, id]],
  ['local-name', [0, 1, (c, a) => nameOf(firstNode(c, a), true)]],
  [
    'namespace-uri',
    [
      0,
      1,
      (c, a) => {
        const n = firstNode(c, a);
        return n && (n.nodeType === 1 || n.nodeType === 2)
          ? ((n as Element).namespaceURI ?? '')
          : '';
      },
    ],
  ],
  ['name', [0, 1, (c, a) => nameOf(firstNode(c, a), false)]],
  ['string', [0, 1, str]],
  ['concat', [2, Number.POSITIVE_INFINITY, (_, a) => a.map(toStr).join('')]],
  ['starts-with', s2((a, b) => a.startsWith(b))],
  ['contains', s2((a, b) => a.includes(b))],
  [
    'substring-before',
    s2((a, b) => {
      const i = a.indexOf(b);
      return i < 0 ? '' : a.slice(0, i);
    }),
  ],
  [
    'substring-after',
    s2((a, b) => {
      const i = a.indexOf(b);
      return i < 0 ? '' : a.slice(i + b.length);
    }),
  ],
  ['substring', [2, 3, substring]],
  [
    'string-length',
    [
      0,
      1,
      (c, a) => {
        let n = 0;
        for (const _ of str(c, a)) n++;
        return n;
      },
    ],
  ],
  [
    'normalize-space',
    [
      0,
      1,
      (c, a) =>
        str(c, a)
          .replace(/[\x20\t\r\n]+/g, ' ')
          .replace(/^ | $/g, ''),
    ],
  ],
  ['translate', [3, 3, translate]],
  ['boolean', [1, 1, (_, [a]) => toBool(a as Value)]],
  ['not', [1, 1, (_, [a]) => !toBool(a as Value)]],
  ['true', [0, 0, () => true]],
  ['false', [0, 0, () => false]],
  ['lang', [1, 1, lang]],
  ['number', [0, 1, (c, a) => toNum(arg(c, a))]],
  ['sum', [1, 1, (_, [a]) => nodeSet(a as Value).reduce((t, n) => t + toNum(stringValue(n)), 0)]],
  ['floor', n1(Math.floor)],
  ['ceiling', n1(Math.ceil)],
  ['round', n1(Math.round)],
]);
