import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/memory', fullyParallel: false, workers: 1, timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:43917', headless: true },
  webServer: { command: 'NODE_ENV=production MEMORY_PREVIEW_TEST_MODE=1 CONTENT_GENERATION_SECRET=memory-browser-fixture MEMORY_PREVIEW_PORT=43917 node --import tsx scripts/preview-agent-memory.mjs', url: 'http://127.0.0.1:43917/admin/content/memory', reuseExistingServer: false },
});
