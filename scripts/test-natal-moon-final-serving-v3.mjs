#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";

const { natalPlacementReaderSectionCopy } = await tsImport(
  "../apps/web/src/content/natalPlacementReaderSections.ts",
  import.meta.url
);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const artifact = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/review/natal-moon-final-rendered-review-v3.json"), "utf8"));
const source = JSON.parse(fs.readFileSync(path.join(packageRoot, "source-rows/fallback-source-rows-v3.json"), "utf8"));
const templates = JSON.parse(fs.readFileSync(path.join(packageRoot, "templates/fallback-templates-v3.json"), "utf8"));
const dist = await import(`${pathToFileURL(path.join(packageRoot, "dist/tldr-content.js")).href}?moon-v3=${Date.now()}`);
const renderer = dist.createFallbackRenderer(templates, source);
const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const rowsByKey = new Map(source.hookRows.map((row) => [row.contentKey, row]));
assert.equal(rowsByKey.size, source.hookRows.length, "canonical hook rows must not contain duplicate contentKey values");
assert.equal(artifact.renderRows.length, 144);
assert.equal(
  natalPlacementReaderSectionCopy("First paragraph.\n\nSecond paragraph.", "fallback-hook/natal-you-placement-sign-final/moon/scorpio"),
  "First paragraph.\n\nSecond paragraph.",
  "owner-approved final You placement sections must preserve every paragraph"
);
assert.equal(
  natalPlacementReaderSectionCopy("First paragraph.\n\nSecond paragraph.", "fallback-template/natal.planet-in-sign"),
  "First paragraph.",
  "the Moon fix must not broaden the existing normalization behavior for Friend or other placement paths"
);

for (const signRow of artifact.signRows) {
  const servingSign = rowsByKey.get(`fallback-hook/natal-you-placement-sign-final/moon/${signRow.sign}`);
  assert.ok(servingSign, `${signRow.runtimeKey}: final You sign row missing`);
  assert.equal(servingSign.reader_only, true);
  assert.equal(servingSign.body, `${signRow.intro}\n\n${signRow.body}`);
  assert.equal(servingSign.component_hashes.introSha256, signRow.introSha256);
  assert.equal(servingSign.component_hashes.bodySha256, signRow.bodySha256);
  assert.equal(servingSign.approval.approvalLevel, "exact_owner_approved");
  assert.equal(servingSign.approval.recordPath, "packages/astro-knowledge/review/natal-moon-final-owner-approval-2026-08-20.json");
}

for (const houseRow of artifact.houseRows) {
  const servingHouse = rowsByKey.get(`fallback-hook/natal-you-placement-house-final/moon/${houseRow.house}`);
  assert.ok(servingHouse, `${houseRow.runtimeKey}: final You house row missing`);
  assert.equal(servingHouse.reader_only, true);
  assert.equal(servingHouse.body, houseRow.rendered);
  assert.equal(sha256(servingHouse.body), houseRow.renderedSha256);
}

for (const row of artifact.renderRows) {
  const [, sign, house] = row.renderKey.split("|");
  const rendered = renderer.renderNatalPlacement({ planet: "moon", sign, house: Number(house), voice: "you" });
  const expectedServingBody = row.rendered.replace(
    /It's in your (\d+(?:st|nd|rd|th)) house, meaning/u,
    "Your Moon is in your $1 house, meaning"
  );
  assert.equal(
    rendered.body,
    expectedServingBody,
    `${row.renderKey}: serving render must preserve the owner-approved V3 copy with the contextual Moon bridge`
  );
  assert.doesNotMatch(rendered.body, /What happened growing up|growing up shaped|childhood/iu, `${row.renderKey}: childhood text leaked into serving copy`);
  assert.deepEqual(rendered.partKeys, [
    `fallback-hook/natal-you-placement-sign-final/moon/${sign}`,
    `fallback-hook/natal-you-placement-house-final/moon/${house}`
  ]);

  const normalizedSections = rendered.parts
    .map((part, index) => natalPlacementReaderSectionCopy(part, rendered.partKeys?.[index]))
    .filter(Boolean);
  assert.deepEqual(
    normalizedSections,
    rendered.parts,
    `${row.renderKey}: app normalization must preserve every paragraph in both approved sections`
  );
  assert.equal(
    normalizedSections.join("\n\n"),
    expectedServingBody,
    `${row.renderKey}: app-normalized article must equal the complete owner-approved V3 passage with the contextual bridge`
  );
}

const friend = renderer.renderNatalPlacement({ planet: "moon", sign: "scorpio", house: 6, voice: "Sample Friend" });
assert.equal(friend.partKeys?.includes("fallback-hook/natal-you-placement-sign-final/moon/scorpio"), false, "Friend must not resolve the You-only sign row");
assert.equal(friend.partKeys?.includes("fallback-hook/natal-you-placement-house-final/moon/6"), false, "Friend must not resolve the You-only house row");
assert.doesNotMatch(friend.body, /Your Moon is your instinctual emotional world/iu, "Friend must not receive the You-only Moon introduction");

console.log("Natal Moon final serving V3 passed: all 144 You source passages remain exact with contextual serving bridges; Friend remains on its separate path; childhood excluded.");
