import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createStudioMemoryDb, databaseFetch } from '../tests/helpers/studio-memory-db.mjs';
import { feedbackHash, selectStudioFeedback, activeStudioFeedback } from '../api/_lib/studio-memory-feedback.ts';
import { withStudioFeedback } from '../api/_lib/studio-memory-graph.ts';
import { buildMemoryIndex, memoryDetail, queryMemory } from '../api/_lib/agent-memory.mjs';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';

const db = await createStudioMemoryDb();
const id = '11111111-1111-4111-8111-111111111111';
const key = 'sky.placement.base.sun.leo';
const before = 'Synthetic original sentence. Synthetic final sentence.';
const after = 'Synthetic revised sentence. Synthetic final sentence.';
const t1 = '2026-09-11T12:00:00.000Z', t2 = '2026-09-11T12:00:01.000Z';
const row = { id, content_key:key, surface:'sky', mode:'feed', target_date:null, body:before,
  status:'DRAFT', updated_at:t1, lane:'serving', block_type:'sky_placement', source_snapshot:{}, sections:{}, headline:'Fixture' };
const store = await createApiStore([row]);
await db.query('insert into generated_interpretations (id,content_key,surface,mode,target_date,body,status,updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8)', [id,key,'sky','feed',null,before,'DRAFT',t1]);
Object.assign(process.env, { STUDIO_MEMORY_FEEDBACK_ENABLED:'true', SUPABASE_URL:'https://studio-memory.invalid', SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key', CONTENT_GENERATION_SECRET:'calendar-api-fixture' });
const { default: handler } = await import('../api/admin/studio-memory-feedback.ts');
const fetchFeedback = databaseFetch(db);
const storeFetch = globalThis.fetch;
// The actual save handler still owns validation and optimistic concurrency;
// successful storage PATCHes execute the actual PostgreSQL capture trigger.
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.origin === 'https://studio-memory.invalid' && url.pathname === '/rest/v1/generated_interpretations') {
    const mapped = new URL(url); mapped.host = 'calendar-api.invalid';
    const result = await storeFetch(mapped, init);
    const payload = await result.clone().json();
    if (init.method === 'PATCH' && result.ok) for (const saved of payload) {
      await db.query('update generated_interpretations set body=$1,status=$2,updated_at=$3 where id=$4', [saved.body,saved.status,saved.updated_at,saved.id]);
    }
    return result;
  }
  return fetchFeedback(input, init);
};
async function invoke(method, body, credential = 'calendar-api-fixture') {
  const req = Readable.from(body ? [JSON.stringify(body)] : []);
  Object.assign(req, { method, url:`/api/admin/studio-memory-feedback?contentKey=${key}`, headers:{ 'x-content-generation-secret':credential } });
  const res = { statusCode:0, headers:{}, setHeader(k,v){this.headers[k]=v;},end(text){this.payload=JSON.parse(text);} };
  await handler(req,res); return res;
}
try {
  assert.equal((await invoke('GET',null,'')).statusCode,401);
  let result = await store.invoke('PATCH',{id,expectedUpdatedAt:t1,body:after});
  assert.equal(result.status,200,JSON.stringify(result));
  assert.equal(result.payload.rows[0].source_snapshot?.studioRevisionHistory,undefined,'New private correction must not be copied into public row metadata');
  let rows = (await invoke('GET')).payload.rows;
  assert.equal(rows.length,1); assert.equal(rows[0].before_text,before); assert.equal(rows[0].after_text,after);
  assert.equal(rows[0].status,'pending'); assert.equal(rows[0].scope,'passage');
  const pending = rows[0];
  assert.equal((await activeStudioFeedback()).length,0);
  assert.equal((await invoke('POST',{id:pending.id,version:1,status:'active',scope:'passage',reason:''})).statusCode,409,'Draft is not reviewed');
  assert.equal((await store.invoke('PATCH',{id,expectedUpdatedAt:t1,body:'Stale rejected write'})).status,409);
  assert.equal((await db.query('select count(*)::int n from studio_memory_feedback')).rows[0].n,1);
  await db.query("update generated_interpretations set status='REVIEWED',updated_at=$1 where id=$2",[t2,id]);
  assert.equal((await db.query('select count(*)::int n from studio_memory_feedback')).rows[0].n,1,'Checking/approval alone must not duplicate edits');
  assert.equal((await invoke('POST',{id:pending.id,version:1,status:'active',scope:'family',reason:''})).statusCode,400);
  result = await invoke('POST',{id:pending.id,version:1,status:'active',scope:'passage',reason:'Synthetic editorial reason'});
  assert.equal(result.statusCode,200,JSON.stringify(result.payload));
  const active = result.payload.rows[0];
  assert.equal(active.version,2);
  assert.equal((await invoke('POST',{id:pending.id,version:1,status:'retired',scope:'passage',reason:''})).statusCode,409);
  const packet = selectStudioFeedback(await activeStudioFeedback(),key);
  assert(packet.prompt.includes(before)); assert(packet.prompt.includes(after));
  assert.equal(packet.receipt.selected[0].bodySha256,feedbackHash(active));
  assert(!JSON.stringify(packet.receipt).includes(before));
  assert.equal(selectStudioFeedback([active],'sky.placement.base.moon.cancer').receipt.selected.length,0);
  const shared = {...active,scope:'family'};
  assert.equal(selectStudioFeedback([shared],'sky.placement.base.moon.cancer').receipt.selected.length,1);
  assert.equal(selectStudioFeedback([shared],'sky.aspect.sun.trine.moon.leo.aries').receipt.selected.length,0);
  assert.equal(selectStudioFeedback([shared,{...shared,id:'conflicting',after_text:'Conflicting replacement'}],key).receipt.selected.length,0);
  const index = withStudioFeedback(buildMemoryIndex({root:process.cwd(),revision:'a'.repeat(40)}),[active]);
  const detail = memoryDetail(index,packet.receipt.selected[0].memoryId);
  assert(detail.body.includes(after)); assert.equal(detail.sourceUrl,null);
  assert.equal(detail.metadata.evidenceSha256,packet.receipt.selected[0].bodySha256);
  assert(queryMemory(index,{query:'Synthetic revised sentence'}).records.some(r=>r.id===detail.id));
  result = await invoke('POST',{id:active.id,version:2,status:'retired',scope:'passage',reason:'Synthetic retirement'});
  assert.equal(result.statusCode,200); assert.equal((await activeStudioFeedback()).length,0);
  assert.equal((await db.query('select count(*)::int n from studio_memory_feedback_decisions')).rows[0].n,2);
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from studio_memory_feedback'), /permission denied/);
    await assert.rejects(db.query('select * from studio_memory_feedback_decisions'), /permission denied/);
    await assert.rejects(db.query("insert into studio_memory_feedback default values"), /permission denied/);
    await assert.rejects(db.query("update studio_memory_feedback set reason='unauthorized'"), /permission denied/);
    await assert.rejects(db.query('delete from studio_memory_feedback'), /permission denied/);
    await assert.rejects(db.query('select * from studio_memory_active_snapshot()'), /permission denied/);
    await assert.rejects(db.query('select * from review_studio_memory_feedback($1,3,$2,$3,$4)',[active.id,'active','passage','']), /permission denied/);
    await db.exec('reset role');
  }
  globalThis.fetch = async () => { throw new Error('Synthetic storage outage'); };
  await assert.rejects(activeStudioFeedback(), /Storage request failed/);
  assert.notEqual((await invoke('GET')).statusCode,200,'Outage cannot report empty success');
  console.log('Studio memory passed: actual edit handler → PostgreSQL capture → explicit review → scoped retrieval → graph receipts → retirement, stale edits, conflict exclusion, and visitor/member denial.');
} finally { await db.close(); delete process.env.STUDIO_MEMORY_FEEDBACK_ENABLED; }
