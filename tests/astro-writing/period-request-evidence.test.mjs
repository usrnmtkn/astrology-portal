import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {monthlyRequestInput,monthlyReviewEvidence} from '../../src/astro-writing/monthlyRequestEvidence.mjs';
import {sharedEvidenceWithPassageReferences} from '../../src/astro-writing/seasonalEvidenceInput.mjs';
import {seasonalManifestInput,seasonalProfilePassageReferences} from '../../src/astro-writing/seasonalRequestEvidence.mjs';
import {horoscopeReviewInput} from '../../src/astro-writing/horoscopeRhetoricalReview.mjs';
import {digest,immutable} from '../../src/astro-writing/editorial/evidenceRegistry.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
const complete='Complete synthetic opening: “read all of this.”\n\nA distinct second paragraph 🪐.\n\nComplete synthetic final sentence.';
const section=(label,value)=>`${label}\n${JSON.stringify(value)}`;
const definitions=value=>{
  const result=new Map();
  const visit=v=>{if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object'){
    if(v.id&&typeof v.text==='string')result.set(v.id,v.text);
    Object.values(v).forEach(visit);
  }};visit(value);return result;
};

test('Monthly complete meaning, each placement binding and cross-role entry round-trip exactly',()=>{
  const facts={period:'monthly',background:[{planet:'sun',meaning:{temporaryMeaning:complete,sourcePath:'fixture:meaning',ownerApproved:false}}],
    factsById:{first:{id:'first',placements:[{planet:'sun',house:4,meaning:{temporaryMeaning:complete}}]},
      second:{id:'second',placements:[{planet:'sun',house:7,meaning:{temporaryMeaning:complete}}]}},
    untouched:{temporaryMeaning:'A separate complete meaning.'},existing:{id:'monthly-meaning:1',text:'Reserved ID.'}};
  const packet={roles:{meaning:[{evidenceRef:'meaning-evidence'}]},entries:[{id:'meaning-evidence',role:'meaning',text:complete,
    sourcePath:'fixture:reviewed-meaning',ownerAuthored:false,ownerApproved:false,sha256:hash(complete)}]};
  const synthesis={thesis:'Synthetic thesis.',readingMovement:'Synthetic movement.',endingChange:'Synthetic ending.',stories:[{role:'related-participant-context',fact:{planet:'sun',meaning:{temporaryMeaning:complete}}}]};
  const profileText=`Saved complete comparison\n${complete}\nSaved correction stays exact.`;
  const options={phase:'draft',profile:{voiceGuidance:profileText,sourceGuidance:'',structure:'',prompt:''}};
  const original=[facts,synthesis,packet];
  const input=[profileText,section('GOVERNED PERIOD DEVELOPMENTS',facts),section('PRIVATE MONTHLY SYNTHESIS',synthesis),section('SHARED FIVE-ROLE EVIDENCE',packet)].join('\n\n');
  const projected=monthlyRequestInput(input,options);
  assert(projected.startsWith(profileText),'Saved comparisons/corrections are not parsed or rewritten');
  const values=['GOVERNED PERIOD DEVELOPMENTS','PRIVATE MONTHLY SYNTHESIS','SHARED FIVE-ROLE EVIDENCE'].map(label=>JSON.parse(projected.split(`${label}\n`)[1].split('\n')[0]));
  const sources=definitions(values);assert.equal(sources.get('monthly-meaning:2'),complete);
  const restore=v=>{
    if(Array.isArray(v))return v.map(restore);
    if(!v||typeof v!=='object')return v;
    const result={};
    for(const [k,child] of Object.entries(v)){
      if(k==='temporaryMeaning'&&child&&typeof child==='object')result[k]=child.text??sources.get(child.completePassageRef);
      else if(k!=='completePassageRef')result[k]=restore(child);
    }
    if(v.completePassageRef)result.text=sources.get(v.completePassageRef);
    return result;
  };
  assert.deepEqual(values.map(restore),original,'All source metadata, roles, hashes, whole text and fact bindings survive');
  const escaped=JSON.stringify(complete).slice(1,-1);
  assert.equal(projected.split(escaped).length-1,1,'The structured whole meaning appears once');
  assert.equal(monthlyRequestInput(projected,options),projected,'Projection is idempotent');
  assert.deepEqual(facts,original[0]);
  const ambiguous=input+'\n\nSaved complete example follows:\n'+section('GOVERNED PERIOD DEVELOPMENTS',facts);
  assert.throws(()=>monthlyRequestInput(ambiguous,options),/Ambiguous Monthly request section/,'Ambiguous saved examples fail before dispatch rather than rewriting source passages');
  const unrelated='\n\nGOVERNED PERIOD DEVELOPMENTS\n{"savedComparison":"Keep this complete JSON exactly."}';
  assert(monthlyRequestInput(input+unrelated,options).endsWith(unrelated),'Heading-like saved source material is not an application fact block');
});

