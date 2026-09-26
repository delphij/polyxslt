import { Code, XSLTError } from './errors';
import { install, XSLTProcessor } from './host/processor';
import { compileStylesheet } from './xslt/compile';
import type { Stylesheet } from './xslt/runtime';
import { type Options, run } from './xslt/transform';

export { Code, compileStylesheet, install, type Stylesheet, XSLTError, XSLTProcessor };

export interface TransformOptions extends Options {
  /** Document that owns the result nodes; by default the document of the source. */
  document?: Document;
}

/** Applies `stylesheet` to `source` and returns the result tree. */
export function transform(
  stylesheet: Document | Stylesheet,
  source: Node,
  options: TransformOptions = {},
): DocumentFragment {
  const s = 'nodeType' in stylesheet ? compileStylesheet(stylesheet) : stylesheet;
  const owner = options.document ?? source.ownerDocument ?? (source as Document);
  return run(s, source, owner, options).fragment;
}
