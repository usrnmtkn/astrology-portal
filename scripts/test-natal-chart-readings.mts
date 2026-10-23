import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyHouseCmsKeys, emptyHouseRulerName, emptyHouseRulerSystems } from "../apps/web/src/content/emptyHouseRulership.ts";
import SwissEph from "swisseph-wasm";
import { getAstrodienstSky } from "../apps/web/src/services/ephemeris.ts";
import { natalSnapshotWithBirthTimeReliability } from "../apps/web/src/services/birthTimeReliability.ts";
import { friendSafeNatalChart } from "../apps/web/src/services/friendSafeNatalChart.ts";
import { build } from "esbuild";
const bundled = await build({ entryPoints: ["apps/web/src/content/natalChartReadings.ts"], bundle: true, platform: "node", format: "esm", write: false,
  define: { "import.meta.env": "{}" }, logLevel: "silent", plugins: [{ name: "no-auth-fixture", setup(builder) {
    builder.onLoad({ filter: /[/\\]services[/\\]auth\.ts$/ }, () => ({ contents: "export async function getSupabaseClient(){return null}", loader: "js" }));
  } }] });
const { natalChartReadings, natalReadingBody } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
import { natalSectForSnapshot, natalSectFromAltitude } from "../src/shared/solarHorizon.ts";
import type { LiveGeneratedContent } from "../apps/web/src/services/generatedContent.ts";

const location = { label: "Synthetic natal fixture", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
const swiss = new SwissEph();
await swiss.initSwissEph();
let day: Awaited<ReturnType<typeof getAstrodienstSky>>;
for (const iso of ["1994-04-12T16:00:00Z", "1994-04-12T04:00:00Z", "2000-12-20T16:00:00Z", "2026-06-21T04:00:00Z"]) {
  const date = new Date(iso);
  const sky = natalSnapshotWithBirthTimeReliability(await getAstrodienstSky(location, date, { includeDailyEvents: false }), true)!;
  const jd = swiss.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours());
  const sun = swiss.calc_ut(jd, swiss.SE_SUN, swiss.SEFLG_SWIEPH | swiss.SEFLG_EQUATORIAL);
  // Independently transform equatorial coordinates rather than calling the
  // runtime's Swiss horizontal-coordinate helper as the expected result.
  const radians = Math.PI / 180;
  const latitude = location.latitude * radians;
  const declination = sun[1] * radians;
  const hourAngle = (swiss.sidtime(jd) * 15 + location.longitude - sun[0]) * radians;
  const direct = Math.asin(Math.sin(latitude) * Math.sin(declination)
    + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle)) / radians;
  assert(Math.abs(sky.solarHorizon!.altitude - direct) < 1e-8, `${iso}: Swiss altitude agrees with independent horizontal-coordinate transform`);
  assert.equal(natalSectForSnapshot(sky), iso.includes("T16:") ? "day" : "night");
  if (!day!) day = sky;
}
for (const altitude of [-0.25, 0, 0.25, NaN, Infinity, -91]) assert.equal(natalSectFromAltitude(altitude, true), null);
assert.equal(natalSectFromAltitude(20, false), null);
assert.equal(natalSectForSnapshot({ ...day!, generatedAt: "2026-01-01T00:00:00Z" }), null);
const unknown = natalSnapshotWithBirthTimeReliability(day!, false)!;
assert.equal(unknown.solarHorizon, undefined);
assert.equal(unknown.sharedNatalSect, undefined);
assert.deepEqual(natalChartReadings(unknown, "you"), []);
const shared = friendSafeNatalChart(day!, true)!;
assert.equal(shared.generatedAt, "");
assert.equal(shared.solarHorizon, undefined);
assert.equal(shared.facts, undefined);
assert.equal(natalSectForSnapshot(shared), "day");
assert(!JSON.stringify(shared).includes(day!.generatedAt));

