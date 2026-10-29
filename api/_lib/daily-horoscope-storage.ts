import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {AdminHttpError,adminFetchJson,adminStorageRows} from './admin-http.js';
import {encodeWeeklyHistory} from './horoscope-history-storage.js';
import {horoscopeStorageTimeoutMs} from './horoscope-storage-confirmation.js';

/** Daily uses its existing table CAS, with lossless private-history encoding.
 * A readback proves our complete write after a lost acknowledgement. Only
 * storage is retried; callers must confirm this save before provider dispatch. */
export async function persistDailyHoroscope({url,headers,row,patch,deadline}:any){
  const timeout=()=>{
    if(deadline&&deadline<=Date.now())throw new AdminHttpError(504,'The save deadline expired. Check saved progress.');
    return Math.min(horoscopeStorageTimeoutMs,deadline?deadline-Date.now():horoscopeStorageTimeoutMs);
  };
  const source_snapshot={...(patch.source_snapshot??row.source_snapshot),horoscopeStorageWriteId:randomUUID()};
  const proposed={...row,...patch,source_snapshot};
  const write={...patch,source_snapshot:encodeWeeklyHistory(source_snapshot),
    updated_at:new Date(Math.max(Date.now(),Date.parse(row.updated_at)+1)).toISOString()};
  const endpoint=url+'?'+new URLSearchParams({id:'eq.'+row.id,updated_at:'eq.'+row.updated_at});
  const conflict=()=>new AdminHttpError(409,'This edition changed during generation. Reopen it; newer edits were preserved.');
  const same=(a:any,b:any)=>{
    const left={...a},right={...b};delete left.updated_at;delete right.updated_at;
    return isDeepStrictEqual(JSON.parse(JSON.stringify(left)),JSON.parse(JSON.stringify(right)));
  };
  for(let attempt=0;attempt<2;attempt++){
    let failure:unknown;
    try{
      const response=await adminFetchJson(endpoint,{method:'PATCH',headers:{...headers,prefer:'return=representation'},body:JSON.stringify(write)},timeout());
      if(!response.ok)throw new AdminHttpError(502,'The save could not be confirmed. Check saved progress before continuing.');
      const saved:any[]=adminStorageRows(response.payload);
      if(saved.length===1&&saved[0].id===row.id&&saved[0].updated_at!==row.updated_at&&same(saved[0],proposed))return saved[0];
      failure=conflict();
    }catch(error){failure=error;}
    const read=await adminFetchJson(url+'?'+new URLSearchParams({id:'eq.'+row.id,select:'*',limit:'1'}),{headers},timeout());
    if(!read.ok)throw failure;
    const saved:any[]=adminStorageRows(read.payload);
    if(saved.length!==1)throw conflict();
    if(saved[0].updated_at!==row.updated_at&&same(saved[0],proposed))return saved[0];
    if(!isDeepStrictEqual(saved[0],row))throw conflict();
    if(attempt===1||failure instanceof AdminHttpError&&failure.statusCode===409)throw failure;
  }
  throw conflict();
}
