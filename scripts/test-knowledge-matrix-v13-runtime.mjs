#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  createFallbackRenderer,
  createKnowledgeMatrixV13Resolver
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  KNOWLEDGE_MATRIX_V13_BASE_PATH,
  loadKnowledgeMatrixV13Runtime,
  renderKnowledgeMatrixV13NatalAspect,
  renderKnowledgeMatrixV13Placement,
  renderKnowledgeMatrixV13WorkbookKey
} from "../apps/web/src/content/knowledgeMatrixV13Runtime.ts";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workbookRelativePath = "tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx";
const workbookPath = path.join(repoRoot, workbookRelativePath);
const lockedRelativePath = "packages/astro-knowledge/voice/tldr-astro/satori-writer/ll-matrix-v13/knowledge-matrix-v13-owner-approved-locked.json";
const approvalRecordRelativePath = "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/knowledge-matrix-v13-owner-approved-locked.json";
const publicRelativePath = "apps/web/public/content/knowledge-matrix-v13/v13-direct-language-owner-approved/knowledge-matrix-v13-owner-approved-locked.json";
const lockedPath = path.join(repoRoot, lockedRelativePath);
const publicPath = path.join(repoRoot, publicRelativePath);
const manifest = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "packages/astro-knowledge/review/ll-matrix-v13-runtime-manifest.json"),
  "utf8",
));
const sourceRows = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"),
  "utf8",
));
const templates = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json"),
  "utf8",
));
const placementInterim = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json"),
  "utf8",
));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const lockedBytes = fs.readFileSync(lockedPath);
const publicBytes = fs.readFileSync(publicPath);
const locked = JSON.parse(lockedBytes.toString("utf8"));

assert.deepEqual(publicBytes, lockedBytes, "public and governed locked V13 JSON must be byte-identical");
assert.equal(sha256(lockedBytes), manifest.lockedRowsSha256);
assert.equal(sha256(fs.readFileSync(workbookPath)), manifest.sourceWorkbookSha256);
assert.equal(locked.sourceWorkbook, workbookRelativePath);
assert.equal(locked.sourceWorkbookSha256, manifest.sourceWorkbookSha256);
assert.equal(locked.counts.sourceRows, 1014);
assert.equal(locked.counts.ownerApprovedRows, 301);
assert.equal(locked.counts.excludedUnapprovedRows, 713);
assert.equal(locked.counts.clarityStrictV13Rows, 195);
assert.deepEqual(locked.counts.bySheet, {
  PlacementMeanings: 113,
  AspectMeanings: 165,
  NodesPhasesFortune: 23,
});
assert.deepEqual(locked.counts.byGovernance, {
  "owner-approved-v13-direct-language": 194,
  "owner-lived-experience-ll-v9-owner-approved": 106,
  "owner-approved-clarity-fix-ll-v12": 1,
});
assert.match(locked.governance.canonicalDecision, /195-row ClarityStrictV13 pass.+canonical/iu);
assert.match(locked.governance.canonicalDecision, /Gemini.+discarded.+must not run/iu);

const governanceDecision = readInlineXlsxSheet(workbookPath, "GovernanceLegend")
  .find((row) => row.cells.Label === locked.governance.canonicalDecisionKey);
assert.equal(governanceDecision?.cells.Meaning, locked.governance.canonicalDecision);
const clarityRows = readInlineXlsxSheet(workbookPath, "ClarityStrictV13");
assert.equal(clarityRows.length, 195);
assert.ok(clarityRows.every((row) => row.cells.Status === "OWNER APPROVED 2026-08-10"));

