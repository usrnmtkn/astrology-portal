import assert from 'node:assert/strict';
import {store} from '../tests/helpers/sky-article-save-api.mts';
import {emptyHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody} from '../apps/web/src/content/horoscopeEditions.mjs';
import {createPublicationDb,seedPublicationRow,callPublicationRpc} from '../tests/helpers/studio-publication-db.mjs';
import {decodeWeeklyHistoryRow} from '../api/_lib/horoscope-history-storage.ts';
import {ownerPublicationStatusPath} from '../apps/admin/src/ownerPublication.ts';

try {
 for(const period of ['daily','weekly','monthly','seasonal']) {
  const packet=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=2030-01-09&timeZone=America/New_York`);
  assert.equal(packet.status,200);
  const edition=emptyHoroscopeEdition(packet.payload.brief.window);
  for(const passage of edition.passages){passage.headline=`Synthetic ${passage.sign}`;passage.body=`Complete synthetic ${passage.sign} opening. Complete synthetic ending.`;}
  const history=period==='weekly'?{readings:{aries:{privateSyntheticHistory:'SYNTHETIC_HISTORY '.repeat(10000)}}}:undefined;
  const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:`Synthetic ${period}`,body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief:packet.payload.brief,signature:packet.payload.signature}},sourceSnapshot:{privateNotes:'PRIVATE_REVISION_CANARY',...(history?{horoscopeGeneration:history}:{})}});
  assert.equal(created.status,200,JSON.stringify(created));
  const patch=(row:any,body:any)=>store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,...body});
  const first=await patch(created.payload.rows[0],{ownerAction:'publish-owner-content'});
  assert.equal(first.status,200,JSON.stringify(first));
  const live=structuredClone(first.payload.rows[0]);
  const read=()=>store.invoke('POST',{ids:[live.id]},'/api/content-reader');
  assert.equal((await read()).payload.rows[0]?.body,live.body);
  const revised=structuredClone(edition);revised.passages[0].body+=' Complete revised ending.';
  const draftBody={status:'DRAFT',lane:'serving',reviewState:null,body:horoscopeEditionBody(revised),sections:{horoscopeEdition:revised},sourceSnapshot:{horoscopeOutlines:{}}};
  const fork=await patch(live,draftBody);
  assert.equal(fork.status,200,JSON.stringify(fork));
  assert.deepEqual(decodeWeeklyHistoryRow(store.rows.get(live.id)),live,'Saving a revision must leave every published source field unchanged');
  let revision=fork.payload.rows[0];
  assert.notEqual(revision.id,live.id);assert.equal(revision.event_type,'horoscope-edition-revision');
  assert.equal(revision.lane,'reference');assert.equal(revision.source_snapshot.targetRowId,live.id);
  if(history){assert(store.rows.get(revision.id).source_snapshot.horoscopeGeneration.historyArchive);assert.deepEqual(revision.source_snapshot.horoscopeGeneration,history);}
  assert.equal((await read()).payload.rows[0]?.body,live.body);
  assert(!JSON.stringify((await read()).payload).includes('PRIVATE_REVISION_CANARY'));
  const reopened=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeEditions=true&horoscopeEditor=true&id=${revision.id}`);
  assert.equal(reopened.payload.rows[0]?.id,revision.id);
  assert.equal(reopened.payload.rows[0]?.source_snapshot.targetRowId,live.id,'Weekly transport retains revision identity');
  const inventory=await store.invoke('GET',undefined,'/api/admin/generated-content?horoscopeEditions=true&editionInventory=true');
  assert(inventory.payload.rows.some((row:any)=>row.id===revision.id),'Saved drafts remain discoverable');
  assert.equal((await patch(live,draftBody)).status,409,'A second editor cannot overwrite a pending draft');
  const resaved=await patch(revision,draftBody);assert.equal(resaved.status,200,JSON.stringify(resaved));revision=resaved.payload.rows[0];
  assert.equal(revision.lane,'reference');assert.equal(revision.source_snapshot.targetRowId,live.id);
  assert.deepEqual(decodeWeeklyHistoryRow(store.rows.get(live.id)),live);
  assert.equal((await patch(revision,{ownerAction:'publish-owner-content'})).status,409);
  assert.equal((await patch(revision,{status:'LIVE'})).status,409);
  assert.equal((await patch(revision,{ownerAction:'publish-horoscope-edition-revision',body:'Unexpected unsaved content'})).status,400);
  const tampered=await patch(revision,{sourceSnapshot:{targetRowId:'wrong-target',targetRowUpdatedAt:'2000-01-01T00:00:00Z'}});
  assert.equal(tampered.status,200);revision=tampered.payload.rows[0];
  assert.equal(revision.source_snapshot.targetRowId,live.id,'Draft requests cannot retarget the saved proposal');
  assert.equal(revision.source_snapshot.targetRowUpdatedAt,live.updated_at);
  const archived=await patch(revision,{status:'ARCHIVED'});assert.equal(archived.status,200);revision=archived.payload.rows[0];
  assert.equal((await read()).payload.rows[0]?.body,live.body,'Archiving only the revision preserves publication');
  const restored=await patch(revision,{status:'DRAFT'});assert.equal(restored.status,200);revision=restored.payload.rows[0];
  const publish=(row=revision)=>patch(row,{ownerAction:'publish-horoscope-edition-revision'});
  const submitted=structuredClone(revision);
  const published=await publish();assert.equal(published.status,200,JSON.stringify(published));
  const next=published.payload.rows[0];assert.equal(next.id,live.id);assert.equal(next.body,draftBody.body);
  if(history){assert(store.rows.get(live.id).source_snapshot.horoscopeGeneration.historyArchive);assert.deepEqual(next.source_snapshot.horoscopeGeneration,history);}
  assert.equal((await read()).payload.rows[0]?.body,draftBody.body);
  assert.equal(store.rows.get(revision.id).status,'ARCHIVED');
  const recovered=await store.invoke('GET',undefined,ownerPublicationStatusPath(submitted,'publish-horoscope-edition-revision'));
  assert.equal(recovered.status,200);assert.equal(recovered.payload.rows[0]?.id,live.id);
  assert.equal(recovered.payload.publicationReceipt.currentPublicationState,'live');
  assert.equal((await publish(submitted)).payload.rows[0]?.updated_at,next.updated_at,'Receipt replay must not write again');
  const again=await patch(next,draftBody);assert.equal(again.status,200);revision=again.payload.rows[0];
  const changed=await patch(next,{reviewerNotes:'Synthetic concurrent source update'});assert.equal(changed.status,200);
  assert.equal((await publish()).status,409,'Stale revisions cannot replace a changed live source');
  assert.equal(store.rows.get(revision.id).status,'DRAFT');
 }
 console.log('Horoscope revision API and PostgreSQL publication checks passed for all four periods.');
} finally {await store.publication.close();}

