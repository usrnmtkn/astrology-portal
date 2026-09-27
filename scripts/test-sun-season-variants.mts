import assert from 'node:assert/strict';
import { skyDailySummaryParts } from '../apps/web/src/content/skyDailySummary.ts';
import { skyDailySummaryFields, skySummarySigns, skySummaryTemplateErrors } from '../apps/web/src/content/skyDailySummaryCatalog.ts';
import { sunSeasonKey, sunSeasonRuler, sunSeasonHasRetrograde } from '../apps/web/src/content/skySunSeason.ts';
import { calendarSunSummary } from '../apps/web/src/features/calendar/calendarDaySummary.ts';
import { buildSkySummaryComposition } from '../apps/admin/src/skySummaryComposition.ts';
import { calendarPreviewValues } from '../apps/admin/src/calendarPreviewModel.ts';
import { skySummarySourceKeys, missingPublishedSkySummaryKeys } from '../apps/web/src/features/sky/skySummarySources.ts';
import { installContentPublications } from '../apps/web/src/content/contentPublicationState.ts';
const body = 'With the {sunPlacement}, this is the standard fixture. Its final sentence stays complete.';
const rxBody = 'The {sunPlacement} starts the retrograde fixture. {rulerName} is retrograde. Its final sentence stays complete.';
const row = (key: string, body: string, status = 'LIVE') => ({ id: key, updatedAt: '2026-09-26T12:00:00Z', body, status, contentKey: key } as any);
const text = (parts: ReturnType<typeof skyDailySummaryParts>) => parts.map(part => part.text).join('');
assert.equal(skyDailySummaryFields.filter(field => field.key.endsWith('/ruler-retrograde')).length, 10);
for (const sign of skySummarySigns) {
  const key = sunSeasonKey(sign), rxKey = sunSeasonKey(sign, true), ruler = sunSeasonRuler(sign);
  const content = new Map([[key, row(key, body)], [rxKey, row(rxKey, rxBody)]]);
  const facts = { sun: { sign, degree: 1.9 }, moonIsVoid: false, retrogradePlanets: [ruler] };
  const expectedRx = sunSeasonHasRetrograde(sign);
  for (const retrogradePlanets of [[], [ruler], []]) {
    const parts = skyDailySummaryParts({ ...facts, retrogradePlanets }, content, { openingOnly: true });
    const rx = expectedRx && retrogradePlanets.length > 0;
    assert.match(text(parts), rx ? /starts the retrograde fixture/ : /this is the standard fixture/);
    assert.ok(text(parts).endsWith('Its final sentence stays complete.'));
    assert.equal(parts.filter(part => part.action === 'sun').length, 1);
    assert.equal(parts.find(part => part.action === 'sun')?.text, `Sun in ${sign} at 1°`);
    assert.equal(parts.find(part => part.sourceKey)?.sourceKey, rx ? rxKey : key);
    assert.doesNotMatch(text(parts), /[{}]|The With|\.\./);
    const sky = { generatedAt: '2026-09-26T12:00:00Z', location: { timeZone: 'America/New_York' }, positions: [
      { planet: 'Sun', ...facts.sun }, { planet: ruler, sign: 'Aries', motion: retrogradePlanets.length ? 'retrograde' : 'direct' }
    ] } as any;
    assert.equal(text(calendarSunSummary(sky, content, [])), text(parts));
  }
  const keys = skySummarySourceKeys(facts, []);
  assert.equal(keys.includes(rxKey), expectedRx);
  for (const status of ['DRAFT', 'REVIEWED', 'ARCHIVED']) {
    content.set(rxKey, row(rxKey, rxBody, status));
    assert.match(text(skyDailySummaryParts(facts, content)), /this is the standard fixture/);
  }
  content.delete(rxKey);
  assert.match(text(skyDailySummaryParts(facts, content)), /this is the standard fixture/);
  assert.deepEqual(skySummaryTemplateErrors(key, body), []);
  if (expectedRx) {
    assert.deepEqual(skySummaryTemplateErrors(rxKey, rxBody), []);
    assert.ok(skySummaryTemplateErrors(rxKey, 'Missing placement.').length);
  } else assert.ok(skySummaryTemplateErrors(rxKey, rxBody).length);
}
for (const invalid of ['{sunPlacement} {sunPlacement}', '{{sunPlacement}}', '{degree}', '{rulerName}']) {
  assert.ok(skySummaryTemplateErrors(sunSeasonKey('Libra'), invalid).length);
}
const key = sunSeasonKey('Libra'), rxKey = sunSeasonKey('Libra', true);
const rows = [key, rxKey].map((content_key, i) => ({ id: content_key, content_key, body: i ? rxBody : body, status: 'LIVE', lane: 'serving', review_state: null, source_snapshot: { contentSystem: 'cms-surface-override', contentType: 'mustache-template', allowedSlots: i ? ['sunPlacement', 'rulerName'] : ['sunPlacement'] } }));
const composition = buildSkySummaryComposition('Libra', 'Aries', rows, false, null, 'regular', true);
assert.match(text(composition.parts), /starts the retrograde fixture/);
assert.equal(composition.sources[0].field.key, rxKey);
const sky = { positions: [{ planet: 'Sun', sign: 'Libra', degree: 1 }, { planet: 'Venus', sign: 'Scorpio', motion: 'retrograde' }], generatedAt: '2026-10-05T12:00:00Z', location: { timeZone: 'UTC' } } as any;
assert.equal(calendarPreviewValues({ sunSign: 'Libra', moonSign: 'Aries', calculation: { sky, days: [], events: [], timeZone: "UTC" } as any, rows: rows as any }).sunSummary.sourceKey, rxKey);
const content = new Map(rows.map(r => [r.content_key, row(r.content_key, r.body)]));
const facts = { sun: { sign: 'Libra', degree: 1 }, moonIsVoid: false, retrogradePlanets: ['Venus'] };
const transition = { phase: 'after', fromSign: 'Virgo', toSign: 'Libra', id: 'test-ingress', time: '9:00 AM' } as const;
assert.equal(text(skyDailySummaryParts({ ...facts, sunTransition: transition }, content)), text(skyDailySummaryParts({ ...facts, sunTransition: transition }, new Map())));
installContentPublications([{ content_key: rxKey, state: 'live', revision: 1, row_id: rxKey, row_updated_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z' }]);
assert.deepEqual(missingPublishedSkySummaryKeys([rxKey], new Map()), [rxKey]);
assert.doesNotMatch(text(skyDailySummaryParts(facts, new Map([[key, row(key, body)]]))), /standard fixture/, 'Known missing live variant must not silently switch to standard.');
installContentPublications([{ content_key: rxKey, state: 'retired', revision: 2, row_id: rxKey, row_updated_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T13:00:00Z' }]);
assert.match(text(skyDailySummaryParts(facts, content)), /standard fixture/);
console.log('PASS Sun variants: 12 signs, 10 eligible rulers, direct/Rx/direct, full copy, links, draft/missing/retired handling, shared previews and preserved ingress behavior.');

const { getAstrodienstSky } = await import('../apps/web/src/services/ephemeris.ts');
for (const [date, motion] of [['2026-09-24T16:00:00Z', 'direct'], ['2026-10-05T16:00:00Z', 'retrograde']]) {
  const calculated = await getAstrodienstSky({ label: 'Test', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }, new Date(date));
  assert.equal(calculated.positions.find(p => p.planet === 'Sun')?.sign, 'Libra');
  assert.equal(calculated.positions.find(p => p.planet === 'Venus')?.motion, motion);
  const result = text(calendarSunSummary(calculated, content, []));
  // The test ledger above deliberately retired this variant: retirement wins even on a retrograde date.
  assert.match(result, /standard fixture/);
}
console.log('PASS Swiss Ephemeris independently confirms the direct and retrograde browser dates.');
