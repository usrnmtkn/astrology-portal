import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Real lifecycle functions, isolated storage and generator boundaries. No model
// calls, credentials, production rows or clock sleeps are used.
const realNow = Date.now;
try {
  for (const family of ['friend', 'you']) {
    const bundle = await build({
      entryPoints: [`api/_lib/${family}-report-lifecycle.ts`], bundle: true,
      write: false, platform: 'node', format: 'esm',
      plugins: [{ name: 'worker-fixture', setup(b) {
        b.onResolve({ filter: /(?:friend|you)-transit-reading-generation\.js$/ }, () => ({ path: 'generate', namespace: 'fixture' }));
        b.onResolve({ filter: /transit-reading-generation\.js$/ }, () => ({ path: 'judge', namespace: 'fixture' }));
        b.onResolve({ filter: /transit-reading-checkpoints\.js$/ }, () => ({ path: 'checkpoints', namespace: 'fixture' }));
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: path === 'generate'
          ? 'export const generateFriendTransitReadingForUser = (...args) => globalThis.workerFixture.generate(...args); export const generateYouTransitReadingForUser = generateFriendTransitReadingForUser;'
          : path === 'judge' ? 'export const isTransitReadingJudgeBlockedError = e => e.code === "TRANSIT_READING_JUDGE_BLOCKED";'
          : 'export const TRANSIT_READING_INVOCATION_BUDGET_MS = 240000; export class TransitReadingCheckpointYield extends Error {} export class TransitReadingCheckpointStopped extends Error {} export const withTransitReadingCheckpoints = (input, run) => { globalThis.workerFixture.deadlines.push(input.deadline); return run(); };'
        }));
      }}]
    });
    const module = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
    const run = module[family === 'friend' ? 'runFriendReportJobs' : 'runYouReportJobs'];
    for (const window of family === 'you' ? ['day', 'week'] : ['day']) {
      for (const scenario of ['recover', 'cap', 'deadline', 'other-worker', 'revoked', 'infrastructure', 'slow-claim']) {
        let now = 1_800_000_000_000;
        Date.now = () => now;
        const started = now;
        let job = { id: 'test-job', entitlement_id: 'test-entitlement', user_id: 'test-user',
          run_after: new Date(now - 1000).toISOString(), state: 'queued', attempt: 0, checkpoint_attempt: 1, report_window: window, facts: {}, source_snapshot: {} };
        let calls = 0;
        let claims = 0;
        const updates = [];
        const deadlines = [];
        globalThis.workerFixture = { deadlines, generate: async () => {
          calls++;
          now += scenario === 'deadline' ? 190_000 : 20_000;
          if (scenario === 'recover' && calls === 2) return { saved: [{ id: 'test-result' }] };
          if (scenario === 'infrastructure') throw new Error('Temporary storage failure');
          throw Object.assign(new Error('Rejected draft'), { code: 'TRANSIT_READING_JUDGE_BLOCKED', diagnostic: { stage: 'second_judgment' } });
        }};
        const admin = {
          request: async (path, options) => {
            assert.equal(path, `rpc/claim_${family}_report_jobs`);
            const input = JSON.parse(options.body);
            claims++;
            if (claims > 1) {
              assert.equal(input.requested_job_id, job.id);
              assert.equal(input.batch_limit, 1);
              if (scenario === 'other-worker') return [];
              if (scenario === 'slow-claim') now += 170_000;
            }
            assert.ok(['queued', 'retry'].includes(job.state));
            if (job.run_after) assert.ok(Date.parse(job.run_after) <= now);
            job = { ...job, state: 'running', attempt: job.attempt + 1 };
            return [{ ...job }];
          },
          selectOne: async () => ({ id: job.entitlement_id, status: scenario === 'revoked' && claims > 1 ? 'revoked' : 'active' }),
          update: async (table, filter, patch) => {
            updates.push({ table, patch });
            if (table === `${family}_report_jobs`) job = { ...job, ...patch };
            return [{ ...job }];
          }
        };
        await run({ workerId: 'test-worker', jobId: job.id, admin });
        assert.ok(deadlines.every(d => d === started + 240_000), 'Retries must share the original deadline.');
        if (scenario === 'recover') {
          assert.equal(calls, 2); assert.equal(job.state, 'complete'); assert.equal(job.result_id, 'test-result');
          assert.equal(job.checkpoint_attempt, 2);
        } else if (scenario === 'cap') {
          assert.equal(calls, 4); assert.equal(job.state, 'failed'); assert.equal(job.attempt, 4);
        } else if (scenario === 'revoked') {
          assert.equal(calls, 1); assert.equal(job.state, 'cancelled');
        } else {
          assert.equal(calls, 1); assert.equal(job.state, 'retry');
          if (scenario === 'infrastructure') assert.equal(Date.parse(job.run_after) - now, 120_000);
          if (scenario === 'deadline') assert.equal(claims, 1);
          if (scenario === 'other-worker') assert.equal(claims, 2);
        }
      }
    }
  }
  console.log('Friends/day/week workers: immediate recovery, four-attempt cap, shared deadline, concurrent claim, revoked entitlement and infrastructure backoff passed.');
} finally {
  Date.now = realNow;
  delete globalThis.workerFixture;
}
