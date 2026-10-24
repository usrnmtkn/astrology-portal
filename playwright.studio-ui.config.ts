import { defineConfig } from '@playwright/test';
import { browserTestWebServer } from './playwright.config';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4191';

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
  webServer: browserTestWebServer(baseURL)
});
