import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ASTRO_GLYPH_FILES, astroGlyphFile } from "../apps/web/src/features/calendar/astroGlyphMap.ts";
import {
  LUNAR_JOURNAL_ENTRIES,
  LUNAR_JOURNAL_REVIEW_STATUS,
  matchLunarJournalEntry,
  resolveLunarJournal
} from "../apps/web/src/features/calendar/lunarJournal.ts";
import { lunarJournalPackageRecords } from "../api/_lib/lunar-journal-sources.ts";
import { calendarSeasonTransitionPackageRecords } from "../api/_lib/calendar-season-transition-sources.ts";
import { compactHandoffTitle, isHandoffKeyEvent } from "../apps/web/src/features/calendar/calendarHandoff.ts";
import { calendarKindFromEvent } from "../apps/web/src/features/calendar/calendarKinds.ts";
import {
  calendarWritingStudioHref,
  isEditableCalendarWritingKey,
  isLocalCalendarWritingHost
} from "../apps/web/src/features/calendar/calendarWritingStudio.ts";
import { lunarContentIdentity, lunarWorkspaceSelectionFromQuery } from "../apps/admin/src/lunarCalendarContent.ts";
import { calendarDayMoonReading, calendarDayMoonWriting, calendarMoonWritingSequenceWithoutRepeat, calendarMoonWritingWithoutRepeat } from "../apps/web/src/features/calendar/calendarDayMoonReading.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(join(root, "apps/web/src/features/calendar/data/astro-2026.catalog.json"), "utf8"));
const journalPack = JSON.parse(readFileSync(join(root, "apps/web/src/features/calendar/data/lunar-journal.entries.json"), "utf8"));
const catalogText = readFileSync(join(root, "apps/web/src/features/calendar/data/astro-2026.catalog.json"), "utf8");
const journalText = readFileSync(join(root, "apps/web/src/features/calendar/data/lunar-journal.entries.json"), "utf8");
const inventory = readFileSync(join(root, "api/admin/generated-content-inventory.ts"), "utf8");
const prefixes = readFileSync(join(root, "apps/admin/src/studioSectionInventory.ts"), "utf8");

assert.equal(catalogText.toLowerCase().includes("chani"), false, "catalog must not contain third-party planner copy");
assert.equal(journalText.toLowerCase().includes("chani"), false);
assert.equal(catalog.some((event) => event.kind === "affirmation"), false, "catalog must not keep CHANI monthly affirmations");
assert.equal(catalog.some((event) => /key astro for/i.test(event.title)), false, "catalog must not keep CHANI planner titles");
assert.equal(catalog.some((event) => /[⭐★💗]/.test(event.title)), false);
assert.equal(catalog.length > 400, true);
assert.equal(catalog.every((event) => event.date && event.title && event.kind), true);
assert.equal(catalog.filter((event) => event.article).every((event) => String(event.article).startsWith("https://tldrastro.com/")), true);
assert.equal(journalPack.schema, "tldr.lunar-journal.v1");
assert.equal(journalPack.review_status, "needs_review");
assert.equal(journalPack.entries.length, 83);
assert.equal(LUNAR_JOURNAL_ENTRIES.length, 83);
assert.equal(LUNAR_JOURNAL_REVIEW_STATUS, "needs_review");
assert.equal(new Set(LUNAR_JOURNAL_ENTRIES.map((entry) => entry.contentKey)).size, 83);
assert.ok(LUNAR_JOURNAL_ENTRIES.every((entry) => Array.isArray(entry.blocks) && entry.blocks.length > 0));
assert.ok(LUNAR_JOURNAL_ENTRIES.every((entry) => entry.contentKey.startsWith("authored/lunar-journal/")));
assert.equal(lunarJournalPackageRecords.length, 83);
assert.ok(lunarJournalPackageRecords.every((record) => record.review_status === "needs_review"));
assert.ok(lunarJournalPackageRecords.every((record) => record.owner_approved === false));
assert.ok(lunarJournalPackageRecords.every((record) => record.serving_enabled === false));
assert.ok(lunarJournalPackageRecords.every((record) => record.body.trim().length > 0));
assert.ok(inventory.includes("lunar-journal-sources"));
assert.ok(inventory.includes("calendar-season-transition-sources"));
assert.equal(calendarSeasonTransitionPackageRecords.length, 60);
assert.ok(calendarSeasonTransitionPackageRecords.every((record) => record.review_status === "needs_review"));
assert.ok(calendarSeasonTransitionPackageRecords.every((record) => record.owner_approved === false));
assert.ok(calendarSeasonTransitionPackageRecords.every((record) => record.serving_enabled === false));
assert.ok(calendarSeasonTransitionPackageRecords.every((record) => record.body.includes("{{date}}")));
assert.ok(prefixes.includes("authored/lunar-journal/"));
assert.ok(prefixes.includes("authored/calendar-moon-continuation-summary/"));
assert.ok(prefixes.includes("authored/calendar-moon-transition/"));
assert.ok(prefixes.includes("authored/calendar-season-transition/"));

