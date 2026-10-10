import { newGeneration } from './axes.js';
import type { Context, Env, Expr, FnDef } from './compile.js';
import { compile } from './compile.js';
import { coreFunctions } from './fn.js';
import { parse, type Resolver } from './parse.js';
import type { Value } from './value.js';

export type { Context, Env, Expr, FnDef, Resolver, Value };
export { coreFunctions };

const noPrefixes: Resolver = () => null;

/** Compiles an XPath expression.  Namespace prefixes are resolved at compile time. */
export function compileXPath(src: string, resolve: Resolver = noPrefixes): Expr {
  return compile(parse(src, resolve));
}

export interface EvaluateOptions {
  resolve?: Resolver;
  variables?: ReadonlyMap<string, Value>;
  functions?: ReadonlyMap<string, FnDef>;
}

/** Evaluates `src` with `node` as the context node. */
export function evaluate(src: string, node: Node, opts: EvaluateOptions = {}): Value {
  newGeneration();
  const vars = opts.variables;
  const e: Env = { v: (name) => vars?.get(name), f: opts.functions ?? coreFunctions };
  return compileXPath(src, opts.resolve)({ n: node, p: 1, s: 1, e });
}
