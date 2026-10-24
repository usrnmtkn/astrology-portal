import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/visual',
  testMatch: ['content-dashboard-admin-user-flows.spec.ts', 'content-studio-needs-attention.spec.ts', 'studio-startup.spec.ts'],
  timeout: 60000,
  workers: 2,
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4284', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure' },
  webServer: [
    // Source status and published-copy checks use the actual reader frame.
    { command: 'VITE_STUDIO_PARENT_ORIGIN=http://127.0.0.1:4284 npm run build:web && VITE_STUDIO_READER_ORIGIN=http://127.0.0.1:4285 npm run build:admin && npm run preview -w @tldr/web -- --port 4285 --strictPort',
      url: 'http://127.0.0.1:4285', reuseExistingServer: false, timeout: 180000 },
    { command: 'npm run preview -w @tldr/admin -- --port 4284 --strictPort', url: 'http://127.0.0.1:4284', reuseExistingServer: false, timeout: 30000 }
  ],
});
