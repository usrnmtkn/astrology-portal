#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { renderTransitHouseEvent } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const detailSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/sky/SkyDetailArticle.tsx"), "utf8");
const cmsBundleFile = path.join(os.tmpdir(), "tldrastro-personal-transit-cms.bundle.mjs");
const activeChartBundleFile = path.join(os.tmpdir(), "tldrastro-sky-active-chart-events.bundle.mjs");
await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/content/cmsSurfaceOverrides.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: cmsBundleFile,
  platform: "node"
});
await build({
  bundle: true,
  entryPoints: [path.join(repoRoot, "apps/web/src/services/skyActiveChartEvents.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: activeChartBundleFile,
  platform: "node"
});
const { cmsSurfaceKeys, resolveCmsSurfaceOverride } = await import(`${pathToFileURL(cmsBundleFile).href}?t=${Date.now()}`);
const { skyActiveChartEvents } = await import(`${pathToFileURL(activeChartBundleFile).href}?t=${Date.now()}`);
const require = createRequire(import.meta.url);
const shippedRenderer = createTransitSynastryRenderer(
  require("../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json"),
  require("../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json"),
  require("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json")
);

const moon = renderTransitHouseEvent({
  planet: "jupiter",
  sign: "leo",
  house: 3,
  natal: "moon",
  natalHouse: 6,
  aspect: "square",
  window: "Until September 5"
});
assert.match(
  moon.body,
  /^While Jupiter is in your 3rd house, it is also squaring your natal Moon in your 6th house until September 5\./u,
  "The visible aspect must name both the transiting house and the natal placement's house."
);
assert.deepEqual(moon.sourceKeys, [
  "fallback-hook/transit-house-event-frame/jupiter",
  "fallback-hook/transit-house-event-wants/jupiter/leo",
  "fallback-hook/transit-house-event-natal/moon",
  "fallback-hook/transit-effect-hard/jupiter/moon"
]);

const descendant = renderTransitHouseEvent({
  planet: "jupiter",
  sign: "leo",
  house: 3,
  natal: "descendant",
  natalHouse: 7,
  aspect: "trine",
  window: "Until September 7"
});
assert.match(descendant.body, /your natal Descendant in your 7th house until September 7/u);

const outerPlanet = renderTransitHouseEvent({
  planet: "uranus",
  sign: "gemini",
  house: 1,
  natal: "sun",
  natalHouse: 9,
  aspect: "square",
  window: "Until October 1"
});
assert.match(outerPlanet.body, /^While Uranus is in your 1st house, it is also squaring your natal Sun in your 9th house/u);
assert.ok(outerPlanet.sourceKeys.includes("fallback-hook/transit-house-event-frame/generic"));

const transitPlanets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node"];
const natalPoints = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith", "ascendant", "midheaven", "descendant", "imum-coeli"];
const aspects = ["conjunction", "square", "opposition", "trine", "sextile"];
let coverageCount = 0;
for (const planet of transitPlanets) {
  for (const natal of natalPoints) {
    for (const aspect of aspects) {
      if (natal === "lilith" && !["conjunction", "opposition"].includes(aspect)) continue;
      const rendered = renderTransitHouseEvent({
        planet,
        sign: "aries",
        house: 1,
        natal,
        natalHouse: 2,
        aspect
      });
      assert.match(rendered.body, /your 1st house/u);
      assert.match(rendered.body, /your natal .+ in your 2nd house/u);
      coverageCount += 1;
    }
  }
}
assert.equal(coverageCount, 1044, "Every calculated personal transit pair allowed by the current aspect policy must have a house-aware fallback.");

const shippedMoon = shippedRenderer.renderTransitHouseEvent({
  planet: "jupiter",
  sign: "leo",
  house: 3,
  natal: "moon",
  natalHouse: 6,
  aspect: "square",
  window: "Until September 5"
});
assert.equal(shippedMoon.body, moon.body, "The shipped browser package must match the tested source resolver.");

const personalAspectKeys = cmsSurfaceKeys.transitAspect("you", "Jupiter", "Leo", "Moon", "square");
assert.deepEqual(personalAspectKeys, [
  "cms/personal-transit-aspect/you/jupiter/leo/moon/square",
  "cms/personal-transit-aspect/you/jupiter/leo/moon/hard",
  "cms/personal-transit-aspect/you/jupiter/moon/square",
  "cms/personal-transit-aspect/you/jupiter/moon/hard",
  "cms/personal-transit-aspect/you/template"
]);
const personalAspectOverride = resolveCmsSurfaceOverride(new Map([[
  personalAspectKeys[1],
  {
    id: "cms-test",
    contentKey: personalAspectKeys[1],
    surface: "you",
    mode: "card",
    eventType: null,
    targetDate: null,
    headline: "{{transitPlanet}} {{aspect}} your {{natalPoint}}",
    summary: null,
    body: "{{transitPlanet}} in your {{transitHouseOrdinal}} house is {{aspectVerb}} your natal {{natalPoint}} in your {{natalHouseOrdinal}} house {{window}}.",
    sections: {},
    blockType: "essay",
    sourceSnapshot: { contentType: "mustache-template" },
    judgeScore: null,
    judgeGate: null,
    provider: null,
    model: null,
    updatedAt: null
  }
]]), personalAspectKeys, {
  transitPlanet: "Jupiter",
  transitHouseOrdinal: "3rd",
  aspect: "square",
  aspectVerb: "squaring",
  natalPoint: "Moon",
  natalHouseOrdinal: "6th",
  window: "until September 5"
});
assert.equal(
  personalAspectOverride?.body,
  "Jupiter in your 3rd house is squaring your natal Moon in your 6th house until September 5."
);

const activeEvents = skyActiveChartEvents([
  {
    key: "north",
    heading: "Sun Conjunction North Node",
    body: "While Sun is in your 4th house, it is also sitting right on your natal North Node in your 4th house until September 9. Sun in Virgo wants the practical change named clearly; your North Node describes the unfamiliar direction. A new private-life role can feel awkward before it feels normal."
  },
  {
    key: "venus",
    heading: "Sun Trine Venus",
    body: "While Sun is in your 4th house, it is also trining your natal Venus in your 8th house until September 11. Sun in Virgo wants the practical change named clearly; your Venus describes what you value. Support around shared money, trust, or responsibility can be easier to receive."
  },
  {
    key: "south",
    heading: "Sun Opposition South Node",
    body: "While Sun is in your 4th house, it is also opposing your natal South Node in your 10th house until September 9. Sun in Virgo wants the practical change named clearly; your South Node describes the role you already know how to carry. Familiar recognition can keep competing with the private life that needs more room."
  },
  {
    key: "moon",
    heading: "Sun Sextile Moon",
    body: "While Sun is in your 4th house, it is also sextiling your natal Moon in your 6th house until September 8. A schedule or responsibility can be adjusted before it becomes urgent."
  }
]);
assert.equal(activeEvents.length, 3, "A mirrored North/South Node pair should become one reader event without hiding other aspects.");
assert.equal(activeEvents[0].type, "nodal-axis");
assert.deepEqual(activeEvents[0].memberKeys, ["north", "south"]);
assert.equal(activeEvents[0].heading, "Sun Conjunction North Node · Sun Opposition South Node");
assert.equal(activeEvents[0].dateLabel, "Through September 9");
assert.match(activeEvents[0].body ?? "", /^Your natal North Node is in your 4th house, while your South Node is in your 10th house\./u);
assert.equal((activeEvents[0].body?.match(/Sun in Virgo wants the practical change named clearly/gu) ?? []).length, 0, "Shared transit/sign setup belongs in the placement paragraph, not every active-chart event.");
assert.match(activeEvents[0].body ?? "", /Your North Node describes the unfamiliar direction\./u);
assert.match(activeEvents[0].body ?? "", /Your South Node describes the role you already know how to carry\./u);
assert.equal(activeEvents[1].memberKeys[0], "venus", "Grouping should preserve the upstream significance order of the first event member.");
assert.equal(activeEvents[2].memberKeys[0], "moon");
assert.equal(activeEvents.flatMap((event) => event.memberKeys).sort().join(","), "moon,north,south,venus", "Every calculated aspect must remain represented after grouping.");
assert.equal(activeEvents[1].dateLabel, "Through September 11");
assert.match(activeEvents[1].body ?? "", /^Your natal Venus is in your 8th house\. Your Venus describes what you value\./u);
assert.doesNotMatch(activeEvents[1].body ?? "", /Sun in Virgo wants the practical change named clearly/u);
assert.match(activeEvents[2].body ?? "", /^Your natal Moon is in your 6th house\. A schedule or responsibility/u);

const loneNode = skyActiveChartEvents([{
  key: "north-only",
  heading: "Sun Trine North Node",
  body: "While Sun is in your 4th house, it is also trining your natal North Node in your 4th house until September 9. One supported opening appears."
}]);
assert.equal(loneNode[0].type, "single", "An unpaired node contact must stay visible instead of being invented into an axis pair.");
assert.match(loneNode[0].body ?? "", /^Your natal North Node is in your 4th house\. One supported opening appears\./u);

assert.match(appSource, /personalTransitPackageSection\(transit, generatedAt, "you", \{[\s\S]*?generatedContent,[\s\S]*?transitHouse: house/u);
assert.match(appSource, /body: packageSection\?\.body \?\? compiledAspect\?\.body \?\? null/u);
assert.match(appSource, /personalTransitAspectContentKeys = skyPlacementPersonalizationTransits\.flatMap/u);
assert.match(appSource, /natalHouse: transit\.natalHouse/u);
assert.match(detailSource, /skyActiveChartEvents\(detail\.personalizedPlacement\?\.natalAspects \?\? \[\]\)/u);
assert.match(detailSource, /<h3>Active in your chart<\/h3>/u);
assert.match(detailSource, /event\.dateLabel/u);
assert.doesNotMatch(detailSource, /Aspects to the natal chart/u);

console.log("Sky personalized transit composition checks passed.");
