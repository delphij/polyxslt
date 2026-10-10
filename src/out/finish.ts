// Turns the raw result tree into what a browser would have after parsing the serialized
// output of libxslt (XSLT 1.0 §16): the html method's namespace and attribute handling, and
// disable-output-escaping.
import { clean } from './strict.js';
import { htmlDocument, parseHtml } from './trust.js';

export const XHTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';
const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

export type Method = 'html' | 'xml' | 'text';

/** Settings from xsl:output that affect the result tree. */
export interface Output {
  method: Method;
  encoding?: string;
  /** Strict mode: remove active content (see strict.ts). */
  strict?: boolean;
}

/** The output method when xsl:output does not give one (§16). */
export function defaultMethod(f: DocumentFragment): Method {
  for (const n of f.childNodes) {
    if (n.nodeType === 1) {
      const e = n as Element;
      return e.namespaceURI === null && e.localName.toLowerCase() === 'html' ? 'html' : 'xml';
    }
    if (n.nodeType === 3 && !/^[\x20\t\r\n]*$/.test(n.nodeValue ?? '')) break;
  }
  return 'xml';
}

// Attributes libxslt writes in minimized form, which a parser reads back as empty.
const BOOLEAN = new Set([
  'checked',
  'compact',
  'declare',
  'defer',
  'disabled',
  'ismap',
  'multiple',
  'nohref',
  'noresize',
  'noshade',
  'nowrap',
  'readonly',
  'selected',
]);

// libxslt escapes spaces, control characters other than tab, and non-ASCII characters in
// these attributes as UTF-8 %XX sequences.
function escapeUri(s: string): string {
  return s.replace(/[^\t\x21-\x7E]/gu, (c) => {
    try {
      return encodeURIComponent(c);
    } catch {
      return '%EF%BF%BD';
    }
  });
}

function isUriAttribute(attr: string, element: string): boolean {
  return (
    attr === 'href' || attr === 'src' || attr === 'action' || (attr === 'name' && element === 'a')
  );
}

// The namespace the HTML parser would give an element written without one.
function htmlNamespace(name: string, parent: Node): string {
  const pns = parent.nodeType === 1 ? (parent as Element).namespaceURI : null;
  if (pns === SVG_NS && (parent as Element).localName !== 'foreignObject') return SVG_NS;
  if (pns === MATHML_NS && (parent as Element).localName !== 'annotation-xml') return MATHML_NS;
  if (name === 'svg') return SVG_NS;
  if (name === 'math') return MATHML_NS;
  return XHTML_NS;
}

// An HTML element; names with a colon (from prefixed names) can only be created by an HTML
// document.
function htmlElement(doc: Document, name: string): Element {
  return name.includes(':')
    ? doc.importNode(htmlDocument().createElement(name), false)
    : doc.createElementNS(XHTML_NS, name);
}

// libxslt writes element and attribute names with their prefixes; an HTML parser then puts
// the element in a namespace by its name alone, and keeps the attribute names as they are.
// Boolean and URI attributes are rewritten only on elements that had no namespace.
function toHtml(doc: Document, parent: Node): void {
  for (let n = parent.firstChild; n; n = n.nextSibling) {
    if (n.nodeType !== 1) continue;
    const e = n as Element;
    const name = e.prefix ? `${e.prefix}:${e.localName}` : e.localName;
    const lower = name.toLowerCase();
    const ns = htmlNamespace(lower, parent);
    const html = ns === XHTML_NS;
    const plain = e.namespaceURI === null;
    const r = html ? htmlElement(doc, lower) : doc.createElementNS(ns, name);
    for (const a of e.attributes) {
      let v = a.value;
      if (a.namespaceURI === null) {
        const an = a.localName.toLowerCase();
        if (plain && BOOLEAN.has(an)) v = '';
        else if (plain && isUriAttribute(an, lower)) v = escapeUri(v);
        r.setAttributeNS(null, html ? an : a.localName, v);
      } else if (html) {
        r.setAttribute(a.name.toLowerCase(), v);
      } else {
        r.setAttributeNS(a.namespaceURI, a.name, v);
      }
    }
    while (e.firstChild) r.appendChild(e.firstChild);
    parent.replaceChild(r, e);
    n = r;
    toHtml(doc, r);
  }
}

