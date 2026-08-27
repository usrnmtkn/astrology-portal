#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import {
  loadUnresolvedContentReport,
  unresolvedIssueWorkflow,
  type UnresolvedContentReport
} from "../apps/admin/src/UnresolvedContentReview";
import {
  loadContentUnresolvedReport,
  unresolvedContentSurface
} from "../api/admin/content-unresolved";
import {
  assertCurrentResolutionIssue,
  normalizeContentStudioResolution
} from "../api/admin/content-unresolved-resolutions";
import {
  assertCurrentSourceDecision,
  normalizeContentStudioSourceDecision
} from "../api/admin/content-source-repair-decisions";
import { contentSourceRepairPlan } from "../api/admin/content-source-repair-plans";

const dashboardSource = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
const reviewSource = fs.readFileSync(new URL("../apps/admin/src/UnresolvedContentReview.tsx", import.meta.url), "utf8");
const endpointSource = fs.readFileSync(new URL("../api/admin/content-unresolved.ts", import.meta.url), "utf8");
const resolutionEndpointSource = fs.readFileSync(new URL("../api/admin/content-unresolved-resolutions.ts", import.meta.url), "utf8");
const sourceDecisionEndpointSource = fs.readFileSync(new URL("../api/admin/content-source-repair-decisions.ts", import.meta.url), "utf8");
const resolutionMigration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260825100000_content_studio_issue_resolutions.sql", import.meta.url), "utf8");
const sourceDecisionMigration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260827010000_content_studio_source_repair_decisions.sql", import.meta.url), "utf8");
const report = loadContentUnresolvedReport() as UnresolvedContentReport;

assert.equal(report.count, report.items.length, "The Studio inventory count must match the governed queue items.");
assert.ok(report.count > 0, "The governed unresolved queue must populate the Studio inventory.");
assert.equal(
  Object.values(report.reasonCounts).reduce((sum, count) => sum + count, 0),
  report.count,
  "The governed reason counts must cover every unresolved item."
);

assert.equal(unresolvedContentSurface("daily-glance-variant/square/moon/body/a"), "Daily Glance");
assert.equal(unresolvedContentSurface("authored/book/lunation-horoscope/eclipse-lunar/pisces"), "Lunations");
assert.equal(unresolvedContentSurface("fallback-hook/sky-sign-copy/sun/virgo"), "Sky / Transits");
assert.equal(unresolvedContentSurface("fallback-hook/natal/venus/libra"), "Natal / Placements");

const groupedIssues = report.issues;
assert.ok(groupedIssues.length < report.items.length, "Duplicate source records must be grouped into one owner-facing issue.");
const sunVirgoIssue = groupedIssues.find((issue) => issue.contentKey === "fallback-hook/sky-sign-copy/sun/virgo");
assert.equal(sunVirgoIssue, undefined, "The repaired Sun in Virgo source lineage must leave the unresolved inventory.");
assert.equal(groupedIssues.filter((issue) => issue.kind === "source-repair").length, 0);
const editorialIssue = groupedIssues.find((issue) => issue.kind === "editorial-review");
assert.ok(editorialIssue);
const sunVirgoRepairPlan = contentSourceRepairPlan("fallback-hook/sky-sign-copy/sun/virgo");
assert.ok(sunVirgoRepairPlan, "The completed repair must retain its hash-bound replacement plan as provenance.");
assert.equal(sunVirgoRepairPlan.reviewStatus, "needs_review");
assert.equal(sunVirgoRepairPlan.ownerApproved, false);
assert.equal(sunVirgoRepairPlan.promotionAuthorized, false);
assert.match(sunVirgoRepairPlan.body, /Virgo is not tidiness\. Virgo is the standard/u);
assert.equal(sunVirgoRepairPlan.body, Object.values(sunVirgoRepairPlan.article).join("\n\n"));
assert.match(editorialIssue.aiRequest, /no editable Content Library row exists/u);

const diagnosisWorkflow = unresolvedIssueWorkflow(editorialIssue, {
  contentLibraryReady: true,
  hasEditableRow: false,
  requestCopied: false
});
assert.equal(diagnosisWorkflow.statusLabel, "Action needed");
assert.equal(diagnosisWorkflow.currentStep, "Diagnose the missing editable row");
assert.equal(diagnosisWorkflow.responsibleParty, "You");
assert.deepEqual(diagnosisWorkflow.steps.map((step) => step.state), ["current", "waiting", "waiting", "waiting"]);

const copiedWorkflow = unresolvedIssueWorkflow(editorialIssue, {
  contentLibraryReady: true,
  hasEditableRow: false,
  requestCopied: true
});
assert.equal(copiedWorkflow.statusLabel, "Waiting for Codex");
assert.equal(copiedWorkflow.responsibleParty, "Codex");

const ownerReviewWorkflow = unresolvedIssueWorkflow(editorialIssue, {
  contentLibraryReady: true,
  hasEditableRow: true,
  requestCopied: false
});
assert.equal(ownerReviewWorkflow.currentStep, "Review the copy in Content Library");
assert.deepEqual(ownerReviewWorkflow.steps.map((step) => step.state), ["complete", "complete", "current", "waiting"]);

