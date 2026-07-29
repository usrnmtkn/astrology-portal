import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const vite = await createServer({
  root: path.join(repoRoot, "apps/web"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error"
});

try {
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const astrologyDisplay = await vite.ssrLoadModule("/src/services/astrologyDisplay.ts");
  const beforeIngress = await ephemeris.getAstrodienstSky(
    ephemeris.defaultLocation,
    new Date("2026-07-22T16:00:00Z")
  );
  const sky = await ephemeris.getAstrodienstSky(ephemeris.defaultLocation, new Date("2026-07-29T16:00:00Z"), {
    includeTransitWindows: true
  });
  const beforeNorthNode = beforeIngress.positions.find((position) => position.planet === "North Node");
  const beforeSouthNode = beforeIngress.positions.find((position) => position.planet === "South Node");
  const northNode = sky.positions.find((position) => position.planet === "North Node");
  const southNode = sky.positions.find((position) => position.planet === "South Node");

  assert.equal(beforeNorthNode?.sign, "Pisces", "True North Node should still be in Pisces on 2026-07-22.");
  assert.equal(beforeSouthNode?.sign, "Virgo", "True South Node should still be in Virgo on 2026-07-22.");
  assert.ok(northNode, "Sky API must include North Node.");
  assert.ok(southNode, "Sky API must include South Node as a first-class position.");
  assert.equal(northNode.sign, "Aquarius", "True North Node should be in Aquarius after the July 2026 ingress.");
  assert.equal(southNode.sign, "Leo", "True South Node should be in Leo after the July 2026 ingress.");
  assert.ok(northNode.longitude >= 329 && northNode.longitude < 330, "True North Node should be near 29° Aquarius.");
  assert.ok(
    Math.abs(((southNode.longitude - northNode.longitude + 360) % 360) - 180) < 0.0001,
    "South Node should stay exactly opposite North Node."
  );
  assert.equal(northNode.glyph, "☊", "North Node should keep the north-node glyph.");
  assert.equal(southNode.glyph, "☋", "South Node should keep the south-node glyph.");
  assert.notEqual(northNode.house, southNode.house, "South Node should not inherit North Node's house.");
  assert.equal(southNode.motion, "retrograde", "South Node should expose the node-axis retrograde state.");
  assert.equal(astrologyDisplay.isDisplayRetrograde(northNode), false, "North Node must not render as a retrograde planet.");
  assert.equal(astrologyDisplay.isDisplayRetrograde(southNode), false, "South Node must not render as a retrograde planet.");
  assert.equal(sky.calculationProvenance.nodeType, "true", "Calculation provenance must disclose True Node.");
  assert.equal(sky.calculationProvenance.calculationVersion, "tldrastro-calculation-v2");
} finally {
  await vite.close();
}
