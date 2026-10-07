import {defaultLunationProfile,LUNATION_PROFILE_KEY} from '../../src/astro-writing/lunationWritingProfile.mjs';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const env={NODE_ENV:'test',CONTENT_GENERATION_SECRET:'calendar-api-fixture',SUPABASE_URL:'https://lunation-test.invalid',SUPABASE_SERVICE_ROLE_KEY:'test-only',OPENAI_API_KEY:'test-only',STUDIO_MEMORY_FEEDBACK_ENABLED:'false'};
Object.assign(process.env,env);
const {default:handler}=await import('../../api/admin/lunation-writing');
Object.assign(process.env,env);
export const rows=new Map<string,any>();
export const feedbackFixture={rows:[] as any[],fail:false};
export const storageFixture={beforePatch:null as null|(()=>unknown)};
rows.set('shared-guidance-fixture',{id:'shared-guidance-fixture',content_key:LUNATION_PROFILE_KEY,mode:'article',target_date:null,status:'DRAFT',lane:'reference',body:'',summary:'',updated_at:'2026-09-27T00:00:00Z',source_snapshot:{revision:1},sections:{writingProfile:{...defaultLunationProfile(),voiceGuidance:'Synthetic shared guidance marker. Develop a thought through its consequence.'}}});
export const providerFixture={calls:0,polls:0,requests:[] as any[],fail:false,pending:false,pollFailures:0,terminalStatus:'',draft:null as null|{headline:string,body:string}};
const matches=(row:any,params:URLSearchParams)=>[...params].every(([key,value])=>{
  if(['select','order','limit'].includes(key))return true;
  if(value==='is.null')return row[key]==null;
  if(value.startsWith('like.')&&value.endsWith('*'))return row[key]?.startsWith(value.slice(5,-1));
  if(value.startsWith('eq.'))return String(row[key])===value.slice(3);
  throw new Error(`Unmodeled query ${key}`);
});
globalThis.fetch=async(input:any,options:any={})=>{
  const url=new URL(String(input));
  if(url.origin==='https://api.openai.com'){
    if(options.method==='POST'){
      providerFixture.calls++;providerFixture.requests.push(JSON.parse(options.body));
      if(providerFixture.fail)return Response.json({error:'synthetic decline'},{status:429});
      return Response.json({id:'resp_lunation_fixture',status:'queued'});
    }
    providerFixture.polls++;
    if(providerFixture.pollFailures>0){providerFixture.pollFailures--;return Response.json({error:'Synthetic retrieval outage'},{status:503});}
    return Response.json(providerFixture.terminalStatus?{status:providerFixture.terminalStatus}:providerFixture.pending?{status:'in_progress'}:{status:'completed',usage:{output_tokens:20},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(providerFixture.draft??{headline:'Synthetic lunar article',body:'You can explore this synthetic possibility. A practical change may give you something specific to consider.\n\nYou can return to the conversation with a clearer question.'})}]}]});
  }
  if(url.origin===env.SUPABASE_URL&&url.pathname==='/rest/v1/studio_writing_feedback')return feedbackFixture.fail?Response.json({}, {status:503}):Response.json(feedbackFixture.rows.filter(row=>url.searchParams.get('target_keys')===`cs.{${row.target_keys[0]}}`));
  if(url.origin!==env.SUPABASE_URL||url.pathname!=='/rest/v1/generated_interpretations')throw new Error(`External request refused: ${url.origin}${url.pathname}`);
  if(options.method==='PATCH'&&storageFixture.beforePatch){const beforePatch=storageFixture.beforePatch;storageFixture.beforePatch=null;beforePatch();}
  const found=[...rows.values()].filter(r=>matches(r,url.searchParams));
  if(!options.method||options.method==='GET')return Response.json(found);
  // jsonb round-trips do not preserve object insertion order.
  const patch=JSON.parse(options.body,(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value);
  if(options.method==='POST'){
    if([...rows.values()].some(r=>r.content_key===patch.content_key&&r.mode===patch.mode&&r.target_date===patch.target_date))return Response.json({code:'23505'},{status:409});
    const created={...patch,id:randomUUID()};rows.set(created.id,created);return Response.json([created]);
  }
  if(options.method==='PATCH'){
    const saved=found.map(r=>({...r,...patch}));for(const r of saved)rows.set(r.id,r);return Response.json(saved);
  }
  throw new Error('Unexpected fixture mutation');
};
export async function invoke(method:string,body?:unknown,url='/api/admin/lunation-writing',secret='calendar-api-fixture') {
  if(method==='rows')return [...rows.values()];
  if(method==='provider'){Object.assign(providerFixture,body??{});return providerFixture;}
  const req=Readable.from(body===undefined?[]:[JSON.stringify(body)]);
  Object.assign(req,{method,url,headers:{authorization:`Bearer ${secret}`}});
  const endpoint=url.startsWith('/api/admin/calendar-lunation-writing')?(await import('../../api/admin/calendar-lunation-writing')).default:handler;
  return new Promise<any>((resolve,reject)=>{
    const res={statusCode:200,setHeader(){},end(text:string){resolve({status:this.statusCode,payload:JSON.parse(text)});}};
    endpoint(req as any,res as any).catch(reject);
  });
}
if(process.argv.includes('--ipc')&&process.argv[1]===fileURLToPath(import.meta.url)) {
  process.on('message',async({id,method,body,url}:any)=>{
    try{process.send?.({id,result:await invoke(method,body,url)});}catch(error){process.send?.({id,error:String(error)});}
  });process.send?.({ready:true});
}
