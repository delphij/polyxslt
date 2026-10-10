// An XSLTProcessor with the interface browsers provide, for browsers that no longer do.
import { XHTML_NS } from '../out/finish.js';
import { compileStylesheet } from '../xslt/compile.js';
import type { Stylesheet } from '../xslt/runtime.js';
import { run } from '../xslt/transform.js';

export class XSLTProcessor {
  #sheet: Stylesheet | undefined;
  #params = new Map<string, unknown>();

  importStylesheet(style: Node): void {
    let doc = style as Document;
    if (style.nodeType !== 9) {
      doc = document.implementation.createDocument(null, null);
      doc.appendChild(doc.importNode(style, true));
    }
    this.#sheet = compileStylesheet(doc);
  }

  /** Returns null on failure, as Chromium does; the error is logged. */
  transformToFragment(source: Node, output: Document): DocumentFragment | null {
    try {
      if (!this.#sheet) throw new Error('no stylesheet imported');
      return run(this.#sheet, source, output).fragment;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  transformToDocument(source: Node): Document | null {
    try {
      if (!this.#sheet) throw new Error('no stylesheet imported');
      const html = document.implementation.createHTMLDocument('');
      const { fragment, method } = run(this.#sheet, source, html);
      if (method === 'xml') {
        const xml = document.implementation.createDocument(null, null);
        xml.appendChild(xml.importNode(fragment, true));
        return xml;
      }
      if (method === 'text') {
        const pre = html.createElementNS(XHTML_NS, 'pre');
        pre.append(fragment);
        html.body.append(pre);
      } else if (fragment.firstElementChild) {
        html.replaceChild(fragment.firstElementChild, html.documentElement);
      }
      return html;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // xsl:param is not supported in 1.0; parameters are kept for the interface only.
  setParameter(ns: string | null, name: string, value: unknown): void {
    this.#params.set(`${ns ?? ''} ${name}`, value);
  }

  getParameter(ns: string | null, name: string): unknown {
    return this.#params.get(`${ns ?? ''} ${name}`) ?? null;
  }

  removeParameter(ns: string | null, name: string): void {
    this.#params.delete(`${ns ?? ''} ${name}`);
  }

  clearParameters(): void {
    this.#params.clear();
  }

  reset(): void {
    this.#sheet = undefined;
    this.#params.clear();
  }
}

/** Installs XSLTProcessor as a global if the browser has none. */
export function install(): void {
  const g = globalThis as { XSLTProcessor?: unknown };
  g.XSLTProcessor ??= XSLTProcessor;
}
