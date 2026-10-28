import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Keep whole files together: serial suites and file-level setup retain their
// existing order and lifetime. Only the three CI assignments change.
export default defineConfig({
  ...base,
  testMatch: [
    'astro-101-learn.spec.ts',
    'fallback-cache-self-heal.spec.ts',
    'calendar-release.spec.ts',
    'calendar-collective-release.spec.ts',
    'calendar-pressure-release.spec.ts',
    'calendar-month-overview.spec.ts',
    'calendar-moon-ui.spec.ts',
    'calendar-lunation-preview.spec.ts',
    'calendar-lunation-aspects.spec.ts',
    'sky-aspect-timing-accuracy.spec.ts',
    'calendar-moon-editor.spec.ts',
    'calendar-lunar-ingresses.spec.ts',
    'calendar-ingress-reading.spec.ts',
    'calendar-transition-phrases.spec.ts',
    'calendar-season-writeups.spec.ts',
    'event-date-consistency.spec.ts',
    'sky-placement-visit-timeline.spec.ts',
    'swisseph-web-data-parity.spec.ts',
    'you-loading-performance.spec.ts',
    'personal-daily-aspects.spec.ts',
    'friends-authenticated-loading-diagnostic.spec.ts',
    'body-paragraph-type.spec.ts',
    'header-navigation-overflow.spec.ts',
    'reader-viewport-containment.spec.ts',
    'empty-error-viewport.spec.ts',
    'load-error-handoff10.spec.ts',
    'tooltip-toast-viewport.spec.ts',
    'chart-table-viewport.spec.ts',
  ]
});
