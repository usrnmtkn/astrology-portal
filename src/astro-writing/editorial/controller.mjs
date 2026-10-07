import {isHoroscopeResponseId} from '../horoscopeWriterModels.mjs';
import {digest,assertManifest} from './evidenceRegistry.mjs';
import {validateEvaluation,evaluationDecision} from './evaluation.mjs';

export const EDITORIAL_VERSION='editorial-controller/v1';
export const EDITORIAL_LIMITS=Object.freeze({prose:3,plan:3,mechanism:3,evidence:3,calls:30,invalidEvaluationRetries:1});
export function appendArtifact(run,kind,value,metadata={}) {
  const previous=run.artifacts.at(-1)?.hash??null;
  const record={id:`${run.id}:${run.artifacts.length+1}`,kind,value:structuredClone(value),metadata:structuredClone(metadata),previous};
  const artifact={...record,hash:digest(record)};run.artifacts.push(artifact);return artifact;
}
export function assertJournal(run,previous=null) {
  let hash=null;
  for(const artifact of run.artifacts){const {hash:actual,...body}=artifact;if(body.previous!==hash||digest(body)!==actual)throw new Error('editorial_journal_changed');hash=actual;}
  if(previous&&(previous.id!==run.id||previous.artifacts.some((a,i)=>run.artifacts[i]?.hash!==a.hash)))throw new Error('editorial_history_is_immutable');
  if(run.inputHash!==digest(run.input))throw new Error('editorial_input_changed');
  if(previous){
    for(const key of ['schema','surface','target','inputHash','models','authorization','limits'])if(digest(previous[key])!==digest(run[key]))throw new Error('editorial_configuration_is_immutable');
    for(const key of Object.keys(previous.counts))if(!Number.isInteger(run.counts[key])||run.counts[key]<previous.counts[key])throw new Error('editorial_budget_cannot_reset');
  }
  if(run.surface!=='seasonal')throw new Error('editorial_surface_not_enabled');
  return run;
}
export const latest=(run,kind)=>run.artifacts.findLast(a=>a.kind===kind)?.value;
export function newEditorialRun({id,target,input,models,authorization,limits={}}) {
  if(!authorization?.reference)throw new Error('editorial_authorization_required');
  if(!models.prose||!models.voice||!models.meaning||!models.plan_review||[models.voice,models.meaning,models.plan_review].some(c=>c.model===models.prose.model))throw new Error('writer_cannot_evaluate_itself');
  const cap={...EDITORIAL_LIMITS,...limits};
  for(const key of Object.keys(cap))if(!Number.isInteger(cap[key])||cap[key]<0||cap[key]>EDITORIAL_LIMITS[key])throw new Error('editorial_budget_may_only_be_lowered');
  return {schema:EDITORIAL_VERSION,id,surface:'seasonal',target,input:structuredClone(input),inputHash:digest(input),
    models:structuredClone(models),authorization:structuredClone(authorization),limits:cap,counts:{prose:0,plan:0,mechanism:0,evidence:0,calls:0},
    stage:'evidence',status:'ready',artifacts:[],pending:null,revision:0,acceptedCandidate:null,ownerApproved:false,promotionAuthorized:false};
}
const stop=(run,status,reason)=>{run.status=status;run.pending=null;appendArtifact(run,'terminal',{status,reason});return run;};
function route(run,decision) {
  appendArtifact(run,'routing',decision);
  if(decision.action==='evaluation_unavailable')return stop(run,'quality_exhausted','evaluation_indeterminate');
  const stage=decision.stage;
  if((run.counts[stage]??0)>=run.limits[stage])return stop(run,'quality_exhausted',`${stage}_budget_exhausted`);
  run.stage=stage;run.status='ready';return run;
}
export async function prepareEditorialStep(run,adapter) {
  assertJournal(run);
  if(run.status!=='ready')throw new Error('editorial_step_not_ready');
  if(run.inputHash!==digest(run.input))throw new Error('editorial_input_changed');
  if(run.stage==='evidence'){
    if(run.counts.evidence>=run.limits.evidence)return stop(run,'quality_exhausted','evidence_budget_exhausted');
    run.counts.evidence++;
    try{
      const manifest=await adapter.retrieve(run,latest(run,'routing'));
      assertManifest(manifest);appendArtifact(run,'evidence',manifest);run.stage='mechanism';
    }catch(error){appendArtifact(run,'retrieval_error',{message:error.message});return stop(run,'quality_exhausted','relevant_evidence_unavailable');}
  }
  const stage=run.stage;
  if(run.counts.calls>=run.limits.calls||(['mechanism','plan','prose'].includes(stage)&&run.counts[stage]>=run.limits[stage]))return stop(run,'quality_exhausted',`${stage}_budget_exhausted`);
  return {request:adapter.request(run),stage};
}
export function reserveEditorialCall(run,request) {
  if(run.status!=='ready'||run.pending)throw new Error('editorial_call_already_reserved');
  if(run.counts.calls>=run.limits.calls)throw new Error('editorial_call_budget_exhausted');
  if(['mechanism','plan','prose'].includes(run.stage))run.counts[run.stage]++;
  run.counts.calls++;
  run.pending={ordinal:run.counts.calls,stage:run.stage,request:structuredClone(request),requestHash:digest(request),responseId:null,startedAt:new Date().toISOString()};
  appendArtifact(run,'call_reserved',run.pending);run.status='starting';
}
export function confirmEditorialCall(run,responseId) {
  if(!run.pending||!isHoroscopeResponseId(run.pending.request?.config,responseId))throw new Error('invalid_editorial_response_id');
  if(run.pending.responseId&&run.pending.responseId!==responseId)throw new Error('editorial_response_id_changed');
  run.pending.responseId=responseId;run.status='running';
}
export async function completeEditorialCall(run,payload,adapter) {
  assertJournal(run);
  if(!run.pending||!['running','starting'].includes(run.status))throw new Error('editorial_response_without_reservation');
  const pending=structuredClone(run.pending),stage=pending.stage;
  if(payload.id&&payload.id!==pending.responseId)throw new Error('editorial_response_mismatch');
  appendArtifact(run,'model_response',{...pending,payload,usage:payload.usage??null,responseHash:digest(payload)});
  run.pending=null;run.status='ready';
  if(payload.status!=='completed')return stop(run,'provider_failed',payload.incomplete_details?.reason??payload.error?.code??payload.status);
  let value;
  try{
    value=JSON.parse((payload.output??[]).filter(x=>x.type==='message').flatMap(x=>x.content??[]).filter(x=>x.type==='output_text').map(x=>x.text).join(''));
    if(stage==='mechanism'||stage==='plan'){
      adapter.validate(stage,value,run);appendArtifact(run,stage,value);run.stage=stage==='mechanism'?'plan':'plan_review';return run;
    }
    if(stage==='prose'){
      // Preserve even a malformed or factually wrong candidate before validation.
      const artifact=appendArtifact(run,'candidate',value,{candidateHash:digest(value),number:run.counts.prose,manifestHash:latest(run,'evidence').hash,planHash:digest(latest(run,'plan'))});
      const deterministic=adapter.validateDraft(value,run);
      appendArtifact(run,'deterministic',deterministic,{candidateHash:digest(value)});
      if(!deterministic.passed)return stop(run,'fact_failed','deterministic_validation_failed');
      run.candidateArtifactId=artifact.id;run.stage='voice';return run;
    }
    const role=stage==='plan_review'?'plan':stage;
    const candidate=role==='plan'?{mechanism:latest(run,'mechanism'),plan:latest(run,'plan')}:latest(run,'candidate');
    const manifest=latest(run,'evidence');
    validateEvaluation(value,{role,candidate,manifest});
    appendArtifact(run,`${stage}_evaluation`,value,{candidateHash:digest(candidate),model:pending.request.config.model});
    if(stage==='voice'){run.stage='meaning';return run;}
    const evaluations=stage==='plan_review'?[value]:[latest(run,'voice_evaluation'),value];
    if(evaluations.some(e=>e.candidateHash!==digest(candidate)||e.manifestHash!==manifest.hash))throw new Error('stale_evaluation');
    const decision=evaluationDecision(evaluations);
    if(decision.action!=='pass')return route(run,{...decision,candidateHash:digest(candidate),findings:evaluations.flatMap(e=>e.findings)});
    appendArtifact(run,'routing',{action:stage==='plan_review'?'plan_passed':'private_candidate_accepted',candidateHash:digest(candidate)});
    if(stage==='plan_review'){run.stage='prose';return run;}
    run.status='accepted';run.acceptedCandidate={artifactId:run.candidateArtifactId,hash:digest(candidate),ownerApproved:false,promotionAuthorized:false};return run;
  }catch(error){
    appendArtifact(run,'invalid_result',{stage,message:error.message,value:value??null});
    if(['voice','meaning','plan_review'].includes(stage)){
      const count=run.artifacts.filter(a=>a.kind==='invalid_result'&&a.value.stage===stage&&a.metadata.retryKey===digest(pending.request)).length;
      // Bind retry accounting to the exact request. Invalid evaluation never
      // triggers another prose call or becomes a quality finding.
      const invalid=run.artifacts.at(-1);run.artifacts.pop();
      appendArtifact(run,'invalid_result',invalid.value,{retryKey:digest(pending.request)});
      if(count<run.limits.invalidEvaluationRetries){run.stage=stage;return run;}
      return stop(run,'quality_exhausted','evaluation_invalid');
    }
    if(['mechanism','plan'].includes(stage))return route(run,{action:'regenerate',stage,reason:'invalid_planning_result'});
    return stop(run,'fact_failed','invalid_prose_schema');
  }
}

/** Both SQL and file stores use this CAS/append-only interface. */
export function assertRunWrite(previous,next,expectedRevision) {
  if(previous.revision!==expectedRevision||next.revision!==expectedRevision+1)throw new Error('editorial_storage_conflict');
  return assertJournal(next,previous);
}
