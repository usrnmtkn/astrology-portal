import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const publicFallbackFiles = [
  "apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json"
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
const manualChartsPanel = read("apps/web/src/features/friends/ManualChartsPanel.tsx");
const adminDashboard = read("apps/admin/src/GeneratedContentAdminDashboard.tsx");
const writingSurfaceSourceMap = read("apps/admin/src/writingSurfaceSourceMap.ts");
const generatedContent = read("apps/web/src/services/generatedContent.ts");
const servedFieldsContract = read("apps/web/src/content/servedFieldsContract.ts");
const fallbackSourceRowsV3 = JSON.parse(read("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"));
const transitSynastryRowsV1 = JSON.parse(read("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json"));
const planetTopicVocabulary = read("apps/web/src/services/planetTopicVocabulary.ts");
const lunarCalendar = read("apps/web/src/features/calendar/LunarCalendar.tsx");
const readerSafety = read("apps/web/src/content/readerSafety.ts");
const materializeCompatibilityRows = read("scripts/materialize-compatibility-dashboard-rows.mjs");
const materializeFallbackArchitectureRows = read("scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs");
const apiContentGeneration = read("api/_lib/content-generation.ts");
const fallbackRuntime = read("apps/web/src/content/fallbackArchitectureV3Runtime.ts");
const careerArchetype = read("apps/web/src/services/careerArchetype.ts");
const soulRoadmap = read("apps/web/src/components/charts/SoulRoadmapCard.tsx");
const natalAspectPatterns = read("apps/web/src/services/natalAspectPatterns.ts");
const placementRows = read("apps/web/src/components/charts/PlacementRows.tsx");
const lunarDayResolver = read("apps/web/src/features/calendar/lunarDayResolver.ts");
const fallbackHookRows = fallbackSourceRowsV3.hookRows ?? [];
const fullKnowledge = JSON.parse(read("packages/astro-knowledge/dist/knowledge.json"));
const skyWebKnowledge = JSON.parse(read("packages/astro-knowledge/dist/sky-web.json"));
const natalWebKnowledge = JSON.parse(read("packages/astro-knowledge/dist/natal-web.json"));

for (const [bundleName, bundle] of [
  ["Sky", skyWebKnowledge],
  ["Natal", natalWebKnowledge]
]) {
  assert.equal(
    bundle.placements.some((entry) => Object.hasOwn(entry, "note")),
    false,
    `${bundleName} reader placement rows must not expose editorial provenance notes.`
  );
}

for (const servingPlacementId of [
  "chiron-aries",
  "north-node-aquarius",
  "south-node-leo"
]) {
  const servingPlacement = fullKnowledge.placements.find((entry) => entry.id === servingPlacementId);
  assert.ok(
    servingPlacement,
    `${servingPlacementId} must remain available in the full editorial knowledge package.`
  );
  assert.equal(
    servingPlacement.runtimeEligible,
    true,
    `${servingPlacementId} must retain its explicit serving approval.`
  );
  assert.equal(
    skyWebKnowledge.placements.some((entry) => entry.id === servingPlacementId),
    true,
    `${servingPlacementId} must remain available in the Sky reader bundle after serving approval.`
  );
  assert.equal(
    natalWebKnowledge.placements.some((entry) => entry.id === servingPlacementId),
    true,
    `${servingPlacementId} must remain available in the Natal reader bundle after serving approval.`
  );
}

const relationshipRows = [
  ...(fallbackSourceRowsV3.hookRows ?? []),
  ...(fallbackSourceRowsV3.vocabularyRows ?? []),
  ...(transitSynastryRowsV1.authoredCards ?? [])
].filter((row) => (
  /(?:synastry|compat|bond|circle)/iu.test(`${row.surface ?? ""} ${row.contentKey ?? ""}`)
));
for (const row of relationshipRows) {
  for (const field of ["body", "body_you", "body_they", "body_sky"]) {
    const body = String(row[field] ?? "");
    const withoutLicensedEverydaySenses = body
      .replaceAll("Shortcuts, contacts, been-there calm", "")
      .replaceAll("amount of contact", "");
    assert.doesNotMatch(
      withoutLicensedEverydaySenses,
      /\bcontacts?\b/iu,
      `${row.contentKey}.${field} must say connection, not contact, on relationship surfaces.`
    );
  }
}

const readerServingFiles = {
  "apps/web/src/App.tsx": app,
  "apps/web/src/features/friends/ManualChartsPanel.tsx": manualChartsPanel,
  "apps/web/src/features/you/YouPage.tsx": youPage,
  "apps/web/src/features/calendar/LunarCalendar.tsx": lunarCalendar,
  "apps/web/src/services/generatedContent.ts": generatedContent,
  "apps/web/src/services/planetTopicVocabulary.ts": planetTopicVocabulary,
  "apps/web/src/content/servedFieldsContract.ts": servedFieldsContract,
  "apps/web/src/content/readerSafety.ts": readerSafety,
  "api/_lib/content-generation.ts": apiContentGeneration
};

const deletedReaderCopySourceFragments = [
  "sky-writing",
  "skyWriting",
  "skyContentSnapshot",
  "skyHistoricalLookback",
  "placementScaffold",
  "placementScaffoldData",
  "emergencyCopy",
  "lunarBeatCopy",
  "seasonArcCopy",
  "fallbackHooks",
  "metaphorSpecificityPhraseBook",
  "metaphor-specificity-phrasebook",
  "aspectPairSourcePhrases",
  "sourceGroundedRuntime",
  "sourceGroundedV2",
  "sourceGroundedMustacheV22",
  "sourceGroundedModels",
  "finalSourceGroundedDashboardRecords",
  "sourceGroundedReviewCandidates",
  "migration-seeds",
  "templateHandoffV2",
  "lunar-calendar/content-library",
  "lunarCalendarLibraryResolver",
  "cc-compatibility-writeups",
  "cc-compatibility-cards",
  "moon-compatibility-library"
];

for (const [file, contents] of Object.entries(readerServingFiles)) {
  for (const sourceFragment of deletedReaderCopySourceFragments) {
    const escapedFragment = escapeRegExp(sourceFragment);
    assert.doesNotMatch(
      contents,
      new RegExp(`(?:from\\s+|import\\s*\\(|require\\s*\\()["'][^"']*${escapedFragment}[^"']*["']`, "u"),
      `${file} must not import deleted non-package copy source ${sourceFragment}.`
    );
  }
}

assert.match(youPage, /isReaderFacingCopy/, "You detail renderer must use reader-facing copy filtering.");
assert.match(youPage, /isDuplicateArticleCopy/, "You detail renderer must dedupe TLDR, summary, and section body copy.");
assert.doesNotMatch(youPage, /This interpretation is still being prepared\./, "Empty detail pages must not render placeholder copy.");
assert.doesNotMatch(app, /This interpretation is still being prepared\./, "Sky detail pages must not render placeholder copy.");
assert.doesNotMatch(youPage, /emergencyDetailFallbackCopy/, "You detail renderer must not use emergency detail fallback copy.");
assert.match(readerSafety, /markdownDividerLinePattern/, "Reader-facing paragraph cleanup must strip package markdown divider lines.");
assert.doesNotMatch(readerSafety, /\\bmov\(\?:e\|es\|ing\) through\\b/, "Reader safety must not reject V3 transit-house fallback copy for saying moving through.");

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
assert.match(generatedContent, /isGeneratedContentReaderBoundaryAllowed\(row\)/, "Generated content runtime must apply the reader-surface boundary before aliasing rows.");
assert.match(generatedContent, /row\.surface === "synastry"/, "Generated content runtime must block the generic synastry surface.");
assert.match(generatedContent, /contentType === "synastry-kb-seed"/, "Generated content runtime must block synastry KB seed rows.");
assert.doesNotMatch(app, /loadLiveGeneratedContentForSurfaces\(\["relationship", "synastry", "composite"\]/, "Friends must not request the generic synastry generated-content surface.");
assert.doesNotMatch(app, /cc-synastry-web-bundle|authoredSynastryEntryForContact|registrySynastrySection/, "Synastry reader surfaces must not resolve through legacy bundles or registry rows.");
assert.match(app, /function renderReaderDirectedSynastryContact[\s\S]*?renderSynastryAspect\(\{/u, "Synastry cards and details must resolve through renderSynastryAspect.");
assert.match(generatedContent, /generatedRowSectionCopyValues/, "Generated content row safety must inspect actual section body copy instead of serialized metadata.");
assert.doesNotMatch(generatedContent, /row\.headline,\s*\n\s*row\.summary,\s*\n\s*row\.body/, "Generated content row safety must not reject valid reader rows because their headline is a short title.");
assert.doesNotMatch(generatedContent, /unsafeMetadataMarkers[\s\S]*["']source[-_]grounded["']/, "Generated content row safety must not reject the authored content-level label.");
assert.match(app, /transitSynastryFallbackRendererV3\.renderSkyPlacement\(\{/, "Sky placement detail/list rendering must use the fallbackArchitectureV3 sky placement renderer.");
assert.match(
  app,
  /hasRetrogradeGuidance = isDisplayRetrograde\(position\)[\s\S]*renderSkyPlacement\(\{[\s\S]*isRetrograde: hasRetrogradeGuidance/u,
  "Retrograde Sky placement pages must compose approved retrograde guidance into the hybrid placement article."
);
assert.doesNotMatch(app, /resolveSkyWritingArticle\(\{/, "Sky placement detail/list rendering must not use the retired Sky writing package resolver.");
assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/content/skyWriting.ts")), false, "Retired skyWriting.ts must not exist.");
assert.equal(
  fs.existsSync(path.join(repoRoot, "apps/web/src/content/sky-writing/TLDR-Sky-Article-Spec.md")),
  true,
  "The voice-first spec must remain available as the Sky placement contract."
);
assert.doesNotMatch(app, /skyWriting|sky-writing-v1/u, "App reader surfaces must not reference the retired Sky writing package.");
assert.doesNotMatch(app, /emergencySkyPlacementCopy/, "Sky placement detail/list rendering must not use the legacy emergency placement helper.");
assert.doesNotMatch(app, /emergencyDetailFallbackCopy/, "Sky detail renderer must not use emergency detail fallback copy.");
assert.match(app, /function normalizeSkyPlacementSurface/, "Sky placement detail rendering must resolve through the surface normalizer.");
assert.match(app, /skyPlacementWritingSection/, "Sky placement detail rendering must include the fallbackArchitectureV3 authored/fallback section.");
assert.doesNotMatch(app, /sourceMode:\s*"fallback-only"/, "Sky package renderers must not use the retired fallback-only override flag.");
assert.match(app, /skyPlacementWritingBeats\(\{[\s\S]*aspects,[\s\S]*generatedAt,[\s\S]*planet: position\.planet/, "Sky placement rendering must pass computed aspect beats into the fallbackArchitectureV3 sky placement resolver.");
assert.match(app, /exactDate:\s*skyPlacementAspectExactDate\(/, "Sky placement aspect beats must carry a computed exact date.");
assert.match(app, /applying:\s*aspect\.applying/, "Sky placement aspect beats must preserve applying/separating state.");
assert.match(app, /egressDate:\s*skyPlacementEgressDateLabel\(/, "Sky placement articles must receive a computed sign-egress date.");
assert.ok(
  fallbackSourceRowsV3.hookRows.some((row) => row.contentKey === "fallback-hook/sky-placement-hook/sun/leo"),
  "The V3 bank must expose the voice-first Sun-in-Leo hook."
);
assert.ok(
  fallbackSourceRowsV3.hookRows.some((row) => row.contentKey === "fallback-hook/sky-placement-lived/sun/leo"),
  "The V3 bank must expose the concrete Sun-in-Leo lived-expression slot."
);
assert.doesNotMatch(app, /emergencyFallbackParagraph/, "Sky detail renderer must not render a final emergency fallback when normalized slots are empty.");
assert.doesNotMatch(app, /from ["'][^"']*emergencyCopy["']/, "App reader surfaces must not import legacy emergency copy.");
assert.doesNotMatch(app, /emergency[A-Z][A-Za-z0-9_]*/, "App reader surfaces must not call legacy emergency helpers.");
assert.doesNotMatch(youPage, /from ["'][^"']*emergencyCopy["']/, "You reader surfaces must not import legacy emergency copy.");
assert.doesNotMatch(planetTopicVocabulary, /from ["'][^"']*emergencyCopy["']/, "Topic vocabulary must use V3 package rows, not legacy emergency copy.");
assert.match(
  planetTopicVocabulary,
  /if \(variant === "sky"\) \{\s*return fallbackSkyPlanetTopic\(planet\);/,
  "Sky topic rendering must use packaged vocabulary while the remote cache is still loading."
);
assert.match(
  planetTopicVocabulary,
  /if \(!sky && body && !natalLanguagePattern\.test\(body\)\) \{\s*return body;/,
  "Sky topic rendering must accept a safe packaged body when a dedicated sky field is absent."
);
assert.doesNotMatch(lunarCalendar, /from ["'][^"']*emergencyCopy["']/, "Calendar reader surfaces must not import legacy emergency copy.");
assert.doesNotMatch(lunarCalendar, /emergency[A-Z][A-Za-z0-9_]*/, "Calendar reader surfaces must not call legacy emergency helpers.");
assert.doesNotMatch(apiContentGeneration, /emergencyCopy\.json|loadEmergencyVocab|EmergencyVocab/, "API content generation must not read the retired emergency copy tier.");
assert.doesNotMatch(writingSurfaceSourceMap, /emergencyCopy\.json/, "Admin source map must point to the V3 fallback package, not legacy emergency copy.");
assert.doesNotMatch(app, /less patience for waiting/i, "Friends transit emergency summaries must not reuse the same generic angle sentence.");
assert.doesNotMatch(app, /friendTransitEmergencySummary/, "Friends transit summaries must not use legacy emergency prose.");
assert.doesNotMatch(app, /sourceGroundedPersonalTransitForItem/, "Friends transit summaries must not use legacy source-grounded transit prose.");
assert.match(app, /function normalizePersonalTransitSurface/, "Transit-to-natal rendering must resolve through the personal transit surface normalizer.");
assert.match(app, /normalizedSurfacePreview\(normalizePersonalTransitSurface\(transit, generatedAt\)\)/, "Friend transit summaries must render through the v3 personal transit surface normalizer.");
assert.doesNotMatch(app, /personalTransitMadlibFallbackSection/, "Transit-to-natal rendering must not use the retired source-based madlib section.");
assert.match(app, /personalTransitPackageSection/, "Transit-to-natal rendering must stay on the V3 package section path.");
assert.match(app, /aspectAdj:\s*transitAspectTechnicalVerb\(transit\.aspect\)/, "Transit-to-natal slots must include the aspect word so card bodies say square/conjunct/etc.");
const fallbackHookKeys = new Set((fallbackSourceRowsV3.hookRows ?? []).map((row) => row.contentKey));
assert.ok(fallbackHookKeys.has("fallback-hook/transit-aspect-type/square"), "V3 fallback package must include transit aspect hooks.");
const conjunctionSunDailyBody = (fallbackSourceRowsV3.hookRows ?? []).find(
  (row) => row.contentKey === "fallback-hook/daily-body/conjunction/sun"
);
const approvedConjunctionSunDailyBody = "You might catch yourself hesitating over the plan you actually want to skip, or waiting for someone else to say the answer you are hoping for. Playing easygoing does not make you look flexible right now; it just looks like distance, because the desire shows through anyway. Hiding it does not convince anyone, least of all you. Say what you want, and move forward.";
assert.equal(conjunctionSunDailyBody?.body_you, approvedConjunctionSunDailyBody, "You Transit must preserve the approved conjunction-Sun daily body.");
assert.equal(conjunctionSunDailyBody?.body_they, approvedConjunctionSunDailyBody, "The mirrored conjunction-Sun daily body must preserve the approved copy.");
assert.doesNotMatch(app, /resolveSourceGroundedV2\("sky\.planet_sign"/, "Sky placement rendering must not resolve through legacy authored V2 rows.");
assert.match(app, /skyPlacementWritingSection/, "Sky placement rendering must fall back to Sky writing atoms when authored rows are absent.");
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
assert.ok(fallbackHookKeys.has("fallback-hook/compat-domain/moon"), "Friends compatibility fallback hooks must be discoverable in the V3 package catalog.");
assert.match(manualChartsPanel, /transitSynastryFallbackRendererV3\.renderCompat\(\{/, "Compatibility cards must render through the V3 package.");
assert.match(manualChartsPanel, /const yourSign = yourPosition\?\.sign \|\| cachedProfileSign;/, "Compatibility may use the reader's persisted Sun or Moon sign while their full natal chart loads.");
assert.match(manualChartsPanel, /signA:\s*normalizeContentIdPart\(yourSign\)/, "Compatibility direction must keep the reader's sign in signA.");
assert.match(manualChartsPanel, /signB:\s*normalizeContentIdPart\(friendPosition\.sign\)/, "Compatibility direction must keep the friend's sign in signB.");
assert.match(materializeCompatibilityRows, /contentSystem:\s*"authored"/, "Compatibility materialized rows must use the authored content system.");
assert.match(materializeCompatibilityRows, /contentLevel:\s*"source-grounded"/, "Compatibility materialized rows must keep source-grounded as the trust level.");
assert.doesNotMatch(materializeCompatibilityRows, /contentLevel:\s*"dashboard-authored"/, "Compatibility materialized rows must not invent a third content level.");
assert.match(materializeCompatibilityRows, /block_type:\s*"compatibility_planet_card"/, "Compatibility materialized rows must use the compatibility card block type.");
assert.match(servedFieldsContract, /reader: \["reading"\]/, "Authored natal angle rows must render only the clean reading field.");
assert.match(servedFieldsContract, /reader: \["collective_reading"\]/, "Authored Sky point rows must render only the clean collective reading field.");

// Legacy-feature replacement boundary: selection may stay app-owned, but all
// reader words on these surfaces must cross the approved package-row gate.
assert.match(app, /renderHouseGlossaryV3\(house\)\.body/, "House glossary must render package output verbatim.");
assert.doesNotMatch(app, /const naturalHouseLensBodies:\s*Record<number, string>\s*=\s*\{/, "House glossary must not restore a local prose table.");
// Aspect patterns are the one reader surface served by the governed
// astro-knowledge resolver: its records carry editorial review status,
// confidence eligibility, and semantic section ids, so the server-resolved
// copy is canonical and the local V3 hooks are retired for this surface.
assert.doesNotMatch(natalAspectPatterns, /renderAspectPatternV3|fallbackArchitectureV3Runtime/, "Aspect-pattern copy must not render through retired local V3 hooks.");
assert.match(natalAspectPatterns, /includeAspectPatternCopy:\s*"true"/, "Aspect-pattern reader must request governed astro-knowledge resolver copy.");
assert.match(natalAspectPatterns, /resolvedCopy/, "Aspect-pattern reader must consume server-resolved governed copy.");
assert.doesNotMatch(app, /friends\.same-planet|samePlanetSynastryContentKeys|samePlanetSynastryFallback/, "Same-planet synastry must not restore its legacy key or prose scheme.");
assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/services/samePlanetSynastry.ts")), false, "Legacy samePlanetSynastry.ts must stay deleted.");
assert.match(app, /renderSynastryAspect\(\{/, "Synastry surfaces must use the V3 package renderer.");
assert.match(careerArchetype, /fallbackV3(?:Hook|Vocabulary)Body/, "Career selection must read approved package rows.");
assert.doesNotMatch(careerArchetype, /const (?:signCareerTones|houseCareerThemes|planetInTenthMeanings|fallbackByPrefix)\b/, "Career prose tables must stay deleted.");
assert.match(soulRoadmap, /fallback-vocab\/roadmap-(?:theme|sun|path|moon-style|moon-contribution|motto)/, "Soul Roadmap must assemble package vocabulary.");
assert.doesNotMatch(soulRoadmap, /const signRoadmaps\b/, "Soul Roadmap must not restore its embedded sign prose table.");
assert.doesNotMatch(placementRows, /const (?:chartPlacementDescriptions|compositePlacementDescriptions)\b/, "PlacementRows must not restore local reader prose.");
assert.doesNotMatch(lunarDayResolver, /const (?:moonSignModes|seasonThemes|twoWeekArcConnections|sixMonthArcConnections)\b/, "Lunar resolver must not restore local prose tables.");
assert.match(fallbackRuntime, /\.filter\(isReaderEligible\)/, "All directly accessed V3 rows must pass the review-status gate.");

const jul29PlacementPositiveTest = "passed-jul29-criteria";
const jul29PlacementSentenceKeys = [
  "fallback-hook/placement-sentence/moon/scorpio",
  "fallback-hook/placement-sentence/mars/aquarius",
  "fallback-hook/placement-sentence/mercury/pisces"
];
const jul29HouseCuspKeys = [
  "fallback-hook/house-cusp/taurus",
  "fallback-hook/house-cusp/cancer",
  "fallback-hook/house-cusp/leo",
  "fallback-hook/house-cusp/virgo",
  "fallback-hook/house-cusp/libra",
  "fallback-hook/house-cusp/scorpio",
  "fallback-hook/house-cusp/sagittarius",
  "fallback-hook/house-cusp/capricorn",
  "fallback-hook/house-cusp/aquarius",
  "fallback-hook/house-cusp/pisces"
];
const allHouseCuspKeys = [
  "fallback-hook/house-cusp/aries",
  "fallback-hook/house-cusp/taurus",
  "fallback-hook/house-cusp/gemini",
  "fallback-hook/house-cusp/cancer",
  "fallback-hook/house-cusp/leo",
  "fallback-hook/house-cusp/virgo",
  "fallback-hook/house-cusp/libra",
  "fallback-hook/house-cusp/scorpio",
  "fallback-hook/house-cusp/sagittarius",
  "fallback-hook/house-cusp/capricorn",
  "fallback-hook/house-cusp/aquarius",
  "fallback-hook/house-cusp/pisces"
];
const fallbackHooksByKey = new Map(fallbackHookRows.map((row) => [row.contentKey, row]));
const jul29OwnerApprovedKeys = new Set([...jul29PlacementSentenceKeys, ...jul29HouseCuspKeys]);

for (const contentKey of jul29OwnerApprovedKeys) {
  assert.equal(
    fallbackHooksByKey.get(contentKey)?.review_status,
    "approved",
    `${contentKey} must remain reader-serving after owner approval.`
  );
}

for (const contentKey of jul29PlacementSentenceKeys) {
  assert.equal(
    fallbackHooksByKey.get(contentKey)?.positive_test,
    jul29PlacementPositiveTest,
    `${contentKey} must carry the Jul 29 positive-test marker.`
  );
}

assert.match(
  materializeFallbackArchitectureRows,
  /placementSentencePositiveTest = "passed-jul29-criteria"/u,
  "Dashboard import must name the Jul 29 placement-sentence positive test."
);
assert.match(
  materializeFallbackArchitectureRows,
  /requiresPlacementPositiveTest/u,
  "Dashboard import must gate new placement-sentence rows on the positive test."
);
assert.match(
  materializeFallbackArchitectureRows,
  /positive_test: record\.positive_test \?\? null/u,
  "Dashboard mirrors must preserve positive_test metadata."
);

function rowTextFields(row) {
  return ["body", "body_you", "body_they", "text", "summary"]
    .map((field) => row[field])
    .filter((value) => typeof value === "string");
}

function rowContainsWord(row, word) {
  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "iu");
  return rowTextFields(row).some((value) => pattern.test(value));
}

const placementAndEmptyHouseRows = fallbackHookRows.filter((row) => (
  row.contentKey.startsWith("fallback-hook/placement-sentence/")
  || row.contentKey.startsWith("fallback-hook/house-cusp/")
  || row.contentKey.startsWith("fallback-hook/empty-house-")
));
const hurtFlags = placementAndEmptyHouseRows
  .filter((row) => rowContainsWord(row, "hurt"))
  .map((row) => ({
    contentKey: row.contentKey,
    review_status: row.review_status,
    fields: ["body", "body_you", "body_they", "text", "summary"].filter((field) => (
      typeof row[field] === "string" && /\bhurt\b/iu.test(row[field])
    ))
  }))
  .sort((a, b) => a.contentKey.localeCompare(b.contentKey));

for (const contentKey of jul29OwnerApprovedKeys) {
  const row = fallbackHooksByKey.get(contentKey);
  assert.ok(row, `${contentKey} must exist in fallback hook rows.`);
  assert.equal(rowContainsWord(row, "hurt"), false, `${contentKey} must not contain hurt.`);
}

function collisionWords(value) {
  return value
    .toLowerCase()
    .replace(/\{+[^}]+\}+/gu, " ")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

const houseCuspRows = allHouseCuspKeys.map((contentKey) => fallbackHooksByKey.get(contentKey)).filter(Boolean);
const houseCuspStemMap = new Map();
for (const row of houseCuspRows) {
  const words = collisionWords(row.body_you ?? "");
  for (let index = 0; index <= words.length - 3; index += 1) {
    const stem = words.slice(index, index + 3).join(" ");
    const owners = houseCuspStemMap.get(stem) ?? new Set();
    owners.add(row.contentKey);
    houseCuspStemMap.set(stem, owners);
  }
}
const sharedHouseCuspStems = [...houseCuspStemMap.entries()]
  .filter(([, owners]) => owners.size > 1)
  .map(([stem, owners]) => ({ stem, rows: [...owners].sort() }))
  .sort((a, b) => b.rows.length - a.rows.length || a.stem.localeCompare(b.stem));

const jul29Report = {
  files: {
    "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json": {
      jul29OwnerApprovedRows: jul29OwnerApprovedKeys.size,
      jul29PlacementPositiveTests: jul29PlacementSentenceKeys.filter((contentKey) => (
        fallbackHooksByKey.get(contentKey)?.positive_test === jul29PlacementPositiveTest
      )).length,
      hurtFlags,
      houseCuspCollisionCount: sharedHouseCuspStems.length,
      houseCuspCollisions: sharedHouseCuspStems
    },
    "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs": {
      placementPositiveTestGate: true,
      positiveTestMirrorFields: 3
    },
    "scripts/test-reader-facing-content-contract.mjs": {
      bannedWordsReportedNotAutoEdited: ["hurt"],
      collisionReportScope: "all 12 house-cusp rows"
    }
  }
};
const jul29ReportPath = path.join(repoRoot, "scripts/generated/m1-m3-jul29-contract-report.json");
fs.mkdirSync(path.dirname(jul29ReportPath), { recursive: true });
fs.writeFileSync(jul29ReportPath, `${JSON.stringify(jul29Report, null, 2)}\n`);

const licensedCareerContactsPhrase = "Shortcuts, contacts, been-there calm";
const synastryReaderRows = [
  ...(transitSynastryRowsV1.authoredCards ?? []),
  ...(fallbackSourceRowsV3.fallbackSourceRows ?? []),
  ...(fallbackSourceRowsV3.hookRows ?? []),
  ...(fallbackSourceRowsV3.vocabularyRows ?? [])
].filter((row) => /(synastry|compat|bond|circle)/iu.test(`${row.contentKey ?? ""} ${row.surface ?? ""}`));
let licensedCareerContactsCount = 0;
for (const row of synastryReaderRows) {
  for (const field of ["body", "body_you", "body_they"]) {
    if (typeof row[field] !== "string") continue;
    licensedCareerContactsCount += row[field].split(licensedCareerContactsPhrase).length - 1;
    assert.doesNotMatch(
      row[field]
        .replaceAll(licensedCareerContactsPhrase, "")
        .replaceAll("amount of contact", ""),
      /\bcontacts?\b/iu,
      `${row.contentKey} ${field} must say connection, not contact.`
    );
  }
}
assert.equal(licensedCareerContactsCount, 2, "Only the two licensed career-network uses of contacts may remain.");
assert.match(
  manualChartsPanel,
  /transiting === "lilith" && activationAspect !== "conjunction" && activationAspect !== "opposition"/u,
  "Friends bond transit selection must keep the Lilith conjunction/opposition-only gate."
);

console.log("Reader-facing content contract passed.");
