import type {IncomingMessage,ServerResponse} from 'node:http';
import {assertCleanReaderCopy} from '../../apps/web/src/content/editorialCopyBoundary.mjs';
import {validateCmsTemplate} from '../../apps/web/src/content/cmsTemplateValidation.js';
import {randomUUID} from 'node:crypto';
import {getContentAdminPrincipal} from '../_lib/admin-auth.js';
import {loadLocalWebEnv} from '../_lib/local-env.js';
import {AdminHttpError,adminFetchJson,adminStorageRows,readAdminJsonBody,sendAdminJson,sendAdminMethodNotAllowed,adminErrorStatus} from '../_lib/admin-http.js';
import {studioStorage} from '../_lib/sky-studio-sources.js';
import {calculateLunationArticleFacts,lunationArticleEvents} from '../_lib/lunation-article-facts.js';
import {prepareLunationArticle,writeLunationArticle,lunationArticleHash as hash} from '../../src/astro-writing/lunationArticleWriting.mjs';
import {LUNATION_ARTICLE_PROTOCOL_VERSION} from '../../src/astro-writing/lunationArticleInput.mjs';
import {validateLunationArticle} from '../../src/astro-writing/lunationArticleValidation.mjs';
import {loadLunarProfile,lunarFeedback} from '../_lib/calendar-lunation-studio.js';
import {datedLunationContentKey} from '../../apps/web/src/content/lunationArticleIdentity.js';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import provider from '../../src/astro-writing/offlineProviderConfig.cjs';
loadLocalWebEnv();
export const maxDuration=300;
const prefix='studio-lunation/';
class Pending extends Error {}
async function prepareSharedArticle(facts:any,direction:string) {
  const [writingProfile,feedback]=await Promise.all([loadLunarProfile(),lunarFeedback(datedLunationContentKey(facts.event),'lunation-article')]);
  if(!writingProfile.id)throw new AdminHttpError(409,'Save the shared writing guidance before preparing a dated article.');
  return prepareLunationArticle(facts,direction,{writingProfile,privateCorrections:feedback.corrections,feedbackReceipt:feedback.receipt});
}

