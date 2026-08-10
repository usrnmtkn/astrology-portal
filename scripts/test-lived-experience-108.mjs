import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeAspect as normalizeNodeAspect,
  renderNatalAspect as renderNodeNatalAspect,
  renderNatalPlacement as renderNodeNatalPlacement,
  SourceGapError as NodeSourceGapError,
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import {
  createFallbackRenderer,
  normalizeAspect as normalizeBrowserAspect,
  SourceGapError as BrowserSourceGapError,
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = "packages/astro-knowledge/review/lived-experience-108-v1";
const workbookPath = `${reviewRoot}/TLDR-LL-FULL-108-LIVED-EXPERIENCE-OWNER-APPROVED.xlsx`;
const packet = JSON.parse(fs.readFileSync(path.join(repoRoot, reviewRoot, "lived-experience-108-payloads.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, reviewRoot, "shipping-manifest.json"), "utf8"));
const source = JSON.parse(fs.readFileSync(
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
const browser = createFallbackRenderer(
  { templates: [...templates.templates, ...placementInterim.templates] },
  {
    hookRows: source.hookRows,
    vocabularyRows: [...source.vocabularyRows, ...placementInterim.vocabularyRows],
  },
);

const livedPrefixes = [
  "fallback-hook/natal-aspect-lived/",
  "fallback-hook/placement-house-lived/",
  "fallback-hook/placement-sign-lived/",
  "fallback-hook/planet-lived/",
];
const signs = new Set([
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]);
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const normalizeObject = (value) => value.replaceAll("_", "-");

function mappedKey(workbookKey) {
  const parts = workbookKey.split("|");
  if (parts.length === 3) {
    const [a, aspect, b] = parts;
    return `fallback-hook/natal-aspect-lived/${normalizeObject(a)}/${aspect === "inconjunct" ? "quincunx" : aspect}/${normalizeObject(b)}`;
  }
  if (parts.length === 2) {
    const [object, placement] = parts;
    const house = placement.match(/^([1-9]|1[0-2])(?:st|nd|rd|th) house$/u);
    if (house) return `fallback-hook/placement-house-lived/${normalizeObject(object)}/${Number(house[1])}`;
    if (signs.has(placement)) return `fallback-hook/placement-sign-lived/${normalizeObject(object)}/${placement}`;
  }
  if (workbookKey === "jupiter") return "fallback-hook/planet-lived/jupiter";
  throw new Error(`Ambiguous test mapping: ${workbookKey}`);
}

const rowsByKey = new Map(source.hookRows.map((row) => [row.contentKey, row]));
const manifestByWorkbookKey = new Map(manifest.rows.map((row) => [row.workbookKey, row]));
const livedRows = source.hookRows.filter((row) => livedPrefixes.some((prefix) => row.contentKey.startsWith(prefix)));
assert.equal(livedRows.length, 108);
assert.equal(packet.approvedAt, "2026-08-10");
assert.equal(packet.approvalRecord, workbookPath);
assert.equal(manifest.rowCount, 108);
assert.deepEqual(manifest.familyCounts, {
  "natal-aspect-lived": 97,
  "placement-house-lived": 8,
  "planet-lived": 1,
  "placement-sign-lived": 2,
});

const existingApprovedRows = source.hookRows.filter((row) => (
  row.review_status === "approved"
  && !livedPrefixes.some((prefix) => row.contentKey.startsWith(prefix))
));
assert.equal(
  sha256(JSON.stringify(existingApprovedRows)),
  manifest.invariants.existingApprovedRowsSha256,
  "Existing approved rows must remain byte-identical to the pre-shipping snapshot.",
);
assert.equal(manifest.invariants.existingApprovedRowsChanged, 0);

for (const [workbookKey, entry] of Object.entries(packet.payloads)) {
  assert.equal(sha256(JSON.stringify(entry.payload)), entry.sha256, `${workbookKey}: payload hash mismatch`);
  const contentKey = mappedKey(workbookKey);
  const row = rowsByKey.get(contentKey);
  assert.ok(row, `${contentKey}: serving row missing`);
  assert.equal(row.body, entry.payload.body, `${contentKey}: body differs from owner-approved workbook payload`);
  assert.equal(row.sourceMechanism, entry.payload.sourceMechanism, `${contentKey}: sourceMechanism differs`);
  assert.equal(row.body_you, undefined, `${contentKey}: reader-only row must not synthesize body_you`);
  assert.equal(row.body_they, undefined, `${contentKey}: reader-only row must not synthesize body_they`);
  assert.equal(row.reader_only, true);
  assert.equal(row.render_policy, "reader-only-exact-lived-v1");
  assert.equal(row.review_status, "approved");
  assert.equal(row.approval?.payloadSha256, entry.sha256);
  assert.equal(row.approval?.approvedAt, "2026-08-10");

  const manifestRow = manifestByWorkbookKey.get(workbookKey);
  assert.equal(manifestRow?.contentKey, contentKey);
  assert.equal(manifestRow?.payloadSha256, entry.sha256);
  const record = JSON.parse(fs.readFileSync(path.join(repoRoot, row.approval.recordPath), "utf8"));
  assert.equal(record.contentKey, contentKey);
  assert.equal(record.workbookKey, workbookKey);
  assert.equal(record.payloadSha256, entry.sha256);
  assert.equal(sha256(JSON.stringify(record.payload)), entry.sha256);
  assert.deepEqual(record.payload, entry.payload);
  assert.equal(record.sourceWorkbook.path, workbookPath);
  assert.equal(record.sourceWorkbook.sheet, "OwnerLivedReview");
  assert.equal(record.sourceWorkbook.approvedBodyCell, `E${entry.row + 1}`);
}

assert.equal(normalizeNodeAspect("inconjunct"), "quincunx");
assert.equal(normalizeNodeAspect("quincunx"), "quincunx");
assert.equal(normalizeBrowserAspect("inconjunct"), "quincunx");
assert.equal(normalizeBrowserAspect("quincunx"), "quincunx");

for (const [workbookKey, entry] of Object.entries(packet.payloads)) {
  const parts = workbookKey.split("|");
  if (parts.length === 3) {
    const [rawA, rawAspect, rawB] = parts;
    const planetA = normalizeObject(rawA);
    const planetB = normalizeObject(rawB);
    const aspect = rawAspect === "inconjunct" ? "quincunx" : rawAspect;
    const expectedKey = mappedKey(workbookKey);
    for (const [label, render] of [
      ["node", renderNodeNatalAspect],
      ["browser", browser.renderNatalAspect],
    ]) {
      const forward = render({ planetA, planetB, aspect, voice: "you" });
      const reverse = render({ planetA: planetB, planetB: planetA, aspect, voice: "you" });
      assert.equal(forward.body, entry.payload.body, `${label}:${workbookKey}: forward body mismatch`);
      assert.equal(reverse.body, entry.payload.body, `${label}:${workbookKey}: reverse body mismatch`);
      assert.equal(forward.templateKey, expectedKey, `${label}:${workbookKey}: forward key mismatch`);
      assert.equal(reverse.templateKey, expectedKey, `${label}:${workbookKey}: reverse key mismatch`);
    }
    continue;
  }

  if (parts.length === 2 && / house$/u.test(parts[1])) {
    const object = normalizeObject(parts[0]);
    const house = Number(parts[1].match(/^(1[0-2]|[1-9])(?:st|nd|rd|th) house$/u)?.[1]);
    for (const [label, render] of [
      ["node", renderNodeNatalPlacement],
      ["browser", browser.renderNatalPlacement],
    ]) {
      const result = render({ planet: object, sign: "aries", house, voice: "you" });
      assert.equal(result.body, entry.payload.body, `${label}:${workbookKey}: house body mismatch`);
      assert.equal(result.templateKey, mappedKey(workbookKey));
    }
    continue;
  }

  if (parts.length === 2) {
    const [planet, sign] = parts;
    for (const [label, render] of [
      ["node", renderNodeNatalPlacement],
      ["browser", browser.renderNatalPlacement],
    ]) {
      const result = render({ planet, sign, voice: "you" });
      assert.equal(result.parts[0], entry.payload.body, `${label}:${workbookKey}: sign body mismatch`);
    }
    continue;
  }

  for (const [label, render] of [
    ["node", renderNodeNatalPlacement],
    ["browser", browser.renderNatalPlacement],
  ]) {
    const result = render({ planet: "jupiter", sign: "sagittarius", voice: "you" });
    assert.ok(result.parts[0].includes(entry.payload.body), `${label}:${workbookKey}: planet-lived body not selected`);
  }
}

const quincunxFixture = packet.payloads["jupiter|inconjunct|ascendant"].payload.body;
assert.throws(
  () => renderNodeNatalAspect({ planetA: "jupiter", planetB: "ascendant", aspect: "quincunx", voice: "Bird" }),
  NodeSourceGapError,
  "Node resolver must not expose reader-only lived copy in named/third-person voice.",
);
assert.throws(
  () => browser.renderNatalAspect({ planetA: "jupiter", planetB: "ascendant", aspect: "quincunx", voice: "Bird" }),
  BrowserSourceGapError,
  "Browser resolver must not expose reader-only lived copy in named/third-person voice.",
);
assert.equal(renderNodeNatalAspect({ planetA: "jupiter", planetB: "ascendant", aspect: "quincunx", voice: "you" }).body, quincunxFixture);

console.log("Lived-experience 108 shipping, provenance, and resolver checks passed.");
