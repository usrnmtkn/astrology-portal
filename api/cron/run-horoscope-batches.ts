import type {IncomingMessage,ServerResponse} from 'node:http';
import {requireInternalRunner} from '../_lib/report-http.js';
import {adminFetchJson,adminStorageRows,sendAdminJson} from '../_lib/admin-http.js';
import {studioStorage} from '../_lib/sky-studio-sources.js';
import {runWeeklyHoroscopeBatch} from '../_lib/horoscope-batch.js';
export const maxDuration=300;
export default async function handler(req:IncomingMessage,res:ServerResponse){
  if(!['GET','POST'].includes(req.method??''))return sendAdminJson(res,405,{ok:false});
  if(!requireInternalRunner(req))return sendAdminJson(res,401,{ok:false,error:'Unauthorized.'});
  try{
    const {url,headers}=studioStorage();
    const query=new URLSearchParams({select:'id',status:'eq.DRAFT',content_key:'like.horoscope/weekly/*',
      'source_snapshot->horoscopeGeneration->batch->>status':'eq.running',order:'updated_at.asc',limit:'1'});
    const result=await adminFetchJson(`${url}?${query}`,{headers},30000);
    if(!result.ok)throw new Error('batch_inventory_unavailable');
    const row:any=adminStorageRows(result.payload)[0];
    return sendAdminJson(res,200,{ok:true,...(row?await runWeeklyHoroscopeBatch(row.id):{state:'idle'})});
  }catch{return sendAdminJson(res,503,{ok:false,error:'The saved batch could not advance. Its requests are preserved.'});}
}
