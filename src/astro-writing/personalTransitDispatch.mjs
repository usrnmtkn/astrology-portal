import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { MODEL, sha256, loadState, prepareBatch, findPassage, ingestRawResponse, assertNextBatchAllowed } from './ownerTransitBatch.mjs';
import { READER_RULES_SHA256 } from './personalTransitReaderRules.mjs';
import { loadInputPlan, loadCurrentFeedback } from './personalTransitInputControls.mjs';

import { resolveBatchInputs } from './personalTransitPreparation.mjs';

const read = path => JSON.parse(readFileSync(path,'utf8'));
const write = (path,value) => writeFileSync(path,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});

export function verifyPreparedDispatch(directory, authorizationPath) {
  const manifestBytes=readFileSync(join(directory,'manifest.json')), manifest=JSON.parse(manifestBytes);
  assert.equal(manifest.schema,'personal-transit-dispatch-manifest-v1','CURRENT_DISPATCH_MANIFEST_REQUIRED');
  assert.deepEqual(manifest.model,MODEL,'MODEL_SETTINGS_CHANGED');
  assert.equal(manifest.ruleBundleSha256,READER_RULES_SHA256,'READER_RULES_CHANGED');
  const state=loadState(manifest.batchDirectory);
  assert(!existsSync(join(manifest.batchDirectory,'dispatch-started.json')),'BATCH_ALREADY_ATTEMPTED_NO_REPLAY');
  assert.equal(state.revision,0,'BATCH_ALREADY_HAS_RESULTS_OR_REVIEW');
  assert.equal(state.id,manifest.batchId);assert.equal(state.preparationSha256,manifest.preparationSha256);
  const {preparationSha256,revision,ownerCompletedReview,events,...prepared}=state;
  assert.equal(sha256(prepared),preparationSha256,'PREPARATION_STATE_DRIFT');
  assert.equal(ownerCompletedReview,false);assert.deepEqual(events,[]);
  for (const f of [...manifest.sourceFiles,...manifest.inputFiles]) assert.equal(sha256(readFileSync(f.path)),f.sha256,'PREPARED_SOURCE_DRIFT');
  const plan=loadInputPlan(manifest.inputPlanPath), feedback=loadCurrentFeedback(manifest.feedbackRegistryPath,{excludeBatchDirectory:manifest.batchDirectory});
  if(plan.previousBatchDirectory)assertNextBatchAllowed(loadState(plan.previousBatchDirectory),plan.previousBatchContinuation,plan.id);
  assert.equal(plan.feedbackFile,manifest.feedbackRegistryPath);
  assert.equal(feedback.sha256,manifest.feedbackSha256,'CURRENT_FEEDBACK_CHANGED_REBUILD_REQUIRED');
  const {state:fresh}=resolveBatchInputs({catalogPath:state.provenance.catalogPath,voiceGoldPath:state.provenance.voiceGoldPath,
    readerMeaningsPath:state.provenance.readerMeaningsPath,sourcesPath:state.provenance.sourcesPath,inputPlanPath:manifest.inputPlanPath,outputDirectory:directory});
  assert(fresh.inputReview.sourceBasisAcknowledged,'MEANING_SOURCE_BASIS_REQUIRED');
  assert(!fresh.inputReview.calibration.required || ['complete','evaluation-authorized'].includes(fresh.inputReview.calibration.status),'REQUESTED_MEANING_REVIEW_PENDING');
  assert.equal(manifest.requests.length,8);assert.equal(new Set(manifest.requests.map(r=>`${r.contentKey}:${r.field}`)).size,8);
  const requests=fresh.contacts.flatMap((c,i)=>c.passages.map(p=>({c,p,file:`${i+1}-${p.perspective}.request.json`}))).map(({c,p,file},i)=>{
    const r=manifest.requests[i];
    assert.equal(r.contentKey,c.contentKey);assert.equal(r.field,p.field);assert.equal(r.perspective,p.perspective);assert.equal(r.requestFile,file);
    assert.equal(p.preparationStatus,'prepared-not-authorized','EVIDENCE_NOT_READY');
    const bytes=readFileSync(join(directory,file));
    assert.equal(sha256(bytes),r.requestSha256,'REQUEST_BYTES_CHANGED');
    assert.equal(p.requestSha256,r.requestSha256,'REQUEST_NO_LONGER_MATCHES_CURRENT_INPUTS');
    assert.deepEqual(JSON.parse(bytes),findPassage(state,r.contentKey,r.field).passage.request);
    return {...r,bytes};
  });
  const authBytes=readFileSync(authorizationPath), auth=JSON.parse(authBytes);
  assert.equal(auth.schema,'personal-transit-explicit-authorization-v1','EXPLICIT_AUTHORIZATION_RECEIPT_REQUIRED');
  assert.equal(auth.actor,'owner');assert.equal(auth.decision,'authorize-exact-batch');
  assert(typeof auth.ownerStatement==='string' && auth.ownerStatement.trim() && typeof auth.source==='string' && auth.source.trim(),'OWNER_STATEMENT_AND_SOURCE_REQUIRED');
  assert.equal(auth.manifestSha256,sha256(manifestBytes),'AUTHORIZATION_MANIFEST_MISMATCH');
  assert.deepEqual(auth.requestHashes,requests.map(r=>r.requestSha256),'AUTHORIZATION_REQUEST_MISMATCH');
  assert.deepEqual(auth.model,MODEL);assert.equal(auth.maximumCalls,8);assert.equal(auth.callsPerRequest,1);
  for(const key of ['retries','reviewerCalls','automaticRewrites']) assert.equal(auth[key],0);
  for(const key of ['publicationAuthorized','deploymentAuthorized']) assert.equal(auth[key],false);
  return {manifest,state,requests,authorizationSha256:sha256(authBytes),authorizationSource:auth.source,manifestSha256:sha256(manifestBytes),feedbackSha256:feedback.sha256};
}

