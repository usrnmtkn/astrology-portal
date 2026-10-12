import {randomUUID} from 'node:crypto';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import provider from '../../src/astro-writing/offlineProviderConfig.cjs';
import {supportedHoroscopeReview,horoscopeReviewPolicy,HOROSCOPE_REVIEW_SCHEMA,HOROSCOPE_REVIEW_INSTRUCTIONS,horoscopeReviewInput,horoscopeReviewHash,readHoroscopeReview,horoscopeReviewValidationCode} from '../../src/astro-writing/horoscopeRhetoricalReview.mjs';
import {HOROSCOPE_STARTUP_DEADLINE_MS} from '../../src/astro-writing/horoscopeRecovery.mjs';
import {horoscopeEditionBody} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {AdminHttpError} from './admin-http.js';
import {assertHoroscopeRow} from './horoscope-editions.js';
import {horoscopeProviderDiagnostic} from './horoscope-provider-result.js';

export const isHoroscopeReview=(operation:any)=>supportedHoroscopeReview(operation?.workflow);

/** Persist the completed writer response before any review dispatch. Old requests
 * without this version never acquire a new paid stage during retrieval. */
export async function queueHoroscopeReview({row,persist,operation,candidate,receipt}:any){
  const instructions=`${horoscopeReviewPolicy(operation.reviewVersion)}\n\n${HOROSCOPE_REVIEW_INSTRUCTIONS}`;
  const input=horoscopeReviewInput(candidate,operation.reviewEvidence);
  const review={id:randomUUID(),workflow:operation.reviewVersion,phase:'review',state:'ready',sign:operation.sign,
    startedAt:new Date().toISOString(),actor:operation.actor,planHash:operation.planHash,candidate,receipt,candidateHash:horoscopeReviewHash(candidate),
    evidenceHash:horoscopeReviewHash(operation.reviewEvidence),config:provider.normalizeProviderConfig({maxOutputTokens:6000},'judge'),
    reviewRequest:{input,instructions,schema:HOROSCOPE_REVIEW_SCHEMA},responseId:null,writerOperation:operation};
  const saved=await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:review,lastError:null}}});
  return {status:202,payload:{ok:true,rows:[saved],pending:true}};
}

/** One saved review request per candidate. No rewriting, automatic retries, or
 * dispatch from poll. A held candidate does not occupy the batch's active slot. */
