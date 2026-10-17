import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {createApiStore} from '../tests/helpers/calendar-review-api.mjs';
import {servingPackageRecords} from '../api/_lib/content-live-status.js';
import {DAILY_GLANCE_PERSON_SLOT_KEYS, fillDailyGlancePersonSlots} from '../apps/web/src/content/fallbackArchitectureV3/resolver/dailyGlanceVoice.mjs';
import {fillDailyGlancePersonSlots as fillBrowserSlots} from '../apps/web/src/content/fallbackArchitectureV3/resolver/dailyGlanceVoice.browser.ts';
import {dailyGlanceFriendPreviewSlots} from '../apps/admin/src/dailyGlanceFriendPreview.ts';
import {csvRecordForRow} from '../apps/admin/src/studioCsv.js';
import {hasExactStudioOwnerApproval,studioOwnerApproval} from '../api/_lib/studio-owner-publication.js';
import {projectReaderRow} from '../apps/web/src/content/readerRowProjection.mjs';
import {packageFallbackArchitectureV3CoreRows} from '../apps/web/src/services/fallbackArchitectureV3CorePackaging.ts';
import {publicationAllowsContent} from '../apps/web/src/content/contentPublicationState.ts';
import {createTransitSynastryRenderer as browserRenderer} from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts';
import {createTransitSynastryRenderer as shippedRenderer} from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';

