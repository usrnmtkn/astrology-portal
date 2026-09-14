import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import SwissEph from "swisseph-wasm";

const vite = await createServer({
  root: path.join(process.cwd(), "apps/web"), appType: "custom", logLevel: "silent", server: { middlewareMode: true },
  plugins: [{ name: "placement-date-test-exports", enforce: "pre", transform(code, id) {
    if (id.endsWith("/src/App.tsx")) return code + "\nexport { placementTransitRangeLabel, formatPlacementTransitEndpoint, formatTransitRange, currentSkyPlacementDetailArticle };";
    if (id.includes("/fallbackArchitectureV3/authored-inputs/") && id.endsWith(".json?url")) {
      return `export default ${fs.readFileSync(id.slice(0, -4), "utf8")};`;
    }
  } }]
});
const swe = new SwissEph();
await swe.initSwissEph();
function sunSign(date: Date) {
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour);
  return Math.floor(swe.calc_ut(jd, swe.SE_SUN, swe.SEFLG_SWIEPH)[0] / 30);
}
try {
  const app = await vite.ssrLoadModule("/src/App.tsx");
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const runtime = await vite.ssrLoadModule("/src/content/fallbackArchitectureV3Runtime.ts");
  await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
  for (const [date, signIndex] of [["2026-09-12T12:00:00Z", 5], ["2027-01-12T12:00:00Z", 9]] as const) {
    const snapshot = await ephemeris.getAstrodienstSky(ephemeris.defaultLocation, new Date(date), { includeTransitWindows: true });
    const sun = snapshot.positions.find((position: { planet: string }) => position.planet === "Sun");
    const start = new Date(sun.transitStart), end = new Date(sun.transitEnd);
    for (const [boundary, before, after] of [[start, (signIndex + 11) % 12, signIndex], [end, signIndex, (signIndex + 1) % 12]] as const) {
      assert.equal(sunSign(new Date(boundary.getTime() - 60_000)), before);
      assert.equal(sunSign(new Date(boundary.getTime() + 60_000)), after);
    }
    for (const timeZone of ["America/New_York", "UTC", "Asia/Tokyo"]) {
      const position = { ...sun, transitTimeZone: timeZone };
      const full = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone });
      const entry = full.format(start), exit = full.format(end);
      assert.equal(app.formatPlacementTransitEndpoint(position, start, true), entry);
      assert.equal(app.formatPlacementTransitEndpoint(position, end, true), exit);
      const range = app.placementTransitRangeLabel(position, date);
      const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone });
      assert.ok(range.startsWith(short.format(start)), `${timeZone}: ${range} must start with ${entry}`);
      assert.ok(range.includes(short.format(end)), `${timeZone}: ${range} must end with ${exit}`);
      const article = app.currentSkyPlacementDetailArticle({ position, positions: [position], aspects: [], generatedAt: date, generatedContent: new Map() });
      const sameYear = entry.slice(-4) === exit.slice(-4);
      assert.equal(article.duration, `${sameYear ? entry.replace(/, \d{4}$/, "") : entry} to ${exit}`);
      console.log(`${date} ${timeZone}: ${start.toISOString()} / ${end.toISOString()} -> ${range}; ${article.duration}`);
    }
  }
  // Local calendar boundaries must govern compression, year labels, and same-day times too.
  const ny = { transitTimeZone: "America/New_York" };
  for (const [start, end, expected] of [
    ["2026-09-01T01:00:00Z", "2026-09-02T01:00:00Z", "Aug 31 - Sep 1"],
    ["2027-01-01T01:00:00Z", "2027-01-02T01:00:00Z", "Dec 31, 2026 - Jan 1, 2027"],
    ["2026-09-12T01:00:00Z", "2026-09-12T03:00:00Z", "Sep 11 · 9 PM - 11 PM"],
    ["2026-09-12T01:00:00Z", "2026-09-15T01:00:00Z", "Sep 11 - 14"]
  ]) assert.equal(app.formatTransitRange(new Date(start), new Date(end), ny, new Date("2026-09-12T12:00:00Z")), expected);
  console.log("PASS: placement card/article dates agree across two calculated Sun transits and three time zones; direct Swiss boundary and local calendar regressions passed.");
} finally {
  await vite.close();
  swe.close();
}
