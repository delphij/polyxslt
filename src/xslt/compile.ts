// Compiles a stylesheet document into rules and instruction closures (XSLT 1.0 §2–§11).
import { Code, XSLTError } from '../errors.js';
import { createElement, setAttribute } from '../out/finish.js';
import { Axis, axis } from '../xpath/axes.js';
import type { Expr } from '../xpath/compile.js';
import { compileXPath, type Resolver } from '../xpath/index.js';
import { expand, expandedName, XML_NS } from '../xpath/parse.js';
import {
  fragments,
  isBlank,
  type NodeSet,
  nodeSet,
  stringValue,
  toBool,
  toNum,
  toStr,
  type Value,
} from '../xpath/value.js';
import { type Avt, avt } from './avt.js';
import { compilePattern } from './pattern.js';
import {
  type Body,
  type Instr,
  MAX_DEPTH,
  type Rule,
  type Run,
  type Stylesheet,
  seq,
  X,
  XSL_NS,
} from './runtime.js';

const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';

type InstrCompiler = (el: Element) => Instr;

// XSLT elements outside 1.0 of this implementation, reported as not supported rather
// than unknown.
export const UNSUPPORTED: readonly string[] = [
  'apply-imports',
  'attribute-set',
  'call-template',
  'comment',
  'copy',
  'decimal-format',
  'fallback',
  'import',
  'include',
  'key',
  'message',
  'namespace-alias',
  'number',
  'param',
  'preserve-space',
  'processing-instruction',
  'strip-space',
  'with-param',
];

/** XSLT instructions by local name; extension modules may add to it. */
export const instructions: Map<string, InstrCompiler> = new Map();

const resolver =
  (el: Element): Resolver =>
  (prefix) =>
    el.lookupNamespaceURI(prefix);

function attr(el: Element, name: string): string {
  const v = el.getAttribute(name);
  if (v === null) throw new XSLTError(Code.MissingAttribute, `${el.localName}/@${name}`);
  return v;
}

const xpath = (el: Element, name: string): Expr => compileXPath(attr(el, name), resolver(el));
const optionalAvt = (el: Element, name: string, dflt: string): Avt => {
  const v = el.getAttribute(name);
  return v === null ? () => dflt : avt(v, resolver(el));
};

const isXsl = (el: Element, name: string) => el.namespaceURI === XSL_NS && el.localName === name;

// An XSLT element that is not known here: not supported, or not an XSLT element at all.
const unknown = (el: Element) =>
  new XSLTError(
    UNSUPPORTED.includes(el.localName) ? Code.Unsupported : Code.UnknownInstruction,
    `xsl:${el.localName}`,
  );

function preserveSpace(el: Element): boolean {
  for (let e: Element | null = el; e; e = e.parentElement) {
    const s = e.getAttributeNS(XML_NS, 'space');
    if (s !== null) return s === 'preserve';
  }
  return false;
}

/** Compiles the children of `el` as a sequence of instructions. */
export function body(el: Element): Body {
  const out: Instr[] = [];
  const keepSpace = preserveSpace(el);
  for (const c of el.childNodes) {
    if (c.nodeType === 1) {
      out.push(instruction(c as Element));
    } else if (c.nodeType === 3 || c.nodeType === 4) {
      const t = c.nodeValue ?? '';
      if (keepSpace || !isBlank(t)) {
        out.push((x, o) => {
          text(x, o, t, false);
        });
      }
    }
  }
  return seq(out);
}

function instruction(el: Element): Instr {
  if (el.namespaceURI !== XSL_NS) return literal(el);
  const c = instructions.get(el.localName);
  if (!c) throw unknown(el);
  return c(el);
}

// Counts result nodes against the optional limit.
function count(r: Run): void {
  if (++r.count > r.max) throw new XSLTError(Code.Limit, 'result nodes');
}

function text(x: X, out: Node, s: string, doe: boolean): void {
  count(x.r);
  const t = x.r.out.createTextNode(s);
  out.appendChild(t);
  if (doe) x.r.doe.add(t);
}

/** Runs a body into a new result tree fragment. */
function fragment(b: Body, x: X): DocumentFragment {
  const f = x.r.out.createDocumentFragment();
  b(x, f);
  return f;
}

