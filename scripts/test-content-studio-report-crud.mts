import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
const env = { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'report-crud', SUPABASE_URL: 'https://report-crud.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
Object.assign(process.env, env);
const { default: reports } = await import('../api/admin/report-fulfillment.ts');
const { default: feedback } = await import('../api/admin/generated-report-feedback.ts');
Object.assign(process.env, env);
const original = globalThis.fetch;
let storage: (url: URL, init: RequestInit) => Promise<Response>;
let writes = 0;
globalThis.fetch = async (input, init = {}) => { const url = new URL(String(input)); assert.equal(url.origin, env.SUPABASE_URL); if (init.method === 'PATCH') writes++; return storage(url, init); };
async function invoke(handler: any, body: unknown, secret = env.CONTENT_GENERATION_SECRET) {
 const req = Object.assign(Readable.from([JSON.stringify(body)]), { method: 'POST', url: '/api/admin/test', headers: { 'x-content-generation-secret': secret } });
 const res = { statusCode: 0, result: {} as any, setHeader() {}, end(body: string) { this.result = JSON.parse(body); } };
 await handler(req, res); return { status: res.statusCode, ...res.result };
}
try {
 await test('report correction create, reopen, publish and discard preserve versions and complete copy', async () => {
  let unit: any = { id: 'qa-unit', content_key: 'qa-unit', updated_at: '2026-09-10T12:00:00.123456Z', body: 'QA published.', source_snapshot: {} };
  storage = async (url, init) => {
   if (url.pathname.endsWith('/user_reports')) return Response.json([{ id: 'qa-report' }]);
   if (init.method !== 'PATCH') return Response.json([unit]);
   assert.equal(url.searchParams.get('id'), `eq.${unit.id}`);
   if (url.searchParams.get('updated_at') !== `eq.${unit.updated_at}`) return Response.json([]);
   unit = { ...unit, ...JSON.parse(String(init.body)) }; return Response.json([unit]);
  };
  const input = { reportId: 'qa-report', unitId: unit.id, action: 'save_report_unit_draft', body: 'QA first paragraph.\n\nQA final sentence. ' };
  assert.equal((await invoke(reports, input)).status, 400);
  const version = unit.updated_at;
  assert.equal((await invoke(reports, { ...input, expectedUpdatedAt: version })).status, 200);
  assert.equal(unit.body, 'QA published.'); assert.equal(unit.source_snapshot.adminCorrectionDraft.body, input.body);
  assert.equal((await invoke(reports, { ...input, expectedUpdatedAt: version })).status, 409);
  assert.equal((await invoke(reports, { ...input, action: 'publish_report_unit_correction', expectedUpdatedAt: unit.updated_at })).status, 200);
  assert.equal(unit.body, input.body); assert.equal(unit.source_snapshot.adminCorrection.previous.body, 'QA published.');
  assert.equal((await invoke(reports, { ...input, expectedUpdatedAt: unit.updated_at })).status, 200);
  assert.equal((await invoke(reports, { ...input, action: 'discard_report_unit_draft', expectedUpdatedAt: unit.updated_at })).status, 200);
  assert.equal(unit.source_snapshot.adminCorrectionDraft, undefined); assert.equal(unit.body, input.body);
  for (const payload of [null, {}, [null], [{ id: 'wrong' }]]) {
   storage = async (url, init) => init.method === 'PATCH' ? Response.json(payload) : Response.json(url.pathname.endsWith('/user_reports') ? [{ id: 'qa-report' }] : [unit]);
   assert.equal((await invoke(reports, { ...input, expectedUpdatedAt: unit.updated_at })).status, 502);
  }
 });
 await test('feedback approval race cannot return false success', async () => {
  storage = async (_url, init) => Response.json(init.method === 'PATCH' ? [] : [{ id: 'qa-feedback', status: 'candidate' }]);
  assert.equal((await invoke(feedback, { action: 'approve', feedbackId: 'qa-feedback', governedEvidenceText: 'QA fixture only.' })).status, 409);
  storage = async (url, init) => init.method === 'POST' ? Response.json([]) : Response.json([{ id: 'qa-report', subject_type: 'you_day_reading' }]);
  assert.equal((await invoke(feedback, { action: 'save_candidate', reportId: 'qa-report', feedbackText: 'QA fixture only.' })).status, 502);
 });
 await test('report editors reject malformed and unauthorized writes before persistence', async () => {
  writes = 0;
  for (const handler of [reports, feedback]) {
   for (const body of [null, [], true]) assert.equal((await invoke(handler, body)).status, 400);
   assert.equal((await invoke(handler, {}, 'wrong')).status, 401);
  }
  assert.equal(writes, 0);
 });
} finally { globalThis.fetch = original; }
