import assert from "node:assert/strict";
import SwissEph from "swisseph-wasm";
import { getRetrogradeHistory } from "../apps/web/src/services/ephemeris.ts";
import { calculateRetrogradeHistory, RETROGRADE_HISTORY_START, RETROGRADE_HISTORY_END } from "../apps/web/src/services/retrogradeHistory.ts";
const swe = new SwissEph();
await swe.initSwissEph();
const DAY = 86_400_000;
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
function sample(id: number, time: number) {
  const date = new Date(time);
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600);
  return swe.calc_ut(jd, id, swe.SEFLG_SWIEPH | swe.SEFLG_SPEED);
}
const cases = [
  { planet: "venus", sign: "scorpio", date: "2026-10-10", id: swe.SE_VENUS, prior: "2018-10-05" },
  { planet: "venus", sign: "libra", date: "2026-11-01", id: swe.SE_VENUS, prior: "2018-10-05" },
  { planet: "mercury", sign: "pisces", date: "2025-04-01", id: swe.SE_MERCURY, prior: "2020-02-17" },
  { planet: "mars", sign: "cancer", date: "2025-02-01", id: swe.SE_MARS },
  { planet: "pluto", sign: "aquarius", date: "2026-08-01", id: swe.SE_PLUTO, prior: "2025-05-04" },
  { planet: "jupiter", sign: "leo", date: "2026-12-20", id: swe.SE_JUPITER },
  { planet: "saturn", sign: "aries", date: "2026-10-10", id: swe.SE_SATURN },
  { planet: "uranus", sign: "gemini", date: "2026-10-10", id: swe.SE_URANUS },
  { planet: "neptune", sign: "aries", date: "2026-10-10", id: swe.SE_NEPTUNE },
  { planet: "chiron", sign: "aries", date: "2026-10-10", id: 15 }
];
for (const entry of cases) {
  const history = await getRetrogradeHistory({ planet: entry.planet, sign: entry.sign, referenceDate: new Date(`${entry.date}T12:00:00Z`) });
  assert.equal(history.status, "ready");
  assert(history.current && history.sameSign && history.nextSameSign && history.degreeMatch && history.coverage && history.forwardCoverage);
  if (entry.prior) assert.equal(history.sameSign.retrograde.instant.slice(0, 10), entry.prior);
  assert(history.sameSign.direct.instant < history.current.retrograde.instant, "Exclude the current cycle");
  for (const cycle of [history.current, history.sameSign, history.nextSameSign, history.degreeMatch.cycle]) {
    const start = Date.parse(cycle.retrograde.instant), end = Date.parse(cycle.direct.instant);
    assert(sample(entry.id, start - 60_000)[3] > 0 && sample(entry.id, start + 60_000)[3] < 0);
    assert(sample(entry.id, end - 60_000)[3] < 0 && sample(entry.id, end + 60_000)[3] > 0);
    assert(Math.abs(sample(entry.id, start)[0] - cycle.retrograde.longitude) < 0.00001);
    assert.equal(cycle.durationDays, (end - start) / DAY);
    assert.equal(cycle.daysInStationSign, cycle.segments.filter(segment => segment.sign === cycle.retrograde.sign)
      .reduce((days, segment) => days + (Date.parse(segment.end) - Date.parse(segment.start)) / DAY, 0));
    assert.equal(cycle.signTransitions.length, cycle.segments.length - 1);
    for (const transition of cycle.signTransitions) {
      assert(Math.abs(sample(entry.id, Date.parse(transition.instant))[0] - transition.longitude) < 0.00001);
    }
    for (const segment of cycle.segments) {
      const middle = (Date.parse(segment.start) + Date.parse(segment.end)) / 2;
      assert.equal(signs[Math.floor(sample(entry.id, middle)[0] / 30)], segment.sign);
      assert(sample(entry.id, middle)[3] < 0, "Sign segments must contain retrograde motion");
    }
    for (const segment of cycle.segments.slice(1)) {
      const boundary = Date.parse(segment.start);
      assert.notEqual(signs[Math.floor(sample(entry.id, boundary - 60_000)[0] / 30)], segment.sign);
      assert.equal(signs[Math.floor(sample(entry.id, boundary + 60_000)[0] / 30)], segment.sign);
    }
  }
  // Independent daily sampling between the reported prior cycle and the current
  // one verifies that a more recent pass through this sign was not skipped.
  for (let time = Date.parse(history.sameSign.direct.instant) + DAY; time < Date.parse(history.current.retrograde.instant) - DAY; time += DAY) {
    const value = sample(entry.id, time);
    assert(!(value[3] < 0 && signs[Math.floor(value[0] / 30)] === entry.sign), `Skipped newer same-sign retrograde for ${entry.planet}`);
  }
  assert(history.nextSameSign.retrograde.instant > history.current.direct.instant);
  for (let time = Date.parse(history.current.direct.instant) + DAY; time < Date.parse(history.nextSameSign.retrograde.instant) - DAY; time += DAY) {
    const value = sample(entry.id, time);
    assert(!(value[3] < 0 && signs[Math.floor(value[0] / 30)] === entry.sign), `Skipped next same-sign retrograde for ${entry.planet}`);
  }
  if (history.previousCrossing) {
    const instant = Date.parse(history.previousCrossing.instant);
    assert(instant >= Date.parse(history.sameSign.retrograde.instant) && instant <= Date.parse(history.sameSign.direct.instant));
    assert(Math.abs(sample(entry.id, instant)[0] - history.referenceLongitude!) < 0.00001);
    assert(sample(entry.id, instant)[3] < 0);
  }
  const closest = sample(entry.id, Date.parse(history.degreeMatch.closestInstant))[0];
  const delta = Math.abs(closest - history.referenceLongitude!);
  assert(Math.abs(Math.min(delta, 360 - delta) - history.degreeMatch.distanceDegrees) < 0.0001);
  const cached = await getRetrogradeHistory({ planet: entry.planet, sign: entry.sign, referenceDate: new Date(Date.parse(history.current.retrograde.instant) + DAY) });
  assert.deepEqual(cached, history, "The station reference and saved receipt are stable across reference dates");
  cached.sameSign!.retrograde.instant = "mutated by caller";
  assert.notEqual((await getRetrogradeHistory({ planet: entry.planet, sign: entry.sign, referenceDate: new Date(entry.date) })).sameSign!.retrograde.instant, "mutated by caller");
}
const venus = await getRetrogradeHistory({ planet: "venus", sign: "scorpio", referenceDate: new Date("2026-10-10") });
assert.equal(venus.nextSameSign!.retrograde.instant.slice(0, 10), "2034-09-30");
assert.equal(venus.nextSameSign!.direct.instant.slice(0, 10), "2034-11-11");
assert.equal(venus.nextSameSign!.signTransitions[0].instant.slice(0, 10), "2034-10-19");
assert.equal(venus.previousCrossing!.instant.slice(0, 10), "2018-10-16");
assert.equal(Math.floor(venus.nextSameSign!.retrograde.degree * 60), 367);
assert.equal(Math.floor(venus.nextSameSign!.direct.degree * 60), 1227);
const earlyPluto = await getRetrogradeHistory({ planet: "pluto", sign: "aquarius", referenceDate: new Date("2023-05-10") });
assert.equal(earlyPluto.status, "ready");
assert.equal(earlyPluto.sameSign, null, "Earlier Aquarius retrogrades predate the packaged range");
assert.equal(earlyPluto.coverage!.start, RETROGRADE_HISTORY_START);
assert.equal(earlyPluto.coverage!.reachedBoundary, true);
for (const [planet, date, status] of [["sun", "2026-10-10", "unsupported"], ["venus", "2026-09-01", "not-retrograde"], ["venus", "1799-01-01", "out-of-range"]]) {
  assert.equal((await getRetrogradeHistory({ planet, referenceDate: new Date(date) })).status, status);
}
assert.throws(() => calculateRetrogradeHistory({ planet: "venus", referenceDate: new Date("2026-10-10") }, () => ({ longitude: NaN, speed: -1 })), /finite/);
assert.equal(calculateRetrogradeHistory({ planet: "venus", referenceDate: new Date("1800-01-03") }, () => ({ longitude: 220, speed: -1 })).status, "incomplete-cycle");
await assert.rejects(getRetrogradeHistory({ planet: "venus", sign: "aries", referenceDate: new Date("2026-10-10") }), /not part/);
// A bounded synthetic motion explicitly exercises absent future cycles.
const bounded = calculateRetrogradeHistory({ planet: "venus", sign: "scorpio", referenceDate: new Date("2399-12-01") }, time => {
  const day = (time - Date.parse("2399-12-01")) / DAY;
  return { longitude: 220 - Math.max(-2, Math.min(2, day)), speed: Math.abs(day) < 2 ? -1 : 1 };
});
assert.equal(bounded.nextSameSign, null);
assert.equal(bounded.forwardCoverage!.end, RETROGRADE_HISTORY_END);
assert.equal(bounded.forwardCoverage!.reachedBoundary, true);
console.log("Retrograde history: direct Swiss station/sign/degree checks, newest-cycle exclusion, wraparound, cache isolation and bounded empty states passed.");
