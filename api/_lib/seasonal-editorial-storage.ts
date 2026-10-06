import {adminFetchJson,adminStorageRows,AdminHttpError} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {assertJournal,assertRunWrite} from '../../src/astro-writing/editorial/controller.mjs';
import {digest} from '../../src/astro-writing/editorial/evidenceRegistry.mjs';

/** Service-only table. Never put private candidates or evidence in edition rows. */
export function seasonalEditorialStorage() {
  const {url,headers}=studioStorage();
  const endpoint=url.replace(/generated_interpretations$/u,'studio_editorial_runs');
  const fetchRows=async(params:URLSearchParams,init:RequestInit={})=>{
    const response=await adminFetchJson(`${endpoint}?${params}`,{...init,headers:{...headers,prefer:'return=representation'}});
    if(!response.ok)throw new AdminHttpError(503,'Private Seasonal run storage is unavailable. No unreserved model call was started.');
    return adminStorageRows<any>(response.payload);
  };
  return {
    async create(run:any,targetRowId:string){
      assertJournal(run);
      const rows=await fetchRows(new URLSearchParams(),{method:'POST',body:JSON.stringify({id:run.id,target_row_id:targetRowId,revision:0,state:run,state_hash:digest(run)})});
      if(rows.length!==1||rows[0].state_hash!==digest(run))throw new AdminHttpError(502,'Private run creation was not confirmed.');return run;
    },
    async read(id:string,targetRowId:string){
      const rows=await fetchRows(new URLSearchParams({id:`eq.${id}`,target_row_id:`eq.${targetRowId}`,select:'*',limit:'1'}));
      if(rows.length!==1||rows[0].state_hash!==digest(rows[0].state))throw new AdminHttpError(409,'The private Seasonal run could not be verified.');
      return assertJournal(rows[0].state);
    },
    async save(previous:any,next:any,targetRowId:string){
      next.revision=previous.revision+1;assertRunWrite(previous,next,previous.revision);
      const rows=await fetchRows(new URLSearchParams({id:`eq.${next.id}`,target_row_id:`eq.${targetRowId}`,revision:`eq.${previous.revision}`}),
        {method:'PATCH',body:JSON.stringify({revision:next.revision,state:next,state_hash:digest(next)})});
      if(rows.length!==1||rows[0].state_hash!==digest(next))throw new AdminHttpError(409,'Another request advanced this Seasonal run. Reload its saved progress.');return next;
    }
  };
}

export async function loadSeasonalRejections(seasonalTargetKeys:string[]=[]) {
  const {url,headers}=studioStorage();
  // Read active source records, then filter by their explicit target keys. No
  // private text is put into a repository corpus or public reader payload.
  const params=new URLSearchParams({status:'eq.active',kind:'eq.rejection',select:'id,version,kind,target_keys,rejected_text,owner_reason,source_uri,source_date,status',limit:'2001',order:'id.asc'});
  const response=await adminFetchJson(`${url.replace(/generated_interpretations$/u,'studio_writing_feedback')}?${params}`,{headers});
  if(!response.ok)throw new AdminHttpError(503,'Seasonal owner rejections could not be loaded. No model call was started.');
  const rows=adminStorageRows<any>(response.payload);
  if(rows.length>2000)throw new AdminHttpError(503,'The owner feedback inventory needs paginated retrieval.');
  // Legacy plan keys do not encode the period. A matching audience alone is
  // insufficient: only an explicitly identified Seasonal target may qualify.
  return rows.filter(r=>r.target_keys?.some((k:string)=>k==='horoscope/seasonal'||seasonalTargetKeys.includes(k)));
}
