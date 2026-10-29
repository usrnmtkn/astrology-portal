// Private synthetic seam: actual handlers and actual publication lifecycle migrations.
import { Readable } from 'node:stream';
import { readFileSync } from 'node:fs';
import { createCalendarAspectPublicationStore } from './calendar-aspect-publication-store.mjs';
import { callPublicationRpc } from './studio-publication-db.mjs';
import { publicationLedgerKey } from '../../apps/web/src/content/contentPublicationState.ts';
const env = { NODE_ENV:'test', CONTENT_GENERATION_SECRET:'qa-secret', SUPABASE_URL:'https://library-db.invalid', SUPABASE_SERVICE_ROLE_KEY:'synthetic-fixture', SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_fixture' };
Object.assign(process.env,env);
const initial = JSON.parse(readFileSync(process.env.CALENDAR_REVIEW_FIXTURE!, 'utf8'));
if(!Array.isArray(initial) || initial.some(row=>!['DRAFT','ARCHIVED'].includes(row.status))) throw new Error('Use an unpublished synthetic baseline.');
const storage = await createCalendarAspectPublicationStore(env.SUPABASE_URL, initial);
await storage.db.query('insert into content_publications(content_key,state) values($1,$2)',[publicationLedgerKey,'live']);
for(const row of initial) await storage.db.query("insert into content_publications(content_key,state) select $1,'retired' where not exists(select 1 from content_publications where content_key=$1)",[row.content_key]);
globalThis.fetch = async(input, init = {}) => {
 const url=new URL(String(input));
 const rpc=url.pathname.split('/').at(-1)!;
 if(url.origin===env.SUPABASE_URL && url.pathname.startsWith('/rest/v1/rpc/')
   && ['content_studio_publication_receipt','content_studio_publish_revision'].includes(rpc)){
  if(init.method!=='POST')throw new Error('Publication RPC requires POST');
  try{return Response.json(await callPublicationRpc(storage.db,rpc,JSON.parse(String(init.body))));}
  catch(error:any){return Response.json({code:error.code,message:error.message},{status:error.code==='40001'?409:400});}
 }
 return storage.fetch(input,init);
};
const handlers = {
 '/api/admin/generated-content': (await import('../../api/admin/generated-content.ts')).default,
 '/api/admin/generated-content-inventory': (await import('../../api/admin/generated-content-inventory.ts')).default,
 '/api/admin/content-live-status': (await import('../../api/admin/content-live-status.ts')).default,
 '/api/admin/content-history': (await import('../../api/admin/content-history.ts')).default,
 '/api/admin/content-publication': (await import('../../api/admin/content-publication.ts')).default,
 '/api/content-publications': (await import('../../api/content-publications.ts')).default,
 '/api/content-reader': (await import('../../api/content-reader.ts')).default
};
Object.assign(process.env,env);
process.on('message', async ({id,method,body,url='/api/admin/generated-content'}:any) => {
 try {
  let result:any;
  if(method==='prepare-publication') result=true;
  else if(method==='rows' || method==='publications') result=(await storage.db.query(`select to_jsonb(t) as row from ${method==='rows'?'generated_interpretations':'content_publications'} t`)).rows.map((r:any)=>r.row);
  else if(method==='publication-page') { const response=await storage.fetch(new URL(url,env.SUPABASE_URL).href);result={status:response.status,payload:await response.json()}; }
  else {
   const handler=handlers[new URL(url,'http://synthetic.invalid').pathname as keyof typeof handlers];
   if(!handler)throw new Error('Unadmitted handler');
   const request=Object.assign(Readable.from(body===undefined?[]:[JSON.stringify(body)]),{method,url,headers:{authorization:'Bearer qa-secret','x-content-generation-secret':'qa-secret'}});
   let payload:any;const headers:Record<string,string>={};const response={statusCode:200,setHeader(name:string,value:string){headers[name]=String(value);},end(text?:string){payload=text?JSON.parse(text):null;}};
   await handler(request as any,response as any);result={status:response.statusCode,payload,headers};
  }
  process.send!({id,result});
 }catch(error){process.send!({id,error:String(error)});}
});
process.send!({ready:true});
