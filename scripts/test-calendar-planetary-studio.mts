import { calendarPlanetaryDraft } from "../apps/admin/src/calendarPlanetaryDraft.ts";
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { calendarPlanetaryIdentity, calendarPlanetaryIdentityKeys } from '../apps/admin/src/calendarPlanetarySources.ts';
import { studioInventoryQuery, studioInventoryRequestPath } from '../apps/admin/src/studioSectionInventory.ts';

const blockTypes=(path:string)=>new Set([...readFileSync(path,'utf8').match(/block_type in \(([\s\S]*?)\)/u)![1].matchAll(/'([^']+)'/gu)].map(match=>match[1]));
const priorTypes=blockTypes('apps/web/supabase/migrations/20260904141612_allow_fallback_article_block_type.sql');
const eventTypes=blockTypes('apps/web/supabase/migrations/20261016174500_allow_calendar_event_block_type.sql');
for(const value of priorTypes)assert(eventTypes.has(value),`Calendar migration must retain ${value}`);
assert.equal(eventTypes.size,priorTypes.size+1);
for(const kind of ['ingress','station'] as const)assert(eventTypes.has(calendarPlanetaryDraft(kind,{planet:'mercury',sign:'capricorn',direction:'retrograde'})!.blockType),'Native Calendar drafts must use a deployed database block type.');

const directory = mkdtempSync(join(tmpdir(), 'calendar-planetary-'));
const store = await createApiStore([]);
const { contentLiveStatuses } = await import('../api/_lib/content-live-status.ts');
try {
  // Vercel emits separate .js files. A TS loader or bundled fixture can hide
  // broken .ts imports, so import the emitted dependency chain in plain Node.
  const emitted = join(directory, 'server');
  await build({ entryPoints: [...['contentWiringStatus', 'calendarPlanetarySources', 'natalPlacementSources'].map(name => `apps/admin/src/${name}.ts`), 'src/shared/articleLibrary.ts'], outbase: '.', outdir: emitted, platform: 'node', format: 'esm', bundle: false, logLevel: 'silent' });
  writeFileSync(join(emitted, 'package.json'), '{"type":"module"}');
  execFileSync(process.execPath, ['--input-type=module', '--eval', `
    import assert from 'node:assert/strict';
    const {contentWiringStatus} = await import(process.argv[1]);
    for (const content_key of ['sky.ingress.mercury.scorpio', 'sky.station.venus.scorpio.retrograde'])
      assert.equal(contentWiringStatus({content_key, status:'LIVE', lane:'serving'}).state, 'connected');
  `, pathToFileURL(join(emitted, 'apps/admin/src/contentWiringStatus.js')).href], { env: { ...process.env, NODE_OPTIONS: '' } });
  const bundle = join(directory, 'reader.mjs');
  await build({ stdin: { contents: `export {loadLiveGeneratedContentForKeys} from './apps/web/src/services/generatedContent.ts'; export {normalizeCalendarEventSurface,liveCalendarEventContent} from './apps/web/src/features/calendar/LunarCalendar.tsx'; export {calendarEventGeneratedContentKeys} from './apps/web/src/features/calendar/calendarContentKeys.ts'; export {isReaderServableGeneratedContentRow} from './apps/web/src/content/generatedContentEligibility.ts'; export {resolveLunarJournal} from './apps/web/src/features/calendar/lunarJournal.ts';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, outfile: bundle, platform: 'node', format: 'esm', define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://calendar-api.invalid', VITE_SUPABASE_ANON_KEY: 'calendar-api-fixture-key' }) }, loader: { '.css': 'empty' }, logLevel: 'silent' });
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
  const journalKey='authored/lunar-journal/season/aries/20250320t090100z';
  const original='Synthetic original season paragraph.';
  const journalCreate=await store.invoke('POST',{contentKey:journalKey,surface:'sky',mode:'in_depth',eventType:'fallback-hook',status:'DRAFT',lane:'reference',blockType:'fallback_hook',
    headline:'Synthetic season',body:original,provider:'tldrastro-fallback-architecture-v3',facts:{fallbackArchitectureV3:true},
    sourceSnapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',review_status:'needs_review'},
    sections:{packageRecord:{contentKey:journalKey,content_role:'full_copy',body:original,review_status:'needs_review',blocks:[{type:'para',text:original}]}}});
  assert.equal(journalCreate.status,200,JSON.stringify(journalCreate));
  let journal=journalCreate.payload.rows[0];
  const event={id:'synthetic-season',type:'ingress',planet:'Sun',sign:'Aries',toSign:'Aries',title:'Aries Season',startsAt:'2031-03-22T12:00:00Z'};
  for(const revision of ['First','Second']){
    const body=`${revision} complete authored season paragraph.\n\nExact final sentence.`;
    const draft=await store.invoke('PATCH',{id:journal.id,expectedUpdatedAt:journal.updated_at,sections:{...journal.sections,packageDraft:{...journal.sections.packageRecord,body}},reviewStatus:'needs_review'});
    assert.equal(draft.status,200,JSON.stringify(draft));
    const published=await store.invoke('PATCH',{id:journal.id,expectedUpdatedAt:draft.payload.rows[0].updated_at,ownerAction:'approve-package-revision'});
    assert.equal(published.status,200,JSON.stringify(published));journal=published.payload.rows[0];
    assert.equal(journal.body,body);
    assert.equal(contentLiveStatuses([journal],[journal])[0].live,true);
    assert.equal(contentLiveStatuses([journal],[journal],()=>false)[0].live,false);
    const loaded=await reader.loadLiveGeneratedContentForKeys([journalKey],{requireFresh:true});
    const resolved=reader.resolveLunarJournal(event,loaded);
    assert.equal(resolved.source,'live');
    assert.equal(resolved.blocks.map((block:any)=>block.text).join('\n\n'),body,'Stale packaged blocks must not shadow the published body.');
  }
  for (const key of ['sky.retrograde.mercury.scorpio.retrograde_passage', 'sky.ingress.sun.libra', 'sky.ingress.moon.pisces', 'sky/station/mercury/retrograde/scorpio']) assert.equal(calendarPlanetaryIdentity(key), null);
  assert.equal(calendarPlanetaryIdentity('sky.ingress.mars.leo.2026-09-27')?.date, '2026-09-27');
  assert.equal(calendarPlanetaryDraft('station', { planet: 'sun', sign: 'aries', direction: 'direct' }), null);
  console.log('PASS: Planetary ingress and both station directions save, reopen, publish, reach the exact Calendar reader, and reject stale and unauthorized edits.');
} finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
