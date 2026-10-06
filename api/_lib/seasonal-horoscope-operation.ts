import {createHash,randomUUID} from 'node:crypto';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import provider from '../../src/astro-writing/offlineProviderConfig.cjs';
import {writeHoroscopeSign,horoscopeWritingVersionFor} from '../../src/astro-writing/horoscopeWriting.mjs';
import {seasonalWriterFacts,selectSeasonalDraftPassages,completeSeasonalDraftRequest} from '../../src/astro-writing/seasonalDraftInput.mjs';
import {SEASONAL_WORKFLOW,SEASONAL_PLAN_INSTRUCTIONS,seasonalPlanSchema,selectSeasonalPlanFacts} from '../../src/astro-writing/seasonalDevelopmentPlan.mjs';
import {SEASONAL_REVIEW_FORMAT,SEASONAL_REVIEW_INSTRUCTIONS,SEASONAL_REVIEW_SCHEMA} from '../../src/astro-writing/seasonalEditorialReview.mjs';
import {seasonalContextBudget} from '../../src/astro-writing/seasonalContextBudget.mjs';
import {horoscopeEditionBody,horoscopeCanonicalJson} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {validateHoroscopeReading} from '../../src/astro-writing/horoscopeValidation.mjs';
import {assertHoroscopeRow} from './horoscope-editions.js';
import {AdminHttpError} from './admin-http.js';
import {HoroscopeProviderFailure,readHoroscopeProviderResult} from './horoscope-provider-result.js';
import {horoscopeStartupRecovery} from '../../src/astro-writing/horoscopeRecovery.mjs';

const hash=(v:any)=>createHash('sha256').update(horoscopeCanonicalJson(v)).digest('hex');
class Captured extends Error {constructor(public request:any){super('Captured Seasonal preparation.');}}

/** Three explicitly authorized stages. Poll is read-only at the provider;
 * continue starts exactly one next stage. Each reservation uses the row CAS.
 */
