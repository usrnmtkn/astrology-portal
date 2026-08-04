#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import SwissEph from "swisseph-wasm";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleFile = path.join(os.tmpdir(), "tldrastro-calendar-content-hydration.bundle.mjs");
const lunarBundleFile = path.join(os.tmpdir(), "tldrastro-calendar-lunar-content-hydration.bundle.mjs");
const seasonBundleFile = path.join(os.tmpdir(), "tldrastro-calendar-season-content-hydration.bundle.mjs");
const ephemerisBundleDir = path.join(repoRoot, "node_modules/.cache/tldrastro");
const ephemerisBundleFile = path.join(ephemerisBundleDir, "calendar-ingress-ephemeris.bundle.mjs");
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

await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/features/calendar/seasonWindow.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: seasonBundleFile,
  platform: "node"
});

const { sunIngressSeasonSign } = await import(`${pathToFileURL(seasonBundleFile).href}?t=${Date.now()}`);

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
  toSign: "Leo",
  longitude: 120,
  direction: "direct"
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
const mercuryStationEvent = {
  id: "mercury-stations-retrograde-pisces",
  type: "station",
  title: "Mercury stations retrograde in Pisces",
  startsAt: "2027-02-09T12:00:00.000Z",
  dateKey: "2027-02-09",
  planet: "Mercury",
  sign: "Pisces",
  direction: "retrograde",
  phase: "station-retrograde"
};
const venusPassageEvent = {
  id: "venus-retrograde-passage-scorpio",
  type: "station",
  title: "Venus retrograde in Scorpio",
  startsAt: "2026-10-10T12:00:00.000Z",
  dateKey: "2026-10-10",
  planet: "Venus",
  sign: "Scorpio",
  direction: "retrograde",
  phase: "retrograde-passage"
};
const chironStationEvent = {
  id: "chiron-stations-retrograde-taurus",
  type: "station",
  title: "Chiron stations retrograde in Taurus",
  startsAt: "2027-07-26T12:00:00.000Z",
  dateKey: "2027-07-26",
  planet: "Chiron",
  sign: "Taurus",
  direction: "retrograde",
  phase: "station-retrograde"
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
  calendarEventGeneratedContentKeys(mercuryStationEvent).includes("sky.station.mercury.pisces.retrograde"),
  "Mercury station cards must request their owner-approved exact row."
);
assert.ok(
  calendarEventGeneratedContentKeys(venusPassageEvent).includes("sky.retrograde.venus.scorpio.retrograde_passage"),
  "Venus retrograde passages must request their owner-approved exact row."
);
assert.ok(
  calendarEventGeneratedContentKeys(chironStationEvent).includes("sky.station.chiron.taurus.retrograde"),
  "Chiron station cards must request their owner-approved exact row."
);

assert.ok(
  calendarTransitDetailContentKeys(ingressEvent).includes("sky.placement.base.jupiter.leo"),
  "On-demand Calendar detail must include its placement article key."
);

fs.mkdirSync(ephemerisBundleDir, { recursive: true });
await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/services/ephemeris.ts")],
  external: ["swisseph-wasm"],
  format: "esm",
  logLevel: "silent",
  outfile: ephemerisBundleFile,
  platform: "node"
});

const { getLunarCalendarMonth } = await import(`${pathToFileURL(ephemerisBundleFile).href}?t=${Date.now()}`);
const ingressCalendar = await getLunarCalendarMonth({
  label: "Portsmouth, NH",
  latitude: 43.0718,
  longitude: -70.7626,
  timeZone: "America/New_York"
}, new Date("2026-07-15T12:00:00.000Z"), { detail: "full" });
const augustCalendar = await getLunarCalendarMonth({
  label: "Portsmouth, NH",
  latitude: 43.0718,
  longitude: -70.7626,
  timeZone: "America/New_York"
}, new Date("2026-08-15T12:00:00.000Z"), { detail: "full" });
const directEphemeris = new SwissEph();
await directEphemeris.initSwissEph();

