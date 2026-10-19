import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeContentPublications, installContentPublications, publicationAllowsContent, isContentRetired } from '../apps/web/src/content/contentPublicationState.ts';
import { createFallbackRenderer as browserFactory } from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts';
import { createFallbackRenderer as shippedFactory } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import { createTransitSynastryRenderer as browserTransitFactory } from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts';
import { createTransitSynastryRenderer as shippedTransitFactory, createPackageManifest } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import * as nodeTransit from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs';
import * as nodeResolver from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs';
const key = 'fallback-hook/natal-you-placement-sign-final/uranus/scorpio';
const record = { content_key:key, state:'live' as const, revision:1, row_id:'source-a',row_updated_at:'2026-09-07T18:00:00Z', updated_at:'2026-09-07T18:00:00Z' };
const retired = {...record,state:'retired' as const,revision:2};
const snapshot = new Map();
assert.equal(mergeContentPublications(snapshot,[retired]),true);
assert.equal(mergeContentPublications(snapshot,[record]),false);
assert.equal(mergeContentPublications(snapshot,[]),false);
assert.equal(snapshot.get(key).state,'retired');
installContentPublications([record]);
assert.equal(publicationAllowsContent(key),false,'Bundled copy cannot substitute for a newer Studio publication');
assert.equal(publicationAllowsContent(key,'source-a',record.row_updated_at),true);
assert.equal(publicationAllowsContent(key,'dated-row',record.row_updated_at,'2026-09-08'),true,'Dated content keeps date-scoped version selection');
installContentPublications([retired]);
assert.equal(isContentRetired(key),true);
assert.equal(publicationAllowsContent(key,'source-a',record.row_updated_at),false);
const root = new URL('../apps/web/src/content/fallbackArchitectureV3/',import.meta.url);
const templates = JSON.parse(readFileSync(new URL('templates/fallback-templates-v3.json',root),'utf8'));
const rows = JSON.parse(readFileSync(new URL('source-rows/fallback-source-rows-v3.json',root),'utf8'));
const facts={planet:'uranus',sign:'scorpio',house:6};
for (const [name,factory] of [['browser source',browserFactory],['shipped artifact',shippedFactory]] as const) {
 const reader=factory(templates,rows,{blockedContentKeys:[key]});
 assert.throws(()=>reader.renderNatalPlacement(facts), /Publication unavailable/,name+' must not assemble old copy after retirement');
}
nodeResolver.setNodeBlockedContentKeys([key]);
assert.throws(()=>nodeResolver.renderNatalPlacement(facts),/Publication unavailable/,'Node retirement parity');
nodeResolver.setNodeBlockedContentKeys([]);
installContentPublications([{...record,revision:3}]);
assert.equal(publicationAllowsContent(key,'source-a',record.row_updated_at),true,'Only a newer explicit publication restores the key');
console.log('PASS monotonic offline publication records, no older bundle substitution, terminal Node/browser/dist retirement, explicit republish');

const transitLib = JSON.parse(readFileSync(new URL('source-rows/transit-synastry-rows-v1.json', root),'utf8'));
const transitKey='authored/transit-aspect/chiron/jupiter/hard';
for (const factory of [browserTransitFactory, shippedTransitFactory]) {
 const reader=factory(transitLib,templates,rows,{blockedContentKeys:[transitKey]});
 assert.throws(()=>reader.renderTransitAspect({transiting:'chiron',natal:'jupiter',aspect:'square',voice:'you'}),/Publication unavailable/);
}
nodeTransit.setNodeBlockedContentKeys([transitKey]);
assert.throws(()=>nodeTransit.renderTransitAspect({transiting:'chiron',natal:'jupiter',aspect:'square',voice:'you'}),/Publication unavailable/);
nodeTransit.setNodeBlockedContentKeys([]);
const bundle={transitLib:{authoredCards:[]},templatesFile:{templates:[]},rowsFile:{hookRows:[{contentKey:'test',body_you:'QA',review_status:'approved'}],vocabularyRows:[]}};
const marked=structuredClone(bundle);Object.assign(marked.rowsFile.hookRows[0],{publicationRowId:'a',publicationRowUpdatedAt:record.row_updated_at});
assert.equal(createPackageManifest(bundle).contentHash,createPackageManifest(marked).contentHash,'Lifecycle identities do not change source-content checksums');
installContentPublications([{...record,revision:4,row_updated_at:'2026-09-07T18:00:00.123456Z'}]);
assert.equal(publicationAllowsContent(key,'source-a','2026-09-07T18:00:00.123455Z'),false,'Sub-millisecond edits cannot share a publication identity');
assert.equal(publicationAllowsContent(key,'source-a','2026-09-07T18:00:00.123456+00:00'),true);
console.log('PASS Chiron terminal retirement across Node/browser/dist, stable content hashes, and PostgreSQL microsecond identity');

