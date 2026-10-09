// Isolated handler + PostgreSQL-engine benchmark. No remote transport or credentials.
import assert from 'node:assert/strict';
import { studioInventoryPageSize } from '../apps/admin/src/studioInventoryPagination';
import { PGlite } from '@electric-sql/pglite';
import { Readable } from 'node:stream';
import { writeFileSync } from 'node:fs';
const env = {NODE_ENV:'test', CONTENT_GENERATION_SECRET:'inventory-performance-fixture', SUPABASE_URL:'https://inventory-performance.invalid', SUPABASE_SERVICE_ROLE_KEY:'fixture'};
Object.assign(process.env,env);
const {default:handler} = await import('../api/admin/generated-content-inventory.ts');
Object.assign(process.env,env);
const db = new PGlite();
const count = 16000;
const results: any[] = [];
try {
  await db.exec(`create table inventory(id text primary key,content_key text not null,updated_at timestamptz not null,body text,status text, lane text);
    insert into inventory select lpad(i::text,8,'0') || '-0000-4000-8000-000000000000','qa/source/'||i,
      '2026-01-01'::timestamptz + (i/100)*interval '1 second',repeat('Synthetic complete paragraph. ',100),'DRAFT','reference'
      from generate_series(1,16000) i;
    create index inventory_updated_id on inventory(updated_at desc,id desc);
    create index inventory_content_key on inventory(content_key); analyze inventory;`);
  let queries=0;
  globalThis.fetch = async (input, init={}) => {
    const u=new URL(String(input)); assert.equal(u.origin,env.SUPABASE_URL); assert.equal(init.method??'GET','GET'); queries++;
    const p=u.searchParams, values: any[]=[], where: string[]=[];
    const bind=(v:unknown)=>{values.push(v);return `$${values.length}`;};
    if(p.has('id')) where.push(`id=${bind(p.get('id')!.slice(3))}`);
    if(p.has('updated_at'))where.push(`updated_at<=${bind(p.get('updated_at')!.slice(4))}::timestamptz`);
    if(p.has('or')){
      const m=/^\(updated_at\.lt\.([^,]+),and\(updated_at\.eq\.[^,]+,id\.lt\.([^()]+)\)\)$/.exec(p.get('or')!);assert.ok(m);
      const t=bind(m[1]);where.push(`(updated_at<${t}::timestamptz or (updated_at=${t}::timestamptz and id<${bind(m[2])}))`);
    }
    for(const key of p.keys())assert.ok(['id','updated_at','or','limit','select','order'].includes(key),`Unmodeled predicate ${key}`);
    const detail=p.get('select')!.split(',').includes('body');
    const rows=(await db.query(`select id,content_key,to_char(updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated_at,status,lane${detail?',body':''} from inventory ${where.length?'where '+where.join(' and '):''} order by updated_at desc,id desc limit ${bind(Number(p.get('limit')))}`,values)).rows;
    return Response.json(rows);
  };
  async function request(params: Record<string,string>) {
    const req=Object.assign(Readable.from([]),{method:'GET',url:`/api/admin/generated-content-inventory?${new URLSearchParams(params)}`,headers:{authorization:`Bearer ${env.CONTENT_GENERATION_SECRET}`}});
    const res={statusCode:0,payload:undefined as any,setHeader(){},end(s){this.payload=JSON.parse(s);}};
    await handler(req,res as any);assert.equal(res.statusCode,200);return res.payload;
  }
  const coldStart=performance.now();await request({limit:'80'});const coldMs=performance.now()-coldStart;
  const ids=new Set<string>();let cursor:string|null=null;let pages=0;
  do {
    const result=await request({limit:'80',...(cursor?{cursor}:{})});pages++;
    for(const row of result.rows){assert.ok(!ids.has(row.id),'Duplicate paginated row');ids.add(row.id);assert.equal(row.body,null);}
    cursor=result.nextCursor;
  }while(cursor);
  assert.equal(ids.size,count);assert.equal(pages,201);
  const progressiveIds = new Set<string>(); let progressiveCursor: string | null = null; let progressivePages = 0;
  do {
    const result = await request({limit: String(studioInventoryPageSize(progressiveCursor)), ...(progressiveCursor ? {cursor: progressiveCursor} : {})});
    progressivePages++;
    for (const row of result.rows) { assert.ok(!progressiveIds.has(row.id)); progressiveIds.add(row.id); assert.equal(row.body, null); }
    progressiveCursor = result.nextCursor;
  } while (progressiveCursor);
  assert.deepEqual(progressiveIds, ids); assert.equal(progressivePages, 41);
  const cases=[{name:'inventory',params:{limit:'80'},budgetMs:5000},{name:'continuation inventory',params:{limit:'400'},budgetMs:5000},{name:'detail',params:{id:'00008000-0000-4000-8000-000000000000'},budgetMs:2000},
    {name:'late inventory page',params:{limit:'80',cursor:Buffer.from(JSON.stringify({id:'00008000-0000-4000-8000-000000000000',updatedAt:'2026-01-01T00:01:20.000000Z'})).toString('base64url')},budgetMs:5000}];
  for(const scenario of cases)for(const concurrency of [1,5]){
    const timings:number[]=[];
    for(let batch=0;batch<100/concurrency;batch++)await Promise.all(Array.from({length:concurrency},async()=>{const start=performance.now();const data=await request(scenario.params);if(scenario.name==='detail')assert.equal(data.rows[0].body,'Synthetic complete paragraph. '.repeat(100));timings.push(performance.now()-start);}));
    timings.sort((a,b)=>a-b);const p95Ms=timings[94];assert.ok(p95Ms<=scenario.budgetMs);
    results.push({operation:scenario.name,concurrency,samples:timings.length,p95Ms:Math.round(p95Ms),maximumMs:Math.round(timings.at(-1)!),budgetMs:scenario.budgetMs});
  }
  const report={rows:count,pages,progressivePages,queries,coldHandlerMs:Math.round(coldMs),results,limitations:'PGlite engine with an isolated PostgREST adapter; no network/Auth/CDN latency, no independent database sessions, no production load. Save latency is measured separately by existing mutation tests and production observations.'};
  if(process.env.STUDIO_QA_REPORT)writeFileSync(process.env.STUDIO_QA_REPORT,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{await db.close();}