const capricornSeason = matchLunarJournalEntry({
  id: "sun-capricorn",
  type: "ingress",
  title: "The Sun enters Capricorn",
  startsAt: "2024-12-21T15:03:00.000Z",
  dateKey: "2024-12-21",
  glyph: "☉",
  primary: true,
  planet: "Sun",
  sign: "Capricorn",
  toSign: "Capricorn"
});
assert.equal(capricornSeason?.type, "season");
assert.equal(capricornSeason?.sign, "Capricorn");
assert.equal(capricornSeason?.contentKey, "authored/lunar-journal/season/capricorn/20241221t150300z");
assert.ok(capricornSeason);
assert.match(capricornSeason.blocks[0] && "text" in capricornSeason.blocks[0] ? capricornSeason.blocks[0].text : "", /exhausted from building/);

const packaged = resolveLunarJournal(capricornSeason && {
  id: "sun-capricorn",
  type: "ingress",
  title: "The Sun enters Capricorn",
  startsAt: "2024-12-21T15:03:00.000Z",
  dateKey: "2024-12-21",
  glyph: "☉",
  primary: true,
  planet: "Sun",
  sign: "Capricorn",
  toSign: "Capricorn"
} || { id: "x", type: "ingress", title: "The Sun enters Capricorn", startsAt: "2024-12-21T15:03:00.000Z", dateKey: "2024-12-21", glyph: "☉", primary: true, planet: "Sun", toSign: "Capricorn" });
assert.equal(packaged?.source, "package");

const liveBody = "Studio overlay for Capricorn season.";
const live = resolveLunarJournal({
  id: "sun-capricorn",
  type: "ingress",
  title: "The Sun enters Capricorn",
  startsAt: "2024-12-21T15:03:00.000Z",
  dateKey: "2024-12-21",
  glyph: "☉",
  primary: true,
  planet: "Sun",
  sign: "Capricorn",
  toSign: "Capricorn"
}, new Map([[capricornSeason.contentKey, {
  id: "live-1",
  contentKey: capricornSeason.contentKey,
  surface: "sky",
  mode: "in_depth",
  eventType: null,
  targetDate: null,
  headline: "Capricorn Season",
  summary: null,
  body: liveBody,
  sections: null,
  model: null,
  updatedAt: "2026-09-20T00:00:00.000Z",
  status: "LIVE"
}]]));
assert.equal(live?.source, "live");
assert.equal(live?.blocks[0] && "text" in live.blocks[0] ? live.blocks[0].text : "", liveBody);

assert.equal(astroGlyphFile("☉"), "sun");
assert.equal(astroGlyphFile("♍"), "virgo");
assert.equal(astroGlyphFile("☍"), "opposition");
assert.ok(ASTRO_GLYPH_FILES["△"]);
assert.equal(compactHandoffTitle("Mercury sextiles Jupiter"), compactHandoffTitle("Mercury sextile Jupiter"));
assert.equal(compactHandoffTitle("Key astro for love: Mercury conjoins Venus"), compactHandoffTitle("Mercury conjoins Venus"));
assert.equal(compactHandoffTitle("Key astro for success: The New Moon in Taurus"), compactHandoffTitle("The New Moon in Taurus"));
assert.equal(isHandoffKeyEvent({ title: "Mercury sextile Jupiter", dateKey: "2026-09-21" }), true);
assert.equal(calendarKindFromEvent({
  id: "mercury-jupiter",
  type: "aspect",
  title: "Mercury sextile Jupiter",
  startsAt: "2026-09-21T19:49:00.000Z",
  dateKey: "2026-09-21",
  glyph: "",
  primary: true,
  planets: ["Mercury", "Jupiter"],
  aspect: "sextile"
}), "key");
assert.equal(calendarKindFromEvent({
  id: "void-day",
  type: "ingress",
  title: "Moon void of course",
  startsAt: "2026-09-21T12:00:00.000Z",
  dateKey: "2026-09-21",
  glyph: "VOC",
  primary: false,
  planet: "Moon"
}), "void");

