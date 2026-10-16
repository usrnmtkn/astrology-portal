import { defineConfig } from '@playwright/test';
import base from './playwright.reader-release.config';
export default defineConfig(base, {
  workers: 1, retries: 0,
  testMatch: ['client-facing-user-flows.spec.ts', 'content-dashboard-admin-user-flows.spec.ts'],
  grep: /Moon legacy routing|reported Moon natal aspects retain full published writing/
});
