import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/visual', testMatch: ['sky-cms-layout.spec.ts', 'sky-article-writer-label.spec.ts'],
  timeout: 90000, expect: { timeout: 15000 }, workers: 1, retries: 0,
  use: { baseURL: 'http://127.0.0.1:4196', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run build:admin && npm run preview -w @tldr/admin -- --port 4196',
    url: 'http://127.0.0.1:4196', reuseExistingServer: false, timeout: 120000 }
});
