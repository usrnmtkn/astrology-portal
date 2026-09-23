import assert from "node:assert/strict";
import { assertOpenAiStrictResponseSchema, callReportCalibrationModel } from "../api/_lib/report-model-client.ts";
import { EVIDENCE_DELIVERY_POLICY, assertReportDeliveryEvidence, reportDeliveryEvidenceSchema, reportDeliveryOwnerRules } from "../api/_lib/transit-reading-delivery-evidence.ts";
import { GENERATED_REPORT_JUDGE_CATEGORIES, type GeneratedReportJudgeFinding } from "../api/_lib/transit-reading-judge-rules.ts";
import { GENERATED_REPORT_JUDGE_SCHEMA } from "../api/_lib/transit-reading-judge-schema.ts";
import { RECONCILED_REPORT_JUDGE_SCHEMA } from "../api/_lib/transit-reading-review-reconciliation.ts";
import { judgePrompt } from "../api/_lib/transit-reading-judge.ts";
import { decideTransitReadingRelease, transitReadingReleasePolicy } from "../api/_lib/transit-reading-release-policy.ts";
import { assertGeneratedReportJudgeEvidence } from "../api/_lib/transit-reading-judge-evidence.ts";
import { reportJudgeSourcePointerSchema, resolveReportJudgeSourcePointers } from "../api/_lib/transit-reading-source-citations.ts";
import { transitReadingModelRequestHash } from "../api/_lib/transit-reading-checkpoints.ts";

const draft = { headline: "Synthetic record", summary: "The shipment remains pending.",
  body: "The shipment arrives Friday. If a decision is needed, check its status. The arrangement is asking you to comply. It is settled and stable." };
const brief = { source: "The shipment arrives Monday. Its status is available.", facts: { day: "Monday" } };
const scores = Object.fromEntries(GENERATED_REPORT_JUDGE_CATEGORIES.map(key => [key, 4]));
const evidenceInput = { draft, brief, ownerComparisonSet: [{ evidenceId: "synthetic", text: "Synthetic comparison." }] };
const observation: GeneratedReportJudgeFinding = { category: "owner_voice", location: "body", finding: "Editorial preference.",
  draftQuote: draft.body, sourcePath: null, sourceQuote: null, ownerComparisons: [{ evidenceId: "synthetic", quote: "Synthetic comparison.", difference: "Different cadence." }], delivery: null };
const fact: GeneratedReportJudgeFinding = { category: "unsupported_timing", location: "body", finding: "The asserted arrival day conflicts with the source.",
  draftQuote: "The shipment arrives Friday.", sourcePath: "/source", sourceQuote: brief.source, ownerComparisons: [],
  delivery: { kind: "source_contradiction", claimType: "assertion", claimQuote: "arrives Friday", sourceGap: "Friday conflicts with the supplied Monday arrival.", ruleId: null, ruleApplication: null } };
function decide(findings: GeneratedReportJudgeFinding[], nextScores = scores) {
  const validated = assertReportDeliveryEvidence({ scores: nextScores, findings }, evidenceInput);
  return decideTransitReadingRelease({ ...validated, threshold: .85, deliveryPolicy: EVIDENCE_DELIVERY_POLICY }, EVIDENCE_DELIVERY_POLICY);
}
assert.equal(decide([observation]).action, "accept");
assert.equal(decide([observation], Object.fromEntries(GENERATED_REPORT_JUDGE_CATEGORIES.map(key => [key, 0]))).action, "accept", "Even very low diagnostic scores cannot invent a blocker");
for (const category of ["owner_language", "narrative_repetition", "unsupported_timing", "factual_traceability"] as const) {
  assert.equal(decide([{ ...observation, category }]).action, "accept", "A category label alone is not delivery evidence");
}
assert.equal(decide([fact]).action, "correct", "A real defect blocks despite perfect scores");
assert.equal(decide([observation, fact]).blockingFindings.length, 1);
assert.equal(decide([observation, fact]).advisoryFindings.length, 1);
assert.throws(() => decide([{ ...fact, category: "natural_language" }]), /editorial observation/);
assert.throws(() => decide([{ ...fact, sourcePath: null, sourceQuote: null }]), /requires a selected source/);
assert.throws(() => decide([{ ...fact, delivery: { ...fact.delivery!, claimQuote: "invented quotation" } }]), /incomplete claim/);
assert.throws(() => decide([{ ...fact, delivery: { ...fact.delivery!, sourceGap: " " } }]), /incomplete claim/);
const unsupported = { ...fact, category: "unsupported_interpretation" as const, sourcePath: null, sourceQuote: null,
  delivery: { ...fact.delivery!, kind: "unsupported_claim" as const, claimType: "conditional_illustration" as const } };
assert.equal(decide([unsupported]).action, "correct", "Conditional classification alone never exempts unsupported claims");
const rule: GeneratedReportJudgeFinding = { ...observation, category: "owner_language", ownerComparisons: [],
  delivery: { kind: "explicit_owner_rule", claimType: "interpretation", claimQuote: "settled and stable", sourceGap: "This is the exact redundant pair, with both words performing the same function.", ruleId: "redundant-stable", ruleApplication: "Both adjectives modify the same arrangement." } };
assert.equal(decide([rule]).action, "correct");
assert.throws(() => decide([{ ...rule, delivery: { ...rule.delivery!, ruleId: "made-up-rule" } }]), /owner rule/);
assert.throws(() => decide([{ ...rule, delivery: { ...rule.delivery!, ruleId: "asking-attention", claimQuote: "asking you to comply" } }]), /owner rule/, "A narrow instruction cannot silently expand to all asking constructions");
assert(reportDeliveryOwnerRules().every(rule => rule.text.length > 50 && /^[a-f0-9]{64}$/u.test(rule.sha256)));

