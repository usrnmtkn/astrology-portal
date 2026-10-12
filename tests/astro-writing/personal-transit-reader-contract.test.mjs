import { syntheticReaderMeanings } from './fixtures/personal-transit-reader-meanings.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareBatch, validatePassage, sha256 } from '../../src/astro-writing/ownerTransitBatch.mjs';
import { PERSONAL_TRANSIT_READER_RULES as RULES, READER_RULES_JSON, READER_RULES_SHA256, READER_RULES_INSTRUCTION, readerRuleFindings } from '../../src/astro-writing/personalTransitReaderRules.mjs';

const keys=['moon/saturn/sextile','mercury/venus/trine','mars/saturn/square','moon/chiron/trine'];
const records=keys.map(k=>({contentKey:`authored/transit-aspect/${k}`,body_you:'TARGET_YOU_MUST_NOT_LEAK {{untilDate}}',body_they:'TARGET_FRIEND_MUST_NOT_LEAK {{untilDate}}'}));
const text='Complete synthetic voice fixture.';
const examples=[{contentKey:'synthetic/voice-only',field:'body_you',text,sha256:sha256(text),source:'synthetic',preferred:true,ownerApproved:true}];
const readerMeanings=syntheticReaderMeanings(records);
const batch=prepareBatch({readerMeanings,id:'contract-fixture',records,examples,friendEvidencePolicy:'owner-authorized-you-voice'});
const contact=batch.contacts[0];

test('every actual Gemini body transports the exact complete effective bundle',()=>{
  for(const c of batch.contacts)for(const p of c.passages){
    const actual=JSON.parse(JSON.stringify(p.request));
    assert.equal(actual.input.split(READER_RULES_INSTRUCTION).length,2);
    const extracted=actual.input.split('CURRENT PERSONAL TRANSIT READER-COPY RULE BUNDLE\n')[1].split('\n\n')[0];
    assert.equal(extracted,READER_RULES_JSON);
    assert.deepEqual(JSON.parse(extracted),RULES);
    assert.equal(sha256(extracted),READER_RULES_SHA256);
    assert.equal(p.readerRuleBundleSha256,READER_RULES_SHA256);
    assert.equal(validatePassage('You read a fixture through {{untilDate}}.',c,c.passages[0]).readerRuleBundleSha256,READER_RULES_SHA256);
    assert.equal(p.requestSha256,sha256(actual));
    assert.equal(actual.model,'gemini-3.8-flash');
    assert.deepEqual(actual.generation_config,{thinking_level:'medium',max_output_tokens:8192,thinking_summaries:'none'});
    assert.equal(actual.store,false);
  }
});
// Literal fixtures are deliberately independent of the implementation's word list.
for(const word of ['steady','steadier','steadiness','settled','pleasure','bond','whether','alignment']) {
  for(const [perspective,index,pronoun] of [['You',0,'You'],['Friend',1,'They']]) {
    test(`${perspective} rejects exact hard vocabulary: ${word}`,()=>{
      const original=`${pronoun} read this ${word} fixture through {{untilDate}}.`;
      const hash=sha256(original);
      const result=validatePassage(original,contact,contact.passages[index]);
      assert.equal(result.passed,false);
      assert(result.findings.some(f=>f.code==='BANNED_VOCABULARY'&&f.detail===word));
      assert.equal(sha256(original),hash);
    });
  }
}
test('case, Unicode format and compatibility variants do not bypass hard word restrictions',()=>{
  for(const value of ['STEADY','stea\u200bdy','ｓｔｅａｄｙ']) assert(readerRuleFindings(value).findings.some(f=>f.detail==='steady'));
  assert.deepEqual(readerRuleFindings('bonding unsteadiness settlement pleasurable').findings,[]);
});
test('em dash spellings fail without changing the source or banning normal hyphens',()=>{
  for(const value of ['—','&mdash;','&#8212;','&#x2014;','\\u2014']) assert(readerRuleFindings(value).findings.some(f=>f.code==='BANNED_PUNCTUATION'));
  assert.deepEqual(readerRuleFindings('a well-defined fact').findings,[]);
});
test('literal/contextual distinctions stay with owner; no regex can certify quality',()=>{
  for(const value of ['a live performance','an interpersonal performance','a quiet room','quiet resentment']) {
    const result=readerRuleFindings(value);
    assert.equal(result.findings.length,0);
    assert.equal(result.signals.length,1);
    assert.equal(result.semanticApproval,false);
    assert.equal(result.signals[0].status,'owner-context-review-required');
  }
  assert.equal(readerRuleFindings('Synthetic fixture with no signals.').semanticApproval,false);
  assert.deepEqual(readerRuleFindings(text).contextualRules,RULES.contextual);
});
test('full private aspect and Chiron doctrine remain available locally and absent from transport',()=>{
  for(const c of batch.contacts)for(const p of c.passages){
    const serialized=JSON.stringify(p.request);
    assert(!serialized.includes(c.semanticPacket.aspect.mechanism));
    assert(!Object.hasOwn(p.input,'approvedSemanticMeaning'));
    for(const forbidden of ['sourcePacket','transitingProcess','natalDomain','exactAspectMeaning','less friction','lower resistance','usable opening','early, unearned hurt','survival response','wounded healer','TARGET_YOU_MUST_NOT_LEAK','TARGET_FRIEND_MUST_NOT_LEAK']) assert(!serialized.includes(forbidden),forbidden);
    assert.equal(c.privateMeaningReceipt.sourcePacketSha256,c.semanticPacket.packetSha256);
    assert.equal(c.privateMeaningReceipt.interpretationStatus,'proposed-owner-review');
  }
  assert(batch.contacts[3].semanticPacket.natalTarget.mechanics.some(s=>s.includes('survival response')));
});
test('voice-only roles apply identically to both perspectives without source-fact authority',()=>{
  for(const c of batch.contacts)for(const p of c.passages){
    for(const e of p.input.destinations[0].voiceExamples){assert.equal(e.authority,'voice-only');assert.equal(e.factsMayTransfer,false);assert.equal(e.perspectiveMayTransfer,false);assert.equal(e.text,text);}
    assert.equal(p.input.destinations[0].perspective,p.perspective);
  }
  assert.match(batch.contacts[0].passages[1].request.input,/they\/them\/their/);
});
test('new contact fails closed rather than falling back to raw mechanics or a new planner',()=>{
  assert.throws(()=>prepareBatch({readerMeanings,id:'unsupported-target',records:[{...records[0],contentKey:'authored/transit-aspect/sun/moon/trine'},...records.slice(1)],examples}),/READER_MEANING_TARGET_SET_MISMATCH/);
  assert.equal(batch.policy.contactCount,4);assert.equal(batch.policy.plannedInitialCalls,8);
  for(const name of ['automaticNextBatch','modelReviewer','automaticRewrite','publication','dispatchEnabled']) assert.equal(batch.policy[name],false);
});
test('a transit benchmark cannot be its own target even under a different source id',()=>{
  assert.throws(()=>prepareBatch({readerMeanings,id:'leakage',records,examples:[{...examples[0],targetContentKey:records[0].contentKey}]}),/TARGET_EVIDENCE_LEAKAGE/);
});
