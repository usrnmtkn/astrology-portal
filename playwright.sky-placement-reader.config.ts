import { defineConfig } from '@playwright/test';
import reader from './playwright.config';

// Keep the existing reader job's complete selection in one discoverable config.
// Duration-balanced shards resolve every test identity before execution.
export default defineConfig({
  ...reader,
  testMatch: [
    'sky-placement-retrograde.spec.ts', 'sky-composable-reader.spec.ts',
    'sky-placement-stability.spec.ts', 'sky-placement-publication-hydration.spec.ts',
    'sky-ingress-reader.spec.ts', 'sky-placement-hydration-boundary.spec.ts',
    'sky-detail-module-contract.spec.ts',
    'sky-moon-publication-reader.spec.ts', 'article-navigation-stability.spec.ts',
    'sky-you-transit-parity.spec.ts', 'calendar-day-summary.spec.ts',
    'calendar-content-retention.spec.ts', 'calendar-reading-stability.spec.ts',
    'calendar-api-loading.spec.ts', 'calendar-current-season.spec.ts',
    'sky-placement-dates.spec.ts', 'placement-visit-dates.spec.ts',
    'sky-placement-key-dates.spec.ts'
  ]
});
