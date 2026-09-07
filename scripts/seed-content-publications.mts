import fs from 'node:fs';
import { publicationLedgerKey } from '../apps/web/src/content/contentPublicationState.js';
import { fileURLToPath } from 'node:url';
import { contentLiveStatuses, type LiveStatusRow } from '../api/_lib/content-live-status.js';

/** Generate a compare-and-set seed from actual reader eligibility, never raw LIVE labels. */
export function publicationBootstrap(rows: LiveStatusRow[]) {
  const publishedIds = new Set(contentLiveStatuses(rows, rows).filter(status => status.source === "studio").map(status => status.servingRowId ?? status.id));
  const selected = new Map<string, LiveStatusRow>();
  for (const row of [...rows].sort((a,b)=>(b.updated_at??'').localeCompare(a.updated_at??'') || b.id.localeCompare(a.id))) {
    if (row.target_date || row.status !== 'LIVE' || row.lane !== 'serving' || row.review_state
      || !publishedIds.has(row.id) || selected.has(row.content_key) || !row.updated_at) continue;
    selected.set(row.content_key,row);
  }
  const quote=(value:string)=>`'${value.replaceAll("'","''")}'`;
  const values=[...selected.values()].map(row=>`(${quote(row.content_key)},${quote(row.id)}::uuid,${quote(row.updated_at!)}::timestamptz)`);
  const sql=values.length ? `-- Verified reader publications; preserve concurrent owner actions and reject changed source versions.\nWITH verified(content_key,row_id,row_updated_at) AS (VALUES\n${values.join(',\n')}\n)\nINSERT INTO public.content_publications(content_key,state,row_id,row_updated_at)\nSELECT verified.content_key,'live',verified.row_id,verified.row_updated_at\nFROM verified JOIN public.generated_interpretations source ON source.id=verified.row_id\nAND source.content_key=verified.content_key AND source.updated_at=verified.row_updated_at\nWHERE source.status='LIVE' AND source.lane='serving' AND source.review_state IS NULL AND source.target_date IS NULL\nON CONFLICT(content_key) DO NOTHING;\n` : '-- No eligible Studio overrides to seed.\n';
  return { selected:[...selected.values()], sql: `BEGIN;\nINSERT INTO public.content_publications(content_key,state) VALUES(${quote(publicationLedgerKey)},'live') ON CONFLICT(content_key) DO NOTHING;\n${sql}COMMIT;\n` };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base=(process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL??'https://hdmdufozrgrajkfhydit.supabase.co').replace(/\/$/,'');
  const key=process.env.SUPABASE_PUBLISHABLE_KEY??process.env.VITE_SUPABASE_PUBLISHABLE_KEY??'sb_publishable_iX90KdzcQzw8a8OydBHHXA_COnEMcns';
  const rows:LiveStatusRow[]=[];
  const pageSize=20;
  let cursor:string|null=null;
  for (;;) {
    const params=new URLSearchParams({select:'id,content_key,target_date,status,lane,review_state,updated_at,provider,headline,summary,body,sections,source_snapshot,facts,mode,flags,surface,event_type',status:'eq.LIVE',lane:'eq.serving',review_state:'is.null',target_date:'is.null',order:'id.asc',limit:String(pageSize)});
    if(cursor)params.set('id',`gt.${cursor}`);
    const response=await fetch(`${base}/rest/v1/generated_interpretations?${params}`,{headers:{apikey:key,authorization:`Bearer ${key}`},signal:AbortSignal.timeout(30000)});
    const page=await response.json();
    if(!response.ok||!Array.isArray(page))throw new Error(`Publication preflight failed (${response.status}, ${page?.code ?? "unknown"}: ${page?.message ?? "no detail"}).`);
    rows.push(...page);if(page.length<pageSize)break;cursor=page.at(-1).id;
  }
  const {selected,sql}=publicationBootstrap(rows);
  const output=process.argv.find(value=>value.startsWith('--out='))?.slice(6);
  if(output)fs.writeFileSync(output,sql);
  console.log(JSON.stringify({readRows:rows.length,eligiblePublications:selected.length,excludedRows:rows.length-selected.length,sqlFile:output??null,applied:false}));
}
