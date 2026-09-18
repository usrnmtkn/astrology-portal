import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import handler, { normalizeTransitNatalPreviewInput, renderTransitNatalPreviewState } from '../api/admin/transit-natal-preview.ts';
const require = createRequire(import.meta.url);
const key = 'authored/transit-aspect/sun/north-node/conjunction';
const source = require('../apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json').authoredCards.find((row:any) => row.contentKey === key);
const input = {planet:'sun',sign:'virgo',aspect:'conjunction',natalPoint:'north-node'};
const baseline = renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput(input));
assert.match(baseline.body,/You may be offered a role/);
assert.match(baseline.body,/accept the first assignment and learn from what happens next\./);
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', stamp='2026-09-10T12:00:00Z';
let rows:any[] = [], publications:any[] = [], failStorage=false, calls=0;
process.env.CONTENT_GENERATION_SECRET='transit-preview-test';
process.env.SUPABASE_URL='https://transit-preview.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-service';
const original=globalThis.fetch;
globalThis.fetch=async(value,init)=>{
  calls++;
  const url=new URL(String(value));assert.equal(url.origin,'https://transit-preview.invalid');assert.ok(!init?.method || init.method==='GET');
  if(failStorage)return Response.json({error:'unavailable'},{status:503});
  return Response.json(url.pathname.endsWith('/content_publications') ? publications : rows);
};
async function request(body:unknown=input, secret='transit-preview-test') {
 const req:any=Readable.from([JSON.stringify(body)]);req.method='POST';req.headers={'x-content-generation-secret':secret};
 const res:any={statusCode:0,setHeader(){},end(body:string){this.result=JSON.parse(body)}};
 await handler(req,res);return {code:res.statusCode,...res.result};
}
try {
 assert.equal((await request(input,'wrong')).code,401);assert.equal(calls,0);
 assert.equal((await request({planet:'invalid'})).code,400);assert.equal(calls,0);
 assert.deepEqual((await request()).rendered,baseline);
 rows=[{id,content_key:key,status:'DRAFT',lane:'serving',provider:'tldrastro-fallback-architecture-v3',updated_at:stamp,body:'Synthetic unapproved draft.',sections:{packageRecord:{...source,body_you:'Synthetic unapproved draft.'}}}];
 assert.deepEqual((await request()).rendered,baseline);
 rows[0]={...rows[0],status:'LIVE',body:'Synthetic published transit preview fixture.',sections:{packageRecord:{...source,body_you:'Synthetic published transit preview fixture.'}}};
 publications=[{content_key:key,state:'live',revision:1,row_id:id,row_updated_at:stamp,updated_at:stamp}];
 assert.match((await request()).rendered.body,/Synthetic published transit preview fixture/);
 publications[0].state='retired';assert.equal((await request()).rendered,undefined);
 publications[0].state='live';publications[0].row_updated_at='2026-09-10T12:00:01Z';assert.equal((await request()).rendered,undefined);
 publications=[];rows=[];assert.deepEqual((await request()).rendered,baseline,'Requests cannot leak publication state');
 const lilithInput={planet:'lilith',sign:'capricorn',aspect:'trine',natalPoint:'north-node',voice:'you'};
 const lilith=(await request(lilithInput)).rendered;
 assert.deepEqual(lilith.sourceKeys,['fallback-hook/transit-effect-soft/lilith','fallback-vocab/planet-topic/north-node']);
 assert.match(lilith.body,/Lilith in Capricorn is trining your natal North Node/);
 const hookKey=lilith.sourceKeys[0];
 const {servingPackageRecords}=await import('../api/_lib/content-live-status.ts');
 const hook=servingPackageRecords.get(hookKey);
 assert.ok(hook);
 rows=[{id,content_key:hookKey,status:'LIVE',lane:'serving',provider:'tldrastro-fallback-architecture-v3',updated_at:stamp,body:'Synthetic edited Lilith hook.',sections:{packageRecord:{...hook,body_you:'Synthetic edited Lilith hook.'}}}];
 publications=[{content_key:hookKey,state:'live',revision:1,row_id:id,row_updated_at:stamp,updated_at:stamp}];
 assert.match((await request(lilithInput)).rendered.body,/Synthetic edited Lilith hook/);
 publications[0].state='retired';
 const retired=await request(lilithInput);
 assert.ok(!retired.rendered || !retired.rendered.body.includes('Synthetic edited Lilith hook'));
 rows=[];publications=[];

 for (const extra of [{pass:0},{pass:1.5},{variant:101},{isRetrograde:'true'},{window:'<script>'},{window:''}]) assert.equal((await request({...input,...extra})).code,400);
 const context={...lilithInput,pass:2,variant:3,isRetrograde:true,window:'until October 4'};
 assert.deepEqual((await request(context)).rendered,renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput(context)));
 assert.match((await request(context)).rendered.body,/until October 4/);
 for (const selection of [
   {planet:'neptune',sign:'aries',natalPoint:'sun',aspect:'opposition',variant:1},
   {planet:'neptune',sign:'aries',natalPoint:'moon',aspect:'opposition',variant:1},
   {planet:'neptune',sign:'aries',natalPoint:'mercury',aspect:'opposition',variant:1},
   {planet:'neptune',sign:'aries',natalPoint:'venus',aspect:'opposition',variant:1},
   {planet:'sun',sign:'virgo',natalPoint:'midheaven',aspect:'opposition'},
   lilithInput
 ]) for (const voice of ['you','QA Friend']) {
   rows=[];publications=[];
   const facts={...selection,voice};
   const before=(await request(facts)).rendered;
   assert.ok(before);
   const dependency=before.paragraphs.flatMap((p:any)=>p.sources).find((ref:any)=>/fog-note|transit-aspect-insert|fallback-vocab/.test(ref.contentKey));
   assert.ok(dependency,JSON.stringify(facts));
   assert.equal(dependency.publication.origin,'package');
   const key=dependency.contentKey, original=servingPackageRecords.get(key)!;
   const updated={...original,[dependency.field]:'Synthetic published supporting passage.'};
   rows=[{id,content_key:key,status:'LIVE',lane:'serving',provider:'tldrastro-fallback-architecture-v3',updated_at:stamp,body:'Synthetic published supporting passage.',sections:{packageRecord:updated}}];
   publications=[{content_key:key,state:'live',revision:5,row_id:id,row_updated_at:stamp,updated_at:stamp}];
   const after=(await request(facts)).rendered;
   assert.match(after.body,/Synthetic published supporting passage/);
   const receipt=after.paragraphs.flatMap((p:any)=>p.sources).find((ref:any)=>ref.contentKey===key);
   assert.equal(receipt.field,dependency.field);
   assert.deepEqual(receipt.publication,{origin:'published',packageVersion:dependency.publication.packageVersion,revision:5,rowId:id,rowUpdatedAt:stamp});
   for(const paragraph of before.paragraphs.filter((p:any)=>!p.sources.some((ref:any)=>ref.contentKey===key))) assert.ok(after.paragraphs.some((p:any)=>p.text===paragraph.text));
   publications[0].state='retired';
   const retired=await request(facts);
   assert.ok(!retired.rendered || !retired.rendered.sourceKeys.includes(key));
   rows[0].status='DRAFT';
   const restored=await request(facts);
   assert.ok(!restored.rendered || !restored.rendered.body.includes('Synthetic published supporting passage'));
 }
 rows=[];publications=[];
 failStorage=true;assert.equal((await request()).code,503);
 console.log('PASS transit preview actual handler: authorization, input validation, shared full copy, published edits, draft exclusion, retirement, stale publication, scoped state, and storage failure.');
} finally {globalThis.fetch=original;}

