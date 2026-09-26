// Entry point of the IIFE build, loaded by a <script> element inside an XML document.
//
// When the browser has not transformed the document itself, this finds the stylesheet (the
// data-stylesheet attribute of the script element, or the xml-stylesheet processing
// instruction), transforms the document, replaces its content with the result, and runs
// the scripts in the result in document order.
import { XHTML_NS } from '../out/finish';
import { parseHtml } from '../out/trust';
import { compileStylesheet } from '../xslt/compile';
import { run } from '../xslt/transform';
import { install } from './processor';

const XSL_TYPES = ['text/xsl', 'application/xslt+xml', 'text/xml', 'application/xml'];
const INERT = 'text/x-polyxslt-inert';
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function stylesheetHref(script: Element | null): string | undefined {
  const explicit = script?.getAttribute('data-stylesheet');
  if (explicit) return explicit;
  for (const n of document.childNodes) {
    if (n.nodeType !== 7 || (n as ProcessingInstruction).target !== 'xml-stylesheet') continue;
    const data = (n as ProcessingInstruction).data;
    const pseudo = (k: string) =>
      data
        .match(new RegExp(`(?:^|\\s)${k}\\s*=\\s*(["'])(.*?)\\1`))?.[2]
        ?.replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => ENTITIES[e] as string);
    if (XSL_TYPES.includes(pseudo('type') ?? '') && pseudo('alternate') !== 'yes')
      return pseudo('href');
  }
  return undefined;
}

// Makes an XML document hosting an HTML result behave more like an HTML document for the
// page's scripts: createElement creates HTML elements, and innerHTML and insertAdjacentHTML
// parse HTML.
function patchDocument(): void {
  const createNS = document.createElementNS.bind(document);
  document.createElement = ((name: string, options?: ElementCreationOptions) =>
    createNS(XHTML_NS, String(name).toLowerCase(), options)) as Document['createElement'];
  const inner = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (inner?.set) {
    const set = inner.set;
    Object.defineProperty(Element.prototype, 'innerHTML', {
      ...inner,
      set(this: Element, v: unknown) {
        if (this.ownerDocument === document && this.namespaceURI === XHTML_NS) {
          this.replaceChildren(parseHtml(v, document, false));
        } else {
          set.call(this, v);
        }
      },
    });
  }
  const origInsert = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (
    this: Element,
    pos: InsertPosition,
    text: string,
  ) {
    if (this.ownerDocument === document && this.namespaceURI === XHTML_NS) {
      const frag = parseHtml(text, document, false);
      const p = pos.toLowerCase();
      if (p === 'beforeend') this.append(frag);
      else if (p === 'afterbegin') this.prepend(frag);
      else if (p === 'beforebegin') this.before(frag);
      else if (p === 'afterend') this.after(frag);
      else throw new DOMException(`invalid position: ${pos}`, 'SyntaxError');
    } else {
      origInsert.call(this, pos, text);
    }
  };
}

async function runScripts(scripts: [Element, string | null][]): Promise<void> {
  for (const [old, type] of scripts) {
    const s = old.cloneNode(true) as Element;
    if (type === null) s.removeAttribute('type');
    else s.setAttribute('type', type);
    // Scripts added through the DOM run asynchronously; wait for each external classic
    // script so that later scripts see what it defines.
    const wait =
      s.hasAttribute('src') && !s.hasAttribute('async') && type !== 'module'
        ? new Promise((resolve) => {
            s.addEventListener('load', resolve);
            s.addEventListener('error', resolve);
          })
        : undefined;
    old.replaceWith(s);
    await wait;
  }
}

async function main(script: Element | null): Promise<void> {
  const href = stylesheetHref(script);
  if (!href) return;
  if (document.readyState === 'loading') {
    await new Promise((resolve) =>
      document.addEventListener('DOMContentLoaded', resolve, { once: true }),
    );
  }
  const url = new URL(href, document.baseURI);
  const res = await fetch(url, { mode: 'same-origin', credentials: 'same-origin' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const xsl = new DOMParser().parseFromString(await res.text(), 'application/xml');
  if (xsl.getElementsByTagName('parsererror').length) throw new Error(`${url}: not well-formed`);

  const strict = !!script?.hasAttribute('data-strict');
  const { fragment, method } = run(compileStylesheet(xsl), document, document, { strict });
  let root = fragment.firstElementChild;
  if (method === 'text' || !root) {
    root = document.createElementNS(XHTML_NS, 'html');
    const body = root.appendChild(document.createElementNS(XHTML_NS, 'body'));
    body.appendChild(document.createElementNS(XHTML_NS, 'pre')).textContent = fragment.textContent;
  }

  // Scripts would start as soon as they are inserted, external ones without keeping their
  // order; they are made inert here and started one by one afterwards.
  const scripts: [Element, string | null][] = [];
  for (const s of root.querySelectorAll('script')) {
    if (s.namespaceURI !== XHTML_NS) continue;
    scripts.push([s, s.getAttribute('type')]);
    s.setAttribute('type', INERT);
  }
  document.replaceChild(root, document.documentElement as Element);
  if (root.namespaceURI === XHTML_NS) patchDocument();
  await runScripts(scripts);

  // The events have fired for the XML document already; scripts in the result expect them.
  document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
  window.dispatchEvent(new Event('load'));
}

install();
main(document.currentScript).catch((e) => console.error('polyxslt:', e));
