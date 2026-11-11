import type {IncomingMessage,ServerResponse} from 'node:http';
import {loadLocalWebEnv} from '../_lib/local-env.js';
import {requireContentAdmin} from '../_lib/admin-auth.js';
import {AdminHttpError,adminFetchJson,adminErrorStatus,adminErrorMessage,readAdminJsonBody,sendAdminJson} from '../_lib/admin-http.js';
import {approvedSourceBaseline} from '../_lib/approved-source-recovery.js';
import {recoverReusableMoonReadings} from '../_lib/moon-reusable-recovery.js';
import {validContentPublication,publicationRestoresBaseline} from '../../apps/web/src/content/contentPublicationState.js';
loadLocalWebEnv();
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/iu;
const dailyPrefixes=['fallback-hook/daily-headline/','fallback-hook/daily-body/'];
export default async function handler(req:IncomingMessage,res:ServerResponse) {
  if(!await requireContentAdmin(req,res))return;
  if(req.method!=='POST')return sendAdminJson(res,405,{ok:false,error:'Use POST.'});
  try {
    const body=await readAdminJsonBody<any>(req);
    if(body?.recoveryKind==='moon-reusable')return sendAdminJson(res,200,await recoverReusableMoonReadings(body));
    if(body?.recoveryKind!==undefined)throw new AdminHttpError(400,'Unsupported recovery kind.');
    if(body?.action==='status'||body?.action==='cancel') {
      if(!uuid.test(body.operationId))throw new AdminHttpError(400,'Select a recovery operation.');
      const base=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
      if(!base||!key)throw new AdminHttpError(503,'Source recovery storage is unavailable.');
      const headers={apikey:key,authorization:`Bearer ${key}`};
      if(body.action==='cancel') {
        const cancelled=await adminFetchJson(`${base}/rest/v1/rpc/cancel_content_source_recovery`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({p_operation_id:body.operationId})});
        if(!cancelled.ok)throw new AdminHttpError(503,'Recovery could not be stopped. Check its status before continuing.');
      }
      const receipt=await adminFetchJson(`${base}/rest/v1/content_baseline_recoveries?${new URLSearchParams({operation_id:`eq.${body.operationId}`,select:'result'})}`,{headers});
      if(!receipt.ok||!Array.isArray(receipt.payload))throw new AdminHttpError(503,'Recovery status is unavailable.');
      if(!receipt.payload.length)return sendAdminJson(res,200,{ok:true,state:'unconfirmed'});
      const recovered=receipt.payload[0].result;
      if(!Array.isArray(recovered)||recovered.length>2)throw new AdminHttpError(503,'Recovery status is invalid.');
      if(!recovered.length)return sendAdminJson(res,200,{ok:true,state:'cancelled'});
      for(const item of recovered) {
        if(!uuid.test(item.id)||!validContentPublication(item.publication)||!publicationRestoresBaseline(item.publication))throw new AdminHttpError(503,'Recovery status is invalid.');
        if(approvedSourceBaseline(item.contentKey)?.sha256!==item.baselineSHA256)return sendAdminJson(res,200,{ok:true,state:'changed'});
        const live=await adminFetchJson(`${base}/rest/v1/content_publications?${new URLSearchParams({content_key:`eq.${item.contentKey}`,select:'*'})}`,{headers});
        const source=await adminFetchJson(`${base}/rest/v1/generated_interpretations?${new URLSearchParams({id:`eq.${item.id}`,select:'status,updated_at'})}`,{headers});
        if(!live.ok||!source.ok||!Array.isArray(live.payload)||!Array.isArray(source.payload))throw new AdminHttpError(503,'Recovery status is unavailable.');
        if(live.payload[0]?.revision!==item.publication.revision||source.payload[0]?.status!=='ARCHIVED'||Date.parse(source.payload[0]?.updated_at)!==Date.parse(item.updatedAt))
          return sendAdminJson(res,200,{ok:true,state:'changed'});
      }
      return sendAdminJson(res,200,{ok:true,state:'restored',recovered,savedWritingRetained:true});
    }
    if(!body||!['preview','restore'].includes(body.action)||!Array.isArray(body.sources)||body.sources.length<1||body.sources.length>2
      ||body.sources.some((s:any)=>!s||!uuid.test(s.id)||typeof s.contentKey!=='string'||!Number.isFinite(Date.parse(s.expectedUpdatedAt)))
      ||new Set(body.sources.map((s:any)=>s.id)).size!==body.sources.length||new Set(body.sources.map((s:any)=>s.contentKey)).size!==body.sources.length)
      throw new AdminHttpError(400,'Select the saved source and its current version.');
    const keys=body.sources.map((s:any)=>s.contentKey) as string[];
    const paired=keys.some(k=>dailyPrefixes.some(p=>k.startsWith(p)));
    if(keys.length===2||paired){
      const first=keys.find(k=>k.startsWith(dailyPrefixes[0]));
      if(!first||keys.length!==2||!keys.includes(dailyPrefixes[1]+first.slice(dailyPrefixes[0].length)))
        throw new AdminHttpError(422,'Restore the matching Daily headline and passage together.');
    }
    const baselines=keys.map(approvedSourceBaseline);
    if(baselines.some(b=>!b))throw new AdminHttpError(422,'This source has no supported approved bundled version. Saved writing has not changed.');
    const base=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!base||!key)throw new AdminHttpError(503,'Source recovery storage is unavailable.');
    const headers={apikey:key,authorization:`Bearer ${key}`};
    // Preview reads metadata only; it never reads or replaces saved passages.
    const plan=[];
    for(let i=0;i<body.sources.length;i++) {
      const s=body.sources[i],baseline=baselines[i]!;
      const response=await adminFetchJson(`${base}/rest/v1/generated_interpretations?${new URLSearchParams({id:`eq.${s.id}`,select:'id,content_key,updated_at,target_date,status'})}`,{headers});
      if(!response.ok||!Array.isArray(response.payload))throw new AdminHttpError(503,'Could not verify the source.');
      const row=response.payload[0];
      if(!row||row.content_key!==s.contentKey||Date.parse(row.updated_at)!==Date.parse(s.expectedUpdatedAt))throw new AdminHttpError(409,'This source changed. Reload before restoring it.');
      if(row.target_date||row.status==='ARCHIVED')throw new AdminHttpError(422,'Select a reusable saved source.');
      const publicationResponse=await adminFetchJson(`${base}/rest/v1/content_publications?${new URLSearchParams({content_key:`eq.${s.contentKey}`,select:'*'})}`,{headers});
      if(!publicationResponse.ok||!Array.isArray(publicationResponse.payload)||publicationResponse.payload.length>1)throw new AdminHttpError(503,'Could not verify publication.');
      const publication=publicationResponse.payload[0];
      if(publication&&(!validContentPublication(publication)||publication.row_id&&publication.row_id!==s.id))throw new AdminHttpError(409,'Another source owns this publication. Reload before restoring it.');
      plan.push({id:s.id,contentKey:s.contentKey,expectedUpdatedAt:s.expectedUpdatedAt,baselineSHA256:baseline.sha256,expectedPublicationRevision:publication?.revision??null});
    }
    if(body.action==='preview')return sendAdminJson(res,200,{ok:true,sources:plan,packageVersion:baselines[0]!.packageVersion,savedWritingRetained:true});
    if(!uuid.test(body.operationId)||plan.some((s,i)=>s.baselineSHA256!==body.sources[i].baselineSHA256||s.expectedPublicationRevision!==body.sources[i].expectedPublicationRevision))
      throw new AdminHttpError(409,'The approved source or publication changed. Review it again before restoring.');
    const response=await adminFetchJson(`${base}/rest/v1/rpc/restore_approved_content_sources`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({p_operation_id:body.operationId,p_sources:plan})});
    const result=response.payload;
    const storageCode=result&&typeof result==='object'&&'code' in result?result.code:null;
    if(!response.ok&&storageCode==='22023')throw new AdminHttpError(422,'Finish active writing and select a reusable saved source before restoring it.');
    if(!response.ok)throw new AdminHttpError(response.status===409||storageCode==='40001'?409:503,storageCode==='40001'?'This source changed. Reload before restoring it.':'Recovery was not confirmed. Check the saved result before retrying.');
    if(!Array.isArray(result)||result.length!==plan.length||result.some((item:any)=>!plan.some(s=>s.id===item.id&&s.contentKey===item.contentKey&&s.baselineSHA256===item.baselineSHA256)
      ||!validContentPublication(item.publication)||item.publication.content_key!==item.contentKey||!publicationRestoresBaseline(item.publication)))
      throw new AdminHttpError(503,'Recovery was not confirmed. Reload before retrying.');
    return sendAdminJson(res,200,{ok:true,recovered:result,savedWritingRetained:true});
  }catch(error){return sendAdminJson(res,adminErrorStatus(error),{ok:false,error:adminErrorMessage(error,'Could not restore the approved source.')});}
}
