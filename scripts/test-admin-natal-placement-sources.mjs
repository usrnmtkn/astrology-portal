import assert from "node:assert/strict";
import {
  natalPlacementLabel,
  natalPlacementSelectionFromText,
  natalPlacementSourceGroups
} from "../apps/admin/src/natalPlacementSources.ts";
import { renderNatalPlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";

const selection = natalPlacementSelectionFromText("Chiron in Taurus in the 12th house");
assert.deepEqual(selection, { planet: "chiron", sign: "taurus", house: "12" });
assert.deepEqual(
  natalPlacementSelectionFromText("fallback-hook/placement-house-sentence/chiron/12"),
  { planet: "chiron", house: "12" }
);
assert.equal(natalPlacementLabel("chiron", "taurus", "12"), "Chiron in Taurus in the 12th house");
assert.deepEqual(
  natalPlacementSelectionFromText("Chiron in Aries in the 12th house"),
  { planet: "chiron", sign: "aries", house: "12" }
);

const groups = natalPlacementSourceGroups("chiron", "taurus", "12");
assert.deepEqual(groups.map((group) => group.key), ["exact", "sign", "house", "structure"]);

const sources = groups.flatMap((group) => group.sources);
assert.equal(sources.length, 12);
assert.ok(sources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/taurus/12"));
assert.ok(sources.some((source) => source.key === "fallback-hook/placement-sentence/chiron/taurus"));
assert.ok(sources.some((source) => source.key === "fallback-hook/placement-house-sentence/chiron/12"));
assert.ok(sources.some((source) => source.key === "fallback-hook/house-meaning/12"));
assert.ok(sources.some((source) => source.key === "fallback-template/natal.planet-in-sign/chiron"));
assert.match(groups.find((group) => group.key === "exact")?.description ?? "", /Optional exact override/);
assert.match(
  sources.find((source) => source.key === "fallback-hook/placement-sentence/chiron/taurus")?.scope ?? "",
  /Chiron in Taurus, across every house/
);

const ariesSources = natalPlacementSourceGroups("chiron", "aries", "12").flatMap((group) => group.sources);
assert.ok(ariesSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/aries/12"));

const geminiSources = natalPlacementSourceGroups("chiron", "gemini", "12").flatMap((group) => group.sources);
assert.ok(geminiSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/gemini/12"));

const cancerSources = natalPlacementSourceGroups("chiron", "cancer", "12").flatMap((group) => group.sources);
assert.ok(cancerSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/cancer/12"));

const leoSources = natalPlacementSourceGroups("chiron", "leo", "12").flatMap((group) => group.sources);
assert.ok(leoSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/leo/12"));

const virgoSources = natalPlacementSourceGroups("chiron", "virgo", "12").flatMap((group) => group.sources);
assert.ok(virgoSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/virgo/12"));

const libraSources = natalPlacementSourceGroups("chiron", "libra", "12").flatMap((group) => group.sources);
assert.ok(libraSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/libra/12"));

const scorpioSources = natalPlacementSourceGroups("chiron", "scorpio", "12").flatMap((group) => group.sources);
assert.ok(scorpioSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/scorpio/12"));

const sagittariusSources = natalPlacementSourceGroups("chiron", "sagittarius", "12").flatMap((group) => group.sources);
assert.ok(sagittariusSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/sagittarius/12"));

const capricornSources = natalPlacementSourceGroups("chiron", "capricorn", "12").flatMap((group) => group.sources);
assert.ok(capricornSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/capricorn/12"));

const aquariusSources = natalPlacementSourceGroups("chiron", "aquarius", "12").flatMap((group) => group.sources);
assert.ok(aquariusSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/aquarius/12"));

const piscesSources = natalPlacementSourceGroups("chiron", "pisces", "12").flatMap((group) => group.sources);
assert.ok(piscesSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/chiron/pisces/12"));

const lilithVirgoFourthSources = natalPlacementSourceGroups("lilith", "virgo", "4").flatMap((group) => group.sources);
assert.ok(lilithVirgoFourthSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/lilith/virgo/4"));

const lilithScorpioFourthSources = natalPlacementSourceGroups("lilith", "scorpio", "4").flatMap((group) => group.sources);
assert.ok(lilithScorpioFourthSources.some((source) => source.key === "fallback-hook/natal-you-placement-complete-final/lilith/scorpio/4"));

const sunAriesFirst = renderNatalPlacement({ planet: "sun", sign: "aries", house: 1, voice: "you" });
assert.equal(sunAriesFirst.headline, "Sun in Aries in the 1st house");
assert.equal(sunAriesFirst.parts.length, 2, "A full natal placement preview must render both sign and house sections.");
assert.equal(sunAriesFirst.partKeys.length, 2, "Every rendered natal section must retain source provenance.");
assert.ok(sunAriesFirst.parts.every((part) => part.trim().length > 0));
assert.doesNotMatch(sunAriesFirst.body, /\{\{|\}\}/, "Reader preview must not expose unresolved template variables.");

const friendSunAriesFirst = renderNatalPlacement({ planet: "sun", sign: "aries", house: 1, voice: "Maya" });
assert.match(friendSunAriesFirst.body, /Maya's Sun|they|them/i, "The natal preview must support the Friend voice.");
assert.doesNotMatch(friendSunAriesFirst.body, /\{\{|\}\}/);

console.log("Natal placement source finder maps optional overrides and renders effective You/Friend reader copy with source provenance.");
