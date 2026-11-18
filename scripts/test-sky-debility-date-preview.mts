import assert from "node:assert/strict";
import { Readable } from "node:stream";
import SwissEph from "swisseph-wasm";
import { getAstrodienstSky, validateSwissEphemerisReturnFlag } from "../apps/web/src/services/ephemeris";
import { DIGNITY_SIGNS, TRADITIONAL_DIGNITY_PLANETS } from "../apps/web/src/services/planetSignDignity.mjs";
import { skyDebilityInterpretationKey } from "../apps/web/src/content/skyDebilityInterpretation";
import { assembleSkyDebilityCopy } from "../apps/web/src/content/skyDebilityAssembly";
import { assembleSkyDebilityDraftPreview, selectSkyDebilityPreviewDraft, skyDebilityPreviewInstant, skyDebilityPreviewRange, verifiedSkyDebilityPreviewPositions } from "../apps/admin/src/skyDebilityDateSelection";
import type { SummaryCompositionRow } from "../apps/admin/src/skySummaryComposition";

const zone = "America/New_York";
const range = skyDebilityPreviewRange(new Date("2026-10-27T04:00:00Z"), zone);
assert.deepEqual(range, { min: "2026-10-27", max: "2027-10-26" });
assert.deepEqual(skyDebilityPreviewRange(new Date("2028-02-29T12:00:00Z"), zone), { min: "2028-02-29", max: "2029-02-27" });
assert.equal(skyDebilityPreviewInstant("2026-11-01", "12:00", zone, range).toISOString(), "2026-11-01T17:00:00.000Z");
assert.equal(skyDebilityPreviewInstant("2027-03-14", "12:00", zone, range).toISOString(), "2027-03-14T16:00:00.000Z");
assert.throws(() => skyDebilityPreviewInstant("2027-03-14", "02:30", zone, range), /does not exist/u);
for (const invalid of ["2026-10-26", "2027-10-27", "2027-02-30", ""]) assert.throws(() => skyDebilityPreviewInstant(invalid, "12:00", zone, range));
const none = ["Aries", "Taurus", "Gemini", "Libra", "Aries", "Sagittarius", "Capricorn"].map((sign, i) => ({ planet: TRADITIONAL_DIGNITY_PLANETS[i], sign, motion: "direct" as const }));
assert.equal(selectSkyDebilityPreviewDraft(none, []).snapshot.count, 0);
assert.equal(assembleSkyDebilityDraftPreview(none, []).copy, null);
assert.throws(() => selectSkyDebilityPreviewDraft(none.slice(1), []), /seven/u);

