#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const bundleDir = "/private/tmp/tldrastro-content-wiring-qa";
const v2BundleFile = path.join(bundleDir, "source-grounded-v2.bundle.mjs");
const runtimeBundleFile = path.join(bundleDir, "source-grounded-runtime.bundle.mjs");

function repoFile(relativePath) {
  return path.join(repoRoot, relativePath);
}

function source(relativePath) {
  return fs.readFileSync(repoFile(relativePath), "utf8");
}

fs.mkdirSync(bundleDir, { recursive: true });

await build({
  bundle: true,
  entryPoints: [repoFile("apps/web/src/content/sourceGroundedV2.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: v2BundleFile,
  platform: "node"
});

await build({
  bundle: true,
  entryPoints: [repoFile("apps/web/src/content/sourceGroundedRuntime.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: runtimeBundleFile,
  platform: "node"
});

const v2Runtime = await import(`${pathToFileURL(v2BundleFile).href}?t=${Date.now()}`);
const runtime = await import(`${pathToFileURL(runtimeBundleFile).href}?t=${Date.now()}`);
const appSource = source("apps/web/src/App.tsx");
const calendarSource = source("apps/web/src/features/calendar/LunarCalendar.tsx");

const allowedAuthorities = new Set([
  "reviewed-exact",
  "approved-fallback",
  "factual-floor",
  "omitted"
]);

const readerLeakPatterns = [
  /\bSOURCE_GAP\b/u,
  /\bDRAFT\b/u,
  /\bInterpretation unavailable\b/iu,
  /\{\{|\}\}/u,
  /\bbody_sign_story\b/iu,
  /\bhouse_synthesis\b/iu,
  /\bcore_behavior\b/iu,
  /\bNeeds depth and control\b/u,
  /\bGuards the soft center\b/u,
  /\bgiving North Node a clear place\b/iu,
  /\bto have a clear place in the chart\b/iu,
  /\btakes over under pressure\b/iu,
  /\bthe other part of the contact\b/iu,
  /\blean on one response\b/iu,
  /\bThe problem is not that either side is wrong\b/u,
  /\bThey disagree about how you should respond\b/u,
  /\bputs .+ on different schedules\b/iu,
  /\bto take care of one\b/iu,
  /\bhas been neglected\b/iu
];

function textFromResult(result) {
  return [
    result.compactCopy,
    result.expandedCopy,
    ...Object.values(result.renderedFields ?? {}),
    ...(result.finalVisibleStrings ?? [])
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .join("\n\n");
}

function assertKnownAuthority(label, result) {
  assert.ok(
    allowedAuthorities.has(result.readerAuthority),
    `${label} returned unknown reader authority: ${result.readerAuthority}`
  );
}

function assertNoReaderLeaks(label, text) {
  for (const pattern of readerLeakPatterns) {
    assert.ok(!pattern.test(text), `${label} leaks internal/template copy matching ${pattern}: ${text}`);
  }
}

function assertSentenceLike(label, value, minWords = 12) {
  const text = String(value ?? "").trim();
  assert.ok(text, `${label} must render text`);
  assert.ok(/[.!?]$/u.test(text), `${label} must end with punctuation: ${text}`);
  assert.ok(text.split(/\s+/u).filter(Boolean).length >= minWords, `${label} is too thin: ${text}`);
  assertNoReaderLeaks(label, text);
}

function classify(result) {
  if (result.readerAuthority === "reviewed-exact") return "authored";
  if (result.readerAuthority === "omitted") return "omitted";
  return "fallback";
}

const checked = [];

function record(label, result) {
  assertKnownAuthority(label, result);
  assertNoReaderLeaks(label, textFromResult(result));
  checked.push({
    label,
    readerAuthority: result.readerAuthority,
    displayLayer: classify(result),
    fallbackId: result.fallbackId ?? null
  });
}

assert.doesNotMatch(
  appSource,
  /title:\s*renderedHeadline\s*\|\|\s*retrogradePlacementTitle\(position\)/u,
  "Sky retrograde detail pages must not replace the factual title with the authored headline."
);
assert.doesNotMatch(
  appSource,
  /\bcurrentSkyRetrogradeDetailData\b/u,
  "Retrograde cards and detail routes must not use a separate retrograde article renderer."
);
assert.match(
  appSource,
  /if \(detailType === "retrograde"[\s\S]*?currentSkyPlacementDetailArticle\(\{[\s\S]*?aspects: sky\.aspects[\s\S]*?position,[\s\S]*?positions: skyNodeDisplayPositions\(sky\.positions\)[\s\S]*?\}\) : null;/u,
  "Retrograde detail URLs must resolve through the same Sky placement article as Sky cards."
);
assert.match(
  appSource,
  /if \(event\.type === "station" && isRetrogradeEvent\) \{[\s\S]*?openSkyDetail\(currentSkyPlacementDetailArticle\(\{[\s\S]*?aspects: sky\.aspects[\s\S]*?position: eventPosition,[\s\S]*?positions: sky\.positions[\s\S]*?\}\)\);[\s\S]*?return;[\s\S]*?\}/u,
  "Retrograde station events must open the shared Sky placement article."
);
assert.match(
  appSource,
  /function RetrogradeCallout\([\s\S]*?const buildRetrogradeDetail = \(position: PlanetPosition\) => \{[\s\S]*?const detail = currentSkyPlacementDetailArticle\(\{[\s\S]*?aspects,[\s\S]*?position,[\s\S]*?positions[\s\S]*?\}\);/u,
  "Retrograde list rows must derive their detail from the shared Sky placement article."
);
assert.match(
  appSource,
  /<PlanetPlacementRow[\s\S]*?title=\{title\}[\s\S]*?variant="sky"/u,
  "Sky placement rows must pass the local factual row title through to PlanetPlacementRow."
);
assert.doesNotMatch(
  appSource,
  /title=\{natalPlacementTitle\(position\)\}[\s\S]*?variant="sky"/u,
  "Sky placement rows must not use natal placement titles."
);
assert.doesNotMatch(
  appSource,
  /function placementDetailTitle[\s\S]*return natalPlacementTitle\(position\)/u,
  "Sky placement detail titles must use factual sky titles, not natal placement title plumbing."
);
assert.match(
  appSource,
  /function placementDetailTitle[\s\S]*position\.motion === "retrograde"[\s\S]*retrogradePlacementTitle\(position\)/u,
  "Retrograde placement detail titles must stay factual instead of using authored quote/headline copy."
);
assert.match(
  appSource,
  /function stripRetrogradeDurationLeadIn[\s\S]*TODAY[\s\S]*left/u,
  "Retrograde body copy must strip duration/countdown lead-ins from rendered paragraphs."
);
assert.match(
  calendarSource,
  /function isSolarIngressTransit[\s\S]*event\?\.type === "ingress"[\s\S]*event\?\.planet === "Sun"/u,
  "Calendar wiring must identify solar ingress events before composing day-card copy."
);
assert.match(
  calendarSource,
  /surfacedTransitIsSolarIngress[\s\S]*section\.slot !== "season"/u,
  "Calendar day cards must not combine season prose with a surfaced solar-ingress transit body."
);

const mercuryRetrograde = v2Runtime.resolveSourceGroundedV2("sky.planet_sign", {
  currentBody: "Mercury",
  currentSign: "Cancer",
  motion: "retrograde",
  activeWindow: "Jun 29, 2026 - Jul 23, 2026"
}, "detail");
record("sky.planet_sign Mercury Rx in Cancer detail", mercuryRetrograde);
assert.equal(
  mercuryRetrograde.renderedFields.factualPlacementTitle,
  "Mercury Rx in Cancer",
  "Mercury retrograde resolver must expose the factual placement title."
);
assert.notEqual(
  mercuryRetrograde.renderedFields.factualPlacementTitle,
  "You do not owe every message an instant reply.",
  "Authored retrograde headlines must not become the placement title."
);

const mercuryParagraphs = runtime.sourceGroundedSkyPlacementParagraphs({
  planet: "Mercury",
  sign: "Cancer",
  motion: "retrograde"
}, "Jun 29, 2026 - Jul 23, 2026");
assert.ok(mercuryParagraphs.length >= 1, "Mercury Rx in Cancer runtime detail must render body paragraphs.");
assertNoReaderLeaks("Mercury Rx in Cancer runtime detail", mercuryParagraphs.join("\n\n"));
assert.ok(
  !mercuryParagraphs.join(" ").startsWith("Mercury Rx in Cancer"),
  "Mercury Rx in Cancer body paragraphs must not duplicate the factual page title."
);

const moonScorpioSixth = v2Runtime.resolveSourceGroundedV2("me.natal_placement", {
  degree: "12°47'",
  natalBody: "Moon",
  natalHouse: 6,
  natalSign: "Scorpio",
  ownerPerspective: "you",
  reliableBirthTime: true
}, "detail");
record("me.natal_placement Moon Scorpio 6h fallback", moonScorpioSixth);
assert.equal(
  moonScorpioSixth.readerAuthority,
  "approved-fallback",
  "Moon Scorpio 6h should use the fallback path when authored content is not selected."
);
assertSentenceLike(
  "Moon in Scorpio fallback section",
  moonScorpioSixth.renderedFields.planetSignFallbackStory,
  18
);
assertSentenceLike(
  "Moon in Scorpio in the 6th house fallback section",
  moonScorpioSixth.renderedFields.planetSignHouseFallbackStory,
  18
);

const neptuneNorthNode = v2Runtime.resolveSourceGroundedV2("me.natal_aspect", {
  aspect: "square",
  natalPointA: "Neptune",
  natalPointB: "North Node",
  orb: "2°"
}, "detail");
record("me.natal_aspect Neptune square North Node", neptuneNorthNode);
if (neptuneNorthNode.readerAuthority !== "omitted") {
  assertSentenceLike("Neptune square North Node detail", neptuneNorthNode.expandedCopy, 18);
}

const moonLilith = v2Runtime.resolveSourceGroundedV2("me.natal_aspect", {
  aspect: "square",
  natalPointA: "Moon",
  natalPointB: "Lilith",
  orb: "2°"
}, "detail");
record("me.natal_aspect Moon square Lilith", moonLilith);
assertNoReaderLeaks("Moon square Lilith detail", moonLilith.expandedCopy ?? "");

const skyAspect = v2Runtime.resolveSourceGroundedV2("sky.aspect", {
  pointA: "Chiron",
  aspect: "sextile",
  pointB: "Mercury",
  exactDate: "Jul 22, 2026",
  orb: "1°"
}, "detail");
record("sky.aspect Chiron sextile Mercury", skyAspect);
assert.equal(
  skyAspect.renderedFields.factualAspectTitle,
  "Chiron sextile Mercury",
  "Sky aspect detail must expose a factual aspect title."
);

const unsupportedPlacement = v2Runtime.resolveSourceGroundedV2("me.natal_placement", {
  natalBody: "Ceres",
  natalSign: "Ophiuchus",
  ownerPerspective: "you",
  reliableBirthTime: true
}, "detail");
record("unsupported natal placement", unsupportedPlacement);
assert.equal(
  unsupportedPlacement.readerAuthority,
  "omitted",
  "Unsupported natal placement source gaps should omit reader copy instead of synthesizing weak prose."
);
assert.deepEqual(
  unsupportedPlacement.finalVisibleStrings,
  [],
  "Unsupported natal placement source gaps should not render fallback body strings."
);

const visibleLayers = new Set(checked.filter((item) => item.displayLayer !== "omitted").map((item) => item.displayLayer));
assert.deepEqual(
  [...visibleLayers].sort(),
  ["fallback"],
  "This QA fixture set should expose only fallback reader surfaces; add separate authored fixtures when authored placement rows are promoted."
);

console.log(JSON.stringify({
  status: "PASS",
  script: "test-content-wiring-qa",
  checked
}, null, 2));
