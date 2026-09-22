// Requires an isolated local PostgreSQL 17 server and psql. Never accepts a remote host.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { publicationMigrations, publicationTestSchema } from '../tests/helpers/studio-publication-db.mjs';
const host=process.env.STUDIO_TEST_PGHOST ?? '127.0.0.1';
if (host !== '127.0.0.1' && host !== 'localhost' && !host.startsWith('/private/tmp/')) throw new Error('Use an isolated local test database only.');
const psql=process.env.STUDIO_TEST_PSQL ?? 'psql';
const database=`tldr_studio_publication_${process.pid}`;
const base=['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-h',host,'-p',process.env.STUDIO_TEST_PGPORT ?? '5432','-U',process.env.STUDIO_TEST_PGUSER ?? 'postgres'];
const literal=value=>value==null?'null':`'${(typeof value==='object'?JSON.stringify(value):String(value)).replaceAll("'","''")}'`;
const admin=sql=>execFileSync(psql,[...base,'-d','postgres','-c',sql],{encoding:'utf8'});
class Session {
 constructor() {
  this.child=spawn(psql,[...base,'-d',database],{stdio:['pipe','pipe','pipe']});this.pending=null;this.output='';this.error='';
  this.child.stdout.on('data',data=>{this.output+=data; if(this.pending && this.output.includes(this.pending.marker)) { const pending=this.pending; const value=this.output.slice(0,this.output.indexOf(pending.marker)).trim(); this.output='';this.pending=null;pending.resolve(value); }});
  this.child.stderr.on('data',data=>{this.error+=data;});
  this.child.on('exit',code=>{if(this.pending){this.pending.reject(new Error(`psql exited ${code}: ${this.error}`));this.pending=null;}});
  this.child.on('error',error=>this.pending?.reject(error));
 }
 query(sql) { assert.equal(this.pending,null,'Queries within one database session must be ordered');return new Promise((resolve,reject)=>{const marker=`DONE_${randomUUID()}`;this.pending={marker,resolve,reject};this.child.stdin.write(`${sql};\n\\echo ${marker}\n`);}); }
 async json(sql) { const value=await this.query(sql);return value?JSON.parse(value):null; }
 async close(){if(this.child.exitCode===null){this.child.stdin.end('\\q\n');await new Promise(resolve=>this.child.once('exit',resolve));}}
}
const sessions=[];
async function session(){const s=new Session();sessions.push(s);await s.query("set statement_timeout='12s';set lock_timeout='10s';set request.jwt.claims='{\"role\":\"service_role\"}';set request.headers='{\"x-content-publication-action\":\"publish\"}'");s.pid=Number(await s.query('select pg_backend_pid()'));return s;}
const publish=args=>`select test_publish(${literal(args)}::jsonb)`;
let inspect;
async function blocked(s){const until=Date.now()+5000;while(Date.now()<until){if(await inspect.json(`select to_jsonb(wait_event_type='Lock') from pg_stat_activity where pid=${s.pid}`))return;await new Promise(resolve=>setTimeout(resolve,20));}throw new Error('Expected the second database session to block on the first transaction');}
async function fixture() {
 const target=randomUUID(),proposal=randomUUID(),dependency=randomUUID(),version='2026-09-21T12:00:00.123456Z',key=`cms/qa/${target}`;
 const source={id:target,content_key:key,status:'LIVE',lane:'serving',review_state:null,target_date:null,updated_at:version,body:'Synthetic original opening. Complete ending.',sections:{},source_snapshot:{}};
 for(const row of [source,{...source,id:proposal,status:'DRAFT',lane:'reference',review_state:'owner-review-required',sections:{packageDraft:{body:'Synthetic reviewed opening. Complete ending.'}},source_snapshot:{targetRowId:target,targetRowUpdatedAt:version,targetContentKey:key}},{...source,id:dependency,content_key:`${key}/dependency`}])await inspect.query(`insert into generated_interpretations select * from jsonb_populate_record(null::generated_interpretations,${literal(row)}::jsonb)`);
 const publication=await inspect.json(`select jsonb_build_object('content_key',content_key,'state',state,'revision',revision,'row_id',row_id,'row_updated_at',row_updated_at) from content_publications where content_key=${literal(key)}`);
 return {p_operation_id:randomUUID().replaceAll('-','').repeat(2),p_actor:'test-owner',p_request_sha256:'b'.repeat(64),p_action:'approve-package-revision',p_proposal_id:proposal,p_proposal_version:version,p_target_id:target,p_target_version:version,
 p_patch:{body:'Synthetic reviewed opening. Complete ending.',sections:{packageRecord:{body:'Synthetic reviewed opening. Complete ending.'}},status:'LIVE',lane:'serving',review_state:null},p_validation_context:{targetPublication:publication},p_dependencies:[{id:dependency,updatedAt:version}]};
}
const row=(s,id)=>s.json(`select to_jsonb(g) from generated_interpretations g where id=${literal(id)}`);
try {
 admin(`create database ${database}`);
 const setup=publicationTestSchema.replace('create role anon; create role authenticated; create role service_role bypassrls;',()=>`do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if; end $$;`);
 execFileSync(psql,[...base,'-d',database],{input:setup+publicationMigrations.map(name=>fs.readFileSync(`apps/web/supabase/migrations/${name}`,'utf8')).join('\n')+`
 create function test_publish(a jsonb) returns jsonb language plpgsql as $$ begin
 return public.content_studio_publish_revision(a->>'p_operation_id',a->>'p_actor',a->>'p_request_sha256',a->>'p_action',(a->>'p_proposal_id')::uuid,(a->>'p_proposal_version')::timestamptz,(a->>'p_target_id')::uuid,(a->>'p_target_version')::timestamptz,a->'p_patch',a->'p_validation_context',a->'p_dependencies');
 exception when others then return jsonb_build_object('error',sqlstate); end $$;`,encoding:'utf8'});
 inspect=await session();const a=await session(),b=await session();
 assert.notEqual(a.pid,b.pid);
 const version=await inspect.query('show server_version');assert.match(version,/^17\./);
 // Same operation concurrently: B waits for A and then gets its exact receipt.
 let args=await fixture();await a.query('begin');const first=await a.json(publish(args));assert(first.operationId);
 let second=b.json(publish(args));await blocked(b);await a.query('commit');assert.deepEqual(await second,first);
 assert.equal(await inspect.json(`select to_jsonb(count(*)) from project_privacy.studio_publication_operations where operation_id=${literal(args.p_operation_id)}`),1);
 // Proposal, target and dependency races must preserve the winning edit.
 for(const field of ['p_proposal_id','p_target_id','dependency']){
  args=await fixture();const id=field==='dependency'?args.p_dependencies[0].id:args[field];const before=await row(inspect,args.p_target_id);
  await a.query(`begin;update generated_interpretations set updated_at=updated_at+interval '1 microsecond',body='Synthetic newer owner passage.' where id=${literal(id)}`);
  second=b.json(publish(args));await blocked(b);await a.query('commit');assert.deepEqual(await second,{error:'40001'});
  assert.equal((await row(inspect,id)).body,'Synthetic newer owner passage.');
  if(field!=='p_target_id')assert.deepEqual(await row(inspect,args.p_target_id),before);
  assert.equal((await row(inspect,args.p_proposal_id)).status,'DRAFT');
 }
 // Retirement does not change row.updated_at: the ledger revision check matters.
 args=await fixture();await a.query(`begin;select retire_content_everywhere(${literal(args.p_validation_context.targetPublication.content_key)},${literal(args.p_target_id)},${literal(args.p_target_version)})`);
 second=b.json(publish(args));await blocked(b);await a.query('commit');assert.deepEqual(await second,{error:'40001'});
 assert.equal(await inspect.json(`select to_jsonb(state) from content_publications where row_id=${literal(args.p_target_id)}`),'retired');
 // Different publication operations racing for one proposal: one winner only.
 args=await fixture();await a.query('begin');const winning=await a.json(publish(args));assert(winning.operationId);
 second=b.json(publish({...args,p_operation_id:'f'.repeat(64),p_request_sha256:'e'.repeat(64)}));await blocked(b);await a.query('commit');assert.deepEqual(await second,{error:'40001'});
 const receipt=await inspect.json(`select content_studio_publication_receipt(${literal(args.p_operation_id)},${literal(args.p_actor)},${literal(args.p_request_sha256)})`);
 assert.deepEqual(receipt,winning);assert.equal(receipt.row.body,args.p_patch.body);
 console.log(`PASS PostgreSQL ${version}: distinct backend sessions, lock barriers, same-operation replay, competing publications, proposal/target/dependency edits, retirement race and exact recoverable receipt.`);
} finally {
 for(const s of sessions) await s.close();
 try { admin(`drop database if exists ${database}`); } catch { /* Report server errors above without touching another database. */ }
}
