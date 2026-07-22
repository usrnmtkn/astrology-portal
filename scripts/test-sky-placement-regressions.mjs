#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isReaderFacingCopy, readerFacingParagraphs } from "../apps/web/src/content/readerSafety.ts";
import {
  composeNatalPlacement,
  composeSkyAspect,
  composeSkyAspectCompact,
  composeSkyPlacementCompact,
  composeSkyRetrograde
} from "../apps/web/src/content/sourceGroundedModels.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function modulePart(value) {
  const slug = String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug === "true-node" || slug === "north-node") return "north_node";
  if (slug === "south-node") return "south_node";
  return slug.replace(/-/g, "_");
}

function skyPlacementContentKey(body, sign) {
  return `sky.placement.${modulePart(body)}.${modulePart(sign)}`;
}

function legacySkyPlacementContentId(body, sign) {
  return `sky-${String(body).toLowerCase()}-in-${String(sign).toLowerCase()}`;
}

function skyAspectContentKey(first, aspect, second) {
  return `sky.aspect.${modulePart(first)}.${modulePart(aspect)}.${modulePart(second)}`;
}

function legacySkyAspectContentId(first, aspect, second) {
  return `sky-${String(first).toLowerCase()}-${String(aspect).toLowerCase()}-${String(second).toLowerCase()}`;
}

function hasDoubleBraceSlots(value) {
  return /\{\{\s*[^}]+\s*\}\}/.test(String(value ?? ""));
}

function interpolateDoubleBraceTemplate(value, slots) {
  return String(value ?? "").replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(slots, key) ? String(slots[key]) : "";
  });
}

function hasMissingDoubleBraceSlots(value, slots) {
  let hasMissing = false;

  String(value ?? "").replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g, (_, key) => {
    if (!String(slots[key] ?? "").trim()) {
      hasMissing = true;
    }

    return "";
  });

  return hasMissing;
}

function renderTestGeneratedTemplate(content, slots) {
  if (
    hasMissingDoubleBraceSlots(content.headline, slots)
    || hasMissingDoubleBraceSlots(content.summary, slots)
    || hasMissingDoubleBraceSlots(content.body, slots)
    || hasMissingDoubleBraceSlots(JSON.stringify(content.sections ?? {}), slots)
  ) {
    return null;
  }

  const rendered = {
    ...content,
    headline: content.headline === null ? null : interpolateDoubleBraceTemplate(content.headline, slots),
    summary: content.summary === null ? null : interpolateDoubleBraceTemplate(content.summary, slots),
    body: interpolateDoubleBraceTemplate(content.body, slots),
    sections: content.sections ?? {}
  };

  if (
    hasDoubleBraceSlots(rendered.headline)
    || hasDoubleBraceSlots(rendered.summary)
    || hasDoubleBraceSlots(rendered.body)
    || hasDoubleBraceSlots(JSON.stringify(rendered.sections ?? {}))
  ) {
    return null;
  }

  if (!readerFacingParagraphs([rendered.summary, rendered.body]).length) {
    return null;
  }

  return rendered;
}

const blockedScaffoldCopyPatterns = [
  /\bAt work this reads as\b/i,
  /\bLuck favors\b/i,
  /\bWatch:\s*/i,
  /\boverplaying the drama\b/i,
  /\bthe fuller story of this\b/i,
  /\bfollows .+ to wherever it sits\b/i,
  /\bmoves through\b.+\btone\b/i,
  /\bgives\b.+\bquality right now\b/i,
  /\bshows up in\b.+\bthe bigger picture\b/i,
  /\bBeing themselves and\b/i
];

function repairGeneratedParagraphForTest(text) {
  return text
    .replace(/\bmake it all about they\b/gi, "make it all about themselves")
    .replace(/\babout they\b/gi, "about themselves")
    .replace(/\bgiving they\b/gi, "giving them")
    .replace(/\brewards they\b/gi, "rewards them")
    .replace(/\bIt rewards they\b/gi, "It rewards them");
}

function generatedContentParagraphsForTest(content) {
  if (!content?.body) return [];

  return content.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .map(repairGeneratedParagraphForTest)
    .filter((paragraph) => (
      paragraph
      && isReaderFacingCopy(paragraph)
      && !blockedScaffoldCopyPatterns.some((pattern) => pattern.test(paragraph))
    ));
}

const app = read("apps/web/src/App.tsx");
const lunarCalendar = read("apps/web/src/features/calendar/LunarCalendar.tsx");
const themeCss = read("apps/web/src/styles/theme.css");
const generatedContent = read("apps/web/src/services/generatedContent.ts");
const careerArchetype = read("apps/web/src/services/careerArchetype.ts");
const natalPlacementTaglines = read("apps/web/src/services/natalPlacementTaglines.ts");
const planetTopicVocabulary = read("apps/web/src/services/planetTopicVocabulary.ts");
const emergencyCopySource = read("apps/web/src/content/emergencyCopy.ts");
const adminDashboard = read("apps/admin/src/GeneratedContentAdminDashboard.tsx");
const emergencyCopy = JSON.parse(read("apps/web/src/content/emergencyCopy.json"));
const skyContentSnapshot = JSON.parse(read("apps/web/src/content/skyContentSnapshot.json"));
const audit = read("scripts/audit-fallback-runtime-coverage.mjs");