export default async function handler(req:IncomingMessage,res:ServerResponse) {
  if(!['GET','POST'].includes(req.method??''))return sendAdminMethodNotAllowed(res,['GET','POST']);
  const actor=await getContentAdminPrincipal(req);
  if(!actor)return sendAdminJson(res,401,{ok:false,error:'Unauthorized.'});
  try {
    const {url,headers}=studioStorage();
    const read=async(params:Record<string,string>)=>{
      const result=await adminFetchJson(`${url}?${new URLSearchParams(params)}`,{headers});
      if(!result.ok)throw new AdminHttpError(503,'Saved lunation drafts could not be loaded.');
      return adminStorageRows(result.payload) as Record<string,any>[];
    };
    if(req.method==='GET') {
      const params=new URL(req.url??'','http://studio').searchParams;
      if(params.has('month'))return sendAdminJson(res,200,{ok:true,events:await lunationArticleEvents(params.get('month')!,params.get('timeZone')??'America/New_York')});
      const id=params.get('id');
      if(params.has('id')&&(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))throw new AdminHttpError(400,'Choose a valid saved draft.');
      const rows=await read({content_key:`like.${prefix}*`,mode:'eq.article',select:'*',order:'updated_at.desc',limit:id?'1':'100',...(id?{id:`eq.${id}`}:{})});
      if(id&&!rows.length)throw new AdminHttpError(404,'This saved lunar draft is unavailable. Refresh saved drafts and try again.');
      return sendAdminJson(res,200,{ok:true,rows});
    }
    const input=await readAdminJsonBody<Record<string,any>>(req,96000);
    const allowed:Record<string,string[]>={prepare:['action','month','timeZone','eventId','direction'],review:['action','id','expectedUpdatedAt','direction'],generate:['action','id','expectedUpdatedAt','approvedPlanHash'],poll:['action','id','expectedUpdatedAt'],save:['action','id','expectedUpdatedAt','headline','body'],release:['action','id','expectedUpdatedAt','acknowledgeUnknownOutcome'],stage:['action','id','expectedUpdatedAt']};
    if(!allowed[input.action]||Object.keys(input).some(k=>!allowed[input.action].includes(k)))throw new AdminHttpError(400,'Choose a supported lunation writing action.');
    if(input.action==='prepare') {
      if(typeof input.month!=='string'||typeof input.timeZone!=='string'||typeof input.eventId!=='string'||typeof input.direction!=='string'||input.direction.length>6000)throw new AdminHttpError(400,'Choose an event and keep the writing direction under 6,000 characters.');
      const facts=await calculateLunationArticleFacts(input.month,input.timeZone,input.eventId);
      const key=`${prefix}${facts.event.startsAt.slice(0,10)}/${facts.event.phase}/${facts.event.sign.toLowerCase()}`;
      const existing=await read({content_key:`eq.${key}`,mode:'eq.article',target_date:'is.null',select:'*',limit:'1'});
      if(existing.length)return sendAdminJson(res,200,{ok:true,rows:existing,existing:true});
      const prepared=await prepareSharedArticle(facts,input.direction);
      const result=await adminFetchJson(url,{method:'POST',headers:{...headers,prefer:'return=representation'},body:JSON.stringify({
        content_key:key,mode:'article',target_date:null,surface:'sky',event_type:'lunation-article-draft',block_type:'sky_article',provider:'manual-admin',
        status:'DRAFT',lane:'reference',review_state:'owner-review-required',headline:facts.event.title,summary:'',body:'',sections:{},facts:{lunationArticle:facts},
        source_snapshot:{lunationWriting:{version:LUNATION_ARTICLE_PROTOCOL_VERSION,direction:input.direction,planHash:prepared.planHash,preview:prepared.preview,active:null}},updated_at:new Date().toISOString()
      })});
      if(!result.ok)throw new AdminHttpError(result.status===409?409:503,'The draft could not be created. Reload saved drafts before retrying.');
      const rows=adminStorageRows(result.payload);
      if(rows.length!==1)throw new AdminHttpError(503,'Storage did not confirm the draft. Reload saved drafts before retrying.');
      return sendAdminJson(res,200,{ok:true,rows});
    }
    if(typeof input.id!=='string'||typeof input.expectedUpdatedAt!=='string')throw new AdminHttpError(400,'Open a saved draft first.');
    let row=(await read({id:`eq.${input.id}`,select:'*',limit:'1'}))[0];
    if(!row||!row.content_key?.startsWith(prefix)||row.mode!=='article'||row.status!=='DRAFT'||row.lane!=='reference')throw new AdminHttpError(404,'Lunation draft not found.');
    if(row.updated_at!==input.expectedUpdatedAt)throw new AdminHttpError(409,'This draft changed. Reload it before continuing; your open text has been preserved.');
    const persist=async(patch:Record<string,unknown>)=>{
      const result=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${row.id}`,updated_at:`eq.${row.updated_at}`})}`,{method:'PATCH',headers:{...headers,prefer:'return=representation'},body:JSON.stringify({...patch,updated_at:new Date(Math.max(Date.now(),Date.parse(row.updated_at)+1)).toISOString()})});
      const saved=adminStorageRows(result.payload) as Record<string,any>[];
      if(!result.ok||saved.length!==1||saved[0].id!==row.id||saved[0].updated_at===row.updated_at)throw new AdminHttpError(409,'The save was not confirmed. Reload before retrying; newer edits were preserved.');
      row=saved[0];return row;
    };
    const state=()=>row.source_snapshot.lunationWriting;
    const persistState=async(value:Record<string,unknown>,patch:Record<string,unknown>={})=>persist({...patch,source_snapshot:{...row.source_snapshot,lunationWriting:{...state(),...value}}});
    let operation=state().active;
    if(input.action==='stage') {
      if(operation||!row.body.trim())throw new AdminHttpError(409,'Save a complete article before opening its reader draft.');
      const contentKey=datedLunationContentKey(row.facts.lunationArticle.event);
      if(!contentKey)throw new AdminHttpError(409,'The saved article has no verified event identity.');
      const existing=await read({content_key:`eq.${contentKey}`,mode:'eq.article',target_date:'is.null',select:'id',limit:'1'});
      if(!existing.length){
        try{assertCleanReaderCopy({headline:row.headline,body:row.body});}catch{throw new AdminHttpError(422,'Remove internal drafting notes before creating a reader draft.');}
        const validation=validateCmsTemplate({allowedSlots:[],headline:row.headline,summary:'',body:row.body});
        if(validation.errors.length)throw new AdminHttpError(422,`Reader draft cannot be created: ${validation.errors.join(' ')}`);
        const saved=await adminFetchJson(url,{method:'POST',headers:{...headers,prefer:'return=representation'},body:JSON.stringify({
          content_key:contentKey,surface:'sky',mode:'article',target_date:null,event_type:'lunation-article',status:'DRAFT',lane:'serving',review_state:null,
          headline:row.headline,summary:'',body:row.body,facts:row.facts,sections:{},provider:'manual-admin',prompt_version:'lunation-reader-draft-v1',block_type:'sky_article',
          source_snapshot:{contentSystem:'cms-surface-override',allowedSlots:[],lunationWorkspace:{id:row.id,updatedAt:row.updated_at,
            lint:validateLunationArticle({headline:row.headline,body:row.body},row.facts.lunationArticle)}},updated_at:new Date().toISOString()
        })});
        const records=adminStorageRows<any>(saved.payload);
        if(!saved.ok||records.length!==1||records[0].content_key!==contentKey||records[0].body!==row.body)throw new AdminHttpError(409,'The reader draft save was not confirmed. Reopen it before retrying; existing edits were preserved.');
      }
      return sendAdminJson(res,200,{ok:true,contentKey,existing:existing.length>0});
    }
    if(input.action==='review') {
      if(operation||row.body.trim())throw new AdminHttpError(409,'This draft already contains writing or has a running request.');
      if(typeof input.direction!=='string'||input.direction.length>6000)throw new AdminHttpError(400,'Keep the writing direction under 6,000 characters.');
      const prepared=await prepareSharedArticle(row.facts.lunationArticle,input.direction);
      await persistState({direction:input.direction,planHash:prepared.planHash,preview:prepared.preview});
      return sendAdminJson(res,200,{ok:true,rows:[row]});
    }
    if(input.action==='save') {
      if(operation)throw new AdminHttpError(409,'Retrieve the running draft before editing it.');
      if(typeof input.headline!=='string'||!input.headline.trim()||input.headline.length>200||typeof input.body!=='string'||input.body.length>40000)throw new AdminHttpError(400,'Enter a title and an article under 40,000 characters.');
      await persistState({lint:validateLunationArticle(input,row.facts.lunationArticle),ownerApproved:false,promotionAuthorized:false},{headline:input.headline,body:input.body,review_state:'owner-review-required'});
      return sendAdminJson(res,200,{ok:true,rows:[row]});
    }
    if(input.action==='release') {
      if(!operation||Date.now()-Date.parse(operation.startedAt)<310000||input.acknowledgeUnknownOutcome!==true)throw new AdminHttpError(409,'Wait five minutes, then acknowledge the interrupted request before releasing it.');
      if(operation.responseId)throw new AdminHttpError(409,'A confirmed writer request exists. Retrieve it before starting another.');
      await persistState({active:null,lastError:'An interrupted request was released. Its provider outcome is unknown.',lastInterrupted:{...operation,releasedAt:new Date().toISOString(),releasedBy:actor}});
      return sendAdminJson(res,200,{ok:true,rows:[row]});
    }
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey)throw new AdminHttpError(503,'The lunation writer is not connected. Configure the server OpenAI API key.');
    if(input.action==='poll') {
      if(!operation)return sendAdminJson(res,200,{ok:true,rows:[row],pending:false});
      if(!operation.responseId)throw new AdminHttpError(409,'The request has no confirmed response ID yet. Reload in a moment.');
      const response=await responses.storedWritingResponse({apiKey,responseId:operation.responseId});
      const payload:any=await response.json();
      if(!response.ok)throw new AdminHttpError(503,'The writer result is temporarily unavailable. Retrieve the same request again.');
      if(['queued','in_progress'].includes(payload.status))return sendAdminJson(res,202,{ok:true,rows:[row],pending:true});
      let value:any;
      try {
        if(payload.status!=='completed')throw new Error();
        value=JSON.parse(payload.output?.filter((m:any)=>m.type==='message').flatMap((m:any)=>m.content??[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join(''));
        if(!value||Object.keys(value).some(k=>!['headline','body'].includes(k))||typeof value.headline!=='string'||!value.headline.trim()||value.headline.length>200||typeof value.body!=='string'||!value.body.trim()||value.body.length>40000)throw new Error();
      }catch{
        await persistState({active:null,lastError:'The writer did not complete a usable article. Review the plan before trying again.',lastFailed:operation});
        return sendAdminJson(res,422,{ok:false,error:state().lastError,rows:[row]});
      }
      const lint=validateLunationArticle(value,row.facts.lunationArticle);
      await persistState({active:null,lastError:null,lint,receipt:{...operation,completedAt:new Date().toISOString(),usage:payload.usage??null,bodyHash:hash(value),ownerApproved:false,promotionAuthorized:false}},value);
      return sendAdminJson(res,200,{ok:true,rows:[row],pending:false});
    }
    if(operation)throw new AdminHttpError(409,'A draft is already running. Retrieve its result before starting another.');
    if(row.body.trim())throw new AdminHttpError(409,'This draft already contains writing. Edit the saved article; generation will not replace it.');
    const prepared=await prepareSharedArticle(row.facts.lunationArticle,state().direction);
    if(input.approvedPlanHash!==prepared.planHash||state().planHash!==prepared.planHash)throw new AdminHttpError(409,'The writing sources or plan changed. Select Update writing plan, review it again, then choose Generate draft.');
    const config=provider.normalizeProviderConfig({},'writer');
    operation={id:randomUUID(),startedAt:new Date().toISOString(),actor,responseId:null,config,planHash:prepared.planHash,
      version:LUNATION_ARTICLE_PROTOCOL_VERSION,sourceHashes:prepared.sources,sourceIds:prepared.context.sameFamilyExamples.map((e:any)=>e.id),
      writingProfile:prepared.writingProfile,feedback:{selected:prepared.feedbackReceipt,scope:datedLunationContentKey(row.facts.lunationArticle.event)}};
    await persistState({active:operation,lastError:null});
    let dispatched=false;
    const writerClient=Object.assign(async({role,instructions,input:prompt,schema}:any)=>{
      const request={...provider.buildProviderRequest({config,role:'writer',input:prompt,schema}),background:true,store:true};
      operation={...operation,requestHash:hash({request,instructions})};await persistState({active:operation});
      dispatched=true;
      const {response,payload}:any=await responses.startStoredWritingResponse({apiKey,role,request,governedInstructions:instructions,surface:'lunation-article',family:'lunation-article',fetchImpl:(url:any,options:any)=>fetch(url,{...options,signal:AbortSignal.timeout(25000)})});
      if(!response.ok) {
        if(response.status>=400&&response.status<500){await persistState({active:null,lastError:'The writer declined the request. Check its configuration or quota.',lastFailed:operation});}
        throw new AdminHttpError(503,'The writer request did not complete. Reload the draft to check its saved state.');
      }
      if(typeof payload.id!=='string'||!/^resp_[A-Za-z0-9_-]+$/u.test(payload.id))throw new AdminHttpError(502,'The writer did not confirm a response ID. Reload before retrying.');
      operation={...operation,responseId:payload.id};await persistState({active:operation});throw new Pending();
    },{provider:'openai',model:config.model,reasoningEffort:config.reasoningEffort,billed:true});
    try {
      const result=await writeLunationArticle(prepared,{approvedPlanHash:input.approvedPlanHash,approvalReference:`studio-lunation/${row.id}/${operation.id}`,writerClient});
      if(!result.draft)throw new AdminHttpError(422,'The required writing evidence could not be prepared.');
    }catch(error){
      if(error instanceof Pending)return sendAdminJson(res,202,{ok:true,rows:[row],pending:true});
      if(!dispatched)await persistState({active:null,lastError:'Writing preparation failed before any model call.'});
      throw error;
    }
  }catch(error){
    return sendAdminJson(res,adminErrorStatus(error),{ok:false,error:error instanceof AdminHttpError?error.message:'The lunation draft could not be prepared. Reopen the workspace; no article was published.'});
  }
}
