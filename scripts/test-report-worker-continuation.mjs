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
          : 'export const TRANSIT_READING_INVOCATION_BUDGET_MS = 240000; export class TransitReadingCheckpointYield extends Error {} export class TransitReadingCheckpointStopped extends Error {} export const withTransitReadingCheckpoints = (input, run) => { globalThis.workerFixture.checkpoints.push(input); globalThis.workerFixture.yieldError = new TransitReadingCheckpointYield(); globalThis.workerFixture.stopError = new TransitReadingCheckpointStopped(); return run(); };'
        }));
      }}]
    });
    const module = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
    const run = module[family === 'friend' ? 'runFriendReportJobs' : 'runYouReportJobs'];
    for (const window of family === 'you' ? ['day', 'week'] : ['day']) {
      for (const scenario of ['quality-held', 'checkpoint-resume', 'checkpoint-revoked', 'checkpoint-other-worker', 'short-deadline', 'infrastructure', 'checkpoint-stop']) {
        let now = 1_800_000_000_000;
        Date.now = () => now;
        const started = now;
        let job = { id: 'test-job', entitlement_id: 'test-entitlement', user_id: 'test-user',
          run_after: new Date(now - 1000).toISOString(), state: 'queued', attempt: 0, checkpoint_attempt: 1, report_window: window, facts: {}, source_snapshot: {} };
        let calls = 0;
        let claims = 0;
        const updates = [];
        const checkpoints = [];
        globalThis.workerFixture = { checkpoints, generate: async () => {
          calls++;
          now += 20_000;
          if (scenario === 'checkpoint-resume' && calls === 2) return { saved: [{ id: 'test-result' }] };
          if (scenario === 'checkpoint-stop') throw globalThis.workerFixture.stopError;
          if (scenario.startsWith('checkpoint-')) throw globalThis.workerFixture.yieldError;
          if (scenario === 'infrastructure') throw new Error('Temporary storage failure');
          throw Object.assign(new Error('Rejected draft'), { code: 'TRANSIT_READING_JUDGE_BLOCKED', diagnostic: { stage: 'second_judgment' } });
        }};
        const admin = {
          request: async (path, options) => {
            assert.equal(path, `rpc/claim_${family}_report_jobs`);
            const input = JSON.parse(options.body);
            claims++;
            assert.equal(input.requested_job_id, job.id);
            assert.equal(input.batch_limit, 1);
            if (claims > 1 && scenario === 'checkpoint-other-worker') return [];
            if (!['queued', 'retry'].includes(job.state) || Date.parse(job.run_after) > now) return [];
            if (scenario === 'short-deadline') now += 190_000;
            job = { ...job, state: 'running', attempt: job.attempt + 1 };
            return [{ ...job }];
          },
          selectOne: async () => ({ id: job.entitlement_id, status: scenario === 'checkpoint-revoked' && claims > 1 ? 'revoked' : 'active' }),
          update: async (table, filter, patch) => {
            updates.push({ table, patch });
            if (table === `${family}_report_jobs`) job = { ...job, ...patch };
            return [{ ...job }];
          }
        };
        await run({ workerId: 'test-worker', jobId: job.id, admin });
        assert.equal(claims, 1, 'The worker must not immediately reclaim a completed quality cycle or yielded checkpoint.');
        assert.ok(checkpoints.every(c => c.deadline === started + 240_000));
        if (scenario === 'quality-held' || scenario === 'checkpoint-stop') {
          assert.equal(calls, 1); assert.equal(job.state, 'failed'); assert.equal(job.attempt, 1);
          assert.equal(job.checkpoint_attempt, 1);
          if (scenario === 'quality-held') assert.match(job.last_error, /^Report review required:/);
          assert.equal((await run({ workerId: 'later-worker', jobId: job.id, admin })).claimed, 0);
          assert.equal(calls, 1, 'A terminal job cannot dispatch another generation.');
        } else if (scenario === 'infrastructure') {
          assert.equal(calls, 1); assert.equal(job.state, 'retry'); assert.equal(job.attempt, 1);
          assert.equal(job.checkpoint_attempt, 2);
          assert.equal(Date.parse(job.run_after) - now, 120_000);
          assert.equal((await run({ workerId: 'later-worker', jobId: job.id, admin })).claimed, 0);
          assert.equal(calls, 1, 'An invocation cannot bypass infrastructure backoff.');
        } else {
          assert.equal(calls, scenario === 'short-deadline' ? 0 : 1);
          assert.equal(job.state, 'retry'); assert.equal(job.attempt, 0);
          assert.equal(job.checkpoint_attempt, 1, 'Yielding preserves the saved model-call attempt.');
          assert.ok(updates.some(({ patch }) => patch.source_snapshot?.reportProgress?.stage === 'waiting'));
          if (scenario !== 'short-deadline') {
            const resumedAt = now;
            const resumed = await run({ workerId: 'later-worker', jobId: job.id, admin });
            if (scenario === 'checkpoint-resume') {
              assert.equal(calls, 2); assert.equal(job.state, 'complete'); assert.equal(job.result_id, 'test-result');
              assert.equal(job.attempt, 1); assert.equal(job.checkpoint_attempt, 1);
              assert.deepEqual(checkpoints.map(c => c.attempt), [1, 1]);
              assert.equal(checkpoints[1].deadline, resumedAt + 240_000);
            } else if (scenario === 'checkpoint-revoked') {
              assert.equal(calls, 1); assert.equal(job.state, 'cancelled');
            } else {
              assert.equal(resumed.claimed, 0); assert.equal(calls, 1); assert.equal(job.state, 'retry');
            }
          }
        }
      }
    }
  }
  console.log('Friends/day/week workers: 21 cases passed for terminal review holds, checkpoint resumption, deadlines, concurrent claims, revoked entitlement and infrastructure backoff.');
} finally {
  Date.now = realNow;
  delete globalThis.workerFixture;
}
