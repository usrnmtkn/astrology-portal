import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SKY_V4_CANONICAL_JSON_SHA256,
  assertSkyV4ContinuousOwnerApproval,
  skyV4ContentStudioRecords
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const canonicalPath = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json");
const canonicalBytes = fs.readFileSync(canonicalPath);
const corpus = JSON.parse(canonicalBytes);
const approval = assertSkyV4ContinuousOwnerApproval(corpus);
const records = skyV4ContentStudioRecords(corpus);
const approved = records.filter((row) => row.studio_content_type === "continuous-placement");

assert.equal(createHash("sha256").update(canonicalBytes).digest("hex"), SKY_V4_CANONICAL_JSON_SHA256);
assert.equal(approval.approved_keys.length, 120);
assert.equal(new Set(approval.approved_keys).size, 120);
assert.deepEqual(approved.map((row) => row.contentKey), approval.approved_keys);
assert.equal(approved.length, 120);
assert.ok(approved.every((row) => row.owner_approved === true));
assert.ok(approved.every((row) => row.serving_enabled === true));

for (const source of corpus.content.continuous) {
  const record = approved.find((row) => row.contentKey === source.contentKey);
  assert.ok(record, `Missing approved record ${source.contentKey}`);
  assert.equal(record.placementArticle, source.placementArticle, `${source.contentKey} placementArticle drifted`);
  assert.equal(record.tldrWhat, source.tldrWhat, `${source.contentKey} tldrWhat drifted`);
  assert.equal(record.tldrTakeaway, source.tldrTakeaway, `${source.contentKey} tldrTakeaway drifted`);
  assert.deepEqual(record.studio_source_baseline, source, `${source.contentKey} canonical baseline drifted`);
  assert.deepEqual(record.owner_approved_fields, [
    "tldrWhat", "tldrTakeaway", "placementArticle",
    "fallback.hook", "fallback.lived", "fallback.turn"
  ]);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sky-v4-approval-"));
const materializedPath = path.join(tempDir, "dashboard-rows.json");
try {
  execFileSync(process.execPath, [
    path.join(repoRoot, "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs"),
    `--out=${materializedPath}`
  ], { cwd: repoRoot, stdio: "pipe" });
  const materialized = JSON.parse(fs.readFileSync(materializedPath, "utf8"));
  const rows = materialized.rows.filter((row) => row.content_key.startsWith("sky-placement/article/"));
  assert.equal(rows.length, 120);
  assert.ok(rows.every((row) => row.facts.review_status === "approved"));
  assert.ok(rows.every((row) => row.sections.packageRecord.owner_approved === true));
  assert.ok(rows.every((row) => row.sections.packageRecord.serving_enabled === true));
  assert.ok(rows.every((row) => row.status === "LIVE"));
  assert.ok(rows.every((row) => row.lane === "serving"));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("SKY V4 continuous owner-approval lineage: PASS (120 retained; all six reader fields approved; copy drift 0; serving ON)");