for (const family of ['headline','body']) test(`Daily ${family} publishes newly introduced supported Friend variables and exact owner wording`,async()=>{
  const key=`fallback-hook/daily-${family}/soft/mars`;
  const record={...structuredClone(servingPackageRecords.get(key)!),body_you:'Original complete You copy.',body_they:'They can choose a useful pace.',review_status:'needs_review'};
  assert(record.content_role,'Expected a registered reader source.');
  const initial={id:`daily-${family}-qa`,content_key:key,provider:'tldrastro-fallback-architecture-v3',
    status:'DRAFT',surface:'you',mode:'feed',block_type:'fallback_hook',event_type:'fallback-hook',
    lane:'reference',review_state:'needs-review',target_date:null,headline:'Synthetic Daily source',summary:'',body:record.body_you,
    updated_at:'2026-10-15T12:00:00Z',sections:{packageRecord:record},facts:{fallbackArchitectureV3:true},source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',review_status:'needs_review'}};
  const store=await createApiStore([initial]);
  try{
    const you='The engine starts—retain this complete owner sentence.';
    const they='The profile includes '+[...DAILY_GLANCE_PERSON_SLOT_KEYS].map(name=>`{{${name}}}`).join(', ')+'.\n\nExact owner final sentence—retained.';
    const change=(bodyThey=they,bodyYou=you,version=initial.updated_at)=>store.invoke('PATCH',{id:initial.id,expectedUpdatedAt:version,
      ownerAuthoredWording:true,reviewStatus:'needs_review',sections:{packageDraft:{...record,body_you:bodyYou,body_they:bodyThey}}});
    for(const unknown of ['{{Name}}','{{unknownPerson}}','{{ personPreferredName }}']){
      assert.equal((await change(`The profile includes ${unknown}.`)).status,400,unknown);
      assert.deepEqual(store.rows.get(initial.id),initial,'A refused token cannot mutate the saved source.');
    }
    assert.equal((await change(they,'The profile includes {{personPreferredName}}.')).status,400,'Friend slots must not be licensed for an unbound You field.');
    const saved=await change();assert.equal(saved.status,200,JSON.stringify(saved.payload));
    const draft=saved.payload.rows[0];assert.equal(draft.status,'DRAFT');
    const publication=await store.invoke('PATCH',{id:draft.id,expectedUpdatedAt:draft.updated_at,ownerAction:'approve-package-revision'});
    assert.equal(publication.status,200,JSON.stringify(publication.payload));
    const reader=await store.invoke('POST',{keys:[key]},'/api/content-reader');
    assert.equal(reader.status,200);assert.equal(reader.payload.rows.length,1);
    const published=reader.payload.rows[0].sections.packageRecord;
    assert.equal(published.body_you,you);assert.equal(published.body_they,they);
    const slots=dailyGlanceFriendPreviewSlots('Alex','they');
    for(const fill of [fillDailyGlancePersonSlots,fillBrowserSlots]){
      const complete=fill(published.body_they,slots);
      assert(!complete.includes('{{'));assert(complete.includes('Alex'));assert(complete.endsWith('Exact owner final sentence—retained.'));
    }
    const before=structuredClone(store.rows.get(initial.id));
    assert.equal((await change(they,you,initial.updated_at)).status,409);
    assert.deepEqual(store.rows.get(initial.id),before,'A stale author tab cannot overwrite the published source.');
  }finally{await store.close();}
});

const coreManifest=JSON.parse(fs.readFileSync(new URL('../apps/web/src/content/fallbackArchitectureV3/bundled-core-manifest-v3.json',import.meta.url),'utf8'));
const dailyVariants=JSON.parse(fs.readFileSync(new URL('../apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json',import.meta.url),'utf8')).dailyGlanceVariants;
const ownerHeadline='{{personPreferredName}} remembers “you belong here.”';
const ownerPassage='Change can take a useful form for {{personPreferredName}}.\n\nComplete plans can wait until {{personSubject}} can read them.';
const ownerYou='The engine starts—retain this exact owner opening.\n\nThis is the complete owner ending.';
const friendSlots=dailyGlanceFriendPreviewSlots('Alex','they');
const replacePerson=(copy:string)=>copy.replaceAll('{{personPreferredName}}','Alex').replaceAll('{{personSubject}}','they');
type PublishMode='atomic'|'manual'|'csv';

function dailyRows(label:string) {
  return ['headline','body'].map((family,index)=>{
    const contentKey=`fallback-hook/daily-${family}/soft/mars`;
    const record={...structuredClone(servingPackageRecords.get(contentKey)!),body_you:'Original complete You copy.',body_they:'They can choose a useful pace.',review_status:'needs_review'};
    return {id:`daily-owner-${label}-${index}`,content_key:contentKey,provider:'tldrastro-fallback-architecture-v3',
      status:'DRAFT',surface:'you',mode:'feed',block_type:'fallback_hook',event_type:'fallback-hook',lane:'reference',review_state:'needs-review',
      target_date:null,headline:'Synthetic Daily owner publication',summary:'',body:record.body_you,updated_at:'2026-10-15T12:00:00Z',
      sections:{packageRecord:record},facts:{fallbackArchitectureV3:true},source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',review_status:'needs_review'}};
  });
}

async function publishDaily(store:any,row:any,mode:PublishMode,friend:string) {
  const record={...row.sections.packageRecord,body_you:ownerYou,body_they:friend};
  if(mode==='manual') {
    const response=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAuthoredWording:true,
      reviewStatus:'approved',body:ownerYou,sections:{packageRecord:record}});
    assert.equal(response.status,200,JSON.stringify(response.payload));return response.payload.rows[0];
  }
  const saved=mode==='csv'
    ? await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'import-csv-draft',
      csvRecord:{...csvRecordForRow(row),publish:'yes',body_you:ownerYou,body_they:friend}})
    : await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAuthoredWording:true,
      reviewStatus:'needs_review',sections:{packageDraft:record}});
  assert.equal(saved.status,200,JSON.stringify(saved.payload));
  const draft=saved.payload.rows[0];assert.equal(draft.status,'DRAFT');
  const hidden=await store.invoke('POST',{keys:[row.content_key]},'/api/content-reader');
  assert.equal(hidden.payload.rows.length,0,'Saving owner wording is not publication.');
  const published=await store.invoke('PATCH',{id:draft.id,expectedUpdatedAt:draft.updated_at,ownerAction:'approve-package-revision'});
  assert.equal(published.status,200,JSON.stringify(published.payload));return published.payload.rows[0];
}

