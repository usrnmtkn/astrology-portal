import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bond-effect-page-"));
try {
  await build({
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: path.join(dir, "assembly.mjs"),
    logLevel: "silent",
    stdin: {
      resolveDir: process.cwd(),
      contents: `export * from "./apps/admin/src/bondEffectPageAssembly.ts";`
    }
  });
  const assembly = await import(pathToFileURL(path.join(dir, "assembly.mjs")));
  assert.deepEqual(
    assembly.parseBondEffectContentKey("fallback-hook/bond-effect-trine/mercury"),
    { aspect: "trine", planet: "mercury" }
  );
  const keys = assembly.synastryPairLookupOrder("ascendant", "saturn", "square").map((item) => item.contentKey);
  assert.deepEqual(keys, [
    "fallback-hook/synastry-pair/ascendant/saturn/square",
    "fallback-hook/synastry-pair/saturn/ascendant/square",
    "fallback-hook/synastry-pair/ascendant/saturn/hard",
    "fallback-hook/synastry-pair/saturn/ascendant/hard"
  ]);
  assert.equal(
    assembly.bondEffectPageHeadline("mercury", "trine", "ascendant"),
    "Mercury trine your Ascendant"
  );
  assert.equal(
    assembly.bondActivationHeadline("ascendant", "square", "Name", "saturn"),
    "Your Ascendant square Name's Saturn"
  );
  assert.equal(
    assembly.bondCalculatedFactLine({
      planet: "mercury",
      transitSign: "libra",
      transitHouse: "5",
      aspect: "trine",
      natalPoint: "ascendant",
      natalSign: "gemini"
    }),
    "Mercury in Libra in your 5th house is trine your natal Ascendant in Gemini."
  );
  const reverse = assembly.synastryBodiesFromPayload({
    ok: true,
    rows: [],
    packageSource: {
      contentKey: "fallback-hook/synastry-pair/saturn/ascendant/hard",
      body_you: "You may point out problems in how {{holder2}} comes across.",
      body_they: "{{holder1}} may point out problems in how you come across."
    }
  });
  assert.equal(
    assembly.fillNamedSlots(reverse.body_they, assembly.synastryHolderSlots(false, "Name")),
    "Name may point out problems in how you come across."
  );
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

const dashboard = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
const preview = fs.readFileSync(new URL("../apps/admin/src/BondEffectPagePreview.tsx", import.meta.url), "utf8");
assert.match(dashboard, /BondEffectPagePreview/u);
assert.match(dashboard, /This row is only the opening on the Friends Between you two page/u);
assert.match(preview, /Assembled Friends page/u);
assert.match(preview, /What this activates/u);
assert.match(preview, /This last line is calculated from the chart/u);
console.log("Content Studio bond-effect Friends page assembly passed.");
