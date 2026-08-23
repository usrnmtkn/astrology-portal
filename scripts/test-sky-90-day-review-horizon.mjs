import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import horizonModule from "../src/astro-writing/skyReviewHorizon.cjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { buildSkyReviewHorizon, joinSkyReviewRows } = horizonModule;

function snapshot(date, { mercurySign = "virgo", includeAspect = true } = {}) {
  return {
    generatedAt: "2026-08-20T10:00:00.000Z",
    horizonDate: `${date}T12:00:00.000Z`,
    positions: [
      { planet: "Mercury", sign: mercurySign },
      { planet: "Saturn", sign: "pisces" }
    ],
    aspects: includeAspect ? [{ from: "Mercury", type: "opposition", to: "Saturn" }] : []
  };
}

const horizon = buildSkyReviewHorizon([
  snapshot("2026-08-20"),
  snapshot("2026-08-21"),
  snapshot("2026-08-22", { mercurySign: "libra", includeAspect: false }),
  snapshot("2026-08-24", { mercurySign: "virgo" })
]);

assert.equal(horizon.snapshotCount, 4);
assert.equal(horizon.startDate, "2026-08-20");
assert.equal(horizon.endDate, "2026-08-24");
assert.equal(horizon.calculationMethod, "daily-active-sky-snapshot");

const aspect = horizon.occurrences.find((entry) => entry.contentKey === "sky.aspect.mercury.opposition.saturn.virgo.pisces");
assert.ok(aspect, "Expected the reusable Mercury-Saturn aspect candidate.");
assert.deepEqual(aspect.activeDates, ["2026-08-20", "2026-08-21", "2026-08-24"]);
assert.deepEqual(aspect.windows, [
  { startDate: "2026-08-20", endDate: "2026-08-21" },
  { startDate: "2026-08-24", endDate: "2026-08-24" }
]);

const joined = joinSkyReviewRows(horizon, [
  {
    id: "ready",
    content_key: aspect.contentKey,
    status: "DRAFT",
    lane: "serving",
    review_state: "sky-owner-approval-required",
    judge_score: 3,
    judge_gate: "human-review"
  },
  {
    id: "live",
    content_key: "sky.placement.base.saturn.pisces",
    status: "LIVE",
    lane: "serving",
    review_state: null,
    judge_score: 3,
    judge_gate: "human-review"
  }
]);
assert.equal(joined.occurrences.find((entry) => entry.contentKey === aspect.contentKey)?.reviewStatus, "ready_for_owner");
assert.equal(joined.occurrences.find((entry) => entry.contentKey === "sky.placement.base.saturn.pisces")?.reviewStatus, "approved_scheduled");
assert.ok(joined.occurrences.some((entry) => entry.reviewStatus === "missing_draft"));
assert.equal(
  horizonModule.skyAspectContentKey(
    { from: "Mars", type: "square", to: "North Node" },
    [{ planet: "Mars", sign: "gemini" }, { planet: "North Node", sign: "pisces" }]
  ),
  "sky.aspect.mars.square.nodes.gemini.pisces"
);

const endpoint = fs.readFileSync(path.join(repoRoot, "api/admin/sky-review-horizon.ts"), "utf8");
assert.match(endpoint, /modelCalls:\s*0/u);
assert.match(endpoint, /approvalsChanged:\s*0/u);
assert.match(endpoint, /servingChanged:\s*0/u);
assert.match(endpoint, /status:\s*"authorization_required"/u);
assert.match(endpoint, /minimumSuccessfulCalls:\s*missingDrafts\.length \* 2/u);
assert.doesNotMatch(endpoint, /generateCard|providerCall|OPENAI_API_KEY|GEMINI_API_KEY/u);

const adminApi = fs.readFileSync(path.join(repoRoot, "api/admin/generated-content.ts"), "utf8");
assert.match(adminApi, /ownerAction\?:\s*(?:\n\s*)?\|?\s*"approve-and-schedule"/u);
assert.match(adminApi, /assertCanPublishGeneratedContent/u);
assert.match(adminApi, /patch\.lane = isSkyPlacement \? "reference" : "serving"/u);
assert.match(adminApi, /owner-approved-package-import-required/u);
assert.match(adminApi, /\["sky_aspect", "sky_placement"\]\.includes\(existing\?\.block_type/u);

const dashboard = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
assert.match(dashboard, /Upcoming 90 days/u);
assert.match(dashboard, /Approve for package/u);
assert.match(dashboard, /Approve & schedule/u);
assert.match(dashboard, /\["DRAFT", "REVIEWED"\]\.includes\(row\.status\)/u);
assert.match(dashboard, /This view is inventory and review status only/u);
assert.match(dashboard, /ownerApprovedSkyPlacementArticleKey\(occurrence\.contentKey\)/u);
assert.match(dashboard, /Create draft/u);
assert.match(dashboard, /openMissingSkyDraft\(occurrence\)/u);
assert.match(dashboard, /facts:\s*draftForSave\.facts \?\? \{\}/u);
assert.match(dashboard, /sections:\s*draftForSave\.sections \?\? \{\}/u);
assert.match(dashboard, /if \(draft\.blockType === "sky_aspect"\) return "collective-aspect-card"/u);

const servingStatus = fs.readFileSync(path.join(repoRoot, "apps/admin/src/skyPlacementServingStatus.ts"), "utf8");
assert.match(servingStatus, /Not serving — replaced by owner-approved article/u);
assert.match(servingStatus, /sky-placement-serving-manifest-v1\.json/u);
assert.match(servingStatus, /fallback-hook\/sky-sign-copy\/\$\{planet\}\/\$\{sign\}/u);

console.log(`Sky 90-day review horizon checks passed (${horizon.counts.occurrences} fixture candidates, ${horizon.counts.activeWindows} active windows).`);
