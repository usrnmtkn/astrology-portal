import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function isoDate(value) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

const vite = await createServer({
  root: path.join(repoRoot, "apps/web"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error"
});

try {
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const sky = await ephemeris.getAstrodienstSky(ephemeris.defaultLocation, new Date("2026-07-22T16:00:00Z"), {
    includeTransitWindows: true
  });
  const northNode = sky.positions.find((position) => position.planet === "North Node");
  const southNode = sky.positions.find((position) => position.planet === "South Node");

  assert.ok(northNode, "Sky API must include North Node.");
  assert.ok(southNode, "Sky API must include South Node as a first-class position.");
  assert.equal(northNode.sign, "Pisces", "North Node should be in Pisces for the 2026-07-22 fixture.");
  assert.equal(southNode.sign, "Virgo", "South Node should be in Virgo for the 2026-07-22 fixture.");
  assert.equal(northNode.glyph, "☊", "North Node should keep the north-node glyph.");
  assert.equal(southNode.glyph, "☋", "South Node should keep the south-node glyph.");
  assert.notEqual(northNode.house, southNode.house, "South Node should not inherit North Node's house.");
  assert.equal(southNode.motion, "retrograde", "South Node should expose the node-axis retrograde state.");
  assert.equal(isoDate(southNode.transitStart), isoDate(northNode.transitStart), "Node axis transit starts together.");
  assert.equal(isoDate(southNode.transitEnd), isoDate(northNode.transitEnd), "Node axis transit ends together.");
  assert.equal(southNode.retrogradeWindowSource, "sign-transit", "South Node should use the node sign-transit window.");
} finally {
  await vite.close();
}
