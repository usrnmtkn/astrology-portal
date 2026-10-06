import {createHash,randomUUID} from 'node:crypto';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import provider from '../../src/astro-writing/offlineProviderConfig.cjs';
import {writeHoroscopeSign,horoscopeWritingVersion} from '../../src/astro-writing/horoscopeWriting.mjs';
import {MONTHLY_HOROSCOPE_FORMAT,composeMonthlyHoroscopeDraft} from '../../src/astro-writing/monthlyHoroscopeFormat.mjs';
import {MONTHLY_SYNTHESIS_VERSION,MONTHLY_SYNTHESIS_INSTRUCTIONS,monthlySynthesisFacts,monthlySynthesisSchema,applyMonthlySynthesis} from '../../src/astro-writing/monthlyHoroscopeSynthesis.mjs';
import {horoscopeEditionBody,horoscopeCanonicalJson} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {validateHoroscopeReading} from '../../src/astro-writing/horoscopeValidation.mjs';
import {horoscopePunctuationFindings} from '../../src/astro-writing/horoscopeEditorialConstraints.mjs';
import {assertHoroscopeRow} from './horoscope-editions.js';
import {AdminHttpError} from './admin-http.js';
import {HoroscopeProviderFailure,readHoroscopeProviderResult} from './horoscope-provider-result.js';
import {HOROSCOPE_RHETORICAL_REVIEW} from '../../src/astro-writing/horoscopeRhetoricalReview.mjs';
import {queueHoroscopeReview} from './horoscope-rhetorical-operation.js';

const hash=(value:any)=>createHash('sha256').update(horoscopeCanonicalJson(value)).digest('hex');
class Captured extends Error { constructor(public request:any){super('Prepared canonical writer request.');} }

/** The saved planning/prose stages. New runs queue an independent prose check;
 * legacy operations retain their original contract. Poll only retrieves. */
