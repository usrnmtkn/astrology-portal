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
for(const row of approval.records){
 assert.equal(sha(row.summary),row.summarySha256);
 assert.equal(sha(row.body),row.bodySha256);
 assert.equal(row.body.split(/\s+/).length,row.bodyWordCount);
 const runtime=read(row.runtimeFile);
 for(const target of [runtime.readerCopy,studio.find(r=>r.content_key===row.contentKey),snapshot.rows.find(r=>r.content_key===row.contentKey)]){
  assert.equal(target.summary,row.summary,row.contentKey);
  assert.equal(target.body,row.body,row.contentKey);
 }
 assert.equal(runtime.status,'LIVE');
 const mirror=studio.find(r=>r.content_key===row.contentKey);
 assert.equal(mirror.sections.packageRecord.Body,row.body);
 assert.equal(mirror.sections.packageRecord.review_status,'approved');
 assert.equal(mirror.sections.packageRecord.serving_enabled,true);
 assert.deepEqual(mirror.sections.packageRecord.studio_editable_fields.map(f=>f.path),['Summary','Body']);
}
for(const locked of approval.locked) assert.equal(sha(fs.readFileSync(locked.runtimeFile)),locked.fileSha256,locked.contentKey);
console.log('21 exact approved refinements agree across canonical rows, editable Studio projection and public recovery snapshot; all 3 locked files byte-identical.');
