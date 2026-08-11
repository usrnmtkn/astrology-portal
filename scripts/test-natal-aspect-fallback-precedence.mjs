#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFallbackRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderNatalAspect as renderNodeNatalAspect } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const sourceRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const templates = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const placementInterim = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json");
const browser = createFallbackRenderer(
  { templates: [...templates.templates, ...placementInterim.templates] },
  {
    hookRows: sourceRows.hookRows,
    vocabularyRows: [...sourceRows.vocabularyRows, ...placementInterim.vocabularyRows],
  },
);

const readerEligible = new Set(["approved", "approved_reuse", "reviewed"]);
const pairKeys = [...new Set(sourceRows.hookRows
  .filter((row) => (
    readerEligible.has(row.review_status)
    && row.contentKey.startsWith("fallback-hook/aspect-pair/")
  ))
  .map((row) => row.contentKey))];
const aspectsByGroup = {
  conjunction: ["conjunction"],
  hard: ["square", "opposition"],
  soft: ["trine", "sextile"],
};
const canonicalPair = (planetA, planetB) => [planetA, planetB].sort().join("|");
const exactSextilePairs = new Set(sourceRows.hookRows
  .filter((row) => (
    readerEligible.has(row.review_status)
    && row.contentKey.startsWith("fallback-hook/natal-aspect-lived/")
    && row.contentKey.split("/")[3] === "sextile"
  ))
  .map((row) => {
    const [, , planetA, , planetB] = row.contentKey.split("/");
    return canonicalPair(planetA, planetB);
  }));
const pairSpecificFallbackKeys = pairKeys.filter((contentKey) => {
  const [, , planetA, planetB] = contentKey.split("/");
  return !exactSextilePairs.has(canonicalPair(planetA, planetB));
});
const governedSextilePairs = new Map();
for (const contentKey of pairKeys.filter((key) => key.endsWith("/soft"))) {
  const [, , planetA, planetB] = contentKey.split("/");
  governedSextilePairs.set(canonicalPair(planetA, planetB), [planetA, planetB]);
}
for (const pair of exactSextilePairs) {
  governedSextilePairs.set(pair, pair.split("|"));
}

assert.ok(pairKeys.length > 0, "The regression corpus must include pair-specific natal aspect rows.");
assert.ok(
  pairSpecificFallbackKeys.includes("fallback-hook/aspect-pair/chiron/mercury/soft"),
  "Chiron sextile Mercury must remain in the pair-specific fallback regression set.",
);

for (const contentKey of pairKeys) {
  const [, , planetA, planetB, group] = contentKey.split("/");
  for (const aspect of aspectsByGroup[group] ?? []) {
    for (const [first, second] of [[planetA, planetB], [planetB, planetA]]) {
      for (const voice of ["you", "Alex"]) {
        const facts = { planetA: first, aspect, planetB: second, voice };
        const nodeResult = renderNodeNatalAspect(facts);
        const browserResult = browser.renderNatalAspect(facts);
        assert.notEqual(
          nodeResult.templateKey,
          `fallback-hook/aspect-lived/${aspect}`,
          `${voice}: ${first} ${aspect} ${second}: generic aspect copy must not shadow a natal pair in Node.`,
        );
        assert.notEqual(
          browserResult.templateKey,
          `fallback-hook/aspect-lived/${aspect}`,
          `${voice}: ${first} ${aspect} ${second}: generic aspect copy must not shadow a natal pair in the browser.`,
        );
        assert.equal(browserResult.templateKey, nodeResult.templateKey, `${voice}: ${first} ${aspect} ${second}: resolver keys must match.`);
        assert.equal(browserResult.body, nodeResult.body, `${voice}: ${first} ${aspect} ${second}: resolver bodies must match.`);
      }
    }
  }
}

