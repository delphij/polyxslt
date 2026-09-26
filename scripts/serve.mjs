// Static file server for the end-to-end tests.  Serves e2e/pages at / and dist at /dist.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, normalize, resolve } from 'node:path';

const port = Number(process.env.PORT ?? 4173);
const types = {
  '.xml': 'application/xml',
  '.xsl': 'application/xml',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.map': 'application/json',
  '.css': 'text/css',
};

function locate(pathname) {
  const [base, rest] = pathname.startsWith('/dist/')
    ? ['dist', pathname.slice('/dist/'.length)]
    : ['e2e/pages', pathname.slice(1)];
  const root = resolve(base);
  const file = resolve(root, normalize(rest));
  return file.startsWith(`${root}/`) ? file : null;
}

createServer((req, res) => {
  const file = locate(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  let ok = false;
  try {
    ok = file !== null && statSync(file).isFile();
  } catch {}
  if (!ok) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1');
