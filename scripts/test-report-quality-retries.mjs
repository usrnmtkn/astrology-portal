import assert from "node:assert/strict";
import { build } from "esbuild";

// Execute both real workers and the real Supabase HTTP adapter. Only the
// generation boundary and database transport are fixtures; no paid calls run.
const bundle = await build({
  stdin: {
    contents: `
      export { runYouReportJobs } from "./api/_lib/you-report-lifecycle.ts";
      export { runFriendReportJobs } from "./api/_lib/friend-report-lifecycle.ts";
      export { createSupabaseReportAdmin } from "./api/_lib/supabase-report-admin.ts";
      export { TransitReadingJudgeBlockedError } from "./api/_lib/transit-reading-generation.ts";
    `,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true, write: false, platform: "node", format: "esm",
  plugins: [{
    name: "report-generation-fixture",
    setup(builder) {
      builder.onResolve({ filter: /\/(you|friend)-transit-reading-generation\.js$/ }, ({ path }) => ({ path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
        contents: `export const generate${path.includes("you-") ? "You" : "Friend"}TransitReadingForUser = input => globalThis.reportRetryFixture(input);`
      }));
      // The shared error classifier imports provider infrastructure. Keep that
      // unused infrastructure out of this worker test; correction tests exercise it.
      builder.onResolve({ filter: /transit-reading-production\.js$/ }, () => ({ path: "kernel", namespace: "unused" }));
      builder.onResolve({ filter: /openAIResponses\.cjs$/ }, () => ({ path: "instructions", namespace: "unused" }));
      builder.onLoad({ filter: /.*/, namespace: "unused" }, ({ path }) => ({ contents: path === "kernel"
        ? `export const callGovernedTransitReadingModel = () => { throw new Error("Unexpected provider call"); }; export const prepareTransitReadingProductionKernel = () => { throw new Error("Unexpected kernel call"); };`
        : `export const governedInstructionsForRole = () => { throw new Error("Unexpected instructions call"); };`
      }));
    }
  }]
});
const { runYouReportJobs, runFriendReportJobs, createSupabaseReportAdmin, TransitReadingJudgeBlockedError } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const previousFixture = globalThis.reportRetryFixture;
const previousNow = Date.now;
const previousCaps = [process.env.YOU_REPORT_JOB_ATTEMPT_CAP, process.env.FRIEND_REPORT_JOB_ATTEMPT_CAP];
process.env.YOU_REPORT_JOB_ATTEMPT_CAP = "4";
process.env.FRIEND_REPORT_JOB_ATTEMPT_CAP = "4";
let cases = 0;
try {
  for (const window of ["day", "week", "friend"]) {
    const family = window === "friend" ? "friend" : "you";
    const run = window === "friend" ? runFriendReportJobs : runYouReportJobs;
    for (const source of ["stripe", "free_test", "comp"]) {
      for (const scenario of ["recovery", "exhaustion", "refunded", "revoked", "missing-entitlement"]) {
        let now = previousNow();
        Date.now = () => now;
        const facts = { brief: { schema: "locked-test-brief", targetDate: "2026-09-09", window } };
        const job = {
          id: "job-fixture", entitlement_id: "entitlement-fixture", user_id: "user-fixture",
          subject_id: "friend-fixture", report_window: window, target_date: "2026-09-09",
          period_end: "2026-09-09", content_key: `${family}/${window}/2026-09-09`, facts,
          state: "queued", attempt: 0, run_after: new Date(now).toISOString(),
          result_id: null, last_error: null, locked_at: null, locked_by: null
        };
        const entitlement = {
          id: job.entitlement_id, source,
          status: ["refunded", "revoked"].includes(scenario) ? scenario : "active"
        };
        const placeholder = { status: "DRAFT", body: "", error: null };
        const requests = [];
        let generationCalls = 0;
        const admin = createSupabaseReportAdmin({
          supabaseUrl: "https://report-retry.invalid", serviceRoleKey: "test-only",
          fetchImpl: async (url, init) => {
            const route = new URL(url).pathname.replace("/rest/v1/", "");
            requests.push({ route, method: init.method ?? "GET" });
            let rows;
            if (route === `rpc/claim_${family}_report_jobs`) {
              const claim = JSON.parse(init.body);
              assert.equal(claim.requested_job_id, job.id);
              rows = [];
              if (["queued", "retry"].includes(job.state) && Date.parse(job.run_after) <= now) {
                Object.assign(job, { state: "running", attempt: job.attempt + 1, locked_at: new Date(now).toISOString(), locked_by: claim.worker_id });
                rows = [{ ...job }];
              }
            } else if (route === `${family}_report_entitlements`) {
              assert.equal(init.method, undefined);
              assert.equal(new URL(url).searchParams.get("id"), `eq.${job.entitlement_id}`);
              rows = scenario === "missing-entitlement" ? [] : [entitlement];
            } else if (route === `${family}_report_jobs`) {
              assert.equal(init.method, "PATCH");
              assert.equal(new URL(url).searchParams.get("id"), `eq.${job.id}`);
              const patch = JSON.parse(init.body);
              assert.equal("attempt" in patch, false, "Automatic retries must never reset their budget.");
              assert.equal("facts" in patch, false, "The saved factual brief must remain locked.");
              Object.assign(job, patch);
              rows = [job];
            } else if (route === "user_generated_interpretations") {
              assert.equal(init.method, "PATCH");
              assert.equal(new URL(url).searchParams.get(`${family}_report_entitlement_id`), `eq.${job.entitlement_id}`);
              assert.equal(new URL(url).searchParams.get("subject_type"), `eq.${family === "friend" ? "friend_transit_reading" : `you_${window}_reading`}`);
              Object.assign(placeholder, JSON.parse(init.body));
              rows = [placeholder];
            } else assert.fail(`Unexpected request (including any billing mutation): ${init.method} ${route}`);
            return new Response(JSON.stringify(rows), { status: 200 });
          }
        });
        globalThis.reportRetryFixture = async (input) => {
          generationCalls += 1;
          assert.equal(input.entitlementId, job.entitlement_id);
          assert.equal(input.userId, job.user_id);
          assert.deepEqual(input.facts, facts);
          if (family === "friend") {
            assert.equal(input.subjectId, job.subject_id);
            assert.equal(input.targetDate, job.target_date);
          }
          if (scenario === "recovery" && generationCalls === 2) return { saved: [{ id: "approved-report-fixture" }] };
          throw new TransitReadingJudgeBlockedError({ stage: "second_judgment", judgment: { result: { scores: { owner_voice: 3 }, findings: [{ category: "owner_voice", location: "body", finding: "Diagnostic fixture" }], overall: 0.8, verdict: "below_threshold" }, provider: "fixture", model: "fixture", version: "fixture", threshold: 0.85 } });
        };
        const execute = () => run({ workerId: "retry-regression", jobId: job.id, admin });
        await execute();
        if (["refunded", "revoked", "missing-entitlement"].includes(scenario)) {
          assert.equal(job.state, "cancelled");
          assert.equal(generationCalls, 0);
          assert.equal(placeholder.status, "ERROR");
        } else {
          assert.equal(job.state, "retry", "First quality rejection must schedule another attempt.");
          assert.equal(placeholder.status, "DRAFT", "The library must keep showing generating between attempts.");
          assert.equal(Date.parse(job.run_after) - now, 120_000);
          assert.equal(job.locked_at, null);
          assert.equal(job.locked_by, null);
          assert.match(job.last_error, /Writing quality gate did not pass/);
          assert.match(job.last_error, /Diagnostic fixture/);
          assert.ok(!String(placeholder.error).includes("Diagnostic fixture"), "Private diagnostics must not reach the reader placeholder.");
          assert.equal((await execute()).claimed, 0, "The backoff must prevent immediate retry churn.");
          while (job.state === "retry") {
            assert.ok(job.attempt < 4, "Retries must stop at the attempt cap.");
            now = Date.parse(job.run_after);
            await execute();
          }
          assert.equal(job.state, scenario === "recovery" ? "complete" : "failed");
          assert.equal(generationCalls, scenario === "recovery" ? 2 : 4);
          assert.equal(job.result_id, scenario === "recovery" ? "approved-report-fixture" : null);
          assert.equal(placeholder.status, scenario === "recovery" ? "DRAFT" : "ERROR");
          if (scenario === "recovery") assert.equal(job.last_error, null);
          assert.equal((await execute()).claimed, 0, "Completed/exhausted jobs must not run again automatically.");
        }
        assert.equal(placeholder.body, "", "The worker must never expose a rejected draft.");
        assert.equal(requests.filter(({ method }) => method === "POST").every(({ route }) => route.startsWith("rpc/claim_")), true);
        cases += 1;
      }
    }
  }
} finally {
  Date.now = previousNow;
  if (previousFixture === undefined) delete globalThis.reportRetryFixture;
  else globalThis.reportRetryFixture = previousFixture;
  for (const [index, key] of ["YOU_REPORT_JOB_ATTEMPT_CAP", "FRIEND_REPORT_JOB_ATTEMPT_CAP"].entries()) {
    if (previousCaps[index] === undefined) delete process.env[key];
    else process.env[key] = previousCaps[index];
  }
}
console.log(`Report quality retries: ${cases} lifecycle cases passed (day/week/Friends; Stripe/free test/comp; recovery/exhaustion/cancellation).`);
