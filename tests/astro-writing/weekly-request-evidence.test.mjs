import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {weeklyHoroscopeEvidence,weeklyMeaningReferences} from '../../src/astro-writing/weeklyRequestEvidence.mjs';
import {horoscopeReviewInput} from '../../src/astro-writing/horoscopeRhetoricalReview.mjs';

const text='  Complete synthetic opening.\n\nThe full ending includes café and 🌙.\n';
const hash=s=>createHash('sha256').update(s).digest('hex');
test('Weekly source projection round-trips every full body, role, identity and restriction',()=>{
  const primary={id:'same-id',text,sourcePath:'fixture:owner',sourceRecordSha256:hash(text),ownerAuthored:true,ownerApproved:true};
  const alias={...primary,id:'second-source',provenance:{revision:2},restriction:'voice only'};
  const different={...primary,text:text+'A different complete ending.'};
  const meaning={id:'meaning',text,role:'meaning',ownerAuthored:false,ownerApproved:false,restriction:'meaning only'};
  const context={primaryRegisterPassages:[primary],sameFamilyExamples:[alias,different],relevantOwnerPassages:[alias],registerGoldExamples:[],phraseExamples:[],
    corrections:[{body:text,reason:'Exact scoped reason.'}],rejectedExamples:[{body:text,role:'negative evidence'}],
    sharedEvidencePacket:{entries:[meaning],roles:{meaning:[meaning]},supportingArgumentCandidates:[{...meaning,id:'argument',role:'argument'}]}};
  const before=structuredClone(context),projected=weeklyHoroscopeEvidence(context);
  const sources=new Map(projected.completeSourcePassages.map(p=>[p.id,p]));
  assert.equal(sources.size,2);for(const p of sources.values())assert.equal(hash(p.text),p.sha256);
  const restore=v=>{
    if(Array.isArray(v))return v.map(restore);
    if(!v||typeof v!=='object')return v;
    const {completePassageRef,...metadata}=v;
    return {...Object.fromEntries(Object.entries(metadata).map(([k,x])=>[k,restore(x)])),...(completePassageRef?{text:sources.get(completePassageRef).text}:{})};
  };
  const {completeSourcePassages,...transport}=projected;
  assert.deepEqual(restore(transport),before);assert.deepEqual(context,before);
  assert.deepEqual(projected.corrections,context.corrections);assert.deepEqual(projected.rejectedExamples,context.rejectedExamples);
});

test('Weekly generated meanings share exact text only, with collision-safe local references',()=>{
  const colliding='wm:1';
  const facts={id:colliding,background:[{id:'first',planet:'venus',house:2,meaning:{temporaryMeaning:text,sourceId:'source-a',role:'meaning'}}],
    events:[{id:'second',planet:'venus',house:3,meaning:{temporaryMeaning:text,sourceId:'source-b',role:'meaning'}},
      {meaning:{temporaryMeaning:text+'Different ending.'}}]};
  const before=structuredClone(facts),projected=weeklyMeaningReferences(facts);
  const first=projected.background[0].meaning.temporaryMeaning;
  assert.notEqual(first.id,colliding);assert.equal(first.text,text);
  assert.deepEqual(projected.events[0].meaning.temporaryMeaning,{completePassageRef:first.id});
  assert.equal(projected.events[1].meaning.temporaryMeaning,facts.events[1].meaning.temporaryMeaning);
  projected.background[0].meaning.temporaryMeaning=text;projected.events[0].meaning.temporaryMeaning=text;
  assert.deepEqual(projected,before);assert.deepEqual(facts,before);
  assert.equal(weeklyMeaningReferences(undefined),undefined);
  const missing={a:{temporaryMeaning:''},b:{temporaryMeaning:null},c:{temporaryMeaning:'One unique complete source.'}};
  assert.deepEqual(weeklyMeaningReferences(missing),missing,'Empty, missing and unique historical meanings remain unchanged');
});

test('Weekly review projects governed facts only; prose, saved profiles and corrections stay exact',()=>{
  const candidate={headline:'Synthetic',body:text};
  const evidence={engineFacts:{window:{period:'weekly'},a:{temporaryMeaning:text},b:{temporaryMeaning:text}},ownerExamples:[{id:'owner',text}],
    writingProfile:{profile:{voiceGuidance:JSON.stringify({temporaryMeaning:text}),sourceGuidance:text}},
    corrections:[{temporaryMeaning:text,reason:'Keep this full reason.'}],rejectedExamples:[{body:text}]};
  const before=structuredClone(evidence),result=JSON.parse(horoscopeReviewInput(candidate,evidence));
  assert.deepEqual(result.candidate,candidate);
  for(const key of ['ownerExamples','writingProfile','corrections','rejectedExamples'])assert.deepEqual(result.evidence[key],evidence[key]);
  assert(result.evidence.engineFacts.b.temporaryMeaning.completePassageRef);assert.deepEqual(evidence,before);
  for(const period of ['daily','seasonal']){
    const other={...evidence,engineFacts:{...evidence.engineFacts,window:{period}}};
    assert.equal(horoscopeReviewInput(candidate,other),JSON.stringify({candidate,evidence:other}));
  }
});
