import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateYouTransitReadingDraft, type YouTransitReadingBrief } from '../api/_lib/you-transit-reading.ts';

// Synthetic regression evidence only. No production report or personal data.
const moonOnly: YouTransitReadingBrief = {
  schema: 'tldr.you-transit-reading-brief.v1', window: 'week',
  targetDate: '2026-09-14', periodEnd: '2026-09-20', dateLabel: 'Synthetic week',
  approvedReaderText: { horoscope: { body: 'The Moon in Scorpio supports honest conversations.' } },
  technicalEvidence: { readings: [{ source: 'weekly-moon', driverLabel: 'Moon in Scorpio', house: null }] },
};
const check = (body: string) => validateYouTransitReadingDraft({
  brief: moonOnly, expectedHeadline: 'Your week, in depth',
  draft: { headline: 'Your week, in depth', summary: 'Honest conversations may help this week.', body },
});

test('ordinary opposite is not a planetary opposition', () => {
  assert.equal(check('Avoiding the conversation can have the opposite of the intended effect.').passed, true);
});
test('an unsupported planetary opposition still fails', () => {
  assert.equal(check('The Moon opposes Saturn.').passed, false);
});
