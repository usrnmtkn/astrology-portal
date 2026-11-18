import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {lunationTimingValues, renderLunationTiming} from '../src/shared/lunationTimingVariables';
import {templateVariableReferences} from '../apps/admin/src/templateVariableReference';
import {buildCompositionTemplate} from '../apps/admin/src/compositionMap';
import {ARTICLE_HOROSCOPE_SCHEMA} from '../apps/web/src/content/skyArticleHoroscopes.mjs';
import {lunationHoroscopeIdentities} from '../src/shared/lunationHoroscopeIdentities';
import {createApiStore} from '../tests/helpers/calendar-review-api.mjs';
import {lunationPublicationDraft, lunationKey} from '../tests/helpers/lunation-publication.mjs';

const body = 'Synthetic opening on {{startDate}} at {{startTime}}.\n\nSynthetic complete final sentence.';
for (const [startsAt, zone, expected] of [
  ['2026-01-01T00:15:00Z', 'America/New_York', {startDate: 'December 31', startTime: '7:15 PM EST'}],
  ['2026-01-01T00:15:00Z', 'Asia/Tokyo', {startDate: 'January 1', startTime: '9:15 AM GMT+9'}],
  ['2026-07-14T09:43:00Z', 'America/New_York', {startDate: 'July 14', startTime: '5:43 AM EDT'}],
  ['2026-11-01T05:30:00Z', 'America/New_York', {startDate: 'November 1', startTime: '1:30 AM EDT'}],
  ['2026-11-01T06:30:00Z', 'America/New_York', {startDate: 'November 1', startTime: '1:30 AM EST'}]
] as const) assert.deepEqual(lunationTimingValues(startsAt, zone), expected);
for (const [instant, zone] of [['invalid', 'America/New_York'], ['2026-01-01T00:15:00Z', 'invalid'], ['2026-01-01T00:15:00Z', undefined]]) {
  assert.equal(renderLunationTiming(body, lunationTimingValues(instant!, zone)), '');
}
assert.equal(renderLunationTiming('Exact original words.\n\nComplete ending.', {}), 'Exact original words.\n\nComplete ending.');
for (const phase of ['new-moon', 'full-moon']) {
  const key = `authored/sky-lunation-macro/${phase}/aquarius`;
  const refs = templateVariableReferences({Body: 'Original passage.'}, {contentKey: key}, true);
  assert.deepEqual(refs.map(ref => ref.name), ['startDate', 'startTime']);
  assert(refs.every(ref => ref.sourceKind === 'runtime' && ref.source === 'Calculated lunation timing'));
}
assert(!templateVariableReferences({Body: 'Original passage.'}, {contentKey: 'authored/calendar-weekly-moon/aquarius'}, true).some(ref => ['startDate', 'startTime'].includes(ref.name)));
const preview = buildCompositionTemplate({...lunationPublicationDraft(), body, sections: {packageRecord: {contentKey: lunationKey, body}}}, []);
assert.equal(preview.preview.lineage, 'runtime-traceable');
assert.equal(preview.issues.length, 0);
assert(preview.preview.fields.some(field => field.rendered.includes('September 26 at 12:49 PM EDT')));