// The HTML parser puts rows written directly in a table into an implied <tbody>.
function impliedTbody(doc: Document, f: DocumentFragment): void {
  for (const t of f.querySelectorAll('table')) {
    if (t.namespaceURI !== XHTML_NS) continue;
    let body: Element | undefined;
    for (let c = t.firstChild; c; ) {
      const next = c.nextSibling;
      const row = c.nodeType === 1 && (c as Element).localName === 'tr';
      const space = c.nodeType === 3 && /^[\x20\t\r\n\f]*$/.test(c.nodeValue ?? '');
      if (row || (body && space)) {
        if (!body) {
          body = doc.createElementNS(XHTML_NS, 'tbody');
          t.insertBefore(body, c);
        }
        body.appendChild(c);
      } else {
        body = undefined;
      }
      c = next;
    }
  }
}

const named = (n: Node | null, name: string) =>
  n?.nodeType === 1 && (n as Element).localName.toLowerCase() === name;

function isEncodingMeta(n: Node): boolean {
  const e = n as Element;
  return (
    named(n, 'meta') &&
    (e.hasAttribute('charset') || e.getAttribute('http-equiv')?.toLowerCase() === 'content-type')
  );
}

// libxslt adds <meta charset> to the <head> of an <html> result that has none.
function metaHead(f: DocumentFragment): Element | undefined {
  const html = f.firstElementChild;
  if (!named(html, 'html')) return undefined;
  const head = [...(html as Element).children].find((c) => named(c, 'head'));
  return head && ![...head.children].some(isEncodingMeta) ? head : undefined;
}

// An HTML parser always creates <head> and <body> in <html>; page scripts may rely on them.
function impliedElements(doc: Document, f: DocumentFragment): void {
  const html = f.firstElementChild;
  if (!html || html.namespaceURI !== XHTML_NS || html.localName !== 'html') return;
  const child = (name: string) =>
    [...html.children].find((c) => c.namespaceURI === XHTML_NS && c.localName === name);
  let head = child('head');
  if (!head) {
    head = doc.createElementNS(XHTML_NS, 'head');
    html.prepend(head);
  }
  if (!child('body') && !child('frameset')) {
    const body = doc.createElementNS(XHTML_NS, 'body');
    while (head.nextSibling) body.appendChild(head.nextSibling);
    html.appendChild(body);
  }
}

function parseXml(s: string, doc: Document): DocumentFragment | undefined {
  const d = new DOMParser().parseFromString(`<r>${s}</r>`, 'application/xml');
  if (d.getElementsByTagName('parsererror').length) return undefined;
  const f = doc.createDocumentFragment();
  for (const c of [...(d.documentElement?.childNodes ?? [])])
    f.appendChild(doc.importNode(c, true));
  return f;
}

export function finish(
  f: DocumentFragment,
  out: Output,
  doe: Set<Text>,
  doc: Document,
): DocumentFragment {
  const method = out.method;
  if (method === 'text') {
    const t = doc.createDocumentFragment();
    t.append(f.textContent ?? '');
    return t;
  }
  if (method === 'html') {
    const head = metaHead(f);
    if (head) {
      const meta = doc.createElementNS(null, 'meta');
      meta.setAttribute('charset', out.encoding ?? 'UTF-8');
      head.prepend(meta);
    }
    toHtml(doc, f);
    impliedElements(doc, f);
    impliedTbody(doc, f);
  }
  for (const t of doe) {
    if (!f.contains(t)) continue;
    const parsed = method === 'html' ? parseHtml(t.data, doc, true) : parseXml(t.data, doc);
    if (parsed) t.replaceWith(parsed);
  }
  // A parser never produces adjacent text nodes.
  if (method === 'html') f.normalize();
  if (out.strict) clean(f);
  return f;
}
