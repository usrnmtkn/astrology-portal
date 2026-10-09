import type {IncomingMessage,ServerResponse} from 'node:http';
import {randomUUID} from 'node:crypto';
import {getContentAdminPrincipal,requireContentAdmin} from '../_lib/admin-auth.js';
import {loadLocalWebEnv} from '../_lib/local-env.js';
import {AdminHttpError,readAdminJsonBody,sendAdminJson,sendAdminMethodNotAllowed,adminErrorStatus} from '../_lib/admin-http.js';
import {DAILY_PROFILE_KEY,PROFILE_FIELDS,emptyProfile,target,validateTextFields,readDailyRow,saveDailyRow,prepareDaily,digest} from '../_lib/calendar-daily-writing.js';
import responses from '../../src/astro-writing/openAIResponses.cjs';
loadLocalWebEnv();
export const maxDuration=300;
export default async function handler(req:IncomingMessage,res:ServerResponse) {
  if(!['GET','POST'].includes(req.method??''))return sendAdminMethodNotAllowed(res,['GET','POST']);
  if(!await requireContentAdmin(req,res))return;
  const actor=(await getContentAdminPrincipal(req))!;
  try{
    const input:any=req.method==='GET'?Object.fromEntries(new URL(req.url!,'http://localhost').searchParams):await readAdminJsonBody(req,1000000);
    if(Object.keys(input).some(k=>!['action','date','timeZone','expectedUpdatedAt','profile','workspace','requestHash','authorizeWriterCall'].includes(k)))throw new AdminHttpError(400,'Unknown daily writing request field.');
    const action=req.method==='GET'?'load':input.action;
    if(!['load','save-profile','save','prepare','generate','poll'].includes(action))throw new AdminHttpError(400,'Choose a daily writing action.');
    if(action==='save-profile'){
      const profile=validateTextFields(input.profile,PROFILE_FIELDS,30000),row=await readDailyRow(DAILY_PROFILE_KEY);
      const saved=await saveDailyRow(DAILY_PROFILE_KEY,input.expectedUpdatedAt,{...row?.sections,profile},row,actor);
      return sendAdminJson(res,200,{ok:true,profileRow:saved});
    }
    const key=target(input.date,input.timeZone);
    let row=await readDailyRow(key);
    if(action==='load')return sendAdminJson(res,200,{ok:true,row,workspace:row?.sections.workspace??{thought:'',exclusions:''},profileRow:await readDailyRow(DAILY_PROFILE_KEY),emptyProfile:emptyProfile(),configured:Boolean(process.env.OPENAI_API_KEY)});
    if(input.expectedUpdatedAt!==(row?.updated_at??null))throw new AdminHttpError(409,'This daily workspace changed. Reload before continuing.');
    const persist=async(sections:any)=>row=await saveDailyRow(key,row?.updated_at??null,sections,row,actor);
    if(action==='save'){
      if(row?.sections.run?.active)throw new AdminHttpError(409,'Retrieve the running request before editing this thought.');
      const workspace=validateTextFields(input.workspace,['thought','exclusions'],12000);
      await persist({...row?.sections,workspace});
      return sendAdminJson(res,200,{ok:true,row});
    }
    if(!row)throw new AdminHttpError(409,'Save the thought for this date first.');
    const workspace=validateTextFields(row.sections.workspace,['thought','exclusions'],12000);
    let operation=row.sections.run?.active;
    if(action==='prepare')return sendAdminJson(res,200,{ok:true,prepared:await prepareDaily(input.date,input.timeZone,workspace)});
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey)throw new AdminHttpError(503,'The daily writer is not configured on this server.');
    if(action==='generate'&&operation)throw new AdminHttpError(409,'This request is already reserved. Retrieve its result; do not start another call.');
    if(action==='poll'&&!operation)return sendAdminJson(res,200,{ok:true,row,pending:false});
    const finish=async(payload:any)=>{
      if(['queued','in_progress'].includes(payload.status))return sendAdminJson(res,202,{ok:true,row,pending:true});
      const candidate=(Array.isArray(payload.output)?payload.output:[]).filter((v:any)=>v?.type==='message').flatMap((v:any)=>Array.isArray(v.content)?v.content:[]).filter((v:any)=>v?.type==='output_text'&&typeof v.text==='string').map((v:any)=>v.text).join('');
      const valid=payload.status==='completed'&&typeof candidate==='string'&&candidate.trim().length>0;
      const result={...operation,response:payload,candidate,outputHash:digest(candidate),completedAt:new Date().toISOString(),status:valid?'needs_review':'invalid',ownerApproved:false,promotionAuthorized:false};
      // Preserve the untouched response, including invalid/partial output. No evaluator or rewrite call follows.
      await persist({...row.sections,run:{active:null,results:[...(row.sections.run?.results??[]),result]}});
      return sendAdminJson(res,200,{ok:true,row,pending:false,invalid:!valid});
    };
    if(action==='poll'){
      if(!operation.responseId)throw new AdminHttpError(409,'The provider outcome is uncertain. The request remains reserved to prevent duplicate billing.');
      const response=await responses.storedWritingResponse({apiKey,responseId:operation.responseId});
      if(!response.ok)throw new AdminHttpError(503,'The saved response is temporarily unavailable. Retrieve again to check the same request.');
      const payload=await response.json();
      if(payload.id!==operation.responseId)throw new AdminHttpError(502,'The provider returned a different response ID.');
      return await finish(payload);
    }
    const prepared=await prepareDaily(input.date,input.timeZone,workspace);
    if(input.authorizeWriterCall!==true||input.requestHash!==prepared.requestHash)throw new AdminHttpError(409,'Review the current input and explicitly authorize one writer call.');
    if((row.sections.run?.results??[]).some((r:any)=>r.requestHash===prepared.requestHash))throw new AdminHttpError(409,'This exact input already has a saved result. Review it before changing the input.');
    operation={id:randomUUID(),startedAt:new Date().toISOString(),actor,responseId:null,...prepared};
    // Compare-and-swap reserves the request before any paid dispatch, including concurrent tabs.
    await persist({...row.sections,run:{...row.sections.run,active:operation}});
    const {response,payload}=await responses.startStoredWritingResponse({apiKey,role:'WRITER',surface:'calendar-daily',family:'calendar-daily',request:prepared.request,governedInstructions:prepared.instructions,fetchImpl:(url:any,options:any)=>fetch(url,{...options,signal:AbortSignal.timeout(25000)})});
    if(!response.ok||typeof payload.id!=='string'||!/^resp_[A-Za-z0-9_-]+$/u.test(payload.id))throw new AdminHttpError(503,'No writer result was confirmed. The saved request stays reserved; no retry was made.');
    operation={...operation,responseId:payload.id};
    await persist({...row.sections,run:{...row.sections.run,active:operation}});
    return await finish(payload);
  }catch(error){return sendAdminJson(res,adminErrorStatus(error),{ok:false,error:error instanceof Error?error.message:'Daily writing failed. Reload the saved workspace.'});}
}
