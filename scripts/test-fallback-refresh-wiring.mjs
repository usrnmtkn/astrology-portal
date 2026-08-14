#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PACKAGE_VERSION,
  createFallbackRenderer,
  createPackageManifest,
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const friendTransitsTabSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendTransitsTab.tsx"),
  "utf8"
);

function readPackageJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(packageDir, relativePath), "utf8"));
}

const sourceRows = readPackageJson("source-rows/fallback-source-rows-v3.json");
const bondLanguagePass2 = readPackageJson("source-rows/bond-language-pass-2.json");
const transitRows = readPackageJson("source-rows/transit-synastry-rows-v1.json");
const templates = readPackageJson("templates/fallback-templates-v3.json");
const placementInterimRows = readPackageJson("source-rows/placement-interim-fixes-v1.json");
const lunationBlendRows = readPackageJson("source-rows/lunation-blend-units-v1.json");
const skyArticleRows = readPackageJson("source-rows/sky-article-v1.json");
const skyAspectPhrasebook = readPackageJson("source-rows/sky-aspect-phrasebook-v1.json");
const skyPlacementVoicePass = readPackageJson("source-rows/sky-placement-inventories-voice-pass-v1.json");
const skyPlacementOwnerApprovedFallbacks = readPackageJson("source-rows/sky-placement-owner-approved-fallbacks-v1.json");
const sunLeoHouseCores = readPackageJson("source-rows/sun-leo-house-cores-v1.json");
const sunLeoHouseCoreReaderRows = sunLeoHouseCores.rows.map(({
  notes: _notes,
  source_keys: _sourceKeys,
  approved_via: _approvedVia,
  ...row
}) => row);
const venusLibraHouseCores = readPackageJson("source-rows/venus-libra-house-cores-v1.json");
const venusLibraHouseCoreReaderRows = venusLibraHouseCores.rows.map(({
  notes: _notes,
  source_keys: _sourceKeys,
  approved_via: _approvedVia,
  ...row
}) => row);
const skyPlacementOwnerApprovedReaderFallbacks = readPackageJson("bundled-sky-placement-owner-approved-reader-v1.json");
const skyPlacementBatchApprovals = [2, 3, 4].map((batch) => JSON.parse(fs.readFileSync(
  path.join(repoRoot, `packages/astro-knowledge/review/sky-placement-writer-batch-${batch}-owner-edited-approved-v1.json`),
  "utf8"
)));
const skyPlacementCurrentApproval = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "packages/astro-knowledge/review/sun-leo-fallback-v3/approval-record.json"),
  "utf8"
));
const skyPlanetFrames = readPackageJson("source-rows/sky-planet-frames-v1.json");
const skySignCopySun = readPackageJson("source-rows/sky-sign-copy-sun-v1.json");
const pairDailyFrames = readPackageJson("source-rows/pair-daily-frames-v1.json");
const pairDailyClauses = readPackageJson("source-rows/pair-daily-clauses-v1.json");
const timingEventRows = readPackageJson("source-rows/timing-event-reader-copy-v2.json");
const weeklyRows = readPackageJson("source-rows/station-cards-week-openers-v1.json");

assert.equal(skyPlacementOwnerApprovedFallbacks.rows.length, 56);
assert.equal(new Set(skyPlacementOwnerApprovedFallbacks.rows.map((row) => row.contentKey)).size, 56);
assert.ok(skyPlacementOwnerApprovedFallbacks.rows.every((row) => row.review_status === "approved"));
const runtimeEligibleApprovedArticles = skyPlacementBatchApprovals.flatMap((approval) => approval.articles);
assert.ok(skyPlacementBatchApprovals.every((approval) => approval.ownerApproved === true));
for (const approvedArticle of runtimeEligibleApprovedArticles) {
  const contentKey = `fallback-hook/sky-sign-copy/${approvedArticle.planet}/${approvedArticle.sign}`;
  const servingRow = skyPlacementOwnerApprovedFallbacks.rows.find((row) => row.contentKey === contentKey);
  assert.ok(servingRow, `${contentKey} must exist in the owner-approved serving source.`);
}
const servingArticleSnapshot = skyPlacementOwnerApprovedFallbacks.rows
  .map((row) => ({
    contentKey: row.contentKey,
    article: {
      opening: row.opening,
      tension: row.tension,
      development: row.development,
      close: row.close,
      try_this: row.try_this
    }
  }))
  .sort((first, second) => first.contentKey.localeCompare(second.contentKey));
