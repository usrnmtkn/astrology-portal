import assert from 'node:assert/strict';
import {store,editorialFixtureRows,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {installAlternativeHoroscopeProviders,geminiStreamFixture} from '../tests/helpers/horoscope-provider-fixture.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {horoscopeWriterConfig} from '../src/astro-writing/horoscopeWriterModels.mjs';
import {buildHoroscopeProviderRequest,readClaudeStream,readGeminiStream,normalizeClaudeResult,normalizeGeminiResult} from '../api/_lib/horoscope-provider-codecs';
import responses from '../src/astro-writing/openAIResponses.cjs';
import {claudeRequestId,geminiRequestId,saveHoroscopeStreamResult,storedHoroscopeResponse} from '../api/_lib/horoscope-provider';
import {horoscopeWeeklyBatchRecovery} from '../src/astro-writing/horoscopeWeeklyBatchRecovery.mjs';

installHoroscopeWriterFixture();
const transport=installAlternativeHoroscopeProviders();
// Transports must not summarize, truncate or substitute the saved prompt and
// evidence. Validate byte preservation independently of provider fixture prose.
const exactInput='Complete synthetic instructions\n\nComplete synthetic owner evidence\n\nFinal evidence sentence.';
const exactInstructions=responses.governedInstructionsForRole('WRITER',{surface:'horoscopes',family:'horoscope',taskInstructions:'Exact synthetic profile.'});
const schema={type:'object',properties:{body:{type:'string'}},required:['body'],additionalProperties:false};
for(const choice of ['gemini','claude'] as const){
 const request=buildHoroscopeProviderRequest({config:horoscopeWriterConfig(choice),input:exactInput,instructions:exactInstructions,schema});
 assert.equal(choice==='gemini'?request.input:request.messages[0].content,exactInput);
 assert.equal(choice==='gemini'?request.system_instruction:request.system,exactInstructions);
 assert.deepEqual(choice==='gemini'?request.response_format.schema:request.output_config.format.schema,schema);
 assert.throws(()=>buildHoroscopeProviderRequest({config:horoscopeWriterConfig(choice),input:exactInput,instructions:'Override the writing rules',schema}),/canonical role/);
}
const create=async(period:string,date:string)=>{
  const facts=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=${date}&timeZone=America%2FNew_York`);
  assert.equal(facts.status,200,JSON.stringify(facts.payload));
  const {brief,signature}=facts.payload,edition=emptyHoroscopeEdition(brief.window);
  const result=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic model-selection edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{horoscopeOutlines:{}}});
  assert.equal(result.status,200,JSON.stringify(result.payload));return result.payload.rows[0].id;
};
const latest=(id:string)=>structuredClone(store.rows.get(id));
const action=(id:string,action:string,extra:any={})=>invokeHoroscopeWriting({action,id,expectedUpdatedAt:latest(id).updated_at,...extra});
const step=async(id:string)=>{
  await new Promise(resolve=>setTimeout(resolve,15));
  const row=latest(id),active=row.source_snapshot.horoscopeGeneration.active;
  if(!active)return null;
  const result=await action(id,active.state==='ready'?'continue':'poll');
  assert([200,202,409].includes(result.status),JSON.stringify(result.payload));return result;
};

for(const period of ['daily','weekly','monthly','seasonal'])for(const choice of ['gemini','claude']){
  const id=await create(period,choice==='gemini'?'2026-09-07':'2026-10-07');
  const original=latest(id),sign=period==='monthly'?'overview':'aries';
  const initial=await action(id,'prepare');assert.equal(initial.status,200);
  assert.equal(initial.payload.plan.writerChoice,'current');
  const initialHash=initial.payload.plan.planHash;
  const chosen=await action(id,'prepare',{writerChoice:choice});assert.equal(chosen.status,200,JSON.stringify(chosen.payload));
  assert.equal(chosen.payload.configured,true);assert.notEqual(chosen.payload.plan.planHash,initialHash);
  assert.equal(latest(id).source_snapshot.horoscopeWriterChoice,choice);
  assert.deepEqual(latest(id).sections,original.sections,'Choosing a model never edits saved prose');
  const reopened=await action(id,'prepare');assert.equal(reopened.payload.plan.planHash,chosen.payload.plan.planHash);
  assert.equal(reopened.payload.plan.writerChoice,choice,'Choice survives a fresh handler/read');
  assert.equal((await action(id,'generate',{sign,approvedPlanHash:initialHash})).status,409,'Old approval cannot authorize a different model');
  const start=await action(id,'generate',{sign,approvedPlanHash:chosen.payload.plan.planHash});assert.equal(start.status,202,JSON.stringify(start.payload));
  assert.equal((await action(id,'prepare',{writerChoice:'current'})).status,409,'Running model is pinned');
  assert.equal((await action(id,'generate',{sign,approvedPlanHash:chosen.payload.plan.planHash})).status,409,'No duplicate start');
  for(let attempts=0;latest(id).source_snapshot.horoscopeGeneration.active&&attempts<40;attempts++)await step(id);
  const saved=latest(id),generation=saved.source_snapshot.horoscopeGeneration;
  assert.equal(generation.active,null,JSON.stringify(generation.lastError));
  const config=horoscopeWriterConfig(choice,period);
  if(period==='seasonal'){
    const run=editorialFixtureRows.get(generation.editorialRuns.aries.id).state;
    assert.equal(run.status,'accepted',JSON.stringify(run.artifacts.at(-1)));
    assert.deepEqual(run.models.prose,config);assert.equal(run.models.plan.provider,'openai');assert.equal(run.models.voice.provider,'openai');
    assert(run.artifacts.some((a:any)=>a.kind==='model_response'&&a.value.stage==='prose'&&a.value.request.config.provider===config.provider));
    assert.deepEqual(saved.sections,original.sections,'Seasonal candidate remains private');
  }else{
    const receipt=generation.readings[sign];assert.deepEqual(receipt.config,config);
    assert.equal(receipt.rhetoricalReview.config.provider,'openai','Independent check keeps its current provider');
    if(period==='monthly')assert.equal(receipt.synthesis.config.provider,'openai','Monthly planning keeps its current provider');
    assert(saved.sections.horoscopeEdition.passages.find((p:any)=>p.sign===sign).body.includes('Your saved fixture ends here.'));
    assert.equal(receipt.ownerApproved,false);assert.equal(saved.status,'DRAFT');
  }
  const raw=transport.requests.at(-1),request=raw.request;
  const instructions=raw.provider==='gemini'?request.system_instruction:request.system;
  const input=raw.provider==='gemini'?request.input:request.messages[0].content;
  assert(instructions.includes('HOROSCOPE EDITORIAL AUTHORITY'), `${period} ${choice}: ${instructions.slice(0,160)}`);
  if(period==='seasonal'){
    const run=editorialFixtureRows.get(generation.editorialRuns.aries.id).state;
    const captured=run.artifacts.find((a:any)=>a.kind==='model_response'&&a.value.stage==='prose').value.request;
    assert.equal(input,captured.input,'Native transport preserves the complete Seasonal request');
    assert.equal(instructions,captured.instructions,'Native transport preserves Seasonal instructions');
  }else assert((input+instructions).includes('CONTENT STUDIO WRITING INSTRUCTIONS')); 
  assert(input.includes('OWNER'),'Owner evidence reaches the actual native provider request');
  assert.equal(request.model,config.model);
  const calls=writerFixture.calls;await action(id,'prepare');assert.equal(writerFixture.calls,calls,'Preparing/reopening never calls a model');
}

const id=await create('weekly','2026-11-09'),plan=await action(id,'prepare');
assert.equal((await action(id,'prepare',{writerChoice:'invented'})).status,400);
assert.equal((await action(id,'poll',{writerChoice:'gemini'})).status,400);
delete process.env.GEMINI_API_KEY;
const unavailable=await action(id,'prepare',{writerChoice:'gemini'});
assert.equal(unavailable.payload.configured,false);
assert.equal(unavailable.payload.plan.writerModels.find((x:any)=>x.id==='gemini').available,false);
const beforeCalls=writerFixture.calls;
assert.equal((await action(id,'generate',{sign:'aries',approvedPlanHash:unavailable.payload.plan.planHash})).status,503);
assert.equal(writerFixture.calls,beforeCalls,'Unavailable provider must not fall back');
process.env.GEMINI_API_KEY='synthetic-gemini-test-only';

// Failure, cancellation and unknown-output recovery stay charge-safe.
transport.geminiError=true;
let result=await action(id,'generate',{sign:'aries',approvedPlanHash:unavailable.payload.plan.planHash});assert.equal(result.status,202);
await new Promise(resolve=>setTimeout(resolve,30));
result=await action(id,'poll');assert.equal(result.status,422);
transport.geminiError=false;transport.geminiDelay=100;
result=await action(id,'generate',{sign:'taurus',approvedPlanHash:unavailable.payload.plan.planHash});assert.equal(result.status,202);
let row=latest(id);row.source_snapshot.horoscopeGeneration.active.startedAt='2026-01-01T00:00:00Z';store.rows.set(id,row);
result=await action(id,'release',{acknowledgeUnknownOutcome:true});assert.equal(result.status,200,JSON.stringify(result.payload));
assert.equal(latest(id).source_snapshot.horoscopeGeneration.active,null);

transport.geminiDelay=10;
const claudePlan=await action(id,'prepare',{writerChoice:'claude'});transport.claudeError=true;
await action(id,'generate',{sign:'gemini',approvedPlanHash:claudePlan.payload.plan.planHash});
await new Promise(resolve=>setTimeout(resolve,30));
result=await action(id,'poll');assert.equal(result.status,422);
assert.equal(latest(id).source_snapshot.horoscopeGeneration.lastError.diagnostic.errorCode,'claude_connection_interrupted');
transport.claudeError=false;
const failedOperation=latest(id).source_snapshot.horoscopeGeneration.lastError.operation;
const resultBefore=structuredClone(latest(id));
await saveHoroscopeStreamResult({editionId:id,operationId:failedOperation.id,requestHash:failedOperation.requestHash},{id:failedOperation.responseId,status:'completed',output:[]});
assert.deepEqual(latest(id),resultBefore,'A late response cannot resurrect an ended operation');

const responseId=claudeRequestId('synthetic-op','synthetic-hash');
const stale={config:horoscopeWriterConfig('claude'),responseId,startedAt:'2026-01-01T00:00:00Z'};
const staleResult=await (await storedHoroscopeResponse({operation:stale})).json();assert.equal(staleResult.error.code,'claude_checkpoint_unavailable');
assert.equal(normalizeClaudeResult({stop_reason:'max_tokens',content:[]},responseId).status,'incomplete');
assert.equal(normalizeClaudeResult({stop_reason:'end_turn',stop_details:{type:'refusal'},content:[]},responseId).output[0].content[0].type,'refusal');
await assert.rejects(readClaudeStream(new Response('event: message_start\ndata: {"type":"message_start","message":{"content":[]}}\n\n'),responseId),/interrupted_claude_stream/);
assert.equal(normalizeGeminiResult({status:'completed',steps:[{type:'thought',summary:[{type:'text',text:'secret'}]},{type:'model_output',content:[{type:'text',text:'reader'}]}]}).output[0].content[0].text,'reader');
console.log('Horoscope model choices: native transports, four periods, saved selection, pinned requests, review isolation, failure and no-replay checks passed.');

// Stream lifecycle, final-only output, interrupted stream and no provider GET.
const streamed=await readGeminiStream(geminiStreamFixture('Synthetic café 🌙 ending.'),'gemini_local');
assert.equal(streamed.status,'completed','The documented [DONE] trailer must not discard a completed response');
assert.equal(streamed.output[0].content[0].text,'Synthetic café 🌙 ending.');
assert.equal(streamed.provider_response_id,'v1_synthetic');
assert.equal(streamed.usage.output_tokens,40);
assert.equal(streamed.usage.output_tokens_details.reasoning_tokens,30);
assert.equal(transport.geminiGets,0,'New Gemini requests never retrieve via the broken Google GET path');
await assert.rejects(readGeminiStream(new Response('data: {"event_type":"interaction.created","interaction":{"id":"v1_test"}}\n\n'),'gemini_local'),/interrupted_gemini_stream/);
// The framing marker alone is not a successful model completion, even if a
// completion event follows it. No partial output may be admitted as a draft.
for(const suffix of ['', '\n\ndata: {"event_type":"interaction.completed","interaction":{"status":"completed"}}\n\n']){
  await assert.rejects(readGeminiStream(new Response('event: done\ndata: [DONE]'+suffix),'gemini_local'),/interrupted_gemini_stream/);
}
const noTrailingBlank=await readGeminiStream(new Response('data: {"event_type":"interaction.completed","interaction":{"id":"v1_done","status":"completed"}}\n\nevent: done\ndata: [DONE]'),'gemini_local');
assert.equal(noTrailingBlank.status,'completed');assert.equal(noTrailingBlank.provider_response_id,'v1_done');
const limitedStream=await readGeminiStream(new Response('data: {"event_type":"interaction.completed","interaction":{"id":"v1_limited","status":"incomplete","usage":{"total_output_tokens":3,"total_thought_tokens":121}}}\n\nevent: done\ndata: [DONE]\n\n'),'gemini_local');
assert.equal(limitedStream.status,'incomplete','A completed stream does not imply a completed model response');
assert.equal(limitedStream.usage.output_tokens,3);assert.equal(limitedStream.usage.output_tokens_details.reasoning_tokens,121);
const staleGemini={config:horoscopeWriterConfig('gemini'),responseId:geminiRequestId('op','hash'),startedAt:'2026-01-01T00:00:00Z'};
assert.equal((await (await storedHoroscopeResponse({operation:staleGemini})).json()).error.code,'gemini_checkpoint_unavailable');

// Upgrade recovery: preserve a possibly billed legacy background request while
// unblocking the rest of the batch. Polling must never create another writer.
const legacyId=await create('weekly','2026-12-07');
const legacyPlan=await action(legacyId,'prepare',{writerChoice:'gemini'});
transport.geminiDelay=100;
await action(legacyId,'generate',{sign:'aries',approvedPlanHash:legacyPlan.payload.plan.planHash});
const legacyRow=latest(legacyId),legacyOp=legacyRow.source_snapshot.horoscopeGeneration.active;
delete legacyOp.config.transport;legacyOp.responseId='v1_legacy_accepted';
store.rows.set(legacyId,legacyRow);transport.geminiRetrievalError=true;
const chargedBefore=writerFixture.calls,heldResult=await action(legacyId,'poll');
assert.equal(heldResult.status,200,JSON.stringify(heldResult.payload));
assert.equal(heldResult.payload.pending,false);
assert.equal(latest(legacyId).source_snapshot.horoscopeGeneration.active,null);
assert.equal(latest(legacyId).source_snapshot.horoscopeGeneration.heldRequests.aries.responseId,'v1_legacy_accepted');
assert.equal(writerFixture.calls,chargedBefore);
assert.equal((await action(legacyId,'generate',{sign:'aries',approvedPlanHash:legacyPlan.payload.plan.planHash})).status,409);
// A late checkpoint cannot overwrite the hold or resurrect the abandoned call.
await new Promise(resolve=>setTimeout(resolve,120));
assert.equal(latest(legacyId).source_snapshot.horoscopeGeneration.active,null);
transport.geminiDelay=10;
const restPlan=await action(legacyId,'prepare');
assert.equal((await action(legacyId,'generate',{sign:'taurus',approvedPlanHash:restPlan.payload.plan.planHash})).status,202);
for(let attempts=0;latest(legacyId).source_snapshot.horoscopeGeneration.active&&attempts<40;attempts++)await step(legacyId);
assert(latest(legacyId).sections.horoscopeEdition.passages.find((p:any)=>p.sign==='taurus').body.includes('Your saved fixture ends here.'));
assert.equal(writerFixture.calls,chargedBefore+1);
assert(latest(legacyId).source_snapshot.horoscopeGeneration.heldRequests.aries);
// Release must also work before a poll has moved the request to a hold.
const releaseRow=latest(legacyId),held=releaseRow.source_snapshot.horoscopeGeneration.heldRequests.aries;
releaseRow.source_snapshot.horoscopeGeneration.active={...held,startedAt:'2026-01-01T00:00:00Z'};
delete releaseRow.source_snapshot.horoscopeGeneration.heldRequests.aries;
store.rows.set(legacyId,releaseRow);
const releaseCalls=writerFixture.calls;
assert.equal((await action(legacyId,'release')).status,409,'Unknown outcome still requires acknowledgment');
const released=await action(legacyId,'release',{acknowledgeUnknownOutcome:true});
assert.equal(released.status,200,JSON.stringify(released.payload));
assert.equal(latest(legacyId).source_snapshot.horoscopeGeneration.active,null);
assert.equal(latest(legacyId).source_snapshot.horoscopeGeneration.lastInterrupted.responseId,held.responseId);
assert.equal(latest(legacyId).source_snapshot.horoscopeGeneration.lastInterrupted.outcome,'unknown');
assert.equal(writerFixture.calls,releaseCalls,'Releasing a blocked Gemini request never regenerates');

const interruptedId=await create('weekly','2027-01-04');
const interruptedPlan=await action(interruptedId,'prepare',{writerChoice:'gemini'});
transport.geminiInterrupted=true;
await action(interruptedId,'generate',{sign:'aries',approvedPlanHash:interruptedPlan.payload.plan.planHash});
await new Promise(resolve=>setTimeout(resolve,30));
const beforeInterruptedPoll=writerFixture.calls;
assert.equal((await action(interruptedId,'poll')).status,422);
assert.equal(latest(interruptedId).source_snapshot.horoscopeGeneration.lastError.diagnostic.errorCode,'gemini_connection_interrupted');
assert.equal(latest(interruptedId).sections.horoscopeEdition.passages[0].body,'');
await action(interruptedId,'poll');await action(interruptedId,'prepare');
assert.equal(writerFixture.calls,beforeInterruptedPoll,'An interrupted stream cannot replay on poll or reopen');
transport.geminiInterrupted=false;
const streamError=await readGeminiStream(new Response('data: {"event_type":"error","error":{"code":"server_error"}}\n\nevent: done\ndata: [DONE]\n\n'),'gemini_local');
assert.equal(streamError.status,'failed');assert.equal(streamError.error.code,'server_error');
await assert.rejects(readGeminiStream(new Response('data: {"event_type":"interaction.created","interaction":{"id":"v1_first"}}\n\ndata: {"event_type":"interaction.completed","interaction":{"id":"v1_other","status":"completed"}}\n\n'),'gemini_local'),/gemini_stream_identity_changed/);
console.log('Gemini stream completion, bounded failure, legacy hold, batch continuation and no automatic replay passed.');

// Only a result checkpoint may refresh the active batch automatically.
const {horoscopeStreamCheckpointOnly}=await import('../src/astro-writing/horoscopeStreamCheckpoint.mjs');
const beforeCheckpoint={id:'edition',updated_at:'first',status:'DRAFT',body:'Saved owner text',source_snapshot:{profile:'saved',horoscopeGeneration:{active:{id:'operation',requestHash:'hash',state:'running',config:horoscopeWriterConfig('gemini'),responseId:'gemini_saved'}}}};
const afterCheckpoint=structuredClone(beforeCheckpoint) as any;
afterCheckpoint.updated_at='second';afterCheckpoint.source_snapshot.horoscopeGeneration.active.providerResult={id:'gemini_saved',status:'completed'};
assert(horoscopeStreamCheckpointOnly(beforeCheckpoint,afterCheckpoint));
for(const mutate of [(row:any)=>row.body='Newer owner edit',(row:any)=>row.source_snapshot.profile='new instructions',(row:any)=>row.source_snapshot.horoscopeGeneration.active.id='replacement',(row:any)=>row.status='LIVE',(row:any)=>row.source_snapshot.horoscopeGeneration.active.providerResult.id='different']){
 const changed=structuredClone(afterCheckpoint);mutate(changed);
 assert.equal(horoscopeStreamCheckpointOnly(beforeCheckpoint,changed),false);
}

// Lost browser acknowledgements may reconcile only this approved Weekly work.
// Exercise the real writer/checkpoint/review/save transitions, not invented rows.
const batchId=await create('weekly','2026-11-02');
const batchPlan=await action(batchId,'prepare',{writerChoice:'gemini'});
// Real storage projects detail columns. Generation uses select=*; recovery must
// return the same complete document, including nullable storage-only fields.
const detail=await store.invoke('GET',undefined,`/api/admin/generated-content?id=${batchId}`);
assert(!Object.hasOwn(detail.payload.rows[0],'studio_facts'),'The fixture must honor the detail projection');
const fullRead=async()=>{
  const result=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeEditions=true&id=${batchId}`);
  assert.equal(result.status,200);assert.equal(result.payload.rows.length,1);
  assert.deepEqual(result.payload.rows[0],latest(batchId));return result.payload.rows[0];
};
await fullRead();
const outsideEdition=await store.invoke('GET',undefined,'/api/admin/generated-content?horoscopeEditions=true&id=live-sun-virgo');
assert.deepEqual(outsideEdition.payload.rows,[],'Scoped recovery cannot return another content family');
const planHash=batchPlan.payload.plan.planHash,sign='aries';
let previous=latest(batchId);
assert.equal(horoscopeWeeklyBatchRecovery(previous,previous,{action:'generate',sign,planHash}),false,'An unchanged row cannot authorize replaying a lost paid POST');
await action(batchId,'generate',{sign,approvedPlanHash:planHash});
let current=await fullRead();
const projectedRecovery=await store.invoke('GET',undefined,`/api/admin/generated-content?id=${batchId}`);
assert.equal(horoscopeWeeklyBatchRecovery(previous,projectedRecovery.payload.rows[0],{action:'generate',sign,planHash}),false,'The former detail route reproduces the false outside-edit stop');
assert(horoscopeWeeklyBatchRecovery(previous,current,{action:'generate',sign,planHash}));
for(let i=0;current.source_snapshot.horoscopeGeneration.active&&i<10;i++){
  if(current.source_snapshot.horoscopeGeneration.active.phase==='review'){
    const before=JSON.stringify(latest(batchId)),calls=writerFixture.calls,reviews=writerFixture.reviewCalls;
    const reopened=await action(batchId,'prepare');
    assert.equal(reopened.status,200);assert.equal(reopened.payload.plan.planHash,planHash);
    assert.equal(JSON.stringify(latest(batchId)),before,'Preparing the remaining plan preserves the saved request and candidate');
    assert.equal(writerFixture.calls,calls);assert.equal(writerFixture.reviewCalls,reviews,'Opening a saved review cannot start its paid check');
  }
  const request=current.source_snapshot.horoscopeGeneration.active.state==='ready'?'continue':'poll';
  previous=current;
  if(request==='continue'){
    const originalFetch=globalThis.fetch,reviews=writerFixture.reviewCalls;
    const exactRead=(input:any,options:any)=>new URL(String(input)).searchParams.get('id')===`eq.${batchId}`&&(!options?.method||options.method==='GET');
    try{
      globalThis.fetch=async(input:any,options:any)=>{if(exactRead(input,options))throw new DOMException('Synthetic storage timeout','AbortError');return originalFetch(input,options);};
      assert.equal((await action(batchId,request)).status,504);
    }finally{globalThis.fetch=originalFetch;}
    assert.deepEqual(latest(batchId),current);assert.equal(writerFixture.reviewCalls,reviews,'A failed initial read cannot dispatch a review');
    assert(horoscopeWeeklyBatchRecovery(current,current,{action:request,sign,planHash}),'An unchanged, unreserved review can retry its conditional reservation');
    for(const mutate of [
      (row:any)=>row.source_snapshot.horoscopeGeneration.active.phase='draft',
      (row:any)=>row.source_snapshot.horoscopeGeneration.active.responseId='resp_uncertain',
      (row:any)=>row.source_snapshot.horoscopeGeneration.active.requestHash='already-reserved',
      (row:any)=>row.sections.horoscopeEdition.passages[1].body='New owner text',
    ]){const changed=structuredClone(current);mutate(changed);assert.equal(horoscopeWeeklyBatchRecovery(current,changed,{action:request,sign,planHash}),false);}
    // Both handlers read the same ready version before either can reserve it.
    // Only the compare-and-swap winner may dispatch the paid reviewer.
    let readers=0,lostReservation=false,release!:()=>void;const barrier=new Promise<void>(resolve=>release=resolve);
    try{
      globalThis.fetch=async(input:any,options:any)=>{
        const response=await originalFetch(input,options);
        if(exactRead(input,options)){if(++readers===2)release();await barrier;}
        if(options?.method==='PATCH'&&!lostReservation&&JSON.parse(options.body).source_snapshot?.horoscopeGeneration?.active?.state==='starting'
          &&(await response.clone().json()).length===1){
          lostReservation=true;
          Object.defineProperty(response,'json',{value:async()=>{throw new DOMException('Synthetic winning reservation lost acknowledgement','AbortError');}});
        }
        return response;
      };
      const results=await Promise.all([action(batchId,request),action(batchId,request)]);
      assert.deepEqual(results.map(result=>result.status).sort(),[202,409]);
      assert(lostReservation,'Exercise a lost database acknowledgement while two handlers race');
    }finally{globalThis.fetch=originalFetch;}
    assert.equal(writerFixture.reviewCalls,reviews+1,'Concurrent reservation attempts dispatch exactly one paid review');
  }else{await new Promise(resolve=>setTimeout(resolve,30));await action(batchId,request);}
  current=await fullRead();
  assert(horoscopeWeeklyBatchRecovery(previous,current,{action:request,sign,planHash}),`Reconcile saved ${request} transition ${i}: ${previous.source_snapshot.horoscopeGeneration.active?.phase??'writer'} -> ${current.source_snapshot.horoscopeGeneration.active?.phase??'saved'}`);
  for(const mutate of [
    (row:any)=>row.source_snapshot.horoscopeWriterChoice='claude',
    (row:any)=>row.source_snapshot.horoscopeOutlines={aries:'New owner plan'},
    (row:any)=>row.sections.horoscopeEdition.passages[1].body='New owner edit',
    (row:any)=>row.facts.newer='changed facts',
    (row:any)=>row.source_snapshot.horoscopeGeneration.rejections=[{id:'new rejection'}],
    (row:any)=>row.status='LIVE',
  ]){const changed=structuredClone(current);mutate(changed);assert.equal(horoscopeWeeklyBatchRecovery(previous,changed,{action:request,sign,planHash}),false);}
}
assert(current.sections.horoscopeEdition.passages[0].body);
const changed=structuredClone(current);changed.sections.horoscopeEdition.passages[0].body='Owner changed the just-completed candidate';
assert.equal(horoscopeWeeklyBatchRecovery(previous,changed,{action:'poll',sign,planHash}),false);
console.log('Approved Weekly recovery preserves context and never replays an unconfirmed paid request.');

