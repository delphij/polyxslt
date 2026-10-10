import { Code, XSLTError } from '../errors.js';
import { defaultMethod, finish, type Method } from '../out/finish.js';
import { newGeneration, rootOf } from '../xpath/axes.js';
import { applyTemplates } from './compile.js';
import type { Run, Stylesheet } from './runtime.js';

export interface Options {
  /** Remove active content from the result (see out/strict.ts). */
  strict?: boolean;
  /** Maximum number of result nodes; exceeding it is an error. */
  maxNodes?: number;
}

export interface Result {
  fragment: DocumentFragment;
  method: Method;
}

/** Applies a compiled stylesheet to `source`; result nodes are owned by `out`. */
export function run(s: Stylesheet, source: Node, out: Document, opts: Options = {}): Result {
  newGeneration();
  const r: Run = {
    s,
    out,
    root: rootOf(source),
    g: new Map(),
    d: 0,
    doe: new Set(),
    count: 0,
    max: opts.maxNodes ?? Number.POSITIVE_INFINITY,
  };
  const f = out.createDocumentFragment();
  try {
    applyTemplates([source], { n: source, p: 1, s: 1, v: null, r }, f);
  } catch (e) {
    // Deep recursion may exhaust the JavaScript stack before the depth limit is reached:
    // RangeError in Chromium and WebKit, InternalError in Firefox.
    if (/call stack|too much recursion/i.test((e as Error)?.message)) {
      throw new XSLTError(Code.Limit, 'recursion');
    }
    throw e;
  }
  const method = (s.output.method as Method | undefined) ?? defaultMethod(f);
  const fragment = finish(f, { ...s.output, method, strict: !!opts.strict }, r.doe, out);
  return { fragment, method };
}