const sunEmergency = interpolate(emergencyCopy.templates["sky.planetary-placement"], {
  Planet: "Sun",
  Sign: "Cancer",
  planet: "Sun",
  sign: "Cancer",
  planetFunction: emergencyCopy.planetFunction.sun,
  planetTopic: emergencyCopy.planetFunction.sun,
  signTone: emergencyCopy.signTone.cancer,
  signStyle: emergencyCopy.signTone.cancer
});
const renderedSkyAspectTemplate = composeSkyAspect({
  aspect: "square",
  focalPlanet: "Sun",
  otherPlanet: "Saturn",
  timing: "Jul 11 - Jul 13, 2026"
}).finalCopy;
const renderedNatalPlacementTemplate = renderTestGeneratedTemplate({
  id: "test-natal-placement",
  contentKey: "fallback-template/natal-placement",
  surface: "modifier",
  mode: "feed",
  eventType: "fallback-template",
  targetDate: null,
  headline: "Natal Placement",
  summary: null,
  body: emergencyCopy.templates["you.natal-synthesis"],
  sections: {},
  blockType: null,
  sourceSnapshot: { contentType: "template" },
  provider: "dashboard-source",
  model: "manual",
  updatedAt: "2026-07-11T00:00:00.000Z"
}, {
  possessive: "Their",
  planet: "Sun",
  sign: "Aquarius",
  house: "9th",
  planetTopic: "identity, vitality, and the spark of self-trust",
  signStyle: "inventive, independent, collective-minded",
  houseLifeArea: "belief, study, travel, and the bigger picture"
});
const unresolvedTemplate = renderTestGeneratedTemplate({
  id: "test-unresolved-template",
  contentKey: "fallback-template/sky-aspect",
  surface: "modifier",
  mode: "feed",
  eventType: "fallback-template",
  targetDate: null,
  headline: "Sky Aspect",
  summary: null,
  body: "{{PlanetA}} and {{PlanetB}} are {{aspect}} in the sky right now. {{missingSlot}}.",
  sections: {},
  blockType: null,
  sourceSnapshot: { contentType: "template" },
  provider: "dashboard-source",
  model: "manual",
  updatedAt: "2026-07-11T00:00:00.000Z"
}, {
  PlanetA: "Sun",
  PlanetB: "Saturn",
  aspect: "square"
});
const synastryEmergency = "Alisa's Ascendant conjunction your Ascendant brings first impressions into direct contact. Name what each side needs, then choose one concrete way to handle it.";
const lilithProvenance = "Imported from approved project Black Moon Lilith material. Source file was not copied into the repository.";
const retiredNatalComposerCopy = "Their Sun in Aquarius: identity, vitality, and where the spark shows moves through inventive, independent, collective-minded tone.";
const retiredSkyComposerCopy = "Lilith is in Sagittarius. Collectively that gives attention, choice, and response expansive, restless, meaning-seeking quality right now.";
const repairedPronounCopy = "At the edge, they make it all about they, or they shrink when no one's looking.";
const forbiddenSkyFallbackPatterns = [
  /The planet names the topic/i,
  /Notice how identity, vitality.*asks for a clear response through tender, protective, home-centered/i,
  /a close merge that concentrates both sides of the pattern/i,
  /asks for a clear response through/i,
  /both planets are active in the same part of the sky/i,
  /a low-key opening that helps when acted on/i
];
const forbiddenNatalFallbackPatterns = [
  /In a birth chart,\s*\w+\s+describes/i,
  /The sign describes the style or condition/i,
  /brings\s+[^.]{0,160}\s+through\s+[^.]{0,160}/i,
  /adds\s+[^.]{0,160}\s+through\s+[^.]{0,160}/i
];

function buildGeneratedContentMapForTest(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!row?.contentKey || !row?.body) {
      continue;
    }

    if (!map.has(row.contentKey)) {
      map.set(row.contentKey, row);
    }

    for (const alias of row.aliases ?? []) {
      if (alias && !map.has(alias)) {
        map.set(alias, row);
      }
    }
  }

  return map;
}

function mergeGeneratedContentMapsForTest(primary, secondary) {
  return new Map([...secondary, ...primary]);
}

function assertNormalizedSkyRow(row, canonicalKey, family) {
  assert.ok(row, `${canonicalKey} must resolve to a normalized Sky snapshot row.`);
  assert.equal(row.sourceSnapshot?.canonicalKey, canonicalKey, `${canonicalKey} provenance must retain its canonical key.`);
  assert.equal(row.sourceSnapshot?.sourceType, "source-grounded-generated-snapshot", `${canonicalKey} source type must identify source-grounded generated prose.`);
  assert.equal(row.sourceSnapshot?.contentType, "source-grounded-generated-snapshot", `${canonicalKey} content type must identify source-grounded generated prose.`);
  assert.notEqual(row.sourceSnapshot?.templateVersion, "2.2.1", `${canonicalKey} stale normalized snapshot provenance must remain distinguishable from the current v2.2.1 runtime authority.`);
  assert.equal(row.sourceSnapshot?.family, family, `${canonicalKey} must use the expected content family.`);
  assert.equal(row.provider, "local-normalized-dashboard-source", `${canonicalKey} must not resolve to an emergency/local keyword composer.`);
  assert.ok(Array.isArray(row.sections?.sourceKeys) && row.sections.sourceKeys.length > 0, `${canonicalKey} must carry source keys.`);
  assert.ok(String(row.sections?.preview ?? "").trim(), `${canonicalKey} must carry a preview.`);
  assert.ok(!forbiddenSkyFallbackPatterns.some((pattern) => pattern.test(JSON.stringify(row))), `${canonicalKey} must not contain blocked generic fallback copy.`);
}

