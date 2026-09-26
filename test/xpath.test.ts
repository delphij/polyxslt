// Compares XPath evaluation with xsltproc's results (see scripts/golden.mjs).
import { describe, expect, test } from 'vitest';
import { XSLTError } from '../src/errors';
import { parentOf, prev } from '../src/xpath/axes';
import { evaluate, type Value } from '../src/xpath/index';
import { nodeSet, numberToString, stringValue, toBool, toNum, toStr } from '../src/xpath/value';
import { FIELD, NODE } from './support/xpath-format.mjs';

interface Case {
  expr: string;
  ctx?: string;
  xml?: string;
  vars?: Record<string, string>;
  nodes?: boolean;
  /** Known difference from libxslt (see docs/DIVERGENCES.md); node order is not compared. */
  divergence?: string;
}

interface Table {
  xml: string;
  ns?: Record<string, string>;
  cases: Case[];
}

const tables = import.meta.glob<Table>('./xpath/*.json', { import: 'default', eager: true });

function path(n: Node): string {
  let s = '';
  for (let x: Node | null = n, p = parentOf(n); p; x = p, p = parentOf(p)) {
    if (x.nodeType === 2) {
      s = `/@${(x as Attr).name}${s}`;
    } else {
      let i = 1;
      for (let y = prev(x); y; y = prev(y)) i++;
      s = `/${i}${s}`;
    }
  }
  return s;
}

function format(v: Value, nodes: boolean): string {
  let s = `${toStr(v)}${FIELD}${numberToString(toNum(v))}${FIELD}${toBool(v)}`;
  if (nodes) for (const n of nodeSet(v)) s += `${FIELD}${path(n)}${NODE}${stringValue(n)}`;
  return s;
}

for (const [file, table] of Object.entries(tables)) {
  if (file.endsWith('.expected.json')) continue;
  const expected = tables[file.replace(/\.json$/, '.expected.json')] as unknown as (
    | string
    | { error: string }
  )[];
  const resolve = (p: string) => table.ns?.[p] ?? null;

  describe(file.slice('./xpath/'.length), () => {
    table.cases.forEach((c, i) => {
      test(`${i}: ${c.expr}`, () => {
        const doc = new DOMParser().parseFromString(c.xml ?? table.xml, 'application/xml');
        const ctx = nodeSet(evaluate(c.ctx ?? '/', doc, { resolve }))[0] as Node;
        const variables = new Map<string, Value>();
        for (const [n, e] of Object.entries(c.vars ?? {})) {
          variables.set(n, evaluate(e, ctx, { resolve, variables }));
        }
        const want = expected[i];
        const run = () => format(evaluate(c.expr, ctx, { resolve, variables }), !!c.nodes);
        if (typeof want === 'object') {
          expect(run).toThrow(XSLTError);
        } else if (c.divergence) {
          const sorted = (s: string) => s.split(FIELD).sort();
          expect(sorted(run())).toEqual(sorted(want as string));
        } else {
          expect(run()).toBe(want);
        }
      });
    });
  });
}
