import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileSkyPlacementV4Article,
  retrogradeModifierFor,
  renderSkyPlacementV4Preview,
  resolveSkyPlacementV4Record,
  seasonalContextFor,
  SKY_PLACEMENT_V4_SOURCE_VERIFIED_TEMPLATES,
  skyPlacementV4ContentKeys
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Stage.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const sourcePath = path.join(packageRoot, "authored-inputs/sky-placement-v4-sun-corpus-source-verified-stage-v1.json");
const sourceText = fs.readFileSync(sourcePath, "utf8");
const corpus = JSON.parse(sourceText);
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

assert.equal(corpus.version, "sky-placement-v4-source-verified-2026-08-30");
assert.equal(corpus.status, "proposed_v4_source_verified");
assert.equal(corpus.serving_enabled, false);
assert.equal(
  crypto.createHash("sha256").update(sourceText.replace(/\n$/u, "")).digest("hex"),
  "1bc3735b59ea4223469f9df0fb6944ccff396d0904e04030934d1e66dfd8f7f3",
  "committed package JSON values must remain byte-identical to the handoff before the repository final newline"
);
assert.equal(corpus.sun_corpus.length, 12);
assert.equal(corpus.seasonal_context.length, 12);
assert.equal(SKY_PLACEMENT_V4_SOURCE_VERIFIED_TEMPLATES.length, 4);
assert.equal(SKY_PLACEMENT_V4_SOURCE_VERIFIED_TEMPLATES.find((entry) => entry.template_id === "sky-placement-v4-page")?.template.includes("## TLDR"), true);
assert.deepEqual(corpus.sun_corpus.map((row) => row.sign.toLowerCase()), signs);

for (const article of corpus.sun_corpus) {
  assert.equal(article.editorial_status, "proposed_v4_source_verified", `${article.sign} editorial status`);
  assert.equal(article.implementation_status, "stage_only", `${article.sign} implementation status`);
  assert.equal(article.owner_approved, false, `${article.sign} approval status`);
  assert.equal(compileSkyPlacementV4Article(corpus, article, { entryDate: "May 20, 2027" }), article.placement_article.replaceAll("{{entryDate}}", "May 20, 2027"));
  assert.notEqual(article.tldr_what.trim(), article.tldr_takeaway.trim(), `${article.sign} TLDR fields must differ`);
  for (const banned of ["TL;DR", "tropical zodiac year"]) {
    assert.equal(article.placement_article.toLowerCase().includes(banned.toLowerCase()), false, `${article.sign} contains banned pattern ${banned}`);
  }
  assert.ok(article.source_primary, `${article.sign} source primary`);
  assert.ok(article.phrase_anchors, `${article.sign} phrase anchors`);
  assert.equal(article.qa_status, "PASS", `${article.sign} package QA`);
}

const marsRetrograde = retrogradeModifierFor(corpus, "mars");
assert.equal(marsRetrograde.content_key, "sky-placement/retrograde/mars");
assert.equal(marsRetrograde.copy_policy, "exact");
assert.equal(marsRetrograde.allow_paraphrase, false);
assert.equal(marsRetrograde.owner_approved, true);
assert.equal(marsRetrograde.copy, "Mars retrograde reminds us that even the most blazing fires need time to rest and rekindle. Mars retrograde invites us to slow down, and sometimes, our bodies enforce this lesson for us. When Mars, the planet of energy, drive, and vitality, moves backward, we’re asked to pause, reflect, and redirect. This can show up physically as illness, injury, or exhaustion, a clear signal that something needs our attention.");

assert.match(seasonalContextFor(corpus, "Aries", 40.7), /Northern Hemisphere/u);
assert.match(seasonalContextFor(corpus, "Aries", -33.9), /Southern Hemisphere/u);
assert.match(seasonalContextFor(corpus, "Aries", null), /across the globe/u);
assert.equal(seasonalContextFor(corpus, "Virgo", 40.7), "");
assert.deepEqual(skyPlacementV4ContentKeys("Sun", "Virgo"), {
  canonical: "sky-placement/article/sun/virgo",
  legacyAlias: "fallback-hook/sky-sign-copy/sun/virgo"
});
const aliasRow = { contentKey: "fallback-hook/sky-sign-copy/sun/virgo" };
assert.equal(resolveSkyPlacementV4Record({ "fallback-hook/sky-sign-copy/sun/virgo": aliasRow }, "sun", "virgo"), aliasRow);
const canonicalRow = { contentKey: "sky-placement/article/sun/virgo" };
assert.equal(resolveSkyPlacementV4Record({
  "sky-placement/article/sun/virgo": canonicalRow,
  "fallback-hook/sky-sign-copy/sun/virgo": aliasRow
}, "sun", "virgo"), canonicalRow, "canonical V4 keys must outrank migration aliases");

