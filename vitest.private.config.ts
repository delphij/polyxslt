// Configuration for `pnpm verify:private`; see scripts/verify-private.mjs.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';
import { privateCases } from './scripts/private-cases.mjs';

const dir = process.env.POLYXSLT_PRIVATE ?? '';
const browsers = (process.env.POLYXSLT_BROWSERS ?? 'chromium,firefox,webkit').split(',');

// Reads a sample; only paths inside the sample directory are served.
const readPrivate: BrowserCommand<[path: string]> = (_ctx, path) => {
  const root = resolve(dir);
  const file = resolve(root, path);
  if (!file.startsWith(`${root}/`)) throw new Error(`outside the sample directory: ${path}`);
  return readFileSync(join(file), 'utf8');
};

export default defineConfig({
  define: { __DEV__: 'true', __PRIVATE_CASES__: JSON.stringify(dir ? privateCases(dir) : []) },
  test: {
    include: ['test/private/*.check.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: browsers.map((browser) => ({ browser: browser as 'chromium' })),
      commands: { readPrivate },
    },
  },
});
