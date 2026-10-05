// Actual mutation handler + isolated PostgreSQL engine; synthetic records only.
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const env={NODE_ENV:'test',CONTENT_GENERATION_SECRET:'save-db-fixture',SUPABASE_URL:'https://save-db.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture'};
Object.assign(process.env,env);
const {default:handler}=await import(root+'/api/admin/generated-content.ts');Object.assign(process.env,env);
const {createPublicationDb}=await import(root+'/tests/helpers/studio-publication-db.mjs');
const db=await createPublicationDb();const results=[];
try{
 await db.exec('alter table generated_interpretations alter column id set default gen_random_uuid(); alter table generated_interpretations alter column updated_at set default clock_timestamp(); set role service_role;');
 const fields=new Set((await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='generated_interpretations'")).rows.map(r=>r.column_name));
 let count=0;
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(String(input));assert.equal(url.origin,env.SUPABASE_URL);count++;
  if(url.pathname==='/rest/v1/rpc/content_studio_publication_receipt')return Response.json(null);
  assert.equal(url.pathname,'/rest/v1/generated_interpretations');
  const values=[],clauses=[];const bind=v=>{values.push(v);return '$'+values.length;};
  for(const [k,v]of url.searchParams){if(['select','limit','offset','order','on_conflict'].includes(k))continue;assert.ok(fields.has(k));if(v==='is.null')clauses.push(k+' is null');else if(v.startsWith('eq.'))clauses.push(k+'='+bind(v.slice(3)));else throw Error('Unknown filter '+k+'='+v);}
  const where=clauses.length?' where '+clauses.join(' and '):'';let sql;
  if((options.method??'GET')==='GET')sql='select * from generated_interpretations'+where;
  else{
   const patch=JSON.parse(String(options.body));assert.ok(!Array.isArray(patch));for(const k of Object.keys(patch))assert.ok(fields.has(k));
   const val=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)?JSON.stringify(v):v;
   if(options.method==='POST'){const columns=Object.keys(patch);sql='insert into generated_interpretations ('+columns.join(',')+') values ('+columns.map(k=>bind(val(patch[k]))).join(',')+') returning *';}
   else {assert.equal(options.method,'PATCH');sql='update generated_interpretations set '+Object.entries(patch).map(([k,v])=>k+'='+bind(val(v))).join(',')+where+' returning *';}
  }
  return Response.json((await db.query(sql,values)).rows);
 };
 async function invoke(method,body,query=''){const req=Object.assign(Readable.from(body===undefined?[]:[JSON.stringify(body)]),{method,url:'/api/admin/generated-content'+query,headers:{authorization:'Bearer '+env.CONTENT_GENERATION_SECRET}});const res={statusCode:0,payload:undefined,setHeader(){},end(s){this.payload=JSON.parse(s)}};await handler(req,res);assert.equal(res.statusCode,200,JSON.stringify(res.payload));return res.payload.rows;}
 const initial=[];for(let i=0;i<5;i++){const [row]=await invoke('POST',{contentKey:'cms/qa/save-performance/'+i,surface:'sky',mode:'feed',eventType:'cms-surface-override',status:'DRAFT',body:'Synthetic complete opening.\n\nSynthetic final sentence.',headline:'Synthetic QA'});initial.push(row);}
 for(const concurrency of [1,5]){
  const timings=[];
  for(let batch=0;batch<100/concurrency;batch++)await Promise.all(Array.from({length:concurrency},async(_,i)=>{const prev=initial[i];const body=`Synthetic save ${concurrency}/${batch}/${i}.\n\nSynthetic final sentence.`;const start=performance.now();const [saved]=await invoke('PATCH',{id:prev.id,expectedUpdatedAt:prev.updated_at,body});const [read]=await invoke('GET',undefined,'?id='+saved.id);assert.equal(read.body,body);assert.equal(read.id,prev.id);assert.ok(Date.parse(read.updated_at)>Date.parse(prev.updated_at));assert.equal(read.status,'DRAFT');initial[i]=read;timings.push(performance.now()-start);}));
  timings.sort((a,b)=>a-b);assert.ok(timings[94]<=2000);results.push({concurrency,samples:timings.length,p95Ms:Math.round(timings[94]),maximumMs:Math.round(timings.at(-1)),budgetMs:2000});
 }
 const report={cases:200,results,storageRequests:count,dbRole:'service_role',engine:'PGlite with actual publication/version migrations',limitations:'No remote network or Supabase Auth latency; concurrent requests are multiplexed onto one PGlite backend. Separate hosted PostgreSQL-session tests cover lock races.'};if(process.env.STUDIO_QA_SAVE_REPORT)writeFileSync(process.env.STUDIO_QA_SAVE_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await db.close();}