assert.equal(isLocalCalendarWritingHost("127.0.0.1"), true);
assert.equal(isLocalCalendarWritingHost("localhost"), true);
assert.equal(isLocalCalendarWritingHost("tldrastro.com"), false);
assert.equal(isEditableCalendarWritingKey("authored/lunar-journal/season/libra/20250922t181900z"), true);
assert.equal(isEditableCalendarWritingKey("generated/calendar-event/aspect/x"), false);
assert.ok(calendarWritingStudioHref("authored/lunar-journal/season/libra/20250922t181900z").includes("#calendar-writeups?"));
assert.ok(calendarWritingStudioHref("authored/lunar-journal/season/libra/20250922t181900z").includes("q=authored%2Flunar-journal%2Fseason%2Flibra%2F20250922t181900z"));
assert.ok(calendarWritingStudioHref("fallback-hook/sky-placement-lived/moon/libra").includes("#sky-writeups?"));
assert.equal(calendarWritingStudioHref("fallback-hook/sky-placement-lived/moon/libra").includes("#calendar-writeups?"), false);
assert.ok(calendarWritingStudioHref("cms/sky-daily-summary/sun/virgo").includes("#calendar-writeups?"));
assert.ok(calendarWritingStudioHref("cms/sky-daily-summary/moon/scorpio/fullMoon").includes("#calendar-writeups?"));
assert.ok(calendarWritingStudioHref("authored/sky-lunation-macro/full-moon/pisces").includes("#calendar-writeups?"));
assert.equal(lunarWorkspaceSelectionFromQuery("Moon in Libra"), null);
assert.equal(lunarWorkspaceSelectionFromQuery("authored/lunar-journal/season/libra/20250922t181900z")?.family, "Lunar journal");
assert.equal(lunarWorkspaceSelectionFromQuery("authored/calendar-weekly-moon/libra")?.family, "Moon-sign leftover");
assert.equal(lunarWorkspaceSelectionFromQuery("authored/calendar-weekly-moon/libra")?.job, "Day and Week Moon story");
assert.equal(lunarContentIdentity("authored/calendar-weekly-moon/libra")?.title, "Moon in Libra · Leftover 1");
assert.equal(lunarContentIdentity("authored/calendar-weekly-moon/libra/variant-2")?.title, "Moon in Libra · Leftover 2");
assert.equal(lunarWorkspaceSelectionFromQuery("authored/calendar-moon-continuation-summary/scorpio")?.family, "Continuation sentences");
assert.equal(lunarWorkspaceSelectionFromQuery("authored/calendar-moon-transition/scorpio/sagittarius")?.family, "Sign-change sentences");
assert.equal(lunarWorkspaceSelectionFromQuery("authored/calendar-season-transition/virgo/libra")?.family, "Season transitions");
assert.equal(lunarWorkspaceSelectionFromQuery("authored/calendar-season-transition/virgo/libra/variant-2")?.family, "Season transitions");
assert.equal(lunarContentIdentity("authored/calendar-season-transition/virgo/libra/variant-3")?.variant, 3);
assert.equal(lunarContentIdentity("authored/calendar-season-transition/virgo/libra/variant-4")?.variant, 4);
assert.equal(lunarContentIdentity("authored/calendar-season-transition/virgo/libra/variant-5")?.variant, 5);
assert.equal(lunarContentIdentity("authored/calendar-season-transition/virgo/libra")?.destination, "Calendar Day and Week when a season is ending");
assert.equal(lunarContentIdentity("authored/calendar-season-transition/virgo/libra")?.title, "Virgo to Libra · Ends");
assert.equal(lunarContentIdentity("authored/calendar-season-transition/virgo/libra/variant-2")?.title, "Virgo to Libra · Begins");
assert.equal(lunarContentIdentity("authored/calendar-season-transition/virgo/libra/variant-3")?.title, "Virgo to Libra · Begins · 2");
assert.equal(lunarContentIdentity("authored/calendar-season-transition/virgo/libra/variant-5")?.title, "Virgo to Libra · Begins · 4");
assert.equal(lunarWorkspaceSelectionFromQuery("cms/sky-daily-summary/sun/virgo")?.family, "Sun daily summary");
assert.equal(lunarWorkspaceSelectionFromQuery("fallback-hook/sky-placement-lived/moon/scorpio"), null);
assert.equal(lunarWorkspaceSelectionFromQuery("cms/sky-daily-summary/moon/pisces/fullMoon")?.family, "Moon daily summary");
assert.equal(lunarWorkspaceSelectionFromQuery("authored/sky-lunation-macro/new-moon/virgo")?.family, "Lunation articles");
assert.equal(lunarWorkspaceSelectionFromQuery("authored/sky-lunation-macro/full-moon/pisces")?.family, "Lunation articles");
assert.equal(lunarWorkspaceSelectionFromQuery("authored/lunar-journal/season/libra/20250922t181900z")?.job, "Event readings");
assert.equal(lunarWorkspaceSelectionFromQuery("cms/sky-daily-summary/sun/virgo")?.job, "Shared with Sky");