assert.equal(skyPlacementCurrentApproval.articleCount, servingArticleSnapshot.length);
assert.equal(
  createHash("sha256").update(JSON.stringify(servingArticleSnapshot)).digest("hex"),
  skyPlacementCurrentApproval.articlesSha256,
  "The exact serving articles must match the owner-approved Sun-in-Leo V3 snapshot."
);
for (const servingRow of skyPlacementOwnerApprovedFallbacks.rows) {
  assert.equal(
    servingRow.body_you,
    [
      servingRow.opening,
      servingRow.tension,
      servingRow.development,
      servingRow.close
    ].join("\n\n"),
    `${servingRow.contentKey} must preserve the exact approved article wording.`
  );
}
const metadataFreeServingRows = skyPlacementOwnerApprovedFallbacks.rows.map(({
  body_you: _legacyBody,
  note: _note,
  source_keys: _sourceKeys,
  approved_via: _approvedVia,
  ...row
}) => row);
assert.deepEqual(
  skyPlacementOwnerApprovedReaderFallbacks.rows,
  metadataFreeServingRows,
  "The reader bundle must exactly mirror the approved serving source after metadata removal."
);
assert.ok(skyPlacementOwnerApprovedReaderFallbacks.rows.every((row) => (
  !Object.hasOwn(row, "note")
  && !Object.hasOwn(row, "source_keys")
  && !Object.hasOwn(row, "approved_via")
  && !Object.hasOwn(row, "body_you")
)), "Reader serving rows must exclude editorial provenance metadata.");
assert.ok(skyPlacementOwnerApprovedReaderFallbacks.rows.every((row) => !/\b(?:you|your|yours|yourself|yourselves)\b/iu.test([
    row.opening,
    row.tension,
    row.development,
    row.close,
    ...(row.try_this ?? [])
  ].join("\n"))), "Legacy body_you storage must not introduce second-person Current Sky copy.");

const moonTaurusEntry = sourceRows.hookRows.find((row) => (
  row.contentKey === "fallback-hook/sky-placement-hook/moon/taurus"
));
const moonTaurusLived = sourceRows.hookRows.find((row) => (
  row.contentKey === "fallback-hook/sky-placement-lived/moon/taurus"
));
const moonTaurusClose = sourceRows.hookRows.find((row) => (
  row.contentKey === "fallback-hook/sky-placement-turn/moon/taurus"
));
const moonTaurusMoves = sourceRows.hookRows.find((row) => (
  row.contentKey === "fallback-hook/sky-placement-moves/moon/taurus"
));
assert.equal(moonTaurusEntry?.render_policy, "sky-placement-moon-entry-v1");
assert.equal(
  moonTaurusEntry?.body_you,
  "The Moon moves into Taurus on {{entryDate}}, and the collective pace slows. Answers take longer. Plans are less likely to change at the last minute. A feeling may need time to become clear before anyone is ready to talk about it."
);
assert.deepEqual(moonTaurusEntry?.moon_entry_aspect_units, [{
  planets: ["moon", "jupiter"],
  signs: { moon: "taurus", jupiter: "leo" },
  aspect: "square",
  body: "The Moon in Taurus squares Jupiter in Leo on {{aspectDate}}. Feelings run bigger, and one small need can quickly become a large promise, purchase, or plan. It may feel good to say yes in the moment and exhausting to carry all of it later. Choose one priority before agreeing to five."
}]);
assert.equal(
  moonTaurusLived?.body_you,
  "For the next two and a half days, what feels comfortable and manageable matters more than speed. We may want a familiar meal, a quieter room, or enough uninterrupted time to finish what is already in front of us. Work that produces a visible result can feel more satisfying than another round of discussion.\n\nThis can help us stop reacting to every update and return to what is already working. It can also make us hold on after the routine has stopped helping. A plan stays in place because changing it feels inconvenient. A decision gets delayed because the familiar answer feels easier than the honest one. Patience supports a better choice. Refusing to adjust keeps the same problem going."
);
assert.equal(
  moonTaurusClose?.body_you,
  "A delayed answer, slower day, or stronger need for comfort is not proof that the entire plan is wrong."
);
assert.equal(moonTaurusMoves, undefined, "Moon moves rows are retired by owner ruling 2026-08-07.");

