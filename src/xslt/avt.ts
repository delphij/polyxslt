// Attribute value templates (XSLT 1.0 §7.6.2).
import { Code, XSLTError } from '../errors.js';
import { compileXPath, type Resolver } from '../xpath/index.js';
import { toStr } from '../xpath/value.js';
import { evaluate, type X } from './runtime.js';

export type Avt = (x: X) => string;

export function avt(s: string, resolve: Resolver): Avt {
  const parts: (string | ReturnType<typeof compileXPath>)[] = [];
  let lit = '';
  for (let i = 0; i < s.length; ) {
    const ch = s[i] as string;
    if ((ch === '{' || ch === '}') && s[i + 1] === ch) {
      lit += ch;
      i += 2;
    } else if (ch === '{') {
      let j = i + 1;
      for (let q = ''; j < s.length; j++) {
        const c = s[j];
        if (q) {
          if (c === q) q = '';
        } else if (c === '"' || c === "'") {
          q = c;
        } else if (c === '}') {
          break;
        }
      }
      if (j >= s.length) throw new XSLTError(Code.BadAvt, s);
      if (lit) parts.push(lit);
      lit = '';
      parts.push(compileXPath(s.slice(i + 1, j), resolve));
      i = j + 1;
    } else if (ch === '}') {
      throw new XSLTError(Code.BadAvt, s);
    } else {
      lit += ch;
      i++;
    }
  }
  if (!parts.length) return () => lit;
  if (lit) parts.push(lit);
  return (x) => parts.map((p) => (typeof p === 'string' ? p : toStr(evaluate(p, x)))).join('');
}
