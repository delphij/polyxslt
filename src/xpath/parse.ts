// XPath 1.0 tokenizer and parser (XPath 1.0 §2, §3).  Operator-name and multiply-operator
// disambiguation (§3.7) falls out of the parser: in operator position a name or `*` is an
// operator, elsewhere it is a name test.
import { Code, XSLTError } from '../errors';
import { AXIS_NAMES, Axis } from './axes';

export type NameTest = { ns?: string | null; local: string };
export type TypeTest = { type: string; target?: string };
export type NodeTest = NameTest | TypeTest;

export interface Step {
  axis: Axis;
  test: NodeTest;
  preds: Ast[];
}

export type Ast =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'var'; name: string }
  | { t: 'fn'; name: string; args: Ast[] }
  | { t: 'op'; op: string; l: Ast; r: Ast }
  | { t: 'neg'; e: Ast }
  | { t: 'filter'; e: Ast; preds: Ast[] }
  | { t: 'path'; root: boolean; start?: Ast; steps: Step[] };

/** Maps a namespace prefix to its URI, or null if the prefix is not declared. */
export type Resolver = (prefix: string) => string | null;

export const XML_NS = 'http://www.w3.org/XML/1998/namespace';

// XML 1.0 (5th ed.) NameStartChar and NameChar, without the colon.
const START =
  'A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF' +
  '\\u200C\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD' +
  '\\u{10000}-\\u{EFFFF}';
const NCNAME = `[${START}][${START}\\-.0-9\\u00B7\\u0300-\\u036F\\u203F\\u2040]*`;

// Groups: 1 number, 2 and 3 literal, 4 name, 5 punctuation.  libxslt accepts an exponent
// in numbers, which XPath 1.0 does not; it is accepted here as well.
const TOKEN = new RegExp(
  `[\\x20\\t\\r\\n]*(?:((?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?)|"([^"]*)"|'([^']*)'|` +
    `(${NCNAME}(?::(?:${NCNAME}|\\*))?)|(\\.\\.|::|//|!=|<=|>=|[-()[\\]@,|+=<>/*.$]))`,
  'uy',
);

enum K {
  Num,
  Str,
  Name,
  Punct,
  End,
}

interface Token {
  k: K;
  v: string;
}

function lex(src: string): Token[] {
  const out: Token[] = [];
  let pos = 0;
  for (;;) {
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(src);
    if (!m) break;
    pos = TOKEN.lastIndex;
    if (m[1] !== undefined) out.push({ k: K.Num, v: m[1] });
    else if (m[2] !== undefined || m[3] !== undefined)
      out.push({ k: K.Str, v: m[2] ?? m[3] ?? '' });
    else if (m[4] !== undefined) out.push({ k: K.Name, v: m[4] });
    else out.push({ k: K.Punct, v: m[5] ?? '' });
  }
  if (!/^[\x20\t\r\n]*$/.test(src.slice(pos))) throw new XSLTError(Code.XPathSyntax, src);
  out.push({ k: K.End, v: '' });
  return out;
}

const PRECEDENCE = new Map([
  ['or', 1],
  ['and', 2],
  ['=', 3],
  ['!=', 3],
  ['<', 4],
  ['<=', 4],
  ['>', 4],
  ['>=', 4],
  ['+', 5],
  ['-', 5],
  ['*', 6],
  ['div', 6],
  ['mod', 6],
]);

const NODE_TYPES = ['node', 'text', 'comment', 'processing-instruction'];

