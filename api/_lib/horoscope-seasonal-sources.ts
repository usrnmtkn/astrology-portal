import {adminFetchJson,adminStorageRows,AdminHttpError} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {seasonalMeaningKeys} from '../../src/astro-writing/seasonalHoroscopeMeaning.mjs';

export async function loadHoroscopeSeasonalSources(brief:any) {
  const keys=seasonalMeaningKeys(brief);
  if(!keys.length)return [];
  const {url,headers}=studioStorage();
  const result=await adminFetchJson(`${url}?${new URLSearchParams({content_key:`in.(${keys.join(',')})`,status:'in.(DRAFT,LIVE)',select:'id,content_key,status,updated_at,body,sections',order:'updated_at.desc',limit:'100'})}`,{headers});
  if(!result.ok||!Array.isArray(result.payload))throw new AdminHttpError(502,'The shared season sources could not be loaded. Your drafts are saved; check the writing plan again.');
  const rows=adminStorageRows(result.payload);
  if(rows.length>=100)throw new AdminHttpError(409,'The shared season sources need review before generation.');
  return rows;
}