// Newly authored identities must enter the same reader without a bundled-key release.
const { transitNatalExactContentKey, transitNatalExactSourceDraft, transitNatalSharedFallbackKey, transitNatalStarterCopy } = await import('../apps/admin/src/transitNatalSources.ts');
const { isDynamicTransitNatalExactKey } = await import('../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions.ts');
for (const selection of [
 {planet:'sun',natalPoint:'south-node',aspect:'opposition'},
 {planet:'sun',natalPoint:'sun',aspect:'conjunction'},
 {planet:'uranus',natalPoint:'uranus',aspect:'conjunction'}
] as const) {
 const draft=transitNatalExactSourceDraft(selection), key=draft.contentKey;
 assert.equal(draft.status,'DRAFT');assert.equal(draft.lane,'reference');assert.equal(draft.body,'');
 assert.deepEqual(draft.sections.packageRecord.requiredSlots,['aspectWord','untilDate']);
 assert.equal(draft.sections.packageRecord.review_status,'needs_review');
 const content='A complete synthetic exact transit opening.\n\nA complete synthetic exact transit ending.';
 const record={...draft.sections.packageRecord,body:content,body_you:content,review_status:'approved'};
 const row:any={id,content_key:key,provider:'tldrastro-fallback-architecture-v3',status:'LIVE',lane:'serving',updated_at:stamp,body:content,sections:{packageRecord:record},facts:{fallbackArchitectureV3:true,review_status:'approved'},source_snapshot:{...draft.sourceSnapshot,review_status:'approved'}};
 const input=normalizeTransitNatalPreviewInput({...selection,sign:'virgo',voice:'you'});
 const publication:any={content_key:key,state:'live',revision:1,row_id:id,row_updated_at:stamp,updated_at:stamp};
 const exact=renderTransitNatalPreviewState(input,[row],[publication]);
 assert.equal(exact.body,content);assert.equal(exact.sourceKeys[0],key);
 for(const change of [{status:'DRAFT'},{lane:'reference'},{sections:{packageRecord:{...record,review_status:'needs_review'}},facts:{review_status:'needs_review'},source_snapshot:{...draft.sourceSnapshot,review_status:'needs_review'}}]) {
  let result;try{result=renderTransitNatalPreviewState(input,[{...row,...change}],[]);}catch{}
  assert.notEqual(result?.body,content,'Unpublished/unreviewed exact source cannot serve');
 }
 assert.throws(()=>renderTransitNatalPreviewState(input,[row],[{...publication,state:'retired'}]),/SOURCE_GAP|No reader-eligible/);
}
assert.equal(transitNatalExactContentKey({planet:'sun',natalPoint:'lilith',aspect:'square'}),null);
assert.equal(transitNatalSharedFallbackKey({planet:'sun',natalPoint:'moon',aspect:'square'}),'authored/transit-aspect/sun/moon/hard');
assert.equal(transitNatalSharedFallbackKey({planet:'sun',natalPoint:'moon',aspect:'trine'}),'authored/transit-aspect/sun/moon/soft');
assert.equal(transitNatalSharedFallbackKey({planet:'mars',natalPoint:'moon',aspect:'conjunction'}),'authored/transit-aspect/mars/moon/soft');
assert.equal(transitNatalSharedFallbackKey({planet:'mars',natalPoint:'saturn',aspect:'conjunction'}),'authored/transit-aspect/mars/saturn/hard');
assert.equal(transitNatalSharedFallbackKey({planet:'sun',natalPoint:'sun',aspect:'conjunction'}),null);
{
 const starter=transitNatalStarterCopy({body_you:'You {{aspectWord}}.',body_they:'{{Name}} {{aspectWord}}.'});
 const seeded=transitNatalExactSourceDraft({planet:'sun',natalPoint:'moon',aspect:'square'},starter);
 assert.equal(seeded.contentKey,'authored/transit-aspect/sun/moon/square');
 assert.equal(seeded.sections.packageRecord.body_you,'You {{aspectWord}}.');
 assert.equal(seeded.sections.packageRecord.body_they,'{{Name}} {{aspectWord}}.');
}
for(const key of ['authored/transit-return/pluto','authored/transit-return/sun/extra','authored/transit-aspect/sun/sun/conjunction','authored/transit-aspect/sun/fake/square','authored/transit-aspect/sun/moon/hard','cms/personal-transit-aspect/sun/south-node/opposition'])assert.equal(isDynamicTransitNatalExactKey(key),false,key);
assert.equal(isDynamicTransitNatalExactKey('authored/transit-aspect/sun/moon/square/aries/1/7'),true);
assert.equal(isDynamicTransitNatalExactKey('authored/transit-aspect/sun/sun/conjunction/aries/1/1'),false);
console.log('PASS new exact personal-transit and return sources, draft exclusion, retirement, and valid identities.');