function element(x: X, out: Node, ns: string | null, name: string): Element {
  count(x.r);
  let e: Element;
  try {
    e = createElement(x.r, out, ns, name);
  } catch {
    throw new XSLTError(Code.BadName, name);
  }
  out.appendChild(e);
  return e;
}

function literal(el: Element): Instr {
  const ns = el.namespaceURI;
  const name = el.nodeName;
  const attrs: [string | null, string, Avt][] = [];
  for (const a of el.attributes) {
    if (a.namespaceURI === XMLNS_NS) continue;
    if (a.namespaceURI === XSL_NS) {
      if (a.localName === 'use-attribute-sets') throw new XSLTError(Code.Unsupported, a.name);
      continue;
    }
    attrs.push([a.namespaceURI, a.name, avt(a.value, resolver(el))]);
  }
  const b = body(el);
  return (x, out) => {
    const e = element(x, out, ns, name);
    for (const [ans, an, v] of attrs) setAttribute(x.r, e, ans, an, v(x));
    b(x, e);
  };
}

// --- Template application -------------------------------------------------------------

function findRule(n: Node, x: X): Rule | undefined {
  const s = x.r.s;
  const t = n.nodeType;
  const rules =
    (t === 1 || t === 2
      ? s.byName.get((t === 2 ? '@' : '') + (n as Element).localName)
      : undefined) ?? s.other;
  return rules.find((r) => r.m(n, x));
}

function children(n: Node): NodeSet {
  const out: Node[] = [];
  axis(Axis.Child, n, () => true, out);
  return out;
}

function builtin(n: Node, x: X, out: Node): void {
  const t = n.nodeType;
  if (t === 1 || t === 9 || t === 11) {
    applyTemplates(children(n), x, out);
  } else if (t === 2 || t === 3 || t === 4) {
    text(x, out, stringValue(n), false);
  }
}

export function applyTemplates(nodes: NodeSet, x: X, out: Node): void {
  const r = x.r;
  if (++r.d > MAX_DEPTH) throw new XSLTError(Code.Limit, 'template depth');
  const s = nodes.length;
  nodes.forEach((n, i) => {
    const y = new X(n, i + 1, s, null, r);
    const rule = findRule(n, y);
    if (rule) rule.b(y, out);
    else builtin(n, y, out);
  });
  r.d--;
}

// --- Sorting (§10) ---------------------------------------------------------------------

type Sort = (nodes: NodeSet, x: X) => NodeSet;

function compileSorts(el: Element): Sort | undefined {
  const keys = [...el.children]
    .filter((c) => isXsl(c, 'sort'))
    .map((k) => ({
      sel: compileXPath(k.getAttribute('select') ?? '.', resolver(k)),
      order: optionalAvt(k, 'order', 'ascending'),
      type: optionalAvt(k, 'data-type', 'text'),
      lang: optionalAvt(k, 'lang', ''),
    }));
  if (!keys.length) return undefined;
  return (nodes, x) => {
    const specs = keys.map((k) => {
      const lang = k.lang(x);
      let collator: Intl.Collator | undefined;
      try {
        collator = lang ? new Intl.Collator(lang) : undefined;
      } catch {
        // An invalid language tag falls back to code point order.
      }
      return {
        desc: k.order(x) === 'descending',
        num: k.type(x) === 'number',
        cmp: collator ? collator.compare : (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0),
      };
    });
    const s = nodes.length;
    // The keys of each node are computed once, before sorting.
    const rows = nodes.map((n, i) => {
      const y = new X(n, i + 1, s, x.b, x.r);
      return {
        n,
        k: keys.map((k, j) => {
          const v = toStr(k.sel(y));
          return specs[j]?.num ? toNum(v) : v;
        }),
      };
    });
    rows.sort((a, b) => {
      for (const [j, spec] of specs.entries()) {
        const u = a.k[j] as string | number;
        const v = b.k[j] as string | number;
        let c: number;
        if (spec.num) {
          const p = u as number;
          const q = v as number;
          c = Number.isNaN(p) ? (Number.isNaN(q) ? 0 : -1) : Number.isNaN(q) ? 1 : p - q;
        } else {
          c = spec.cmp(u as string, v as string);
        }
        if (c) return spec.desc ? -c : c;
      }
      return 0;
    });
    return rows.map((r) => r.n);
  };
}

