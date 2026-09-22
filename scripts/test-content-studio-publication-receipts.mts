import assert from 'node:assert/strict';
import { createPublicationDb, seedPublicationRow, callPublicationRpc } from '../tests/helpers/studio-publication-db.mjs';
const db = await createPublicationDb();
const targetId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const proposalId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const dependencyId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const version = '2026-09-21T12:00:00.123456Z';
const contentKey = 'cms/qa/publication';
const passage = '  Synthetic owner opening.\r\n\r\nComplete owner ending.  ';
const target = { id: targetId, content_key: contentKey, updated_at: version, status:'LIVE',lane:'serving',review_state:null,target_date:null,
  body: 'Previous complete passage.', sections: {}, source_snapshot: {}, facts: {}, mode:'card' };
const proposal = { ...target,id:proposalId,status:'DRAFT',lane:'reference',review_state:'owner-review-required',
  sections: {packageDraft:{body:passage}},source_snapshot:{targetRowId:targetId,targetRowUpdatedAt:version,targetContentKey:contentKey} };
const args = { p_operation_id:'a'.repeat(64), p_actor:'user:owner',p_request_sha256:'b'.repeat(64),p_action:'approve-package-revision',
 p_proposal_id:proposalId,p_proposal_version:version,p_target_id:targetId,p_target_version:version,
 p_patch:{body:passage,sections:{packageRecord:{body:passage},packageDraft:null},status:'LIVE',lane:'serving',review_state:null},
 p_validation_context:{schema:'qa',targetPublication:null},p_dependencies:[] };
const publish = (extra={}) => callPublicationRpc(db,'content_studio_publish_revision',{...args,...extra});
const snapshot = async () => (await db.query(`select jsonb_build_object('rows',(select jsonb_agg(to_jsonb(g) order by id) from generated_interpretations g),
 'ledger',(select jsonb_agg(to_jsonb(p) order by content_key) from content_publications p),
 'versions',(select jsonb_agg(to_jsonb(v) order by version_id) from project_privacy.studio_row_versions v),
 'operations',(select jsonb_agg(to_jsonb(o) order by operation_id) from project_privacy.studio_publication_operations o)) as snapshot`)).rows[0].snapshot;
try {
 await seedPublicationRow(db,target);await seedPublicationRow(db,proposal);
 await seedPublicationRow(db,{...target,id:dependencyId,content_key:'cms/qa/dependency'});
 args.p_validation_context.targetPublication = (await db.query("select jsonb_build_object('content_key',content_key,'state',state,'revision',revision,'row_id',row_id,'row_updated_at',row_updated_at) as value from content_publications where content_key=$1",[contentKey])).rows[0].value;
 assert.equal(await callPublicationRpc(db,'content_studio_publication_receipt',args),null);
 const before = await snapshot();
 for (const change of [{p_target_version:'2026-09-21T12:00:00.123457Z'},{p_proposal_version:'2026-09-21T12:00:00.123457Z'},
  {p_dependencies:[{id:dependencyId,updatedAt:'2026-09-21T12:00:00.123457Z'}]}, {p_validation_context:{schema:'qa',targetPublication:null}}]) {
  await assert.rejects(publish(change), (e:any)=>e.code==='40001');assert.deepEqual(await snapshot(),before);
 }
 // A late receipt-write failure rolls back target, proposal, ledger and history.
 await db.exec("alter table project_privacy.studio_publication_operations add constraint fault check (actor <> 'user:owner')");
 await assert.rejects(publish(), /fault/);assert.deepEqual(await snapshot(),before);
 await db.exec('alter table project_privacy.studio_publication_operations drop constraint fault');
 const receipt:any = await publish();
 assert.equal(receipt.row.body,passage);assert.equal(receipt.row.sections.packageRecord.body,passage);
 assert.equal(receipt.proposalId,proposalId);assert.equal(receipt.targetId,targetId);
 const saved:any = (await db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1',[proposalId])).rows[0].row;
 assert.equal(saved.status,'ARCHIVED');assert.equal(saved.review_state,'published-revision');
 const ledger:any = (await db.query('select to_jsonb(p) as row from content_publications p where content_key=$1',[contentKey])).rows[0].row;
 assert.equal(ledger.state,'live');assert.equal(ledger.row_updated_at,receipt.targetVersion);
 const committed = await snapshot();
 assert.deepEqual(await publish(),receipt);assert.deepEqual(await snapshot(),committed,'Exact replay makes no writes');
 assert.deepEqual(await callPublicationRpc(db,'content_studio_publication_receipt',args),receipt,'Lost response is recoverable');
 for (const change of [{p_actor:'user:another'},{p_request_sha256:'c'.repeat(64)}, {p_patch:{...args.p_patch,body:'Different copy'}},
 {p_validation_context:{schema:'different'}},{p_dependencies:[{id:dependencyId,updatedAt:version}]}]) {
  await assert.rejects(publish(change),(e:any)=>e.code==='40001');assert.deepEqual(await snapshot(),committed);
 }
 await db.query('select retire_content_everywhere($1,$2,$3)',[contentKey,targetId,receipt.targetVersion]);
 const retired=await snapshot();
 assert.deepEqual(await publish(),receipt);assert.deepEqual(await snapshot(),retired,'Recovery never undoes a later retirement');
 await assert.rejects(db.query('delete from project_privacy.studio_publication_operations'),/append-only/);
 for (const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`);
  await assert.rejects(callPublicationRpc(db,'content_studio_publication_receipt',args),/permission denied/);
  await assert.rejects(publish(),/permission denied/);
  await db.exec('reset role');
 }
 console.log('PASS actual publication SQL: exact versions, target/proposal/ledger/history atomicity, late fault rollback, exact copy, immutable receipt, replay identity, later retirement and access control.');
} finally { await db.close(); }
