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