const normalizedResolution = normalizeContentStudioResolution({
  schema: "content-studio-resolution/v1",
  issueId: editorialIssue.issueId,
  contentKey: editorialIssue.contentKey,
  status: "diagnosis-only",
  diagnosis: "The canonical source row is missing a required contract field.",
  proposedAction: "Repair the source field and rerun governance before asking for owner review.",
  filesInvolved: ["apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"],
  prUrl: null,
  ownerDecisionRequired: true
});
assert.equal(normalizedResolution.issueId, editorialIssue.issueId);
assert.doesNotThrow(() => assertCurrentResolutionIssue(normalizedResolution));
assert.throws(() => normalizeContentStudioResolution({ ...normalizedResolution, issueId: "wrong" }), /issueId is invalid/u);
assert.throws(() => assertCurrentResolutionIssue({ ...normalizedResolution, contentKey: "wrong/key" }), /does not match/u);

const normalizedSourceDecision = normalizeContentStudioSourceDecision({
  schema: "content-studio-source-decision/v1",
  issueId: "5678d2c461d266372d0836503c818b29fccda7726b5595a3a5340dfde2193f7e",
  contentKey: "fallback-hook/sky-sign-copy/sun/virgo",
  action: "approve-replacement",
  candidateSha256: sunVirgoRepairPlan.candidateSha256,
  approvalStatement: sunVirgoRepairPlan.approvalStatement,
  confirmExactText: true
});
assert.throws(
  () => assertCurrentSourceDecision(normalizedSourceDecision),
  /does not match a current source-repair issue/u,
  "A completed source decision must not be accepted again after the repaired issue leaves the queue."
);
assert.throws(
  () => normalizeContentStudioSourceDecision({ ...normalizedSourceDecision, candidateSha256: "wrong" }),
  /candidateSha256 is invalid/u
);
assert.throws(
  () => normalizeContentStudioSourceDecision({ ...normalizedSourceDecision, confirmExactText: false }),
  /Exact-text confirmation is required/u
);

const loadedReport = await loadUnresolvedContentReport(
  "header.payload.signature",
  async (_input, init) => {
    assert.equal((init?.headers as Record<string, string>)["x-content-admin-session"], "header.payload.signature");
    return new Response(JSON.stringify({ ok: true, report }), { status: 200, headers: { "content-type": "application/json" } });
  }
);
assert.equal(loadedReport.count, report.count, "The authenticated Studio loader must return the governed queue.");

assert.match(reviewSource, /Resolve content holds/u);
assert.match(reviewSource, /Review exact replacements and authorize source repairs here/u);
assert.match(reviewSource, /Review replacement/u);
assert.match(reviewSource, /Approve exact replacement/u);
assert.match(reviewSource, /Copy implementation request/u);
assert.match(reviewSource, /Record Codex response/u);
assert.match(reviewSource, /Responsible now:/u);
assert.match(reviewSource, /Waiting for Codex/u);
assert.match(reviewSource, /Refresh status/u);
assert.match(reviewSource, /Record Codex response/u);
assert.match(reviewSource, /No matching issues\./u, "The page must include a clear empty-state message.");

assert.match(dashboardSource, /unresolvedContent:\s*"unresolved-content"/u, "The Studio must expose a stable unresolved-content route.");
assert.match(dashboardSource, /label:\s*"Unresolved Content"/u, "The Studio navigation must expose the governed inventory.");
assert.match(dashboardSource, /new URLSearchParams\(\{ q: contentKey, from: "unresolved" \}\)/u, "Inventory rows must link into Content Library by exact key and resolution context.");
assert.match(dashboardSource, /setShowReferenceRows\(true\)/u, "Exact-row links must reveal reference rows.");
assert.match(dashboardSource, /setShowRetiredRows\(true\)/u, "Exact-row links must reveal retired rows.");
assert.doesNotMatch(reviewSource, /api\/admin\/generated-content/u, "Resolution recording must not use the serving-content mutation endpoint.");
assert.match(endpointSource, /req\.method !== "GET"/u, "The unresolved-content endpoint must be GET-only.");
assert.match(endpointSource, /await isContentAdminAuthorized\(req\)/u, "The unresolved-content endpoint must require verified owner access.");
assert.doesNotMatch(endpointSource, /\b(?:POST|PATCH|DELETE)\b/u, "The unresolved-content endpoint must remain read-only.");
assert.match(resolutionEndpointSource, /req\.method !== "POST"/u, "Resolution recording must use a dedicated POST-only endpoint.");
assert.match(resolutionEndpointSource, /assertCurrentResolutionIssue\(input\)/u, "Recorded responses must match a current issue.");
assert.doesNotMatch(resolutionEndpointSource, /review_status|review_state|headline|summary/u, "Resolution recording must not mutate editorial or serving fields.");
assert.match(resolutionMigration, /revoke all on table public\.content_studio_issue_resolutions from public, anon, authenticated/u);
assert.match(resolutionMigration, /cannot change serving copy or editorial approval state/u);
assert.match(sourceDecisionEndpointSource, /confirmExactText/u, "Source decisions must require an explicit exact-text confirmation.");
assert.match(sourceDecisionEndpointSource, /assertCurrentSourceDecision\(input\)/u, "Source decisions must match the current issue and replacement hash.");
assert.match(sourceDecisionMigration, /revoke all on table public\.content_studio_source_decisions from public, anon, authenticated/u);
assert.match(sourceDecisionMigration, /cannot directly mutate or serve copy/u);

console.log(`Content Studio unresolved inventory contract passed (${report.count} items).`);
