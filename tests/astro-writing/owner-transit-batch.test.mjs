import { syntheticReaderMeanings } from './fixtures/personal-transit-reader-meanings.mjs';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareBatch, validatePassage, review, preferredEvidence, sha256, saveState, loadState, ingestRawResponse, assertNextBatchAllowed } from '../../src/astro-writing/ownerTransitBatch.mjs';
import { createReviewServer } from '../../scripts/transit-owner-batch/server.mjs';
import { syntheticStylePhrase } from '../../scripts/fixtures/personal-transit-writing.mjs';

// Synthetic data only. These fixtures are never writer evidence or publication candidates.
const keys=['moon/saturn/sextile','mercury/venus/trine','mars/saturn/square','moon/chiron/trine'].map(s=>`authored/transit-aspect/${s}`);
const records=keys.map(contentKey=>({contentKey,body_you:'{{untilDate}}',body_they:'{{untilDate}}',canonical:false}));
const examples=['venus/moon/square','neptune/jupiter/trine'].map(s=>({contentKey:`authored/transit-aspect/${s}`,field:'body_you',text:`Synthetic reference ${s}.`,sha256:sha256(`Synthetic reference ${s}.`),preferred:true,ownerApproved:true,source:'synthetic-test-only'}));
const readerMeanings=syntheticReaderMeanings(records);
const initial=prepareBatch({readerMeanings,id:'synthetic-batch',records,examples,provenance:{fixture:true},friendEvidencePolicy:'owner-authorized-you-voice'});
const base=()=>structuredClone(initial);
const body=(contact,p)=>`${contact.title.replace(/ (Saturn|Venus|Chiron)$/u,` ${p.perspective==='you'?'your':'their'} natal $1`)} through {{untilDate}}. ${p.perspective==='you'?'You':'They'} read this synthetic sentence.`;
const populated=()=>{const s=base();for(const c of s.contacts)for(const p of c.passages){p.currentText=body(c,p);p.original={text:p.currentText,sha256:sha256(p.currentText)};p.status='needs-review';p.validation=validatePassage(p.currentText,c,p);}return s;};
const action=(s,type,extra={})=>({type,actor:'owner',contentKey:keys[0],field:'body_you',expectedRevision:s.revision,expectedTextSha256:sha256(s.contacts[0].passages[0].currentText),...extra});
const directories=[];const directory=()=>{const d=mkdtempSync(join(tmpdir(),'owner-batch-'));directories.push(d);return d;};
afterEach(()=>{for(const d of directories.splice(0))rmSync(d,{recursive:true,force:true});});

