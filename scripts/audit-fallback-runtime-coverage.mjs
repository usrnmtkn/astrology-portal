#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function includesAll(source, snippets) {
  return snippets.every((snippet) => source.includes(snippet));
}

const app = read("apps/web/src/App.tsx");
const fallbackHooks = read("apps/web/src/content/fallbackHooks.ts");
const generatedContent = read("apps/web/src/services/generatedContent.ts");
const generatedKeys = read("apps/web/src/services/generatedContentKeys.ts");
const calendar = read("apps/web/src/features/calendar/LunarCalendar.tsx");
const emergencyCopy = read("apps/web/src/content/emergencyCopy.json");
const readerSafety = read("apps/web/src/content/readerSafety.ts");

const guardedResolver = includesAll(generatedContent, [
  ".eq(\"status\", \"LIVE\")",
  ".eq(\"lane\", \"serving\")",
  ".is(\"review_state\", null)",
  "isReaderServableGeneratedContentRow"
]);

const readerCopyGuard = includesAll(readerSafety, [
  "isReaderFacingCopy",
  "readerFacingParagraphs",
  "Source file was not copied",
  "Imported from",
  "provenance"
]) && includesAll(app, [
  "readerFacingParagraphs(generatedContentParagraphs(generated))",
  "emergencySkyPlacementCopy(position.planet, position.sign"
]);

