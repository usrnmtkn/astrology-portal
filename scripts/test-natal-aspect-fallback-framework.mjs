import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const runtimeSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/content/sourceGroundedRuntime.ts"), "utf8");
const records = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "apps/web/src/content/finalSourceGroundedDashboardRecords.json"), "utf8")
);
const sourceGroundedBundle = path.join(os.tmpdir(), `source-grounded-v2-${Date.now()}.mjs`);

assert.equal(
  fs.existsSync(path.join(repoRoot, "apps/web/src/content/natalAspectFallback.ts")),
  false,
  "old natalAspectFallback resolver module must stay decommissioned"
);
assert.doesNotMatch(appSource, /resolveNatalAspectFallback|natalAspectFallbackDerivationKeys/u, "app must not call the old natal aspect fallback resolver");
assert.doesNotMatch(runtimeSource, /sourceGroundedNatalAspectComposition/u, "runtime must not expose old source-grounded natal aspect authored composition");
assert.match(appSource, /fallbackRendererV3\.renderNatalAspect\(/u, "app natal aspects must route through the v3 fallback package renderer");
assert.match(appSource, /normalizeFallbackV3Aspect\(aspect\.type\)/u, "app natal aspects must normalize through the v3-supported aspect set");
assert.doesNotMatch(
  appSource,
  /\.\.\.sourceGroundedNatalAspectSectionsForPlacement\(/u,
  "natal placement pages must not append fallback natal aspect cards; related placement aspects need authored natal copy"
);
assert.doesNotMatch(appSource, /isSafeNatalAspectFallbackCopy\(body\)/u, "reader must not use natal-aspect phrase denylist gates");
assert.equal(
  fs.existsSync(path.join(repoRoot, "apps/web/src/content/natalAspectCopySafety.ts")),
  false,
  "natal aspect phrase denylist module must stay decommissioned"
);

const legacyAspectRows = (records.records ?? []).filter((record) =>
  String(record.canonicalKey ?? "").startsWith("dashboard.natal-aspect.")
);
assert.equal(
  legacyAspectRows.length,
  0,
  "legacy source-grounded natal aspect phrasebank rows must be removed from the static source-grounded bundle"
);

await build({
  absWorkingDir: repoRoot,
  bundle: true,
  entryPoints: ["apps/web/src/content/sourceGroundedV2.ts"],
  external: ["@tldr/astro-knowledge/timing-engine"],
  format: "esm",
  outfile: sourceGroundedBundle,
  platform: "node",
  target: "node20"
});

const { resolveSourceGroundedV2 } = await import(pathToFileURL(sourceGroundedBundle).href);

const sunSquareMoon = resolveSourceGroundedV2("me.natal_aspect", {
  aspect: "square",
  natalPointA: "Sun",
  natalPointB: "Moon",
  orb: "2°"
});
assert.equal(sunSquareMoon.readerAuthority, "approved-fallback");
assert.equal(sunSquareMoon.fallbackId, "fallback-hook/me.natal-aspect/sun-square-moon");
assert.match(sunSquareMoon.expandedCopy ?? "", /That's your Sun square Moon: identity and the feeling body .+\./is);
assert.doesNotMatch(sunSquareMoon.expandedCopy ?? "", /\{\{|\}\}|SOURCE_GAP|Part of you wants one thing/u);

const mercuryConjunctSun = resolveSourceGroundedV2("me.natal_aspect", {
  aspect: "conjunction",
  natalPointA: "Sun",
  natalPointB: "Mercury",
  orb: "1°"
});
assert.equal(mercuryConjunctSun.readerAuthority, "approved-fallback");
assert.doesNotMatch(
  mercuryConjunctSun.expandedCopy ?? "",
  /The way they think and the person they are speak with one voice|This makes they articulate/u,
  "old authored/source-grounded aspect copy must not render"
);

const marsSquareSunFriend = resolveSourceGroundedV2("me.natal_aspect", {
  aspect: "square",
  natalPointA: "Mars",
  natalPointB: "Sun",
  ownerDisplayName: "Marie",
  ownerPerspective: "they",
  orb: "4°"
});
assert.equal(marsSquareSunFriend.readerAuthority, "approved-fallback");
assert.match(
  marsSquareSunFriend.expandedCopy ?? "",
  /That's Marie's Mars square Sun: drive and identity .+\./u,
  "friend natal aspect fallback must close with the chart owner's possessive headline"
);
assert.match(
  marsSquareSunFriend.expandedCopy ?? "",
  /pushes them to actually do something|wins them things|before noticing what happened/u,
  "friend natal aspect fallback must use object/reflexive-safe they/them grammar"
);
assert.doesNotMatch(
  marsSquareSunFriend.expandedCopy ?? "",
  /\b(?:pushes|wins|makes|inspires|drains)\s+they\b|\bbefore them notice\b|\b(?:for|on)\s+they\b|\bthey's\b/iu,
  "friend natal aspect fallback must not leak malformed they/them grammar"
);

const sunSextileNeptuneFriend = resolveSourceGroundedV2("me.natal_aspect", {
  aspect: "sextile",
  natalPointA: "Sun",
  natalPointB: "Neptune",
  ownerDisplayName: "Marie",
  ownerPerspective: "they"
});
assert.equal(sunSextileNeptuneFriend.readerAuthority, "approved-fallback");
assert.match(
  sunSextileNeptuneFriend.expandedCopy ?? "",
  /That's Marie's Sun sextile Neptune/u,
  "friend natal aspect fallback must name the chart owner in the closing astrology line"
);
assert.doesNotMatch(
  sunSextileNeptuneFriend.expandedCopy ?? "",
  /\bon they\b|\bdrains they\b/u,
  "friend natal aspect fallback must repair object pronouns in pair-specific prose"
);

const unsupported = resolveSourceGroundedV2("me.natal_aspect", {
  aspect: "quincunx",
  natalPointA: "Sun",
  natalPointB: "Moon"
});
assert.equal(unsupported.readerAuthority, "omitted");
assert.equal(unsupported.renderedFields.sourceMaterialStatus, "needs-source-material");
assert.deepEqual(unsupported.finalVisibleStrings, []);

console.log("Natal aspect fallback v3 decommission regression passed.");
