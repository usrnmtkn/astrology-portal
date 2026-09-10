import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const outFile = path.join(os.tmpdir(), `sky-you-transit-parity-${process.pid}.mjs`);
await build({
  bundle: true, format: "esm", platform: "node", outfile: outFile, logLevel: "silent",
  define: { "import.meta.env": "{}" }, loader: { ".css": "empty", ".svg": "dataurl" },
  stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    export { personalizedSkyPlacementDetail, friendsViewModelDependencies } from "./apps/web/src/App.tsx";
    export { installContentPublications } from "./apps/web/src/content/contentPublicationState.ts";
    export { loadDeferredFallbackArchitectureV3Bundle } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
  ` }
});
try {
  const runtime = await import(pathToFileURL(outFile));
  await runtime.loadDeferredFallbackArchitectureV3Bundle();
  const bodies = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "Lilith", "North Node", "South Node"];
  const natalPoints = [...bodies, "Ascendant", "Descendant", "Midheaven", "Imum Coeli"];
  const slug = value => value.toLowerCase().replaceAll(" ", "-");
  const fixture = (transitPlanet, natalPoint, aspect, transitMotion = "direct") => ({
    id: `${slug(transitPlanet)}-${slug(natalPoint)}-${aspect}`, term: "short",
    transitPlanet, natalPoint, aspect, transitMotion, transitSign: "Aries", natalSign: "Aries",
    natalHouse: 1, currentSpeed: 0.98, glyph: "", orb: "0 30'", arc: [], note: ""
  });
  const sky = (transit, date) => runtime.personalizedSkyPlacementDetail({
    routePath: `sky/placement/${slug(transit.transitPlanet)}/aries`,
    risingHoroscopes: [{ house: 1, risingSign: "Aries", body: "House fixture." }],
    articleAspectPassages: [{ body: "Obsolete compiled article must never revive missing copy." }]
  }, "Aries", [transit], date).personalizedPlacement.natalAspects[0].body;
  const you = (transit, date) => runtime.friendsViewModelDependencies.normalizePersonalTransitSurface(transit, date).sections[0]?.body ?? null;
  let checked = 0;
  let gaps = 0;
  for (const planet of bodies) for (const natal of natalPoints) for (const aspect of ["conjunction", "sextile", "square", "trine", "opposition"]) {
    if (natal === "Lilith" && !["conjunction", "opposition"].includes(aspect)) continue;
    for (const motion of ["direct", "retrograde"]) {
      const transit = fixture(planet, natal, aspect, motion);
      const expected = you(transit, "2026-09-10");
      assert.equal(sky(transit, "2026-09-10T23:20:00Z"), expected, `${transit.id}/${motion}`);
      checked++;
      if (!expected) gaps++;
    }
  }
  const northNode = fixture("Sun", "North Node", "conjunction");
  for (const day of ["2026-09-09", "2026-09-10"]) for (const hour of ["04:20", "23:20"]) {
    assert.equal(sky(northNode, `${day}T${hour}:00Z`), you(northNode, day));
  }
  const timed = { ...northNode, timing: { engagementStart: "2026-09-06T00:00:00Z", engagementEnd: "2026-09-12T00:00:00Z", exactPasses: [], passIndex: 1 } };
  assert.equal(sky(timed, "2026-09-10T23:20:00Z"), you(timed, "2026-09-10"));
  assert.match(sky(timed, "2026-09-10T23:20:00Z"), /until September 12/u);
  assert.notEqual(sky(timed, "2026-09-10T23:20:00Z"), sky(northNode, "2026-09-10T23:20:00Z"), "Timing hydration must update the prose window.");
  const key = "authored/transit-aspect/sun/north-node/conjunction";
  assert.ok(sky(northNode, "2026-09-10T23:20:00Z"));
  runtime.installContentPublications([{ content_key: key, state: "retired", revision: 1, row_id: null, row_updated_at: null, updated_at: "2026-09-10T00:00:00Z" }]);
  assert.equal(you(northNode, "2026-09-10"), null);
  assert.equal(sky(northNode, "2026-09-10T23:20:00Z"), null, "Sky must not fall through to independent compiled prose after retirement.");
  assert.equal(checked, 2436);
  assert.ok(gaps > 0, "Exercise shared source-gap behavior as well as approved prose.");
  console.log(`Sky/You app-facing parity passed: ${checked} aspect/motion routes, ${gaps} shared source gaps, date anchors, precise timing, and retirement.`);
} finally {
  fs.rmSync(outFile, { force: true });
}