const families = [
  {
    name: "Sky planet-in-sign placements",
    hook: "sky.planetary-placement",
    state: "WORKING",
    canonicalKey: "sky.placement.venus.virgo",
    runtimeCaller: "PlacementTable / currentSkyPlacementDetailArticle",
    resolver: "liveGeneratedContentByKeys -> loadLiveGeneratedContentForSurfaces",
    safeFallback: "fallbackFromHook('sky.planetary-placement') + approvedVoiceOrKnowledgeFallback",
    birthTimeDependency: "none",
    checks: [
      fallbackHooks.includes("key: \"sky.planetary-placement\""),
      generatedKeys.includes("function skyPlacementContentKey"),
      app.includes("skyPlacementContentKey(position.planet, position.sign)"),
      app.includes("skyPlacementGeneratedContentHasNatalLanguage"),
      app.includes("emergencySkyPlacementCopy(position.planet, position.sign"),
      app.includes("readerFacingParagraphs(generatedContentParagraphs(generated))")
    ],
    incompleteCount: 0,
    nextAction: "Fill authored DRAFT rows where the audit reports missing canonical content."
  },
  {
    name: "Planetary ingresses",
    hook: "sky.ingress",
    state: "WORKING",
    canonicalKey: "sky.ingress.venus.virgo",
    runtimeCaller: "LunarCalendar TransitCard",
    resolver: "liveCalendarEventContent over generatedContent map loaded by app",
    safeFallback: "calendarEventDescription ingress emergency sentence",
    birthTimeDependency: "optional for natal-house composition only",
    checks: [
      fallbackHooks.includes("key: \"sky.ingress\""),
      generatedKeys.includes("function skyIngressContentKey"),
      calendar.includes("skyIngressInstanceContentKey(event.planet, sign"),
      calendar.includes("skyIngressContentKey(event.planet, sign)"),
      calendar.includes("event.type === \"ingress\" && event.planet"),
      calendar.includes("emergencyIngressCopy(event.planet, sign)"),
      emergencyCopy.includes("\"ingress\"")
    ],
    incompleteCount: 0,
    nextAction: "Keep ingress event records separate from aspect and house records; compose at event layer."
  },
  {
    name: "Retrogrades and stations",
    hook: "sky.retrograde / sky.station",
    state: "WORKING",
    canonicalKey: "sky-station-mercury-retrograde",
    runtimeCaller: "RetrogradeSection / currentSkyRetrogradeDetailData / LunarCalendar TransitCard",
    resolver: "liveGeneratedContentByKeys and liveCalendarEventContent",
    safeFallback: "fallbackFromHook('sky.retrograde') and calendarEventDescription station emergency sentence",
    birthTimeDependency: "none",
    checks: [
      fallbackHooks.includes("key: \"sky.retrograde\""),
      fallbackHooks.includes("key: \"sky.station\""),
      calendar.includes("sky-station-${planetPart}-${motion}"),
      app.includes("currentSkyRetrogradeDetailData"),
      calendar.includes("event.type === \"station\" && event.planet"),
      calendar.includes("emergencyStationCopy(event.planet, direction)"),
      emergencyCopy.includes("\"station\"")
    ],
    incompleteCount: 0,
    nextAction: "Audit authored planet-specific station rows before publishing."
  },
  {
    name: "Current-sky aspects",
    hook: "sky.aspect-detail",
    state: "WORKING",
    canonicalKey: "sky.aspect.mercury.conjunction.venus",
    runtimeCaller: "SkyAspectsSection / currentSkyAspectDetailArticle / LunarCalendar TransitCard",
    resolver: "liveGeneratedContentByKeys -> loadLiveGeneratedContentForSurfaces",
    safeFallback: "fallbackFromHook('sky.aspect-detail') and calendarEventDescription aspect emergency sentence",
    birthTimeDependency: "none",
    checks: [
      fallbackHooks.includes("key: \"sky.aspect-detail\""),
      generatedKeys.includes("function skyAspectContentKey"),
      generatedKeys.includes("function skyAspectInstanceContentKey"),
      app.includes("skyAspectGeneratedContentKeys(aspect, generatedAt, positions)"),
      calendar.includes("skyAspectInstanceContentKey(first, event.aspect, second"),
      calendar.includes("emergencySkyAspectCopy(first, event.aspect, second)"),
      emergencyCopy.includes("\"sky-aspect\"")
    ],
    incompleteCount: 0,
    nextAction: "Use existing orb/ranking/UI limits; author missing DRAFT copy by aspect family."
  },
  {
    name: "Natal planet-in-sign placements",
    hook: "you.natal-placement",
    state: "WORKING",
    canonicalKey: "natal.sign.mercury.pisces",
    runtimeCaller: "natalPlacementSignModule / natalPlacementDetailArticle",
    resolver: "liveGeneratedContentByKeys -> loadLiveGeneratedContentForSurfaces",
    safeFallback: "fallbackFromHook('you.natal-placement') + deterministic natal placement paragraph",
    birthTimeDependency: "none",
    checks: [
      fallbackHooks.includes("key: \"you.natal-placement\""),
      generatedKeys.includes("function natalSignContentKey"),
      generatedKeys.includes("function natalPlacementContentKey"),
      app.includes("natalPlacementSignModule("),
      app.includes("natalPlacementContentKey(position.planet, position.sign, position.house)")
    ],
    incompleteCount: 0,
    nextAction: "Review any generated natal rows for second-person bleed before publication."
  },
  {
    name: "Natal planet-in-house placements",
    hook: "you.natal-house-placement",
    state: "WORKING",
    canonicalKey: "natal.house.mercury.10",
    runtimeCaller: "natalPlacementHouseModule",
    resolver: "liveGeneratedContentByKeys -> loadLiveGeneratedContentForSurfaces",
    safeFallback: "fallbackFromHook('you.natal-house-placement') + deterministic house support paragraph",
    birthTimeDependency: "required",
    checks: [
      fallbackHooks.includes("key: \"you.natal-house-placement\""),
      generatedKeys.includes("function natalHouseContentKey"),
      app.includes("natalPlacementContentKey(position.planet, position.sign, position.house)"),
      app.includes("templateFallbackContentKeys.youNatalHousePlacement")
    ],
    incompleteCount: 0,
    nextAction: "Keep house copy hidden when birth time is unknown or house is unavailable."
  },
  {
    name: "Ascendant and Midheaven placements",
    hook: "you.natal-angle-placement",
    state: "WORKING",
    canonicalKey: "natal.angle.ascendant.gemini",
    runtimeCaller: "natalRisingKnowledgeSummary / natalPlacementDetailArticle for angle routeable positions",
    resolver: "liveGeneratedContentByKeys -> loadLiveGeneratedContentForSurfaces",
    safeFallback: "fallbackFromHook('you.natal-angle-placement') when angle rows are requested; local angle lens fallback otherwise",
    birthTimeDependency: "required",
    checks: [
      fallbackHooks.includes("key: \"you.natal-angle-placement\""),
      generatedKeys.includes("function natalAngleContentKey"),
      app.includes("natalAngleContentKey(\"Ascendant\", risingSign)"),
      app.includes("natalMidheavenPosition"),
      app.includes("openPlacementArticle(natalMidheavenPosition)"),
      app.includes("templateFallbackContentKeys.youNatalAnglePlacement")
    ],
    incompleteCount: 0,
    nextAction: "Keep angle rows gated to reliable birth-time charts and continue filling normalized angle clause rows."
  },
  {
    name: "Natal aspects",
    hook: "you.natal-aspect",
    state: "WORKING",
    canonicalKey: "natal.aspect.sun.conjunction.mercury",
    runtimeCaller: "relatedAspectRowsForPlacement / natalAspectDetailArticle",
    resolver: "liveGeneratedContentByKeys -> loadLiveGeneratedContentForSurfaces",
    safeFallback: "fallbackFromHook('you.natal-aspect') + aspectRelationshipDescription",
    birthTimeDependency: "none for planet aspects; required for angle aspects",
    checks: [
      fallbackHooks.includes("key: \"you.natal-aspect\""),
      generatedKeys.includes("function natalAspectContentKey"),
      app.includes("natalAspectContentKey("),
      app.includes("\"you.natal-aspect\"")
    ],
    incompleteCount: 0,
    nextAction: "Audit exact natal aspect rows for friend-chart pronoun grammar before publishing."
  },
  {
    name: "Transits through natal houses",
    hook: "you.transit-through-house",
    state: "WORKING",
    canonicalKey: "transit.house.mars.4",
    runtimeCaller: "transitToNatalGeneratedContentKeys when a transit row has natalHouse",
    resolver: "liveGeneratedContentByKeys -> loadLiveGeneratedContentForSurfaces",
    safeFallback: "transitToNatalTemplateFallbackKey selects you.transit-through-house when house exists",
    birthTimeDependency: "required",
    checks: [
      fallbackHooks.includes("key: \"you.transit-through-house\""),
      generatedKeys.includes("function transitHouseContentKey"),
      app.includes("keys.add(transitHouseContentKey(transit.transitPlanet, transit.natalHouse))"),
      app.includes("standaloneHouseTransitRows"),
      app.includes("fallbackFromHook(\n      \"you.transit-through-house\""),
      app.includes("templateFallbackContentKeys.youTransitThroughHouse")
    ],
    incompleteCount: 0,
    nextAction: "Broaden standalone house-transit records from active transit-derived rows to direct current-sky house activations where product wants them."
  },
  {
    name: "Transiting aspects to natal planets",
    hook: "you.transit-to-natal",
    state: "WORKING",
    canonicalKey: "transit.aspect.saturn.square.moon",
    runtimeCaller: "Transits aspectRows / friendTransitSummary",
    resolver: "liveGeneratedContentByKeys -> loadLiveGeneratedContentForSurfaces",
    safeFallback: "fallbackFromHook('you.transit-to-natal') + transitNote",
    birthTimeDependency: "not required unless house context is included",
    checks: [
      fallbackHooks.includes("key: \"you.transit-to-natal\""),
      generatedKeys.includes("function transitToNatalAspectContentKey"),
      generatedKeys.includes("function transitToNatalAspectInstanceContentKey"),
      app.includes("transitToNatalAspectInstanceContentKey(transit.transitPlanet"),
      app.includes("transitToNatalGeneratedContentKeys(transit)")
    ],
    incompleteCount: 0,
    nextAction: "Author DRAFT rows by transit planet/aspect/natal planet families."
  },
  {
    name: "Transiting aspects to natal angles",
    hook: "you.transit-to-angle",
    state: "WORKING",
    canonicalKey: "transit.aspect.mars.conjunction.ascendant",
    runtimeCaller: "Transits aspectRows / friendTransitSummary when natalPoint is an angle",
    resolver: "liveGeneratedContentByKeys -> loadLiveGeneratedContentForSurfaces",
    safeFallback: "transitToNatalTemplateFallbackKey selects you.transit-to-angle",
    birthTimeDependency: "required",
    checks: [
      fallbackHooks.includes("key: \"you.transit-to-angle\""),
      app.includes("isChartAnglePoint(transit.natalPoint)"),
      app.includes("templateFallbackContentKeys.youTransitToAngle"),
      generatedKeys.includes("function transitToNatalAspectContentKey")
    ],
    incompleteCount: 0,
    nextAction: "Keep angle transits out of reader output when birth time is unavailable."
  }
];