const directory = mkdtempSync(join(tmpdir(), 'lunation-timing-'));
const draft = lunationPublicationDraft();
const store = await createApiStore([draft]);
try {
  const rejected = await store.invoke('PATCH', {id: draft.id, expectedUpdatedAt: draft.updated_at,
    body: '{{endDate}}', sections: {...draft.sections, packageDraft: {...draft.sections.packageDraft, body: '{{endDate}}'}}});
  assert.equal(rejected.status, 400);
  const saved = await store.invoke('PATCH', {id: draft.id, expectedUpdatedAt: draft.updated_at,
    body, sections: {...draft.sections, packageDraft: {...draft.sections.packageDraft, body}}});
  assert.equal(saved.status, 200, JSON.stringify(saved.payload));
  const savedRow = saved.payload.rows[0];
  assert.equal(savedRow.sections.packageDraft.body, body);
  assert.equal(savedRow.sections.packageOriginalRecord.body, draft.body);
  const stale = await store.invoke('PATCH', {id: draft.id, expectedUpdatedAt: draft.updated_at, body: 'Stale overwrite.'});
  assert.equal(stale.status, 409);
  const published = await store.invoke('PATCH', {id: draft.id, expectedUpdatedAt: savedRow.updated_at, ownerAction: 'approve-package-revision'});
  assert.equal(published.status, 200, JSON.stringify(published.payload));
  const read = await store.invoke('POST', {keys: [lunationKey]}, '/api/content-reader');
  assert.equal(read.status, 200);
  assert.equal(read.payload.rows[0].body, body, 'Storage and reader transport retain the exact template.');

  const bundle = join(directory, 'reader.mjs');
  await build({stdin: {contents: `
    export {resolveLunationReaderSource} from './apps/web/src/content/lunationReaderSource';
    export {resolveLunationArticleHoroscopes} from './apps/web/src/content/lunationArticleHoroscopes';
    export {generatedContentMapFromRows} from './apps/web/src/services/generatedContent';
    export {installContentPublications} from './apps/web/src/content/contentPublicationState';
    export {calendarMoonSources} from './apps/web/src/features/calendar/calendarMoonSources';
    export {calendarDailyPassageValues} from './src/shared/features/calendar/calendarPassageAssembly';
    export {calendarStudioMoonSources} from './apps/admin/src/calendarPassageSources';
    export {calendarMoonCycleFactsForDays} from './src/shared/features/calendar/calendarMoonCycle';
  `, resolveDir: process.cwd(), loader: 'ts'}, bundle: true, outfile: bundle, platform: 'node', format: 'esm',
    define: {'import.meta.env': '{}'}, logLevel: 'silent'});
  const reader = await import(pathToFileURL(bundle).href);
  reader.installContentPublications([]);
  const content = reader.generatedContentMapFromRows(read.payload.rows);
  const event = {id: 'fixture', type: 'lunation', title: 'New Moon in Aquarius', sign: 'Aquarius', startsAt: '2026-01-01T00:15:00Z', dateKey: '2025-12-31', glyph: '●', primary: true};
  const expected = 'Synthetic opening on December 31 at 7:15 PM EST.\n\nSynthetic complete final sentence.';
  assert.equal(reader.resolveLunationReaderSource(event, content, 'America/New_York').body, expected);
  assert.equal(reader.resolveLunationReaderSource(event, content, 'Asia/Tokyo').body, expected.replace('December 31 at 7:15 PM EST', 'January 1 at 9:15 AM GMT+9'));
  assert.equal(reader.resolveLunationReaderSource(event, content).body, '', 'No browser-zone or UTC guess when timing is missing.');
  const day = {date: '2025-12-31T17:00:00Z', dateKey: '2025-12-31', moonSign: 'Aquarius', moonPhase: 'New Moon', events: [event]};
  const facts = reader.calendarMoonCycleFactsForDays([day], [event], 'America/New_York').get(day.dateKey);
  for (const sources of [reader.calendarMoonSources, reader.calendarStudioMoonSources(content)]) {
    assert.equal(sources.moonWritingForDay(day, content, null, 'America/New_York')[0].body, expected);
    assert.equal(sources.calendarMoonResolvedWeekly(day, facts, content).body, expected);
    const values = reader.calendarDailyPassageValues({days: [day], events: [event], timeZone: 'America/New_York'}, day.dateKey, null, content, sources);
    assert(values.moonWriteup.text.startsWith(expected.split('\n\n')[0]));
    assert(!values.moonWriteup.text.includes('{{'));
  }
  content.get(lunationKey).sections = {articleHoroscopes: {schema: ARTICLE_HOROSCOPE_SCHEMA, heading: '## Horoscopes', introduction: '',
    passages: lunationHoroscopeIdentities('new-moon', 'aquarius').map(identity => ({...identity, heading: identity.risingSign, body: 'Synthetic complete attached reading.'}))}};
  assert.equal(reader.resolveLunationArticleHoroscopes(event, content, 'America/New_York')[0].body,
    'Synthetic complete attached reading.', 'Timing variables must not hide attached rising-sign readings.');
  console.log('PASS lunation timing: exact-version save/publication/reader, editor discovery and preview, Calendar and Studio assembly, selected zones, year boundary, DST and missing facts.');
} finally {
  await store.close();
  rmSync(directory, {recursive: true, force: true});
}
