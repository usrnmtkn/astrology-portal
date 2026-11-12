import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createApiStore} from '../tests/helpers/calendar-review-api.mjs';
import {calendarPlanetaryDraft} from '../apps/admin/src/calendarPlanetaryDraft';
import {calendarPlanets,calendarPlanetaryIdentity,calendarPlanetaryRevisionTarget} from '../apps/admin/src/calendarPlanetarySources';
import {publicationMigrations,publicationTestSchema,seedPublicationRow,callPublicationRpc} from '../tests/helpers/studio-publication-db.mjs';

const reader = async (store: any,key: string) => {
  const result=await store.invoke('POST',{keys:[key]},'/api/content-reader');
  assert.equal(result.status,200,JSON.stringify(result.payload));
  assert(!JSON.stringify(result.payload).includes('targetRowUpdatedAt'),'Private revision metadata cannot enter reader responses');
  return result.payload.rows;
};
for(const blockType of ['calendar_event',null] as const)for(const [kind,direction] of [['ingress','direct'],['station','direct'],['station','retrograde']] as const){
  const store=await createApiStore([],{uuidIds:true,sqlCalendarLifecycle:true});
  try{
    const {id:_,...draft}=calendarPlanetaryDraft(kind,{planet:'mercury',sign:'scorpio',direction})!;
    const body=`Synthetic ${kind} ${direction} original opening.\n\nComplete original final paragraph.`;
    const created=await store.invoke('POST',{...draft,blockType,body,eventType:'calendar_event'});
    assert.equal(created.status,200,JSON.stringify(created.payload));
    let source=created.payload.rows[0];
    const published=await store.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,ownerAction:'publish-owner-content'});
    assert.equal(published.status,200,JSON.stringify(published.payload));source=published.payload.rows[0];
    assert.equal(source.block_type,blockType);
    const original=structuredClone(store.rows.get(source.id));
    const revised=body+'\n\nComplete private revision ending.';
    const saved=await store.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,status:'DRAFT',body:revised});
    assert.equal(saved.status,200,JSON.stringify(saved.payload));let proposal=saved.payload.rows[0];
    assert.notEqual(proposal.id,source.id);assert.equal(proposal.mode,'studio-draft');assert.equal(proposal.lane,'reference');
    assert.deepEqual(store.rows.get(source.id),original,'Saving a private Calendar revision preserves every published field');
    assert.deepEqual((await reader(store,source.content_key)).map((row:any)=>row.body),[body]);
    const inventory=await store.invoke('GET',undefined,`/api/admin/generated-content-inventory?contentKey=${encodeURIComponent(source.content_key)}&status=all&document=1`);
    assert.equal(inventory.status,200);assert(inventory.payload.rows.some((row:any)=>row.id===proposal.id&&row.body===revised),'The complete saved private revision can reopen');
    for(const input of [
      {id:source.id,expectedUpdatedAt:source.updated_at,status:'DRAFT',body:'Competing private draft.'},
      {id:proposal.id,expectedUpdatedAt:'1900-01-01T00:00:00Z',status:'DRAFT',body:'Stale proposal.'},
      {id:proposal.id,expectedUpdatedAt:proposal.updated_at,contentKey:'sky.ingress.venus.aries'},
      {id:proposal.id,expectedUpdatedAt:proposal.updated_at,sourceSnapshot:{...proposal.source_snapshot,targetRowId:randomUUID()}}
    ])assert.equal((await store.invoke('PATCH',input)).status,409,'Conflicting drafts and identity changes fail closed');
    assert.equal((await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,ownerAction:'publish-standalone-article-revision'},undefined,'not-owner')).status,401);
    assert.deepEqual(store.rows.get(source.id),original);
    const changedFacts=await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,status:'DRAFT',sections:{...proposal.sections,slots:{...proposal.sections.slots,sign:'Aries'}}});
    assert.equal(changedFacts.status,200);proposal=changedFacts.payload.rows[0];
    assert.equal((await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,ownerAction:'publish-standalone-article-revision'})).status,409,'A revision cannot change the event facts');
    const restoredFacts=await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,status:'DRAFT',sections:{...proposal.sections,slots:source.sections.slots}});
    assert.equal(restoredFacts.status,200);proposal=restoredFacts.payload.rows[0];
    const changedBlock=await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,status:'DRAFT',blockType:blockType===null?'calendar_event':null});
    assert.equal(changedBlock.status,200);proposal=changedBlock.payload.rows[0];
    assert.equal((await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,ownerAction:'publish-standalone-article-revision'})).status,409,'A revision keeps the original block identity, including NULL');
    const restoredBlock=await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,status:'DRAFT',blockType});
    assert.equal(restoredBlock.status,200);proposal=restoredBlock.payload.rows[0];
    const reviewed=await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,status:'REVIEWED'});
    assert.equal(reviewed.status,200);proposal=reviewed.payload.rows[0];
    assert.equal(proposal.status,'REVIEWED');assert.equal(proposal.review_state,'owner-review-required');assert.equal(proposal.lane,'reference');
    assert.deepEqual(store.rows.get(source.id),original,'Marking a private revision reviewed preserves the published source');
    assert.deepEqual((await reader(store,source.content_key)).map((row:any)=>row.body),[body]);
    const ready=await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,status:'DRAFT'});
    assert.equal(ready.status,200);proposal=ready.payload.rows[0];
    const promoted=await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,ownerAction:'publish-standalone-article-revision'});
    assert.equal(promoted.status,200,JSON.stringify(promoted.payload));source=promoted.payload.rows[0];
    assert.equal(source.id,original.id);assert.equal(source.body,revised);assert.equal(store.rows.get(proposal.id).status,'ARCHIVED');
    assert.deepEqual((await reader(store,source.content_key)).map((row:any)=>row.body),[revised]);
    const pending=await store.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,status:'DRAFT',body:revised+'\n\nPending second revision.'});
    assert.equal(pending.status,200);proposal=pending.payload.rows[0];
    const newer=revised+'\n\nExplicitly published competing version.';
    const competing=await store.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,ownerAction:'save-and-publish-owner-content',headline:source.headline,summary:source.summary??'',body:newer,sections:source.sections});
    assert.equal(competing.status,200,JSON.stringify(competing.payload));source=competing.payload.rows[0];
    assert.equal((await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,ownerAction:'publish-standalone-article-revision'})).status,409,'Publishing compares the opened target version');
    assert.deepEqual((await reader(store,source.content_key)).map((row:any)=>row.body),[newer]);
    assert.equal(store.rows.get(proposal.id).body,proposal.body,'Conflicts retain the pending wording');
    const discard=await store.invoke('PATCH',{id:proposal.id,expectedUpdatedAt:proposal.updated_at,status:'ARCHIVED'});
    assert.equal(discard.status,200);assert.equal((await reader(store,source.content_key))[0].body,newer);
    const archive=await store.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,status:'ARCHIVED'});
    assert.equal(archive.status,200);source=archive.payload.rows[0];assert.equal(source.body,newer);
    assert.deepEqual(await reader(store,source.content_key),[]);
    const restore=await store.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,status:'DRAFT'});
    assert.equal(restore.status,200);source=restore.payload.rows[0];assert.equal(source.body,newer);
    assert.deepEqual(await reader(store,source.content_key),[],'Restoring a draft does not republish it');
    const republish=await store.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,ownerAction:'publish-owner-content'});
    assert.equal(republish.status,200,JSON.stringify(republish.payload));assert.equal(republish.payload.rows[0].body,newer);
    assert.equal((await reader(store,source.content_key))[0].body,newer,'Explicit republication reopens the real SQL retirement');
    source=republish.payload.rows[0];
    const beforeReview=structuredClone(store.rows.get(source.id));
    const reviewFromLive=await store.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,status:'REVIEWED',body:newer+'\n\nReviewed private update.'});
    assert.equal(reviewFromLive.status,200,JSON.stringify(reviewFromLive.payload));
    assert.notEqual(reviewFromLive.payload.rows[0].id,source.id,'Mark reviewed on a published Calendar source must create a private revision');
    assert.equal(reviewFromLive.payload.rows[0].status,'REVIEWED');
    assert.deepEqual(store.rows.get(source.id),beforeReview);
    assert.equal((await reader(store,source.content_key))[0].body,newer);
  }finally{await store.close();}
}

