#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fallbackSourceRows from "../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json" with { type: "json" };
import fallbackTemplates from "../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json" with { type: "json" };
import transitSynastryRows from "../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json" with { type: "json" };
import skyArticleV1 from "../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-article-v1.json" with { type: "json" };
import skySignCopySunV1 from "../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-sign-copy-sun-v1.json" with { type: "json" };
import skyPlacementOwnerApprovedSourceV1 from "../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json" with { type: "json" };
import skyPlacementOwnerApprovedFallbacksV1 from "../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-owner-approved-reader-v1.json" with { type: "json" };
import contentRoleContract from "../apps/web/src/content/fallbackArchitectureV3/contracts/CONTENT-ROLE-CONTRACT.json" with { type: "json" };
import {
  createTransitSynastryRenderer,
  PACKAGE_VERSION
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  renderSkyPlacement as renderSkyPlacementReference
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const app = read("apps/web/src/App.tsx");
const skyDetailArticle = read("apps/web/src/features/sky/SkyDetailArticle.tsx");
const adminDashboard = read("apps/admin/src/GeneratedContentAdminDashboard.tsx");
const debugRuntime = read("apps/web/src/content/fallbackArchitectureV3Runtime.ts");
const browserResolverIndex = read("apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts");
const nodeTransitRenderer = read("apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs");
const browserTransitRenderer = read("apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts");
const placementRows = read("apps/web/src/components/charts/PlacementRows.tsx");
const writingSurfaceSourceMap = read("apps/admin/src/writingSurfaceSourceMap.ts");
const canonicalFallbackTemplate = read("packages/astro-knowledge/voice/tldr-astro/fallback-canonical-template.md");
const continuousFallbackSchema = JSON.parse(read(
  "apps/web/src/content/fallbackArchitectureV3/contracts/SKY-PLACEMENT-CONTINUOUS-V2.schema.json"
));
const pendingContinuousImports = JSON.parse(read(
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-placement-continuous-v2-pending.json"
));
const retiredPlacementFamily = /^fallback-hook\/sky-placement-(?:you|practice)\//u;
const retiredPlacementMovesFamily = /^fallback-hook\/sky-placement-moves\//u;

assert.equal(
  skyArticleV1.hookRows.filter((row) => retiredPlacementFamily.test(row.contentKey)).length,
  0,
  "The 28 retired sky-placement-you/practice emergency rows must remain absent from approved source rows."
);
assert.equal(
  skyPlacementOwnerApprovedFallbacksV1.rows.filter((row) => retiredPlacementFamily.test(row.contentKey)).length,
  0,
  "The retired emergency families must never enter the owner-approved placement reader bundle."
);
assert.equal(
  fallbackSourceRows.hookRows.filter((row) => retiredPlacementMovesFamily.test(row.contentKey)).length,
  0,
  "No sky-placement-moves contentKey may remain in the approved fallback source."
);
for (const [label, source] of [
  ["Node", nodeTransitRenderer],
  ["browser", browserTransitRenderer]
]) {
  assert.doesNotMatch(
    source,
    /fallback-hook\/sky-placement-(?:you|practice)\//u,
    `${label} placement rendering must not read or substitute retired emergency copy.`
  );
}

const renderer = createTransitSynastryRenderer(
  {
    authoredCards: [...transitSynastryRows.authoredCards, ...skyArticleV1.authoredCards]
  },
  fallbackTemplates,
  {
    ...fallbackSourceRows,
    hookRows: [
      ...fallbackSourceRows.hookRows,
      ...skySignCopySunV1.rows,
      ...skyPlacementOwnerApprovedFallbacksV1.rows
    ],
    vocabularyRows: [...fallbackSourceRows.vocabularyRows, ...skyArticleV1.vocabularyRows]
  }
);
const sunLeoFacts = {
  planet: "sun",
  sign: "leo",
  entryDate: "July 22, 2026",
  exitDate: "August 23, 2026",
  priorSign: "cancer",
  priorSignEntryDate: "June 21, 2026",
  priorSignExitDate: "July 22, 2026",
  previousResidencyEntryDate: "July 22, 2025",
  previousResidencyExitDate: "August 22, 2025"
};
const sunLeo = renderer.renderSkyPlacement({
  ...sunLeoFacts,
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
const sunLeoReference = renderSkyPlacementReference({
  ...sunLeoFacts,
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
  ...sunLeoFacts,
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
const moonTaurusFacts = {
  planet: "moon",
  sign: "taurus",
  entryDate: "August 4, 2026",
  exitDate: "August 7, 2026"
};
const moonTaurus = renderer.renderSkyPlacement({
  ...moonTaurusFacts,
  events: []
});
const moonTaurusSquareJupiter = renderer.renderSkyPlacement({
  ...moonTaurusFacts,
  events: [{
    type: "aspect",
    a: "moon",
    aSign: "taurus",
    b: "jupiter",
    bSign: "leo",
    aspect: "square",
    exactDate: "August 6, 2026"
  }]
});
const moonTaurusUndatedSquare = renderer.renderSkyPlacement({
  ...moonTaurusFacts,
  events: [{
    type: "aspect",
    a: "moon",
    aSign: "taurus",
    b: "jupiter",
    bSign: "leo",
    aspect: "square",
    dateLine: "This week"
  }]
});
const moonTaurusWrongSignSquare = renderer.renderSkyPlacement({
  ...moonTaurusFacts,
  events: [{
    type: "aspect",
    a: "moon",
    aSign: "taurus",
    b: "jupiter",
    bSign: "virgo",
    aspect: "square",
    exactDate: "August 6, 2026"
  }]
});
const moonTaurusReference = renderSkyPlacementReference({
  ...moonTaurusFacts,
  events: [{
    type: "aspect",
    a: "moon",
    aSign: "taurus",
    b: "jupiter",
    bSign: "leo",
    aspect: "square",
    exactDate: "August 6, 2026"
  }]
});
const moonSignEntries = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
].map((sign) => renderer.renderSkyPlacement({
  planet: "moon",
  sign,
  entryDate: "August 4, 2026",
  exitDate: "August 7, 2026",
  events: []
}));
const lilithAries = renderer.renderSkyPlacement({
  planet: "lilith",
  sign: "aries",
  entryDate: "August 25, 2026",
  exitDate: "May 21, 2027"
});
const saturnPiscesDirect = renderer.renderSkyPlacement({
  planet: "saturn",
  sign: "pisces",
  articleMode: "archive",
  articleKey: "sky-article/saturn/pisces/2023"
});
const saturnPiscesRetrograde = renderer.renderSkyPlacement({
  planet: "saturn",
  sign: "pisces",
  articleMode: "archive",
  articleKey: "sky-article/saturn/pisces/2023",
  isRetrograde: true
});
const saturnPiscesShadow = renderer.renderSkyPlacement({
  planet: "saturn",
  sign: "pisces",
  articleMode: "archive",
  articleKey: "sky-article/saturn/pisces/2023",
  isShadowPhase: true
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
  /^fallback-hook\/sky-placement-(?:tagline|hook|lived|turn)\//u.test(row.contentKey)
);
const approvedSkyPlacementCoreRows = fallbackSourceRows.hookRows.filter((row) =>
  /^fallback-hook\/sky-placement-(?:hook|lived|turn)\//u.test(row.contentKey)
);
const approvedSkyPlacementRowsByFamily = Object.fromEntries(
  ["tagline", "hook", "lived", "turn"].map((family) => [
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
assert.match(canonicalFallbackTemplate, /^# Canonical Planet-in-Sign Fallback Template/u);
assert.match(canonicalFallbackTemplate, /Target length:\n350 to 550 words when an aspect insert is active\.\n220 to 350 words without an aspect insert\./u);
assert.deepEqual(
  pendingContinuousImports.slot_contract,
  ["{{entryDate}}", "{{exitDate}}", "{{aspectInsert}}"]
);
assert.deepEqual(
  pendingContinuousImports.sources.map((source) => [source.file, source.expected_units, source.review_status, source.imported]),
  [
    ["TLDR-Sky-SignCopy-Sun-AllSigns-V2-REVIEW.md", 11, "needs_review", false],
    ["TLDR-Sky-SignCopy-Mercury-AllSigns-V2-REVIEW.md", 12, "needs_review", false],
    ["TLDR-Sky-SignCopy-Venus-AllSigns-V2-REVIEW.md", 12, "needs_review", false],
    ["TLDR-Sky-SignCopy-Mars-AllSigns-V2-REVIEW.md", 12, "needs_review", false],
    ["TLDR-Sky-SignCopy-SlowMovers-Current-V2-REVIEW.md", 7, "needs_review", false]
  ]
);
assert.equal(pendingContinuousImports.retired_module_rows.review_status, "superseded");
assert.equal(pendingContinuousImports.retired_module_rows.render_eligible, false);
assert.equal(continuousFallbackSchema.properties.fact_line.const, "{{entryDate}} to {{exitDate}}");
assert.equal(continuousFallbackSchema.properties.aspect_insert.const, "{{aspectInsert}}");
assert.match(
  app,
  /function formatPlacementTransitEndpoint\([\s\S]*month: "long"/u,
  "Planet-in-sign dates must use full month names before entering the canonical renderer."
);
assert.doesNotMatch(skyDetailArticle, /Try this|sky-placement-moves|detail\.moves/u);
assert.doesNotMatch(nodeTransitRenderer, /fallback-hook\/sky-placement-moves\//u);
assert.doesNotMatch(browserTransitRenderer, /fallback-hook\/sky-placement-moves\//u);
assert.equal(anglePlacementRows.length, 24, "The package must provide all Ascendant and Midheaven placement sentences.");
assert.equal(dignityGlossaryRows.length, 4, "The package must provide one generic glossary row for every dignity badge.");
assert.ok(dignityLineRows.length > 0, "The imported package must retain its approved sparse dignity lines.");
assert.equal(targetSpecificTransitEffectRows.length, 324, "The package must include the complete target-specific transit effect library.");
assert.ok(authoredTransitAspectRows.length > 0, "The imported package must expose authored transit-aspect rows.");
assert.equal(approvedSkyPlacementRows.length, 672, "The package must include four approved article slots for all 168 placement pairs.");
assert.equal(approvedSkyPlacementCoreRows.length, 504, "Every placement pair must have approved hook, lived, and turn rows.");
for (const [family, rows] of Object.entries(approvedSkyPlacementRowsByFamily)) {
  assert.equal(rows.length, 168, `Sky placements must have the governed ${family} row count.`);
}
for (const planet of retrogradePlacementPlanets) {
  for (const sign of zodiacSigns) {
    assert.throws(
      () => renderer.renderSkyPlacement({ planet, sign, isRetrograde: true }),
      /SOURCE_GAP: continuous sky placement (?:sign copy|dates)/u,
      `${planet} retrograde in ${sign} must not revive the retired module stack.`
    );
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
  /^X may point out problems in how you come across or tell you to be more careful\./u,
  "The package must preserve the exact owner-approved Ascendant-Saturn hard body."
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
assert.equal(skySignCopySunV1.superseded_rows.length, 13);
assert.ok(
  skySignCopySunV1.superseded_rows.some((row) => (
    row.contentKey === "fallback-hook/sky-sign-copy/sun/leo"
    && row.review_status === "superseded"
    && /A celebration becomes more important\./u.test(row.opening ?? "")
  )),
  "The first approved Leo V2 row must remain in superseded history."
);
assert.match(
  sunLeo.body,
  /^July 22 to August 23, 2026\n\nThe work may be ready to be seen before we feel ready to show it\. The Sun enters Leo on July 22 after moving through Cancer since June 21\./u,
  "Package Sun-in-Leo copy must lead with the engine-filled fact line and exact owner-approved opening."
);
assert.match(sunLeo.body, /the work reaches the audience it was made for\./u);
assert.match(sunLeo.body, /It is becoming easier to approve\./u);
assert.doesNotMatch(sunLeo.body, /last moved through/u, "Annual Sun ingress carries no look-back (owner rule 2026-08-05).");
assert.match(sunLeo.body, /What we name during Leo season is what Virgo season will ask us to build\./u);
assert.doesNotMatch(
  sunLeo.body,
  /Somewhere along the way|rescheduling a decision|version of yourself|The useful version|The distortion|Wishing you|Leo is the fifth sign|The Leo trap/iu,
  "The continuous fallback must exclude every retired Sun module."
);
assert.match(
  sunLeo.body,
  /The problem begins when the response starts deciding what gets made next\./u,
  "Sun-in-Leo must keep the owner-approved central tension."
);
assert.doesNotMatch(
  sunLeo.body,
  /On July 29, the Sun meets Jupiter in Leo\./u,
  "The exact owner-approved Sun-in-Leo fallback must not inherit the superseded aspect insert."
);
assert.doesNotMatch(
  sunLeoMoonOpposition.body,
  /Full Moon|Emotions, instincts|July 29/iu,
  "An active aspect without an approved canonical insert must not render generic aspect copy."
);
assert.doesNotMatch(
  `${sunLeo.body}\n${sunLeoMoonOpposition.body}`,
  /\b(?:conjunction|square|trine|sextile|opposition|applying|separating|orb)\b/iu,
  "Sky placement bodies must not expose aspect jargon."
);
assert.equal(moonTaurus.templateKey, "sky-placement-moon-entry-v1");
assert.equal(moonTaurus.contentKey, "fallback-hook/sky-placement-hook/moon/taurus");
assert.equal(moonTaurus.tagline, null, "Moon sign entries must not render the retired tagline row.");
assert.match(
  moonTaurus.body,
  /^The Moon moves into Taurus on August 4, and the collective pace slows\./u,
  "Moon in Taurus must fill its entry date from the engine-owned slot."
);
assert.match(
  moonTaurus.body,
  /A delayed answer, slower day, or stronger need for comfort is not proof that the entire plan is wrong\.$/u
);
assert.doesNotMatch(moonTaurus.body, /mood has moved on/u);
assert.doesNotMatch(
  moonTaurus.body,
  /squares Jupiter|August 6/u,
  "The optional aspect paragraph must stay absent without a matching engine fact."
);
assert.match(
  moonTaurusSquareJupiter.body,
  /The Moon in Taurus squares Jupiter in Leo on August 6\./u,
  "A matching exact engine aspect must activate the owner-approved insert."
);
assert.ok(
  moonTaurusSquareJupiter.parts.indexOf("The Moon in Taurus squares Jupiter in Leo on August 6. Feelings run bigger, and one small need can quickly become a large promise, purchase, or plan. It may feel good to say yes in the moment and exhausting to carry all of it later. Choose one priority before agreeing to five.")
    > moonTaurusSquareJupiter.parts.indexOf("This can help us stop reacting to every update and return to what is already working. It can also make us hold on after the routine has stopped helping. A plan stays in place because changing it feels inconvenient. A decision gets delayed because the familiar answer feels easier than the honest one. Patience supports a better choice. Refusing to adjust keeps the same problem going."),
  "The aspect insert must follow the ordinary-reaction and distortion paragraphs."
);
assert.doesNotMatch(moonTaurusUndatedSquare.body, /squares Jupiter|This week/u);
assert.doesNotMatch(moonTaurusWrongSignSquare.body, /squares Jupiter|August 6/u);
assert.equal(Object.hasOwn(moonTaurus, "moves"), false);
assert.equal(moonSignEntries.length, 12);
moonSignEntries.forEach((entry) => {
  assert.equal(entry.templateKey, "sky-placement-moon-entry-v1");
  assert.equal(Object.hasOwn(entry, "moves"), false, "Moon sign entries must not expose a Try this section.");
});
assert.deepEqual(
  {
    articleSections: moonTaurusSquareJupiter.articleSections,
    body: moonTaurusSquareJupiter.body,
    contentKey: moonTaurusSquareJupiter.contentKey,
    parts: moonTaurusSquareJupiter.parts,
    templateKey: moonTaurusSquareJupiter.templateKey
  },
  {
    articleSections: moonTaurusReference.articleSections,
    body: moonTaurusReference.body,
    contentKey: moonTaurusReference.contentKey,
    parts: moonTaurusReference.parts,
    templateKey: moonTaurusReference.templateKey
  },
  "Browser and Node Moon sign-entry assembly must remain byte-identical."
);
const sunAries = renderer.renderSkyPlacement({
  planet: "sun",
  sign: "aries",
  entryDate: "March 20, 2027",
  exitDate: "April 20, 2027",
  priorSign: "pisces",
  priorSignEntryDate: "February 18, 2027",
  priorSignExitDate: "March 20, 2027",
  previousResidencyEntryDate: "March 20, 2026",
  previousResidencyExitDate: "April 20, 2026",
  events: []
});
assert.equal(sunAries.contentKey, "fallback-hook/sky-sign-copy/sun/aries");
assert.match(sunAries.body, /The Sun in Aries makes a clean decision feel like a return to life\./u);
assert.equal(sunLeo.tagline, null, "The continuous unit must not append the retired quote-style tagline.");
assert.equal(Object.hasOwn(sunLeo, "moves"), false, "Sun-in-Leo must not expose the retired Try this section.");
const sunLeoV3 = skyPlacementOwnerApprovedSourceV1.rows.find((row) => (
  row.contentKey === "fallback-hook/sky-sign-copy/sun/leo"
));
assert.ok(sunLeoV3, "The owner-approved Sun-in-Leo V3 source row must exist.");
assert.equal(sunLeoV3.fact_line, "{{entryDate}} to {{exitDate}}", "V3 must not change the engine fact line.");
assert.equal(sunLeoV3.aspect_insert, "{{aspectInsert}}", "V3 must not change the aspect insert contract.");
assert.equal(
  sunLeoV3.opening,
  "The work may be ready to be seen before we feel ready to show it. The Sun enters Leo on {{entryDate}} after moving through {{priorSign}} since {{priorSignEntryDate}}. The Sun governs identity, vitality, and who we are beneath the roles. Leo is the sign of visibility, creative pride, and being seen. A creative project gets shared before every detail is finished. Someone asks for the title, credit, invitation, or opportunity that matches work they have already been doing. The work can be unfinished and still ready to have a name on it."
);
assert.equal(
  sunLeoV3.tension,
  "Wanting to be seen is not the problem. Recognition can bring confidence back, especially when the work reaches the audience it was made for. The problem begins when the response starts deciding what gets made next. We check the numbers, reread the comments, and compare our reception with someone else's. A quiet response feels like proof the work failed. Someone else's success feels like lost ground. Soon the work is no longer becoming more honest or more interesting. It is becoming easier to approve."
);
assert.equal(
  sunLeoV3.development,
  "Being visible and being known are not the same thing. A title may still look impressive and no longer describe the life we want. An online persona may attract attention while leaving important parts of us out. A creative identity may become another role we feel required to maintain. The version that gets rewarded can still be the wrong version to keep feeding."
);
assert.equal(
  sunLeoV3.close,
  "Praise can give the work momentum. It cannot tell us what the work means. Before {{exitDate}}, the response may change, the audience may move on, or the role may stop feeling convincing. What we name during Leo season is what Virgo season will ask us to build. The work worth carrying forward is the work we still mean when the spotlight is off."
);
assert.equal(
  sunLeoV3.body_you,
  [sunLeoV3.opening, sunLeoV3.tension, sunLeoV3.development, sunLeoV3.close].join("\n\n"),
  "The legacy editorial mirror must remain a mechanical join of the four approved V3 fields."
);
assert.equal(lilithAries.tagline, "Anger stops going somewhere else", "Owner-approved Lilith placement taglines must be reader-eligible.");
assert.match(
  lilithAries.body,
  /^Someone finally says no to the demand they have agreed to a hundred times before/u,
  "Owner-approved Lilith placement copy must render from the promoted pair rows."
);
assert.equal(Object.hasOwn(lilithAries, "moves"), false, "Lilith placement articles must not expose a Try this section.");
assert.doesNotMatch(
  sunLeo.body,
  /this energy|right now|reveals|heals|[\u2013\u2014]/iu,
  "Sun-in-Leo must satisfy the placement-article voice bans."
);
assert.match(app, /return `\$\{skyDisplayPlanetName\(position\.planet\)\} Rx in \$\{position\.sign\}`;/, "Retrograde Sky ID title must stay factual in the app route.");
assert.equal(
  saturnPiscesDirect.templateKey,
  "sky-article-v1",
  "The owner-final Saturn-in-Pisces exemplar must use the structured sky-article-v1 lane."
);
assert.equal(
  saturnPiscesDirect.contentKey,
  "sky-article/saturn/pisces/2023",
  "The structured article must retain its exact authored content key."
);
assert.doesNotMatch(
  saturnPiscesDirect.body,
  /^The pre-retrograde shadow phase/u,
  "A direct placement outside the computed shadow must omit the conditional preview note."
);
assert.match(
  saturnPiscesDirect.body,
  /^The core theme of this transit is bringing structural discipline to your inner life/u,
  "The structured article must open on its owner-final core theme when no review phase is active."
);
assert.equal(
  saturnPiscesDirect.closingCharge,
  "Stop treating your sensitivity like a flaw and stop using it to avoid your life. Set the boundary, lay the first brick, and let the rest pass without holding a summit over it.",
  "The closing charge must remain a separately addressable final module."
);
assert.equal(
  saturnPiscesDirect.parts.at(-1),
  saturnPiscesDirect.closingCharge,
  "The complete resolver body must preserve the closing charge as its last paragraph."
);
for (const rendered of [saturnPiscesRetrograde, saturnPiscesShadow]) {
  assert.match(
    rendered.parts[0],
    /^The pre-retrograde shadow phase and retrograde station periods/u,
    "Retrograde and shadow facts must activate the approved preview note."
  );
}
const saturnPiscesReference = renderSkyPlacementReference({
  planet: "saturn",
  sign: "pisces",
  articleMode: "archive",
  articleKey: "sky-article/saturn/pisces/2023",
  isShadowPhase: true
});
assert.deepEqual(
  {
    body: saturnPiscesShadow.body,
    closingCharge: saturnPiscesShadow.closingCharge,
    contentKey: saturnPiscesShadow.contentKey,
    parts: saturnPiscesShadow.parts,
    templateKey: saturnPiscesShadow.templateKey
  },
  {
    body: saturnPiscesReference.body,
    closingCharge: saturnPiscesReference.closingCharge,
    contentKey: saturnPiscesReference.contentKey,
    parts: saturnPiscesReference.parts,
    templateKey: saturnPiscesReference.templateKey
  },
  "Browser and Node structured Sky placement assembly must remain byte-identical."
);

assert.equal(
  sunLeo.templateKey,
  "sky-placement-continuous-v2",
  "Sun-in-Leo must report the governed continuous slot-tier template."
);
assert.deepEqual(
  {
    articleSections: sunLeo.articleSections,
    body: sunLeo.body,
    contentKey: sunLeo.contentKey,
    parts: sunLeo.parts,
    templateKey: sunLeo.templateKey
  },
  {
    articleSections: sunLeoReference.articleSections,
    body: sunLeoReference.body,
    contentKey: sunLeoReference.contentKey,
    parts: sunLeoReference.parts,
    templateKey: sunLeoReference.templateKey
  },
  "Browser and Node continuous Sun fallback assembly must remain byte-identical."
);

assert.equal(skyPlacementOwnerApprovedFallbacksV1.rows.length, 56);
const ownerFallbackDateFacts = {
  entryDate: "August 24, 2028",
  exitDate: "September 24, 2029",
  priorSign: "virgo",
  priorSignEntryDate: "July 26, 2027",
  priorSignExitDate: "August 24, 2028",
  previousResidencyEntryDate: "September 9, 2016",
  previousResidencyExitDate: "October 10, 2017"
};
const fillOwnerFallback = (value, facts) => value.replace(/\{\{([\w.]+)\}\}/gu, (_, key) => {
  const renderedDates = {
    entryDate: "August 24",
    exitDate: "September 24",
    priorSign: "Virgo",
    priorSignEntryDate: "July 26",
    priorSignExitDate: "August 24",
    previousResidencyEntryDate: "September 9",
    previousResidencyExitDate: "October 10"
  };
  return renderedDates[key] ?? facts[key] ?? `{{${key}}}`;
});

for (const row of skyPlacementOwnerApprovedFallbacksV1.rows) {
  const [, , planet, sign] = row.contentKey.split("/");
  const facts = {
    planet,
    sign,
    ...ownerFallbackDateFacts
  };
  const rendered = renderer.renderSkyPlacement(facts);

  assert.equal(rendered.contentKey, row.contentKey);
  assert.equal(rendered.templateKey, "sky-placement-continuous-v2");
  assert.deepEqual(rendered.parts.slice(1, 4), [
    fillOwnerFallback(row.opening, facts),
    fillOwnerFallback(row.tension, facts),
    fillOwnerFallback(row.development, facts)
  ]);
  assert.equal(rendered.parts.at(-1), fillOwnerFallback(row.close, facts));
  assert.equal(Object.hasOwn(rendered, "moves"), false, `${row.contentKey} must not expose a Try this section.`);
  assert.doesNotMatch(
    [rendered.headline, rendered.body, ...(rendered.parts ?? [])].join("\n"),
    /Try this/iu,
    `${row.contentKey} must not render a Try this section.`
  );
  assert.doesNotMatch(rendered.body, /\{\{/u);
}

assert.throws(
  () => renderer.renderSkyPlacement({
    planet: "jupiter",
    sign: "scorpio",
    entryDate: "October 25, 2029",
    exitDate: "November 15, 2030"
  }),
  /SOURCE_GAP: continuous sky placement sign copy jupiter\/scorpio/u,
  "An unapproved placement must remain unavailable."
);

console.log(JSON.stringify({
  packageVersion: PACKAGE_VERSION,
  sunLeoHeadline: sunLeo.headline,
  sunLeoOpening: sunLeo.body.slice(0, 96),
  retrogradeTitlePath: "skyDisplayPlanetName(position.planet) Rx in position.sign"
}, null, 2));
