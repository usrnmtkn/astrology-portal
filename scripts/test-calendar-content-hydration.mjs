#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleFile = path.join(os.tmpdir(), "tldrastro-calendar-content-hydration.bundle.mjs");
const lunarBundleFile = path.join(os.tmpdir(), "tldrastro-calendar-lunar-content-hydration.bundle.mjs");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/features/calendar/calendarContentKeys.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

const {
  calendarEventGeneratedContentKeys,
  calendarTransitDetailContentKeys
} = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);

await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/features/calendar/lunarDayResolver.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: lunarBundleFile,
  platform: "node"
});

const { lunarDayGeneratedContentKeys } = await import(`${pathToFileURL(lunarBundleFile).href}?t=${Date.now()}`);

const aspectEvent = {
  id: "venus-square-mars",
  type: "aspect",
  title: "Venus square Mars",
  startsAt: "2026-07-31T16:00:00.000Z",
  dateKey: "2026-07-31",
  planets: ["Venus", "Mars"],
  aspect: "square",
  fromSign: "Virgo",
  toSign: "Gemini"
};
const ingressEvent = {
  id: "jupiter-enters-leo",
  type: "ingress",
  title: "Jupiter enters Leo",
  startsAt: "2026-06-30T12:00:00.000Z",
  dateKey: "2026-06-30",
  planet: "Jupiter",
  sign: "Leo",
  toSign: "Leo"
};
const retrogradeEvent = {
  id: "uranus-retrograde",
  type: "station",
  title: "Uranus retrograde in Gemini",
  startsAt: "2026-09-10T12:00:00.000Z",
  dateKey: "2026-09-10",
  planet: "Uranus",
  sign: "Gemini",
  direction: "retrograde",
  phase: "retrograde-passage"
};
const directEvent = {
  id: "uranus-direct",
  type: "station",
  title: "Uranus stations direct in Gemini",
  startsAt: "2027-02-04T12:00:00.000Z",
  dateKey: "2027-02-04",
  planet: "Uranus",
  sign: "Gemini",
  direction: "direct",
  phase: "station-direct"
};

const aspectKeys = calendarEventGeneratedContentKeys(aspectEvent);
assert.equal(aspectKeys.length, 2, "Calendar aspects must request evergreen and dated approved-card keys.");
assert.ok(aspectKeys.some((key) => key.includes("2026-07-31")), "Calendar aspects must include the exact event date.");

const ingressKeys = calendarEventGeneratedContentKeys(ingressEvent);
assert.ok(ingressKeys.includes("sky.ingress.jupiter.leo"), "Ingress cards must request the canonical ingress row.");
assert.ok(ingressKeys.includes("ms/ingress/jupiter"), "Ingress cards must preserve their reviewed fallback alias.");

const retrogradeKeys = calendarEventGeneratedContentKeys(retrogradeEvent);
assert.ok(
  retrogradeKeys.includes("sky.retrograde.uranus.gemini.retrograde_passage"),
  "Retrograde passages must request the sign-and-phase-specific row."
);

const directKeys = calendarEventGeneratedContentKeys(directEvent);
assert.ok(
  directKeys.includes("sky.station.uranus.gemini.direct"),
  "Direct stations must request the sign-and-motion-specific row."
);

assert.ok(
  calendarTransitDetailContentKeys(ingressEvent).includes("sky.placement.base.jupiter.leo"),
  "On-demand Calendar detail must include its placement article key."
);

const newMoonEvent = {
  id: "new-moon-leo",
  type: "lunation",
  title: "New Moon in Leo",
  startsAt: "2026-08-12T17:36:00.000Z",
  dateKey: "2026-08-12",
  sign: "Leo",
  sunSign: "Leo"
};
const lunarDayKeys = lunarDayGeneratedContentKeys({
  date: "2026-08-12T12:00:00.000Z",
  dateKey: "2026-08-12",
  inMonth: true,
  moonPhase: "New Moon",
  moonSign: "Leo",
  moonSignGlyph: "♌",
  illumination: 0,
  events: [newMoonEvent],
  activeAspects: [{
    planetA: "Venus",
    planetB: "Mars",
    aspectType: "square",
    orb: 1,
    applying: true
  }]
}, [newMoonEvent]);