for(const overrides of [{surface:'education'},{mode:'article'},{content_key:'sky.ingress.mercury.unknown'},
  {block_type:'sky_placement'},{lane:'reference'},{review_state:'owner-review-required'},
  {status:'DRAFT'},{status:'REVIEWED'},{status:'ARCHIVED'},
  {provider:'tldrastro-fallback-architecture-v3'},{source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3'}},{facts:{fallbackArchitectureV3:true}}]){
  const source={id:randomUUID(),content_key:'sky.ingress.mercury.scorpio',surface:'sky',mode:'feed',block_type:null,event_type:'calendar_event',status:'LIVE',lane:'serving',review_state:null,
    headline:'Synthetic boundary source',body:'Complete synthetic boundary passage.',sections:{slots:{planet:'Mercury',sign:'Scorpio'}},facts:{},source_snapshot:{},provider:'manual-admin',updated_at:'2026-11-01T12:00:00.123456Z',...overrides};
  const store=await createApiStore([source],{uuidIds:true});
  try{
    const result=await store.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,status:'DRAFT',body:'Synthetic changed boundary passage.'});
    assert(!result.payload.rows?.some((row:any)=>row.event_type==='standalone-article-revision'),'Wrong identities, packages and non-serving originals do not acquire Calendar revision authority');
    assert.equal(store.rows.size,1,'The Calendar path cannot create proposals for unsupported originals');
  }finally{await store.close();}
}