let nodeFixtureSequence=0;
async function nodeDaily(hookRows:any[],facts:any,variantBank?:any) {
  const original=fs.readFileSync;
  // The real Node reference has a file-backed bank. Supply the same authorized
  // transport rows in memory, without rewriting approved package source files.
  fs.readFileSync=((file:any,options:any)=>{
    const filename=file instanceof URL?fileURLToPath(file):String(file);
    if(variantBank && filename.endsWith('/source-rows/daily-glance-variants-v1.json')) {
      const encoded=JSON.stringify(variantBank);
      return typeof options==='string'||options?.encoding?encoded:Buffer.from(encoded);
    }
    if(filename.endsWith('/source-rows/fallback-source-rows-v3.json')) {
      const bank=JSON.parse(original(file,'utf8') as string);
      const encoded=JSON.stringify({...bank,hookRows});
      return typeof options==='string'||options?.encoding?encoded:Buffer.from(encoded);
    }
    return original(file,options);
  }) as typeof fs.readFileSync;
  try {
    const url=new URL('../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs',import.meta.url);
    const reference=await import(`${url.href}?daily-owner-fixture=${++nodeFixtureSequence}`);
    return reference.renderDailyGlance(facts);
  } finally {fs.readFileSync=original;}
}

async function assertDailyReaderParity(payload:any,headline=ownerHeadline,passage=ownerPassage) {
  for(const row of payload.rows) assert.equal(row.sections.packageRecord.body_you,ownerYou);
  const ledger=new Map(payload.publications.map((row:any)=>[row.content_key,row]));
  const banks=packageFallbackArchitectureV3CoreRows(payload.rows,coreManifest,
    (key,id,version,date)=>publicationAllowsContent(key,id,version,date,ledger as any));
  assert(banks,'The actual client adapter must admit the confirmed published rows.');
  banks.rowsFile.dailyGlanceVariants=dailyVariants;
  assert.equal(banks.rowsFile.hookRows?.length,2);
  for(const hook of banks.rowsFile.hookRows!) assert.equal(hook.studio_owner_wording,true);
  const facts={natal:'mars',aspect:'trine',voice:'they' as const,personSlots:friendSlots};
  const outputs=[await nodeDaily(banks.rowsFile.hookRows!,facts),
    browserRenderer(banks.transitLib,banks.templatesFile,banks.rowsFile).renderDailyGlance(facts),
    shippedRenderer(banks.transitLib,banks.templatesFile,banks.rowsFile).renderDailyGlance(facts)];
  for(const output of outputs) {
    assert.equal(output.headline,replacePerson(headline));
    assert.equal(output.body,replacePerson(passage));
    assert.deepEqual(output.parts,[replacePerson(passage)],'Complete paragraphs remain one exact owner passage.');
  }
  for(const dateKey of [undefined,'2031-02-04','2031-02-05']) {
    const selfFacts={...facts,voice:'you' as const,dateKey,userId:'synthetic-owner-reader'};
    const selves=[await nodeDaily(banks.rowsFile.hookRows!,selfFacts),
      browserRenderer(banks.transitLib,banks.templatesFile,banks.rowsFile).renderDailyGlance(selfFacts),
      shippedRenderer(banks.transitLib,banks.templatesFile,banks.rowsFile).renderDailyGlance(selfFacts)];
    for(const self of selves) {
      assert.equal(self.headline,ownerYou,'Packaged variations cannot replace the owner-published headline.');
      assert.equal(self.body,ownerYou,'Packaged variations cannot replace the complete owner-published passage.');
    }
  }
}

