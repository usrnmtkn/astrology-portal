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

assert.match(youPage, /isReaderFacingCopy/, "You detail renderer must use reader-facing copy filtering.");
assert.match(youPage, /isDuplicateArticleCopy/, "You detail renderer must dedupe TLDR, summary, and section body copy.");
assert.match(youPage, /This interpretation is still being prepared\./, "Empty detail pages must render an honest placeholder.");

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
assert.match(app, /liveGeneratedBody\(generated, fallbackDetailParagraphs\)/, "Sky placement detail rendering must pass emergency fallback paragraphs into the body.");
assert.doesNotMatch(app, /less patience for waiting/i, "Friends transit emergency summaries must not reuse the same generic angle sentence.");
assert.match(app, /emergencyPointFunction\(transit\.natalPoint\)/, "Friends transit emergency summaries must include natal point vocabulary.");
assert.match(app, /natalAspectContentKey\(transit\.transitPlanet, transit\.aspect, transit\.natalPoint\)/, "Transit-to-natal rendering must fall back to authored natal aspect content before templates.");
assert.match(app, /isAuthoredTransitAspectContent\(generatedCandidate\)/, "Transit rendering must accept authored aspect rows instead of forcing generic templates.");
assert.match(app, /sourceFile\.includes\("cc-planet-in-sign-reviewed"\)/, "Sky placement rendering must accept authored collective_shift rows.");
assert.match(app, /sourceFile\.includes\("cc-sky-points-authored"\)/, "Sky placement rendering must accept authored Sky point collective_reading rows.");
assert.match(servedFieldsContract, /reader: \["reading"\]/, "Authored natal angle rows must render only the clean reading field.");
assert.match(servedFieldsContract, /reader: \["collective_reading"\]/, "Authored Sky point rows must render only the clean collective reading field.");

console.log("Reader-facing content contract passed.");
