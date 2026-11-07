import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createServer } from "vite";

// Exercise the real app adapter with explicit fact fixtures, without running
// the separate all-body ephemeris scan. The Lilith boundaries were independently
// checked with direct Swiss body 13; fixtures never supply runtime facts.
const baseline = process.env.PLACEMENT_LABEL_BASELINE_REF;
if (baseline) assert.match(baseline, /^[a-f0-9]{40}$/);
const vite = await createServer({
  root: path.join(process.cwd(), "apps/web"), appType: "custom", logLevel: "silent", server: { middlewareMode: true },
  plugins: [{ name: "placement-range-contract", enforce: "pre", transform(code, id) {
    if (id.endsWith("/src/App.tsx")) {
      const source = baseline ? execFileSync("git", ["show", `${baseline}:apps/web/src/App.tsx`], { encoding: "utf8" }) : code;
      return source + "\nexport { currentSkyPlacementDetailArticle };";
    }
    if (id.includes("/fallbackArchitectureV3/authored-inputs/") && id.endsWith(".json?url")) {
      return `export default ${fs.readFileSync(id.slice(0, -4), "utf8")};`;
    }
  } }]
});
try {
  const app = await vite.ssrLoadModule("/src/App.tsx");
  const runtime = await vite.ssrLoadModule("/src/content/fallbackArchitectureV3Runtime.ts");
  await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
  await app.loadContentRegistry("sky");
  const render = (position: any, generatedAt: string, articleMode = "current") => app.currentSkyPlacementDetailArticle({
    position, positions: [position], aspects: [], generatedAt, generatedContent: new Map(), articleMode,
    locationTimeZone: position.transitTimeZone
  });
  const position = (planet: string, sign: string, passes: Array<{ entryDate: string; exitDate: string }>) => ({
    planet, sign, glyph: "*", degree: 15, longitude: 255, latitude: 0, speed: 1, motion: "direct",
    transitTimeZone: "America/New_York", transitStart: passes[0].entryDate, transitEnd: passes.at(-1)!.exitDate,
    residencyPasses: passes
  });
  const lilith = position("Lilith", "Sagittarius", [
    { entryDate: "2025-10-25T04:35:24.999Z", exitDate: "2025-11-01T08:05:20.999Z" },
    { entryDate: "2026-10-20T16:57:22.999Z", exitDate: "2026-11-07T07:58:33.999Z" },
    { entryDate: "2026-12-27T09:47:32.999Z", exitDate: "2027-01-03T18:27:19.999Z" }
  ]);
  for (const [zone, visit, full] of [
    ["America/New_York", "October 20 to November 7, 2026", "October 25, 2025 to January 3, 2027"],
    ["UTC", "October 20 to November 7, 2026", "October 25, 2025 to January 3, 2027"],
    ["Asia/Tokyo", "October 21 to November 7, 2026", "October 25, 2025 to January 4, 2027"]
  ]) {
    const article = render({ ...lilith, transitTimeZone: zone }, "2026-11-04T17:21:35Z");
    assert.equal(article.duration, visit);
    assert.equal(article.residencyDuration, `Full residency in Sagittarius: ${full}`);
    assert.equal(article.title, "True Black Moon Lilith in Sagittarius");
  }
  const venus = position("Venus", "Scorpio", [
    { entryDate: "2026-09-10T08:00:00Z", exitDate: "2026-10-25T12:00:00Z" },
    { entryDate: "2026-12-04T12:00:00Z", exitDate: "2027-01-07T12:00:00Z" }
  ]);
  for (const [reference, visit] of [
    ["2026-09-14T12:00:00Z", "September 10 to October 25, 2026"],
    ["2026-12-10T12:00:00Z", "December 4, 2026 to January 7, 2027"]
  ]) {
    const article = render(venus, reference);
    assert.equal(article.duration, visit);
    assert.equal(article.residencyDuration, "Full residency in Scorpio: September 10, 2026 to January 7, 2027");
  }
  const retrograde = render({ ...venus, motion: "retrograde", speed: -1,
    retrogradeStart: "2026-10-03T12:00:00Z", retrogradeEnd: "2026-11-13T12:00:00Z" }, "2026-10-14T12:00:00Z");
  assert.equal(retrograde.duration, "Oct 3, 2026 - Nov 13, 2026");
  assert.equal(retrograde.residencyDuration, "Full residency in Scorpio: September 10, 2026 to January 7, 2027");
  const sun = position("Sun", "Virgo", [{ entryDate: "2026-08-23T12:00:00Z", exitDate: "2026-09-23T12:00:00Z" }]);
  assert.equal(render(sun, "2026-09-01T12:00:00Z").residencyDuration, undefined);
  assert.equal(render(lilith, "2026-11-04T17:21:35Z", "archive").residencyDuration, undefined);
  console.log("PASS actual placement adapter: explicit current visit/full-residency labels, Lilith three zones, Venus return/retrograde, single-pass Sun and archive scope.");
} finally {
  await vite.close();
}
