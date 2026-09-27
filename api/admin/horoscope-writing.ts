import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {getContentAdminPrincipal} from '../_lib/admin-auth.js';
import {loadLocalWebEnv} from '../_lib/local-env.js';
import {AdminHttpError,adminFetchJson,adminStorageRows,readAdminJsonBody,sendAdminJson,sendAdminMethodNotAllowed,adminErrorStatus} from '../_lib/admin-http.js';
import {studioStorage} from '../_lib/sky-studio-sources.js';
import {assertHoroscopeRow} from '../_lib/horoscope-editions.js';
import {activeStudioFeedback,studioFeedbackEnabled,feedbackHash} from '../_lib/studio-memory-feedback.js';
import {prepareHoroscopeWriting,horoscopePlanPreview,writeHoroscopeSign,horoscopeWritingVersion} from '../../src/astro-writing/horoscopeWriting.mjs';
import {horoscopeEditionBody,HOROSCOPE_SIGNS,horoscopeCanonicalJson} from '../../apps/web/src/content/horoscopeEditions.mjs';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import provider from '../../src/astro-writing/offlineProviderConfig.cjs';
import {validateHoroscopeReading} from '../../src/astro-writing/horoscopeValidation.mjs';
loadLocalWebEnv();
export const maxDuration=300;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const nextVersion=(previous:string)=>new Date(Math.max(Date.now(),Date.parse(previous)+1)).toISOString();
class Pending extends Error {}
class ProviderFailure extends Error {}

