// Native PostgreSQL verifies LZ4, which the in-memory WASM engine does not build.
// Only an isolated local server is accepted. No owner rows or model calls.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const host=process.env.STUDIO_TEST_PGHOST??'127.0.0.1';
if(!['127.0.0.1','localhost'].includes(host)&&!host.startsWith('/private/tmp/'))throw new Error('Use an isolated local test database only');
const psql=process.env.STUDIO_TEST_PSQL??'psql',database=`tldr_weekly_checkpoint_${process.pid}`;
const base=['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-h',host,'-p',process.env.STUDIO_TEST_PGPORT??'5432','-U',process.env.STUDIO_TEST_PGUSER??'postgres'];
const sql=(db,input)=>execFileSync(psql,[...base,'-d',db],{input,encoding:'utf8',timeout:60000});
try{
 sql('postgres',`create database ${database};`);
 sql(database,`do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls;end if;
 end $$;
 create table generated_interpretations(id uuid primary key,updated_at timestamptz not null,status text,content_key text,body text,sections jsonb,source_snapshot jsonb,facts jsonb,review_state text,reviewed_at timestamptz);
 grant all on generated_interpretations to service_role;
 create function update_test_version() returns trigger language plpgsql as $$ begin new.updated_at=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');return new;end;$$;
 create trigger update_test_version before update on generated_interpretations for each row execute function update_test_version();
 `+['20260919180000_generated_content_studio_listing_facts.sql','20260922002101_content_studio_private_versions.sql','20261010042007_weekly_rejection_checkpoint.sql','20261009124036_weekly_native_result_checkpoint.sql','20261010053723_weekly_checkpoint_deadlines.sql','20261010054825_studio_version_duplicate_precheck.sql','20261010061107_weekly_checkpoint_fast_compression.sql','20261010174000_weekly_checkpoint_memory.sql'].map(name=>readFileSync(`apps/web/supabase/migrations/${name}`,'utf8')).join('\n'));
 const output=sql(database,`set default_toast_compression='pglz';
 insert into generated_interpretations values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',clock_timestamp(),'DRAFT','horoscope/weekly/synthetic','Synthetic opening. Complete ending.',
 '{"horoscopeEdition":{"window":{"period":"weekly"},"passages":[]}}',
 jsonb_build_object('history',repeat('Synthetic retained evidence. ',1500000),'horoscopeGeneration','{"active":null}'::jsonb),'{}',null,null);
 -- The former UPDATE created one 42MB planner constant per field expression.
 -- Check executor memory inside the real update, before immutable audit capture.
 create function assert_checkpoint_memory() returns trigger language plpgsql security definer as $$
 declare allocated bigint; document_bytes bigint;
 begin
  select coalesce(sum(total_bytes),0) into allocated from pg_backend_memory_contexts where name='SPI Exec';
  document_bytes=octet_length(new.source_snapshot::text);
  if allocated>document_bytes*3 then raise exception 'Checkpoint duplicated its retained document: % bytes',allocated;end if;
  return null;
 end;$$;
 create trigger a_checkpoint_memory after update on generated_interpretations for each row execute function assert_checkpoint_memory();
 create temp table expected as select source_snapshot->>'history' as history,body,sections,updated_at from generated_interpretations;
 set role service_role;
 select count(*) from checkpoint_weekly_horoscope('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(select updated_at from generated_interpretations),
 '[{"path":["source_snapshot","horoscopeGeneration","active"],"op":"set","value":{"id":"test-operation","requestHash":"test-hash","responseId":"test-result","state":"running","config":{"provider":"gemini"}}}]');
 select checkpoint_weekly_provider_result('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','test-operation','test-hash','gemini','test-result','{"id":"test-result","status":"completed"}');
 select checkpoint_weekly_provider_result('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','test-operation','test-hash','gemini','test-result','{"id":"test-result","status":"completed"}');
 reset role;
 select json_build_object(
  'sourceCompression',pg_column_compression(g.source_snapshot),
  'archiveCompression',(select pg_column_compression(original_row) from project_privacy.studio_row_versions order by version_id desc limit 1),
  'historyExact',g.source_snapshot->>'history'=e.history,'bodyExact',g.body=e.body,'sectionsExact',g.sections=e.sections,
  'archiveExact',(select original_row=to_jsonb(g) from project_privacy.studio_row_versions order by version_id desc limit 1),
  'versions',(select count(*) from project_privacy.studio_row_versions),
  'attemptedInserts',(select last_value from project_privacy.studio_row_versions_version_id_seq),
  'defaultUnchanged',current_setting('default_toast_compression')='pglz',
  'stillDraft',g.status='DRAFT',
  'staleWrites',(select count(*) from checkpoint_weekly_horoscope(g.id,e.updated_at,'[]'))
 ) from generated_interpretations g cross join expected e;`);
 const result=JSON.parse(output.trim().split('\n').at(-1));
 assert.deepEqual(result,{sourceCompression:'lz4',archiveCompression:'lz4',historyExact:true,bodyExact:true,sectionsExact:true,archiveExact:true,versions:3,attemptedInserts:3,defaultUnchanged:true,stillDraft:true,staleWrites:0});
 assert.match(output,/saved\nalready_saved/);
 console.log('PASS native PostgreSQL: bounded checkpoint executor memory, lossless Weekly LZ4 source/archive writes, exact 42MB history, immutable version identity, idempotent provider result, scoped settings and stale-version exclusion.');
}finally{sql('postgres',`drop database if exists ${database};`);}
