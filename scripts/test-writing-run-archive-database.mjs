import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import archive from '../src/astro-writing/writingRunArchive.cjs';
import {writingRunArchiveFixture} from '../tests/helpers/writing-run-archive.mjs';
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
await db.exec(readFileSync(new URL('../apps/web/supabase/migrations/20261118164952_writing_run_archives.sql',import.meta.url),'utf8'));
const fixture=writingRunArchiveFixture();
await archive.withWritingRunStore(fixture.store,()=>archive.archivedWritingFetch('https://api.openai.com/v1/responses',{method:'POST',body:'{ "model":"fixture", "input":"exact evidence 🌒\\n" }'},{provider:'openai',surface:'fixture',fetchImpl:async()=>Response.json({id:'resp_fixture'})}));
const row=[...fixture.rows.values()][0],keys=Object.keys(row);
await db.exec('set role service_role');
await db.query(`insert into writing_run_archives (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>typeof row[k]==='object'?JSON.stringify(row[k]):row[k]));
const saved=(await db.query('select * from writing_run_archives')).rows[0];archive.verifyArchivedRun(saved);assert.equal(saved.request_body,row.request_body);
await assert.rejects(db.query("update writing_run_archives set request_body='{}'"),/permission denied/);
await assert.rejects(db.query("update writing_run_archives set evidence='{}'"),/permission denied/);
await assert.rejects(db.query('delete from writing_run_archives'),/permission denied/);
await db.query("update writing_run_archives set state='outcome_unknown'");
for(const role of ['anon','authenticated']){
 await db.exec(`reset role; set role ${role}`);
 for(const sql of ['select * from writing_run_archives','delete from writing_run_archives',"update writing_run_archives set state='outcome_unknown'"]){await assert.rejects(db.query(sql),/permission denied/);}
 await assert.rejects(db.query(`insert into writing_run_archives (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>typeof row[k]==='object'?JSON.stringify(row[k]):row[k])),/permission denied/);
}
await db.exec('reset role');assert.equal((await db.query("select relrowsecurity from pg_class where relname='writing_run_archives'")).rows[0].relrowsecurity,true);
await db.close();console.log('PASS real PostgreSQL request round-trip, service-only grants, immutable prompt/evidence columns, retained rows and anonymous/authenticated denial.');