const seen = new Set<string>();
const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
// Scorpio/Aquarius/Pisces must use Mars/Saturn/Jupiter, even when a modern ruler occupies another house.
for (const [ascendant, ruler] of [["Sagittarius", "Mars"], ["Pisces", "Saturn"], ["Aries", "Jupiter"]]) {
  for (let house = 1; house <= 12; house++) for (const audience of ["you", "they"] as const) {
    const rulerSign = signs[(signs.indexOf(ascendant) + house - 1) % 12];
    const snapshot = { ...day!, ascendant, positions: day!.positions.map(position => ({ ...position,
      sign: position.planet === ruler ? rulerSign : ascendant, house: 8 })) };
    const readings = natalChartReadings(snapshot, audience);
    assert(readings.some(reading => reading.contentKey === `cms/natal-twelfth-ruler/${audience}/ruler-house/${house}`));
    readings.forEach(reading => seen.add(reading.contentKey));
    // Occupying the twelfth house does not remove the ruler reading or select an empty-house claim.
    const occupied = { ...snapshot, positions: [...snapshot.positions, { ...snapshot.positions[0], planet: "Moon", sign: signs[(signs.indexOf(ascendant) + 11) % 12] }] };
    assert.deepEqual(natalChartReadings(occupied, audience), readings);
  }
}
for (const sect of ["day", "night"] as const) for (const audience of ["you", "they"] as const) {
  const snapshot = { ...day!, solarHorizon: { ...day!.solarHorizon!, altitude: sect === "day" ? 20 : -20 } };
  natalChartReadings(snapshot, audience).forEach(reading => seen.add(reading.contentKey));
  for (const planet of ["Jupiter", "Venus", "Mars", "Saturn"]) {
    const readings = natalChartReadings(snapshot, audience, planet);
    assert.equal(readings[0].contentKey, `cms/natal-planet-sect/${audience}/${planet.toLowerCase()}/${sect}`);
    readings.forEach(reading => seen.add(reading.contentKey));
  }
  for (const planet of ["Sun", "Moon", "Mercury", "Uranus", "Neptune", "Pluto"]) assert.deepEqual(natalChartReadings(snapshot, audience, planet), []);
}
assert.equal(seen.size, 46, "Every published identity is reachable, with no obsolete context keys");
const text = "{{ownerName}} has a complete opening.\n\nThis paragraph repeats.\n\nThis paragraph repeats.\n\nThe complete final sentence remains.";
const row = { contentKey: "cms/natal-planet-sect/they/saturn/night", body: text, headline: "Saturn", summary: "", sections: {},
  status: "LIVE", lane: "serving", reviewState: null, sourceSnapshot: { contentType: "mustache-template" } } as unknown as LiveGeneratedContent;
assert.equal(natalReadingBody(row, "they", "Robin"), text.replace("{{ownerName}}", "Robin"));
assert.equal(natalReadingBody(row, "they", "Avery"), text.replace("{{ownerName}}", "Avery"));
assert.equal(row.body, text, "Personalization never mutates the stored source");
assert.equal(natalReadingBody(row, "they"), null);
assert.equal(natalReadingBody({ ...row, status: "DRAFT" }, "they", "Robin"), null);
assert.equal(natalReadingBody({ ...row, reviewState: "EDITORIAL_REVIEW_REQUIRED" }, "they", "Robin"), null);
assert.equal(natalReadingBody({ ...row, lane: "reference" }, "they", "Robin"), null);
console.log("PASS direct Swiss altitude at four dates, reliable/unknown/shared sect, all 46 exact identities, occupied twelfth, Hellenistic rulers, complete bodies and name isolation.");

for (const [sign, traditional, modern] of [["Scorpio", "Mars", "Pluto"], ["Aquarius", "Saturn", "Uranus"], ["Pisces", "Jupiter", "Neptune"]]) {
  assert.equal(emptyHouseRulerName(sign), traditional);
  assert.equal(emptyHouseRulerName(sign, "modern"), modern);
  assert.deepEqual(emptyHouseRulerSystems(sign), ["traditional", "modern"]);
  for (const audience of ["you", "they"] as const) {
    const historical = emptyHouseCmsKeys("detail", audience, 12, sign);
    assert(historical.every(key => !emptyHouseCmsKeys("detail", audience, 12, sign, "traditional").includes(key)));
    assert(historical.every(key => emptyHouseCmsKeys("detail", audience, 12, sign, "modern").includes(key)));
  }
}
assert.deepEqual(emptyHouseRulerSystems("Taurus"), ["traditional"]);
if (process.env.NATAL_PUBLISHED_READER_SNAPSHOT) {
  const saved = JSON.parse(readFileSync(process.env.NATAL_PUBLISHED_READER_SNAPSHOT, "utf8"));
  assert.equal(saved.rows.length, 46);
  for (const raw of saved.rows) {
    assert(seen.has(raw.content_key));
    const audience = raw.content_key.includes("/they/") ? "they" : "you";
    const rendered = natalReadingBody({ ...raw, contentKey: raw.content_key, sourceSnapshot: raw.source_snapshot, reviewState: raw.review_state }, audience, "Robin");
    assert.equal(rendered, raw.body.replaceAll("{{ownerName}}", "Robin"), raw.content_key);
  }
  console.log("PASS private opt-in: all 46 complete published bodies survive actual interpolation exactly; no prose written or stored.");
}
