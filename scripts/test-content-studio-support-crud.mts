import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
const env = { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'support-crud', SUPABASE_URL: 'https://support-crud.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
Object.assign(process.env, env);
const { contentSourceRepairPlan } = await import('../api/admin/content-source-repair-plans.ts');
const { default: resolutions } = await import('../api/admin/content-unresolved-resolutions.ts');
const { default: decisions } = await import('../api/admin/content-source-repair-decisions.ts');
const { default: unresolved, loadContentUnresolvedReport } = await import('../api/admin/content-unresolved.ts');
const { default: events } = await import('../api/admin/content-review-events.ts');
const { default: queue } = await import('../api/admin/prepopulate-content.ts');
const { default: slots } = await import('../api/admin/sky-article-template-slots.ts');
Object.assign(process.env, env);
const original = globalThis.fetch;
let storage: (url: URL, init: RequestInit) => Promise<Response>;
let calls = 0;
globalThis.fetch = async (input, init = {}) => { const url = new URL(String(input)); assert.equal(url.origin, env.SUPABASE_URL); calls++; return storage(url, init); };
async function invoke(handler: any, method: string, body?: unknown, secret = env.CONTENT_GENERATION_SECRET) {
 const req = Object.assign(Readable.from(body === undefined ? [] : [JSON.stringify(body)]), { method, url: '/api/admin/test', headers: { 'x-content-generation-secret': secret } });
 const res = { statusCode: 0, result: {} as any, setHeader() {}, end(body: string) { this.result = JSON.parse(body); } };
 await handler(req, res); return { status: res.statusCode, ...res.result };
}
try {
 await test('supporting reads reject malformed storage instead of empty inventories', async () => {
  for (const handler of [events, unresolved]) for (const payload of [null, {}, [null]]) {
   storage = async () => Response.json(payload); assert.equal((await invoke(handler, 'GET')).status, 502);
  }
 });
 await test('supporting writes confirm the exact stored record including duplicate approvals', async () => {
  const report = loadContentUnresolvedReport() as any;
  // The current generated report can be empty. Seed only this process's cached
  // report; all writes are trapped at the .invalid storage origin above.
  const plan = contentSourceRepairPlan('fallback-hook/sky-sign-copy/sun/virgo');
  report.issues.push({ issueId: 'a'.repeat(64), contentKey: plan!.contentKey, kind: 'source-repair', repairPlan: plan });
  const issue = report.issues.at(-1); assert.ok(issue);
  const resolutionInput = { schema: 'content-studio-resolution/v1', issueId: issue.issueId, contentKey: issue.contentKey, status: 'diagnosis-only', diagnosis: 'QA diagnosis.', proposedAction: 'QA action.', filesInvolved: [], prUrl: null, ownerDecisionRequired: true };
  const repair = report.issues.find((item: any) => item.repairPlan); assert.ok(repair);
  const decisionInput = { schema: 'content-studio-source-decision/v1', issueId: repair.issueId, contentKey: repair.contentKey, action: 'approve-replacement', candidateSha256: repair.repairPlan.candidateSha256, approvalStatement: repair.repairPlan.approvalStatement, confirmExactText: true };
  for (const [handler, input] of [[resolutions, resolutionInput], [decisions, decisionInput]]) {
   for (const payload of [null, {}, [], [null], [{ issue_id: 'wrong', content_key: 'wrong' }]]) {
    storage = async () => Response.json(payload); assert.equal((await invoke(handler, 'POST', input)).status, 502);
   }
   storage = async (_url, init) => Response.json([JSON.parse(String(init.body))]);
   assert.equal((await invoke(handler, 'POST', input)).status, 200);
  }
  const version = '2026-09-10T12:00:00.123456Z';
  let resolutionRow: any = { issue_id: issue.issueId, content_key: issue.contentKey, updated_at: version };
  storage = async (url, init) => {
   if (init.method === 'POST') return Response.json({ message: 'duplicate' }, { status: 409 });
   assert.equal(init.method, 'PATCH');
   assert.equal(url.searchParams.get('issue_id'), `eq.${issue.issueId}`);
   if (url.searchParams.get('updated_at') !== `eq.${resolutionRow.updated_at}`) return Response.json([]);
   resolutionRow = { ...resolutionRow, ...JSON.parse(String(init.body)) }; return Response.json([resolutionRow]);
  };
  assert.equal((await invoke(resolutions, 'POST', { ...resolutionInput, expectedUpdatedAt: version })).status, 200);
  assert.equal((await invoke(resolutions, 'POST', { ...resolutionInput, expectedUpdatedAt: version })).status, 409);
  assert.equal((await invoke(resolutions, 'POST', resolutionInput)).status, 409);
  storage = async (_url, init) => init.method === 'POST' ? Response.json({ message: 'duplicate' }, { status: 409 }) : Response.json([]);
  assert.equal((await invoke(decisions, 'POST', decisionInput)).status, 502);
 });
 await test('prepopulation preserves every existing draft and reports partial writes', async () => {
  let existing: any;
  storage = async (_url, init) => {
   if (init.method === 'POST') { existing = JSON.parse(String(init.body)); return Response.json({ code: '23505' }, { status: 409 }); }
   assert.equal(init.method ?? 'GET', 'GET', 'Prepopulation must not overwrite existing writing.');
   return Response.json([{ ...existing, id: 'fixture', status: 'DRAFT', body: 'QA owner draft.' }]);
  };
  const result = await invoke(queue, 'POST', { surface: 'modifier', targetDate: '2026-09-10' });
  assert.equal(result.status, 200); assert.equal(result.inserted, 0); assert.ok(result.skippedExistingRows.length);
  calls = 0;
  storage = async (_url, init) => calls === 1 ? Response.json([{ ...JSON.parse(String(init.body)), id: 'fixture' }]) : Response.json(null);
  const partial = await invoke(queue, 'POST', { surface: 'modifier', targetDate: '2026-09-10' });
  assert.equal(partial.status, 502); assert.equal(partial.savedRows.length, 1); assert.equal(partial.savedRows[0].id, 'fixture');
 });
 await test('template slots reject bad types and impossible dates before storage or generation', async () => {
  for (const body of [null, [], {}, { templateId: 12 }, { templateId: 'fixture', referenceDate: '2026-02-30' }, { templateId: 'fixture', provider: 'bad' }, { templateId: 'fixture', existingSlotValues: [] }]) {
   calls = 0; assert.equal((await invoke(slots, 'POST', body)).status, 400); assert.equal(calls, 0);
  }
 });
 await test('supporting handlers reject unauthorized access before storage', async () => {
  calls = 0;
  for (const [handler, method] of [[resolutions, 'POST'], [decisions, 'POST'], [events, 'GET'], [unresolved, 'GET'], [queue, 'POST'], [slots, 'POST']] as const) assert.equal((await invoke(handler, method, {}, 'wrong')).status, 401);
  assert.equal(calls, 0);
 });
} finally { globalThis.fetch = original; }
