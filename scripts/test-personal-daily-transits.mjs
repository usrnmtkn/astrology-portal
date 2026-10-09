import assert from "node:assert/strict";
import { createServer } from "vite";
import SwissEph from "swisseph-wasm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const server = await createServer({ root: `${process.cwd()}/apps/web`, server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, appType: "custom", logLevel: "silent",
  plugins: [{ name: "daily-contact-test-exports", enforce: "pre", transform(code, id) {
    if (id.endsWith("/src/App.tsx")) return `${code}\nexport { buildNatalTransitItems, groupPersonalTransitContacts };`;
    if (id.endsWith("/src/features/you/YouPage.tsx")) return `${code}\nexport { YouTransitArticlePage };`;
  } }]
});
const swe = new SwissEph();
await swe.initSwissEph();
function longitude(planet, iso) {
  const d = new Date(iso);
  const jd = swe.julday(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600);
  return swe.calc_ut(jd, swe[`SE_${planet.toUpperCase()}`], swe.SEFLG_SWIEPH)[0];
}
try {
  const daily = await server.ssrLoadModule("/src/services/personalDailyTransits.ts");
  const ephemeris = await server.ssrLoadModule("/src/services/ephemeris.ts");
  const app = await server.ssrLoadModule("/src/App.tsx");
  const { preparePersonalReportTiming } = await server.ssrLoadModule("/src/services/personalReportTiming.ts");
  const referenceAt = "2026-10-09T16:00:00Z";
  const base = { id: "test", referenceAt, dateKey: "2026-10-09", timeZone: "America/New_York", orbDegrees: 0.4,
    direction: "applying", exactToday: [], previousExactAt: null, nextExactAt: "2026-10-12T12:00:00Z" };
  const peak = patch => ({ ...base, ...patch });
  assert.equal(daily.personalDailyPriority(peak({ exactToday: ["2026-10-10T02:00:00Z"], orbDegrees: 7 })), 0);
  assert.equal(daily.personalDailyPriority(base), 1);
  assert.equal(daily.personalDailyPriority(peak({ orbDegrees: 1.001 })), null);
  assert.equal(daily.personalDailyPriority(peak({ direction: "separating", previousExactAt: "2026-10-08T04:01:00Z" })), 2);
  assert.equal(daily.personalDailyPriority(peak({ direction: "separating", previousExactAt: "2026-10-01T12:00:00Z" })), null,
    "A close slow contact cannot occupy the daily list throughout a long separating interval.");
  assert.equal(daily.personalDailyPriority(peak({ direction: "stationary" })), null);
  const ordered = [
    { id: "separating", dailyPeak: peak({ direction: "separating", previousExactAt: "2026-10-08T12:00:00Z", orbDegrees: 0.01 }) },
    { id: "applying", dailyPeak: base },
    { id: "exact", dailyPeak: peak({ exactToday: ["2026-10-09T20:00:00Z"], orbDegrees: 4 }) }
  ].sort(daily.comparePersonalDailyTransits);
  assert.deepEqual(ordered.map(item => item.id), ["exact", "applying", "separating"]);
  assert.equal(daily.precisePersonalOrb(0.4), "0° 24′");
  assert.equal(daily.precisePersonalOrb(0.999), "1° 00′");
  assert.equal(daily.precisePersonalOrb(0.0001), "<1′");
  assert.match(daily.personalDailyPeakLabel(peak({ direction: "separating", previousExactAt: "2026-10-08T03:00:00Z" })), /Separating · Exact Oct 7, 2026/);
  for (const [date, hours] of [["2026-03-08", 23], ["2026-11-01", 25]]) {
    const bounds = daily.personalDayBounds(date, "America/New_York");
    assert.equal((bounds.end - bounds.start) / 3_600_000, hours);
  }
  const groups = app.groupPersonalTransitContacts([
    { id: "dsc", transitPlanet: "Saturn", natalPoint: "Descendant", aspect: "trine" },
    { id: "asc", transitPlanet: "Saturn", natalPoint: "Ascendant", aspect: "sextile" },
    { id: "mc", transitPlanet: "Saturn", natalPoint: "Midheaven", aspect: "trine" }
  ]);
  assert.deepEqual(groups.map(group => group.map(item => item.id)), [["asc", "dsc"], ["mc"]]);
  const { YouTransitArticlePage } = await server.ssrLoadModule("/src/features/you/YouPage.tsx");
  const sharedParagraph = "Synthetic shared complete source paragraph.";
  const markup = renderToStaticMarkup(React.createElement(YouTransitArticlePage, { onBack() {}, article: {
    id: "personal-aspect:axis-fixture", title: "Synthetic axis", summary: "", subtitle: "",
    sections: [
      { heading: "First complete unit", body: `${sharedParagraph}\n\nFirst original ending.`, tldr: "" },
      { heading: "Second complete unit", body: `${sharedParagraph}\n\nSecond original ending.`, tldr: "" }
    ], meta: [{ label: "Current contact", value: "Oct 1 - 9" }, { label: "Full transit series", value: "Oct 1 - Dec 9" }]
  } }));
  assert.equal(markup.split(sharedParagraph).length - 1, 2, "Grouping must preserve each complete source unit, including shared paragraphs");
  assert(markup.includes("First original ending.") && markup.includes("Second original ending."));
  assert(markup.includes("Current contact") && markup.includes("Full transit series"), "Both scopes must survive the actual detail renderer");
  const precise = app.buildNatalTransitItems([
    { planet: "Sun", sign: "Libra", degree: 16.7, longitude: 196.7049, speed: 1 }
  ], [{ planet: "Sun", sign: "Libra", degree: 16.71, longitude: 196.7099 }], 0, "UTC")[0];
  assert.equal(precise.natalLongitude, 196.7099, "Peak searches use the stored longitude, not rounded display degrees");

  // Synthetic fixed targets are derived from an independent direct Swiss
  // calculation at known instants, then rediscovered by the production search.
  for (const [eventAt, noon, zone] of [
    ["2026-03-09T03:30:00Z", "2026-03-08T16:00:00Z", "America/New_York"],
    ["2026-11-02T04:30:00Z", "2026-11-01T17:00:00Z", "America/New_York"],
    ["2026-12-31T10:30:00Z", "2026-12-31T22:00:00Z", "Pacific/Honolulu"],
    ["2026-12-31T10:30:00Z", "2026-12-31T22:00:00Z", "Pacific/Kiritimati"]
  ]) {
    const target = longitude("Moon", eventAt);
    const peaks = await ephemeris.natalDailyTransitPeaksFor(["Moon"], [{ planet: "Sun", longitude: target }], noon, zone);
    const found = peaks.find(item => item.id === "moon-conjunction-sun");
    assert.ok(found?.exactToday.length, `${eventAt} must be found across the complete local day`);
    assert(Math.abs(Date.parse(found.exactToday[0]) - Date.parse(eventAt)) < 2000);
    assert(found.orbDegrees > 2, "This case is outside the noon Moon gate");
    const snapshot = await ephemeris.getAstrodienstSky({ label: "Synthetic", latitude: 0, longitude: 0, timeZone: zone }, new Date(noon), { includeDailyEvents: false, includeTransitWindows: false });
    const natal = { planet: "Sun", longitude: target, sign: ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"][Math.floor(target / 30)], degree: target % 30, glyph: "☉" };
    const items = app.buildNatalTransitItems(snapshot.positions.filter(p => p.planet === "Moon"), [natal], 0, zone, peaks);
    const contact = items.find(item => item.id === found.id);
    assert.ok(contact, "Daily exact events outside the noon inventory must reach the rendered data");
    const report = await preparePersonalReportTiming([contact], new Date(noon), zone, ephemeris.natalTransitTimingFor);
    assert.equal(report.qualifyingTransits[0].calculation.exactOnSelectedDay, true);
    assert(Math.abs(Date.parse(report.qualifyingTransits[0].calculation.contactReferenceAt) - Date.parse(eventAt)) < 2000);
  }
  // At midnight a contact belongs exclusively to the next civil date.
  const midnight = "2026-10-10T04:00:00Z";
  const target = longitude("Moon", midnight);
  const before = await ephemeris.natalDailyTransitPeaksFor(["Moon"], [{ planet: "Sun", longitude: target }], referenceAt, "America/New_York");
  assert.equal(before.find(item => item.id === "moon-conjunction-sun")?.exactToday.length ?? 0, 0);
  const after = await ephemeris.natalDailyTransitPeaksFor(["Moon"], [{ planet: "Sun", longitude: target }], "2026-10-10T16:00:00Z", "America/New_York");
  assert.equal(after.find(item => item.id === "moon-conjunction-sun")?.exactToday.length, 1);
  // A real retrograde re-hit is a distinct dated peak; the later return does
  // not relabel the weeks after the first pass as applying.
  for (const [reference, expected] of [["2025-06-20T12:00:00Z", "2025-06-20"], ["2025-08-05T12:00:00Z", "2025-08-05"]]) {
    const peaks = await ephemeris.natalDailyTransitPeaksFor(["Saturn"], [{ planet: "Sun", longitude: 1.5 }], reference, "UTC");
    assert.equal(peaks.find(item => item.id === "saturn-conjunction-sun")?.exactToday[0]?.slice(0, 10), expected);
  }
  console.log("Personal daily transits passed: peak/applying/recent ranking, axis grouping, precise orbs, direct Swiss full-day contacts, DST, midnight, year/zone boundaries, retrograde passes and report handoff.");
} finally { await server.close(); }
