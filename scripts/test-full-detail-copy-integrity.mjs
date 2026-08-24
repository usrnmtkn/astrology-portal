#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const {
  fullDetailReaderFacingCopy,
  fullDetailReaderFacingParagraphs,
  readerFacingParagraphs
} = await tsImport("../apps/web/src/content/readerSafety.ts", import.meta.url);

function functionBlock(source, name) {
  const markers = [`function ${name}(`, `function ${name}<`, `const ${name} =`];
  const start = markers.map((marker) => source.indexOf(marker)).find((index) => index >= 0) ?? -1;

  assert.notEqual(start, -1, `Missing full-detail consumer ${name}. Update the universal guard registry if it was intentionally renamed.`);

  const nextFunction = source.indexOf("\nfunction ", start + 1);
  const nextExportedFunction = source.indexOf("\nexport function ", start + 1);
  const candidates = [nextFunction, nextExportedFunction].filter((index) => index > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

function requireFullDetailBoundary({ file, name, token = "fullDetailReaderFacingCopy" }) {
  const block = functionBlock(read(file), name);
  assert.match(block, new RegExp(`\\b${token}\\b`, "u"), `${file}:${name} must use ${token}.`);
  assert.doesNotMatch(block, /\bfirstReaderFacingCopy\b/u, `${file}:${name} must not collapse a full-detail body to its first paragraph.`);
}

const appFile = "apps/web/src/App.tsx";
for (const name of [
  "natalAngleFallbackV3NormalizedSections",
  "sourceGroundedNatalAspectNormalizedSection",
  "reviewedSkyAspectWritingSection",
  "skyPlacementWritingSection",
  "normalizeEmptyHouseDetailSurface",
  "personalTransitPackageSection",
  "normalizeTransitHouseSurface",
  "renderReaderDirectedSynastryContact"
]) {
  requireFullDetailBoundary({ file: appFile, name });
}
requireFullDetailBoundary({
  file: appFile,
  name: "natalPlacementV3NormalizedSections",
  token: "natalPlacementReaderSectionCopy"
});
requireFullDetailBoundary({
  file: "apps/web/src/features/calendar/LunarCalendar.tsx",
  name: "calendarSkyAspectPackageCandidates"
});
requireFullDetailBoundary({
  file: "apps/web/src/features/sky/SkyDetailArticle.tsx",
  name: "SkyDetailArticle",
  token: "fullDetailReaderFacingParagraphs"
});
requireFullDetailBoundary({
  file: "apps/web/src/components/reports/ReportArticle.tsx",
  name: "ReportArticle",
  token: "fullDetailReaderFacingParagraphs"
});

const placementSectionSource = read("apps/web/src/content/natalPlacementReaderSections.ts");
assert.match(
  placementSectionSource,
  /fullDetailReaderFacingCopy\(\[value\]\)/u,
  "Natal placement sections must preserve every source paragraph at the shared reader boundary."
);

const compatibilitySource = read("apps/web/src/features/friends/CompatibilityTab.tsx");
const friendsSource = read("apps/web/src/features/friends/ManualChartsPanel.tsx");
assert.match(
  compatibilitySource,
  /onOpenCard\?\.\(card, fullParagraphs\)/u,
  "Compatibility detail must receive the complete paragraph inventory, not the card preview."
);
assert.match(
  friendsSource,
  /openFriendCompatibilityCardDetail[\s\S]*?body:\s*paragraphs/u,
  "Friends compatibility detail must pass every full paragraph into the detail article."
);

const cssRoot = path.join(repoRoot, "apps/web/src/styles");
const allowedLineClampSelectors = new Set([
  ".placement-section .planet-placement-row__description",
  ".transit-card-preview"
]);
const lineClampSelectors = [];
for (const entry of fs.readdirSync(cssRoot, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".css")) continue;
  const css = fs.readFileSync(path.join(cssRoot, entry.name), "utf8");
  const rulePattern = /([^{}]+)\{([^{}]*-webkit-line-clamp\s*:[^{}]+)\}/gu;
  let match;

  while ((match = rulePattern.exec(css))) {
    const selectors = match[1].split(",").map((selector) => selector.trim()).filter(Boolean);
    for (const selector of selectors) {
      lineClampSelectors.push(`${entry.name}:${selector}`);
      assert.equal(
        allowedLineClampSelectors.has(selector),
        true,
        `${entry.name}:${selector} adds a text line clamp outside an approved preview surface.`
      );
    }
  }
}
assert.equal(
  lineClampSelectors.length,
  allowedLineClampSelectors.size,
  "The line-clamp inventory changed; classify each new or removed clamp as preview or full detail."
);

const corpusFiles = [
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json",
  "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json",
  "apps/web/src/content/fallbackArchitectureV3/bundled-sky-authored-cards-v3.json",
  "apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json",
  "apps/web/src/content/fallbackArchitectureV3/bundled-relationship-authored-cards-v3.json"
];
const approvedStatuses = new Set(["approved", "approved_reuse"]);
const acceptedApprovalLevels = new Set(["exact_owner_approved", "owner_signoff_untraced"]);
const protectedFieldNames = new Set(["body", "body_you", "body_they", "body_sky"]);
const protectedPassages = new Map();

function approvedObject(value) {
  return approvedStatuses.has(value?.review_status)
    || acceptedApprovalLevels.has(value?.approval?.approvalLevel)
    || value?.ownerApproved === true;
}

function collectProtectedPassages(value, relativePath) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectProtectedPassages(entry, relativePath));
    return;
  }
  if (!value || typeof value !== "object") return;

  if (approvedObject(value)) {
    const identity = value.contentKey ?? value.id ?? value.key ?? "anonymous-row";
    for (const [field, body] of Object.entries(value)) {
      if (
        !protectedFieldNames.has(field)
        || typeof body !== "string"
        || fullDetailReaderFacingParagraphs([body]).length < 2
      ) continue;
      const inventoryKey = `${identity}:${field}:${body}`;
      protectedPassages.set(inventoryKey, { body, field, identity, relativePath, surface: value.surface ?? "fallback" });
    }
  }

  Object.values(value).forEach((entry) => collectProtectedPassages(entry, relativePath));
}