const leftoverDay = calendarDayMoonReading({
  moonSign: "Scorpio",
  lunation: null,
  leftoverFallback: { contentKey: "authored/calendar-weekly-moon/scorpio", body: "leftover copy" }
});
assert.equal(leftoverDay?.contentKey, "authored/calendar-weekly-moon/scorpio");
assert.deepEqual(calendarDayMoonWriting({
  moonSign: "Scorpio",
  lunation: null,
  leftoverFallback: { contentKey: "authored/calendar-weekly-moon/scorpio", body: "leftover copy" }
}).map((piece) => piece.role), ["leftover"]);
assert.deepEqual(calendarDayMoonWriting({
  moonSign: "Scorpio",
  lunation: null,
  leftoverFallback: { contentKey: "fallback-hook/sky-placement-lived/moon/scorpio", body: "You're allowed to let things die." }
}).map((piece) => piece.role), []);
assert.deepEqual(calendarDayMoonWriting({
  moonSign: "Scorpio",
  lunation: null
}).map((piece) => piece.role), []);

const lunationDay = calendarDayMoonReading({
  moonSign: "Pisces",
  lunation: { title: "Full Moon in Pisces", sign: "Pisces" },
  lunationBody: "lunation copy",
  leftoverFallback: { contentKey: "leftover", body: "leftover copy" }
});
assert.equal(lunationDay?.contentKey, "authored/sky-lunation-macro/full-moon/pisces");
assert.deepEqual(calendarDayMoonWriting({
  moonSign: "Pisces",
  lunation: { title: "Full Moon in Pisces", sign: "Pisces" },
  lunationBody: "lunation copy",
  leftoverFallback: { contentKey: "authored/calendar-weekly-moon/pisces", body: "leftover copy" }
}).map((piece) => [piece.role, piece.contentKey]), [
  ["lunation", "authored/sky-lunation-macro/full-moon/pisces"]
]);

const lunationFallback = calendarDayMoonReading({
  moonSign: "Scorpio",
  lunation: { title: "Full Moon in Scorpio", sign: "Scorpio" },
  lunationBody: "",
  leftoverFallback: { contentKey: "leftover", body: "leftover copy" }
});
assert.equal(lunationFallback?.contentKey, "leftover");

assert.deepEqual(
  calendarMoonWritingWithoutRepeat(
    calendarDayMoonWriting({
      moonSign: "Scorpio",
      lunation: null,
      leftoverFallback: { contentKey: "authored/calendar-weekly-moon/scorpio", body: "leftover copy" }
    }),
    ["placement copy"]
  ).map((piece) => piece.role),
  ["leftover"]
);
assert.deepEqual(
  calendarMoonWritingSequenceWithoutRepeat(
    [
      { leftover: "leftover copy" },
      { leftover: "leftover copy" },
      { leftover: "second leftover copy" }
    ],
    (day) => calendarDayMoonWriting({
      moonSign: "Scorpio",
      lunation: null,
      leftoverFallback: { contentKey: "authored/calendar-weekly-moon/scorpio", body: day.leftover }
    }),
    (_day, index) => index === 0 ? null : {
      role: "leftover",
      contentKey: `generated/calendar-moon-continuation/day-${index}`,
      body: `The Moon remains in Scorpio on day ${index}.`
    }
  ).map((pieces) => pieces.map((piece) => piece.body)),
  [
    ["leftover copy"],
    ["The Moon remains in Scorpio on day 1."],
    ["second leftover copy"]
  ]
);

console.log("calendar handoff catalogs, lunar journal studio wiring, and glyph map");
