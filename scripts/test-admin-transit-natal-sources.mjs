import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  renderTransitNatalPreview,
  transitNatalAspectFamily,
  transitNatalLabel,
  transitNatalSourceGroups
} from "../apps/admin/src/transitNatalSources.ts";

const selection = {
  planet: "uranus",
  sign: "gemini",
  transitHouse: "1",
  aspect: "square",
  natalPoint: "mercury",
  natalHouse: "10"
};

assert.equal(transitNatalLabel(selection), "Uranus square your Mercury");
assert.equal(transitNatalAspectFamily("uranus", "square"), "hard");
assert.equal(transitNatalAspectFamily("venus", "conjunction"), "soft");
assert.equal(transitNatalAspectFamily("pluto", "conjunction"), "hard");

const groups = transitNatalSourceGroups(selection);
assert.deepEqual(groups.map((group) => group.key), ["composition", "fallback"]);
assert.deepEqual(
  groups[0].sources.map((source) => source.id),
  ["frame", "transiting-sign", "natal-point", "lived-effect"]
);
assert.deepEqual(groups[0].sources[0].candidateKeys, [
  "fallback-hook/transit-house-event-frame/uranus",
  "fallback-hook/transit-house-event-frame/generic"
]);
assert.deepEqual(groups[0].sources[3].candidateKeys, [
  "fallback-hook/transit-house-event-scenes/uranus/mercury/hard",
  "fallback-hook/transit-effect-hard/uranus/mercury"
]);

const copy = new Map([
  [
    "fallback-hook/transit-house-event-frame/generic",
    "While {{transitTitle}} is in your {{houseOrdinal}} house, it is also {{aspectVerb}} your natal {{natalTitle}}{{windowClause}}."
  ],
  ["fallback-hook/transit-house-event-wants/uranus/gemini", "Uranus in Gemini keeps rewiring the conversation"],
  ["fallback-hook/transit-house-event-natal/mercury", "your Mercury keeps the words and the reasons"],
  [
    "fallback-hook/transit-effect-hard/uranus/mercury",
    "Conversations jump lanes and ideas arrive mid-sentence. You think better than usual and finish less than usual. Capture the lightning in notes and pick one idea to land."
  ]
]);
const preview = renderTransitNatalPreview(selection, (candidateKeys) => {
  const key = candidateKeys.find((candidate) => copy.has(candidate));
  return key ? { key, text: copy.get(key) } : null;
});

assert.equal(preview.complete, true);
assert.equal(preview.headline, "Uranus square your Mercury");
assert.equal(
  preview.body,
  "While Uranus is in your 1st house, it is also squaring your natal Mercury in your 10th house until the calculated end date. Uranus in Gemini keeps rewiring the conversation; your Mercury keeps the words and the reasons. Conversations jump lanes and ideas arrive mid-sentence. You think better than usual and finish less than usual. Capture the lightning in notes and pick one idea to land."
);
assert.deepEqual(preview.sourceKeys, [...copy.keys()]);

const incomplete = renderTransitNatalPreview(selection, (candidateKeys) => {
  const key = candidateKeys.find((candidate) => candidate !== "fallback-hook/transit-effect-hard/uranus/mercury" && copy.has(candidate));
  return key ? { key, text: copy.get(key) } : null;
});
assert.equal(incomplete.complete, false);
assert.deepEqual(incomplete.missing, ["Uranus to Mercury hard-aspect effect"]);

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const dashboard = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
assert.match(dashboard, /Personal Transits/u, "Sky Write-ups must expose the reader-facing Personal Transits workspace.");
assert.match(dashboard, /Personal Transits workspace/u, "The workspace must identify its reader-copy purpose.");
assert.match(dashboard, /renderTransitNatalPreview/u, "The workspace must show the assembled reader passage before its ingredients.");
assert.match(dashboard, /Edit source row/u, "Every resolved ingredient must open its individual source editor.");
assert.match(dashboard, /The app separately calculates and displays the natal sign, houses, dates, orb/u, "The workspace must keep runtime chart facts separate from editable prose.");
assert.match(dashboard, /Edit the exact You or Friends passage/u, "Editors must be directed to the exact reader passage before shared house-aware ingredients.");
assert.match(dashboard, /Personal Transit reader version/u, "The exact passage must provide an explicit You/Friends version switch.");
assert.match(dashboard, /Personal Transits require it in the first sentence/u, "Friends copy must explain its required name anchor.");
assert.match(dashboard, /Use the advanced house-aware section/u, "Shared house-aware ingredients must be clearly marked as an advanced path.");
assert.match(dashboard, /<span>Personal Transits<\/span>/u, "The left navigation must use the same reader-facing name as the workspace.");
assert.match(dashboard, /cms\/personal-transit-aspect/u, "The old CMS search term must route editors toward the assembled workspace.");

console.log("Transit-to-natal Content Studio source finder passed.");