for(const mode of ['atomic','manual','csv'] as const) test(`Daily ${mode} owner approval survives the actual Node, browser and shipped Friend readers`,async()=>{
  const initial=dailyRows(mode),store=await createApiStore(initial);
  try {
    for(const [index,row] of initial.entries()) {
      const published=await publishDaily(store,row,mode,index===0?ownerHeadline:ownerPassage);
      assert.equal(published.headline,row.headline,'Omitted headline retains the stored column.');
      assert.equal(published.summary,row.summary,'Omitted summary retains the stored column.');
      assert.equal(published.review_state,null,'The explicit publication clears the nullable hold.');
      assert.equal(published.status,'LIVE');assert(hasExactStudioOwnerApproval(published),JSON.stringify({status:published.status,lane:published.lane,reviewState:published.review_state,recordReview:published.sections.packageRecord.review_status,approval:published.source_snapshot.studioOwnerApproval,recomputed:studioOwnerApproval(published,published.updated_at)}));
    }
    const reader=await store.invoke('POST',{keys:initial.map(row=>row.content_key)},'/api/content-reader');
    assert.equal(reader.status,200);assert.equal(reader.payload.rows.length,2);
    await assertDailyReaderParity(reader.payload);
    for(const fill of [fillDailyGlancePersonSlots,fillBrowserSlots]) {
      assert.throws(()=>fill(ownerHeadline,friendSlots),/DG-THEY-NO-SECOND-PERSON/,'Unverified/default wording remains strict.');
      assert.throws(()=>fill(ownerPassage,friendSlots),/DG-THEY-NO-DIRECT-IMPERATIVE/);
      assert.throws(()=>fill('{{unknownPerson}} is here.',{...friendSlots,unknownPerson:'Unlicensed'} as any,{ownerApprovedWording:true}),/DG-THEY-ALLOWED-PERSON-SLOTS-ONLY/);
      assert.throws(()=>fill('{{personPreferredName}} is here.',{},{ownerApprovedWording:true}),/DG-THEY-MISSING-PERSON-SLOT/);
    }
    const bodyId=initial[1].id,approved=structuredClone(store.rows.get(bodyId));
    const changed=structuredClone(approved);changed.sections.packageRecord.body_they+=' Unapproved addition.';
    store.rows.set(bodyId,changed);
    assert.equal((await store.invoke('POST',{keys:[approved.content_key]},'/api/content-reader')).payload.rows.length,0,'Changing either audience invalidates the full-copy approval.');
    store.rows.set(bodyId,approved);
    const draftFriend=ownerPassage+' Saved without publication.';
    // Actual Daily paired-editor Save draft payload: saveDailyGlancePairEdits
    // calls saveDraft('DRAFT'), which sends needs_review even though the old
    // source snapshot and facts can still contain the published approval.
    const saved=await store.invoke('PATCH',{id:bodyId,expectedUpdatedAt:approved.updated_at,ownerAuthoredWording:true,
      reviewStatus:'needs_review',headline:approved.headline,summary:approved.summary,body:approved.body,
      sourceSnapshot:structuredClone(approved.source_snapshot),facts:structuredClone(approved.facts),
      sections:{...approved.sections,packageDraft:{...approved.sections.packageRecord,body_you:ownerYou,body_they:draftFriend}}});
    assert.equal(saved.status,200,JSON.stringify(saved.payload));const draft=saved.payload.rows[0];
    assert.equal(draft.status,'DRAFT');assert(!hasExactStudioOwnerApproval(draft));
    assert.deepEqual(draft.source_snapshot.studioOwnerApproval,approved.source_snapshot.studioOwnerApproval,'A normal save must not mint a new approval from inherited LIVE status.');
    assert.equal((await store.invoke('POST',{keys:[approved.content_key]},'/api/content-reader')).payload.rows.length,0);
    assert.equal((await store.invoke('PATCH',{id:bodyId,expectedUpdatedAt:approved.updated_at,ownerAction:'approve-package-revision'})).status,409);
    // The actual editor already staged this exact revision. Its separate
    // approval action publishes it; re-importing unchanged CSV is not a save.
    const approval=await store.invoke('PATCH',{id:draft.id,expectedUpdatedAt:draft.updated_at,ownerAction:'approve-package-revision'});
    assert.equal(approval.status,200,JSON.stringify(approval.payload));
    const republished=approval.payload.rows[0];assert(hasExactStudioOwnerApproval(republished));
    await assertDailyReaderParity((await store.invoke('POST',{keys:initial.map(row=>row.content_key)},'/api/content-reader')).payload,ownerHeadline,draftFriend);
  } finally {await store.close();}
});

