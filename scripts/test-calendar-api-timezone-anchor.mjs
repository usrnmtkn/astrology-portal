import assert from "node:assert/strict";
import calendarHandler from "../api/calendar.ts";
import { getLunarCalendarFromApi } from "../apps/web/src/services/calendarApi.ts";
import { getAstrodienstSky } from "../apps/web/src/services/ephemeris.ts";

function responseRecorder() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = String(value);
    },
    end(value) {
      this.body = String(value ?? "");
    }
  };
}

const requestedDate = "2026-08-24";
const requestUrl = "/api/calendar?mode=week&detail=basic&date=2026-08-24&lat=40.7128&lon=-74.006&label=New%20York%20City&timeZone=America%2FNew_York";
const response = responseRecorder();

await calendarHandler({ method: "GET", url: requestUrl }, response);

assert.equal(response.statusCode, 200, "The timezone-aware calendar request must succeed.");
const payload = JSON.parse(response.body);
assert.equal(payload.ok, true);
assert.ok(
  payload.calendar.days.some((day) => day.dateKey === requestedDate),
  "An Eastern Time request for Monday must return the week containing that Monday."
);
assert.equal(
  payload.calendar.days[0]?.dateKey,
  "2026-08-23",
  "Reader week ranges begin on Sunday, so Monday must sit in the week that starts the prior local Sunday."
);
assert.deepEqual(
  payload.calendar.days.map((day) => day.dateKey),
  ["2026-08-23", "2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29"]
);

const sundayResponse = responseRecorder();
await calendarHandler({
  method: "GET",
  url: "/api/calendar?mode=week&detail=basic&date=2026-08-30&lat=40.7128&lon=-74.006&label=New%20York%20City&timeZone=America%2FNew_York"
}, sundayResponse);
assert.equal(sundayResponse.statusCode, 200);
const sundayPayload = JSON.parse(sundayResponse.body);
assert.equal(
  sundayPayload.calendar.days[0]?.dateKey,
  "2026-08-30",
  "A western-timezone Sunday must stay the week start instead of shifting to the prior local Saturday on the server."
);

for (const scenario of [
  { date: "2026-11-01", zone: "America/New_York", noon: "2026-11-01T17:00:00Z", lat: 40.7128, lon: -74.006, hours: 25 },
  { date: "2026-03-08", zone: "America/New_York", noon: "2026-03-08T16:00:00Z", lat: 40.7128, lon: -74.006, hours: 23 },
  { date: "2026-04-05", zone: "Australia/Sydney", noon: "2026-04-05T02:00:00Z", lat: -33.8688, lon: 151.2093, hours: 25 },
  { date: "2026-10-04", zone: "Australia/Sydney", noon: "2026-10-04T01:00:00Z", lat: -33.8688, lon: 151.2093, hours: 23 }
]) {
  const location = { label: scenario.zone, latitude: scenario.lat, longitude: scenario.lon, timeZone: scenario.zone };
  // The direct Sky calculation uses independently specified local-noon UTC
  // instants, so a shifted Calendar sample cannot validate itself.
  const sky = await getAstrodienstSky(location, new Date(scenario.noon));
  for (const mode of ["month", "week"]) {
    const calendarResponse = responseRecorder();
    const query = new URLSearchParams({ mode, detail: "basic", date: scenario.date,
      lat: String(scenario.lat), lon: String(scenario.lon), timeZone: scenario.zone });
    await calendarHandler({ method: "GET", url: `/api/calendar?${query}` }, calendarResponse);
    assert.equal(calendarResponse.statusCode, 200);
    const { days } = JSON.parse(calendarResponse.body).calendar;
    assert.equal(days.length, mode === "month" ? 42 : 7);
    assert.equal(new Set(days.map((day) => day.dateKey)).size, days.length,
      `${scenario.zone} ${scenario.date}: ${mode} must not repeat a civil date.`);
    for (let index = 1; index < days.length; index += 1) {
      assert.equal(Date.parse(days[index].dateKey) - Date.parse(days[index - 1].dateKey), 86_400_000,
        "Civil date keys must advance exactly one date, including at DST boundaries.");
    }
    const day = days.find((candidate) => candidate.dateKey === scenario.date);
    assert.equal(day.moonSign, sky.positions.find((position) => position.planet === "Moon").sign);
    assert.equal(day.moonPhase, sky.moonPhase, "Calendar phase must match direct ephemeris at local noon.");
    const moon = sky.positions.find((position) => position.planet === "Moon").longitude;
    const sun = sky.positions.find((position) => position.planet === "Sun").longitude;
    assert.equal(day.illumination, Math.round((1 - Math.cos((moon - sun) * Math.PI / 180)) * 50));
    if (mode === "month") {
      const nextDay = days[days.indexOf(day) + 1];
      assert.equal((Date.parse(nextDay.date) - Date.parse(day.date)) / 3_600_000, scenario.hours,
        "Adjacent local midnights must respect the actual length of the transition day.");
    }
  }
}