// The storage PATCH itself can commit and lose its response body. A browser-level
// lost response does not exercise this boundary. Run the real handler with both
// sides of that failure, then retrieve and save the very same review.
const confirmationId=await create('weekly','2027-02-01');
const confirmationPlan=await action(confirmationId,'prepare',{writerChoice:'gemini'});
await action(confirmationId,'generate',{sign:'aries',approvedPlanHash:confirmationPlan.payload.plan.planHash});
for(let i=0;latest(confirmationId).source_snapshot.horoscopeGeneration.active.phase!=='review'&&i<10;i++)await step(confirmationId);
const readyReview=latest(confirmationId);
assert.equal(readyReview.source_snapshot.horoscopeGeneration.active.state,'ready');
readyReview.source_snapshot.syntheticHistory='complete retained evidence '.repeat(250000);
for(const scenario of ['reservation-body','reservation-network','uncommitted','late-commit','response-id','newer-edit','unavailable-readback','persistent-storage-failure']){
  store.rows.set(confirmationId,structuredClone(readyReview));
  const baseFetch=globalThis.fetch,reviews=writerFixture.reviewCalls,writers=writerFixture.calls;
  let injected=0,patches=0,readbacks=0,delayedWrite:any=null;const writeIds:string[]=[];
  try{
    globalThis.fetch=async(input:any,options:any={})=>{
      const url=new URL(String(input)),target=url.searchParams.get('id')===`eq.${confirmationId}`;
      if(target&&options.method==='PATCH'){
        const patch=JSON.parse(options.body),active=patch.source_snapshot?.horoscopeGeneration?.active;
        patches++;writeIds.push(patch.source_snapshot.horoscopeStorageWriteId);
        assert.equal(url.searchParams.get('select'),'id,updated_at','Checkpoints return only a compact acknowledgement');
        if(delayedWrite){await baseFetch(...delayedWrite);delayedWrite=null;}
        const fail=active?.phase==='review'&&active.state===(scenario==='response-id'?'running':'starting')
          &&(!injected||scenario==='persistent-storage-failure');
        if(fail){
          injected++;
          if(scenario==='late-commit'){delayedWrite=[input,options];throw new DOMException('Synthetic save still committing','AbortError');}
          if(scenario==='uncommitted'||scenario==='persistent-storage-failure')throw new DOMException('Synthetic uncommitted storage timeout','AbortError');
          const response=await baseFetch(input,options);
          assert((await response.clone().text()).length<200,'Large evidence must not be echoed in the save acknowledgement');
          if(scenario==='newer-edit'){
            const edited=latest(confirmationId);edited.body='Newer owner edit must survive.';
            edited.updated_at=new Date(Date.parse(edited.updated_at)+1).toISOString();store.rows.set(confirmationId,edited);
          }
          if(scenario==='reservation-network')throw new DOMException('Synthetic committed save lost before headers','AbortError');
          Object.defineProperty(response,'json',{value:async()=>{throw new DOMException('Synthetic committed save lost during body read','AbortError');}});
          return response;
        }
      }
      if(target&&injected&&(!options.method||options.method==='GET')){
        readbacks++;
        if(scenario==='unavailable-readback')throw new DOMException('Synthetic confirmation read timeout','AbortError');
      }
      return baseFetch(input,options);
    };
    const result=await action(confirmationId,'continue');
    assert.equal(result.status,scenario==='newer-edit'?409:scenario==='unavailable-readback'||scenario==='persistent-storage-failure'?504:202,scenario);
    assert.equal(writerFixture.calls,writers,'Storage confirmation must never regenerate the writer');
    const blocked=['newer-edit','unavailable-readback','persistent-storage-failure'].includes(scenario);
    assert.equal(writerFixture.reviewCalls,reviews+(blocked?0:1),scenario+': dispatch only after proving the reservation');
    assert(injected&&readbacks,scenario+': hit the actual storage boundary');
    if(scenario==='uncommitted'||scenario==='late-commit'||scenario==='persistent-storage-failure'){
      assert.equal(writeIds[0],writeIds[1],'A storage retry uses the exact original write identity');
      if(scenario==='persistent-storage-failure')assert.equal(patches,2,'Storage retry is bounded');
    }
    if(scenario==='newer-edit')assert.equal(latest(confirmationId).body,'Newer owner edit must survive.');
  }finally{globalThis.fetch=baseFetch;}
  if(['newer-edit','unavailable-readback','persistent-storage-failure'].includes(scenario))continue;
  const reviewId=latest(confirmationId).source_snapshot.horoscopeGeneration.active.responseId;
  assert(reviewId);
  for(let i=0;latest(confirmationId).source_snapshot.horoscopeGeneration.active&&i<10;i++)await step(confirmationId);
  const saved=latest(confirmationId);
  assert.equal(saved.source_snapshot.horoscopeGeneration.readings.aries.rhetoricalReview.responseId,reviewId);
  assert.deepEqual(saved.sections.horoscopeEdition.passages[0],{sign:'aries',...readyReview.source_snapshot.horoscopeGeneration.active.candidate});
  assert.equal(saved.source_snapshot.syntheticHistory,readyReview.source_snapshot.syntheticHistory);
  assert.equal(writerFixture.reviewCalls,reviews+1,'Recovery retrieves the same paid review');
}
console.log('Committed and uncommitted storage timeouts preserve complete evidence, newer edits and single review dispatch.');
