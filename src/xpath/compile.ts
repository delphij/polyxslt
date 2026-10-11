// Compiles an XPath AST into closures.
import { Code, XSLTError } from '../errors.js';
import { Axis, axis, isReverse, rootOf, sortUnique, type Test, XMLNS } from './axes.js';
import { type Ast, DESCENDANT_OR_SELF, type NodeTest, type Step } from './parse.js';
import { isText, type NodeSet, pathSet, stringValue, toBool, toNum, type Value } from './value.js';

export type Fn = (c: Context, args: Value[]) => Value;
/** A function: minimum and maximum number of arguments, and the implementation. */
export type FnDef = readonly [min: number, max: number, fn: Fn];

export interface Env {
  /** Looks up a variable by expanded name (`local` or `{uri}local`). */
  v(name: string): Value | undefined;
  /** Functions by expanded name. */
  f: ReadonlyMap<string, FnDef>;
  /** The XSLT current node, if any. */
  c?: Node;
}

export interface Context {
  n: Node;
  p: number;
  s: number;
  e: Env;
}

export type Expr = (c: Context) => Value;

export function compileTest(a: Axis, t: NodeTest): Test {
  if ('type' in t) {
    switch (t.type) {
      case 'text':
        return isText;
      case 'comment':
        return (n) => n.nodeType === 8;
      case 'processing-instruction':
        return (n) => n.nodeType === 7 && (t.target === undefined || n.nodeName === t.target);
      default:
        return () => true;
    }
  }
  const type = a === Axis.Attribute ? 2 : 1;
  const { ns, local } = t;
  if (local === '*') {
    return ns === undefined
      ? (n) => n.nodeType === type
      : (n) => n.nodeType === type && (n as Element).namespaceURI === ns;
  }
  return (n) =>
    n.nodeType === type && (n as Element).localName === local && (n as Element).namespaceURI === ns;
}

/** Appends the nodes on an axis from `n` that pass a node test, in axis order. */
type Walk = (n: Node, out: Node[]) => void;

// A name test on the attribute or child axis is by far the most common step; the DOM finds
// an attribute by name, and the element children without the text nodes between them.
function compileAxis(a: Axis, t: NodeTest): Walk {
  const test = compileTest(a, t);
  if ('local' in t) {
    const { ns, local } = t;
    if (a === Axis.Attribute && local !== '*' && ns !== XMLNS) {
      return (n, out) => {
        const at = n.nodeType === 1 && (n as Element).getAttributeNodeNS(ns ?? null, local);
        if (at) out.push(at);
      };
    }
    if (a === Axis.Child) {
      return (n, out) => {
        for (let c = (n as Element).firstElementChild; c; c = c.nextElementSibling) {
          if (test(c)) out.push(c);
        }
      };
    }
  }
  return (n, out) => axis(a, n, test, out);
}

export function filter(nodes: NodeSet, pred: Expr, e: Env): NodeSet {
  const s = nodes.length;
  return nodes.filter((n, i) => {
    const v = pred({ n, p: i + 1, s, e });
    return typeof v === 'number' ? v === i + 1 : toBool(v);
  });
}

// `level` tells that the nodes are at the same depth of the tree: a single node, or what
// steps on the axes below give from such a set.
type StepFn = (nodes: NodeSet, e: Env, level: boolean) => NodeSet;

/** Axes that take nodes at one depth, in document order, to nodes at one depth. */
const keepsLevel = (a: Axis) => a === Axis.Child || a === Axis.Attribute || a === Axis.Self;

function compileStep(st: Step): StepFn {
  const a = st.axis;
  const walk = compileAxis(a, st.test);
  const preds = st.preds.map(compile);
  const reverse = isReverse(a);
  return (nodes, e, level) => {
    const out: Node[] = [];
    for (const n of nodes) {
      let r: Node[] = [];
      walk(n, r);
      for (const p of preds) r = filter(r, p, e);
      if (nodes.length === 1) return reverse ? r.reverse() : r;
      for (const x of r) out.push(x);
    }
    // The attributes of elements in document order are in document order, and so are the
    // children of nodes none of which is an ancestor of another; no node comes up twice.
    return a === Axis.Attribute || a === Axis.Self || (level && a === Axis.Child)
      ? out
      : sortUnique(out);
  };
}