// Exercise the actual published-overlay resolver used by the HTTP handler.
// Keep all writes synthetic and in memory: no production database is contacted.
for (const pair of [{planet:'sun',natalPoint:'sun'}, {planet:'mars',natalPoint:'moon'}, {planet:'saturn',natalPoint:'mercury'}] as const) {
 const aspects=['trine','sextile','square','opposition'] as const;
 const exactRows=aspects.map((aspect,index)=>{
  const draft=transitNatalExactSourceDraft({...pair,aspect});
  const you=`Synthetic ${pair.planet} ${aspect} You opening.\n\nSynthetic ${aspect} You ending.`;
  const friend=`Synthetic ${pair.planet} ${aspect} {{Name}} opening.\n\nSynthetic ${aspect} Friend ending.`;
  return {id:`bbbbbbbb-bbbb-bbbb-bbbb-00000000000${index+1}`,content_key:draft.contentKey,provider:'tldrastro-fallback-architecture-v3',status:'LIVE',lane:'serving',updated_at:stamp,body:you,
   sections:{packageRecord:{...draft.sections.packageRecord,body:you,body_you:you,body_they:friend,review_status:'approved'}},
   facts:{...draft.facts,review_status:'approved'},source_snapshot:{...draft.sourceSnapshot,review_status:'approved'}};
 });
 const pub=exactRows.map((row,index)=>({content_key:row.content_key,state:'live',revision:index+1,row_id:row.id,row_updated_at:stamp,updated_at:stamp}));
 for (const voice of ['you','QA Friend']) for (const aspect of aspects) for (const context of [{},{variant:2},{pass:2,variant:3}]) {
  const facts=normalizeTransitNatalPreviewInput({...pair,aspect,voice,sign:'capricorn',...context});
  const before=renderTransitNatalPreviewState(facts,exactRows as any,pub as any);
  assert.equal(before.sourceKeys[0],`authored/transit-aspect/${pair.planet}/${pair.natalPoint}/${aspect}`);
  assert.match(before.body,new RegExp(`Synthetic ${pair.planet} ${aspect} ${voice==='you'?'You':'QA Friend'} opening`));
  const changedRows=structuredClone(exactRows), changed=changedRows.find(row=>row.content_key.endsWith(`/${aspect}`))!;
  const field=voice==='you'?'body_you':'body_they';
  changed.sections.packageRecord[field]=`Synthetic isolated ${aspect} revision.`;
  const after=renderTransitNatalPreviewState(facts,changedRows as any,pub as any);
  assert.match(after.body,new RegExp(`Synthetic isolated ${aspect} revision`));
  for (const sibling of aspects.filter(value=>value!==aspect)) {
   const siblingFacts=normalizeTransitNatalPreviewInput({...pair,aspect:sibling,voice,sign:'capricorn',...context});
   assert.deepEqual(renderTransitNatalPreviewState(siblingFacts,changedRows as any,pub as any),renderTransitNatalPreviewState(siblingFacts,exactRows as any,pub as any),'An exact source change cannot leak into another aspect');
  }
  const otherVoice=normalizeTransitNatalPreviewInput({...pair,aspect,voice:voice==='you'?'QA Friend':'you',sign:'capricorn',...context});
  assert.deepEqual(renderTransitNatalPreviewState(otherVoice,changedRows as any,pub as any),renderTransitNatalPreviewState(otherVoice,exactRows as any,pub as any),'You and Friend fields must remain independent');
  const unpublished=structuredClone(changedRows);unpublished.find(row=>row.content_key===changed.content_key)!.status='DRAFT';
  let draftResult;try{draftResult=renderTransitNatalPreviewState(facts,unpublished as any,pub as any);}catch(error){assert.match(String(error),/SOURCE_GAP|No reader-eligible/);}
  assert.ok(!draftResult?.body.includes(`Synthetic isolated ${aspect} revision`),'A saved draft must not appear in published preview');
 }
}
console.log('PASS actual transit preview overlay: exact trine/sextile/square/opposition isolation, three planet pairs, both voices, draft exclusion and variant/pass contexts.');

