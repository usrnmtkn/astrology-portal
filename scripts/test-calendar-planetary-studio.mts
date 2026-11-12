import {getCalendarSkyEventSnapshot} from '../apps/web/src/services/ephemeris.ts';
import {calendarSkyEventRoute} from '../apps/web/src/services/calendarSkyEventIdentity.ts';
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
import {governedCalendarCases,publishGovernedCalendarFixture} from '../tests/helpers/calendar-governed-fixtures.ts';

const blockTypes=(path:string)=>new Set([...readFileSync(path,'utf8').match(/block_type in \(([\s\S]*?)\)/u)![1].matchAll(/'([^']+)'/gu)].map(match=>match[1]));
const priorTypes=blockTypes('apps/web/supabase/migrations/20260904141612_allow_fallback_article_block_type.sql');
const eventTypes=blockTypes('apps/web/supabase/migrations/20261016174132_allow_calendar_event_block_type.sql');
for(const value of priorTypes)assert(eventTypes.has(value),`Calendar migration must retain ${value}`);
assert.equal(eventTypes.size,priorTypes.size+1);
for(const kind of ['ingress','station'] as const)assert(eventTypes.has(calendarPlanetaryDraft(kind,{planet:'mercury',sign:'capricorn',direction:'retrograde'})!.blockType),'Native Calendar drafts must use a deployed database block type.');

const directory = mkdtempSync(join(tmpdir(), 'calendar-planetary-'));
const store = await createApiStore([], {uuidIds: true, sqlCalendarLifecycle: true});
const { contentLiveStatuses } = await import('../api/_lib/content-live-status.ts');
try {
  // Vercel emits separate .js files. A TS loader or bundled fixture can hide
  // broken .ts imports, so import the emitted dependency chain in plain Node.
  const emitted = join(directory, 'server');
  await build({ entryPoints: [...['contentWiringStatus', 'calendarPlanetarySources', 'natalPlacementSources'].map(name => `apps/admin/src/${name}.ts`), 'src/shared/articleLibrary.ts', 'src/shared/lunationHoroscopeIdentity.ts'], outbase: '.', outdir: emitted, platform: 'node', format: 'esm', bundle: false, logLevel: 'silent' });
  writeFileSync(join(emitted, 'package.json'), '{"type":"module"}');
  execFileSync(process.execPath, ['--input-type=module', '--eval', `
    import assert from 'node:assert/strict';
    const {contentWiringStatus} = await import(process.argv[1]);
    for (const content_key of ['sky.ingress.mercury.scorpio', 'sky.station.venus.scorpio.retrograde'])
      assert.equal(contentWiringStatus({content_key, status:'LIVE', lane:'serving'}).state, 'connected');
  `, pathToFileURL(join(emitted, 'apps/admin/src/contentWiringStatus.js')).href], { env: { ...process.env, NODE_OPTIONS: '' } });
  const bundle = join(directory, 'reader.mjs');
  await build({ stdin: { contents: `export {loadLiveGeneratedContentForKeys} from './apps/web/src/services/generatedContent.ts'; export {normalizeCalendarEventSurface,liveCalendarEventContent} from './apps/web/src/features/calendar/LunarCalendar.tsx'; export {calendarEventGeneratedContentKeys} from './apps/web/src/features/calendar/calendarContentKeys.ts'; export {isReaderServableGeneratedContentRow} from './apps/web/src/content/generatedContentEligibility.ts'; export {resolveLunarJournal} from './apps/web/src/features/calendar/lunarJournal.ts'; export {calendarSpecialEventReading,calendarEventArticleSourceKeys,loadCalendarEventArticleContent,prepareCalendarSkyEventContent} from './apps/web/src/services/calendarSkyEventReading.ts'; export {installContentPublications,contentPublication} from './apps/web/src/content/contentPublicationState.ts';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, outfile: bundle, platform: 'node', format: 'esm', define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://calendar-api.invalid', VITE_SUPABASE_ANON_KEY: 'calendar-api-fixture-key' }) }, loader: { '.css': 'empty' }, logLevel: 'silent' });
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
    const publicRead = await store.invoke('POST', { keys: [draft.contentKey] }, '/api/content-reader');
    assert.equal(publicRead.status, 200);
    reader.installContentPublications(publicRead.payload.publications);
    assert.equal(reader.calendarSpecialEventReading(event, content), body, 'The dated Sky event must retain the same complete published Calendar unit.');
    assert(reader.calendarEventArticleSourceKeys(event).includes(draft.contentKey));
    assert(reader.calendarEventArticleSourceKeys(event).every((key: string) => !key.startsWith('ms/') && !key.startsWith('fallback-hook/sky.station/')));
    const current = content.get(draft.contentKey);
    let pinnedReads = 0;
    const retainedPin = await reader.loadCalendarEventArticleContent(event, content, [draft.contentKey], async () => { pinnedReads++; throw Error('A current pinned unit needs no extra read'); });
    assert.equal(pinnedReads, 0);assert.equal(retainedPin.get(draft.contentKey)?.body, body);
    assert.equal(reader.calendarSpecialEventReading(event, new Map([[draft.contentKey, { ...current, targetDate: '2027-01-01' }]])), null, 'Another date cannot lend its wording.');
    const dateBound = new Map([[draft.contentKey, { ...current, targetDate: event.dateKey }]]);
    const anotherOccurrence = { ...event, dateKey: '2027-01-01', startsAt: '2027-01-01T12:00:00Z' };
    assert.equal(reader.liveCalendarEventContent(dateBound, event)?.body, body, 'A date-bound exact unit reaches its own Calendar occurrence.');
    assert.equal(reader.liveCalendarEventContent(dateBound, anotherOccurrence), null, 'A same-key different occurrence must not borrow a date-bound Calendar card.');
    assert.equal(reader.calendarSpecialEventReading(anotherOccurrence, dateBound), null, 'Sky must reject the same wrong-date exact unit.');
    assert.equal(reader.liveCalendarEventContent(content, anotherOccurrence)?.body, body, 'An explicitly undated reusable unit remains available on later occurrences.');
    assert.equal(reader.calendarSpecialEventReading(anotherOccurrence, content), body, 'Sky retains the same undated reuse contract.');
    assert.equal(reader.calendarSpecialEventReading(event, new Map([[draft.contentKey, { ...current, contentKey: 'sky.ingress.venus.aries' }]])), null, 'The row must match its requested source identity.');
    assert.equal(reader.calendarSpecialEventReading(event, new Map([[draft.contentKey, { ...current, updatedAt: '1900-01-01T00:00:00Z', targetDate: event.dateKey }]])), null, 'A dated cache entry cannot bypass the current published version.');
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
    for (const key of reader.calendarEventArticleSourceKeys(event).filter((key: string) => key !== draft.contentKey)) {
      const aliasBody = `Synthetic complete ${key} opening.\n\nExact alias final paragraph.`;
      const aliasCreate = await store.invoke('POST', { ...input, contentKey: key, body: aliasBody, eventType: 'calendar_event' });
      assert.equal(aliasCreate.status, 200, JSON.stringify(aliasCreate.payload));
      const aliasDraft = aliasCreate.payload.rows[0];
      const aliasPublish = await store.invoke('PATCH', { id: aliasDraft.id, expectedUpdatedAt: aliasDraft.updated_at, ownerAction: 'publish-owner-content' });
      assert.equal(aliasPublish.status, 200, JSON.stringify(aliasPublish.payload));
      const aliasRead = await store.invoke('POST', { keys: [key] }, '/api/content-reader');
      reader.installContentPublications(aliasRead.payload.publications);
      const loaded = await reader.loadLiveGeneratedContentForKeys([key], { requireFresh: true });
      assert.equal(reader.calendarSpecialEventReading(event, loaded), aliasBody, 'Every supported exact legacy alias preserves its entire unit.');
      const aliasRow = aliasPublish.payload.rows[0];
      assert.equal((await store.invoke('PATCH', { id: aliasRow.id, expectedUpdatedAt: aliasRow.updated_at, status: 'ARCHIVED' })).status, 200);
      // Explicit key retirement is the authoritative reader signal, including
      // warm clients that retained an older complete row.
      const retirement = await store.invoke('POST', { contentKey: key, action: 'retire', id: aliasRow.id, expectedUpdatedAt: store.rows.get(aliasRow.id).updated_at }, '/api/admin/content-publication');
      assert.equal(retirement.status, 200, JSON.stringify(retirement.payload));
      const retiredRead = await store.invoke('POST', { keys: [key] }, '/api/content-reader');
      reader.installContentPublications(retiredRead.payload.publications);
      assert.equal(reader.calendarSpecialEventReading(event, loaded), null, 'Retirement withdraws warm exact-event content.');
    }
    if (kind === 'ingress') {
      const datedKey = reader.calendarEventArticleSourceKeys(event)[0];
      // Restore only this version through the real explicit publication action.
      const datedRow = [...store.rows.values()].find((value: any) => value.content_key === datedKey)!;
      const restore = await store.invoke('PATCH', { id: datedRow.id, expectedUpdatedAt: datedRow.updated_at, ownerAction: 'publish-owner-content' });
      assert.equal(restore.status, 200, JSON.stringify(restore.payload));
      const restoredRead = await store.invoke('POST', { keys: [datedKey] }, '/api/content-reader');
      reader.installContentPublications(restoredRead.payload.publications);
      const dated = await reader.loadLiveGeneratedContentForKeys([datedKey], { requireFresh: true });
      assert.equal(reader.calendarSpecialEventReading(event, new Map([...content, ...dated])), datedRow.body, 'The exact dated unit precedes the reusable unit after explicit restoration.');
    }
  }
  const originalFetch=globalThis.fetch;
  for(const [kind,direction] of [['ingress','direct'],['station','direct'],['station','retrograde']] as const){
    const legacyStore=await createApiStore([],{uuidIds:true,sqlCalendarLifecycle:true});
    try{
      const {id:_,...draft}=calendarPlanetaryDraft(kind,{planet:'venus',sign:'libra',direction})!;
      const body=`Synthetic complete legacy ${kind} opening.\n\nThe final paragraph belongs to the same whole source unit.`;
      const created=await legacyStore.invoke('POST',{...draft,blockType:null,eventType:kind,body});
      assert.equal(created.status,200,JSON.stringify(created.payload));
      const source=created.payload.rows[0];
      const published=await legacyStore.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,ownerAction:'publish-owner-content'});
      assert.equal(published.status,200,JSON.stringify(published.payload));
      const response=await legacyStore.invoke('POST',{keys:[draft.contentKey]},'/api/content-reader');
      assert.equal(response.payload.rows.length,1,'The actual public handler exposes the published legacy fixture');
      reader.installContentPublications(response.payload.publications);
      const content=await reader.loadLiveGeneratedContentForKeys([draft.contentKey],{requireFresh:true});
      const event={id:`legacy-${kind}-${direction}`,type:kind,title:draft.headline,planet:'Venus',sign:'Libra',
        ...(kind==='ingress'?{fromSign:'Virgo',toSign:'Libra'}:{direction,phase:`station-${direction}`}),startsAt:'2026-09-30T12:00:00Z',dateKey:'2026-09-30'};
      const selected=content.get(draft.contentKey);
      assert.equal(selected?.body,body,'The reader admits the exact published fixture version');
      assert.equal(reader.normalizeCalendarEventSurface(event,selected,'Today',null,null,null,content).sections[0]?.body,body,'A complete exact legacy Calendar unit retains its final paragraph in the card');
      assert.equal(reader.calendarSpecialEventReading(event,content),body);
      const short='Synthetic separately authored Calendar summary.';
      const summarized={...selected,summary:short};
      assert.equal(reader.normalizeCalendarEventSurface(event,summarized,'Today',null,null,null,content).sections[0]?.body,short,'A separate summary remains its own card unit');
      assert.equal(reader.calendarSpecialEventReading(event,new Map([[draft.contentKey,summarized]])),body,'The detail retains the complete body when a separate summary exists');
    }finally{await legacyStore.close();globalThis.fetch=originalFetch;}
  }
  const lilithFixture=JSON.parse(readFileSync('tests/fixtures/calendar-sky-event-cases.json','utf8')).find((sample:any)=>sample.key==='station/Lilith/retrograde').event;
  const calculated=await getCalendarSkyEventSnapshot({label:'Synthetic reference',latitude:40.7128,longitude:-74.006,timeZone:'America/New_York'},calendarSkyEventRoute(lilithFixture));
  assert(calculated,'The independent station recovery uses a genuinely calculated event.');
  const failure=async()=>{throw Error('Synthetic canonical discovery outage');};
  const unrelatedLunations=async()=>{throw Error('An independent station must not load unrelated lunations');};
  const floor=await reader.prepareCalendarSkyEventContent(calculated,new Map(),failure,unrelatedLunations);
  assert.equal(floor.content.size,0,'Independent discovery recovers without admitting any unverified event row; the browser verifies its canonical full body.');
  const specialStore=await createApiStore([],{uuidIds:true,sqlCalendarLifecycle:true});
  try{
    const selection={planet:'lilith',sign:calculated.event.sign.toLowerCase(),direction:'retrograde' as const};
    const {id:_,...draft}=calendarPlanetaryDraft('station',selection)!;
    const body='Synthetic exact Lilith station opening.\n\nComplete synthetic station final paragraph.';
    let created=await specialStore.invoke('POST',{...draft,eventType:'calendar_event',targetDate:calculated.event.dateKey,body});
    assert.equal(created.status,200,JSON.stringify(created.payload));let row=created.payload.rows[0];
    let published=await specialStore.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'});
    assert.equal(published.status,200,JSON.stringify(published.payload));
    let response=await specialStore.invoke('POST',{keys:[draft.contentKey]},'/api/content-reader');reader.installContentPublications(response.payload.publications);
    const existing=await reader.loadLiveGeneratedContentForKeys([draft.contentKey],{requireFresh:true});
    await assert.rejects(()=>reader.prepareCalendarSkyEventContent(calculated,existing,failure,unrelatedLunations),/Synthetic canonical discovery outage/,'A known date-bound source cannot be replaced by the independent floor.');
    const exact=await reader.prepareCalendarSkyEventContent(calculated,new Map(),reader.loadLiveGeneratedContentForKeys,unrelatedLunations);
    assert.equal(reader.calendarSpecialEventReading(calculated.event,exact.content),body);
    created=await specialStore.invoke('POST',{...draft,eventType:'calendar_event',targetDate:null,body});
    assert.equal(created.status,200,JSON.stringify(created.payload));row=created.payload.rows[0];
    published=await specialStore.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'});
    assert.equal(published.status,200,JSON.stringify(published.payload));
    response=await specialStore.invoke('POST',{keys:[draft.contentKey]},'/api/content-reader');reader.installContentPublications(response.payload.publications);
    await assert.rejects(()=>reader.prepareCalendarSkyEventContent(calculated,new Map(),failure,unrelatedLunations),/Synthetic canonical discovery outage/,'A pinned source remains required even when it has not finished loading.');
  }finally{await specialStore.close();globalThis.fetch=originalFetch;}
  const datedStore=await createApiStore([],{uuidIds:true,sqlCalendarLifecycle:true});
  try{
    for(const [kind,direction] of [['ingress','direct'],['station','direct'],['station','retrograde']] as const){
      const {id:_,...draft}=calendarPlanetaryDraft(kind,{planet:'mars',sign:'virgo',direction})!;
      const event={id:`dated-${kind}-${direction}`,type:kind,title:draft.headline,planet:'Mars',sign:'Virgo',
        ...(kind==='ingress'?{fromSign:'Leo',toSign:'Virgo'}:{direction,phase:`station-${direction}`}),startsAt:'2027-01-10T12:00:00Z',dateKey:'2027-01-10'};
      const body=`Synthetic dated ${kind} opening.\n\nComplete dated ${direction} final paragraph.`;
      const created=await datedStore.invoke('POST',{...draft,eventType:'calendar_event',targetDate:event.dateKey,body});
      assert.equal(created.status,200,JSON.stringify(created.payload));let row=created.payload.rows[0];
      const published=await datedStore.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'});
      assert.equal(published.status,200,JSON.stringify(published.payload));row=published.payload.rows[0];
      const response=await datedStore.invoke('POST',{keys:[draft.contentKey]},'/api/content-reader');
      assert.equal(response.payload.rows[0].body,body);reader.installContentPublications(response.payload.publications);
      const loaded=await reader.loadLiveGeneratedContentForKeys([draft.contentKey],{requireFresh:true});
      assert.equal(reader.calendarSpecialEventReading(event,loaded),null,'A pinless dated row needs fresh route proof, not an arbitrary cached map.');
      const stale=new Map([[draft.contentKey,{...loaded.get(draft.contentKey),body:'Synthetic obsolete cached body.'}]]);
      let requests=0;
      const fetchFresh=async(keys:string[],options:any)=>{
        requests++;assert.equal(options.requireFresh,true);assert.equal(new Set(keys).size,keys.length);
        return reader.loadLiveGeneratedContentForKeys(keys,options);
      };
      const fresh=await reader.loadCalendarEventArticleContent(event,stale,[draft.contentKey,draft.contentKey],fetchFresh);
      assert.equal(requests,1,'The cold exact route performs one deduplicated canonical read.');
      assert.equal(reader.calendarSpecialEventReading(event,fresh),body);
      assert.equal(reader.liveCalendarEventContent(fresh,event)?.body,body);
      assert.equal(reader.calendarSpecialEventReading({...event,dateKey:'2027-01-11'},fresh),null);
      requests=0;await reader.loadCalendarEventArticleContent(event,fresh,[draft.contentKey],fetchFresh);
      assert.equal(requests,1,'A later pinless route revalidates even a previously verified object.');
      const liveFetch=globalThis.fetch;
      for(const reason of [new Error('Synthetic offline reader'),new DOMException('Synthetic aborted reader','AbortError')]){
        try{
          globalThis.fetch=async()=>{throw reason;};
          await assert.rejects(()=>reader.loadCalendarEventArticleContent(event,stale,[draft.contentKey],fetchFresh));
          assert.equal(reader.calendarSpecialEventReading(event,stale),null,'Failed fresh reads never authorize the offline/stale map.');
        }finally{globalThis.fetch=liveFetch;}
      }
      // Retirement belongs to reusable keys; create its own isolated counterpart
      // rather than sending an unsupported dated-instance retirement request.
      const reusable=await datedStore.invoke('POST',{...draft,eventType:'calendar_event',targetDate:null,body:'Synthetic reusable counterpart opening.\n\nComplete reusable counterpart final paragraph.'});
      assert.equal(reusable.status,200,JSON.stringify(reusable.payload));const reuse=reusable.payload.rows[0];
      const reused=await datedStore.invoke('PATCH',{id:reuse.id,expectedUpdatedAt:reuse.updated_at,ownerAction:'publish-owner-content'});
      assert.equal(reused.status,200,JSON.stringify(reused.payload));const reuseLive=reused.payload.rows[0];
      const pinned=await datedStore.invoke('POST',{keys:[draft.contentKey]},'/api/content-reader');reader.installContentPublications(pinned.payload.publications);
      assert.equal(reader.calendarSpecialEventReading(event,fresh),null,'A mismatched reusable pin overrides dated fresh proof.');
      const retired=await datedStore.invoke('POST',{contentKey:draft.contentKey,action:'retire',id:reuseLive.id,expectedUpdatedAt:reuseLive.updated_at},'/api/admin/content-publication');
      assert.equal(retired.status,200,JSON.stringify(retired.payload));
      const after=await datedStore.invoke('POST',{keys:[draft.contentKey]},'/api/content-reader');reader.installContentPublications(after.payload.publications);
      assert.equal(reader.calendarSpecialEventReading(event,fresh),null,'Retirement overrides even a freshly verified dated object.');
      const retirement=after.payload.publications.find((record:any)=>record.content_key===draft.contentKey);
      reader.installContentPublications([{...retirement,state:'live',row_id:null,row_updated_at:null,revision:Number(retirement.revision)+1}]);
      assert.equal(reader.contentPublication(draft.contentKey)?.state,'live');assert.equal(reader.contentPublication(draft.contentKey)?.row_id,null);
      assert.equal(reader.calendarSpecialEventReading(event,fresh),null,'Explicit baseline reset remains authoritative.');
    }
  }finally{await datedStore.close();globalThis.fetch=originalFetch;}
  const governedStore=await createApiStore([],{uuidIds:true,sqlCalendarLifecycle:true});
  try{
    for(const sample of governedCalendarCases){
      const source=await publishGovernedCalendarFixture(governedStore.invoke,sample);
      const result=await governedStore.invoke('POST',{keys:[sample.key]},'/api/content-reader');
      assert(result.payload.publications.some((publication:any)=>publication.content_key===sample.key&&publication.row_id===source.id));
      reader.installContentPublications(result.payload.publications);
      const content=await reader.loadLiveGeneratedContentForKeys([sample.key],{requireFresh:true});
      assert.equal(reader.normalizeCalendarEventSurface(sample.event,content.get(sample.key),'Today',null,null,null,content).sections[0]?.body,sample.body,'A governed import retains its entire unit on the Calendar card');
      assert.equal(reader.calendarSpecialEventReading(sample.event,content),sample.body,'A governed import opens the same complete Sky unit');
    }
  }finally{await governedStore.close();globalThis.fetch=originalFetch;}
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
