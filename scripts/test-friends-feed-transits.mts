import assert from "node:assert/strict";
import { createServer } from "vite";
import SwissEph from "swisseph-wasm";
import { friendsFeedExactToday, groupFriendsFeedCards, selectFriendsFeedTransits } from "../apps/web/src/features/friends/friendsFeedTransits.ts";

const at = "2026-10-25T16:00:00Z", zone = "America/New_York";
const ongoing = Array.from({ length: 5 }, (_, i) => ({ id: `ongoing-${i}` }));
const exact = Array.from({ length: 6 }, (_, i) => ({ id: `exact-${i}`, dailyPeak: { exactToday: ["2026-10-25T04:01:00Z"] } }));
assert.deepEqual(selectFriendsFeedTransits([...ongoing, ...exact]).map(row => row.id), [ongoing[0].id, ...exact.map(row => row.id)], "Keep the strongest ongoing influence even when six Moon events are exact today.");
assert.deepEqual(selectFriendsFeedTransits([...ongoing, exact[0]]).map(row => row.id), [...ongoing.slice(0, 3).map(row => row.id), exact[0].id]);
const base = { friendId: "first-chart", startsAt: "2026-10-20T12:00:00Z", endsAt: "2026-11-01T12:00:00Z", exactAt: [] as string[] };
const main = { ...base, id: "main", priorityIndex: 0 }, moon = { ...base, id: "moon", priorityIndex: 1, exactAt: ["2026-10-26T03:45:00Z"] };
const previous = { ...base, id: "previous", startsAt: "2026-10-24T12:00:00Z" };
const earlyMoon = { ...base, id: "early-moon", priorityIndex: 2, exactAt: ["2026-10-25T11:00:00Z"] };
assert.deepEqual(groupFriendsFeedCards([earlyMoon, previous, main, moon], at, zone), [["Today", [moon, earlyMoon]], ["Yesterday", [previous]], ["Tue, Oct 20", [main]]], "Restore date sections while keeping all exact-today cards visible and astrological priority ahead of clock time.");
assert.deepEqual(friendsFeedExactToday(["2026-10-25T03:59:59Z", "2026-10-25T04:00:00Z", "2026-10-26T03:59:59Z", "2026-10-26T04:00:00Z"], at, zone), ["2026-10-25T04:00:00Z", "2026-10-26T03:59:59Z"]);
const dst = { ...base, id: "dst", exactAt: ["2026-11-02T04:30:00Z"] };
assert.deepEqual(groupFriendsFeedCards([dst], "2026-11-01T17:00:00Z", zone), [["Today", [dst]]], "The 25-hour local day includes an exact aspect after UTC midnight.");

