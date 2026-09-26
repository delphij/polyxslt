# Security

## Reporting

Please report vulnerabilities privately, rather than in a public issue: through GitHub's
"Report a vulnerability" function on the repository's Security tab, or by mail to the
maintainer, Xin LI <delphij@FreeBSD.org>.

## Threat model

The main use is a site author's own XML documents and stylesheets, both trusted. The
library may also be used on untrusted XML (for example, transforming an uploaded file
through the ESM API) or even untrusted stylesheets. The default behavior therefore matches
native XSLT, and a strict mode is available for untrusted input.

## Protections

| Risk | Measure |
|---|---|
| Code injection | No `eval`, `new Function` or string `setTimeout`; the library works under a Content Security Policy whose `script-src` lacks `unsafe-eval`. |
| Active content | Strict mode, off by default, is enabled with `data-strict` on the script element or `strict: true` in the ESM API. It applies a small fixed policy to the whole result tree, whatever produced it (literal result elements, attribute value templates, `xsl:attribute`, `xsl:copy-of`, disable-output-escaping): it removes `script`, `iframe`, `frame`, `frameset`, `object`, `embed`, `applet`, `base`, `meta` with `http-equiv` and SVG animation elements, event handler attributes and `srcdoc`, and URL attributes with a `javascript:`, `vbscript:` or non-image `data:` scheme. The policy is the same in every browser; the Sanitizer API is not used because its availability and behavior differ between browsers. It is not a general HTML sanitizer; pages handling untrusted input should also set a Content Security Policy. |
| HTML parsing | All HTML parsing goes through one module, `src/out/trust.ts`. Under Trusted Types, HTML produced by the stylesheet passes through a policy named `polyxslt`; values from page scripts (the patched `innerHTML` and `insertAdjacentHTML`) are passed on unchanged, so the page's own policy applies. HTML from the stylesheet is parsed as inert template content. |
| Scripts in the result | Only auto mode runs scripts in the result, as native XSLT does. Nodes returned by `transform` and `XSLTProcessor` run nothing until inserted into a document. Strict mode removes them. |
| Fetching | Auto mode fetches the stylesheet from the same origin only (`mode: 'same-origin'`, `credentials: 'same-origin'`). `document()` is not implemented. |
| External entities, entity expansion | Left to the browser's XML parser. Tests confirm that it fetches no external entity or DTD and bounds entity expansion. |
| Denial of service | Template nesting is limited to 3000 levels, as in libxslt, or fewer where the JavaScript stack runs out first; `maxNodes` limits the number of result nodes, including copied ones. Exceeding a limit throws an `XSLTError`. |
| Prototype pollution | Every structure indexed by a name from the input is a `Map`. |
| Robustness | Fuzz tests feed random and mutated XPath expressions and stylesheets to the implementation; it may only return a result or throw an `XSLTError`. |
| Supply chain | No runtime dependencies; a committed lockfile; GitHub Actions pinned by commit SHA with read-only permissions; reproducible builds (CI builds twice and compares hashes); `pnpm sri` prints Subresource Integrity hashes for release notes. |
