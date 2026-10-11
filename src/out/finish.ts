// Turns the raw result tree into what a browser would have after parsing the serialized
// output of libxslt (XSLT 1.0 §16): the html method's namespace and attribute handling, and
// disable-output-escaping.
//
// Under the html method most elements are created in that form to begin with (see
// createElement); finish() converts the others.
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

/** A result tree under construction. */
export interface Tree {
  /** Document that owns the result nodes. */
  out: Document;
  /** Root of the result tree. */
  f: DocumentFragment;
  /** The output method, once it is known. */
  m?: Method | undefined;
  /**
   * html method: the root and the elements that are in their final form already.  True for
   * an element whose attributes are not, and have to be set again.
   */
  h?: Map<Node, boolean> | undefined;
  /** Whether the tree holds elements that finish() has to convert. */
  redo: boolean;
  /** Text nodes written with disable-output-escaping. */
  doe: Set<Text>;
}

// The output method when xsl:output does not give one (§16), decided when the first
// element is added to the root: html if that element is <html> without a namespace and
// only white space precedes it.
function defaultMethod(f: DocumentFragment, ns: string | null, name: string): Method {
  for (const n of f.childNodes) {
    if (n.nodeType === 3 && !/^[\x20\t\r\n]*$/.test(n.nodeValue ?? '')) return 'xml';
  }
  return ns === null && name.toLowerCase() === 'html' ? 'html' : 'xml';
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

// What the html method makes of the value of an attribute without a namespace, on an
// element that had none either.
function attributeValue(attr: string, element: string, v: string): string {
  return BOOLEAN.has(attr) ? '' : isUriAttribute(attr, element) ? escapeUri(v) : v;
}

// libxslt writes element and attribute names with their prefixes; an HTML parser then puts
// the element in a namespace by its name alone, and keeps the attribute names as they are.
// Boolean and URI attributes are rewritten only on elements that had no namespace.
function setAttributes(from: Iterable<Attr>, r: Element, plain: boolean, lower: string): void {
  const html = r.namespaceURI === XHTML_NS;
  for (const a of from) {
    const v = a.value;
    if (a.namespaceURI === null) {
      const an = a.localName.toLowerCase();
      r.setAttributeNS(null, html ? an : a.localName, plain ? attributeValue(an, lower, v) : v);
    } else if (html) {
      r.setAttribute(a.name.toLowerCase(), v);
    } else {
      r.setAttributeNS(a.namespaceURI, a.name, v);
    }
  }
}

function toHtml(t: Tree, parent: Node): void {
  const doc = t.out;
  for (let n = parent.firstChild; n; n = n.nextSibling) {
    if (n.nodeType !== 1) continue;
    const e = n as Element;
    const state = t.h?.get(e);
    if (state) {
      const attrs = [...e.attributes];
      for (const a of attrs) e.removeAttributeNode(a);
      setAttributes(attrs, e, true, e.localName.toLowerCase());
    } else if (state === undefined) {
      const name = e.prefix ? `${e.prefix}:${e.localName}` : e.localName;
      const lower = name.toLowerCase();
      const ns = htmlNamespace(lower, parent);
      const r = ns === XHTML_NS ? htmlElement(doc, lower) : doc.createElementNS(ns, name);
      setAttributes(e.attributes, r, e.namespaceURI === null, lower);
      while (e.firstChild) r.appendChild(e.firstChild);
      parent.replaceChild(r, e);
      n = r;
    }
    toHtml(t, n);
  }
}

/**
 * Creates a result element.  Under the html method, an element without a namespace whose
 * parent is in its final form is created in its final form as well: this is the common
 * case, and saves creating the element a second time in finish().  Any other element is
 * created as the stylesheet names it.  May throw for an invalid name.
 */
export function createElement(t: Tree, parent: Node, ns: string | null, name: string): Element {
  if (!t.m && parent === t.f) {
    t.m = defaultMethod(t.f, ns, name);
    if (t.m === 'html') t.h = new Map([[parent, false]]);
  }
  const h = t.h;
  if (h?.has(parent)) {
    if (ns === null && !name.includes(':')) {
      const lower = name.toLowerCase();
      const hns = htmlNamespace(lower, parent);
      const e = t.out.createElementNS(hns, hns === XHTML_NS ? lower : name);
      h.set(e, false);
      return e;
    }
    t.redo = true;
  }
  return t.out.createElementNS(ns, name);
}

/**
 * Sets an attribute of a result element.  On an element in its final form, an attribute
 * that keeps its name is given its final value; any other is set as it is, and finish()
 * sets the attributes of the element again in the order they have then.  May throw for an
 * invalid name.
 */
export function setAttribute(
  t: Tree,
  e: Element,
  ns: string | null,
  name: string,
  v: string,
): void {
  const h = t.h;
  if (h?.has(e)) {
    const an = name.toLowerCase();
    if (ns === null && (an === name || e.namespaceURI !== XHTML_NS)) {
      v = attributeValue(an, e.localName.toLowerCase(), v);
    } else {
      e.setAttributeNS(ns, name, v);
      h.set(e, true);
      t.redo = true;
      return;
    }
  }
  e.setAttributeNS(ns, name, v);
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

export function finish(t: Tree, out: Output): DocumentFragment {
  const { f, out: doc } = t;
  const method = out.method;
  if (method === 'text') {
    const text = doc.createDocumentFragment();
    text.append(f.textContent ?? '');
    return text;
  }
  if (method === 'html') {
    const head = metaHead(f);
    if (head) {
      head.prepend(createElement(t, head, null, 'meta'));
      (head.firstChild as Element).setAttribute('charset', out.encoding ?? 'UTF-8');
    }
    if (t.redo) toHtml(t, f);
    impliedElements(doc, f);
    impliedTbody(doc, f);
  }
  for (const text of t.doe) {
    if (!f.contains(text)) continue;
    const parsed = method === 'html' ? parseHtml(text.data, doc, true) : parseXml(text.data, doc);
    if (parsed) text.replaceWith(parsed);
  }
  // A parser never produces adjacent text nodes.
  if (method === 'html') f.normalize();
  if (out.strict) clean(f);
  return f;
}
