#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_NATAL_CONTENT_FLAG,
  canonicalNatalContentEnabled,
  createCanonicalNatalAdapter
} from "../apps/web/src/content/canonicalContent/natalAdapter.ts";
import { createFallbackRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { createCanonicalContentResolver } from "../packages/astro-knowledge/canonical-content/src/resolver.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));

const legacyRenderer = {
  renderNatalPlacement() { return { headline: "legacy placement", body: "legacy placement", parts: ["legacy placement"] }; },
  renderNatalAspect() { return { headline: "legacy aspect", body: "legacy aspect", parts: ["legacy aspect"] }; },
  renderNatalEmptyHouse() { return { headline: "legacy empty", body: "legacy empty", parts: ["legacy empty"] }; }
};

assert.equal(canonicalNatalContentEnabled({}), false);
assert.equal(canonicalNatalContentEnabled({ [CANONICAL_NATAL_CONTENT_FLAG]: "0" }), false);
assert.equal(canonicalNatalContentEnabled({ [CANONICAL_NATAL_CONTENT_FLAG]: "true" }), true);
assert.strictEqual(createCanonicalNatalAdapter({ enabled: false, getCanonicalUnit() { throw new Error("must not read hub"); }, legacyRenderer }), legacyRenderer);
assert.strictEqual(createCanonicalNatalAdapter({ getCanonicalUnit() { throw new Error("must not read hub"); }, legacyRenderer }), legacyRenderer);

const calls = [];
function getCanonicalUnit(unitId, options) {
  calls.push({ unitId, options });
  const base = {
    headline: `${unitId} {{Name}}`,
    body: `${unitId} {{Name}}`,
    parts: [`${unitId} {{Name}}`]
  };
  return {
    identity: { unitId },
    resolution: { mode: "composed", canonicalRevisionId: `${unitId}@0` },
    content: {
      byPerspective: {
        you: { ...base, headline: unitId, body: unitId, parts: [unitId] },
        they: {
          ...base,
          variants: {
            card: base,
            detail: { headline: `detail ${unitId} {{Name}}`, body: `detail ${unitId} {{Name}}`, parts: [`detail ${unitId} {{Name}}`] }
          }
        }
      }
    },
    result: { status: "RESOLVED", renderEligible: true }
  };
}

const adapter = createCanonicalNatalAdapter({ enabled: true, getCanonicalUnit, legacyRenderer });
const placement = adapter.renderNatalPlacement({ planet: "True Node", sign: "Aries", house: 4, voice: "Marie" });
assert.deepEqual(calls.slice(0, 2).map((call) => call.unitId), [
  "natal/placement-sign/north-node/aries",
  "natal/placement-house/north-node/4"
]);
assert.equal(placement.body.includes("{{Name}}"), false);
assert.equal(placement.body.includes("Marie"), true);

adapter.renderNatalAspect({ planetA: "Venus", planetB: "Moon", aspect: "sext", voice: "you" });
assert.equal(calls.at(-1).unitId, "natal/aspect/moon/venus/sextile");

const empty = adapter.renderNatalEmptyHouse(
  { house: 4, sign: "Scorpio", primaryRuler: "Pluto", rulerHouse: 8, voice: "Marie" },
  { includeEmptyHouseBridge: true }
);
assert.equal(calls.at(-1).unitId, "natal/empty-house/4/scorpio/pluto-in-8");
assert.match(empty.body, /^detail /u);
assert.equal(empty.body.includes("Marie"), true);

assert.throws(
  () => adapter.renderNatalPlacement({ planet: "Mars", sign: "Aries", dignity: "domicile", voice: "you" }),
  /modifier overlays are outside Wave 1/u
);

// NATAL_RENDER_PARITY: exercise the real exported index through the enabled
// adapter and compare every in-scope reader field with the post-fix shipped
// renderer used to build migration revision zero.
const index = readJson("packages/astro-knowledge/canonical-content/index/canonical-content-index.json");
const sourceRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const templates = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const interim = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json");
const shipped = createFallbackRenderer(
  { templates: [...templates.templates, ...interim.templates] },
  { hookRows: sourceRows.hookRows, vocabularyRows: [...sourceRows.vocabularyRows, ...interim.vocabularyRows] }
);
const governed = createCanonicalNatalAdapter({
  enabled: true,
  getCanonicalUnit: createCanonicalContentResolver(index),
  legacyRenderer: shipped
});
const bodies = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron", "lilith", "north-node", "south-node"
];
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
const aspects = ["conjunction", "sextile", "square", "trine", "opposition"];
const modernRulers = {
  aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury",
  libra: "venus", scorpio: "pluto", sagittarius: "jupiter", capricorn: "saturn", aquarius: "uranus", pisces: "neptune"
};
const readerFields = (result) => ({ headline: result.headline, body: result.body, parts: result.parts });
const assertParity = (actual, expected, label) => assert.deepEqual(readerFields(actual), readerFields(expected), label);
const assertCallParity = (actual, expected, label) => {
  let actualResult;
  let expectedResult;
  let actualError;
  let expectedError;
  try { actualResult = actual(); } catch (error) { actualError = error; }
  try { expectedResult = expected(); } catch (error) { expectedError = error; }
  if (expectedError) {
    assert.match(String(expectedError), /SOURCE_GAP/u, `${label}: shipped failure must be a source gap.`);
    assert.match(String(actualError), /SOURCE_GAP/u, `${label}: governed path must preserve the source gap.`);
    return;
  }
  if (actualError) throw actualError;
  assertParity(actualResult, expectedResult, label);
};

