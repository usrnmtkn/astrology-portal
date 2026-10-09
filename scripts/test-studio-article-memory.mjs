import assert from 'node:assert/strict';
import { compileSkyArticleEdition, reviseSkyArticleEdition, skyArticleEditableFields } from '../apps/web/src/content/skyArticleTemplateCompiler.ts';
import { skyIngressEssayFields, SKY_INGRESS_ESSAY_TEMPLATE } from '../apps/web/src/content/skyIngressEssay.mjs';
import { activeStudioFeedback, selectStudioFeedback } from '../api/_lib/studio-memory-feedback.ts';
import { studioArticleWritingMemory, studioArticleWritingMemoryKey } from '../api/_lib/studio-article-memory.ts';
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
  const ingressIdentity={planet:'saturn',sign:'aries',facts:{entryYear:2026,articleFormat:'ingress-essay-v2',validFrom:'2026-02-13'}};
  const visitKey=studioArticleWritingMemoryKey(ingressIdentity);
  assert.equal(visitKey,'sky-article/saturn/aries/2026/2026-02-13');
  assert.equal(selectStudioFeedback([{...active,content_key:visitKey}],visitKey).receipt.selected.length,1);
  assert.equal(selectStudioFeedback([{...active,content_key:visitKey}],`${visitKey.slice(0,-10)}2026-10-25`).receipt.selected.length,0);
  assert.throws(()=>studioArticleWritingMemoryKey({...ingressIdentity,facts:{entryYear:2026,articleFormat:'ingress-essay-v2'}}),/calculated visit date/);
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
  // Dated ingress edits travel through the actual save, SQL capture and approval path.
  const dated=await compileSkyArticleEdition({format:'ingress-essay-v2',planet:'saturn',sign:'aries',entryYear:2026,
    templateKey:edition.templateKey,templateBody:SKY_INGRESS_ESSAY_TEMPLATE,validFrom:'2026-02-13',validTo:'2028-04-11',
    transitStartInstant:'2026-02-14T00:00:00Z',transitEndInstant:'2028-04-12T00:00:00Z',
    slotValues:Object.fromEntries(skyIngressEssayFields.map(({name})=>[name,`Synthetic complete ${name}.`])),
    tldr:'Synthetic dated summary.',housePassages:[]});
  const datedRow={...initial,id:'55555555-5555-4555-8555-555555555555',content_key:dated.contentKey,
    headline:dated.headline,summary:dated.tldr,body:dated.body,sections:{skyArticleEdition:dated}};
  store.rows.set(datedRow.id,datedRow);await persist(datedRow,true);
  const datedFields=skyArticleEditableFields(dated);datedFields.tldr='Synthetic revised dated summary.';
  const datedRevision=await reviseSkyArticleEdition(dated,datedFields);
  const datedSave=await store.invoke('PATCH',{id:datedRow.id,ownerAction:'save-sky-article-edition-revision',sections:{skyArticleEdition:datedRevision}});
  assert.equal(datedSave.status,200,JSON.stringify(datedSave));
  const datedEvidence=(await db.query('select * from studio_memory_feedback where source_row_id=$1',[datedRow.id])).rows[0];
  assert.equal(datedEvidence.content_key,visitKey);
  assert.equal((await review(datedEvidence)).statusCode,409);
  const datedApproval=await store.invoke('PATCH',{id:datedRow.id,ownerAction:'approve-sky-article-edition'});
  assert.equal(datedApproval.status,200,JSON.stringify(datedApproval));
  assert.equal((await review(datedEvidence)).statusCode,200);
  const datedPacket=await studioArticleWritingMemory(ingressIdentity);
  assert(datedPacket.prompt.includes('Synthetic revised dated summary.'));
  const laterPacket=await studioArticleWritingMemory({...ingressIdentity,facts:{...ingressIdentity.facts,validFrom:'2026-10-25'}});
  assert(!laterPacket.prompt.includes('Synthetic revised dated summary.'));
  for(const key of [visitKey,visitKey.replace('sky-article/','sky-article-revision/'),edition.contentKey]) {
    assert.equal((await db.query('select studio_article_memory_key($1) as key',[key])).rows[0].key,key.replace('sky-article-revision/','sky-article/'));
  }
  assert.equal((await db.query("select studio_article_memory_key('sky-article/saturn/aries/2026/extra') as key")).rows[0].key,null);
  for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(db.query('select studio_article_memory_key($1)',[visitKey]),/permission denied/);await db.exec('reset role');}
  for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(db.query("select studio_article_memory_fields('{}')"),/permission denied/);await db.exec('reset role');}
  globalThis.fetch=async()=>{throw new Error('Synthetic memory outage')};
  await assert.rejects(studioArticleWritingMemory({planet:'saturn',sign:'aries',facts:{entryYear:2026}}),/Storage request failed/);
  console.log('Article memory passed: real structured save/approval, combined governed corrections, full fields, first published revision, exact scope, private metadata, retirement, and fail-closed retrieval.');
}finally{await db.close();delete process.env.STUDIO_MEMORY_FEEDBACK_ENABLED;}
