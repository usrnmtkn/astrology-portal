#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CALENDAR_ASPECT_CONTENT_STUDIO_PACKAGE_VERSION,
  CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION,
  calendarAspectStudioRecord,
  renderCalendarAspectStudioPreview
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/calendarAspectContentStudio.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(repoRoot, relative), "utf8"));
const readText = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const stage = readJson("apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-consequence-first-drafts-v1.json");
const composed = readJson("packages/astro-knowledge/data/sky-calendar/composed-cards-v1.json");
const composedReview = readJson("packages/astro-knowledge/review/sky-calendar-composed-first-glance-2026-08-31/proposed-forecasts.json");
const approvedBatch2A = readJson("apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-content-studio-batch-2a-v1.json");

assert.equal(stage.packageVersion, CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION);
assert.equal(stage.reviewStatus, "needs_review");
assert.equal(stage.ownerApproved, false);
assert.equal(stage.servingEnabled, false);
assert.equal(stage.servingChange, false);
assert.equal(stage.drafts.length, 24);
assert.equal(new Set(stage.drafts.map((row) => row.contentKey)).size, 24);
assert.equal(stage.drafts.filter((row) => row.sourceKind === "composed-card").length, 24);
assert.equal(stage.drafts.filter((row) => row.sourceKind === "sign-specific-hook").length, 0);
assert.ok(stage.drafts.every((row) => typeof row.body === "string" && row.body.trim().length > 0));
assert.ok(stage.drafts.every((row) => !row.body.includes("—")));
assert.ok(stage.drafts.every((row) => fs.existsSync(path.join(repoRoot, row.sourcePath))));
assert.ok(stage.drafts.every((row) => fs.existsSync(path.join(repoRoot, row.reviewPath))));

const proposedComposedById = new Map(composedReview.rows.map((row) => [row.id, row.proposedForecast]));
for (const draft of stage.drafts.filter((row) => row.sourceKind === "composed-card")) {
  assert.equal(draft.body, proposedComposedById.get(draft.contentKey), `${draft.contentKey} drifted from its review packet`);
  assert.equal(
    draft.reviewPath,
    "packages/astro-knowledge/review/sky-calendar-composed-first-glance-2026-08-31/proposed-forecasts.json"
  );
}

assert.equal(approvedBatch2A.owner_approved, true);
assert.equal(approvedBatch2A.serving_enabled, false);
assert.equal(approvedBatch2A.rows.length, 24);
assert.equal(
  stage.drafts.some((row) => approvedBatch2A.rows.some((approved) => approved.contentKey === row.contentKey)),
  false,
  "Composed-card staging must not duplicate the separately governed Batch 2A keys."
);

const composedById = new Map(composed.cards.map((row) => [row.id, row]));
const records = stage.drafts.map((draft) => {
  const source = composedById.get(draft.contentKey);
  assert.ok(source, `Missing source ${draft.contentKey}`);
  const before = JSON.stringify(source);
  const studio = calendarAspectStudioRecord(source, draft);
  assert.equal(JSON.stringify(source), before, `${draft.contentKey} source baseline mutated`);
  assert.equal(studio.contentKey, draft.contentKey);
  assert.equal(studio.Body, draft.body.trim());
  assert.equal(studio.review_status, "needs_review");
  assert.equal(studio.owner_approved, false);
  assert.equal(studio.serving_enabled, false);
  assert.equal(studio.source_package, CALENDAR_ASPECT_CONTENT_STUDIO_PACKAGE_VERSION);
  assert.equal(studio.source_draft_package, CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION);
  assert.deepEqual(studio.studio_editable_fields.map((field) => field.path), ["Body"]);
  assert.ok(studio.studio_read_only_fields.includes("AspectType"));
  assert.ok(studio.studio_read_only_fields.includes("source_baseline_sha256"));
  assert.match(studio.source_baseline_sha256, /^[a-f0-9]{64}$/u);
  assert.notEqual(studio.CurrentServingBody.length, 0);
  return studio;
});