export async function monthlyHoroscopeOperation({action,row:initialRow,persist,prepared,apiKey,actor}:any) {
  let row=initialRow,operation=row.source_snapshot?.horoscopeGeneration?.active;
  if(action==='recover')operation=row.source_snapshot.horoscopeGeneration.lastError.operation;
  const pending=()=>({status:202,payload:{ok:true,rows:[row],pending:true}});
  const saveOperation=async()=>{row=await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot?.horoscopeGeneration,active:operation,lastError:null}}});};
  const fail=async(error:HoroscopeProviderFailure)=>{
    const generation=row.source_snapshot?.horoscopeGeneration??{};
    const failure={code:error.code,message:error.message,diagnostic:error.diagnostic,operation,failedAt:new Date().toISOString()};
    row=await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...generation,active:null,lastError:failure,failures:[...(generation.failures??[]),failure]}}});
    return {status:422,payload:{ok:false,error:error.message,rows:[row]}};
  };
  const complete=async(payload:any)=>{
    if(operation.phase==='synthesis'){
      const brief=readHoroscopeProviderResult(payload,{format:operation.workflow,facts:operation.synthesisFacts});
      operation={...operation,state:'ready',synthesisReceipt:{version:operation.workflow,validationVersion:'monthly-synthesis-validation/v2',planHash:operation.planHash,
        brief,briefHash:hash(brief),responseId:operation.responseId,requestHash:operation.requestHash,config:operation.config,usage:payload.usage??null,completedAt:new Date().toISOString(),ownerApproved:false}};
      await saveOperation();return pending();
    }
    const raw=readHoroscopeProviderResult(payload,{format:MONTHLY_HOROSCOPE_FORMAT});
    const value=composeMonthlyHoroscopeDraft(raw);
    const lint=validateHoroscopeReading({sign:'overview',...value},row.facts.horoscopeBrief.brief,{ownerCorrections:operation.validationCorrections??[]});
    const receipt={...operation.receipt,bodyHash:hash(value),operationId:operation.id,responseId:operation.responseId,
      requestHash:operation.requestHash,config:operation.config,usage:payload.usage??null,synthesis:operation.synthesisReceipt,completedAt:new Date().toISOString(),lint};
    if(horoscopePunctuationFindings(value).length){
      const generation=row.source_snapshot.horoscopeGeneration;
      const failure={code:'required_punctuation',message:'The writer used a prohibited em dash. The response is kept for editing. Choose Edit punctuation to correct it without another AI request.',operation,candidate:value,receipt,failedAt:new Date().toISOString()};
      row=await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...generation,active:null,lastError:failure,failures:[...(generation.failures??[]),failure]}}});
      return {status:422,payload:{ok:false,error:failure.message,rows:[row]}};
    }
    if(operation.reviewVersion===HOROSCOPE_RHETORICAL_REVIEW)return queueHoroscopeReview({row,persist,operation,candidate:value,receipt});
    const edition={...row.sections.horoscopeEdition,passages:row.sections.horoscopeEdition.passages.map((p:any)=>p.sign==='overview'?{...p,...value}:p)};
    const patch={status:'DRAFT',sections:{...row.sections,horoscopeEdition:edition},body:horoscopeEditionBody(edition),source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:null,lastError:null,readings:{...row.source_snapshot.horoscopeGeneration.readings,overview:receipt}}}};
    assertHoroscopeRow({...row,...patch});row=await persist(patch);
    return {status:200,payload:{ok:true,rows:[row],pending:false}};
  };
  const dispatch=async(input:string,instructions:string,schema:any)=>{
    const request={...provider.buildProviderRequest({config:operation.config,role:'writer',input,schema}),background:true,store:true};
    operation={...operation,state:'starting',responseId:null,requestHash:hash({request,instructions}),startedAt:new Date().toISOString()};
    await saveOperation(); // CAS reservation precedes each potentially billed request.
    const {response,payload}=await responses.startStoredWritingResponse({apiKey,role:operation.phase==='synthesis'?'MEANING_PLANNER':'WRITER',request,governedInstructions:instructions,surface:'horoscopes',family:'horoscope',fetchImpl:(url:any,options:any)=>fetch(url,{...options,signal:AbortSignal.timeout(25000)})});
    if(!response.ok){
      if(response.status>=400&&response.status<500)readHoroscopeProviderResult({...payload,status:'failed'},{format:operation.outputFormat,facts:operation.synthesisFacts});
      throw new AdminHttpError(503,'The request outcome is unknown. Check saved progress before continuing; a duplicate request will not be started.');
    }
    if(typeof payload.id!=='string'||!/^resp_[A-Za-z0-9_-]+$/u.test(payload.id))throw new AdminHttpError(502,'The writer did not confirm a response ID. Check saved progress before continuing.');
    operation={...operation,responseId:payload.id,state:'running'};await saveOperation();
    return ['queued','in_progress'].includes(String(payload.status))?pending():await complete(payload);
  };
  try{
    if(action==='generate'){
      const entry=prepared.entries.find((e:any)=>e.sign==='overview');
      const id=randomUUID();let draftRequest:any;
      // Run the canonical evidence/approval gates and capture its complete request
      // before any paid dispatch. The synthesis is inserted only after validation.
      try{await writeHoroscopeSign(prepared,'overview',{approvedPlanHash:prepared.planHash,approvalReference:`horoscope-generation/${row.id}/${id}`,writerClient:async(request:any)=>{throw new Captured(request);}});}
      catch(error){if(error instanceof Captured)draftRequest=error.request;else throw error;}
      if(!draftRequest)throw new AdminHttpError(409,'The complete monthly writer request could not be prepared.');
      const synthesisFacts=monthlySynthesisFacts(entry.developments);
      const previous=row.source_snapshot?.horoscopeGeneration?.lastError?.operation??row.source_snapshot?.horoscopeGeneration?.lastInterrupted;
      const reusable=previous?.workflow===MONTHLY_SYNTHESIS_VERSION&&previous?.synthesisReceipt?.planHash===prepared.planHash?previous.synthesisReceipt:null;
      if(reusable)applyMonthlySynthesis(draftRequest.input,reusable.brief,synthesisFacts);
      operation={id,workflow:MONTHLY_SYNTHESIS_VERSION,sign:'overview',planHash:prepared.planHash,actor,phase:'synthesis',state:'starting',responseId:null,
        reviewVersion:HOROSCOPE_RHETORICAL_REVIEW,reviewEvidence:draftRequest.reviewEvidence,
        startedAt:new Date().toISOString(),draftRequest,synthesisFacts,synthesisReceipt:reusable,outputFormat:MONTHLY_SYNTHESIS_VERSION,
        // Synthesis already did the month-wide planning. Extra-high reasoning
        // consumed nearly the whole shared 12k reasoning/output budget in a
        // failed prose request. Keep the model and cost ceiling; use medium
        // effort for new drafts only. Stored operations retain their config.
        draftConfig:provider.normalizeProviderConfig({reasoningEffort:'medium',maxOutputTokens:12000},'writer'),config:provider.normalizeProviderConfig({reasoningEffort:'medium',maxOutputTokens:6000},'writer'),
        validationCorrections:entry.validationCorrections,receipt:{version:horoscopeWritingVersion,outputFormat:MONTHLY_HOROSCOPE_FORMAT,planHash:prepared.planHash,sign:'overview',sourceHash:prepared.sourceHash,sourceIds:entry.sourceIds,profileHash:hash(prepared.writingProfile),argumentHash:entry.argumentOutline.outlineHash,feedback:prepared.feedbackReceipt,ownerApproved:false,promotionAuthorized:false}};
      const generation=row.source_snapshot?.horoscopeGeneration??{};
      const previousFailure=generation.lastError;
      row=await persist({source_snapshot:{...row.source_snapshot,studioWritingProfile:prepared.writingProfile,horoscopeGeneration:{...generation,active:operation,lastError:null,
        failures:previousFailure&&!(generation.failures??[]).some((f:any)=>f.operation?.id===previousFailure.operation?.id)?[...(generation.failures??[]),previousFailure]:generation.failures??[]}}});
      if(reusable){operation={...operation,state:'ready'};await saveOperation();return pending();}
      const instructions=responses.governedInstructionsForRole('MEANING_PLANNER',{taskInstructions:MONTHLY_SYNTHESIS_INSTRUCTIONS,surface:'horoscopes',family:'horoscope'});
      return await dispatch(`MONTHLY FACTS AND PLAN SCOPE\n${JSON.stringify({window:prepared.edition.window,...synthesisFacts})}\n\nOWNER PLAN SCOPE\n${entry.outline}`,instructions,monthlySynthesisSchema(synthesisFacts));
    }
    if(action==='continue'){
      if(operation?.phase!=='synthesis'||operation?.state!=='ready'||!operation.synthesisReceipt)throw new AdminHttpError(409,'Check saved progress before continuing this monthly reading.');
      const input=applyMonthlySynthesis(operation.draftRequest.input,operation.synthesisReceipt.brief,operation.synthesisFacts);
      operation={...operation,phase:'draft',outputFormat:MONTHLY_HOROSCOPE_FORMAT,config:operation.draftConfig};
      return await dispatch(input,operation.draftRequest.instructions,operation.draftRequest.schema);
    }
    if(operation.state==='ready')return pending(); // Checking progress never starts the next paid stage.
    if(!operation.responseId)throw new AdminHttpError(409,'The current request has no confirmed response ID. Wait, then check saved progress.');
    const response=await responses.storedWritingResponse({apiKey,responseId:operation.responseId});
    if(!response.ok)throw new AdminHttpError(503,'The saved result is temporarily unavailable. Check saved progress to retrieve the same request.');
    const payload=await response.json();return ['queued','in_progress'].includes(payload.status)?pending():await complete(payload);
  }catch(error){
    if(error instanceof HoroscopeProviderFailure){
      if(action==='recover')return {status:422,payload:{ok:false,error:error.message,rows:[row]}};
      return await fail(error);
    }
    throw error;
  }
}
