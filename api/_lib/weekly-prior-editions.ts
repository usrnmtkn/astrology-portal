import {adminFetchJson,adminStorageRows,AdminHttpError} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {validateHoroscopeEdition,horoscopeCanonicalJson} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {weeklyEditorialHash} from '../../src/astro-writing/weeklyBatchEditorial.mjs';

export const WEEKLY_PRIOR_EDITIONS='weekly-prior-editions/v1';
const maxBytes=1024*1024;
/** Bounded comparison-only history. Never reads source snapshots, approval
 * records or provider history, and never shortens a complete saved passage. */
export async function loadWeeklyPriorEditions(row:any){
  const window=row.sections?.horoscopeEdition?.window;
  if(window?.period!=='weekly')return null;
  const {url,headers}=studioStorage(),editions:any[]=[],seen=new Set<string>();
  const lower=new Date(Date.parse(window.startsAt)-42*86400000).toISOString();
  for(let offset=0;offset<32&&editions.length<4;offset+=8){
    const params=new URLSearchParams({content_key:'like.horoscope/weekly/*',mode:'eq.article',status:'in.(DRAFT,LIVE,ARCHIVED)',
      'sections->horoscopeEdition->window->>period':'eq.weekly',
      'sections->horoscopeEdition->window->>timeZone':`eq.${window.timeZone}`,
      'sections->horoscopeEdition->window->>startsAt':`gt.${lower}`,
      'sections->horoscopeEdition->window->>endsAt':`lte.${window.startsAt}`,
      select:'id,content_key,status,updated_at,sections',
      order:'sections->horoscopeEdition->window->>startsAt.desc,updated_at.desc,id.asc',limit:'8',offset:String(offset)});
    const response=await adminFetchJson(`${url}?${params}`,{headers});
    if(!response.ok)throw new AdminHttpError(503,'Previous Weekly editions could not be checked. No new writing request was sent.');
    const rows=adminStorageRows(response.payload);
    for(const prior of rows as any[]){
      if(prior.id===row.id)continue;
      let edition:any;
      try{edition=validateHoroscopeEdition(prior.sections?.horoscopeEdition);}
      catch{throw new AdminHttpError(422,'A previous Weekly edition has invalid saved text or dates. Review it before preparing a new batch.');}
      if(edition.window.period!=='weekly'||edition.window.timeZone!==window.timeZone
        ||edition.window.startsAt<=lower||edition.window.endsAt>window.startsAt)continue;
      const readings=edition.passages.filter((r:any)=>r.headline.trim()&&r.body.trim()).map((r:any)=>({...r,textHash:weeklyEditorialHash(r)}));
      if(!readings.length||seen.has(edition.window.startsAt))continue;
      seen.add(edition.window.startsAt);
      editions.push({id:prior.id,contentKey:prior.content_key,status:prior.status,window:edition.window,sourceUpdatedAt:prior.updated_at,readings});
      if(editions.length===4)break;
    }
    if(rows.length<8)break;
  }
  const content={version:WEEKLY_PRIOR_EDITIONS,editionId:row.id,window,lookbackDays:42,maxEditions:4,editions};
  const snapshot={...content,contextHash:weeklyEditorialHash(content)};
  if(Buffer.byteLength(horoscopeCanonicalJson(snapshot),'utf8')>maxBytes)throw new AdminHttpError(422,'Complete previous Weekly readings exceed the comparison limit. No text was shortened and no writing request was sent.');
  return snapshot;
}
export function assertWeeklyPriorEditions(snapshot:any,row:any){
  const {contextHash,...content}=snapshot??{};
  if(snapshot?.version!==WEEKLY_PRIOR_EDITIONS||snapshot.editionId!==row.id
    ||horoscopeCanonicalJson(snapshot.window)!==horoscopeCanonicalJson(row.sections.horoscopeEdition.window)
    ||weeklyEditorialHash(content)!==contextHash)throw new AdminHttpError(409,'The saved previous-week comparison is invalid. Prepare a fresh writing plan.');
}
