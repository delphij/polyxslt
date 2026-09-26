// Behavior not covered by the xsltproc comparison: features deliberately left out of 1.0,
// and the public API.
import { describe, expect, test } from 'vitest';
import { Code, compileStylesheet, transform, XSLTError, XSLTProcessor } from '../src/index';

const parse = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const sheet = (body: string, top = '') =>
  parse(
    `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">${top}` +
      `<xsl:template match="/">${body}</xsl:template></xsl:stylesheet>`,
  );
const source = parse('<doc><a>1</a></doc>');

function code(f: () => unknown): Code | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof XSLTError) return e.code;
    throw e;
  }
  return undefined;
}

describe('features outside 1.0 are rejected as unsupported', () => {
  const cases: [string, Document][] = [
    ['xsl:import', sheet('', '<xsl:import href="x.xsl"/>')],
    ['xsl:key', sheet('', '<xsl:key name="k" match="a" use="."/>')],
    ['xsl:param', sheet('', '<xsl:param name="p"/>')],
    ['xsl:strip-space', sheet('', '<xsl:strip-space elements="*"/>')],
    ['xsl:call-template', sheet('<xsl:call-template name="t"/>')],
    ['xsl:number', sheet('<xsl:number/>')],
    ['mode', sheet('<xsl:apply-templates mode="m"/>')],
    ['use-attribute-sets', sheet('<p xsl:use-attribute-sets="s"/>')],
    ['output method', sheet('', '<xsl:output method="xhtml"/>')],
  ];
  for (const [name, doc] of cases) {
    test(name, () => expect(code(() => compileStylesheet(doc))).toBe(Code.Unsupported));
  }

  test('namespace axis', () => {
    const s = sheet('<xsl:value-of select="count(doc/namespace::*)"/>');
    expect(code(() => transform(s, source))).toBe(Code.Unsupported);
  });
});

test('deep recursion stops at the template depth limit', () => {
  const s = parse(
    '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">' +
      '<xsl:template match="/"><xsl:apply-templates select="."/></xsl:template></xsl:stylesheet>',
  );
  expect(code(() => transform(s, source))).toBe(Code.Limit);
});

test('a compiled stylesheet can be reused', () => {
  const s = compileStylesheet(sheet('<p><xsl:value-of select="doc/a"/></p>'));
  const a = transform(s, source);
  const b = transform(s, parse('<doc><a>2</a></doc>'));
  expect(a.textContent).toBe('1');
  expect(b.textContent).toBe('2');
});

test('xsl:copy-of counts every copied node against the limit', () => {
  const s = sheet('<out><xsl:copy-of select="/"/></out>');
  const big = parse(`<doc>${'<a>1</a>'.repeat(50)}</doc>`);
  expect(transform(s, big, { maxNodes: 200 }).querySelectorAll('a').length).toBe(50);
  expect(code(() => transform(s, big, { maxNodes: 60 }))).toBe(Code.Limit);
});

