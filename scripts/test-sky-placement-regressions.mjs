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
const placementRows = read("apps/web/src/components/charts/PlacementRows.tsx");
const writingSurfaceSourceMap = read("apps/admin/src/writingSurfaceSourceMap.ts");

const renderer = createTransitSynastryRenderer(transitSynastryRows, fallbackTemplates, fallbackSourceRows);
const sunLeo = renderer.renderSkyPlacement({ planet: "sun", sign: "leo" });
const mercuryCancerIngress = renderer.renderSkyPlacement({ planet: "mercury", sign: "cancer" });
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
const phaseOneTransitAspectRows = transitSynastryRows.authoredCards.filter((row) =>
  /^authored\/transit-aspect\/(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith|north-node|south-node)\/(?:chiron|north-node|south-node|moon|venus|mars|mercury)\/(?:conjunction|opposition|sextile|square|trine)$/u.test(row.contentKey)
  && row.approved_via === "owner-authored aspects-phase1-v1 package (final voice)"
);
const bannedDignityWords = contentRoleContract.styleRules?.bannedWords ?? [];
const bannedDignityPattern = bannedDignityWords.length > 0
  ? new RegExp(`\\b(?:${bannedDignityWords.join("|")})\\b`, "iu")
  : null;

assert.equal(PACKAGE_VERSION, "v3-2026-07-23g", "FallbackArchitectureV3 package version must expose the current imported stamp.");
assert.equal(transitSynastryRows.authoredCards.length, 1_625, "23f plus aspects-phase1-v1 must expose the re-derived authored-card count.");
assert.equal(fallbackSourceRows.hookRows.length, 2_484, "23f plus the complete V3 source package must expose the current hook count.");
assert.equal(fallbackSourceRows.vocabularyRows.length, 641, "23f must preserve the re-derived vocabulary count.");
assert.equal(fallbackTemplates.templates.length, 22, "23f must preserve the re-derived template count.");
assert.match(debugRuntime, /fallbackArchitectureV3PackageVersion/, "Runtime must export the package version for app/admin debug surfaces.");
assert.match(app, /Fallback package/, "App calculation diagnostics must show the fallback package version.");
assert.match(adminDashboard, /Fallback package/, "Admin dashboard must show the fallback package version.");
assert.equal(anglePlacementRows.length, 24, "23c must provide all Ascendant and Midheaven placement sentences.");
assert.equal(dignityGlossaryRows.length, 4, "23c must provide one generic glossary row for every dignity badge.");
assert.equal(dignityLineRows.length, 28, "The durable dignity library must include 7 classical planets x 4 dignities.");
assert.equal(targetSpecificTransitEffectRows.length, 324, "23f must include the complete target-specific transit effect library.");
assert.equal(phaseOneTransitAspectRows.length, 266, "aspects-phase1-v1 must contribute exactly 266 exact authored transit-aspect units.");
assert.equal(
  transitSynastryRows.authoredCards.some((row) =>
    [
      "authored/transit-aspect/any/chiron/conjunction",
      "authored/transit-aspect/any/north-node/conjunction",
      "authored/transit-aspect/any/south-node/conjunction"
    ].includes(row.contentKey)
  ),
  false,
  "Retired planet-agnostic Chiron and node transit cards must not remain in the authored serving library."
);
for (const row of phaseOneTransitAspectRows) {
  assert.equal(row.review_status, "approved", `${row.contentKey} must be reader-eligible.`);
}
for (const row of dignityLineRows) {
  assert.equal(row.content_role, "fallback_hook", `${row.contentKey} must remain a fallback_hook.`);
  assert.equal(row.review_status, "approved", `${row.contentKey} must remain approved.`);
  assert.ok(row.body_you && row.body_they && row.body_sky, `${row.contentKey} must keep all three voice bodies.`);
  assert.ok(
    row.source_keys?.some((key) => key.startsWith("cc/dignity/")),
    `${row.contentKey} must keep its cc/dignity source key.`
  );
  const bodies = `${row.body_you} ${row.body_they} ${row.body_sky}`;
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
  "23d must preserve the owner-approved Ascendant-Saturn authored pair body."
);
assert.match(
  northNodeSouthNodeConjunction.body,
  /^Your North Node sits right on X's South Node, the famous crossing\b/u,
  "23f must return the owner-approved North Node-South Node authored pair body."
);
assert.equal(
  venusAscendantBondTransit.headline,
  "Mars square your Venus-Ascendant line with X",
  "Bond-transit headlines must retain the space after 'your'."
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
assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/content/sky-writing")), false, "Retired sky-writing source folder must not exist.");
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

assert.equal(sunLeo.headline, "The Sun in Leo", "Package Sun-in-Leo headline must remain factual.");
assert.match(
  sunLeo.body,
  /The Sun in Leo makes confidence, recognition, and creative authorship more visible/,
  "Package Sun-in-Leo copy must come from dist/tldr-content.js."
);
assert.doesNotMatch(
  sunLeo.body,
  /(?:^|\n\n)(?!Wishing you )[^.\n]*warm light and generous shine,\s*$/iu,
  "Sky placement articles must not end with an incomplete trailing-comma blessing fragment."
);
assert.match(
  sunLeo.body.trim(),
  /Wishing you warm light and generous shine\.$/u,
  "Sun-in-Leo package copy should include the completed blessing sentence."
);
assert.doesNotMatch(
  sunLeo.body,
  /lamplight|The Sun crosses from Cancer into Leo|shell drawn around it/i,
  "Package Sun-in-Leo copy must not contain the retired rogue Leo passage."
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
  /Mercury's move into Cancer changes the voice in the room/iu,
  "Direct-motion Mercury in Cancer must retain its ingress article."
);
assert.doesNotMatch(
  `${mercuryCancerIngress.headline}\n${mercuryCancerIngress.body}`,
  /You do not owe every message an instant reply\./u,
  "Direct-motion ingress articles must not contain retrograde-article copy."
);

console.log(JSON.stringify({
  packageVersion: PACKAGE_VERSION,
  sunLeoHeadline: sunLeo.headline,
  sunLeoOpening: sunLeo.body.slice(0, 96),
  retrogradeTitlePath: "skyDisplayPlanetName(position.planet) Rx in position.sign"
}, null, 2));