const workbookRows = new Map();
for (const sheet of ["PlacementMeanings", "AspectMeanings", "NodesPhasesFortune"]) {
  for (const row of readInlineXlsxSheet(workbookPath, sheet)) {
    workbookRows.set(`${sheet}\u0000${row.rowNumber}`, row.cells);
  }
}
const sourceByReleaseKey = new Map(
  sourceRows.hookRows
    .filter((row) => row.source_release === "ll-matrix-v13-owner-approved-runtime")
    .map((row) => [row.contentKey, row]),
);
assert.equal(sourceByReleaseKey.size, 301);
assert.equal(manifest.rows.length, 301);
for (const row of locked.rows) {
  const workbookRow = workbookRows.get(`${row.sheet}\u0000${row.workbookRow}`);
  assert.ok(workbookRow, `${row.sheet}/${row.workbookRow}: workbook provenance missing`);
  assert.equal(workbookRow.Key, row.key);
  assert.equal(workbookRow.Copy, row.copy);
  assert.equal(workbookRow.Governance, row.governance);
  assert.equal(row.authorship, "owner_authored");
  assert.ok(["TRUE", "1"].includes(String(workbookRow.OwnerApproved).toUpperCase()));
  assert.equal(sha256(JSON.stringify({ body: row.copy })), row.payloadSha256);
  assert.equal(row.workbookProvenance.path, workbookRelativePath);
  assert.equal(row.workbookProvenance.sheet, row.sheet);

  const servingRow = sourceByReleaseKey.get(row.contentKey);
  assert.ok(servingRow, `${row.contentKey}: V13 serving row missing`);
  assert.equal(servingRow.body, row.copy);
  assert.equal(servingRow.review_status, "approved");
  assert.equal(servingRow.reader_only, true);
  assert.equal(servingRow.render_policy, "reader-only-exact-lived-v1");
  assert.equal(servingRow.approval?.approvalLevel, "exact_owner_approved");
  assert.equal(servingRow.approval?.recordPath, approvalRecordRelativePath);
  assert.equal(servingRow.approval?.payloadSha256, row.payloadSha256);
  assert.equal(servingRow.source_workbook_row, row.workbookRow);
  assert.equal(servingRow.source_workbook_sha256, locked.sourceWorkbookSha256);
}

const servingApprovedReviews = new Set(["approved", "approved_reuse", "reviewed"]);
const priorApprovedRows = sourceRows.hookRows.filter((row) => (
  row.source_release !== "ll-matrix-v13-owner-approved-runtime"
  && !row.contentKey.startsWith("fallback-hook/empty-house/")
  && servingApprovedReviews.has(row.review_status)
));
assert.equal(
  sha256(JSON.stringify(priorApprovedRows)),
  manifest.invariants.readerPunctuationNormalizedExistingApprovedRowsSha256,
  "Every approved row that predates V13 must remain byte-identical after the globally approved reader-punctuation normalization.",
);
assert.equal(manifest.invariants.existingApprovedRowsChanged, 0);

const resolver = createKnowledgeMatrixV13Resolver(locked);
assert.deepEqual(resolver.counts, {
  ownerApprovedRows: 301,
  placementRows: 113,
  aspectRows: 165,
  pointRows: 23,
});
assert.equal(resolver.renderNatalPlacement({ planet: "Mars", sign: "Aries" })?.body, locked.rows.find((row) => row.key === "mars|aries")?.copy);
assert.equal(resolver.renderNatalPlacement({ planet: "North_Node", sign: "Capricorn" })?.body, locked.rows.find((row) => row.key === "north-node|capricorn")?.copy);
assert.equal(resolver.renderNatalPlacement({ planet: "Mars", sign: "Aries", house: 4 })?.body, locked.rows.find((row) => row.key === "mars|4th house")?.copy);
const sunMoon = locked.rows.find((row) => row.key === "sun|square|moon");
assert.equal(resolver.renderNatalAspect({ planetA: "sun", aspect: "square", planetB: "moon" })?.body, sunMoon?.copy);
assert.equal(resolver.renderNatalAspect({ planetA: "moon", aspect: "square", planetB: "sun" })?.body, sunMoon?.copy);
assert.equal(
  resolver.renderNatalAspect({ planetA: "mars", aspect: "sextile", planetB: "pluto" }),
  null,
  "The direct V13 natal resolver must not substitute an aspect-only row for a missing natal pair."
);
assert.equal(resolver.renderWorkbookKey("balsamic-moon")?.body, locked.rows.find((row) => row.key === "balsamic-moon")?.copy);
assert.equal(resolver.renderWorkbookKey("unapproved-key"), null);

const unauthorized = structuredClone(locked);
unauthorized.rows[0].ownerApproved = false;
assert.throws(() => createKnowledgeMatrixV13Resolver(unauthorized), /incomplete or unauthorized/u);

