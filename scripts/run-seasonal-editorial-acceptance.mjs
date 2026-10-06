#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorialFileStore} from '../src/astro-writing/editorial/fileStore.mjs';
import {newEditorialRun,prepareEditorialStep,reserveEditorialCall,confirmEditorialCall,completeEditorialCall,appendArtifact,latest} from '../src/astro-writing/editorial/controller.mjs';
import {evidenceManifest,digest,assertManifest} from '../src/astro-writing/editorial/evidenceRegistry.mjs';
import {evaluationSchema,evaluationInstructions,validateEvaluation,evaluationDecision} from '../src/astro-writing/editorial/evaluation.mjs';
import {seasonalEditorialAdapter,seasonalEditorialModels} from '../src/astro-writing/seasonalEditorialAdapter.mjs';
import {loadSeasonalHoroscopeEvidence} from '../src/astro-writing/seasonalHoroscopeEvidence.mjs';
import responses from '../src/astro-writing/openAIResponses.cjs';
import provider from '../src/astro-writing/offlineProviderConfig.cjs';
import keys from '../src/astro-writing/localProviderKeys.cjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const arg=name=>process.argv[process.argv.indexOf(name)+1];
const cases={'libra-taurus':{sign:'taurus',season:'libra',rejectedId:'b14ea48e-5e41-40c3-92b7-20eeb2459de7'},'scorpio-cancer':{sign:'cancer',season:'scorpio',rejectedId:'5e0ae729-deea-44d0-986d-3b59421678ce'}};
const key=arg('--case'),scope=cases[key],directory=arg('--directory');
if(!scope||!directory||!process.argv.includes('--authorize-paid'))throw new Error('Choose one of the two authorized Seasonal cases, private directory and --authorize-paid.');
const authorizationPath=arg('--authorization');
if(!authorizationPath||!fs.readFileSync(authorizationPath,'utf8').includes('These are authorized paid quality tests.'))throw new Error('Exact owner batch authorization is required.');
const apiKey=keys.readLocalProviderKeys(root).OPENAI_API_KEY;if(!apiKey)throw new Error('Connected OpenAI credential unavailable; no call made.');
const preparation=JSON.parse(fs.readFileSync(path.join(directory,`preparation-${key}.json`),'utf8'));
if(preparation.status!=='prepared-not-dispatched')throw new Error('Canonical Seasonal preparation required.');
const template=preparation.request,facts=template.seasonalPreparation.engineFacts;
if(facts.risingSign!==scope.sign||facts.window.period!=='seasonal'||!facts.window.startsAt.startsWith('2026-')||facts.seasonalMeaning?.seasonSign!==scope.season&&facts.anchor?.sign!==scope.season)throw new Error('Wrong acceptance target.');
const transferPath=arg('--transfer-authorization');
if(!transferPath)throw new Error('Explicit scoped OpenAI transfer authorization is required.');
const transfer=JSON.parse(fs.readFileSync(transferPath,'utf8'));
const authorizedManifest=JSON.parse(fs.readFileSync(path.join(directory,`preflight-${key}.json`),'utf8')).evidenceManifest;
assertManifest(authorizedManifest);
if(transfer.destination!=='OpenAI Responses API'||transfer.manifestHashes?.[key]!==authorizedManifest.hash)throw new Error('The manifest is outside the exact transfer authorization.');
const rejections=JSON.parse(fs.readFileSync(path.join(directory,'live-rejections.json'),'utf8'));
const units=loadSeasonalHoroscopeEvidence(p=>fs.readFileSync(path.join(root,p),'utf8'));
const controlGold=units.find(p=>p.id===`owner-seasonal:virgo-season-2025:${scope.sign}`);
const id=`seasonal-${key}`,store=editorialFileStore(path.join(directory,'runs'));
let run,previous;
try{run=await store.read(id);}catch(error){if(error.code!=='ENOENT')throw error;
  run=newEditorialRun({id,target:{sign:scope.sign,season:scope.season,year:2026,window:facts.window},
    input:{template,brief:facts,rejections,seasonalRejectionTargetKeys:rejections.find(r=>r.id===scope.rejectedId).target_keys,validationCorrections:template.seasonalPreparation.context.corrections,withheldSourceGroups:[controlGold.sourcePath]},
    models:seasonalEditorialModels(),authorization:{reference:`file:${authorizationPath}`,sha256:digest(fs.readFileSync(authorizationPath,'utf8')),scope:'Exactly two private Seasonal acceptance cases and four hidden-label controls; selected manifests only; no production writes or publication.',transfer:{reference:`file:${transferPath}`,sha256:digest(fs.readFileSync(transferPath,'utf8')),manifestHash:authorizedManifest.hash}}});
  await store.create(run);
}
previous=structuredClone(run);
const lock=path.join(directory,`${id}.execution-lock`);const lockFd=fs.openSync(lock,'wx',0o600);
const save=async()=>{await store.save(previous,run);previous=structuredClone(run);};
const adapter=seasonalEditorialAdapter(run.input);
const retrieve=adapter.retrieve;
const allowed=new Map(authorizedManifest.entries.map(e=>[e.id,e]));
adapter.retrieve=async(state,diagnostic)=>{
  const manifest=await retrieve(state,diagnostic);
  if(!latest(state,'evidence')&&manifest.hash!==authorizedManifest.hash)throw new Error('Prepared evidence changed since authorization.');
  const entries=manifest.entries.filter(e=>allowed.has(e.id));
  for(const e of entries)if(e.textHash!==allowed.get(e.id).textHash)throw new Error('Authorized evidence text changed.');
  if(entries.length===manifest.entries.length)return manifest;
  return evidenceManifest({...manifest,entries,excluded:[...manifest.excluded,...manifest.entries.filter(e=>!allowed.has(e.id)).map(e=>({id:e.id,reason:'outside_authorized_manifest'}))]});
};
// This is an outbound scope guard, not a change to the writer or judge prompts.
const privateUnits=[];
function inventory(value){
  if(!value||typeof value!=='object')return;
  if(value.text&&(value.ownerAuthored===true||value.authorityClass==='owner_authored_final'))privateUnits.push(value.text);
  for(const item of Object.values(value))inventory(item);
}
inventory(template.seasonalPreparation.context);
privateUnits.push(...rejections.map(r=>r.rejected_text),controlGold.text);
function checkTransfer(request){
  const authorized=authorizedManifest.entries.map(e=>e.text);
  if(request.stage==='historical_voice_control')authorized.push(controlGold.text,rejections.find(r=>r.id===scope.rejectedId).rejected_text);
  const outgoing=request.instructions+'\n'+request.input;
  for(const text of privateUnits){
    if(!text||authorized.some(p=>p.includes(text)))continue;
    if(outgoing.includes(text)||outgoing.includes(JSON.stringify(text).slice(1,-1)))throw new Error('Outgoing request contains owner text outside the authorized manifest.');
  }
  if(request.role!=='WRITER'){
    const packet=JSON.parse(request.input);
    for(const entry of packet.evidenceManifest.entries)if(!allowed.has(entry.id)||allowed.get(entry.id).textHash!==entry.textHash)throw new Error('Outgoing evidence is outside authorization.');
  }
}

