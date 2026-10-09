import {createHash} from 'node:crypto';
import {waitUntil} from '@vercel/functions';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import {isHoroscopeResponseId} from '../../src/astro-writing/horoscopeWriterModels.mjs';
import {adminFetchJson,adminStorageRows,AdminHttpError} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {seasonalEditorialStorage} from './seasonal-editorial-storage.js';
import {normalizeGeminiResult,readClaudeStream,readGeminiStream} from './horoscope-provider-codecs.js';
import {persistWeeklyHoroscope,horoscopeStorageTimeoutMs} from './horoscope-storage-confirmation.js';

const GEMINI='https://generativelanguage.googleapis.com/v1beta/interactions';
const keyFor=(config:any)=>process.env[config?.provider==='gemini'?'GEMINI_API_KEY':config?.provider==='anthropic'?'ANTHROPIC_API_KEY':'OPENAI_API_KEY'];
export const claudeRequestId=(operationId:string,requestHash:string)=>`claude_${createHash('sha256').update(`${operationId}:${requestHash}`).digest('hex')}`;
export const geminiRequestId=(operationId:string,requestHash:string)=>`gemini_${createHash('sha256').update(`${operationId}:${requestHash}`).digest('hex')}`;
export const horoscopeStreamId=(operation:any)=>operation.config?.provider==='anthropic'?claudeRequestId(operation.id,operation.requestHash)
  :operation.config?.provider==='gemini'&&operation.config.transport==='checkpointed-stream/v1'?geminiRequestId(operation.id,operation.requestHash):null;
const jsonResponse=(payload:any,status=200)=>new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json'}});
const failed=(id:string,code:string)=>({id,status:'failed',error:{code},output:[]});

/** Save only into the exact reserved call. A late result cannot overwrite a
 * rejection, another stage, a replacement request, or an owner's newer prose. */
export async function saveHoroscopeStreamResult(context:any,payload:any) {
  const provider=context.provider??'anthropic';
  if(context.weekly){
    const {url,headers}=studioStorage();
    const remaining=context.deadline?context.deadline-Date.now()-1000:horoscopeStorageTimeoutMs;
    if(remaining<=0)throw new Error('provider_checkpoint_deadline');
    const saved=await adminFetchJson(url.replace(/generated_interpretations$/u,'rpc/checkpoint_weekly_provider_result'),{
      method:'POST',headers,body:JSON.stringify({p_id:context.editionId,p_operation_id:context.operationId,
        p_request_hash:context.requestHash,p_provider:provider,p_response_id:payload.id,p_result:payload})
    },Math.min(horoscopeStorageTimeoutMs,remaining));
    if(!saved.ok||!['saved','already_saved','obsolete'].includes(saved.payload as string))throw new AdminHttpError(502,'Provider result checkpoint was not confirmed.');
    return;
  }
  for(let attempt=0;attempt<3;attempt++){
    // Stop retrying before the invocation is terminated. Weekly storage also
    // bounds each read and write by this same invocation deadline.
    if(context.deadline&&Date.now()+16000>context.deadline)throw new Error('provider_checkpoint_deadline');
    if(context.seasonalRunId){
      const storage=seasonalEditorialStorage();
      const previous=await storage.read(context.seasonalRunId,context.editionId);
      if(!['starting','running'].includes(previous.status)||previous.pending?.requestHash!==context.requestHash
        ||previous.pending?.request?.config?.provider!==provider)return;
      if(previous.pending.responseId&&previous.pending.responseId!==payload.id)return;
      if(previous.pending.providerResult)return;
      const next=structuredClone(previous);
      next.pending.responseId=payload.id;next.pending.providerResult=payload;next.status='running';
      try{await storage.save(previous,next,context.editionId);return;}catch(error){if(!(error instanceof AdminHttpError)||error.statusCode!==409)throw error;}
    }else{
      const {url,headers}=studioStorage();
      const read=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${context.editionId}`,select:'*',limit:'1'})}`,{headers},Math.min(horoscopeStorageTimeoutMs,context.deadline?Math.max(1,context.deadline-Date.now()-10000):horoscopeStorageTimeoutMs));
      if(!read.ok)throw new Error('provider_result_storage_unavailable');
      const row:any=adminStorageRows(read.payload)[0],generation=row?.source_snapshot?.horoscopeGeneration,active=generation?.active;
      if(row?.status!=='DRAFT'||active?.id!==context.operationId||active?.requestHash!==context.requestHash||active.config?.provider!==provider)return;
      if(active.responseId&&active.responseId!==payload.id)return;
      if(active.providerResult)return;
      if(row.sections?.horoscopeEdition?.window?.period==='weekly'){
        try{
          await persistWeeklyHoroscope({url,headers,row,deadline:context.deadline,patch:{source_snapshot:{...row.source_snapshot,
            horoscopeGeneration:{...generation,active:{...active,state:'running',responseId:payload.id,providerResult:payload}}}}});return;
        }catch(error){if(!(error instanceof AdminHttpError)||error.statusCode!==409)throw error;continue;}
      }
      const updatedAt=new Date(Math.max(Date.now(),Date.parse(row.updated_at)+1)).toISOString();
      const result=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${row.id}`,updated_at:`eq.${row.updated_at}`})}`,{
        method:'PATCH',headers:{...headers,prefer:'return=representation'},body:JSON.stringify({updated_at:updatedAt,
          source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...generation,active:{...active,state:'running',responseId:payload.id,providerResult:payload}}}})});
      if(!result.ok)throw new Error('provider_result_storage_unavailable');
      if(adminStorageRows(result.payload).length===1)return;
    }
  }
  throw new Error('provider_result_storage_conflict');
}

