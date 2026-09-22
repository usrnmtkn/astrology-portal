import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createServer } from "vite";
import SwissEph from "swisseph-wasm";

// Baseline mode reproduces the regression against the branch's unmodified base.
const baseline = process.env.TLDR_DATE_BASELINE === "1";
const vite = await createServer({
  root: path.join(process.cwd(), "apps/web"), appType: "custom", logLevel: "silent", server: { middlewareMode: true },
  plugins: [{ name: "event-date-test-exports", enforce: "pre", transform(input, id) {
    let code = input;
    if (baseline && /\/src\/(?:App\.tsx|services\/ephemeris\.ts|features\/calendar\/(?:seasonWindow|lunarDayResolver)\.ts)$/.test(id)) {
      code = execFileSync("git", ["show", `HEAD:${path.relative(process.cwd(), id)}`], { encoding: "utf8" });
    }
    if (id.endsWith("/src/App.tsx")) return code + "\nexport { formatCountdown, transitItemTimingDisplay, formatPlacementTransitEndpoint, formatEditorialDateRange, formatEditorialTime, personalTransitPackageWindow, transitItemActivationTimingWindow, skyPlacementAspectExactDate, skyPlacementEgressDateLabel };";
    if (id.endsWith("/src/features/calendar/LunarCalendar.tsx")) return code + "\nexport { monthAnchorFromDateKey, calendarStorageKey };";
    if (id.includes("/fallbackArchitectureV3/authored-inputs/") && id.endsWith(".json?url")) return `export default ${fs.readFileSync(id.slice(0, -4), "utf8")};`;
    return code;
  } }]
});
const swe = new SwissEph();
await swe.initSwissEph();
function directSunSign(iso: string, offset: number) {
  const date = new Date(Date.parse(iso) + offset);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour);
  return Math.floor(swe.calc_ut(jd, swe.SE_SUN, swe.SEFLG_SWIEPH)[0] / 30);
}
try {
  const app = await vite.ssrLoadModule("/src/App.tsx");
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const { sunIngressSeasonWindow, sunIngressSeasonSign } = await vite.ssrLoadModule("/src/features/calendar/seasonWindow.ts");
  const { resolveLunarDay } = await vite.ssrLoadModule("/src/features/calendar/lunarDayResolver.ts");
  const calendarUi = await vite.ssrLoadModule("/src/features/calendar/LunarCalendar.tsx");
  const { skySunTransition } = await vite.ssrLoadModule("/src/content/skySunTransition.ts");
  const zones = ["America/New_York", "UTC", "Asia/Tokyo"];
  for (const [dateKey, signIndex] of [["2026-09-14", 5], ["2027-01-12", 9]] as const) {
    for (const timeZone of zones) {
      const location = { label: "Test location", latitude: 40.7, longitude: -74, timeZone };
      const anchor = new Date(`${dateKey}T12:00:00Z`);
      const sky = await ephemeris.getAstrodienstSky(location, anchor, { includeTransitWindows: true });
      const sun = sky.positions.find((position: any) => position.planet === "Sun");
      const calendar = await ephemeris.getLunarCalendarWeek(location, anchor);
      const season = sunIngressSeasonWindow(dateKey, calendar.events);
      const civil = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
      const minute = new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "full", timeStyle: "short" });
      assert.ok(season, "The seven-day feed must include both calculated solar boundaries.");
      assert.equal(season.start, civil.format(new Date(sun.transitStart)), `${dateKey} ${timeZone}: Calendar entry must match Sky`);
      assert.equal(season.end, civil.format(new Date(sun.transitEnd)), `${dateKey} ${timeZone}: Calendar exit must match Sky`);
      assert.equal(minute.format(new Date(season.startsAt)), minute.format(new Date(sun.transitStart)));
      assert.equal(minute.format(new Date(season.endsAt)), minute.format(new Date(sun.transitEnd)));
      for (const [instant, before, after] of [[season.startsAt, (signIndex + 11) % 12, signIndex], [season.endsAt, signIndex, (signIndex + 1) % 12]] as const) {
        assert.equal(directSunSign(instant, -60_000), before);
        assert.equal(directSunSign(instant, 60_000), after);
      }
      const day = calendar.days.find((item: any) => item.dateKey === dateKey);
      const resolved = resolveLunarDay({ day, events: calendar.events, location, timeZone, arcEnabled: true, generatedContent: new Map() });
      assert.deepEqual(resolved.arc.season, season);
      // No extra off-week ingress may become a movement on a visible day.
      for (const day of calendar.days) assert.ok(day.events.every((event: any) => event.dateKey === day.dateKey));
      const basic = await ephemeris.getLunarCalendarWeek(location, anchor, { detail: "basic" });
      assert.deepEqual(sunIngressSeasonWindow(dateKey, basic.events), season, "First paint and hydrated facts must use the same season.");
      const month = await ephemeris.getLunarCalendarMonth(location, anchor, { detail: "basic" });
      assert.deepEqual(sunIngressSeasonWindow(dateKey, month.events), season, "Month and Day/Week must agree.");
      console.log(`${dateKey} ${timeZone}: ${season.start}–${season.end}, direct Swiss boundaries and Day/Week/Month/Sky agree`);
    }
  }
  for (const timeZone of [...zones, "Pacific/Kiritimati", "Etc/GMT+12"]) {
    const location = { label: "Test", latitude: 40.7, longitude: -74, timeZone };
    const monthAnchor = calendarUi.monthAnchorFromDateKey("2026-09-01", timeZone);
    const month = await ephemeris.getLunarCalendarMonth(location, monthAnchor, { detail: "basic" });
    assert.equal(month.days.filter((day: any) => day.inMonth).length, 30);
    assert.equal(month.days.find((day: any) => day.inMonth).dateKey, "2026-09-01");
  }
  assert.equal(app.formatCountdown("2026-09-14T12:00:00Z", "2026-09-23T00:05:13.999Z", "America/New_York"), "8D left");
  assert.equal(app.formatCountdown("2026-09-14T12:00:00Z", "2026-09-23T00:05:13.999Z", "UTC"), "9D left");
  assert.equal(app.formatCountdown("2026-09-14", "2026-09-23T00:05:13.999Z", "America/New_York"), "8D left");
  assert.equal(sunIngressSeasonWindow("2026-09-14", []), null, "Missing calculated facts must never produce a date-table fallback.");
  assert.equal(sunIngressSeasonSign("2026-09-14", []), null);
  // An ingress date is not an all-day placement. Check both sides of two
  // independently calculated boundaries, including a UTC/local date crossover.
  for (const [anchor, oldSign, newSign] of [
    ["2026-09-22T13:20:00Z", "Virgo", "Libra"],
    ["2026-12-21T12:00:00Z", "Sagittarius", "Capricorn"]
  ]) for (const timeZone of zones) {
    const location = { label: "Test", latitude: 40.7, longitude: -74, timeZone };
    const calendar = await ephemeris.getLunarCalendarWeek(location, new Date(anchor));
    const ingress = calendar.events.find((event: any) => event.planet === "Sun" && event.toSign === newSign);
    assert.ok(ingress);
    const civil = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    for (const [offset, expected] of [[-60_000, oldSign], [60_000, newSign]] as const) {
      const instant = new Date(Date.parse(ingress.startsAt) + offset).toISOString();
      const dateKey = civil.format(new Date(instant));
      const sky = await ephemeris.getAstrodienstSky(location, new Date(instant));
      const sun = sky.positions.find((position: any) => position.planet === "Sun");
      assert.equal(sun.sign, expected);
      const transition = skySunTransition(calendar.events, instant, timeZone);
      assert.equal(transition?.phase, offset < 0 ? 'before' : 'after');
      assert.equal(transition?.fromSign, oldSign);
      assert.equal(transition?.toSign, newSign);
      if (timeZone === 'America/New_York') assert.equal(transition?.time, newSign === 'Libra' ? '8:05 PM EDT' : '3:50 PM EST');
      assert.equal(directSunSign(instant, 0), ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"].indexOf(expected));
      assert.equal(sunIngressSeasonSign(dateKey, calendar.events, sky.generatedAt), expected);
      assert.equal(sunIngressSeasonWindow(dateKey, calendar.events, sky.generatedAt)?.sign, expected);
      const basic = await ephemeris.getLunarCalendarWeek(location, new Date(instant), { detail: "basic" });
      assert.equal(sunIngressSeasonSign(dateKey, basic.events, instant), expected);
      console.log(`${instant} ${timeZone}: current season and Sun both ${expected}; ingress ${ingress.startsAt}`);
    }
    assert.equal(sunIngressSeasonSign(ingress.dateKey, calendar.events, ingress.startsAt), newSign, "Exact ingress starts the next season.");
    assert.equal(sunIngressSeasonSign(ingress.dateKey, calendar.events, "invalid"), null);
    assert.equal(sunIngressSeasonSign(ingress.dateKey, calendar.events), newSign, "Date-based editorial arcs retain their event-day scope.");
  }
  for (const [start, end, expected] of [
    ["2026-09-01T01:00:00Z", "2026-09-02T01:00:00Z", "Aug 31 - Sep 1"],
    ["2027-01-01T01:00:00Z", "2027-01-02T01:00:00Z", "Dec 31, 2026 - Jan 1, 2027"],
    ["2026-09-12T01:00:00Z", "2026-09-12T03:00:00Z", "Sep 11 · 9 PM - 11 PM"],
    ["2026-03-08T06:30:00Z", "2026-03-08T07:30:00Z", "Mar 8 · 1:30 AM - 3:30 AM"],
    ["2026-11-01T05:30:00Z", "2026-11-01T07:30:00Z", "Nov 1 · 1:30 AM - 2:30 AM"]
  ]) assert.equal(app.formatEditorialDateRange(new Date(start), new Date(end), new Date("2026-09-14T12:00:00Z"), zones[0]), expected);
  const transit = { id: "test", term: "short", transitPlanet: "Sun", aspect: "square", natalPoint: "Neptune", orb: "0°", direction: "applying",
    timeZone: "America/New_York", timing: { engagementStart: "2026-09-12T01:00:00Z", engagementEnd: "2026-09-15T01:00:00Z", timeZone: "America/New_York",
      passIndex: 1, exactPasses: [{ exactAt: "2026-09-13T01:00:00Z" }] } };
  assert.equal(app.transitItemTimingDisplay(transit, "2026-09-12T12:00:00Z").rangeLabel, "Sep 11 - 14");
  assert.equal(app.personalTransitPackageWindow(transit, "2026-09-12T12:00:00Z"), "Until September 14");
  const aspect = { from: "Sun", to: "Mars", type: "sextile", exactAt: "2027-01-01T01:00:00Z", timing: { timeZone: "America/New_York", exactPasses: [{ exactAt: "2027-01-01T01:00:00Z" }], passIndex: 1 } };
  assert.equal(app.skyPlacementAspectExactDate(aspect, "2026-12-30T12:00:00Z"), "December 31");
  assert.equal(app.skyPlacementEgressDateLabel({ transitEnd: "2027-01-01T01:00:00Z", transitTimeZone: "America/New_York" }, "2026-12-30T12:00:00Z"), "December 31");
  console.log("PASS: calculated seasons plus shared event date/time labels across zones, midnight, year rollover, and both DST transitions.");
} finally {
  await vite.close();
  swe.close();
}