const server = await createServer({ root: "./apps/web", appType: "custom", logLevel: "silent", server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
const swe = new SwissEph();
await swe.initSwissEph();
const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
function longitude(iso: string) {
  const date = new Date(iso);
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600);
  return swe.calc_ut(jd, swe.SE_MOON, swe.SEFLG_SWIEPH)[0];
}
try {
  const { natalDailyTransitPeaksFor, getAstrodienstSky, natalTransitTimingFor } = await server.ssrLoadModule("/src/services/ephemeris.ts");
  const { friendsViewModelDependencies: model } = await server.ssrLoadModule("/src/App.tsx");
  const content = await server.ssrLoadModule("/src/content/fallbackArchitectureV3Runtime.ts");
  await content.loadDeferredFallbackArchitectureV3Bundle();
  const { connectionTransitReading } = await server.ssrLoadModule("/src/features/friends/connectionTransitReading.ts");
  const readings = new Map<string, string>();
  for (const [target, aspect, degrees] of [["Mars", "sextile", 60], ["Sun", "sextile", 60], ["Mars", "square", 90]] as const) {
    const transit = { id: `moon-${aspect}-${target.toLowerCase()}`, transitPlanet: "Moon", transitSign: "Aries", natalPoint: target,
      aspect, aspectDegrees: degrees, orb: "0° 00′", term: "short", direction: "applying", currentSpeed: 13, timeZone: zone };
    const section = model.normalizePersonalTransitSurface(transit, at, "Synthetic Friend").sections.find((section: { slot: string }) => section.slot === "meaning");
    assert(section, `${target} ${aspect}: an existing personal reading exists`);
    const reading = connectionTransitReading({ transiting: "moon", natal: target.toLowerCase(), aspect, voice: "Synthetic Friend",
      window: model.personalTransitPackageWindow(transit, at) }, content.transitV3AuthoredCardForContentKey, section.sourceKeys);
    assert(reading, "The selected source belongs to the same ordered planet pair and exact or licensed matching aspect family.");
    assert.equal(section.body, reading.body, "The complete existing approved friend passage reaches the person-focused feed unchanged.");
    readings.set(`${target}:${aspect}`, reading.body);
  }
  assert.notEqual(readings.get("Mars:sextile"), readings.get("Sun:sextile"), "Moon–Mars and Moon–Sun never share one generic Moon passage.");
  assert.notEqual(readings.get("Mars:sextile"), readings.get("Mars:square"), "A soft and hard aspect to the same natal point keep their own existing meanings.");
  for (const [eventAt, reference] of [
    ["2026-10-25T04:01:00Z", at],
    ["2026-10-26T03:59:00Z", at],
    ["2026-10-25T04:01:00Z", "2026-10-26T03:00:00Z"],
    ["2026-03-09T03:30:00Z", "2026-03-08T16:00:00Z"],
    ["2026-11-02T04:30:00Z", "2026-11-01T17:00:00Z"]
  ]) {
    const target = longitude(eventAt);
    const peaks = await natalDailyTransitPeaksFor(["Moon"], [{ planet: "Sun", longitude: target }], reference, zone);
    const peak = peaks.find((row: { id: string }) => row.id === "moon-conjunction-sun");
    assert(peak?.exactToday.length, `${eventAt}: full-day exact event is found`);
    assert(Math.abs(Date.parse(peak.exactToday[0]) - Date.parse(eventAt)) < 2000, "Production search agrees with independently calculated Swiss position.");
    assert.equal(peak.exactPosition.sign, signs[Math.floor(target / 30)]);
    const snapshot = await getAstrodienstSky({ label: "Synthetic", latitude: 0, longitude: 0, timeZone: zone }, new Date(reference), { includeDailyEvents: false, includeTransitWindows: false });
    const natal = { ...snapshot, birthTimeKnown: false, positions: [{ planet: "Sun", sign: signs[Math.floor(target / 30)], degree: target % 30, longitude: target, glyph: "☉" }] };
    const chart = { id: "synthetic", birthDate: "1990-01-01", birthTimeUnknown: true, natalChart: natal };
    const baseline = model.rankedFriendTransits(snapshot, chart, 0);
    const found = model.rankedFriendTransits(snapshot, chart, 0, peaks).find((row: { id: string }) => row.id === peak.id);
    assert(found, "Exact event outside the snapshot gate survives the Friends candidate builder.");
    if (peak.orbDegrees > 5) assert(!baseline.some((row: { id: string }) => row.id === peak.id), "Regression exercises the old missing-event boundary.");
    assert.equal(found.transitSign, signs[Math.floor(target / 30)]);
    const timing = await natalTransitTimingFor("Moon", target, peak.exactToday[0], { aspectDegrees: 0, presentationDegrees: 5, timeZone: zone });
    assert(timing?.exactPasses.some((pass: { exactAt: string }) => Math.abs(Date.parse(pass.exactAt) - Date.parse(eventAt)) < 2000), "Series search must be anchored on the event even when it is outside the snapshot orb.");
    const normalized = model.normalizePersonalTransitSurface({ ...found, timing }, reference, "Synthetic Friend");
    assert(normalized.sections.some((section: { body: string }) => section.body.trim()), "Matching existing friend-voice prose reaches the feed payload.");
  }
  const upcoming = "2026-10-25T16:11:00Z";
  const beforePeak = await natalDailyTransitPeaksFor(["Moon"], [{ planet: "Sun", longitude: longitude(upcoming) }], at, zone);
  assert.equal(beforePeak.find((peak: { id: string }) => peak.id === "moon-conjunction-sun")?.direction, "applying", "A peak in 11 minutes is applying, even when the orb grows again by an hour later.");
  console.log("Friends feed: strongest ongoing influence and all exact events retained, original date sections, rank before clock time, full civil day, midnight/DST, five independent Swiss references, sign ingress, series timing and existing friend prose passed.");
} finally { await server.close(); }