const baseInput = {
  planet: "sun",
  sign: "gemini",
  planetTitle: "Sun",
  signTitle: "Gemini",
  cycleStartDate: "2027-05-20",
  dateLine: "May 20, 2027 to June 20, 2027",
  latitude: 40.7,
  facts: { entryDate: "May 20, 2027" }
};
const full = renderSkyPlacementV4Preview(corpus, {
  ...baseInput,
  conditions: [
    { kind: "aspect", approved: true, active: true, exactDate: "2027-06-03", headline: "Sun trine Mars", dateLine: "Closest June 3", body: "Approved body two." },
    { kind: "aspect", approved: true, active: true, exactDate: "2027-05-25", headline: "Sun square Saturn", dateLine: "Closest May 25", body: "Approved body one." },
    { kind: "aspect", approved: false, active: true, exactDate: "2027-05-21", headline: "Unapproved", dateLine: "Closest May 21", body: "Must not render." }
  ]
});
assert.equal(full.resolution, "full-article");
assert.equal(full.publicUrl, "/astrology/transits/sun-in-gemini/2027-05-20/");
assert.equal(full.alternateJsonUrl, "/api/content/sky-placement/sun/gemini/2027-05-20.json");
assert.equal(full.machineReadable.occurrenceId, "sky-placement/transit/sun/gemini/2027-05-20");
assert.equal(full.machineReadable.approvalStatus, "proposed_v4_source_verified");
assert.ok(full.page.indexOf("Sun square Saturn") < full.page.indexOf("Sun trine Mars"), "all approved active conditions must render in exact-date order");
assert.doesNotMatch(full.page, /Unapproved/u);
assert.doesNotMatch(full.page, /\{\{/u);

const fallback = renderSkyPlacementV4Preview(corpus, { ...baseInput, articleAvailable: false });
assert.equal(fallback.resolution, "exact-fallback");
assert.match(fallback.page, /Gemini Season shifts attention/u);
const factsOnly = renderSkyPlacementV4Preview(corpus, { ...baseInput, articleAvailable: false, fallbackAvailable: false });
assert.equal(factsOnly.resolution, "facts-only");
assert.doesNotMatch(factsOnly.page, /generic adjective/u);
assert.doesNotMatch(factsOnly.page, /\*\*What:\*\*\s*\*\*Takeaway:/u);
assert.doesNotMatch(factsOnly.page, /\{\{/u);

const retrogradePrecedence = renderSkyPlacementV4Preview(corpus, {
  ...baseInput,
  conditions: [
    { kind: "retrograde", scope: "planet", approved: true, active: true, exactDate: "2027-05-21", headline: "Planet retrograde", dateLine: "Planet dates", body: "Planet-level fallback." },
    { kind: "retrograde", scope: "sign", approved: true, active: true, exactDate: "2027-05-22", headline: "Gemini retrograde", dateLine: "Sign dates", body: "Sign-specific copy." }
  ]
});
assert.match(retrogradePrecedence.page, /Sign-specific copy/u);
assert.doesNotMatch(retrogradePrecedence.page, /Planet-level fallback/u);

const exactMarsFallback = renderSkyPlacementV4Preview(corpus, {
  ...baseInput,
  planet: "mars",
  planetTitle: "Mars",
  conditions: [
    { kind: "retrograde", scope: "planet", approved: true, active: true, exactDate: "2027-05-21", headline: "Mars retrograde", dateLine: "May 21, 2027", body: "Unreviewed runtime body must not replace exact owner copy." }
  ]
});
assert.equal(exactMarsFallback.resolution, "facts-only");
assert.match(exactMarsFallback.page, /even the most blazing fires need time to rest and rekindle/u);
assert.doesNotMatch(exactMarsFallback.page, /Unreviewed runtime body/u);

for (const sign of signs) {
  const article = corpus.sun_corpus.find((row) => row.sign.toLowerCase() === sign);
  const preview = renderSkyPlacementV4Preview(corpus, {
    ...baseInput,
    sign,
    signTitle: article.sign,
    latitude: ["aries", "cancer", "libra", "capricorn"].includes(sign) ? 40.7 : null,
    conditions: []
  });
  assert.equal(preview.resolution, "full-article", `${sign} must render the staged full article`);
  assert.doesNotMatch(preview.page, /\{\{/u, `${sign} must resolve every Mustache slot`);
}

for (const manifestName of ["bundled-manifest-v3.json", "bundled-core-manifest-v3.json", "bundled-sky-placement-manifest-v3.json"]) {
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, manifestName), "utf8"));
  assert.equal(JSON.stringify(manifest).includes("sky-placement/article/sun/"), false, `${manifestName} must exclude V4 stage keys`);
}

console.log("Sky Placement V4 source-verified Sun stage passed: 12 proposed articles, 12 hemisphere contexts, exact Mars retrograde fallback, exact compilation, full/fallback/facts-only hierarchy, all active conditions, resolved slots, and zero reader-bundle promotion.");