export async function seasonalHoroscopeOperation({action,row:initialRow,persist,prepared,sign,apiKey,actor}:any) {
  let row=initialRow,op=row.source_snapshot?.horoscopeGeneration?.active,attempted=false;
  const pending=()=>({status:202,payload:{ok:true,rows:[row],pending:true}});
  const save=async(patch:any)=>{row=await persist(patch);};
  const saveOp=async()=>save({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot?.horoscopeGeneration,active:op,lastError:null}}});
  const fail=async(error:any,candidate?:any,validation?:any)=>{
    const g=row.source_snapshot?.horoscopeGeneration??{};
    const failure={code:error.code??'seasonal_stage_failed',message:error.message,diagnostic:error.diagnostic??null,operation:op,
      ...(candidate?{candidate}:{}),...(validation?{validation}:{}),failedAt:new Date().toISOString()};
    const readings=op.phase==='review'&&g.readings?.[op.sign]?{...g.readings,[op.sign]:{...g.readings[op.sign],editorialReview:{status:'failed',advisory:true,error:{code:failure.code,message:failure.message},draftHash:op.writerReceipt.bodyHash}}}:g.readings;
    await save({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...g,readings,active:null,lastError:failure,failures:[...(g.failures??[]),failure]}}});
    return {status:422,payload:{ok:false,error:failure.message,rows:[row],...(validation?{validation}:{})}};
  };
  const finish=async(payload:any)=>{
    const value=readHoroscopeProviderResult(payload,{format:op.outputFormat,facts:op.validationFacts});
    const stageReceipt={responseId:op.responseId,requestHash:op.requestHash,usage:payload.usage??null,config:op.config,completedAt:new Date().toISOString(),ownerApproved:false};
    if(op.phase==='planning'){
      op={...op,state:'ready',developmentPlan:{...stageReceipt,value,hash:hash(value)}};
      await saveOp();return pending();
    }
    if(op.phase==='draft'){
      const lint=validateHoroscopeReading({sign:op.sign,...value},row.facts.horoscopeBrief.brief,{ownerCorrections:op.validationCorrections});
      const expectedHeadline=op.template.schema.properties.headline.enum[0];
      if(value.headline!==expectedHeadline){lint.violations.push({category:'seasonal_audience',detail:`The headline must be ${expectedHeadline}.`,governanceTier:'blocking'});lint.passed=false;}
      const receipt={...op.receipt,...stageReceipt,operationId:op.id,bodyHash:hash(value),originalDraft:value,
        developmentPlan:op.developmentPlan,contextBudget:op.contextBudget,contextReceipt:op.contextReceipt,selectedPassages:op.selectedPassages,
        auditInputs:op.template.seasonalPreparation,
        lint,editorialReview:{status:lint.passed?'pending':'not_run_factual_failure'},ownerApproved:false,promotionAuthorized:false};
      op={...op,writerReceipt:receipt};
      if(!lint.passed)return fail({code:'seasonal_factual_validation',message:'The Seasonal draft failed deterministic validation. The exact output and factual findings are saved; no automatic rewrite or editorial call was started.'},value,lint);
      const edition={...row.sections.horoscopeEdition,passages:row.sections.horoscopeEdition.passages.map((p:any)=>p.sign===op.sign?{...p,...value}:p)};
      op={...op,state:'ready'};
      const patch={status:'DRAFT',sections:{...row.sections,horoscopeEdition:edition},body:horoscopeEditionBody(edition),source_snapshot:{...row.source_snapshot,
        horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:op,lastError:null,readings:{...row.source_snapshot.horoscopeGeneration.readings,[op.sign]:receipt}}}};
      assertHoroscopeRow({...row,...patch});await save(patch);return pending();
    }
    const g=row.source_snapshot.horoscopeGeneration;
    const receipt={...g.readings[op.sign],editorialReview:{...stageReceipt,status:'complete',report:value,draftHash:op.writerReceipt.bodyHash,advisory:true}};
    await save({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...g,active:null,lastError:null,readings:{...g.readings,[op.sign]:receipt}}}});
    return {status:200,payload:{ok:true,rows:[row],pending:false}};
  };
  const dispatch=async(input:string,instructions:string,schema:any)=>{
    const role=op.phase==='planning'?'MEANING_PLANNER':op.phase==='review'?'REVIEWER':'WRITER';
    const request={...provider.buildProviderRequest({config:op.config,role:'writer',stage:op.phase,input,schema}),background:true,store:true};
    op={...op,state:'starting',responseId:null,requestHash:hash({request,instructions}),startedAt:new Date().toISOString()};
    await saveOp();attempted=true;
    const {response,payload}=await responses.startStoredWritingResponse({apiKey,role,request,governedInstructions:instructions,surface:'horoscopes',family:'horoscope',fetchImpl:(url:any,options:any)=>fetch(url,{...options,signal:AbortSignal.timeout(25000)})});
    if(!response.ok){
      if(response.status>=400&&response.status<500)readHoroscopeProviderResult({...payload,status:'failed'},{format:op.outputFormat,facts:op.validationFacts});
      throw new AdminHttpError(503,'The Seasonal request outcome is unknown. Check saved progress before retrying.');
    }
    if(typeof payload.id!=='string'||!/^resp_[A-Za-z0-9_-]+$/u.test(payload.id))throw new AdminHttpError(502,'The provider did not confirm a response ID.');
    op={...op,state:'running',responseId:payload.id};await saveOp();
    return ['queued','in_progress'].includes(payload.status)?pending():finish(payload);
  };
  try {
    if(action==='generate'){
      const entry=prepared.entries.find((e:any)=>e.sign===sign),id=randomUUID();let template:any;
      try{await writeHoroscopeSign(prepared,sign,{approvedPlanHash:prepared.planHash,approvalReference:`horoscope-generation/${row.id}/${id}`,writerClient:async(request:any)=>{throw new Captured(request);}});}
      catch(error){if(error instanceof Captured)template=error.request;else throw error;}
      if(!template?.seasonalPreparation)throw new AdminHttpError(409,'The complete Seasonal preparation is unavailable.');
      const catalog=seasonalWriterFacts(template.seasonalPreparation.engineFacts),passages=selectSeasonalDraftPassages(template.seasonalPreparation.context,template.seasonalPreparation.argumentOutline);
      op={id,workflow:SEASONAL_WORKFLOW,sign,planHash:prepared.planHash,actor,phase:'planning',state:'starting',responseId:null,startedAt:new Date().toISOString(),
        template,validationFacts:{catalog,passages},outputFormat:SEASONAL_WORKFLOW,
        config:provider.normalizeProviderConfig({reasoningEffort:'medium',maxOutputTokens:6000},'writer'),
        validationCorrections:entry.validationCorrections,
        receipt:{version:horoscopeWritingVersionFor('seasonal'),planHash:prepared.planHash,sourceHash:prepared.sourceHash,sign,seasonalMeaning:entry.seasonalMeaning,
          profileHash:hash(prepared.writingProfile),argumentHash:entry.argumentOutline.outlineHash,feedback:prepared.feedbackReceipt,ownerApproved:false,promotionAuthorized:false}};
      row={...row,source_snapshot:{...row.source_snapshot,studioWritingProfile:prepared.writingProfile}};
      const instructions=responses.governedInstructionsForRole('MEANING_PLANNER',{taskInstructions:SEASONAL_PLAN_INSTRUCTIONS,surface:'horoscopes',family:'horoscope'});
      return await dispatch(`APPROVED SCOPE\n${JSON.stringify(entry.argumentOutline)}\n\nGOVERNED FACT CATALOG\n${JSON.stringify(catalog)}\n\nELIGIBLE COMPLETE OWNER PASSAGES\n${JSON.stringify(passages)}`,instructions,seasonalPlanSchema(catalog,passages));
    }
    if(action==='continue'){
      if(op?.workflow!==SEASONAL_WORKFLOW||op.state!=='ready')throw new AdminHttpError(409,'Retrieve the current Seasonal stage before continuing.');
      if(op.phase==='planning'){
        const request=completeSeasonalDraftRequest(op.template,op.developmentPlan.value);
        const selectedPassages=op.developmentPlan.value.passageSelections.map((s:any)=>({...op.validationFacts.passages.find((p:any)=>p.id===s.id),selectionReason:s.why}));
        op={...op,phase:'draft',outputFormat:null,validationFacts:null,selectedPassages,receipt:{...op.receipt,sourceIds:selectedPassages.map((p:any)=>p.id)},contextBudget:seasonalContextBudget(request),contextReceipt:request.contextReceipt,config:provider.normalizeProviderConfig({reasoningEffort:'medium',maxOutputTokens:12000},'writer')};
        return await dispatch(request.input,request.instructions,request.schema);
      }
      if(op.phase==='draft'){
        op={...op,phase:'review',outputFormat:SEASONAL_REVIEW_FORMAT,validationFacts:{draft:op.writerReceipt.originalDraft},config:provider.normalizeProviderConfig({reasoningEffort:'medium',maxOutputTokens:6000},'writer')};
        const instructions=responses.governedInstructionsForRole('REVIEWER',{taskInstructions:SEASONAL_REVIEW_INSTRUCTIONS,surface:'horoscopes',family:'horoscope'});
        const preferred=op.template.seasonalPreparation.writingProfile.profile.voiceGuidance.match(/BEGIN COMPLETE OWNER PREFERRED REVISION\n([\s\S]*?)\nEND COMPLETE OWNER PREFERRED REVISION/u)?.[1];
        // The reviewer sees actual prose and voice evidence, never the writer's
        // plan as an excuse for a sentence that fails on the page.
        const reviewFacts=selectSeasonalPlanFacts(seasonalWriterFacts(op.template.seasonalPreparation.engineFacts),op.developmentPlan.value);
        return await dispatch(`AUDIENCE\n${op.sign}\n\nEXACT SAVED DRAFT\n${JSON.stringify(op.writerReceipt.originalDraft)}\n\nGOVERNED ASTROLOGY FOR EMOTIONAL PROPORTION\n${JSON.stringify(reviewFacts)}\n\nSELECTED COMPLETE OWNER PASSAGES\n${JSON.stringify(op.selectedPassages)}${preferred?`\n\nCURRENT OWNER PREFERRED REVISION — TAKES PRECEDENCE OVER OLDER VOICE EXAMPLES\n${JSON.stringify(preferred)}`:''}`,instructions,SEASONAL_REVIEW_SCHEMA);
      }
      throw new AdminHttpError(409,'This Seasonal stage cannot be continued.');
    }
    if(op.state==='ready')return pending();
    if(!op.responseId){
      // This stage has the same durable reservation boundary as a single call.
      const recovery=horoscopeStartupRecovery({...op,workflow:undefined});
      if(recovery==='waiting')return pending();
      if(recovery){
        const g=row.source_snapshot.horoscopeGeneration;
        const interrupted={...op,interruptedAt:new Date().toISOString(),outcome:recovery==='not_dispatched'?'not_dispatched':'unknown'};
        await save({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...g,active:null,interruptions:[...(g.interruptions??[]),interrupted],
          ...(recovery==='uncertain'?{heldRequests:{...g.heldRequests,[op.sign]:interrupted}}:{})}}});
        return {status:200,payload:{ok:true,rows:[row],pending:false,recovery}};
      }
      throw new AdminHttpError(409,'No response ID was confirmed. Wait, then check saved progress; do not start a duplicate request.');
    }
    const response=await responses.storedWritingResponse({apiKey,responseId:op.responseId});
    if(!response.ok)throw new AdminHttpError(503,'The saved Seasonal result is temporarily unavailable.');
    const payload=await response.json();return ['queued','in_progress'].includes(payload.status)?pending():await finish(payload);
  }catch(error){
    if(error instanceof HoroscopeProviderFailure)return fail(error);
    if(attempted){
      // Preserve uncertain reservations and confirmed IDs; never redispatch.
      try{await saveOp();}catch{/* Existing CAS reservation remains the recovery boundary. */}
    }
    throw error;
  }
}
