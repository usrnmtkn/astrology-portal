import {AdminHttpError,adminFetchJson,adminStorageRows} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {planetaryWritingHash} from '../../src/astro-writing/planetaryHoroscopeWriting.mjs';
import {assertPlanetaryHoroscopeRow,PLANETARY_HOROSCOPE_PREFIX} from '../../src/shared/planetaryHoroscopes.js';

export const PLANETARY_PRIVATE_PREFIX='studio-planetary-writing/';
const publicSnapshotKeys=['content_role','review_status','studioOwnerApproval','planetaryGeneration'];
function isReference(value:any){return value?.schema==='private-planetary-writing-reference/v1'&&typeof value.privateRecordKey==='string'
  &&value.privateRecordKey.startsWith(PLANETARY_PRIVATE_PREFIX)&&/^[a-f0-9]{64}$/u.test(value.sha256??'')
  &&Object.keys(value).every(k=>['schema','privateRecordKey','sha256'].includes(k));}

async function readPrivateRecord(contentKey:string,reference:any){
  if(!isReference(reference))throw new AdminHttpError(503,'The private planetary writing record is invalid. Publication was stopped.');
  const {url,headers}=studioStorage();
  const response=await adminFetchJson(`${url}?${new URLSearchParams({content_key:`eq.${reference.privateRecordKey}`,mode:'eq.studio-draft',select:'*',limit:'1'})}`,{headers},30000);
  if(!response.ok)throw new AdminHttpError(503,'The private writing record could not be verified. Publication was stopped.');
  const row=adminStorageRows<any>(response.payload)[0],record=row?.sections?.planetaryWritingRecord;
  if(!row||row.status!=='ARCHIVED'||row.lane!=='reference'||row.event_type!=='planetary-writing-record'
    ||record?.schema!=='private-planetary-writing-record/v1'||record.contentKey!==contentKey||record.sha256!==reference.sha256
    ||planetaryWritingHash(record.snapshot)!==reference.sha256)throw new AdminHttpError(503,'The complete private writing record was not confirmed. Publication was stopped.');
  return record.snapshot;
}

export async function inspectPlanetaryWriting(row:any){
  const snapshot=row.source_snapshot??{},g=snapshot.planetaryGeneration??{};
  return isReference(g)?readPrivateRecord(row.content_key,g):snapshot;
}

/** Even direct LIVE-row reads contain no prompts, private feedback or draft history.
 * The existing ARCHIVED/reference RLS boundary protects the lossless private record. */
export async function planetaryPublicationPrivacyPatch(row:any){
  if(!String(row.content_key??'').startsWith(PLANETARY_HOROSCOPE_PREFIX)||row.status!=='LIVE')return {};
  assertPlanetaryHoroscopeRow(row,true);
  let snapshot=row.source_snapshot??{};
  const g=snapshot.planetaryGeneration;
  if(g?.active)throw new AdminHttpError(409,'Retrieve the existing planetary writing request before publishing.');
  if(!row.id)throw new AdminHttpError(409,'Save this planetary horoscope set before publishing.');
  let reference=g;
  if(isReference(g)){
    const retained=await readPrivateRecord(row.content_key,g);
    // A private revision adds its target metadata to a narrowed LIVE snapshot.
    // Restore the complete writing history before retaining that revision, so
    // its download never stops at another private-record reference.
    if(Object.keys(snapshot).some(k=>!publicSnapshotKeys.includes(k)))snapshot={...retained,...snapshot,planetaryGeneration:retained.planetaryGeneration};
  }
  if(!isReference(g)||Object.keys(snapshot).some(k=>!publicSnapshotKeys.includes(k))){
    const sha256=planetaryWritingHash(snapshot);
    reference={schema:'private-planetary-writing-reference/v1',privateRecordKey:`${PLANETARY_PRIVATE_PREFIX}${row.id}/${sha256}`,sha256};
    const {url,headers}=studioStorage();
    const result=await adminFetchJson(`${url}?on_conflict=content_key,target_date,mode`,{method:'POST',
      headers:{...headers,prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({
        content_key:reference.privateRecordKey,surface:'sky',mode:'studio-draft',event_type:'planetary-writing-record',target_date:null,
        status:'ARCHIVED',lane:'reference',review_state:null,headline:'Private planetary writing record',body:'',
        sections:{planetaryWritingRecord:{schema:'private-planetary-writing-record/v1',contentKey:row.content_key,sha256,snapshot}},
        source_snapshot:{content_role:'source_material',review_status:'needs_review'},provider:'content-studio',prompt_version:'private-planetary-writing-record/v1'
      })},30000);
    if(!result.ok)throw new AdminHttpError(503,'The private writing record could not be retained. Publication was stopped.');
    // A repeated publication can find an existing immutable record after an uncertain response.
    await readPrivateRecord(row.content_key,reference);
  }
  return {source_snapshot:{content_role:'authored_card',review_status:'approved',studioOwnerApproval:snapshot.studioOwnerApproval,planetaryGeneration:reference}};
}
