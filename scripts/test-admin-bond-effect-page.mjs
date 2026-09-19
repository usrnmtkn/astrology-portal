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
  assert.equal(
    assembly.bondEffectExactContentKey("chiron", "sextile"),
    "fallback-hook/bond-effect-sextile/chiron"
  );
  assert.deepEqual(assembly.friendsTransitCardDestinations("Chiron sextile your Sun").betweenYouTwoOpeningKey, "fallback-hook/bond-effect-sextile/chiron");
  assert.equal(assembly.friendsTransitCardDestinations("Chiron sextile your Sun").activeForNameKey, "authored/transit-aspect/chiron/sun/sextile");
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
  assert.deepEqual(assembly.parseAstroContactSearch("Moon Sextile Mars"), {
    transiting: "moon",
    aspect: "sextile",
    natal: "mars"
  });
  assert.deepEqual(assembly.parseAstroContactSearch("Moon sextile your Mars"), {
    transiting: "moon",
    aspect: "sextile",
    natal: "mars"
  });
  assert.equal(assembly.matchesBondEffectContactSearch("fallback-hook/bond-effect-sextile/moon", "Moon sextile Mars"), true);
  assert.equal(assembly.matchesBondEffectContactSearch("bond-effect-sextile/moon", "Moon Sextile Mars"), true);
  assert.equal(assembly.matchesBondEffectContactSearch("fallback-hook/bond-effect-trine/moon", "Moon sextile Mars"), false);
  assert.equal(assembly.matchesBondEffectContactSearch("fallback-hook/bond-effect-sextile/venus", "Moon sextile Mars"), false);
  assert.deepEqual(assembly.parseAstroContactSearch("Mars conjunct Moon"), {
    transiting: "mars",
    aspect: "conjunction",
    natal: "moon"
  });
  assert.deepEqual(assembly.transitNatalSearchSelection("Mars conjunct Moon"), {
    planet: "mars",
    aspect: "conjunction",
    natalPoint: "moon"
  });
  assert.equal(assembly.matchesTransitNatalContactSearch("authored/transit-aspect/mars/moon/conjunction", "Mars conjunct Moon"), true);
  assert.equal(assembly.matchesTransitNatalContactSearch("authored/transit-aspect/mars/moon/soft", "Mars conjunct Moon"), true);
  assert.equal(assembly.matchesTransitNatalContactSearch("authored/transit-aspect/mars/moon/hard", "Mars conjunct Moon"), false);
  assert.equal(assembly.matchesTransitNatalContactSearch("authored/transit-aspect/mars/moon/conjunction/cancer/2/2", "Mars conjunct Moon"), true);
  assert.equal(assembly.matchesTransitNatalContactSearch("authored/transit-aspect/moon/mars/conjunction", "Mars conjunct Moon"), false);
  assert.deepEqual(assembly.transitNatalSearchSelection("bond-effect chiron sextile sun"), {
    planet: "chiron",
    aspect: "sextile",
    natalPoint: "sun"
  });
  assert.deepEqual(assembly.transitNatalSearchSelection("Chiron sextile your Sun"), {
    planet: "chiron",
    aspect: "sextile",
    natalPoint: "sun"
  });
  assert.equal(assembly.matchesTransitNatalContactSearch("authored/transit-aspect/chiron/sun/sextile", "Chiron sextile Sun"), true);
  assert.equal(assembly.matchesTransitNatalContactSearch("authored/transit-aspect/chiron/sun/soft", "Chiron sextile Sun"), true);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

const dashboard = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
const preview = fs.readFileSync(new URL("../apps/admin/src/BondEffectPagePreview.tsx", import.meta.url), "utf8");
const finder = fs.readFileSync(new URL("../apps/admin/src/FriendsTransitSectionFinder.tsx", import.meta.url), "utf8");
assert.match(dashboard, /BondEffectPagePreview/u);
assert.match(dashboard, /This row is only the opening on the Friends Between you two page/u);
assert.match(preview, /Between you two composition/u);
assert.match(preview, /What this activates/u);
assert.match(preview, /This last line is calculated from the chart/u);
assert.match(dashboard, /matchesFallbackLibrarySearch/u);
assert.match(dashboard, /FriendsBetweenYouTwoComposition/u);
assert.match(finder, /Friends Transits composition map/u);
assert.match(dashboard, /workspace: "between-you-two"/u);
assert.match(finder, /Find a Friends transit card/u);
assert.match(finder, /Open the opening/u);
assert.match(dashboard, /Edit live /u);
assert.match(dashboard, /Live reader write-up/u);
console.log("Content Studio bond-effect Friends page assembly passed.");
