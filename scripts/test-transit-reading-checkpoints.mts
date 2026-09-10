import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { callReportCalibrationModel } from '../api/_lib/report-model-client.js';
import {
  checkpointTransitReadingModel as step,
  withTransitReadingCheckpoints as resume,
  TransitReadingCheckpointYield,
  TransitReadingCheckpointStopped
} from '../api/_lib/transit-reading-checkpoints.js';
import type { SupabaseReportAdmin } from '../api/_lib/supabase-report-admin.js';
import type { ReportModelCallInput } from '../api/_lib/report-model-client.js';

function storage() {
  const rows: any[] = [];
  const admin = {
    async selectOne(_table: string, params: URLSearchParams) {
      return structuredClone(rows.find(row => [...params].every(([k, v]) => k === 'select' || String(row[k]) === v.slice(3))) ?? null);
    },
    async insert(_table: string, row: any) {
      if (rows.some(r => r.you_job_id === row.you_job_id && r.friend_job_id === row.friend_job_id && r.attempt === row.attempt && r.step === row.step)) throw new Error('duplicate step');
      const saved = { id: String(rows.length), ...structuredClone(row), response: null };
      rows.push(saved);
      return [structuredClone(saved)];
    },
    async update(_table: string, query: string, patch: any) {
      const params = new URLSearchParams(query);
      const row = rows.find(r => [...params].every(([k, v]) => String(r[k]) === v.slice(3)));
      if (!row) return [];
      Object.assign(row, structuredClone(patch));
      return [structuredClone(row)];
    }
  } as unknown as SupabaseReportAdmin;
  return { rows, admin };
}
const request = (name: string): ReportModelCallInput<{ name: string }> => ({
  provider: 'fixture', model: 'fixture', prompt: name, schemaName: name, schema: { type: 'object' }
});
const result = (name: string) => ({ value: { name }, provider: 'fixture', model: 'fixture', usage: { inputTokens: 2, outputTokens: 1, totalTokens: 3 } });

// Six serial steps are spread across six requests. A fully replayed request
// performs zero provider calls, and re-runs validation before using responses.
for (const family of ['you', 'friend'] as const) {
  const { rows, admin } = storage();
  let billed = 0, validated = 0;
  const scope = { admin, family, jobId: 'job', attempt: 1 };
  const pipeline = async () => {
    const values = [];
    for (let i = 0; i < 6; i++) values.push(await step({ ...request(`step-${i}`), validateResponse: () => { validated++; } }, async input => {
      billed++;
      assert.equal(input.disableFallback, true);
      assert.ok(input.signal instanceof AbortSignal);
      return result(input.prompt);
    }));
    return values;
  };
  for (let invocation = 0; invocation < 5; invocation++) {
    await assert.rejects(resume(scope, pipeline), TransitReadingCheckpointYield);
    assert.equal(billed, invocation + 1);
    assert.equal(rows.filter(r => r.state === 'complete').length, billed);
  }
  assert.equal((await resume(scope, pipeline)).length, 6);
  assert.equal(billed, 6);
  await resume(scope, pipeline);
  assert.equal(billed, 6);
  assert.ok(validated >= 6);
  await assert.rejects(resume(scope, () => step(request('changed evidence'), async () => { throw new Error('must not bill'); })), /instructions or evidence changed/);
  await assert.rejects(resume(scope, async () => {
    await pipeline();
    return step(request('seventh'), async () => { throw new Error('must not bill'); });
  }), /six-step limit/);
}

// A killed worker may leave a reserved call; a stale scheduler claim keeps the
// logical checkpoint attempt, and cannot issue a duplicate provider request.
{
  const { rows, admin } = storage();
  const scope = { admin, family: 'you' as const, jobId: 'job', attempt: 1 };
  await resume(scope, () => step(request('writer'), async () => result('writer')));
  rows[0].state = 'started'; rows[0].response = null;
  await assert.rejects(resume(scope, () => step(request('writer'), async () => { assert.fail('duplicate billing'); })), /no confirmed saved response/);
}

