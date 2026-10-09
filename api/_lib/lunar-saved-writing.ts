import {adminFetchJson,adminStorageRows,AdminHttpError} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {lunarJournalPackageRecords} from './lunar-journal-sources.js';
import {lunarSavedWritingTarget,resolveLunarSavedWriting} from '../../src/astro-writing/lunationSavedWriting.mjs';

/** Read only: the same complete passages exposed by the Calendar library. */
export async function loadLunarSavedWriting(event:any,positions:any[]=[]) {
  const target=lunarSavedWritingTarget(event,positions),{url,headers}=studioStorage();
  const filters=[`eq.${target.contentKey}`,`like.authored/lunar-journal/season/${target.sunSign}/*`];
  const batches=await Promise.all(filters.map(async content_key=>{
    const params=new URLSearchParams({content_key,target_date:'is.null',select:'id,content_key,status,updated_at,headline,body,sections,source_snapshot,facts',order:'updated_at.desc,id.asc',limit:'101'});
    const result=await adminFetchJson(`${url}?${params}`,{headers});
    if(!result.ok||!Array.isArray(result.payload))throw new AdminHttpError(503,'Your saved lunar and season writing could not load. No writer call was started.');
    const rows=adminStorageRows<any>(result.payload);
    if(rows.length>=101)throw new AdminHttpError(409,'The saved writing inventory needs review before drafting.');
    return rows;
  }));
  try{
    const selected=resolveLunarSavedWriting(target,batches.flat(),lunarJournalPackageRecords.filter(r=>r.type==='season'&&r.sign.toLowerCase()===target.sunSign));
    if(selected.missingLunation)throw new Error('The matching saved lunar passage is unavailable. Restore it in Saved write-ups before preparing a new draft.');
    return selected;
  }
  catch(error){throw new AdminHttpError(409,error instanceof Error?error.message:'The saved writing needs review.');}
}
