import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// POLYXSLT_BROWSERS=chromium,webkit limits the engines locally; CI runs all three.
const browsers = (process.env.POLYXSLT_BROWSERS ?? 'chromium,firefox,webkit').split(',');

export default defineConfig({
  define: { __DEV__: 'true', __FUZZ_RUNS__: process.env.FUZZ_RUNS ?? '300' },
  test: {
    include: ['test/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: browsers.map((browser) => ({ browser: browser as 'chromium' })),
    },
  },
});
