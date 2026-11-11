import { defineConfig } from '@playwright/test';

// Every recipe test runs in all three engines: Chromium (Chrome, Edge), WebKit (Safari) and Firefox.
export default defineConfig({
  testDir: 'recipes',
  testMatch: '**/test.mjs',
  reporter: process.env.CI ? 'github' : 'list',
  use: { viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1 },
  projects: ['chromium', 'webkit', 'firefox'].map((browserName) => ({ name: browserName, use: { browserName } })),
});
