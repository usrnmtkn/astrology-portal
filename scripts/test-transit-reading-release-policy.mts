import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { GENERATED_REPORT_JUDGE_CATEGORIES, GENERATED_REPORT_JUDGE_BLOCKING_FINDINGS, type GeneratedReportJudgeFinding } from "../api/_lib/transit-reading-judge-rules.ts";
import { decideTransitReadingRelease, MATERIAL_REVIEW_POLICY, transitReadingReleasePolicy } from "../api/_lib/transit-reading-release-policy.ts";
import { transitReadingModelRequestHash } from "../api/_lib/transit-reading-checkpoints.ts";
import { isInvalidReportReview } from "../api/_lib/transit-reading-review-stop.ts";
import { GeneratedReportJudgeEvidenceError, assertGeneratedReportJudgeEvidence } from "../api/_lib/transit-reading-judge-evidence.ts";

const perfect = () => Object.fromEntries(GENERATED_REPORT_JUDGE_CATEGORIES.map(key => [key, 4]));
const finding = (category: GeneratedReportJudgeFinding["category"]): GeneratedReportJudgeFinding => ({ category, location: "body", finding: "Synthetic defect.", draftQuote: "Synthetic draft.", sourcePath: null, sourceQuote: null, ownerComparisons: [] });
const decide = (scores = perfect(), findings: GeneratedReportJudgeFinding[] = [], policy: "strict" | typeof MATERIAL_REVIEW_POLICY = MATERIAL_REVIEW_POLICY) => decideTransitReadingRelease({ scores, findings, threshold: .85 }, policy);
assert.equal(decide().action, "accept");
for (const key of GENERATED_REPORT_JUDGE_CATEGORIES) {
  const scores = { ...perfect(), [key]: 3 };
  const factual = ["astrology_chronology", "factual_traceability"].includes(key);
  assert.equal(decide(scores, [finding(key)]).action, factual ? "correct" : "accept", key);
  assert.equal(decide({ ...scores, [key]: 2 }, [finding(key)]).action, "correct", key);
  assert.equal(decide({ ...scores, [key]: 2 }).action, "review_required", "Material scores require a diagnosis");
  assert.equal(decide({ ...scores, [key]: 2.5 }, [finding(key)]).action, "review_required", "No fractional score laundering");
}
for (const key of GENERATED_REPORT_JUDGE_BLOCKING_FINDINGS) {
  const scoreKey = key === "unsupported_timing" ? "astrology_chronology" : key === "owner_language" ? "owner_voice" : key === "narrative_repetition" ? "interpretive_movement" : "factual_traceability";
  assert.equal(decide({ ...perfect(), [scoreKey]: 3 }, [finding(key)]).action, "correct", key);
}
const mixed = decide({ ...perfect(), owner_voice: 3, interpretive_movement: 2 }, [finding("owner_voice"), finding("interpretive_movement")]);
assert.deepEqual(mixed.blockingFindings.map(f => f.category), ["interpretive_movement"]);
assert.deepEqual(mixed.advisoryFindings.map(f => f.category), ["owner_voice"]);
const weekly = { ...perfect(), owner_voice: 3, natural_language: 3 };
assert.equal(decide(weekly, [finding("owner_voice"), finding("natural_language")], "strict").action, "correct");
const candidate = decide(weekly, [finding("owner_voice"), finding("natural_language")]);
assert.equal(candidate.action, "accept"); assert.equal(candidate.strictVerdict, "below_threshold");
assert.equal(decide({ ...perfect(), owner_voice: 3, natural_language: 3, lived_experience: 3, interpretive_movement: 3, syntax_variety: 3, density: 3 }, []).reason, "aggregate_without_material_diagnosis");
assert.equal(decide(perfect(), [finding("owner_voice")]).action, "review_required");
assert.equal(decide({ ...perfect(), invented: 4 }).action, "review_required");
assert.equal(decideTransitReadingRelease({ scores: perfect(), findings: [], threshold: .1 }, MATERIAL_REVIEW_POLICY).action, "review_required");
assert.throws(() => assertGeneratedReportJudgeEvidence({ scores: { ...perfect(), density: 3.5 }, findings: [] }, { draft: { headline: "Synthetic", summary: "Synthetic", body: "Synthetic" }, brief: {} }), /invalid density/);
assert(isInvalidReportReview(new Error("Checkpoint wrapper", { cause: new GeneratedReportJudgeEvidenceError("synthetic") })));
assert(!isInvalidReportReview(new Error("Temporary provider outage")));

const saved = { policy: process.env.GENERATED_REPORT_RELEASE_POLICY, mode: process.env.GENERATED_REPORT_REVIEW_MODE };
try {
  delete process.env.GENERATED_REPORT_RELEASE_POLICY; delete process.env.GENERATED_REPORT_REVIEW_MODE;
  assert.equal(transitReadingReleasePolicy(), "strict");
  const input = { provider: "openai" as const, model: "fixture", prompt: "fixture", schemaName: "fixture", schema: {} };
  const strictHash = transitReadingModelRequestHash(input);
  assert.equal(strictHash, createHash("sha256").update(JSON.stringify({ version: 1, ...input })).digest("hex"), "Default checkpoint identity is byte-compatible");
  process.env.GENERATED_REPORT_RELEASE_POLICY = MATERIAL_REVIEW_POLICY;
  assert.notEqual(transitReadingModelRequestHash(input), strictHash, "A policy change cannot reuse old checkpoints");
  process.env.GENERATED_REPORT_REVIEW_MODE = "scoped";
  assert.throws(transitReadingReleasePolicy, /separate experiment/);
  process.env.GENERATED_REPORT_RELEASE_POLICY = "typo";
  assert.throws(transitReadingReleasePolicy, /Unknown/);
} finally {
  for (const [key, value] of [["GENERATED_REPORT_RELEASE_POLICY", saved.policy], ["GENERATED_REPORT_REVIEW_MODE", saved.mode]]) {
    if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
  }
}
console.log("Report release policy: category boundaries, strict/default behavior, invalid review, aggregate hold and checkpoint identity passed. No live calibration claim.");
