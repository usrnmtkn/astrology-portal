import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {syntheticReaderMeanings} from './fixtures/personal-transit-reader-meanings.mjs';
import {MODEL,sha256,prepareBatch,review,saveState,loadState,validatePassage} from '../../src/astro-writing/ownerTransitBatch.mjs';
import {loadCurrentFeedback,loadInputPlan} from '../../src/astro-writing/personalTransitInputControls.mjs';
import {verifyPreparedDispatch,dispatchPreparedOnce} from '../../src/astro-writing/personalTransitDispatch.mjs';

const repo=fileURLToPath(new URL('../../',import.meta.url)),dirs=[];
afterEach(()=>{for(const d of dirs.splice(0))rmSync(d,{recursive:true,force:true});});
const keys=['venus/moon/square','neptune/jupiter/trine','mercury/venus/trine','moon/chiron/trine','moon/saturn/sextile','mars/saturn/square'].map(k=>'authored/transit-aspect/'+k);
const records=keys.map(contentKey=>({contentKey,body_you:'{{untilDate}}',body_they:'{{untilDate}}'}));
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,v)=>writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{mode:0o600});
function fixture({pending=false,calibration=true}={}) {
  const root=mkdtempSync(join(tmpdir(),'transit-audit-fixture-'));dirs.push(root);
  const put=(name,v)=>{const p=join(root,name);write(p,v);return p;};
  const source=put('voice.txt','Complete synthetic voice evidence.'),text=readFileSync(source,'utf8');
  const examples=[{contentKey:'synthetic/voice',field:'body_you',text,sha256:sha256(text),source,sourceFileSha256:sha256(text),ownerApproved:true,preferred:true}];
  const meanings=syntheticReaderMeanings(records).map(m=>({...m,status:'owner-accepted',review:{textSha256:m.sha256,recordSha256:m.recordSha256,calibrationId:'synthetic-calibration',source:'synthetic-owner-review'}}));
  if(pending)meanings[4].status='proposed-owner-review';
  const catalog=put('catalog.json',records),gold=put('gold.json',{id:'CURRENT_TRANSIT_VOICE_GOLD',role:'voice-only',status:'owner-approved-current-voice',passages:examples});
  const meaningsPath=put('meanings.json',{id:'PERSONAL_TRANSIT_READER_MEANINGS',records:meanings});
  const correction={id:'owner-fixture',role:'owner-correction',contentKeys:[],text:'Exact synthetic owner correction.',sha256:sha256('Exact synthetic owner correction.'),source:'synthetic-owner-source'};
  const feedbackPath=put('feedback.json',{schema:'personal-transit-feedback-v1',corrections:[correction],rejectionSources:[]});
  const plan={schema:'personal-transit-input-plan-v1',id:'synthetic-audit-batch',selectedContacts:keys.slice(0,4),requiredRegressionContacts:keys.slice(0,2),friendEvidencePolicy:'owner-authorized-you-voice',feedbackFile:feedbackPath,
    ...(calibration?{calibration:{id:'synthetic-calibration',required:true,source:'synthetic-owner-request',contentKeys:keys}}:{})};
  const planPath=put('plan.json',plan),output=join(root,'prepared'),authPath=join(root,'explicit.json');
  const prepare=()=>spawnSync(process.execPath,['scripts/transit-owner-batch/prepare.mjs',catalog,gold,meaningsPath,planPath,output],{cwd:repo,encoding:'utf8'});
  const authorize=()=>{const m=read(join(output,'manifest.json'));write(authPath,{schema:'personal-transit-explicit-authorization-v1',actor:'owner',decision:'authorize-exact-batch',ownerStatement:'SYNTHETIC TEST AUTHORIZATION ONLY',source:'synthetic-test-only',manifestSha256:sha256(readFileSync(join(output,'manifest.json'))),requestHashes:m.requests.map(r=>r.requestSha256),model:MODEL,maximumCalls:8,callsPerRequest:1,retries:0,reviewerCalls:0,automaticRewrites:0,publicationAuthorized:false,deploymentAuthorized:false});};
  return {root,output,records,examples,meanings,meaningsPath,feedbackPath,plan,planPath,authPath,gold,prepare,authorize,correction};
}
function prepared(options) {const f=fixture(options),result=f.prepare();assert.equal(result.status,0,result.stderr);f.authorize();return f;}
const success=({request})=>({httpStatus:200,raw:JSON.stringify({model:MODEL.model,status:'completed',output_text:`${request.perspective==='you'?'You':'They'} read a synthetic fixture through {{untilDate}}.`})});

