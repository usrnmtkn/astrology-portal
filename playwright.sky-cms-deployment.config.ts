import { defineConfig } from '@playwright/test';
process.env.STUDIO_PRODUCTION_ENTRY = '1';
export default defineConfig({
  testDir: './tests/visual', testMatch: ['sky-cms-layout.spec.ts', 'sky-article-writer-label.spec.ts'],
  timeout: 90000, expect: { timeout: 15000 }, workers: 1, retries: 0,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'https://tldrastro.vercel.app',
    trace: 'retain-on-failure', screenshot: 'only-on-failure' }
});
