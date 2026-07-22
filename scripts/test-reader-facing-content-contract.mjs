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
const adminDashboard = read("apps/admin/src/GeneratedContentAdminDashboard.tsx");
const generatedContent = read("apps/web/src/services/generatedContent.ts");
const servedFieldsContract = read("apps/web/src/content/servedFieldsContract.ts");
const emergencyCopyRuntime = read("apps/web/src/content/emergencyCopy.ts");
const fallbackHooks = read("apps/web/src/content/fallbackHooks.ts");
const emergencyCopyJson = read("apps/web/src/content/emergencyCopy.json");
const materializeCompatibilityRows = read("scripts/materialize-compatibility-dashboard-rows.mjs");

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
assert.match(generatedContent, /generatedRowSectionCopyValues/, "Generated content row safety must inspect actual section body copy instead of serialized metadata.");
assert.doesNotMatch(generatedContent, /row\.headline,\s*\n\s*row\.summary,\s*\n\s*row\.body/, "Generated content row safety must not reject valid reader rows because their headline is a short title.");
assert.doesNotMatch(generatedContent, /unsafeMetadataMarkers[\s\S]*["']source[-_]grounded["']/, "Generated content row safety must not reject the authored content-level label.");
assert.match(app, /transitSynastryFallbackRendererV3\.renderSkyPlacement\(\{/, "Sky placement detail/list rendering must use the v3 fallback package renderer.");
assert.doesNotMatch(app, /emergencySkyPlacementCopy/, "Sky placement detail/list rendering must not use the legacy emergency placement helper.");
assert.match(app, /emergencyDetailFallbackCopy/, "Sky detail renderer must use the real emergency fallback copy helper.");
assert.match(app, /function normalizeSkyPlacementSurface/, "Sky placement detail rendering must resolve through the surface normalizer.");
assert.match(app, /skyPlacementMadlibFallbackSection/, "Sky placement detail rendering must include the source-based madlib fallback section.");
assert.doesNotMatch(app, /sourceMode:\s*"fallback-only"/, "Sky package renderers must not use the retired fallback-only override flag.");
assert.match(app, /renderSkyPlacement\(\{\s*[\s\S]*events/, "Sky placement rendering must pass event context into the v3 package renderer.");
assert.match(app, /emergencyFallbackParagraph/, "Sky detail renderer must render a final emergency fallback only when normalized slots are empty.");
assert.match(emergencyCopyRuntime, /cc-source-phrases\.json/, "Emergency point fallback copy must stay grounded in the authored source phrase file.");
assert.match(emergencyCopyRuntime, /cc\/guide-phrase\/076/, "Lilith fallback must use the guide-phrase source for the Black Moon Lilith definition.");
assert.match(emergencyCopyRuntime, /cc\/guide-phrase\/255/, "Lilith fallback must use the guide-phrase source for the resistance/defiance/shadow-work copy.");
assert.match(emergencyCopyRuntime, /cc\/guide-phrase\/165/, "Lilith fallback must use the guide-phrase source for the wild-card awakening copy.");
assert.doesNotMatch(app, /less patience for waiting/i, "Friends transit emergency summaries must not reuse the same generic angle sentence.");
assert.match(app, /emergencyPointFunction\(transit\.natalPoint\)/, "Friends transit emergency summaries must include natal point vocabulary.");
assert.match(app, /function normalizePersonalTransitSurface/, "Transit-to-natal rendering must resolve through the personal transit surface normalizer.");
assert.match(app, /sourceGroundedPersonalTransitNormalizedSection/, "Transit-to-natal rendering must prefer authored transit sections.");
assert.match(app, /personalTransitMadlibFallbackSection/, "Transit-to-natal rendering must fall back to the source-based madlib section.");
assert.match(app, /aspectAdj:\s*transitAspectTechnicalVerb\(transit\.aspect\)/, "Transit-to-natal slots must include the aspect word so card bodies say square/conjunct/etc.");
assert.match(fallbackHooks, /key:\s*"you\.transit-to-natal"[\s\S]*slotKeys:\s*\[[^\]]*"aspectAdj"/, "Transit-to-natal fallback hook must declare the aspectAdj slot.");
assert.match(emergencyCopyJson, /"you\.transit-to-natal":\s*"[^"]*\{\{aspectAdj\}\}/, "Transit-to-natal emergency copy must render the aspect word slot.");
assert.match(emergencyCopyRuntime, /function emergencyTransitToNatalCopy[\s\S]*aspectAdj:\s*emergencyAspectAdjective\(aspect\)/, "Transit-to-natal emergency helper must provide the aspectAdj slot.");
assert.doesNotMatch(app, /resolveSourceGroundedV2\("sky\.planet_sign"/, "Sky placement rendering must not resolve through legacy authored V2 rows.");
assert.match(app, /skyPlacementMadlibFallbackSection/, "Sky placement rendering must fall back to source-based madlibs when authored rows are absent.");
assert.match(adminDashboard, /Content System/, "Admin article editor must label authored vs fallback as a content system, not a display override.");
assert.doesNotMatch(adminDashboard, /Content Level/, "Admin article editor must not expose internal content level as a third reader choice.");
assert.doesNotMatch(adminDashboard, /<span>Content level<\/span>[\s\S]*<select/, "Admin editor must not present content level as the editable source dropdown.");
assert.doesNotMatch(adminDashboard, /aria-label="App display source"/, "Admin editor must not expose app display source as an editable runtime override.");
assert.match(adminDashboard, /aria-label="Article filters"/, "Articles admin surface must include dedicated filters.");
assert.match(adminDashboard, /Article content system/, "Articles admin filters must include authored vs fallback content system.");
assert.match(adminDashboard, /filteredArticleRows/, "Articles admin table must render the filtered article row set.");
assert.match(adminDashboard, /Needs source material/, "Admin readiness must flag fallback/source lanes that are empty or too thin.");
assert.match(adminDashboard, /rowNeedsSourceMaterial/, "Admin readiness must classify weak fallback source rows separately from normal draft/review states.");
assert.match(adminDashboard, /aria-label="Compatibility filters"/, "Compatibility admin surface must include dedicated filters.");
assert.match(adminDashboard, /Compatibility sections/, "Compatibility admin must group content, fallback hooks, vocabulary, and slots.");
assert.match(adminDashboard, /filteredCompatibilityRows/, "Compatibility admin table must render the filtered compatibility row set.");
assert.match(adminDashboard, /handleCompatibilityCreateAction/, "Compatibility admin must open connected compatibility-specific drafts.");
assert.match(fallbackHooks, /friends\.compatibility\.planet-card/, "Friends compatibility fallback hook must be discoverable in the admin hook catalog.");
assert.match(app, /phrasebankWriteup \?\? \{/, "Compatibility dashboard rows must render even before a matching static phrasebank row exists.");
assert.match(materializeCompatibilityRows, /contentSystem:\s*"authored"/, "Compatibility materialized rows must use the authored content system.");
assert.match(materializeCompatibilityRows, /contentLevel:\s*"source-grounded"/, "Compatibility materialized rows must keep source-grounded as the trust level.");
assert.doesNotMatch(materializeCompatibilityRows, /contentLevel:\s*"dashboard-authored"/, "Compatibility materialized rows must not invent a third content level.");
assert.match(materializeCompatibilityRows, /block_type:\s*"compatibility_planet_card"/, "Compatibility materialized rows must use the compatibility card block type.");
assert.match(servedFieldsContract, /reader: \["reading"\]/, "Authored natal angle rows must render only the clean reading field.");
assert.match(servedFieldsContract, /reader: \["collective_reading"\]/, "Authored Sky point rows must render only the clean collective reading field.");

console.log("Reader-facing content contract passed.");
