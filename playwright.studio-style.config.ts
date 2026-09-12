import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/visual',
  testMatch: ['content-dashboard-admin-user-flows.spec.ts', 'content-studio-needs-attention.spec.ts'],
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4284', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run build -w @tldr/astro-knowledge && npm run build:admin && npm run preview -w @tldr/admin -- --port 4284 --strictPort', url: 'http://127.0.0.1:4284', reuseExistingServer: false, timeout: 120000 },
});
