import assert from "node:assert/strict";
import calendarHandler from "../api/calendar.ts";
import { getLunarCalendarFromApi } from "../apps/web/src/services/calendarApi.ts";

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
  requestedDate,
  "Monday must remain Monday instead of shifting to the prior local Sunday on the server."
);

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
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Calendar API timezone anchor and wrong-week fallback contracts passed.");
