import assert from 'node:assert/strict';

function builder(source, start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first, `Authority builder must exist: ${start}`);
  return source.slice(first, last);
}

export function assertSkyStudioAuthority(app, calendar) {
  const sky = builder(app, 'function approvedExactSkyAspectWritingSection(', '\nfunction reviewedSkyAspectWritingSection(');
  assert.match(sky, /const signedStudio = options \? resolveSkyAspectOwnerAuthoredSigned\(options\) : null;/u);
  assert.match(sky, /const studio = signedStudio \?\? \(options \? resolveSkyAspectContentStudioExact\(options\) : null\);/u);
  assert.match(sky, /if \(studio\) \{\s*return \{[^}]*tier: signedStudio \? "content-studio-signed-sky-aspect-v1" : "content-studio-exact-sky-aspect-v1",[^}]*sourceKeys: \[studio\.content\.contentKey\],[^}]*body: studio\.body\s*\};\s*\}/u);
  assert.ok(sky.indexOf('if (studio)') < sky.indexOf('const registry = contentRegistryFor("sky")'));
  assert.ok(sky.indexOf('const registry = contentRegistryFor("sky")') < sky.indexOf('resolveApprovedExactSkyAspectCopy({'));

  const card = builder(calendar, 'export function normalizeCalendarEventSurface(', '\nfunction calendarCanonicalEventDateLine(');
  assert.match(card, /const studioExactResolved = content\s*\? resolveSkyAspectContentStudioExact\(/u);
  assert.match(card, /const studioExact = studioExactResolved\s*\? \{[^}]*body: studioExactResolved\.body,[^}]*tier: "content-studio-exact-sky-aspect-v1"/u);
  assert.match(card, /const signedStudioResolved = resolveSkyAspectOwnerAuthoredSigned\(/u);
  assert.match(card, /const signedStudio = signedStudioResolved\?\.content\.sourceSnapshot\?\.contentType === "owner-authored-sky-aspect"\s*\? \{[^}]*body: signedStudioResolved\.body,[^}]*tier: "content-studio-signed-sky-aspect-v1"/u);
  assert.match(card, /const selected = selectSkyAspectCopyByPrecedence<CalendarSkyAspectCandidate>\(\{\s*composed,\s*signSpecific: packageCandidates\.signSpecific,\s*exact: signedStudio \?\? studioExact \?\? exact,/u);
}
