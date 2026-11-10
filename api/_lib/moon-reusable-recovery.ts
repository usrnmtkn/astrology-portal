import {createHash} from 'node:crypto';
import {AdminHttpError,adminFetchJson} from './admin-http.js';
import {approvedSourceBaseline} from './approved-source-recovery.js';
import {lunationArticleEvents} from './lunation-article-facts.js';
import {moonHoroscopeKey} from '../../src/shared/datedMoonIdentity.mjs';
import {lunationHoroscopeIdentities} from '../../src/shared/lunationHoroscopeIdentities.js';
import {validContentPublication,publicationRestoresBaseline,publicationTimestamp} from '../../apps/web/src/content/contentPublicationState.js';

const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/iu;
const kind='moon-reusable';
function canonical(value:any):any{return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;}
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function storage(){
  const base=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key)throw new AdminHttpError(503,'Moon recovery storage is unavailable.');
  const headers={apikey:key,authorization:`Bearer ${key}`};
  return async(path:string,body?:unknown)=>{
    const response=await adminFetchJson(`${base}/rest/v1/${path}`,{headers:{...headers,...(body?{'content-type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});
    if(!response.ok){const code=(response.payload as {code?:unknown}|null)?.code;throw new AdminHttpError(code==='40001'?409:code==='22023'?422:503,code==='40001'?'The Moon readings or publication changed. Reload before recovery.':'Moon recovery was not confirmed. Check its status before continuing.');}
    return response.payload;
  };
}
type Store=ReturnType<typeof storage>;
async function sourceRow(get:Store,id:string,allowMissing=false){
  const rows=await get(`generated_interpretations?${new URLSearchParams({id:`eq.${id}`,select:'id,content_key,updated_at,status,surface,mode,event_type,target_date,facts'})}`);
  if(!Array.isArray(rows)||rows.length>1)throw new AdminHttpError(503,'The archived Moon readings could not be verified.');
  if(!rows.length){if(allowMissing)return null;throw new AdminHttpError(409,'The archived Moon readings could not be verified.');}
  return {...rows[0],event:rows[0].facts?.lunationHoroscopes?.event};
}
async function baseline(row:any){
  const event=row.event;
  if(row.status!=='ARCHIVED'||row.surface!=='sky'||row.mode!=='article'||row.event_type!=='lunation-horoscopes'||row.target_date!=null
    ||!event||row.content_key!==moonHoroscopeKey(event)||event.eclipseType||typeof event.timeZone!=='string')
    throw new AdminHttpError(422,'Select an archived dated Moon horoscope set with reusable readings.');
  let month:string;
  try{month=new Intl.DateTimeFormat('en-CA',{timeZone:event.timeZone,year:'numeric',month:'2-digit'}).format(new Date(event.startsAt));}
  catch{throw new AdminHttpError(422,'The saved Moon event is invalid.');}
  const calculated=(await lunationArticleEvents(month,event.timeZone)).find(value=>moonHoroscopeKey(value)===row.content_key);
  if(!calculated||Date.parse(calculated.startsAt)!==Date.parse(event.startsAt)||calculated.eclipseType)
    throw new AdminHttpError(422,'The saved readings do not match a calculated Moon event.');
  const keys=lunationHoroscopeIdentities(calculated.phase,calculated.sign).map(value=>value.contentKey);
  const approved=keys.map(approvedSourceBaseline).filter((value):value is NonNullable<typeof value>=>Boolean(value));
  if(!approved.length)throw new AdminHttpError(422,'No approved reusable readings are installed for this Moon.');
  return {keys,approved,packageVersion:approved[0].packageVersion,baselineSHA256:digest(approved)};
}
async function publications(get:Store,keys:string[]){
  const rows=await get(`content_publications?${new URLSearchParams({content_key:`in.(${keys.map(key=>`"${key}"`).join(',')})`,select:'*'})}`);
  if(!Array.isArray(rows)||rows.some(row=>!keys.includes(row.content_key)||!validContentPublication(row))||new Set(rows.map(row=>row.content_key)).size!==rows.length)
    throw new AdminHttpError(503,'Moon publication could not be verified.');
  return new Map(rows.map(row=>[row.content_key,row]));
}
async function receipt(get:Store,operationId:string){
  const rows=await get(`content_baseline_recoveries?${new URLSearchParams({operation_id:`eq.${operationId}`,select:'request,result'})}`);
  if(!Array.isArray(rows)||rows.length>1)throw new AdminHttpError(503,'Recovery status is unavailable.');
  return rows[0]??null;
}
async function status(get:Store,stored:any){
  if(!stored)return {ok:true,state:'unconfirmed'};
  if(Array.isArray(stored.result)&&stored.result.length===0)return {ok:true,state:'cancelled'};
  const planned=stored.request?.source,item=stored.result?.[0];
  if(stored.request?.kind!==kind||!planned||!Array.isArray(stored.result)||stored.result.length!==1||!uuid.test(item?.id)
    ||!validContentPublication(item.publication)||!publicationRestoresBaseline(item.publication))
    throw new AdminHttpError(409,'This operation is not a Moon reusable-reading recovery.');
  const row=await sourceRow(get,item.id,true);
  if(!row||row.status!=='ARCHIVED'||publicationTimestamp(row.updated_at)!==publicationTimestamp(item.updatedAt))return {ok:true,state:'changed'};
  const current=await baseline(row),ledger=await publications(get,[row.content_key,...current.keys]);
  if(current.baselineSHA256!==planned.baselineSHA256||ledger.get(row.content_key)?.revision!==item.publication.revision
    ||planned.fallbacks.some((source:any)=>(ledger.get(source.contentKey)?.revision??null)!==source.expectedPublicationRevision))return {ok:true,state:'changed'};
  return {ok:true,state:'restored',recovered:stored.result,savedWritingRetained:true};
}

/** Metadata-only, explicit owner recovery. Never reads or edits archived passages. */
export async function recoverReusableMoonReadings(body:any){
  if(!['preview','restore','status','cancel'].includes(body?.action))throw new AdminHttpError(400,'Select a Moon recovery action.');
  const get=storage();
  if(['status','cancel'].includes(body.action)){
    if(!uuid.test(body.operationId))throw new AdminHttpError(400,'Select a recovery operation.');
    if(body.action==='cancel')await get('rpc/cancel_content_source_recovery',{p_operation_id:body.operationId});
    return status(get,await receipt(get,body.operationId));
  }
  if(!Array.isArray(body.sources)||body.sources.length!==1||!uuid.test(body.sources[0]?.id)||typeof body.sources[0].contentKey!=='string'||typeof body.sources[0].expectedUpdatedAt!=='string'
    ||!Number.isFinite(Date.parse(body.sources[0].expectedUpdatedAt)))throw new AdminHttpError(400,'Select the archived readings and their saved version.');
  const input=body.sources[0];
  if(body.action==='restore'){
    if(!uuid.test(body.operationId))throw new AdminHttpError(400,'Select a recovery operation.');
    const previous=await receipt(get,body.operationId);
    if(previous){
      if(previous.request?.kind!==kind||digest(previous.request.source)!==digest(input))throw new AdminHttpError(409,'Recovery identity changed.');
      return status(get,previous);
    }
  }
  const row=await sourceRow(get,input.id);
  if(row.content_key!==input.contentKey||publicationTimestamp(row.updated_at)!==publicationTimestamp(input.expectedUpdatedAt))throw new AdminHttpError(409,'These Moon readings changed. Reload before recovery.');
  const installed=await baseline(row),ledger=await publications(get,[row.content_key,...installed.keys]),publication=ledger.get(row.content_key);
  if(!publication||publication.state!=='retired'||publication.row_id&&publication.row_id!==row.id)throw new AdminHttpError(409,'The dated Moon publication changed. Reload before recovery.');
  if(!installed.approved.some(source=>!ledger.has(source.contentKey)||publicationRestoresBaseline(ledger.get(source.contentKey))))
    throw new AdminHttpError(422,'No installed reusable readings are currently available. Their publication rules have not changed.');
  const plan={id:row.id,contentKey:row.content_key,expectedUpdatedAt:row.updated_at,baselineSHA256:installed.baselineSHA256,
    expectedPublicationRevision:publication.revision,fallbacks:installed.keys.map(contentKey=>({contentKey,expectedPublicationRevision:ledger.get(contentKey)?.revision??null}))};
  if(body.action==='preview')return {ok:true,sources:[plan],packageVersion:installed.packageVersion,savedWritingRetained:true};
  if(digest(plan)!==digest(input))throw new AdminHttpError(409,'The reusable readings or publication changed. Review recovery again.');
  const result=await get('rpc/restore_moon_reusable_readings',{p_operation_id:body.operationId,p_source:plan});
  if(!Array.isArray(result)||result.length!==1||result[0].id!==row.id||result[0].contentKey!==row.content_key||result[0].baselineSHA256!==plan.baselineSHA256
    ||publicationTimestamp(result[0].updatedAt)!==publicationTimestamp(row.updated_at)||!validContentPublication(result[0].publication)||!publicationRestoresBaseline(result[0].publication))
    throw new AdminHttpError(503,'Recovery was not confirmed. Check its saved status.');
  return {ok:true,recovered:result,savedWritingRetained:true};
}