test('exactly four distinct contacts and both required perspectives',()=>{
  assert.equal(initial.contacts.length,4); assert.equal(initial.contacts.flatMap(c=>c.passages).length,8);
  for(const rows of [records.slice(1),[...records,records[0]],[records[0],records[0],records[2],records[3]]]) assert.throws(()=>prepareBatch({readerMeanings,id:'test',records:rows,examples}),/FOUR/);
});
test('only preferred intact owner evidence can enter; target and third-party data excluded',()=>{
  for(const patch of [{preferred:false},{ownerApproved:false},{sha256:'bad'},{contentKey:keys[0]}])assert.throws(()=>prepareBatch({readerMeanings,id:'test',records,examples:[{...examples[0],...patch}]}),/EVIDENCE/);
  const input=initial.contacts[0].passages[0].input;
  assert.deepEqual(Object.keys(input),['transit','placementFacts','readerMeaning','destinations','factualBoundaries','direction']);
  assert.equal(input.destinations[0].voiceExamples.length,2);
  assert(!JSON.stringify(input).includes('sourcePacket'));
  assert.equal(initial.policy.modelReviewer,false); assert.equal(initial.policy.dispatchEnabled,false);
});
test('Friend default remains blocked and does not silently borrow You examples',()=>{
  const s=prepareBatch({readerMeanings,id:'test',records,examples});const p=s.contacts[0].passages[1];
  assert.match(p.preparationStatus,/blocked/);assert.equal(p.evidence.length,0);
  assert.throws(()=>ingestRawResponse(directory(),s,{contentKey:keys[0],field:'body_they',raw:'{}',httpStatus:200,requestSha256:p.requestSha256,attemptId:'test'}),/EVIDENCE_BLOCKED/);
});
test('request hash binds the full Gemini body and destination contract',()=>{
  for(const c of initial.contacts)for(const p of c.passages){assert.equal(sha256(p.request),p.requestSha256);assert.deepEqual(p.input.destinations[0].requiredPlaceholders,['untilDate']);assert.equal(p.request.model,'gemini-3.8-flash');assert.equal(p.request.store,false);}
});
test('the batch sends the same complete optional style phrases as Studio, separate from meanings and passages',()=>{
  const style = syntheticStylePhrase({contentKeys:[keys[0]]});
  const sources={version:'synthetic-style-only',passages:examples,stylePhrases:[style]};
  const s=prepareBatch({readerMeanings,id:'style-test',records,sources,provenance:{fixture:true},friendEvidencePolicy:'owner-authorized-you-voice'});
  for(const c of s.contacts)for(const p of c.passages){
    const phrases=p.input.destinations[0].stylePhrases ?? [];
    if(c.contentKey===keys[0]){
      assert.equal(phrases[0].text,style.text);assert.equal(phrases[0].copyRequired,false);
      assert(p.request.input.includes(style.text));assert.equal(p.writerContextReceipt.stylePhraseSources[0].textSha256,style.sha256);
      assert(!JSON.stringify(p.writerContextReceipt).includes(style.text));
    }else assert.equal(phrases.length,0);
    assert.equal(p.input.readerMeaning,initial.contacts.find(row=>row.contentKey===c.contentKey).passages[0].input.readerMeaning);
    assert.equal(sha256(p.request),p.requestSha256);
  }
  assert.throws(()=>prepareBatch({readerMeanings,id:'bad-style',records,sources:{...sources,stylePhrases:[{...style,text:'tampered'}]},provenance:{fixture:true}}),/failed verification/);
});
test('preferred Friend evidence is independently usable without converting published status to voice eligibility',()=>{
  const friend={...examples[0],field:'body_they'};
  const s=prepareBatch({readerMeanings,id:'test',records,examples:[...examples,friend]});
  assert.equal(s.contacts[0].passages[1].evidence.length,1);
  assert.equal(s.contacts[0].passages[1].evidence[0].field,'body_they');
  assert.equal(s.contacts[0].passages[0].evidence.length,2);
});
test('valid synthetic You/Friend bodies pass without rewriting',()=>{
  for(const c of initial.contacts)for(const p of c.passages){const text=body(c,p);const before=sha256(text);assert.deepEqual(validatePassage(text,c,p).findings,[]);assert.equal(sha256(text),before);}
});
const failures=[
  ['wrong Friend pronoun',t=>t+' Your fixture.',1,'WRONG_PERSPECTIVE'],
  ['wrong You natal target pronoun',t=>t.replace('your natal','their natal'),0,'WRONG_PERSPECTIVE'],
  ['missing required placeholder',t=>t.replace('{{untilDate}}','soon'),0,'PLACEHOLDER_CONTRACT'],
  ['unlicensed variable',t=>t+' {{Name}}',0,'PLACEHOLDER_CONTRACT'],
  ['malformed template',t=>t+' {untilDate}',0,'MALFORMED_TEMPLATE'],
  ['wrong exact aspect',t=>t.replace('sextile','square'),0,'TRANSIT_IDENTITY_MISMATCH'],
  ['reversed identity',t=>t.replace('Moon sextile your natal Saturn','Saturn sextile your natal Moon'),0,'TRANSIT_IDENTITY_MISMATCH'],
  ['unsupported planet',t=>t+' mars is included.',0,'UNSUPPORTED_BODY'],
  ['unsupported sign',t=>t+' Aries is included.',0,'UNSUPPORTED_SIGN'],
  ['unsupported house',t=>t+' Your seventh house.',0,'UNSUPPORTED_ASTROLOGY_DETAIL'],
  ['unsupported motion',t=>t+' Retrograde.',0,'UNSUPPORTED_ASTROLOGY_DETAIL'],
  ['invented exact date',t=>t+' January 9.',0,'INVENTED_DATE'],
  ['banned vocabulary',t=>t+' whether',0,'BANNED_VOCABULARY'],
  ['editorial notes',t=>t+' needs_review',0,'READER_COPY_BOUNDARY'],
  ['em dash',t=>t+' —',0,'BANNED_PUNCTUATION']
];
for(const [label,change,index,code]of failures)test(`validation: ${label}`,()=>{const c=initial.contacts[0],p=c.passages[index];assert(validatePassage(change(body(c,p)),c,p).findings.some(f=>f.code===code));});
test('title binds identity without mandatory astrology repetition in body',()=>{
  const c=initial.contacts[0],p=c.passages[0];assert.equal(validatePassage('You read this synthetic sentence through {{untilDate}}.',c,p).passed,true);
  const wrong={...c,facts:{...c.facts,aspect:'square'}};assert(validatePassage(body(c,p),wrong,p).findings.some(f=>f.code==='TRANSIT_DESTINATION_MISMATCH'));
});
test('style signals remain owner review; no model or rewrite gate',()=>{const c=initial.contacts[0],p=c.passages[0];const r=validatePassage(body(c,p)+' A literal performance.',c,p);assert.equal(r.passed,true);assert.equal(r.ownerReview.length,1);});
test('approval requires exact saved text, owner action and passing validation',()=>{
  const s=populated();assert.throws(()=>review(s,action(s,'approve')),/CONFIRMATION/);assert.throws(()=>review(s,action(s,'approve',{actor:'assistant'})),/OWNER/);
  assert.throws(()=>review(s,action(s,'approve',{expectedTextSha256:'wrong',confirmExactText:true})),/STALE_TEXT/);
  const bad=review(s,action(s,'edit',{text:'{{bad}}'}));assert.throws(()=>review(bad,action(bad,'approve',{confirmExactText:true})),/VALIDATION/);
});
test('edits preserve originals and invalidate approval and preferred-evidence eligibility',()=>{
  const s=populated();const original=s.contacts[0].passages[0].original;
  const approved=review(s,action(s,'approve',{confirmExactText:true}));assert.equal(preferredEvidence(approved).length,1);
  assert.equal(preferredEvidence(approved)[0].preferred,true);assert.equal(preferredEvidence(approved)[0].ownerApproved,true);assert.match(preferredEvidence(approved)[0].source,/revision-000001.json$/u);
  const edited=review(approved,action(approved,'edit',{text:original.text+' Another synthetic sentence.'}));
  assert.deepEqual(edited.contacts[0].passages[0].original,original);assert.equal(preferredEvidence(edited).length,0);assert.equal(edited.contacts[0].passages[0].edits.length,1);assert.equal(edited.contacts[0].passages[0].approved,null);
});
test('reject and regeneration preserve drafts, remove eligibility and make no calls',()=>{
  for(const type of ['reject','request-regeneration']){const s=populated();const next=review(s,action(s,type,{reason:'Owner fixture rejection'}));assert.deepEqual(next.contacts[0].passages[0].original,s.contacts[0].passages[0].original);assert.equal(preferredEvidence(next).length,0);assert.equal(next.policy.dispatchEnabled,false);}
});
test('no approval before generation; no next batch until explicit complete review',()=>{
  assert.throws(()=>review(initial,{type:'approve',actor:'owner',expectedRevision:0,contentKey:keys[0],field:'body_you'}),/NO_GENERATED/);
  let s=populated();assert.throws(()=>assertNextBatchAllowed(s),/OWNER_BATCH/);assert.throws(()=>review(s,action(s,'complete-review')),/INCOMPLETE/);
  for(const c of s.contacts)for(const p of c.passages)s=review(s,{...action(s,'reject'),contentKey:c.contentKey,field:p.field,expectedTextSha256:sha256(p.currentText),reason:'Synthetic decision'});
  assert.throws(()=>assertNextBatchAllowed(s),/OWNER_BATCH/);s=review(s,action(s,'complete-review'));assert.doesNotThrow(()=>assertNextBatchAllowed(s));
});
test('append-only snapshots survive reload and reject duplicate revision writes',()=>{
  const d=directory(),s=populated();saveState(d,s);const next=review(s,action(s,'edit',{text:s.contacts[0].passages[0].currentText+' Preserved.'}));saveState(d,next);assert.deepEqual(loadState(d),next);assert.throws(()=>saveState(d,next),/EEXIST/);assert.equal(JSON.parse(readFileSync(join(d,'revision-000000.json'))).revision,0);assert.throws(()=>review(next,action(s,'reject',{reason:'stale'})),/STALE_VERSION/);
});
test('raw response and usage are saved before parsing; exact body bytes preserved',()=>{
  const d=directory(),s=base();saveState(d,s);const c=s.contacts[0],p=c.passages[0];const text=' '+body(c,p)+'\n';const raw=JSON.stringify({id:'synthetic',status:'completed',model:s.model.model,usage:{total_tokens:12},output_text:text});
  const next=ingestRawResponse(d,s,{contentKey:c.contentKey,field:p.field,raw,httpStatus:200,requestSha256:p.requestSha256,attemptId:'one'});
  assert.equal(readFileSync(join(d,'raw/one.response'),'utf8'),raw);assert.equal(next.contacts[0].passages[0].original.text,text);assert.equal(next.contacts[0].passages[0].receipts[0].usage.total_tokens,12);
  assert.throws(()=>ingestRawResponse(d,next,{contentKey:c.contentKey,field:p.field,raw,httpStatus:200,requestSha256:p.requestSha256,attemptId:'two'}),/ORIGINAL_ALREADY/);
});
test('malformed or failed provider response stays raw; no fallback and no retry',()=>{
  for(const [raw,status] of [['not json',200],[JSON.stringify({model:initial.model.model,status:'failed',usage:{total_tokens:0}}),503]]){const d=directory(),s=base();saveState(d,s);const p=s.contacts[0].passages[0];const next=ingestRawResponse(d,s,{contentKey:keys[0],field:'body_you',raw,httpStatus:status,requestSha256:p.requestSha256,attemptId:'bad'});assert.equal(next.contacts[0].passages[0].original,null);assert.equal(next.contacts[0].passages[0].status,'generation-failed');assert.equal(readFileSync(join(d,'raw/bad.response'),'utf8'),raw);}
});
test('owner can reject a failed attempt without inventing a draft or making a call',()=>{
  const s=base();s.contacts[0].passages[0].receipts=[{failure:'synthetic HTTP failure',rawSha256:sha256('failure')}];s.contacts[0].passages[0].status='generation-failed';
  const next=review(s,action(s,'reject',{reason:'Leave this failed slot rejected'}));
  assert.equal(next.contacts[0].passages[0].status,'rejected');assert.equal(next.contacts[0].passages[0].original,null);assert.equal(next.contacts[0].passages[0].receipts.length,1);
});
test('HTTP access, same-origin review, exact version conflict and no dispatch/publication',async()=>{
  const d=directory(),s=populated();saveState(d,s);const {server,token}=createReviewServer(d);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(url+'/api/batch')).status,401);
    const headers={authorization:`Bearer ${token}`,'content-type':'application/json',origin:url};
    assert.equal((await fetch(url+'/api/batch',{headers})).status,200);
    assert.equal((await fetch(url+'/api/review',{method:'POST',headers:{...headers,origin:'https://external.invalid'},body:'{}'})).status,403);
    const edit=action(s,'edit',{text:s.contacts[0].passages[0].currentText+' Saved locally.'});
    assert.equal((await fetch(url+'/api/review',{method:'POST',headers,body:JSON.stringify(edit)})).status,200);
    assert.equal((await fetch(url+'/api/review',{method:'POST',headers,body:JSON.stringify(edit)})).status,409);
    for(const path of ['/api/generate','/api/publish','/api/next-batch'])assert.equal((await fetch(url+path,{method:'POST',headers,body:'{}'})).status,404);
    assert.equal((await fetch(url+'/../package.json',{headers})).status,404);assert.equal(readdirSync(d).length,2);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
