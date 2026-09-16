import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  GENERATED_REPORT_JUDGE_CATEGORIES,
  generatedReportJudgeVerdict,
  type GeneratedReportJudgeScores
} from "../api/_lib/transit-reading-judge-rules.ts";
import {
  eligibleGeneratedReportOwnerEvidence,
  type GeneratedReportOwnerFeedbackRow
} from "../api/_lib/transit-reading-owner-evidence-rules.ts";
import { youTransitReadingProductionKnowledgeIds } from "../api/_lib/transit-reading-production-evidence.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative: string) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const require = createRequire(import.meta.url);
const productionEvidence = require("../src/astro-writing/productionEvidenceAdapter.cjs") as {
  buildProductionCatalogEvidence: (input: Record<string, unknown>) => {
    mapped: { canonicalIds: string[] };
  };
};

const perfectScores = Object.fromEntries(GENERATED_REPORT_JUDGE_CATEGORIES.map((category) => [category, 4])) as GeneratedReportJudgeScores;
assert.equal(generatedReportJudgeVerdict(perfectScores, 0.85), "pass");
assert.equal(generatedReportJudgeVerdict({ ...perfectScores, owner_voice: 3 }, 0.85), "below_threshold");
assert.equal(generatedReportJudgeVerdict({ ...perfectScores, natural_language: 3 }, 0.85), "below_threshold");
assert.equal(generatedReportJudgeVerdict({ ...perfectScores, factual_traceability: 2 }, 0.85), "below_threshold");

const feedbackBase = {
  source_generated_interpretation_id: "report-1",
  source_surface: "you" as const,
  source_report_kind: "you_week_reading" as const,
  feedback_text: "The passage summarizes instead of naming the consequence.",
  governed_evidence_text: "Move from the mechanism to the practical consequence instead of repeating the source summary.",
  evidence_scope: "report_kind" as const,
  approved_at: "2026-09-07T14:55:00Z",
  approved_by: "content-owner",
  created_at: "2026-09-07T14:54:00Z",
  updated_at: "2026-09-07T14:55:00Z"
};
const feedbackRows: GeneratedReportOwnerFeedbackRow[] = [
  { ...feedbackBase, id: "candidate", status: "candidate" },
  { ...feedbackBase, id: "rejected", status: "rejected" },
  { ...feedbackBase, id: "approved-kind", status: "approved" },
  { ...feedbackBase, id: "approved-other-kind", status: "approved", source_report_kind: "you_day_reading" },
  { ...feedbackBase, id: "approved-surface", status: "approved", source_report_kind: "you_day_reading", evidence_scope: "surface", governed_evidence_text: "Keep short-window guidance consequence-first." },
  { ...feedbackBase, id: "approved-all", status: "approved", source_surface: "friends", source_report_kind: "friend_transit_reading", evidence_scope: "all_generated_reports", governed_evidence_text: "Do not reward generic coaching closers." },
  { ...feedbackBase, id: "approved-empty", status: "approved", governed_evidence_text: "" }
];
const evidence = eligibleGeneratedReportOwnerEvidence(feedbackRows, { surface: "you", reportKind: "you_week_reading" });
assert.deepEqual(evidence, [
  "Move from the mechanism to the practical consequence instead of repeating the source summary.",
  "Keep short-window guidance consequence-first.",
  "Do not reward generic coaching closers."
]);

const dayKnowledgeIds = youTransitReadingProductionKnowledgeIds({
  technicalEvidence: {
    qualifyingTransits: [{ transitPlanet: "Sun", natalPoint: "Moon", aspect: "opposition", house: 6 }]
  }
});
assert.ok(dayKnowledgeIds.includes("you-transit-v3-sun-opposition-moon"));
assert.ok(dayKnowledgeIds.includes("house-6"));
assert.doesNotThrow(() => productionEvidence.buildProductionCatalogEvidence({
  contentKey: "you-transit-reading/day/2026-09-07",
  surface: "you",
  mode: "in_depth",
  eventType: "you-transit-you-day-reading",
  facts: { type: "you-transit-reading" },
  knowledgeIds: dayKnowledgeIds,
  sourceSnapshot: {}
}));