// One bounded writer pass. Transport is injected for offline verification, not
// a reviewer or another generation stage. Every failure stops the batch.
export async function dispatchPreparedOnce({directory,authorizationPath,send}) {
  const ready=verifyPreparedDispatch(directory,authorizationPath);
  const start={at:new Date().toISOString(),manifestSha256:ready.manifestSha256,authorizationSha256:ready.authorizationSha256,authorizationSource:ready.authorizationSource,maximumCalls:8};
  write(join(ready.manifest.batchDirectory,'dispatch-started.json'),start);
  const responses=join(directory,'responses');mkdirSync(responses,{mode:0o700});
  const results=[];let networkAttempts=0,httpResponses=0,completedGenerations=0;
  for(const [i,r] of ready.requests.entries()) {
    const attemptId=`attempt-${i+1}-${r.perspective}`,target=join(responses,attemptId);mkdirSync(target,{mode:0o700});
    write(join(target,'request-body.json'),r.bytes);
    write(join(target,'reserved.json'),{requestSha256:r.requestSha256,attempt:1,at:new Date().toISOString()});
    let result,networkAttempted=false,httpCounted=false;
    try {
      assert.equal(sha256(readFileSync(authorizationPath)),ready.authorizationSha256,'AUTHORIZATION_CHANGED_STOP');
      const plan=loadInputPlan(ready.manifest.inputPlanPath);
      if(plan.previousBatchDirectory)assertNextBatchAllowed(loadState(plan.previousBatchDirectory),plan.previousBatchContinuation,plan.id);
      assert.equal(loadCurrentFeedback(ready.manifest.feedbackRegistryPath,{excludeBatchDirectory:ready.manifest.batchDirectory}).sha256,ready.feedbackSha256,'CURRENT_FEEDBACK_CHANGED_STOP');
      for(const f of [...ready.manifest.sourceFiles,...ready.manifest.inputFiles]) assert.equal(sha256(readFileSync(f.path)),f.sha256,'PREPARED_SOURCE_CHANGED_STOP');
      networkAttempts++;networkAttempted=true;
      const response=await send({bytes:r.bytes,directory:target,request:r});
      const raw=Buffer.isBuffer(response.raw)?response.raw:Buffer.from(response.raw);
      httpResponses++;httpCounted=true;
      const rawPath=join(target,'raw-response.bin');
      if(existsSync(rawPath)) assert.equal(sha256(readFileSync(rawPath)),sha256(raw)); else write(rawPath,raw);
      if(!existsSync(join(target,'http.json'))) write(join(target,'http.json'),{httpStatus:response.httpStatus,requestId:response.requestId ?? null});
      write(join(target,'raw-receipt.json'),{sha256:sha256(raw),bytes:raw.length,capturedBeforeParsing:true});
      const state=ingestRawResponse(ready.manifest.batchDirectory,loadState(ready.manifest.batchDirectory),{contentKey:r.contentKey,field:r.field,raw,httpStatus:response.httpStatus,requestSha256:r.requestSha256,attemptId});
      const {passage}=findPassage(state,r.contentKey,r.field);
      if(passage.original) { completedGenerations++;write(join(target,'untouched-prose.txt'),passage.original.text); }
      result={requestSha256:r.requestSha256,httpStatus:response.httpStatus,status:passage.status,outputSha256:passage.original?.sha256 ?? null,
        rawResponseSha256:sha256(raw),validation:passage.validation,meaningAssessment:'owner-review-pending',voiceAssessment:'owner-review-pending',failure:passage.receipts.at(-1)?.failure ?? null};
    } catch(error) {
      const stage=!networkAttempted?'local-before-transport':error.code==='ENOTFOUND'?'dns-before-http':error.code==='PROVIDER_TIMEOUT'?'timeout-delivery-unknown':'transport-or-import-failure';
      if(!httpCounted && existsSync(join(target,'http.json')))httpResponses++;
      if(existsSync(join(target,'raw-response.bin')) && !existsSync(join(target,'raw-receipt.json'))) {
        const raw=readFileSync(join(target,'raw-response.bin'));write(join(target,'raw-receipt.json'),{sha256:sha256(raw),bytes:raw.length,complete:false});
      }
      result={requestSha256:r.requestSha256,status:'failed-no-retry',failureStage:stage,errorCode:error.code ?? 'LOCAL_DISPATCH_ERROR',rawPreserved:existsSync(join(target,'raw-response.bin')),
        receivedHttpResponse:existsSync(join(target,'http.json')),delivery:['local-before-transport','dns-before-http'].includes(stage)?'not-sent-to-provider':'unknown-do-not-retry'};
    }
    write(join(target,'result.json'),result);results.push(result);
    if(result.status!=='needs-review') break;
  }
  const receipt={...start,completedAt:new Date().toISOString(),reservedRequests:results.length,networkAttempts,httpResponses,completedGenerations,notAttempted:8-networkAttempts,
    retries:0,reviewerCalls:0,automaticRewrites:0,publication:false,deployment:false,results};
  write(join(directory,'execution-receipt.json'),receipt);return receipt;
}
