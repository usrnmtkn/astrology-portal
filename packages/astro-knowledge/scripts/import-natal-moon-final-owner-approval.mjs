#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SOURCE = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const ARTIFACT = "packages/astro-knowledge/review/natal-moon-final-rendered-review-v3.json";
const WORKBOOK = "outputs/019fedfe-d553-75e3-be16-8abaa96cdf44/TLDR-NATAL-MOON-FINAL-RENDERED-REVIEW-V3.xlsx";
const APPROVAL = "packages/astro-knowledge/review/natal-moon-final-owner-approval-2026-08-20.json";
const RECORD = "packages/astro-knowledge/review/natal-moon-final-serving-import-2026-08-20.json";
const EXPECTED_ARTIFACT_SHA = "be3d8c8b89f99bc76798ee18ceef5de926fde736a98a0af6694e2d1ecfa48027";
const EXPECTED_WORKBOOK_SHA = "8190d07cfadf1b50063ec13038738851a606057e5e2f48ba57ab4d0dead1578e";
const EXPECTED_OWNER_APPROVAL = "I approve the finished Moon sign copy, 12 Moon house sections, and all 144 no-childhood rendered samples in V3 exactly as hashed for publication on the You natal placement surface. Compatibility and Friend remain unchanged. Childhood remains excluded.";
const eligibleStatuses = new Set(["approved", "approved_reuse", "reviewed"]);

const absolute = (relativePath) => path.join(repoRoot, relativePath);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const textSha = (value) => sha256(String(value));
const rowSha = (row) => sha256(JSON.stringify(row));
const payloadSha = (body) => sha256(JSON.stringify({ body }));
const readBytes = (relativePath) => fs.readFileSync(absolute(relativePath));
const readJson = (relativePath) => JSON.parse(readBytes(relativePath).toString("utf8"));