const browser = createFallbackRenderer(
  { templates: [...templates.templates, ...placementInterim.templates] },
  {
    hookRows: sourceRows.hookRows,
    vocabularyRows: [...sourceRows.vocabularyRows, ...placementInterim.vocabularyRows],
  },
);
assert.equal(browser.renderNatalPlacement({ planet: "mars", sign: "aries", voice: "you" }).body, resolver.renderNatalPlacement({ planet: "mars", sign: "aries" })?.body);
assert.equal(browser.renderNatalAspect({ planetA: "moon", aspect: "square", planetB: "sun", voice: "you" }).body, sunMoon?.copy);
assert.equal(browser.renderNatalAspect({ planetA: "mars", aspect: "sextile", planetB: "pluto", voice: "you" }).templateKey, "fallback-template/natal.aspect");
const jupiterRows = sourceRows.hookRows.filter((row) => row.contentKey === "fallback-hook/planet-lived/jupiter");
assert.equal(jupiterRows.length, 1, "V13 same-key precedence must leave one canonical Jupiter row.");
assert.equal(jupiterRows[0]?.source_release, "ll-matrix-v13-owner-approved-runtime");
assert.equal(jupiterRows[0]?.body, sourceByReleaseKey.get("fallback-hook/planet-lived/jupiter")?.body);

const materializerTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tldr-ll-v13-materializer-"));
try {
  const materializerOutput = path.join(materializerTempDir, "rows.json");
  const materializer = spawnSync(process.execPath, [
    path.join(repoRoot, "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs"),
    `--out=${materializerOutput}`,
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(
    materializer.status,
    0,
    `V13 Supabase serving materialization must succeed.\n${materializer.stderr || materializer.stdout}`,
  );
  const materialized = JSON.parse(fs.readFileSync(materializerOutput, "utf8"));
  const materializedByKey = new Map(materialized.rows.map((row) => [row.content_key, row]));
  const v13Rows = locked.rows.map((row) => materializedByKey.get(row.contentKey));
  assert.equal(v13Rows.filter(Boolean).length, 301);
  for (const [index, row] of v13Rows.entries()) {
    const lockedRow = locked.rows[index];
    assert.equal(row.body, lockedRow.copy, `${lockedRow.contentKey}: Supabase body must remain exact.`);
    assert.equal(row.status, "LIVE", `${lockedRow.contentKey}: serving status must be LIVE.`);
    assert.equal(row.lane, "serving", `${lockedRow.contentKey}: serving lane must be explicit.`);
    assert.equal(row.review_state, null, `${lockedRow.contentKey}: reader guard must be clear.`);
    assert.equal(row.facts?.readerServing, true, `${lockedRow.contentKey}: reader guard must allow serving.`);
    assert.equal(row.sections?.packageRecord?.source_release, "ll-matrix-v13-owner-approved-runtime");
  }
} finally {
  fs.rmSync(materializerTempDir, { recursive: true, force: true });
}

const fetchCalls = [];
const runtimeFetch = async (input) => {
  fetchCalls.push(String(input));
  return new Response(publicBytes, { status: 200, headers: { "content-type": "application/json" } });
};
const loadedRuntime = await loadKnowledgeMatrixV13Runtime(runtimeFetch);
assert.deepEqual(loadedRuntime.counts, resolver.counts);
assert.equal(fetchCalls.length, 1);
assert.ok(fetchCalls[0].startsWith(KNOWLEDGE_MATRIX_V13_BASE_PATH));
assert.equal((await renderKnowledgeMatrixV13Placement({ planet: "mars", sign: "aries" }, runtimeFetch))?.body, resolver.renderNatalPlacement({ planet: "mars", sign: "aries" })?.body);
assert.equal((await renderKnowledgeMatrixV13NatalAspect({ planetA: "moon", aspect: "square", planetB: "sun" }, runtimeFetch))?.body, sunMoon?.copy);
assert.equal((await renderKnowledgeMatrixV13WorkbookKey("balsamic-moon", runtimeFetch))?.body, resolver.renderWorkbookKey("balsamic-moon")?.body);

console.log("Knowledge matrix V13 runtime passed: canonical workbook governance exact; 301 approved rows traced to sheet/cell provenance; 713 unapproved rows excluded; V13 exact-key precedence and fail-closed behavior verified.");