const weekKnowledgeIds = youTransitReadingProductionKnowledgeIds({
  approvedReaderText: {
    horoscope: { body: "The Virgo new moon activates your 4th House of Home and Family." }
  },
  technicalEvidence: {
    readings: [{ source: "lunation", driverLabel: "New Moon in Virgo", house: null }]
  }
});
assert.deepEqual(weekKnowledgeIds, ["house-4"]);
assert.doesNotThrow(() => productionEvidence.buildProductionCatalogEvidence({
  contentKey: "you-transit-reading/week/2026-09-07",
  surface: "you",
  mode: "in_depth",
  eventType: "you-transit-you-week-reading",
  facts: { type: "you-transit-reading" },
  knowledgeIds: weekKnowledgeIds,
  sourceSnapshot: {}
}), "A governed lunation week must resolve the personalized approved house before the writer or judge can run.");

const weeklyMoonKnowledgeIds = youTransitReadingProductionKnowledgeIds({
  approvedReaderText: {
    horoscope: { body: "The surface feels fake and you're too tired to pretend otherwise." }
  },
  technicalEvidence: {
    readings: [{ source: "weekly-moon", driverLabel: "Moon in Scorpio", house: null }]
  }
});
assert.deepEqual(weeklyMoonKnowledgeIds, ["weekly-moon-scorpio"]);
const weeklyMoonEvidence = productionEvidence.buildProductionCatalogEvidence({
  contentKey: "you-transit-reading/week/2026-09-14",
  surface: "you",
  mode: "in_depth",
  eventType: "you-transit-you-week-reading",
  facts: { type: "you-transit-reading" },
  knowledgeIds: weeklyMoonKnowledgeIds,
  sourceSnapshot: {}
});
assert.deepEqual(weeklyMoonEvidence.mapped.canonicalIds, ["body/moon", "sign/scorpio"]);