for (const relativePath of corpusFiles) {
  collectProtectedPassages(JSON.parse(read(relativePath)), relativePath);
}

assert.ok(protectedPassages.size > 0, "The protected multi-paragraph inventory must not be empty.");
const surfaceCounts = new Map();
for (const passage of protectedPassages.values()) {
  const expectedParagraphs = readerFacingParagraphs([passage.body]);
  const renderedParagraphs = fullDetailReaderFacingParagraphs([passage.body]);
  const renderedBody = fullDetailReaderFacingCopy([passage.body]);
  const label = `${passage.relativePath}:${passage.identity}.${passage.field}`;

  assert.ok(expectedParagraphs.length > 1, `${label} must remain a multi-paragraph fixture.`);
  assert.deepEqual(renderedParagraphs, expectedParagraphs, `${label} lost or reordered a full-detail paragraph.`);
  assert.equal(renderedBody, expectedParagraphs.join("\n\n"), `${label} full-detail copy must preserve every paragraph.`);
  assert.ok(renderedBody.startsWith(expectedParagraphs[0]), `${label} lost its opening paragraph.`);
  assert.ok(renderedBody.endsWith(expectedParagraphs.at(-1)), `${label} lost its final paragraph or final sentence.`);
  surfaceCounts.set(passage.surface, (surfaceCounts.get(passage.surface) ?? 0) + 1);
}

console.log(JSON.stringify({
  status: "PASS",
  protectedMultiParagraphPassages: protectedPassages.size,
  fullDetailConsumers: 15,
  approvedPreviewLineClamps: lineClampSelectors.sort(),
  passagesBySurface: Object.fromEntries([...surfaceCounts.entries()].sort(([a], [b]) => a.localeCompare(b)))
}, null, 2));