export function parse(src: string, resolve: Resolver): Ast {
  const toks = lex(src);
  let i = 0;

  const peek = (d = 0) => toks[Math.min(i + d, toks.length - 1)] as Token;
  const fail = (): never => {
    throw new XSLTError(Code.XPathSyntax, src);
  };
  const is = (v: string, d = 0) => peek(d).k === K.Punct && peek(d).v === v;
  const eat = (v: string) => {
    if (!is(v)) fail();
    i++;
  };

  // Expands a QName; an unprefixed name has no namespace.
  const expand = (qname: string): [ns: string | null, local: string] => {
    const c = qname.indexOf(':');
    if (c < 0) return [null, qname];
    const prefix = qname.slice(0, c);
    const ns = prefix === 'xml' ? XML_NS : resolve(prefix);
    if (ns === null) throw new XSLTError(Code.UnknownPrefix, prefix);
    return [ns, qname.slice(c + 1)];
  };
  const key = (qname: string) => {
    const [ns, local] = expand(qname);
    return ns === null ? local : `{${ns}}${local}`;
  };

  const isNodeType = (d = 0) =>
    peek(d).k === K.Name && NODE_TYPES.includes(peek(d).v) && is('(', d + 1);
  const startsPrimary = () => {
    const t = peek();
    return (
      t.k === K.Num ||
      t.k === K.Str ||
      is('$') ||
      is('(') ||
      (t.k === K.Name && is('(', 1) && !isNodeType())
    );
  };
  const startsStep = () => {
    const t = peek();
    return t.k === K.Name || is('.') || is('..') || is('@') || is('*');
  };

  const predicates = (): Ast[] => {
    const preds: Ast[] = [];
    while (is('[')) {
      i++;
      preds.push(expr(1));
      eat(']');
    }
    return preds;
  };

  const DESCENDANT_OR_SELF: Step = {
    axis: Axis.DescendantOrSelf,
    test: { type: 'node' },
    preds: [],
  };

  const step = (): Step => {
    if (is('.') || is('..')) {
      const axis = peek().v === '.' ? Axis.Self : Axis.Parent;
      i++;
      return { axis, test: { type: 'node' }, preds: [] };
    }
    let axis = Axis.Child;
    if (is('@')) {
      i++;
      axis = Axis.Attribute;
    } else if (peek().k === K.Name && is('::', 1)) {
      axis = AXIS_NAMES.indexOf(peek().v);
      if (axis < 0) fail();
      i += 2;
    }
    let test: NodeTest;
    const t = peek();
    if (is('*')) {
      i++;
      test = { local: '*' };
    } else if (isNodeType()) {
      i += 2;
      test = { type: t.v };
      if (t.v === 'processing-instruction' && peek().k === K.Str) test.target = toks[i++]?.v ?? '';
      eat(')');
    } else if (t.k === K.Name) {
      i++;
      if (t.v.endsWith(':*')) {
        const [ns] = expand(`${t.v.slice(0, -2)}:x`);
        test = { ns, local: '*' };
      } else {
        const [ns, local] = expand(t.v);
        test = { ns, local };
      }
    } else {
      return fail();
    }
    return { axis, test, preds: predicates() };
  };

  const relative = (steps: Step[]): Step[] => {
    steps.push(step());
    while (is('/') || is('//')) {
      if (toks[i++]?.v === '//') steps.push(DESCENDANT_OR_SELF);
      steps.push(step());
    }
    return steps;
  };

  const primary = (): Ast => {
    const t = toks[i++] as Token;
    if (t.k === K.Num) return { t: 'num', v: Number(t.v) };
    if (t.k === K.Str) return { t: 'str', v: t.v };
    if (t.v === '$') {
      const n = toks[i++] as Token;
      if (n.k !== K.Name || n.v.endsWith(':*')) fail();
      return { t: 'var', name: key(n.v) };
    }
    if (t.v === '(') {
      const e = expr(1);
      eat(')');
      return e;
    }
    // Function call; startsPrimary() has checked the shape.
    i++;
    const args: Ast[] = [];
    if (!is(')')) {
      args.push(expr(1));
      while (is(',')) {
        i++;
        args.push(expr(1));
      }
    }
    eat(')');
    return { t: 'fn', name: key(t.v), args };
  };

  const path = (): Ast => {
    if (is('/')) {
      i++;
      return { t: 'path', root: true, steps: startsStep() ? relative([]) : [] };
    }
    if (is('//')) {
      i++;
      return { t: 'path', root: true, steps: relative([DESCENDANT_OR_SELF]) };
    }
    if (startsPrimary()) {
      let e = primary();
      const preds = predicates();
      if (preds.length) e = { t: 'filter', e, preds };
      if (!is('/') && !is('//')) return e;
      const steps: Step[] = [];
      if (toks[i++]?.v === '//') steps.push(DESCENDANT_OR_SELF);
      return { t: 'path', root: false, start: e, steps: relative(steps) };
    }
    return { t: 'path', root: false, steps: relative([]) };
  };

  const union = (): Ast => {
    let l = path();
    while (is('|')) {
      i++;
      l = { t: 'op', op: '|', l, r: path() };
    }
    return l;
  };

  const unary = (): Ast => {
    if (!is('-')) return union();
    i++;
    return { t: 'neg', e: unary() };
  };

  const operator = (): string | undefined => {
    const t = peek();
    if (t.k === K.Punct || (t.k === K.Name && /^(and|or|div|mod)$/.test(t.v))) {
      return PRECEDENCE.has(t.v) ? t.v : undefined;
    }
    return undefined;
  };

  function expr(min: number): Ast {
    let l = unary();
    for (;;) {
      const op = operator();
      const prec = op ? (PRECEDENCE.get(op) ?? 0) : 0;
      if (!op || prec < min) return l;
      i++;
      l = { t: 'op', op, l, r: expr(prec + 1) };
    }
  }

  const ast = expr(1);
  if (peek().k !== K.End) fail();
  return ast;
}
