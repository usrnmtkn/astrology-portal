import assert from "node:assert/strict";
import { transitArticleDescription } from "../apps/web/src/services/transitArticleDescription";

const transit = { transitPlanet: "Lilith", transitSign: "Capricorn", natalPoint: "North Node", natalSign: "Virgo", natalHouse: 4 };
const chart = { ascendant: "Gemini", birthTimeKnown: true };
assert.equal(transitArticleDescription(transit, chart, "trine"),
  "Lilith in Capricorn in your 8th house is trine your natal North Node in Virgo in your 4th house.");
assert.equal(transitArticleDescription({ ...transit, natalHouse: 8 }, { ...chart, ascendant: "Aquarius" }, "trine", "Alisa P"),
  "Lilith in Capricorn in Alisa P's 12th house is trine Alisa P's natal North Node in Virgo in Alisa P's 8th house.");
for (const unreliable of [null, { ...chart, birthTimeKnown: false }, { ascendant: "Gemini" }]) {
  const text = transitArticleDescription(transit, unreliable, "trine");
  assert.equal(text, "Lilith in Capricorn is trine your natal North Node in Virgo.");
}
for (const natalHouse of [0, -1, 13, 1.5, NaN, undefined]) {
  assert.equal(transitArticleDescription({ ...transit, natalHouse }, chart, "trine"),
    "Lilith in Capricorn in your 8th house is trine your natal North Node in Virgo.");
}
assert.equal(transitArticleDescription({ ...transit, transitSign: undefined, natalSign: "", natalHouse: undefined }, chart, "trine"),
  "Lilith is trine your natal North Node.");
for (const [sign, house] of [["Gemini", "1st"], ["Cancer", "2nd"], ["Leo", "3rd"], ["Aries", "11th"], ["Taurus", "12th"]]) {
  assert.ok(transitArticleDescription({ ...transit, transitSign: sign }, chart, "trine").includes(`in your ${house} house is trine`));
}
console.log("Transit article descriptions preserve chart ownership, known houses, and missing-fact boundaries.");
