import assert from 'node:assert/strict';
import { build } from 'esbuild';

const privateSentinel = 'SYNTHETIC_PRIVATE_DOCUMENT_MUST_STAY_SERVER_SIDE';
const generated = await build({
  entryPoints: ['api/generate-user-content.ts'], bundle: true, write: false,
  platform: 'node', format: 'esm',
  plugins: [{ name: 'offline-report-boundaries', setup(builder) {
    builder.onResolve({ filter: /\/(content-generation|report-generation|report-envelope)\.js$/ }, ({ path }) => ({ path, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents:
      path.includes('content-generation') ? `export class ContentGenerationHardEditorialError extends Error {};
        export class ContentGenerationQualityError extends Error {};
        export function generateContent() { throw new Error('No provider call allowed'); }
        export function hardEditorialFailureResponse() { return {}; }` :
      path.includes('report-envelope') ? `export async function fetchSupabaseReportEnvelopeById(input) {
        if (input.userId !== 'synthetic-user') throw new Error('Wrong report owner');
        return { id: input.reportId, report_type: 'report', report_domain: 'general', report_horizon: '12_months', facts: {}, period_start: '2026-01-01' };
      }` : `export function assembleReportGenerationPayload() { return {
        reportDomain: 'general', reportHorizon: '12_months', unit: { unitId: 'overview' }, outputGovernance: { ownerApproved: false },
        voiceEvidence: [{ text: '${privateSentinel}' }], ownerComparisonSet: [{ text: '${privateSentinel}' }],
        canonicalOwnerPrompt: { text: '${privateSentinel}' }, frozenFacts: { private: '${privateSentinel}' }
      }; }`
    }));
  } }]
});
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(generated.outputFiles[0].text).toString('base64')}`);
const originalFetch = globalThis.fetch;
const keys = ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
try {
  for (const key of keys) process.env[key] = key.endsWith('URL') ? 'https://synthetic.invalid' : 'synthetic-test-key';
  globalThis.fetch = async (url) => {
    assert.match(String(url), /\/auth\/v1\/user$/u);
    return new Response(JSON.stringify({ id: 'synthetic-user' }), { status: 200 });
  };
  async function request(authorization) {
    const input = { subjectType: 'report_unit', reportId: 'synthetic-report', reportDomain: 'general', reportHorizon: '12_months', unitId: 'overview', dryRun: true };
    const req = { method: 'POST', headers: authorization ? { authorization: 'Bearer synthetic-token' } : {}, async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(input)); } };
    let body;
    const res = { statusCode: 200, setHeader() {}, end(value) { body = JSON.parse(value); } };
    await handler(req, res);
    assert.ok(!JSON.stringify(body).includes(privateSentinel));
    return { status: res.statusCode, body };
  }
  const allowed = await request(true);
  assert.equal(allowed.status, 200);
  assert.deepEqual(Object.keys(allowed.body.payload).sort(), ['outputGovernance', 'reportDomain', 'reportHorizon', 'unit']);
  assert.equal(allowed.body.payload.outputGovernance.ownerApproved, false);
  const priorError = console.error;
  try { console.error = () => {}; assert.notEqual((await request(false)).status, 200); }
  finally { console.error = priorError; }
  console.log('Actual report preview handler keeps private source documents server-side.');
} finally {
  globalThis.fetch = originalFetch;
  for (const key of keys) { if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key]; }
}
