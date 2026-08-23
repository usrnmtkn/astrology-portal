import assert from "node:assert/strict";

import { renderSkyPlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const planets = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"
];
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
const authorizedPolicies = new Set([
  "sky-placement-continuous-v2",
  "sky-placement-moon-entry-v1",
  "sky-placement-frame-v3",
  "sky-article-final-v1",
  "sky-article-v1"
]);
const counts = {};

for (const planet of planets) {
  for (const sign of signs) {
    const signIndex = signs.indexOf(sign);
    const rendered = renderSkyPlacement({
      planet,
      sign,
      entryDate: "April 4, 2030",
      exitDate: "May 5, 2030",
      priorSign: sign === "aries" ? "pisces" : signs[signIndex - 1],
      priorSignEntryDate: "February 2, 2029",
      priorSignExitDate: "March 3, 2029",
      previousResidencyEntryDate: "June 6, 2000",
      previousResidencyExitDate: "July 7, 2000",
      events: []
    });

    assert.ok(rendered.body?.trim(), `${planet}/${sign} rendered blank package copy`);
    assert.ok(
      authorizedPolicies.has(rendered.templateKey),
      `${planet}/${sign} selected unauthorized policy ${rendered.templateKey}`
    );
    assert.doesNotMatch(rendered.body, /\{\{/u, `${planet}/${sign} left a placeholder unresolved`);
    counts[rendered.templateKey] = (counts[rendered.templateKey] ?? 0) + 1;
  }
}

assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 168);
assert.deepEqual(counts, {
  "sky-placement-continuous-v2": 55,
  "sky-placement-frame-v3": 101,
  "sky-placement-moon-entry-v1": 12
});
console.log(JSON.stringify({ pages: 168, blanks: 0, unresolvedPlaceholders: 0, counts }, null, 2));
