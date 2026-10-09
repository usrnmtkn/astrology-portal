import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rmSync } from 'node:fs';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { calendarTransitionPhraseRecords as records, calendarTransitionPhraseRecordForKey } from '../api/_lib/calendar-transition-phrase-sources';
import { lunarContentIdentity } from '../apps/admin/src/lunarCalendarContent';
import { calendarMoonCycleFactsForDays } from '../apps/web/src/features/calendar/calendarMoonCycle';
import { resolveCalendarMoonFallback } from '../apps/web/src/features/calendar/calendarMoonFallback';
import { calendarMoonWritingParagraphs } from '../apps/web/src/features/calendar/calendarDayMoonReading';
import { calendarMoonWriteupForDay } from '../apps/admin/src/calendarPreviewModel';
import { calendarMoonContextKey, calendarMoonContextPhrases } from '../apps/web/src/features/calendar/calendarTransitionPhrases';
import { calendarWritingStudioHref } from '../apps/web/src/features/calendar/calendarWritingStudio';

const store = await createApiStore([]);
const bundle = join(tmpdir(), `transition-phrase-reader-${process.pid}.mjs`);
await build({ stdin: { contents: `export { loadLiveGeneratedContentForKeys } from './apps/web/src/services/generatedContent.ts';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, outfile: bundle, platform: 'node', format: 'esm', define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://calendar-api.invalid', VITE_SUPABASE_ANON_KEY: 'calendar-api-fixture-key' }) }, loader: { '.css': 'empty' }, logLevel: 'silent' });
const { contentLiveStatuses } = await import('../api/_lib/content-live-status');
const reader = await import(pathToFileURL(bundle).href);
const inventory = (params: URLSearchParams) => store.invoke('GET', undefined, `/api/admin/generated-content-inventory?${params}`);
try {
  const list = await inventory(new URLSearchParams({ contentKeyPrefix: 'authored/calendar-moon-context/', status: 'all', visibility: 'all' }));
  assert.equal(list.status, 200);
  assert.equal(list.payload.rows.length, 13);
  assert.ok(list.payload.rows.every(row => row.inventory_only && !row.body));
  assert.equal(store.rows.size, 0, 'Browsing never saves a row.');
  for (const record of records) {
    const key = record.contentKey;
    assert.equal(lunarContentIdentity(key)?.title, record.headline);
    assert.equal(new URLSearchParams(new URL(calendarWritingStudioHref(key)).hash.split('?')[1]).get('view'), 'moon-transition-phrases');
    assert.equal(record.calendarWritingSource.bodySha256, createHash('sha256').update(record.body).digest('hex'));
    const detail = await inventory(new URLSearchParams({ contentKey: key }));
    assert.equal(detail.payload.rows[0].body, record.body);
    const body = 'Synthetic phrase opening preserved in full.\n\nSynthetic phrase final sentence.';
    const saved = await store.invoke('POST', { contentKey: key, surface: 'sky', mode: 'in_depth', status: 'DRAFT', lane: 'reference',
      headline: record.headline, summary: '', body, eventType: 'fallback-hook', blockType: 'fallback_hook', promptVersion: 'manual-admin', model: 'manual', provider: 'tldrastro-fallback-architecture-v3',
      sections: { packageRecord: record, packageOriginalRecord: record, packageDraft: { body } },
      facts: { fallbackArchitectureV3: true }, sourceSnapshot: { sourcePackage: record.source_package, content_role: 'full_copy', review_status: 'needs_review' } });
    assert.equal(saved.status, 200, JSON.stringify(saved.payload));
    const draft = saved.payload.rows[0];
    assert.equal((await inventory(new URLSearchParams({ contentKey: key }))).payload.rows.length, 1, 'Saved row replaces the starter.');
    assert.equal((await reader.loadLiveGeneratedContentForKeys([key])).has(key), false, 'Drafts cannot reach readers.');
    const published = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' });
    assert.equal(published.status, 200, JSON.stringify(published.payload));
    const row = published.payload.rows[0];
    assert.equal(row.body, body);
    assert.equal(row.status, 'LIVE');
    assert.equal(contentLiveStatuses([row], [row])[0].live, true);
    const generated = await reader.loadLiveGeneratedContentForKeys([key]);
    assert.equal(generated.get(key)?.body, body);
    assert.equal((await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: draft.updated_at, body: 'Obsolete revision' })).status, 409);
    assert.equal(store.rows.get(row.id).body, body);
    const revision = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, sections: { ...row.sections, packageDraft: { body: body + '\n\nSynthetic second revision.' } }, reviewStatus: 'needs_review' });
    assert.equal(revision.status, 200, JSON.stringify(revision.payload));
    const readBack = await inventory(new URLSearchParams({ contentKey: key }));
    assert.equal(readBack.payload.rows.length, 1, 'One editable source per phrase after editing a publication.');
  }
  assert.equal(calendarTransitionPhraseRecordForKey('authored/calendar-moon-context/unknown'), null);
  const denied = await store.invoke('GET', undefined, '/api/admin/generated-content-inventory?contentKeyPrefix=authored/calendar-moon-context/', 'invalid');
  assert.equal(denied.status, 401);
  console.log(`PASS: all ${records.length} transition phrase sources browse, open, save, publish, reach the actual published-content loader, and reject stale/unauthorized requests.`);
} finally { rmSync(bundle, { force: true }); store.close(); }

// Exercise the real assembly used by both reader views and the Studio preview.
const day = { date: '2026-09-27T16:00:00Z', dateKey: '2026-09-27', inMonth: true, moonSign: 'Aries', moonSignGlyph: '♈', moonPhase: 'Waning Gibbous', illumination: 99, activeAspects: [], events: [] };
const base = { ...calendarMoonCycleFactsForDays([day], [], 'America/New_York').get(day.dateKey)!, isLastFullDayInMoonSign: true, nextMoonSign: 'Taurus', daysSincePreviousLunation: null, previousLunationType: null, daysUntilSeasonEnd: null, daysUntilNextLunation: null, daysSincePreviousEclipse: null };
const cases = [
  ['dayAfterEclipse', { daysSincePreviousEclipse: 1 }, 'The eclipse was yesterday.'],
  ['afterEclipse', { daysSincePreviousEclipse: 3 }, 'The eclipse was three days ago.'],
  ['dayAfterNewMoon', { daysSincePreviousLunation: 1, previousLunationType: 'new-moon' }, 'The New Moon was yesterday.'],
  ['dayAfterFullMoon', { daysSincePreviousLunation: 1, previousLunationType: 'full-moon' }, 'The Full Moon was yesterday.'],
  ['afterNewMoon', { daysSincePreviousLunation: 2, previousLunationType: 'new-moon' }, 'The New Moon was two days ago.'],
  ['afterFullMoon', { daysSincePreviousLunation: 3, previousLunationType: 'full-moon' }, 'The Full Moon was three days ago.'],
  ['eclipseTomorrow', { daysUntilNextEclipse: 1, nextEclipseType: 'lunar eclipse', nextEclipseSign: 'Pisces' }, 'The lunar eclipse in Pisces arrives tomorrow.'],
  ['newMoonTomorrow', { daysUntilNextLunation: 1, nextLunationType: 'new-moon', nextLunationSign: 'Libra' }, 'The New Moon in Libra arrives tomorrow.'],
  ['fullMoonTomorrow', { daysUntilNextLunation: 1, nextLunationType: 'full-moon', nextLunationSign: 'Aries' }, 'The Full Moon in Aries arrives tomorrow.'],
  ['lastFullDayOfSeason', { daysUntilSeasonEnd: 1, seasonName: 'Libra', nextSunSign: '' }, 'This is the last full day of Libra season.'],
  ['lastFullWeekendOfSeason', { isLastFullWeekendOfSeason: true, seasonName: 'Libra', nextSunSign: '' }, 'This is the last full weekend of Libra season.'],
  ['finalDaysOfSeason', { daysUntilSeasonEnd: 3, seasonName: 'Libra', nextSunSign: '' }, 'Libra season is in its final days.'],
  ['lateIngress', { moonChangesSignToday: true, nextMoonSign: 'Taurus', nextMoonSignEntryTime: '10:40 PM EDT', moonSignExitHour: 22 }, 'The Moon stays in Aries for most of today and enters Taurus at 10:40 PM EDT.'],
] as const;
for (const [kind, facts, timing] of cases) {
  const key = calendarMoonContextKey(kind);
  const replacement = `Synthetic ${kind} opening. Synthetic final sentence.`;
  const options = { transitionPhrase: (requested: string) => requested === key ? replacement : undefined };
  const context = { ...base, ...facts } as Parameters<typeof resolveCalendarMoonFallback>[0];
  const original = resolveCalendarMoonFallback(context)!;
  const revised = resolveCalendarMoonFallback(context, options)!;
  assert.ok(original.body.includes(calendarMoonContextPhrases[kind].body), kind);
  assert.equal(revised.body, original.body.replace(calendarMoonContextPhrases[kind].body, replacement), kind);
  const lunarContext = !kind.includes('Season');
  if (lunarContext) {
    assert.ok(!original.body.includes(timing), 'No uneditable lunar lead-in in bundled copy: ' + kind);
    assert.ok(!revised.body.includes(timing), 'No uneditable lunar lead-in in saved copy: ' + kind);
    assert.equal(revised.body.slice(revised.body.indexOf(replacement)), replacement, 'Saved context is the complete suffix: ' + kind);
  } else {
    assert.ok(revised.body.includes(timing), 'Other calculated timing survives: ' + kind);
  }
  const row = { id: 'runtime-' + kind, content_key: key, status: 'LIVE', lane: 'serving', body: replacement, surface: 'sky', mode: 'in_depth', review_state: null };
  assert.equal(calendarMoonWriteupForDay([row], day, context)?.body, revised.body, 'Preview and reader agree: ' + kind);
  assert.equal(calendarMoonWriteupForDay([{ ...row, status: 'DRAFT' }], day, context)?.body, original.body, 'Drafts stay private: ' + kind);
}
const fullMoonFacts = { ...base, daysSincePreviousLunation: 1, previousLunationType: 'full-moon' } as Parameters<typeof resolveCalendarMoonFallback>[0];
for (const sign of ['Aries', 'Taurus']) {
  const context = { ...fullMoonFacts, moonSign: sign };
  const record = records.find(row => row.contentKey === `authored/calendar-moon-continuation-summary/${sign.toLowerCase()}`)!;
  const replacement = `Synthetic ${sign} continuation.`;
  const original = resolveCalendarMoonFallback(context)!;
  assert.equal(resolveCalendarMoonFallback(context, { moonContinuationSummary: replacement })!.body, original.body.replace(record.body, replacement));
}
const firstQuarter = { ...base, moonSign: 'Sagittarius', nextMoonSign: 'Capricorn', exactFirstQuarter: true } as Parameters<typeof resolveCalendarMoonFallback>[0];
assert.ok(resolveCalendarMoonFallback(firstQuarter, { transitionPhrase: key => key.endsWith('/sagittarius/first-quarter') ? 'Synthetic First Quarter continuation.' : undefined })!.body.includes('Synthetic First Quarter continuation.'));
const explicitlySavedTiming = 'The Full Moon was yesterday. Synthetic owner-selected ending.';
assert.ok(resolveCalendarMoonFallback(fullMoonFacts, { transitionPhrase: key => key === calendarMoonContextKey('dayAfterFullMoon') ? explicitlySavedTiming : undefined })!.body.endsWith(explicitlySavedTiming), 'An editable phrase may still contain timing wording chosen by the owner.');
console.log('PASS: ten lunar contexts serve editable wording without extra timing sentences; all 13 routes respect draft visibility and match the Studio preview.');

// An ingress passage is already introduced by the Calendar event row. Test
// every timing boundary, including the separate late-night context selection.
for (const hour of [0, 5, 6, 10, 11, 14, 15, 19, 20, 23]) {
  const context = { ...base, moonSign: 'Virgo', nextMoonSign: 'Libra', moonChangesSignToday: true,
    moonSignExitHour: hour, nextMoonSignEntryTime: '4:10 AM EDT' };
  const passage = 'Once the Moon enters Libra, this synthetic passage begins.\n\nIts complete final sentence stays intact.';
  const late = 'Synthetic late-night context begins.\n\nIts complete late-night ending stays intact.';
  const timing = 'Synthetic timing wrapper for {{nextMoonSign}} at {{nextMoonSignEntryTime}}.';
  const options = { pairTransition: passage, transitionPhrase: (key: string) =>
    key === calendarMoonContextKey('lateIngress') ? late : key.startsWith('authored/calendar-timing/') ? timing : undefined };
  const result = resolveCalendarMoonFallback(context, options)!;
  assert.equal(result.body, hour < 20 ? passage : late, `Complete selected ingress copy at hour ${hour}`);
  assert.deepEqual(calendarMoonWritingParagraphs([{ ...result, role: 'leftover' }], 1), result.body.split('\n\n'));
  const rows = [
    { content_key: 'authored/calendar-moon-transition/virgo/libra', body: passage },
    { content_key: calendarMoonContextKey('lateIngress'), body: late },
  ].map((row, index) => ({ ...row, id: `ingress-${index}`, status: 'LIVE', lane: 'serving', surface: 'sky', mode: 'in_depth', review_state: null }));
  assert.equal(calendarMoonWriteupForDay(rows, day, context)?.body, result.body, `Studio matches at hour ${hour}`);
}
const unknownPair = { ...base, moonSign: 'Unknown', nextMoonSign: 'Unknown', moonChangesSignToday: true,
  moonSignExitHour: 4, nextMoonSignEntryTime: '4:10 AM EDT' };
assert.match(resolveCalendarMoonFallback(unknownPair)!.body, /4:10 AM EDT/, 'No passage still retains calculated timing');
assert.equal(resolveCalendarMoonFallback({ ...unknownPair, moonChangesSignToday: false })?.kind, 'lastFullDayInMoonSign');
console.log('PASS: ingress readings preserve complete source copy without duplicate timing wrappers in Day, Week, and Studio.');

assert.deepEqual(calendarMoonWritingParagraphs([{ role: 'leftover', contentKey: 'generated/calendar-moon-fallback/lastFullDayInMoonSign/2026-09-27', body: 'Synthetic opening.\n\nSynthetic ending.' }], 1), ['Synthetic opening.', 'Synthetic ending.']);
assert.deepEqual(calendarMoonWritingParagraphs([{ role: 'lunation', contentKey: 'authored/sky-lunation-macro/full-moon/aries', body: 'Article preview.\n\nFull article continues.' }], 1), ['Article preview.']);
console.log('PASS: Week preserves complete transition phrases while keeping lunation articles as previews.');
