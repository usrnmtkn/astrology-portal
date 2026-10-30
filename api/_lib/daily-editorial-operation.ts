import {randomUUID} from 'node:crypto';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import provider from '../../src/astro-writing/offlineProviderConfig.cjs';
import {DAILY_BATCH_EDITORIAL,DAILY_BATCH_REVIEW_SCHEMA,DAILY_BATCH_REVIEW_INSTRUCTIONS,DAILY_BATCH_INPUT_LIMIT,
  dailyEditorialHash,dailyEditorialBinding,dailyEditorialContent,dailyEditorialInput,
  validateDailyEditorialResult} from '../../src/astro-writing/dailyBatchEditorial.mjs';
import {AdminHttpError} from './admin-http.js';
import {buildHoroscopeProviderRequest} from './horoscope-provider-codecs.js';
import {startHoroscopeResponse,storedHoroscopeResponse} from './horoscope-provider.js';
import {hydrateWritingFeedbackRequest} from './studio-explicit-writing-feedback.js';

/** One durable whole-set review. Poll retrieves the reserved response and
 * cannot dispatch, rewrite prose, or spend another review approval. */
export async function dailyEditorialOperation({action,row:initial,persist,prepared,actor,approvedPlanHash,acknowledgeUnknownOutcome}:any){
  let row=initial,gate=row.source_snapshot?.horoscopeGeneration?.dailyEditorial??{version:DAILY_BATCH_EDITORIAL};
  let history=row.source_snapshot?.horoscopeGeneration?.dailyEditorialHistory??[];
  if(row.sections?.horoscopeEdition?.window?.period!=='daily')throw new AdminHttpError(400,'This batch review is Daily only.');
  const save=async(next:any,nextHistory=history,batchUpdate:any={})=>{
    gate=next;history=nextHistory;
    row=await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot?.horoscopeGeneration,
      dailyEditorial:gate,dailyEditorialHistory:history,...batchUpdate}}});
  };
  const reply=(pending=false)=>({status:pending?202:200,payload:{ok:true,rows:[row],pending,editorial:true}});
  const finish=async(payload:any)=>{
    const operation=gate.pending;
    let result:any,status='unavailable',error:string|null=null;
    try{
      if(payload.id!==operation.responseId||payload.status!=='completed')throw Error('The Daily batch review did not complete.');
      const content=(payload.output??[]).filter((item:any)=>item.type==='message').flatMap((item:any)=>item.content??[]);
      if(content.some((part:any)=>part.type==='refusal'))throw Error('The Daily batch review was refused.');
      const text=content.filter((part:any)=>part.type==='output_text').map((part:any)=>part.text).join('');
      result=validateDailyEditorialResult(JSON.parse(text),operation.input);status=result.status;
      if(dailyEditorialBinding(row)!==operation.bindingHash||dailyEditorialContent(row)!==operation.contentHash){
        status='stale';error='The saved Daily readings, instructions or facts changed during this review.';
      }
    }catch(reason){error=reason instanceof Error?reason.message:'The Daily review result could not be verified.';}
    const receipt={scopeHash:operation.scopeHash,bindingHash:operation.bindingHash,contentHash:operation.contentHash,
      status,...(result??{}),...(error?{status,error}:{}),requestHash:operation.requestHash,responseId:operation.responseId,
      config:operation.config,usage:payload.usage??null,completedAt:new Date().toISOString(),ownerApproved:false,promotionAuthorized:false};
    // Keep the exact response privately, including unusable evidence, so a
    // diagnostic never requires another billed request or a fabricated pass.
    const batch=row.source_snapshot?.horoscopeGeneration?.batch;
    const resolved=result?.status==='passed'&&status==='passed'&&batch?.editorialVersion===DAILY_BATCH_EDITORIAL&&batch.status==='needs_attention'
      ?{batch:{...batch,status:'complete',error:null,finishedAt:new Date().toISOString()}}:{};
    await save({...gate,pending:null,review:receipt},[...history,{operation,result:receipt,providerResponse:payload}],resolved);
    return reply();
  };
  if(action==='release-daily'){
    if(!gate.pending||acknowledgeUnknownOutcome!==true||Date.now()-Date.parse(gate.pending.startedAt)<310000)
      throw new AdminHttpError(409,'Wait for the saved Daily review and acknowledge its unknown outcome before releasing it.');
    const operation=gate.pending;
    await save({...gate,pending:null,review:{status:'unavailable',error:'Interrupted Daily review released with an unknown outcome. It will not be retried automatically.'}},
      [...history,{operation,outcome:'unknown',releasedAt:new Date().toISOString(),releasedBy:actor}]);
    return reply();
  }
  if(action==='poll-daily'){
    if(!gate.pending)return reply();
    const operation=gate.pending;
    if(!operation.responseId){
      if(Date.now()-Date.parse(operation.startedAt)<310000)return reply(true);
      throw new AdminHttpError(409,'The Daily review has an unknown outcome. Explicitly release it before approving another request.');
    }
    const response=await storedHoroscopeResponse({operation});
    if(!response.ok)throw new AdminHttpError(503,'The saved Daily review is unavailable. Check progress to retrieve the same request.');
    const payload=await response.json();
    return ['queued','in_progress'].includes(payload.status)?reply(true):finish(payload);
  }
  if(gate.pending)throw new AdminHttpError(409,'A Daily batch review is already reserved. Check saved progress.');
  if(!prepared||approvedPlanHash!==prepared.planHash)throw new AdminHttpError(409,'Review the current Daily plan and its batch-review cost before continuing.');
  if(row.source_snapshot?.horoscopeGeneration?.active)throw new AdminHttpError(409,'Finish the running sign before reviewing all twelve.');
  if(!process.env.OPENAI_API_KEY)throw new AdminHttpError(503,'The Daily batch reviewer is not connected.');
  let input;
  try{input=dailyEditorialInput(prepared,row);}catch(error){
    throw new AdminHttpError(409,error instanceof Error?error.message:'The complete Daily review inputs are unavailable.');
  }
  const role='RHETORICAL_REVIEWER';
  const instructions=responses.governedInstructionsForRole(role,{governedInstructions:DAILY_BATCH_REVIEW_INSTRUCTIONS,surface:'horoscopes',family:'horoscope'});
  const config=provider.normalizeProviderConfig({maxOutputTokens:10000,reasoningEffort:'medium'},'judge');
  const request=await hydrateWritingFeedbackRequest(buildHoroscopeProviderRequest({config,role,input:JSON.stringify(input),
    schema:DAILY_BATCH_REVIEW_SCHEMA,instructions}),prepared.feedbackReceipt);
  if(Buffer.byteLength(JSON.stringify(request),'utf8')>DAILY_BATCH_INPUT_LIMIT)
    throw new AdminHttpError(409,'The complete Daily review request exceeds its input limit. No text was shortened and no request was sent.');
  const operation={id:randomUUID(),workflow:DAILY_BATCH_EDITORIAL,phase:'batch-review',state:'starting',
    scopeHash:prepared.planHash,bindingHash:dailyEditorialBinding(row),contentHash:dailyEditorialContent(row),
    responseId:null,requestHash:dailyEditorialHash({request,instructions}),config,input,request,instructions,startedAt:new Date().toISOString(),actor};
  await save({...gate,version:DAILY_BATCH_EDITORIAL,pending:operation});
  const {response,payload}=await startHoroscopeResponse({config,role,request,instructions,
    context:{editionId:row.id,operationId:operation.id,requestHash:operation.requestHash}});
  if(!response.ok||typeof payload.id!=='string'||!/^resp_[A-Za-z0-9_-]+$/u.test(payload.id))
    throw new AdminHttpError(503,'The Daily review outcome is unknown. Check saved progress before retrying.');
  await save({...gate,pending:{...operation,state:'running',responseId:payload.id}});
  return ['queued','in_progress'].includes(payload.status)?reply(true):finish(payload);
}