const {renderNatalPlacementPreviewState,normalizeNatalPlacementPreviewInput}=await import('../api/admin/natal-placement-preview.ts');
assert.throws(()=>renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({planet:'uranus',sign:'scorpio',house:'6',audience:'you',overrides:[]}),[retired]),/Publication unavailable/,'Studio reader preview cannot resurrect retired bundled copy');
console.log('PASS server-side Studio preview retirement');

const {contentLiveStatuses,servingPackageRecords}=await import('../api/_lib/content-live-status.ts');
const skyManifest=JSON.parse(readFileSync(new URL('bundled-sky-placement-manifest-v3.json',root),'utf8'));
const skyRecords=['bundled-sky-placement-rows-v3.json','bundled-sky-placement-house-rows-v3.json'].flatMap(file=>JSON.parse(readFileSync(new URL(file,root),'utf8')).hookRows);
const skyRows=skyRecords.map((record:any,index:number)=>({id:`sky-${index}`,content_key:record.contentKey,status:'LIVE',lane:'serving',review_state:null,provider:'tldrastro-fallback-architecture-v3-sky-placement',body:record.body_you??record.body,updated_at:'2026-09-07T18:00:00Z',sections:{packageRecord:record},source_snapshot:{packageVersion:'v3-2026-09-07a',packagePartitionContentHash:skyManifest.contentHash,packagePartitionKeyManifestHash:skyManifest.keyManifestHash,packagePartitionKeyCount:skyManifest.keyCount,distributionState:'serving',content_role:record.content_role,review_status:record.review_status}}));
const current=contentLiveStatuses(skyRows,skyRows,()=>true,()=>true).filter(status=>status.source==='studio');
assert(current.length>900,'Individually published Sky writing is independent of the obsolete bulk mirror');
const first=skyRows.find(row=>row.id===current[0].id)!, otherSky=skyRows.find(row=>row.id===current[1].id)!;
assert.notEqual(contentLiveStatuses([first],skyRows)[0].source,'studio','An obsolete mirror cannot establish publication');
assert.equal(contentLiveStatuses([otherSky],skyRows,row=>row.id!==first.id,row=>row.id===otherSky.id)[0].source,'studio','Retiring one source must not affect another current publication');
const {publicationBootstrap}=await import('./seed-content-publications.mts');
assert.equal(publicationBootstrap(skyRows).selected.length,0,'Raw LIVE flags on obsolete mirrors must not become canonical publications');
console.log('PASS independent Sky publication, retirement isolation, and rejection of obsolete mirror bootstrap');

