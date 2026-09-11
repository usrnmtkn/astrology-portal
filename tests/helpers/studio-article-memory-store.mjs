import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { createStudioMemoryDb, databaseFetch } from './studio-memory-db.mjs';
import { createApiStore } from './calendar-review-api.mjs';
import { compileSkyArticleEdition } from '../../apps/web/src/content/skyArticleTemplateCompiler.ts';

const db = await createStudioMemoryDb();
const edition = await compileSkyArticleEdition({
  templateKey:'sky/article-template/saturn/ingress',templateBody:'# Synthetic article\n\n{{opener}}\n\n{{risingBlocks}}',
  planet:'saturn',sign:'aries',entryYear:2026,validFrom:'2026-02-14',validTo:'2028-04-11',
  transitStartInstant:'2026-02-14T00:00:00Z',transitEndInstant:'2028-04-12T00:00:00Z',
  slotValues:{opener:'Synthetic complete article opening. Synthetic final sentence.'}, tldr:'Synthetic summary.',
  housePassages:Array.from({length:12},(_,i)=>({house:i+1,risingSign:'aries',contentKey:`synthetic/house/${i+1}`,body:`Synthetic complete house ${i+1} opening. Synthetic house ending.`})),aspectPassages:[]
});
const id='22222222-2222-4222-8222-222222222222';
const initial={id,content_key:edition.contentKey,surface:'sky',mode:'article',event_type:'sky-article-edition',
  block_type:'sky_article',target_date:'2026-02-14',status:'DRAFT',lane:'reference',review_state:'owner-review-required',
  headline:edition.headline,summary:edition.tldr,body:edition.body,sections:{skyArticleEdition:edition},source_snapshot:{},updated_at:'2026-09-10T12:00:00Z'};
const store=await createApiStore([initial]);
async function persist(row,insert=false){
  if(insert)await db.query('insert into generated_interpretations select * from jsonb_populate_record(null::generated_interpretations,$1)',[JSON.stringify(row)]);
  else await db.query(`update generated_interpretations set (body,status,updated_at,headline,summary,sections,source_snapshot,event_type,review_state) =
    (select body,status,updated_at,headline,summary,sections,source_snapshot,event_type,review_state from jsonb_populate_record(null::generated_interpretations,$1)) where id=$2`,[JSON.stringify(row),row.id]);
}
await persist(initial,true);
Object.assign(process.env,{STUDIO_MEMORY_FEEDBACK_ENABLED:'true',SUPABASE_URL:'https://studio-memory.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic'});
const originalFetch=globalThis.fetch, memoryFetch=databaseFetch(db);
globalThis.fetch=async(input,init={})=>{
  const url=new URL(String(input));
  if(url.pathname==='/rest/v1/generated_interpretations'){
    url.host='calendar-api.invalid';const result=await originalFetch(url,init);
    if(result.ok && init.method==='POST'){
      const rows=await result.json();
      for(const row of rows){const oldId=row.id;row.id=randomUUID();store.rows.delete(oldId);store.rows.set(row.id,row);await persist(row,true);}
      return Response.json(rows);
    }
    if(result.ok && init.method==='PATCH')for(const row of await result.clone().json())await persist(row);
    return result;
  }
  return memoryFetch(input,init);
};
const {default:handler}=await import('../../api/admin/studio-memory-feedback.ts');
async function review(row,status='active',scope='passage',reason=''){
  const req=Readable.from([JSON.stringify({id:row.id,version:row.version,status,scope,reason})]);
  Object.assign(req,{method:'POST',url:'/api/admin/studio-memory-feedback',headers:{'x-content-generation-secret':'calendar-api-fixture'}});
  const res={statusCode:0,setHeader(){},end(text){this.payload=JSON.parse(text)}};await handler(req,res);return res;
}

export { db, edition, id, initial, store, persist, review };
