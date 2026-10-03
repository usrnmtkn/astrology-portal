import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {getContentAdminPrincipal,requireContentAdmin} from '../_lib/admin-auth.js';
import {loadLocalWebEnv} from '../_lib/local-env.js';
import {AdminHttpError,adminFetchJson,adminStorageRows,readAdminJsonBody,sendAdminJson,sendAdminMethodNotAllowed,adminErrorStatus} from '../_lib/admin-http.js';
import {studioStorage} from '../_lib/sky-studio-sources.js';
import {assertHoroscopeRow,prepareHoroscopeBrief} from '../_lib/horoscope-editions.js';
import {listStudioWritingProfiles} from '../_lib/studio-writing-profiles.js';
import {activeStudioFeedback,studioFeedbackEnabled,feedbackHash} from '../_lib/studio-memory-feedback.js';
import {prepareHoroscopeWriting,horoscopePlanPreview,writeHoroscopeSign,horoscopeWritingVersion} from '../../src/astro-writing/horoscopeWriting.mjs';
import {horoscopeEditionBody,horoscopeReadingSigns,horoscopeCanonicalJson} from '../../apps/web/src/content/horoscopeEditions.mjs';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import provider from '../../src/astro-writing/offlineProviderConfig.cjs';
import {HoroscopeProviderFailure,horoscopeProviderDiagnostic,readHoroscopeProviderResult} from '../_lib/horoscope-provider-result.js';
import {loadHoroscopeSeasonalSources} from '../_lib/horoscope-seasonal-sources.js';
import {validateHoroscopeReading} from '../../src/astro-writing/horoscopeValidation.mjs';
import {horoscopePunctuationFindings} from '../../src/astro-writing/horoscopeEditorialConstraints.mjs';
import {MONTHLY_HOROSCOPE_FORMAT,composeMonthlyHoroscopeDraft} from '../../src/astro-writing/monthlyHoroscopeFormat.mjs';
import {isMonthlySynthesisVersion} from '../../src/astro-writing/monthlyHoroscopeSynthesis.mjs';
import {monthlyHoroscopeOperation} from '../_lib/monthly-horoscope-operation.js';
import {horoscopeStartupRecovery} from '../../src/astro-writing/horoscopeRecovery.mjs';
loadLocalWebEnv();
export const maxDuration=300;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const nextVersion=(previous:string)=>new Date(Math.max(Date.now(),Date.parse(previous)+1)).toISOString();
class Pending extends Error {}