export async function horoscopeRhetoricalOperation({action,row:initialRow,persist,apiKey,recoverSign}:any){
  let row=initialRow,operation=recoverSign?row.source_snapshot.horoscopeGeneration.candidateHolds[recoverSign].operation:row.source_snapshot.horoscopeGeneration.active;
  if(horoscopeReviewHash(operation.candidate)!==operation.candidateHash)throw new AdminHttpError(409,'The saved prose check no longer matches its draft. Reopen the edition before continuing.');
  if(recoverSign&&horoscopeReviewHash(row.source_snapshot.horoscopeGeneration.candidateHolds[recoverSign].candidate)!==operation.candidateHash)throw new AdminHttpError(409,'The saved draft changed. Its previous prose check cannot be applied.');
  const pending=()=>({status:202,payload:{ok:true,rows:[row],pending:true}});
  const save=async()=>{row=await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:operation}}});};
  const hold=async(code:string,message:string,review:any=null)=>{
    const generation=row.source_snapshot.horoscopeGeneration;
    const previous=recoverSign&&generation.candidateHolds[recoverSign];
    if(previous?.code===code&&code==='rhetorical_review_unavailable'
      &&previous.review?.diagnostic?.outputHash===review?.diagnostic?.outputHash
      &&previous.review?.diagnostic?.validationCode===review?.diagnostic?.validationCode)
      return {status:200,payload:{ok:true,rows:[row],pending:false,held:true}};
    const failure={code,message,operation,candidate:operation.candidate,receipt:operation.receipt,review,failedAt:new Date().toISOString()};
    row=await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...generation,active:null,lastError:failure,
      candidateHolds:{...generation.candidateHolds,[operation.sign]:failure},failures:[...(generation.failures??[]),failure]}}});
    return {status:200,payload:{ok:true,rows:[row],pending:false,held:true}};
  };
  const complete=async(payload:any)=>{
    let verdict;
    try{verdict=readHoroscopeReview(payload,operation.candidate);}catch(error){
      const message=payload?.status==='completed'
        ?'The prose check could not be read. Your draft is saved. Check the saved prose review, or open the draft to edit it.'
        :'The prose check did not finish. Your draft is saved. Open it to edit or reject this reading.';
      return hold('rhetorical_review_unavailable',message,{diagnostic:{...horoscopeProviderDiagnostic(payload),validationCode:horoscopeReviewValidationCode(error)}});
    }
    const review={version:operation.workflow,...verdict,candidateHash:operation.candidateHash,evidenceHash:operation.evidenceHash,
      requestHash:operation.requestHash,responseId:operation.responseId,config:operation.config,usage:payload.usage??null,completedAt:new Date().toISOString(),ownerApproved:false};
    if(verdict.rhetoricalBlocked)return hold('rhetorical_pattern','The prose check found manufactured rhetorical polish. Review the quoted findings, then edit or reject this reading. The other readings can continue.',review);
    const edition={...row.sections.horoscopeEdition,passages:row.sections.horoscopeEdition.passages.map((p:any)=>p.sign===operation.sign?{...p,...operation.candidate}:p)};
    const generation=row.source_snapshot.horoscopeGeneration;
    const candidateHolds={...generation.candidateHolds};delete candidateHolds[operation.sign];
    const patch={status:'DRAFT',sections:{...row.sections,horoscopeEdition:edition},body:horoscopeEditionBody(edition),source_snapshot:{...row.source_snapshot,
      horoscopeGeneration:{...generation,active:null,lastError:recoverSign&&generation.lastError?.operation?.id!==operation.id?generation.lastError:null,...(recoverSign?{candidateHolds}:{}),readings:{...generation.readings,[operation.sign]:{...operation.receipt,rhetoricalReview:review}}}}};
    assertHoroscopeRow({...row,...patch});row=await persist(patch);
    return {status:200,payload:{ok:true,rows:[row],pending:false}};
  };
  if(recoverSign){
    const response=await responses.storedWritingResponse({apiKey,responseId:operation.responseId});
    if(!response.ok)throw new AdminHttpError(503,'The saved prose review could not be retrieved. Your draft is kept; no new request was made.');
    const payload=await response.json();
    if(payload.id!==operation.responseId||payload.status!=='completed')throw new AdminHttpError(503,'The saved prose review is not complete. Your draft is kept; no new request was made.');
    return complete(payload);
  }
  if(action==='release')return hold('rhetorical_review_interrupted','The prose check was interrupted. Its original draft is kept for editing or rejection; it will not be generated again automatically.');
  if(action==='continue'){
    if(operation.state!=='ready'||operation.responseId||operation.requestHash)throw new AdminHttpError(409,'This prose check has already started. Check saved progress to retrieve it.');
    const {input,instructions,schema}=operation.reviewRequest;
    const request={...provider.buildProviderRequest({config:operation.config,role:'judge',systemInstruction:null,input,schema}),background:true,store:true};
    operation={...operation,state:'reserved',requestHash:horoscopeReviewHash({request,instructions}),startedAt:new Date().toISOString()};
    await save(); // A stale or failed reservation must never dispatch.
    let dispatchAttempted=false;
    try{
      // The first checkpoint is a recoverable reservation, not evidence of a
      // paid dispatch. Only a separately confirmed dispatch fence can send.
      operation={...operation,state:'starting'};await save();
      dispatchAttempted=true;
      const {response,payload}=await responses.startStoredWritingResponse({apiKey,role:'RHETORICAL_REVIEWER',request,governedInstructions:instructions,surface:'horoscopes',family:'horoscope',fetchImpl:(url:any,options:any)=>fetch(url,{...options,signal:AbortSignal.timeout(25000)})});
      if(!response.ok){
        if(response.status>=400&&response.status<500)return await hold('rhetorical_review_unavailable','The prose check could not start. The original draft is kept for editing or rejection.',{diagnostic:horoscopeProviderDiagnostic(payload)});
        return await hold('rhetorical_review_interrupted','The prose check could not be confirmed and may have been billed. Its original draft is kept. No automatic retry will be made.');
      }
      if(typeof payload.id!=='string'||!/^resp_[A-Za-z0-9_-]+$/u.test(payload.id))return await hold('rhetorical_review_interrupted','The prose check did not confirm its request ID. Its original draft is kept. No automatic retry will be made.');
      operation={...operation,state:'running',responseId:payload.id};await save();
      return ['queued','in_progress'].includes(String(payload.status))?pending():await complete(payload);
    }catch(error){
      if(!dispatchAttempted)throw error;
      // Save a returned ID once more if its first storage acknowledgement failed.
      // If the handler dies, the reserved starting state is recovered by poll.
      if(operation.responseId){await save();return pending();}
      return hold('rhetorical_review_interrupted','The prose check could not be confirmed and may have been billed. Its original draft is kept. No automatic retry will be made.');
    }
  }
  if(operation.state==='ready')return pending();
  if(operation.state==='reserved'){
    if(Date.now()-Date.parse(operation.startedAt)<HOROSCOPE_STARTUP_DEADLINE_MS)return pending();
    operation={...operation,state:'ready',requestHash:null};await save();return pending();
  }
  if(!operation.responseId){
    if(Date.now()-Date.parse(operation.startedAt)<HOROSCOPE_STARTUP_DEADLINE_MS)return pending();
    return hold('rhetorical_review_interrupted','The prose check was interrupted before confirmation. Its original draft is kept. No automatic retry will be made.');
  }
  const response=await responses.storedWritingResponse({apiKey,responseId:operation.responseId});
  if(!response.ok)throw new AdminHttpError(503,'The saved prose check is temporarily unavailable. Check saved progress to retrieve the same request.');
  const payload=await response.json();
  return ['queued','in_progress'].includes(payload.status)?pending():await complete(payload);
}
