// Canonical text form of a DOM tree, used to compare our result tree with xsltproc output.
//
// - One line per node, indented by depth, so that test failures show a readable diff.
// - Elements in the XHTML namespace print their local name; any other namespace, including
//   none, prints as {uri}name.  A result element created without a namespace therefore does
//   not compare equal to the HTML element the browser would have produced.
// - Attributes are sorted; adjacent text nodes are merged.
// - <meta charset> and <meta http-equiv="Content-Type"> are dropped, because the libxslt HTML
//   serializer inserts one of them on its own.
// - Namespace declarations are dropped: xsltproc writes them out and an HTML parser turns them
//   into ordinary attributes, while a result tree built as DOM has none.

const XHTML = 'http://www.w3.org/1999/xhtml';

function qname(ns: string | null, local: string): string {
  return ns === XHTML ? local : `{${ns ?? ''}}${local}`;
}

function isEncodingMeta(e: Element): boolean {
  return (
    e.namespaceURI === XHTML &&
    e.localName === 'meta' &&
    (e.hasAttribute('charset') || e.getAttribute('http-equiv')?.toLowerCase() === 'content-type')
  );
}

export function canon(root: Node): string {
  const lines: string[] = [];
  let text: string | null = null;
  let textDepth = 0;

  const flush = () => {
    if (text !== null) lines.push(`${'  '.repeat(textDepth)}${JSON.stringify(text)}`);
    text = null;
  };

  const walk = (node: Node, depth: number) => {
    switch (node.nodeType) {
      case Node.TEXT_NODE:
      case Node.CDATA_SECTION_NODE:
        if (text === null) textDepth = depth;
        text = (text ?? '') + (node.nodeValue ?? '');
        return;
      // libxslt writes a processing instruction as <?target data>; Chromium's HTML parser
      // reads that as a processing instruction, Firefox's and WebKit's as a comment.
      case Node.PROCESSING_INSTRUCTION_NODE:
        flush();
        lines.push(`${'  '.repeat(depth)}<?${node.nodeName} ${node.nodeValue}>`);
        return;
      case Node.COMMENT_NODE:
        flush();
        lines.push(
          node.nodeValue?.startsWith('?')
            ? `${'  '.repeat(depth)}<${node.nodeValue}>`
            : `${'  '.repeat(depth)}<!--${node.nodeValue}-->`,
        );
        return;
      case Node.ELEMENT_NODE: {
        const e = node as Element;
        if (isEncodingMeta(e)) return;
        flush();
        const attrs = [...e.attributes]
          .filter((a) => !/^xmlns(:|$)/.test(a.name))
          .map(
            (a) =>
              `${qname(a.namespaceURI, a.localName).replace(/^\{\}/, '')}=${JSON.stringify(a.value)}`,
          )
          .sort();
        lines.push(
          `${'  '.repeat(depth)}<${[qname(e.namespaceURI, e.localName), ...attrs].join(' ')}>`,
        );
        for (const c of e.childNodes) walk(c, depth + 1);
        flush();
        return;
      }
      case Node.DOCUMENT_NODE:
      case Node.DOCUMENT_FRAGMENT_NODE:
        for (const c of node.childNodes) walk(c, depth);
        flush();
        return;
      default:
        // Document types do not affect rendering.
        return;
    }
  };

  walk(root, 0);
  flush();
  return lines.join('\n');
}

/**
 * Parses xsltproc's output the way a browser would and returns the canonical form of the
 * part that corresponds to `result`.  HTML output is compared as a whole document if `result`
 * has an <html> element, otherwise as the content of <body>.
 */
export function canonExpected(output: string, result: DocumentFragment, method = 'html'): string {
  if (method === 'text') return JSON.stringify(output);
  if (method === 'xml') {
    const body = output.replace(/^<\?xml[^>]*\?>/, '').trim();
    const doc = new DOMParser().parseFromString(`<wrap>${body}</wrap>`, 'application/xml');
    return canon(fragmentOf(doc.documentElement));
  }
  const doc = new DOMParser().parseFromString(output.trimEnd(), 'text/html');
  const whole = result.firstElementChild?.localName === 'html';
  return canon(whole ? doc.documentElement : fragmentOf(doc.body));
}

function fragmentOf(parent: Element): DocumentFragment {
  const f = parent.ownerDocument.createDocumentFragment();
  for (const c of parent.childNodes) f.append(c.cloneNode(true));
  return f;
}
