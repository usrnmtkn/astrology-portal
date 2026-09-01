import assert from "node:assert/strict";
import fs from "node:fs";
import {
  applySkyV4ContinuousCorpusCorrection,
  renderSkyV4ReaderRoute,
  skyV4ContinuousCorrectionReleaseState,
  skyV4PlacementLunarContextReleaseState
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
import {
  skyV4Hemisphere,
  skyV4LunationContexts,
  skyV4LunationRoute,
  skyV4NodeAxis,
  skyV4PlacementContexts,
  skyV4StationSupported
} from "../apps/web/src/features/sky/skyV4ProductSurface.ts";
import { calendarSkyV4LunationContentKey } from "../apps/web/src/features/calendar/calendarContentKeys.ts";

const corpus = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json", import.meta.url),
  "utf8"
));
const correctionManifest = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1.json", import.meta.url),
  "utf8"
));
const correctionChunks = correctionManifest.chunk_files.map((fileName: string) => JSON.parse(fs.readFileSync(
  new URL(`../apps/web/src/content/fallbackArchitectureV3/authored-inputs/${fileName}`, import.meta.url),
  "utf8"
)));
const correctionSource = { ...correctionManifest, chunks: correctionChunks, records: correctionChunks.flatMap((chunk: any) => chunk.records) };
const correctedCorpus = applySkyV4ContinuousCorpusCorrection(corpus, correctionSource) as any;
const correctionState = skyV4ContinuousCorrectionReleaseState(correctionSource);
assert.equal(correctionState.expectedRecords, 120);
assert.equal(correctionState.recordCount, 120);
assert.equal(correctionState.ownerApproved, true);
assert.equal(correctionState.servingEnabled, true);
assert.equal(correctionState.reviewStatus, "approved");
assert.deepEqual(applySkyV4ContinuousCorpusCorrection(corpus, { ...correctionSource, owner_approved: false }), corpus, "unapproved correction package must fail closed");

const correctedSunAries = correctedCorpus.content.continuous.find((row: any) => row.contentKey === "sky-placement/article/sun/aries");
assert.equal(correctedSunAries.tldrWhat, "The Sun in Aries makes it harder to keep discussing what you already know you want to start.");
assert.equal(correctedSunAries.fallback.hook, "The conversation may have gone on longer than the decision needed.");
const correctedSunVirgo = correctedCorpus.content.continuous.find((row: any) => row.contentKey === "sky-placement/article/sun/virgo");
assert.match(correctedSunVirgo.placementArticle, /invisible work of keeping things running harder to overlook/u);
assert.doesNotMatch(correctedSunVirgo.placementArticle, /The details matter, but not all equally\. Practice discernment\./u);

const positions = [
  { planet: "Venus", sign: "Aries", motion: "retrograde", transitTimeZone: "America/New_York" },
  { planet: "Mercury", sign: "Aries", motion: "retrograde" },
  { planet: "Neptune", sign: "Pisces", motion: "direct" },
  { planet: "North Node", sign: "Aries", motion: "retrograde" },
  { planet: "South Node", sign: "Libra", motion: "retrograde" }
] as any[];

assert.equal(skyV4Hemisphere(40.7), "northern");
assert.equal(skyV4Hemisphere(-33.9), "southern");
assert.equal(skyV4Hemisphere(0), "neutral");
assert.deepEqual(skyV4NodeAxis(positions), { northSign: "Aries", southSign: "Libra" });

const placementContexts = skyV4PlacementContexts({
  position: positions[0],
  positions,
  generatedAt: "2025-03-29T12:00:00Z",
  moonEvent: {
    name: "New Moon",
    sign: "Aries",
    occursAt: "2025-03-29T10:00:00Z",
    days: 0,
    eclipseType: "solar"
  }
});
assert.ok(placementContexts.some((context) => context.contextKind === "co-present-motion" && context.contextBodyOrEvent === "Mercury"));
assert.ok(placementContexts.some((context) => context.contextKind === "eclipse" && context.contextBodyOrEvent === "Solar Eclipse"));
assert.ok(placementContexts.some((context) => context.contextKind === "placement-lunar-event" && context.contextBodyOrEvent === "solar-eclipse"));
assert.ok(!placementContexts.some((context) => context.contextKind === "placement-lunar-event" && context.contextBodyOrEvent === "new-moon"));