function directIngressFacts(event, planetId) {
  const date = new Date(event.startsAt);
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const julianDay = directEphemeris.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    utcHour
  );
  const result = directEphemeris.calc_ut(
    julianDay,
    planetId,
    directEphemeris.SEFLG_SWIEPH | directEphemeris.SEFLG_SPEED
  );

  return {
    direction: result[3] < 0 ? "retrograde" : "direct",
    longitude: ((result[0] % 360) + 360) % 360
  };
}

for (const expected of [
  { title: "Jupiter enters Leo", planetId: directEphemeris.SE_JUPITER },
  { title: "Venus enters Virgo", planetId: directEphemeris.SE_VENUS }
]) {
  const event = ingressCalendar.events.find((candidate) => candidate.title === expected.title);

  assert.ok(event, `${expected.title} must exist in the July 2026 Calendar calculation.`);
  const direct = directIngressFacts(event, expected.planetId);

  assert.equal(event.direction, direct.direction, `${expected.title} motion must match direct Swiss Ephemeris.`);
  assert.ok(
    Math.abs(event.longitude - direct.longitude) < 0.0001,
    `${expected.title} longitude must match direct Swiss Ephemeris.`
  );
}

const virgoIngress = augustCalendar.events.find((candidate) => candidate.title === "Sun enters Virgo");
assert.ok(virgoIngress, "The August 2026 Calendar must include the computed Sun ingress into Virgo.");
assert.equal(virgoIngress.dateKey, "2026-08-22", "Virgo season must begin on the computed local-date Sun ingress.");
const directVirgoIngress = directIngressFacts(virgoIngress, directEphemeris.SE_SUN);
assert.equal(virgoIngress.direction, directVirgoIngress.direction, "The Sun ingress motion must match direct Swiss Ephemeris.");
assert.ok(
  Math.abs(virgoIngress.longitude - directVirgoIngress.longitude) < 0.0001,
  "The Sun ingress longitude must match direct Swiss Ephemeris."
);
assert.equal(
  sunIngressSeasonSign("2026-08-04", augustCalendar.events),
  "Leo",
  "August 4, 2026 must remain in Leo season."
);
assert.equal(
  sunIngressSeasonSign("2026-08-25", augustCalendar.events),
  "Virgo",
  "August 25, 2026 must resolve to Virgo season after the Sun ingress."
);

