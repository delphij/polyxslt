// Patterns (XSLT 1.0 §5.2) and their default priorities (§5.5).
//
// A pattern is parsed as an XPath expression and restricted to unions of location paths
// using the child and attribute axes and `//`.  Matching goes from the last step towards
// the first, through parents and, for `//`, ancestors.
import { Code, XSLTError } from '../errors';
import { Axis, axis, parentOf } from '../xpath/axes';
import { compile, compileTest, type Env, filter } from '../xpath/compile';
import { type Ast, type NameTest, parse, type Resolver, type Step } from '../xpath/parse';

export interface Alternative {
  m(n: Node, e: Env): boolean;
  /** Default priority. */
  pr: number;
  /** `local` or `@local` when the pattern ends in a name test, for indexing. */
  key?: string;
}

function isRoot(n: Node | null): boolean {
  return !!n && (n.nodeType === 9 || n.nodeType === 11) && !n.parentNode;
}

const isDescendantStep = (s: Step) =>
  s.axis === Axis.DescendantOrSelf && !s.preds.length && 'type' in s.test && s.test.type === 'node';

function alternative(ast: Ast, src: string): Alternative {
  if (ast.t !== 'path' || ast.start) throw new XSLTError(Code.BadPattern, src);
  const { root, steps } = ast;
  for (const s of steps) {
    if (s.axis !== Axis.Child && s.axis !== Axis.Attribute && !isDescendantStep(s)) {
      throw new XSLTError(Code.BadPattern, src);
    }
  }
  const tests = steps.map((s) => compileTest(s.axis, s.test));
  const preds = steps.map((s) => s.preds.map(compile));

  // Whether n matches steps[i], including its predicates.
  const step = (n: Node, i: number, e: Env): boolean => {
    const s = steps[i] as Step;
    if ((n.nodeType === 2) !== (s.axis === Axis.Attribute) || isRoot(n)) return false;
    const test = tests[i] as (n: Node) => boolean;
    if (!test(n)) return false;
    const ps = preds[i] ?? [];
    if (!ps.length) return true;
    let set: Node[] = [];
    axis(s.axis, parentOf(n) as Node, test, set);
    for (const p of ps) set = filter(set, p, e);
    return set.includes(n);
  };

  // Whether n matches steps[0..i], with steps[i] not a `//` step.
  const match = (n: Node, i: number, e: Env): boolean => {
    if (!step(n, i, e)) return false;
    if (i === 0) return !root || isRoot(parentOf(n));
    if (isDescendantStep(steps[i - 1] as Step)) {
      if (i === 1) return true;
      for (let a = parentOf(n); a; a = parentOf(a)) if (match(a, i - 2, e)) return true;
      return false;
    }
    const p = parentOf(n);
    return !!p && match(p, i - 1, e);
  };

  const last = steps[steps.length - 1];
  let pr = 0.5;
  let key: string | undefined;
  if (last && 'local' in last.test) {
    const t = last.test as NameTest;
    if (t.local !== '*') key = (last.axis === Axis.Attribute ? '@' : '') + t.local;
  }
  if (steps.length === 1 && !root && last && !last.preds.length) {
    const t = last.test;
    pr =
      'type' in t
        ? t.target !== undefined
          ? 0
          : -0.5
        : t.local !== '*'
          ? 0
          : t.ns === undefined
            ? -0.5
            : -0.25;
  }
  if (!steps.length) return { m: isRoot, pr };
  return { m: (n, e) => match(n, steps.length - 1, e), pr, ...(key ? { key } : {}) };
}

export function compilePattern(src: string, resolve: Resolver): Alternative[] {
  const alts: Alternative[] = [];
  const split = (a: Ast) => {
    if (a.t === 'op' && a.op === '|') {
      split(a.l);
      split(a.r);
    } else {
      alts.push(alternative(a, src));
    }
  };
  split(parse(src, resolve));
  return alts;
}
