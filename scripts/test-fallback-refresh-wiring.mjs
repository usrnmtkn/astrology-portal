#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PACKAGE_VERSION,
  createFallbackRenderer,
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");

function readPackageJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(packageDir, relativePath), "utf8"));
}

const sourceRows = readPackageJson("source-rows/fallback-source-rows-v3.json");
const transitRows = readPackageJson("source-rows/transit-synastry-rows-v1.json");
const templates = readPackageJson("templates/fallback-templates-v3.json");

const natalRenderer = createFallbackRenderer(templates, sourceRows);
const transitRenderer = createTransitSynastryRenderer(transitRows, templates, sourceRows);
const jul29M1M3NeedsReviewKeys = new Set([
  "fallback-hook/placement-sentence/moon/scorpio",
  "fallback-hook/placement-sentence/mars/aquarius",
  "fallback-hook/placement-sentence/mercury/pisces",
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
]);

const counts = {
  authoredCards: transitRows.authoredCards.length,
  fallbackHooks: sourceRows.hookRows.length,
  vocabulary: sourceRows.vocabularyRows.length,
  templates: templates.templates.length,
  sourceMaterial: sourceRows.fallbackSourceRows.length
};

assert.equal(PACKAGE_VERSION, "v3-2026-07-29m");
assert.ok(counts.authoredCards > 0, "Package must include authored transit/synastry cards.");
assert.ok(counts.fallbackHooks > 0, "Package must include fallback hooks.");
assert.ok(counts.vocabulary > 0, "Package must include vocabulary rows.");
assert.ok(counts.templates > 0, "Package must include templates.");
const packageRows = [
  ...transitRows.authoredCards,
  ...sourceRows.hookRows,
  ...sourceRows.vocabularyRows,
  ...templates.templates
];
const needsReviewCards = transitRows.authoredCards.filter((row) => row.review_status === "needs_review");
const needsReviewHooks = sourceRows.hookRows.filter((row) => row.review_status === "needs_review");
const needsReviewRows = packageRows.filter((row) => row.review_status === "needs_review");
const unexpectedNeedsReviewRows = needsReviewRows
  .map((row) => row.contentKey)
  .filter((contentKey) => !jul29M1M3NeedsReviewKeys.has(contentKey))
  .sort();
const missingJul29NeedsReviewRows = [...jul29M1M3NeedsReviewKeys]
  .filter((contentKey) => !needsReviewRows.some((row) => row.contentKey === contentKey))
  .sort();
assert.equal(needsReviewCards.length, 0, "All authored cards must be reader eligible.");
assert.equal(needsReviewHooks.length, jul29M1M3NeedsReviewKeys.size, "Only the Jul 29 M1/M3 batch may remain review gated.");
assert.deepEqual(unexpectedNeedsReviewRows, [], "No rows outside the Jul 29 M1/M3 batch may remain review gated.");
assert.deepEqual(missingJul29NeedsReviewRows, [], "The Jul 29 M1/M3 batch must remain review gated until owner approval.");

const friendVoiceRows = [
  ...transitRows.authoredCards,
  ...sourceRows.hookRows
].filter((row) => typeof row.body_they === "string");
const personalTransitFriendRows = friendVoiceRows.filter((row) => (
  row.contentKey.startsWith("authored/transit-house-")
  || row.contentKey.startsWith("fallback-hook/transit-house-")
));
const prepositionTheyPattern = /\b(?:to|for|with|at|from|of|about|around|through|toward|towards|against|between|among|by|beside|behind|under|over|into|onto|off|near|without|within)\s+they\b|(?<!early )(?<!later )\bon\s+they\b/iu;
const objectPositionTheyPattern = /(?<!their )\b(?:expect(?:s)?|lift(?:s)?|embarrass(?:es)?|enjoy(?:s)?|trust(?:s)?|grow(?:s)?|enlarge(?:s)?|pair(?:s|ing)?|erase(?:s)?|rebuild(?:s)?|favor(?:s)?|scatter(?:s)?|fuel(?:s)?|shift(?:s)?|run(?:s)?)\s+they\b/iu;
const themVerbPattern = /\bthem\s+(?:feel|feels|think|thinks|want|wants|need|needs|expect|expects|carry|carries|navigate|navigates|trust|trusts|enjoy|enjoys|lift|lifts|embarrass|embarrasses)\b/giu;
const legitimateThemVerbGovernor = /(?:let(?:s|ting)?|mak(?:e|es|ing)|made|around|of|in|with|nearest)\s+$/iu;
const subjectFormPredicatePattern = /\b(?:is|was)\s+they\b/iu;
const adjectiveTheyPattern = /\b(?:distinct)\s+they\b/iu;
const reflexiveObjectPattern = /\b(?:let|make|help|allow)\s+themselves\b/iu;