test('Monthly dispatch protects complete saved JSON examples and separates planning from drafting',()=>{
  const fakeFacts='{ "windowPeriod": "monthly", "factsById": {}, "planetaryArcs": [] }';
  const facts={period:'monthly',factsById:{first:{meaning:{temporaryMeaning:complete}},second:{meaning:{temporaryMeaning:complete}}}};
  const synthesis={thesis:'Synthetic thesis.',stories:[],readingMovement:'Synthetic movement.',endingChange:'Synthetic ending.'};
  const packet={roles:{meaning:[]},entries:[]};
  const source='Synthetic saved guidance opening.\nMONTHLY FACTS AND PLAN SCOPE\n'+fakeFacts+'\nSynthetic saved guidance final sentence.';
  const profile={voiceGuidance:source,sourceGuidance:'',structure:'',prompt:'{{voiceGuidance}}'};
  const generated=[section('GOVERNED PERIOD DEVELOPMENTS',facts),section('PRIVATE MONTHLY SYNTHESIS',synthesis),section('SHARED FIVE-ROLE EVIDENCE',packet)];
  const input=['CURRENT MONTHLY WRITING INSTRUCTIONS\n'+source,...generated].join('\n\n');
  const projected=monthlyRequestInput(input,{phase:'draft',profile});
  assert(projected.includes(source),'A complete saved facts-shaped example remains byte-identical');
  assert(projected.includes('monthly-meaning:1'),'Actual generated meanings still deduplicate');
  const sourceWithCollisions=source+'\n\n'+generated.join('\n\n');
  const collisionInput=['CURRENT MONTHLY WRITING INSTRUCTIONS\n'+sourceWithCollisions,...generated].join('\n\n');
  assert(monthlyRequestInput(collisionInput,{phase:'draft',profile:{...profile,voiceGuidance:sourceWithCollisions}}).includes(sourceWithCollisions),'Generated-looking blocks inside saved guidance are opaque');
  const literal='Complete saved template example\nSHARED FIVE-ROLE EVIDENCE\n{ "roles": {}, "entries": [] }\nComplete saved template ending.';
  const templateInput=['CURRENT MONTHLY WRITING INSTRUCTIONS\n'+source,literal,...generated].join('\n\n');
  assert(monthlyRequestInput(templateInput,{phase:'draft',profile:{...profile,prompt:'{{voiceGuidance}}\n\n'+literal+'\n\n{{governedFacts}}'}}).includes(literal),'Literal owner prompt text is preserved as well as field values');
  const scope='Complete owner scope opening.\n'+generated.join('\n\n')+'\nMONTHLY FACTS AND PLAN SCOPE\n'+fakeFacts+'\nComplete owner scope final sentence.';
  const planningFacts={windowPeriod:'monthly',factsById:facts.factsById,planetaryArcs:[]};
  const planningInput=section('MONTHLY FACTS AND PLAN SCOPE',planningFacts)+'\n\nOWNER PLAN SCOPE\n'+scope;
  const planned=monthlyRequestInput(planningInput,{phase:'synthesis'});
  assert(planned.endsWith(scope),'Planning projects only its initial generated facts, never the owner scope');
  assert(planned.includes('monthly-meaning:1'));
  assert.equal(monthlyRequestInput(input),input,'Unknown stage boundaries keep the complete original input');
  assert.equal(monthlyRequestInput(input,{phase:'draft'}),input,'A missing historical profile keeps the complete legacy input');
});

test('Monthly synthesis/review project only governed facts; candidate, profiles and other periods stay exact',()=>{
  const engineFacts={window:{period:'monthly'},developments:{background:[{meaning:{temporaryMeaning:complete}}],events:[{meaning:{temporaryMeaning:complete}}]}};
  const evidence={engineFacts,ownerExamples:[{id:'owner',text:complete}],writingProfile:{profile:{voiceGuidance:complete}},corrections:[{rejected:complete}]};
  const before=structuredClone(evidence),candidate={headline:'Synthetic',body:complete};
  const projected=JSON.parse(horoscopeReviewInput(candidate,evidence));
  assert.deepEqual(projected.candidate,candidate);
  for(const key of ['ownerExamples','writingProfile','corrections'])assert.deepEqual(projected.evidence[key],evidence[key]);
  assert.equal(definitions(projected.evidence.engineFacts).size,1);
  assert.deepEqual(evidence,before,'Projection never edits original audit evidence');
  for(const period of ['daily','seasonal']){
    const other={...evidence,engineFacts:{...engineFacts,window:{period}}};
    assert.equal(horoscopeReviewInput(candidate,other),JSON.stringify({candidate,evidence:other}));
  }
  const onlyOne={engineFacts:{meaning:{temporaryMeaning:complete}}};
  assert.deepEqual(monthlyReviewEvidence(onlyOne),onlyOne);
  assert.equal(monthlyRequestInput('Unstructured saved guidance stays exact.'),'Unstructured saved guidance stays exact.');
});

