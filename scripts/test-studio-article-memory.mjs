import assert from 'node:assert/strict';
import { reviseSkyArticleEdition, skyArticleEditableFields } from '../apps/web/src/content/skyArticleTemplateCompiler.ts';
import { activeStudioFeedback, selectStudioFeedback } from '../api/_lib/studio-memory-feedback.ts';
import { studioArticleWritingMemory } from '../api/_lib/studio-article-memory.ts';
import { withStudioFeedback } from '../api/_lib/studio-memory-graph.ts';
import { db, edition, id, initial, store, persist, review } from '../tests/helpers/studio-article-memory-store.mjs';
try{
  const fields=skyArticleEditableFields(edition);
  fields.housePassages[0].body='Synthetic replacement house opening. Synthetic complete house ending.';
  const revised=await reviseSkyArticleEdition(edition,fields);
  const saved=await store.invoke('PATCH',{id,expectedUpdatedAt:initial.updated_at,ownerAction:'save-sky-article-edition-revision',sections:{skyArticleEdition:revised}});
  assert.equal(saved.status,200,JSON.stringify(saved));
  const evidence=(await db.query('select * from studio_memory_feedback')).rows[0];
  assert.equal(evidence.family,'sky-article');assert.equal(evidence.status,'pending');
  const before=JSON.parse(evidence.before_text),after=JSON.parse(evidence.after_text);
  assert.equal(before.body,edition.body);assert.equal(after.body,revised.body);
  assert.equal(after['house:1'],fields.housePassages[0].body);
  assert.equal(after['house:12'],fields.housePassages[11].body,'Complete final passage retained');
  assert.equal((await review(evidence)).statusCode,409);
  assert.equal((await store.invoke('PATCH',{id,expectedUpdatedAt:initial.updated_at,ownerAction:'save-sky-article-edition-revision',sections:{skyArticleEdition:revised}})).status,409);
  assert.equal((await db.query('select count(*)::int n from studio_memory_feedback')).rows[0].n,1);
  const approved=await store.invoke('PATCH',{id,expectedUpdatedAt:saved.payload.rows[0].updated_at,ownerAction:'approve-sky-article-edition'});
  assert.equal(approved.status,200,JSON.stringify(approved));
  let result=await review(evidence);assert.equal(result.statusCode,200,JSON.stringify(result));
  let active=(await activeStudioFeedback())[0];
  const graph=withStudioFeedback({records:[],sources:[],edges:[],counts:{correction:0},fingerprint:'synthetic'},[active]);
  assert.equal(graph.records[0].register,'sky-article');assert(graph.records[0].body.includes('Synthetic complete house ending'));
  assert.equal(selectStudioFeedback([active],'sky.placement.base.saturn.aries').receipt.selected.length,0);
  assert.equal(selectStudioFeedback([active],'sky-article/saturn/pisces/2023').receipt.selected.length,0);
  assert.equal(selectStudioFeedback([{...active,scope:'sky',family:'sky-placement',content_key:'sky.placement.base.sun.leo'}],edition.contentKey).receipt.selected.length,0);
  const packet=await studioArticleWritingMemory({planet:'saturn',sign:'aries',facts:{entryYear:2026}});
  assert(packet.receipt.selected.length>=1);
  assert(packet.receipt.selected.some(item=>String(item.memoryId).startsWith('studio-')),'Combined memory must retain the approved Studio correction.');
  assert(packet.prompt.includes('Synthetic complete house ending'));
  assert(packet.prompt.includes('Unchanged fields and unchanged wording are context, not rejected writing.'));
  assert(!JSON.stringify(packet.receipt).includes('Synthetic complete'));
  result=await review(active,'active','family','Synthetic explicit article-family decision');assert.equal(result.statusCode,200);
  active=result.payload.rows[0];
  assert.equal(selectStudioFeedback([active],'sky-article/saturn/pisces/2023').receipt.selected.length,1);
  assert.notEqual((await review(active,'active','sky','Do not cross surfaces')).statusCode,200);
  // First edit of a published edition is an INSERT, using the stored target as baseline.
  const nextFields=skyArticleEditableFields(revised);nextFields.tldr='Synthetic next summary.';
  const nextEdition=await reviseSkyArticleEdition(revised,nextFields);
  const forkSave=await store.invoke('PATCH',{id,expectedUpdatedAt:approved.payload.rows[0].updated_at,
    ownerAction:'save-sky-article-edition-revision',sections:{skyArticleEdition:nextEdition}});
  assert.equal(forkSave.status,200,JSON.stringify(forkSave));
  const revision=forkSave.payload.rows[0];assert.notEqual(revision.id,id);
  const forked=(await db.query('select * from studio_memory_feedback where source_row_id=$1',[revision.id])).rows[0];
  assert.equal(forked.content_key,edition.contentKey);assert.equal(JSON.parse(forked.before_text).tldr,revised.tldr);
  assert.equal((await review(forked)).statusCode,409,'A revision cannot approve different target wording');
  const publication=await store.invoke('PATCH',{id:revision.id,expectedUpdatedAt:revision.updated_at,ownerAction:'publish-sky-article-edition-revision'});
  assert.equal(publication.status,200,JSON.stringify(publication));
  const approvedFork=await review(forked);assert.equal(approvedFork.statusCode,200,JSON.stringify(approvedFork));
  assert.equal((await db.query('select count(*)::int n from studio_memory_feedback')).rows[0].n,2,'Publishing does not duplicate a correction');
  await review(approvedFork.payload.rows[0],'retired');
  // Structured legacy article sources capture draft overlays without importing metadata.
  const legacy={...initial,id:'44444444-4444-4444-8444-444444444444',content_key:'fallback-hook/sky-sign-copy/saturn/capricorn',mode:'feed',event_type:'fallback-system-reference',sections:{packageRecord:{opening:'Synthetic original opening.',close:'Synthetic complete ending.',review_status:'approved',internal_note:'PRIVATE NOTE MUST NOT INGEST'}}};
  await persist(legacy,true);await persist({...legacy,sections:{...legacy.sections,packageDraft:{opening:'Synthetic revised opening.'}},updated_at:'2026-09-11T23:01:00Z'});
  const legacyEvidence=(await db.query('select * from studio_memory_feedback where source_row_id=$1',[legacy.id])).rows[0];
  assert.equal(JSON.parse(legacyEvidence.after_text).close,'Synthetic complete ending.');assert(!legacyEvidence.after_text.includes('PRIVATE NOTE'));
  await review(active,'retired');assert.equal((await activeStudioFeedback()).length,0);
  for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(db.query("select studio_article_memory_fields('{}')"),/permission denied/);await db.exec('reset role');}
  globalThis.fetch=async()=>{throw new Error('Synthetic memory outage')};
  await assert.rejects(studioArticleWritingMemory({planet:'saturn',sign:'aries',facts:{entryYear:2026}}),/Storage request failed/);
  console.log('Article memory passed: real structured save/approval, combined governed corrections, full fields, first published revision, exact scope, private metadata, retirement, and fail-closed retrieval.');
}finally{await db.close();delete process.env.STUDIO_MEMORY_FEEDBACK_ENABLED;}