export async function startHoroscopeResponse({config,role,request,instructions,context,fetchImpl=globalThis.fetch,background=waitUntil}:any) {
  const apiKey=keyFor(config);
  if(!apiKey)throw new AdminHttpError(503,'The selected writing model is not connected. No replacement model was used.');
  if(config.provider==='gemini'&&config.transport!=='checkpointed-stream/v1'){
    const response=await fetchImpl(GEMINI,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':apiKey,'Api-Revision':'2026-05-20'},body:JSON.stringify(request),signal:AbortSignal.timeout(25000)});
    return {response,payload:normalizeGeminiResult(await response.json())};
  }
  if(config.provider==='anthropic'||config.provider==='gemini'){
    const gemini=config.provider==='gemini';
    const id=(gemini?geminiRequestId:claudeRequestId)(context.operationId,context.requestHash);
    // Gemini's stored Interactions retrieval currently rejects valid auth keys.
    // Capture the original stream locally, as for Claude. Never repeat it on poll.
    const work=(async()=>{
      const checkpointContext={...context,provider:config.provider,deadline:context.deadline??Date.now()+280000};
      let payload;
      try{
        const response=await fetchImpl(gemini?GEMINI:'https://api.anthropic.com/v1/messages',{method:'POST',
          headers:gemini?{'content-type':'application/json','x-goog-api-key':apiKey,'Api-Revision':'2026-05-20'}:
            {'content-type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
          body:JSON.stringify(request),signal:AbortSignal.timeout(Math.max(1,Math.min(240000,checkpointContext.deadline-Date.now()-45000)))});
        payload=await (gemini?readGeminiStream:readClaudeStream)(response,id);
      }catch{payload=failed(id,gemini?'gemini_connection_interrupted':'claude_connection_interrupted');}
      // Storage retries cannot incur another provider charge.
      let storageFailure:any;
      for(let attempt=0;attempt<3;attempt++)try{await saveHoroscopeStreamResult(checkpointContext,payload);return;}catch(error){storageFailure=error;}
      console.error('horoscope_result_checkpoint_failed',{operationId:context.operationId,provider:config.provider,
        status:storageFailure instanceof AdminHttpError?storageFailure.statusCode:null,
        deadlineExpired:Date.now()>=checkpointContext.deadline});
    })();
    background(work);
    return {response:jsonResponse({},202),payload:{id,status:'in_progress'}};
  }
  return responses.startStoredWritingResponse({apiKey,role,request,governedInstructions:instructions,surface:'horoscopes',family:'horoscope',
    fetchImpl:(url:any,options:any)=>fetchImpl(url,{...options,signal:AbortSignal.timeout(25000)})});
}

export async function storedHoroscopeResponse({operation,cancel=false,fetchImpl=globalThis.fetch}:any) {
  const config=operation.config??operation.request?.config??{provider:'openai'},id=operation.responseId;
  if(!isHoroscopeResponseId(config,id))throw new AdminHttpError(409,'The saved writer response could not be identified.');
  if(config.provider==='anthropic'||config.provider==='gemini'&&config.transport==='checkpointed-stream/v1'){
    if(operation.providerResult){
      if(operation.providerResult.id!==id)throw new AdminHttpError(409,'The stored writer result does not match this request.');
      return jsonResponse(operation.providerResult);
    }
    // Process termination or a failed checkpoint must stop waiting. It does
    // not authorize replaying a possibly billed writer request.
    return jsonResponse(Date.now()-Date.parse(operation.startedAt)>285000
      ?failed(id,config.provider==='gemini'?'gemini_checkpoint_unavailable':'claude_checkpoint_unavailable'):{id,status:'in_progress'});
  }
  const apiKey=keyFor(config);
  if(!apiKey)throw new AdminHttpError(503,'Restore this request’s model connection to retrieve its saved result.');
  if(config.provider==='gemini'){
    const response=await fetchImpl(`${GEMINI}/${encodeURIComponent(id)}${cancel?'/cancel':''}`,{
      ...(cancel?{method:'POST'}:{}),headers:{'x-goog-api-key':apiKey,'Api-Revision':'2026-05-20'},signal:AbortSignal.timeout(20000)});
    const payload=await response.json();
    if(response.status===400&&payload?.error?.code==='invalid_request'
      &&payload.error.message==='Multiple authentication credentials received. Please pass only one.'){
      return jsonResponse({id,status:'failed',error:{code:'gemini_retrieval_authentication'}},424);
    }
    return jsonResponse(normalizeGeminiResult(payload),response.status);
  }
  return responses.storedWritingResponse({apiKey,responseId:id,cancel,fetchImpl});
}
