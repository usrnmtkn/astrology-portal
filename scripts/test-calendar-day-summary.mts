import assert from 'node:assert/strict';
import { calendarSunSummary, calendarSkyForDay } from '../apps/web/src/features/calendar/calendarDaySummary.ts';
import { skyDailySummaryParts } from '../apps/web/src/content/skyDailySummary.ts';
import type { SkySnapshot } from '../apps/web/src/types.ts';

const location = { label: 'Test location', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' };
const sky = { location, generatedAt: '2026-09-12T16:00:00Z', positions: [
  { planet: 'Sun', sign: 'Virgo', degree: 19.8, motion: 'direct' },
  { planet: 'Moon', sign: 'Libra', degree: 8.8, motion: 'direct' }
] } as unknown as SkySnapshot;
const text = (parts: Array<{ text: string }>) => parts.map(part => part.text).join('');
const result = calendarSunSummary(sky);
assert.equal(result.find(part => part.action === 'sun')?.text, 'Sun in Virgo at 19°');
assert.equal(result.filter(part => part.action === 'moon').length, 0);
assert.equal(text(result), text(skyDailySummaryParts({ sun: sky.positions[0], moonIsVoid: false })));
assert.equal(calendarSkyForDay(sky, '2026-09-13', location), null);
assert.equal(calendarSkyForDay(sky, '2026-09-12', { ...location, longitude: 1 }), null);
assert.equal(calendarSkyForDay(sky, '2026-09-12', location), sky);
assert.deepEqual(calendarSunSummary(null), []);
assert.deepEqual(calendarSunSummary({ ...sky, positions: [] }), []);
// Missing copy keeps the same factual fallback and punctuation as Sky.
const missingCopy = { ...sky, positions: [{ ...sky.positions[0], sign: 'Unconfigured' }] };
assert.equal(text(calendarSunSummary(missingCopy)), text(skyDailySummaryParts({ sun: missingCopy.positions[0], moonIsVoid: false })));
// The full layout can change without adding extra sections to Calendar's Sun introduction.
const layoutKey = 'cms/sky-daily-summary/assembly/layout';
const layout = new Map([[layoutKey, { body: '{openingSentence}\n\nAdditional layout text.', status: 'LIVE' } as any]]);
assert.equal(text(calendarSunSummary(sky, layout)), text(result));
// Both surfaces reuse one Sun source; unpublished drafts affect neither.
const key = 'cms/sky-daily-summary/sun/virgo';
const edited = new Map([[key, { body: 'shows the shared published Sun fixture', status: 'LIVE' } as any]]);
assert.equal(text(calendarSunSummary(sky, edited)), 'The Sun in Virgo at 19° shows the shared published Sun fixture.');
assert.equal(text(calendarSunSummary(sky, edited)), text(skyDailySummaryParts({ sun: sky.positions[0], moonIsVoid: false }, edited)));
assert.equal(text(calendarSunSummary(sky, new Map([[key, { ...edited.get(key), status: 'DRAFT' } as any]]))), text(result));
console.log('Calendar Sun introduction: shared complete source, calculated degree link, snapshot validation, missing data, layout isolation and draft gating passed.');