const fullResponse = responseRecorder();
await calendarHandler({ method: "GET", url: "/api/calendar?mode=week&detail=full&date=2026-11-01&lat=40.7128&lon=-74.006&timeZone=America%2FNew_York" }, fullResponse);
assert.equal(fullResponse.statusCode, 200);
const fullCalendar = JSON.parse(fullResponse.body).calendar;
assert.deepEqual(fullCalendar.days.map((day) => day.dateKey),
  ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"]);
const passages = fullCalendar.events.filter((event) => event.phase === "retrograde-passage");
assert.ok(passages.length > 0, "Full-calendar regression must exercise active retrograde sampling.");
assert.equal(new Set(passages.map((event) => `${event.planet}/${event.dateKey}`)).size, passages.length,
  "A 25-hour day must not produce an extra retrograde passage in the full event feed.");

// Exact ingress events must land on their civil date, independently of the
// noon sign. Check the API against direct ephemeris on either side of entry.
for (const scenario of [
  { date: "2026-09-22", zone: "America/New_York", aquariusDate: "2026-09-21", piscesDate: "2026-09-23" },
  { date: "2026-09-22", zone: "Asia/Tokyo", aquariusDate: "2026-09-22", piscesDate: "2026-09-24" },
  { date: "2026-03-08", zone: "America/New_York" },
  { date: "2026-11-01", zone: "America/New_York" },
  { date: "2026-12-31", zone: "America/New_York" }
]) {
  for (const mode of scenario.aquariusDate ? ["week", "month"] : ["week"]) {
    const query = new URLSearchParams({ mode, detail: "full", date: scenario.date,
      lat: "40.7128", lon: "-74.006", timeZone: scenario.zone });
    const response = responseRecorder();
    await calendarHandler({ method: "GET", url: `/api/calendar?${query}` }, response);
    assert.equal(response.statusCode, 200);
    const calendar = JSON.parse(response.body).calendar;
    const ingresses = calendar.events.filter(event => event.type === "ingress" && event.planet === "Moon");
    assert.ok(ingresses.length >= 2, `${mode} must expose computed Moon ingresses.`);
    assert.equal(new Set(ingresses.map(event => event.id)).size, ingresses.length);
    for (const event of ingresses) {
      const matchingDays = calendar.days.filter(day => day.events.some(item => item.id === event.id));
      assert.equal(matchingDays.length, 1, "Each exact event belongs to one local day.");
      assert.equal(matchingDays[0].dateKey, event.dateKey);
      assert.equal(event.dateKey, new Intl.DateTimeFormat("en-CA", { timeZone: scenario.zone,
        year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(event.startsAt)));
      assert.ok(calendar.cycleEvents.some(item => item.id === event.id && item.startsAt === event.startsAt),
        "Calendar cards and cycle readings use the same calculated entry.");
      // Month and week overlap; verify the direct placement once per week event.
      if (mode === "week") {
        for (const [offset, expected] of [[-120_000, event.fromSign], [120_000, event.toSign]]) {
          const sky = await getAstrodienstSky(calendar.location, new Date(Date.parse(event.startsAt) + offset));
          assert.equal(sky.positions.find(position => position.planet === "Moon").sign, expected);
        }
      }
    }
    if (scenario.aquariusDate) {
      const aquarius = ingresses.find(event => event.startsAt.startsWith("2026-09-21"));
      const pisces = ingresses.find(event => event.startsAt.startsWith("2026-09-24"));
      assert.equal(aquarius?.dateKey, scenario.aquariusDate);
      assert.equal(aquarius?.toSign, "Aquarius");
      assert.equal(pisces?.dateKey, scenario.piscesDate);
      assert.equal(pisces?.toSign, "Pisces");
      if (scenario.zone === "America/New_York") {
        assert.equal(calendar.days.find(day => day.dateKey === "2026-09-21").moonSign, "Capricorn",
          "An afternoon ingress cannot depend on the sign at noon.");
        assert.equal(calendar.days.find(day => day.dateKey === "2026-09-22").events
          .filter(event => event.type === "ingress" && event.planet === "Moon").length, 0);
      }
    }
  }
}

const originalFetch = globalThis.fetch;

try {
  let requestedUrl = "";
  globalThis.fetch = async () => new Response(JSON.stringify({
    ok: true,
    calendar: {
      ...payload.calendar,
      days: payload.calendar.days.map((day) => ({
        ...day,
        dateKey: day.dateKey.replace("2026-08-2", "2026-08-1")
      }))
    }
  }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });

  await assert.rejects(
    () => getLunarCalendarFromApi(
      {
        label: "New York City",
        latitude: 40.7128,
        longitude: -74.006,
        timeZone: "America/New_York"
      },
      "week",
      new Date("2026-08-24T16:00:00.000Z"),
      "basic"
    ),
    /wrong week/u,
    "The client must reject an API week that cannot render the selected day."
  );

  globalThis.fetch = async (url) => {
    requestedUrl = String(url);

    return new Response(JSON.stringify({ ok: true, calendar: payload.calendar }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  await getLunarCalendarFromApi(
    {
      label: "Tokyo",
      latitude: 35.6762,
      longitude: 139.6503,
      timeZone: "Asia/Tokyo"
    },
    "week",
    new Date("2026-08-24T03:00:00.000Z"),
    "basic"
  );
  assert.equal(
    new URL(requestedUrl, "https://example.test").searchParams.get("date"),
    requestedDate,
    "The client must serialize the anchor in the selected location's timezone."
  );
  let stalledSignal;
  globalThis.fetch = (_url, options) => {
    stalledSignal = options.signal;
    // Model a transport that ignores abort and never settles.
    return new Promise(() => {});
  };
  const started = performance.now();
  await assert.rejects(() => getLunarCalendarFromApi({
    label: "New York City", latitude: 40.7128, longitude: -74.006,
    timeZone: "America/New_York"
  }, "week", new Date("2026-08-24T16:00:00Z"), "basic"), { name: "TimeoutError" });
  assert.ok(stalledSignal.aborted, "A stalled API must be aborted so local calculation can take over.");
  assert.ok(performance.now() - started < 4_000, "An unresponsive API cannot block fallback indefinitely.");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Calendar API timezone, exact Moon ingress dates, DST/year boundaries, direct-ephemeris parity, and wrong-week contracts passed.");