const ordinaryNewMoonContexts = skyV4PlacementContexts({
  position: positions[0],
  positions,
  generatedAt: "2026-02-18T01:00:00Z",
  moonEvent: {
    name: "New Moon",
    sign: "Aquarius",
    occursAt: "2026-02-17T23:30:00Z",
    days: 0,
    eclipseType: null
  }
});
assert.ok(ordinaryNewMoonContexts.some((context) => (
  context.contextKind === "placement-lunar-event"
  && context.contextBodyOrEvent === "new-moon"
  && context.contextSign === "Aquarius"
)), "ordinary New Moon must alter placement context on the same local day");
assert.ok(!ordinaryNewMoonContexts.some((context) => context.contextKind === "eclipse"));

const ordinaryFullMoonContexts = skyV4PlacementContexts({
  position: positions[0],
  positions,
  generatedAt: "2026-03-03T18:00:00Z",
  moonEvent: {
    name: "Full Moon",
    sign: "Virgo",
    occursAt: "2026-03-03T11:00:00Z",
    days: 0,
    eclipseType: null
  }
});
assert.ok(ordinaryFullMoonContexts.some((context) => (
  context.contextKind === "placement-lunar-event"
  && context.contextBodyOrEvent === "full-moon"
  && context.contextSign === "Virgo"
)), "ordinary Full Moon must alter placement context on the exact event day");

const offDayPlacementContexts = skyV4PlacementContexts({
  position: positions[0],
  positions,
  generatedAt: "2026-03-04T18:00:00Z",
  moonEvent: {
    name: "Full Moon",
    sign: "Virgo",
    occursAt: "2026-03-03T11:00:00Z",
    days: 1,
    eclipseType: null
  }
});
assert.ok(!offDayPlacementContexts.some((context) => context.contextKind === "placement-lunar-event"));

const lunarManifest = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1.json", import.meta.url),
  "utf8"
));
const lunarChunks = lunarManifest.chunk_files.map((fileName: string) => JSON.parse(fs.readFileSync(
  new URL(`../apps/web/src/content/fallbackArchitectureV3/authored-inputs/${fileName}`, import.meta.url),
  "utf8"
)));
const testLunarRelease = {
  ...lunarManifest,
  chunks: lunarChunks,
  records: lunarChunks.flatMap((chunk: any) => chunk.records)
};
const lunarContextRelease = skyV4PlacementLunarContextReleaseState(testLunarRelease);
assert.equal(lunarContextRelease.expectedRecords, 40);
assert.equal(lunarContextRelease.recordCount, 40);
assert.equal(lunarContextRelease.ownerApproved, true);
assert.equal(lunarContextRelease.servingEnabled, true);
assert.equal(lunarContextRelease.reviewStatus, "approved");