const sharedGenerator = read("api/_lib/transit-reading-generation.ts");
assert.match(sharedGenerator, /initialValidatedDraft/u, "Deterministic validation must precede the judge.");
assert.match(sharedGenerator, /firstJudgment\.result\.verdict === "pass"/u);
assert.match(sharedGenerator, /QUALITY JUDGE CORRECTION — ONE PASS ONLY/u);
assert.match(sharedGenerator, /DETERMINISTIC CLEANUP — NO NEW INTERPRETATION/u);
assert.match(sharedGenerator, /deterministicCleanupFeedback\(firstJudgment, corrected, error\.message, initial\.validationFeedback\)/u);
assert.match(sharedGenerator, /const secondJudgment = await options\.judge/u);
assert.match(sharedGenerator, /secondJudgment\.result\.verdict !== "pass"\) throw new TransitReadingJudgeBlockedError/u);
assert.match(sharedGenerator, /validateShape\(corrected, options, initial\.brief\)/u, "The judge correction and any deterministic cleanup must pass validation before re-judge.");
assert.match(sharedGenerator, /judgeAudit\(secondJudgment, 2\)/u);
assert.doesNotMatch(sharedGenerator, /findings:\s*judged\.result\.findings/u, "Judge findings must not be persisted in the pass audit.");
assert.doesNotMatch(sharedGenerator, /callOpenAIResponses\s*\(/u, "Friends/You writers may not open a direct provider path.");
assert.doesNotMatch(sharedGenerator, /api\.anthropic\.com/u, "Friends/You writers may not open a direct Claude path.");
assert.match(sharedGenerator, /prepareTransitReadingProductionKernel/u);
assert.match(sharedGenerator, /callGovernedTransitReadingModel/u);

const checkpointRuntime = read("api/_lib/transit-reading-checkpoints.ts");
assert.match(checkpointRuntime, /const MAX_STEPS = 7/u, "The bounded checkpoint budget must allow one deterministic cleanup before the final re-judge.");
const checkpointMigration = read("apps/web/supabase/migrations/20260916070000_transit_report_checkpoint_cleanup_step.sql");
assert.match(checkpointMigration, /step <= 6/u, "The database checkpoint bound must admit the seventh bounded model step.");

const judgeRuntime = read("api/_lib/transit-reading-judge.ts");
assert.doesNotMatch(judgeRuntime, /callOpenAIResponses\s*\(/u, "Generated report judge may not open a direct provider path.");
assert.doesNotMatch(judgeRuntime, /api\.anthropic\.com/u, "Generated report judge may not open a direct Claude path.");
assert.match(judgeRuntime, /role: "REVIEWER"/u);
assert.match(judgeRuntime, /draftValidated: true/u);
assert.match(judgeRuntime, /callGovernedTransitReadingModel/u);

const productionRuntime = read("api/_lib/transit-reading-production.ts");
assert.match(productionRuntime, /prepareProductionPreCallGate/u);
assert.match(productionRuntime, /assertProductionPreCallGate/u);
assert.match(productionRuntime, /beforeProviderCall/u);
assert.match(productionRuntime, /callReportCalibrationModel/u, "Generated reports must reuse the centralized structured provider transport.");
assert.match(productionRuntime, /TRANSIT_READING_REVIEW_VALIDATION_REQUIRED/u);
assert.match(productionRuntime, /you-transit-\$\{input\.eventType\}/u);

const friendGenerator = read("api/_lib/friend-transit-reading-generation.ts");
const youGenerator = read("api/_lib/you-transit-reading-generation.ts");
for (const source of [friendGenerator, youGenerator]) {
  assert.match(source, /loadApprovedGeneratedReportOwnerEvidence/u);
  assert.match(source, /judgeGeneratedTransitReading/u);
  assert.match(source, /generatedReportQualityGate/u);
  assert.match(source, /productionInput/u);
}
assert.match(friendGenerator, /reportKind: "friend_transit_reading"/u);
assert.match(youGenerator, /locked\.brief\.window === "day" \? "you_day_reading" : "you_week_reading"/u);
assert.match(youGenerator, /youTransitReadingProductionKnowledgeIds/u);

const friendLifecycle = read("api/_lib/friend-report-lifecycle.ts");
const youLifecycle = read("api/_lib/you-report-lifecycle.ts");
for (const source of [friendLifecycle, youLifecycle]) {
  assert.match(source, /isTransitReadingJudgeBlockedError/u);
  assert.match(source, /const failed = job\.attempt >= attemptCap/u);
  assert.doesNotMatch(source, /const failed = judgeBlocked \|\|/u, "A rejected draft must not consume the whole job retry budget.");
  assert.match(source, /Writing quality gate did not pass after one corrective rewrite and re-judge\./u);
  assert.match(source, /attempt: 0/u, "A later explicit retry must receive a fresh bounded job budget.");
  assert.match(source, /result_id: null/u);
}

const adapter = read("tldr-astro-phrasebank/TLDR-GENERATED-REPORT-JUDGE-ADAPTER-V1-OWNER.md");
assert.match(adapter, /Owner approved:\*\* `true`/u);
assert.match(adapter, /exactly one corrective rewrite/u);
assert.match(adapter, /A second judge failure remains blocked/u);
assert.match(adapter, /Judge findings are run-local correction material/u);
assert.match(adapter, /only through an explicit owner approval action/u);

const migration = read("apps/web/supabase/migrations/20260907155157_generated_report_owner_feedback.sql");
assert.match(migration, /status text not null default 'candidate'/u);
assert.match(migration, /status <> 'approved'[\s\S]*governed_evidence_text is not null/u);
assert.match(migration, /revoke all on table public\.generated_report_owner_feedback from public, anon, authenticated/u);
assert.match(migration, /grant select, insert, update, delete on table public\.generated_report_owner_feedback to service_role/u);

const feedbackApi = read("api/admin/generated-report-feedback.ts");
assert.match(feedbackApi, /action === "save_candidate"/u);
assert.match(feedbackApi, /status: "candidate"/u);
assert.match(feedbackApi, /action === "approve"/u);
assert.match(feedbackApi, /Only candidate feedback can be explicitly approved/u);
assert.match(feedbackApi, /status: "approved"/u);
assert.match(feedbackApi, /governed_evidence_text: governedEvidenceText/u);

const draftReview = read("apps/admin/src/GeneratedReportDraftReview.tsx");
assert.match(draftReview, /Save feedback candidate/u);
assert.match(draftReview, /Approve as owner evidence/u);
assert.match(draftReview, /Candidate and rejected feedback are excluded/u);
assert.match(draftReview, /Judge findings are never promoted here automatically/u);

const adminPanel = read("apps/admin/src/ReportFulfillmentAdminPanel.tsx");
assert.match(adminPanel, /GeneratedReportDraftReview/u);

console.log("Friends and You generated reports are judge-gated, production-kernel-gated, one-pass-correctable, deterministic-cleanup-safe, and owner-feedback-governed.");
