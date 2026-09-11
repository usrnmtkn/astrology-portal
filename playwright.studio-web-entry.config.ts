import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/visual',
  testMatch: ['content-dashboard-admin-user-flows.spec.ts'],
  timeout: 60000,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4287', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run build:web && npm run preview -w @tldr/web -- --port 4287 --strictPort', url: 'http://127.0.0.1:4287', reuseExistingServer: false, timeout: 120000 },
});
