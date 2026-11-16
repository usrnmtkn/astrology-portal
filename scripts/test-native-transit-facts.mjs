import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createNativeTransitHandler } from "../api/native-transit-facts.ts";
import { readNativeTransitInput } from "../api/_lib/native-transit-input.ts";
import {
  natalDailyTransitPeaksFor,
  natalTransitTimingFor,
  relationshipForecastDayFor,
} from "../apps/web/src/services/ephemeris.ts";
import { transitToNatalOrbLimit } from "../apps/web/src/astrologyConfig.ts";
const base = {
  version: "tldrastro-calculation-v5",
  referenceAt: "2026-11-16T17:00:00.000Z",
  timeZone: "America/New_York",
};
async function request(
  handler,
  body,
  method = "POST",
  contentType = "application/json",
) {
  const req = Readable.from([
    typeof body === "string" ? body : JSON.stringify(body),
  ]);
  req.method = method;
  req.headers = { "content-type": contentType };
  const headers = {};
  let result;
  const res = {
    statusCode: 200,
    setHeader(k, v) {
      headers[k.toLowerCase()] = v;
    },
    end(value) {
      result = JSON.parse(value);
    },
  };
  await handler(req, res);
  return { status: res.statusCode, headers, body: result };
}
let calls = [];
const fake = createNativeTransitHandler({
  daily: async (...args) => {
    calls.push(args);
    return [{ id: "fixture" }];
  },
  timing: async (...args) => {
    calls.push(args);
    return { fixture: true };
  },
  forecast: async (...args) => {
    calls.push(args);
    return [];
  },
});
assert.equal((await request(fake, {}, "GET")).status, 405);
assert.equal((await request(fake, {}, "POST", "text/plain")).status, 415);
assert.equal((await request(fake, "{")).status, 400);
assert.equal((await request(fake, " ".repeat(65_537))).status, 413);
for (const patch of [
  { version: "stale" },
  { referenceAt: "2026-02-30T17:00:00Z" },
  { timeZone: "Not/AZone" },
  { longitude: 360 },
  { longitude: -1 },
  { longitude: NaN },
  { planet: "Unsupported" },
  { aspectDegrees: 45 },
])
  assert.throws(() =>
    readNativeTransitInput({
      ...base,
      kind: "timing",
      planet: "Moon",
      longitude: 315,
      aspectDegrees: 0,
      ...patch,
    }),
  );
assert.throws(() =>
  readNativeTransitInput({
    ...base,
    kind: "daily",
    planets: ["Moon", "Moon"],
    targets: [{ planet: "Sun", longitude: 315 }],
  }),
);
assert.throws(() =>
  readNativeTransitInput({
    ...base,
    kind: "daily",
    planets: ["Moon"],
    targets: [
      { planet: "Sun", longitude: 315 },
      { planet: "Sun", longitude: 10 },
    ],
  }),
);
const timingInput = {
  ...base,
  kind: "timing",
  planet: "Moon",
  longitude: 315,
  aspectDegrees: 0,
};
const timing = await request(fake, timingInput);
assert.equal(timing.status, 200);
assert.equal(timing.headers["cache-control"], "private, no-store");
assert.deepEqual(calls.pop(), [
  "Moon",
  315,
  base.referenceAt,
  {
    aspectDegrees: 0,
    presentationDegrees: transitToNatalOrbLimit("Moon"),
    timeZone: base.timeZone,
  },
]);
const dailyInput = {
  ...base,
  kind: "daily",
  planets: ["Moon"],
  targets: [{ planet: "Sun", longitude: 315 }],
};
const daily = await request(fake, dailyInput);
assert.equal(daily.status, 200);
assert.deepEqual(calls.pop(), [
  ["Moon"],
  dailyInput.targets,
  base.referenceAt,
  base.timeZone,
]);
const named = await request(fake, {
  ...base,
  kind: "timings",
  contacts: [
    {
      id: "friend:Moon:trine:North Node",
      planet: "Moon",
      longitude: 315,
      aspectDegrees: 120,
    },
  ],
});
assert.equal(named.status, 200);
const batch = await request(fake, {
  ...base,
  kind: "timings",
  contacts: [
    {
      id: "moon-conjunction-sun",
      planet: "Moon",
      longitude: 315,
      aspectDegrees: 0,
      referenceAt: base.referenceAt,
    },
  ],
});
assert.equal(batch.status, 200);
assert.deepEqual(batch.body.result, [
  { id: "moon-conjunction-sun", timing: { fixture: true } },
]);
assert.equal(
  (
    await request(fake, {
      ...base,
      kind: "timings",
      contacts: Array.from({ length: 33 }, (_, i) => ({
        id: `contact-${i}`,
        planet: "Moon",
        longitude: 315,
        aspectDegrees: 0,
      })),
    })
  ).status,
  400,
);
const failing = createNativeTransitHandler({
  daily: async () => {
    throw Error("private engine detail");
  },
  timing: async () => {
    throw Error("private engine detail");
  },
  forecast: async () => {
    throw Error("private engine detail");
  },
});
const failure = await request(failing, timingInput);
assert.equal(failure.status, 503);
assert.ok(!JSON.stringify(failure).includes("private engine detail"));
// Exercise the real shipped Swiss implementation and its exact response through HTTP glue.
const live = createNativeTransitHandler();
const realDaily = await request(live, dailyInput);
assert.equal(realDaily.status, 200);
assert.deepEqual(
  realDaily.body.result,
  await natalDailyTransitPeaksFor(
    dailyInput.planets,
    dailyInput.targets,
    base.referenceAt,
    base.timeZone,
  ),
);
const realTiming = await request(live, timingInput);
assert.equal(realTiming.status, 200);
assert.deepEqual(
  realTiming.body.result,
  await natalTransitTimingFor("Moon", 315, base.referenceAt, {
    aspectDegrees: 0,
    presentationDegrees: transitToNatalOrbLimit("Moon"),
    timeZone: base.timeZone,
  }),
);
assert.ok(
  realTiming.body.result?.engagementStart &&
    realTiming.body.result?.engagementEnd,
);
const forecastPair = {
  id: "fixture-pair",
  people: [
    {
      owner: "reader",
      birthDate: "1990-01-01",
      ascendant: "Aries",
      targets: [{ planet: "Sun", longitude: 315 }],
    },
    {
      owner: "friend",
      birthDate: "",
      ascendant: "Gemini",
      targets: [{ planet: "Sun", longitude: 315 }],
    },
  ],
  synastry: [
    {
      id: "sun-conjunction-sun",
      readerPoint: "Sun",
      friendPoint: "Sun",
      aspect: "conjunction",
      orb: 0,
    },
  ],
};
const forecastInput = { ...base, kind: "forecast", pairs: [forecastPair] };
const realForecast = await request(live, forecastInput);
assert.equal(realForecast.status, 200);
assert.equal(realForecast.body.policy, "natal-synastry-daily-v2");
assert.deepEqual(
  realForecast.body.result,
  await relationshipForecastDayFor([forecastPair], "2026-11-16", base.timeZone),
);
assert.equal(realForecast.body.result[0].day.date, "2026-11-16");
assert.ok(
  realForecast.body.result[0].day.annualTiming.every(
    (t) => t.owner === "reader",
  ),
);
assert.equal(
  (
    await request(fake, {
      ...forecastInput,
      pairs: Array.from({ length: 5 }, () => forecastPair),
    })
  ).status,
  400,
);
console.log(
  "Native transit API: bounded HTTP inputs, canonical orb policy, fail-closed errors, and real Swiss daily/timing/relationship-forecast parity passed.",
);

