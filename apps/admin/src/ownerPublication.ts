type Row = {id:string;content_key:string;updated_at?:string|null;status?:string;lane?:string|null;source_snapshot?:Record<string,any>|null};
type Result = {ok:boolean;rows?:Row[];publicationReceipt?:{currentPublicationState?:string}};
/** Recover a lost reply by reading the exact saved-version approval, never by replaying a write. */
export async function publishSavedOwnerContent<T extends Row>(row:T, write:()=>Promise<Result>, read:()=>Promise<Result>):Promise<{ok:boolean;rows:T[]}> {
  try {
    const result=await write();
    const saved=result.rows?.[0];
    if(!result.ok||saved?.id!==row.id||saved.status!=='LIVE'||saved.lane!=='serving'
      ||saved.source_snapshot?.studioOwnerApproval?.savedVersion!==row.updated_at)throw new Error('Publication was not confirmed.');
    return result as {ok:boolean;rows:T[]};
  }
  catch(error) {
    const status=Number((error as {status?:number})?.status);
    if([400,401,403,404,422].includes(status))throw error;
    try {
      const result=await read();
      const latest=result.rows?.find(saved=>saved.id===row.id);
      const approval=latest?.source_snapshot?.studioOwnerApproval;
      if(result.ok&&latest?.status==='LIVE'&&latest.lane==='serving'
        &&approval?.savedVersion===row.updated_at
        &&approval?.action==='publish-owner-content'
        &&['live','dated'].includes(result.publicationReceipt?.currentPublicationState??''))return {ok:true,rows:[latest as T]};
    } catch { /* Retain the original failure when status cannot be confirmed. */ }
    throw error;
  }
}

export function ownerPublicationStatusPath(row:Row) {
  return '/api/admin/generated-content?'+new URLSearchParams({id:row.id,expectedUpdatedAt:row.updated_at??'',publicationAction:'publish-owner-content'});
}
