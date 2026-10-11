// Run-time state of a transformation, variable scopes and XPath evaluation in XSLT.
import { Code, XSLTError } from '../errors.js';
import type { Tree } from '../out/finish.js';
import type { Context, Env, FnDef } from '../xpath/compile.js';
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
  output: { method?: string };
}

export interface Run extends Tree {
  s: Stylesheet;
  /** Root of the source tree, the context of global variables. */
  root: Node;
  /** Values of global variables; PENDING while one is being computed. */
  g: Map<string, Value | typeof PENDING>;
  /** Current template nesting depth. */
  d: number;
  /** Result nodes created so far, and the limit. */
  count: number;
  max: number;
}

/**
 * Instruction context: current node, position, size, the variables in scope and the run.
 * It is an XPath context that is its own environment, so that expressions are evaluated
 * on it directly.
 */
export class X implements Context, Env {
  readonly e: Env = this;

  constructor(
    readonly n: Node,
    readonly p: number,
    readonly s: number,
    /** Variable bindings. */
    readonly b: Scope | null,
    readonly r: Run,
  ) {}

  /** The XSLT current node. */
  get c(): Node {
    return this.n;
  }

  get f(): ReadonlyMap<string, FnDef> {
    return functions;
  }

  v(k: string): Value | undefined {
    for (let s = this.b; s; s = s.up) if (s.k === k) return s.v;
    const r = this.r;
    const cached = r.g.get(k);
    if (cached === PENDING) throw new XSLTError(Code.CircularVariable, k);
    if (cached !== undefined) return cached;
    const def = r.s.globals.get(k);
    if (!def) return undefined;
    r.g.set(k, PENDING);
    const v = def(new X(r.root, 1, 1, null, r));
    r.g.set(k, v);
    return v;
  }
}

/** An instruction appends to `out`; xsl:variable returns the context with its binding. */
export type Instr = (x: X, out: Node) => X | undefined;
export type Body = (x: X, out: Node) => void;

export const PENDING: unique symbol = Symbol();

/** Limits taken from libxslt's defaults. */
export const MAX_DEPTH = 3000;

export const functions: Map<string, FnDef> = new Map(coreFunctions);
functions.set('current', [0, 0, (c) => [c.e.c ?? c.n]]);

export function seq(instrs: Instr[]): Body {
  return (x, out) => {
    for (const f of instrs) x = f(x, out) ?? x;
  };
}
