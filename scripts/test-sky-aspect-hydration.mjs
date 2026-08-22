#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleFile = path.join(os.tmpdir(), "tldrastro-sky-aspect-hydration.bundle.mjs");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

await build({
  bundle: true,
  define: {
    "import.meta.env": "{}"
  },
  entryPoints: [path.join(repoRoot, "apps/web/src/services/skyAspectContent.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

const {
  resolveSkyAspectGeneratedContent,
  skyAspectGeneratedContentKeys
} = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);

const generatedContentSource = read("apps/web/src/services/generatedContent.ts");
const appSource = read("apps/web/src/App.tsx");

assert.match(
  generatedContentSource,
  /export async function loadLiveGeneratedContentForKeys[\s\S]*?\.in\("content_key", batch\)/u,
  "Targeted hydration must query only the requested exact content keys."
);
assert.match(
  appSource,
  /const personalTransitAspectContentKeys = skyPlacementPersonalizationTransits\.flatMap[\s\S]*?cmsSurfaceKeys\.transitAspect[\s\S]*?const currentSkyContentKeys = \[[\s\S]*?\.\.\.personalTransitAspectContentKeys[\s\S]*?loadLiveGeneratedContentForKeys\(currentSkyContentKeys\)[\s\S]*?setSkyGeneratedContent\(mergeGeneratedContentMaps\(content, normalizedSkySnapshotContent\)\)/u,
  "The Sky page must hydrate current collective keys and personalized natal-aspect CMS keys, then merge live copy into the visible fallback cards."
);
assert.match(
  appSource,
  /if \(mode === "calendar"\)[\s\S]*?calendarContentRequest\.contentKeys\.filter[\s\S]*?loadLiveGeneratedContentForKeys\(missingKeys\)/u,
  "Calendar must use its own exact-key request instead of scanning the Sky surface."
);
assert.doesNotMatch(
  appSource,
  /loadLiveGeneratedContent\("sky"/u,
  "Neither Sky nor Calendar may scan the broad Sky content surface."
);
assert.doesNotMatch(
  appSource,
  /SkyAspectContentStatus|contentStatus === "loading"[\s\S]*?aria-label="Loading aspect write-ups"/u,
  "Major aspect cards must remain visible while live copy hydrates."
);

const targetDate = "2026-07-31";
const positions = new Map([
  ["Sun", "Leo"],
  ["Moon", "Pisces"],
  ["Mercury", "Cancer"],
  ["Venus", "Virgo"],
  ["Mars", "Gemini"],
  ["Jupiter", "Leo"],
  ["Saturn", "Aries"],
  ["Uranus", "Gemini"],
  ["Neptune", "Aries"],
  ["Pluto", "Aquarius"],
  ["Chiron", "Taurus"],
  ["Lilith", "Sagittarius"],
  ["North Node", "Aquarius"]
]);
const aspects = [
  ["Venus", "square", "Mars"],
  ["Sun", "opposition", "Pluto"],
  ["Sun", "conjunction", "Jupiter"],
  ["Sun", "sextile", "Mars"],
  ["Moon", "trine", "Mercury"],
  ["Moon", "square", "Uranus"],
  ["Mercury", "sextile", "Venus"],
  ["Mercury", "square", "Saturn"],
  ["Venus", "trine", "Pluto"],
  ["Mars", "sextile", "Jupiter"],
  ["Mars", "square", "Neptune"],
  ["Jupiter", "trine", "Saturn"],
  ["Jupiter", "sextile", "Uranus"],
  ["Saturn", "conjunction", "Neptune"],
  ["Saturn", "sextile", "Pluto"],
  ["Uranus", "sextile", "Neptune"],
  ["Uranus", "trine", "Pluto"],
  ["Neptune", "sextile", "Pluto"],
  ["Chiron", "sextile", "North Node"],
  ["Lilith", "trine", "Saturn"],
  ["North Node", "opposition", "Jupiter"]
];

function approvedContent({ first, aspect, second, firstSign, secondSign }) {
  const [contentKey] = skyAspectGeneratedContentKeys({
    first,
    aspect,
    second,
    firstSign,
    secondSign,
    targetDate
  });
  const bodyOrder = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "lilith", "nodes"];
  const normalizeBody = (value) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return ["north-node", "south-node", "true-node", "node", "nodes", "lunar-nodes"].includes(slug) ? "nodes" : slug;
  };
  const a0 = normalizeBody(first);
  const b0 = normalizeBody(second);
  const reversed = bodyOrder.indexOf(a0) > bodyOrder.indexOf(b0);
  const [a, b, signA, signB] = reversed
    ? [b0, a0, secondSign.toLowerCase(), firstSign.toLowerCase()]
    : [a0, b0, firstSign.toLowerCase(), secondSign.toLowerCase()];

  return [contentKey, {
    id: contentKey,
    contentKey,
    surface: "sky",
    mode: "feed",
    status: "LIVE",
    eventType: "current-sky-aspect",
    targetDate: null,
    headline: `${first} ${aspect} ${second}`,
    summary: null,
    body: "A familiar pressure becomes visible in the room. One instinct pushes while another resists, and the reaction exposes what has been running underneath.",
    sections: null,
    blockType: "sky_aspect",
    provider: "test",
    sourceSnapshot: {
      pairSource: `data/pairs/${a}-${b}.json`,
      pairKey: `${a}-${b}`,
      cardFacts: { a, b, aspect, signA, signB },
      skyAspectVoiceLint: { score: 3, fails: 0 }
    },
    judgeScore: 3,
    judgeGate: "human-review",
    model: "test",
    updatedAt: "2026-07-31T12:00:00.000Z"
  }];
}

const generatedContent = new Map([
  approvedContent({ first: "Venus", aspect: "square", second: "Mars", firstSign: "Virgo", secondSign: "Gemini" }),
  approvedContent({ first: "Sun", aspect: "opposition", second: "Pluto", firstSign: "Leo", secondSign: "Aquarius" })
]);

const [autoPublishKey, autoPublishRow] = approvedContent({
  first: "Moon",
  aspect: "trine",
  second: "Mercury",
  firstSign: "Pisces",
  secondSign: "Cancer"
});
const legacyAutoPublishContent = new Map([[autoPublishKey, {
  ...autoPublishRow,
  judgeGate: "auto-publish"
}]]);
assert.equal(resolveSkyAspectGeneratedContent({
  generatedContent: legacyAutoPublishContent,
  first: "Moon",
  second: "Mercury",
  aspect: "trine",
  firstSign: "Pisces",
  secondSign: "Cancer",
  targetDate
}), null, "A legacy auto-publish score must not substitute for explicit human approval.");

const hydrated = aspects.filter(([first, aspect, second]) => resolveSkyAspectGeneratedContent({
  generatedContent,
  first,
  second,
  aspect,
  firstSign: positions.get(first),
  secondSign: positions.get(second),
  targetDate
}));

assert.equal(hydrated.length, 2, "Two approved current-aspect rows must replace their fallback card copy.");
assert.equal(aspects.length - hydrated.length, 19, "The remaining 19 major aspects must keep their normal fallback cards.");

console.log(JSON.stringify({
  hydratedCards: hydrated.length,
  fallbackCards: aspects.length - hydrated.length,
  totalMajorAspectCards: aspects.length,
  status: "PASS"
}, null, 2));
