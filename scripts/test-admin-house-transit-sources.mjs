import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  houseTransitLabel,
  houseTransitSourceGroups,
  renderHouseTransitPreview
} from "../apps/admin/src/houseTransitSources.ts";

const selection = {
  planet: "uranus",
  sign: "gemini",
  house: "1",
  motion: "direct"
};

assert.equal(houseTransitLabel(selection), "Uranus through your 1st house");
const groups = houseTransitSourceGroups(selection);
assert.deepEqual(groups.map((group) => group.key), ["composition", "alternate"]);
assert.deepEqual(groups[0].sources.map((source) => source.id), ["house-core", "sign-synthesis"]);
assert.deepEqual(groups[0].sources[0].candidateKeys, ["authored/transit-house-intro/uranus/1"]);
assert.deepEqual(groups[0].sources[1].candidateKeys, ["authored/transit-house-sign/uranus/1/gemini"]);

const copy = new Map([
  ["authored/transit-house-intro/uranus/1", "Over the next several years, the pull is toward freedom: old roles stop fitting."],
  ["authored/transit-house-sign/uranus/1/gemini", "Uranus in Gemini changes how you introduce yourself, speak up, and choose what comes next."]
]);
const preview = renderHouseTransitPreview(selection, (candidateKeys) => {
  const key = candidateKeys.find((candidate) => copy.has(candidate));
  return key ? { key, text: copy.get(key) } : null;
});
assert.equal(preview.complete, true);
assert.equal(preview.headline, "Uranus through your 1st house");
assert.equal(
  preview.body,
  "Over the next several years, the pull is toward freedom: old roles stop fitting.\n\nUranus in Gemini changes how you introduce yourself, speak up, and choose what comes next."
);
assert.deepEqual(preview.sourceKeys, [...copy.keys()]);

const retrogradeSelection = { ...selection, motion: "retrograde" };
const retrogradeGroups = houseTransitSourceGroups(retrogradeSelection);
assert.deepEqual(retrogradeGroups[0].sources.map((source) => source.id), ["house-core", "sign-synthesis", "retrograde"]);
const retrogradePreview = renderHouseTransitPreview(retrogradeSelection, (candidateKeys) => {
  const key = candidateKeys.find((candidate) => copy.has(candidate));
  return key ? { key, text: copy.get(key) } : null;
});
assert.equal(retrogradePreview.complete, true, "an optional retrograde overlay must not block the evergreen House Transit");
assert.deepEqual(retrogradePreview.optionalMissing, ["Uranus retrograde overlay"]);

const legacy = new Map([
  ["authored/transit-house/uranus/1", "The complete legacy Uranus-through-the-1st-house passage."]
]);
const legacyPreview = renderHouseTransitPreview(selection, (candidateKeys) => {
  const key = candidateKeys.find((candidate) => legacy.has(candidate));
  return key ? { key, text: legacy.get(key) } : null;
});
assert.equal(legacyPreview.complete, true);
assert.equal(legacyPreview.body, "The complete legacy Uranus-through-the-1st-house passage.");

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const dashboard = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
assert.match(dashboard, /House Transits/u, "Sky Write-ups must expose the House Transits workspace.");
assert.match(dashboard, /House Transits workspace/u, "The workspace must use reader-facing House Transit language.");
assert.match(dashboard, /renderHouseTransitPreview/u, "The complete reader card must appear before its source passages.");
assert.match(dashboard, /Effective House Transit reader preview/u, "The House Transit workspace must label its assembled preview.");
assert.match(dashboard, /Personal Transits \(Transit to Natal\)/u, "Content Library categories must expose both transit source systems by name.");

console.log("House Transit Content Studio source finder passed.");