// --- Instructions ----------------------------------------------------------------------

instructions.set('apply-templates', (el) => {
  if (el.hasAttribute('mode')) throw new XSLTError(Code.Unsupported, 'mode');
  const sel = el.hasAttribute('select') ? xpath(el, 'select') : undefined;
  const sort = compileSorts(el);
  return (x, out) => {
    const nodes = sel ? nodeSet(sel(x)) : children(x.n);
    applyTemplates(sort ? sort(nodes, x) : nodes, x, out);
  };
});

instructions.set('for-each', (el) => {
  const sel = xpath(el, 'select');
  const sort = compileSorts(el);
  const b = body(el);
  return (x, out) => {
    let nodes = nodeSet(sel(x));
    if (sort) nodes = sort(nodes, x);
    const s = nodes.length;
    nodes.forEach((n, i) => {
      b(new X(n, i + 1, s, x.b, x.r), out);
    });
  };
});

// Handled by the enclosing for-each or apply-templates.
instructions.set('sort', () => () => {});

instructions.set('if', (el) => {
  const test = xpath(el, 'test');
  const b = body(el);
  return (x, out) => {
    if (toBool(test(x))) b(x, out);
  };
});

instructions.set('choose', (el) => {
  const branches: [Expr | undefined, Body][] = [];
  for (const c of el.children) {
    if (isXsl(c, 'when')) branches.push([xpath(c, 'test'), body(c)]);
    else if (isXsl(c, 'otherwise')) branches.push([undefined, body(c)]);
    else throw new XSLTError(Code.UnknownInstruction, c.nodeName);
  }
  if (!branches.length || !branches[0]?.[0]) throw new XSLTError(Code.MissingAttribute, 'xsl:when');
  return (x, out) => {
    const hit = branches.find(([t]) => !t || toBool(t(x)));
    hit?.[1](x, out);
  };
});

const doe = (el: Element) => el.getAttribute('disable-output-escaping') === 'yes';

instructions.set('value-of', (el) => {
  const sel = xpath(el, 'select');
  const raw = doe(el);
  return (x, out) => {
    text(x, out, toStr(sel(x)), raw);
  };
});

instructions.set('text', (el) => {
  const s = el.textContent ?? '';
  const raw = doe(el);
  return (x, out) => {
    text(x, out, s, raw);
  };
});

// Copies a node of the XPath data model (§11.3): a run of text nodes is one text node, and
// document types are not copied.  Every copied node counts against the result node limit.
function copyNode(n: Node, x: X, out: Node): void {
  const doc = x.r.out;
  switch (n.nodeType) {
    case 1: {
      const e = n as Element;
      const copy = element(
        x,
        out,
        e.namespaceURI,
        e.prefix ? `${e.prefix}:${e.localName}` : e.localName,
      );
      for (const a of e.attributes) setAttribute(x.r, copy, a.namespaceURI, a.name, a.value);
      copyChildren(e, x, copy);
      return;
    }
    case 2: {
      const a = n as Attr;
      if (out.nodeType !== 1) return;
      if (out.hasChildNodes()) throw new XSLTError(Code.AttributeAfterChildren, a.name);
      setAttribute(x.r, out as Element, a.namespaceURI, a.name, a.value);
      return;
    }
    case 3:
    case 4:
      text(x, out, stringValue(n), false);
      return;
    case 7:
      count(x.r);
      out.appendChild(doc.createProcessingInstruction(n.nodeName, n.nodeValue ?? ''));
      return;
    case 8:
      count(x.r);
      out.appendChild(doc.createComment(n.nodeValue ?? ''));
      return;
    default:
      copyChildren(n, x, out);
  }
}

function copyChildren(n: Node, x: X, out: Node): void {
  for (const c of children(n)) copyNode(c, x, out);
}

instructions.set('copy-of', (el) => {
  const sel = xpath(el, 'select');
  return (x, out) => {
    const v = sel(x);
    if (Array.isArray(v)) {
      for (const n of v) copyNode(n, x, out);
    } else {
      text(x, out, toStr(v), false);
    }
  };
});

/** The value of a variable: its select expression, or its content as an RTF (§11.2). */
export function variableValue(el: Element): (x: X) => Value {
  if (el.hasAttribute('select')) {
    const sel = xpath(el, 'select');
    return (x) => sel(x);
  }
  if (!el.hasChildNodes()) return () => '';
  const b = body(el);
  return (x) => {
    const set = [fragment(b, x)];
    fragments.add(set);
    return set;
  };
}

