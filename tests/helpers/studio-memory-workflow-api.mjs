import { Readable } from 'node:stream';
import { createWorkflowStore, baseline } from './sky-review-workflow-api.mjs';
import { createStudioMemoryDb, databaseFetch } from './studio-memory-db.mjs';

const fixture = {...baseline,id:'11111111-1111-4111-8111-111111111111'};
const store = await createWorkflowStore([fixture]);
const db = await createStudioMemoryDb();
await db.query('insert into generated_interpretations (id,content_key,surface,mode,target_date,body,status,updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8)',
  [fixture.id,fixture.content_key,'sky','feed',null,fixture.body,fixture.status,fixture.updated_at]);
process.env.STUDIO_MEMORY_FEEDBACK_ENABLED = 'true';
const {default:feedbackHandler} = await import('../../api/admin/studio-memory-feedback.ts');
const {default:graphHandler} = await import('../../api/admin/memory-graph.ts');
const originalFetch = globalThis.fetch;
const memoryFetch = databaseFetch(db);
globalThis.fetch = async (input,init={}) => {
  const url = new URL(String(input));
  if (url.pathname.startsWith('/rest/v1/studio_memory_feedback') || url.pathname.includes('/rpc/review_studio_memory_feedback') || url.pathname.includes('/rpc/studio_memory_active_snapshot')) {
    url.host = 'studio-memory.invalid'; return memoryFetch(url,init);
  }
  const response = await originalFetch(input,init);
  if (init.method === 'PATCH' && url.pathname === '/rest/v1/generated_interpretations' && response.ok) {
    for (const row of await response.clone().json()) if (row.id === fixture.id) {
      await db.query('update generated_interpretations set body=$1,status=$2,updated_at=$3 where id=$4',
        [row.body,row.status,row.updated_at,row.id]);
    }
  }
  return response;
};
async function invoke(handler, method, body, url) {
  const req=Readable.from(body?[JSON.stringify(body)]:[]);
  Object.assign(req,{method,url,headers:{'x-content-generation-secret':'calendar-api-fixture'}});
  const res={statusCode:0,setHeader(){},end(value){this.payload=JSON.parse(value);}};
  await handler(req,res); return {status:res.statusCode,payload:res.payload};
}
process.on('message',async ({id,method,body,url})=>{
  try {
    const result = method === 'rows' ? [...store.rows.values()]
      : url?.startsWith('/api/admin/studio-memory-feedback') ? await invoke(feedbackHandler,method,body,url)
      : url?.startsWith('/api/admin/memory-graph') ? await invoke(graphHandler,method,body,url)
      : url?.startsWith('/api/admin/sky-draft-writing') ? await store.write(body)
      : await store.invoke(method,body,url);
    process.send({id,result});
  } catch(error){process.send({id,error:String(error)});}
});
process.send({ready:true});
