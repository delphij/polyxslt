# polyxslt

A small XSLT 1.0 implementation in JavaScript for browsers that no longer ship a native
XSLT processor. It targets the kind of stylesheets used to present RSS/Atom feeds and
sitemaps, not the complete language; see [docs/SUPPORTED.md](docs/SUPPORTED.md) for the
supported features, [docs/DIVERGENCES.md](docs/DIVERGENCES.md) for the known differences
from libxslt, and [docs/ERRORS.md](docs/ERRORS.md) for the error codes.

## Install

The auto-mode build is a single file, `xslt-polyfill.min.js`. Take it from the
[releases](https://github.com/delphij/polyxslt/releases) page or from the npm package
(`dist/xslt-polyfill.min.js`) and serve it from the site that serves the documents, so that
the feed does not depend on another host.

The npm package is also available from the CDNs that mirror npm, for example
`https://cdn.jsdelivr.net/npm/polyxslt@<version>/dist/xslt-polyfill.min.js`. Each release
lists the Subresource Integrity hashes of its builds.

For the ESM API:

```sh
npm install polyxslt
```

```js
import { transform } from 'polyxslt';
```

`polyxslt/dev` exports the same API from the development build, whose errors carry a
message and details in addition to the code; `polyxslt/dev/xslt-polyfill.js` is the
development build of the auto mode.

## Use

Add a script element in the XHTML namespace to the XML document, next to its
`<?xml-stylesheet?>` instruction:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>
<rss version="2.0">
  <script xmlns="http://www.w3.org/1999/xhtml" src="/js/xslt-polyfill.min.js"></script>
  ...
</rss>
```

Browsers that still have XSLT transform the document themselves and never run the script.
Otherwise the script fetches the stylesheet (same origin only), transforms the document,
replaces its content with the result, and runs the scripts in the result in order. The
`data-stylesheet` attribute on the script element may name the stylesheet instead of the
processing instruction.

The script also installs `XSLTProcessor` when the browser has none. The ESM build
(`polyxslt.mjs`) exports `transform`, `compileStylesheet`, `XSLTProcessor` and `install`.

Strict mode, off by default, removes active content from the result: scripts, frames,
embedded objects, event handler attributes and `javascript:` URLs, among others (see
[SECURITY.md](SECURITY.md)). Enable it with a `data-strict` attribute on the script element,
or with `transform(stylesheet, source, { strict: true })`. It is not a general HTML
sanitizer; for untrusted input, also use a Content Security Policy.

## Development

Requirements: Node.js 24 or later, pnpm, and Homebrew's `libxslt` for regenerating the
reference output.

```sh
pnpm install
pnpm exec playwright install chromium firefox webkit
pnpm build          # dist/xslt-polyfill.min.js (IIFE) and dist/polyxslt.mjs (ESM)
pnpm test           # unit and conformance tests in real browsers
pnpm test:e2e       # end-to-end tests
pnpm golden         # regenerate the reference output with xsltproc
pnpm docs:gen       # regenerate docs/SUPPORTED.md and docs/ERRORS.md
```

`POLYXSLT_BROWSERS=chromium,webkit` limits the browsers used by the tests.

On macOS, Playwright's Firefox may exit at start with "Could not find profile folder" when
macOS privacy settings do not allow it to run from the terminal. Allow it in System
Settings when macOS asks, then restart the terminal application; the setting does not
apply to processes started before the change.

## License

MIT; see [LICENSE](LICENSE).
