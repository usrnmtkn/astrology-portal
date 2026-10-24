import { defineConfig } from '@playwright/test';

// The standalone Studio embeds the real web reader, served by its own build.
export default defineConfig({
  testDir: './tests/visual', testMatch: ['sky-reader-preview.spec.ts', 'sky-placement-sources.spec.ts'],
  outputDir: './test-results/sky-preview-standalone', timeout: 180_000,
  expect: { timeout: 15_000 }, workers: 1, retries: 0, reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4192', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'VITE_STUDIO_PARENT_ORIGIN=http://127.0.0.1:4192 npm run build:web && VITE_STUDIO_READER_ORIGIN=http://127.0.0.1:4193 npm run build:admin && npm run preview -w @tldr/web -- --port 4193 --strictPort',
      url: 'http://127.0.0.1:4193', reuseExistingServer: false, timeout: 180_000,
      env: { VITE_SUPABASE_URL: 'https://visual-smoke.supabase.test', VITE_SUPABASE_ANON_KEY: 'visual-smoke-placeholder', VITE_ENABLE_NATAL_ASPECT_PATTERNS: 'true' } },
    { command: 'npm run preview -w @tldr/admin -- --port 4192 --strictPort', url: 'http://127.0.0.1:4192', reuseExistingServer: false, timeout: 30_000 }
  ]
});
