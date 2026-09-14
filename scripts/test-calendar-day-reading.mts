import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { CalendarDayReading, calendarSkyForDay } from "../apps/web/src/features/calendar/CalendarDayReading.tsx";
import type { SkySnapshot, LocationInput } from "../apps/web/src/types.ts";
import type { SkyDetail } from "../apps/web/src/features/sky/SkyDetailArticle.tsx";

const location: LocationInput = { label: "Test", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
const sky = { location, generatedAt: "2026-09-14T02:00:00Z", positions: [] } as unknown as SkySnapshot;
assert.equal(calendarSkyForDay(sky, "2026-09-13", location), sky, "Use the civil date, not the UTC date.");
assert.equal(calendarSkyForDay(sky, "2026-09-14", location), null);
assert.equal(calendarSkyForDay(sky, "2026-09-13", { ...location, timeZone: "Europe/London" }), null);
assert.equal(calendarSkyForDay(sky, "2026-09-13", { ...location, latitude: 42 }), null);
assert.equal(calendarSkyForDay({ ...sky, generatedAt: "invalid" }, "2026-09-13", location), null);
assert.equal(calendarSkyForDay(null, "2026-09-13", location), null);
const draft = { glyph: "", kicker: "", title: "Moon article", meta: "", body: ["Opening sentence preserved.", "Closing sentence preserved."] } satisfies SkyDetail;
const render = (article: SkyDetail | null, extras = {}) => renderToStaticMarkup(React.createElement(CalendarDayReading, {
  dateKey: "2026-09-13", overview: React.createElement("p", null, "Calculated overview."), moonSign: "Libra",
  article, skyError: false, contentStatus: "ready", ...extras
}));
assert.match(render(draft), /Opening sentence preserved\.<\/p><p>Closing sentence preserved\./u);
const structured = render({ ...draft, body: [], sections: [{ heading: "", body: "First full paragraph.\n\nFinal full paragraph.", role: "main" }, { heading: "Aspect", body: "Separate aspect copy.", role: "aspect" }], closingCharge: "Closing charge preserved." });
for (const copy of ["First full paragraph.", "Final full paragraph.", "Closing charge preserved."]) assert.ok(structured.includes(copy));
assert.ok(!structured.includes("Separate aspect copy."));
assert.match(render(null, { overview: null, contentStatus: "loading" }), /Loading day overview/u);
assert.match(render(null, { overview: null, skyError: true }), /Day overview could not be loaded/u);
const calendar = readFileSync("apps/web/src/features/calendar/LunarCalendar.tsx", "utf8");
assert.ok(calendar.indexOf("selectedDayReading?.content") < calendar.indexOf('id="lunar-selected-exact-heading"'));
assert.ok(!calendar.includes("selectedPackageWeeklyMoon"));
assert.ok(calendar.includes("renderWeeklyMoon({"), "The Week renderer remains intact.");
console.log("Calendar day reading: date/location boundary, complete article, section ordering, loading and empty states passed.");
