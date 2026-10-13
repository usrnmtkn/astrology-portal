import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/visual', testMatch: 'studio-article-memory.spec.ts',
  workers: 1, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:4317', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run build:admin && npm run preview -w @tldr/admin -- --port 4317 --strictPort', url: 'http://127.0.0.1:4317', reuseExistingServer: false, timeout: 300000 }
});
