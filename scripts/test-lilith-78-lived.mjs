#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderNatalAspect as renderNodeNatalAspect,
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import {
  createFallbackRenderer,
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = "packages/astro-knowledge/review/lilith-78-lived-v2";
const workbookPath = `${reviewRoot}/TLDR-LILITH-78-LIVED-EXPERIENCE-V2-OWNER-EDITED.xlsx`;
const packet = JSON.parse(fs.readFileSync(path.join(repoRoot, reviewRoot, "lilith-78-lived-payloads.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, reviewRoot, "shipping-manifest.json"), "utf8"));
const v13Repair = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "packages/astro-knowledge/review/v13-duplicate-contentkey-repair-2026-08-11.json"),
  "utf8",
));
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const source = JSON.parse(fs.readFileSync(path.join(packageDir, "source-rows/fallback-source-rows-v3.json"), "utf8"));
const ownerExamples = fs.readFileSync(path.join(repoRoot, "data/writing/OWNER_APPROVED_EXAMPLES.jsonl"), "utf8")
  .trim()
  .split(/\n/u)
  .map((line) => JSON.parse(line));
const templates = JSON.parse(fs.readFileSync(path.join(packageDir, "templates/fallback-templates-v3.json"), "utf8"));
const placementInterim = JSON.parse(fs.readFileSync(path.join(packageDir, "source-rows/placement-interim-fixes-v1.json"), "utf8"));
const browser = createFallbackRenderer(
  { templates: [...templates.templates, ...placementInterim.templates] },
  {
    hookRows: source.hookRows,
    vocabularyRows: [...source.vocabularyRows, ...placementInterim.vocabularyRows],
  },
);

const destinationPrefix = "fallback-hook/natal-aspect-lived/lilith/";
const llMatrixV13Release = "ll-matrix-v13-owner-approved-runtime";
const recordPrefix = `${reviewRoot}/records/`;
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

function mappedKey(workbookKey) {
  const parts = workbookKey.split("|");
  if (parts.length !== 3 || parts[0] !== "lilith") {
    throw new Error(`Ambiguous Lilith test mapping: ${workbookKey}`);
  }
  const counterpart = parts[2].replaceAll("_", "-");
  return `${destinationPrefix}${parts[1]}/${counterpart}`;
}

assert.equal(packet.name, "lilith-78-lived-v2");
assert.equal(packet.approvedAt, "2026-08-10");
assert.equal(packet.approvalRecord, workbookPath);
assert.equal(packet.exactWordingApproved, true);
assert.equal(Object.keys(packet.payloads).length, 78);
assert.equal(manifest.rowCount, 78);
assert.equal(manifest.sourceWorkbook, workbookPath);
assert.equal(manifest.rows.length, 78);

const rowsByKey = new Map(source.hookRows.map((row) => [row.contentKey, row]));
const ownerExamplesByKey = new Map(ownerExamples.map((entry) => [entry.contentKey, entry]));
const manifestByWorkbookKey = new Map(manifest.rows.map((row) => [row.workbookKey, row]));
const lilithRows = source.hookRows.filter((row) => row.contentKey?.startsWith(destinationPrefix));
assert.equal(lilithRows.length, 78, "Expected exactly 78 Lilith lived rows");

const existingApprovedRows = source.hookRows.filter((row) => (
  row.review_status === "approved"
  && !row.contentKey?.startsWith(destinationPrefix)
  && row.source_release !== llMatrixV13Release
));
const existingApprovedRowsAtShippingBaseline = existingApprovedRows.map((row) => {
  const approvalMigration = row.approval?.verifiedBy === "fallback-approval-metadata-reconciliation-2026-08-13"
    || row.approval?.migratedBy === "fallback-approval-metadata-reconciliation-2026-08-13";
  if (!approvalMigration) return row;

  const { approval: _approval, ...baselineRow } = row;
  return baselineRow;
});
assert.equal(
  sha256(JSON.stringify(existingApprovedRowsAtShippingBaseline)),
  manifest.invariants.existingApprovedRowsSha256,
  "All pre-existing approved rows must retain their shipping baseline apart from the documented approval-metadata reconciliation.",
);
assert.equal(manifest.invariants.existingApprovedRowsChanged, 0);
assert.match(
  manifest.invariants.snapshotRepin,
  /v3-2026-08-10c empty-house V14 promotion/u,
  "The container snapshot re-pin must retain its package-version cause."
);
assert.equal(v13Repair.counts.supersededRowsRemoved, 108);
assert.equal(v13Repair.invariants.otherApprovedRowsChanged, 0);

for (const [workbookKey, entry] of Object.entries(packet.payloads)) {
  assert.equal(sha256(JSON.stringify(entry.payload)), entry.sha256, `${workbookKey}: payload hash mismatch`);
  const contentKey = mappedKey(workbookKey);
  const row = rowsByKey.get(contentKey);
  assert.ok(row, `${contentKey}: serving row missing`);
  assert.equal(row.body, entry.payload.body, `${contentKey}: body differs from approved payload`);
  assert.equal(row.astroHint, entry.payload.astroHint, `${contentKey}: astroHint differs from approved payload`);
  assert.equal(row.sourceMechanism, entry.payload.sourceMechanism, `${contentKey}: sourceMechanism differs from approved payload`);
  assert.equal(row.reader_only, true);
  assert.equal(row.render_policy, "reader-only-exact-lived-v1");
  assert.equal(row.review_status, "approved");
  assert.equal(row.approval?.approvalLevel, "exact_owner_approved");
  assert.equal(row.approval?.approvedAt, "2026-08-10");
  assert.equal(row.approval?.payloadSha256, entry.sha256);
  assert.ok(row.approval?.recordPath?.startsWith(recordPrefix));
  assert.equal(Object.hasOwn(row, "body_you"), false);
  assert.equal(Object.hasOwn(row, "body_they"), false);
  assert.deepEqual(ownerExamplesByKey.get(contentKey), {
    id: `serving:${contentKey}`,
    contentKey,
    family: "natal",
    register: "second_person",
    text: entry.payload.body,
    ownerApproved: true,
    authority: "serving-review-status-approved",
    source: "fallbackArchitectureV3",
  });

  const manifestRow = manifestByWorkbookKey.get(workbookKey);
  assert.equal(manifestRow?.contentKey, contentKey);
  assert.equal(manifestRow?.payloadSha256, entry.sha256);

  const record = JSON.parse(fs.readFileSync(path.join(repoRoot, row.approval.recordPath), "utf8"));
  assert.equal(record.authorship, "owner_authored");
  assert.equal(record.contentKey, contentKey);
  assert.equal(record.workbookKey, workbookKey);
  assert.equal(record.payloadSha256, entry.sha256);
  assert.equal(sha256(JSON.stringify(record.payload)), entry.sha256);
  assert.deepEqual(record.payload, entry.payload);
  assert.equal(record.sourceWorkbook.path, workbookPath);
  assert.equal(record.sourceWorkbook.sheet, "OwnerLivedReview");
  assert.equal(record.sourceWorkbook.approvedBodyCell, `E${entry.row + 1}`);
  assert.equal(record.sourceWorkbook.approvedAstroHintCell, `F${entry.row + 1}`);
  assert.equal(record.sourceWorkbook.ownerStatusCell, `H${entry.row + 1}`);

  const [, aspect, counterpart] = workbookKey.split("|");
  for (const [label, render] of [
    ["node", renderNodeNatalAspect],
    ["browser", browser.renderNatalAspect],
  ]) {
    const forward = render({ planetA: "lilith", planetB: counterpart, aspect, voice: "you" });
    const reverse = render({ planetA: counterpart, planetB: "lilith", aspect, voice: "you" });
    for (const [direction, result] of [["forward", forward], ["reverse", reverse]]) {
      assert.equal(result.templateKey, contentKey, `${label}:${workbookKey}:${direction}: exact key mismatch`);
      assert.equal(result.body, entry.payload.body, `${label}:${workbookKey}:${direction}: body mismatch`);
      assert.equal(result.astroHint, entry.payload.astroHint, `${label}:${workbookKey}:${direction}: hint mismatch`);
      assert.equal(Object.hasOwn(result, "sourceMechanism"), false, `${label}:${workbookKey}:${direction}: sourceMechanism rendered`);
    }
  }
}

for (const workbookKey of ["lilith|square|venus", "lilith|quincunx|south-node"]) {
  const entry = packet.payloads[workbookKey];
  const [, aspect, counterpart] = workbookKey.split("|");
  const forward = renderNodeNatalAspect({ planetA: "lilith", planetB: counterpart, aspect, voice: "you" });
  const reverse = renderNodeNatalAspect({ planetA: counterpart, planetB: "lilith", aspect, voice: "you" });
  assert.equal(forward.templateKey, mappedKey(workbookKey), `${workbookKey}: exact row must beat grouped legacy fallback`);
  assert.equal(reverse.templateKey, mappedKey(workbookKey), `${workbookKey}: reverse lookup must select exact row`);
  assert.equal(forward.body, entry.payload.body);
  assert.equal(reverse.body, entry.payload.body);
}

const nonHint = renderNodeNatalAspect({
  planetA: "jupiter",
  planetB: "ascendant",
  aspect: "quincunx",
  voice: "you",
});
assert.equal(nonHint.templateKey, "fallback-hook/natal-aspect-lived/jupiter/quincunx/ascendant");
assert.equal(nonHint.astroHint, undefined, "Existing 108 body-only lived rows must not gain a hint.");

const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const youPageSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/you/YouPage.tsx"), "utf8");
assert.match(appSource, /astroHint: rendered\.astroHint/u, "Natal aspect normalization must preserve the resolved hint.");
assert.match(appSource, /lensHint: normalized\.sections\.find\(\(section\) => section\.astroHint\)\?\.astroHint \?\? ""/u, "Natal aspect articles must place astroHint in the secondary hint slot.");
assert.match(appSource, /lensHintLabel: "Astrology hint"/u, "Natal aspect hints need the correct accessible label.");
assert.match(youPageSource, /className="article-lens-hint" aria-label=\{displayArticle\.lensHintLabel \?\? "Placement lens"\}/u, "The article view must render the optional hint as the secondary helpful-hint element.");

console.log("Lilith 78 lived-experience shipping, exact selection, hint, and provenance checks passed.");