const natalRenderer = createFallbackRenderer(templates, sourceRows);
const transitRenderer = createTransitSynastryRenderer(transitRows, templates, sourceRows);
const counts = {
  authoredCards: transitRows.authoredCards.length,
  fallbackHooks: sourceRows.hookRows.length,
  vocabulary: sourceRows.vocabularyRows.length,
  templates: templates.templates.length,
  sourceMaterial: sourceRows.fallbackSourceRows.length
};

assert.equal(PACKAGE_VERSION, "v3-2026-08-14a");
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
assert.deepEqual(
  needsReviewCards.map((row) => row.contentKey),
  ["authored/sky-lunation-macro/new-moon/aquarius"],
  "Only the explicitly staged Aquarius New Moon article may stay review-gated."
);
assert.equal(needsReviewHooks.length, 93, "The reconciled package must preserve all 93 explicitly staged, non-serving hooks.");
assert.equal(needsReviewRows.length, 108, "The primary package must retain its 108 staged authored, hook, and template rows; interim overrides are gated separately.");

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
const legitimateThemVerbGovernor = /(?:let(?:s|ting)?|mak(?:e|es|ing)|made|help(?:s|ing|ed)?|around|of|in|with|nearest)\s+$/iu;
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
assert.equal(
  outerConnection.body,
  "The connection has real depth without the undertow. You feel important to Sofia, not monitored or claimed."
);
assert.doesNotMatch(outerConnection.body, /\byou (?:feels|is|has|does)\b/iu);

const venusMidheavenConnection = transitRenderer.renderSynastryAspect({
  planetA: "venus",
  planetB: "midheaven",
  aspect: "trine",
  otherName: "Chris"
});
assert.equal(venusMidheavenConnection.headline, "Your Venus trine Chris's Midheaven");
assert.equal(
  venusMidheavenConnection.body,
  "When Venus aligns with the Midheaven, affection becomes a practical asset for a career. Success gets marked and celebrated out loud, turning appreciation into real stamina for the work ahead. Ambition rarely thrives in a vacuum, and this connection puts warmth and professional drive on the exact same side without anyone having to fake it."
);

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
assert.equal(
  connectionTransit.parts[0],
  exactSaturnSquareBond.body_you
    .replaceAll("{{holder1}}'s", "Sofia's")
    .replaceAll("{{holder1}}", "Sofia"),
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

const appSource = [
  fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8"),
  fs.readFileSync(path.join(repoRoot, "apps/web/src/features/friends/ManualChartsPanel.tsx"), "utf8")
].join("\n");
const pairDailyNodeResolverSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs"),
  "utf8"
);
const pairDailyBrowserResolverSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts"),
  "utf8"
);
const compatibilityTabSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/CompatibilityTab.tsx"),
  "utf8"
);
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
const generatedContentSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/services/generatedContent.ts"),
  "utf8"
);
const fallbackManifestGeneratorSource = fs.readFileSync(
  path.join(repoRoot, "scripts/generate-fallback-package-manifest.mjs"),
  "utf8"
);
const pairDailySelectionStart = appSource.indexOf("const selectedPairDailySelection = useMemo(");
const pairDailySelectionEnd = appSource.indexOf("\n  const selectedPairDaily = useMemo(", pairDailySelectionStart);
const pairDailySelectionSource = appSource.slice(pairDailySelectionStart, pairDailySelectionEnd);

