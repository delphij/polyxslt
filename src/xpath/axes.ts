// The XPath data model over the DOM, and the axes (XPath 1.0 §2.2, §5).
//
// XPath nodes are DOM nodes, except that a run of adjacent Text and CDATASection nodes is
// one text node, represented by the first node of the run, and that document types are
// not nodes at all.
import { Code, XSLTError } from '../errors';
import { isText } from './value';

export enum Axis {
  Child,
  Descendant,
  Parent,
  Ancestor,
  FollowingSibling,
  PrecedingSibling,
  Following,
  Preceding,
  Attribute,
  Namespace,
  Self,
  DescendantOrSelf,
  AncestorOrSelf,
}

export const AXIS_NAMES: readonly string[] = [
  'child',
  'descendant',
  'parent',
  'ancestor',
  'following-sibling',
  'preceding-sibling',
  'following',
  'preceding',
  'attribute',
  'namespace',
  'self',
  'descendant-or-self',
  'ancestor-or-self',
];

export function isReverse(a: Axis): boolean {
  return (
    a === Axis.Ancestor ||
    a === Axis.AncestorOrSelf ||
    a === Axis.Preceding ||
    a === Axis.PrecedingSibling
  );
}

export type Test = (n: Node) => boolean;

const XMLNS = 'http://www.w3.org/2000/xmlns/';

function isNode(n: Node): boolean {
  return n.nodeType !== 10 && !(isText(n) && isText(n.previousSibling));
}

export function parentOf(n: Node): Node | null {
  return n.nodeType === 2 ? (n as Attr).ownerElement : n.parentNode;
}

export function rootOf(n: Node): Node {
  for (let p = parentOf(n); p; p = parentOf(p)) n = p;
  return n;
}

function skip(c: Node | null, back: boolean): Node | null {
  while (c && !isNode(c)) c = back ? c.previousSibling : c.nextSibling;
  return c;
}

const first = (n: Node) => skip(n.firstChild, false);
const last = (n: Node) => skip(n.lastChild, true);
export const next = (n: Node): Node | null => skip(n.nextSibling, false);
export const prev = (n: Node): Node | null => skip(n.previousSibling, true);

function descendants(n: Node, test: Test, out: Node[]): void {
  for (let c = first(n); c; c = next(c)) {
    if (test(c)) out.push(c);
    descendants(c, test, out);
  }
}

// Descendants of n in reverse document order, followed by n itself.
function reverseSubtree(n: Node, test: Test, out: Node[]): void {
  for (let c = last(n); c; c = prev(c)) reverseSubtree(c, test, out);
  if (test(n)) out.push(n);
}

/** Appends the nodes on `axis` from `n` that pass `test`, in axis order. */
export function axis(a: Axis, n: Node, test: Test, out: Node[]): void {
  const attr = n.nodeType === 2;
  switch (a) {
    case Axis.Child:
      for (let c = first(n); c; c = next(c)) if (test(c)) out.push(c);
      break;
    case Axis.DescendantOrSelf:
      if (test(n)) out.push(n);
      descendants(n, test, out);
      break;
    case Axis.Descendant:
      descendants(n, test, out);
      break;
    case Axis.Parent: {
      const p = parentOf(n);
      if (p && test(p)) out.push(p);
      break;
    }
    case Axis.AncestorOrSelf:
    case Axis.Ancestor:
      for (let p = a === Axis.Ancestor ? parentOf(n) : n; p; p = parentOf(p)) {
        if (test(p)) out.push(p);
      }
      break;
    case Axis.FollowingSibling:
      if (!attr) for (let c = next(n); c; c = next(c)) if (test(c)) out.push(c);
      break;
    case Axis.PrecedingSibling:
      if (!attr) for (let c = prev(n); c; c = prev(c)) if (test(c)) out.push(c);
      break;
    // libxslt starts the following axis of an attribute after its element, leaving out the
    // element's descendants although they follow the attribute in document order.
    case Axis.Following:
      for (let c = attr ? parentOf(n) : n; c; c = parentOf(c)) {
        for (let s = next(c); s; s = next(s)) {
          if (test(s)) out.push(s);
          descendants(s, test, out);
        }
      }
      break;
    case Axis.Preceding:
      for (let c = attr ? parentOf(n) : n; c; c = parentOf(c)) {
        for (let s = prev(c); s; s = prev(s)) reverseSubtree(s, test, out);
      }
      break;
    case Axis.Attribute:
      if (n.nodeType === 1) {
        for (const at of (n as Element).attributes) {
          if (at.namespaceURI !== XMLNS && test(at)) out.push(at);
        }
      }
      break;
    case Axis.Namespace:
      throw new XSLTError(Code.Unsupported, 'namespace axis');
    case Axis.Self:
      if (test(n)) out.push(n);
      break;
  }
}

// Document order positions of every node of a tree, including attributes, computed once
// per tree and generation.  compareDocumentPosition is used for small sets; on large ones
// it is far slower, as engines may walk sibling lists for each comparison.
let generation = 0;
const orders = new WeakMap<Node, { g: number; m: Map<Node, number> }>();

/** Called when documents may have changed: at the start of each transformation. */
export function newGeneration(): void {
  generation++;
}

function positions(root: Node): Map<Node, number> {
  let o = orders.get(root);
  if (!o || o.g !== generation) {
    const m = new Map<Node, number>();
    const walk = (n: Node) => {
      m.set(n, m.size);
      if (n.nodeType === 1) for (const a of (n as Element).attributes) m.set(a, m.size);
      for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
    };
    walk(root);
    o = { g: generation, m };
    orders.set(root, o);
  }
  return o.m;
}

const byPosition = (x: Node, y: Node) => (x.compareDocumentPosition(y) & 4 ? -1 : 1);

/** Sorts nodes into document order and removes duplicates. */
export function sortUnique(nodes: Node[]): Node[] {
  const u = [...new Set(nodes)];
  if (u.length < 2) return u;
  if (u.length < 64) return u.sort(byPosition);
  const m = positions(rootOf(u[0] as Node));
  // Nodes from another tree, or added since the positions were computed.
  if (u.some((n) => !m.has(n))) return u.sort(byPosition);
  return u.sort((x, y) => (m.get(x) as number) - (m.get(y) as number));
}
