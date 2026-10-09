import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { calendarPlanetaryDraft, calendarPlanetaryIdentity, calendarPlanetaryIdentityKeys } from '../apps/admin/src/calendarPlanetarySources.ts';
import { studioInventoryQuery, studioInventoryRequestPath } from '../apps/admin/src/studioSectionInventory.ts';

const directory = mkdtempSync(join(tmpdir(), 'calendar-planetary-'));
const store = await createApiStore([]);
const { contentLiveStatuses } = await import('../api/_lib/content-live-status.ts');
try {
  // Vercel emits separate .js files. A TS loader or bundled fixture can hide
  // broken .ts imports, so import the emitted dependency chain in plain Node.
  const emitted = join(directory, 'server');
  await build({ entryPoints: ['contentWiringStatus', 'calendarPlanetarySources', 'natalPlacementSources'].map(name => `apps/admin/src/${name}.ts`), outdir: emitted, platform: 'node', format: 'esm', bundle: false, logLevel: 'silent' });
  writeFileSync(join(emitted, 'package.json'), '{"type":"module"}');
  execFileSync(process.execPath, ['--input-type=module', '--eval', `
    import assert from 'node:assert/strict';
    const {contentWiringStatus} = await import(process.argv[1]);
    for (const content_key of ['sky.ingress.mercury.scorpio', 'sky.station.venus.scorpio.retrograde'])
      assert.equal(contentWiringStatus({content_key, status:'LIVE', lane:'serving'}).state, 'connected');
  `, pathToFileURL(join(emitted, 'contentWiringStatus.js')).href], { env: { ...process.env, NODE_OPTIONS: '' } });
  const bundle = join(directory, 'reader.mjs');
  await build({ stdin: { contents: `export {loadLiveGeneratedContentForKeys} from './apps/web/src/services/generatedContent.ts'; export {normalizeCalendarEventSurface,liveCalendarEventContent} from './apps/web/src/features/calendar/LunarCalendar.tsx'; export {calendarEventGeneratedContentKeys} from './apps/web/src/features/calendar/calendarContentKeys.ts'; export {isReaderServableGeneratedContentRow} from './apps/web/src/content/generatedContentEligibility.ts';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, outfile: bundle, platform: 'node', format: 'esm', define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://calendar-api.invalid', VITE_SUPABASE_ANON_KEY: 'calendar-api-fixture-key' }) }, loader: { '.css': 'empty' }, logLevel: 'silent' });
  const reader = await import(pathToFileURL(bundle).href);
  for (const kind of ['ingress', 'station'] as const) for (const direction of (kind === 'ingress' ? ['direct'] : ['direct', 'retrograde']) as ('direct' | 'retrograde')[]) {
    const selection = { planet: 'mercury', sign: 'scorpio', direction };
    const draft = calendarPlanetaryDraft(kind, selection)!;
    const body = `Synthetic ${kind} ${direction} opening.\n\nComplete synthetic final sentence.`;
    const event = { id: `fixture-${kind}-${direction}`, type: kind, title: draft.headline, planet: 'Mercury', sign: 'Scorpio', ...(kind === 'ingress' ? { fromSign: 'Libra', toSign: 'Scorpio' } : { direction, phase: `station-${direction}` }), startsAt: '2026-09-30T12:00:00Z', dateKey: '2026-09-30' };
    const keys = reader.calendarEventGeneratedContentKeys(event);
    for (const key of calendarPlanetaryIdentityKeys(kind, selection)) {
      assert.ok(keys.includes(key), `${key} must be read by Calendar`);
      assert.equal(calendarPlanetaryIdentity(key)?.kind, kind);
    }
    const { id: _id, ...input } = draft;
    const created = await store.invoke('POST', { ...input, body, eventType: 'calendar_event' });
    assert.equal(created.status, 200, JSON.stringify(created.payload));
    let row = created.payload.rows[0];
    const draftVersion = row.updated_at;
    assert.equal(row.status, 'DRAFT');
    assert.equal(reader.isReaderServableGeneratedContentRow(row), false);
    const reopened = await store.invoke('GET', undefined, `/api/admin/generated-content?contentKeys=${draft.contentKey}`);
    assert.equal(reopened.payload.rows[0].body, body);
    const query = studioInventoryQuery({ page: 'calendarWriteups', calendarWriteupWorkspaceView: kind === 'ingress' ? 'planetary-ingresses' : 'planetary-stations' });
    const inventoryRows: any[] = [];
    // Studio requests each prefix separately. Sending the entire prefix list
    // tests only the first fast-inventory prefix and can conceal omissions.
    for (const prefix of query.prefixes) {
      const inventory = await store.invoke('GET', undefined, studioInventoryRequestPath({ ...query, prefixes: [prefix] }, 80));
      assert.equal(inventory.status, 200, JSON.stringify(inventory.payload));
      inventoryRows.push(...inventory.payload.rows);
    }
    assert.ok(inventoryRows.some(entry => entry.content_key === draft.contentKey));
    const published = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, status: 'LIVE', lane: 'serving', reviewState: null, sourceSnapshot: { ...draft.sourceSnapshot, review_status: 'approved' } });
    assert.equal(published.status, 200, JSON.stringify(published.payload));
    row = published.payload.rows[0];
    assert.equal(reader.isReaderServableGeneratedContentRow(row), true);
    assert.equal(contentLiveStatuses([row], [row])[0].live, true, 'Studio must agree with Calendar about publication');
    const content = await reader.loadLiveGeneratedContentForKeys(keys);
    assert.equal(content.get(draft.contentKey)?.body, body);
    const selected = reader.liveCalendarEventContent(content, event);
    assert.equal(selected?.body, body, `${draft.contentKey} must reach the event detail`);
    const rendered = reader.normalizeCalendarEventSurface(event, selected, 'Today', null, null, null, content);
    assert.equal(rendered.sections[0]?.body, body);
    assert.equal(reader.liveCalendarEventContent(content, { ...event, sign: 'Aries', toSign: 'Aries' }), null);
    if (kind === 'station') {
      assert.equal(reader.liveCalendarEventContent(content, { ...event, direction: direction === 'direct' ? 'retrograde' : 'direct', phase: direction === 'direct' ? 'station-retrograde' : 'station-direct' }), null);
    }
    assert.equal((await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: draftVersion, body: 'Stale edit' })).status, 409);
    assert.equal((await store.invoke('PATCH', { id: row.id, body: 'Unauthorized edit' }, undefined, 'invalid')).status, 401);
    assert.equal(store.rows.get(row.id).body, body);
  }
  for (const key of ['sky.retrograde.mercury.scorpio.retrograde_passage', 'sky.ingress.sun.libra', 'sky.ingress.moon.pisces', 'sky/station/mercury/retrograde/scorpio']) assert.equal(calendarPlanetaryIdentity(key), null);
  assert.equal(calendarPlanetaryIdentity('sky.ingress.mars.leo.2026-09-27')?.date, '2026-09-27');
  assert.equal(calendarPlanetaryDraft('station', { planet: 'sun', sign: 'aries', direction: 'direct' }), null);
  console.log('PASS: Planetary ingress and both station directions save, reopen, publish, reach the exact Calendar reader, and reject stale and unauthorized edits.');
} finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