const normalizedSkySnapshotMap = buildGeneratedContentMapForTest(skyContentSnapshot.rows);
const hydratedRemoteFallbackMap = buildGeneratedContentMapForTest([
  {
    contentKey: "fallback-hook/sky.planetary-placement",
    aliases: ["fallback-hook/sky.planetary-placement/sun/cancer"],
    body: "The planet names the topic, the sign describes the style, and the sky says what is visible right now.",
    sourceSnapshot: { sourceType: "legacy-generic-template", canonicalKey: "fallback-hook/sky.planetary-placement" },
    provider: "dashboard-source"
  },
  {
    contentKey: "fallback-hook/sky.aspect-detail",
    aliases: [
      "fallback-hook/sky.aspect-detail/conjunction/card",
      "fallback-hook/sky.aspect-detail/conjunction/feed",
      "fallback-hook/sky.aspect-detail/conjunction/expanded"
    ],
    body: "Sun conjunction Mercury: a close merge that concentrates both sides of the pattern.",
    sourceSnapshot: { sourceType: "legacy-generic-template", canonicalKey: "fallback-hook/sky.aspect-detail" },
    provider: "dashboard-source"
  }
]);
const preHydrationSkyMap = normalizedSkySnapshotMap;
const postHydrationSkyMap = mergeGeneratedContentMapsForTest(normalizedSkySnapshotMap, hydratedRemoteFallbackMap);
const preHydrationSunCancer = preHydrationSkyMap.get("fallback-hook/sky.planetary-placement/sun/cancer");
const postHydrationSunCancer = postHydrationSkyMap.get("fallback-hook/sky.planetary-placement/sun/cancer");
const preHydrationSunMercuryAspect = preHydrationSkyMap.get("fallback-hook/sky.aspect-detail/conjunction/expanded");
const postHydrationSunMercuryAspect = postHydrationSkyMap.get("fallback-hook/sky.aspect-detail/conjunction/expanded");
const mercuryCancerPreShadow = normalizedSkySnapshotMap.get("sky.retrograde.mercury.cancer.pre_shadow");
const mercuryCancerRetrogradePassage = normalizedSkySnapshotMap.get("sky.retrograde.mercury.cancer.retrograde_passage");
const mercuryCancerStationRetrograde = normalizedSkySnapshotMap.get("sky.station.mercury.cancer.retrograde");
const normalizedCoverage = skyContentSnapshot.coverage ?? {};
const sourceGroundedMercuryCancer = composeSkyRetrograde({
  currentDate: "July 12, 2026",
  end: "July 23, 2026",
  phase: "retrograde passage",
  planet: "Mercury",
  sign: "Cancer",
  start: "June 29, 2026"
}).finalCopy;
const sourceGroundedVenusVirgoCompact = composeSkyPlacementCompact({
  planet: "Venus",
  sign: "Virgo"
}).finalCopy;
const sourceGroundedMarsGeminiCompact = composeSkyPlacementCompact({
  planet: "Mars",
  sign: "Gemini"
}).finalCopy;
const sourceGroundedSunMercuryCompact = composeSkyAspectCompact({
  aspect: "conjunction",
  focalPlanet: "Sun",
  otherPlanet: "Mercury"
}).finalCopy;
const sourceGroundedSunAquariusNatal = composeNatalPlacement({
  dignityLabel: "Constrained · Detriment",
  natalSky: {
    positions: [
      { planet: "Saturn", sign: "Virgo", house: 4 }
    ]
  },
  ownerPerspective: "you",
  position: {
    planet: "Sun",
    sign: "Aquarius",
    house: 9,
    motion: "direct"
  }
}).sections;

