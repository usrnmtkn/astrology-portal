import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Readable} from 'node:stream';
import {createPublicationDb,seedPublicationRow} from './studio-publication-db.mjs';
import {servingPackageRecords} from '../../api/_lib/serving-package-records.js';
const env={NODE_ENV:'production',CONTENT_GENERATION_SECRET:'baseline-recovery-fixture',SUPABASE_URL:'https://baseline-recovery.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic-only'};
Object.assign(process.env,env);
const db=await createPublicationDb();
await db.exec(readFileSync(new URL('../../apps/web/supabase/migrations/20261107123057_studio_approved_source_recovery.sql',import.meta.url),'utf8'));
await db.query("insert into content_publications(content_key,state) values('__content-publication-ledger/v1','live')");
const key='fallback-hook/placement-sentence/moon/scorpio';
const record={...servingPackageRecords.get(key),body_you:'Neutral complete source opening. Neutral complete source ending.',body_they:'Neutral complete Friend opening. Neutral complete Friend ending.'};
await seedPublicationRow(db,{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',content_key:key,status:'DRAFT',lane:'serving',review_state:'EDITORIAL_REVIEW_REQUIRED',
  updated_at:'2026-11-07T12:00:00Z',created_at:'2026-11-07T12:00:00Z',headline:'Neutral recovery source',body:record.body_you,summary:'',
  surface:'you',mode:'feed',provider:'tldrastro-fallback-architecture-v3',prompt_version:'synthetic-recovery',block_type:'fallback_hook',sections:{packageRecord:record,packageDraft:record},source_snapshot:{fixture:true},facts:{fallbackArchitectureV3:true}});
globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));assert.equal(url.origin,env.SUPABASE_URL,'Only synthetic SQL storage');
  const rpc=url.pathname.split('/rpc/')[1];
  if(rpc){
    const body=JSON.parse(String(init?.body));assert.equal(init?.method,'POST');
    try{
      if(rpc==='restore_approved_content_sources')return Response.json((await db.query<any>('select restore_approved_content_sources($1,$2::jsonb) result',[body.p_operation_id,JSON.stringify(body.p_sources)])).rows[0].result);
      assert.equal(rpc,'cancel_content_source_recovery');await db.query('select cancel_content_source_recovery($1)',[body.p_operation_id]);return Response.json(null);
    }catch(e:any){return Response.json({code:e.code},{status:e.code==='40001'?409:400});}
  }
  assert.equal(init?.method??'GET','GET');
  const table=url.pathname.split('/').pop();assert(['generated_interpretations','content_publications','content_baseline_recoveries'].includes(table!));
  const filter=table==='generated_interpretations'?'id':table==='content_publications'?'content_key':'operation_id';
  const value=url.searchParams.get(filter);assert(value?.startsWith('eq.'));
  return Response.json((await db.query(`select * from public.${table} where ${filter}=$1`,[value!.slice(3)])).rows);
};
const handler=(await import('../../api/admin/content-baseline-recovery.js')).default;
let tail=Promise.resolve();
process.on('message',(message:any)=>{tail=tail.then(async()=>{
  try{
    let result:any;
    if(message.method==='rows')result=(await db.query('select * from generated_interpretations')).rows;
    else if(message.method==='advance-source'){await db.query("update generated_interpretations set updated_at=clock_timestamp()+interval '1 second' where id=$1",['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']);result={changed:true};}
    else if(message.method==='publications')result=(await db.query('select * from content_publications order by content_key')).rows;
    else if(message.method==='counts')result={archived:(await db.query("select id from generated_interpretations where status='ARCHIVED'")).rows.length,receipts:(await db.query('select operation_id from content_baseline_recoveries')).rows.length};
    else if(message.method==='GET'){
      const url=new URL(message.url,'https://fixture.invalid');const id=url.searchParams.get('id');
      result={status:200,payload:{ok:true,rows:(await db.query('select * from generated_interpretations where id=$1',[id])).rows}};
    }else if(message.method==='recovery'){
      const req:any=Readable.from([JSON.stringify(message.body)]);req.method='POST';req.headers={'x-content-generation-secret':env.CONTENT_GENERATION_SECRET};
      const res:any={statusCode:200,setHeader(){},end(text:string){this.payload=JSON.parse(text);}};await handler(req,res);result={status:res.statusCode,payload:res.payload};
    }else if(message.method==='close'){await db.close();result={closed:true};}
    else throw new Error('Unexpected fixture operation');
    process.send?.({id:message.id,result});
  }catch(error){process.send?.({id:message.id,error:error instanceof Error?error.message:String(error)});}
});});
process.send?.({ready:true,key});
