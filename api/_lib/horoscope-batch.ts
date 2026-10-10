import {randomUUID} from 'node:crypto';
import {adminFetchJson,adminStorageRows,AdminHttpError} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {persistWeeklyHoroscope,horoscopeStorageTimeoutMs} from './horoscope-storage-confirmation.js';
import {runHoroscopeWriting} from '../admin/horoscope-writing.js';
import {horoscopePendingReadings} from '../../src/astro-writing/horoscopeRecovery.mjs';

/** Durable authorization lives in the edition, never in an open browser tab.
 * A version-checked lease fences overlapping cron invocations. Each paid stage
 * still has its own reservation; losing the worker never replays a dispatch. */
export async function runWeeklyHoroscopeBatch(id:string,{maxSteps=100,wait=()=>new Promise(resolve=>setTimeout(resolve,3000))}:any={}){
  const {url,headers}=studioStorage();
  const read=async()=>{
    const result=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${id}`,select:'*',limit:'1'})}`,{headers},horoscopeStorageTimeoutMs);
    if(!result.ok)throw new AdminHttpError(503,'Batch storage is unavailable.');
    return adminStorageRows(result.payload)[0] as any;
  };
  let row=await read(),batch=row?.source_snapshot?.horoscopeGeneration?.batch;
  if(row?.status!=='DRAFT'||row.sections?.horoscopeEdition?.window?.period!=='weekly'||batch?.status!=='running')return {state:'idle'};
  if(Date.parse(batch.lease?.until)>Date.now())return {state:'leased'};
  const lease={id:randomUUID(),until:new Date(Date.now()+310000).toISOString()};
  const invocationDeadline=Date.now()+285000,deadline=Date.now()+180000;
  const saveBatch=async(next:any)=>persistWeeklyHoroscope({url,headers,row,deadline:invocationDeadline,patch:{source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,batch:next}}}});
  try{row=await saveBatch({...batch,lease});}catch(error){if(error instanceof AdminHttpError&&error.statusCode===409)return {state:'contended'};throw error;}
  batch=row.source_snapshot.horoscopeGeneration.batch;
  try{
    for(let step=0;step<maxSteps&&Date.now()<deadline;step++){
      row=await read();batch=row?.source_snapshot?.horoscopeGeneration?.batch;
      if(batch?.status!=='running'||batch.lease?.id!==lease.id||row.status!=='DRAFT')return {state:'stopped'};
      const generation=row.source_snapshot.horoscopeGeneration,active=generation.active;
      const next=horoscopePendingReadings(row.sections.horoscopeEdition,generation).find((p:any)=>batch.signs.includes(p.sign)&&!batch.attempted.includes(p.sign));
      if(!active&&!next){
        const complete=row.sections.horoscopeEdition.passages.every((p:any)=>p.headline.trim()&&p.body.trim());
        row=await saveBatch({...batch,lease:null,status:complete?'complete':'needs_attention',finishedAt:new Date().toISOString()});
        return {state:complete?'complete':'needs_attention'};
      }
      const action=active?(active.state==='ready'?'continue':'poll'):'generate';
      const result=await runHoroscopeWriting({action,id,expectedUpdatedAt:row.updated_at,...(!active?{sign:next.sign,approvedPlanHash:batch.planHash}:{})},batch.actor,batch.id,invocationDeadline);
      if(result.status===409){
        const previousVersion=row.updated_at;
        row=await read();batch=row?.source_snapshot?.horoscopeGeneration?.batch;
        if(batch?.status==='running'&&batch.lease?.id===lease.id&&row.updated_at===previousVersion){
          await saveBatch({...batch,status:'paused',error:result.payload.error});
          return {state:'paused'};
        }
        return {state:'changed'};
      }
      if(result.status>=400&&result.status!==422){
        // Only transport/storage checks may be retried. A reserved writer is
        // always polled; attempted signs cannot incur another paid draft.
        row=await read();batch=row?.source_snapshot?.horoscopeGeneration?.batch;
        if(batch?.status!=='running'||batch.lease?.id!==lease.id)return {state:'changed'};
        const failures=(batch.connectionFailures??0)+1;
        row=await saveBatch({...batch,connectionFailures:failures,error:result.payload.error,
          status:result.status<500||failures>=3?'paused':'running'});
        return {state:row.source_snapshot.horoscopeGeneration.batch.status};
      }
      // Pending provider retrieval is free; it cannot send the next paid stage.
      // The saved approval explicitly authorizes the ready review and next sign.
      if(result.payload.pending){
        row=result.payload.rows?.[0]??await read();batch=row.source_snapshot.horoscopeGeneration.batch;
        const current=row.source_snapshot.horoscopeGeneration.active;
        if(current?.state==='running'&&Date.now()-Date.parse(current.startedAt)>20*60*1000){
          // Preserve the retrievable ID and candidate, but free the batch to
          // write its other approved signs. Never redispatch this request.
          const generation=row.source_snapshot.horoscopeGeneration;
          const held={...current,interruptedAt:new Date().toISOString(),outcome:'unknown'};
          const failure={code:'rhetorical_review_interrupted',message:'The saved prose check has not completed after 20 minutes. Its draft and request are kept for review; the other readings can continue.',operation:held,candidate:current.candidate,receipt:current.receipt,failedAt:new Date().toISOString()};
          await persistWeeklyHoroscope({url,headers,row,deadline:invocationDeadline,patch:{source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...generation,active:null,
            ...(current.phase==='review'?{candidateHolds:{...generation.candidateHolds,[current.sign]:failure},lastError:failure}:{heldRequests:{...generation.heldRequests,[current.sign]:held}})}}}});
        }else if(current?.state!=='ready')await wait();
      }
    }
    return {state:'running'};
  }finally{
    row=await read();batch=row?.source_snapshot?.horoscopeGeneration?.batch;
    if(batch?.lease?.id===lease.id)try{await saveBatch({...batch,lease:null});}catch(error){if(!(error instanceof AdminHttpError)||error.statusCode!==409)throw error;}
  }
}
