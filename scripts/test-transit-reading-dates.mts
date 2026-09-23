import assert from "node:assert/strict";
import { untraceableTransitReadingDates } from "../api/_lib/transit-reading-dates.ts";
import { validateFriendTransitReadingDraft } from "../api/_lib/friend-transit-reading.ts";
import { validateYouTransitReadingDraft } from "../api/_lib/you-transit-reading.ts";

for (const range of ['Sep 10 - 30', 'September 10–30', 'Sept. 10th—30th', 'Sep 10 through 30']) {
  assert.deepEqual(untraceableTransitReadingDates('Through September 30.', { range }), []);
  assert.deepEqual(untraceableTransitReadingDates('On September 20.', { range }), ['September 20']);
  assert.deepEqual(untraceableTransitReadingDates('Through October 30.', { range }), ['October 30']);
}
assert.deepEqual(untraceableTransitReadingDates('September 5 through October 9.', { range: 'Sep 5 - Oct 9' }), []);
assert.deepEqual(untraceableTransitReadingDates('October 5.', { range: 'Sep 5 - Oct 9' }), ['October 5']);
assert.deepEqual(untraceableTransitReadingDates('September 22.', { targetDate: '2026-09-22' }), []);
assert.deepEqual(untraceableTransitReadingDates('September 30.', { start: 'Sep 10', unrelated: '30' }), ['September 30']);
assert.deepEqual(untraceableTransitReadingDates('January 2.', { range: 'Dec 30 - 2' }), ['January 2']);
assert.deepEqual(untraceableTransitReadingDates('February 31.', { range: 'Feb 1-31' }), ['February 31']);
assert.deepEqual(untraceableTransitReadingDates('September 10–29.', { range: 'Sep 10–30' }), ['September 29']);

const friendBrief = {
  schema: 'tldr.friend-transits-brief.v1' as const, friendName: 'Alex', dateLabel: 'Tue, Sep 22', primaryThemes: [], relationshipActivations: [],
  houseContext: [{ id: 'mercury-house', contentKey: 'fixture', transitPlanet: 'Mercury', title: 'Mercury in the 1st house', durationLabel: null,
    timingRange: 'Sep 10 - 30', rowSummary: 'Alex can explain a point clearly.', termLabel: 'Current', keywords: [], house: 1, houseLabel: '1st house', detailAvailable: true }],
  daily: null, longerCycles: [], activePatterns: [], hasAnyTransit: true, counts: {}
};
const youBrief = { schema: 'tldr.you-transit-reading-brief.v1' as const, window: 'day' as const, targetDate: '2026-09-22', periodEnd: '2026-09-22', dateLabel: 'Tue, Sep 22',
  approvedReaderText: { body: 'You can explain a point clearly.' }, technicalEvidence: { range: 'Sep 10 - 30' } };
for (const [date, expected] of [['September 30', false], ['September 29', true], ['October 30', true]] as const) {
  const friend = validateFriendTransitReadingDraft({ brief: friendBrief, expectedHeadline: 'Fixture', draft: { headline: 'Fixture', summary: 'Alex can explain a point clearly.', body: `Alex can explain a point clearly through ${date}.` } });
  const you = validateYouTransitReadingDraft({ brief: youBrief, expectedHeadline: 'Fixture', draft: { headline: 'Fixture', summary: 'You can explain a point clearly.', body: `You can explain a point clearly through ${date}.` } });
  assert.equal(friend.issues.some(issue => issue.code === 'untraceable_date'), expected);
  assert.equal(you.issues.some(issue => issue.code === 'untraceable_date'), expected);
}
console.log('Transit date validation: equivalent month formats and explicit range endpoints pass through both real validators; invented dates, cross-field ranges and month swaps fail.');