instructions.set('variable', (el) => {
  const k = expandedName(attr(el, 'name'), resolver(el));
  const value = variableValue(el);
  return (x) => {
    for (let s = x.b; s; s = s.up) if (s.k === k) throw new XSLTError(Code.Redefinition, k);
    return new X(x.n, x.p, x.s, { k, v: value(x), up: x.b }, x.r);
  };
});

function nameAvts(el: Element): [Avt, Avt | undefined] {
  const ns = el.getAttribute('namespace');
  return [avt(attr(el, 'name'), resolver(el)), ns === null ? undefined : avt(ns, resolver(el))];
}

instructions.set('element', (el) => {
  if (el.hasAttributeNS(null, 'use-attribute-sets'))
    throw new XSLTError(Code.Unsupported, 'use-attribute-sets');
  const [name, ns] = nameAvts(el);
  const b = body(el);
  return (x, out) => {
    const n = name(x);
    const e = element(
      x,
      out,
      ns ? ns(x) || null : expand(n, resolver(el), el.lookupNamespaceURI(null))[0],
      n,
    );
    b(x, e);
  };
});

instructions.set('attribute', (el) => {
  const [name, ns] = nameAvts(el);
  const b = body(el);
  return (x, out) => {
    const n = name(x);
    if (n === 'xmlns' || n.startsWith('xmlns:')) throw new XSLTError(Code.BadName, n);
    const uri = ns ? ns(x) || null : expand(n, resolver(el))[0];
    const value = fragment(b, x).textContent ?? '';
    if (out.nodeType !== 1) return;
    if (out.hasChildNodes()) throw new XSLTError(Code.AttributeAfterChildren, n);
    try {
      setAttribute(x.r, out as Element, uri, n, value);
    } catch {
      throw new XSLTError(Code.BadName, n);
    }
  };
});

// --- Stylesheet ------------------------------------------------------------------------

export function compileStylesheet(doc: Document): Stylesheet {
  const root = doc.documentElement;
  if (
    !root ||
    root.namespaceURI !== XSL_NS ||
    (root.localName !== 'stylesheet' && root.localName !== 'transform')
  ) {
    throw new XSLTError(Code.NotStylesheet);
  }
  const rules: Rule[] = [];
  const globals = new Map<string, (x: X) => Value>();
  const output: Stylesheet['output'] = {};

  [...root.children].forEach((el, i) => {
    if (el.namespaceURI !== XSL_NS) return;
    switch (el.localName) {
      case 'template': {
        if (el.hasAttribute('mode')) throw new XSLTError(Code.Unsupported, 'mode');
        const match = el.getAttribute('match');
        if (match === null) {
          attr(el, 'name');
          return;
        }
        const b = body(el);
        const priority = el.getAttribute('priority');
        for (const alt of compilePattern(match, resolver(el))) {
          const pr = priority === null ? alt.pr : toNum(priority);
          rules.push({ m: alt.m, pr, i, b, ...(alt.key ? { key: alt.key } : {}) } as Rule);
        }
        return;
      }
      case 'variable':
        globals.set(expandedName(attr(el, 'name'), resolver(el)), variableValue(el));
        return;
      case 'output': {
        const m = el.getAttribute('method');
        if (m !== null) output.method = m;
        return;
      }
      default:
        throw unknown(el);
    }
  });

  if (output.method !== undefined && !/^(html|xml|text)$/.test(output.method)) {
    throw new XSLTError(Code.Unsupported, `method ${output.method}`);
  }

  // Candidate rules by name, each list ordered by priority and then position (§5.5).
  const byPriority = (a: Rule, b: Rule) => b.pr - a.pr || b.i - a.i;
  const keyed = rules as (Rule & { key?: string })[];
  const other = keyed.filter((r) => !r.key).sort(byPriority);
  const byName = new Map<string, Rule[]>();
  for (const r of keyed) {
    if (r.key && !byName.has(r.key)) {
      byName.set(r.key, [...keyed.filter((s) => s.key === r.key), ...other].sort(byPriority));
    }
  }
  return { byName, other, globals, output };
}
