# Changelog

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
