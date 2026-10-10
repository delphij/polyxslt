// Run-time state of a transformation, variable scopes and XPath evaluation in XSLT.
import { Code, XSLTError } from '../errors.js';
import type { Env, Expr, FnDef } from '../xpath/compile.js';
import { coreFunctions } from '../xpath/fn.js';
import type { Value } from '../xpath/value.js';

export const XSL_NS = 'http://www.w3.org/1999/XSL/Transform';

/** A variable binding; scopes are linked lists, newest first. */
export interface Scope {
  k: string;
  v: Value;
  up: Scope | null;
}

/** A compiled template rule. */
export interface Rule {
  /** Whether the pattern matches the node. */
  m(n: Node, e: Env): boolean;
  /** Priority. */
  pr: number;
  /** Position of the template in the stylesheet. */
  i: number;
  b: Body;
}

export interface Stylesheet {
  /** Rules for elements and attributes by (`@`)local name, and the rules for other nodes. */
  byName: Map<string, Rule[]>;
  other: Rule[];
  globals: Map<string, (x: X) => Value>;
  /** Settings from xsl:output. */
  output: { method?: string; encoding?: string };
}

export interface Run {
  s: Stylesheet;
  /** Document that owns the result nodes. */
  out: Document;
  /** Root of the source tree, the context of global variables. */
  root: Node;
  /** Values of global variables; PENDING while one is being computed. */
  g: Map<string, Value | typeof PENDING>;
  /** Current template nesting depth. */
  d: number;
  /** Text nodes written with disable-output-escaping. */
  doe: Set<Text>;
  /** Result nodes created so far, and the limit. */
  count: number;
  max: number;
}

/** Instruction context: current node, position, size, variables in scope. */
export interface X {
  n: Node;
  p: number;
  s: number;
  v: Scope | null;
  r: Run;
}

/** An instruction appends to `out`; xsl:variable returns the context with its binding. */
export type Instr = (x: X, out: Node) => X | undefined;
export type Body = (x: X, out: Node) => void;

export const PENDING: unique symbol = Symbol();

/** Limits taken from libxslt's defaults. */
export const MAX_DEPTH = 3000;

export const functions: Map<string, FnDef> = new Map(coreFunctions);
functions.set('current', [0, 0, (c) => [c.e.c ?? c.n]]);

function lookup(x: X, k: string): Value | undefined {
  for (let s = x.v; s; s = s.up) if (s.k === k) return s.v;
  const r = x.r;
  const cached = r.g.get(k);
  if (cached === PENDING) throw new XSLTError(Code.CircularVariable, k);
  if (cached !== undefined) return cached;
  const def = r.s.globals.get(k);
  if (!def) return undefined;
  r.g.set(k, PENDING);
  const v = def({ n: r.root, p: 1, s: 1, v: null, r });
  r.g.set(k, v);
  return v;
}

export function env(x: X): Env {
  return { v: (k) => lookup(x, k), f: functions, c: x.n };
}

export function evaluate(e: Expr, x: X): Value {
  return e({ n: x.n, p: x.p, s: x.s, e: env(x) });
}

export function seq(instrs: Instr[]): Body {
  return (x, out) => {
    for (const f of instrs) x = f(x, out) ?? x;
  };
}
