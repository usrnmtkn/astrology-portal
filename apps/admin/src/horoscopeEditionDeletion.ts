import {horoscopeSignLabel,horoscopeWindowLabel} from '../../web/src/content/horoscopeEditions.mjs';

type Request=(url:string,body?:unknown,method?:string)=>Promise<any>;

/** Delete only the exact edition/version the owner confirmed. An uncertain
 * acknowledgement permits a readback, never an automatic second DELETE. */
export async function deleteHoroscopeEdition(row:any,request:Request,confirm:(message:string)=>boolean){
  if(row?.status==='LIVE')throw new Error('Archive the published edition before deleting it.');
  if(typeof row?.id!=='string'||typeof row.updated_at!=='string'||!row.content_key?.startsWith('horoscope/'))
    throw new Error('Refresh the saved edition before deleting it.');
  const edition=row.sections.horoscopeEdition;
  const kind=row.event_type==='horoscope-edition-revision'?'draft revision':'edition';
  const label=horoscopeSignLabel(edition.window.period)+' '+kind+' · '+horoscopeWindowLabel(edition.window)+' · '+edition.window.timeZone.replaceAll('_',' ');
  const readings=edition.passages.length===1?'the saved reading':'all '+edition.passages.length+' saved readings';
  if(!confirm('Permanently delete '+label+'? This removes '+readings+' and cannot be undone.'))return false;
  const endpoint='/api/admin/generated-content';
  try{
    const result=await request(endpoint+'?'+new URLSearchParams({id:row.id,expectedUpdatedAt:row.updated_at}),undefined,'DELETE');
    if(result.rows?.length===1&&result.rows[0].id===row.id&&result.rows[0].updated_at===row.updated_at)return true;
    throw new Error('The deletion acknowledgement could not be confirmed.');
  }catch(error){
    const status=(error as any)?.status;
    if(status>=400&&status<500&&![408,429].includes(status))throw error;
    const latest=await request(endpoint+'?'+new URLSearchParams({horoscopeEditions:'true',id:row.id}),undefined,'GET');
    if(Array.isArray(latest.rows)&&latest.rows.length===0)return true;
    throw error;
  }
}
