import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const keyAliasesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/content/keyAliases.ts"), "utf8");
const natalAspectFallbackSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/content/natalAspectFallback.ts"), "utf8");
const natalAspectSectionSource = appSource.slice(
  appSource.indexOf("function natalAspectMadlibFallbackSection"),
  appSource.indexOf("function normalizeNatalAspectSurface")
);
const emergencyCopy = fs.readFileSync(path.join(repoRoot, "apps/web/src/content/emergencyCopy.json"), "utf8");
const templateRows = fs.readFileSync(path.join(repoRoot, "scripts/content-source/tldrastro-fallback-templates-rows.json"), "utf8");
const outfile = path.join(os.tmpdir(), `natal-aspect-fallback-${Date.now()}.mjs`);

await build({
  absWorkingDir: repoRoot,
  bundle: true,
  entryPoints: ["apps/web/src/content/natalAspectFallback.ts"],
  external: ["@tldr/astro-knowledge/timing-engine"],
  format: "esm",
  outfile,
  platform: "node",
  target: "node20"
});

const {
  blackMoonLilithRecord,
  moonBaseRecord,
  moonSignResources,
  resolveNatalAspectFallback,
  unsafeNatalAspectCopyReason
} = await import(pathToFileURL(outfile).href);

const approvedMoonSquareLilith = "Your Moon square Lilith can make asking for help feel like handing someone the power to use it against you later. You may keep a feeling private, insist you can handle it alone, and then react strongly when someone ignores your needs or decides what is best for you. Part of you wants to be cared for. A bigger, stubborn part would rather sit out in the cold than accept a blanket with strings attached.";
const approvedSunQuincunxJupiter = "Your Sun quincunx Jupiter can make it hard to tell whether a bigger opportunity actually belongs in your life. You may say yes because the offer sounds exciting or proves that people believe in you, then discover that the time, visibility, or responsibility does not fit how you want to live. You keep reaching for more, even when the promise was easier to make than it is to live with.";
const approvedVenusQuincunxLilith = "Your Venus quincunx Lilith can make affection feel easy to receive until you notice the rules attached to it. You may enjoy the attention, smooth over a difference, or agree to more than you want, then pull back when the connection starts to depend on your cooperation. You want the affection. You also want to know it will survive the moment you stop being agreeable.";
const approvedMercurySextileChiron = "Your Mercury sextile Chiron can make it easier to say the thing that hurts without turning the whole conversation into a wound. You may find the right question, joke, explanation, or detail at the moment someone needs language for something tender. The gift is not that every pain becomes easy to discuss. It is that your words can make repair feel possible without forcing it.";
const approvedNeptuneSquareNorthNode = "Your Neptune square North Node can make you fall in love with the idea of things. When a new relationship, creative project, or career move is still in the dream stage, it can feel perfect, inspiring, and full of infinite potential. Because it is still an idea, you may not yet have to deal with the boring, difficult work it takes to maintain it.";
const moonSquareLilith = resolveNatalAspectFallback({ from: "Moon", type: "square", to: "Lilith" });

assert.equal(moonSquareLilith?.body, approvedMoonSquareLilith, "Moon square Black Moon Lilith must use the approved no-sign fallback.");
assert.equal(moonBaseRecord.id, "aspect-fallback.point.moon", "Moon fallback must use the explicit Moon record.");
assert.equal(blackMoonLilithRecord.calculationIdentity, "mean lunar apogee", "Lilith fallback must identify mean Black Moon Lilith.");
assert.equal(Object.keys(moonSignResources).length, 12, "Moon sign resource layer must include all twelve signs.");

for (const banned of [
  "links",
  "what needs attention",
  "recurring friction",
  "asks for",
  "name both sides",
  "concrete response",
  "find balance",
  "invites you"
]) {
  assert.doesNotMatch(moonSquareLilith?.body ?? "", new RegExp(banned, "i"), `Moon square Lilith fallback must not contain banned phrase: ${banned}`);
}

const moonTrineLilith = resolveNatalAspectFallback({ from: "Moon", type: "trine", to: "Lilith" });
assert.ok(moonTrineLilith?.body, "Moon trine Lilith should still resolve.");
assert.notEqual(moonTrineLilith?.body, moonSquareLilith?.body, "Changing square to trine must change more than the aspect label.");
assert.match(moonTrineLilith?.body ?? "", /work together without much friction/i, "Trine fallback must use trine interaction language.");
assert.doesNotMatch(moonTrineLilith?.body ?? "", /asking for help feel like handing someone the power/i, "Trine fallback must not reuse square-specific Moon-Lilith conflict.");

