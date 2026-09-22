import assert from 'node:assert/strict';
import { calendarSunSummary, calendarSkyForDay } from '../apps/web/src/features/calendar/calendarDaySummary.ts';
import { skyDailySummaryParts } from '../apps/web/src/content/skyDailySummary.ts';
import type { SkySnapshot } from '../apps/web/src/types.ts';
import { skySunTransition } from '../apps/web/src/content/skySunTransition.ts';
import { skySummaryEventFacts } from '../apps/web/src/content/skySummaryEvents.ts';
import { skySummaryTemplateErrors } from '../apps/web/src/content/skyDailySummaryCatalog.ts';

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

const ingress = { id: 'ingress-sun-2026-09-23T00:05:14.000Z', type: 'ingress', planet: 'Sun',
  fromSign: 'Virgo', toSign: 'Libra', startsAt: '2026-09-23T00:05:14Z', dateKey: '2026-09-23' } as any;
const transitionBridge = "After a month of working on the routines and details that keep life functioning, we turn toward how that work is divided between people. Libra season brings attention to the agreements behind those habits, including the ones nobody remembers making.";
for (const [asOf, phase, sign, expected] of [
  ['2026-09-22T18:52:00Z', 'before', 'Virgo', 'The Sun is in Virgo at 19° until 8:05 PM EDT today, when it enters Libra.'],
  ['2026-09-23T00:05:14Z', 'after', 'Libra', 'The Sun entered Libra at 8:05 PM EDT today, ending Virgo season.']
]) {
  const snapshot = { ...sky, generatedAt: asOf, positions: [{ ...sky.positions[0], sign }] };
  const transition = skySunTransition([ingress], asOf, location.timeZone);
  assert.equal(transition?.phase, phase);
  const parts = calendarSunSummary(snapshot, undefined, [ingress]);
  assert.ok(text(parts).startsWith(expected));
  assert.ok(text(parts).includes(transitionBridge));
  assert.equal(parts.find(part => part.sourceKey === 'authored/calendar-season-transition/virgo/libra')?.text.trim(), transitionBridge);
  assert.equal(text(parts).includes('turns our attention to the daily rituals'), false, 'Transition day replaces the ordinary Sun summary');
  assert.equal(parts.find(part => part.action === 'event')?.eventId, ingress.id);
  const shared = skyDailySummaryParts({ sun: snapshot.positions[0], moonIsVoid: false, sunTransition: transition,
    ...skySummaryEventFacts([ingress], new Map()) });
  assert.equal(text(parts), text(shared), 'Sky and Calendar share the entire transition opening');
  assert.equal(text(shared).includes('Sun enters Libra today.'), false, 'No duplicate untimed ingress sentence');
  const sourceKey = `cms/sky-daily-summary/assembly/sunIngress${phase === 'before' ? 'Before' : 'After'}`;
  const template = phase === 'before'
    ? '{sunTransitionPlacementLink} → {toSign}: {transitionTime}.'
    : '{sunTransitionPlacementLink}: {fromSign} → {toSign}: {transitionTime}.';
  assert.deepEqual(skySummaryTemplateErrors(sourceKey, template), []);
  assert.ok(skySummaryTemplateErrors(sourceKey, template.replace('{transitionTime}', '8 PM')).length);
  const custom = new Map([[sourceKey, { body: template, status: 'LIVE' } as any]]);
  const customOpening = phase === 'before'
    ? `Sun is in ${sign} at 19° → Libra: 8:05 PM EDT.`
    : `Sun is in ${sign} at 19°: Virgo → Libra: 8:05 PM EDT.`;
  assert.ok(text(calendarSunSummary(snapshot, custom, [ingress])).startsWith(customOpening));
  assert.equal(text(calendarSunSummary(snapshot, new Map([[sourceKey, { ...custom.get(sourceKey), status: 'DRAFT' } as any]]), [ingress])), text(parts));
}
assert.equal(skySunTransition([ingress], '2026-09-22T18:52:00Z', 'UTC'), undefined, 'UTC ingress is tomorrow');
assert.equal(skySunTransition([ingress], '2026-09-24T00:00:00Z', location.timeZone), undefined, 'No transition line on another local day');
assert.equal(skySunTransition([ingress], 'invalid', location.timeZone), undefined);
assert.equal(skySunTransition([{ ...ingress, startsAt: 'invalid' }], sky.generatedAt, location.timeZone), undefined);
assert.equal(skySunTransition([ingress], '2026-09-23T00:04:00Z', 'Asia/Tokyo')?.time, '9:05 AM GMT+9');
const concurrentLunation = skyDailySummaryParts({ sun: { sign: 'Virgo', degree: 29 }, moonIsVoid: false,
  sunTransition: skySunTransition([ingress], '2026-09-22T18:52:00Z', location.timeZone),
  event: { name: 'Full Moon', sign: 'Aries', sun: { sign: 'Libra', degree: 0 }, isToday: true, countdown: 'today' } });
assert.equal(concurrentLunation.find(part => part.action === 'sun')?.text, 'Sun is in Virgo at 29°', 'Event-time lunation facts must not advance the current Sun before its transition');
assert.ok(text(concurrentLunation).includes(transitionBridge), 'A same-day lunation keeps the base Ends bridge');
console.log('Sun transition: shared before/after template, local day/time, event link, publication and missing-fact checks passed.');
