#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";

import { renderNatalAspect as nodeRenderNatalAspect } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = "packages/astro-knowledge/review/angle-aspects-60-v15";
const rowsPath = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const templatesPath = "apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json";
const canonicalSha256 = "3bbcd3e611d72a9754e9fdb4f4390ec860a670bc53af6b059ea23a212d37bfd4";
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function parsePassages(markdown) {
  const passages = [];
  let current = null;
  const flush = () => {
    if (!current) return;
    const match = current.heading.match(/^(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto) (conjunct|square|opposition) (Ascendant|Midheaven)$/u);
    if (!match) return;
    const body = current.lines.join("\n").trim();
    assert.equal(body.split("\n\n").length, 4, `${current.heading}: canonical body must have four paragraphs.`);
    passages.push({
      heading: current.heading,
      contentKey: `fallback-hook/natal-aspect-lived/${match[1].toLowerCase()}/${match[2] === "conjunct" ? "conjunction" : match[2]}/${match[3].toLowerCase()}`,
      body,
    });
  };
  for (const line of markdown.replace(/\r\n/gu, "\n").split("\n")) {
    if (line.startsWith("## ")) {
      flush();
      current = { heading: line.slice(3), lines: [] };
    } else if (current && (line.startsWith("# ") || line === "---")) {
      flush();
      current = null;
    } else if (current) current.lines.push(line);
  }
  flush();
  return passages;
}

function nonTargetSignature(source, targetKeys) {
  const clone = structuredClone(source);
  for (const key of ["hookRows", "fallbackSourceRows", "vocabularyRows", "templates"]) {
    if (Array.isArray(clone[key])) clone[key] = clone[key].filter((row) => !targetKeys.has(row.contentKey));
  }
  return sha256(JSON.stringify(clone));
}

const browserFallback = await tsImport(
  "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts",
  import.meta.url,
);
const shipped = await import(`${pathToFileURL(path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js",
)).href}?angle-aspects-v15=${Date.now()}`);

const rowsFile = readJson(rowsPath);
const templatesFile = readJson(templatesPath);
const browserRenderer = browserFallback.createFallbackRenderer(templatesFile, rowsFile);
const shippedRenderer = shipped.createFallbackRenderer(templatesFile, rowsFile);
const manifest = readJson(`${reviewRoot}/shipping-manifest.json`);
const packet = readJson(`${reviewRoot}/angle-aspects-60-v15-payloads.json`);
const importArtifact = readJson(`${reviewRoot}/ANGLE-ASPECTS-60-V15-CONTENT-STUDIO-IMPORT.json`);
const replacements = readJson(`${reviewRoot}/replacement-before-after.json`);
const friendsV1Manifest = readJson("packages/astro-knowledge/review/angle-aspects-60-friends-v1/shipping-manifest.json");
const youSupersessions = readJson("packages/astro-knowledge/review/angle-aspects-60-friends-v1/YOU-V15-TWO-OWNER-APPROVED-SUPERSESSIONS.json");
const youSupersessionByKey = new Map(youSupersessions.revisions.map((row) => [row.content_key, row]));
const sourceBytes = fs.readFileSync(path.join(repoRoot, manifest.sourceArtifact.path));
const importBytes = fs.readFileSync(path.join(repoRoot, manifest.regeneratedImportArtifact.path));
const passages = parsePassages(sourceBytes.toString("utf8"));
const passagesByKey = new Map(passages.map((passage) => [passage.contentKey, passage]));
const rowsByKey = new Map(rowsFile.hookRows.map((row) => [row.contentKey, row]));
const targetKeys = new Set(manifest.rows.map(({ contentKey }) => contentKey));

assert.equal(sha256(sourceBytes), canonicalSha256);
assert.equal(manifest.sourceArtifact.sha256, canonicalSha256);
assert.equal(manifest.sourceArtifact.passageCount, 60);
assert.equal(manifest.rowCount, 60);
assert.equal(manifest.insertionCount, 49);
assert.equal(manifest.replacementCount, 11);
assert.equal(passages.length, 60);
assert.equal(targetKeys.size, 60);
assert.equal(importArtifact.rowCount, 60);
assert.equal(importArtifact.rows.length, 60);
assert.equal(importArtifact.markdownToImportBodyParity, "60/60");
assert.equal(sha256(importBytes), manifest.regeneratedImportArtifact.sha256);
assert.equal(replacements.rowCount, 11);
assert.equal(new Set(replacements.rows.map(({ contentKey }) => contentKey)).size, 11);
assert.equal(manifest.invariants.nonTargetSourceRowsChanged, 0);
assert.ok(
  [
    manifest.invariants.nonTargetSourceRowsSha256Before,
    manifest.invariants.focusedCommitNonTargetSourceRowsSha256,
  ].includes(nonTargetSignature(rowsFile, targetKeys)),
  "Rows outside the V15 scope must match either the recorded owner-review worktree or the clean focused-commit baseline.",
);
assert.equal(manifest.invariants.nonTargetSourceRowsSha256Before, manifest.invariants.nonTargetSourceRowsSha256After);

