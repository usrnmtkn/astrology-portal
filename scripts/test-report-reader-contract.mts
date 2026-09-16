import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { validateYouTransitReadingDraft, type YouTransitReadingBrief } from '../api/_lib/you-transit-reading.ts';
import { validateFriendTransitReadingDraft, type FriendTransitReadingBrief } from '../api/_lib/friend-transit-reading.ts';
import { transitReadingReaderCopy, transitReadingReaderText } from '../api/_lib/transit-reading-reader-copy.ts';
import { transitReadingRevisionPrompt } from '../api/_lib/transit-reading-revision.ts';
import { extractTransitAspectClaims, transitAspectKeysFromEvidence } from '../api/_lib/transit-reading-aspect-claims.ts';
import { validateCopy } from '../src/astro-writing/validateCopy.mjs';

// Synthetic regression evidence only. No production report or personal data.
const moonOnly: YouTransitReadingBrief = {
  schema: 'tldr.you-transit-reading-brief.v1', window: 'week',
  targetDate: '2026-09-14', periodEnd: '2026-09-20', dateLabel: 'Synthetic week',
  approvedReaderText: { horoscope: { body: 'The Moon in Scorpio supports honest conversations.' } },
  technicalEvidence: { readings: [{ source: 'weekly-moon', driverLabel: 'Moon in Scorpio', house: null }] },
};
const youCheck = (body: string, brief = moonOnly) => validateYouTransitReadingDraft({
  brief, expectedHeadline: 'Your week, in depth',
  draft: { headline: 'Your week, in depth', summary: 'Honest conversations may help this week.', body },
});
const personal = (left: string, aspect: string, right: string) => ({
  id: `${left}-${aspect}-${right}`, title: `${left} ${aspect} ${right}`,
  durationLabel: 'Today', rangeLabel: '', timingLabel: '',
  summary: 'A direct conversation may help them clarify the plan.', orb: '1', detailAvailable: true,
  evidence: { transitPlanet: left, aspect, natalPoint: right, natalSign: 'Scorpio', natalHouse: 6, timingBonuses: [], contentKeys: ['synthetic'] }
});
const friend: FriendTransitReadingBrief = {
  schema: 'tldr.friend-transits-brief.v1', friendName: 'Example', dateLabel: 'Synthetic day',
  primaryThemes: [personal('Mars', 'conjunction', 'Moon'), personal('Sun', 'sextile', 'Saturn')],
  longerCycles: [], relationshipActivations: [], houseContext: [], daily: null,
  activePatterns: [], hasAnyTransit: true, counts: {}
};
const friendCheck = (body: string) => validateFriendTransitReadingDraft({
  brief: friend, expectedHeadline: 'Example report',
  draft: { headline: 'Example report', summary: 'Their conversation can help clarify the plan.', body }
});

