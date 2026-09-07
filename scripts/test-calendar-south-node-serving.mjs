#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/sky-calendar-south-node-60-v1");
const recordsRoot = path.join(reviewRoot, "records");
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");
const servingAuthorization = JSON.parse(fs.readFileSync(path.join(reviewRoot, "owner-serving-authorization.json"), "utf8"));
const shippingManifest = JSON.parse(fs.readFileSync(path.join(reviewRoot, "shipping-manifest.json"), "utf8"));
const expectedBodies = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "lilith"];
const expectedAspects = ["conjunction", "sextile", "square", "trine", "opposition"];
const mirror = {
  conjunction: "opposition",
  sextile: "trine",
  square: "square",
  trine: "sextile",
  opposition: "conjunction"
};

assert.equal(servingAuthorization.authority, "owner");
assert.equal(servingAuthorization.decision, "approve");
assert.equal(servingAuthorization.memberCount, 60);
assert.equal(servingAuthorization.runtimeEligible, true);
assert.equal(servingAuthorization.contentStudioEditable, true);
assert.ok(servingAuthorization.capabilities.includes("serving"));
assert.ok(servingAuthorization.capabilities.includes("content_studio_sync"));
assert.equal(shippingManifest.rowCount, 60);
assert.equal(shippingManifest.geometryPolicy, "single-node-axis-event");
assert.equal(shippingManifest.editorialPolicy, "distinct-north-and-south-pole-copy");

let runtimeCount = 0;
for (const body of expectedBodies) {
  const packet = JSON.parse(fs.readFileSync(path.join(recordsRoot, `${body}.json`), "utf8"));
  for (const candidate of packet.records) {
    const runtimePath = path.join(transitRoot, `${body}-${candidate.aspect}-south-node.json`);
    assert.ok(fs.existsSync(runtimePath), `${candidate.contentKey}: missing South Node runtime source.`);
    const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf8"));
    assert.equal(runtime.status, "LIVE");
    assert.equal(runtime.transiting, body);
    assert.equal(runtime.aspect, candidate.aspect);
    assert.equal(runtime.other, "south-node");
    assert.equal(runtime.readerCopy.summary, candidate.summary, `${candidate.contentKey}: summary drifted during release.`);
    assert.equal(runtime.readerCopy.body, candidate.body, `${candidate.contentKey}: body drifted during release.`);
    assert.match(runtime.readerCopy.approvedVia, /owner-serving-authorization\.json/u);

    const northPath = path.join(transitRoot, `${body}-${mirror[candidate.aspect]}-north-node.json`);
    assert.ok(fs.existsSync(northPath), `${candidate.contentKey}: mirrored North Node runtime source is missing.`);
    const north = JSON.parse(fs.readFileSync(northPath, "utf8"));
    assert.notEqual(runtime.readerCopy.body, north.readerCopy.body, `${candidate.contentKey}: South Node copy reused North Node prose.`);
    runtimeCount += 1;
  }
}
assert.equal(runtimeCount, 60);
assert.equal(
  fs.readdirSync(transitRoot).filter((name) => name.endsWith("-south-node.json")).length,
  60,
  "Exactly 60 pole-specific South Node runtime sources must exist."
);

const seedRun = spawnSync(process.execPath, [path.join(repoRoot, "scripts/seed-published-calendar-aspect-content-studio.mjs")], {
  cwd: repoRoot,
  encoding: "utf8"
});
assert.equal(seedRun.status, 0, seedRun.stderr || "Content Studio seed contract failed.");
const seedResult = JSON.parse(seedRun.stdout);
assert.equal(seedResult.rows, 439, "Published exact Content Studio catalog must expand from 379 to 439 rows.");
assert.equal(seedResult.northNodeRows, 60, "Content Studio must retain 60 editable North Node exact rows.");
assert.equal(seedResult.southNodeRows, 60, "Content Studio must expose 60 editable South Node exact rows.");

const registryBundle = path.join(os.tmpdir(), "tldrastro-south-node-registry.bundle.mjs");
const routingBundle = path.join(os.tmpdir(), "tldrastro-south-node-routing.bundle.mjs");
const studioBundle = path.join(os.tmpdir(), "tldrastro-south-node-studio.bundle.mjs");

await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/content/skyRegistry.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: registryBundle,
  platform: "node"
});
await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/services/skyAspectRouting.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: routingBundle,
  platform: "node"
});
await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/services/skyAspectContent.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: studioBundle,
  platform: "node"
});

