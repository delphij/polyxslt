# Differences from the specification and from libxslt

The reference for behavior is libxslt as run by `xsltproc` (see CONTRIBUTING.md). This file
lists where the implementation departs from the XSLT 1.0 / XPath 1.0 specifications in
order to match libxslt, and where it departs from libxslt.

## Following libxslt rather than the specification

| Area | Specification | libxslt and this implementation |
|---|---|---|
| Number literals | XPath 1.0 has no exponent syntax | `1e3`, `1.5E-2` are accepted in expressions |
| `number()` of a string | no exponent | `number('1e3')` is 1000 |
| Number to string | decimal form, no exponent | integers within the range of a 32-bit C `int` (exclusive of its limits) print as integers; other numbers with an absolute value in [1e-5, 1e9) print in fixed notation with 15 significant digits; the rest in exponential notation such as `1.5e+10` |
| `following` axis of an attribute | includes the descendants of the attribute's element | starts after the element; its descendants are not included |
| Template conflicts | an error, or the last matching rule | the last matching rule in the stylesheet |
| `count()` and other functions on a result tree fragment | not allowed | allowed; the fragment counts as one node (paths and predicates on it are still errors) |
| `xsl:sort` without `lang` | language-dependent | code point order; `case-order` has no effect |

### The html output method

libxslt serializes the result, and a browser parses that text as HTML. The result tree
built here is meant to match what the browser ends up with, so it reproduces these effects:

- elements without a namespace go into the XHTML namespace, with lower-case names; `svg`
  and `math` subtrees go into the SVG and MathML namespaces;
- elements and attributes with a prefix become HTML elements and attributes whose names
  contain the prefix (for example an attribute named `xml:lang`), since the HTML parser
  does not process namespaces;
- `checked`, `compact`, `declare`, `defer`, `disabled`, `ismap`, `multiple`, `nohref`,
  `noresize`, `noshade`, `nowrap`, `readonly` and `selected` have an empty value;
- in `href`, `src`, `action`, and `name` on `a`, spaces, control characters other than tab,
  and non-ASCII characters are percent-encoded as UTF-8;
- `<html>` always has `<head>` and `<body>`, and table rows written directly in a
  `<table>` are placed in a `<tbody>`;
- a `<head>` without an encoding declaration gets `<meta charset>` with the output
  encoding (UTF-8 by default), as libxslt adds one.

Processing instructions in the result stay processing instructions. libxslt writes them as
`<?target data>`; Chromium's HTML parser reads that as a processing instruction, Firefox's
and WebKit's as a comment. Neither is rendered.

Indentation is not reproduced. The specification allows, but does not require, a processor
to add whitespace when `indent` is `yes` (the default of the html method). libxslt and
browsers using it add newlines between some elements; the result here has none. This can
matter where such whitespace is rendered, for example between elements styled as
`inline-block`. The comparison with xsltproc is made with `indent="no"`.

## Differing from libxslt

| Area | libxslt | This implementation | Reason |
|---|---|---|---|
| `namespace` axis | supported | raises error 2 (not supported) | the DOM has no namespace nodes |
| `id()` | IDs declared in a DTD and `xml:id` | `xml:id` only | attribute types from a DTD are not available through the DOM |
| Order of `preceding` from an attribute | the result is not always in document order | document order | libxslt defect; the node-set itself is the same |
| Very small number literals | `5e-324` evaluates to 0 | parsed as a double | libxslt's own number parser underflows |
| Namespace declarations in html output | written as `xmlns:p` attributes, which an HTML parser keeps as ordinary attributes | not produced | they have no effect on the page |
| Namespaced attribute whose prefix is in use | libxslt picks another prefix, such as `n_1` | the prefix is kept | rare |
| Other HTML parser corrections | misnested `<p>`, text inside tables and similar cases are rearranged by the parser | not reproduced | only the corrections listed above are reproduced |
| disable-output-escaping | the text is written unescaped and parsed together with the rest | each piece is parsed on its own; markup split across several pieces is not joined | the result is built as DOM, not as text |
| Recursion depth | 3000 nested templates | 3000, or fewer if the JavaScript stack runs out first; either way an error | |
| Text sort order | UTF-8 byte order (code point order) | UTF-16 code unit order | differs only between characters outside the BMP and U+E000–U+FFFF |
| Hosting the result (auto mode) | the browser creates an HTML document | the XML document is kept and its content replaced; `document.createElement`, the `innerHTML` setter and `insertAdjacentHTML` are patched to create and parse HTML, while `outerHTML` and `document.write` keep XML behavior | an XML document cannot be turned into an HTML document |
| Page events (auto mode) | `DOMContentLoaded` and `load` fire after the result is parsed | the real events fire for the XML document; after the result's scripts have run, `DOMContentLoaded` and `load` are dispatched again | scripts in the result expect them |
| Scripts in the result (auto mode) | run as the parser meets them; `defer` scripts after parsing | run one at a time in document order; external scripts without `async` are awaited, `defer` is treated like a normal script | |
| Features not in 1.0 | supported | error 2 (not supported): `xsl:import`, `xsl:include`, `xsl:key`, `xsl:param`, `xsl:call-template`, `mode`, `xsl:copy`, `xsl:number`, `xsl:comment`, `xsl:processing-instruction`, `xsl:message`, attribute sets, `xsl:strip-space`/`preserve-space`, `xsl:decimal-format`, `xsl:namespace-alias`, and the XSLT functions other than `current()` | see SUPPORTED.md |