for (const body of [
  'Avoiding the conversation can have the opposite of the intended effect.',
  'Trying the opposite approach can help.',
  'They are back to square one.',
  'They can square away the paperwork.',
  'They can work in conjunction with the team.',
  'They spoke in opposition to the proposal.',
  'The Moon in Scorpio supports honesty, but avoiding the subject has the opposite effect.'
]) {
  test(`ordinary language is not an aspect: ${body}`, () => {
    assert.equal(youCheck(body).passed, true);
    // Friends may not mention the Moon's sign without transitSign evidence.
    if (!body.includes('in Scorpio')) assert.equal(friendCheck(body).passed, true);
  });
}
for (const body of ['The Moon opposes Saturn.', 'The opposition is exact.', 'The Moon is opposite of Saturn.', 'The trine supports a conversation.']) {
  test(`unsupported technical astrology still fails: ${body}`, () => {
    assert.equal(youCheck(body).passed, false);
  });
}
const pairedYou: YouTransitReadingBrief = {
  ...moonOnly, window: 'day', periodEnd: moonOnly.targetDate,
  technicalEvidence: { qualifyingTransits: [
    { transitPlanet: 'Mars', aspect: 'conjunction', natalPoint: 'Moon' },
    { transitPlanet: 'Sun', aspect: 'sextile', natalPoint: 'Saturn' }
  ] }
};
for (const body of ['Mars conjunct their Moon.', 'Mars is in a conjunction with their Moon.', 'The conjunction between Mars and their Moon.', 'Mars and their Moon are conjunct.']) {
  test(`supported whole claim passes both validators: ${body}`, () => {
    assert.equal(youCheck(body, pairedYou).passed, true);
    assert.equal(friendCheck(body).passed, true);
  });
}
for (const body of ['Mars sextiles their Moon.', 'Mars is in a sextile with their Moon.', 'The sextile between Mars and their Moon.', 'Mars and their Moon form a sextile.']) {
  test(`allowed words in the wrong relationship still fail: ${body}`, () => {
    assert.ok(youCheck(body, pairedYou).issues.some(issue => issue.code === 'untraceable_transit_claim'));
    assert.ok(friendCheck(body).issues.some(issue => issue.code === 'untraceable_transit_claim'));
  });
}
test('Moon-driver and explicit approved-source identities remain supported', () => {
  assert.ok(transitAspectKeysFromEvidence({ moonDriver: { aspect: 'trine', natalPoint: 'Jupiter' } }).has('moon|trine|jupiter'));
  assert.ok(transitAspectKeysFromEvidence({ body: 'The Sun is in a trine with your Jupiter.' }).has('sun|trine|jupiter'));
  assert.equal(extractTransitAspectClaims('the opposite of the intended effect').length, 0);
});
test('unknown signs, houses and dates remain rejected', () => {
  for (const body of ['The Moon in Aries.', 'Your 10th house.', 'On December 25, the conversation changes.']) {
    assert.equal(youCheck(body).passed, false);
  }
});
test('Friends still rejects second person outside supplied relationship context', () => {
  assert.ok(friendCheck('Your conversation may help.').issues.some(issue => issue.code === 'second_person'));
});
test('reader projection contains one TLDR and excludes metadata', () => {
  const input = { headline: 'Example', tldr: 'One visible summary.', summary: 'One visible summary.', body: 'A distinct body.',
    model: 'whether', responseId: 'schema', action: '', timing: '', sections: [] };
  assert.deepEqual(transitReadingReaderCopy(input), { headline: input.headline, summary: input.summary, body: input.body });
  assert.equal(transitReadingReaderText(input).split(input.summary).length - 1, 1);
  assert.ok(!transitReadingReaderText(input).includes('whether'));
});
test('one displayed negation pivot is counted once, two displayed pivots still fail', () => {
  const input = { headline: 'Example', tldr: 'The answer is not a refusal. It is a request for more time.',
    summary: 'The answer is not a refusal. It is a request for more time.', body: 'They can explain the timing clearly.' };
  const plan = { validationProfile: 'shared-only', family: 'you-transit-reading', register: 'second_person' };
  assert.ok(validateCopy(input, plan).violations.some((v: any) => v.category.includes('negation')),
    'The old whole-object call must reproduce the false duplicate count.');
  assert.ok(!validateCopy(transitReadingReaderCopy(input), plan).violations.some((v: any) => v.category.includes('negation')));
  const two = { ...input, body: 'This is not the final decision. It is an invitation to discuss the timing.' };
  assert.ok(validateCopy(transitReadingReaderCopy(two), plan).violations.some((v: any) => v.category.includes('negation')));
});
for (const task of ['revision', 'cleanup'] as const) {
  test(`${task} uses approved reader evidence plus the diagnosed draft, not raw technical fields or initial drafting instructions`, () => {
    const brief = structuredClone(pairedYou);
    const before = JSON.stringify(brief);
    const prompt = transitReadingRevisionPrompt({ brief, headline: 'Example', surface: 'you', task,
      feedback: 'Rejected synthetic draft; exact finding.', minSummaryLength: 40, minBodyLength: 180, maxBodyLength: 2200 });
    assert.equal(JSON.stringify(brief), before);
    const governedSection = prompt.split('WRITER-SAFE GOVERNED BRIEF (approved reader evidence only)')[1]?.split('DRAFT AND FINDINGS TO ADDRESS')[0] ?? '';
    assert.ok(governedSection.includes('"approvedReaderText"'));
    assert.ok(!governedSection.includes('"qualifyingTransits"'));
    assert.ok(prompt.includes('Rejected synthetic draft; exact finding.'));
    assert.ok(prompt.includes('Retain unaffected wording'));
    assert.ok(prompt.includes('one visible TLDR'));
    assert.doesNotMatch(prompt, /Write one in-depth|3-5 natural paragraphs|220-380 words/);
  });
}
test('judge, both validation adapters, persistence and reader agree on the canonical fields', () => {
  const judge = fs.readFileSync('api/_lib/transit-reading-judge.ts', 'utf8');
  assert.match(judge, /JSON\.stringify\(transitReadingReaderCopy\(input\.draft\)/);
  assert.doesNotMatch(judge, /tldr:\s*input\.draft\.tldr/);
  for (const family of ['you', 'friend']) {
    const source = fs.readFileSync(`api/_lib/${family}-transit-reading-generation.ts`, 'utf8');
    assert.match(source, /validateCopy\(readerCopy,/);
    assert.match(source, /draft: readerCopy/);
    assert.match(source, /\.\.\.transitReadingReaderCopy\(input\.generated\)/);
  }
  const reader = fs.readFileSync('apps/web/src/components/reports/ReportLibraryView.tsx', 'utf8');
  assert.match(reader, /article-tldr__copy">\{report\.summary\}/);
  assert.doesNotMatch(reader, /\{report\.tldr\}/);
});