function atomicWrite(relativePath, bytes) {
  const target = absolute(relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, bytes);
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cli = new Set(process.argv.slice(2));
if ([...cli].some((argument) => !["--write", "--check"].includes(argument))) {
  throw new Error("Usage: node packages/astro-knowledge/scripts/import-natal-moon-final-owner-approval.mjs [--check|--write]");
}
const write = cli.has("--write");

const artifactBytes = readBytes(ARTIFACT);
const workbookBytes = readBytes(WORKBOOK);
const approval = readJson(APPROVAL);
assert(sha256(artifactBytes) === EXPECTED_ARTIFACT_SHA, "V3 artifact hash does not match the approved bytes.");
assert(sha256(workbookBytes) === EXPECTED_WORKBOOK_SHA, "V3 workbook hash does not match the approved bytes.");
assert(approval.ownerApproval === EXPECTED_OWNER_APPROVAL, "Owner approval statement drifted.");
assert(approval.artifact?.sha256 === EXPECTED_ARTIFACT_SHA, "Approval artifact hash drifted.");
assert(approval.workbook?.sha256 === EXPECTED_WORKBOOK_SHA, "Approval workbook hash drifted.");
assert(approval.scope?.surface === "natal-placement" && approval.scope?.voice === "you", "Approval is not scoped to the You natal-placement surface.");
assert(approval.scope?.compatibilityChangesAuthorized === false, "Compatibility must remain unchanged.");
assert(approval.scope?.friendChangesAuthorized === false, "Friend must remain unchanged.");
assert(approval.scope?.childhoodIncluded === false, "Childhood must remain excluded.");

const artifact = JSON.parse(artifactBytes.toString("utf8"));
assert(artifact.signRows?.length === 12, "Approved artifact must contain 12 Moon sign rows.");
assert(artifact.houseRows?.length === 12, "Approved artifact must contain 12 Moon house rows.");
assert(artifact.renderRows?.length === 144, "Approved artifact must contain 144 rendered samples.");
assert(artifact.counts?.deterministicFailures === 0, "Approved artifact contains deterministic failures.");

for (const row of artifact.signRows) {
  assert(textSha(row.intro) === row.introSha256, `${row.runtimeKey}: intro hash drifted.`);
  assert(textSha(row.body) === row.bodySha256, `${row.runtimeKey}: sign body hash drifted.`);
  assert(row.childhoodStatus === "excluded_from_current_batch_preserved_for_later_review", `${row.runtimeKey}: childhood exclusion drifted.`);
}
for (const row of artifact.houseRows) {
  assert(textSha(row.bridge) === row.bridgeSha256, `${row.runtimeKey}: bridge hash drifted.`);
  assert(textSha(row.body) === row.bodySha256, `${row.runtimeKey}: house body hash drifted.`);
  assert(textSha(row.rendered) === row.renderedSha256, `${row.runtimeKey}: house rendered hash drifted.`);
  assert(row.rendered === `${row.bridge}\n\n${row.body}`, `${row.runtimeKey}: house composition drifted.`);
}
const signByKey = new Map(artifact.signRows.map((row) => [row.runtimeKey, row]));
const houseByKey = new Map(artifact.houseRows.map((row) => [row.runtimeKey, row]));
for (const row of artifact.renderRows) {
  const sign = signByKey.get(row.signKey);
  const house = houseByKey.get(row.houseKey);
  assert(sign && house, `${row.renderKey}: missing component row.`);
  const expected = `${sign.intro}\n\n${sign.body}\n\n${house.rendered}`;
  assert(row.rendered === expected, `${row.renderKey}: rendered composition drifted.`);
  assert(textSha(row.rendered) === row.renderedSha256, `${row.renderKey}: rendered hash drifted.`);
  assert(!/What happened growing up|growing up shaped|childhood/iu.test(row.rendered), `${row.renderKey}: childhood text entered the approved render.`);
}

const source = readJson(SOURCE);
const sourceBeforeRows = [...source.vocabularyRows, ...source.hookRows];
const sourceByKey = new Map(sourceBeforeRows.map((row) => [row.contentKey, row]));
assert(sourceByKey.size === sourceBeforeRows.length, "Canonical source contains duplicate contentKey values before Moon import.");

const signRows = artifact.signRows.map((row) => {
  const body = `${row.intro}\n\n${row.body}`;
  return {
    contentKey: `fallback-hook/natal-you-placement-sign-final/moon/${row.sign}`,
    content_role: "full_copy",
    grammar_frame: "complete_sentence",
    body,
    reader_only: true,
    render_policy: "reader-only-exact-lived-v1",
    review_status: "approved",
    source_keys: [ARTIFACT, WORKBOOK, APPROVAL],
    approval: {
      approvalLevel: "exact_owner_approved",
      recordPath: APPROVAL,
      payloadSha256: payloadSha(body),
      approvedAt: "2026-08-20"
    },
    source_release: "natal-moon-final-rendered-v3",
    runtime_family: "natal-you-placement-sign-final",
    runtime_key: row.runtimeKey,
    component_hashes: {
      introSha256: row.introSha256,
      bodySha256: row.bodySha256,
      renderedSignSectionSha256: textSha(body)
    },
    governance: "owner-approved-natal-moon-final-v3",
    owner_approved: true,
    serving_precedence: "owner-approved-natal-final-v3",
    distribution_lane: "serving"
  };
});

const houseRows = artifact.houseRows.map((row) => ({
  contentKey: `fallback-hook/natal-you-placement-house-final/moon/${row.house}`,
  content_role: "full_copy",
  grammar_frame: "complete_sentence",
  body: row.rendered,
  reader_only: true,
  render_policy: "reader-only-exact-lived-v1",
  review_status: "approved",
  source_keys: [ARTIFACT, WORKBOOK, APPROVAL],
  approval: {
    approvalLevel: "exact_owner_approved",
    recordPath: APPROVAL,
    payloadSha256: payloadSha(row.rendered),
    approvedAt: "2026-08-20"
  },
  source_release: "natal-moon-final-rendered-v3",
  runtime_family: "natal-you-placement-house-final",
  runtime_key: row.runtimeKey,
  component_hashes: {
    bridgeSha256: row.bridgeSha256,
    bodySha256: row.bodySha256,
    renderedHouseSectionSha256: row.renderedSha256
  },
  governance: "owner-approved-natal-moon-final-v3",
  owner_approved: true,
  serving_precedence: "owner-approved-natal-final-v3",
  distribution_lane: "serving"
}));

const importedRows = [...signRows, ...houseRows];
const importedKeys = new Set(importedRows.map((row) => row.contentKey));
assert(importedKeys.size === 24, "Moon import must contain 24 unique serving rows.");

const existingImported = source.hookRows.filter((row) => importedKeys.has(row.contentKey));
for (const row of existingImported) {
  const expected = importedRows.find((candidate) => candidate.contentKey === row.contentKey);
  assert(JSON.stringify(row) === JSON.stringify(expected), `${row.contentKey}: existing imported row differs from the approved bytes.`);
}

const retainedHooks = source.hookRows.filter((row) => !importedKeys.has(row.contentKey));
const next = { ...source, hookRows: [...retainedHooks, ...importedRows] };
const nextRows = [...next.vocabularyRows, ...next.hookRows];
const nextByKey = new Map(nextRows.map((row) => [row.contentKey, row]));
assert(nextByKey.size === nextRows.length, "Moon import would create duplicate contentKey values.");

const unchangedBefore = sourceBeforeRows.filter((row) => !importedKeys.has(row.contentKey));
for (const row of unchangedBefore) {
  assert(JSON.stringify(row) === JSON.stringify(nextByKey.get(row.contentKey)), `${row.contentKey}: non-target row changed.`);
}
const unrelatedApprovedBefore = unchangedBefore.filter((row) => eligibleStatuses.has(row.review_status));
const unrelatedApprovedAfter = nextRows.filter((row) => !importedKeys.has(row.contentKey) && eligibleStatuses.has(row.review_status));
assert(
  sha256(JSON.stringify(unrelatedApprovedBefore.map(rowSha).sort())) === sha256(JSON.stringify(unrelatedApprovedAfter.map(rowSha).sort())),
  "Approved-row invariant failed outside the 24 Moon serving rows."
);

const record = {
  schema: "tldr-natal-moon-final-serving-import/v1",
  importedAt: "2026-08-20",
  source: SOURCE,
  authority: APPROVAL,
  ownerApproval: EXPECTED_OWNER_APPROVAL,
  artifactSha256: EXPECTED_ARTIFACT_SHA,
  workbookSha256: EXPECTED_WORKBOOK_SHA,
  counts: {
    signRows: signRows.length,
    houseRows: houseRows.length,
    renderedSamplesValidated: artifact.renderRows.length,
    rowsAddedOrReconciled: importedRows.length,
    unrelatedApprovedRowsChanged: 0,
    friendRowsChanged: 0,
    compatibilityRowsChanged: 0,
    childhoodPassagesImported: 0
  },
  invariants: {
    exactV3RenderedHashesValidated: true,
    existingV13RowsRetainedByteIdentical: true,
    existingHouseRowsRetainedByteIdentical: true,
    readerOnlyYouSurface: true,
    noDuplicateContentKeys: true
  },
  rows: importedRows.map((row) => ({
    contentKey: row.contentKey,
    runtimeKey: row.runtime_key,
    bodySha256: textSha(row.body),
    payloadSha256: row.approval.payloadSha256,
    componentHashes: row.component_hashes
  }))
};

if (write) {
  atomicWrite(SOURCE, `${JSON.stringify(next, null, 1)}\n`);
  atomicWrite(RECORD, `${JSON.stringify(record, null, 2)}\n`);
  console.log("Imported 12 Moon sign sections and 12 Moon house sections for You; 144 approved V3 renders validated; Friend, compatibility, and childhood unchanged.");
} else {
  assert(existingImported.length === 24, `Serving import is not complete: found ${existingImported.length}/24 approved Moon rows.`);
  assert(fs.existsSync(absolute(RECORD)), "Serving import record is missing.");
  const existingRecord = readJson(RECORD);
  assert(JSON.stringify(existingRecord) === JSON.stringify(record), "Serving import record drifted from canonical rows.");
  console.log("Moon final serving import check passed: 24 rows, 144 V3 render hashes, You-only, no childhood.");
}
