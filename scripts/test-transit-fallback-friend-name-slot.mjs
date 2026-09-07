#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";
import { fillTransitFriendNameSlot as nodeFillTransitFriendNameSlot } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(root, "apps/web/src/content/fallbackArchitectureV3");
const browserEntry = path.join(packageRoot, "resolver/renderTransitSynastry.browser.ts");
const distEntry = path.join(packageRoot, "dist/tldr-content.js");
const tempBundle = path.join(os.tmpdir(), `tldr-transit-friend-name-${process.pid}.mjs`);

await build({
  entryPoints: [browserEntry],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: tempBundle,
  logLevel: "silent"
});
const browserModule = await import(`${pathToFileURL(tempBundle).href}?t=${Date.now()}`);
const distModule = await import(`${pathToFileURL(distEntry).href}?t=${Date.now()}`);

const tokenized = "{{Name}} doesn't have to fake it to get a good reaction right now.";
for (const [label, fillName] of [
  ["Node source", nodeFillTransitFriendNameSlot],
  ["browser source", browserModule.fillTransitFriendNameSlot],
  ["shipped dist", distModule.fillTransitFriendNameSlot]
]) {
  assert.equal(fillName(tokenized, "Avery"), "Avery doesn't have to fake it to get a good reaction right now.", `${label} must materialize the selected friend's name.`);
  assert.equal(fillName(tokenized, "you"), tokenized, `${label} must leave a misplaced You-surface Name token unresolved.`);
}

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
const templates = readJson("templates/fallback-templates-v3.json");
const baseRows = readJson("source-rows/fallback-source-rows-v3.json");
const transitLib = { authoredCards: [] };

function rowsWithNamedSunVenusEffect() {
  const rows = structuredClone(baseRows);
  rows.hookRows = rows.hookRows.filter((row) => row.contentKey !== "fallback-hook/transit-house-event-scenes/sun/venus/soft");
  const effect = rows.hookRows.find((row) => row.contentKey === "fallback-hook/transit-effect-soft/sun/venus");
  assert.ok(effect, "Sun/Venus soft transit-effect fixture must exist.");
  effect.body_they = tokenized;
  effect.review_status = "approved";
  return rows;
}

const facts = {
  planet: "sun",
  sign: "virgo",
  house: 4,
  natal: "venus",
  natalHouse: 8,
  aspect: "trine",
  window: "until September 11",
  voice: "Avery"
};
const browserRendered = browserModule
  .createTransitSynastryRenderer(transitLib, templates, rowsWithNamedSunVenusEffect())
  .renderTransitHouseEvent(facts);
const distRendered = distModule
  .createTransitSynastryRenderer(transitLib, templates, rowsWithNamedSunVenusEffect())
  .renderTransitHouseEvent(facts);

for (const [label, rendered] of [["browser source", browserRendered], ["shipped dist", distRendered]]) {
  assert.match(rendered.body, /Avery doesn't have to fake it/u, `${label} Personal Transit must render the friend name from the fallback hook.`);
  assert.doesNotMatch(rendered.body, /\{\{Name\}\}/u, `${label} Personal Transit must not leak the Name token.`);
}
assert.equal(browserRendered.body, distRendered.body, "Browser source and shipped dist must render the same named Friends fallback passage.");

console.log("Personal Transit fallback Friends {{Name}} slot contract passed.");
