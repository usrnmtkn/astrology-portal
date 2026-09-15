import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { createMonthlyWritingHandler } from '../../api/admin/monthly-writing';
import { readMonthlyDocument, saveMonthlyDocument, type MonthlyStorage } from '../../api/_lib/monthly-authoring-storage';
import { monthlyTargets } from '../../src/monthly-writing/model';
import { monthlyFixture } from '../monthly-writing/fixtures';
/** Actual handlers and actual PostgreSQL update/version behavior, isolated from production. */
export async function createMonthlyApiFixture() {
  const db = new PGlite();
  await db.exec('create schema auth; create table auth.users(id uuid primary key);');
  await db.exec(readFileSync(new URL('../../apps/web/supabase/migrations/20260604183000_generated_interpretations.sql',import.meta.url),'utf8'));
  await db.exec("alter table generated_interpretations add column lane text, add column review_state text, add column provider text;");
  const mutations:any[]=[];let loseResponse=false,generations=0;
  let library:any[]=[];
  const storage:MonthlyStorage=async(params,options={})=> {
    const values:any[]=[],clauses:string[]=[];
    const allowed=['id','content_key','mode','status','lane','updated_at'];
    for(const [key,value] of params) {
      if(['limit','offset','order','select'].includes(key)) continue;
      if(!allowed.includes(key)||!value.startsWith('eq.')) throw new Error(`Unsupported test storage condition ${key}`);
      values.push(value.slice(3));clauses.push(`${key}=$${values.length}`);
    }
    const where=clauses.length?`where ${clauses.join(' and ')}`:'';
    let sql:string;
    if(!options.method||options.method==='GET') sql=`select row_to_json(t) as row from (select * from generated_interpretations ${where} limit 100) t`;
    else {
      const row=JSON.parse(options.body!);mutations.push({method:options.method,row});
      const keys=Object.keys(row);
      if(keys.some(key=>!['id','content_key','mode','surface','event_type','target_date','status','lane','review_state','provider','prompt_version','headline','body','summary','sections','source_snapshot','updated_at'].includes(key))) throw new Error('Unexpected test column');
      const assignments=keys.map(key=>{values.push(typeof row[key]==='object'&&row[key]!==null?JSON.stringify(row[key]):row[key]);return `${key}=$${values.length}`;});
      sql=options.method==='PATCH'?`with changed as (update generated_interpretations set ${assignments.join(',')} ${where} returning *) select row_to_json(changed) as row from changed`:`with changed as (insert into generated_interpretations (${keys.join(',')}) values (${values.map((_,i)=>`$${i+1}`).join(',')}) returning *) select row_to_json(changed) as row from changed`;
    }
    let rows:any[];
    try { rows=(await db.query(sql,values)).rows.map((result:any)=>result.row); }
    catch(error:any){return {ok:false,status:error.code==='23505'?409:400,payload:{message:error.message}};}
    if(options.method&&loseResponse){loseResponse=false;throw new Error('Synthetic transport response lost after commit');}
    return {ok:true,status:200,payload:rows};
  };
  process.env.CONTENT_GENERATION_SECRET='monthly-fixture';
  const handler=createMonthlyWritingHandler({
    read:key=>readMonthlyDocument(key,storage),save:(value,version)=>saveMonthlyDocument(value,version,storage),library:async()=>library,
    calculate:async(month,zone)=>monthlyFixture(month,zone),
    generate:async(input)=>{generations++;return {changes:monthlyTargets(input.facts,input.edition,input.library).targets.filter(target=>input.targetIds.includes(target.id)).map(target=>({id:target.id,eventId:target.eventId,name:target.name,value:target.definition.grammar==='verb-phrase'?'make a fixture change':'a fixture experience'})),generation:{provider:'fixture',model:'no-model-call',generatedAt:new Date().toISOString(),ownerApproved:false,memoryReceipt:{selected:[],privateFeedback:'synthetic fixture'},evidenceReceipt:{ownerExampleKeys:[]}}} as any;}
  });
  const invoke=async(method:string,body?:any,url='/api/admin/monthly-writing?month=2026-09&timeZone=America%2FNew_York',credential='monthly-fixture')=>{
    const req=Readable.from(body?[JSON.stringify(body)]:[]);Object.assign(req,{method,url,headers:credential?{'x-content-generation-secret':credential}:{}});
    const res:any={statusCode:0,headers:{},setHeader(k:string,v:string){this.headers[k.toLowerCase()]=v;},end(text:string){this.payload=JSON.parse(text);}};
    await handler(req as any,res);return {status:res.statusCode,payload:res.payload,headers:res.headers};
  };
  return {db,storage,invoke,mutations,get generations(){return generations;},loseNextWriteResponse(){loseResponse=true;},setLibrary(value:any[]){library=value;}};
}