const mercurySquareLilith = resolveNatalAspectFallback({ from: "Mercury", type: "square", to: "Lilith" });
assert.ok(mercurySquareLilith?.body, "Mercury square Lilith should resolve.");
assert.notEqual(mercurySquareLilith?.body, moonSquareLilith?.body, "Changing Moon to Mercury must change lived behavior.");
assert.match(mercurySquareLilith?.body ?? "", /mind|thought|language|understood/i, "Mercury fallback must use Mercury behavior.");

const mercurySextileChiron = resolveNatalAspectFallback({ from: "Mercury", type: "sextile", to: "Chiron" });
assert.ok(mercurySextileChiron?.body, "Mercury sextile Chiron should resolve.");
assert.equal(mercurySextileChiron?.body, approvedMercurySextileChiron, "Mercury sextile Chiron must use the approved pair-specific fallback.");
assert.doesNotMatch(mercurySextileChiron?.body ?? "", /working with Chiron deliberately|reason to become visible|choice, invitation, or problem/i, "Mercury sextile Chiron must not expose generic sextile scaffolding.");

const sunQuincunxJupiter = resolveNatalAspectFallback({ from: "Sun", type: "quincunx", to: "Jupiter" });
assert.ok(sunQuincunxJupiter?.body, "Sun quincunx Jupiter should resolve.");
assert.equal(sunQuincunxJupiter?.body, approvedSunQuincunxJupiter, "Sun quincunx Jupiter must use the approved pair-specific fallback.");
assert.doesNotMatch(sunQuincunxJupiter?.body ?? "", /\bSun to have\b|\bJupiter to have\b|\bSun takes over\b/i, "Known planet fallbacks must not use generic placeholder grammar.");
assert.doesNotMatch(sunQuincunxJupiter?.body ?? "", /\bYou may the\b/i, "Aspect fallback must not put a noun-clause pressure response after 'you may'.");
assert.match(sunQuincunxJupiter?.body ?? "", /opportunity|visibility|responsibility|promise/i, "Sun-Jupiter fallback must use pair-specific lived content.");

const venusQuincunxLilith = resolveNatalAspectFallback({ from: "Venus", type: "quincunx", to: "Lilith" });
assert.ok(venusQuincunxLilith?.body, "Venus quincunx Lilith should resolve.");
assert.equal(venusQuincunxLilith?.body, approvedVenusQuincunxLilith, "Venus quincunx Lilith must use the approved pair-specific fallback.");

const neptuneSextilePluto = resolveNatalAspectFallback({ from: "Neptune", type: "sextile", to: "Pluto" });
assert.ok(neptuneSextilePluto?.body, "Neptune sextile Pluto should resolve.");
assert.doesNotMatch(neptuneSextilePluto?.body ?? "", /Profound imagination and depth|Recognize this as your era/i, "Neptune-Pluto fallback must not use broad generational source copy.");
assert.match(neptuneSextilePluto?.body ?? "", /imagination|power|control|hidden|depth/i, "Neptune-Pluto fallback must use point-specific dynamics.");

const neptuneSquareNorthNode = resolveNatalAspectFallback({ from: "Neptune", type: "square", to: "North Node" });
assert.ok(neptuneSquareNorthNode?.body, "Neptune square North Node should resolve.");
assert.equal(neptuneSquareNorthNode?.body, approvedNeptuneSquareNorthNode, "Neptune square North Node must use the approved authored fallback.");
assert.deepEqual(neptuneSquareNorthNode?.sourceKeys, ["natal.neptune.square.north_node"], "Neptune square North Node must report the canonical authored source key.");

const reversedNeptuneSquareNorthNode = resolveNatalAspectFallback({ from: "North Node", type: "square", to: "Neptune" });
assert.ok(reversedNeptuneSquareNorthNode?.body, "Reversed Neptune square North Node should resolve.");
assert.equal(reversedNeptuneSquareNorthNode?.body, approvedNeptuneSquareNorthNode, "Canonical Neptune/North Node record must resolve regardless of input order.");
assert.deepEqual(reversedNeptuneSquareNorthNode?.sourceKeys, ["natal.neptune.square.north_node"], "Reversed Neptune/North Node record must report the canonical authored source key.");

