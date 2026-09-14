import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import { fillSkyPlacementVariables, skyPlacementVariableFacts } from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";
import { fillSkyPlacementArticleVariables } from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs";

const vite = await createServer({
  root: path.join(process.cwd(), "apps/web"), appType: "custom", logLevel: "silent", server: { middlewareMode: true },
  plugins: [{ name: "key-dates-test-exports", enforce: "pre", transform(code, id) {
    if (id.endsWith("/src/App.tsx")) return code + "\nexport { skyPlacementKeyDates, currentSkyPlacementDetailArticle, loadContentRegistry };";
    if (id.includes("/fallbackArchitectureV3/authored-inputs/") && id.endsWith(".json?url")) return `export default ${fs.readFileSync(id.slice(0, -4), "utf8")};`;
  } }]
});
try {
  const app = await vite.ssrLoadModule("/src/App.tsx");
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const runtime = await vite.ssrLoadModule("/src/content/fallbackArchitectureV3Runtime.ts");
  await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
  await app.loadContentRegistry("sky");
  const location = { label: "Test", latitude: 40.7, longitude: -74, timeZone: "America/New_York" };
  const date = new Date("2026-09-12T12:00:00Z");
  const current = await ephemeris.getAstrodienstSky(location, date);
  const bodies = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "Lilith", "North Node", "South Node"]);
  const cases = current.positions.filter((position: any) => bodies.has(position.planet)).map((position: any) => ({ planet: position.planet, sign: position.sign, date }));
  cases.push({ planet: "Mercury", sign: "Cancer", date: new Date("2026-07-10T12:00:00Z") });
  const angles: Record<string, number> = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
  for (const item of cases) {
    const sky = await ephemeris.getSkyPlacementSnapshot(location, item.planet.toLowerCase().replaceAll(" ", "-"), item.sign, item.date, true);
    const position = sky.positions.find((position: any) => position.planet === item.planet);
    const facts = sky.placementAspectFacts;
    const events = [...new Map(facts.inSign.map((event: any) => [event.id, event])).values()] as any[];
    events.sort((a, b) => a.occursAt.localeCompare(b.occursAt));
    const format = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: location.timeZone });
    const expected = events.map(event => ({ date: format.format(new Date(event.occursAt)), label: `${item.planet} ${event.aspect} ${event.otherPlanet}` }));
    const dates = app.skyPlacementKeyDates(position, facts);
    assert.deepEqual(dates.filter((entry: any) => expected.some(event => event.label === entry.label)), expected, `${item.planet}: every calculated hit appears in order`);
    assert.deepEqual(app.skyPlacementKeyDates(position, { ...facts, inSign: [...facts.inSign, ...facts.inSign] }), dates, "Repeated input rows deduplicate, distinct exact passes survive");
    assert.deepEqual(app.skyPlacementKeyDates(position, { ...facts, sign: "wrong" }), app.skyPlacementKeyDates(position), "Facts from another sign cannot leak");
    const detail = app.currentSkyPlacementDetailArticle({ position, positions: sky.positions, aspects: sky.aspects, aspectFacts: facts, generatedAt: sky.generatedAt, generatedContent: new Map() });
    assert.deepEqual(detail.keyDates.filter((entry: any) => expected.some(event => event.label === entry.label)), expected,
      `${item.planet}: real app article receives every exact aspect alongside its existing lifecycle dates`);
    if (item.planet === "Sun") {
      assert.deepEqual(dates, [
        { date: "August 22, 2026", label: "Sun enters Virgo" },
        { date: "August 27, 2026", label: "Sun conjunction Mercury" },
        { date: "August 28, 2026", label: "Sun square Uranus" },
        { date: "September 2, 2026", label: "Sun trine Lilith" },
        { date: "September 10, 2026", label: "Sun trine Lilith" },
        { date: "September 14, 2026", label: "Sun sextile Mars" },
        { date: "September 20, 2026", label: "Sun square Lilith" },
        { date: "September 22, 2026", label: "Sun completes its passage through Virgo" }
      ]);
    }
    if (item.planet === "Sun" || item.date.getUTCMonth() === 6) {
      for (const event of events) {
        const direct = await ephemeris.getAstrodienstSky(location, new Date(event.occursAt));
        const first = direct.positions.find((p: any) => p.planet === item.planet);
        const second = direct.positions.find((p: any) => p.planet === event.otherPlanet);
        const separation = Math.abs(((first.longitude - second.longitude + 540) % 360) - 180);
        assert(Math.abs(separation - angles[event.aspect]) < 0.001, `Direct ephemeris confirms ${event.id}`);
        assert.equal(first.sign, item.sign);
      }
    }
    const variables = skyPlacementVariableFacts({ planet: item.planet, sign: item.sign, aspectFacts: facts });
    const article = fillSkyPlacementArticleVariables("{{aspectsInSign}}", variables);
    if (events.length) assert.equal(article, expected.map(event => `${event.date}: ${event.label}`).join(", "));
    assert.doesNotMatch(article, /(?:^|\n)- /u);
    assert.equal(fillSkyPlacementVariables("{{aspectsInSign}}", variables), variables.aspectsInSign, "Section templates retain multiline fact lists");
    console.log(`PASS ${item.planet} in ${item.sign}: ${events.length} exact hits, complete article timeline and inline aspect list.`);
  }
  assert.equal(cases.length, bodies.size + 1);
} finally { await vite.close(); }