for (const row of personalTransitFriendRows) {
  assert.doesNotMatch(
    row.body_they,
    /\b(?:you|your|yours|yourself)\b/iu,
    `${row.contentKey}: second-person leak in personal friend voice`
  );
}

for (const row of friendVoiceRows) {
  assert.doesNotMatch(
    row.body_they,
    prepositionTheyPattern,
    `${row.contentKey}: preposition followed by subject-form they`
  );
  assert.doesNotMatch(
    row.body_they,
    objectPositionTheyPattern,
    `${row.contentKey}: object-position pronoun converted to they`
  );
  assert.doesNotMatch(
    row.body_they,
    subjectFormPredicatePattern,
    `${row.contentKey}: predicate pronoun converted to they`
  );
  assert.doesNotMatch(
    row.body_they,
    adjectiveTheyPattern,
    `${row.contentKey}: adjective followed by subject-form they`
  );
  assert.doesNotMatch(
    row.body_they,
    reflexiveObjectPattern,
    `${row.contentKey}: object-position pronoun converted to themselves`
  );

  for (const match of row.body_they.matchAll(themVerbPattern)) {
    const prefix = row.body_they.slice(Math.max(0, match.index - 24), match.index);

    assert.match(
      prefix,
      legitimateThemVerbGovernor,
      `${row.contentKey}: possible them-as-subject regression near "${match[0]}"`
    );
  }

  const openingSlots = row.body_they.match(/\{\{/gu)?.length ?? 0;
  const closingSlots = row.body_they.match(/\}\}/gu)?.length ?? 0;
  assert.equal(
    openingSlots,
    closingSlots,
    `${row.contentKey}: unbalanced template slot braces`
  );

  for (const slot of row.body_they.matchAll(/\{\{[^{}]*\}\}/gu)) {
    assert.match(
      slot[0],
      /^\{\{[A-Za-z][A-Za-z0-9_.]*\}\}$/u,
      `${row.contentKey}: malformed template slot`
    );
  }
}

const reversedMercuryCompat = transitRenderer.renderCompat({
  planet: "mercury",
  signA: "scorpio",
  signB: "gemini",
  otherName: "X"
});
assert.equal(reversedMercuryCompat.contentKey, "authored/compat-pair/mercury/scorpio/gemini");
assert.equal(reversedMercuryCompat.templateKey, "authored/compat-pair");

const friendTransit = transitRenderer.renderTransitAspect({
  transiting: "moon",
  aspect: "square",
  natal: "venus",
  sign: "taurus",
  voice: "Sofia",
  window: "Until November 13"
});
assert.equal(friendTransit.headline, "Moon square Sofia's Venus");
assert.equal(friendTransit.contentKey, "authored/transit-aspect/moon/venus/hard");
assert.match(friendTransit.body, /^They can say yes to plans and quietly hope they fall through\./u);
assert.doesNotMatch(friendTransit.body, /The Moon in Taurus wants comfort of the touchable kind;/u);
assert.doesNotMatch(friendTransit.body, /\byou(?:r|rs|self)?\b/iu);

