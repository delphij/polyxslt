// Benchmarks one or more builds of the ESM bundle in real browsers.
//
//   node scripts/bench.mjs [name=]path/to/polyxslt.mjs ... [--browsers=chromium,firefox,webkit]
//                          [--samples=9] [--min-time=100] [--only=rss,stress] [--json=file]
//
// Without a path, dist/polyxslt.mjs is measured.  With several, the first is the baseline
// and the others are reported relative to it; the builds take turns sample by sample, so
// that drift in the machine's load affects them alike.  Each workload is checked to give
// the same serialized result with every build.
//
// The workloads are the stylesheets under test/fixtures/requirements applied to generated
// documents, bench/stress.xsl, which exercises XPath evaluation rather than output, and
// bench/order.xsl and bench/order-flat.xsl, which sort large node-sets into document order.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const engines = { chromium, firefox, webkit };
const args = process.argv.slice(2);
const option = (name, dflt) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const browsers = option('browsers', 'chromium,firefox,webkit').split(',');
const samples = Number(option('samples', '9'));
const minTime = Number(option('min-time', '100'));
const only = option('only', '');
const json = option('json', '');
const paths = args.filter((a) => !a.startsWith('--'));
if (!paths.length) paths.push('dist/polyxslt.mjs');
const bundles = paths.map((p, i) => {
  const eq = p.indexOf('=');
  return {
    name: eq < 0 ? p : p.slice(0, eq),
    url: `/bundle/${i}.mjs`,
    source: readFileSync(eq < 0 ? p : p.slice(eq + 1), 'utf8'),
  };
});

// --- Generated input ---------------------------------------------------------------------

const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'seven', 'omega', 'kappa', 'sigma'];
const word = (i) => WORDS[i % WORDS.length];
const pad = (n) => String(n).padStart(2, '0');
const stamp = (i) =>
  `20${pad(10 + (i % 15))}-${pad(1 + (i % 12))}-${pad(1 + (i % 28))}T${pad(i % 24)}:${pad(i % 60)}:00`;
const body = (i) =>
  `&lt;p&gt;Paragraph ${i} with &lt;em&gt;${word(i)}&lt;/em&gt; and a ` +
  `&lt;a href="/posts/${i}/"&gt;link&lt;/a&gt;.&lt;/p&gt;&lt;p&gt;${word(i + 3)} ${word(i + 5)}&lt;/p&gt;`;

function rss(n) {
  let s =
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">' +
    '<channel><title>Example Log</title><link>https://example.org/</link><language>en</language>';
  for (let i = 0; i < n; i++) {
    s +=
      `<item><title>Post ${i} &amp; ${word(i)}</title><link>https://example.org/posts/${i}/</link>` +
      `<pubDate>Mon, 01 Jan 2024 08:${pad(i % 60)}:00 +0000</pubDate>` +
      `<category>${word(i)}</category><category>${i % 5 ? word(i + 1) : 'Release'}</category>` +
      (i % 2
        ? `<description>${body(i)}</description>`
        : `<content:encoded>${body(i)}</content:encoded>`) +
      '</item>';
  }
  return `${s}</channel></rss>`;
}

function atom(n) {
  let s =
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en"><title>Example Feed</title>' +
    '<updated>2024-03-04T05:06:07Z</updated>';
  for (let i = 0; i < n; i++) {
    s +=
      `<entry><title>Entry ${i}</title><link href="https://example.org/e/${i}"/>` +
      `<published>${stamp(i)}Z</published><updated>${stamp(i + 1)}Z</updated>` +
      `<category term="${i % 5 ? word(i) : 'Release'}"/><category term="${word(i + 2)}"/>` +
      `<${i % 2 ? 'summary' : 'content'} type="html">${body(i)}</${i % 2 ? 'summary' : 'content'}>` +
      '</entry>';
  }
  return `${s}</feed>`;
}

function sitemap(n) {
  let s =
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">';
  for (let i = 0; i < n; i++) {
    const dir = ['posts', 'tags', 'categories', 'about'][i % 4];
    const loc = `https://example.org/en/${dir}/${word(i)}-${i}/`;
    s += `<url><loc>${loc}</loc>`;
    if (i % 7) s += `<lastmod>${stamp(i)}+00:00</lastmod>`;
    if (i % 3 === 0) {
      s +=
        `<xhtml:link rel="alternate" hreflang="en" href="${loc}"/>` +
        `<xhtml:link rel="alternate" hreflang="fr" href="${loc.replace('/en/', '/fr/')}"/>`;
    }
    s += '</url>';
  }
  return `${s}</urlset>`;
}

