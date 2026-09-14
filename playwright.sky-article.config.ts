import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/visual', testMatch: 'sky-placement-article-phrases.spec.ts',
 timeout: 60000, expect: { timeout: 15000 }, workers: 1, retries: 0,
 reporter: [['list']],
 use: { baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
 webServer: {
  command: 'npm run build:admin && npm run preview -w @tldr/admin', url: 'http://127.0.0.1:4174',
  reuseExistingServer: false, timeout: 120000
 }
});
