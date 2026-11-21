import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { buildRows } from './seed-published-calendar-aspect-content-studio.mjs';
const root='packages/astro-knowledge/review/calendar-collective-pressure-pass-2026-09-07';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const approval=read(`${root}/owner-release-authorization.json`);
assert.equal(approval.authority,'owner');
assert.equal(approval.decision,'approve');
assert.equal(approval.memberCount,21);
assert.equal(approval.records.length,21);
assert.equal(approval.source.taskId,'01a07b36-6921-7b60-925e-388b908a9a41');
assert.equal(sha(fs.readFileSync(`${root}/candidate-payloads.json`)),approval.candidateFileSha256);
const snapshot=read('apps/web/public/content-studio-last-known-good.json');
const studio=buildRows();
const publications=new Map(snapshot.publications.map(row=>[row.content_key,row]));
let ownerRevisions=0;
function assertRecoveryVersion(target, baseline, publication){
 assert.ok(target,baseline.contentKey);
 assert.equal(target.status,'LIVE');
 assert.equal(target.lane,'serving');
 assert.equal(target.review_state,null);
 assert.equal(target.target_date??null,null);
 assert.equal(publication?.state,'live');
 assert.equal(publication.row_id,target.id);
 assert.equal(publication.row_updated_at,target.updated_at);
 assert.ok(Number.isSafeInteger(publication.revision)&&publication.revision>0);
 if(target.summary===baseline.summary&&target.body===baseline.body)return false;
 // A recovery export follows the current publication, not an immutable older
 // baseline. Public projection retains the exact owner body receipt; its full
 // copy hash also covers private authoring sections and stays opaque here.
 const source=target.source_snapshot;
 const owner=source?.studioOwnerApproval;
 assert.equal(source?.contentStudioExactAspect,true);
 assert.equal(source.review_status,'approved');
 const [, , a, aspect, b]=baseline.contentKey.split('.');
 assert.deepEqual(source.exactSkyAspectIdentity,{a,b,aspect});
 assert.equal(owner?.action,'publish-owner-content');
 assert.equal(owner.contentKey,baseline.contentKey);
 assert.equal(owner.bodyHash,sha(target.body));
 assert.match(owner.copyHash,/^[a-f0-9]{64}$/u);
 assert.equal(typeof target.summary,'string');
 return true;
}
for(const row of approval.records){
 assert.equal(sha(row.summary),row.summarySha256);
 assert.equal(sha(row.body),row.bodySha256);
 assert.equal(row.body.split(/\s+/).length,row.bodyWordCount);
 const runtime=read(row.runtimeFile);
 for(const target of [runtime.readerCopy,studio.find(r=>r.content_key===row.contentKey)]){
  assert.equal(target.summary,row.summary,row.contentKey);
  assert.equal(target.body,row.body,row.contentKey);
 }
 assert.equal(runtime.status,'LIVE');
 const mirror=studio.find(r=>r.content_key===row.contentKey);
 assert.equal(mirror.sections.packageRecord.Body,row.body);
 assert.equal(mirror.sections.packageRecord.review_status,'approved');
 assert.equal(mirror.sections.packageRecord.serving_enabled,true);
 assert.deepEqual(mirror.sections.packageRecord.studio_editable_fields.map(f=>f.path),['Summary','Body']);
 const recovery=snapshot.rows.find(r=>r.content_key===row.contentKey);
 const publication=publications.get(row.contentKey);
 if(assertRecoveryVersion(recovery,row,publication)){
  ownerRevisions++;
  assert.throws(()=>assertRecoveryVersion({...recovery,body:recovery.body+' Changed.'},row,publication),'Changed copy cannot reuse the owner body receipt.');
  assert.throws(()=>assertRecoveryVersion(recovery,row,{...publication,row_id:'stale-version'}),'A stale publication cannot authorize current copy.');
  assert.throws(()=>assertRecoveryVersion({...recovery,status:'DRAFT'},row,publication),'Draft copy cannot enter recovery.');
  assert.throws(()=>assertRecoveryVersion({...recovery,source_snapshot:{...recovery.source_snapshot,studioOwnerApproval:null}},row,publication),'A different passage needs its own owner receipt.');
 }
}
for(const locked of approval.locked) assert.equal(sha(fs.readFileSync(locked.runtimeFile)),locked.fileSha256,locked.contentKey);
console.log(`21 historical refinements remain exact in canonical rows and the editable baseline; recovery verifies current publication identities, including ${ownerRevisions} later owner revisions; all 3 locked files byte-identical.`);