const friendHouse = transitRenderer.renderTransitHouse({
  planet: "saturn",
  house: 7,
  voice: "Sofia",
  window: "Until November 13"
});
assert.equal(friendHouse.headline, "Saturn moving through Sofia's 7th house");
assert.match(friendHouse.body, /^Until November 13, Saturn is moving through Sofia's 7th house\./u);
assert.doesNotMatch(friendHouse.body, /\byou(?:r|rs|self)?\b/iu);

const signedChironAspect = transitRenderer.renderTransitAspect({
  transiting: "chiron",
  natal: "jupiter",
  aspect: "square",
  sign: "taurus",
  window: "Until July 30"
});
assert.match(
  signedChironAspect.body,
  /^The question of what it all means gets loud:/u
);
assert.match(
  signedChironAspect.body,
  /Chiron square your Jupiter until July 30 can make it hard to tell hope from avoidance for a while\./u
);
assert.doesNotMatch(signedChironAspect.body, /In plain terms:/u);

const layeredVenusHouse = transitRenderer.renderTransitHouse({
  planet: "venus",
  house: 7,
  sign: "libra",
  events: [{
    natal: "saturn",
    aspect: "square",
    window: "Until August 2"
  }]
});
assert.equal(layeredVenusHouse.templateKey, "authored/transit-house-layered");
assert.equal(layeredVenusHouse.contentKey, "authored/transit-house-sign/venus/7/libra");
assert.equal(layeredVenusHouse.parts.length, 3);
assert.match(layeredVenusHouse.parts[2], /your natal Saturn/u);
assert.match(layeredVenusHouse.parts[2], /squaring your natal Saturn/u);
assert.match(layeredVenusHouse.parts[2], /until August 2\./u);
assert.doesNotMatch(layeredVenusHouse.body, /\{\{/u);

const layeredSunHouse = transitRenderer.renderTransitHouse({
  planet: "sun",
  house: 1,
  sign: "aries",
  events: [{
    natal: "saturn",
    aspect: "square",
    window: "Until August 2"
  }]
});
assert.equal(layeredSunHouse.templateKey, "authored/transit-house-layered");
assert.equal(layeredSunHouse.contentKey, "authored/transit-house-sign/sun/1/aries");
assert.equal(layeredSunHouse.parts.length, 3);
assert.match(layeredSunHouse.parts[2], /squaring your natal Saturn/u);
assert.match(layeredSunHouse.parts[2], /until August 2\./u);
assert.match(layeredSunHouse.body, /month|weeks/u);

const layeredMercuryHouse = transitRenderer.renderTransitHouse({
  planet: "mercury",
  house: 3,
  sign: "gemini",
  isRetrograde: true,
  events: [{
    natal: "moon",
    aspect: "trine",
    window: "August 2, 2026"
  }]
});
assert.equal(layeredMercuryHouse.templateKey, "authored/transit-house-layered");
assert.equal(layeredMercuryHouse.contentKey, "authored/transit-house-sign/mercury/3/gemini");
assert.equal(layeredMercuryHouse.parts.length, 4);
assert.match(layeredMercuryHouse.parts[2], /revise rather than redo/u);
assert.match(layeredMercuryHouse.parts[3], /trining your natal Moon/u);
assert.match(layeredMercuryHouse.parts[3], /until August 2, 2026/u);
assert.match(layeredMercuryHouse.parts[3], /Mercury in Gemini wants all the tabs open; your Moon guards/u);
assert.doesNotMatch(layeredMercuryHouse.parts[3], /In plain terms|through Until/u);
assert.match(layeredMercuryHouse.body, /weeks/u);

const layeredJupiterWindow = transitRenderer.renderTransitHouse({
  planet: "jupiter",
  house: 1,
  sign: "sagittarius",
  events: [{
    natal: "sun",
    aspect: "trine",
    window: "March 2027"
  }]
});
assert.match(
  layeredJupiterWindow.parts[2],
  /it is also trining your natal Sun until March 2027\./u
);
assert.doesNotMatch(layeredJupiterWindow.parts[2], /\bthrough March 2027\b/u);

const retiredEventMetaphors = /grinding against|tugging at|glaring at|crosstalking|trading notes with|feeding energy to/iu;
assert.doesNotMatch(
  [layeredVenusHouse.body, layeredSunHouse.body, layeredMercuryHouse.body].join("\n"),
  retiredEventMetaphors
);

const beneficConjunctionHouse = transitRenderer.renderTransitHouse({
  planet: "venus",
  house: 4,
  sign: "virgo",
  events: [{
    natal: "north-node",
    aspect: "conjunction",
    window: "July 30, 2026"
  }]
});
assert.match(beneficConjunctionHouse.parts[2], /sitting right on your natal North Node/u);
assert.match(beneficConjunctionHouse.parts[2], /the growth tastes good/u);
assert.doesNotMatch(beneficConjunctionHouse.parts[2], /Comfort lobbies against growth/u);

const retrogradeHouseCases = [
  { planet: "mars", house: 1, sign: "aries", overlay: /drive turns inward and doubles back/u },
  { planet: "venus", house: 7, sign: "libra", overlay: /window reviews instead of previews/u },
  { planet: "mercury", house: 3, sign: "gemini", overlay: /revise rather than redo/u }
];

for (const facts of retrogradeHouseCases) {
  const direct = transitRenderer.renderTransitHouse({
    planet: facts.planet,
    house: facts.house,
    sign: facts.sign
  });
  const retrograde = transitRenderer.renderTransitHouse({
    planet: facts.planet,
    house: facts.house,
    sign: facts.sign,
    isRetrograde: true
  });

  assert.equal(retrograde.parts.length, direct.parts.length + 1);
  assert.match(retrograde.parts[2], facts.overlay);
}

const nodeAspect = natalRenderer.renderNatalAspect({
  planetA: "mars",
  aspect: "square",
  planetB: "north-node",
  voice: "you"
});
assert.equal(nodeAspect.headline, "Your Mars square North Node");
assert.match(nodeAspect.body, /Your energy fights your own direction/u);
assert.doesNotMatch(nodeAspect.body, /two chart functions|contact works best|generic frame/iu);

const chironAspect = natalRenderer.renderNatalAspect({
  planetA: "chiron",
  aspect: "trine",
  planetB: "venus",
  voice: "Sofia"
});
assert.equal(chironAspect.headline, "Sofia's Chiron trine Venus");
assert.match(chironAspect.body, /Old heartbreak made them kind instead of hard/u);
assert.doesNotMatch(chironAspect.body, /\byou(?:r|rs|self)?\b/iu);

const lilithAspect = natalRenderer.renderNatalAspect({
  planetA: "lilith",
  aspect: "square",
  planetB: "moon",
  voice: "Sofia"
});
assert.equal(lilithAspect.headline, "Sofia's Lilith square Moon");
assert.match(lilithAspect.body, /Suppressed needs always surface ugly/u);
assert.doesNotMatch(lilithAspect.body, /\byou(?:r|rs|self)?\b/iu);

const outerConnection = transitRenderer.renderSynastryAspect({
  planetA: "venus",
  planetB: "pluto",
  aspect: "trine",
  otherName: "Sofia"
});
assert.equal(outerConnection.headline, "Your Venus trine Sofia's Pluto");
assert.match(outerConnection.body, /the attraction between you runs hotter and deeper than either expected/u);
assert.match(outerConnection.body, /Build the trust to match the heat/u);

const connectionTransit = transitRenderer.renderBondTransit({
  transiting: "saturn",
  aspect: "square",
  endpointPlanet: "venus",
  endpointOwner: "reader",
  activatedPlanets: ["pluto"],
  otherName: "Sofia",
  window: "Until November 13"
});
const exactSaturnSquareBond = sourceRows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/bond-effect-square/saturn"
);
assert.ok(exactSaturnSquareBond, "The exact Saturn-square bond row must exist.");
assert.ok(
  connectionTransit.body.startsWith(exactSaturnSquareBond.body_you),
  "Exact aspect copy must supersede the legacy hard-family fallback."
);
assert.match(
  connectionTransit.body,
  /Saturn is square your Venus through November 13, activating the connection it makes with Sofia's Pluto\./u
);
assert.equal(connectionTransit.headline, "Saturn square your Venus");
assert.doesNotMatch(connectionTransit.body, /connection between/iu);
assert.doesNotMatch(connectionTransit.body, /That underlying contact is/u);

const baseConnectionVariant = transitRenderer.renderBondTransit({
  transiting: "mars",
  aspect: "square",
  endpointPlanet: "venus",
  endpointOwner: "friend",
  activatedPlanets: ["moon"],
  otherName: "X"
});
const thirdConnectionVariant = transitRenderer.renderBondTransit({
  transiting: "mars",
  aspect: "square",
  endpointPlanet: "venus",
  endpointOwner: "friend",
  activatedPlanets: ["moon"],
  otherName: "X",
  variant: 3
});
assert.equal(
  thirdConnectionVariant.body,
  baseConnectionVariant.body,
  "Exact aspect copy must remain byte-identical instead of rotating legacy family variants."
);

const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const bondGroupingSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/services/bondTransitGrouping.ts"),
  "utf8"
);
const aspectStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles/aspects.css"), "utf8");
const dashboardImportSource = fs.readFileSync(
  path.join(repoRoot, "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs"),
  "utf8"
);
const runtimeSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3Runtime.ts"),
  "utf8"
);