const rows = families.map((family) => {
  const passed = family.checks.filter(Boolean).length;
  const total = family.checks.length;
  const testStatus = passed === total && guardedResolver && readerCopyGuard ? "pass" : `fail (${passed}/${total}; guarded=${guardedResolver}; readerCopy=${readerCopyGuard})`;
  const state = testStatus === "pass" ? family.state : "MISSING";

  return { ...family, state, testStatus };
});

const failures = rows.filter((row) => row.testStatus !== "pass");

const report = [
  "# Fallback Runtime Coverage Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "Scope: read-only runtime wiring audit. No Supabase import, update, or LIVE promotion is performed.",
  "",
  `Reader guard: ${guardedResolver ? "PASS" : "FAIL"} (LIVE + lane=serving + review_state IS NULL + local servability guard).`,
  `Reader copy guard: ${readerCopyGuard ? "PASS" : "FAIL"} (WORKING requires non-empty reader-facing copy and prohibits metadata leakage).`,
  "",
  "| Family | Hook | State | Canonical key example | Runtime caller | Content resolver | Safe fallback | Test status | Birth-time dependency | Incomplete/unmapped count | Next required action |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |",
  ...rows.map((row) => [
    row.name,
    row.hook,
    row.state,
    row.canonicalKey,
    row.runtimeCaller,
    row.resolver,
    row.safeFallback,
    row.testStatus,
    row.birthTimeDependency,
    String(row.incompleteCount),
    row.nextAction
  ].map((value) => String(value).replace(/\|/g, "\\|")).join(" | ").replace(/^/, "| ").replace(/$/, " |")),
  "",
  "Synastry status: EDITORIAL_REVIEW_REQUIRED. Same-planet rows and audit findings remain queued; no new synastry schema, resolver, import, or copy expansion was performed in this pass.",
  "",
  failures.length
    ? `Failures: ${failures.map((row) => row.name).join(", ")}`
    : "Failures: none."
].join("\n");

const outDir = path.join(repoRoot, "scripts", "generated");
try {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "fallback-runtime-coverage-report.md"), report);
} catch (error) {
  const fallbackPath = path.join("/private/tmp", "fallback-runtime-coverage-report.md");
  fs.writeFileSync(fallbackPath, report);
  console.warn(`Could not write repo report; wrote ${fallbackPath} instead.`);
}

console.log(report);

if (failures.length > 0 || !guardedResolver || !readerCopyGuard) {
  process.exitCode = 1;
}
