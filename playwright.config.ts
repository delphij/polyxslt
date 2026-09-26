import { defineConfig, devices } from '@playwright/test';

const browsers = (process.env.POLYXSLT_BROWSERS ?? 'chromium,firefox,webkit').split(',');
const device: Record<string, string> = {
  chromium: 'Desktop Chrome',
  firefox: 'Desktop Firefox',
  webkit: 'Desktop Safari',
};

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [
    ...browsers.map((name) => ({
      name,
      use: {
        ...devices[device[name] ?? ''],
        // Chromium can switch off its native XSLT, which exercises the processing-instruction
        // path of the polyfill.
        ...(name === 'chromium' ? { launchOptions: { args: ['--disable-features=XSLT'] } } : {}),
      },
    })),
    // Chromium with its native XSLT, for comparing results.
    ...(browsers.includes('chromium')
      ? [{ name: 'chromium-native', use: devices['Desktop Chrome'], grep: /own XSLT/ }]
      : []),
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://127.0.0.1:4173/dist/xslt-polyfill.min.js',
    reuseExistingServer: !process.env.CI,
  },
});
