import assert from "node:assert/strict";
import { mock } from "node:test";
import { judgeGeneratedTransitReading } from "../api/_lib/transit-reading-judge.js";
import { assertScopedReview, scopedReviewSchema, scopedReviewBrief, scopedReviewRules } from "../api/_lib/transit-reading-scoped-judge.js";
import { REVIEW_CATEGORIES, SCOPED_REVIEW_SCHEMAS, transitReadingDraftHash, transitReadingReviewMode } from "../api/_lib/transit-reading-review-contract.js";
import { assertOpenAiStrictResponseSchema } from "../api/_lib/report-provider-schema.js";
import { generateGovernedTransitReading, isTransitReadingJudgeBlockedError, type GeneratedTransitReadingDraft } from "../api/_lib/transit-reading-generation.js";
import { withTransitReadingCheckpoints as resume, previousTransitReadingCorrectionFeedback as priorFeedback,
  TransitReadingCheckpointYield, checkpointTransitReadingModel as step } from "../api/_lib/transit-reading-checkpoints.js";
import type { SupabaseReportAdmin } from "../api/_lib/supabase-report-admin.js";

// The actual governed kernel, owner corpus, model adapter and review/correction
// pipeline run here. Only HTTP/storage are synthetic. Never contacts a provider.
const envKeys = ["OPENAI_API_KEY", "GENERATED_REPORT_REVIEW_MODE", "REPORT_JUDGE_PROVIDER", "REPORT_JUDGE_MODEL",
  "CONTENT_GENERATION_PROVIDER", "CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL", "REPORT_FALLBACK_PROVIDER", "REPORT_FALLBACK_MODEL"];
const priorEnv = envKeys.map(key => process.env[key]);
const originalFetch = globalThis.fetch;
const draft: GeneratedTransitReadingDraft = { headline: "Synthetic report", summary: "Synthetic visible summary.", tldr: "Synthetic visible summary.",
  body: "Synthetic first sentence. Synthetic second sentence.\n\nSynthetic closing paragraph.", sections: [], action: "", timing: "", model: "fixture", retryCount: 0 };
const changed = { ...draft, body: "Changed first sentence. Changed second sentence.\n\nChanged closing paragraph." };
const youBrief = { window: "day", approvedReaderText: { source: "Synthetic approved reader meaning." }, technicalEvidence: { marker: "FACTS_ONLY_INVENTORY" } };
const friendBrief = { daily: null, primaryThemes: [], longerCycles: [], houseContext: [], activePatterns: [], relationshipActivations: [] };
function input(surface: "you" | "friends", window = "day") {
  const brief = surface === "you" ? { ...youBrief, window } : friendBrief;
  return { surface, reportKind: surface === "friends" ? "friend_transit_reading" : `you_${window}_reading`, brief, draft: structuredClone(draft),
    ownerEvidence: ["Synthetic approved editorial correction."], productionInput: { contentKey: "synthetic-scope-report", surface, mode: "in_depth", eventType: "transit",
      facts: { [surface === "you" ? "youTransitReadingBrief" : "friendTransitsBrief"]: brief }, knowledgeIds: ["house-6"], sourceSnapshot: {} } };
}
function payload(scope: "facts" | "writing", copy = draft) {
  return { draftSha256: transitReadingDraftHash(copy), scores: Object.fromEntries(REVIEW_CATEGORIES[scope].map(key => [key, 4])), findings: [] as any[] };
}
function finding(scope: "facts" | "writing", copy: typeof draft) {
  return { category: scope === "facts" ? "unsupported_interpretation" : "natural_language", location: "body paragraph 1",
    finding: scope === "facts" ? "Synthetic missing source support." : "Synthetic ambiguous connection.",
    draftQuote: copy.body.split("\n\n")[0], sourcePath: null, sourceQuote: null, ownerComparisons: [],
    ...(scope === "writing" ? { contextQuote: copy.body.split("\n\n")[0], readerConsequence: "Synthetic reading difficulty." } : {}) };
}
function block(scope: "facts" | "writing", copy: typeof draft) {
  return { ...payload(scope, copy), scores: { ...payload(scope, copy).scores, [scope === "facts" ? "factual_traceability" : "natural_language"]: 3 }, findings: [finding(scope, copy)] };
}
function storage() {
  const rows: any[] = [];
  const matches = (row: any, p: URLSearchParams) => [...p].every(([key, value]) => ["select", "order", "limit"].includes(key) || String(row[key]) === value.slice(3));
  const admin = { async selectOne(_t: string, p: URLSearchParams) { return structuredClone(rows.filter(r => matches(r, p)).sort((a,b) => b.step - a.step)[0] ?? null); },
    async insert(_t: string, row: any) { const saved = { id: String(rows.length), ...structuredClone(row) }; rows.push(saved); return [structuredClone(saved)]; },
    async update(_t: string, query: string, patch: any) { const selected = rows.filter(r => matches(r, new URLSearchParams(query))); selected.forEach(r => Object.assign(r, structuredClone(patch))); return structuredClone(selected); }
  } as unknown as SupabaseReportAdmin;
  return { rows, admin };
}
let requests: any[] = [];
function transport(reply: (request: any) => unknown | Promise<unknown>) {
  requests = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses", "Unexpected network request blocked.");
    const request = JSON.parse(String(init?.body)); requests.push(request);
    const value = await reply(request);
    return new Response(JSON.stringify({ id: `offline-${requests.length}`, output_text: JSON.stringify(value), usage: { input_tokens: 10, output_tokens: 5 } }), { status: 200 });
  };
}
const requestScope = (req: any) => req.text.format.name === SCOPED_REVIEW_SCHEMAS.facts ? "facts" : "writing";

