import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import bank from "../apps/admin/src/skySummarySourceBank.json";
import { suppliedSkySummaryCandidate, skySummaryCandidateReceipt } from "../apps/admin/src/skySummarySourceBank.ts";
import { skyDailySummaryFields, skySummarySigns, skySummaryTemplateErrors } from "../apps/web/src/content/skyDailySummaryCatalog.ts";
import { skyDailySummaryParts } from "../apps/web/src/content/skyDailySummary.ts";
import { moonEventNames, type MoonSummaryKind } from "../apps/web/src/content/skyMoonSummary.ts";
import { pairedSummarySign, validSummaryGeometry } from "../apps/web/src/content/skySummaryGeometry.ts";
import { skySummaryEventPlacements } from "../apps/web/src/content/skySummaryEventPlacements.ts";
import { getAstrodienstSky } from "../apps/web/src/services/ephemeris.ts";
const sha = (body: string) => createHash("sha256").update(body).digest("hex");
assert.equal(sha(readFileSync(new URL("../docs/content-review/sky-summary-source-bank-v1.json", import.meta.url), "utf8")), bank.provenance.sourceSha256);
const original = JSON.parse(readFileSync(new URL("../docs/content-review/sky-summary-source-bank-v1.json", import.meta.url), "utf8"));
assert.equal(bank.rows.length, 72);
assert.equal(new Set(bank.rows.map(row => row.key)).size, 72);
assert.equal(bank.provenance.promotionAuthorized, false);
assert.equal(suppliedSkySummaryCandidate("cms/sky-daily-summary/sun/virgo", bank), undefined);
for (const row of bank.rows) {
  assert.equal(row.body, original.records.find((record: any) => record.key === row.sourceKey).text);
  assert.ok(skyDailySummaryFields.some(field => field.key === row.key), row.key);
  assert.equal(sha(row.body), row.sha256);
  assert.equal(row.body.split(/\s+/u).length, row.wordCount);
  assert.deepEqual(skySummaryTemplateErrors(row.key, row.body), []);
  assert.equal(skySummaryCandidateReceipt(row.key, row.body + " changed", bank), undefined);
}
// Model the private owner-review preview, never loading this bank in the reader.
const preview = new Map(bank.rows.map(row => [row.key, { id: row.key, body: row.body, status: "LIVE", updatedAt: "" }]));
let count = 0;
for (const kind of Object.keys(moonEventNames) as MoonSummaryKind[]) for (const sun of skySummarySigns) {
  const moons = kind === "regular" ? skySummarySigns : [pairedSummarySign(sun, kind)];
  for (const moon of moons) {
    assert.ok(validSummaryGeometry(sun, moon, kind));
    const event = kind === "regular" ? undefined : { sun: { sign: sun, degree: 12 }, name: moonEventNames[kind], sign: moon, degree: 12, countdown: "today", isToday: true, eclipseType: kind === "solarEclipse" ? "solar" as const : kind === "lunarEclipse" ? "lunar" as const : undefined };
    const parts = skyDailySummaryParts({ sun: { sign: sun, degree: 12 }, moon: { sign: moon, degree: 12 }, moonIsVoid: false, event }, preview, { editorialPreview: true });
    const text = parts.map(part => part.text).join("");
    assert.ok(!/[{}]|undefined/u.test(text));
    assert.equal(parts.filter(part => part.sourceKey?.includes("/moon/")).length, 1);
    for (const part of parts.filter(part => part.sourceKey)) assert.equal(part.text, bank.rows.find(row => row.key === part.sourceKey)!.body);
    if (sun === moon) assert.equal(text.split(sun).length - 1, 1, text);
    assert.equal(parts.filter(part => part.action === (kind === "regular" ? "moon" : "lunation")).length, 1);
    count++;
  }
}
assert.equal(count, 192);
assert.ok(!validSummaryGeometry("Virgo", "Cancer", "newMoon"));
assert.throws(() => skyDailySummaryParts({ sun: { sign: "Virgo" }, moon: { sign: "Cancer" }, moonIsVoid: false,
  event: { name: "New Moon", sign: "Cancer", sun: { sign: "Virgo" }, isToday: true, countdown: "today" } }), /IMPOSSIBLE_SKY/);
const pending = skyDailySummaryParts({ sun: { sign: "Virgo" }, moon: { sign: "Cancer" }, moonIsVoid: false,
 event: { name: "New Moon", sign: "Virgo", isToday: true, placementsPending: true, countdown: "today" } });
assert.ok(pending.some(part => part.action === "moon"));
assert.ok(pending.map(part => part.text).join("").includes("New Moon in Virgo is exact today"));
// Actual Swiss Ephemeris event-time inputs on two separate lunations.
const location = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
for (const anchor of ["2026-09-07T12:00:00Z", "2026-09-20T12:00:00Z"]) {
  const daySky = await getAstrodienstSky(location, new Date(anchor), { includeTransitWindows: false });
  const event = daySky.moonEvent!;
  const exact = await getAstrodienstSky(location, new Date(event.occursAt), { includeTransitWindows: false });
  const { sun, moon } = skySummaryEventPlacements(event, exact.positions);
  assert.equal(sun.longitude, exact.positions.find(p => p.planet === "Sun")!.longitude);
  assert.equal(moon.sign, event.sign);
  const parts = skyDailySummaryParts({ sun: { sign: "Aquarius", degree: 1 }, moon: { sign: "Leo", degree: 2 }, moonIsVoid: false,
    event: { ...event, sun, sign: moon.sign, degree: moon.degree, isToday: true, countdown: "today" } });
  assert.ok(parts.some(part => part.action === "sun" && part.text.includes(sun.sign) && part.text.includes(`${Math.floor(sun.degree)}°`)));
  assert.throws(() => skySummaryEventPlacements({ ...event, sign: "invalid" }, exact.positions), /IMPOSSIBLE_SKY/);
}
console.log("Sky source bank: 72 exact candidates, 192 valid combinations, protected current copy, invalid geometry, and two Swiss event-time pairs passed.");