const swe = new SwissEph();
await swe.initSwissEph();
const ids = [swe.SE_SUN, swe.SE_MOON, swe.SE_MERCURY, swe.SE_VENUS, swe.SE_MARS, swe.SE_JUPITER, swe.SE_SATURN];
const buffer = swe.SweModule._malloc(48), error = swe.SweModule._malloc(256);
const location = { label: "Synthetic geocentric QA", latitude: 0, longitude: 0, timeZone: zone };
const samples: SummaryCompositionRow[] = [];
for (const date of ["2026-10-28", "2027-01-10", "2027-02-15", "2027-10-09"]) {
  const instant = skyDebilityPreviewInstant(date, "12:00", zone, range);
  const sky = await getAstrodienstSky(location, instant, { includeDailyEvents: false, includeTransitWindows: false, includeAspectTiming: false });
  const positions = verifiedSkyDebilityPreviewPositions(sky, instant.toISOString());
  const jd = instant.getTime() / 86400000 + 2440587.5;
  const independent = ids.map((id, index) => {
    const flags = swe.SweModule.ccall("swe_calc_ut", "number", ["number", "number", "number", "pointer", "pointer"], [jd, id, swe.SEFLG_SWIEPH | swe.SEFLG_SPEED, buffer, error]);
    validateSwissEphemerisReturnFlag(flags, swe.SEFLG_SWIEPH, swe.SEFLG_MOSEPH, swe.SweModule.UTF8ToString(error).trim());
    const result = swe.SweModule.HEAPF64.slice(buffer / 8, buffer / 8 + 6);
    return { planet: TRADITIONAL_DIGNITY_PLANETS[index], sign: DIGNITY_SIGNS[Math.floor(((result[0] % 360 + 360) % 360) / 30)], motion: result[3] < -0.0001 ? "retrograde" : "direct" };
  });
  assert.deepEqual(positions, independent);
  const selected = selectSkyDebilityPreviewDraft(positions, []);
  assert.equal(selected.key, skyDebilityInterpretationKey(independent));
  const template = "Complete synthetic opening with {planetList}.\n\nComplete synthetic closing.";
  const assembled = assembleSkyDebilityCopy(selected.snapshot, undefined, { contentKey: selected.key!, headline: "Synthetic complete reading", body: template });
  const row: SummaryCompositionRow = { id: date, content_key: `cms/sky-debility/review-draft/fixture/${date}`, status: "DRAFT", headline: assembled.openingHook, body: assembled.body,
    source_snapshot: { exactReadingScope: { readingKey: selected.key, calculatedSky: true, placements: positions.filter(p => selected.snapshot.planets.some(q => p.planet === q.planet)) } } };
  const before = JSON.stringify(row);
  samples.push(row);
  const preview = assembleSkyDebilityDraftPreview(positions, [row]);
  assert.equal(preview.copy?.body, row.body);
  assert.equal(preview.row?.id, date);
  assert.equal(JSON.stringify(row), before);
  assert.throws(() => assembleSkyDebilityDraftPreview(positions, [row, { ...row, id: "duplicate" }]), /More than one/u);
  assert.equal(selectSkyDebilityPreviewDraft(positions, [{ ...row, status: "LIVE" }]).row, null);
  assert.equal(selectSkyDebilityPreviewDraft(positions, [{ ...row, source_snapshot: { exactReadingScope: { readingKey: selected.key, calculatedSky: true, placements: [] } } }]).row, null);
  assert.throws(() => assembleSkyDebilityDraftPreview(positions, [{ ...row, body: "Do not replace this owner-edited copy with an older import template." }]), /saved draft/u);
  assert.throws(() => verifiedSkyDebilityPreviewPositions({ ...sky, generatedAt: "2026-01-01T00:00:00Z" }, instant.toISOString()), /Verified/u);
  assert.throws(() => verifiedSkyDebilityPreviewPositions({ ...sky, positions: sky.positions.filter(p => p.planet !== "Moon") }, instant.toISOString()), /Verified/u);
}
swe.SweModule._free(buffer); swe.SweModule._free(error); swe.close();
// The real owner-only handler must return complete reference documents for the
// preview's bounded detail request, with no storage write or public transport.
process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "dignity-date-preview-fixture";
process.env.SUPABASE_URL = "https://dignity-date-preview.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture";
const { default: handler } = await import("../api/admin/generated-content-inventory");
const stored = Array.from({ length: 51 }, (_, index) => ({ ...samples[index % samples.length], id: `synthetic-${index}` }));
const originalFetch = globalThis.fetch;
let reads = 0;
globalThis.fetch = async (input, options) => {
  assert.equal(options?.method ?? "GET", "GET");
  const url = new URL(String(input));
  assert.equal(url.origin, "https://dignity-date-preview.invalid");
  assert.equal(url.searchParams.get("status"), "eq.DRAFT");
  assert.equal(url.searchParams.get("limit"), "80");
  assert(url.searchParams.get("select")?.split(",").includes("body"));
  assert(url.searchParams.get("select")?.split(",").includes("source_snapshot"));
  assert.equal(url.searchParams.get("lane"), null);
  reads++;
  return Response.json(stored);
};
try {
  const req = Readable.from([]) as any;
  req.method = "GET";
  req.url = "/api/admin/generated-content-inventory?contentKeyPrefix=cms/sky-debility/review-draft/&status=DRAFT&visibility=all&view=detail&limit=80";
  req.headers = { "x-content-generation-secret": "dignity-date-preview-fixture" };
  let payload: any;
  const res = { statusCode: 0, setHeader() {}, end(body: string) { payload = JSON.parse(body); } };
  await handler(req, res as any);
  assert.equal(res.statusCode, 200); assert.equal(payload.rows.length, 51); assert.equal(reads, 1);
  assert(payload.rows.every((row: any, index: number) => row.body === stored[index].body && !row.inventory_only && row.source_snapshot.exactReadingScope.readingKey));
  const denied = Readable.from([]) as any;
  denied.method = "GET"; denied.url = req.url; denied.headers = {};
  await handler(denied, res as any);
  assert.equal(res.statusCode, 401); assert.equal(reads, 1);
} finally { globalThis.fetch = originalFetch; }
console.log("Dignity date preview: range/DST validation, 4 direct Swiss parity dates, exact selection, full wording preservation, duplicate/stale/incomplete rejection passed.");