fs.rmSync(ephemerisBundleFile, { force: true });

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
const themeCss = read("apps/web/src/styles/theme.css");
const bundledSkyCore = JSON.parse(read("apps/web/src/content/fallbackArchitectureV3/bundled-sky-core-rows-v3.json"));
const venusLibraIngress = bundledSkyCore.hookRows.find(
  (row) => row.contentKey === "fallback-hook/sky-event/ingress/venus/libra"
);

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
  /function calendarEventDetailBody[\s\S]*?calendarEventGeneratedContentKeys\(event\)[\s\S]*?readerFacingParagraphs\(generatedContentParagraphs\(content\)\)[\s\S]*?readerFacingParagraphs\(\[description\]\)/u,
  "Calendar details must reuse exact approved event copy before the rendered-card fallback."
);
assert.match(
  appSource,
  /eventBody\.length > 0 && !hasPlacementBody[\s\S]*?body: eventBody[\s\S]*?plainBody: true/u,
  "Approved ingress and station copy must fill an empty placement detail without replacing a long-form article."
);
assert.match(
  appSource,
  /eventBody\.length > 0 && !hasAspectBody[\s\S]*?body: eventBody[\s\S]*?plainBody: true/u,
  "Approved aspect copy must fill an empty aspect detail."
);
assert.match(
  appSource,
  /function skyDetailHasReaderFacingMainBody[\s\S]*?section\.role !== "aspect"[\s\S]*?isReaderFacingCopy\(section\.body\)/u,
  "Related-aspect furniture must not make an otherwise empty placement article look complete."
);
assert.match(
  appSource,
  /const detailAspect: SkySnapshot\["aspects"\]\[number\] = \{[\s\S]*?orb: 0[\s\S]*?currentSkyAspectDetailArticle\(detailAspect, generatedAt, new Map\(\)\)/u,
  "Calendar aspect details must not borrow current-sky aspect or degree facts for a different event date."
);
assert.match(
  appSource,
  /selectedCalendarTransitEventRef\.current[\s\S]*?calendarTransitDetailWithContent\([\s\S]*?calendarEvent\.event,[\s\S]*?skyGeneratedContent,[\s\S]*?calendarEvent\.description/u,
  "An open Calendar detail must retain event context while exact content hydrates."
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
  /const frame = fallbackV3HookBody\(`fallback-hook\/sky-event\/ingress\/\$\{planetPart\}\/\$\{signPart\}`\);/u,
  "Calendar ingress copy must require an approved planet-and-sign-specific row."
);
assert.doesNotMatch(
  calendarSource,
  /\|\| fallbackV3HookBody\("fallback-hook\/sky-event\/ingress"\)/u,
  "Calendar must not reactivate the rejected generic ingress wording."
);
assert.equal(
  venusLibraIngress?.body_you,
  "{{aRef}} enters {{signTitle}} {{dateLineLower}}, shifting attention toward balance, cooperation, and mutual respect in relationships. Over the next few weeks, compromise may come more easily, but keeping the peace should not require avoiding honest conversations. Healthy relationships can make room for disagreement without losing respect.",
  "Venus entering Libra must use the owner-approved plain-language Calendar copy."
);
assert.doesNotMatch(
  venusLibraIngress?.body_you ?? "",
  /tone shifts|Libra trap|thinner than it looked/u,
  "The Venus-in-Libra override must not reintroduce the rejected language."
);
assert.doesNotMatch(
  calendarSource,
  /Show day theme|Hide day theme/u,
  "Weekly day themes must render without progressive-disclosure buttons."
);
assert.doesNotMatch(
  calendarSource,
  />Day theme</u,
  "Weekly Moon guidance must identify its Moon sign instead of using a vague label."
);
assert.match(
  calendarSource,
  /<h3>Moon in \{day\.moonSign\}<\/h3>/u,
  "Weekly Moon guidance must label the sign driving the interpretation."
);
assert.match(
  calendarSource,
  /const selectedPackageWeeklyMoon = selectedDay[\s\S]*?renderWeeklyMoon\(\{[\s\S]*?sign: slugContentPart\(selectedDay\.moonSign\),[\s\S]*?variant: weeklyMoonVariantForDate\(selectedDay\.dateKey\)/u,
  "Day view must resolve its complete approved Moon-in-sign write-up independently."
);
assert.doesNotMatch(
  calendarSource,
  /const selectedPackageWeeklyMoon = selectedWeekWriteup/u,
  "Day view must not inherit Week view's abbreviated repeated-sign continuation."
);
assert.doesNotMatch(
  calendarSource,
  />Today’s Moon<\/h3>/u,
  "The Day card must not repeat a redundant Today's Moon eyebrow."
);
assert.match(
  calendarSource,
  /loadCalendarData\(location, "month", monthStartFromDateKey\(selectedDateKey\), "full"\)/u,
  "Day view must load the selected month's events for zodiac-season lunar milestones."
);
assert.match(
  calendarSource,
  /const \[seasonEvents, setSeasonEvents\][\s\S]*?\.\.\.seasonEvents/u,
  "The season panel must merge month-wide events when selecting its New and Full Moon."
);
assert.match(
  calendarSource,
  /if \(!hasNewMoon \|\| !hasFullMoon\)[\s\S]*?coverageStart > season\.start[\s\S]*?coverageEnd < seasonLastDateKey/u,
  "The season milestone loader must cover zodiac seasons that cross a month-grid boundary."
);
assert.ok(
  calendarSource.indexOf("{showGuidance && guidance?.body && (")
    < calendarSource.indexOf("{visibleEvents.length > 0 && ("),
  "Weekly Moon-in-sign guidance must render before that day's aspects and movements."
);
assert.match(
  calendarSource,
  /const showGuidance = Boolean\(guidance\?\.body\)/u,
  "Weekly guidance must remain visible when the day also has an event description."
);
assert.doesNotMatch(
  calendarSource,
  /calendarAdjacentCopyIsDistinct\(candidate\.body, previousGuidanceBody\)/u,
  "Approved Moon-sign variants must not disappear merely because they share an editorial sentence pattern."
);
assert.match(
  calendarSource,
  /return `\$\{dateLabel\} · \$\{seasonSign\} season/u,
  "The selected-day card must identify the date whose zodiac season it is showing."
);
assert.match(
  calendarCss,
  /\.lunar-weekly-jump \{[\s\S]*?position: sticky;[\s\S]*?top: calc\(var\(--top-control-top\) \+ var\(--top-control-height\) \+ 8px\);/u,
  "The weekly day selector must stay below the floating navigation."
);
assert.match(
  calendarCss,
  /\.lunar-weekly-day \{[\s\S]*?scroll-margin-top: calc\(var\(--top-control-top\) \+ var\(--top-control-height\) \+ 88px\);/u,
  "Jump-to-day scrolling must clear both the global navigation and sticky week selector."
);
assert.match(
  themeCss,
  /--lunar-moon-shadow-bg:[\s\S]*?color-mix\(in srgb, var\(--lunar-moon-dark\) 78%, var\(--lunar-moon-dark-edge\)\);/u,
  "The Moon phase shadow token must resolve independently so waxing and waning masks remain visible."
);
assert.doesNotMatch(
  themeCss,
  /--lunar-moon-shadow-bg:[\s\S]*?var\(--moon-shadow-edge\)/u,
  "A root Moon token must not depend on a component-local custom property."
);
assert.match(
  calendarCss,
  /\.app-shell\.mode-calendar \{[\s\S]*?overflow-x: clip;/u,
  "Calendar must not create a false scroll container that disables sticky controls."
);
assert.match(
  calendarCss,
  /html:has\(\.app-shell\.mode-calendar\)[\s\S]*?#root:has\(\.app-shell\.mode-calendar\)[\s\S]*?overflow-x: clip;/u,
  "Calendar document ancestors must preserve viewport-based sticky positioning."
);
assert.match(
  calendarCss,
  /\.mode-calendar \.detail-panel\.calendar-content-column \{[\s\S]*?overflow-x: clip;/u,
  "The mobile Calendar content column must not disable its sticky week selector."
);
assert.match(
  calendarCss,
  /\.lunar-calendar-month-primary \{[\s\S]*?grid-template-columns: minmax\(0, 1\.65fr\) minmax\(300px, 0\.85fr\);/u,
  "The Month view must preserve its calendar-and-detail desktop grid at laptop widths."
);
assert.match(
  calendarCss,
  /@media \(max-width: 820px\) \{[\s\S]*?\.lunar-calendar-month-primary \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/u,
  "The Month view must stack only at the narrow tablet/mobile breakpoint."
);
assert.match(
  calendarSource,
  /viewMode === "month" && window\.matchMedia\("\(max-width: 820px\)"\)\.matches/u,
  "Month day selection must scroll to the stacked detail only at the same narrow breakpoint."
);
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
assert.match(
  calendarSource,
  /selectedDayTransits\.map[\s\S]*?calendarEventEditorialContent\([\s\S]*?const description = editorial\.eventCopy \?\? "";[\s\S]*?data-content-key=\{editorial\.contentKey\}[\s\S]*?onOpenTransit\?\.\(event, description\)/u,
  "Selected-day ingress, station, and aspect buttons must carry their approved rendered copy into detail."
);
assert.match(
  calendarSource,
  /function calendarStationDirectPackageDescription\(event: LunarCalendarEvent, dateLine: string\)[\s\S]*?replaceAll\("\{\{dateLine\}\}", dateLine\)/u,
  "Direct-station copy must use the event date line instead of claiming every event happens this week."
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
