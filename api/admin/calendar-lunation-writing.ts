import type {IncomingMessage,ServerResponse} from 'node:http';
import {randomUUID} from 'node:crypto';
import {getContentAdminPrincipal,requireContentAdmin} from '../_lib/admin-auth.js';
import {loadLocalWebEnv} from '../_lib/local-env.js';
import {AdminHttpError,readAdminJsonBody,sendAdminJson,sendAdminMethodNotAllowed,adminErrorStatus} from '../_lib/admin-http.js';
import {workspaceKey,readLunarRow,saveLunarRow,loadLunarProfile,validateWorkspace,prepareStudioLunation,lunarPlanPreview,runStudioLunation,lunarFeedback,emptyLunationWorkspace,LUNATION_PROFILE_KEY,validateLunationProfile} from '../_lib/calendar-lunation-studio.js';
import {lunationDigest} from '../../src/astro-writing/lunationWritingFacts.mjs';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import provider from '../../src/astro-writing/offlineProviderConfig.cjs';
loadLocalWebEnv();
export const maxDuration=300;
class Captured extends Error {}

function output(payload:any) {
  const text=payload.output?.filter((item:any)=>item.type==='message').flatMap((item:any)=>item.content??[]).filter((item:any)=>item.type==='output_text').map((item:any)=>item.text).join('');
  let value:any;try{value=JSON.parse(text);}catch{throw new AdminHttpError(422,'The writer returned no usable structured draft.');}
  if(!value||Object.keys(value).some(k=>!['body','journalPrompt'].includes(k))||['body','journalPrompt'].some(k=>typeof value[k]!=='string'||!value[k].trim()||value[k].length>60000))throw new AdminHttpError(422,'The writer returned an invalid draft.');
  return value;
}
export default async function handler(req:IncomingMessage,res:ServerResponse) {
  if(!['GET','POST'].includes(req.method??''))return sendAdminMethodNotAllowed(res,['GET','POST']);
  if(!await requireContentAdmin(req,res))return;
  const actor=(await getContentAdminPrincipal(req))!;
  try {
    const input:any=req.method==='GET'?Object.fromEntries(new URL(req.url!,'http://localhost').searchParams):await readAdminJsonBody(req,180000);
    const allowed=['action','phase','sign','expectedUpdatedAt','workspace','profile','approvedPlanHash','authorizeWriterCall'];
    if(Object.keys(input).some(k=>!allowed.includes(k)))throw new AdminHttpError(400,'Unknown lunar writing request field.');
    const action=req.method==='GET'?'load':input.action;
    if(!['load','save','save-profile','prepare','generate','poll'].includes(action))throw new AdminHttpError(400,'Choose a lunar writing action.');
    if(action==='save-profile') {
      let profile;try{profile=validateLunationProfile(input.profile);}catch(error){throw new AdminHttpError(400,(error as Error).message);}
      const row=await readLunarRow(LUNATION_PROFILE_KEY);
      await saveLunarRow(LUNATION_PROFILE_KEY,input.expectedUpdatedAt,{writingProfile:profile},row,actor);
      return sendAdminJson(res,200,{ok:true,profile:await loadLunarProfile()});
    }
    let key:string;try{key=workspaceKey(input.phase,input.sign);}catch(error){throw new AdminHttpError(400,(error as Error).message);}
    let row=await readLunarRow(key);
    if(action==='load') {
      const workspace=row?.sections?.lunationWorkspace??emptyLunationWorkspace(input.phase,input.sign);
      const [profile,feedback]=await Promise.all([loadLunarProfile(),lunarFeedback(workspace.contentKey)]);
      return sendAdminJson(res,200,{ok:true,row,workspace,profile,feedback:feedback.rows,configured:Boolean(process.env.OPENAI_API_KEY)});
    }
    if(input.expectedUpdatedAt!==(row?.updated_at??null))throw new AdminHttpError(409,'This lunar workspace changed. Reload; newer edits are preserved.');
    const persist=async(sections:any)=>{row=await saveLunarRow(key,row?.updated_at??null,sections,row,actor);return row;};
    if(action==='save') {
      if(row?.sections?.lunationRun?.active)throw new AdminHttpError(409,'A writer request is still running. Retrieve its result before editing.');
      const workspace=validateWorkspace(input.workspace,input.phase,input.sign);
      // Manual edits preserve past receipts but invalidate the old plan approval.
      await persist({...row?.sections,lunationWorkspace:workspace,approvedPlan:null});
      return sendAdminJson(res,200,{ok:true,row});
    }
    if(!row)throw new AdminHttpError(409,'Save this lunar workspace before preparing or writing.');
    const workspace=validateWorkspace(row.sections.lunationWorkspace,input.phase,input.sign);
    let operation=row.sections?.lunationRun?.active;
    if(action==='prepare') {
      const prepared=await prepareStudioLunation(workspace);
      const approval=row.sections.approvedPlan;
      const approved=approval?.outlineHash===prepared.prepared.argumentOutline.outlineHash&&approval?.callAuthorization?.outlineHash===approval.outlineHash&&approval?.sourceUri?.startsWith('thread:')&&!row.sections.lunationRun?.lastResult&&!row.sections.lunationRun?.active;
      return sendAdminJson(res,200,{ok:true,plan:{...lunarPlanPreview(prepared),previouslyApproved:Boolean(approved)},configured:Boolean(process.env.OPENAI_API_KEY)});
    }
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey)throw new AdminHttpError(503,'The Studio writer is unavailable on this server. Open the connected Content Studio to generate.');
    if(action==='generate'&&operation)throw new AdminHttpError(409,'This request is already running. Retrieve its saved result instead of starting another call.');
    if(action==='poll'&&!operation)return sendAdminJson(res,200,{ok:true,row,pending:false});
    const finish=async(payload:any)=>{
      if(['queued','in_progress'].includes(payload.status))return sendAdminJson(res,202,{ok:true,row,pending:true});
      let candidate:any;
      try {if(payload.status!=='completed')throw new AdminHttpError(422,'The writer did not complete this request. No automatic retry was made.');candidate=output(payload);}
      catch(error){await persist({...row.sections,lunationRun:{...row.sections.lunationRun,active:null,lastError:{message:(error as Error).message,operationId:operation.id,responseId:operation.responseId}}});return sendAdminJson(res,422,{ok:false,row,error:(error as Error).message});}
      // Save the result before validation so a disconnect or changed evidence cannot lose paid output.
      await persist({...row.sections,lunationRun:{...row.sections.lunationRun,active:operation,recovered:{candidate,responseId:payload.id,outputHash:lunationDigest(candidate)}}});
      let lint:any=null,reviewStatus='needs_review',validationError:string|null=null;
      try {
        const prepared=await prepareStudioLunation(workspace,operation.facts);
        if(prepared.planHash!==operation.planHash)throw new Error('Writing guidance or evidence changed during generation. Review the saved candidate against the current plan.');
        const client=Object.assign(async()=>candidate,{billed:false,provider:'openai',model:operation.config.model,reasoningEffort:operation.config.reasoningEffort});
        const result=await runStudioLunation(prepared,workspace,client,operation.approvalReference,operation.approvalRuling);
        if(!result.draft)throw new Error('The candidate needs evidence review before it can be used.');
        lint=result.lint;reviewStatus=result.status;
      }catch(error){validationError=(error as Error).message;}
      const receipt={operationId:operation.id,responseId:payload.id,requestHash:operation.requestHash,outputHash:lunationDigest(candidate),planHash:operation.planHash,outlineHash:operation.outlineHash,profile:operation.profile,feedback:operation.feedback,config:operation.config,usage:payload.usage??null,lint,validationError,reviewStatus,completedAt:new Date().toISOString(),ownerApproved:false,promotionAuthorized:false};
      await persist({...row.sections,lunationWorkspace:{...workspace,...candidate},lunationRun:{active:null,lastError:null,lastResult:receipt,previousCandidate:row.sections.lunationRun.previousCandidate},approvedPlan:row.sections.approvedPlan});
      return sendAdminJson(res,200,{ok:true,row,pending:false});
    };
    if(action==='poll') {
      if(!operation.responseId)throw new AdminHttpError(409,'The provider outcome is not yet confirmed. This request stays reserved to prevent duplicate billing; do not start another call.');
      const response=await responses.storedWritingResponse({apiKey,responseId:operation.responseId});
      if(!response.ok)throw new AdminHttpError(503,'The saved writer result is temporarily unavailable. Retry retrieval to check the same request.');
      const payload=await response.json();
      if(payload.id!==operation.responseId)throw new AdminHttpError(502,'The writer returned a different response ID.');
      return await finish(payload);
    }
    const prepared=await prepareStudioLunation(workspace);
    if(input.approvedPlanHash!==prepared.planHash||input.authorizeWriterCall!==true)throw new AdminHttpError(409,'Review the current plan and authorize one writer call.');
    const previousApproval=row.sections.approvedPlan;
    const inherited=previousApproval?.outlineHash===prepared.prepared.argumentOutline.outlineHash&&previousApproval?.sourceUri?.startsWith('thread:');
    operation={id:randomUUID(),state:'starting',responseId:null,startedAt:new Date().toISOString(),actor,planHash:prepared.planHash,outlineHash:prepared.prepared.argumentOutline.outlineHash,
      approvalReference:inherited?previousApproval.sourceUri:`studio-lunation-plan/${row.id}/${row.updated_at}`,
      approvalRuling:inherited?previousApproval.exactOwnerRuling:'I approve this exact plan and one writer call.',
      facts:prepared.facts,savedWriting:prepared.savedWriting,profile:{id:prepared.profile.id,revision:prepared.profile.revision,sha256:prepared.profile.sha256},feedback:prepared.feedback.receipt,config:provider.normalizeProviderConfig({},'writer')};
    let captured:any;
    const capture=Object.assign(async(value:any)=>{captured=value;throw new Captured();},{billed:false});
    try{await runStudioLunation(prepared,workspace,capture,operation.approvalReference,operation.approvalRuling);}catch(error){if(!(error instanceof Captured))throw error;}
    if(!captured)throw new AdminHttpError(422,'The governed evidence did not authorize a draft. No writer call was made.');
    const request={...provider.buildProviderRequest({config:operation.config,role:'writer',input:captured.input,schema:captured.schema}),background:true,store:true};
    operation.requestHash=lunationDigest({request,instructions:captured.instructions});
    await persist({...row.sections,lunationRun:{...row.sections.lunationRun,active:operation,lastError:null,previousCandidate:{body:workspace.body,journalPrompt:workspace.journalPrompt}},approvedPlan:{outlineHash:operation.outlineHash,planHash:operation.planHash,sourceUri:operation.approvalReference,exactOwnerRuling:operation.approvalRuling}});
    const {response,payload}=await responses.startStoredWritingResponse({apiKey,role:captured.role,request,governedInstructions:captured.instructions,surface:'calendar-lunation',family:'lunations',fetchImpl:(url:any,options:any)=>fetch(url,{...options,signal:AbortSignal.timeout(25000)})});
    if(!response.ok) {
      if(response.status>=400&&response.status<500){await persist({...row.sections,lunationRun:{...row.sections.lunationRun,active:null,lastError:{message:'The provider declined the request. No automatic retry was made.',operationId:operation.id}}});}
      throw new AdminHttpError(503,'The Studio writer could not confirm a result. Reload to check the saved request before retrying.');
    }
    if(typeof payload.id!=='string'||!/^resp_[A-Za-z0-9_-]+$/u.test(payload.id))throw new AdminHttpError(502,'No provider response ID was confirmed. The request remains reserved.');
    operation={...operation,responseId:payload.id,state:'running'};
    await persist({...row.sections,lunationRun:{...row.sections.lunationRun,active:operation}});
    return await finish(payload);
  }catch(error){sendAdminJson(res,adminErrorStatus(error),{ok:false,error:error instanceof Error?error.message:'Lunar writing failed. Saved content was preserved.'});}
}
