// Attribute value templates (XSLT 1.0 §7.6.2).
import { Code, XSLTError } from '../errors.js';
import { compileXPath, type Expr, type Resolver } from '../xpath/index.js';
import { toStr } from '../xpath/value.js';
import type { X } from './runtime.js';

export type Avt = (x: X) => string;

// A doubled brace, an expression in braces (in which a quoted string may hold a brace), a
// brace that is neither, or literal text.
const PART = /\{\{|\}\}|\{((?:[^}"']|"[^"]*"|'[^']*')*)\}|[{}]|[^{}]+/g;

export function avt(s: string, resolve: Resolver): Avt {
  const parts: (string | Expr)[] = [];
  for (const [text, expr] of s.matchAll(PART)) {
    if (expr !== undefined) parts.push(compileXPath(expr, resolve));
    else if (text === '{' || text === '}') throw new XSLTError(Code.BadAvt, s);
    else parts.push(text === '{{' || text === '}}' ? (text[0] as string) : text);
  }
  if (parts.every((p) => typeof p === 'string')) {
    const lit = parts.join('');
    return () => lit;
  }
  return (x) => parts.map((p) => (typeof p === 'string' ? p : toStr(p(x)))).join('');
}