for (const rendered of [
  moonSquareLilith?.body,
  sunQuincunxJupiter?.body,
  venusQuincunxLilith?.body,
  mercurySextileChiron?.body,
  neptuneSextilePluto?.body,
  neptuneSquareNorthNode?.body
]) {
  assert.doesNotMatch(rendered ?? "", /\{\{|\}\}|\[[^\]]+\]/, "Rendered fallback must not expose unresolved field names.");
  assert.doesNotMatch(rendered ?? "", /\b([A-Z][a-z]+)\s+\1\b/, "Rendered fallback must not duplicate body names.");
  assert.doesNotMatch(rendered ?? "", /template|placeholder|resource|field|slot|instruction/i, "Rendered fallback must not expose template instructions.");
  assert.doesNotMatch(rendered ?? "", /to have a clear place in the chart|give North Node a clear place in the chart|giving North Node a clear place in the chart|takes over under pressure|on different schedules|to take care of one|has been neglected|these needs do not respond to the same solution|the other part of the contact|lean on one response|The problem is not that either side is wrong/i, "Rendered fallback must not expose mechanical template fragments.");
}

assert.doesNotMatch(
  moonSquareLilith?.body ?? "",
  /\b(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/,
  "No-sign Moon square Lilith fallback must not invent sign language."
);

const sentences = (moonSquareLilith?.body ?? "").match(/[^.!?]+[.!?]/g) ?? [];
assert.equal(sentences.length, 4, "Moon square Lilith fallback should be four complete sentences.");
for (const sentence of sentences) {
  assert.match(sentence.trim(), /^[A-Z]/, "Each sentence must start grammatically.");
  assert.match(sentence.trim(), /[.!?]$/, "Each sentence must end with punctuation.");
}
assert.doesNotMatch(sentences.at(-1) ?? "", /\b(should|try|choose|name|find|work on|invite|asks?)\b/i, "Final sentence must name the lived dynamic, not advice.");

for (const legacy of [
  "Your Moon square Lilith links emotions, instincts",
  "Recurring friction that asks for an adjustment",
  "Name both sides of the pattern before choosing the next concrete response",
  "Profound imagination and depth move quietly beneath your personality.",
  "Recognize this as your era, and put your attention on what is personally yours.",
  "Sun to have a clear place in the chart",
  "Sun takes over under pressure",
  "puts Sun and Jupiter on different schedules",
  "to take care of one",
  "has been neglected",
  "these needs do not respond to the same solution",
  "working with Chiron deliberately",
  "reason to become visible",
  "give North Node a clear place in the chart",
  "giving North Node a clear place in the chart",
  "one part of the contact tries to solve the moment",
  "the other part of the contact",
  "lean on one response",
  "The problem is not that either side is wrong",
  "other part of the contact pushes back",
  "They disagree about how you should respond",
  "Neptune Square North Node is close enough to read. The title, timing, and chart context give the clearest available frame."
]) {
  assert.equal(unsafeNatalAspectCopyReason(legacy).length > 0, true, `Legacy generated clause must be rejected: ${legacy}`);
}

assert.match(natalAspectFallbackSource, /authoredNatalAspectCopyRecords/, "Natal aspect fallback must support local authored-record overrides.");
assert.match(natalAspectFallbackSource, /natal\.neptune\.square\.north_node|fall in love with the idea of things/, "Neptune square North Node authored fallback must be available from the fallback resolver.");
assert.match(keyAliasesSource, /legacyNatalAspect/, "Legacy natal point.aspect.point keys must be aliased into the normal generated-content resolver.");
assert.match(keyAliasesSource, /aspectAliases\(legacyNatalAspect\[1\],\s*legacyNatalAspect\[2\],\s*legacyNatalAspect\[3\]\)/, "Legacy natal aspect keys must resolve to canonical natal.aspect aliases.");
assert.match(appSource, /resolveNatalAspectFallback\(aspect\)/, "Reader natal aspect fallback must use the dedicated resolver.");
assert.match(appSource, /isSafeNatalAspectFallbackCopy\(sourceGrounded\.finalCopy\)/, "Reader must reject legacy generic source-grounded natal aspect copy.");
assert.match(appSource, /uniqueNatalAspectRows\(/, "Natal aspect rendering must dedupe repeated aspect rows before display.");
assert.doesNotMatch(
  natalAspectSectionSource,
  /sourceKeys:\s*\[\s*`emergencyCopy\.planetFunction\.\$\{normalizeContentIdPart\(aspect\.from\)\}`/,
  "Natal aspect fallback must not report emergency definition fragments as its derivation source."
);
assert.match(templateRows, /runtime fallback resolves aspect-specific interaction/, "Admin template row must describe the resolver-owned fallback path.");
assert.match(emergencyCopy, /This contact changes how \{\{planetA\}\} responds/, "Emergency snapshot fallback should no longer use links-with definition concatenation.");

console.log("Natal aspect fallback framework regression passed.");
