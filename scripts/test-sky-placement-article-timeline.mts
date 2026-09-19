import assert from "node:assert/strict";
import {
  LONG_STAY_VISIT_MS,
  dateRangeContainedInWindow,
  filterPlacementTimelineEvents,
  placementArticleTimelineWindow,
  timestampInInclusiveWindow
} from "../apps/web/src/services/skyPlacementArticleTimeline.ts";

const rxStart = "2026-08-03T08:00:00.000Z";
const rxEnd = "2027-01-06T08:00:00.000Z";
const visitStart = new Date("2018-04-17T00:00:00.000Z");
const visitEnd = new Date("2027-04-14T00:00:00.000Z");
const stations = [
  { occursAt: "2025-07-30T00:00:00.000Z" },
  { occursAt: "2026-01-02T00:00:00.000Z" },
  { occursAt: rxStart },
  { occursAt: rxEnd },
  { occursAt: "2027-04-01T00:00:00.000Z" }
];

const chironRx = placementArticleTimelineWindow({
  articleMode: "current",
  generatedAt: "2026-09-19T05:00:00.000Z",
  isRetrograde: true,
  visitStart,
  visitEnd,
  retrogradeStart: rxStart,
  retrogradeEnd: rxEnd,
  stations
});
assert.equal(chironRx?.start.toISOString(), rxStart);
assert.equal(chironRx?.end.toISOString(), rxEnd);
assert.equal(timestampInInclusiveWindow("2018-04-24T00:00:00.000Z", chironRx), false, "Full-residency hits stay out of a retrograde article.");
assert.equal(timestampInInclusiveWindow(rxStart, chironRx), true);
assert.equal(timestampInInclusiveWindow("2026-09-19T12:00:00.000Z", chironRx), true);
assert.equal(timestampInInclusiveWindow(rxEnd, chironRx), true);
assert.equal(timestampInInclusiveWindow("2027-03-25T00:00:00.000Z", chironRx), false);
assert.equal(
  dateRangeContainedInWindow(visitStart, visitEnd, chironRx),
  false,
  "A multi-year pass range must not appear as a Key date on the short article."
);

const mercuryVisitStart = new Date("2026-09-02T00:00:00.000Z");
const mercuryVisitEnd = new Date("2026-09-25T00:00:00.000Z");
assert.ok(mercuryVisitEnd.getTime() - mercuryVisitStart.getTime() < LONG_STAY_VISIT_MS);
const mercury = placementArticleTimelineWindow({
  articleMode: "current",
  generatedAt: "2026-09-19T12:00:00.000Z",
  isRetrograde: false,
  visitStart: mercuryVisitStart,
  visitEnd: mercuryVisitEnd,
  stations: [{ occursAt: "2026-09-10T00:00:00.000Z" }]
});
assert.equal(mercury?.start.toISOString(), mercuryVisitStart.toISOString());
assert.equal(mercury?.end.toISOString(), mercuryVisitEnd.toISOString());
assert.equal(timestampInInclusiveWindow("2026-09-02T00:00:00.000Z", mercury), true);
assert.equal(timestampInInclusiveWindow("2026-09-25T00:00:00.000Z", mercury), true);
assert.equal(timestampInInclusiveWindow("2026-08-01T00:00:00.000Z", mercury), false);

const longDirect = placementArticleTimelineWindow({
  articleMode: "current",
  generatedAt: "2026-03-15T12:00:00.000Z",
  isRetrograde: false,
  visitStart,
  visitEnd,
  retrogradeStart: rxStart,
  retrogradeEnd: rxEnd,
  stations
});
assert.equal(longDirect?.start.toISOString(), "2026-01-02T00:00:00.000Z");
assert.equal(longDirect?.end.toISOString(), rxStart);
assert.equal(timestampInInclusiveWindow("2026-01-02T00:00:00.000Z", longDirect), true);
assert.equal(timestampInInclusiveWindow("2026-02-01T00:00:00.000Z", longDirect), true);
assert.equal(timestampInInclusiveWindow(rxStart, longDirect), true);
assert.equal(timestampInInclusiveWindow("2026-09-19T12:00:00.000Z", longDirect), false);

const archive = placementArticleTimelineWindow({
  articleMode: "archive",
  generatedAt: "2026-09-19T12:00:00.000Z",
  isRetrograde: true,
  visitStart,
  visitEnd,
  retrogradeStart: rxStart,
  retrogradeEnd: rxEnd,
  stations
});
assert.equal(archive, null);
assert.equal(timestampInInclusiveWindow("2018-04-24T00:00:00.000Z", archive), true);

const events = filterPlacementTimelineEvents([
  { id: "old", occursAt: "2018-04-24T00:00:00.000Z" },
  { id: "now", occursAt: "2026-09-19T12:00:00.000Z" },
  { id: "later", occursAt: "2027-03-25T00:00:00.000Z" }
], chironRx);
assert.deepEqual(events.map((event) => event.id), ["now"]);

console.log("Sky placement article timeline window passed: Rx, short visit, long direct, and archive cases are clean.");