try {
  delete process.env.GENERATED_REPORT_REVIEW_MODE;
  assert.equal(transitReadingReviewMode(), "combined");
  process.env.GENERATED_REPORT_REVIEW_MODE = "typo";
  assert.throws(transitReadingReviewMode, /Invalid/);
  process.env.GENERATED_REPORT_REVIEW_MODE = "scoped";
  process.env.OPENAI_API_KEY = "offline-fixture";
  process.env.REPORT_JUDGE_PROVIDER = "openai";
  process.env.REPORT_JUDGE_MODEL = "gpt-5.6-terra";
  process.env.CONTENT_GENERATION_PROVIDER = "openai";
  process.env.CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL = "openai";
  process.env.REPORT_FALLBACK_PROVIDER = "claude";
  process.env.REPORT_FALLBACK_MODEL = "must-not-dispatch";

  for (const scope of ["facts", "writing"] as const) {
    assertOpenAiStrictResponseSchema(scopedReviewSchema(scope), SCOPED_REVIEW_SCHEMAS[scope]);
    assert.ok(scopedReviewRules(scope).includes("SOURCE_SHA256:"));
    const valid = payload(scope);
    const evidence = { draft, brief: youBrief };
    assert.doesNotThrow(() => assertScopedReview(valid, scope, evidence));
    assert.throws(() => assertScopedReview({ ...valid, draftSha256: "0".repeat(64) }, scope, evidence), /another draft/);
    assert.throws(() => assertScopedReview({ ...valid, scores: { ...valid.scores, [scope === "facts" ? "density" : "astrology_chronology"]: 4 } }, scope, evidence), /out-of-scope/);
    assert.throws(() => assertScopedReview({ ...valid, findings: [finding(scope === "facts" ? "writing" : "facts", draft)] }, scope, evidence), /malformed finding/);
    assert.throws(() => assertScopedReview({ ...valid, verdict: "pass" }, scope, evidence), /unexpected field/);
  }
  const contextual = block("writing", draft);
  assert.doesNotThrow(() => assertScopedReview(contextual, "writing", { draft, brief: youBrief }));
  assert.throws(() => assertScopedReview({ ...contextual, findings: [{ ...contextual.findings[0], contextQuote: "Synthetic first sentence." }] }, "writing", { draft, brief: youBrief }), /complete paragraph/);
  assert.throws(() => assertScopedReview({ ...contextual, findings: [{ ...contextual.findings[0], readerConsequence: " " }] }, "writing", { draft, brief: youBrief }), /reader consequence/);
  assert.deepEqual(scopedReviewBrief(input("you")), { approvedReaderText: youBrief.approvedReaderText });

  // Actual governed calls for each supported surface/horizon, and exact replay.
  for (const [surface, window] of [["you", "day"], ["you", "week"], ["friends", "current"]] as const) {
    const candidate = input(surface, window);
    transport(req => payload(requestScope(req)));
    const { admin, rows } = storage(); const progress: string[] = [];
    const context = { admin, family: surface === "you" ? "you" as const : "friend" as const, jobId: "case", attempt: 1, onProgress: async (stage: string) => { progress.push(stage); } };
    const reviewed = await resume(context, () => judgeGeneratedTransitReading(candidate));
    assert.equal(reviewed.result.verdict, "pass");
    assert.equal(requests.length, 2); assert.deepEqual(progress, ["checking", "checking"]);
    const [facts, writing] = requests;
    assert.ok(!facts.input.includes("OWNER PASSAGE "));
    assert.ok(!facts.input.includes(candidate.ownerEvidence[0]));
    assert.ok(writing.input.includes("OWNER PASSAGE "));
    assert.ok(writing.input.includes(candidate.ownerEvidence[0]));
    assert.ok(!writing.input.includes("FACTS_ONLY_INVENTORY"));
    if (surface === "you") assert.ok(facts.input.includes("FACTS_ONLY_INVENTORY"));
    assert.equal(Object.keys(reviewed.result.scores).length, 9);
    assert.ok("scopedReviews" in reviewed);
    for (const [index, receipt] of reviewed.scopedReviews!.entries()) {
      assert.equal(receipt.requestSha256, rows[index].request_hash);
      assert.equal(receipt.draftSha256, transitReadingDraftHash(draft));
      assert.equal(receipt.usage.totalTokens, 15);
    }
    await resume(context, () => judgeGeneratedTransitReading(candidate));
    assert.equal(requests.length, 2, "Replay must not bill either role again.");
  }

  // Wrong evidence/missing output is an evaluation error, never a prose failure.
  for (const malformedRole of ["facts", "writing"] as const) {
    transport(req => requestScope(req) === malformedRole ? { ...payload(malformedRole), draftSha256: "0".repeat(64) } : payload(requestScope(req)));
    await assert.rejects(judgeGeneratedTransitReading(input("you")), /another draft/);
    assert.equal(requests.length, malformedRole === "facts" ? 1 : 2, "No automatic retries or fallback.");
  }
  transport(req => payload(requestScope(req)));
  const missing = input("you"); missing.productionInput.knowledgeIds = [];
  await assert.rejects(judgeGeneratedTransitReading(missing), /EVIDENCE_MISSING/);
  assert.equal(requests.length, 0);

  // Complete writer -> facts -> writing -> correction -> facts -> writing.
  // A factual regression after an editorial correction must not reuse a pass.
  for (const scenario of ["correction-pass", "new-fact-defect", "invalid-review", "cleanup-pass", "worst-path"] as const) {
    let writers = 0, facts = 0, writing = 0;
    const candidate = input("you");
    const { admin, rows } = storage();
    transport(req => {
      if (!req.text.format.name.includes("judge")) {
        writers++;
        if (writers > (scenario === "worst-path" ? 3 : 1)) {
          assert.ok(req.input.includes("Synthetic reading difficulty."));
          assert.ok(req.input.includes("Complete paragraph:"));
        }
        return { ...((scenario === "worst-path" ? writers <= 3 : writers === 1) ? draft : changed) };
      }
      const scope = requestScope(req); scope === "facts" ? facts++ : writing++;
      const copy = writers > (scenario === "worst-path" ? 3 : 1) ? changed : draft;
      if (scenario === "invalid-review" && scope === "writing") return {};
      if (scenario === "new-fact-defect" && scope === "facts" && facts === 2) return block(scope, copy);
      return scope === "writing" && writing === 1 ? block(scope, copy) : payload(scope, copy);
    });
    const run = () => generateGovernedTransitReading({ brief: candidate.brief, headline: draft.headline,
      contentType: "you_day_reading", surface: "you", family: "you", schemaName: "tldr_astro_you_transit_reading",
      toolDescription: "Synthetic test only", productionInput: candidate.productionInput,
      promptForAttempt: (_brief, _headline, feedback) => feedback,
      validate: () => ({ passed: !((scenario === "worst-path" && (writers < 3 || writers === 4)) || (scenario === "cleanup-pass" && writers === 2)) }),
      compactBriefForRecovery: brief => brief, minSummaryLength: 1, minBodyLength: 1, recoveryLabel: "Synthetic",
      judge: args => judgeGeneratedTransitReading({ ...candidate, ...args }) });
    const pending = resume({ admin, family: "you", jobId: scenario, attempt: 1 }, run);
    if (scenario === "new-fact-defect") await assert.rejects(pending, isTransitReadingJudgeBlockedError);
    else if (scenario === "invalid-review") {
      await assert.rejects(pending, error => !isTransitReadingJudgeBlockedError(error));
      assert.equal(writers, 1); assert.equal(facts, 1); assert.equal(writing, 1); continue;
    } else {
      const result = await pending;
      assert.equal(result.draft.body, changed.body);
      assert.equal(result.judgeAudit!.attempts, 2);
      assert.ok(result.judgeAudit!.scopedReviews!.every(review => review.draftSha256 === transitReadingDraftHash(result.draft)));
    }
    assert.equal(facts, 2); assert.equal(writing, 2);
    assert.equal(writers, scenario === "worst-path" ? 5 : scenario === "cleanup-pass" ? 3 : 2);
    assert.equal(rows.length, writers + 4);
    if (scenario === "worst-path") assert.equal(rows.length, 9);
  }

  // A timed-out invocation between roles replays facts and calls only writing.
  {
    const { admin } = storage(); const candidate = input("you");
    const ctx = { admin, family: "you" as const, jobId: "yield", attempt: 1 };
    mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.now() });
    try {
      transport(req => { if (requestScope(req) === "facts") mock.timers.tick(185_000); return payload(requestScope(req)); });
      await assert.rejects(resume(ctx, () => judgeGeneratedTransitReading(candidate)), TransitReadingCheckpointYield);
      assert.equal(requests.length, 1);
      await resume(ctx, () => judgeGeneratedTransitReading(candidate));
      assert.equal(requests.length, 2);
    } finally { mock.timers.reset(); }
  }

  // Call ceilings apply on every replay and cannot be shifted between roles.
  for (const name of ["tldr_astro_you_transit_reading", SCOPED_REVIEW_SCHEMAS.facts, SCOPED_REVIEW_SCHEMAS.writing]) {
    const { admin } = storage(); let calls = 0;
    const maximum = name.includes("judge") ? 2 : 5;
    await assert.rejects(resume({ admin, family: "you", jobId: name, attempt: 1 }, async () => {
      for (let i = 0; i <= maximum; i++) await step({ provider: "fixture", model: "fixture", prompt: String(i), schemaName: name, schema: {} },
        async () => { calls++; return { value: {}, provider: "fixture", model: "fixture", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }; });
    }), /role call limit/);
    assert.equal(calls, maximum);
  }

  // The response can be perfectly shaped and still belong to the wrong draft.
  // A caller mutation during a dispatched request must prevent delivery.
  {
    const candidate = input("you");
    transport(req => { if (requestScope(req) === "facts") candidate.draft.body = changed.body; return payload(requestScope(req)); });
    await assert.rejects(judgeGeneratedTransitReading(candidate), /Draft changed during/);
  }

  // Recovery selects an actual writer and both matching reviews, excluding a
  // newer unknown schema and reviews of an earlier draft. Queries stay job-local.
  for (const family of ["you", "friend"] as const) {
    const { admin, rows } = storage();
    const saved = (step: number, schema_name: string, value: unknown) => ({ [`${family}_job_id`]: "retry", attempt: 1, step, state: "complete", schema_name, response: { value } });
    rows.push(saved(0, `tldr_astro_${family}_transit_reading`, { ...draft, headline: "Provider ignored fixed title" }),
      saved(1, SCOPED_REVIEW_SCHEMAS.facts, block("facts", draft)), saved(2, SCOPED_REVIEW_SCHEMAS.writing, block("writing", draft)),
      saved(3, "unknown", { body: "Must not become the draft" }));
    const ctx = { admin, family, jobId: "retry", attempt: 2 };
    const feedback = await resume(ctx, () => priorFeedback(undefined, draft.headline));
    assert.ok(feedback.includes("Synthetic missing source support."));
    assert.ok(feedback.includes("Synthetic reading difficulty."));
    assert.ok(!feedback.includes("Must not become the draft"));
    rows.push(saved(4, `tldr_astro_${family}_transit_reading`, changed));
    assert.equal(await resume(ctx, () => priorFeedback(undefined, draft.headline)), "");
    rows.push(saved(5, SCOPED_REVIEW_SCHEMAS.writing, block("writing", draft)));
    assert.equal(await resume(ctx, () => priorFeedback(undefined, draft.headline)), "", "Wrong-hash review must not diagnose a later draft.");
  }
  console.log("Scoped reviews passed: strict ownership, exact context and draft binding, actual governed daily/weekly/Friends dispatch, unchanged gates, correction regressions, nine-step ceiling, replay, yield, and retry recovery. No live provider calls.");
} finally {
  globalThis.fetch = originalFetch;
  envKeys.forEach((key, i) => { if (priorEnv[i] === undefined) delete process.env[key]; else process.env[key] = priorEnv[i]; });
}
