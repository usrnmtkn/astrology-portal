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
import { splitSkyPlacementHookQuote } from "../apps/web/src/content/skyPlacementHookQuote.ts";

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

assert.deepEqual(
  splitSkyPlacementHookQuote([
    "You’re in three conversations at once but can’t finish any. Mars in Gemini splits your focus three ways before you even finish your morning routine.",
    "Over the next six weeks, the pace stays quick."
  ]),
  {
    hookQuote: "You’re in three conversations at once but can’t finish any.",
    bodyParagraphs: [
      "Mars in Gemini splits your focus three ways before you even finish your morning routine.",
      "Over the next six weeks, the pace stays quick."
    ]
  },
  "Sky placement hooks must promote their first sentence to a standalone quote without repeating it in the article body."
);

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
const sunAries = renderer.renderSkyPlacement({
  planet: "sun",
  sign: "aries"
});
const jupiterLeo = renderer.renderSkyPlacement({
  planet: "jupiter",
  sign: "leo",
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
const lilithAries = renderer.renderSkyPlacement({
  planet: "lilith",
  sign: "aries"
});
const lilithSagittarius = renderer.renderSkyPlacement({
  planet: "lilith",
  sign: "sagittarius",
  events: [{
    type: "aspect",
    a: "venus",
    aSign: "virgo",
    b: "lilith",
    bSign: "sagittarius",
    aspect: "square",
    exactDate: "August 1",
    applying: true
  }]
});
const mercuryCancerIngress = renderer.renderSkyPlacement({
  planet: "mercury",
  sign: "cancer",
  egressDate: "August 9"
});
const mercuryCancerRetrograde = renderer.renderTransitRetro({
  planet: "mercury",
  sign: "cancer",
  window: "Jun 29 - Jul 23",
  format: "article"
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
  planetA: "venus",
  planetB: "ascendant",
  otherName: "X"
});
const groupedJoseBondTransit = renderer.renderBondTransit({
  transiting: "saturn",
  aspect: "sextile",
  planetA: "moon",
  planetB: "mars",
  otherName: "Jose",
  endpointOwner: "friend",
  endpointPlanet: "mars",
  endpointPossessive: "his",
  activatedPlanets: ["moon", "midheaven", "lilith"]
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
assert.equal(approvedSkyPlacementRows.length, 840, "The package must include all 168 approved five-slot placement articles.");
assert.equal(approvedSkyPlacementCoreRows.length, 504, "Every placement pair must have approved hook, lived, and turn rows.");
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
  "Bond-transit headlines must name the aspected endpoint."
);
assert.equal(groupedJoseBondTransit.headline, "Saturn sextile Jose's Mars");
assert.match(
  groupedJoseBondTransit.body,
  /activating the connections his Mars makes with your Moon, your Midheaven, and your Lilith\./u,
  "One endpoint card must list every activated contact once."
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
assert.match(app, /position\.motion === "retrograde"[\s\S]*renderTransitRetro\(\{[\s\S]*format: "article"[\s\S]*renderSkyPlacement\(\{/u, "Retrograde Sky pages must use the retro article while direct-motion pages use the ingress article.");
assert.match(app, /hasRetrogradeArticle[\s\S]*\["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"\]/u, "Nodes, Sun, and Moon must not request unsupported retrograde articles.");
assert.match(
  app,
  /const retrogradeIndicatorExcludedPoints = new Set\(\["North Node", "South Node"\]\);[\s\S]*function activeRetrogradePositions\(positions: PlanetPosition\[\]\) \{[\s\S]*!retrogradeIndicatorExcludedPoints\.has\(position\.planet\)/u,
  "The planets-retrograde indicator must exclude the North and South Node points."
);
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
  /^Somewhere along the way, you switched to autopilot on a version of yourself that needs updating\./u,
  "Package Sun-in-Leo copy must lead with the memorable voice-first hook."
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
  /Building toward an exact conjunction on July 29, the Sun in Leo and Jupiter in Leo amplify momentum\./u,
  "Sun-in-Leo must append the computed applying/exact aspect fact below the evergreen article."
);
assert.match(
  sunLeo.body,
  /Confidence opens doors hesitation kept locked, and the wins land larger\./u,
  "The computed Sun-conjunction-Jupiter layer must use the reconciled live copy."
);
assert.deepEqual(
  jupiterLeo.parts,
  [
    "Jupiter in Leo makes it easier to admit that we want more. Ambition, creativity, and the desire to be recognized step forward instead of staying in the background.",
    "For about a year, we take up more space in the work and choices that carry our name. Creative projects grow, leadership becomes more visible, and recognition matters more openly. Generosity can grow with it: people use their position to open doors, fund the larger idea, and bring others into the room instead of guarding the spotlight.",
    "Ambition is not the problem. Needing an audience to prove the work matters is. When every win needs applause and every response gets measured by enthusiasm, confidence starts promising more than reality can carry. Recognition can confirm the work. It cannot give the work its substance.",
    "Building toward an exact conjunction on July 29, the Sun in Leo and Jupiter in Leo amplify momentum. Confidence opens doors hesitation kept locked, and the wins land larger. Just don't let enthusiasm write checks your execution can't cash. Confidence gets you into the room; substance is what keeps you in it."
  ],
  "Jupiter-in-Leo must preserve the approved three-beat hybrid and append only the computed Sun-conjunction-Jupiter layer."
);
assert.equal(sunAries.tagline, "Start before you think", "Approved placement taglines must be exposed to the Sky detail header.");
assert.equal(sunAries.moves?.length, 3, "Approved placement articles must expose three practical moves.");
assert.equal(lilithAries.tagline, "Don’t let disrespect slide", "Owner-approved Lilith placement taglines must be reader-eligible.");
assert.match(
  lilithAries.body,
  /^Someone cuts in line or talks over you and suddenly you’re all fire and no filter\./u,
  "Owner-approved Lilith placement copy must render from the promoted pair rows."
);
assert.equal(lilithAries.moves?.length, 3, "Owner-approved Lilith placement articles must expose three practical moves.");
assert.deepEqual(
  lilithSagittarius.parts,
  [
    "Someone won’t shut up about their truth, louder and louder. Lilith in Sagittarius pushes wounded beliefs into the spotlight, like a shout that refuses to be ignored.",
    "For about nine months, we watch conviction sharpen into a weapon or a banner. Ideas once whispered in shame become the story you hear over and over in meetings, online rants, or at the dinner table. Risky bets get made on faith, not facts, and the louder the certainty, the more fragile the ground beneath it feels.",
    "The fire that fuels belief can blind us to what’s right in front of us. When the wound owns the message, listening shuts down and arguments replace understanding. The louder the preaching, the less real the healing - and that’s when conviction becomes a cage.",
    "Building toward an exact square on August 1, Venus in Virgo and Lilith in Sagittarius push against each other. The untamed side and its refusals tug at your wants, and it is easy to overspend, overindulge, or say yes just to keep the peace. Check what you actually want before agreeing."
  ],
  "Lilith-in-Sagittarius must preserve the approved three-beat hybrid and append only the computed Venus-square-Lilith layer."
);
assert.deepEqual(
  lilithSagittarius.moves,
  [
    "Host a debate where every side must state why they changed their mind.",
    "Write down one belief you defend fiercely - then list what could prove you wrong.",
    "Challenge a confident claim with a simple question: 'How do you know?'"
  ],
  "Lilith-in-Sagittarius must expose the approved practical moves."
);
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
  "You do not owe every message an instant reply.",
  "Mercury retrograde in Cancer must open with the approved retrograde article."
);
assert.doesNotMatch(
  mercuryCancerRetrograde.body,
  /Mercury's move into Cancer changes the voice in the room|Say the thing while the channel is open/iu,
  "Retrograde Sky articles must not contain ingress-only copy for the same planet-sign."
);
assert.match(
  mercuryCancerIngress.body,
  /^You already know the conversation you have been avoiding\./u,
  "Direct-motion Mercury in Cancer must retain the stronger voice-first hook."
);
assert.doesNotMatch(
  `${mercuryCancerIngress.headline}\n${mercuryCancerIngress.body}`,
  /You do not owe every message an instant reply\./u,
  "Direct-motion ingress articles must not contain retrograde-article copy."
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
