import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {AdminHttpError,adminFetchJson,adminStorageRows} from './admin-http.js';
import {horoscopeStorageChanges} from './horoscope-storage-delta.js';
import {encodeWeeklyHistory,retainWeeklyStorageRow,weeklyStoredRow} from './horoscope-history-storage.js';

// A Weekly edition carries complete evidence and rejected drafts. Returning that
// document on every checkpoint can lose the acknowledgement of a committed save.
// Only the updated_at trigger changes these draft rows; retain its actual value.
export const horoscopeStorageTimeoutMs=30_000;

export async function persistWeeklyHoroscope({url,headers,row,patch,deadline}:any){
  const timeout=()=>{
    if(deadline&&deadline<=Date.now())throw new AdminHttpError(504,'The save deadline expired. Check saved progress.');
    return Math.min(horoscopeStorageTimeoutMs,deadline?deadline-Date.now():horoscopeStorageTimeoutMs);
  };
  const snapshot=patch.source_snapshot??row.source_snapshot;
  const source_snapshot={...snapshot,horoscopeStorageWriteId:randomUUID()};
  const proposed={...row,...patch,source_snapshot};
  const write={...patch,source_snapshot:encodeWeeklyHistory(source_snapshot)};
  const stored=weeklyStoredRow(row);
  const endpoint=url.replace(/generated_interpretations$/u,'rpc/checkpoint_weekly_horoscope');
  // A first conversion replaces generation once, rather than rebuilding a
  // legacy 47MB JSONB document for every removed history field.
  const conversion=Boolean(write.source_snapshot.horoscopeGeneration?.historyArchive)&&!stored.source_snapshot?.horoscopeGeneration?.historyArchive;
  const changes=conversion?[
    {path:['source_snapshot','horoscopeGeneration'],op:'set',value:write.source_snapshot.horoscopeGeneration},
    ...horoscopeStorageChanges({...stored,source_snapshot:{...stored.source_snapshot,horoscopeGeneration:write.source_snapshot.horoscopeGeneration}},write)
  ]:horoscopeStorageChanges(stored,write);
  const request={p_id:row.id,p_expected_updated_at:row.updated_at,p_changes:changes};
  const conflict=()=>new AdminHttpError(409,'This edition changed during generation. Reopen it; newer edits were preserved.');
  const sameDocument=(a:any,b:any)=>{
    const left={...a},right={...b};delete left.updated_at;delete right.updated_at;
    return isDeepStrictEqual(left,right);
  };
  // Retry only storage, with the same version and unique write identity. If the
  // first checkpoint is still committing, the second cannot also win the CAS. No
  // provider request is dispatched until this handler proves its own save.
  for(let attempt=0;attempt<2;attempt++){
    let failure:unknown;
    try{
      const result=await adminFetchJson(endpoint,{method:'POST',headers,body:JSON.stringify(request)},timeout());
      if(!result.ok)throw new AdminHttpError(502,'The save could not be confirmed. Check saved progress before continuing.');
      const saved:any[]=adminStorageRows(result.payload);
      if(saved.length===1&&saved[0].id===row.id&&typeof saved[0].updated_at==='string'&&saved[0].updated_at!==row.updated_at){
        return retainWeeklyStorageRow({...proposed,updated_at:saved[0].updated_at},{...stored,...write,updated_at:saved[0].updated_at});
      }
      failure=conflict();
    }catch(error){failure=error;}

    // Read back after an uncertain acknowledgement. The unique identity AND the
    // entire document must match, so a competing reservation or newer owner edit
    // can never be mistaken for this handler's successful save.
    const read=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${row.id}`,select:'*',limit:'1'})}`,{headers},timeout());
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
