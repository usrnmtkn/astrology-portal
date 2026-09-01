#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION,
  SKY_V4_CONTENT_STUDIO_PACKAGE_VERSION,
  calendarAspectStudioRecord,
  renderCalendarAspectStudioPreview
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/calendarAspectContentStudio.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(repoRoot, relative), "utf8"));
const readText = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const stage = readJson("apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-consequence-first-drafts-v1.json");
const composed = readJson("packages/astro-knowledge/data/sky-calendar/composed-cards-v1.json");
const phrasebook = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json");

assert.equal(stage.packageVersion, CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION);
assert.equal(stage.reviewStatus, "needs_review");
assert.equal(stage.ownerApproved, false);
assert.equal(stage.servingEnabled, false);
assert.equal(stage.servingChange, false);
assert.equal(stage.drafts.length, 48);
assert.equal(new Set(stage.drafts.map((row) => row.contentKey)).size, 48);
assert.equal(stage.drafts.filter((row) => row.sourceKind === "composed-card").length, 24);
assert.equal(stage.drafts.filter((row) => row.sourceKind === "sign-specific-hook").length, 24);
assert.ok(stage.drafts.every((row) => typeof row.body === "string" && row.body.trim().length > 0));
assert.ok(stage.drafts.every((row) => !row.body.includes("—")));

const composedById = new Map(composed.cards.map((row) => [row.id, row]));
const phrasebookByKey = new Map(phrasebook.hookRows.map((row) => [row.contentKey, row]));
const records = stage.drafts.map((draft) => {
  const source = draft.sourceKind === "composed-card"
    ? composedById.get(draft.contentKey)
    : phrasebookByKey.get(draft.contentKey);
  assert.ok(source, `Missing source ${draft.contentKey}`);
  const before = JSON.stringify(source);
  const studio = calendarAspectStudioRecord(source, draft);
  assert.equal(JSON.stringify(source), before, `${draft.contentKey} source baseline mutated`);
  assert.equal(studio.contentKey, draft.contentKey);
  assert.equal(studio.Body, draft.body.trim());
  assert.equal(studio.review_status, "needs_review");
  assert.equal(studio.owner_approved, false);
  assert.equal(studio.serving_enabled, false);
  assert.equal(studio.source_package, SKY_V4_CONTENT_STUDIO_PACKAGE_VERSION);
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

const squareRecord = records.find((row) => row.contentKey === "fallback-hook/sky-aspect-sign/venus/sagittarius/square/saturn/virgo");
assert.ok(squareRecord);
const squarePreview = renderCalendarAspectStudioPreview(squareRecord, { body: squareRecord.Body });
assert.match(squarePreview.page, /The risk here is treating the most practical person involved as a negative influence simply because they are calculating the true cost\./u);
assert.match(squarePreview.page, /Before you say yes to the vision, you have to count the actual hours it will take to maintain it\./u);

const piscesGemini = stage.drafts.find((row) => row.contentKey === "fallback-hook/sky-aspect-sign/venus/pisces/square/saturn/gemini");
assert.ok(piscesGemini);
assert.match(piscesGemini.body, /still be talking past the practical question/u);
assert.doesNotMatch(piscesGemini.body, /understanding feel complete/u);

const stagingScript = readText("scripts/stage-calendar-aspect-content-studio-drafts.mjs");
assert.match(stagingScript, /status: "DRAFT"/u);
assert.match(stagingScript, /lane: "reference"/u);
assert.match(stagingScript, /review_state: "owner-review-required"/u);
assert.match(stagingScript, /readerServing: false/u);
assert.match(stagingScript, /on_conflict=content_key,target_date,mode/u);
assert.match(stagingScript, /--verify-remote/u);

const previewApi = readText("api/admin/sky-v4-preview.ts");
assert.match(previewApi, /sky-card/u);
assert.match(previewApi, /calendarAspectStudioRecord/u);
assert.match(previewApi, /renderCalendarAspectStudioPreview/u);
assert.match(previewApi, /Calendar aspect drafts may only edit Body/u);

const styleGuide = readText("apps/web/src/content/fallbackArchitectureV3/admin/WRITING-STYLE-GUIDE.md");
assert.match(styleGuide, /Human consequence first/u);
assert.match(styleGuide, /Name the thing/u);
assert.match(styleGuide, /Personality through precision, not decoration/u);
assert.match(styleGuide, /human consequence may take two or more sentences/u);

console.log("Calendar aspect Content Studio drafts: PASS (48 safe drafts; 24 composed + 24 Venus/Saturn squares; serving unchanged)");