const { approvedExactSkyAspectCopy: exactLookup } = await import(`${pathToFileURL(registryBundle).href}?t=${Date.now()}`);
const { resolveApprovedExactSkyAspectCopy } = await import(`${pathToFileURL(routingBundle).href}?t=${Date.now()}`);
const { resolveSkyAspectContentStudioExact } = await import(`${pathToFileURL(studioBundle).href}?t=${Date.now()}`);

for (const { body, northAspect, southAspect } of [
  { body: "Mars", northAspect: "square", southAspect: "square" },
  { body: "Sun", northAspect: "opposition", southAspect: "conjunction" },
  { body: "Venus", northAspect: "trine", southAspect: "sextile" }
]) {
  const north = exactLookup(body, northAspect, "North Node");
  const south = exactLookup(body, southAspect, "South Node");
  assert.ok(north, `${body} ${northAspect} North Node exact copy is missing.`);
  assert.ok(south, `${body} ${southAspect} South Node exact copy is missing.`);
  const resolved = resolveApprovedExactSkyAspectCopy({
    aspect: northAspect,
    first: body,
    heading: `${body} ${northAspect} North Node`,
    lookup: exactLookup,
    second: "North Node",
    slots: { planetA: body, planetB: "North Node", signA: "Aries", signB: "Libra", dateLine: "Today" }
  });
  assert.ok(resolved);
  assert.ok(resolved.body.includes(north.body), `${body}: North Node approved body missing from one-event dual-pole output.`);
  assert.ok(resolved.body.includes(south.body), `${body}: South Node approved body missing from one-event dual-pole output.`);
  assert.match(resolved.body, new RegExp(`North Node \\(${northAspect}\\):`, "u"));
  assert.match(resolved.body, new RegExp(`South Node \\(${southAspect}\\):`, "u"));
  assert.ok(resolved.sourceKeys.includes(`packages/astro-knowledge/data/transits/${south.sourceId}.json`));
}

const marsNorth = exactLookup("Mars", "square", "North Node");
const marsSouth = exactLookup("Mars", "square", "South Node");
assert.ok(marsNorth && marsSouth);
const studioContent = new Map([
  ["sky.aspect.north-node.square.mars", {
    body: marsNorth.body,
    contentKey: "sky.aspect.north-node.square.mars",
    headline: "North Node Square Mars",
    sourceSnapshot: {
      contentStudioExactAspect: true,
      exactSkyAspectIdentity: { a: "north-node", b: "mars", aspect: "square" },
      nodeAxisPole: "north-node"
    }
  }],
  ["sky.aspect.south-node.square.mars", {
    body: marsSouth.body,
    contentKey: "sky.aspect.south-node.square.mars",
    headline: "South Node Square Mars",
    sourceSnapshot: {
      contentStudioExactAspect: true,
      exactSkyAspectIdentity: { a: "south-node", b: "mars", aspect: "square" },
      nodeAxisPole: "south-node"
    }
  }]
]);
const studioNorth = resolveSkyAspectContentStudioExact({
  generatedContent: studioContent,
  first: "Mars",
  second: "North Node",
  aspect: "square",
  firstSign: "Aries",
  secondSign: "Libra"
});
const studioSouth = resolveSkyAspectContentStudioExact({
  generatedContent: studioContent,
  first: "Mars",
  second: "South Node",
  aspect: "square",
  firstSign: "Aries",
  secondSign: "Libra"
});
assert.equal(studioNorth?.content.contentKey, "sky.aspect.north-node.square.mars");
assert.equal(studioSouth?.content.contentKey, "sky.aspect.south-node.square.mars");
assert.notEqual(studioNorth?.content.contentKey, studioSouth?.content.contentKey, "Content Studio exact resolver collapsed the two node poles.");
assert.equal(studioNorth?.body, marsNorth.body);
assert.equal(studioSouth?.body, marsSouth.body);

const skyDetailSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/sky/SkyDetailArticle.tsx"), "utf8");
assert.match(
  skyDetailSource,
  /southNodeMatch[\s\S]*?article-related-aspects__copy-heading[\s\S]*?<h4>\{southNodeHeading\}<\/h4>/u,
  "Paired South Node copy must render with the same aspect subtitle treatment as the North Node heading."
);

console.log("South Node Calendar serving + Content Studio contract passed", {
  geometryEventsAdded: 0,
  southNodeRuntimeRecords: runtimeCount,
  contentStudioRows: seedResult.rows,
  southNodeContentStudioRows: seedResult.southNodeRows,
  dualPoleRoutingSamples: 3
});
