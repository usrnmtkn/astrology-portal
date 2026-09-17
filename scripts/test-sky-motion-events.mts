import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer } from "vite";
import { skyBodyLabel, skyPlacementLinkLabel, calendarMotionTitle } from "../apps/web/src/content/skyMotionLabels.ts";
import { skySummaryEventFacts } from "../apps/web/src/content/skySummaryEvents.ts";

assert.equal(skyBodyLabel("Neptune"), "Neptune");
assert.equal(skyPlacementLinkLabel("Mars", "Cancer"), "Mars in Cancer");
assert.equal(skyPlacementLinkLabel("Saturn", "Aries", "direct"), "Saturn in Aries");
assert.equal(skyPlacementLinkLabel("Saturn", "Aries", "retrograde"), "Saturn Rx in Aries");
const base = { id: "aspect-neptune-sextile-pluto-2026-09-09", type: "aspect" as const,
  title: "Neptune sextile Pluto", startsAt: "2026-09-09T00:00:00Z", dateKey: "2026-09-09",
  planets: ["Neptune", "Pluto"] as [string,string], aspect: "sextile", glyph: "♆♇", primary: true };
for (const fromMotion of ["direct", "retrograde"] as const) for (const toMotion of ["direct", "retrograde"] as const) {
  const event = { ...base, fromMotion, toMotion };
  const label = `Neptune${fromMotion === "retrograde" ? " Rx" : ""} sextiles Pluto${toMotion === "retrograde" ? " Rx" : ""}`;
  assert.equal(calendarMotionTitle(event), label);
  assert.deepEqual(skySummaryEventFacts([event, event], new Map()).exactAspects, [{ id: base.id, label }]);
  assert.equal(event.id, base.id);
}
assert.equal(calendarMotionTitle(base), "Neptune sextiles Pluto");
assert.equal(calendarMotionTitle({ ...base, type: "station", title: "Neptune stations direct" }), "Neptune stations direct");
const vite = await createServer({ root: `${process.cwd()}/apps/web`, appType: "custom", logLevel: "silent",
  server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true },
  plugins: [{ name: "event-motion-test-exports", enforce: "pre", transform(code, id) {
    if (id.endsWith("/services/ephemeris.ts")) return code + "\nexport { getSwissEph, exactPlanetSpeed, exactPlanetLongitude, findSkyAspects, findSkyPlacementResidencyAspects, aspectPassSeriesTiming };";
  } }] });
try {
  const ep = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const timing = await vite.ssrLoadModule("/src/services/skyAspectTiming.ts");
  const swe = await ep.getSwissEph();
  const ids: Record<string,number> = { Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4, Jupiter: 5, Saturn: 6, Uranus: 7, Neptune: 8, Pluto: 9, Chiron: 15, Lilith: 13 };
  let count = 0;
  let directNeptuneEvent;
  for (const [start,end] of [["2026-09-07", "2026-09-14"], ["2026-12-09", "2026-12-23"]]) {
    const events = [...ep.findSkyAspects(swe, new Date(start), new Date(end), "America/New_York"), ...ep.findSkyPlacementResidencyAspects(swe, new Date(start), new Date(end), "America/New_York", "Neptune")];
    assert.ok(events.length);
    directNeptuneEvent ??= events.find((event: any) => event.planets?.[1] === "Neptune" && event.toMotion === "direct");
    for (const event of events) {
      for (const [i,field] of [[0,"fromMotion"],[1,"toMotion"]] as const) {
        // Independent finite difference in longitude across exactness, not the event's speed field.
        const at = new Date(event.startsAt).getTime();
        const before = ep.exactPlanetLongitude(swe, ids[event.planets[i]], new Date(at - 30_000));
        const after = ep.exactPlanetLongitude(swe, ids[event.planets[i]], new Date(at + 30_000));
        const delta = (after - before + 540) % 360 - 180;
        assert.equal(event[field], delta < 0 ? "retrograde" : "direct", `${event.id} ${field}`);
      }
      count++;
    }
  }
  const single = ep.aspectPassSeriesTiming({ residualsAt: (date: Date) => [(date.getTime() - Date.parse("2026-12-31"))/86400000],
    motionIsRetrogradeAt: () => true, reference: new Date("2026-12-31"), presentationDegrees: 3,
    relativeSpeed: 1, fastestSpeed: 1, maxBoundaryCapDays: 60 });
  assert.equal(single.engagementPasses.length, 1, "Retrograde alone must not create repeat hits.");
  for (const count of [2,3,5]) for (let index=1; index<=count; index++) {
    const aspect = { timing: { passIndex: index, exactPasses: Array.from({length:count},(_,i)=>({exactAt: `${2025+i}-12-31T00:00:00Z`, firstMotion: "retrograde", secondMotion: "direct"})) } };
    assert.equal(timing.skyAspectMultiPassLine(aspect), `Pass ${index} of ${count}.`);
  }
  assert.equal(timing.skyAspectMultiPassLine({timing:{passIndex:1,exactPasses:[{exactAt:"bad"},{exactAt:"bad"}]}}), null);
  for (const [index, dates] of [[0, ["2026-01-01", "2026-02-01"]], [3, ["2026-01-01", "2026-02-01"]], [1, ["2026-01-01", "2026-01-01"]], [1, ["2026-02-01", "2026-01-01"]]] as const) {
    assert.equal(timing.skyAspectMultiPassLine({ timing: { passIndex: index, exactPasses: dates.map(exactAt => ({exactAt})) } }), null);
  }
  const calendar = await ep.getLunarCalendarWeek(ep.defaultLocation, new Date("2026-09-07T16:00:00Z"), { detail: "full" });
  fs.mkdirSync("test-results/sky-retrograde", { recursive: true });
  assert.ok(directNeptuneEvent, "Include an exact event after Neptune stations direct.");
  fs.writeFileSync("test-results/sky-retrograde/direct-neptune-event.json", JSON.stringify(directNeptuneEvent));
  fs.writeFileSync("test-results/sky-retrograde/calendar-motion-fixture.json", JSON.stringify(calendar));
  console.log(`PASS: all motion permutations, unknown motion, stable IDs, ${count} exact events across Neptune's station, single Rx pass, 2/3/5-pass labels, Calendar fixture.`);
} finally { await vite.close(); }
