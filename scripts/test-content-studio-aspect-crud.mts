import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
const env = { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'aspect-crud-test', SUPABASE_URL: 'https://aspect-crud.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
Object.assign(process.env, env);
const { default: handler } = await import('../api/admin/aspect-pattern-writeups.ts');
Object.assign(process.env, env);
const original = globalThis.fetch;
let calls = 0;
let storage: (url: URL, init: RequestInit) => Promise<Response>;
globalThis.fetch = async (input, init = {}) => { const url = new URL(String(input)); assert.equal(url.origin, env.SUPABASE_URL); calls++; return storage(url, init); };
async function invoke(method: string, body?: unknown, secret = env.CONTENT_GENERATION_SECRET, query = '') {
 const req = Object.assign(Readable.from(body === undefined ? [] : [JSON.stringify(body)]), { method, url: `/api/admin/aspect-pattern-writeups${query}`, headers: { 'x-content-generation-secret': secret } });
 const res = { statusCode: 0, result: {} as any, setHeader() {}, end(body: string) { this.result = JSON.parse(body); } };
 await handler(req, res); return { status: res.statusCode, ...res.result };
}
try {
 await test('aspect catalog and preview require authorization before reading drafts', async () => {
  storage = async () => Response.json([]);
  for (const method of ['GET', 'POST', 'PATCH']) { calls = 0; assert.equal((await invoke(method, { action: 'preview' }, 'wrong')).status, 401); assert.equal(calls, 0); }
 });
 await test('aspect malformed requests are client errors before storage', async () => {
  for (const body of [null, [], true, {}, { kind: 'unknown' }, { action: 'unknown' }, { record: {} }]) {
   calls = 0; assert.equal((await invoke('POST', body)).status, 400, JSON.stringify(body)); assert.equal(calls, 0);
  }
  assert.equal((await invoke('GET', undefined, env.CONTENT_GENERATION_SECRET, '?kind=unknown')).status, 400);
 });
 await test('owner aspect-pattern topics and wording are advisory while unknown variables stay blocked', async () => {
  for(const kind of ['natal','activation']) {
   let saved:any=null;
   storage=async(_url,init)=>{
    if(init.method==='POST'){saved={...JSON.parse(String(init.body)),id:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'};return Response.json([saved]);}
    return Response.json(saved?[saved]:[]);
   };
   const catalog=await invoke('GET',undefined,env.CONTENT_GENERATION_SECRET,`?kind=${kind}`);
   assert.equal(catalog.status,200);
   const source=catalog.rows.find((row:any)=>row.patternType==='yod');assert(source);
   const record=structuredClone(source.record);record.status='approved';
   record.content.overview='Synthetic Tarot opening. Finger of God, fate, destiny and a chosen special mission are deliberate owner wording. This will be discussed as policy. Complete owner ending.';
   const result=await invoke('POST',{kind,record});assert.equal(result.status,200,JSON.stringify(result));
   assert.equal(result.row.source_snapshot.record.content.overview,record.content.overview);
   const refreshed=await invoke('GET',undefined,env.CONTENT_GENERATION_SECRET,`?kind=${kind}`);
   const published=refreshed.rows.find((row:any)=>row.generatedContentId===saved.id);
   assert.equal(published.productionSelected,true,'The actual reader resolver must select the complete owner copy.');
   assert(published.previews.some((preview:any)=>preview.validation.warnings.length>0));
   const invalid=structuredClone(record);invalid.content.headline='{{unknown_required_owner_slot}}';
   const callsBefore=calls;const denied=await invoke('POST',{kind,record:invalid});assert.equal(denied.status,422);assert.equal(calls,callsBefore,'Unknown required variables still stop before writing.');
  }
 });
 await test('aspect saves preserve exact copy, reject stale versions and conflicting creates', async () => {
  storage = async () => Response.json([]);
  const catalog = await invoke('GET'); assert.equal(catalog.status, 200);
  const record = structuredClone(catalog.rows[0].record); record.status = 'draft'; record.content.overview = 'QA first paragraph.\n\nQA final sentence. ';
  const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; const version = '2026-09-10T12:00:00.123456Z';
  let row: any = { id, updated_at: version, content_key: catalog.rows[0].contentKey, source_snapshot: { record }, status: 'DRAFT' };
  storage = async (url, init) => {
   if (init.method === 'POST') { assert.doesNotMatch(String((init.headers as any).prefer), /merge-duplicates/); return Response.json({ message: 'duplicate' }, { status: 409 }); }
   if (init.method === 'PATCH') {
    assert.equal(url.searchParams.get('id'), `eq.${id}`);
    if (url.searchParams.get('updated_at') !== `eq.${row.updated_at}`) return Response.json([]);
    row = { ...row, ...JSON.parse(String(init.body)) }; return Response.json([row]);
   }
   return Response.json(row ? [row] : []);
  };
  const input = { kind: 'natal', generatedContentId: id, expectedUpdatedAt: version, record };
  assert.equal((await invoke('PATCH', { ...input, expectedUpdatedAt: undefined })).status, 400);
  const result = await invoke('PATCH', input); assert.equal(result.status, 200, result.error); assert.equal(result.row.source_snapshot.record.content.overview, record.content.overview);
  assert.equal((await invoke('PATCH', input)).status, 409);
  assert.equal((await invoke('POST', { kind: 'natal', record })).status, 409);
  row.content_key = 'unrelated/article'; assert.equal((await invoke('PATCH', { ...input, expectedUpdatedAt: row.updated_at })).status, 409);
  row = null; assert.equal((await invoke('PATCH', input)).status, 404);
  for (const payload of [null, {}, [null], []]) {
   storage = async (_url, init) => init.method === 'POST' ? Response.json(payload) : Response.json([]);
   assert.equal((await invoke('POST', { kind: 'natal', record })).status, 502, JSON.stringify(payload));
  }
 });
} finally { globalThis.fetch = original; }
