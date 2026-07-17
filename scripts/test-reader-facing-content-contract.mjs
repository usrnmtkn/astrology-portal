import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const publicFallbackFiles = [
  "apps/web/src/content/emergencyCopy.json",
  "scripts/content-source/tldrastro-fallback-templates-rows.json"
];

const blockedPublicPhrases = [
  /Use the calculated/i,
  /when no reviewed/i,
  /as factual context/i,
  /reliable floor/i,
  /Transit-to-natal entries are ordered/i,
  /same-moment aspect exclusions/i,
  /Do not apply same-moment/i,
  /this chart makes/i
];

for (const file of publicFallbackFiles) {
  const contents = read(file);

  for (const pattern of blockedPublicPhrases) {
    assert.equal(
      pattern.test(contents),
      false,
      `${file} contains blocked public fallback phrase: ${pattern}`
    );
  }
}

const youPage = read("apps/web/src/features/you/YouPage.tsx");
const app = read("apps/web/src/App.tsx");
const generatedContent = read("apps/web/src/services/generatedContent.ts");
const servedFieldsContract = read("apps/web/src/content/servedFieldsContract.ts");
const emergencyCopyRuntime = read("apps/web/src/content/emergencyCopy.ts");
const fallbackHooks = read("apps/web/src/content/fallbackHooks.ts");
const emergencyCopyJson = read("apps/web/src/content/emergencyCopy.json");

assert.match(youPage, /isReaderFacingCopy/, "You detail renderer must use reader-facing copy filtering.");
assert.match(youPage, /isDuplicateArticleCopy/, "You detail renderer must dedupe TLDR, summary, and section body copy.");
assert.doesNotMatch(youPage, /This interpretation is still being prepared\./, "Empty detail pages must render real emergency fallback copy.");
assert.doesNotMatch(app, /This interpretation is still being prepared\./, "Sky detail pages must render real emergency fallback copy.");
assert.match(youPage, /emergencyDetailFallbackCopy/, "You detail renderer must use the real emergency fallback copy helper.");

for (const requiredSource of [
  "cc-natal-aspect",
  "cc-aspect-pair-reviewed",
  "cc-planet-in-sign-reviewed",
  "cc-planet-in-house-reviewed",
  "cc-composite-typed",
  "cc-composite-aspect",
  "cc-natal-angles-authored",
  "cc-sky-points-authored"
]) {
  assert.match(servedFieldsContract, new RegExp(requiredSource), `served fields contract must include ${requiredSource}.`);
}

for (const noProseSource of [
  "cc-natal-angle-reviewed",
  "cc-planetary-horoscope",
  "cc-composite-reviewed",
  "cc-synastry-reviewed"
]) {
  assert.match(servedFieldsContract, new RegExp(noProseSource), `served fields contract must block no-prose source ${noProseSource}.`);
}

assert.match(generatedContent, /servedFieldSections/, "Generated content runtime must render object-shaped rich sections through served fields.");
assert.match(generatedContent, /isNoProseGeneratedContent/, "Generated content runtime must block no-prose rows.");
assert.match(generatedContent, /containsSingleBraceSlot/, "Generated content runtime must block raw single-brace fallback slots.");
assert.match(generatedContent, /isReaderServableGeneratedContent\(content\)/, "Loaded content map must filter unsafe content rows before aliasing.");
assert.match(app, /emergencySkyPlacementCopy\(position\.planet, position\.sign, \{ retrograde: isRetrograde \}\)/, "Sky placement detail/list rendering must build a local emergency fallback.");
assert.match(app, /emergencyDetailFallbackCopy/, "Sky detail renderer must use the real emergency fallback copy helper.");
assert.match(app, /function normalizeSkyPlacementSurface/, "Sky placement detail rendering must resolve through the surface normalizer.");
assert.match(app, /skyPlacementMadlibFallbackSection/, "Sky placement detail rendering must include the source-based madlib fallback section.");
assert.match(app, /emergencyFallbackParagraph/, "Sky detail renderer must render a final emergency fallback only when normalized slots are empty.");
assert.match(emergencyCopyRuntime, /cc-source-phrases\.json/, "Emergency point fallback copy must stay grounded in the authored source phrase file.");
assert.match(emergencyCopyRuntime, /cc\/guide-phrase\/076/, "Lilith fallback must use the guide-phrase source for the Black Moon Lilith definition.");
assert.match(emergencyCopyRuntime, /cc\/guide-phrase\/255/, "Lilith fallback must use the guide-phrase source for the resistance/defiance/shadow-work copy.");
assert.match(emergencyCopyRuntime, /cc\/guide-phrase\/165/, "Lilith fallback must use the guide-phrase source for the wild-card awakening copy.");
assert.doesNotMatch(app, /less patience for waiting/i, "Friends transit emergency summaries must not reuse the same generic angle sentence.");
assert.match(app, /emergencyPointFunction\(transit\.natalPoint\)/, "Friends transit emergency summaries must include natal point vocabulary.");
assert.match(app, /function normalizePersonalTransitSurface/, "Transit-to-natal rendering must resolve through the personal transit surface normalizer.");
assert.match(app, /sourceGroundedPersonalTransitNormalizedSection/, "Transit-to-natal rendering must prefer source-grounded transit sections.");
assert.match(app, /personalTransitMadlibFallbackSection/, "Transit-to-natal rendering must fall back to the source-based madlib section.");
assert.match(app, /aspectAdj:\s*transitAspectTechnicalVerb\(transit\.aspect\)/, "Transit-to-natal slots must include the aspect word so card bodies say square/conjunct/etc.");
assert.match(fallbackHooks, /key:\s*"you\.transit-to-natal"[\s\S]*slotKeys:\s*\[[^\]]*"aspectAdj"/, "Transit-to-natal fallback hook must declare the aspectAdj slot.");
assert.match(emergencyCopyJson, /"you\.transit-to-natal":\s*"[^"]*\{\{aspectAdj\}\}/, "Transit-to-natal emergency copy must render the aspect word slot.");
assert.match(emergencyCopyRuntime, /function emergencyTransitToNatalCopy[\s\S]*aspectAdj:\s*emergencyAspectAdjective\(aspect\)/, "Transit-to-natal emergency helper must provide the aspectAdj slot.");
assert.match(app, /resolveSourceGroundedV2\("sky\.planet_sign"/, "Sky placement rendering must resolve authored planet/sign and sky point rows through source-grounded V2.");
assert.match(app, /skyPlacementMadlibFallbackSection/, "Sky placement rendering must fall back to source-based madlibs when source-grounded rows are absent.");
assert.match(servedFieldsContract, /reader: \["reading"\]/, "Authored natal angle rows must render only the clean reading field.");
assert.match(servedFieldsContract, /reader: \["collective_reading"\]/, "Authored Sky point rows must render only the clean collective reading field.");

console.log("Reader-facing content contract passed.");
