import assert from "node:assert/strict";
import calendarHandler from "../api/calendar.ts";
import { getLunarCalendarRangeEvents, getMatchingNewMoonForFullMoon } from "../apps/web/src/services/ephemeris.ts";
import { calendarCycleLinkQuery, calendarLunationContextEvents, calendarLunationLinkLabel, resolveCalendarCycleLink } from "../apps/web/src/features/calendar/calendarLunationLinks.ts";
import { matchLunarJournalIndex } from "../apps/web/src/features/calendar/lunarJournalKeys.ts";

const location = { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
for (const { date, expectedPrevious, expectedNext } of [
  { date: "2026-10-03", expectedPrevious: "2026-09-26", expectedNext: "2026-10-10" },
  { date: "2027-01-01", expectedPrevious: "2026-12-23", expectedNext: "2027-01-07" }
]) {
  const response = { statusCode: 0, body: "", setHeader() {}, end(body: string) { this.body = body; } };
  await calendarHandler({ method: "GET", url: `/api/calendar?mode=week&detail=full&date=${date}&lat=40.7128&lon=-74.006&timeZone=America%2FNew_York` } as never, response as never);
  assert.equal(response.statusCode, 200);
  const { calendar } = JSON.parse(response.body);
  const context = calendarLunationContextEvents(date, [...calendar.cycleEvents, ...calendar.events]);
  assert.equal(context[0]?.event.dateKey, expectedPrevious);
  assert.equal(context[1]?.event.dateKey, expectedNext);
  assert.equal(calendarLunationContextEvents(context[0].event.dateKey, calendar.cycleEvents).length, 0);
}

for (const { at, sign, expected } of [
  { at: "2026-09-26T16:49:00Z", sign: "Aries", expected: "2026-04-17" },
  { at: "2026-01-03T10:03:00Z", sign: "Cancer", expected: "2025-06-25" }
]) {
  const event = { id: at, type: "lunation" as const, title: `Full Moon in ${sign}`, sign, startsAt: at, dateKey: at.slice(0, 10), primary: true };
  const query = calendarCycleLinkQuery(event, "prev")!;
  const events = await getLunarCalendarRangeEvents(location, query.start, query.end);
  const target = resolveCalendarCycleLink(event, "prev", events)!;
  const verified = await getMatchingNewMoonForFullMoon(location, at, sign);
  assert.equal(target.sign, sign);
  assert.equal(target.dateKey, expected);
  assert.equal(target.startsAt, verified?.exactAt);
  assert.equal(resolveCalendarCycleLink(event, "prev", []), null);
  assert.equal(calendarCycleLinkQuery(event, "javascript:alert(1)"), null);
  assert.match(calendarLunationLinkLabel(target, location.timeZone), new RegExp(sign));
  if (sign === "Aries") {
    assert.equal(matchLunarJournalIndex(target), null, "A missing Aries New Moon journal must never substitute another sign's journal.");
    const nextQuery = calendarCycleLinkQuery(target, "the Full Moon")!;
    const future = await getLunarCalendarRangeEvents(location, nextQuery.start, nextQuery.end);
    assert.equal(resolveCalendarCycleLink(target, "the Full Moon", future)?.sign, "Scorpio");
    assert.equal(resolveCalendarCycleLink(target, "Scorpio Full Moon", future)?.dateKey, "2026-05-01");
    assert.equal(resolveCalendarCycleLink(target, "Cancer Full Moon", future), null);
  }
}
assert.deepEqual(calendarLunationContextEvents("2026-09-27", []), []);
console.log("Calendar lunation context: actual API boundaries, calculated cycle links, cross-year dates, and missing sources passed.");