assert.ok(
  pairDailySelectionStart >= 0 && pairDailySelectionEnd > pairDailySelectionStart,
  "Pair Daily must have a dedicated friend-profile selection memo."
);
assert.match(
  pairDailySelectionSource,
  /const pairVariant = stablePairDailyVariant\([\s\S]*?const readerDriver = pairDailyDriver\(currentSky, profileNatalSky, pairVariant\);[\s\S]*?const friendDriver = pairDailyDriver\(currentSky, selectedChart\.natalChart, pairVariant\);/u,
  "Pair Daily must use one stable pair seed for both chart-driver rotations."
);
assert.match(
  appSource,
  /function pairDailyDriver\([\s\S]*?selectDailyGlanceDriverPool\([\s\S]*?house,[\s\S]*?5,[\s\S]*?3[\s\S]*?selectPairDailyDriver\(drivers, variant\)/u,
  "Pair Daily must reuse the Daily At-a-Glance applying selector and cap its pool at three."
);
assert.match(
  pairDailySelectionSource,
  /const selectedBondTransit = selectedBondTransitCards\[0\];[\s\S]*?family: selectedBondTransit\.effectFamily[\s\S]*?transiting: selectedBondTransit\.transitPlanet/u,
  "Pair Daily must reuse the first already-ranked bond card and its effect family."
);
assert.doesNotMatch(
  pairDailySelectionSource,
  /bondClauseKey:\s*selectedBondTransit\.effectContentKey/u,
  "Pair Daily must not pass the full bond-card effect row into its compressed daily slot."
);
for (const resolverSource of [pairDailyNodeResolverSource, pairDailyBrowserResolverSource]) {
  assert.match(
    resolverSource,
    /fallback-hook\/pair-daily\/bond-clause\/\$\{shared\.family\}\/\$\{transiting\}/u,
    "Both Pair Daily resolvers must derive the approved compressed bond-clause key."
  );
  assert.doesNotMatch(
    resolverSource,
    /pairDailyBody\(shared\.bondClauseKey/u,
    "Neither Pair Daily resolver may read the full bond-card body through a supplied key."
  );
}
assert.match(
  appSource,
  /selectedPairDailySelection\.shared\.kind !== "bond"[\s\S]*?renderShared\(selectedPairDailySelection\.fallbackShared\)/u,
  "A missing compressed bond clause must fall through to the approved Moon lane or omit the shared sentence."
);
assert.doesNotMatch(
  pairDailySelectionSource,
  /rank|sort\(|dailyTransitQualifies/u,
  "Pair Daily must not introduce a parallel driver or shared-condition ranking system."
);
assert.match(
  pairDailySelectionSource,
  /if \(!readerDriver \|\| !friendDriver\) return null;/u,
  "Pair Daily must hide when either person's daily driver is absent."
);
assert.match(
  compatibilityTabSource,
  /\{daily \? \([\s\S]*?Today - \{daily\.dateLabel\}[\s\S]*?\{daily\.body\}[\s\S]*?: null\}/u,
  "Compatibility must render no dated Pair Daily chrome when assembled copy is absent."
);
assert.match(
  appSource,
  /reader:\s*\{[\s\S]*?handle:\s*profileHandle,[\s\S]*?clauseKey:\s*pairDailyClauseKey\(selectedPairDailySelection\.readerDriver\)/u,
  "Pair Daily must pass the reader handle directly while keeping the reader clause in second-person voice."
);
assert.match(
  appSource,
  /const selectedPairDaily = useMemo\([\s\S]*?fallbackArchitectureV3Version,[\s\S]*?profileHandle,/u,
  "Pair Daily must retry assembly after the deferred approved-row bundle is installed."
);
assert.match(
  fallbackManifestGeneratorSource,
  /pair-daily-frames-v1\.json[\s\S]*?pair-daily-clauses-v1\.json[\s\S]*?deferredCoreRows/u,
  "The generated deferred runtime bundle must include both approved Pair Daily row files."
);
assert.match(
  dashboardImportSource,
  /pair-daily-frames-v1\.json[\s\S]*?pair-daily-clauses-v1\.json[\s\S]*?pairDailyFrames[\s\S]*?pairDailyClauses/u,
  "Dashboard materialization must carry both approved Pair Daily row files."
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
  /const openFriendHouseTransitDetail[\s\S]*?const eligibleSections = acceptedOwnerApprovedTransitSections\([\s\S]*?card\.normalized\.detailSections,[\s\S]*?sections: eligibleSections\.map\(\(section\) => \(\{[\s\S]*?heading: "",/u,
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
  friendTransitsTabSource,
  /onClick=\{\(\) => onOpenBondTransit\(card\.id\)\}[\s\S]*?\{card\.effectBody\}[\s\S]*?card\.activationBody/u,
  "Connection-transit cards must be clickable and show the complete effect plus activation context."
);
assert.match(
  appSource,
  /onOpenBondTransit=\{openBondTransitById\}/u,
  "The deferred connection-transit list must remain wired to the detail handler."
);
assert.match(
  appSource,
  /const openBondTransitDetail[\s\S]*?body: acceptedOwnerApprovedTransitBody\([\s\S]*?card\.effectBody,[\s\S]*?card\.effectContentKey,[\s\S]*?\)[\s\S]*?heading: index === 0 \? "What this activates"/u,
  "Connection-transit detail views must show the effect once and expand the activated synastry connections."
);
assert.ok(
  /function FriendPersonalTransitCard[\s\S]*?onClick=\{\(\) => onOpen\(transit\.id\)\}/u.test(friendTransitsTabSource)
    || /onClick=\{\(\) => onOpenPersonalTransit\(transit\.id\)\}/u.test(friendTransitsTabSource),
  "Friend personal-transit cards must open a detail view."
);
assert.match(
  appSource,
  /onOpenPersonalTransit=\{openFriendTransitById\}/u,
  "The deferred friend personal-transit list must remain wired to the detail handler."
);
assert.match(
  appSource,
  /const openFriendTransitDetail[\s\S]*?const eligibleSections = acceptedOwnerApprovedTransitSections\([\s\S]*?normalized\.sections,[\s\S]*?sections: eligibleSections\.map\(\(section\) => \(\{[\s\S]*?body: section\.body/u,
  "Friend personal-transit detail views must retain only exact-owner-approved normalized write-ups."
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
  /const candidates = dedupeBondTransitEndpointCandidates\([\s\S]*?const groups = rankBondTransitGroups\([\s\S]*?groupBondTransitActivations\(candidates\)/u,
  "Bond transit contacts must deduplicate, group, and rank before rendering cards."
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
  /authoredCards: packageRowsWithLatestReaderEligibleOverride\(bundle\.transitLib\.authoredCards\)/u,
  "Production must select the latest reader-eligible authored override without letting a newer draft hide approved copy."
);
assert.match(
  runtimeSource,
  /hookRows: packageRowsWithLatestReaderEligibleOverride\(bundle\.rowsFile\.hookRows \?\? \[\]\)/u,
  "Production must select the latest reader-eligible hook override without letting a newer draft hide approved copy."
);
assert.match(
  runtimeSource,
  /\.map\(\(keyed\) => \[\.\.\.keyed\]\.reverse\(\)\.find\(isEligible\)\)/u,
  "Review-gated duplicate keys must fall back to the newest approved candidate."
);
assert.match(
  runtimeSource,
  /export const fallbackArchitectureV3BundledManifestSummary = bundledManifestSummaryV3 as FallbackArchitectureV3PackageManifestSummary/u,
  "Runtime must expose the bundled manifest summary without eagerly importing its key list."
);
assert.match(
  generatedContentSource,
  /fallbackArchitectureV3BundleCacheSchema = "fallback-architecture-v3-dashboard-cache-v4"/u,
  "Dashboard cache payloads must carry an invalidatable schema."
);
assert.match(
  generatedContentSource,
  /envelope\?\.runtimeCapability !== fallbackArchitectureV3BundledManifestSummary\.runtimeCapability[\s\S]*envelope\?\.bundledContentHash !== bundledPartition\.contentHash/u,
  "Dashboard cache payloads must be rejected when the runtime capability or partition hash changes."
);
assert.match(
  generatedContentSource,
  /manifest\.contentHash !== bundledManifest\.contentHash[\s\S]*?manifest\.contentHash !== metadata\.contentHash/u,
  "Dashboard partitions must exactly match the bundled partition and mirror metadata before installation."
);
assert.match(
  generatedContentSource,
  /\.order\("updated_at", \{ ascending: false \}\)[\s\S]*?\.order\("id", \{ ascending: false \}\)/u,
  "Dashboard hydration pagination must have a stable unique-ID tiebreaker."
);
assert.match(
  generatedContentSource,
  /package metadata is missing or inconsistent[\s\S]*?clearCachedFallbackArchitectureV3Bundle\(\);[\s\S]*?return null;/u,
  "An unversioned or inconsistent dashboard package must clear cache and fail closed to the bundled package."
);

assert.match(
  dashboardImportSource,
  /createPackageManifest,[\s\S]*?PACKAGE_VERSION[\s\S]*?const importBatchId = `fallback-architecture-\$\{PACKAGE_VERSION\}`;/u,
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
assert.match(
  dashboardImportSource,
  /order=content_key\.asc,id\.asc/u,
  "Dashboard verification pagination must have a unique ID tiebreaker."
);
assert.match(
  dashboardImportSource,
  /on_conflict=content_key/u,
  "Dashboard imports must target the deployed composite identity."
);
assert.match(
  dashboardImportSource,
  /Dashboard mirror content mismatch/u,
  "Dashboard verification must compare row content, not counts and keys alone."
);

const materializerTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tldr-fallback-materializer-"));
const materializerOutput = path.join(materializerTempDir, "rows.json");

try {
  execFileSync(process.execPath, [
    path.join(repoRoot, "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs"),
    `--out=${materializerOutput}`
  ]);
  const materialized = JSON.parse(fs.readFileSync(materializerOutput, "utf8"));
  const materializedByKey = new Map(materialized.rows.map((row) => [row.content_key, row]));
  const localManifest = createPackageManifest({
    transitLib: {
      authoredCards: [
        ...transitRows.authoredCards,
        ...lunationBlendRows.authoredCards,
        ...skyArticleRows.authoredCards,
        ...weeklyRows,
        ...timingEventRows.authoredCards
      ]
    },
    rowsFile: {
      hookRows: [
        ...bondLanguagePass2.rows,
        ...sourceRows.hookRows,
        ...lunationBlendRows.hookRows,
        ...skyArticleRows.hookRows,
        ...skyAspectPhrasebook.hookRows,
        ...skyPlanetFrames.rows,
        ...skySignCopySun.rows,
        ...sunLeoHouseCoreReaderRows,
        ...venusLibraHouseCoreReaderRows,
        ...pairDailyFrames.rows,
        ...pairDailyClauses.rows,
        ...skyPlacementOwnerApprovedReaderFallbacks.rows
      ],
      vocabularyRows: [
        ...sourceRows.vocabularyRows,
        ...placementInterimRows.vocabularyRows,
        ...skyArticleRows.vocabularyRows
      ]
    },
    templatesFile: {
      templates: [
        ...templates.templates,
        ...placementInterimRows.templates
      ]
    }
  }, PACKAGE_VERSION);

  assert.equal(
    materialized.rows.length,
    materializedByKey.size,
    "Dashboard materialization must emit one deterministic row per content key."
  );
  assert.deepEqual(
    materialized.packageManifest,
    localManifest,
    "Dashboard materialization must stamp the exact reader package version, key manifest, and content hash."
  );

  for (const row of placementInterimRows.vocabularyRows) {
    if (!sourceRows.vocabularyRows.some((sourceRow) => sourceRow.contentKey === row.contentKey)) continue;
    assert.equal(
      materializedByKey.get(row.contentKey)?.body,
      row.body,
      `${row.contentKey} must retain placement-interim precedence in the dashboard mirror.`
    );
  }

  for (const row of bondLanguagePass2.rows) {
    const materializedRow = materializedByKey.get(row.contentKey);
    const canonicalRow = sourceRows.hookRows.find((candidate) => candidate.contentKey === row.contentKey);
    assert.ok(materializedRow, `${row.contentKey} must materialize exactly once.`);
    assert.equal(
      materializedRow.body,
      canonicalRow?.body_you ?? row.body_you,
      `${row.contentKey} must expose the latest governed bond row.`
    );
    assert.equal(
      materializedRow.source_snapshot.review_status,
      canonicalRow?.review_status ?? "reviewed",
      `${row.contentKey} must carry its latest governed state into the dashboard mirror.`
    );
    if (canonicalRow?.approval?.approvalLevel === "exact_owner_approved") {
      assert.equal(
        materializedRow.sections.packageRecord.approval.approvalLevel,
        "exact_owner_approved",
        `${row.contentKey} must retain exact-owner provenance in the dashboard mirror.`
      );
    }
  }

  for (const row of skySignCopySun.rows) {
    const materializedRow = materializedByKey.get(row.contentKey);
    assert.ok(materializedRow, `${row.contentKey} must materialize for reader distribution.`);
    const ownerReplacement = skyPlacementOwnerApprovedFallbacks.rows.find((candidate) => (
      candidate.contentKey === row.contentKey
    ));
    if (ownerReplacement) {
      assert.equal(
        materializedRow.body,
        ownerReplacement.body_you,
        `${row.contentKey} must use the explicitly approved owner replacement.`
      );
      assert.equal(materializedRow.source_snapshot.review_status, "approved");
      assert.equal(materializedRow.sections.packageRecord.render_policy, "sky-placement-continuous-v2");
      continue;
    }
    assert.equal(materializedRow.body, row.body_you);
    assert.equal(materializedRow.status, "DRAFT");
    assert.equal(materializedRow.source_snapshot.review_status, "approved");
    assert.equal(materializedRow.sections.packageRecord.render_policy, "sky-placement-continuous-v2");
  }

  for (const row of skyPlacementOwnerApprovedFallbacks.rows) {
    const materializedRow = materializedByKey.get(row.contentKey);
    assert.ok(materializedRow, `${row.contentKey} must materialize for reader distribution.`);
    assert.equal(materializedRow.body, row.body_you);
    assert.equal(materializedRow.source_snapshot.review_status, "approved");
    assert.equal(materializedRow.sections.packageRecord.render_policy, "sky-placement-continuous-v2");
  }

  for (const row of sunLeoHouseCores.rows) {
    const materializedRow = materializedByKey.get(row.contentKey);
    assert.ok(materializedRow, `${row.contentKey} must materialize for reader distribution.`);
    assert.equal(materializedRow.body, row.body_you);
    assert.equal(materializedRow.source_snapshot.review_status, "approved");
  }

  for (const row of venusLibraHouseCores.rows) {
    const materializedRow = materializedByKey.get(row.contentKey);
    assert.ok(materializedRow, `${row.contentKey} must materialize for reader distribution.`);
    assert.equal(materializedRow.body, row.body_you);
    assert.equal(materializedRow.source_snapshot.review_status, "approved");
  }

  for (const row of skySignCopySun.superseded_rows) {
    const materializedRow = materializedByKey.get(row.contentKey);
    assert.ok(materializedRow, `${row.contentKey} supersession must remain in dashboard history.`);
    if (skyPlacementOwnerApprovedFallbacks.rows.some((candidate) => (
      candidate.contentKey === row.contentKey
    ))) {
      assert.equal(materializedRow.source_snapshot.review_status, "approved");
      continue;
    }
    assert.equal(materializedRow.source_snapshot.review_status, "superseded");
    assert.equal(materializedRow.facts.readerServing, false);
  }

  for (const row of skyPlacementVoicePass.rows) {
    const materializedRow = materializedByKey.get(row.contentKey);
    assert.ok(materializedRow, `${row.contentKey} must materialize for owner review.`);
    assert.equal(materializedRow.body, row.body_you);
    assert.equal(materializedRow.status, "DRAFT");
    const planet = row.contentKey.split("/").at(-1);
    assert.equal(
      materializedRow.source_snapshot.review_status,
      ["moon", "lilith"].includes(planet) ? "needs_review" : "superseded"
    );
  }

  const retiredMercuryModule = materializedByKey.get("fallback-hook/sky-placement-hook/mercury/cancer");
  assert.ok(retiredMercuryModule);
  assert.equal(retiredMercuryModule.source_snapshot.review_status, "superseded");
  assert.equal(retiredMercuryModule.facts.readerServing, false);
} finally {
  fs.rmSync(materializerTempDir, { recursive: true, force: true });
}

console.log("fallback refresh wiring checks passed", counts);
