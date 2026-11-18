import type {IncomingMessage,ServerResponse} from 'node:http';
import {requireContentAdmin} from '../_lib/admin-auth.js';
import {loadLocalWebEnv} from '../_lib/local-env.js';
import {sendAdminJson,sendAdminMethodNotAllowed} from '../_lib/admin-http.js';
import {writingRunStorage,verifyArchivedRun} from '../../src/astro-writing/writingRunArchive.cjs';
loadLocalWebEnv();
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
const token=/^[a-zA-Z0-9_:/.-]{1,512}$/u;
const timestamp=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/u;
export default async function handler(req:IncomingMessage,res:ServerResponse) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET')return sendAdminMethodNotAllowed(res,['GET']);
  if(!await requireContentAdmin(req,res))return;
  const query=new URL(req.url??'','http://localhost').searchParams;
  if([...query.keys()].some(k=>!['id','surface','role','period','contentKey','limit','before','beforeId','through'].includes(k))
    ||[...new Set(query.keys())].some(k=>query.getAll(k).length!==1))return sendAdminJson(res,400,{ok:false,error:'Invalid archive query.'});
  try{
    const storage=writingRunStorage();
    const id=query.get('id');
    if(id!==null){
      if(!uuid.test(id)||query.size!==1)return sendAdminJson(res,400,{ok:false,error:'Supply one archive ID.'});
      const rows=await storage.list(new URLSearchParams({id:`eq.${id}`,select:'*',limit:'1'}));
      if(!rows.length)return sendAdminJson(res,404,{ok:false,error:'Writing run not found.'});
      return sendAdminJson(res,200,{ok:true,run:verifyArchivedRun(rows[0])});
    }
    const limit=Number(query.get('limit')??50),before=query.get('before'),beforeId=query.get('beforeId');
    const through=query.get('through')??new Date().toISOString();
    if(!Number.isInteger(limit)||limit<1||limit>100||!timestamp.test(through)
      ||Boolean(before)!==Boolean(beforeId)||before&&(!timestamp.test(before)||!uuid.test(beforeId!)))return sendAdminJson(res,400,{ok:false,error:'Invalid archive page.'});
    const params=new URLSearchParams({select:'id,created_at,provider,model,role,surface,family,context,request_sha256,snapshot_sha256,state,response_id,provider_status,http_status,recorded_at',order:'created_at.desc,id.desc',limit:String(limit),created_at:`lte.${through}`});
    for(const[field,column]of [['surface','surface'],['role','role'],['period','context->>period'],['contentKey','context->>contentKey']]){
      const value=query.get(field);if(value&&!token.test(value))return sendAdminJson(res,400,{ok:false,error:'Invalid archive filter.'});
      if(value)params.set(column,`eq.${value}`);
    }
    if(before)params.set('or',`(created_at.lt.${before},and(created_at.eq.${before},id.lt.${beforeId}))`);
    const runs=await storage.list(params),last=runs.at(-1);
    return sendAdminJson(res,200,{ok:true,runs,through,next:runs.length===limit&&last?{before:last.created_at,beforeId:last.id}:null});
  }catch{return sendAdminJson(res,503,{ok:false,error:'Private writing-run archive could not be verified or loaded.'});}
}
