import assert from 'node:assert/strict';
import {store,editorialFixtureRows,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {installAlternativeHoroscopeProviders} from '../tests/helpers/horoscope-provider-fixture.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {horoscopeWriterConfig} from '../src/astro-writing/horoscopeWriterModels.mjs';
import {buildHoroscopeProviderRequest,readClaudeStream,normalizeClaudeResult,normalizeGeminiResult} from '../api/_lib/horoscope-provider-codecs';
import responses from '../src/astro-writing/openAIResponses.cjs';
import {claudeRequestId,saveClaudeResult,storedHoroscopeResponse} from '../api/_lib/horoscope-provider';

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
let result=await action(id,'generate',{sign:'aries',approvedPlanHash:unavailable.payload.plan.planHash});assert.equal(result.status,422);
transport.geminiError=false;
result=await action(id,'generate',{sign:'taurus',approvedPlanHash:unavailable.payload.plan.planHash});assert.equal(result.status,202);
let row=latest(id);row.source_snapshot.horoscopeGeneration.active.startedAt='2026-01-01T00:00:00Z';store.rows.set(id,row);
result=await action(id,'release',{acknowledgeUnknownOutcome:true});assert.equal(result.status,200,JSON.stringify(result.payload));
assert.equal(latest(id).source_snapshot.horoscopeGeneration.active,null);

const claudePlan=await action(id,'prepare',{writerChoice:'claude'});transport.claudeError=true;
await action(id,'generate',{sign:'gemini',approvedPlanHash:claudePlan.payload.plan.planHash});
await new Promise(resolve=>setTimeout(resolve,30));
result=await action(id,'poll');assert.equal(result.status,422);
assert.equal(latest(id).source_snapshot.horoscopeGeneration.lastError.diagnostic.errorCode,'claude_connection_interrupted');
transport.claudeError=false;
const failedOperation=latest(id).source_snapshot.horoscopeGeneration.lastError.operation;
const resultBefore=structuredClone(latest(id));
await saveClaudeResult({editionId:id,operationId:failedOperation.id,requestHash:failedOperation.requestHash},{id:failedOperation.responseId,status:'completed',output:[]});
assert.deepEqual(latest(id),resultBefore,'A late response cannot resurrect an ended operation');

const responseId=claudeRequestId('synthetic-op','synthetic-hash');
const stale={config:horoscopeWriterConfig('claude'),responseId,startedAt:'2026-01-01T00:00:00Z'};
const staleResult=await (await storedHoroscopeResponse({operation:stale})).json();assert.equal(staleResult.error.code,'claude_checkpoint_unavailable');
assert.equal(normalizeClaudeResult({stop_reason:'max_tokens',content:[]},responseId).status,'incomplete');
assert.equal(normalizeClaudeResult({stop_reason:'end_turn',stop_details:{type:'refusal'},content:[]},responseId).output[0].content[0].type,'refusal');
await assert.rejects(readClaudeStream(new Response('event: message_start\ndata: {"type":"message_start","message":{"content":[]}}\n\n'),responseId),/interrupted_claude_stream/);
assert.equal(normalizeGeminiResult({status:'completed',steps:[{type:'thought',summary:[{type:'text',text:'secret'}]},{type:'model_output',content:[{type:'text',text:'reader'}]}]}).output[0].content[0].text,'reader');
console.log('Horoscope model choices: native transports, four periods, saved selection, pinned requests, review isolation, failure and no-replay checks passed.');
