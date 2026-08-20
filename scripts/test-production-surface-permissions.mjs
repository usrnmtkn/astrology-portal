#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const phraseResolver = require("../packages/astro-knowledge/scripts/phrase-resolver.js");
const {
  compileFriendsTransitSceneContext
} = require("../packages/astro-knowledge/scripts/friends-transit-scene-context.js");

const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const friendsRegistry = readJson("packages/astro-knowledge/config/friends-transit-scene-licenses-v3.json");
const dailyRegistry = readJson("packages/astro-knowledge/config/daily-glance-scene-licenses-v1.json");

for (const surface of ["sky", "you-transit", "natal", "synastry", "composite", "relationship", "report"]) {
  const selection = phraseResolver.selectPhrases("transit-aspect/saturn/sun/square", { surface });
  phraseResolver.assertPhraseEvidence(selection);
  assert.equal(selection.availableLines.length, 0, `Friends PHRASE lines leaked into ${surface}`);
  assert.equal(selection.components.exact.length, 0, `Friends PHRASE components leaked into ${surface}`);
  assert.equal(selection.components.related.length, 0, `Friends related PHRASE components leaked into ${surface}`);
}

assert.equal(friendsRegistry.surface, "friends-transit");
assert.equal(friendsRegistry.licenses.length, 12);
assert.ok(friendsRegistry.licenses.every((license) => (
  license.approval.status === "review_needed"
  && license.approval.ownerApproved === false
  && license.approval.writerEligible === false
  && license.approval.renderEligible === false
)));

const unknownTime = {
  surface: "friends-transit",
  kind: "aspect",
  calculationResolved: true,
  transitPlanet: "Jupiter",
  transitSign: "Gemini",
  transitHouse: 2,
  natalPoint: "Mercury",
  natalSign: "Virgo",
  natalHouse: 4,
  aspect: "square",
  housesReliable: false,
  angleContext: { ascendant: "Taurus", midheaven: "Aquarius" },
  rulershipDiagnostics: { chartRuler: "Venus" }
};
const fallback = compileFriendsTransitSceneContext(unknownTime, { registry: friendsRegistry });
assert.equal(fallback.canGenerateContextualCandidate, false);
assert.equal(fallback.fallback.selected, "universal-exact-aspect-base");
assert.equal(fallback.chartContext.transitHouse, null);
assert.equal(fallback.chartContext.natalHouse, null);
assert.equal(fallback.chartContext.angleContext, null);
assert.equal(fallback.chartContext.rulershipDiagnostics, null);
assert.equal(fallback.diagnostics.rulershipGrantsPermissions, false);
assert.ok(Object.values(fallback.permissions).every((value) => Object.keys(value).length === 0));

assert.throws(
  () => compileFriendsTransitSceneContext({ ...unknownTime, housesReliable: true }, { registry: dailyRegistry }),
  /Registry surface must be friends-transit/u,
  "Daily Glance licenses must not cross onto Friends"
);

let providerCalls = 0;
if (fallback.canGenerateContextualCandidate && fallback.writerBoundary.enabled) providerCalls += 1;
assert.equal(providerCalls, 0, "unapproved Friends proposals must block before billing");

console.log(JSON.stringify({
  status: "pass",
  nonFriendsSurfacesIsolatedFromFriendsPhraseEvidence: 7,
  friendsHouseLicenseProposalsExecutable: 0,
  unknownTimeFallback: fallback.fallback.selected,
  crossSurfaceLicenseReuseBlocked: true,
  providerCallsMade: providerCalls
}, null, 2));
