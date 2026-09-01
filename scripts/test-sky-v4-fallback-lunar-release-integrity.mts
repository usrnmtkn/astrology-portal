import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const inputs = new URL("../apps/web/src/content/fallbackArchitectureV3/authored-inputs/", import.meta.url);
const expectedPlanets = [
  "sun", "mercury", "venus", "mars", "jupiter",
  "saturn", "uranus", "neptune", "pluto", "chiron"
];
const expectedSigns = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
const expectedEvents = ["new-moon", "full-moon", "solar-eclipse", "lunar-eclipse"];

function readJson(fileName: string) {
  return JSON.parse(fs.readFileSync(new URL(fileName, inputs), "utf8"));
}

function sha256(bytes: Buffer) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readPackage(fileName: string) {
  const manifest = readJson(fileName);
  assert.equal(manifest.review_status, "approved");
  assert.equal(manifest.owner_approved, true);
  assert.equal(manifest.serving_enabled, true);
  assert.match(manifest.approval_id, /owner-approval-2026-09-01$/u);
  assert.match(manifest.release_id, /serving-release-2026-09-01$/u);
  assert.equal(
    manifest.owner_review_source_json_sha256,
    "450eac515db908ea82a02869f308ac9ae5f97e272b2308c7c975e4c02245a08a"
  );
  assert.equal(
    manifest.owner_review_workbook_sha256,
    "3551cb36c6f6181bf7f4f284999d40126f79b22661043ea2b7f585b9ee244418"
  );
  const records = manifest.chunk_files.flatMap((chunkFile: string, index: number) => {
    const bytes = fs.readFileSync(new URL(chunkFile, inputs));
    assert.equal(sha256(bytes), manifest.chunk_sha256[chunkFile], `${chunkFile} byte fingerprint drifted`);
    const chunk = JSON.parse(bytes.toString("utf8"));
    assert.equal(chunk.chunk, index + 1);
    assert.equal(chunk.record_count, chunk.records.length);
    return chunk.records;
  });
  assert.equal(records.length, manifest.expected_records);
  return { manifest, records };
}

const correction = readPackage("sky-v4-continuous-corpus-correction-v1.json");
const correctionKeys = correction.records.map((row: any) => row.ContentKey);
assert.equal(new Set(correctionKeys).size, 120);
assert.deepEqual(
  [...correctionKeys].sort(),
  expectedPlanets.flatMap((planet) => expectedSigns.map((sign) => `sky-placement/article/${planet}/${sign}`)).sort()
);
assert.equal(correction.records.filter((row: any) => typeof row.PlacementArticle === "string").length, 2);
assert.deepEqual(
  correction.records.filter((row: any) => row.PlacementArticle).map((row: any) => row.ContentKey).sort(),
  ["sky-placement/article/mercury/virgo", "sky-placement/article/sun/virgo"]
);
for (const row of correction.records) {
  assert.ok(row.TLDRWhat?.trim());
  assert.ok(row.TLDRTakeaway?.trim());
  assert.ok(row.Fallback?.hook?.trim());
  assert.ok(row.Fallback?.lived?.trim());
  assert.ok(row.Fallback?.turn?.trim());
}

const lunar = readPackage("sky-v4-placement-lunar-context-v1.json");
const lunarKeys = lunar.records.map((row: any) => row.ContentKey);
assert.equal(new Set(lunarKeys).size, 40);
assert.deepEqual(
  [...lunarKeys].sort(),
  expectedPlanets.flatMap((planet) => expectedEvents.map((event) => `sky-placement/lunar-context/${event}/${planet}`)).sort()
);
for (const row of lunar.records) {
  assert.ok(row.FullPageBody?.trim());
  assert.ok(row.FallbackBody?.trim());
}

console.log("SKY V4 fallback/lunar release integrity passed: 120 continuous corrections, 2 article replacements, and 40 lunar contexts are hash-bound, owner-approved, and serving-enabled.");