function currentDailyBanks(payload:any) {
  const ledger=new Map(payload.publications.map((row:any)=>[row.content_key,row]));
  const banks=packageFallbackArchitectureV3CoreRows(payload.rows,coreManifest,
    (key,id,version,date)=>publicationAllowsContent(key,id,version,date,ledger as any));
  assert(banks);banks.rowsFile.dailyGlanceVariants=dailyVariants;return banks;
}

for(const publishedIndex of [0,1]) test(`Daily one-sided owner ${publishedIndex===0?'headline':'passage'} publication serves the current complete pair`,async()=>{
  const initial=dailyRows(`one-sided-${publishedIndex}`).map(row=>({...row,status:'LIVE',lane:'serving',review_state:null,
    sections:{packageRecord:{...row.sections.packageRecord,review_status:'approved'}},source_snapshot:{...row.source_snapshot,review_status:'approved'}}));
  const store=await createApiStore(initial);
  try {
    await publishDaily(store,initial[publishedIndex],'manual',publishedIndex===0?ownerHeadline:ownerPassage);
    const payload=(await store.invoke('POST',{keys:initial.map(row=>row.content_key)},'/api/content-reader')).payload;
    assert.equal(payload.rows.length,2);const banks=currentDailyBanks(payload),hooks=banks.rowsFile.hookRows!;
    assert.equal(hooks.filter(row=>row.studio_owner_wording===true).length,1);
    const expectedHeadline=hooks.find(row=>row.contentKey.includes('/daily-headline/'))!;
    const expectedBody=hooks.find(row=>row.contentKey.includes('/daily-body/'))!;
    for(const dateKey of ['2031-02-04','2031-02-05']) for(const voice of ['you','they'] as const) {
      const facts={natal:'mars',aspect:'trine',voice,dateKey,userId:'synthetic-one-sided',personSlots:friendSlots};
      const outputs=[await nodeDaily(hooks,facts),browserRenderer(banks.transitLib,banks.templatesFile,banks.rowsFile).renderDailyGlance(facts),
        shippedRenderer(banks.transitLib,banks.templatesFile,banks.rowsFile).renderDailyGlance(facts)];
      for(const output of outputs) {
        assert.equal(output.headline,replacePerson(voice==='you'?expectedHeadline.body_you!:expectedHeadline.body_they!));
        assert.equal(output.body,replacePerson(voice==='you'?expectedBody.body_you!:expectedBody.body_they!));
      }
    }
  } finally {await store.close();}
});

