import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {dailyHoroscopeEvidence} from '../../src/astro-writing/dailyHoroscopeEvidence.mjs';

test('Daily source references preserve complete bytes, every identity and each role without mutating retrieval',()=>{
  const text='  Complete synthetic opening.\n\nThe full ending includes café and 🌙.\n';
  const hash=createHash('sha256').update(text).digest('hex');
  const primary={id:'owner-a',text,sourcePath:'fixture:owner',sourceRecordSha256:hash,ownerAuthored:true,ownerApproved:true};
  const alias={...primary,id:'owner-b',evidenceRole:'supporting',provenance:{version:2}};
  const meaning={id:'meaning-a',text,role:'meaning',ownerAuthored:false,ownerApproved:false,sourceKind:'meaning-only'};
  const scene={id:'scene-a',text:'A different complete synthetic scene.',role:'scene',house:4};
  const context={primaryRegisterPassages:[primary],sameFamilyExamples:[primary,alias],relevantOwnerPassages:[alias],
    registerGoldExamples:[],phraseExamples:[],corrections:[{id:'correction',reason:'Keep the source intact.'}],
    sharedEvidencePacket:{entries:[meaning,scene],roles:{meaning:[meaning],scene:[scene]},supportingArgumentCandidates:[{...scene,id:'candidate',role:'argument'}]}};
  const before=structuredClone(context),projected=dailyHoroscopeEvidence(context);
  assert.deepEqual(context,before);
  assert.equal(projected.completeSourcePassages.length,2);
  const sources=new Map(projected.completeSourcePassages.map(p=>[p.id,p]));
  const restore=value=>{
    if(Array.isArray(value))return value.map(restore);
    if(!value||typeof value!=='object')return value;
    const {completePassageRef,...metadata}=value;
    return {...Object.fromEntries(Object.entries(metadata).map(([key,child])=>[key,restore(child)])),
      ...(completePassageRef?{text:sources.get(completePassageRef).text}:{})};
  };
  const {completeSourcePassages,...transport}=projected;
  assert.deepEqual(restore(transport),before,'All source bytes, roles, authority restrictions, provenance and hashes round-trip');
  assert.equal(sources.get(projected.primaryRegisterPassages[0].completePassageRef).text,text);
  assert.equal(projected.sameFamilyExamples[1].id,'owner-b','An identical passage never loses its second source identity');
  assert.equal(projected.sharedEvidencePacket.roles.meaning[0].ownerAuthored,false,'Sharing text never upgrades meaning into owner voice');
  for(const p of completeSourcePassages)assert.equal(createHash('sha256').update(p.text).digest('hex'),p.sha256);
});

test('Daily shares exact text only; a changed ending remains a separate complete passage',()=>{
  const entries=[{id:'same-id',text:'Complete opening.\n\nFirst full ending.'},{id:'same-id',text:'Complete opening.\n\nSecond full ending.'}];
  const context={primaryRegisterPassages:entries,sameFamilyExamples:entries,relevantOwnerPassages:[],registerGoldExamples:[],phraseExamples:[],
    sharedEvidencePacket:{entries:[],roles:{},supportingArgumentCandidates:[]}};
  const projected=dailyHoroscopeEvidence(context);
  assert.equal(projected.completeSourcePassages.length,2);
  assert.notEqual(projected.primaryRegisterPassages[0].completePassageRef,projected.primaryRegisterPassages[1].completePassageRef);
});
