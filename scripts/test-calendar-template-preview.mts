import assert from "node:assert/strict";
import SwissEph from "swisseph-wasm";
import { calculateCalendarPreview } from "../apps/admin/src/calendarPreviewCalculation.ts";
import { calendarPreviewValues, calendarTemplateSegments, calendarMoonPassages, type CalendarPreviewRow } from "../apps/admin/src/calendarPreviewModel.ts";
import { lunarSigns } from "../apps/admin/src/lunarCalendarContent.ts";

const swe = new SwissEph();
await swe.initSwissEph();
for (const instant of ["2026-09-14T16:00:00.000Z", "2027-01-12T17:00:00.000Z"]) {
  const result = await calculateCalendarPreview("daily-sky", instant, "America/New_York");
  const date = new Date(instant);
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours());
  for (const [planet, id] of [["Sun", swe.SE_SUN], ["Moon", swe.SE_MOON]] as const) {
    const longitude = swe.calc_ut(jd, id, swe.SEFLG_SWIEPH)[0];
    const position = result.sky.positions.find(position => position.planet === planet)!;
    assert.equal(position.sign.toLowerCase(), lunarSigns[Math.floor(longitude / 30)]);
    assert(Math.abs(position.degree - longitude % 30) < 0.01);
  }
  const sunSign = result.sky.positions.find(position => position.planet === "Sun")!.sign;
  const moonSign = result.sky.positions.find(position => position.planet === "Moon")!.sign;
  const values = calendarPreviewValues({ sunSign, moonSign, calculation: result, rows: [] });
  assert.equal(values.sunSign.kind, "fact");
  assert(values.sunDegree.text.endsWith("°"));
  assert.equal(values.timeZone.text, "America/New_York");
}
const week = await calculateCalendarPreview("weekly-sky", "2026-11-01T17:00:00.000Z", "America/New_York");
assert.equal(week.days.length, 7);
assert.equal(week.days[0].dateKey, "2026-10-26");
assert.equal(week.days[6].dateKey, "2026-11-01");
const month = await calculateCalendarPreview("monthly-sky", "2027-02-12T17:00:00.000Z", "America/New_York");
assert.equal(month.days.length, 28);
assert(month.events.every(event => event.dateKey.startsWith("2027-02-")));
assert.equal(month.days[0].dateKey, "2027-02-01");

const body = "Fixture complete opening.\n\nFixture middle paragraph.\n\nFixture complete final sentence.";
const source = { id: "moon", content_key: "authored/calendar-weekly-moon/cancer/variant-2", status: "LIVE", lane: "serving", body, source_snapshot: { content_role: "full_copy", review_status: "approved_reuse" } } satisfies CalendarPreviewRow;
assert.equal(calendarMoonPassages([{ ...source, content_key: "authored/calendar-weekly-moon/cancer" }], "Cancer").length, 0);
assert.equal(calendarMoonPassages([{ ...source, status: "DRAFT" }], "Cancer").length, 0);
assert.equal(calendarMoonPassages([{ ...source, review_state: "held" }], "Cancer").length, 0);
const values = calendarPreviewValues({ sunSign: "Virgo", moonSign: "Cancer", rows: [source] });
assert.equal(values.moonWriteup.text, body);
assert.equal(values.sunSign.kind, "example");
assert.equal(values.sunDegree, undefined);
assert.equal(values.moonIngress, undefined);
assert.equal(calendarTemplateSegments("{{moonWriteup}}\n\n{{weeklyIntegration}}", values).map(part => part.text).join(""), `${body}\n\n{{weeklyIntegration}}`);
assert.equal(calendarTemplateSegments("{{moonWriteup}}", { moonWriteup: { kind: "copy", text: "{{unknownSourceSlot}}" } })[0].text, "{{unknownSourceSlot}}");
await assert.rejects(calculateCalendarPreview("daily-sky", "invalid", "UTC"), /valid date/);
console.log("Calendar template preview: two direct Swiss comparisons, DST week, month boundaries, complete source preservation, publication exclusions, and example/fact separation passed.");