function catalog(sections, items) {
  let s =
    '<catalog title="Stock"><kinds><kind code="a"> Kind  A </kind><kind code="b">Kind B</kind>' +
    '<kind code="c">Kind C</kind></kinds>';
  let id = 0;
  for (let i = 0; i < sections; i++) {
    s += `<section name="section ${i}">`;
    for (let j = 0; j < items; j++, id++) {
      s +=
        `<item id="i${id}" price="${((id * 37) % 1000) / 10}" qty="${1 + (id % 9)}" ` +
        `kind="${'abc'[id % 3]}"><name>item ${j} ${word(id)}</name>` +
        `<tag>${word(id)}</tag><tag>${word(id + j)}</tag><tag>${word(i)}</tag>` +
        `<note>Note ${id} <em>${word(id + 4)} <b>${word(j)}</b></em> tail <![CDATA[<raw>]]> end</note></item>`;
    }
    s += '</section>';
  }
  return `${s}</catalog>`;
}

const fixture = (name) => readFileSync(`test/fixtures/requirements/${name}/style.xsl`, 'utf8');
const workloads = [
  { name: 'rss', xsl: fixture('feed-rss'), xml: rss(300) },
  { name: 'atom', xsl: fixture('feed-atom'), xml: atom(300) },
  { name: 'sitemap', xsl: fixture('sitemap'), xml: sitemap(1500) },
  { name: 'stress', xsl: readFileSync('bench/stress.xsl', 'utf8'), xml: catalog(30, 40) },
  { name: 'order', xsl: readFileSync('bench/order.xsl', 'utf8'), xml: catalog(30, 40) },
  { name: 'order-flat', xsl: readFileSync('bench/order-flat.xsl', 'utf8'), xml: sitemap(1500) },
].filter((w) => !only || only.split(',').includes(w.name));

// --- Measurement, in the page ------------------------------------------------------------

async function measure({ bundles, workloads, samples, minTime }) {
  const mods = [];
  for (const b of bundles) mods.push(await import(b.url));
  const parse = (s) => {
    const d = new DOMParser().parseFromString(s, 'application/xml');
    if (d.getElementsByTagName('parsererror').length) throw new Error('not well-formed');
    return d;
  };
  const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
  const time = (f, n) => {
    const t = performance.now();
    for (let i = 0; i < n; i++) f();
    return (performance.now() - t) / n;
  };
  // Milliseconds per call of each function: the median over the samples.
  const race = (fns) => {
    let n = 1;
    while (time(fns[0], n) * n < minTime) n *= 2;
    for (const f of fns) time(f, n);
    const res = fns.map(() => []);
    for (let s = 0; s < samples; s++) {
      for (const [i, f] of fns.entries()) res[i].push(time(f, n));
    }
    return res.map(median);
  };

  const rows = [];
  for (const w of workloads) {
    const xsl = parse(w.xsl);
    const xml = parse(w.xml);
    const sheets = mods.map((m) => m.compileStylesheet(xsl));
    const ser = new XMLSerializer();
    const outputs = mods.map((m, i) => ser.serializeToString(m.transform(sheets[i], xml)));
    if (outputs.some((o) => o !== outputs[0])) throw new Error(`${w.name}: results differ`);
    rows.push({
      name: `${w.name} compile`,
      ms: race(mods.map((m) => () => m.compileStylesheet(xsl))),
    });
    rows.push({
      name: `${w.name} transform`,
      ms: race(mods.map((m, i) => () => m.transform(sheets[i], xml))),
      size: outputs[0].length,
    });
  }
  return rows;
}

// --- Report ------------------------------------------------------------------------------

const fmt = (ms) => (ms < 1 ? ms.toFixed(4) : ms.toFixed(2)).padStart(9);
const all = {};
for (const name of browsers) {
  const browser = await engines[name].launch();
  try {
    const page = await browser.newPage();
    await page.route('**/*', (route) => {
      const path = new URL(route.request().url()).pathname;
      const b = bundles.find((x) => x.url === path);
      return b
        ? route.fulfill({ contentType: 'text/javascript', body: b.source })
        : route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>bench</title>' });
    });
    await page.goto('http://bench.invalid/');
    const rows = await page.evaluate(measure, {
      bundles: bundles.map(({ name, url }) => ({ name, url })),
      workloads,
      samples,
      minTime,
    });
    all[name] = rows;
    console.log(`\n${name} ${browser.version()} (ms per call, median of ${samples})`);
    console.log(
      `${'workload'.padEnd(20)}${bundles.map((b) => b.name.slice(-9).padStart(9)).join('')}` +
        (bundles.length > 1 ? '   change' : ''),
    );
    for (const r of rows) {
      const change = r.ms.slice(1).map((m) => `${(((m - r.ms[0]) / r.ms[0]) * 100).toFixed(1)}%`);
      console.log(
        `${r.name.padEnd(20)}${r.ms.map(fmt).join('')}` +
          (change.length ? `   ${change.join('  ')}` : ''),
      );
    }
  } finally {
    await browser.close();
  }
}
if (json) writeFileSync(json, `${JSON.stringify(all, null, 2)}\n`);
