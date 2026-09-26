// XPath values and the conversions between them (XPath 1.0 §4).  Where libxslt departs
// from the specification, its behavior is followed; see docs/DIVERGENCES.md.
import { Code, XSLTError } from '../errors';

/** A node-set, always in document order without duplicates. */
export type NodeSet = Node[];
export type Value = string | number | boolean | NodeSet;

export function isText(n: Node | null): boolean {
  const t = n?.nodeType;
  return t === 3 || t === 4;
}

/** String value of a node.  A text node stands for the whole run of adjacent text nodes. */
export function stringValue(n: Node): string {
  switch (n.nodeType) {
    case 1:
    case 11:
      return n.textContent ?? '';
    case 9:
      return (n as Document).documentElement?.textContent ?? '';
    case 3:
    case 4: {
      let s = '';
      for (let c: Node | null = n; c && isText(c); c = c.nextSibling) s += c.nodeValue;
      return s;
    }
    default:
      return n.nodeValue ?? '';
  }
}

export function nodeSet(v: Value): NodeSet {
  if (!Array.isArray(v)) throw new XSLTError(Code.NotNodeSet);
  return v;
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

// libxslt prints integers within the range of a C int as integers, other numbers from 1e-5
// up to 1e9 in fixed notation and the rest in exponential notation, with 15 significant
// digits in both cases.
export function numberToString(x: number): string {
  if (Number.isNaN(x)) return 'NaN';
  if (!Number.isFinite(x)) return x > 0 ? 'Infinity' : '-Infinity';
  if (Number.isInteger(x) && x > -2147483648 && x < 2147483647) return String(x);
  const a = Math.abs(x);
  if (a >= 1e-5 && a < 1e9) return trimZeros(x.toPrecision(15));
  const [m = '', e = ''] = x.toExponential(14).split('e');
  return `${trimZeros(m)}e${e[0]}${e.slice(1).padStart(2, '0')}`;
}

const NUMBER = /^[\x20\t\r\n]*-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[\x20\t\r\n]*$/;

export function stringToNumber(s: string): number {
  return NUMBER.test(s) ? Number(s.replace(/[\x20\t\r\n]/g, '')) : Number.NaN;
}

export function toStr(v: Value): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return numberToString(v);
  if (typeof v === 'boolean') return String(v);
  return v[0] ? stringValue(v[0]) : '';
}

export function toNum(v: Value): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return +v;
  return stringToNumber(toStr(v));
}

export function toBool(v: Value): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v);
  return v.length > 0;
}

/** Result tree fragments: node-sets holding one DocumentFragment (XSLT 1.0 §11.1). */
export const fragments: WeakSet<NodeSet> = new WeakSet();

/** A node-set that may be used as the start of a path or filtered; RTFs may not (libxslt). */
export function pathSet(v: Value): NodeSet {
  const s = nodeSet(v);
  if (fragments.has(s)) throw new XSLTError(Code.NotNodeSet, 'result tree fragment');
  return s;
}