const db=await createPublicationDb();
try {
 const target={id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',content_key:'horoscope/daily/sql-fixture',mode:'article',status:'LIVE',lane:'serving',review_state:null,body:'Complete original fixture.',headline:'SQL fixture',sections:{},updated_at:'2026-10-27T00:00:00.000Z'};
 const proposal={...target,id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',content_key:'horoscope/daily/wrong-key',mode:'studio-draft',event_type:'horoscope-edition-revision',status:'DRAFT',lane:'reference',review_state:'owner-review-required',body:'Complete pending fixture.',source_snapshot:{targetRowId:target.id,targetRowUpdatedAt:target.updated_at,targetContentKey:target.content_key}};
 await seedPublicationRow(db,target);await seedPublicationRow(db,proposal);
 const publications=await db.query('select to_jsonb(p) as publication from content_publications p where content_key=$1',[target.content_key]);
 const args={p_operation_id:'a'.repeat(64),p_actor:'synthetic-owner',p_request_sha256:'b'.repeat(64),p_action:'publish-horoscope-edition-revision',p_proposal_id:proposal.id,p_proposal_version:proposal.updated_at,p_target_id:target.id,p_target_version:target.updated_at,p_patch:{body:proposal.body,status:'LIVE',lane:'serving',review_state:null},p_validation_context:{targetPublication:publications.rows[0].publication},p_dependencies:[]};
 await assert.rejects(callPublicationRpc(db,'content_studio_publish_revision',args),{code:'22023'},'SQL itself rejects another edition key');
 await db.query('update generated_interpretations set content_key=$1,status=null where id=$2',[target.content_key,proposal.id]);
 await assert.rejects(callPublicationRpc(db,'content_studio_publish_revision',args),{code:'22023'},'Null proposal status fails closed');
 await db.query("update generated_interpretations set status='DRAFT' where id=$1",[proposal.id]);
 await assert.rejects(callPublicationRpc(db,'content_studio_publish_revision',{...args,p_proposal_id:target.id,p_proposal_version:target.updated_at}),{code:'22023'},'SQL requires a separate proposal');
 await assert.rejects(db.query("update generated_interpretations set mode='article' where id=$1",[proposal.id]),{code:'23514'});
 await assert.rejects(db.query("update generated_interpretations set status='LIVE',lane='serving' where id=$1",[proposal.id]),{code:'23514'},'Older servers cannot publish a private proposal');
 assert.deepEqual((await db.query('select body,status from generated_interpretations where id=$1',[target.id])).rows[0],{body:target.body,status:'LIVE'});
 const signature='public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)';
 const grants=await db.query('select has_function_privilege($1,$4,$5) as anon,has_function_privilege($2,$4,$5) as authenticated,has_function_privilege($3,$4,$5) as service',['anon','authenticated','service_role',signature,'EXECUTE']);
 assert.deepEqual(grants.rows[0],{anon:false,authenticated:false,service:true});
 console.log('Horoscope SQL target boundaries, private proposal constraints and service-only grants passed.');
} finally {await db.close();}
