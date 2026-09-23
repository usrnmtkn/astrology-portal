import { defineConfig } from '@playwright/test';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4187';
const productionEntry = process.env.STUDIO_PRODUCTION_ENTRY === '1';
export default defineConfig({
 testDir: './tests/visual', testMatch: ['horoscope-writing.spec.ts'],
 timeout: 90000, expect: { timeout: 20000 }, workers: 1, retries: 0,
 reporter: [['list']],
 use: { baseURL, actionTimeout: 20000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
 webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
  command: productionEntry
   ? 'npm run build && npm run preview -w @tldr/web -- --port 4187 --strictPort'
   : 'npm run build:admin && npm run preview -w @tldr/admin -- --port 4187 --strictPort',
  url: 'http://127.0.0.1:4187',
  reuseExistingServer: false, timeout: 180000
 }
});