const macroKey='authored/sky-lunation-macro/new-moon/virgo';
const macroRecord=servingPackageRecords.get(macroKey)!;
const older={id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',content_key:macroKey,status:'LIVE',lane:'serving',review_state:null,provider:'tldrastro-fallback-architecture-v3',updated_at:'2026-09-07T17:00:00Z',body:'QA saved current body.',sections:{packageRecord:{...macroRecord,body:'QA obsolete mirrored body.'}},source_snapshot:{contentType:'authored-content'}};
const newer={...older,id:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',updated_at:'2026-09-07T18:00:00Z'};
assert.equal(contentLiveStatuses([older],[older,newer])[0].servingRowId,newer.id,'Equal copy does not make an older source the selected publication');
assert.equal(publicationBootstrap([older,newer]).selected[0]?.id,newer.id,'Bootstrap follows the actual selected source and reader body normalization');
console.log('PASS authored body normalization and canonical identity selection during bootstrap');

installContentPublications([{...record,content_key:'__content-publication-ledger/v1',row_id:null,row_updated_at:null,revision:100}]);
assert.equal(publicationAllowsContent('new-import','unregistered',record.updated_at),false,'Imports require explicit publication after initialization');
assert.equal(publicationAllowsContent('new-import'),true,'Static baseline remains available without an override');
assert.equal(publicationAllowsContent('new-import','dated',record.updated_at,'2026-09-09'),true,'Dated instances retain their own selection');
installContentPublications([]);
assert.equal(publicationAllowsContent('new-import','unregistered',record.updated_at),false,'An older snapshot cannot undo initialization');

const { skyDailySummaryParts } = await import('../apps/web/src/content/skyDailySummary.ts');
const summaryFacts = { sun: { sign: 'Virgo' }, moon: { sign: 'Cancer' }, moonIsVoid: true, voidRemainingLabel: '20 minutes', retrogradePlanets: ['Saturn', 'Chiron'], event: { name: 'New Moon', sign: 'Virgo', countdown: 'in 3 days' } };
const summaryText = (content?: any) => skyDailySummaryParts(summaryFacts, content).map(part => part.text).join('');
const summaryBaseline=summaryText();
assert.match(summaryBaseline, /daily rituals/);
const summaryKeys = ['cms/sky-daily-summary/sun/virgo', 'cms/sky-daily-summary/retrograde', 'cms/sky-daily-summary/voidRemaining', 'cms/sky-daily-summary/lunation'];
for (const content_key of summaryKeys) installContentPublications([{ ...retired, content_key, revision: 20 }]);
assert.doesNotMatch(summaryText(), /daily rituals|retrograde|void of course|New Moon/);
assert.match(summaryText(), /Sun is in Virgo/);
assert.match(summaryText(), /pulls us home to the places, people, and memories that nurture us/);
const summaryKey = summaryKeys[0];
installContentPublications([{ ...record, content_key: summaryKey, revision: 21 }]);
assert.doesNotMatch(summaryText(), /daily rituals/, 'An unavailable publication cannot reveal older local summary prose');
assert.doesNotMatch(summaryText(new Map([[summaryKey, { id: 'older-source', updatedAt: record.row_updated_at, status: 'LIVE', body: 'QA stale summary' }]])), /QA stale summary/);
assert.match(summaryText(new Map([[summaryKey, { id: record.row_id, updatedAt: record.row_updated_at, status: 'LIVE', body: 'QA republished summary' }]])), /QA republished summary/);
console.log('PASS Daily Sky retirement, unavailable publication, republish, and isolation of unrelated writing');

const { skySummaryEventFacts } = await import('../apps/web/src/content/skySummaryEvents.ts');
const ingressKey = 'cms/sky-daily-summary/ingress/mercury/libra';
const ingressEvent = { id: 'qa-ingress', type: 'ingress', planet: 'Mercury', toSign: 'Libra', sign: 'Libra', dateKey: '2026-09-07' };
const olderIngress = { id: 'older-ingress', contentKey: 'sky.ingress.mercury.libra', status: 'LIVE', summary: 'QA older ingress TLDR', body: 'QA older article' };
const ingressContent = new Map<string, any>([['sky.ingress.mercury.libra', olderIngress]]);
const ingressFacts = () => skySummaryEventFacts([ingressEvent as any], ingressContent).ingresses[0];
const ingressBaseline=ingressFacts();
installContentPublications([{ ...retired, content_key: ingressKey, revision: 30 }]);
assert.equal(ingressFacts().tldr, undefined, 'Retired ingress wording cannot reveal an older article TLDR');
assert.equal(ingressFacts().label, 'Mercury enters Libra', 'Retirement preserves the calculated ingress');
installContentPublications([{ ...record, content_key: ingressKey, revision: 31 }]);
assert.equal(ingressFacts().tldr, undefined, 'A missing current ingress publication blocks older fallback writing');
ingressContent.set(ingressKey, { id: record.row_id, updatedAt: record.row_updated_at, status: 'LIVE', body: 'QA current ingress TLDR' });
assert.equal(ingressFacts().tldr, 'QA current ingress TLDR');
console.log('PASS ingress-summary retirement, unavailable publication, and current publication identity');

const { skyPlacementPublicationIdentity } = await import('../apps/web/src/services/skyPlacementPublicationGuard.ts');
for (const content_key of ['sky-article/sun/libra/2026/2026-09-22', 'sky-season-fallback/libra-2026/moon/sagittarius/2026-10-13', 'sky.aspect.sun.trine.pluto', 'sky.aspect.sun.trine.pluto.libra.aquarius']) {
  installContentPublications([{ ...record, content_key, revision: 50 }]);
  const initialIdentity = skyPlacementPublicationIdentity();
  installContentPublications([{ ...record, content_key, revision: 51, row_updated_at: '2026-10-14T12:00:00Z' }]);
  const revisedIdentity = skyPlacementPublicationIdentity();
  assert.notEqual(revisedIdentity, initialIdentity, 'A published article revision invalidates stale placement cards');
  installContentPublications([{ ...record, content_key: 'article/guide/synthetic', revision: 100 }]);
  assert.equal(skyPlacementPublicationIdentity(), revisedIdentity, 'An unrelated guide does not reload Sky copy');
  installContentPublications([{ ...retired, content_key, revision: 52 }]);
  assert.notEqual(skyPlacementPublicationIdentity(), revisedIdentity, 'Retirement invalidates the previous published article');
}
console.log('PASS dated and seasonal Sky article publication identity, refresh, retirement, and guide isolation');

{
  const content_key = 'sky.aspect.sun.trine.pluto';
  installContentPublications([{ ...record, content_key, revision: 60, row_updated_at: '2026-10-14T12:00:00.123456Z' }]);
  const before = skyPlacementPublicationIdentity();
  installContentPublications([{ ...record, content_key, revision: 61, row_updated_at: '2026-10-14T12:00:00.123457Z' }]);
  assert.notEqual(skyPlacementPublicationIdentity(), before, 'One-microsecond current aspect changes invalidate the existing placement owner.');
}
console.log('PASS exact Sky aspect publication identity, microseconds, retirement and unrelated-guide isolation.');

// Exercise the actual app owner and its shipped data/factory, not a hand-built renderer.
{
  const {createHash} = await import('node:crypto');
  const runtime = await import('../apps/web/src/content/fallbackArchitectureV3Runtime.ts');
  await runtime.loadDeferredFallbackArchitectureV3Bundle();
  const cases = [
    {key:'fallback-hook/natal-aspect-lived/sun/conjunction/moon', render:()=>runtime.fallbackRendererV3.renderNatalAspect({planetA:'sun',planetB:'moon',aspect:'conjunction',voice:'you'})},
    {key:'fallback-hook/natal-you-placement-complete-final/sun/aquarius/9', render:()=>runtime.fallbackRendererV3.renderNatalPlacement({planet:'sun',sign:'aquarius',house:9,voice:'you'})}
  ];
  const digest = (body:string) => createHash('sha256').update(body).digest('hex');
  for (const entry of cases) {
    const before=digest(entry.render().body);
    // These exact baselines are factory-owned rather than hook rows in the JSON partition.
    // Install a distinct synthetic version through the same runtime overlay interface.
    const cached={contentKey:entry.key,content_role:'full_copy',review_status:'approved',reader_only:true,render_policy:'reader-only-exact-lived-v1',body:'Synthetic cached versioned passage remains distinct.',body_you:'Synthetic cached versioned passage remains distinct.',body_they:'Synthetic cached versioned passage remains distinct.',approval:{approvalLevel:'exact_owner_approved',recordPath:'fixture:baseline-reset',payloadSha256:'a'.repeat(64),approvedAt:record.row_updated_at},publicationRowId:'cached-qa',publicationRowUpdatedAt:record.row_updated_at};
    const overlay={transitLib:{authoredCards:[]},templatesFile:{templates:[]},rowsFile:{hookRows:[cached],vocabularyRows:[]}};
    installContentPublications([{...record,content_key:entry.key,revision:9999,row_id:'cached-qa'}]);
    runtime.installFallbackArchitectureV3Bundle(overlay);
    assert.match(entry.render().body,/Synthetic cached versioned passage/,'Actual installed overlay is active before reset');
    const tombstone={...retired,content_key:entry.key,revision:10000};
    installContentPublications([tombstone]);
    assert.throws(entry.render,/Publication unavailable/);
    const reset={...tombstone,state:'live' as const,revision:10001,row_id:null,row_updated_at:null};
    installContentPublications([reset]);
    assert.equal(digest(entry.render().body),before,'Explicit reset restores the identical approved runtime baseline');
    runtime.installFallbackArchitectureV3Bundle(overlay);
    assert.equal(digest(entry.render().body),before,'Reinstalling a stale cached overlay cannot displace the baseline after reset');
    assert.equal(publicationAllowsContent(entry.key,'cached-qa',record.row_updated_at),false,'Cached versioned QA cannot survive a baseline reset');
    assert.equal(publicationAllowsContent(entry.key,null,record.row_updated_at),false,'Partial null identity is not baseline copy');
    installContentPublications([tombstone],'complete-live');
    assert.equal(digest(entry.render().body),before,'Lower-revision offline/complete snapshots cannot replay retirement');
    installContentPublications([{...reset,revision:9999}]);
    assert.equal(digest(entry.render().body),before,'Lower-revision reset cannot change current state');
    installContentPublications([{...reset,revision:10002,row_id:'missing-exact',row_updated_at:record.row_updated_at}]);
    assert.throws(entry.render,/Publication unavailable/,'Missing pinned LIVE remains fail-closed');
    installContentPublications([{...reset,revision:10003,row_id:'mismatched',row_updated_at:null}]);
    assert.throws(entry.render,/Publication unavailable/,'Mismatched null publication remains fail-closed');
    installContentPublications([{...reset,revision:10004}]);
    assert.equal(digest(entry.render().body),before);
    installContentPublications([{...tombstone,revision:10005}]);
    installContentPublications([{...reset,revision:10004}],'complete-live');
    assert.throws(entry.render,/Publication unavailable/,'An older reset cannot undo a newer retirement');
    installContentPublications([{...reset,revision:10006}]);
    runtime.installFallbackArchitectureV3Bundle(null);
    assert.equal(digest(entry.render().body),before,'Removing the rejected overlay preserves the identical baseline');
  }
}

// Baseline resets apply at the actual CMS, lunar and Sky selection boundaries.
{
  const {createServer}=await import('vite');
  const vite=await createServer({configFile:false,envFile:false,root:process.cwd(),server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
  try {
  const {installContentPublications,publicationAllowsContent}=await vite.ssrLoadModule('/apps/web/src/content/contentPublicationState.ts');
  const {skyDailySummaryParts}=await vite.ssrLoadModule('/apps/web/src/content/skyDailySummary.ts');
  const summaryText=(content?:any)=>skyDailySummaryParts(summaryFacts,content).map((part:any)=>part.text).join('');
  const summaryBaseline=summaryText();
  const {skySummaryEventFacts}=await vite.ssrLoadModule('/apps/web/src/content/skySummaryEvents.ts');
  const ingressContent=new Map([[olderIngress.contentKey,olderIngress]]);
  const ingressFacts=()=>skySummaryEventFacts([ingressEvent],ingressContent).ingresses[0];
  const ingressBaseline=ingressFacts();
  const {resolveCmsSurfaceOverride}=await vite.ssrLoadModule('/apps/web/src/content/cmsSurfaceOverrides.ts');
  const {resolveLunationReaderSource,lunationReaderContentKeys}=await vite.ssrLoadModule('/apps/web/src/content/lunationReaderSource.ts');
  const runtime=await vite.ssrLoadModule('/apps/web/src/content/fallbackArchitectureV3Runtime.ts');
  await runtime.loadLunationBookFallbackArchitectureV3Bundle();
  const specific='cms/baseline-reset/specific',generic='cms/baseline-reset/generic';
  const baseline={contentKey:generic,id:null,updatedAt:null,status:'LIVE',body:'Synthetic unversioned baseline.',paragraphs:['Synthetic unversioned baseline.']};
  const stale={...baseline,contentKey:specific,id:'cached-qa',updatedAt:record.row_updated_at,targetDate:'2031-04-07',body:'Synthetic stale dated override.',paragraphs:['Synthetic stale dated override.']};
  const content=new Map([[generic,baseline],[specific,stale]]) as any;
  const keys=[specific,generic];
  const reset=(content_key:string,revision:number)=>({...record,content_key,revision,row_id:null,row_updated_at:null});
  installContentPublications([{...retired,content_key:specific,revision:20000}]);
  assert.equal(resolveCmsSurfaceOverride(content,keys)?.unavailable,true);
  installContentPublications([{...record,content_key:specific,revision:20001}]);
  assert.equal(resolveCmsSurfaceOverride(undefined,keys)?.unavailable,true,'Missing pinned CMS publication is terminal');
  installContentPublications([reset(specific,20002)]);
  assert.equal(resolveCmsSurfaceOverride(content,keys)?.body,baseline.body);
  assert.equal(publicationAllowsContent(specific,stale.id,stale.updatedAt,stale.targetDate),false,'Reset rejects versioned dated QA');
  const event={startsAt:'2031-04-07T12:00:00Z',phase:'full-moon',title:'Full Moon',sign:'Libra'};
  const lunarKeys=lunationReaderContentKeys(event);
  const lunarBaseline=resolveLunationReaderSource(event);
  assert(lunarBaseline?.body,'Actual reusable lunar baseline is available');
  const hash=(body:string)=>createPackageManifest({transitLib:{authoredCards:[]},templatesFile:{templates:[]},rowsFile:{hookRows:[{contentKey:'fixture',body_you:body}],vocabularyRows:[]}}).contentHash;
  const lunarHash=hash(lunarBaseline.body);
  const lunarRows=new Map(lunarKeys.map(contentKey=>[contentKey,{...stale,contentKey}])) as any;
  for(const content_key of lunarKeys)installContentPublications([{...retired,content_key,revision:20000}]);
  assert.equal(resolveLunationReaderSource(event,lunarRows)?.unavailable,true);
  for(const content_key of lunarKeys)installContentPublications([{...record,content_key,revision:20001}]);
  assert.equal(resolveLunationReaderSource(event)?.unavailable,true,'Missing pinned lunar publication is terminal');
  for(const content_key of lunarKeys)installContentPublications([reset(content_key,20002)]);
  assert.equal(hash(resolveLunationReaderSource(event,lunarRows)!.body),lunarHash,'Dated and reusable resets restore identical actual lunar baseline');
  const {publishedPassageSources,calendarStudioMoonSources}=await vite.ssrLoadModule('/apps/admin/src/calendarPassageSources.ts');
  const reusable=lunarKeys.find(key=>key.startsWith('authored/'))!;
  const packageRecord=servingPackageRecords.get(reusable)!;
  assert(packageRecord,'Actual lunar package record is available to Studio');
  const packageBody=packageRecord.body_you??packageRecord.body??packageRecord.text;
  const packageRow={id:`package:${reusable}`,content_key:reusable,body:packageBody,status:'LIVE',lane:'serving',surface:'calendar',mode:'article',review_state:null,sections:{packageRecord},source_snapshot:{contentType:'authored-content'}};
  const studioRows=publishedPassageSources([packageRow,...lunarKeys.map(content_key=>({...stale,id:'cached-qa',content_key,updated_at:stale.updatedAt,target_date:stale.targetDate,sections:{},surface:'calendar',mode:'article',lane:'serving',review_state:null}))] as any);
  assert.equal(studioRows.has(lunarKeys[0]),false,'Studio excludes the dated QA override after reset');
  assert.equal(studioRows.get(reusable)?.body,packageBody,'Studio accepts the identical verified package baseline after reset');
  const options=calendarStudioMoonSources(studioRows).calendarMoonFallbackOptions({events:[{...event,type:'lunation'}]} as any,{moonSign:'Libra',moonPhase:'Full Moon',nextMoonSign:'',seasonName:'',exactFullMoon:true} as any,studioRows);
  assert.equal(options.exactLunationCopy?.body,packageBody,'Actual Studio lunar selector reaches reusable baseline after dated reset');
  installContentPublications([{...retired,content_key:reusable,revision:20003}]);
  assert.equal(publishedPassageSources([packageRow] as any).has(reusable),false,'Retired package remains excluded');
  installContentPublications([{...record,content_key:reusable,revision:20004}]);
  assert.equal(publishedPassageSources([packageRow] as any).has(reusable),false,'Pinned publication cannot admit package substitute');
  installContentPublications([reset(reusable,20005)]);

  const cachedSummaryBody='Synthetic verified summary cache marker remains distinct.';
  installContentPublications([{...record,content_key:summaryKey,revision:20001}]);
  const cachedSummary=new Map([[summaryKey,{...stale,contentKey:summaryKey,id:record.row_id,updatedAt:record.row_updated_at,targetDate:null,body:cachedSummaryBody}]]) as any;
  assert.match(summaryText(cachedSummary),/Synthetic verified summary cache marker/,'Matching pinned summary enters this Vite graph');
  assert.match(summaryText(new Map()),/Synthetic verified summary cache marker/,'The same graph retains its verified cache across empty hydration');
  for(const content_key of summaryKeys)installContentPublications([reset(content_key,20002)]);
  const staleSummary=new Map(summaryKeys.map(contentKey=>[contentKey,{...stale,contentKey}])) as any;
  assert.equal(summaryText(staleSummary),summaryBaseline,'Sky reset restores baseline, excluding both cached and supplied QA');
  assert.equal(summaryText(new Map()),summaryBaseline,'Reset clears the verified cache in this graph even with empty hydration');
  const {missingPublishedSkySummaryKeys}=await vite.ssrLoadModule('/apps/web/src/features/sky/skySummarySources.ts');
  assert.deepEqual(missingPublishedSkySummaryKeys(summaryKeys,staleSummary),[],'Reset requires no versioned summary row to become ready');
  installContentPublications([{...record,content_key:summaryKey,revision:20003}]);
  assert.deepEqual(missingPublishedSkySummaryKeys([summaryKey],new Map()),[summaryKey],'Ordinary pinned summary still requires its row');
  installContentPublications([reset(summaryKey,20004)]);

  installContentPublications([reset(ingressKey,20002)]);
  ingressContent.set(ingressKey,{...stale,contentKey:ingressKey});
  assert.deepEqual(ingressFacts(),ingressBaseline,'Ingress reset restores prior source selection rather than stale dated QA');
  } finally {await vite.close();}
}
