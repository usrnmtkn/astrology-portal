import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
const environment = { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'recovery-fixture', SUPABASE_URL: 'https://recovery.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
Object.assign(process.env, environment);
const { default: handler } = await import('../api/admin/generated-content.ts');
Object.assign(process.env, environment);
const prior = globalThis.fetch;
let state = 'live', current: any = { id: 'synthetic-target', content_key: 'cms/qa/recovery', updated_at: '2026-09-21T12:00:01Z', status: 'LIVE' };
let exists = true, broken = false, mutations = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));assert.equal(url.origin, environment.SUPABASE_URL);
  if (url.pathname.endsWith('/content_studio_publication_receipt')) {
    if (broken) return Response.json({}, { status: 503 });
    const request = JSON.parse(String(init?.body));
    return Response.json(exists ? { schema: 'content-studio-publication-receipt-v1', operationId: request.p_operation_id, requestSha256: request.p_request_sha256,
      targetId: 'synthetic-target', contentKey: 'cms/qa/recovery', targetVersion: '2026-09-21T12:00:00Z', row: { body: 'PRIVATE_HISTORICAL_CANARY' } } : null);
  }
  if ((init?.method ?? 'GET') !== 'GET') mutations++;
  if (url.pathname.endsWith('/generated_interpretations')) return Response.json(current ? [current] : []);
  if (url.pathname.endsWith('/content_publications')) return Response.json([{ content_key: 'cms/qa/recovery', state }]);
  throw new Error('Unexpected endpoint');
};
async function recover() {
  const req: any = Readable.from([]);Object.assign(req, { method: 'GET', headers: { authorization: 'Bearer recovery-fixture' },
    url: '/api/admin/generated-content?publicationAction=approve-package-revision&id=synthetic-proposal&expectedUpdatedAt=2026-09-21T12%3A00%3A00Z' });
  const res: any = { statusCode: 200, setHeader() {}, end(body: string) { this.body = JSON.parse(body); assert(!body.includes('PRIVATE_HISTORICAL_CANARY')); } };
  await handler(req, res);return res;
}
try {
  let result = await recover();assert.equal(result.statusCode, 200);assert(result.body.found);
  assert.equal(result.body.publicationReceipt.currentVersion, current.updated_at);
  assert.equal(result.body.publicationReceipt.currentPublicationState, 'live');
  state = 'retired';assert.equal((await recover()).body.publicationReceipt.currentPublicationState, 'retired');
  current = null;result = await recover();assert(result.body.found);assert.deepEqual(result.body.rows, []);
  assert.equal(result.body.publicationReceipt.currentStatus, 'DELETED');
  exists = false;assert.equal((await recover()).body.found, false);
  broken = true;assert.equal((await recover()).statusCode, 503);
  assert.equal(mutations, 0, 'Recovery never invokes a publication or storage mutation.');
  console.log('Actual recovery API distinguishes newer, retired, deleted, absent and unavailable results without exposing historical copy or replaying publication.');
} finally { globalThis.fetch = prior; }