{
 const { servingPackageRecords } = await import('../api/_lib/content-live-status.ts');
 const { transitNatalLiveServingSource } = await import('../apps/admin/src/transitNatalEditorScope.ts');
 assert.equal(servingPackageRecords.has('authored/transit-aspect/mars/north-node/soft'), false);
 assert.ok(servingPackageRecords.get('authored/transit-aspect/mars/north-node/conjunction'));
 for (const input of [
  {planet:'mars',aspect:'sextile',natalPoint:'north-node',voice:'{{Name}}'},
  {planet:'mars',sign:'scorpio',aspect:'sextile',natalPoint:'north-node',voice:'{{Name}}'}
 ] as const) {
  const preview = renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput(input));
  const live = transitNatalLiveServingSource(preview, 'body_they');
  assert.equal(live?.contentKey, 'authored/transit-aspect/mars/north-node/conjunction', JSON.stringify(input));
 }
 const familyPreview = renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput({planet:'sun',aspect:'trine',natalPoint:'sun',voice:'you'}));
 assert.equal(transitNatalLiveServingSource(familyPreview, 'body_you')?.contentKey, 'authored/transit-aspect/sun/sun/soft');
 console.log('PASS live Edit source is the packaged SHARE or family card, not a missing /soft row.');
}