test('unmarked Daily readers retain explicit-pair dated rotation and previous-appearance avoidance',async()=>{
  const initial=dailyRows('ordinary-rotation').map(row=>({...row,status:'LIVE',lane:'serving',review_state:null,
    sections:{packageRecord:{...row.sections.packageRecord,review_status:'approved'}},source_snapshot:{...row.source_snapshot,review_status:'approved'}}));
  const store=await createApiStore(initial);
  try {
    const payload=(await store.invoke('POST',{keys:initial.map(row=>row.content_key)},'/api/content-reader')).payload;
    const banks=currentDailyBanks(payload),hooks=banks.rowsFile.hookRows!;
    assert(hooks.every(row=>row.studio_owner_wording!==true));
    // Current retained bank has only primary pairs; do not invent approved
    // production alternates. Exercise future eligible-pair behavior in RAM.
    const ids=['primary','alternate-a','alternate-b'];
    const set={pairing_policy:'explicit_pairs_only',
      headlines:ids.map(id=>({id,text:`Synthetic ${id} headline.`,review_status:'approved'})),
      bodies:ids.map(id=>({id,text:`Synthetic ${id} body.`,review_status:'approved'})),
      pairings:ids.map(id=>({id,headline_id:id,body_id:id,review_status:'approved'}))};
    const variants={schema:'tldrastro-daily-glance-variants-v1',keys:{'soft/mars':set}};
    const render=async(dateKey:string,previousVariantId?:string)=>{
      const facts={natal:'mars',aspect:'trine',voice:'you' as const,dateKey,userId:'synthetic-rotation',previousVariantId};
      const rows={...banks.rowsFile,dailyGlanceVariants:variants};
      const outputs=[await nodeDaily(hooks,facts,variants),browserRenderer(banks.transitLib,banks.templatesFile,rows as any).renderDailyGlance(facts),
        shippedRenderer(banks.transitLib,banks.templatesFile,rows).renderDailyGlance(facts)];
      for(const output of outputs) {
        assert.equal(output.variantId,outputs[0].variantId);assert.equal(output.headline,`Synthetic ${output.variantId} headline.`);
        assert.equal(output.body,`Synthetic ${output.variantId} body.`);
      }
      return outputs[0];
    };
    const first=await render('2031-02-04');assert.deepEqual(await render('2031-02-04'),first);
    const next=await render('2031-02-05'),last=await render('2031-02-06');
    assert.equal(new Set([first.variantId,next.variantId,last.variantId]).size,3);
    assert.notEqual((await render('2031-02-04',first.variantId)).variantId,first.variantId);
  } finally {await store.close();}
});

test('Daily manual save without a publish review status cannot inherit LIVE approval',async()=>{
  const initial=dailyRows('omitted-review'),store=await createApiStore(initial);
  try {
    const approved=await publishDaily(store,initial[1],'manual',ownerPassage);
    for(const field of ['headline','summary']) {
      const before=structuredClone(store.rows.get(approved.id));
      const refused=await store.invoke('PATCH',{id:approved.id,expectedUpdatedAt:approved.updated_at,ownerAuthoredWording:true,[field]:null});
      assert.equal(refused.status,400,'Null text fields are refused by the write schema, not treated as omitted.');
      assert.deepEqual(store.rows.get(approved.id),before);
    }
    const saved=await store.invoke('PATCH',{id:approved.id,expectedUpdatedAt:approved.updated_at,ownerAuthoredWording:true,
      sections:{packageRecord:{...approved.sections.packageRecord,body_they:ownerPassage+' Saved only.'}}});
    assert.equal(saved.status,200,JSON.stringify(saved.payload));const draft=saved.payload.rows[0];
    assert.equal(draft.status,'DRAFT');assert(!hasExactStudioOwnerApproval(draft));
    assert.deepEqual(draft.source_snapshot.studioOwnerApproval,approved.source_snapshot.studioOwnerApproval);
    assert.equal((await store.invoke('POST',{keys:[approved.content_key]},'/api/content-reader')).payload.rows.length,0);
  } finally {await store.close();}
});

test('raw Daily flags and forged approval cannot grant owner wording to generated or unapproved rows',async()=>{
  const raw=dailyRows('forged').map((row,index)=>({...row,status:'LIVE',lane:'serving',review_state:null,
    sections:{packageRecord:{...row.sections.packageRecord,review_status:'approved',studio_owner_wording:true,body_they:index===0?ownerHeadline:ownerPassage}},
    source_snapshot:{...row.source_snapshot,review_status:'approved'}}));
  const store=await createApiStore(raw);
  try {
    const read=await store.invoke('POST',{keys:raw.map(row=>row.content_key)},'/api/content-reader');assert.equal(read.payload.rows.length,2);
    for(const row of read.payload.rows) assert.equal(row.sections.packageRecord.studio_owner_wording,undefined);
    const hooks=read.payload.rows.map((row:any)=>row.sections.packageRecord);
    await assert.rejects(()=>nodeDaily(hooks,{natal:'mars',aspect:'trine',voice:'they',personSlots:friendSlots}),/DG-THEY-NO-SECOND-PERSON/);
    for(const make of [browserRenderer,shippedRenderer]) assert.throws(()=>make({authoredCards:[]},{templates:[]},{hookRows:hooks,vocabularyRows:[]})
      .renderDailyGlance({natal:'mars',aspect:'trine',voice:'they',personSlots:friendSlots}),/DG-THEY-NO-SECOND-PERSON/);
    for(const row of raw) {
      assert.equal(projectReaderRow(row).sections.packageRecord.studio_owner_wording,undefined);
      store.rows.set(row.id,{...row,source_snapshot:{...row.source_snapshot,studioOwnerApproval:{action:'publish-owner-content',contentKey:row.content_key,bodyHash:'forged',copyHash:'forged'}}});
    }
    assert.equal((await store.invoke('POST',{keys:raw.map(row=>row.content_key)},'/api/content-reader')).payload.rows.length,0);
  } finally {await store.close();}
});