const composedRecord = records.find((row) => row.contentKey === "sky-card/jupiter/leo/trine/saturn/aries");
assert.ok(composedRecord);
const composedPreview = renderCalendarAspectStudioPreview(composedRecord, {
  dateLine: "On Monday, August 31",
  body: composedRecord.Body
});
assert.equal(composedPreview.servingEnabled, false);
assert.match(composedPreview.page, /^# Exact today[\s\S]*On Monday, August 31, something you have been working on may finally make meaningful progress\./u);

const stagingScript = readText("scripts/stage-calendar-aspect-content-studio-drafts.mjs");
assert.match(stagingScript, /status: "DRAFT"/u);
assert.match(stagingScript, /lane: "reference"/u);
assert.match(stagingScript, /review_state: "owner-review-required"/u);
assert.match(stagingScript, /readerServing: false/u);
assert.match(stagingScript, /on_conflict=content_key,target_date,mode/u);
assert.match(stagingScript, /--verify-remote/u);

const workflow = readText(".github/workflows/calendar-aspect-content-studio.yml");
assert.match(workflow, /workflow_dispatch:[\s\S]*?seed_content_studio:/u);
assert.match(workflow, /github\.event_name == 'workflow_dispatch' && inputs\.seed_content_studio/u);
assert.match(workflow, /--apply --verify-remote/u);

const previewApi = readText("api/admin/sky-v4-preview.ts");
assert.match(previewApi, /sky-card/u);
assert.match(previewApi, /calendarAspectStudioRecord/u);
assert.match(previewApi, /renderCalendarAspectStudioPreview/u);
assert.match(previewApi, /Calendar aspect drafts may only edit Body/u);

const generatedContentApi = readText("api/admin/generated-content.ts");
assert.match(generatedContentApi, /CALENDAR-ASPECT-CONSEQUENCE-FIRST-CONTENT-STUDIO-2026-09-01/u);
assert.match(generatedContentApi, /sky-calendar-batch-2a-venus-saturn-squares-2026-09-01/u);
assert.match(generatedContentApi, /Calendar aspect drafts require a separate exact owner approval and serving release before promotion/u);
assert.match(generatedContentApi, /isCalendarAspectStage[\s\S]*?record\.owner_approved = false;[\s\S]*?record\.serving_enabled = false;/u);
assert.match(generatedContentApi, /const readerServing = !stageKind/u);
assert.match(generatedContentApi, /packageRoleCanServeExactCopy\(packageRole\)/u);
assert.match(generatedContentApi, /facts\.readerServing = readerServing/u);

const contentStudioDashboard = readText("apps/admin/src/GeneratedContentAdminDashboard.tsx");
assert.match(contentStudioDashboard, /label: "Calendar Aspects"[\s\S]*?category: "Calendar Aspects"/u);
assert.match(contentStudioDashboard, /contentKey\.startsWith\("sky-card\/"\)/u);
assert.match(contentStudioDashboard, /contentKey\.startsWith\("fallback-hook\/sky-aspect-sign\/"\)/u);
assert.match(contentStudioDashboard, /if \(isCalendarAspectContentRow\(row\)\) return "Calendar Aspects";/u);
assert.match(contentStudioDashboard, /categoryFilter === "Calendar Aspects"/u);
assert.match(contentStudioDashboard, /Edit Calendar aspect cards/u);
assert.match(contentStudioDashboard, /These drafts remain hidden from readers until a separate approval and release\./u);

const styleGuide = readText("apps/web/src/content/fallbackArchitectureV3/admin/WRITING-STYLE-GUIDE.md");
assert.match(styleGuide, /Human consequence first/u);
assert.match(styleGuide, /Name the thing/u);
assert.match(styleGuide, /Personality through precision, not decoration/u);
assert.match(styleGuide, /human consequence may take two or more sentences/u);

console.log("Calendar composed-card Content Studio drafts: PASS (24 safe drafts; Batch 2A remains separate; serving unchanged)");