const allPlanets = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith",
  "North Node",
  "South Node",
];
const fullInput = {
  ...base,
  kind: "daily",
  planets: allPlanets,
  targets: [
    ...allPlanets.map((planet, i) => ({
      planet,
      longitude: (315 + i * 5) % 360,
    })),
    { planet: "Ascendant", longitude: 71.04 },
    { planet: "Midheaven", longitude: 316.58 },
    { planet: "Descendant", longitude: 251.04 },
    { planet: "Imum Coeli", longitude: 136.58 },
  ],
};
assert.equal((await request(live, fullInput)).status, 200);

for (const referenceAt of [
  "2026-02-18T17:00:00.000Z",
  "2026-09-08T17:00:00.000Z",
]) {
  const input = { ...dailyInput, referenceAt };
  const response = await request(live, input);
  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.result,
    await natalDailyTransitPeaksFor(
      input.planets,
      input.targets,
      referenceAt,
      base.timeZone,
    ),
  );
  const timingRequest = {
    ...timingInput,
    referenceAt,
    planet: "Saturn",
    longitude: 240,
    aspectDegrees: 90,
  };
  const responseTiming = await request(live, timingRequest);
  assert.equal(responseTiming.status, 200);
  assert.deepEqual(
    responseTiming.body.result,
    await natalTransitTimingFor("Saturn", 240, referenceAt, {
      aspectDegrees: 90,
      presentationDegrees: transitToNatalOrbLimit("Saturn"),
      timeZone: base.timeZone,
    }),
  );
}

const { getRetrogradeHistory } =
  await import("../apps/web/src/services/ephemeris.ts");
for (const referenceAt of [
  "2026-11-01T17:00:00.000Z",
  "2025-11-15T17:00:00.000Z",
]) {
  const source = await getRetrogradeHistory({
    planet: "Mercury",
    referenceDate: new Date(referenceAt),
  });
  assert.equal(source.status, "ready");
  const sign = source.sign[0].toUpperCase() + source.sign.slice(1);
  const input = {
    ...base,
    kind: "retrograde-history",
    planet: "Mercury",
    sign,
    referenceAt,
  };
  const response = await request(live, input);
  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.result,
    await getRetrogradeHistory({
      planet: "Mercury",
      sign,
      referenceDate: new Date(referenceAt),
    }),
  );
  assert.equal((await request(fake, { ...input, planet: "Moon" })).status, 400);
}
console.log(
  "Retrograde comparison: exact current, previous and next same-sign Swiss cycles passed on two dates.",
);