/** Each start reserves one saved sign. Poll only retrieves its durable provider ID. */
export default async function handler(req:IncomingMessage,res:ServerResponse) {
  if(req.method!=='POST')return sendAdminMethodNotAllowed(res,['POST']);
  const actor=await getContentAdminPrincipal(req);
  if(!actor)return sendAdminJson(res,401,{ok:false,error:'Unauthorized.'});
  try {
    const input=await readAdminJsonBody<Record<string,any>>(req);
    if(!['prepare','generate','poll','release'].includes(input.action)||typeof input.id!=='string'||!input.id
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
    if(input.action==='release') {
      if(!operation||Date.now()-Date.parse(operation.startedAt)<310000||input.acknowledgeUnknownOutcome!==true)throw new AdminHttpError(409,'Wait for the in-flight request, then acknowledge its unknown outcome before releasing it.');
      if(operation.responseId){
        const response=await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(operation.responseId)}/cancel`,{method:'POST',headers:{authorization:`Bearer ${process.env.OPENAI_API_KEY}`},signal:AbortSignal.timeout(20000)});
        const result:any=await response.json();
        if(!response.ok||!['cancelled','failed','incomplete'].includes(result.status))throw new AdminHttpError(409,'This request could not be cancelled, or has already completed. Resume generation to retrieve its result.');
      }
      await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:null,lastInterrupted:{...operation,releasedAt:new Date().toISOString(),releasedBy:actor,outcome:'unknown'}}}});
      return sendAdminJson(res,200,{ok:true,rows:[row]});
    }
    if(input.action==='generate'&&operation)throw new AdminHttpError(409,'A reading is already running. Resume it to retrieve the saved result.');
    if(input.action==='poll'&&!operation) return sendAdminJson(res,200,{ok:true,rows:[row],pending:false});
    const apiKey=process.env.OPENAI_API_KEY;
    if(input.action==='poll') {
      if(!apiKey)throw new AdminHttpError(503,'The horoscope writer is not connected. Restore its server API key to retrieve this reading.');
      if(!operation.responseId)throw new AdminHttpError(409,'The request has no confirmed response ID yet. Wait, then reopen the edition. If interrupted, release it after five minutes.');
      const response=await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(operation.responseId)}`,{headers:{authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(20000)});
      const payload:any=await response.json();
      if(!response.ok)throw new AdminHttpError(503,'The writer result is temporarily unavailable. Resume to retrieve the same request.');
      if(['queued','in_progress'].includes(payload.status))return sendAdminJson(res,202,{ok:true,rows:[row],pending:true});
      let value:any;
      try {
        if(payload.status!=='completed')throw new Error();
        value=JSON.parse(payload.output?.filter((item:any)=>item.type==='message').flatMap((item:any)=>item.content??[]).filter((item:any)=>item.type==='output_text').map((item:any)=>item.text).join(''));
        if(!value||Object.keys(value).some(k=>!['headline','body'].includes(k))||typeof value.headline!=='string'||!value.headline.trim()||value.headline.length>200||typeof value.body!=='string'||!value.body.trim()||value.body.length>20000)throw new Error();
      }catch{
        const error='The writer did not complete a usable reading. Completed signs are saved. Review the plan and resume to try this sign again.';
        await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:null,lastError:{message:error,operation,failedAt:new Date().toISOString()}}}});
        return sendAdminJson(res,422,{ok:false,error,rows:[row]});
      }
      const edition={...row.sections.horoscopeEdition,passages:row.sections.horoscopeEdition.passages.map((p:any)=>p.sign===operation.sign?{...p,...value}:p)};
      const lint=validateHoroscopeReading({sign:operation.sign,...value},row.facts.horoscopeBrief.brief,{ownerCorrections:operation.validationCorrections??[]});
      const receipt={...operation.receipt,bodyHash:createHash('sha256').update(horoscopeCanonicalJson(value)).digest('hex'),operationId:operation.id,responseId:operation.responseId,requestHash:operation.requestHash,config:operation.config,usage:payload.usage??null,completedAt:new Date().toISOString(),lint};
      const patch={status:'DRAFT',sections:{horoscopeEdition:edition},body:horoscopeEditionBody(edition),source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:null,lastError:null,readings:{...row.source_snapshot.horoscopeGeneration.readings,[operation.sign]:receipt}}}};
      assertHoroscopeRow({...row,...patch});await persist(patch);return sendAdminJson(res,200,{ok:true,rows:[row],pending:false});
    }
    const memory=studioFeedbackEnabled()?await activeStudioFeedback():[];
    // Existing feedback families have explicit scopes. Do not widen a passage
    // or Sky correction to a new horoscope surface.
    const feedbackReceipt={enabled:studioFeedbackEnabled(),inventoryHash:hash(memory.map(feedbackHash)),selected:[],reason:'No existing Studio feedback scope includes horoscope editions.'};
    const prepared=prepareHoroscopeWriting(row,{feedbackReceipt});
    if(input.action==='prepare')return sendAdminJson(res,200,{ok:true,plan:horoscopePlanPreview(prepared),configured:Boolean(apiKey)});
    if(!apiKey)throw new AdminHttpError(503,'The horoscope writer is not connected. Configure the server OpenAI API key, then retry.');
    const sign=input.sign;
    if(!HOROSCOPE_SIGNS.includes(sign))throw new AdminHttpError(400,'Choose a zodiac sign.');
    const passage=prepared.edition.passages.find((p:any)=>p.sign===sign);
    if(passage.headline.trim()||passage.body.trim())throw new AdminHttpError(409,'This sign already contains writing. Edit it directly; generation will not replace it.');
    const planHash=input.approvedPlanHash;
    if(planHash!==prepared.planHash)throw new AdminHttpError(409,'The writing plan or its sources changed. Review the current plan before generating.');
    const config=provider.normalizeProviderConfig({},'writer');
    if(!operation) {
      const entry=prepared.entries.find((e:any)=>e.sign===sign);
      operation={id:randomUUID(),sign,planHash,startedAt:new Date().toISOString(),actor,config,responseId:null,state:'starting',
        validationCorrections:entry.validationCorrections,
        receipt:{version:horoscopeWritingVersion,planHash,sign,sourceHash:prepared.sourceHash,sourceIds:entry.sourceIds,profileHash:hash(prepared.writingProfile),argumentHash:entry.argumentOutline.outlineHash,feedback:prepared.feedbackReceipt,ownerApproved:false,promotionAuthorized:false}};
      await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot?.horoscopeGeneration,active:operation,lastError:null}}});
    }
    let payload:any;
    const writerClient=Object.assign(async({role,instructions,input:prompt,schema}:any)=>{
        const request={...provider.buildProviderRequest({config:operation.config,role:'writer',input:prompt,schema}),background:true,store:true};
        operation={...operation,requestHash:hash({request,instructions})};
        // Persist the exact request identity before the potentially billed call.
        await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:operation}}});
        const {response,payload:result}=await responses.callOpenAIResponses({apiKey,role,request,governedInstructions:instructions,surface:'horoscopes',family:'horoscope',fetchImpl:(url:any,options:any)=>fetch(url,{...options,signal:AbortSignal.timeout(25000)})});
        payload=result;
        if(!response.ok) {
          if(response.status>=400&&response.status<500)throw new ProviderFailure('The writer declined this request. Check its configuration or available quota, then resume.');
          throw new AdminHttpError(503,'The writer request outcome is unknown. Reopen this edition before retrying.');
        }
        if(typeof payload.id!=='string'||!/^resp_[A-Za-z0-9_-]+$/u.test(payload.id))throw new AdminHttpError(502,'The writer did not confirm a response ID. Reopen this edition before retrying.');
        operation={...operation,responseId:payload.id,state:'running'};
        await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:operation}}});
      
      if(['queued','in_progress'].includes(payload.status))throw new Pending();
      if(payload.status!=='completed')throw new ProviderFailure('The writer stopped before completing this reading. Saved readings are intact; resume to try this sign again.');
      const text=payload.output?.filter((item:any)=>item.type==='message').flatMap((item:any)=>item.content??[]).filter((item:any)=>item.type==='output_text').map((item:any)=>item.text).join('');
      try {const value=JSON.parse(text);if(!value||Object.keys(value).some(k=>!['headline','body'].includes(k)))throw new Error();return value;}catch{throw new ProviderFailure('The writer returned an invalid reading. Saved readings are intact; resume to try this sign again.');}
    },{provider:'openai',model:operation.config.model,reasoningEffort:operation.config.reasoningEffort,billed:input.action==='generate'});
    try {
      const result=await writeHoroscopeSign(prepared,sign,{approvedPlanHash:planHash,writerClient,approvalReference:`horoscope-generation/${row.id}/${operation.id}`});
      const edition={...prepared.edition,passages:prepared.edition.passages.map((p:any)=>p.sign===sign?{...p,headline:result.headline,body:result.body}:p)};
      const receipt={...result.receipt,operationId:operation.id,responseId:operation.responseId,requestHash:operation.requestHash,config:operation.config,usage:payload?.usage??null,completedAt:new Date().toISOString(),lint:result.lint,report:result.report};
      const patch={status:'DRAFT',sections:{horoscopeEdition:edition},body:horoscopeEditionBody(edition),source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:null,lastError:null,readings:{...row.source_snapshot.horoscopeGeneration?.readings,[sign]:receipt}}}};
      assertHoroscopeRow({...row,...patch});await persist(patch);
      return sendAdminJson(res,200,{ok:true,rows:[row],pending:false});
    } catch(error) {
      if(error instanceof Pending)return sendAdminJson(res,202,{ok:true,rows:[row],pending:true});
      if(error instanceof ProviderFailure) {
        await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:null,lastError:{message:error.message,operation,failedAt:new Date().toISOString()}}}});
        return sendAdminJson(res,422,{ok:false,error:error.message,rows:[row]});
      }
      throw error;
    }
  }catch(error) {
    const status=adminErrorStatus(error);
    return sendAdminJson(res,status,{ok:false,error:error instanceof AdminHttpError?error.message:'Generation could not complete. Reopen the edition to recover its saved progress; no reading was published.'});
  }
}
