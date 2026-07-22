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
const safetyBundle = path.join(os.tmpdir(), `natal-aspect-copy-safety-${Date.now()}.mjs`);

assert.equal(
  fs.existsSync(path.join(repoRoot, "apps/web/src/content/natalAspectFallback.ts")),
  false,
  "old natalAspectFallback resolver module must stay decommissioned"
);
assert.doesNotMatch(appSource, /resolveNatalAspectFallback|natalAspectFallbackDerivationKeys/u, "app must not call the old natal aspect fallback resolver");
assert.doesNotMatch(runtimeSource, /sourceGroundedNatalAspectComposition/u, "runtime must not expose old source-grounded natal aspect authored composition");
assert.match(appSource, /fallbackRendererV3\.renderNatalAspect\(/u, "app natal aspects must route through the v3 fallback package renderer");
assert.match(appSource, /normalizeFallbackV3Aspect\(aspect\.type\)/u, "app natal aspects must normalize through the v3-supported aspect set");
assert.match(appSource, /isSafeNatalAspectFallbackCopy\(body\)/u, "reader must keep the natal aspect copy safety gate");

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
await build({
  absWorkingDir: repoRoot,
  bundle: true,
  entryPoints: ["apps/web/src/content/natalAspectCopySafety.ts"],
  external: ["@tldr/astro-knowledge/timing-engine"],
  format: "esm",
  outfile: safetyBundle,
  platform: "node",
  target: "node20"
});

const { resolveSourceGroundedV2 } = await import(pathToFileURL(sourceGroundedBundle).href);
const { unsafeNatalAspectCopyReason } = await import(pathToFileURL(safetyBundle).href);

const sunSquareMoon = resolveSourceGroundedV2("me.natal_aspect", {
  aspect: "square",
  natalPointA: "Sun",
  natalPointB: "Moon",
  orb: "2°"
});
assert.equal(sunSquareMoon.readerAuthority, "approved-fallback");
assert.equal(sunSquareMoon.fallbackId, "fallback-hook/me.natal-aspect/sun-square-moon");
assert.match(sunSquareMoon.expandedCopy ?? "", /Sun is square your Moon.+identity and emotion.+friction/is);
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
  /Marie's Mars is square their Sun, meaning drive and identity are wired together in them\./u,
  "friend natal aspect fallback must open with the chart owner's first name"
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
  /Marie's Sun is sextile their Neptune/u,
  "friend natal aspect fallback must name the chart owner in the opening aspect sentence"
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

for (const legacy of [
  "Part of you wants one thing. Another part needs something else entirely.",
  "The way they think and the person they are speak with one voice.",
  "Uncomfortable, yes, but this is the kind of tension that pushes they to actually do something about it.",
  "That grit wins they things other people give up on.",
  "They can turn a small disagreement into a battle before them notice what happened.",
  "Recurring friction that asks for an adjustment",
  "Name both sides of the pattern before choosing the next concrete response",
  "Neptune Square North Node is close enough to read. The title, timing, and chart context give the clearest available frame."
]) {
  assert.equal(unsafeNatalAspectCopyReason(legacy).length > 0, true, `Legacy generated clause must be rejected: ${legacy}`);
}

console.log("Natal aspect fallback v3 decommission regression passed.");