// `//x` without predicates is descendant::x, which avoids sorting a large intermediate
// node-set.
function simplify(steps: Step[]): Step[] {
  const out: Step[] = [];
  for (const s of steps) {
    const prev = out[out.length - 1];
    if (prev === DESCENDANT_OR_SELF && s.axis === Axis.Child && !s.preds.length) {
      out[out.length - 1] = { ...s, axis: Axis.Descendant };
    } else {
      out.push(s);
    }
  }
  return out;
}

type Atom = string | number | boolean;

function compareAtoms(op: string, a: Atom, b: Atom): boolean {
  if (op === '=' || op === '!=') {
    const eq =
      typeof a === 'boolean' || typeof b === 'boolean'
        ? toBool(a) === toBool(b)
        : typeof a === 'number' || typeof b === 'number'
          ? toNum(a) === toNum(b)
          : a === b;
    return eq === (op === '=');
  }
  const x = toNum(a);
  const y = toNum(b);
  return op === '<' ? x < y : op === '<=' ? x <= y : op === '>' ? x > y : x >= y;
}

// XPath 1.0 §3.4.
function compare(op: string, a: Value, b: Value): boolean {
  const an = Array.isArray(a);
  const bn = Array.isArray(b);
  if (an && bn) {
    const bs = b.map(stringValue);
    return a.some((x) => {
      const xs = stringValue(x);
      return bs.some((ys) => compareAtoms(op, xs, ys));
    });
  }
  if (an || bn) {
    const other = (an ? b : a) as Atom;
    const set = (an ? a : b) as NodeSet;
    if (typeof other === 'boolean') {
      const s = toBool(set);
      return an ? compareAtoms(op, s, other) : compareAtoms(op, other, s);
    }
    return set.some((n) => {
      const s = stringValue(n);
      const x = typeof other === 'number' ? toNum(s) : s;
      return an ? compareAtoms(op, x, other) : compareAtoms(op, other, x);
    });
  }
  return compareAtoms(op, a as Atom, b as Atom);
}

const ARITHMETIC: Record<string, (x: number, y: number) => number> = {
  '+': (x, y) => x + y,
  '-': (x, y) => x - y,
  '*': (x, y) => x * y,
  div: (x, y) => x / y,
  mod: (x, y) => x % y,
};

export function compile(ast: Ast): Expr {
  switch (ast.t) {
    case 'num':
    case 'str': {
      const v = ast.v;
      return () => v;
    }
    case 'var': {
      const name = ast.name;
      return (c) => {
        const v = c.e.v(name);
        if (v === undefined) throw new XSLTError(Code.UndefinedVariable, name);
        return v;
      };
    }
    case 'fn': {
      const { name } = ast;
      const args = ast.args.map(compile);
      return (c) => {
        const def = c.e.f.get(name);
        if (!def) throw new XSLTError(Code.UnknownFunction, name);
        if (args.length < def[0] || args.length > def[1]) throw new XSLTError(Code.BadArity, name);
        return def[2](
          c,
          args.map((a) => a(c)),
        );
      };
    }
    case 'neg': {
      const e = compile(ast.e);
      return (c) => -toNum(e(c));
    }
    case 'op': {
      const l = compile(ast.l);
      const r = compile(ast.r);
      const op = ast.op;
      if (op === 'or') return (c) => toBool(l(c)) || toBool(r(c));
      if (op === 'and') return (c) => toBool(l(c)) && toBool(r(c));
      if (op === '|') {
        return (c) => {
          const a = pathSet(l(c));
          const b = pathSet(r(c));
          return !a.length ? b : !b.length ? a : sortUnique([...a, ...b]);
        };
      }
      const f = ARITHMETIC[op];
      if (f) return (c) => f(toNum(l(c)), toNum(r(c)));
      return (c) => compare(op, l(c), r(c));
    }
    case 'filter': {
      const e = compile(ast.e);
      const preds = ast.preds.map(compile);
      return (c) => {
        let ns = pathSet(e(c));
        for (const p of preds) ns = filter(ns, p, c.e);
        return ns;
      };
    }
    case 'path': {
      const steps = simplify(ast.steps);
      const fns = steps.map(compileStep);
      const keeps = steps.map((s) => keepsLevel(s.axis));
      const start = ast.start && compile(ast.start);
      const root = ast.root;
      return (c) => {
        let ns: NodeSet = start ? pathSet(start(c)) : [root ? rootOf(c.n) : c.n];
        let level = false;
        for (let i = 0; i < fns.length; i++) {
          level ||= ns.length < 2;
          ns = (fns[i] as StepFn)(ns, c.e, level);
          level &&= keeps[i] as boolean;
        }
        return ns;
      };
    }
  }
}