test('source basis is inspectable privately; exact corrections reach both perspectives, raw mechanics do not',()=>{
  const f=prepared(),s=loadState(join(f.output,'batch'));
  assert.equal(s.contacts[0].privateMeaningReceipt.sourceBasis.kind,'component-semantics-not-an-authored-contact-interpretation');
  for(const c of s.contacts)for(const p of c.passages){assert.deepEqual(p.input.currentOwnerCorrections,[{id:f.correction.id,text:f.correction.text}]);assert(!JSON.stringify(p.request).includes(c.semanticPacket.aspect.mechanism));assert(!JSON.stringify(p.request).includes('sourceBasis'));}
  assert.equal(verifyPreparedDispatch(f.output,f.authPath).requests.length,8);
});
test('requested six-contact calibration blocks dispatch when an unselected contact is still pending',()=>{
  const f=prepared({pending:true});assert.throws(()=>verifyPreparedDispatch(f.output,f.authPath),/REQUESTED_MEANING_REVIEW_PENDING/);
  assert(!existsSync(join(f.output,'batch/dispatch-started.json')));
});
test('routine preparation does not acquire a universal owner-meaning approval gate',()=>{
  const f=fixture({calibration:false});for(const m of f.meanings)m.status='proposed-owner-review';write(f.meaningsPath,{id:'PERSONAL_TRANSIT_READER_MEANINGS',records:f.meanings});
  assert.equal(f.prepare().status,0);f.authorize();assert.doesNotThrow(()=>verifyPreparedDispatch(f.output,f.authPath));
});
test('calibration approval must bind the reviewed source basis and exact wording',()=>{
  const f=fixture();f.meanings[0].review.basisSha256='stale';write(f.meaningsPath,{id:'PERSONAL_TRANSIT_READER_MEANINGS',records:f.meanings});assert.match(f.prepare().stderr,/CALIBRATION_SOURCE_DRIFT/);
});
test('coverage cannot silently revert to the old four-contact regression list',()=>{
  const f=fixture();write(f.planPath,{...f.plan,selectedContacts:[keys[4],keys[2],keys[5],keys[3]]});assert.throws(()=>loadInputPlan(f.planPath),/REGRESSION_COVERAGE/);
});
test('new local rejection is consumed at the latest batch revision without rewriting the registry',()=>{
  const f=fixture(),history=join(f.root,'history');
  const prior=prepareBatch({id:'prior-fixture',records:records.slice(0,4),readerMeanings:f.meanings.slice(0,4),examples:f.examples,friendEvidencePolicy:'owner-authorized-you-voice'});
  const p=prior.contacts[0].passages[0];p.currentText='Complete rejected synthetic passage.';p.original={text:p.currentText,sha256:sha256(p.currentText)};p.status='needs-review';saveState(history,prior);
  const registry=read(f.feedbackPath);registry.rejectionSources.push({type:'batch',path:history,source:'synthetic-owner-thread'});write(f.feedbackPath,registry);
  const before=loadCurrentFeedback(f.feedbackPath);assert.equal(before.rejections.length,0);
  const next=review(prior,{actor:'owner',type:'reject',reason:'Exact owner rejection.',contentKey:keys[0],field:'body_you',expectedRevision:0,expectedTextSha256:sha256(p.currentText)});saveState(history,next);
  const after=loadCurrentFeedback(f.feedbackPath);assert.equal(after.rejections[0].text,p.currentText);assert.equal(after.rejections[0].reason,'Exact owner rejection.');assert.notEqual(after.sha256,before.sha256);
  assert.equal(f.prepare().status,0);f.authorize();assert(!JSON.stringify(loadState(join(f.output,'batch')).contacts[0].passages[0].request).includes(p.currentText));
  const newer=review(next,{actor:'owner',type:'reject',reason:'More current owner rejection.',contentKey:keys[0],field:'body_you',expectedRevision:1,expectedTextSha256:sha256(p.currentText)});saveState(history,newer);
  assert.throws(()=>verifyPreparedDispatch(f.output,f.authPath),/CURRENT_FEEDBACK_CHANGED/);
});
test('rejected prose cannot be relabeled as a new positive voice example',()=>{
  const f=fixture(),e=f.examples[0],receipt=join(f.root,'rejected.json');
  write(receipt,{ownerReasonVerbatim:'Synthetic rejection',passages:[{contentKey:keys[0],text:e.text,sha256:e.sha256}]});
  const reg=read(f.feedbackPath);reg.rejectionSources.push({type:'receipt',path:receipt,source:'synthetic-owner-source',sha256:sha256(readFileSync(receipt))});write(f.feedbackPath,reg);
  assert.equal(f.prepare().status,0);f.authorize();
  const state=loadState(join(f.output,'batch'));
  for(const c of state.contacts)for(const p of c.passages){assert.equal(p.evidence.length,0);assert(!JSON.stringify(p.request).includes(e.text));}
  assert.throws(()=>verifyPreparedDispatch(f.output,f.authPath),/EVIDENCE_NOT_READY/);
});
test('retired experimental meanings cannot re-enter even when their hashes are valid',()=>{
  const f=fixture(),reg=read(f.feedbackPath);reg.exclusions=[{role:'meaning',sha256:f.meanings[0].sha256,contentKeys:[keys[0]],source:'synthetic-audit',reason:'Retired fixture input'}];write(f.feedbackPath,reg);
  assert.match(f.prepare().stderr,/REJECTED_OR_RETIRED_READER_MEANING/);
});
test('inferred authorization and a receipt for different requests both fail before transport',()=>{
  const f=prepared(),auth=read(f.authPath);write(f.authPath,{maximumCalls:8,requests:auth.requestHashes,interpretation:'Assistant inference'});
  assert.throws(()=>verifyPreparedDispatch(f.output,f.authPath),/EXPLICIT_AUTHORIZATION_RECEIPT_REQUIRED/);
  write(f.authPath,{...auth,requestHashes:auth.requestHashes.toReversed()});assert.throws(()=>verifyPreparedDispatch(f.output,f.authPath),/AUTHORIZATION_REQUEST_MISMATCH/);
});
test('changed current corrections invalidate previously prepared requests and authorization',()=>{
  const f=prepared(),reg=read(f.feedbackPath);reg.corrections[0].text='Updated exact synthetic correction.';reg.corrections[0].sha256=sha256(reg.corrections[0].text);write(f.feedbackPath,reg);
  assert.throws(()=>verifyPreparedDispatch(f.output,f.authPath),/CURRENT_FEEDBACK_CHANGED/);
});
test('mechanical success never reports semantic or voice approval',()=>{
  const f=prepared(),s=loadState(join(f.output,'batch')),c=s.contacts[0],p=c.passages[0];
  const checks=validatePassage('You will always succeed through {{untilDate}}.',c,p);
  assert.equal(checks.passed,true);assert.equal(checks.meaningAssessment,'owner-review-pending');assert.equal(checks.voiceAssessment,'owner-review-pending');assert.equal(p.approved,null);
});
for(const code of ['ENOTFOUND','PROVIDER_TIMEOUT'])test(`${code} stops after one attempt, preserves unused count, forbids replay`,async()=>{
  const f=prepared();let calls=0;
  const receipt=await dispatchPreparedOnce({directory:f.output,authorizationPath:f.authPath,send:async()=>{calls++;throw Object.assign(Error('synthetic'),{code});}});
  assert.equal(calls,1);assert.equal(receipt.networkAttempts,1);assert.equal(receipt.httpResponses,0);assert.equal(receipt.completedGenerations,0);assert.equal(receipt.notAttempted,7);
  assert.equal(receipt.results[0].delivery,code==='ENOTFOUND'?'not-sent-to-provider':'unknown-do-not-retry');
  await assert.rejects(()=>dispatchPreparedOnce({directory:f.output,authorizationPath:f.authPath,send:async()=>{throw Error('must not call');}}),/BATCH_ALREADY_ATTEMPTED/);
});
for(const [httpStatus,raw] of [[503,'{"error":"synthetic"}'],[200,'malformed synthetic response']])test(`HTTP ${httpStatus} failure stays raw and stops without a rewrite`,async()=>{
  const f=prepared();const receipt=await dispatchPreparedOnce({directory:f.output,authorizationPath:f.authPath,send:async()=>({httpStatus,raw})});
  assert.equal(receipt.httpResponses,1);assert.equal(receipt.completedGenerations,0);assert.equal(receipt.notAttempted,7);assert.equal(readFileSync(join(f.output,'responses/attempt-1-you/raw-response.bin'),'utf8'),raw);
});
test('eight simulated successes preserve text, authorization hash, model settings and owner review',async()=>{
  const f=prepared();const receipt=await dispatchPreparedOnce({directory:f.output,authorizationPath:f.authPath,send:async arg=>success(arg)});
  assert.equal(receipt.networkAttempts,8);assert.equal(receipt.httpResponses,8);assert.equal(receipt.completedGenerations,8);assert.equal(receipt.notAttempted,0);
  assert.equal(receipt.authorizationSha256,sha256(readFileSync(f.authPath)));assert.equal(receipt.reviewerCalls,0);assert.equal(receipt.automaticRewrites,0);
  for(const c of loadState(join(f.output,'batch')).contacts)for(const p of c.passages){assert.equal(p.currentText,p.original.text);assert.equal(p.status,'needs-review');assert.equal(p.approved,null);}
});
test('a correction arriving during a batch stops the next request before transport',async()=>{
  const f=prepared();let calls=0;
  const receipt=await dispatchPreparedOnce({directory:f.output,authorizationPath:f.authPath,send:async arg=>{calls++;const response=success(arg);const reg=read(f.feedbackPath);reg.corrections=[];write(f.feedbackPath,reg);return response;}});
  assert.equal(calls,1);assert.equal(receipt.networkAttempts,1);assert.equal(receipt.notAttempted,7);assert.equal(receipt.results[1].failureStage,'local-before-transport');
});
test('newly prepared batches register their later rejections for future retrieval automatically',async()=>{
  const f=prepared();await dispatchPreparedOnce({directory:f.output,authorizationPath:f.authPath,send:async arg=>success(arg)});
  const batch=join(f.output,'batch'),s=loadState(batch),p=s.contacts[0].passages[0];
  saveState(batch,review(s,{actor:'owner',type:'reject',reason:'Future retrieval must see this exact rejection.',contentKey:keys[0],field:'body_you',expectedRevision:s.revision,expectedTextSha256:sha256(p.currentText)}));
  const feedback=loadCurrentFeedback(f.feedbackPath);assert.equal(feedback.rejections.length,1);assert.equal(feedback.rejections[0].text,p.currentText);
  assert.equal(loadCurrentFeedback(f.feedbackPath,{excludeBatchDirectory:batch}).rejections.length,0);
});
test('existing explicit batch-completion rule still applies before a subsequent test',()=>{
  const f=fixture(),prior=join(f.root,'prior');
  saveState(prior,prepareBatch({id:'prior-batch',records:records.slice(0,4),readerMeanings:f.meanings.slice(0,4),examples:f.examples,friendEvidencePolicy:'owner-authorized-you-voice'}));
  write(f.planPath,{...f.plan,previousBatchDirectory:prior});assert.equal(f.prepare().status,0);f.authorize();
  assert.throws(()=>verifyPreparedDispatch(f.output,f.authPath),/OWNER_BATCH_REVIEW_REQUIRED/);
});
test('a new exact owner request permits continuation without changing previous review or allowing stale permission',()=>{
  const f=fixture(),prior=join(f.root,'prior');
  const state=prepareBatch({id:'prior-batch',records:records.slice(0,4),readerMeanings:f.meanings.slice(0,4),examples:f.examples,friendEvidencePolicy:'owner-authorized-you-voice'});
  saveState(prior,state);
  const continuation={actor:'owner',decision:'continue-without-approving-prior',source:'synthetic-owner-request',ownerStatement:'Synthetic new batch request',ownerApproved:false,
    previousBatchId:state.id,previousRevision:state.revision,previousStateSha256:sha256(state),nextBatchId:f.plan.id};
  write(f.planPath,{...f.plan,previousBatchDirectory:prior,previousBatchContinuation:continuation});
  assert.equal(f.prepare().status,0);f.authorize();assert.doesNotThrow(()=>verifyPreparedDispatch(f.output,f.authPath));
  assert.deepEqual(loadState(prior),state);
  saveState(prior,{...state,revision:state.revision+1});
  assert.throws(()=>verifyPreparedDispatch(f.output,f.authPath),/EXACT_BATCH_CONTINUATION_PERMISSION_REQUIRED/);
});
test('edited preparation metadata cannot preserve a stale preparation hash',()=>{
  const f=prepared(),path=join(f.output,'batch/revision-000000.json'),s=read(path);s.contacts[0].passages[0].contract.field='tampered';write(path,s);
  assert.throws(()=>verifyPreparedDispatch(f.output,f.authPath),/PREPARATION_STATE_DRIFT/);
});
test('authorization changes during a batch stop the next request',async()=>{
  const f=prepared();let calls=0;
  const receipt=await dispatchPreparedOnce({directory:f.output,authorizationPath:f.authPath,send:async arg=>{calls++;write(f.authPath,{decision:'revoked'});return success(arg);}});
  assert.equal(calls,1);assert.equal(receipt.networkAttempts,1);assert.equal(receipt.results[1].failureStage,'local-before-transport');assert.equal(receipt.notAttempted,7);
});

test('explicit proposed-meaning test permission covers all six exact records without approving them',()=>{
  const f=fixture({pending:true});
  f.plan.evaluationPermission={actor:'owner',decision:'test-proposed-keep-unapproved',calibrationId:f.plan.calibration.id,source:'synthetic-owner-request',ownerStatement:'Test the proposals; keep unapproved',ownerApproved:false,
    records:f.meanings.map(m=>({contentKey:m.contentKey,textSha256:m.sha256,recordSha256:m.recordSha256}))};
  write(f.planPath,f.plan);assert.equal(f.prepare().status,0);f.authorize();
  const ready=verifyPreparedDispatch(f.output,f.authPath);assert.equal(ready.state.inputReview.calibration.status,'evaluation-authorized');
  assert.equal(read(f.meaningsPath).records[4].status,'proposed-owner-review');
  const other=fixture({pending:true});other.plan.evaluationPermission={...f.plan.evaluationPermission,records:f.plan.evaluationPermission.records.slice(0,4)};
  write(other.planPath,other.plan);assert.match(other.prepare().stderr,/EXACT_EVALUATION_PERMISSION_REQUIRED/);
});