assertNormalizedSkyRow(preHydrationSunCancer, "sky.placement.sun.cancer", "current-sky-placement");
assertNormalizedSkyRow(postHydrationSunCancer, "sky.placement.sun.cancer", "current-sky-placement");
assertNormalizedSkyRow(preHydrationSunMercuryAspect, "sky.aspect.sun.conjunction.mercury", "current-sky-aspect");
assertNormalizedSkyRow(postHydrationSunMercuryAspect, "sky.aspect.sun.conjunction.mercury", "current-sky-aspect");
assert.equal(postHydrationSkyMap.get("sky.placement.sun.cancer"), postHydrationSunCancer, "Canonical Sun-in-Cancer key and placement hook alias must resolve to the same row.");
assert.equal(postHydrationSkyMap.get("sky.aspect.mercury.conjunction.sun"), postHydrationSunMercuryAspect, "Reversed Sun/Mercury aspect key must resolve to the canonical normalized row.");
assert.equal(preHydrationSunCancer.body, postHydrationSunCancer.body, "Sun-in-Cancer body must not change after hydration.");
assert.deepEqual(preHydrationSunCancer.sourceSnapshot, postHydrationSunCancer.sourceSnapshot, "Sun-in-Cancer provenance must not change after hydration.");
assert.equal(preHydrationSunMercuryAspect.body, postHydrationSunMercuryAspect.body, "Sun/Mercury conjunction body must not change after hydration.");
assert.deepEqual(preHydrationSunMercuryAspect.sourceSnapshot, postHydrationSunMercuryAspect.sourceSnapshot, "Sun/Mercury conjunction provenance must not change after hydration.");
assert.ok(preHydrationSunCancer.body.includes("Sun in Cancer draws attention toward belonging"), "Sun-in-Cancer normalized reader copy must render.");
assert.ok(preHydrationSunMercuryAspect.body.includes("The Sun and Mercury are together in Cancer."), "Sun/Mercury conjunction normalized reader copy must render.");
assert.ok((normalizedCoverage["current-sky-placement"]?.READY ?? 0) >= 144, "Normalized source must cover every supported current-sky planet-in-sign placement.");
assert.ok((normalizedCoverage["current-sky-aspect"]?.READY ?? 0) >= 330, "Normalized source must cover every supported current-sky aspect family.");
assert.ok((normalizedCoverage.ingress?.READY ?? 0) >= 144, "Normalized source must cover every supported ingress family.");
assert.ok((normalizedCoverage["retrograde-stage"]?.READY ?? 0) >= 576, "Normalized source must cover required retrograde phases by supported planet/sign.");
assert.ok((normalizedCoverage.station?.READY ?? 0) >= 192, "Normalized source must cover station direct and station retrograde rows.");
assert.ok((normalizedCoverage.lunation?.READY ?? 0) >= 72, "Normalized source must cover lunation and eclipse rows.");
assert.ok((normalizedCoverage["angle-surface"]?.READY ?? 0) >= 24, "Normalized source must cover Ascendant and Midheaven sign rows.");
assert.ok((normalizedCoverage.daylight?.READY ?? 0) >= 3, "Normalized source must cover planetary hour, sunrise, and sunset surfaces.");
assert.ok(sourceGroundedMercuryCancer.includes("A family conversation, household plan, or message with a long history may need another pass."), "Direct Mercury retrograde composer must use the bundled v2.2.1 exemplar fallback instead of unavailable copy.");
assert.ok(!/Messages and decisions start moving through Cancer circumstances/i.test(sourceGroundedMercuryCancer), "Mercury retrograde runtime must not fall back to the generic planet-in-sign snapshot wording.");
assert.equal(isReaderFacingCopy("Mercury Rx in Cancer is active here. The current emphasis may be visible in timing, mood, and the choices around it."), false, "Runtime reader safety must reject stale active-here sky fallback copy.");
for (const [label, rendered] of [
  ["Venus in Virgo compact", sourceGroundedVenusVirgoCompact],
  ["Mars in Gemini compact", sourceGroundedMarsGeminiCompact],
  ["Sun conjunction Mercury compact", sourceGroundedSunMercuryCompact]
]) {
  assert.ok(!/Interpretation unavailable/i.test(rendered), `${label} must not expose unavailable copy.`);
  assert.ok(!/move through .*circumstances/i.test(rendered), `${label} must not render old circumstance-based compact copy.`);
  assert.ok(!/visible choices/i.test(rendered), `${label} must not render old visible-choices copy.`);
  assert.ok(!/Watch for .*patterns/i.test(rendered), `${label} must not render old watch-for-patterns copy.`);
}
assert.ok(sourceGroundedSunAquariusNatal.some((section) => section.heading === "Sun in Aquarius"), "Source-grounded natal runtime must render the planet-in-sign layer.");
assert.ok(sourceGroundedSunAquariusNatal.some((section) => section.heading === "... in the 9th house of travel, study, and belief"), "Source-grounded natal runtime must render the original house-label layer.");
assert.ok(sourceGroundedSunAquariusNatal.some((section) => section.heading === "Aquarius ruled by Saturn"), "Source-grounded natal runtime must render the ruler layer when birth-time facts are available.");
assert.ok(sourceGroundedSunAquariusNatal.map((section) => section.body).join(" ").includes("Your sense of direction sharpens when you can think independently"), "Sun-in-Aquarius runtime must use the reviewed natal exemplar.");
assert.ok(!/In a birth chart,\s*Sun describes/i.test(sourceGroundedSunAquariusNatal.map((section) => section.body).join(" ")), "Source-grounded natal runtime must not render old generic birth-chart fallback copy.");
assertNormalizedSkyRow(mercuryCancerPreShadow, "sky.retrograde.mercury.cancer.pre_shadow", "retrograde-stage");
assertNormalizedSkyRow(mercuryCancerRetrogradePassage, "sky.retrograde.mercury.cancer.retrograde_passage", "retrograde-stage");
assertNormalizedSkyRow(mercuryCancerStationRetrograde, "sky.station.mercury.cancer.retrograde", "station");
assert.equal(
  mercuryCancerPreShadow.summary,
  "Mercury pre-shadow in Cancer: bringing matters involving communication and planning back for clarification",
  "Mercury pre-shadow compact preview must render from normalized clauses."
);
assert.equal(
  mercuryCancerRetrogradePassage.body,
  "Mercury is moving retrograde through Cancer, bringing matters involving communication and planning back for clarification. A family discussion or household plan may need another pass. A repair or bill may also need checking, especially when documents, travel arrangements, or responsibilities were agreed to casually. Ask direct questions and confirm details. Write down responsibilities and clarify one specific matter.",
  "Mercury retrograde passage must render the literal phase template from normalized clauses, not an opaque article body."
);
assert.equal(
  mercuryCancerRetrogradePassage.summary,
  "Mercury retrograde in Cancer: bringing matters involving communication and planning back for clarification",
  "Mercury retrograde compact preview must derive from the same normalized phaseBehaviorClause."
);
assert.ok(!mercuryCancerRetrogradePassage.body.includes("Someone may raise an old subject"), "Mercury retrograde row must not store the expanded article as its rendered body.");
assert.ok(!mercuryCancerRetrogradePassage.body.includes("What needs to be understood"), "Mercury retrograde row must not render the article close as opaque prose.");
assert.ok(mercuryCancerPreShadow.sections?.slots?.planetSpecificFunction, "Mercury retrograde rows must store editable planetSpecificFunction.");
assert.ok(mercuryCancerPreShadow.sections?.slots?.phaseBehaviorClause, "Mercury retrograde rows must store editable phaseBehaviorClause.");
assert.ok(mercuryCancerPreShadow.sections?.slots?.recognizableInterruptionClause, "Mercury retrograde rows must store editable recognizableInterruptionClause.");
assert.ok(mercuryCancerPreShadow.sections?.slots?.returningMatterClause, "Mercury retrograde rows must store editable returningMatterClause.");
assert.ok(mercuryCancerPreShadow.sections?.slots?.practicalResponseClause, "Mercury retrograde rows must store editable practicalResponseClause.");
assert.ok(mercuryCancerPreShadow.sections?.slots?.dateClause, "Mercury retrograde rows must store editable dateClause.");
assert.equal(mercuryCancerRetrogradePassage.sections?.slots?.planetSpecificFunction, "Conversations, information, schedules, agreements, messages, and documents.", "Mercury retrograde rows must retain editable planetSpecificFunction source context.");
assert.equal(mercuryCancerRetrogradePassage.sections?.slots?.dateClause, "Supplied by the calculated retrograde event record.", "Mercury retrograde dateClause must remain event-record supplied metadata.");
assert.ok(!/\bnot\b[^.?!]{0,60}\bbut\b[^.?!]{0,120}\bnot\b[^.?!]{0,60}\bbut\b/i.test(mercuryCancerRetrogradePassage.body), "Mercury retrograde copy must reject repeated not-X-but-Y construction.");
assert.ok(!/\b(childhood|family trauma|abuse|addiction|illness|nervous system|self-erasure|old version of you)\b/i.test(mercuryCancerRetrogradePassage.body), "Mercury retrograde copy must reject unsupported therapy-coded shorthand.");