const sleep=()=>new Promise(resolve=>setTimeout(resolve,3000));
const dispatch=async request=>{checkTransfer(request);return responses.startStoredWritingResponse({apiKey,role:request.role,governedInstructions:request.instructions,surface:'horoscopes',family:'horoscope',
  request:{...provider.buildProviderRequest({config:request.config,role:request.role==='WRITER'?'writer':'judge',stage:request.stage,input:request.input,schema:request.schema}),service_tier:'default',background:true,store:true}});};
try{
  // Controls run first so their four authorized calls cannot be crowded out
  // by regeneration. They use separate requests and never enter writer feedback.
  if(!latest(run,'evidence')){await prepareEditorialStep(run,adapter);await save();}
  // Two small blinded historical controls within this acceptance case. The
  // complete approved source group was withheld from ALL generation retrieval.
  // The prior rejected candidate is removed from the evaluator's comparison pack.
  const sourceManifest=latest(run,'evidence');
  if(sourceManifest){
    const rejected=rejections.find(r=>r.id===scope.rejectedId);
    const controls=[{id:'a',expected:'pass',body:controlGold.text,source:controlGold.sourcePath},{id:'b',expected:'regenerate',body:rejected.rejected_text,source:`studio_writing_feedback/${rejected.id}`}].sort((a,b)=>digest(key+a.id).localeCompare(digest(key+b.id)));
    for(const control of controls){
      if(run.artifacts.some(a=>a.kind==='control_result'&&a.metadata.controlId===control.id))continue;
      const priorReservation=run.artifacts.find(a=>a.kind==='control_reserved'&&a.metadata.controlId===control.id);
      const priorResponse=run.artifacts.find(a=>a.kind==='control_dispatch_response'&&a.metadata.controlId===control.id);
      if(priorReservation&&!priorResponse?.value?.id)throw new Error('Control dispatch outcome unknown; refusing to replay.');
      if(!priorReservation&&run.counts.calls>=run.limits.calls)throw new Error('No remaining authorized call budget for historical controls.');
      const manifest=evidenceManifest({surface:'seasonal',target:`${key}:historical-control`,query:{register:'Seasonal reading'},entries:sourceManifest.entries.filter(e=>!e.source.locator.includes(scope.rejectedId)&&e.source.locator!==controlGold.sourcePath)});
      const candidate={body:control.body},role='SEASONAL_VOICE_REVIEWER';
      const request={stage:'historical_voice_control',role,config:run.models.voice,schema:evaluationSchema('voice',manifest),
        instructions:responses.governedInstructionsForRole(role,{taskInstructions:evaluationInstructions('voice'),surface:'horoscopes',family:'horoscope'}),
        input:JSON.stringify({audience:scope.sign,scope:'One historical Seasonal passage. Evaluate voice and reasoning movement; dates are historical, not claims about the current year.',candidate,candidateHash:digest(candidate),manifestHash:manifest.hash,evidenceManifest:manifest})};
      if(priorReservation&&priorReservation.value.requestHash!==digest(request))throw new Error('Saved control request changed; refusing to resume.');
      let result=priorResponse?.value;
      if(!priorReservation){
        run.counts.calls++;appendArtifact(run,'control_reserved',{request,requestHash:digest(request)},{controlId:control.id});await save();
        console.log(JSON.stringify({case:key,event:'historical_control',controlId:control.id,call:run.counts.calls}));
        const {response,payload}=await dispatch(request);appendArtifact(run,'control_dispatch_response',payload,{controlId:control.id});await save();
        if(!response.ok)throw new Error('Historical control provider call failed; preserved, not retried.');
        result=payload;
      }
      while(['queued','in_progress'].includes(result.status)){await sleep();const response=await responses.storedWritingResponse({apiKey,responseId:result.id});if(!response.ok)throw new Error('Control retrieval failed; response retained.');result=await response.json();}
      let evaluation=null,error=null,decision=null;
      try{evaluation=JSON.parse(result.output.filter(x=>x.type==='message').flatMap(x=>x.content??[]).filter(x=>x.type==='output_text').map(x=>x.text).join(''));validateEvaluation(evaluation,{role:'voice',candidate,manifest});decision=evaluationDecision([evaluation]);}catch(e){error=e.message;}
      appendArtifact(run,'control_result',{candidate,manifest,payload:result,request,expected:control.expected,source:control.source,evaluation,error,decision,correct:!error&&decision.action===control.expected},{controlId:control.id});await save();
    }
  }
  while(['ready','starting','running'].includes(run.status)){
    if(run.status==='starting')throw new Error('Dispatch outcome is unknown; refusing to replay a possibly billed call.');
    if(run.status==='ready'){
      const step=await prepareEditorialStep(run,adapter);
      if(!step.request){await save();break;}
      reserveEditorialCall(run,step.request);await save();
      console.log(JSON.stringify({case:key,stage:run.stage,event:'dispatch',call:run.counts.calls,model:step.request.config.model}));
      const {response,payload}=await dispatch(step.request);
      if(!response.ok){await completeEditorialCall(run,{...payload,status:'failed'},adapter);await save();break;}
      confirmEditorialCall(run,payload.id);await save();
      if(!['queued','in_progress'].includes(payload.status)){await completeEditorialCall(run,payload,adapter);await save();}
    }else{
      const response=await responses.storedWritingResponse({apiKey,responseId:run.pending.responseId});
      if(!response.ok)throw new Error('Provider retrieval unavailable; saved response ID retained.');
      const payload=await response.json();
      if(['queued','in_progress'].includes(payload.status)){await sleep();continue;}
      await completeEditorialCall(run,payload,adapter);await save();
      console.log(JSON.stringify({case:key,event:'stage_completed',next:run.stage,status:run.status,calls:run.counts.calls,routing:latest(run,'routing')?.action,labels:latest(run,'routing')?.labels}));
    }
  }
  const pricing=JSON.parse(fs.readFileSync(path.join(root,'config/seasonal-editorial-pricing-v1.json'),'utf8'));
  const billed=run.artifacts.filter(a=>a.kind==='model_response'||a.kind==='control_result').map(a=>{
    const result=a.value.payload,request=a.value.request,usage=result.usage??null,rate=pricing.models[request.config.model];
    const cached=usage?.input_tokens_details?.cached_tokens??0,write=usage?.input_tokens_details?.cache_write_tokens??0;
    const factor=(usage?.input_tokens??0)>272000?2:1,outputFactor=factor===2?1.5:1;
    const cost=usage?((usage.input_tokens-cached-write)*rate.input*factor+cached*rate.cachedInput*factor+write*rate.cacheWrite*factor+usage.output_tokens*rate.output*outputFactor)/1000000:null;
    return {stage:request.stage,model:request.config.model,responseId:result.id,status:result.status,serviceTier:result.service_tier,usage,calculatedCostUsd:cost};
  });
  const totals={schema:'seasonal-private-acceptance/v1',target:run.target,status:run.status,calls:run.counts.calls,proseCandidates:run.counts.prose,plans:run.counts.plan,
    acceptedCandidate:run.acceptedCandidate,billed,pricing,totalInputTokens:billed.reduce((s,r)=>s+(r.usage?.input_tokens??0),0),totalOutputTokens:billed.reduce((s,r)=>s+(r.usage?.output_tokens??0),0),
    calculatedCostUsd:billed.length===run.counts.calls&&billed.every(r=>r.calculatedCostUsd!==null)?billed.reduce((s,r)=>s+r.calculatedCostUsd,0):null,
    historicalControls:run.artifacts.filter(a=>a.kind==='control_result').map(a=>({id:a.metadata.controlId,expected:a.value.expected,actual:a.value.decision?.action,correct:a.value.correct,error:a.value.error})),
    fidelityConclusion:'Owner correction burden has not been measured. Evaluator PASS and controller completion do not establish writing improvement.',productionWrites:0,published:false};
  fs.writeFileSync(path.join(directory,`acceptance-${key}.json`),JSON.stringify(totals,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({case:key,status:run.status,calls:totals.calls,proseCandidates:totals.proseCandidates,calculatedCostUsd:totals.calculatedCostUsd,controls:totals.historicalControls}));
}finally{fs.closeSync(lockFd);fs.unlinkSync(lock);}
