#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const bundleDir = "/private/tmp/tldrastro-reader-fallback-surface-safety";
const bundleFile = path.join(bundleDir, "source-grounded-runtime.bundle.mjs");
const v2BundleFile = path.join(bundleDir, "source-grounded-v2.bundle.mjs");
const sourceGroundedRecords = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "apps/web/src/content/finalSourceGroundedDashboardRecords.json"), "utf8")
);
const legacyNatalAspectRecords = (sourceGroundedRecords.records ?? [])
  .filter((record) => String(record.canonicalKey ?? "").startsWith("dashboard.natal-aspect."));

assert.equal(
  legacyNatalAspectRecords.length,
  0,
  "legacy source-grounded natal aspect phrasebank rows must be removed from the static bundle so v3 fallback is used until true authored rows exist"
);

fs.mkdirSync(bundleDir, { recursive: true });
await build({
  bundle: true,
  entryPoints: [path.join(repoRoot, "apps/web/src/content/sourceGroundedRuntime.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});
await build({
  bundle: true,
  entryPoints: [path.join(repoRoot, "apps/web/src/content/sourceGroundedV2.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: v2BundleFile,
  platform: "node"
});

const runtime = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);
const v2Runtime = await import(`${pathToFileURL(v2BundleFile).href}?t=${Date.now()}`);

const unsafeReaderPatterns = [
  /&(?:quot|#34|apos|#39|amp);/iu,
  /\bInterpretation unavailable\b/iu,
  /\bSOURCE_GAP\b/u,
  /\bDRAFT\b/u,
  /\bis active in the current sky\b/iu,
  /\bstyle or condition\b/iu,
  /\beasiest to see\b/iu,
  /\bpatterns? show(?:s)? up\b/iu,
  /\bchoose the next concrete response\b/iu,
  /\bgiving North Node a clear place\b/iu,
  /\bThis pattern is active now\b/iu,
  /\bThis transit is active now\b/iu,
  /\bis active here\b/iu,
  /\bcurrent emphasis (?:is|may be) visible in timing, mood\b/iu,
  /\beveryday choices\b/iu,
  /\bcurrent emphasis is visible in timing, mood, and everyday choices\b/iu,
  /\beveryday choices while this contact is active\b/iu,
  /\bwhile this contact is active\b/iu,
  /\bmov(?:e|es|ing) through\b/iu,
  /\bcircumstances\b/iu,
  /\bKeywords:\b/u
];

function assertReaderSafe(label, text) {
  assert.ok(text.trim().length > 0, `${label} must render approved fallback copy`);
  for (const pattern of unsafeReaderPatterns) {
    assert.ok(!pattern.test(text), `${label} must not expose ${pattern}: ${text}`);
  }
}

const skyPlacements = [
  { planet: "Sun", sign: "Cancer", duration: "Jun 21 - Jul 22" },
  { planet: "Mars", sign: "Gemini", duration: "Jun 28 - Aug 11" },
  { planet: "Jupiter", sign: "Leo", duration: "Jun 30, 2026 - Jul 26, 2027" },
  { planet: "Neptune", sign: "Aries", motion: "retrograde", duration: "Jul 7, 2026 - Dec 12, 2026" },
  { planet: "Chiron", sign: "Taurus", duration: "Jun 19 - Sep 18" }
];

for (const placement of skyPlacements) {
  const label = `${placement.planet}${placement.motion === "retrograde" ? " Rx" : ""} in ${placement.sign}`;
  const summary = runtime.sourceGroundedSkyPlacementSummary(placement);
  const detail = runtime.sourceGroundedSkyPlacementParagraphs(placement, placement.duration).join("\n\n");
  assertReaderSafe(`${label} card`, summary);
  assertReaderSafe(`${label} detail`, detail);
  assert.ok(!new RegExp(`^${placement.planet}(?: Rx)? in ${placement.sign}:?\\b`, "iu").test(summary), `${label} summary must not duplicate the title`);
}

const aspectSummary = runtime.sourceGroundedSkyAspectSummary({
  focalPlanet: "Sun",
  aspect: "conjunction",
  otherPlanet: "Mercury",
  orb: "1°"
});
if (aspectSummary.trim()) {
  assertReaderSafe("Sun conjunction Mercury card", aspectSummary);
}
const aspectDetail = runtime.sourceGroundedSkyAspectParagraphs({
  focalPlanet: "Sun",
  aspect: "conjunction",
  otherPlanet: "Mercury",
  orb: "1°",
  timing: "Jul 12, 2026"
}).join("\n\n");
assertReaderSafe("Sun conjunction Mercury detail", aspectDetail);

const staleNatalPlacementSections = runtime.sourceGroundedNatalPlacementSections({
  natalSky: null,
  ownerPerspective: "you",
  position: {
    planet: "Sun",
    sign: "Aquarius",
    house: 9,
    longitude: 329.4167,
    degree: "29°25'",
    motion: "direct"
  }
});
assert.deepEqual(
  staleNatalPlacementSections,
  [],
  "stale ready natal placement rows must not outrank approved v2 fallback"
);

const moonScorpioSixthFallback = v2Runtime.resolveSourceGroundedV2("me.natal_placement", {
  degree: "12°47'",
  natalBody: "Moon",
  natalHouse: 6,
  natalSign: "Scorpio",
  ownerPerspective: "you",
  reliableBirthTime: true
});
assert.equal(moonScorpioSixthFallback.readerAuthority, "approved-fallback");
assert.match(
  moonScorpioSixthFallback.renderedFields.planetSignFallbackStory ?? "",
  /Moon is in Scorpio.+meaning you.+depth and honesty/us,
  "Moon in Scorpio fallback must render composed Planet in Sign prose instead of a raw source clause"
);
assert.match(
  moonScorpioSixthFallback.renderedFields.planetSignHouseFallbackStory ?? "",
  /6th house.+(?:work|health|routine|body|daily|service)/ius,
  "Moon in Scorpio 6th house fallback must render composed Planet in Sign in House prose"
);
assert.doesNotMatch(
  moonScorpioSixthFallback.expandedCopy ?? "",
  /(?:^|\n)(?:Needs depth and control|Guards the soft center)|works through Needs depth and control/u,
  "fallback reader output must not expose source/helper fragments as standalone final copy"
);

const thinNatalPlacementFallback = v2Runtime.resolveSourceGroundedV2("me.natal_placement", {
  natalBody: "Ceres",
  natalSign: "Ophiuchus",
  ownerPerspective: "you",
  reliableBirthTime: true
});
assert.equal(thinNatalPlacementFallback.status, "SOURCE_GAP");
assert.equal(thinNatalPlacementFallback.readerAuthority, "omitted");
assert.equal(
  thinNatalPlacementFallback.renderedFields.sourceMaterialStatus,
  "needs-source-material",
  "thin or missing source lanes must be flagged instead of composed into weak fallback prose"
);
assert.deepEqual(
  thinNatalPlacementFallback.finalVisibleStrings,
  [],
  "thin fallback source lanes must not render final reader copy"
);

const ascendantAriesFallback = v2Runtime.resolveSourceGroundedV2("me.natal_angle", {
  angle: "Ascendant",
  degree: "1°00'",
  sign: "Aries"
});
assert.equal(ascendantAriesFallback.readerAuthority, "approved-fallback");
assert.match(
  ascendantAriesFallback.expandedCopy ?? "",
  /rising sign.+doorway to your chart.+Ascendant is in Aries/is,
  "natal angle fallback must render composed v3 angle prose"
);
assert.doesNotMatch(
  ascendantAriesFallback.expandedCopy ?? "",
  /\{\{|\}\}|SOURCE_GAP/u,
  "natal angle fallback must not expose template slots or source-gap text"
);

const sunSquareMoonFallback = v2Runtime.resolveSourceGroundedV2("me.natal_aspect", {
  aspect: "square",
  natalPointA: "Sun",
  natalPointB: "Moon",
  orb: "2°"
});
assert.equal(sunSquareMoonFallback.readerAuthority, "approved-fallback");
assert.match(
  sunSquareMoonFallback.expandedCopy ?? "",
  /That is your Sun square your Moon: identity and emotion .+friction/is,
  "natal aspect fallback must render composed v3 aspect prose"
);
assert.doesNotMatch(
  sunSquareMoonFallback.expandedCopy ?? "",
  /\{\{|\}\}|SOURCE_GAP/u,
  "natal aspect fallback must not expose template slots or source-gap text"
);

const unsupportedNatalAspectFallback = v2Runtime.resolveSourceGroundedV2("me.natal_aspect", {
  aspect: "quincunx",
  natalPointA: "Sun",
  natalPointB: "Moon",
  orb: "2°"
});
assert.equal(unsupportedNatalAspectFallback.readerAuthority, "omitted");
assert.equal(
  unsupportedNatalAspectFallback.renderedFields.sourceMaterialStatus,
  "needs-source-material",
  "unsupported natal aspect fallbacks must be flagged instead of composed through legacy helpers"
);

const integratedNatalPlacementSections = runtime.sourceGroundedNatalPlacementSections({
  natalSky: null,
  ownerPerspective: "you",
  position: {
    planet: "Moon",
    sign: "Scorpio",
    house: 6,
    longitude: 222.7833,
    degree: "12°47'",
    motion: "direct"
  }
});
assert.equal(
  integratedNatalPlacementSections.length,
  1,
  "reviewed natal placement helper must return only authored full-copy rows; the app normalizer fills missing sections from fallback"
);
assert.equal(integratedNatalPlacementSections[0]?.heading, "Moon in Scorpio in the 6th house");
assert.match(
  integratedNatalPlacementSections[0]?.body ?? "",
  /Your Moon in Scorpio in the 6th house makes emotional safety depend on trust, privacy/u,
  "integrated natal placement must prefer reviewed full-copy records"
);
assert.match(
  integratedNatalPlacementSections[0]?.body ?? "",
  /routines, workload, and sense of usefulness become the places where hidden pressure shows up first\./u,
  "integrated natal placement must render the full reviewed placement interpretation"
);
assert.doesNotMatch(
  integratedNatalPlacementSections.map((section) => section.body).join("\n\n"),
  /Your feelings run deep and private|you settle emotionally when the routine works/u,
  "helper clauses must not be promoted as authored placement write-ups"
);

const sourceFiles = [
  "apps/web/src/services/careerArchetype.ts",
  "apps/web/src/components/charts/SoulRoadmapCard.tsx",
  "apps/web/src/features/calendar/LunarCalendar.tsx"
];

for (const relativePath of sourceFiles) {
  const text = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  assert.ok(!/\bdescribes\b/i.test(text), `${relativePath} must not ship reader fallback copy using "describes"`);
  assert.ok(!/\bKeywords:\b/.test(text), `${relativePath} must not ship keyword-list reader copy`);
  assert.ok(!/\bmov(?:e|es|ing) through\b/i.test(text), `${relativePath} must not ship "move through" reader fallback copy`);
}

console.log("reader fallback surface safety passed");