let exactResolverVerificationCount = 0;
for (const [index, manifestRow] of manifest.rows.entries()) {
  const entry = packet.payloads[manifestRow.packetKey];
  const sourcePassage = passagesByKey.get(manifestRow.contentKey);
  const imported = importArtifact.rows[index];
  assert.ok(entry && sourcePassage, `${manifestRow.contentKey}: packet or source passage missing.`);
  assert.equal(sourcePassage.heading, entry.heading);
  assert.equal(sourcePassage.body, entry.payload.body, `${manifestRow.contentKey}: source to packet body`);
  assert.equal(imported.content_key, manifestRow.contentKey);
  assert.equal(imported.body, sourcePassage.body, `${manifestRow.contentKey}: Markdown to import body`);
  assert.doesNotMatch(imported.body, /(^|\n)(---|# MIDHEAVEN)|blocker notes|editorial notes/iu);
  assert.equal(sha256(sourcePassage.body), entry.sourceBodySha256);
  assert.equal(sha256(JSON.stringify(entry.payload)), entry.sha256);
  assert.equal(entry.sha256, manifestRow.payloadSha256);
  const expectedAuthorship = manifestRow.contentKey === "fallback-hook/natal-aspect-lived/sun/conjunction/ascendant"
    ? "owner_authored"
    : "owner_reviewed";
  assert.equal(entry.authorship, expectedAuthorship);

  const record = readJson(manifestRow.recordPath);
  assert.equal(record.approvalLevel, "exact_owner_approved");
  assert.equal(record.authorship, expectedAuthorship);
  assert.deepEqual(record.payload, entry.payload, `${manifestRow.contentKey}: packet to approval record payload`);
  assert.equal(record.payloadSha256, entry.sha256);
  assert.equal(record.sourceArtifact.sha256, canonicalSha256);
  assert.equal(record.ownerConfirmationSource.taskId, "01a04fc0-899b-7cd2-bb2e-98ad182391bb");

  const servingRow = rowsByKey.get(manifestRow.contentKey);
  assert.ok(servingRow, `${manifestRow.contentKey}: serving row missing.`);
  const supersession = youSupersessionByKey.get(manifestRow.contentKey);
  const expectedServingBody = supersession?.body ?? record.payload.body;
  assert.equal(servingRow.body, expectedServingBody, `${manifestRow.contentKey}: current serving body`);
  if (supersession) {
    const currentManifestRow = friendsV1Manifest.youRevisionRecords.find((row) => row.contentKey === manifestRow.contentKey);
    assert.ok(currentManifestRow, `${manifestRow.contentKey}: later You supersession manifest row missing`);
    const currentRecord = readJson(currentManifestRow.recordPath);
    assert.equal(servingRow.sourceMechanism, currentRecord.payload.sourceMechanism);
    assert.equal(servingRow.approval.recordPath, currentManifestRow.recordPath);
    assert.equal(servingRow.approval.payloadSha256, currentManifestRow.payloadSha256);
    assert.ok(servingRow.historical_approvals.some((approval) => approval.recordPath === manifestRow.recordPath));
  } else {
    assert.equal(servingRow.sourceMechanism, record.payload.sourceMechanism);
    assert.equal(servingRow.approval.recordPath, manifestRow.recordPath);
    assert.equal(servingRow.approval.payloadSha256, entry.sha256);
  }

  const [, , planet, aspect, angle] = manifestRow.contentKey.split("/");
  for (const [order, facts] of [
    ["planet-angle", { aspect, planetA: planet, planetB: angle, voice: "you" }],
    ["angle-planet", { aspect, planetA: angle, planetB: planet, voice: "you" }],
  ]) {
    for (const [implementation, rendered] of [
      ["node", nodeRenderNatalAspect(facts)],
      ["browser-source", browserRenderer.renderNatalAspect(facts)],
      ["shipped-dist", shippedRenderer.renderNatalAspect(facts)],
    ]) {
      assert.equal(rendered.templateKey, manifestRow.contentKey, `${manifestRow.packetKey}/${order}: ${implementation} content key`);
      assert.equal(rendered.body, expectedServingBody, `${manifestRow.packetKey}/${order}: ${implementation} body`);
      assert.equal(rendered.provenanceTier, "exact-owner-approved", `${manifestRow.packetKey}/${order}: ${implementation} provenance tier`);
      const selectedRow = rowsByKey.get(rendered.templateKey);
      assert.equal(selectedRow.approval.recordPath, servingRow.approval.recordPath, `${manifestRow.packetKey}/${order}: ${implementation} record path`);
      assert.equal(selectedRow.approval.payloadSha256, servingRow.approval.payloadSha256, `${manifestRow.packetKey}/${order}: ${implementation} payload hash`);
      exactResolverVerificationCount += 1;
    }
  }
}

assert.equal(exactResolverVerificationCount, 360, "60 rows x 2 key orders x 3 resolver builds must pass exact verification.");
console.log("V15 natal angle aspects: ok (60/60 immutable V15 Markdown/import/packet/record parity; 2 later You supersessions preserved separately; 360 current exact resolver checks; zero non-target source-row drift).");