// Two concurrent invocations can read an empty slot, but only its unique
// reservation winner can perform the paid call.
{
  const { admin } = storage();
  const scope = { admin, family: 'you' as const, jobId: 'job', attempt: 1 };
  let billed = 0;
  const call = () => resume(scope, () => step(request('writer'), async () => { billed++; return result('writer'); }));
  const outcomes = await Promise.allSettled([call(), call()]);
  assert.equal(billed, 1);
  assert.equal(outcomes.filter(r => r.status === 'rejected').length, 1);
}

// A hung provider is aborted before Vercel's 300-second kill. No fallback or
// repeat is attempted, and completed earlier steps remain intact.
{
  const { rows, admin } = storage();
  const scope = { admin, family: 'friend' as const, jobId: 'job', attempt: 1 };
  await resume(scope, () => step(request('writer'), async () => result('writer')));
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() });
  try {
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const pending = resume(scope, async () => {
      await step(request('writer'), async () => { assert.fail('writer must replay'); });
      return step(request('judge'), input => new Promise((_resolve, reject) => {
        input.signal!.addEventListener('abort', () => reject(input.signal!.reason), { once: true });
        started();
      }));
    });
    const rejected = assert.rejects(pending, TransitReadingCheckpointStopped);
    await ready;
    mock.timers.tick(240_001);
    await rejected;
    assert.equal(rows[0].state, 'complete');
    assert.equal(rows[1].state, 'failed');
    assert.match(rows[1].error, /time budget/);
  } finally { mock.timers.reset(); }
}

// Persist failures stop the pipeline; never return an unsaved result or issue
// the next request after a database failure.
{
  const { admin } = storage();
  admin.update = async () => { throw new Error('database unavailable'); };
  await assert.rejects(resume({ admin, family: 'you', jobId: 'job', attempt: 1 }, () => step(request('writer'), async () => result('writer'))), TransitReadingCheckpointStopped);
}
console.log('Report checkpoints: bounded calls, exact replay, validation, drift, crash, concurrency, deadline, and storage failure passed.');

// Verify the actual shared transport forwards cancellation to both provider
// fetches and does not start a fallback after a checkpointed call fails.
{
  const originalFetch = globalThis.fetch;
  const keys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'REPORT_FALLBACK_PROVIDER', 'REPORT_FALLBACK_MODEL'];
  const prior = keys.map(key => process.env[key]);
  process.env.OPENAI_API_KEY = 'offline-fixture';
  process.env.ANTHROPIC_API_KEY = 'offline-fixture';
  process.env.REPORT_FALLBACK_PROVIDER = 'openai';
  process.env.REPORT_FALLBACK_MODEL = 'fallback-fixture';
  try {
    for (const provider of ['openai', 'claude']) {
      const controller = new AbortController();
      let sent = 0;
      globalThis.fetch = async (_url, init) => {
        sent++;
        assert.equal(init!.signal, controller.signal);
        throw new Error('offline provider failure');
      };
      await assert.rejects(callReportCalibrationModel({
        ...request('writer'), provider, signal: controller.signal, disableFallback: true,
        schema: { type: 'object', properties: {}, required: [], additionalProperties: false }
      }), /offline provider failure/);
      assert.equal(sent, 1);
    }
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => { if (prior[index] === undefined) delete process.env[key]; else process.env[key] = prior[index]; });
  }
}
console.log('Checkpoint transport: both providers receive cancellation; fallback is suppressed.');

// Slow checkpoint storage must not start a provider call after the deadline.
{
  const { admin } = storage();
  const insert = admin.insert;
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() });
  admin.insert = async (...args) => { const row = await insert(...args); mock.timers.tick(240_001); return row; };
  try {
    await assert.rejects(resume({ admin, family: 'you', jobId: 'job', attempt: 1 }, () => step(request('writer'), async () => { assert.fail('deadline expired before billing'); })), TransitReadingCheckpointStopped);
  } finally { mock.timers.reset(); }
}
