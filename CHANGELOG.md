# Changelog

## 1.0.0

First release. XSLT 1.0 and XPath 1.0 for the stylesheets used to present feeds and
sitemaps, following libxslt's behavior; see docs/SUPPORTED.md and docs/DIVERGENCES.md.

- Auto mode: a script element in an XML document transforms it when the browser has no
  XSLT of its own, and runs the scripts of the result in order.
- `XSLTProcessor` is installed when the browser has none.
- ESM API: `transform`, `compileStylesheet`, `XSLTProcessor`, `install`.
- Strict mode (off by default) removes active content from the result.
- Supported instructions include `xsl:copy-of` for rich content in feeds.
