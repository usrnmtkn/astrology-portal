import {randomUUID} from 'node:crypto';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import provider from '../../src/astro-writing/offlineProviderConfig.cjs';
import {WEEKLY_BATCH_EDITORIAL,WEEKLY_PLAN_SCHEMA,WEEKLY_BATCH_REVIEW_SCHEMA,WEEKLY_PLAN_INSTRUCTIONS,WEEKLY_BATCH_REVIEW_INSTRUCTIONS,
  weeklyEditorialHash,weeklyEditorialBinding,weeklyEditorialContent,weeklyEditorialComplete,weeklyEditorialInput,
  validateWeeklyEditorialResult,weeklyLexicalSignals} from '../../src/astro-writing/weeklyBatchEditorial.mjs';
import {buildHoroscopeProviderRequest} from './horoscope-provider-codecs.js';
import {startHoroscopeResponse,storedHoroscopeResponse} from './horoscope-provider.js';
import {AdminHttpError} from './admin-http.js';

/** One durable reservation per shared stage. Poll never sends a model request. */
export async function weeklyEditorialOperation({action,row:initial,persist,prepared,actor,approvedPlanHash,acknowledgeUnknownOutcome}:any){
  let row=initial,gate=row.source_snapshot?.horoscopeGeneration?.weeklyEditorial;
  let history=row.source_snapshot?.horoscopeGeneration?.weeklyEditorialHistory??[];
  if(row.sections?.horoscopeEdition?.window?.period!=='weekly')throw new AdminHttpError(400,'The batch editorial gate is Weekly only.');
  const save=async(next:any)=>{const {history:nextHistory,...state}=next;gate=state;history=nextHistory??history;row=await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,weeklyEditorial:gate,weeklyEditorialHistory:history}}});};
  const reply=(pending=false)=>({status:pending?202:200,payload:{ok:true,rows:[row],pending,editorial:true}});
  const finish=async(payload:any)=>{
    const operation=gate.pending;
    let result:any,status='unavailable',error:string|null=null;
    try{
      if(payload.id!==operation.responseId||payload.status!=='completed')throw Error('The shared check did not complete.');
      const content=(payload.output??[]).filter((item:any)=>item.type==='message').flatMap((item:any)=>item.content??[]);
      if(content.some((part:any)=>part.type==='refusal'))throw Error('The shared check was refused.');
      const text=content.filter((part:any)=>part.type==='output_text').map((part:any)=>part.text).join('');
      result=validateWeeklyEditorialResult(JSON.parse(text),{phase:operation.phase,input:operation.input});status=result.status;
      if(weeklyEditorialBinding(row)!==operation.bindingHash
        ||weeklyEditorialContent(row)!==operation.contentHash){status='stale';error='The saved readings or instructions changed during this check.';}
    }catch(reason){error=reason instanceof Error?reason.message:'The shared check could not be verified.';}
    const receipt={scopeHash:operation.scopeHash,bindingHash:operation.bindingHash,
      contentHash:operation.contentHash,status,...(result??{}),...(error?{status,error}:{}),
      requestHash:operation.requestHash,responseId:operation.responseId,config:operation.config,usage:payload.usage??null,
      completedAt:new Date().toISOString(),ownerApproved:false,promotionAuthorized:false};
    await save({...gate,pending:null,[operation.phase==='planning'?'plan':'review']:receipt,
      history:[...history,{operation,result:receipt}]});
    return reply();
  };
  if(action==='release-weekly'){
    if(!gate?.pending||acknowledgeUnknownOutcome!==true||Date.now()-Date.parse(gate.pending.startedAt)<310000)
      throw new AdminHttpError(409,'Wait for the saved batch check and acknowledge its unknown outcome before releasing it.');
    const operation=gate.pending;
    await save({...gate,pending:null,[operation.phase==='planning'?'plan':'review']:{status:'unavailable',error:'Interrupted request released with an unknown outcome. It will not be retried automatically.'},
      history:[...history,{operation,outcome:'unknown',releasedAt:new Date().toISOString(),releasedBy:actor}]});
    return reply();
  }
  if(action==='poll-weekly'){
    if(!gate?.pending)return reply();
    const operation=gate.pending;
    if(!operation.responseId){
      if(Date.now()-Date.parse(operation.startedAt)<310000)return reply(true);
      throw new AdminHttpError(409,'The batch check has an unknown outcome. Explicitly release it before approving another request.');
    }
    const response=await storedHoroscopeResponse({operation});
    if(!response.ok)throw new AdminHttpError(503,'The saved batch check is unavailable. Check progress to retrieve the same request.');
    const payload=await response.json();
    return ['queued','in_progress'].includes(payload.status)?reply(true):finish(payload);
  }
  if(gate?.pending)throw new AdminHttpError(409,'A shared batch check is already reserved. Check its saved progress.');
  if(!prepared||approvedPlanHash!==prepared.planHash)throw new AdminHttpError(409,'Review the current plan and its batch-check costs before continuing.');
  if(row.source_snapshot?.horoscopeGeneration?.active)throw new AdminHttpError(409,'Finish the running sign before starting a shared batch check.');
  const phase=action==='plan-weekly'?'planning':'batch-review';
  if(phase==='batch-review'&&!weeklyEditorialComplete(row))throw new AdminHttpError(409,'Save all twelve complete readings before reviewing the set.');
  if(!process.env.OPENAI_API_KEY)throw new AdminHttpError(503,'The shared Weekly planner and reviewer are not connected.');
  const input={...weeklyEditorialInput(prepared,row,phase),...(phase==='batch-review'?{lexicalSignals:weeklyLexicalSignals(row.sections.horoscopeEdition.passages)}:{})};
  const role=phase==='planning'?'MEANING_PLANNER':'RHETORICAL_REVIEWER';
  const authority=phase==='planning'?WEEKLY_PLAN_INSTRUCTIONS:WEEKLY_BATCH_REVIEW_INSTRUCTIONS;
  const instructions=responses.governedInstructionsForRole(role,{...(phase==='planning'?{taskInstructions:authority}:{governedInstructions:authority}),surface:'horoscopes',family:'horoscope'});
  const config=provider.normalizeProviderConfig({maxOutputTokens:10000,reasoningEffort:'medium'},phase==='planning'?'writer':'judge');
  const schema=phase==='planning'?WEEKLY_PLAN_SCHEMA:WEEKLY_BATCH_REVIEW_SCHEMA;
  const request=buildHoroscopeProviderRequest({config,role,input:JSON.stringify(input),schema,instructions});
  const operation={id:randomUUID(),workflow:WEEKLY_BATCH_EDITORIAL,phase,state:'starting',scopeHash:prepared.planHash,
    bindingHash:weeklyEditorialBinding(row),contentHash:weeklyEditorialContent(row),responseId:null,
    requestHash:weeklyEditorialHash({request,instructions}),config,input,request,instructions,startedAt:new Date().toISOString(),actor};
  await save({...gate,version:WEEKLY_BATCH_EDITORIAL,pending:operation});
  // A lost acknowledgement cannot repeat this dispatch: the saved starting
  // reservation remains held until retrieval or explicit aged release.
  try{
    const {response,payload}=await startHoroscopeResponse({config,role,request,instructions,
      context:{editionId:row.id,operationId:operation.id,requestHash:operation.requestHash}});
    if(!response.ok||typeof payload.id!=='string'||!/^resp_[A-Za-z0-9_-]+$/u.test(payload.id))
      throw new AdminHttpError(503,'The shared request outcome is unknown. Check saved progress before retrying.');
    await save({...gate,pending:{...operation,state:'running',responseId:payload.id}});
    return ['queued','in_progress'].includes(payload.status)?reply(true):finish(payload);
  }catch(error){
    // The durable reservation is kept even when the provider or its ID save
    // loses acknowledgement. No exception path dispatches a second request.
    throw error;
  }
}
