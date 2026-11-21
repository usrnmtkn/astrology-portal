import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import handler from '../api/admin/synastry-writer-status.js';
import { encodedSynastryVoice, installSyntheticSynastryApproval } from '../tests/fixtures/synastry-approved-voice.cjs';

const restore = installSyntheticSynastryApproval();
const originalFetch = globalThis.fetch;
Object.assign(process.env, { NODE_ENV: 'production', CONTENT_GENERATION_SECRET: 'synthetic-admin',
  PRIVATE_SYNASTRY_VOICE_REFERENCES: encodedSynastryVoice(), OPENAI_API_KEY: 'synthetic-provider',
  SUPABASE_URL: 'https://synthetic-status.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'synthetic',
  STUDIO_MEMORY_FEEDBACK_ENABLED: 'true', VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40) });
let reads = 0;
let outage = false;
globalThis.fetch = async (url, init = {}) => {
  assert.equal(String(url), 'https://synthetic-status.supabase.co/rest/v1/rpc/studio_memory_active_snapshot',
    'Only the existing read-only feedback snapshot may be requested; no provider or content writes.');
  assert.equal(init.method, 'POST');
  assert.equal(init.body, '{}');
  reads++;
  return outage ? Response.json({}, { status: 503 }) : Response.json([{ snapshot: { writingFeedback: [] } }]);
};
async function request(method = 'GET', secret = 'synthetic-admin') {
  const req = Readable.from([]) as IncomingMessage;
  req.method = method; req.url = '/api/admin/synastry-writer-status';
  req.headers = secret ? { authorization: `Bearer ${secret}` } : {};
  const headers = new Map();
  let body = '';
  const res = { statusCode: 0, setHeader: (key: string, value: string) => headers.set(key.toLowerCase(), value),
    end: (value: string) => { body = value; } } as unknown as ServerResponse;
  await handler(req, res);
  assert.equal(headers.get('cache-control'), 'no-store');
  return { status: res.statusCode, body: JSON.parse(body), headers };
}
try {
  assert.equal((await request('GET', '')).status, 401);
  assert.equal((await request('GET', 'wrong')).status, 401);
  assert.equal((await request('POST')).status, 405);
  process.env.NODE_ENV = 'development';
  delete process.env.CONTENT_GENERATION_SECRET;
  assert.equal((await request('GET', 'untrusted')).status, 401, 'Development never bypasses owner authorization.');
  process.env.NODE_ENV = 'production';
  process.env.CONTENT_GENERATION_SECRET = 'synthetic-admin';
  assert.equal(reads, 0, 'Denied and invalid requests never read private sources or feedback.');
  const ready = await request();
  assert.equal(ready.status, 200);
  assert.equal(ready.body.editorialVersion, 'synastry-aspect/v16-2026-10-25');
  assert.equal(ready.body.revision, 'a'.repeat(40));
  assert.equal(ready.body.primaryStyleReferenceCount, 4);
  assert.equal(ready.body.supportingReferenceCount, 28);
  assert.equal(ready.body.detailedKnowledgeSourceCount, 20);
  assert.equal(ready.body.currentFeedback, 'verified');
  assert.equal(ready.body.generationPerformed, false);
  assert(!JSON.stringify(ready.body).includes('synthetic'));
  const valid = process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES;
  process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES = 'corrupt';
  const missing = await request();
  assert.equal(missing.status, 503);
  assert.equal(reads, 1, 'Corrupt protected evidence stops before feedback access.');
  assert(!JSON.stringify(missing.body).includes('corrupt'));
  process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES = valid;
  process.env.STUDIO_MEMORY_FEEDBACK_ENABLED = 'false';
  assert.equal((await request()).status, 503);
  process.env.STUDIO_MEMORY_FEEDBACK_ENABLED = 'true';
  outage = true;
  assert.equal((await request()).status, 503);
  outage = false;
  delete process.env.OPENAI_API_KEY;
  assert.equal((await request()).status, 503);
  console.log('Synastry deployed readiness: actual handler authorization, complete sources, feedback failure holds, private response boundary and zero generation passed.');
} finally { globalThis.fetch = originalFetch; restore(); }