let governedSextileRenders = 0;
let governedSextileSourceGaps = 0;
for (const [pair, [planetA, planetB]] of governedSextilePairs) {
  for (const [first, second] of [[planetA, planetB], [planetB, planetA]]) {
    for (const voice of ["you", "Alex"]) {
      const facts = { planetA: first, aspect: "sextile", planetB: second, voice };
      for (const [runtime, render] of [
        ["Node", renderNodeNatalAspect],
        ["browser", (input) => browser.renderNatalAspect(input)],
      ]) {
        let result;
        try {
          result = render(facts);
        } catch (error) {
          assert.match(
            String(error),
            /SOURCE_GAP: natal aspect/u,
            `${runtime} ${voice}: ${pair} may resolve pair-specific copy or fail closed, but must not escape with another error.`,
          );
          governedSextileSourceGaps += 1;
          continue;
        }
        governedSextileRenders += 1;
        assert.notEqual(
          result.templateKey,
          "fallback-hook/aspect-lived/sextile",
          `${runtime} ${voice}: governed natal sextile ${pair} must never use generic sextile prose.`,
        );
        assert.doesNotMatch(
          result.body,
          /A sextile is an opportunity that is easy to use if you take it/u,
          `${runtime} ${voice}: governed natal sextile ${pair} leaked the generic sextile paragraph.`,
        );
      }
    }
  }
}

const screenshotRegressions = [
  {
    planetA: "moon",
    planetB: "venus",
    expectedYou: /^You have a knack for making people and places feel good,/u,
    expectedThey: /^They have a knack for making people and places feel good,/u,
  },
  {
    planetA: "moon",
    planetB: "north-node",
    expectedYou: /^Your instincts are quietly aligned with your path:/u,
    expectedThey: /^Their instincts are quietly aligned with their path:/u,
  },
];

for (const regression of screenshotRegressions) {
  for (const render of [renderNodeNatalAspect, (facts) => browser.renderNatalAspect(facts)]) {
    const you = render({ ...regression, aspect: "sextile", voice: "you" });
    const friend = render({ ...regression, aspect: "sextile", voice: "Alex" });
    assert.match(you.body, regression.expectedYou);
    assert.match(friend.body, regression.expectedThey);
  }
}

const chironMercury = renderNodeNatalAspect({
  planetA: "chiron",
  aspect: "sextile",
  planetB: "mercury",
  voice: "you",
});
assert.equal(chironMercury.templateKey, "fallback-template/natal.aspect");
assert.match(chironMercury.body, /^You explain hard things kindly,/u);
assert.doesNotMatch(chironMercury.body, /A sextile is an opportunity/u);

const chironMercuryThey = browser.renderNatalAspect({
  planetA: "mercury",
  aspect: "sextile",
  planetB: "chiron",
  voice: "Alex",
});
assert.equal(chironMercuryThey.templateKey, "fallback-template/natal.aspect");
assert.match(chironMercuryThey.body, /^They explain hard things kindly,/u);

for (const render of [renderNodeNatalAspect, (facts) => browser.renderNatalAspect(facts)]) {
  for (const voice of ["you", "Alex"]) {
    assert.throws(
      () => render({ planetA: "chiron", aspect: "sextile", planetB: "part-of-fortune", voice }),
      /SOURCE_GAP: natal aspect pair/u,
      `${voice}: a missing natal pair must fail closed instead of selecting generic sextile prose.`,
    );
    assert.throws(
      () => render({ planetA: "chiron", aspect: "quincunx", planetB: "mercury", voice }),
      /SOURCE_GAP: natal aspect/u,
      `${voice}: an unsupported natal aspect must fail closed instead of selecting generic quincunx prose.`,
    );
  }
}

console.log(`Natal aspect fallback isolation passed: ${pairKeys.length} natal pair records and ${governedSextilePairs.size} governed sextile pairs audited in both orders, voices, and runtimes (${governedSextileRenders} pair-specific renders; ${governedSextileSourceGaps} fail-closed results); screenshot regressions verified; generic aspect prose never served.`);