const fullMoonInput = {
  route: "placement",
  planet: "sun",
  sign: "aries",
  dateLine: "Engine dates",
  facts: {},
  contexts: [{
    subjectFamily: "continuous",
    subjectBody: "Sun",
    subjectSign: "Aries",
    subjectCondition: "direct",
    contextKind: "placement-lunar-event",
    contextBodyOrEvent: "full-moon",
    contextSign: "Aries",
    contextCondition: "lunation"
  }],
  aspects: []
};
const stagedFullMoon = renderSkyV4ReaderRoute(correctedCorpus, fullMoonInput, { ...testLunarRelease, serving_enabled: false });
assert.equal(stagedFullMoon.placementLunarContextKey, undefined, "unapproved lunar package must fail closed");
const releasedFullMoon = renderSkyV4ReaderRoute(correctedCorpus, fullMoonInput, testLunarRelease);
assert.match(String(releasedFullMoon.page), /## What changes today/u);
assert.match(String(releasedFullMoon.page), /Today’s Full Moon across Aries and Libra makes the consequence of the current story harder to keep in the background\./u);
assert.equal(releasedFullMoon.placementLunarContextKey, "sky-placement/lunar-context/full-moon/sun");
assert.ok(String(releasedFullMoon.page).indexOf(correctedSunAries.placementArticle) < String(releasedFullMoon.page).indexOf("## What changes today"));

const fallbackInput = { ...fullMoonInput, articleAvailable: false };
const releasedFallback = renderSkyV4ReaderRoute(correctedCorpus, fallbackInput, testLunarRelease);
assert.equal(releasedFallback.resolution, "exact-fallback");
const fallbackCopy = String(releasedFallback.page);
assert.ok(fallbackCopy.indexOf(correctedSunAries.fallback.hook) < fallbackCopy.indexOf("Today’s Full Moon across Aries and Libra"));
assert.ok(fallbackCopy.indexOf("Today’s Full Moon across Aries and Libra") < fallbackCopy.indexOf(correctedSunAries.fallback.lived));
assert.ok(fallbackCopy.indexOf(correctedSunAries.fallback.lived) < fallbackCopy.indexOf(correctedSunAries.fallback.turn));

const stationPosition = {
  planet: "Lilith",
  sign: "Sagittarius",
  residencyStations: [{ occursAt: "2026-12-30T08:00:00Z", direction: "direct" }]
} as any;
assert.equal(skyV4StationSupported(stationPosition, "2026-12-30T18:00:00Z"), true);
assert.equal(skyV4StationSupported(stationPosition, "2026-12-29T18:00:00Z"), false);
assert.equal(skyV4StationSupported({
  ...stationPosition,
  residencyStations: [{ occursAt: "2026-12-31T01:00:00Z", direction: "direct" }]
}, "2026-12-30T18:00:00Z", "America/New_York"), true);

const newMoon = {
  id: "new-moon-pisces",
  type: "lunation",
  title: "New Moon in Pisces",
  startsAt: "2026-02-17T12:00:00Z",
  dateKey: "2026-02-17",
  glyph: "●",
  primary: true,
  sign: "Pisces"
} as const;
assert.equal(calendarSkyV4LunationContentKey(newMoon), "sky-lunation/new-moon/pisces");
assert.deepEqual(skyV4LunationRoute(newMoon, positions), { route: "new-moon", sign: "Pisces" });
assert.ok(skyV4LunationContexts(newMoon, positions).some((context) => (
  context.contextBodyOrEvent === "Neptune" && context.contextSign === "Pisces"
)));

const exactEclipse = {
  ...newMoon,
  id: "solar-eclipse-aries",
  title: "Solar Eclipse in Aries",
  sign: "Aries",
  dateKey: "2025-03-29",
  eclipseType: "solar" as const
};
assert.equal(calendarSkyV4LunationContentKey(exactEclipse), "sky-lunation/solar-eclipse/2025-03-29-aries");
assert.deepEqual(skyV4LunationRoute(exactEclipse, positions), {
  route: "eclipse",
  exactEventKey: "sky-lunation/solar-eclipse/2025-03-29-aries",
  eclipseType: "solar-eclipse",
  eclipseSign: "Aries",
  nodeRelation: "north-node"
});

const app = fs.readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
assert.match(app, /event\.type === "lunation"[\s\S]{0,120}currentSkyV4LunationDetailArticle/u);
assert.match(app, /\[\.\.\.displayArticleSections, \.\.\.relatedAspectSections\]/u);
assert.match(app, /grouping: "event"/u);
assert.match(app, /skyV4PlacementContexts/u);
assert.match(app, /skyV4StationSupported/u);
assert.match(app, /skyV4Hemisphere/u);

const skyBundle = fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3SkyPlacementBundle.ts", import.meta.url), "utf8");
assert.match(
  skyBundle,
  /applySkyV4ContinuousCorpusCorrection|renderSkyV4ReaderRoute/u,
  "approved packages must compose through the deferred reader bundle"
);
const canonicalResolver = fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs", import.meta.url), "utf8");
assert.match(canonicalResolver, /## What changes today/u);
assert.doesNotMatch(canonicalResolver, /openai|anthropic|model call|generateText/iu);

console.log("SKY V4 product-surface routing: PASS (120 approved corrections + 40 approved lunar contexts serve through deferred assets; unapproved fixtures fail closed; routing, local-day selection, axis, precedence, hemisphere, stations, nodes, and Calendar keys verified)");