const legacy = { scores, findings: [] };
assert.equal(decideTransitReadingRelease({ ...legacy, threshold: .85 }, EVIDENCE_DELIVERY_POLICY).action, "review_required", "Archived decisions are never reclassified by enabling a flag");
assert.throws(() => assertGeneratedReportJudgeEvidence({ scores: { ...scores, owner_voice: 0 }, findings: [] }, evidenceInput), /below-floor/, "Strict history keeps its own contract");
assert.throws(() => decide([{ ...observation, delivery: undefined }]), /incomplete/);
for (const base of [GENERATED_REPORT_JUDGE_SCHEMA, RECONCILED_REPORT_JUDGE_SCHEMA]) {
  const schema = reportJudgeSourcePointerSchema(reportDeliveryEvidenceSchema(base), brief);
  assertOpenAiStrictResponseSchema(schema, "delivery-evidence-test");
  assert(!("delivery" in base.properties.findings.items.properties), "No mutation of strict schema");
}
const { sourceQuote: _quote, ...wireFact } = fact;
const wire = { scores, findings: [wireFact] };
assertReportDeliveryEvidence(resolveReportJudgeSourcePointers(wire, brief), evidenceInput);
assert.equal(Object.hasOwn(wire.findings[0], "sourceQuote"), false);

const oldPolicy = process.env.GENERATED_REPORT_RELEASE_POLICY, oldMode = process.env.GENERATED_REPORT_REVIEW_MODE;
try {
  delete process.env.GENERATED_REPORT_RELEASE_POLICY; delete process.env.GENERATED_REPORT_REVIEW_MODE;
  assert.equal(transitReadingReleasePolicy(), "strict");
  const request = { provider: "openai" as const, model: "fixture", prompt: "fixture", schemaName: "fixture", schema: {} };
  const strictHash = transitReadingModelRequestHash(request);
  assert.notEqual(transitReadingModelRequestHash({ ...request, requestLimits: { maxInputBytes: 1000, maxOutputTokens: 10 } }), strictHash);
  process.env.GENERATED_REPORT_RELEASE_POLICY = EVIDENCE_DELIVERY_POLICY;
  assert.notEqual(transitReadingModelRequestHash(request), strictHash);
  const input = { surface: "you" as const, reportKind: "you_day_reading", brief, draft: { ...draft, tldr: draft.summary, action: "", timing: "", sections: [] as [], model: "fixture", retryCount: 0 }, ownerEvidence: [] };
  for (const prompt of [judgePrompt(input), judgePrompt({ ...input, priorReview: { draft, scores, findings: [fact] } })]) {
    assert(prompt.includes(EVIDENCE_DELIVERY_POLICY));
    assert(!prompt.includes("release floor requires 4"));
    assert(!prompt.includes("existing 0.85 threshold"));
    assert(!prompt.includes("category floors as before"));
    assert(!prompt.includes("Any of the following findings blocks release"));
  }
  process.env.GENERATED_REPORT_REVIEW_MODE = "scoped";
  assert.throws(transitReadingReleasePolicy, /combined/);
} finally {
  if (oldPolicy === undefined) delete process.env.GENERATED_REPORT_RELEASE_POLICY; else process.env.GENERATED_REPORT_RELEASE_POLICY = oldPolicy;
  if (oldMode === undefined) delete process.env.GENERATED_REPORT_REVIEW_MODE; else process.env.GENERATED_REPORT_REVIEW_MODE = oldMode;
}
const oldFetch = globalThis.fetch, transportEnv = { ...process.env };
let wireCalls = 0;
try {
  process.env.OPENAI_API_KEY = process.env.ANTHROPIC_API_KEY = "offline-only";
  globalThis.fetch = async (url, init = {}) => {
    wireCalls++;
    const payload = JSON.parse(String(init.body));
    const claude = String(url) === "https://api.anthropic.com/v1/messages";
    assert.equal(payload[claude ? "max_tokens" : "max_output_tokens"], 25);
    return new Response(JSON.stringify({ id: "offline", output_text: '{"ok":true}',
      content: [{ type: "tool_use", name: "synthetic_limit_test", input: { ok: true } }],
      usage: { input_tokens: 10, output_tokens: 5 } }), { status: 200 });
  };
  for (const provider of ["openai", "claude"]) {
    const input = { provider, model: "synthetic", prompt: "Synthetic request", schemaName: "synthetic_limit_test",
      schema: { type: "object", additionalProperties: false, required: ["ok"], properties: { ok: { type: "boolean" } } },
      disableFallback: true, requestLimits: { maxInputBytes: 1000, maxOutputTokens: 25 } };
    assert.deepEqual((await callReportCalibrationModel(input)).value, { ok: true });
    const before = wireCalls;
    await assert.rejects(callReportCalibrationModel({ ...input, prompt: "x".repeat(2000) }), /pre-dispatch input limit/);
    await assert.rejects(callReportCalibrationModel({ ...input, requestLimits: { maxInputBytes: 1000, maxOutputTokens: 0 } }), /Invalid report request limits/);
    assert.equal(wireCalls, before, "Oversized or invalid requests cannot reach the provider");
  }
} finally {
  globalThis.fetch = oldFetch;
  for (const key of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"]) {
    if (transportEnv[key] === undefined) delete process.env[key]; else process.env[key] = transportEnv[key];
  }
}
console.log("Evidence delivery: score independence, claim evidence, rule scope, schema, historical isolation and prompts passed. No semantic calibration claim.");
