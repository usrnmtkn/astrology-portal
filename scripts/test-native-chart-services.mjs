import assert from "node:assert/strict";
import { Readable } from "node:stream";
import {
  createNativeChartServices,
  readNativeChartInput,
} from "../api/native-chart-services.ts";
const calls = [],
  fetcher = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify(
        String(url).startsWith("https://api.mapbox.com")
          ? {
              features: [
                {
                  id: "fixture-city",
                  properties: {
                    name: "New York",
                    place_formatted: "New York, United States",
                    coordinates: { latitude: 40.7128, longitude: -74.006 },
                  },
                },
              ],
            }
          : {
              source: "coordinates",
              timeZone: "America/New_York",
              utcDateTime: "1990-01-01T17:30:00.000Z",
            },
      ),
      { headers: { "Content-Type": "application/json" } },
    );
  };
const handler = createNativeChartServices(fetcher, () => ({
  mapbox: "fixture-public-token",
  astro: "https://astro.fixture.invalid",
}));
async function request(body, method = "POST") {
  const req = Readable.from([JSON.stringify(body)]);
  req.method = method;
  req.headers = { "content-type": "application/json" };
  let data, status;
  const res = {
    statusCode: 200,
    setHeader() {},
    end(value) {
      status = this.statusCode;
      data = JSON.parse(value);
    },
  };
  await handler(req, res);
  return { status, data };
}
assert.equal((await request({}, "GET")).status, 405);
for (const input of [
  { kind: "cities", query: "N", date: "1990-01-01" },
  { kind: "cities", query: "City", date: "1990-02-30" },
  {
    kind: "birth-time",
    date: "1990-01-01",
    time: "25:00",
    latitude: 40,
    longitude: 0,
    timeZone: "UTC",
  },
  {
    kind: "birth-time",
    date: "1990-01-01",
    time: "12:00",
    latitude: 100,
    longitude: 0,
    timeZone: "UTC",
  },
])
  assert.throws(() => readNativeChartInput(input));
const city = await request({
  kind: "cities",
  query: "New York",
  date: "1990-01-01",
});
assert.equal(city.status, 200);
assert.equal(city.data.result[0].timeZone, "America/New_York");
assert.ok(!JSON.stringify(city.data).includes("fixture-public-token"));
assert.equal(new URL(calls[0].url).searchParams.get("types"), "place,locality");
assert.equal(JSON.parse(calls[1].options.body).date, "1990-01-01");
const time = await request({
  kind: "birth-time",
  date: "1990-01-01",
  time: "12:30",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York",
});
assert.equal(time.data.result.utc, "1990-01-01T17:30:00.000Z");
assert.equal(JSON.parse(calls.at(-1).options.body).time, "12:30");
const fallback = createNativeChartServices(
  async () =>
    new Response(
      JSON.stringify({
        source: "fallback",
        timeZone: "UTC",
        utcDateTime: "1990-01-01T12:00:00Z",
      }),
    ),
  () => ({ mapbox: "fixture", astro: "https://astro.fixture.invalid" }),
);
const req = Readable.from([
  JSON.stringify({
    kind: "birth-time",
    date: "1990-01-01",
    time: "12:30",
    latitude: 40,
    longitude: 0,
    timeZone: "UTC",
  }),
]);
req.method = "POST";
req.headers = { "content-type": "application/json" };
let status;
await fallback(req, {
  statusCode: 200,
  setHeader() {},
  end() {
    status = this.statusCode;
  },
});
assert.equal(status, 503);
console.log(
  "Native chart services: bounded city search, exact historical time transport, credential isolation, and no fallback timezones passed.",
);
