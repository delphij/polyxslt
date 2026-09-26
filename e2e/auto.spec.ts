import { expect, type Page, test } from '@playwright/test';

const XHTML = 'http://www.w3.org/1999/xhtml';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function checkPage(page: Page) {
  await expect(page.locator('#title')).toHaveText('Example page');
  expect(await page.title()).toBe('Example page');
  const info = await page.evaluate(() => ({
    root: [document.documentElement.localName, document.documentElement.namespaceURI],
    lang: document.documentElement.getAttribute('lang'),
    head: !!document.head,
    body: !!document.body,
    order: (window as unknown as { order: string[] }).order,
    loaded: (window as unknown as { loaded?: boolean }).loaded,
    svg: document.getElementById('icon')?.namespaceURI,
    tbody: document.querySelectorAll('#rows > tbody > tr').length,
    content: document.querySelector('#content em')?.namespaceURI,
    strong: document.getElementById('strong')?.namespaceURI,
    inner: document.querySelectorAll('#inner p').length,
    adjacent: document.querySelector('#adjacent br')?.namespaceURI,
  }));
  expect(info).toEqual({
    root: ['html', XHTML],
    lang: 'en',
    head: true,
    body: true,
    order: ['inline-1', 'external', 'inline-2 after external'],
    loaded: true,
    svg: 'http://www.w3.org/2000/svg',
    tbody: 2,
    content: XHTML,
    strong: XHTML,
    inner: 3,
    adjacent: XHTML,
  });
  await expect(page.locator('h1')).toHaveCSS('color', 'rgb(1, 2, 3)');
  await expect(page.locator('#strong')).toHaveCSS('color', 'rgb(4, 5, 6)');
  await expect(page.locator('#strong')).toHaveCSS('font-weight', '700');
  const box = await page.locator('#icon').boundingBox();
  expect(box?.width).toBe(20);
}

test('data-stylesheet on the script element', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/explicit.xml');
  await checkPage(page);
  expect(errors).toEqual([]);
});

test('xml-stylesheet processing instruction', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'only Chromium can switch off its native XSLT');
  const errors = collectErrors(page);
  await page.goto('/pi.xml');
  await checkPage(page);
  expect(errors).toEqual([]);
});

test('XSLTProcessor is provided when the browser has none', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'only Chromium can switch off its native XSLT');
  await page.goto('/pi.xml');
  await expect(page.locator('#title')).toHaveText('Example page');
  const text = await page.evaluate(async () => {
    const p = new XSLTProcessor();
    const parse = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
    p.importStylesheet(parse(await (await fetch('/page.xsl')).text()));
    const f = p.transformToFragment(parse('<doc><title>T</title></doc>'), document);
    return f?.querySelector('h1')?.textContent;
  });
  expect(text).toBe('T');
});

for (const [name, path] of [
  ['a missing stylesheet', '/missing.xml'],
  ['a cross-origin stylesheet', '/cross-origin.xml'],
]) {
  test(`${name} leaves the document unchanged`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(path as string);
    await expect.poll(() => errors.some((e) => e.includes('polyxslt'))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.localName)).toBe('doc');
  });
}

// A canonical form of the DOM, computed in the page (see test/support/canon.ts).
function canonical(): string {
  const XHTML_NS = 'http://www.w3.org/1999/xhtml';
  const out: string[] = [];
  let text: string | null = null;
  let depth = 0;
  // Whitespace-only text is left out: the libxml2 in a browser may be older than the
  // reference and indent slightly differently; indentation is checked against xsltproc.
  const flush = () => {
    if (text?.trim()) out.push(`${'  '.repeat(depth)}${JSON.stringify(text)}`);
    text = null;
  };
  const walk = (n: Node, d: number) => {
    if (n.nodeType === 3 || n.nodeType === 4) {
      if (text === null) depth = d;
      text = (text ?? '') + n.nodeValue;
      return;
    }
    if (n.nodeType !== 1) return;
    const e = n as Element;
    // Different libxml2 versions insert different encoding declarations.
    if (
      e.localName === 'meta' &&
      (e.hasAttribute('charset') || e.getAttribute('http-equiv')?.toLowerCase() === 'content-type')
    ) {
      return;
    }
    flush();
    const attrs = [...e.attributes]
      .filter((a) => !/^xmlns(:|$)/.test(a.name))
      .map((a) => `${a.name}=${JSON.stringify(a.value)}`)
      .sort();
    const ns = e.namespaceURI === XHTML_NS ? '' : `{${e.namespaceURI ?? ''}}`;
    out.push(`${'  '.repeat(d)}<${[ns + e.localName, ...attrs].join(' ')}>`);
    for (const c of e.childNodes) walk(c, d + 1);
    flush();
  };
  walk(document.documentElement, 0);
  flush();
  return out.join('\n');
}

test('the result matches the browser’s own XSLT', async ({ page }, info) => {
  test.skip(info.project.name === 'chromium', 'native XSLT is switched off in this project');
  // Firefox's own processor is not libxslt: it ignores disable-output-escaping and leaves
  // <svg> without a namespace in the HTML namespace.
  test.skip(info.project.name === 'firefox', 'Firefox does not use libxslt');
  await page.goto('/pi.xml');
  await expect(page.locator('#strong')).toHaveText('dynamic');
  const native = (await page.evaluate(canonical))
    // The processing instruction page has no polyfill script element in its result.
    .split('\n');
  await page.goto('/explicit.xml');
  await expect(page.locator('#strong')).toHaveText('dynamic');
  const ours = (await page.evaluate(canonical)).split('\n');
  expect(ours).toEqual(native);
});

test('data-strict removes the scripts of the result', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/strict.xml');
  await expect(page.locator('#title')).toHaveText('Example page');
  const state = await page.evaluate(() => ({
    scripts: document.querySelectorAll('script').length,
    order: (window as unknown as { order?: string[] }).order,
    dynamic: document.getElementById('strong'),
  }));
  expect(state).toEqual({ scripts: 0, order: undefined, dynamic: null });
  expect(errors).toEqual([]);
});
