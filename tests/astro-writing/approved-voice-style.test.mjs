import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {approvedVoiceStyleReference,approvedVoiceStylePrompt,renderApprovedVoiceStyleReference,validateApprovedVoiceStyleReference,APPROVED_VOICE_STYLE_SOURCE} from '../../src/astro-writing/approvedVoiceStyle.mjs';

test('the complete exact owner-approved passage retains its actual authorship and approval scope',()=>{
  const source=JSON.parse(fs.readFileSync(APPROVED_VOICE_STYLE_SOURCE,'utf8'));
  assert.equal(source.textSha256,'bd9e64d07024c4899150056265b4f7a22afd074a4c9eb94b1b126319d6994fca');
  assert.equal(createHash('sha256').update(source.text).digest('hex'),source.textSha256);
  assert.equal(source.wordCount,196);assert.equal(source.text.split('\n\n').length,3);
  assert.equal(source.author,'assistant');assert.equal(source.ownerAuthored,false);
  assert.equal(source.ownerApproved,true);assert.equal(source.positiveVoiceEvidence,true);
  assert.equal(source.factUseAuthorized,false);assert.equal(source.readerServing,false);assert.equal(source.publicationAuthorized,false);
  assert.match(source.approval.exactOwnerRequest,/approved voice reference/u);
  assert.match(source.approval.exactOwnerRequest,/keeping my existing writing rules/u);
});

test('the approved reference travels whole with hashes and current-rule, register and factual boundaries',()=>{
  for(const context of [{family:'horoscope',surface:'horoscopes'},{family:'lunations',surface:'calendar-lunation'},{family:'fast-mover-article',surface:'sky-placement-page'},{surface:'sky'},{surface:'you',family:'natal-placement'},{surface:'natal',family:'placement'}]){
    const support=approvedVoiceStyleReference(context),copy=structuredClone(support);
    const prompt=approvedVoiceStylePrompt(context);
    assert(prompt.includes(JSON.stringify(support.reference.text)));
    assert.equal(support.receipt.role,'style-only');assert.equal(support.receipt.ownerAuthored,false);
    assert.match(support.authority,/current corrections, saved writing profiles/u);
    assert.match(support.authority,/target register, length, emotional range and information budget/u);
    assert.match(support.authority,/no current chart facts/u);
    assert.match(support.authority,/Do not turn every placement into a problem/u);
    renderApprovedVoiceStyleReference(support);assert.deepEqual(support,copy);
  }
});

test('corruption, inferred approval and incorrect source roles stop before a writer can use them',()=>{
  const valid=approvedVoiceStyleReference({family:'horoscope'});
  for(const change of [r=>{r.text+=' changed';},r=>{r.ownerApproved=false;},r=>{r.ownerAuthored=true;},r=>{r.readerServing=true;},r=>{r.factUseAuthorized=true;},r=>{r.approval.sourceUri='owner_chat';},r=>{r.approval.exactOwnerRequest='';}]){
    const bad=structuredClone(valid.reference);change(bad);
    assert.throws(()=>validateApprovedVoiceStyleReference(bad),/APPROVED_VOICE_STYLE_REFERENCE_INVALID/u);
  }
  const bad=structuredClone(valid);bad.receipt.sourceSha256='0'.repeat(64);
  assert.throws(()=>renderApprovedVoiceStyleReference(bad),/RECEIPT_MISMATCH/u);
});

test('dedicated Personal Transit and relationship writers keep their own primary voice workflow',()=>{
  for(const context of [{surface:'you',family:'transit-aspect'},{surface:'friends'},{family:'bond-effect'},{surface:'friends-relationship'},{surface:'synastry'},{surface:'composite'},{surface:'unregistered'}]){
    assert.equal(approvedVoiceStyleReference(context),null);assert.equal(approvedVoiceStylePrompt(context),'');
  }
  assert.equal(renderApprovedVoiceStyleReference(null),'');
});
