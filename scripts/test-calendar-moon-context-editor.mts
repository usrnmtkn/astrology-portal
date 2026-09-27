import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rmSync } from 'node:fs';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { calendarMoonContextRecords } from '../api/_lib/calendar-moon-context-sources';
import { calculateCalendarPreview } from '../apps/admin/src/calendarPreviewCalculation';
import { calendarMoonCycleFactsForDays } from '../apps/web/src/features/calendar/calendarMoonCycle';
import { calendarMoonWriteupForDay } from '../apps/admin/src/calendarPreviewModel';
import { calendarMoonPhaseCopy } from '../apps/web/src/features/calendar/calendarMoonPhaseCopy';
import { lunarContentIdentity } from '../apps/admin/src/lunarCalendarContent';
import SwissEph from 'swisseph-wasm';
import revisions from '../apps/web/src/features/calendar/calendarMoonCopyRevisions.json';
import { calendarMoonEventHref } from '../apps/web/src/features/calendar/CalendarMoonProse';

// Actual handlers and actual reader adapter; storage and published prose are synthetic.
const calculation = await calculateCalendarPreview('weekly-sky', '2026-09-27T16:00:00Z', 'America/New_York');
const facts = calendarMoonCycleFactsForDays(calculation.days, [...calculation.events, ...(calculation.cycleEvents ?? [])], calculation.timeZone);
const swe = new SwissEph();
await swe.initSwissEph();
for (const result of [calculation, await calculateCalendarPreview('weekly-sky', '2027-01-12T16:00:00Z', 'Asia/Tokyo')]) {
  const surrounding = calendarMoonCycleFactsForDays(result.days, [...result.events, ...(result.cycleEvents ?? [])], result.timeZone);
  for (const day of result.days) {
    const context = surrounding.get(day.dateKey)!;
    assert(context.previousLunationDate && context.nextLunationDate && context.previousLunationUrl && context.nextLunationUrl,
      `Both surrounding lunations must be available outside the visible week: ${day.dateKey}`);
  }
  for (const event of result.cycleEvents!.filter(event => event.type === 'lunation')) {
    const instant = new Date(event.startsAt);
    const jd = swe.julday(instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(),
      instant.getUTCHours() + instant.getUTCMinutes() / 60 + instant.getUTCSeconds() / 3600);
    const angle = (swe.calc_ut(jd, swe.SE_MOON, swe.SEFLG_SWIEPH)[0] - swe.calc_ut(jd, swe.SE_SUN, swe.SEFLG_SWIEPH)[0] + 360) % 360;
    const target = /new moon|solar eclipse/i.test(event.title) ? 0
      : /first quarter/i.test(event.title) ? 90 : /last quarter/i.test(event.title) ? 270 : 180;
    assert(Math.min(Math.abs(angle - target), 360 - Math.abs(angle - target)) < .02, event.id);
  }
}
assert.equal(calendarMoonEventHref('javascript:alert(1)'), null);
assert.equal(calendarMoonEventHref('https://example.com/#calendar?view=day&date=2026-09-26&event=x'), null);
assert.equal(calendarMoonEventHref('#calendar?view=day&date=2026-09-26'), null);
const store = await createApiStore([]);
const bundle = join(tmpdir(), `calendar-context-reader-${process.pid}.mjs`);
await build({ stdin: { contents: `export { loadLiveGeneratedContentForKeys } from './apps/web/src/services/generatedContent.ts'; export { calendarMoonResolvedByDate } from './apps/web/src/features/calendar/LunarCalendar.tsx';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, outfile: bundle, platform: 'node', format: 'esm', define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://calendar-api.invalid', VITE_SUPABASE_ANON_KEY: 'calendar-api-fixture-key' }) }, loader: { '.css': 'empty' }, logLevel: 'silent' });
const reader = await import(pathToFileURL(bundle).href);
const oldPublishedBodies = new Map(revisions.map(row => [row.contentKey, { body: row.originalBody }]));
const currentWeek = reader.calendarMoonResolvedByDate(calculation.days, facts, oldPublishedBodies);
for (const [date, result] of currentWeek) {
  for (const revision of revisions) assert(!result.body.includes(revision.originalBody), `${date} resurrected rejected copy: ${revision.contentKey}`);
  assert(!result.body.includes('{{'), `${date} exposed a missing fact`);
}
assert(currentWeek.get('2026-10-03')!.body.includes('New Moon in Libra on October 10'));
const inventory = (params: Record<string, string>) => store.invoke('GET', undefined, `/api/admin/generated-content-inventory?${new URLSearchParams(params)}`);
try {
  for (const [prefix, count] of [['authored/calendar-moon-context/', 9], ['authored/calendar-moon-continuation-summary/', 12]] as const) {
    const list = await inventory({ contentKeyPrefix: prefix, visibility: 'all' });
    assert.equal(list.status, 200);
    assert.equal(list.payload.rows.length, count);
    assert(list.payload.rows.every(row => row.inventory_only && !row.body));
  }
  assert.equal(store.rows.size, 0);
  for (const record of calendarMoonContextRecords) {
    assert(lunarContentIdentity(record.contentKey));
    const detail = await inventory({ contentKey: record.contentKey });
    assert.equal(detail.payload.rows[0].body, record.body);
    const body = `Synthetic complete opening. Source ${record.contentKey}. Previous event: {{previousLunationSign}}, {{previousLunationDate}}. [Open event]({{previousLunationUrl}}). Synthetic complete ending.`;
    const saved = await store.invoke('POST', { contentKey: record.contentKey, surface: 'sky', mode: 'in_depth', status: 'DRAFT', lane: 'reference',
      headline: record.headline, summary: '', body, eventType: 'fallback-hook', blockType: 'fallback_hook', promptVersion: 'manual-admin', model: 'manual', provider: 'tldrastro-fallback-architecture-v3',
      sections: { packageRecord: record, packageOriginalRecord: record, packageDraft: { body } }, facts: { fallbackArchitectureV3: true },
      sourceSnapshot: { sourcePackage: record.source_package, content_role: 'full_copy', review_status: 'needs_review' } });
    assert.equal(saved.status, 200, JSON.stringify(saved.payload));
    const draft = saved.payload.rows[0];
    assert.equal((await reader.loadLiveGeneratedContentForKeys([record.contentKey])).has(record.contentKey), false);
    const invalid = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at,
      sections: { ...draft.sections, packageDraft: { body: 'Synthetic {{inventedCalendarFact}}.' } } });
    assert.equal(invalid.status, 400, 'Unknown variables cannot be approved or saved as a Calendar fact.');
    const published = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' });
    assert.equal(published.status, 200, JSON.stringify(published.payload));
    assert.equal(published.payload.rows[0].body, body);
    assert.equal((await inventory({ contentKey: record.contentKey })).payload.rows.length, 1);
    assert.equal((await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, body: 'Obsolete' })).status, 409);
  }
  const keys = calendarMoonContextRecords.map(record => record.contentKey);
  const generated = await reader.loadLiveGeneratedContentForKeys(keys);
  assert(keys.every(key => generated.has(key)), 'Every published Calendar source reaches the reader.');
  const resolved = reader.calendarMoonResolvedByDate(calculation.days, facts, generated);
  for (const date of ['2026-09-27', '2026-09-29', '2026-10-01', '2026-10-03']) {
    const day = calculation.days.find(day => day.dateKey === date)!;
    const rendered = resolved.get(date);
    assert(rendered.body.includes('Synthetic complete opening.'), date);
    assert(rendered.body.includes('Synthetic complete ending.'), date);
    assert(!rendered.body.includes('{{'), date);
    assert(rendered.body.includes('September 26'), date);
    assert(rendered.body.includes('Aries'), date);
    const preview = calendarMoonWriteupForDay([...store.rows.values()], day, facts.get(date));
    assert.equal(preview?.body, rendered.body, 'Studio previews the same complete composition as Day and Week.');
    assert.equal(preview?.parts?.map(part => part.text).join(''), rendered.body);
    if (rendered.contextSource) assert(preview?.parts?.some(part => part.sourceKey === rendered.contextSource.contentKey));
  }
  const fullMoonLink = new URLSearchParams(facts.get('2026-09-29')!.previousLunationUrl!.split('?')[1]);
  assert.equal(fullMoonLink.get('date'), '2026-09-26');
  assert.equal(fullMoonLink.get('timeZone'), calculation.timeZone);
  assert([...calculation.events, ...(calculation.cycleEvents ?? [])].some(event => event.id === fullMoonLink.get('event')));
  const arbitraryApprovedRevision = 'Synthetic phase opening. Synthetic phase ending.';
  const quarterFacts = { ...facts.get('2026-10-03')!, exactFirstQuarter: true, exactLastQuarter: false };
  assert.equal(calendarMoonPhaseCopy(quarterFacts, () => arbitraryApprovedRevision)?.body, arbitraryApprovedRevision);
  const crescentFacts = { ...quarterFacts, exactFirstQuarter: false, moonPhase: 'Waxing Crescent', previousLunationType: 'new-moon' as const };
  assert.equal(calendarMoonPhaseCopy(crescentFacts, () => arbitraryApprovedRevision)?.body, arbitraryApprovedRevision);
  assert.equal(calendarMoonPhaseCopy(quarterFacts, () => 'Synthetic {{previousLunationSign}} on {{previousLunationDate}}.')?.body,
    `Synthetic ${quarterFacts.previousLunationSign} on ${quarterFacts.previousLunationDate}.`);
  assert.equal((await store.invoke('GET', undefined, '/api/admin/generated-content-inventory?contentKeyPrefix=authored/calendar-moon-context/', 'invalid')).status, 401);
  console.log('PASS: 23 Calendar sources browse, save, publish and reach the reader; complete Studio/reader parity, 11 rejected passages excluded, calculated event links and two-zone direct Swiss checks.');
} finally { rmSync(bundle, { force: true }); store.close(); }