for (const filePath of [
  "apps/web/src/content/migration-seeds/template-copy-seed.json",
  "apps/web/src/content/emergencyCopy.json",
  "apps/web/src/content/emergencyCopy.ts",
  "apps/web/src/content/skyContentSnapshot.json",
  "scripts/content-source/tldrastro-fallback-language-rows.json",
  "scripts/content-source/tldrastro-fallback-templates-rows.json"
]) {
  const fileContent = read(filePath);

  for (const pattern of forbiddenSkyFallbackPatterns) {
    assert.ok(!pattern.test(fileContent), `${filePath} must not contain blocked Sky generic fallback copy: ${pattern}`);
  }
}

for (const snapshotPattern of [
  /move through .*circumstances/i,
  /preferences and values move/i,
  /action and conflict move/i,
  /beliefs and opportunities move/i,
  /visible choices/i,
  /Watch for .*patterns/i,
  /Choose the next concrete response/i
]) {
  assert.ok(!snapshotPattern.test(read("apps/web/src/content/skyContentSnapshot.json")), `Normalized Sky snapshot must not contain screenshot-stale compact fallback copy: ${snapshotPattern}`);
}

for (const filePath of [
  "apps/web/src/content/emergencyCopy.json",
  "scripts/content-source/tldrastro-fallback-templates-rows.json"
]) {
  const fileContent = read(filePath);

  for (const pattern of forbiddenNatalFallbackPatterns) {
    assert.ok(!pattern.test(fileContent), `${filePath} must not contain blocked natal keyword-stack fallback copy: ${pattern}`);
  }
}

assert.ok(isReaderFacingCopy(sunEmergency), "Sun emergency Sky placement copy must be reader-facing.");
assert.ok(!/moves through|tone right now|quality right now/i.test(sunEmergency), "Sky placement fallback must not use retired local composer wording.");
assert.ok(!/Interpretation unavailable/i.test(renderedSkyAspectTemplate), "Source-gap sky-aspect templates must not render unavailable copy.");
assert.ok(!/SOURCE_GAP/i.test(renderedSkyAspectTemplate), "Source-gap sky-aspect templates must not expose editorial labels in reader mode.");
assert.ok(!/\{\{[^}]+\}\}/.test(renderedSkyAspectTemplate), "Filled sky-aspect template must not expose literal slots.");
assert.ok(renderedNatalPlacementTemplate, "Filled natal-placement template must render.");
assert.ok(isReaderFacingCopy(renderedNatalPlacementTemplate?.body), "Filled natal-placement template must pass reader safety after interpolation.");
assert.ok(!/moves through|tone and shows up|house \d+(?:st|nd|rd|th):/i.test(renderedNatalPlacementTemplate?.body ?? ""), "Natal placement templates must use dashboard wording, not the retired local fixture.");
assert.ok(!forbiddenNatalFallbackPatterns.some((pattern) => pattern.test(renderedNatalPlacementTemplate?.body ?? "")), "Rendered natal placement template must not concatenate keyword-stack fallback copy.");
assert.ok(generatedContentParagraphsForTest(renderedNatalPlacementTemplate).length > 0, "Rendered natal-placement template must produce reader-facing paragraphs.");
assert.deepEqual(generatedContentParagraphsForTest({ body: retiredNatalComposerCopy }), [], "Retired natal composer paragraphs must fall through to dashboard template fallback.");
assert.deepEqual(generatedContentParagraphsForTest({ body: retiredSkyComposerCopy }), [], "Retired sky composer paragraphs must fall through to dashboard template fallback.");
assert.deepEqual(generatedContentParagraphsForTest({ body: repairedPronounCopy }), ["At the edge, they make it all about themselves, or they shrink when no one's looking."], "Pronoun repair must fix object/reflexive grammar before rendering.");
assert.equal(unresolvedTemplate, null, "A template with unresolved slots must fail this render and fall through.");
assert.ok(sunEmergency.trim().length > 0, "Sun placement fallback body must never be blank.");
assert.ok(emergencyCopySource.includes("function ordinalHouse"), "Natal placement emergency copy must format ordinal house labels.");
assert.ok(emergencyCopySource.includes("houseLabel"), "Natal placement emergency copy must use ordinal house labels.");
assert.ok(isReaderFacingCopy(synastryEmergency), "Synastry emergency copy must be reader-facing.");
assert.ok(!/content gap|needs authored copy/i.test(synastryEmergency), "Synastry emergency copy must not expose editorial gap language.");
assert.equal(isReaderFacingCopy(lilithProvenance), false, "Lilith provenance must not be reader-facing interpretation.");
assert.deepEqual(readerFacingParagraphs(["   ", sunEmergency]), [sunEmergency], "Empty generated content must fall through to local Sky fallback.");
assert.deepEqual(readerFacingParagraphs([lilithProvenance]), [], "Metadata fields must not become rendered body copy.");

