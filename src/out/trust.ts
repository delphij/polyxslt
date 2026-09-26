// The one place where HTML text is parsed.  Under a Trusted Types policy, HTML produced by
// the stylesheet (disable-output-escaping) passes through a policy named "polyxslt"; values
// that come from page scripts are passed on unchanged, so that the page's own policy applies.
interface Policy {
  createHTML(s: string): unknown;
}

let policy: Policy | null | undefined;

function trusted(s: string): string {
  if (policy === undefined) {
    try {
      const tt = (globalThis as { trustedTypes?: { createPolicy(n: string, p: object): Policy } })
        .trustedTypes;
      policy = tt?.createPolicy('polyxslt', { createHTML: (x: string) => x }) ?? null;
    } catch {
      policy = null;
    }
  }
  return (policy ? policy.createHTML(s) : s) as string;
}

let htmlDoc: Document | undefined;

/** An inert HTML document for parsing and for creating HTML elements. */
export function htmlDocument(): Document {
  htmlDoc ??= document.implementation.createHTMLDocument('');
  return htmlDoc;
}

/**
 * Parses HTML as template content, so that no element is moved into <head> and table parts
 * are kept, and imports the result into `doc`.  Scripts in it are not run.
 */
export function parseHtml(s: unknown, doc: Document, fromStylesheet: boolean): DocumentFragment {
  const t = htmlDocument().createElement('template');
  t.innerHTML = fromStylesheet ? trusted(s as string) : (s as string);
  return doc.importNode(t.content, true);
}
