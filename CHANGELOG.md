# Changelog

## 1.1.0

Faster transformations; `pnpm bench` measures them (see CONTRIBUTING.md). With the
benchmark's feed and sitemap stylesheets a transformation takes 35 to 55 % less time than
with 1.0.2, depending on the browser.

- Under the html output method, result elements are created once, in their final form,
  instead of being created again when the result is finished.
- Name tests on the attribute and child axes use the DOM's own lookup, and results that
  are in document order already are not sorted.
- A match pattern with predicates no longer evaluates them for all siblings of each node
  tried, unless they depend on the position.
- HTML written with `disable-output-escaping` is moved into the result, not copied.
- The html output method no longer adds `<meta charset>` to a `<head>` that has no
  encoding declaration. The result is a DOM tree, where the element declares nothing; a
  page that looks for it has to write it in the stylesheet. The `encoding` attribute of
  `xsl:output` is still accepted and has no effect.
- An XSLT element that is not implemented, such as `xsl:key`, is reported as error 20
  (`UnknownInstruction`), like any element that is not known, instead of error 2. Error 2
  remains for `mode`, attribute sets, other output methods and the `namespace` axis.
- A match pattern that spells out `descendant-or-self::node()` is an error, as it is for
  xsltproc; `//` is the way to write it.

## 1.0.2

No changes to the code. This is the first version published by the release workflow, so
the npm package has a provenance statement. 1.0.1 is on npm only, published by hand; its
source is the tag `v1.0.1`.

## 1.0.1

- The type declarations use explicit file extensions in their imports, so they resolve
  under TypeScript's `node16` and `nodenext` module resolution. Before, the types of the
  stylesheet and of the options were lost there.
- The development builds are exported as `polyxslt/dev` and `polyxslt/dev/xslt-polyfill.js`.

## 1.0.0

First release. XSLT 1.0 and XPath 1.0 for the stylesheets used to present feeds and
sitemaps, following libxslt's behavior; see docs/SUPPORTED.md and docs/DIVERGENCES.md.

- Auto mode: a script element in an XML document transforms it when the browser has no
  XSLT of its own, and runs the scripts of the result in order.
- `XSLTProcessor` is installed when the browser has none.
- ESM API: `transform`, `compileStylesheet`, `XSLTProcessor`, `install`.
- Strict mode (off by default) removes active content from the result.
- Supported instructions include `xsl:copy-of` for rich content in feeds.
