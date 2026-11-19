import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import SwissEph from "swisseph-wasm";
import { getCalendarSubscriptionEvents, getLunarCalendarDayEvents, getLunarCalendarMonth, type LunarCalendarEvent } from "../../apps/web/src/services/ephemeris.js";
import { isHandoffKeyEvent } from "../../apps/web/src/features/calendar/calendarHandoff.js";
import { calendarLocalDateKey } from "../../apps/web/src/features/calendar/calendarPhaseLabel.js";

type Expected = { at: string; type: string; planet?: string; sign?: string; direction?: string; planets?: string[]; aspect?: string };

export async function verifyCalendar2027Coverage() {
  const expected = JSON.parse(readFileSync(new URL("../fixtures/calendar-2027-coverage.json", import.meta.url), "utf8")) as Expected[];
  const events = await getCalendarSubscriptionEvents(2027);
  const location = { label: "Synthetic New York", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
  const swiss = new SwissEph(); await swiss.initSwissEph();
  const ids: Record<string, number> = { Sun: 0, Mercury: 2, Venus: 3, Mars: 4, Jupiter: 5, Pluto: 9, Chiron: 15, "North Node": 11 };
  const position = (planet: string, time: number) => {
    const date = new Date(time);
    const jd = swiss.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600);
    return swiss.calc_ut(jd, ids[planet], swiss.SEFLG_SWIEPH | swiss.SEFLG_SPEED);
  };
  const separation = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
  for (const row of expected) {
    const sameFacts = (event: LunarCalendarEvent) => event.type === row.type && (row.planets
      ? event.aspect === row.aspect && [...event.planets ?? []].sort().join("|") === row.planets.join("|")
      : event.planet === row.planet && (row.type === "station" ? event.direction === row.direction : event.toSign === row.sign));
    const found = events.filter(sameFacts).find(event => Math.abs(Date.parse(event.startsAt) - Date.parse(row.at)) <= 60_000);
    assert(found, `Missing 2027 contact: ${JSON.stringify(row)}`);
    const at = Date.parse(found.startsAt);
    if (row.type === "aspect") {
      const [first, second] = found.planets!;
      const angle = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 }[found.aspect!]!;
      assert(Math.abs(separation(position(first, at)[0], position(second, at)[0]) - angle) < 0.001, `${found.title}: direct Swiss exact angle`);
    } else if (row.type === "station") {
      const before = position(found.planet!, at - 6 * 3600_000)[3], after = position(found.planet!, at + 6 * 3600_000)[3];
      assert(before * after < 0, `${found.title}: direct Swiss speed crosses zero`);
      assert.equal(after < 0 ? "retrograde" : "direct", found.direction);
    } else {
      assert.equal(Math.floor(position(found.planet!, at - 120_000)[0] / 30), 0);
      assert.equal(Math.floor(position(found.planet!, at + 120_000)[0] / 30), 1);
    }
    const dayEvents = await getLunarCalendarDayEvents(location, new Date(at));
    assert.equal(dayEvents.filter(event => sameFacts(event) && Math.abs(Date.parse(event.startsAt) - at) <= 2000).length, 1, `${found.title}: one matching event in the app day feed`);
  }
  for (const month of [3, 7]) {
    const calendar = await getLunarCalendarMonth(location, new Date(Date.UTC(2027, month, 15, 12)), { detail: "full" });
    const chiron = events.find(event => event.planet === "Chiron" && new Date(event.startsAt).getUTCMonth() === month)!;
    assert(calendar.events.some(event => event.planet === "Chiron" && event.type === chiron.type && Math.abs(Date.parse(event.startsAt) - Date.parse(chiron.startsAt)) <= 2000));
  }
  const keys = events.filter(event => isHandoffKeyEvent(event));
  assert.equal(keys.length, 50, "All 50 curated 2027 key events are selected from calculated facts");
  assert(keys.some(event => event.type === "aspect" && event.planets?.includes("North Node")));
  for (const zone of ["America/New_York", "America/Los_Angeles", "Pacific/Kiritimati", "Etc/GMT+12"]) {
    assert.equal(keys.filter(event => isHandoffKeyEvent({ ...event, dateKey: calendarLocalDateKey(event.startsAt, zone) })).length, 50, `Highlights retain their identity in ${zone}`);
  }
  assert(!isHandoffKeyEvent({ ...keys[0], startsAt: keys[0].startsAt.replace("2027", "2028"), dateKey: "2028-01-01" }));
  assert(!events.some(event => event.planets?.includes("South Node")), "One canonical True North Node event represents both ends of the axis");
  for (const event of events.filter(event => event.planets?.includes("North Node"))) {
    const other = event.planets!.find(planet => planet !== "North Node");
    assert.equal(events.filter(candidate => candidate.type === "aspect" && candidate.planets?.includes(other!) && candidate.planets.includes("North Node") && Math.abs(Date.parse(candidate.startsAt) - Date.parse(event.startsAt)) < 2000).length, 1);
  }
  console.log(`PASS 2027 coverage: ${expected.length} formerly missing contacts, independent Swiss checks, app day/month parity, 50 zone-stable key events, single nodal-axis events`);
  return events;
}