test('Supporting argument candidates retain complete identity, role, provenance and restrictions through references',()=>{
  const primary={id:'primary',text:complete,sourcePath:'fixture:primary'};
  const snippet='Another complete synthetic source unit, with its own original final sentence.';
  const entry={id:'meaning',role:'meaning',text:snippet,ownerAuthored:false,ownerApproved:false,sourcePath:'fixture:meaning',factUseAuthorized:true};
  const argument={...entry,id:'argument',role:'argument',factUseAuthorized:false,restriction:'support only'};
  const context={sharedEvidencePacket:{entries:[entry,{id:'register',text:complete,role:'register'}],roles:{meaning:[entry]},supportingArgumentCandidates:[argument]}};
  const original=structuredClone(context),projected=sharedEvidenceWithPassageReferences(context,[primary],{includeSupportingArgumentCandidates:true});
  assert.deepEqual(sharedEvidenceWithPassageReferences(context,[primary]).supportingArgumentCandidates,[argument],'The default shared path used by legacy Weekly profiles stays unchanged');
  const ref=projected.supportingArgumentCandidates[0];
  assert.equal(ref.evidenceRef,'meaning');assert(!('text' in ref));
  const {evidenceRef,...metadata}=ref;assert.deepEqual({...metadata,text:projected.entries.find(e=>e.id===evidenceRef).text},argument);
  assert.equal(projected.entries[1].completePassageRef,'primary');assert.deepEqual(context,original);
});

test('Seasonal manifest reference restores its exact immutable hash and whole source query',()=>{
  const facts={seasonalMeaning:{sources:[{id:'season',body:complete,sha256:hash(complete)}],authority:'meaning only'}};
  const body={query:{seasonMeaning:JSON.stringify(facts.seasonalMeaning),audience:'aries'},entries:[{id:'rejected',role:'rejected',text:complete,ownerReason:'Exact scoped reason.'}]};
  const manifest=immutable({...body,hash:digest(body)}),original=structuredClone(manifest);
  const projected=seasonalManifestInput(manifest,facts);
  assert.deepEqual(projected.query.seasonMeaning,{serializedJsonRef:'governedFacts.seasonalMeaning'});
  const restored={...projected,query:{...projected.query,seasonMeaning:JSON.stringify(facts.seasonalMeaning)}};
  assert.deepEqual(restored,manifest);assert.deepEqual(manifest,original);
  const {hash:receipt,...restoredBody}=restored;assert.equal(digest(restoredBody),receipt);
  assert.equal(seasonalManifestInput(manifest,{seasonalMeaning:{different:true}}),manifest,'Never reference a different full source');
  const missing={query:{},entries:[]};
  assert.equal(seasonalManifestInput(missing,{}),missing,'Missing historical context never creates a dangling reference');
});

test('Seasonal preferred text remains whole in guidance; every selected role and hash is retained',()=>{
  const profile={voiceGuidance:`Current rule.\nBEGIN COMPLETE OWNER PREFERRED REVISION\n${complete}\nEND COMPLETE OWNER PREFERRED REVISION\nFinal rule.`};
  const passage={id:'preferred',role:'primary owner voice',text:complete,textSha256:hash(complete),sourcePath:'fixture:profile',selectionReason:'Explicit assignment.',authority:'exact_owner_approved'};
  const selected=seasonalProfilePassageReferences([passage],profile,profile.voiceGuidance);
  assert(!('text' in selected[0]));assert.equal(selected[0].profilePassageRef,'voiceGuidance/COMPLETE OWNER PREFERRED REVISION');
  const {profilePassageRef,...metadata}=selected[0];assert.deepEqual({...metadata,text:complete},passage);
  assert.deepEqual(seasonalProfilePassageReferences([passage],profile,''),[passage],'A missing rendered passage never becomes a reference');
  assert.deepEqual(seasonalProfilePassageReferences([{...passage,text:complete+' Changed.'}],profile,profile.voiceGuidance),[{...passage,text:complete+' Changed.'}]);
  assert.deepEqual(seasonalProfilePassageReferences([passage],{voiceGuidance:'No complete bounded revision.'},'No complete bounded revision.'),[passage]);
  const duplicate={voiceGuidance:profile.voiceGuidance+'\n'+profile.voiceGuidance};
  assert.deepEqual(seasonalProfilePassageReferences([passage],duplicate,duplicate.voiceGuidance),[passage],'Ambiguous boundaries preserve the original whole text');
});