const db=new PGlite();
try{
  await db.exec(publicationTestSchema);
  const migration='20261112020848_calendar_event_private_revisions.sql';
  const index=publicationMigrations.indexOf(migration);assert(index>=0);
  for(const name of publicationMigrations.slice(0,index))await db.exec(readFileSync(new URL(`../apps/web/supabase/migrations/${name}`,import.meta.url),'utf8'));
  const signature='public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)';
  const metadata=async()=> (await db.query('select prosrc,proacl::text as grants,prosecdef,proconfig from pg_proc where oid=$1::regprocedure',[signature])).rows[0] as any;
  const before=await metadata();
  const sql=readFileSync(new URL(`../apps/web/supabase/migrations/${migration}`,import.meta.url),'utf8');
  await db.exec(sql);const after=await metadata();
  const outsideGuard=(source:string)=>{const start=source.indexOf('p_proposal_id=p_target_id or not (');const end=source.indexOf(" or target.status is distinct from 'LIVE'",start);assert(start>=0&&end>start);return[source.slice(0,start),source.slice(end)];};
  assert.deepEqual(outsideGuard(after.prosrc),outsideGuard(before.prosrc),'Every other transaction check and write remains byte-identical');
  for(const key of ['grants','prosecdef','proconfig'])assert.deepEqual(after[key],before[key]);
  await assert.rejects(db.exec(sql),/Unexpected article revision target guard/,'A changed schema stops the migration');
  assert.deepEqual(await metadata(),after);
  await db.query("select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false),set_config('request.headers','{\"x-content-publication-action\":\"publish\"}',false)");
  assert.deepEqual((await db.query('select has_function_privilege($1,$4,$5) as anon,has_function_privilege($2,$4,$5) as authenticated,has_function_privilege($3,$4,$5) as service',['anon','authenticated','service_role',signature,'EXECUTE'])).rows[0],{anon:false,authenticated:false,service:true});
  const positive=calendarPlanets.flatMap(planet=>[`sky.ingress.${planet}.scorpio`,`sky.station.${planet}.scorpio.direct`,`sky.station.${planet}.scorpio.retrograde`]);
  positive.push('sky.ingress.mercury.scorpio.2026-11-01','sky-ingress-mercury-scorpio-2026-11-01','sky-ingress-mercury-scorpio','sky-mercury-enters-scorpio','sky-mercury-in-scorpio','sky.retrograde.venus.scorpio.station_direct','fallback-hook/sky.retrograde/venus/scorpio/station-retrograde');
  const negative=[{content_key:'sky.station.sun.aries.direct'},{content_key:'sky.ingress.mercury.unknown'},{content_key:'ms/ingress/mercury'},{content_key:'sky.retrograde.mercury.scorpio.retrograde_passage'},
    {mode:'article'},{surface:'education'},{block_type:'essay'},{block_type:''},{lane:'reference'},{review_state:'owner-review-required'},
    {status:'DRAFT'},{status:'REVIEWED'},{status:'ARCHIVED'},{provider:'tldrastro-fallback-architecture-v3'},
    {source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3'}},{facts:{fallbackArchitectureV3:true}}];
  let count=0;
  for(const entry of [...positive.flatMap(content_key=>['calendar_event',null].map(block_type=>({content_key,block_type,valid:true}))),...negative.map(value=>({...value,valid:false})),{content_key:positive[0],valid:false,badSlots:true},
    {content_key:positive[0],valid:false,proposalPatch:{block_type:null}}, {content_key:positive[0],block_type:null,valid:false,proposalPatch:{block_type:'calendar_event'}},
    {content_key:positive[0],valid:false,proposalPatch:{surface:'education'}},{content_key:positive[0],valid:false,proposalPatch:{status:'REVIEWED'}},
    {content_key:positive[0],valid:false,proposalPatch:{mode:'feed'}},
    {content_key:'article/manual/calendar-compatibility',mode:'article',valid:true},{content_key:'article/guide/calendar-compatibility',mode:'article',valid:true},
    {content_key:'education/astro-101/calendar-compatibility',surface:'education',mode:'all',valid:true}] as any[]){
    const {valid,badSlots,proposalPatch,...overrides}=entry;
    const target={id:randomUUID(),content_key:positive[0],surface:'sky',mode:'feed',block_type:'calendar_event',event_type:'calendar_event',status:'LIVE',lane:'serving',review_state:null,
      body:'Synthetic complete original SQL passage.',headline:'Synthetic SQL event',sections:{slots:{planet:'Mercury',sign:'Scorpio'}},updated_at:'2026-11-01T12:00:00.123456Z',...overrides};
    if(!valid&&!proposalPatch&&!badSlots&&['content_key','mode','surface','block_type'].some(key=>Object.hasOwn(overrides,key)))assert.equal(calendarPlanetaryRevisionTarget(target),false,'The UI and API target identity stays narrow');
    const proposal={...target,id:randomUUID(),mode:'studio-draft',event_type:'standalone-article-revision',status:'DRAFT',lane:'reference',review_state:'owner-review-required',
      body:'Synthetic complete revised SQL passage.',sections:badSlots?{slots:{planet:'Venus',sign:'Aries'}}:target.sections,
      source_snapshot:{targetRowId:target.id,targetRowUpdatedAt:target.updated_at,targetContentKey:target.content_key},...proposalPatch};
    await seedPublicationRow(db,target);
    if(proposalPatch?.mode&&proposalPatch.mode!=='studio-draft'){
      await assert.rejects(seedPublicationRow(db,proposal),{code:'23514'},'The existing private-proposal database constraint rejects another mode');
      continue;
    }
    await seedPublicationRow(db,proposal);
    const publication=(await db.query('select to_jsonb(p) as value from content_publications p where content_key=$1',[target.content_key])).rows[0]?.value??null;
    const args={p_operation_id:randomBytes(32).toString('hex'),p_actor:'synthetic-calendar-owner',p_request_sha256:'b'.repeat(64),p_action:'publish-standalone-article-revision',p_proposal_id:proposal.id,p_proposal_version:proposal.updated_at,
      p_target_id:target.id,p_target_version:target.updated_at,p_patch:{body:proposal.body,sections:proposal.sections,status:'LIVE',lane:'serving',review_state:null},p_validation_context:{targetPublication:publication},p_dependencies:[]};
    if(!valid){await assert.rejects(callPublicationRpc(db,'content_studio_publish_revision',args),{code:'22023'});assert.equal((await db.query('select body from generated_interpretations where id=$1',[target.id])).rows[0].body,target.body);continue;}
    if(count===0){
      await assert.rejects(callPublicationRpc(db,'content_studio_publish_revision',{...args,p_target_version:'2026-11-01T12:00:00.123457Z'}),{code:'40001'});
      await assert.rejects(callPublicationRpc(db,'content_studio_publish_revision',{...args,p_proposal_version:'2026-11-01T12:00:00.123457Z'}),{code:'40001'});
    }
    const receipt=await callPublicationRpc(db,'content_studio_publish_revision',args);assert.equal(receipt.row.body,proposal.body);
    assert.equal((await db.query('select status from generated_interpretations where id=$1',[proposal.id])).rows[0].status,'ARCHIVED');
    if(count++===0){
      assert.deepEqual(await callPublicationRpc(db,'content_studio_publish_revision',args),receipt,'Exact replay is idempotent');
      await assert.rejects(callPublicationRpc(db,'content_studio_publish_revision',{...args,p_actor:'different-owner'}),{code:'40001'});
      for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(callPublicationRpc(db,'content_studio_publish_revision',args),/permission denied/);await db.exec('reset role');}
    }
  }
  console.log(`PASS Calendar actual-handler private drafts, conflicts, exact copy, archive/restore/republication; ${count} SQL targets including Article/Guide/Astro101, negative admission, unchanged grants/transaction, drift, microsecond CAS and replay.`);
}finally{await db.close();}
