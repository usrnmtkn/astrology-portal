import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { calendarRxFixture, calendarRxKey, calendarDefaultBody, calendarRxBody } from '../tests/helpers/calendar-rx-fixture.ts';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { calendarAspectRetrogradeBody, calendarAspectRetrogradeOptions } from '../apps/web/src/content/calendarAspectRetrograde.ts';
import { withCalendarAspectRetrograde } from '../apps/web/src/services/calendarAspectRetrogradeContent.ts';
const store = await createApiStore([calendarRxFixture()]);
const bundle = join(tmpdir(), `calendar-rx-reader-${process.pid}.mjs`);
await build({ stdin: { contents: `export { refreshContentPublications } from './apps/web/src/services/contentPublications.ts'; export { loadLiveGeneratedContentForKeys } from './apps/web/src/services/generatedContent.ts'; export { normalizeCalendarEventSurface, liveCalendarEventContent } from './apps/web/src/features/calendar/LunarCalendar.tsx';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, outfile: bundle, platform: 'node', format: 'esm', define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://calendar-api.invalid', VITE_SUPABASE_ANON_KEY: 'calendar-api-fixture-key' }) }, loader: { '.css': 'empty' }, logLevel: 'silent' });
const reader = await import(pathToFileURL(bundle).href);
try {
  const original = calendarRxFixture();
  for (const changes of [ { RetrogradeBodyA: 'Invalid Moon variant.' }, { RetrogradeBodyB: 4 },
    { RetrogradeBodyB: 'Editor notes: do not publish this.' }, { RetrogradeBodyB: '{{unresolved}}' } ]) {
    const invalid = await store.invoke('PATCH', { id: original.id, expectedUpdatedAt: original.updated_at,
      sections: { ...original.sections, packageDraft: { ...original.sections.packageRecord, ...changes } }, reviewStatus: 'needs_review' });
    assert.equal(invalid.status, 400, JSON.stringify(invalid.payload));
    assert.deepEqual(store.rows.get(original.id), original);
  }
  const saved = await store.invoke('PATCH', { id: original.id, expectedUpdatedAt: original.updated_at,
    sections: { ...original.sections, packageDraft: { ...original.sections.packageRecord, RetrogradeBodyB: calendarRxBody } }, reviewStatus: 'needs_review' });
  assert.equal(saved.status, 200, JSON.stringify(saved.payload));
  const draft = saved.payload.rows[0];
  assert.equal(store.rows.get(original.id).body, calendarDefaultBody);
  assert.equal(draft.sections.packageDraft.RetrogradeBodyB, calendarRxBody);
  const prePublish = await store.invoke('POST', { keys: [calendarRxKey] }, '/api/content-reader');
  assert.equal(prePublish.status, 200);
  assert.equal(prePublish.payload.rows[0]?.sections.packageRecord.RetrogradeBodyB, undefined, 'Unapproved proposals must stay private.');
  const reopened = await store.invoke('GET', undefined, `/api/admin/generated-content?id=${draft.id}`);
  assert.equal(reopened.payload.rows[0].sections.packageDraft.RetrogradeBodyB, calendarRxBody);
  const stale = await store.invoke('PATCH', { id: original.id, expectedUpdatedAt: '2020-01-01T00:00:00Z', sections: { packageDraft: { RetrogradeBodyB: 'Stale synthetic passage.' } } });
  assert.equal(stale.status, 409);
  const publish = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' });
  assert.equal(publish.status, 200, JSON.stringify(publish.payload));
  const live = publish.payload.rows[0];
  assert.equal(live.body, calendarDefaultBody);
  assert.equal(live.sections.packageRecord.RetrogradeBodyB, calendarRxBody);
  assert.deepEqual(live.sections.packageOriginalRecord, original.sections.packageOriginalRecord);
  await reader.refreshContentPublications(true);
  const generated = await reader.loadLiveGeneratedContentForKeys([calendarRxKey]);
  assert.equal(generated.get(calendarRxKey)?.sections.packageRecord.RetrogradeBodyB, calendarRxBody);
  for (const reverse of [false, true]) for (const motion of ['direct', 'retrograde', undefined]) {
    const event = { type: 'aspect', title: 'Moon Trine Saturn', planets: reverse ? ['Saturn', 'Moon'] : ['Moon', 'Saturn'], aspect: 'trine',
      fromSign: reverse ? 'Aries' : 'Leo', toSign: reverse ? 'Leo' : 'Aries', fromMotion: reverse ? motion : 'direct', toMotion: reverse ? 'direct' : motion,
      startsAt: '2026-10-05T12:00:00Z', dateKey: '2026-10-05' };
    const content = reader.liveCalendarEventContent(generated, event);
    const rendered = reader.normalizeCalendarEventSurface(event, content, 'Today', null, null, null, generated);
    assert.equal(rendered.sections[0]?.body, motion === 'retrograde' ? calendarRxBody : calendarDefaultBody, `${motion} reverse=${reverse}`);
  }
  const clear = await store.invoke('PATCH', { id: live.id, expectedUpdatedAt: live.updated_at,
    sections: { ...live.sections, packageDraft: { ...live.sections.packageRecord, RetrogradeBodyB: '' } }, reviewStatus: 'needs_review' });
  assert.equal(clear.status, 200, JSON.stringify(clear.payload));
  const clearedDraft = clear.payload.rows[0];
  const clearPublish = await store.invoke('PATCH', { id: clearedDraft.id, expectedUpdatedAt: clearedDraft.updated_at, ownerAction: 'approve-package-revision' });
  assert.equal(clearPublish.status, 200, JSON.stringify(clearPublish.payload));
  assert.equal(clearPublish.payload.rows[0].body, calendarDefaultBody);
  await reader.refreshContentPublications(true);
  const cleared = await reader.loadLiveGeneratedContentForKeys([calendarRxKey]);
  assert.equal(withCalendarAspectRetrograde(cleared.get(calendarRxKey), { first: 'Moon', second: 'Saturn', secondMotion: 'retrograde' }).body, calendarDefaultBody);
} finally { store.close(); }

for (const key of ['sky.aspect.mercury.sextile.mars', 'sky.aspect.mercury.sextile.mars.virgo.cancer', 'sky-card/mercury/virgo/sextile/mars/cancer', 'fallback-hook/sky-aspect-sign/mercury/virgo/sextile/mars/cancer']) {
  const saved = { RetrogradeBodyA: 'Only Mercury.', RetrogradeBodyB: 'Only Mars.', RetrogradeBodyBoth: 'Both planets.' };
  for (const packageRecord of [false, true]) for (const reverse of [false, true]) {
    const sections = packageRecord ? { packageRecord: saved } : saved;
    for (const [mercury, mars, expected] of [['direct', 'direct', null], ['retrograde', 'direct', 'Only Mercury.'], ['direct', 'retrograde', 'Only Mars.'], ['retrograde', 'retrograde', 'Both planets.'], ['retrograde', undefined, null]]) {
      assert.equal(calendarAspectRetrogradeBody(key, sections, { first: reverse ? 'Mars' : 'Mercury', second: reverse ? 'Mercury' : 'Mars', firstMotion: reverse ? mars : mercury, secondMotion: reverse ? mercury : mars }), expected);
    }
    assert.equal(calendarAspectRetrogradeBody(key, { packageRecord: { ...saved, RetrogradeBodyBoth: '' }, packageDraft: { RetrogradeBodyBoth: 'Unapproved draft.' } }, { first: 'Mercury', second: 'Mars', firstMotion: 'retrograde', secondMotion: 'retrograde' }), null);
  }
}
assert.deepEqual(calendarAspectRetrogradeOptions('sky.aspect.sun.conjunction.moon'), []);
assert.deepEqual(calendarAspectRetrogradeOptions('authored/transit-aspect/moon/saturn/trine'), []);
// The established node-axis result contains two complete passages. Choosing an
// Rx version must retain both, including when the event displays Saturn first.
const nodeRows = new Map(['north-node', 'south-node'].map((node, index) => {
  const aspect = index ? 'sextile' : 'trine';
  const key = `sky.aspect.${node}.${aspect}.saturn`;
  return [key, { id: key, contentKey: key, status: 'LIVE', body: `${node} default passage.`,
    sections: { packageRecord: { RetrogradeBodyB: `${node} retrograde passage.` } },
    sourceSnapshot: { contentStudioExactAspect: true, exactSkyAspectIdentity: { a: node, b: 'saturn', aspect } } }];
}));
for (const reverse of [false, true]) {
  const event = { type: 'aspect', title: 'North Node Trine Saturn', planets: reverse ? ['Saturn', 'North Node'] : ['North Node', 'Saturn'], aspect: 'trine',
    fromSign: reverse ? 'Aries' : 'Leo', toSign: reverse ? 'Leo' : 'Aries', fromMotion: 'retrograde', toMotion: 'retrograde',
    startsAt: '2026-10-05T12:00:00Z', dateKey: '2026-10-05' };
  const content = reader.liveCalendarEventContent(nodeRows, event);
  const rendered = reader.normalizeCalendarEventSurface(event, content, 'Today', null, null, null, nodeRows);
  assert.equal(rendered.sections[0]?.body, 'North Node (trine): north-node retrograde passage.\n\nSouth Node (sextile): south-node retrograde passage.');
}
console.log('PASS: Calendar Rx copy saves, reopens, publishes, hydrates and renders without replacing the default.');