for (const voice of ["you", "Marie"]) {
  for (const body of bodies) {
    for (const sign of signs) {
      assertParity(
        governed.renderNatalPlacement({ planet: body, sign, voice }),
        shipped.renderNatalPlacement({ planet: body, sign, voice }),
        `placement-sign parity: ${body}/${sign}/${voice}`
      );
      for (let house = 1; house <= 12; house += 1) {
        assertParity(
          governed.renderNatalPlacement({ planet: body, sign, house, voice }),
          shipped.renderNatalPlacement({ planet: body, sign, house, voice }),
          `placement sign+house parity: ${body}/${sign}/${house}/${voice}`
        );
      }
    }
  }

  for (let first = 0; first < bodies.length; first += 1) {
    for (let second = first + 1; second < bodies.length; second += 1) {
      if (bodies[first] === "north-node" && bodies[second] === "south-node") continue;
      for (const aspectName of aspects) {
        assertCallParity(
          () => governed.renderNatalAspect({ planetA: bodies[first], planetB: bodies[second], aspect: aspectName, voice }),
          () => shipped.renderNatalAspect({ planetA: bodies[first], planetB: bodies[second], aspect: aspectName, voice }),
          `aspect parity: ${bodies[first]}/${bodies[second]}/${aspectName}/${voice}`
        );
      }
    }
  }

  for (let house = 1; house <= 12; house += 1) {
    for (const sign of signs) {
      for (let rulerHouse = 1; rulerHouse <= 12; rulerHouse += 1) {
        if (rulerHouse === house) continue;
        const facts = { house, sign, primaryRuler: modernRulers[sign], rulerHouse, rulerSystem: "modern", voice };
        assertParity(
          governed.renderNatalEmptyHouse(facts),
          shipped.renderNatalEmptyHouse(facts),
          `empty-house card parity: ${house}/${sign}/${rulerHouse}/${voice}`
        );
        assertParity(
          governed.renderNatalEmptyHouse(facts, { includeEmptyHouseBridge: true }),
          shipped.renderNatalEmptyHouse(facts, { includeEmptyHouseBridge: true }),
          `empty-house detail parity: ${house}/${sign}/${rulerHouse}/${voice}`
        );
      }
    }
  }
}

console.log("Canonical natal adapter tests passed: flag-off delegation, fail-closed modifiers, and all Wave-1 reader fields have shipped parity.");