assert.ok(generatedContent.includes(".eq(\"status\", \"LIVE\")"), "Reader query must require LIVE status.");
assert.ok(generatedContent.includes(".eq(\"lane\", \"serving\")"), "Reader query must require serving lane.");
assert.ok(generatedContent.includes(".is(\"review_state\", null)"), "Reader query must require null review_state.");
assert.ok(generatedContent.includes("if (row.status && row.status !== \"LIVE\") return false"), "DRAFT serving rows must be rejected locally.");
assert.ok(generatedContent.includes("if (lane && lane !== \"serving\") return false"), "Reference-lane rows must be rejected locally.");
assert.ok(generatedContent.includes("hasUnresolvedTemplateSlots(rendered)"), "Generated template output must be checked for unresolved slots after interpolation.");
assert.ok(generatedContent.includes("hasMissingGeneratedContentTemplateSlots(content, slots)"), "Generated template output must fail before interpolation when required slots are missing.");
assert.ok(generatedContent.includes("hasReaderSafeRenderedTemplateOutput(rendered)"), "Generated template output must run reader safety after interpolation.");

assert.ok(
  app.includes("generatedContentParagraphs(generated)")
  && app.includes("readerFacingParagraphs([section.body])"),
  "Generated and normalized bodies must be reader-safety filtered before display."
);
assert.ok(app.includes("hash.replace(/^#\\/?/, \"\")"), "Sky detail routes must accept both #sky/... and #/sky/... hash paths.");
assert.ok(
  app.includes("const placementEvents = skyPlacementPackageEvents({")
  && app.includes("const normalized = normalizeSkyPlacementSurface(position, transitRangeLabel, generatedContent, placementEvents)")
  && app.includes("function skyPlacementMadlibFallbackSection(")
  && app.includes("transitSynastryFallbackRendererV3.renderSkyPlacement({"),
  "Sky placement pages must render the V3 placement article with package event paragraphs."
);
assert.ok(
  !app.includes("[AUTHORED]")
  && !app.includes("[FALLBACK]")
  && !app.includes("showContentSourceQaTags"),
  "Production reader pages must not show authored/fallback QA source tags."
);
assert.ok(
  !app.includes("savedSkyPlacementNormalizedSection(")
  && !app.includes("sourceGroundedSkyPlacementNormalizedSection(")
  && !app.includes("sourceGroundedSkyRetrogradeNormalizedSection(")
  && !app.includes("savedSkyAspectNormalizedSection(")
  && !app.includes("sourceGroundedSkyAspectNormalizedSection(")
  && !app.includes("composeSkyRetrograde({")
  && !app.includes("skyPlacementContentKey(position.planet, position.sign)")
  && !app.includes("skyAspectContentKey(aspect.from, aspect.type, aspect.to)")
  && !app.includes("skyPlacementAppDisplaySource(generated)")
  && !app.includes("appDisplaySource ===")
  && app.indexOf("skyPlacementMadlibFallbackSection(position, events)") >= 0
  && app.includes("void generatedContent;"),
  "Sky pages must use fallback-only routing: no saved/authored/source-grounded prose may outrank madlib fallback."
);
assert.ok(
  app.includes("normalizedSurfacePreview(")
  && app.includes("normalizeSkyPlacementSurface(")
  && app.includes("skyPlacementPackageEvents({")
  && app.includes("planet: position.planet")
  && app.includes("positions: displayPositions"),
  "Sky placement list rows must use the normalized package surface preview with package event paragraphs."
);
assert.ok(
  app.includes("const normalized = normalizeSkyAspectSurface(aspect, generatedContent, positions, generatedAt);"),
  "Sky aspect list rows must use the fallback-only sky-aspect normalizer with current transit timing."
);
assert.ok(
  app.includes("const normalizedAspect = normalizeFallbackV3Aspect(aspect.type);")
  && app.includes("if (!normalizedAspect)")
  && app.includes("if (mode === \"sky\" && !normalizedSkySurface?.sections.length)")
  && app.includes("if (normalized.sections.length === 0)"),
  "Unsupported Sky aspects such as quincunx must be skipped instead of rendered through legacy emergency copy."
);
assert.ok(
  /function normalizeNatalPlacementSurface[\s\S]*const sourceGroundedSections = isAnglePoint[\s\S]*sourceGroundedNatalPlacementNormalizedSections\(position, natalSky\)[\s\S]*const fallbackSections = isAnglePoint[\s\S]*sourceGroundedNatalPlacementFallbackSections\(position\)[\s\S]*const primarySections = isAnglePoint[\s\S]*sourceGroundedSections[\s\S]*sourceGroundedSections\.find\(\(section\) => section\.slot === slot\)[\s\S]*fallbackSections\.find\(\(section\) => section\.slot === slot\)/.test(app)
  && app.includes("sourceGroundedNatalAspectSectionsForPlacement(position, natalSky, ownerContext)")
  && app.includes("normalizeNatalPlacementSurface(position, natalSky, ownerContext)"),
  "Natal placement pages must use authored prose per section when present, otherwise fallback, while keeping aspects separate and passing owner voice into v3."
);
assert.ok(app.includes("options: { allowKnowledgeOnly?: boolean } = {}"), "Relationship knowledge fallback must require callers to opt into knowledge-only prose.");
assert.ok(app.includes("const allowKnowledgeOnly = options.allowKnowledgeOnly ?? false;"), "Relationship authored sections must not treat bare knowledge plainTranslation as public prose by default.");
assert.ok(!app.includes("approvedVoiceOrKnowledgeFallback(contentKey, \"relationship\", true)"), "Relationship surfaces must not directly opt into knowledge-only prose.");
assert.ok(!app.includes("loadOrSeedPlacementWriteup"), "Natal placement detail pages must not load or seed private generated writeups outside the placement normalizer.");
assert.ok(!app.includes("you-natal-placement-v1"), "Natal placement detail pages must not depend on legacy user-generated placement writeup keys.");
assert.ok(app.includes("return `${firstLabel} ${aspectLabel} ${secondLabel}`;"), "Synastry fallback titles must name the actual contact instead of generic challenge/flow labels.");
assert.ok(!app.includes("You Challenge Each Other"), "Synastry rows must not fall back to generic boilerplate titles.");
assert.ok(!app.includes("This Contact Stands Out"), "Synastry rows must not fall back to generic boilerplate titles.");
assert.ok(!app.includes("generated-daily-timing"), "Normalized section tiers must not expose generated as a third reader-facing prose layer.");
assert.ok(!app.includes("emergencySkyPlacementCopy(position.planet, position.sign"), "Sky placement fallback must not use legacy emergency placement copy.");
assert.ok(app.includes("fallback-architecture-v3"), "Sky placement fallback must use the v3 fallback architecture package.");
assert.ok(
  app.includes("function relatedSkyAspectSectionsForPlacement(")
  && app.includes("const relatedAspectSections = relatedSkyAspectSectionsForPlacement({")
  && app.includes("sections: relatedAspectSections")
  && !app.includes("onOpenSkyAspect: onOpenDetail"),
  "Sky placement related aspects must render as inline sections instead of click-through detail rows."
);
assert.ok(
  app.includes("const articleSubCandidate = detail.suppressTldr ? \"\" : articleTldrText(detailSubtitle, detail.title)")
  && app.includes("articleBodyComparableCopies")
  && app.includes("function isArticleTldrBodyDuplicate(")
  && app.includes("body.startsWith(normalizedTldr)")
  && !app.includes("articleTldrText(detailSubtitle || statement"),
  "Sky detail TLDR must come from an independent subtitle only and must not duplicate or preview body copy."
);
assert.ok(
  /function currentSkyAspectDetailArticle[\s\S]*subtitle: "",[\s\S]*suppressTldr: true/.test(app)
  && !/function currentSkyAspectDetailArticle[\s\S]*const subtitle = stripTldrPrefix\(textPreview\(body\[0\]/.test(app),
  "Standalone Sky aspect detail pages must not manufacture TLDR copy from the body paragraph."
);
assert.ok(app.includes("skyDetailFromRoutePath(skyDetailRoutePath, sky, skyGeneratedContent, openSkyDetail)"), "URL-built Sky placement details must keep aspect-row navigation wired.");
assert.ok(
  /function skyPlacementRoutePath\(position: Pick<PlanetPosition, "planet"> & Partial<Pick<PlanetPosition, "sign">>\)[\s\S]*parts\.push\(normalizeContentIdPart\(position\.sign\)\)/.test(app)
  && app.includes("const routeSign = secondPart")
  && app.includes("signGlyph: signGlyph(routeSign)")
  && app.includes("position: routedPosition"),
  "Sky placement routes must preserve sign-specific ingress destinations such as Sun enters Leo instead of reopening the current Sun sign."
);
assert.ok(
  lunarCalendar.includes("onClick={() => onOpenTransit?.(event)}"),
  "Calendar selected-day transit rows must open the same sign-specific detail route as week transit cards."
);
assert.ok(
  app.includes("normalizeSkyAspectSurface(aspect, generatedContent, positions, generatedAt)")
  && app.includes("function skyAspectMadlibFallbackSection("),
  "Sky placement aspect rows must resolve through the sky-aspect normalizer before madlib fallback."
);
assert.ok(app.includes("dedupeTransitAxisContacts(rankedTransitItems"), "Friend transits must dedupe duplicate Ascendant/Descendant and MC/IC axis contacts before rendering.");
assert.ok(app.includes("friendTransitFactLine(transit, selectedChart.displayName)"), "Friend transit cards must render owner-aware fact lines.");
assert.ok(app.includes("transitAspectTechnicalVerb(transit.aspect)"), "Transit fact copy must use technical aspect verbs such as conjunct.");
assert.ok(themeCss.includes("--chart-transit-degree-size: var(--chart-degree-size);"), "Transit wheel degrees must use the same size token as natal wheel degrees.");
assert.ok(/friendProfileTab === "transits"\s*\?\s*Boolean\(selectedChart\?\.natalChart\)/.test(app), "Friend Transits must keep the chart rail when a natal chart is available.");
assert.ok(!/transit\.note<\/p>/.test(app), "Friend transit cards must not render raw transit.note fallback copy.");
assert.ok(!/natalPoint\} in \{transit\.natalSign\}\{typeof transit\.natalHouse/.test(app), "Friend transit cards must not append house labels to angles through the old raw fact line.");
assert.ok(!/dangerouslySetInnerHTML/.test(app), "Reader pages must not bypass text rendering with raw template HTML.");

const sunKeys = [
  "sky-season-cancer-2026-07-11",
  skyPlacementContentKey("Sun", "Cancer"),
  legacySkyPlacementContentId("Sun", "Cancer")
];
const lilithKeys = [
  skyPlacementContentKey("Lilith", "Sagittarius"),
  legacySkyPlacementContentId("Lilith", "Sagittarius")
];
const sunMercuryAspectKeys = [
  "sky.aspect.sun.conjunction.mercury.2026-07-11",
  skyAspectContentKey("Sun", "conjunction", "Mercury"),
  legacySkyAspectContentId("Sun", "conjunction", "Mercury")
];
const sunSaturnAspectKeys = [
  "sky.aspect.sun.square.saturn.2026-07-11",
  skyAspectContentKey("Sun", "square", "Saturn"),
  legacySkyAspectContentId("Sun", "square", "Saturn")
];

assert.deepEqual(sunKeys, ["sky-season-cancer-2026-07-11", "sky.placement.sun.cancer", "sky-sun-in-cancer"]);
assert.deepEqual(lilithKeys, ["sky.placement.lilith.sagittarius", "sky-lilith-in-sagittarius"]);
assert.deepEqual(sunMercuryAspectKeys, ["sky.aspect.sun.conjunction.mercury.2026-07-11", "sky.aspect.sun.conjunction.mercury", "sky-sun-conjunction-mercury"]);
assert.deepEqual(sunSaturnAspectKeys, ["sky.aspect.sun.square.saturn.2026-07-11", "sky.aspect.sun.square.saturn", "sky-sun-square-saturn"]);

assert.ok(audit.includes("non-empty reader-facing copy"), "Coverage audit must require non-empty reader-facing copy.");
assert.ok(audit.includes("metadata leakage"), "Coverage audit must prohibit metadata leakage.");

assert.ok(planetTopicVocabulary.includes("content_key.like.fallback-vocab/%"), "Slot vocabulary loader must query fallback-vocab.");
assert.ok(planetTopicVocabulary.includes("content_key.like.cc/planet/%"), "Slot vocabulary loader must query authored planet function rows.");
assert.ok(planetTopicVocabulary.includes("content_key.like.cc/sign/%"), "Slot vocabulary loader must query authored sign behavior/action rows.");
assert.ok(!planetTopicVocabulary.includes("content_key.like.vocab/%"), "Slot vocabulary loader must not query old vocab/* slot rows.");
assert.ok(planetTopicVocabulary.includes("row.content_key.match(/^fallback-vocab\\/planet-topic\\/(.+)$/)"), "Planet topic slots must match fallback-vocab rows.");
assert.ok(planetTopicVocabulary.includes("row.content_key.match(/^cc\\/planet\\/(.+)\\/function$/)"), "Planet topic slots must match authored cc planet function rows.");
assert.ok(planetTopicVocabulary.includes("row.content_key.match(/^fallback-vocab\\/sign-style\\/(.+)$/)"), "Sign style slots must match fallback-vocab rows.");
assert.ok(planetTopicVocabulary.includes("row.content_key.match(/^cc\\/sign\\/(.+)\\/lived-behaviors$/)"), "Sign style slots must match authored cc sign behavior rows.");
assert.ok(planetTopicVocabulary.includes("row.content_key.match(/^fallback-vocab\\/sign-need\\/(.+)$/)"), "Sign need slots must match fallback-vocab rows.");
assert.ok(planetTopicVocabulary.includes("row.content_key.match(/^cc\\/sign\\/(.+)\\/actions$/)"), "Sign need slots must match authored cc sign action rows.");
assert.ok(careerArchetype.includes("careerVocabularyContentKeyFilter"), "Career vocabulary loader must use an explicit allowlist of editorial career vocab families.");
assert.ok(!careerArchetype.includes(".like(\"content_key\", \"vocab/%\")"), "Career vocabulary loader must not query every vocab/* row.");
assert.ok(natalPlacementTaglines.includes("vocab/natal-card-tagline/"), "Natal card tagline loader must keep the real tagline vocab family.");
assert.ok(natalPlacementTaglines.includes("if (!row.content_key.startsWith(\"vocab/natal-card-tagline/\"))"), "Natal card tagline parser must reject fallback-vocab rows defensively.");
assert.ok(!/(^|[^-])vocab\/aspect-verb\//.test(adminDashboard), "Admin fallback dependency maps must not point to old vocab/* slot rows.");
assert.ok(adminDashboard.includes("fallbackVocabularyContentKey(\"aspect-verb\", signPart)"), "Admin transit fallback dependencies must point to fallback-vocab/aspect-verb.");
assert.ok(adminDashboard.includes("import skyContentSnapshot"), "Admin Content must import the normalized Sky snapshot.");
assert.ok(adminDashboard.includes("localSkySnapshotAdminRows()"), "Admin Content must expose local normalized Sky snapshot rows.");
assert.ok(adminDashboard.includes("visibleLocalSnapshots"), "Admin Content must merge local Sky snapshots behind persisted rows.");

console.log(JSON.stringify({
  sunPlacementKeys: sunKeys,
  lilithPlacementKeys: lilithKeys,
  sunConjunctMercuryAspectKeys: sunMercuryAspectKeys,
  sunSquareSaturnAspectKeys: sunSaturnAspectKeys,
  renderedSkyAspectTemplate,
  renderedNatalPlacementTemplate: renderedNatalPlacementTemplate.body,
  unresolvedTemplateFallsThrough: unresolvedTemplate === null,
  status: "PASS"
}, null, 2));
function interpolate(template, slots) {
  return template
    .replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g, (_, key) => slots[key] ?? "")
    .replace(/\{(?!\{)\s*([A-Za-z0-9_-]+)\s*\}(?!\})/g, (_, key) => slots[key] ?? "");
}
