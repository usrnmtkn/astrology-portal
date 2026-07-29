#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fallbackSourceRows from "../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json" with { type: "json" };
import fallbackTemplates from "../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json" with { type: "json" };
import transitSynastryRows from "../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json" with { type: "json" };
import contentRoleContract from "../apps/web/src/content/fallbackArchitectureV3/contracts/CONTENT-ROLE-CONTRACT.json" with { type: "json" };
import {
  createTransitSynastryRenderer,
  PACKAGE_VERSION
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const app = read("apps/web/src/App.tsx");
const adminDashboard = read("apps/admin/src/GeneratedContentAdminDashboard.tsx");
const debugRuntime = read("apps/web/src/content/fallbackArchitectureV3Runtime.ts");
const browserResolverIndex = read("apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts");
const placementRows = read("apps/web/src/components/charts/PlacementRows.tsx");
const writingSurfaceSourceMap = read("apps/admin/src/writingSurfaceSourceMap.ts");

const renderer = createTransitSynastryRenderer(transitSynastryRows, fallbackTemplates, fallbackSourceRows);
const sunLeo = renderer.renderSkyPlacement({
  planet: "sun",
  sign: "leo",
  egressDate: "August 22",
  events: [{
    type: "aspect",
    a: "sun",
    aSign: "leo",
    b: "jupiter",
    bSign: "leo",
    aspect: "conjunction",
    exactDate: "July 29",
    applying: true
  }]
});
const sunLeoMoonOpposition = renderer.renderSkyPlacement({
  planet: "sun",
  sign: "leo",
  events: [{
    type: "aspect",
    a: "sun",
    aSign: "leo",
    b: "moon",
    bSign: "aquarius",
    aspect: "opposition",
    exactDate: "July 29",
    applying: true
  }]
});
const sunAries = renderer.renderSkyPlacement({
  planet: "sun",
  sign: "aries"
});
const lilithAries = renderer.renderSkyPlacement({
  planet: "lilith",
  sign: "aries"
});
const mercuryCancerIngress = renderer.renderSkyPlacement({
  planet: "mercury",
  sign: "cancer",
  egressDate: "August 9"
});
const mercuryCancerRetrograde = renderer.renderSkyPlacement({
  planet: "mercury",
  sign: "cancer",
  egressDate: "August 9",
  isRetrograde: true
});
const ascendantSaturnSquare = renderer.renderSynastryAspect({
  planetA: "ascendant",
  planetB: "saturn",
  aspect: "square",
  otherName: "X"
});
const northNodeSouthNodeConjunction = renderer.renderSynastryAspect({
  planetA: "north-node",
  planetB: "south-node",
  aspect: "conjunction",
  otherName: "X"
});
const venusAscendantBondTransit = renderer.renderBondTransit({
  transiting: "mars",
  aspect: "square",
  endpointPlanet: "ascendant",
  endpointOwner: "friend",
  activatedPlanets: ["venus"],
  otherName: "X"
});
const marsAscendantTransit = renderer.renderTransitAspect({
  transiting: "mars",
  aspect: "square",
  natal: "ascendant",
  window: "Right now"
});
const marsNorthNodeTransit = renderer.renderTransitAspect({
  transiting: "mars",
  aspect: "square",
  natal: "north-node",
  window: "Right now"
});
const anglePlacementRows = fallbackSourceRows.hookRows.filter((row) =>
  /^fallback-hook\/placement-sentence\/(?:ascendant|midheaven)\//u.test(row.contentKey)
);
const dignityGlossaryRows = fallbackSourceRows.vocabularyRows.filter((row) =>
  row.contentKey.startsWith("fallback-vocab/dignity-glossary/")
);
const dignityLineRows = fallbackSourceRows.hookRows.filter((row) =>
  row.contentKey.startsWith("fallback-hook/dignity-line/")
);
const targetSpecificTransitEffectRows = fallbackSourceRows.hookRows.filter((row) =>
  /^fallback-hook\/transit-effect-(?:hard|soft)\/(?:sun|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\/(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|north-node|south-node|lilith|ascendant|midheaven|descendant|imum-coeli)$/u.test(row.contentKey)
);
const authoredTransitAspectRows = transitSynastryRows.authoredCards.filter((row) =>
  row.contentKey.startsWith("authored/transit-aspect/")
);
const approvedSkyPlacementRows = fallbackSourceRows.hookRows.filter((row) =>
  /^fallback-hook\/sky-placement-(?:tagline|hook|lived|turn|moves)\//u.test(row.contentKey)
);
const approvedSkyPlacementCoreRows = fallbackSourceRows.hookRows.filter((row) =>
  /^fallback-hook\/sky-placement-(?:hook|lived|turn)\//u.test(row.contentKey)
);
const approvedSkyPlacementRowsByFamily = Object.fromEntries(
  ["tagline", "hook", "lived", "turn", "moves"].map((family) => [
    family,
    fallbackSourceRows.hookRows.filter((row) =>
      row.contentKey.startsWith(`fallback-hook/sky-placement-${family}/`)
    )
  ])
);
const zodiacSigns = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
const retrogradePlacementPlanets = [
  "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron"
];
const bannedDignityWords = contentRoleContract.styleRules?.bannedWords ?? [];
const bannedDignityPattern = bannedDignityWords.length > 0
  ? new RegExp(`\\b(?:${bannedDignityWords.join("|")})\\b`, "iu")
  : null;

assert.match(
  browserResolverIndex,
  new RegExp(`export const PACKAGE_VERSION = "${PACKAGE_VERSION.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}";`, "u"),
  "The browser reference resolver and prebuilt dist bundle must expose the same package stamp."
);
assert.ok(transitSynastryRows.authoredCards.length > 0, "The imported package must expose authored transit/synastry cards.");
assert.ok(fallbackSourceRows.hookRows.length > 0, "The imported package must expose fallback hooks.");
assert.ok(fallbackSourceRows.vocabularyRows.length > 0, "The imported package must expose vocabulary rows.");
assert.ok(fallbackTemplates.templates.length > 0, "The imported package must expose templates.");
assert.match(debugRuntime, /fallbackArchitectureV3PackageVersion/, "Runtime must export the package version for app/admin debug surfaces.");
assert.match(app, /Fallback package/, "App calculation diagnostics must show the fallback package version.");
assert.match(adminDashboard, /Fallback package/, "Admin dashboard must show the fallback package version.");
assert.equal(anglePlacementRows.length, 24, "The package must provide all Ascendant and Midheaven placement sentences.");
assert.equal(dignityGlossaryRows.length, 4, "The package must provide one generic glossary row for every dignity badge.");
assert.ok(dignityLineRows.length > 0, "The imported package must retain its approved sparse dignity lines.");
assert.equal(targetSpecificTransitEffectRows.length, 324, "The package must include the complete target-specific transit effect library.");
assert.ok(authoredTransitAspectRows.length > 0, "The imported package must expose authored transit-aspect rows.");
assert.equal(approvedSkyPlacementRows.length, 840, "The package must include five approved article slots for all 168 sky placements.");
assert.equal(approvedSkyPlacementCoreRows.length, 504, "Every placement pair must have approved hook, lived, and turn rows.");
for (const [family, rows] of Object.entries(approvedSkyPlacementRowsByFamily)) {
  assert.equal(rows.length, 168, `Every sky placement must have an approved ${family} row.`);
}
for (const planet of retrogradePlacementPlanets) {
  const retrogradeGuidance = fallbackSourceRows.hookRows.find((row) =>
    row.contentKey === `fallback-hook/transit-retro/${planet}`
  )?.body_you;
  assert.ok(retrogradeGuidance, `${planet} must have approved retrograde guidance.`);
  for (const sign of zodiacSigns) {
    const rendered = renderer.renderSkyPlacement({ planet, sign, isRetrograde: true });
    assert.equal(rendered.parts.length, 4, `${planet} retrograde in ${sign} must preserve the complete hybrid base.`);
    assert.equal(rendered.parts[2], retrogradeGuidance, `${planet} retrograde in ${sign} must place its guidance before the turn.`);
    assert.ok(rendered.tagline, `${planet} retrograde in ${sign} must retain its tagline.`);
    assert.equal(rendered.moves?.length, 3, `${planet} retrograde in ${sign} must retain all three moves.`);
  }
}
for (const row of approvedSkyPlacementRows) {
  assert.equal(row.review_status, "approved", `${row.contentKey} must be reader-eligible.`);
}
for (const row of authoredTransitAspectRows) {
  assert.equal(row.review_status, "approved", `${row.contentKey} must be reader-eligible.`);
}
for (const row of dignityLineRows) {
  assert.equal(row.content_role, "fallback_hook", `${row.contentKey} must remain a fallback_hook.`);
  assert.equal(row.review_status, "approved", `${row.contentKey} must remain approved.`);
  assert.ok(row.body_you && row.body_they, `${row.contentKey} must keep reader and friend voice bodies.`);
  assert.ok(row.source_keys?.length > 0, `${row.contentKey} must keep source grounding.`);
  const bodies = `${row.body_you} ${row.body_they} ${row.body_sky ?? ""}`;
  assert.doesNotMatch(bodies, /[\u2013\u2014]/u, `${row.contentKey} must not contain en/em dashes.`);
  if (bannedDignityPattern) {
    assert.doesNotMatch(bodies, bannedDignityPattern, `${row.contentKey} must not contain banned words.`);
  }
  if (row.contentKey.startsWith("fallback-hook/dignity-line/domicile/")) {
    assert.match(row.body_you, /\bhome sign/iu, `${row.contentKey} self voice must say home sign.`);
    assert.match(row.body_they, /\bhome sign/iu, `${row.contentKey} friend voice must say home sign.`);
  }
}
assert.match(debugRuntime, /fallback-vocab\/dignity-glossary/, "Runtime must expose package dignity glossary rows.");
assert.match(placementRows, /fallbackV3DignityGlossary/, "Dignity badges must always read their generic package glossary.");
assert.match(placementRows, /fallbackV3DignityLine/, "Dignity badges must layer the sparse planet-specific package line when present.");
assert.match(placementRows, /friendPlacementDescription[\s\S]*fallbackV3PlacementSentence/u, "Friend chart placement rows must read package placement sentences, including covered angles.");
assert.match(
  ascendantSaturnSquare.body,
  /^X's Saturn sits at a hard angle to your Ascendant, and it can feel like being graded on arrival\./u,
  "The package must preserve the owner-approved Ascendant-Saturn authored pair body."
);
assert.match(
  northNodeSouthNodeConjunction.body,
  /^Your North Node sits right on X's South Node, the famous crossing\b/u,
  "The package must return the owner-approved North Node-South Node authored pair body."
);
assert.equal(
  venusAscendantBondTransit.headline,
  "Mars square X's Ascendant",
  "Bond-transit headlines must name the activated endpoint."
);
assert.notEqual(
  marsAscendantTransit.body,
  marsNorthNodeTransit.body,
  "Target-specific transit effects must keep Mars square Ascendant distinct from Mars square North Node."
);
assert.match(
  app,
  /transit\.aspect === "square"[\s\S]*\["conjunction", "opposition"\][\s\S]*\["trine", "sextile"\]/u,
  "Friend transits must collapse square and complementary soft axis twins as well as conjunction/opposition twins."
);

assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/content/skyWriting.ts")), false, "Retired skyWriting.ts must not exist.");
assert.equal(
  fs.existsSync(path.join(repoRoot, "apps/web/src/content/sky-writing/TLDR-Sky-Article-Spec.md")),
  true,
  "The voice-first spec must remain available as the placement contract."
);
assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/content/skyContentSnapshot.json")), false, "Retired normalized Sky snapshot must not exist.");
assert.doesNotMatch(app, /skyWriting|resolveSkyWritingArticle|sky-writing-v1|skyContentSnapshot/u, "App reader surfaces must not reference retired Sky writing paths.");
assert.doesNotMatch(adminDashboard, /skyWriting|localSkySnapshot|skyContentSnapshot/u, "Admin must not expose retired local Sky snapshot rows.");
assert.doesNotMatch(writingSurfaceSourceMap, /sky-writing-v1|skyContentSnapshot/u, "Admin source map must not point at retired Sky writing sources.");

assert.match(app, /transitSynastryFallbackRendererV3\.renderSkyPlacement\(\{/, "Sky placement rendering must call the V3 package renderer.");
assert.match(
  app,
  /hasRetrogradeGuidance = isDisplayRetrograde\(position\)[\s\S]*\["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"\][\s\S]*renderSkyPlacement\(\{[\s\S]*isRetrograde: hasRetrogradeGuidance/u,
  "Retrograde Sky pages must compose approved retro guidance into the hybrid placement article."
);
assert.doesNotMatch(
  app.slice(app.indexOf("function skyPlacementWritingSection"), app.indexOf("function normalizeSkyPlacementSurface")),
  /renderTransitRetro/u,
  "Sky placement pages must not replace the hybrid article with the retired standalone retro article."
);
assert.match(
  app,
  /function activeRetrogradePositions\(positions: PlanetPosition\[\]\) \{[\s\S]*!isLunarNodePoint\(position\.planet\)/u,
  "The planets-retrograde indicator must exclude the North and South Node points."
);
assert.match(app, /const isRetrograde = isDisplayRetrograde\(position\);[\s\S]*placementTransitRangeLabel/u, "Sky placement details must suppress node retrograde presentation.");
assert.match(app, /retrograde=\{isDisplayRetrograde\(position\)\}/u, "Natal placement rows must suppress node retrograde presentation.");
assert.match(app, /normalizeSkyPlacementSurface/, "Sky placement rendering must flow through the normalized surface path.");
assert.doesNotMatch(app, /sourceMode:\s*"fallback-only"/, "Sky package renderers must not use the retired fallback-only override flag.");
assert.match(
  app,
  /function skyPlacementArticleAspects\([\s\S]*applyingPriority[\s\S]*conjunctionPriority[\s\S]*\.slice\(0, 1\)/u,
  "The placement article must prefer one applying conjunction, then the nearest applying major aspect."
);

assert.equal(sunLeo.headline, "The Sun in Leo", "Package Sun-in-Leo headline must remain factual.");
assert.match(
  sunLeo.body,
  /^Somewhere along the way, you switched to autopilot on a version of yourself that needs updating\. A change of season is the natural time to look up\./u,
  "Package Sun-in-Leo copy must lead with the revised single-purpose hook."
);
assert.doesNotMatch(
  sunLeo.body,
  /Wishing you|Leo is the fifth sign|The Leo trap|for everyone at once/iu,
  "Sky placement articles must not restore sign lore, a blessing, a trap label, or the collective wrapper."
);
assert.match(
  sunLeo.body,
  /Leo measures by applause, and applause is a fickle ruler\./u,
  "Sun-in-Leo must keep the sharper authored turn instead of a generic confrontation."
);
assert.match(
  sunLeo.body,
  /The Sun in Leo meets Jupiter in Leo, exact on July 29\./u,
  "Sun-in-Leo must append the computed plain-language aspect fact below the evergreen article."
);
assert.match(
  sunLeoMoonOpposition.body,
  /The Full Moon in Aquarius peaks on July 29, opposite the Sun in Leo\. Personal recognition comes into tension with the expectations of the group\./u,
  "Sun-in-Leo must identify the Sun-Moon opposition as the Aquarius Full Moon."
);
assert.doesNotMatch(
  sunLeoMoonOpposition.body,
  /Emotions, instincts, and what brings safety get pulled into the spotlight/iu,
  "The Aquarius Full Moon paragraph must not fall through to a generic transit-effect sentence."
);
assert.doesNotMatch(
  `${sunLeo.body}\n${sunLeoMoonOpposition.body}`,
  /\b(?:conjunction|square|trine|sextile|opposition|applying|separating|orb)\b/iu,
  "Sky placement bodies must not expose aspect jargon."
);
assert.equal(sunAries.tagline, "Start before you think", "Approved placement taglines must be exposed to the Sky detail header.");
assert.equal(sunAries.moves?.length, 3, "Approved placement articles must expose three practical moves.");
assert.equal(sunLeo.tagline, "Show the work", "The original Sun-in-Leo calibration placement must now expose its approved tagline.");
assert.deepEqual(
  sunLeo.moves,
  [
    "Put one piece of work you are proud of where other people can see it.",
    "Give credit out loud before asking for your own.",
    "Choose one project worth the spotlight and finish its visible version."
  ],
  "The original Sun-in-Leo calibration placement must now expose all three approved moves."
);
assert.equal(lilithAries.tagline, "Don’t let disrespect slide", "Owner-approved Lilith placement taglines must be reader-eligible.");
assert.match(
  lilithAries.body,
  /^Someone cuts in line or talks over you and suddenly you’re all fire and no filter\./u,
  "Owner-approved Lilith placement copy must render from the promoted pair rows."
);
assert.equal(lilithAries.moves?.length, 3, "Owner-approved Lilith placement articles must expose three practical moves.");
assert.equal(
  sunAries.contentKey,
  "fallback-hook/sky-placement-hook/sun/aries",
  "Approved pair rows must be identifiable so the app can prioritize them over generated drafts."
);
assert.deepEqual(
  sunAries.parts.slice(0, 3),
  [
    fallbackSourceRows.hookRows.find((row) => row.contentKey === "fallback-hook/sky-placement-hook/sun/aries")?.body_you,
    fallbackSourceRows.hookRows.find((row) => row.contentKey === "fallback-hook/sky-placement-lived/sun/aries")?.body_you,
    fallbackSourceRows.hookRows.find((row) => row.contentKey === "fallback-hook/sky-placement-turn/sun/aries")?.body_you
  ],
  "Approved Sky placement articles must render hook, lived expression, and turn in order."
);
assert.doesNotMatch(
  sunLeo.body,
  /this energy|right now|reveals|heals|[\u2013\u2014]/iu,
  "Sun-in-Leo must satisfy the placement-article voice bans."
);
assert.match(app, /return `\$\{skyDisplayPlanetName\(position\.planet\)\} Rx in \$\{position\.sign\}`;/, "Retrograde Sky ID title must stay factual in the app route.");
assert.equal(
  mercuryCancerRetrograde.headline,
  "Mercury in Cancer",
  "Mercury retrograde must retain the factual hybrid placement headline."
);
assert.deepEqual(
  mercuryCancerRetrograde.parts,
  [
    fallbackSourceRows.hookRows.find((row) => row.contentKey === "fallback-hook/sky-placement-hook/mercury/cancer")?.body_you,
    fallbackSourceRows.hookRows.find((row) => row.contentKey === "fallback-hook/sky-placement-lived/mercury/cancer")?.body_you,
    fallbackSourceRows.hookRows.find((row) => row.contentKey === "fallback-hook/transit-retro/mercury")?.body_you,
    fallbackSourceRows.hookRows.find((row) => row.contentKey === "fallback-hook/sky-placement-turn/mercury/cancer")?.body_you
  ],
  "Retrograde guidance must sit between the hybrid lived expression and turn."
);
assert.match(
  mercuryCancerRetrograde.body,
  /Plans, messages, and tech get glitchy, and old conversations come back around\./u,
  "Mercury retrograde in Cancer must include the approved short retrograde guidance."
);
assert.match(
  mercuryCancerIngress.body,
  /^You already know the conversation you have been avoiding\./u,
  "Direct-motion Mercury in Cancer must retain the stronger voice-first hook."
);
assert.doesNotMatch(
  `${mercuryCancerIngress.headline}\n${mercuryCancerIngress.body}`,
  /Plans, messages, and tech get glitchy, and old conversations come back around\./u,
  "Direct-motion ingress articles must not contain retrograde guidance."
);

assert.equal(
  sunLeo.templateKey,
  "fallback-template/sky.placement-article",
  "Sun-in-Leo must report the governed shared placement template."
);

console.log(JSON.stringify({
  packageVersion: PACKAGE_VERSION,
  sunLeoHeadline: sunLeo.headline,
  sunLeoOpening: sunLeo.body.slice(0, 96),
  retrogradeTitlePath: "skyDisplayPlanetName(position.planet) Rx in position.sign"
}, null, 2));
