import assert from 'node:assert/strict';
import fs from 'node:fs';

function builder(source, start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first, `Authority builder must exist: ${start}`);
  return source.slice(first, last);
}

export function assertSkyStudioAuthority(app, calendar, shared = fs.readFileSync('apps/web/src/services/skyAspectReading.ts', 'utf8')) {
  const sky = builder(app, 'function normalizeSkyAspectSurface(', '\nfunction skyAspectSeriesLine(');
  const card = builder(calendar, 'export function normalizeCalendarEventSurface(', '\nfunction calendarCanonicalEventDateLine(');
  for (const surface of [sky, card]) assert.match(surface, /const selected = (?:registry\?\.)?resolveSkyAspectReading(?:\?\.)?\(\{/u);
  assert.match(sky, /exactLookup: registry\?\.approvedExactSkyAspectCopy/u);
  assert.match(sky, /composedLookup: registry\?\.skyCalendarComposedCard/u);
  assert.match(card, /exactLookup: approvedExactSkyAspectLookup, composedLookup: composedSkyCalendarCardLookup/u);
  assert.match(shared, /const signed = resolveSkyAspectOwnerAuthoredSigned\(options\)/u);
  assert.match(shared, /const studioSelected = signed \?\? studio/u);
  assert.match(shared, /const exact: SkyAspectReading \| null = studioSelected\s*\? \{ body: studioSelected\.body, layer: "authored"/u);
  assert.match(shared, /tier: signed \? "content-studio-signed-sky-aspect-v1" : "content-studio-exact-sky-aspect-v1"/u);
  assert.match(shared, /sourceKeys: \[studioSelected\.content\.contentKey\]/u);
  assert.match(shared, /: allowed\(resolveApprovedExactSkyAspectCopy\(/u);
  assert.match(shared, /selectSkyAspectCopyByPrecedence<SkyAspectReading>\(\{ composed, exact,/u);
}