test('result nodes belong to the given document', () => {
  const owner = document.implementation.createHTMLDocument('');
  const f = transform(sheet('<html><body><p>x</p></body></html>'), source, { document: owner });
  expect(f.ownerDocument).toBe(owner);
  expect(f.querySelector('p')?.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
});

describe('XSLTProcessor', () => {
  const style = (out: string, body: string) =>
    parse(
      `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">` +
        `<xsl:output method="${out}"/><xsl:template match="/">${body}</xsl:template></xsl:stylesheet>`,
    );

  test('transformToFragment', () => {
    const p = new XSLTProcessor();
    p.importStylesheet(style('html', '<p><xsl:value-of select="doc/a"/></p>'));
    const f = p.transformToFragment(source, document);
    expect(f?.querySelector('p')?.textContent).toBe('1');
    expect(f?.ownerDocument).toBe(document);
  });

  test('transformToDocument with each output method', () => {
    const p = new XSLTProcessor();
    p.importStylesheet(style('html', '<html><body><p>h</p></body></html>'));
    const h = p.transformToDocument(source);
    expect(h?.documentElement.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    expect(h?.body.textContent).toContain('h');

    p.importStylesheet(style('xml', '<r><x/></r>'));
    const x = p.transformToDocument(source);
    expect(x?.documentElement.localName).toBe('r');
    expect(x?.documentElement.namespaceURI).toBeNull();

    p.importStylesheet(style('text', 'plain'));
    expect(p.transformToDocument(source)?.body.textContent).toBe('plain');
  });

  test('failures return null', () => {
    const p = new XSLTProcessor();
    expect(p.transformToFragment(source, document)).toBeNull();
    p.importStylesheet(style('html', '<xsl:value-of select="$undefined"/>'));
    expect(p.transformToFragment(source, document)).toBeNull();
  });

  test('parameters are stored', () => {
    const p = new XSLTProcessor();
    p.setParameter(null, 'a', 1);
    expect(p.getParameter(null, 'a')).toBe(1);
    p.removeParameter(null, 'a');
    expect(p.getParameter(null, 'a')).toBeNull();
  });
});

describe('strict mode', () => {
  const data = parse(
    `<doc><url>javascript:alert(1)</url><url> Java&#9;Script:alert(1)</url><url>data:text/html,x</url>` +
      `<url>data:image/png;base64,AA==</url><url>/ok</url>` +
      `<html>&lt;p onclick="x()"&gt;a&lt;/p&gt;&lt;script&gt;x()&lt;/script&gt;&lt;img src=x onerror=x()&gt;` +
      `&lt;template&gt;&lt;script&gt;x()&lt;/script&gt;&lt;/template&gt;</html></doc>`,
  );
  const s = sheet(
    `<html><head><base href="/"/><meta http-equiv="refresh" content="0"/><script>x()</script></head>` +
      `<body><xsl:for-each select="doc/url"><a href="{.}" onclick="{.}">u</a></xsl:for-each>` +
      `<a href="javascript:void(0)">literal</a><iframe src="/f"/><object data="/o"/>` +
      `<svg><a href="/s"><animate attributeName="href" to="javascript:x()"/><set attributeName="href"/></a></svg>` +
      `<form action="javascript:x()"><button formaction="/b">b</button></form>` +
      `<div id="doe"><xsl:value-of select="doc/html" disable-output-escaping="yes"/></div></body></html>`,
  );

  test('removes active content', () => {
    const f = transform(s, data, { strict: true });
    for (const name of [
      'script',
      'iframe',
      'object',
      'base',
      'meta[http-equiv]',
      'animate',
      'set',
    ]) {
      expect(f.querySelector(name)).toBeNull();
    }
    const html = new XMLSerializer().serializeToString(f).toLowerCase();
    for (const bad of ['onclick', 'onerror', 'javascript:', 'text/html'])
      expect(html).not.toContain(bad);
    // A leading space is escaped as %20 by the html output method, which leaves a harmless
    // relative URL.
    const hrefs = [...f.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      null,
      '%20Java\tScript:alert(1)',
      null,
      'data:image/png;base64,AA==',
      '/ok',
      null,
      '/s',
    ]);
    expect(f.querySelector('button')?.getAttribute('formaction')).toBe('/b');
    expect(f.querySelector('#doe p')?.textContent).toBe('a');
    expect(f.querySelector('#doe img')?.getAttribute('src')).toBe('x');
    const template = f.querySelector('#doe template') as HTMLTemplateElement | null;
    expect(template?.content.querySelector('script')).toBeNull();
  });

  test('is off by default', () => {
    const f = transform(s, data);
    expect(f.querySelector('script')).not.toBeNull();
    expect(f.querySelector('a')?.getAttribute('href')).toBe('javascript:alert(1)');
  });
});

test('the result node limit', () => {
  const s = sheet(
    '<xsl:for-each select="//node()"><p><xsl:value-of select="."/></p></xsl:for-each>',
  );
  expect(transform(s, source, { maxNodes: 100 }).childNodes.length).toBeGreaterThan(0);
  expect(code(() => transform(s, source, { maxNodes: 3 }))).toBe(Code.Limit);
});
