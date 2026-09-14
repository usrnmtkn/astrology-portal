import { defineConfig } from '@playwright/test';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4174';
export default defineConfig({
 testDir: './tests/visual', testMatch: ['sky-placement-article-phrases.spec.ts', 'sky-placement-article-save.spec.ts', 'zodiac-season-variables.spec.ts', 'zodiac-season-templates.spec.ts'],
 timeout: 60000, expect: { timeout: 15000 }, workers: 1, retries: 0,
 reporter: [['list']],
 use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
 webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
  command: 'npm run build:admin && npm run preview -w @tldr/admin', url: 'http://127.0.0.1:4174',
  reuseExistingServer: false, timeout: 120000
 }
});