assert.match(
  appSource,
  /renderTransitAspect\(\{[\s\S]*?voice[\s\S]*?\}\)/u,
  "Friend transit cards must pass voice through renderTransitAspect."
);
assert.match(
  appSource,
  /function transitNote\(transitPlanet: string, transitSign: string, aspect: string, natalPoint: string\)[\s\S]*?renderTransitAspect\(\{[\s\S]*?sign:\s*normalizeContentIdPart\(transitSign\)/u,
  "Daily transit notes must pass the engine's transiting sign into renderTransitAspect."
);
assert.match(
  appSource,
  /note:\s*transitNote\(transitPosition\.planet,\s*transitPosition\.sign,\s*aspect\.type,\s*natalPosition\.planet\)/u,
  "Daily transit-note callers must forward the available transiting sign."
);
assert.match(
  appSource,
  /renderTransitAspect\(\{[\s\S]*?natal:\s*normalizeContentIdPart\(transit\.natalPoint\),[\s\S]*?sign:\s*transit\.transitSign \? normalizeContentIdPart\(transit\.transitSign\) : undefined,[\s\S]*?transiting:\s*normalizeContentIdPart\(transit\.transitPlanet\)/u,
  "Personal transit package renderers must pass the available transiting sign."
);
assert.doesNotMatch(
  friendTransit.body,
  /\b(?:you|your|yourself)\b/iu,
  "Moon/Taurus sign-aware wants line must remain clean in friend voice."
);
assert.match(
  appSource,
  /month: "long"[\s\S]*?day: "numeric"[\s\S]*?return `Until \$\{endLabel\}`;/u,
  "Personal transit aspect windows must render as an inline-ready long month and day."
);
assert.match(
  appSource,
  /renderTransitHouse\(\{[\s\S]*?voice[\s\S]*?\}\)/u,
  "Transit house cards must pass voice through renderTransitHouse."
);
assert.match(
  appSource,
  /renderTransitHouse\(\{[\s\S]*?sign:\s*normalizeContentIdPart\(transit\.transitSign \?\? ""\)[\s\S]*?\}\)/u,
  "Transit house cards must pass the transiting sign so authored layered copy can resolve."
);
assert.match(
  appSource,
  /renderTransitHouse\(\{[\s\S]*?events[\s\S]*?\}\)/u,
  "Transit house cards must pass the engine's qualifying aspect events into layered write-ups."
);
assert.match(
  appSource,
  /renderTransitHouse\(\{[\s\S]*?isRetrograde:\s*transit\.transitMotion === "retrograde"[\s\S]*?\}\)/u,
  "Transit house cards must pass the engine's retrograde flag into layered write-ups."
);
assert.match(
  appSource,
  /window:\s*transitHouseAspectEventWindow\(transit,\s*generatedAt\)/u,
  "Transit house event windows must pass a bare end date for the package's through-date composer."
);
assert.match(
  appSource,
  /const renderedWindow = typeof rendered\.window === "string"[\s\S]*?window: renderedWindow/u,
  "Transit house cards must carry the resolver-returned window into app chrome."
);
assert.match(
  appSource,
  /const openFriendHouseTransitDetail[\s\S]*?sections: card\.normalized\.sections\.map\(\(section\) => \(\{[\s\S]*?heading: "",/u,
  "Friend house-transit details must not repeat the resolver headline below the page title."
);
assert.match(
  appSource,
  /const transitCardPreviewSentenceLimit = 2;[\s\S]*?const transitCardPreviewCharacterLimit = 280;[\s\S]*?function transitCardPreview/u,
  "Transit cards must use the shared two-sentence preview with a hard character cap."
);
assert.match(
  appSource,
  /const rowSummary = transitCardPreview\(normalizedSurfacePreview\(normalizedTransit\)\)/u,
  "Personal aspect-transit cards must use the truncated preview."
);
assert.match(
  appSource,
  /const rowSummary = transitCardPreview\(\s*transitBodyWithoutRepeatedWindow\(normalizedSurfacePreview\(normalizedHouseTransit\), renderedWindow\)\s*\)/u,
  "Personal house-transit cards must remove a repeated visible window before truncating the preview."
);
assert.match(
  appSource,
  /rowSummary: transitCardPreview\(\s*transitBodyWithoutRepeatedWindow\(normalizedSurfacePreview\(normalized\), renderedWindow\)\s*\)/u,
  "Friend house-transit cards must remove a repeated visible window before truncating the preview."
);
assert.match(
  appSource,
  /onClick=\{\(\) => openBondTransitDetail\(card\)\}[\s\S]*?transitCardPreview\(card\.body\)/u,
  "Connection-transit cards must be clickable and display only a preview."
);
assert.match(
  appSource,
  /const openBondTransitDetail[\s\S]*?body: card\.body\.split\(/u,
  "Connection-transit detail views must retain the full authored body."
);
assert.match(
  appSource,
  /onClick=\{\(\) => openFriendTransitDetail\(transit\)\}/u,
  "Friend personal-transit cards must open a detail view."
);
assert.match(
  appSource,
  /const openFriendTransitDetail[\s\S]*?sections: normalized\.sections\.map\(\(section\) => \(\{[\s\S]*?body: section\.body/u,
  "Friend personal-transit detail views must retain the full normalized write-up."
);
assert.match(
  aspectStylesSource,
  /\.transit-card-preview\s*\{[\s\S]*?-webkit-line-clamp:\s*4;/u,
  "Transit-card previews must retain a visual line-clamp fallback."
);
assert.match(
  appSource,
  /renderNatalAspect\(\{[\s\S]*?voice: ownerContext\?\.ownerName \?\? "you"[\s\S]*?\}\)/u,
  "Friend natal aspects must use the natal renderer with friend voice."
);
assert.match(
  appSource,
  /renderSynastryAspect\(\{[\s\S]*?planetA: normalizeContentIdPart\(contact\.yourPoint\.name\)[\s\S]*?planetB: normalizeContentIdPart\(contact\.friendPoint\.name\)[\s\S]*?otherName: friendName[\s\S]*?\}\)/u,
  "Synastry must stay reader-directed: planetA is reader, planetB is friend."
);
assert.match(
  appSource,
  /Math\.min\(\.\.\.transit\.arc\) <= 1[\s\S]*?renderBondTransit\(\{/u,
  "Bond transits must use the <=1 degree endpoint gate before renderBondTransit."
);
assert.match(
  appSource,
  /renderTransitAspect\(\{[\s\S]*?variant: stableTransitCopyVariant\(/u,
  "Transit aspects must receive a stable repeat-viewer variant."
);
assert.match(
  appSource,
  /renderTransitHouse\(\{[\s\S]*?variant: stableTransitCopyVariant\(/u,
  "Friend transit houses must receive a stable repeat-viewer variant."
);
assert.match(
  appSource,
  /renderBondTransit\(\{[\s\S]*?variant: variantSlot === 1 \? undefined : variantSlot/u,
  "Bond transits must retain rotated stable variants for legacy fallback rows."
);
assert.match(
  appSource,
  /const groups = groupBondTransitActivations\(candidates\)/u,
  "Bond transit contacts must group before rendering cards."
);
assert.match(
  bondGroupingSource,
  /`\$\{transiting\}:\$\{aspect\}:\$\{endpointPlanet\}:\$\{candidate\.endpointOwner\}`/u,
  "The grouping key must include transiting planet, aspect, endpoint planet, and endpoint owner."
);
assert.match(
  appSource,
  /effectBody: rendered\.parts\[0\] \?\? ""/u,
  "Bond cards must retain the single effect body separately from the computed closing line."
);
assert.match(
  runtimeSource,
  /authoredCards: bundle\.transitLib\.authoredCards\.filter\(isReaderEligible\)/u,
  "Production must filter review-gated authored cards before creating the dist renderer."
);
assert.match(
  runtimeSource,
  /hookRows: \(bundle\.rowsFile\.hookRows \?\? \[\]\)\.filter\(isReaderEligible\)/u,
  "Production must filter review-gated hook variants before creating the dist renderer."
);

assert.match(
  dashboardImportSource,
  /import \{ PACKAGE_VERSION \} from "\.\.\/apps\/web\/src\/content\/fallbackArchitectureV3\/dist\/tldr-content\.js";[\s\S]*?const importBatchId = `fallback-architecture-\$\{PACKAGE_VERSION\}`;/u,
  "Dashboard imports must label each mirror from the installed package version."
);
assert.match(
  dashboardImportSource,
  /const counts = \{[\s\S]*?authoredCards: countBy\([\s\S]*?fallbackHooks: countBy\([\s\S]*?vocabulary: countBy\([\s\S]*?templates: countBy\([\s\S]*?sourceMaterial: countBy\(/u,
  "Dashboard counts must be computed from materialized package rows instead of constants."
);
assert.match(
  dashboardImportSource,
  /function verifyImportedMirror[\s\S]*?Dashboard mirror count mismatch[\s\S]*?Dashboard mirror key mismatch[\s\S]*?Dashboard mirror row mismatch/u,
  "Dashboard verification must fail on count, key, or total-row drift."
);
assert.match(
  dashboardImportSource,
  /const upserted = await upsertRows\(rows\);[\s\S]*?const deleted = await deleteStaleRows\(rows\);/u,
  "Dashboard imports must upsert the new mirror before removing stale provider rows."
);

console.log("fallback refresh wiring checks passed", counts);
