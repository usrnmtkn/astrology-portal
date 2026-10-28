import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Every shipped handoff surface runs before merge, from a fresh production build.
export default defineConfig(base, {
  timeout: 120_000,
  expect: { ...base.expect, timeout: 30_000 },
  testMatch: [
    'calendar-journal-handoff.spec.ts',
    'card-typography.spec.ts',
    'child-page-back-navigation.spec.ts',
    'design-handoff-pages.spec.ts',
    'design-handoff-type-glyphs.spec.ts',
    'design-handoff-wheel.spec.ts',
    'friends-feed-exact.spec.ts',
    'friends-feed-priority.spec.ts',
    'friends-pair-forecast.spec.ts',
    'handoff-v4-states.spec.ts',
    'loading-handoff.spec.ts',
    'modal-focus.spec.ts',
    'modal-handoff-v9.spec.ts',
    'planetary-horoscope-navigation.spec.ts',
    'reader-unavailable-design.spec.ts',
    'reports-handoff.spec.ts',
    'sky-placement-date-labels.spec.ts',
    'wheel-label-clearance.spec.ts',
  ]
});
