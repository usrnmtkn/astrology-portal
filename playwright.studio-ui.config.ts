import { defineConfig } from '@playwright/test';
import { browserTestWebServer } from './playwright.config';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4191';
const webServer = browserTestWebServer(baseURL);
// Match the public reader's real anonymous transport. An invalid placeholder
// silently falls back to the login SDK and its cross-frame auth locks.
if (webServer && !webServer.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  webServer.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_visual_fixture';
}

export default defineConfig({
  testDir: './tests/visual',
  testMatch: [
    'calendar-passage-editor.spec.ts', 'calendar-workspace.spec.ts',
    'reader-passage-edit.spec.ts', 'review-calendar-workspace.spec.ts',
    'sky-reader-csv.spec.ts', 'sky-reader-preview.spec.ts',
    'sky-placement-sources.spec.ts', 'sky-placement-variables.spec.ts',
    'sky-writing-library-tables.spec.ts',
    'studio-csv.spec.ts', 'studio-wide-readability.spec.ts'
  ],
  outputDir: './test-results/studio-ui-release',
  timeout: 90000,
  expect: { timeout: 20000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer
});
