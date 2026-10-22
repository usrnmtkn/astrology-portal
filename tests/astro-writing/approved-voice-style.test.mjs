import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
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

test('dated ingress uses the exact revised Libra benchmark with complete supporting Scorpio only in its requested scope',()=>{
  const value=approvedVoiceStyleReference({surface:'sky',family:'sky-ingress-essay'});
  assert.equal(value.reference.id,'libra-ingress-voice-benchmark-20261021');
  assert.equal(value.reference.textSha256,'2e25f72d7fddd6db112a4e8b3c8ff9fed8250844940a263742ab630d0a937fd8');
  assert.equal(hash(value.reference.text),value.reference.textSha256);
  assert.equal(value.reference.wordCount,1149);
  assert(value.reference.text.startsWith('# Libra Season 2026\n'));
  assert.doesNotMatch(value.reference.text,/I need to develop the article|Here is that rewrite|No paid generation/);
  assert.equal(value.reference.approval.kind,'voice-benchmark-only');
  assert.match(value.reference.approval.exactOwnerRequest,/make this version the voice benchmark for the ingress writer/);
  assert.deepEqual(value.reference.scope,['sky-ingress-essay']);
  assert.equal(value.reference.ownerAuthored,false);assert.equal(value.reference.factUseAuthorized,false);
  assert.equal(value.reference.readerServing,false);assert.equal(value.reference.publicationAuthorized,false);
  const supporting=value.supportingReferences[0];
  assert.equal(supporting.reference.id,'sun-scorpio-ingress-voice-20261020');
  assert.equal(supporting.reference.textSha256,'6799ba2f672c68281981a14ea53b1baee7cdd8874f0dc6e7d624402ec5d1980b');
  assert.equal(hash(supporting.reference.text),supporting.reference.textSha256);
  assert.deepEqual(value.receipt.supportingReferences,[supporting.receipt]);
  const prompt=approvedVoiceStylePrompt({surface:'sky',family:'sky-ingress-essay'});
  for(const entry of [value,supporting])assert.equal(prompt.split(JSON.stringify(entry.reference.text)).length-1,1);
  assert.match(value.authority,/primary voice benchmark/);
  assert.match(value.authority,/complete original author season passages/);
  assert.match(value.authority,/does not require a hidden motive, difficulty, hook or advice/);
  assert.match(value.authority,/KB and Calendar establish meaning; calculated facts and coverage establish this occurrence/);
  assert.equal(approvedVoiceStyleReference({surface:'sky',family:'sky-article-template-slots'}).reference.id,'saturn-aries-voice-20261020');
  assert.equal(approvedVoiceStyleReference({surface:'you',family:'sky-ingress-essay'}).reference.id,'saturn-aries-voice-20261020');
});

test('ingress bodies stay private and missing or corrupt storage fails closed without affecting other writers',()=>{
  const context={surface:'sky',family:'sky-ingress-essay'};
  const value=approvedVoiceStyleReference(context);
  for(const entry of [value,...value.supportingReferences]){
    const publicMetadata=JSON.parse(fs.readFileSync(entry.receipt.sourcePath,'utf8'));
    assert.equal(publicMetadata.text,undefined);
    assert.match(publicMetadata.textSourceRef,/^private:ingress-style\//);
    assert.equal(publicMetadata.textSha256,entry.reference.textSha256);
  }
  const previous={CI:process.env.CI,PRIVATE_INGRESS_STYLE_REFERENCES:process.env.PRIVATE_INGRESS_STYLE_REFERENCES};
  const store={schema:'private-ingress-style-references/v1',references:Object.fromEntries([value,...value.supportingReferences].map(entry=>[entry.reference.id,{text:entry.reference.text,textSha256:entry.reference.textSha256}]))};
  const encode=object=>gzipSync(JSON.stringify(object)).toString('base64');
  try{
    process.env.CI='true';delete process.env.PRIVATE_INGRESS_STYLE_REFERENCES;
    assert.throws(()=>approvedVoiceStyleReference(context),/STORAGE_UNAVAILABLE/);
    assert.equal(approvedVoiceStyleReference({surface:'horoscopes',family:'horoscope'}).reference.id,'saturn-aries-voice-20261020');
    process.env.PRIVATE_INGRESS_STYLE_REFERENCES='invalid';
    assert.throws(()=>approvedVoiceStyleReference(context),/STORAGE_INVALID/);
    const changed=structuredClone(store);changed.references[value.reference.id].text+=' changed';
    process.env.PRIVATE_INGRESS_STYLE_REFERENCES=encode(changed);
    assert.throws(()=>approvedVoiceStyleReference(context),/STORAGE_INVALID/);
    const missing=structuredClone(store);delete missing.references[value.supportingReferences[0].reference.id];
    process.env.PRIVATE_INGRESS_STYLE_REFERENCES=encode(missing);
    assert.throws(()=>approvedVoiceStyleReference(context),/STORAGE_INVALID/);
    process.env.PRIVATE_INGRESS_STYLE_REFERENCES=encode(store);
    assert.equal(hash(JSON.stringify(approvedVoiceStyleReference(context))),hash(JSON.stringify(value)));
  }finally{for(const [key,prior] of Object.entries(previous)){if(prior===undefined)delete process.env[key];else process.env[key]=prior;}}
});

test('altered or omitted supporting benchmark evidence fails before request rendering',()=>{
  for(const mutate of [
    value=>{value.supportingReferences[0].reference.text+=' changed';},
    value=>{value.supportingReferences[0].reference.factUseAuthorized=true;},
    value=>{value.supportingReferences=[];},
    value=>{delete value.receipt.supportingReferences;},
    value=>{value.receipt.supportingReferences[0].textSha256='0'.repeat(64);}
  ]){
    const value=approvedVoiceStyleReference({surface:'sky',family:'sky-ingress-essay'});mutate(value);
    assert.throws(()=>renderApprovedVoiceStyleReference(value),/APPROVED_VOICE_STYLE_/);
  }
});

function hash(value){return createHash('sha256').update(value).digest('hex');}
