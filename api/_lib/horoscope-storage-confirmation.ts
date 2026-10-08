import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {AdminHttpError,adminFetchJson,adminStorageRows} from './admin-http.js';

// A Weekly edition carries complete evidence and rejected drafts. Returning that
// document on every checkpoint can lose the acknowledgement of a committed save.
// Only the updated_at trigger changes these draft rows; retain its actual value.
export const horoscopeStorageTimeoutMs=30_000;

export async function persistWeeklyHoroscope({url,headers,row,patch}:any){
  const snapshot=patch.source_snapshot??row.source_snapshot;
  const source_snapshot={...snapshot,horoscopeStorageWriteId:randomUUID()};
  const proposed={...row,...patch,source_snapshot};
  const write={...patch,source_snapshot};
  const params=new URLSearchParams({id:`eq.${row.id}`,updated_at:`eq.${row.updated_at}`,select:'id,updated_at'});
  const conflict=()=>new AdminHttpError(409,'This edition changed during generation. Reopen it; newer edits were preserved.');
  const sameDocument=(a:any,b:any)=>{
    const left={...a},right={...b};delete left.updated_at;delete right.updated_at;
    return isDeepStrictEqual(left,right);
  };
  // Retry only storage, with the same version and unique write identity. If the
  // first PATCH is still committing, the second cannot also win the CAS. No
  // provider request is dispatched until this handler proves its own save.
  for(let attempt=0;attempt<2;attempt++){
    let failure:unknown;
    try{
      const result=await adminFetchJson(`${url}?${params}`,{method:'PATCH',headers:{...headers,prefer:'return=representation'},body:JSON.stringify(write)},horoscopeStorageTimeoutMs);
      if(!result.ok)throw new AdminHttpError(502,'The save could not be confirmed. Check saved progress before continuing.');
      const saved:any[]=adminStorageRows(result.payload);
      if(saved.length===1&&saved[0].id===row.id&&typeof saved[0].updated_at==='string'&&saved[0].updated_at!==row.updated_at){
        return {...proposed,updated_at:saved[0].updated_at};
      }
      failure=conflict();
    }catch(error){failure=error;}

    // Read back after an uncertain acknowledgement. The unique identity AND the
    // entire document must match, so a competing reservation or newer owner edit
    // can never be mistaken for this handler's successful save.
    const read=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${row.id}`,select:'*',limit:'1'})}`,{headers},horoscopeStorageTimeoutMs);
    if(!read.ok)throw failure;
    const current:any[]=adminStorageRows(read.payload);
    if(current.length!==1||current[0].id!==row.id)throw conflict();
    const saved=current[0];
    if(saved.updated_at!==row.updated_at&&sameDocument(saved,proposed))return saved;
    if(!isDeepStrictEqual(saved,row))throw conflict();
    if(attempt===1||failure instanceof AdminHttpError&&failure.statusCode===409)throw failure;
  }
  throw conflict();
}
