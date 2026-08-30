import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileSkyPlacementV4Article,
  compileSkyPlacementV4Fallback,
  renderSkyPlacementV4Preview,
  skyPlacementV4Articles,
  skyPlacementV4ContentKeys
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Stage.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const sourcePath = path.join(packageRoot, "authored-inputs/sky-placement-v4-mercury-venus-next-batch-stage-v1.json");
const sourceText = fs.readFileSync(sourcePath, "utf8");
const corpus = JSON.parse(sourceText);
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const articles = skyPlacementV4Articles(corpus);

assert.equal(corpus.version, "sky-placement-v4-mercury-venus-next-batch-2026-08-30");
assert.equal(corpus.status, "reviewed_source_led_proposed");
assert.equal(corpus.implementation_status, "next_codex_batch");
assert.equal(corpus.owner_approved, false);
assert.equal(
  crypto.createHash("sha256").update(sourceText.replace(/\n$/u, "")).digest("hex"),
  "c02b1cd3b8a29641a2d1d1a281174330c4c23c5413bbb991ffdacef6d7378c8c",
  "committed package JSON values must remain byte-identical to the handoff before the repository final newline"
);
assert.deepEqual(Object.keys(corpus.planets), ["Mercury", "Venus"]);
assert.equal(articles.length, 24);
assert.equal(new Set(articles.map((article) => article.contentKey)).size, 24);

for (const planet of ["Mercury", "Venus"]) {
  const rows = corpus.planets[planet];
  assert.equal(rows.length, 12, `${planet} must include twelve signs`);
  assert.deepEqual(rows.map((row) => row.sign.toLowerCase()), signs);

  for (const article of rows) {
    const planetKey = planet.toLowerCase();
    const signKey = article.sign.toLowerCase();
    const expectedKeys = skyPlacementV4ContentKeys(planetKey, signKey);
    assert.equal(article.contentKey, expectedKeys.canonical);
    assert.equal(article.qaStatus, "PASS", `${article.contentKey} package QA`);
    assert.notEqual(article.tldrWhat.trim(), article.tldrTakeaway.trim(), `${article.contentKey} TLDR fields must differ`);
    assert.equal(compileSkyPlacementV4Article(corpus, article), article.placementArticle);
    assert.equal(compileSkyPlacementV4Fallback(corpus, article), [article.fallback.hook, article.fallback.lived, article.fallback.turn].join("\n\n"));
    assert.ok(article.sourcePrimary, `${article.contentKey} primary source`);
    assert.ok(article.ownerPhraseAnchors, `${article.contentKey} owner phrase anchors`);

    const baseInput = {
      planet: planetKey,
      sign: signKey,
      planetTitle: planet,
      signTitle: article.sign,
      cycleStartDate: "2027-01-01",
      cycleEndDate: "2027-02-01",
      dateLine: "January 1, 2027 to February 1, 2027",
      conditions: []
    };
    const full = renderSkyPlacementV4Preview(corpus, baseInput);
    assert.equal(full.resolution, "full-article");
    assert.equal(full.contentKey, article.contentKey);
    assert.equal(full.machineReadable.approvalStatus, "reviewed_source_led_proposed");
    assert.doesNotMatch(full.page, /\{\{/u, `${article.contentKey} full article must resolve every Mustache slot`);

    const fallback = renderSkyPlacementV4Preview(corpus, { ...baseInput, articleAvailable: false });
    assert.equal(fallback.resolution, "exact-fallback");
    assert.doesNotMatch(fallback.page, /\{\{/u, `${article.contentKey} fallback must resolve every Mustache slot`);

    const factsOnly = renderSkyPlacementV4Preview(corpus, {
      ...baseInput,
      articleAvailable: false,
      fallbackAvailable: false
    });
    assert.equal(factsOnly.resolution, "facts-only");
    assert.doesNotMatch(factsOnly.page, /\{\{/u, `${article.contentKey} facts-only state must resolve every Mustache slot`);
  }
}

for (const manifestName of ["bundled-manifest-v3.json", "bundled-core-manifest-v3.json", "bundled-sky-placement-manifest-v3.json"]) {
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, manifestName), "utf8"));
  const serialized = JSON.stringify(manifest);
  for (const article of articles) {
    assert.equal(serialized.includes(article.contentKey), false, `${manifestName} must exclude ${article.contentKey}`);
  }
}

assert.throws(
  () => renderSkyPlacementV4Preview({ ...corpus, owner_approved: true }, {
    planet: "mercury",
    sign: "aries",
    cycleStartDate: "2027-01-01",
    dateLine: "January 1 to February 1"
  }),
  /STAGE_GOVERNANCE/u,
  "a package whose approval governance changes must not silently enter the staging compiler"
);

console.log("Sky Placement V4 Mercury/Venus stage passed: 24 unique proposed articles, exact package hash, full/fallback/facts-only rendering, resolved Mustache slots, and zero reader-bundle promotion.");
