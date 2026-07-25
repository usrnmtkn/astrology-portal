import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const signs = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function normalizeSign(value) {
  return String(value ?? "").trim().toLowerCase();
}

function paragraphs(text) {
  return String(text ?? "")
    .trim()
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function compatibilityKey(readerSign, otherSign) {
  return `compatibility.moon.${readerSign}.${otherSign}`;
}

const library = readJson("tldr-astro-phrasebank/phrasebank/moon-compatibility-library.json");
const generatedRows = readJson("scripts/generated/compatibility-dashboard-rows.json");
const fallbackV3Rows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");

assert.equal(Array.isArray(library), true, "Moon compatibility library must be an array.");
assert.equal(library.length, 144, "Moon compatibility library must include all 144 directional pairs.");
assert.equal(generatedRows.planet, "moon", "Generated compatibility dashboard rows must currently materialize Moon.");
assert.equal(generatedRows.rows.length, 144, "Generated compatibility dashboard rows must include all 144 Moon pairs.");
assert.match(appSource, /transitSynastryFallbackRendererV3\.renderCompat\(\{/, "The app must resolve compatibility copy through the V3 renderer.");
assert.doesNotMatch(appSource, /moonCompatibilityLibrary|compatibilityRenderedLibraryManifest|renderedCompatibilityLibraryEntry/, "The app must not use the retired direct compatibility-library path.");

const sourceByKey = new Map();
const rowByKey = new Map(generatedRows.rows.map((row) => [row.content_key, row]));
const runtimeRowByKey = new Map(
  fallbackV3Rows.authoredCards
    .filter((row) => row.contentKey.startsWith("authored/compat-deep/moon/"))
    .map((row) => [row.contentKey, row])
);

assert.equal(runtimeRowByKey.size, 144, "The V3 runtime package must include all 144 directional Moon pairs.");

for (const record of library) {
  const readerSign = normalizeSign(record.reader_moon);
  const otherSign = normalizeSign(record.other_moon);
  const key = compatibilityKey(readerSign, otherSign);
  const body = String(record.text ?? "").trim();

  assert.equal(record.format, "multi-paragraph", `${key} must be a rendered multi-paragraph record.`);
  assert.equal(paragraphs(body).length, 4, `${key} must contain exactly four rendered paragraphs.`);
  assert.match(body, /\{friend\}/, `${key} must preserve the {friend} placeholder for runtime interpolation.`);
  assert.equal(sourceByKey.has(key), false, `${key} must be unique.`);
  sourceByKey.set(key, record);

  const generatedRow = rowByKey.get(key);
  assert.ok(generatedRow, `${key} must be present in generated dashboard rows.`);
  assert.equal(generatedRow.body, body, `${key} generated dashboard body must match the rendered source exactly.`);
  assert.equal(generatedRow.status, "LIVE", `${key} generated dashboard row must be LIVE.`);
  assert.equal(generatedRow.provider, "moon-compatibility-library-materialization", `${key} generated row must identify the Moon library materializer.`);
  assert.equal(generatedRow.source_snapshot?.sourceFile, "moon-compatibility-library.json", `${key} generated row must point at the Moon library source.`);
  assert.equal(generatedRow.source_snapshot?.sourceType, "authored-rendered-compatibility-library", `${key} generated row must not use the old draft-card source type.`);
  assert.equal(generatedRow.facts?.relationTagSeed, record.tag, `${key} generated row must keep the package tag as relation-chip seed metadata.`);

  const runtimeKey = `authored/compat-deep/moon/${readerSign}/${otherSign}`;
  const runtimeRow = runtimeRowByKey.get(runtimeKey);
  assert.ok(runtimeRow, `${runtimeKey} must be present in the V3 serving package.`);
  assert.equal(paragraphs(runtimeRow.body).length, 4, `${runtimeKey} must preserve the four-paragraph compatibility structure.`);
  assert.match(runtimeRow.body, /\{\{other_name\}\}/, `${runtimeKey} must use the V3 name placeholder.`);
  assert.equal(runtimeRow.review_status, "approved", `${runtimeKey} must remain reader-eligible.`);
  assert.ok(runtimeRow.source_keys?.includes("MOON-COMPATIBILITY-CARDS-RESOLVED.md"), `${runtimeKey} must retain Moon-library provenance.`);
}

for (const readerSign of signs) {
  for (const otherSign of signs) {
    const key = compatibilityKey(readerSign, otherSign);

    assert.ok(sourceByKey.has(key), `${key} must exist in the source library.`);
    assert.ok(rowByKey.has(key), `${key} must exist in generated dashboard rows.`);
  }
}

console.log("Moon compatibility library import passed.");
