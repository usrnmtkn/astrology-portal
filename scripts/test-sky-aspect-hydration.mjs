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
  /loadLiveGeneratedContentForKeys\(aspectContentKeys\)[\s\S]*?setSkyAspectContentStatus\("ready"\)/u,
  "The Sky page must hydrate current aspect keys before revealing the aspect hierarchy."
);
assert.match(
  appSource,
  /contentStatus === "loading"[\s\S]*?aria-label="Loading aspect write-ups"/u,
  "The aspects section must reserve a loading state instead of briefly presenting every aspect as factual-only."
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
    judgeGate: "auto-publish",
    model: "test",
    updatedAt: "2026-07-31T12:00:00.000Z"
  }];
}

const generatedContent = new Map([
  approvedContent({ first: "Venus", aspect: "square", second: "Mars", firstSign: "Virgo", secondSign: "Gemini" }),
  approvedContent({ first: "Sun", aspect: "opposition", second: "Pluto", firstSign: "Leo", secondSign: "Aquarius" })
]);

const editorial = aspects.filter(([first, aspect, second]) => resolveSkyAspectGeneratedContent({
  generatedContent,
  first,
  second,
  aspect,
  firstSign: positions.get(first),
  secondSign: positions.get(second),
  targetDate
}));

assert.equal(editorial.length, 2, "Two approved current-aspect rows must render as editorial cards.");
assert.equal(aspects.length - editorial.length, 19, "The remaining 19 calculated aspects must remain factual-only.");

console.log(JSON.stringify({
  editorialCards: editorial.length,
  factualCards: aspects.length - editorial.length,
  status: "PASS"
}, null, 2));
