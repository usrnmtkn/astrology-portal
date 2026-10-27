import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import SwissEph from "swisseph-wasm";
import { createServer } from "vite";
import calendarHandler from "../api/calendar.ts";
import { defaultLocation, getAstrodienstSky, getLunarCalendarDayEvents } from "../apps/web/src/services/ephemeris.ts";

test("Calendar week, month and Sky day feeds retain exact conjunctions and oppositions", async () => {
  const swe = new SwissEph();
  await swe.initSwissEph();
  const ids = { Sun: swe.SE_SUN, Moon: swe.SE_MOON, Mercury: swe.SE_MERCURY, Venus: swe.SE_VENUS };
  const fixtures = [
    { title: "Moon opposition Venus", date: "2026-10-25", instant: "2026-10-25T22:59:25Z", angle: 180 },
    { title: "Moon opposition Mercury", date: "2026-10-27", angle: 180 },
    { title: "Sun conjunction Venus", date: "2026-10-23", angle: 0 },
    { title: "Sun conjunction Mercury", date: "2026-11-04", angle: 0 }
  ];
  for (const timeZone of ["America/New_York", "Asia/Tokyo"]) {
    for (const mode of ["week", "month"]) {
      for (const fixture of fixtures) {
        const query = new URLSearchParams({ mode, detail: "full", date: fixture.date,
          lat: "40.7128", lon: "-74.006", timeZone });
        const res = { statusCode: 0, body: "", setHeader() {}, end(body: string) { this.body = body; } };
        await calendarHandler({ method: "GET", url: `/api/calendar?${query}` } as any, res as any);
        assert.equal(res.statusCode, 200);
        const calendar = JSON.parse(res.body).calendar;
        const events = calendar.events.filter((event: any) => event.title === fixture.title
          && Math.abs(Date.parse(event.startsAt) - Date.parse(`${fixture.date}T12:00:00Z`)) < 36 * 3_600_000);
        assert.equal(events.length, 1, `${mode} ${timeZone}: exactly one ${fixture.title}`);
        const event = events[0];
        if (fixture.instant) assert(Math.abs(Date.parse(event.startsAt) - Date.parse(fixture.instant)) < 2_000);
        const instant = new Date(event.startsAt);
        const jd = swe.julday(instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(),
          instant.getUTCHours() + instant.getUTCMinutes() / 60 + instant.getUTCSeconds() / 3600);
        const longitudes = event.planets.map((planet: keyof typeof ids) => swe.calc_ut(jd, ids[planet], swe.SEFLG_SWIEPH | swe.SEFLG_SPEED)[0]);
        const separation = Math.abs(((longitudes[0] - longitudes[1] + 540) % 360) - 180);
        assert(Math.abs(separation - fixture.angle) < 0.001, `${event.title}: direct Swiss exactness, rejecting wrap crossings`);
        const expectedKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(instant);
        assert.equal(event.dateKey, expectedKey);
        assert(calendar.days.find((day: any) => day.dateKey === expectedKey)?.events.some((item: any) => item.id === event.id));
        const dayEvents = await getLunarCalendarDayEvents({ ...defaultLocation, timeZone }, instant);
        assert(dayEvents.some(item => item.title === fixture.title), "Sky daily events must agree with Calendar");
      }
    }
  }
});

test("Full Moon Key aspects prioritize orb over earlier exact dates", async () => {
  const vite = await createServer({
    root: path.join(process.cwd(), "apps/web"), appType: "custom", logLevel: "silent", server: { middlewareMode: true },
    plugins: [{ name: "lunation-aspect-test-exports", enforce: "pre", transform(code, id) {
      if (id.endsWith("/src/App.tsx")) return code + "\nexport { currentSkyV4LunationDetailArticle };";
      if (id.includes("/fallbackArchitectureV3/authored-inputs/") && id.endsWith(".json?url")) return `export default ${fs.readFileSync(id.slice(0, -4), "utf8")};`;
    } }]
  });
  try {
    const app = await vite.ssrLoadModule("/src/App.tsx");
    const runtime = await vite.ssrLoadModule("/src/content/fallbackArchitectureV3Runtime.ts");
    await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
    await app.loadContentRegistry("sky");
    const startsAt = "2026-10-26T04:11:50Z";
    const sky = await getAstrodienstSky(defaultLocation, new Date(startsAt), { includeTransitWindows: true, transitWindowPlanets: ["Moon"] });
    const event = { id: "full-moon-fixture", type: "lunation", title: "Full Moon in Taurus", startsAt,
      dateKey: "2026-10-26", glyph: "○", primary: true, sign: "Taurus" };
    const article = (aspects: typeof sky.aspects) => app.currentSkyV4LunationDetailArticle({ event, sky: { ...sky, aspects }, generatedContent: new Map() });
    const headings = (aspects: typeof sky.aspects) => article(aspects).sections.map((section: any) => section.heading);
    const expected = ["Sun Opposition Moon", "Moon Square Pluto"];
    assert.deepEqual(headings(sky.aspects), expected, "The exact luminary opposition and 0.3° Pluto square outrank separating Venus/Chiron");
    assert(article(sky.aspects).sections.every((section: any) => section.body.startsWith("October 26\n\n")), "Selected cards retain their verified exact dates");
    assert.deepEqual(headings([...sky.aspects].reverse()), expected, "Input ordering cannot change ranking");
    const withoutSun = sky.aspects.filter(aspect => ![aspect.from, aspect.to].includes("Sun"));
    assert.deepEqual(headings(withoutSun), ["Moon Square Pluto", "Moon Opposition Venus Rx"]);
    assert.equal(article([]).sections.length, 0);
    const pluto = sky.aspects.find(aspect => aspect.from === "Moon" && aspect.to === "Pluto")!;
    assert.equal(article([pluto, pluto]).sections.length, 1, "Duplicate contacts cannot consume both slots");
    const sunPluto = sky.aspects.find(aspect => aspect.from === "Sun" && aspect.to === "Pluto")!;
    const sunMoon = sky.aspects.find(aspect => [aspect.from, aspect.to].every(planet => ["Sun", "Moon"].includes(planet)))!;
    assert.deepEqual(headings([sunMoon, { ...pluto, orb: 0.3, separation: 89.66 }, { ...sunPluto, orb: 0.3, separation: 90.31 }]),
      ["Sun Opposition Moon", "Sun Square Pluto"], "Rank by calculated separation before display rounding");
    assert.equal(sky.aspects.find(aspect => aspect.to === "Venus" && aspect.from === "Moon")?.exactAt?.slice(0, 10), "2026-10-25");
  } finally {
    await vite.close();
  }
});