assert.ok(lunarDayKeys.includes("lunar.day.2026-08-12.body"));
assert.ok(lunarDayKeys.includes("lunation/new-moon/leo"));
assert.ok(lunarDayKeys.includes("fallback-hook/lunation/new-moon/leo"));
assert.ok(lunarDayKeys.includes("venus-square-mars__leo_lunation_leo_season"));
assert.ok(lunarDayKeys.includes("transit-fallback/square"));

const appSource = read("apps/web/src/App.tsx");
const routeSource = read("apps/web/src/routes/CalendarRoute.tsx");
const calendarSource = read("apps/web/src/features/calendar/LunarCalendar.tsx");
const calendarCss = read("apps/web/src/styles/lunar-calendar.css");

assert.doesNotMatch(
  appSource,
  /loadLiveGeneratedContent\("sky"/u,
  "Calendar must not scan the entire Sky content surface."
);
assert.match(
  appSource,
  /calendarContentRequest\.contentKeys\.filter[\s\S]*?loadLiveGeneratedContentForKeys\(missingKeys\)/u,
  "Calendar must hydrate only missing exact keys."
);
assert.match(
  appSource,
  /function openCalendarTransitDetail[\s\S]*?openCalendarTransitDetailWithContent\(event, skyGeneratedContent, description\);[\s\S]*?loadLiveGeneratedContentForKeys\(missingKeys\)/u,
  "Calendar transit details must open immediately before exact content hydrates."
);
assert.match(
  appSource,
  /selectedSkyDetailRefreshContentRef\.current === skyGeneratedContent[\s\S]*?selectedSkyDetailRefreshContentRef\.current = skyGeneratedContent/u,
  "An open Calendar detail must refresh when its exact content arrives."
);
assert.match(
  appSource,
  /function calendarStationDetailBody[\s\S]*?calendarEventGeneratedContentKeys\(event\)[\s\S]*?readerFacingParagraphs\(generatedContentParagraphs\(content\)\)[\s\S]*?readerFacingParagraphs\(\[description\]\)/u,
  "Station details must reuse the exact approved Calendar event copy when no placement article is available."
);
assert.match(
  appSource,
  /stationBody\.length > 0 && !hasPlacementBody[\s\S]*?body: stationBody[\s\S]*?plainBody: true/u,
  "Approved station copy must fill an otherwise empty factual detail without replacing a long-form article."
);
assert.match(
  appSource,
  /selectedCalendarTransitEventRef\.current[\s\S]*?calendarTransitDetailWithContent\([\s\S]*?calendarEvent\.event,[\s\S]*?skyGeneratedContent,[\s\S]*?calendarEvent\.description/u,
  "An open station detail must retain event context while exact content hydrates."
);
assert.match(
  appSource,
  /calendarContentCacheRef[\s\S]*?size > 12/u,
  "Calendar date-range hydration must use a bounded cache."
);
assert.match(routeSource, /onGeneratedContentRequest/u, "CalendarRoute must forward exact-key requests.");
assert.match(calendarSource, /lunarDayGeneratedContentKeys\(selectedDay, editorialEvents\)/u);
assert.match(calendarSource, /contentStatus === "loading"/u);
assert.match(
  calendarSource,
  /containsEditorialMetadata[\s\S]*?return false/u,
  "Calendar must reject dashboard review metadata before rendering event prose."
);
assert.match(
  calendarSource,
  /fallback-hook\/sky-event\/ingress[\s\S]*?fallback-vocab\/sign-need/u,
  "Ingress gaps must resolve through approved package hooks and vocabulary."
);
assert.match(calendarCss, /\.tx-body--loading/u, "Calendar cards must reserve prose space while content hydrates.");

console.log(JSON.stringify({
  aspectKeys: aspectKeys.length,
  directStationKeys: directKeys.length,
  ingressKeys: ingressKeys.length,
  lunarDayKeys: lunarDayKeys.length,
  retrogradeKeys: retrogradeKeys.length,
  status: "PASS"
}, null, 2));