function dailyCreateBody(row:any,friend:string) {
  return {contentKey:row.content_key,surface:row.surface,mode:row.mode,eventType:row.event_type,
    provider:row.provider,blockType:row.block_type,status:'LIVE',lane:'serving',reviewState:null,
    reviewStatus:'approved',ownerAuthoredWording:true,headline:row.headline,summary:'',body:ownerYou,
    facts:{fallbackArchitectureV3:true,review_status:'approved'},
    sourceSnapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',review_status:'approved'},
    sections:{packageRecord:{...row.sections.packageRecord,review_status:'approved',body_you:ownerYou,body_they:friend}}};
}

for(const bulk of [false,true]) test(`Daily ${bulk?'personalized batch creation remains refused':'explicit single creation derives exact owner proof, never a raw marker'}`,async()=>{
  const initial=dailyRows(bulk?'batch':'create'),store=await createApiStore([]);
  try {
    const writes=initial.map((row,index)=>dailyCreateBody(row,index===0?ownerHeadline:ownerPassage));
    if(bulk) {
      const response=await store.invoke('POST',{rows:writes});
      assert.equal(response.status,400);assert.match(response.payload.error,/Personalized content test rows cannot be published globally/);
      assert.equal(store.rows.size,0,'A bulk request cannot bypass personalized-sample admission.');return;
    } else for(const write of writes) {
      const response=await store.invoke('POST',write);assert.equal(response.status,200,JSON.stringify(response.payload));
    }
    for(const row of store.rows.values()) if(initial.some(item=>item.content_key===row.content_key)) assert(hasExactStudioOwnerApproval(row));
    const reader=await store.invoke('POST',{keys:initial.map(row=>row.content_key)},'/api/content-reader');
    assert.equal(reader.status,200);assert.equal(reader.payload.rows.length,2);await assertDailyReaderParity(reader.payload);
  } finally {await store.close();}
});

test('Daily draft creation cannot inherit approval or trust a supplied approval snapshot',async()=>{
  const initial=dailyRows('draft-create')[0],store=await createApiStore([]);
  try {
    const write=dailyCreateBody(initial,ownerHeadline);
    const result=await store.invoke('POST',{...write,status:'DRAFT',
      sourceSnapshot:{...write.sourceSnapshot,studioOwnerApproval:{action:'publish-owner-content',contentKey:initial.content_key,bodyHash:'forged',copyHash:'forged'}},
      sections:{packageRecord:{...write.sections.packageRecord,studio_owner_wording:true}}});
    assert.equal(result.status,200,JSON.stringify(result.payload));const saved=result.payload.rows[0];
    assert.equal(saved.status,'DRAFT');assert.equal(saved.sections.packageRecord.review_status,'needs_review');
    assert.equal(saved.source_snapshot.studioOwnerApproval,undefined);assert(!hasExactStudioOwnerApproval(saved));
    assert.equal(projectReaderRow(saved).sections.packageRecord.studio_owner_wording,undefined);
    assert.equal((await store.invoke('POST',{keys:[initial.content_key]},'/api/content-reader')).payload.rows.length,0);
  } finally {await store.close();}
});
