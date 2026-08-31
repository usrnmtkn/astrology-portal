import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SKY_V4_CANONICAL_JSON_SHA256,
  assertSkyV4ReaderCopyOwnerApproval,
  skyV4ContentStudioRecords
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const canonicalPath = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json");
const canonicalBytes = fs.readFileSync(canonicalPath);
const corpus = JSON.parse(canonicalBytes);
const records = skyV4ContentStudioRecords(corpus);
const approval = assertSkyV4ReaderCopyOwnerApproval(corpus, records);

const valueAt = (source, dottedPath) => dottedPath
  .split(".")
  .reduce((current, segment) => current?.[segment], source);

assert.equal(createHash("sha256").update(canonicalBytes).digest("hex"), SKY_V4_CANONICAL_JSON_SHA256);
assert.equal(approval.approved_keys.length, 280);
assert.equal(new Set(approval.approved_keys).size, 280);
assert.equal(records.length, 305);

const approved = records.filter((row) => row.owner_approved === true);
const continuous = approved.filter((row) => row.studio_content_type === "continuous-placement");
const additional = approved.filter((row) => row.studio_content_type !== "continuous-placement");
const configuration = records.filter((row) => row.studio_review_category === "configuration");

assert.equal(approved.length, 280);
assert.equal(continuous.length, 120);
assert.equal(additional.length, 160);
assert.equal(configuration.length, 25);
assert.deepEqual(approved.map((row) => row.contentKey), approval.approved_keys);

const counts = Object.fromEntries(Object.keys(approval.expected_counts_by_content_type).map((contentType) => [
  contentType,
  approved.filter((row) => row.studio_content_type === contentType).length
]));
assert.deepEqual(counts, approval.expected_counts_by_content_type);

for (const row of approved) {
  assert.equal(row.review_status, "approved", `${row.contentKey} review_status`);
  assert.equal(row.serving_enabled, false, `${row.contentKey} serving_enabled`);
  assert.equal(row.studio_review_category, "owner-approved-reader-copy", `${row.contentKey} review category`);
  assert.deepEqual(
    row.owner_approved_fields,
    approval.approved_fields_by_content_type[row.studio_content_type],
    `${row.contentKey} approved fields`
  );
  assert.deepEqual(
    row.studio_editable_fields.map((field) => field.path),
    row.owner_approved_fields,
    `${row.contentKey} editable fields must equal approved reader fields`
  );
  for (const field of row.owner_approved_fields) {
    assert.deepEqual(
      valueAt(row, field),
      valueAt(row.studio_source_baseline, field),
      `${row.contentKey} ${field} drifted from immutable source`
    );
  }
}

assert.ok(continuous.every((row) => JSON.stringify(row.owner_approved_fields) === JSON.stringify([
  "tldrWhat", "tldrTakeaway", "placementArticle",
  "fallback.hook", "fallback.lived", "fallback.turn"
])));

assert.equal(configuration.filter((row) => row.studio_content_type === "template").length, 24);
assert.equal(configuration.filter((row) => row.studio_content_type === "overlay-settings").length, 1);
assert.ok(configuration.every((row) => row.review_status === "needs_review"));
assert.ok(configuration.every((row) => row.owner_approved === false));
assert.ok(configuration.every((row) => row.serving_enabled === false));
assert.ok(records.every((row) => row.serving_enabled === false));
assert.equal(records.filter((row) => row.studio_content_type === "aspect").length, 0);
assert.equal(approved.filter((row) => row.contentKey.includes("/template/")).length, 0);
assert.equal(approved.filter((row) => row.contentKey === "sky-v4/settings/contextual-overlays").length, 0);

for (const row of records.filter((record) => record.studio_content_type === "node-module")) {
  assert.equal(row.OwnerApprovedForSourceRole, row.studio_source_baseline.OwnerApprovedForSourceRole);
  assert.equal(row.Source, row.studio_source_baseline.Source);
  assert.equal(row.ExactIngressCopy, row.studio_source_baseline.ExactIngressCopy);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sky-v4-reader-approval-"));
const materializedPath = path.join(tempDir, "dashboard-rows.json");
try {
  execFileSync(process.execPath, [
    path.join(repoRoot, "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs"),
    `--out=${materializedPath}`
  ], { cwd: repoRoot, stdio: "pipe" });
  const materialized = JSON.parse(fs.readFileSync(materializedPath, "utf8"));
  const skyV4Rows = materialized.rows.filter((row) => row.sections?.packageRecord?.source_package === corpus.packageVersion);
  const approvedRows = skyV4Rows.filter((row) => row.sections.packageRecord.owner_approved === true);
  const configurationRows = skyV4Rows.filter((row) => row.sections.packageRecord.studio_review_category === "configuration");
  assert.equal(skyV4Rows.length, 305);
  assert.equal(approvedRows.length, 280);
  assert.equal(configurationRows.length, 25);
  assert.ok(approvedRows.every((row) => row.facts.review_status === "approved"));
  assert.ok(approvedRows.every((row) => row.status === "DRAFT"));
  assert.ok(approvedRows.every((row) => row.lane === "reference"));
  assert.ok(approvedRows.every((row) => row.review_state === "serving-disabled"));
  assert.ok(configurationRows.every((row) => row.sections.packageRecord.review_status === "needs_review"));
  assert.ok(configurationRows.every((row) => row.sections.packageRecord.owner_approved === false));
  assert.ok(skyV4Rows.every((row) => row.sections.packageRecord.serving_enabled === false));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

const adminDashboard = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
assert.match(adminDashboard, /skyV4ReviewCategory === "configuration"/u);
assert.match(adminDashboard, /skyV4ReviewCategory === "owner-approved-reader-copy"/u);
const generatedContentApi = fs.readFileSync(path.join(repoRoot, "api/admin/generated-content.ts"), "utf8");
assert.match(generatedContentApi, /const reviewStatus = hasPackageDraft\s*\? "needs_review"/u);
assert.match(generatedContentApi, /record\.owner_approved = isSkyV4OwnerApprovedReaderCopy && reviewStatus === "approved"/u);

console.log("SKY V4 reader-copy owner approval: PASS (280 approved; 120 continuous with six fields; 160 additional; 25 configuration; copy drift 0; serving OFF)");