/** Each start reserves one saved sign. Poll only retrieves its durable provider ID. */
export default async function handler(req:IncomingMessage,res:ServerResponse) {
  if(req.method!=='POST')return sendAdminMethodNotAllowed(res,['POST']);
  if(!await requireContentAdmin(req,res))return;
  const actor=(await getContentAdminPrincipal(req))!;
  try {
    const input=await readAdminJsonBody<Record<string,any>>(req);
    if(!['prepare','generate','continue','poll','release','reject','diagnose'].includes(input.action)||typeof input.id!=='string'||!input.id
      ||typeof input.expectedUpdatedAt!=='string'||Object.keys(input).some(k=>!['action','id','expectedUpdatedAt','sign','approvedPlanHash','acknowledgeUnknownOutcome'].includes(k)))throw new AdminHttpError(400,'Choose a saved edition and a writing action.');
    const {url,headers}=studioStorage();
    const read=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${input.id}`,select:'*',limit:'1'})}`,{headers});
    if(!read.ok)throw new AdminHttpError(502,'The saved edition could not be read.');
    let row:any=adminStorageRows(read.payload)[0];
    if(!row)throw new AdminHttpError(404,'Edition not found.');
    if(row.updated_at!==input.expectedUpdatedAt)throw new AdminHttpError(409,'This edition changed. Reopen it before continuing.');
    if(!row.content_key?.startsWith('horoscope/')||row.status!=='DRAFT')throw new AdminHttpError(409,'Open an editable horoscope draft.');
    assertHoroscopeRow(row);
    const persist=async(patch:Record<string,unknown>)=>{
      const result=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${row.id}`,updated_at:`eq.${row.updated_at}`})}`,{method:'PATCH',headers:{...headers,prefer:'return=representation'},body:JSON.stringify({...patch,updated_at:nextVersion(row.updated_at)})});
      if(!result.ok)throw new AdminHttpError(502,'The save could not be confirmed. Reopen this edition before continuing.');
      const saved:any[]=adminStorageRows(result.payload);
      if(saved.length!==1||saved[0].id!==row.id||!saved[0].updated_at||saved[0].updated_at===row.updated_at)throw new AdminHttpError(409,'This edition changed during generation. Reopen it; newer edits were preserved.');
      row=saved[0];return row;
    };
    let operation=row.source_snapshot?.horoscopeGeneration?.active;
    let dispatchAttempted=false;
    let stage='prepare';
    const diagnostic=(error:unknown)=>({stage,status:adminErrorStatus(error),
      code:error instanceof Error&&['AbortError','TimeoutError'].includes(error.name)?'timeout':error instanceof AdminHttpError?'storage_or_protocol_error':'unexpected_error',
      errorType:error instanceof Error&&['AbortError','TimeoutError','TypeError','SyntaxError','AdminHttpError','Error'].includes(error.name)?error.name:'Error',
      recordedAt:new Date().toISOString()});
    const recordFailure=async(error:HoroscopeProviderFailure)=>{
      const generation=row.source_snapshot?.horoscopeGeneration??{};
      const failure={message:error.message,code:error.code,diagnostic:error.diagnostic,operation,failedAt:new Date().toISOString()};
      await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...generation,active:null,lastError:failure,
        failures:[...(generation.failures??[]),failure]}}});
      return sendAdminJson(res,422,{ok:false,error:error.message,rows:[row]});
    };
    const holdForPunctuation=async(value:{headline:string;body:string},receipt:any)=>{
      const generation=row.source_snapshot?.horoscopeGeneration??{};
      const failure={code:'required_punctuation',message:'The writer used a prohibited em dash. The response is kept for editing. Choose Edit punctuation to correct it without another AI request.',
        operation,failedAt:new Date().toISOString(),candidate:value,receipt};
      // Original output is private correction evidence, never an accepted draft,
      // published reader field or positive writing example. No automatic retry.
      await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...generation,active:null,lastError:failure,failures:[...(generation.failures??[]),failure]}}});
      return sendAdminJson(res,422,{ok:false,error:failure.message,rows:[row]});
    };
    if(input.action==='diagnose') {
      const failed=row.source_snapshot?.horoscopeGeneration?.lastError;
      if(operation||!failed?.operation?.responseId)throw new AdminHttpError(409,'There is no finished failed request to inspect. Check saved progress to retrieve any running request.');
      if(!process.env.OPENAI_API_KEY)throw new AdminHttpError(503,'The horoscope writer is not connected. Restore its server API key to inspect this reading.');
      const response=await responses.storedWritingResponse({apiKey:process.env.OPENAI_API_KEY,responseId:failed.operation.responseId});
      if(!response.ok)throw new AdminHttpError(503,'The saved writer response is unavailable. The failed request and saved readings are kept.');
      const payload=await response.json();
      try{readHoroscopeProviderResult(payload,{format:failed.operation.outputFormat,facts:failed.operation.synthesisFacts});}
      catch(error){if(error instanceof HoroscopeProviderFailure)return sendAdminJson(res,200,{ok:true,failure:{code:error.code,message:error.message,diagnostic:error.diagnostic}});throw error;}
      return sendAdminJson(res,200,{ok:true,failure:{code:'completed_response',message:'The saved response is complete. Your edition is unchanged; this result needs further review before another request is started.',diagnostic:horoscopeProviderDiagnostic(payload)}});
    }
    if(input.action==='reject') {
      if(operation)throw new AdminHttpError(409,'Finish or release the running request before rejecting drafts.');
      if(Object.keys(row.source_snapshot?.horoscopeGeneration?.heldRequests??{}).length)throw new AdminHttpError(409,'Resolve the interrupted requests before rejecting drafts. Saved readings are kept.');
      if(input.sign!=='all'&&!horoscopeReadingSigns(row.sections.horoscopeEdition).includes(input.sign))throw new AdminHttpError(400,'Choose a reading or all drafts.');
      const all=input.sign==='all',original=row.sections.horoscopeEdition;
      const selected=original.passages.filter((p:any)=>all||p.sign===input.sign);
      if(!selected.some((p:any)=>p.headline.trim()||p.body.trim()))throw new AdminHttpError(409,'These readings are already empty. Review the writing plan to generate them.');
      const snapshot=row.source_snapshot??{},generation=snapshot.horoscopeGeneration??{};
      const profiles=await listStudioWritingProfiles(params=>adminFetchJson(`${url}?${params}`,{headers}));
      const profile=profiles.find(p=>p.profile.period===original.window.period);
      let packet=row.facts.horoscopeBrief;
      if(all) {
        const params=new URLSearchParams({period:original.window.period,date:packet.brief.referenceDate,timeZone:original.window.timeZone});
        const fresh=await prepareHoroscopeBrief(new URL(`http://localhost/?${params}`));
        if(horoscopeCanonicalJson(fresh.brief.window)!==horoscopeCanonicalJson(original.window))throw new AdminHttpError(409,'The calculated dates changed. Your drafts are intact; create a new edition for the updated dates.');
        packet={brief:fresh.brief,signature:fresh.signature};
      }
      const targets=new Set(selected.map((p:any)=>p.sign));
      const {rejections=[],...previousGeneration}=generation;
      const rejected={id:randomUUID(),rejectedAt:new Date().toISOString(),rejectedBy:actor,scope:input.sign,
        reason:'Rejected in Content Studio to prepare a fresh draft.',updatedAt:row.updated_at,
        passages:selected,passagesHash:createHash('sha256').update(horoscopeCanonicalJson(selected)).digest('hex'),facts:row.facts,writingProfile:snapshot.studioWritingProfile??null,
        outlines:snapshot.horoscopeOutlines??{},editorialImport:snapshot.editorialImport??null,generation:previousGeneration};
      const edition={...original,passages:original.passages.map((p:any)=>targets.has(p.sign)?{...p,headline:'',body:''}:p)};
      const patch={status:'DRAFT',review_state:null,reviewed_at:null,sections:{...row.sections,horoscopeEdition:edition},body:horoscopeEditionBody(edition),
        facts:{...row.facts,horoscopeBrief:packet},source_snapshot:{...snapshot,studioWritingProfile:profile,
          horoscopeOutlines:Object.fromEntries(Object.entries(snapshot.horoscopeOutlines??{}).filter(([sign])=>!targets.has(sign))),
          ...(all?{editorialImport:null}:{}),
          horoscopeGeneration:{...generation,active:null,lastError:null,rejections:[...rejections,rejected],
            readings:Object.fromEntries(Object.entries(generation.readings??{}).filter(([sign])=>!targets.has(sign)))}}};
      assertHoroscopeRow({...row,...patch});await persist(patch);
      if(horoscopeCanonicalJson(row.sections)!==horoscopeCanonicalJson(patch.sections)
        ||horoscopeCanonicalJson(row.facts)!==horoscopeCanonicalJson(patch.facts)
        ||horoscopeCanonicalJson(row.source_snapshot)!==horoscopeCanonicalJson(patch.source_snapshot))throw new AdminHttpError(502,'The exact reset could not be confirmed. Reopen this edition before continuing.');
      return sendAdminJson(res,200,{ok:true,rows:[row]});
    }
    if(input.action==='release') {
      const held=input.sign&&row.source_snapshot?.horoscopeGeneration?.heldRequests?.[input.sign];
      if(held){
        if(operation||input.acknowledgeUnknownOutcome!==true)throw new AdminHttpError(409,'Finish the current reading and acknowledge the interrupted request before retrying it.');
        const generation=row.source_snapshot.horoscopeGeneration;
        const heldRequests={...generation.heldRequests};delete heldRequests[input.sign];
        const released={...held,releasedAt:new Date().toISOString(),releasedBy:actor,outcome:'unknown'};
        await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...generation,heldRequests,lastInterrupted:released,interruptions:[...(generation.interruptions??[]),released]}}});
        return sendAdminJson(res,200,{ok:true,rows:[row]});
      }
      if(!operation||Date.now()-Date.parse(operation.startedAt)<310000||input.acknowledgeUnknownOutcome!==true)throw new AdminHttpError(409,'Wait for the in-flight request, then acknowledge its unknown outcome before releasing it.');
      if(operation.responseId){
        const response=await responses.storedWritingResponse({apiKey:process.env.OPENAI_API_KEY,responseId:operation.responseId,cancel:true});
        const result:any=await response.json();
        if(!response.ok||!['cancelled','failed','incomplete'].includes(result.status))throw new AdminHttpError(409,'This request could not be cancelled, or has already completed. Resume generation to retrieve its result.');
      }
      await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:null,lastInterrupted:{...operation,releasedAt:new Date().toISOString(),releasedBy:actor,outcome:'unknown'}}}});
      return sendAdminJson(res,200,{ok:true,rows:[row]});
    }
    if(input.action==='generate'&&operation)throw new AdminHttpError(409,'A reading is already running. Resume it to retrieve the saved result.');
    const failed=row.source_snapshot?.horoscopeGeneration?.lastError;
    const recoverMonthlyPlan=input.action==='poll'&&!operation&&failed?.code==='invalid_synthesis'
      &&isMonthlySynthesisVersion(failed.operation?.workflow)&&failed.operation.phase==='synthesis'&&failed.operation.responseId;
    if(input.action==='poll'&&!operation&&!recoverMonthlyPlan) return sendAdminJson(res,200,{ok:true,rows:[row],pending:false});
    const apiKey=process.env.OPENAI_API_KEY;
    if(['poll','continue'].includes(input.action)&&isMonthlySynthesisVersion(operation?.workflow)){
      if(!apiKey)throw new AdminHttpError(503,'The horoscope writer is not connected. Restore its server API key to continue.');
      const result=await monthlyHoroscopeOperation({action:input.action,row,persist,apiKey,actor});
      return sendAdminJson(res,result.status,result.payload);
    }
    if(input.action==='continue')throw new AdminHttpError(409,'Check saved progress before continuing this reading.');
    if(input.action==='poll'&&!recoverMonthlyPlan) {
      if(!apiKey)throw new AdminHttpError(503,'The horoscope writer is not connected. Restore its server API key to retrieve this reading.');
      if(!operation.responseId){
        const recovery=horoscopeStartupRecovery(operation);
        if(recovery==='waiting')return sendAdminJson(res,202,{ok:true,rows:[row],pending:true});
        if(recovery){
          const generation=row.source_snapshot.horoscopeGeneration;
          const interrupted={...operation,interruptedAt:new Date().toISOString(),outcome:recovery==='not_dispatched'?'not_dispatched':'unknown'};
          // Never replay a possibly billed request. Keep its complete identity
          // separately so other signs can proceed under their approved plan.
          await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...generation,active:null,
            interruptions:[...(generation.interruptions??[]),interrupted],
            ...(recovery==='uncertain'?{heldRequests:{...generation.heldRequests,[operation.sign]:interrupted}}:{})}}});
          return sendAdminJson(res,200,{ok:true,rows:[row],pending:false,recovery});
        }
        throw new AdminHttpError(409,'This request cannot be retrieved yet. Check saved progress before retrying.');
      }
      const response=await responses.storedWritingResponse({apiKey,responseId:operation.responseId});
      const payload:any=await response.json();
      if(!response.ok)throw new AdminHttpError(503,'The writer result is temporarily unavailable. Resume to retrieve the same request.');
      if(['queued','in_progress'].includes(payload.status))return sendAdminJson(res,202,{ok:true,rows:[row],pending:true});
      let value;
      try {const raw=readHoroscopeProviderResult(payload,{format:operation.outputFormat});value=operation.outputFormat===MONTHLY_HOROSCOPE_FORMAT?composeMonthlyHoroscopeDraft(raw):raw;}
      catch(error){if(error instanceof HoroscopeProviderFailure)return await recordFailure(error);throw error;}
      const edition={...row.sections.horoscopeEdition,passages:row.sections.horoscopeEdition.passages.map((p:any)=>p.sign===operation.sign?{...p,...value}:p)};
      const lint=validateHoroscopeReading({sign:operation.sign,...value},row.facts.horoscopeBrief.brief,{ownerCorrections:operation.validationCorrections??[]});
      const receipt={...operation.receipt,bodyHash:createHash('sha256').update(horoscopeCanonicalJson(value)).digest('hex'),operationId:operation.id,responseId:operation.responseId,requestHash:operation.requestHash,config:operation.config,usage:payload.usage??null,completedAt:new Date().toISOString(),lint};
      if(horoscopePunctuationFindings(value).length)return await holdForPunctuation(value,receipt);
      const patch={status:'DRAFT',sections:{horoscopeEdition:edition},body:horoscopeEditionBody(edition),source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:null,lastError:null,readings:{...row.source_snapshot.horoscopeGeneration.readings,[operation.sign]:receipt}}}};
      assertHoroscopeRow({...row,...patch});await persist(patch);return sendAdminJson(res,200,{ok:true,rows:[row],pending:false});
    }
    const memory=studioFeedbackEnabled()?await activeStudioFeedback():[];
    // Existing feedback families have explicit scopes. Do not widen a passage
    // or Sky correction to a new horoscope surface.
    const feedbackReceipt={enabled:studioFeedbackEnabled(),inventoryHash:hash(memory.map(feedbackHash)),selected:[],reason:'No existing Studio feedback scope includes horoscope editions.'};
    // A new plan always adopts the latest saved instructions. In-flight requests
    // and their historical receipts stay pinned to the instructions they used.
    let writingRow=row;
    if(!operation){
      const profiles=await listStudioWritingProfiles(params=>adminFetchJson(`${url}?${params}`,{headers}));
      const latest=profiles.find(p=>p.profile.period===row.sections.horoscopeEdition.window.period);
      if(latest?.id&&horoscopeCanonicalJson(latest)!==horoscopeCanonicalJson(row.source_snapshot?.studioWritingProfile??null)){
        writingRow={...row,source_snapshot:{...row.source_snapshot,studioWritingProfile:latest}};
      }
    }
    const seasonalSourceRows=await loadHoroscopeSeasonalSources(row.facts?.horoscopeBrief?.brief);
    const prepared=prepareHoroscopeWriting(writingRow,{feedbackReceipt,seasonalSourceRows});
    if(recoverMonthlyPlan){
      if(prepared.planHash!==failed.operation.planHash||prepared.edition.passages.some((p:any)=>p.headline.trim()||p.body.trim()))throw new AdminHttpError(409,'The saved plan uses earlier instructions or content. Review the current writing plan before generating. Your saved readings are kept.');
      if(!apiKey)throw new AdminHttpError(503,'The horoscope writer is not connected. Restore its server API key to retrieve this plan.');
      const result=await monthlyHoroscopeOperation({action:'recover',row,persist,apiKey,actor});
      return sendAdminJson(res,result.status,result.payload);
    }
    if(input.action==='prepare'){
      if(writingRow!==row){
        await persist({source_snapshot:writingRow.source_snapshot});
        if(horoscopeCanonicalJson(row.source_snapshot)!==horoscopeCanonicalJson(writingRow.source_snapshot))throw new AdminHttpError(502,'The latest writing instructions could not be confirmed. Reopen this edition before continuing.');
      }
      return sendAdminJson(res,200,{ok:true,rows:[row],plan:horoscopePlanPreview(prepared),configured:Boolean(apiKey)});
    }
    if(!apiKey)throw new AdminHttpError(503,'The horoscope writer is not connected. Configure the server OpenAI API key, then retry.');
    const sign=input.sign;
    if(!horoscopeReadingSigns(prepared.edition).includes(sign))throw new AdminHttpError(400,'Choose a reading.');
    if(row.source_snapshot?.horoscopeGeneration?.heldRequests?.[sign])throw new AdminHttpError(409,'This reading has an interrupted request with an unknown outcome. Continue the other readings or explicitly release this request before retrying.');
    const passage=prepared.edition.passages.find((p:any)=>p.sign===sign);
    if(passage.headline.trim()||passage.body.trim())throw new AdminHttpError(409,'This sign already contains writing. Reject the reading in Review before generating a replacement.');
    const planHash=input.approvedPlanHash;
    if(planHash!==prepared.planHash)throw new AdminHttpError(409,'The writing plan or its sources changed. Review the current plan before generating.');
    if(prepared.edition.window.period==='monthly'){
      const result=await monthlyHoroscopeOperation({action:'generate',row,persist,prepared,apiKey,actor});
      return sendAdminJson(res,result.status,result.payload);
    }
    const config=provider.normalizeProviderConfig({},'writer');
    if(!operation) {
      const entry=prepared.entries.find((e:any)=>e.sign===sign);
      operation={id:randomUUID(),sign,planHash,startedAt:new Date().toISOString(),actor,config,responseId:null,state:'starting',
        outputFormat:prepared.edition.window.period==='monthly'?MONTHLY_HOROSCOPE_FORMAT:null,
        validationCorrections:entry.validationCorrections,
        receipt:{version:horoscopeWritingVersion,outputFormat:prepared.edition.window.period==='monthly'?MONTHLY_HOROSCOPE_FORMAT:null,planHash,sign,sourceHash:prepared.sourceHash,sourceIds:entry.sourceIds,seasonalMeaning:entry.seasonalMeaning,profileHash:hash(prepared.writingProfile),argumentHash:entry.argumentOutline.outlineHash,feedback:prepared.feedbackReceipt,ownerApproved:false,promotionAuthorized:false}};
    }
    let payload:any;
    const writerClient=Object.assign(async({role,instructions,input:prompt,schema}:any)=>{
        const request={...provider.buildProviderRequest({config:operation.config,role:'writer',input:prompt,schema}),background:true,store:true};
        operation={...operation,requestHash:hash({request,instructions})};
        // Finish prompt/evidence preparation before reserving. One conditional
        // save contains the complete identity; a failed save never dispatches.
        stage='reserve';
        const generation=row.source_snapshot?.horoscopeGeneration??{};
        const failures=generation.failures??[],legacy=generation.lastError;
        await persist({source_snapshot:{...writingRow.source_snapshot,horoscopeGeneration:{...generation,active:operation,lastError:null,
          failures:legacy&&!failures.some((failure:any)=>failure.operation?.id===legacy.operation?.id)?[...failures,legacy]:failures}}});
        stage='dispatch';dispatchAttempted=true;
        const {response,payload:result}=await responses.startStoredWritingResponse({apiKey,role,request,governedInstructions:instructions,surface:'horoscopes',family:'horoscope',fetchImpl:(url:any,options:any)=>fetch(url,{...options,signal:AbortSignal.timeout(25000)})});
        payload=result;
        if(!response.ok) {
          if(response.status>=400&&response.status<500)readHoroscopeProviderResult({...payload,status:'failed'},{format:operation.outputFormat});
          throw new AdminHttpError(503,'The writer request outcome is unknown. Reopen this edition before retrying.');
        }
        if(typeof payload.id!=='string'||!/^resp_[A-Za-z0-9_-]+$/u.test(payload.id))throw new AdminHttpError(502,'The writer did not confirm a response ID. Reopen this edition before retrying.');
        operation={...operation,responseId:payload.id,state:'running'};
        stage='save_response';
        await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:operation}}});
      
      if(['queued','in_progress'].includes(payload.status))throw new Pending();
      return readHoroscopeProviderResult(payload,{format:operation.outputFormat});
    },{provider:'openai',model:operation.config.model,reasoningEffort:operation.config.reasoningEffort,billed:input.action==='generate'});
    try {
      const result=await writeHoroscopeSign(prepared,sign,{approvedPlanHash:planHash,writerClient,approvalReference:`horoscope-generation/${row.id}/${operation.id}`});
      const edition={...prepared.edition,passages:prepared.edition.passages.map((p:any)=>p.sign===sign?{...p,headline:result.headline,body:result.body}:p)};
      const receipt={...result.receipt,outputFormat:operation.outputFormat,operationId:operation.id,responseId:operation.responseId,requestHash:operation.requestHash,config:operation.config,usage:payload?.usage??null,completedAt:new Date().toISOString(),lint:result.lint,report:result.report};
      if(horoscopePunctuationFindings(result).length)return await holdForPunctuation({headline:result.headline,body:result.body},receipt);
      const patch={status:'DRAFT',sections:{horoscopeEdition:edition},body:horoscopeEditionBody(edition),source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:null,lastError:null,readings:{...row.source_snapshot.horoscopeGeneration?.readings,[sign]:receipt}}}};
      assertHoroscopeRow({...row,...patch});await persist(patch);
      return sendAdminJson(res,200,{ok:true,rows:[row],pending:false});
    } catch(error) {
      if(error instanceof Pending)return sendAdminJson(res,202,{ok:true,rows:[row],pending:true});
      if(error instanceof HoroscopeProviderFailure)return await recordFailure(error);
      const detail=diagnostic(error);
      console.error('horoscope_startup_interrupted',{operationId:operation.id,sign, ...detail});
      // Preserve a returned response ID even if its first save failed. Retrying
      // this conditional storage save cannot start another provider request.
      if(dispatchAttempted){
        operation={...operation,startupDiagnostic:detail};
        try{
          const generation=row.source_snapshot.horoscopeGeneration;
          if(operation.responseId){
            await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...generation,active:operation}}});
            return sendAdminJson(res,202,{ok:true,rows:[row],pending:true});
          }
          const held={...operation,interruptedAt:new Date().toISOString(),outcome:'unknown'};
          await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...generation,active:null,
            heldRequests:{...generation.heldRequests,[sign]:held},interruptions:[...(generation.interruptions??[]),held]}}});
          return sendAdminJson(res,200,{ok:true,rows:[row],pending:false,recovery:'uncertain'});
        }catch{/* A conflict or unavailable storage is reconciled by the client. */}
      }
      throw error;
    }
  }catch(error) {
    if((error as any)?.code==='SEASONAL_MEANING_UNAVAILABLE')return sendAdminJson(res,409,{ok:false,error:(error as Error).message});
    const status=adminErrorStatus(error);
    return sendAdminJson(res,status,{ok:false,error:error instanceof AdminHttpError?error.message:'Generation could not complete. Reopen the edition to recover its saved progress; no reading was published.'});
  }
}
