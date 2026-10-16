import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import SwissEph from "swisseph-wasm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const server = await createServer({ root: `${process.cwd()}/apps/web`, server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, appType: "custom", logLevel: "silent",
  plugins: [{ name: "daily-contact-test-exports", enforce: "pre", transform(code, id) {
    if (id.endsWith("/src/App.tsx")) return `${code}\nexport { buildNatalTransitItems, groupPersonalTransitContacts, natalTransitTargets, personalTransitLongitude };`;
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
  // Approved Lilith soft writing needs real calculated candidates to reach the
  // renderer. Derive fixed natal targets from independent Swiss Moon positions.
  for (const [eventAt, reference, angle, aspect] of [
    ["2026-03-09T03:30:00Z", "2026-03-08T16:00:00Z", 120, "trine"],
    ["2026-11-02T04:30:00Z", "2026-11-01T17:00:00Z", 60, "sextile"]
  ]) {
    const natalLongitude = ((longitude("Moon", eventAt) - angle) % 360 + 360) % 360;
    const peaks = await ephemeris.natalDailyTransitPeaksFor(["Moon"], [{ planet: "Lilith", longitude: natalLongitude }], reference, "America/New_York");
    const found = peaks.find(item => item.id === `moon-${aspect}-lilith`);
    assert.ok(found?.exactToday.length, `Lilith ${aspect} must be calculated for approved-source selection`);
    assert(Math.abs(Date.parse(found.exactToday[0]) - Date.parse(eventAt)) < 2000);
    assert.equal(peaks.some(item => item.id === 'moon-square-lilith'), false);
  }
  // Non-exact approved soft contacts must pass the same app orb gate as exacts.
  for (const [eventAt, reference, aspect, angle, direction] of [
    ["2026-03-09T00:30:00Z", "2026-03-08T23:30:00Z", "trine", 120, "applying"],
    ["2026-11-01T23:30:00Z", "2026-11-02T00:30:00Z", "sextile", 60, "separating"]
  ]) {
    const natalLongitude = ((longitude("Moon", eventAt) - angle) % 360 + 360) % 360;
    const peaks = await ephemeris.natalDailyTransitPeaksFor(["Moon"], [{ planet: "Lilith", longitude: natalLongitude }], reference, "UTC");
    const found = peaks.find(item => item.id === `moon-${aspect}-lilith`);
    assert.equal(found.exactToday.length, 0);
    assert.equal(found.direction, direction);
    assert(found.orbDegrees < 1);
    assert.notEqual(daily.personalDailyPriority(found), null);
    const sky = await ephemeris.getAstrodienstSky({ label: "Synthetic", latitude: 0, longitude: 0, timeZone: "UTC" }, new Date(reference));
    const target = { planet: "Lilith", longitude: natalLongitude, sign: "Aries", degree: 0, glyph: "" };
    assert(app.buildNatalTransitItems(sky.positions.filter(p => p.planet === "Moon"), [target], 0, "UTC", peaks).some(item => item.id === found.id),
      `The app must retain ${direction} Lilith ${aspect} contacts without an exact-today bypass`);
    const squareTarget = { ...target, longitude: ((longitude("Moon", reference) - 90) % 360 + 360) % 360 };
    assert.equal(app.buildNatalTransitItems(sky.positions.filter(p => p.planet === "Moon"), [squareTarget], 0, "UTC").length, 0);
  }
  // Full calculated rankings explain the recovery fixture's selected-day change.
  const birthLocation = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
  const natalSky = await ephemeris.getAstrodienstSky(birthLocation, new Date("1990-01-02T17:00:00Z"));
  const targets = app.natalTransitTargets(natalSky, true);
  const mc = targets.find(point => point.planet === "Midheaven");
  const ic = targets.find(point => point.planet === "Imum Coeli");
  assert(mc && ic, "Both readers must receive calculated MC/IC targets, not only Studio's natal-point selector.");
  assert(Math.abs(app.personalTransitLongitude(mc) - natalSky.midheavenLongitude) < 1e-9);
  assert(Math.abs(app.personalTransitLongitude(ic) - (natalSky.midheavenLongitude + 180) % 360) < 1e-9);
  const angleNames = ["Ascendant", "Descendant", "Midheaven", "Imum Coeli"];
  assert.equal(app.natalTransitTargets(natalSky, false).filter(point => angleNames.includes(point.planet)).length, 0,
    "Unknown birth time must never manufacture usable angle contacts.");
  assert.equal(app.natalTransitTargets({ ...natalSky, midheavenLongitude: undefined }, true)
    .some(point => ["Midheaven", "Imum Coeli"].includes(point.planet)), false);
  const syntheticMoonAtMc = { ...natalSky.positions.find(point => point.planet === "Moon"),
    longitude: natalSky.midheavenLongitude, speed: 13 };
  const angleContacts = app.buildNatalTransitItems([syntheticMoonAtMc], [mc, ic], 0, "UTC");
  assert(angleContacts.some(contact => contact.id === "moon-conjunction-midheaven"));
  assert(angleContacts.some(contact => contact.id === "moon-opposition-imum-coeli"));
  assert.equal(app.groupPersonalTransitContacts(angleContacts).length, 1, "MC/IC stays one ranked axis slot.");
  for (const [location, reference, expected] of [
    [birthLocation, "2027-12-07T17:00:00Z", ["moon-square-jupiter", "moon-square-uranus", "moon-sextile-venus", "moon-trine-lilith", "lilith-square-pluto"]],
    [{ label: "Honolulu, HI", latitude: 21.3069, longitude: -157.8583, timeZone: "Pacific/Honolulu" }, "2027-12-07T22:00:00Z", ["moon-square-jupiter", "moon-square-uranus", "moon-sextile-venus", "lilith-square-pluto"]]
  ]) {
    const sky = await ephemeris.getAstrodienstSky(location, new Date(reference));
    const peaks = await ephemeris.natalDailyTransitPeaksFor(sky.positions.map(p => p.planet), targets.map(p => ({ planet: p.planet, longitude: app.personalTransitLongitude(p) })), reference, location.timeZone);
    const contacts = app.buildNatalTransitItems(sky.positions, targets, 0, location.timeZone, peaks)
      .filter(item => daily.personalDailyPriority(item.dailyPeak) !== null).sort(daily.comparePersonalDailyTransits);
    const grouped = app.groupPersonalTransitContacts(contacts);
    assert.deepEqual(grouped.slice(0, expected.length).map(group => group[0].id), expected);
    const selected = grouped.slice(0, 4).flat().map(item => item.id);
    assert.equal(selected.includes("lilith-square-pluto"), location.timeZone === "Pacific/Honolulu");
    assert.equal(selected.includes("moon-trine-lilith"), location.timeZone === "America/New_York");
    assert.equal(grouped.slice(0, 4).length, 4);
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
  // Go through the actual App adapter, not a helper-only selection test. Each
  // synthetic natal target is derived from Swiss Moon longitude for that date.
  // These are isolated routing fixtures, not owner charts or ranked-live proof.
  const identities = JSON.parse(readFileSync("tests/fixtures/moon-transit-legacy-identities.json", "utf8"));
  const runtime = await server.ssrLoadModule("/src/content/fallbackArchitectureV3Runtime.ts");
  const { acceptedOwnerApprovedTransitSections } = await server.ssrLoadModule("/src/features/friends/transitDetailApproval.ts");
  const fixtureRows = identities.map(({ contentKey }) => ({
    contentKey, content_role: "full_copy", review_status: "approved", reader_only: true,
    render_policy: "personal-transit-exact-v1", headline: "Synthetic Moon reading",
    approval: { approvalLevel: "exact_owner_approved", recordPath: "qa://moon-reader-adapter",
      payloadSha256: "a".repeat(64), approvedAt: "2026-10-15T22:00:00.000Z" },
    body_you: `Complete synthetic You passage ${contentKey}.\n\nYou final sentence.`,
    body_they: `Complete synthetic Friend passage ${contentKey}.\n\nFriend final sentence.`
  }));
  const originals = JSON.stringify(fixtureRows);
  runtime.installPersonalTransitFallbackArchitectureV3Bundle({ transitLib: { authoredCards: fixtureRows },
    templatesFile: { templates: [] }, rowsFile: { hookRows: [], vocabularyRows: [] } });
  const normalize = app.friendsViewModelDependencies.normalizePersonalTransitSurface;
  const pointNames = { ascendant: "Ascendant", chiron: "Chiron", jupiter: "Jupiter", mercury: "Mercury", sun: "Sun",
    moon: "Moon", venus: "Venus", mars: "Mars", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto",
    midheaven: "Midheaven" };
  const reached = new Map([["you", new Set()], ["Fixture Friend", new Set()]]);
  const syntheticPosition = (planet, value) => ({ planet, longitude: value,
    sign: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"][Math.floor(value / 30)],
    degree: value % 30 });
  for (let offset = 0; offset < 366 && [...reached.values()].some(keys => keys.size < identities.length); offset++) {
    const date = daily.shiftPersonalDateKey("2026-01-01", offset);
    const instant = `${date}T17:00:00Z`;
    const moonLongitude = longitude("Moon", instant);
    for (const natal of new Set(identities.map(row => row.natal))) {
      assert(pointNames[natal], `Missing canonical fixture point ${natal}`);
      for (const [aspect, angle] of [["conjunction", 0], ["sextile", 60], ["square", 90], ["trine", 120], ["opposition", 180]]) {
        const targetLongitude = (moonLongitude - angle + 360) % 360;
        const contacts = app.buildNatalTransitItems(
          [{ ...syntheticPosition("Moon", moonLongitude), speed: 13 }],
          [syntheticPosition(pointNames[natal], targetLongitude)], 0, "America/New_York");
        const contact = contacts.find(item => item.aspect === aspect);
        assert(contact, `Calculated fixture contact missing: ${natal}/${aspect}`);
        for (const [voice, keys] of reached) {
          const reference = voice === "you" ? date : instant;
          const reading = normalize({ ...contact, reportWindowLabel: "Until October 31, 2026" }, reference, voice);
          const section = reading.sections.find(item => fixtureRows.some(row => item.sourceKeys.includes(row.contentKey)));
          if (!section) continue; // The ordinary unvaried source is also eligible.
          if (voice !== "you") assert(acceptedOwnerApprovedTransitSections(reading.sections,
            runtime.fallbackV3ApprovalLevelForContentKey).includes(section), "The actual Friends approval filter must retain the selected source.");
          const source = fixtureRows.find(row => section.sourceKeys.includes(row.contentKey));
          assert.equal(section.body, voice === "you" ? source.body_you : source.body_they);
          assert.deepEqual(normalize({ ...contact, reportWindowLabel: "Until October 31, 2026" }, reference, voice), reading,
            "Opening the same contact again must preserve its complete source.");
          keys.add(source.contentKey);
        }
      }
    }
  }
  for (const [voice, keys] of reached) assert.deepEqual(identities.filter(row => !keys.has(row.contentKey)), [],
    `${voice}: all 60 sources, including aliases, must pass through the real App adapter.`);
  assert.equal(JSON.stringify(fixtureRows), originals, "Reader resolution cannot rewrite any passage.");
  runtime.installPersonalTransitFallbackArchitectureV3Bundle(null);
  console.log("Personal daily transits passed: peak/applying/recent ranking, axis grouping, precise orbs, direct Swiss full-day contacts, DST, midnight, year/zone boundaries, retrograde passes and report handoff.");
} finally { await server.close(); }
