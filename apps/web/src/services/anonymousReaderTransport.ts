import { publicationLedgerBoundaries } from '../content/contentPublicationState';
import { canonicalPublicationLedger } from './publicationLedgerTransport';
import { withRequestDeadline } from './requestDeadline';

/** Exactly the existing anonymous public queries. User sessions and elevated
 * credentials never enter this transport. No content is installed here. */
export function createAnonymousReaderTransport(base: string, key: string) {
  let anonymous = key.startsWith('sb_publishable_');
  if (!anonymous) {
    try { anonymous = JSON.parse(atob(key.split('.')[1].replace(/-/gu,'+').replace(/_/gu,'/'))).role === 'anon'; }
    catch { /* An unknown key cannot authorize public transport. */ }
  }
  if (!base || !anonymous) return null;
  const origin = base.replace(/\/$/u,'');
  const headers: Record<string,string> = { apikey: key };
  if (!key.startsWith('sb_publishable_')) headers.authorization = `Bearer ${key}`;
  return {
    async publications() {
      const pages = await Promise.all(publicationLedgerBoundaries.slice(0,-1).map(async (lower,index) => {
        const upper=publicationLedgerBoundaries[index+1], records=[];
        let cursor: string | null=null;
        for (;;) {
          const params=new URLSearchParams({select:'content_key,state,revision,row_id,row_updated_at,updated_at',order:'content_key.asc',limit:'1000'});
          if(lower) params.append('content_key',`gte.${lower}`);
          if(upper) params.append('content_key',`lt.${upper}`);
          if(cursor) params.append('content_key',`gt.${cursor}`);
          const rows=await withRequestDeadline(async signal => {
            const response=await fetch(`${origin}/rest/v1/content_publications?${params}`,{headers,signal,cache:'no-store'});
            if(!response.ok) throw new Error('Public publication read failed.');
            return canonicalPublicationLedger(await response.json());
          });
          if(rows.some(row=>lower&&row.content_key<lower||upper&&row.content_key>=upper||cursor&&row.content_key<=cursor)) throw new Error('Invalid public publication range.');
          records.push(...rows);
          if(rows.length<1000) return records;
          cursor=rows[rows.length-1].content_key;
        }
      }));
      return canonicalPublicationLedger(pages.flat());
    },
    async revision(provider: string) {
      try {
        const data=await withRequestDeadline(async signal=>{
          const response=await fetch(`${origin}/rest/v1/rpc/content_runtime_revision`,{
            method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({p_provider:provider}),signal,cache:'no-store'
          });
          if(!response.ok) throw new Error('Public content revision read failed.');
          return response.json();
        });
        return {data,error:null};
      } catch(error) { return {data:null,error}; }
    }
  };
}

const transport=createAnonymousReaderTransport(import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
export function anonymousReaderAvailable() { return transport !== null; }
export function loadAnonymousPublicationLedger() {
  if(!transport) return Promise.reject(new Error('Anonymous public reader configuration unavailable.'));
  return transport.publications();
}
export function readAnonymousRuntimeRevision(provider: string) {
  if(!transport) return Promise.reject(new Error('Anonymous public reader configuration unavailable.'));
  return transport.revision(provider);
}
