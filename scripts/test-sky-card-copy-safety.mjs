#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const bundleDir = "/private/tmp/tldrastro-sky-card-copy-safety";
const bundleFile = path.join(bundleDir, "source-grounded-v2.bundle.mjs");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");

fs.mkdirSync(bundleDir, { recursive: true });
await build({
  bundle: true,
  entryPoints: [path.join(repoRoot, "apps/web/src/content/sourceGroundedV2.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

const { resolveSourceGroundedV2 } = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);

const prohibitedVisiblePatterns = [
  /&(?:quot|#34|apos|#39|amp);/iu,
  /\bInterpretation unavailable\b/iu,
  /\bis active in the current sky\b/iu,
  /\bread that through\b/iu,
  /\bincluded only as a calculated condition\b/iu,
  /\bUse the most concrete part of that signal\b/iu,
  /\bbefore treating the whole season as a verdict\b/iu,
  /[{}]/u
];

function assertReaderSafe(label, text) {
  for (const pattern of prohibitedVisiblePatterns) {
    assert.ok(!pattern.test(text), `${label} must not expose ${pattern}`);
  }
}

const placements = [
  ["Sun", "Cancer"],
  ["Moon", "Cancer"],
  ["Mercury", "Cancer", "retrograde"],
  ["Venus", "Virgo"],
  ["Mars", "Gemini"],
  ["Jupiter", "Leo"],
  ["Saturn", "Aries"],
  ["Uranus", "Gemini"],
  ["Neptune", "Aries", "retrograde"],
  ["Pluto", "Aquarius", "retrograde"]
];

for (const [body, sign, motion] of placements) {
  const result = resolveSourceGroundedV2("sky.planet_sign", {
    currentBody: body,
    currentSign: sign,
    motion
  }, "card");
  const text = result.compactCopy
    || result.renderedFields.compactSummary
    || result.finalVisibleStrings.find(Boolean)
    || "";
  const label = `${body}${motion === "retrograde" ? " Rx" : ""} in ${sign}`;

  assertReaderSafe(`${label} card`, text);
  if (text) {
    assert.ok(/^[A-Z0-9“"']/u.test(text), `${label} card summary must start as a sentence: ${text}`);
  }
  assert.ok(!text.includes(";"), `${label} card must not expose semicolon source fragments`);
  assert.ok(!new RegExp(`^${body} in ${sign}:\\s*`, "iu").test(text), `${label} card summary must not duplicate the title prefix`);
  assert.ok(!/\b(?:SOURCE_GAP|DRAFT|Interpretation unavailable)\b/u.test(text), `${label} card must not expose editorial workflow labels`);
  if (body === "Sun" && sign === "Cancer") {
    assert.notEqual(text, "This summer’s waterworks will soak us all.", "Sun in Cancer must not be pinned to the legacy one-line card override");
  }
}

for (const [body, sign] of [
  ["Chiron", "Taurus"],
  ["Lilith", "Sagittarius"]
]) {
  const result = resolveSourceGroundedV2("sky.planet_sign", {
    currentBody: body,
    currentSign: sign
  }, "card");
  const text = result.compactCopy
    || result.renderedFields.compactSummary
    || result.finalVisibleStrings.find(Boolean)
    || "";

  assert.equal(text, "", `${body} in ${sign} must stay omitted until sky point placement copy is authored.`);
  assert.equal(result.readerAuthority, "omitted", `${body} in ${sign} must not claim approved fallback authority.`);
}

const detailFixtures = [
  ["Sun", "Cancer"],
  ["Mars", "Gemini"],
  ["Jupiter", "Leo"],
  ["Mercury", "Cancer", "retrograde"]
];

for (const [body, sign, motion] of detailFixtures) {
  const card = resolveSourceGroundedV2("sky.planet_sign", {
    currentBody: body,
    currentSign: sign,
    motion
  }, "card");
  const detail = resolveSourceGroundedV2("sky.planet_sign", {
    currentBody: body,
    currentSign: sign,
    motion,
    activeWindow: motion === "retrograde" ? "Jun 29, 2026 - Jul 23, 2026" : "Jun 28 - Aug 11"
  }, "detail");
  const label = `${body}${motion === "retrograde" ? " Rx" : ""} in ${sign}`;
  const cardText = [card.compactCopy, card.renderedFields.compactSummary, ...card.finalVisibleStrings].filter(Boolean).join(" ");
  const visibleCardText = card.compactCopy
    || card.renderedFields.compactSummary
    || card.finalVisibleStrings.find(Boolean)
    || "";
  const detailText = [detail.expandedCopy, detail.renderedFields.expandedNarrative, ...detail.finalVisibleStrings].filter(Boolean).join(" ");
  const detailParagraphs = detail.finalVisibleStrings.filter(Boolean);
  assertReaderSafe(`${label} detail`, detailText);
  assert.ok(visibleCardText !== detailText || detailText.length === 0, `${label} detail must not repeat compact card copy as its body`);
  if (motion !== "retrograde") {
    assert.ok(detailParagraphs.length >= 2, `${label} expanded detail must render at least two body paragraphs`);
    assert.ok(detailText.split(/\s+/u).filter(Boolean).length >= 24, `${label} expanded detail is too short to count as expanded copy: ${detailText}`);
  }
}

const natal = resolveSourceGroundedV2("me.natal_placement", {
  natalBody: "Sun",
  natalSign: "Aquarius",
  natalHouse: 9,
  ownerPerspective: "they",
  sect: "day",
  reliableBirthTime: true
}, "detail");
const natalText = [natal.expandedCopy, natal.renderedFields.integratedSignHouseStory, ...natal.finalVisibleStrings].filter(Boolean).join(" ");
assertReaderSafe("Sun Aquarius 9h natal detail", natalText);
assert.ok(!/belief, higher study, travel, publishing, philosophy, worldview, meaning/iu.test(natalText), "Natal detail must not print a house keyword list");
assert.ok(
  natalText.includes("Their sense of direction strengthens when they can think independently and contribute something useful to a larger group."),
  "Sun Aquarius 9h natal detail must keep the fuller source-backed lived-story clause"
);
assert.ok(
  natalText.includes("They may be the person who questions a rule everyone else blindly follows."),
  "Sun Aquarius 9h natal detail must keep the concrete recognizable-example clause"
);
assert.ok(
  appSource.includes("plainBody: sourceGroundedBody.length > 0"),
  "Sky placement detail pages must render source-grounded body paragraphs instead of showing a blank article shell"
);
assert.ok(
  appSource.includes("const rowSummary = sourceGroundedSummary || liveGeneratedSummary("),
  "Sky placement list cards must prefer source-grounded summaries over stale generated/CMS summaries"
);

console.log(`Sky card/detail and natal copy safety passed for ${placements.length} placements.`);
