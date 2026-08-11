#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PACKAGE_VERSION,
  createFallbackRenderer as createDistRenderer,
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  RoleViolationError as NodeRoleViolationError,
  SourceGapError as NodeSourceGapError,
  renderNatalEmptyHouse as renderNatalEmptyHouseNode,
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const rows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const templates = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const authored = readJson("apps/web/src/content/fallbackArchitectureV3/authored-inputs/empty-house-v14-modern-v1.json");
const canonical = readJson("packages/astro-knowledge/review/empty-house-v14/empty-house-v14-owner-approved-rows.json");
const friendReview = readJson("packages/astro-knowledge/review/empty-house-v14/empty-house-v14-friend-variants-review.json");
const approval = readJson("packages/astro-knowledge/review/empty-house-v14/friend-variant-approval-record.json");
const projection = readJson("packages/astro-knowledge/review/empty-house-v14/serving-projection-v14-projection-4.json");
const originalFriendFlags = readJson("packages/astro-knowledge/review/empty-house-v14/body-they-flagged-for-owner.json");
const friendCorrections = readJson("packages/astro-knowledge/review/empty-house-v14/body-they-corrections.json");
const friendDecisionAid = readJson("packages/astro-knowledge/review/empty-house-v14/body-they-decision-aid.json");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const browserSourcePath = path.join(packageDir, "resolver/renderFallback.browser.ts");
const browserSource = stripTypeScriptTypes(fs.readFileSync(browserSourcePath, "utf8"), { mode: "transform" });
const browserSourceModule = await import(`data:text/javascript;base64,${Buffer.from(browserSource).toString("base64")}`);

const prefix = "fallback-hook/empty-house/";
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];
const modernRulers = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "pluto",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "uranus",
  pisces: "neptune",
};
const traditionalOuterRulers = { scorpio: "mars", aquarius: "saturn", pisces: "jupiter" };
const ordinal = (house) => house === 1 ? "1st" : house === 2 ? "2nd" : house === 3 ? "3rd" : `${house}th`;
const categoryCounts = Object.fromEntries(
  [
    "principle",
    "empty_house_essay",
    "empty_house_sign",
    "empty_house_ruler_generic",
    "empty_house_ruler_house1_specific",
    "empty_house_ruler_planet_example",
  ].map((category) => [category, canonical.entries.filter((entry) => entry.category === category).length])
);

assert.deepEqual(categoryCounts, {
  principle: 9,
  empty_house_essay: 12,
  empty_house_sign: 144,
  empty_house_ruler_generic: 121,
  empty_house_ruler_house1_specific: 132,
  empty_house_ruler_planet_example: 132,
});
assert.equal(projection.package, "empty-house-corpus-v14-serving-projection");
assert.equal(projection.version, "v14-projection-4");
assert.equal(projection.source_workbook_sha256, canonical.source_workbook_sha256);
assert.equal(projection.counts.serving_rows, 541);
assert.equal(projection.counts.traditional_rows_to_author, 33);
assert.equal(projection.counts.friend_corrections_adopted, 34);
assert.equal(projection.counts.friend_flags_approved_as_is, 31);
assert.equal(projection.counts.friend_flags_unresolved, 0);
assert.match(projection.body_they_status, /^owner-approved exact wording/u);
assert.match(projection.body_they_status, new RegExp(approval.payload_sha256, "u"));
assert.equal(projection.prior_body_they_digest_sha256, "74e0052ee3c3ce8660b22317b328ad46b01adb97a23e42e1ec48e4ad28f5568d");
assert.equal(originalFriendFlags.source_body_they_digest_sha256, projection.prior_body_they_digest_sha256);
assert.equal(Object.keys(originalFriendFlags.flags).length, 65);
assert.equal(friendCorrections.rows.length, 34);
assert.equal(friendDecisionAid.rows.length, 65);
assert.equal(friendDecisionAid.rows.filter((row) => row.verdict === "corrected_wording_proposed").length, 34);
assert.equal(friendDecisionAid.rows.filter((row) => row.verdict === "approve_as_is").length, 31);
assert.deepEqual(canonical.ruler_policy.sign_rulers, modernRulers);
assert.equal(new Set(canonical.entries.map((entry) => entry.key)).size, 550, "V14 corpus keys must be unique.");

const readerEntries = canonical.entries.filter((entry) => entry.category !== "principle");
const canonicalByKey = new Map(readerEntries.map((entry) => [entry.key, entry]));
const authoredByKey = new Map(authored.rows.map((row) => [row.corpus_key, row]));
const friendByKey = new Map(friendReview.rows.map((row) => [row.corpus_key, row]));
const correctionByKey = new Map(friendCorrections.rows.map((row) => [row.corpus_key, row]));
const decisionByKey = new Map(friendDecisionAid.rows.map((row) => [row.corpus_key, row]));
const servingV14Rows = rows.hookRows.filter((row) => row.contentKey.startsWith(prefix));
const promoted = servingV14Rows.length > 0;
const effectiveRows = promoted
  ? rows
  : { ...rows, hookRows: [...rows.hookRows, ...authored.rows] };
const sourceRenderer = browserSourceModule.createFallbackRenderer(templates, effectiveRows);
const renderOpts = promoted ? {} : { allowUnreviewed: true };

assert.equal(readerEntries.length, 541);
assert.equal(authored.rows.length, 541);
assert.equal(friendReview.rows.length, 541);
assert.equal(authored.friend_payload_sha256, friendReview.payload_sha256);
assert.equal(authored.prior_projection_body_they_digest_sha256, projection.prior_body_they_digest_sha256);
assert.equal(friendReview.prior_projection_body_they_digest_sha256, projection.prior_body_they_digest_sha256);
assert.equal(
  crypto.createHash("sha256").update(JSON.stringify(authored.rows.map(({ corpus_key, body_they }) => ({ corpus_key, body_they })))).digest("hex"),
  projection.body_they_approval_payload_sha256,
  "Projection-4 corrected Friend bytes must remain exact."
);
assert.equal(approval.payload_sha256, friendReview.payload_sha256);
assert.equal(approval.row_count, 541);
assert.equal(PACKAGE_VERSION, promoted ? "v3-2026-08-11a" : "v3-2026-08-10b");

for (const entry of canonical.entries) {
  assert.equal(entry.owner_approved, true, `${entry.key}: V14 You copy must be owner-approved.`);
  assert.equal(entry.governance, canonical.governance, `${entry.key}: governance label mismatch.`);
  if (entry.category.startsWith("empty_house_ruler_")) {
    assert.notEqual(entry.house, entry.ruler_house, `${entry.key}: an empty house cannot contain its ruler.`);
  }
}

for (const entry of readerEntries) {
  const row = authoredByKey.get(entry.key);
  assert.ok(row, `${entry.key}: missing authored projection.`);
  assert.equal(row.body_you, entry.copy_you, `${entry.key}: owner-approved You bytes changed.`);
  assert.ok(row.body_they?.trim(), `${entry.key}: missing explicit Friend variant.`);
  assert.doesNotMatch(row.body_they, /\b(?:you|your|yours|yourself)\b/iu, `${entry.key}: Friend copy leaks second person.`);
  assert.equal(row.body_you_review_status, "approved");
  assert.equal(row.body_they_review_status, promoted ? "approved" : "needs_review");
  assert.equal(row.review_status, promoted ? "approved" : "needs_review");
  assert.equal(row.governance, canonical.governance);
  assert.equal(row.version, canonical.version);
  assert.equal(row.judge_verdict, "pending");
  const correction = correctionByKey.get(entry.key);
  const decision = decisionByKey.get(entry.key);
  if (correction) {
    assert.equal(row.body_they, correction.body_they, `${entry.key}: owner-adopted correction changed.`);
    assert.equal(row.body_they_flag_disposition, "corrected_wording_adopted");
    assert.equal(decision?.verdict, "corrected_wording_proposed");
    assert.match(row.body_they_flag, /^corrected wording adopted by owner 2026-08-10/u);
  } else if (decision) {
    assert.equal(decision.verdict, "approve_as_is");
    assert.equal(row.body_they, decision.body_they_drafted, `${entry.key}: approved-as-is Friend wording changed.`);
    assert.equal(row.body_they_flag, decision.flag);
    assert.equal(row.body_they_flag_disposition, "approve_as_is");
  } else {
    assert.equal(row.body_they_flag, null);
    assert.equal(row.body_they_flag_disposition, null);
  }
  assert.deepEqual(row.source, {
    archive: entry.archive,
    page_ref: entry.page_ref,
    workbook_sha256: canonical.source_workbook_sha256,
    sheet: entry.source_sheet,
    row: entry.source_row,
  });
  assert.deepEqual(friendByKey.get(entry.key).flags, []);
  assert.doesNotMatch(row.body_they, /\b(?:place|test|know|knows|prove|proves|proving|places) them (?:return|are|were|know|have|will|can|matter|live|go)\b/iu);
  assert.doesNotMatch(row.body_they, /\bfollowing they\b/iu);
}

assert.equal(
  effectiveRows.hookRows.filter((row) => row.contentKey.startsWith(prefix)).length,
  541,
  "Exactly 541 V14 rows belong in the serving projection; principles remain review-only."
);
assert.equal(
  effectiveRows.hookRows.filter((row) => row.contentKey.includes("principle")).length,
  0,
  "Principles must not become reader-serving hooks."
);

function corpusKeyForRuler(house, sign, ruler, rulerHouse) {
  if (house === 1) return `empty-1st|${sign}|${ruler}-in-${ordinal(rulerHouse)}`;
  const exact = `empty-${ordinal(house)}|${ruler}-in-${ordinal(rulerHouse)}`;
  return canonicalByKey.has(exact) ? exact : `empty-${ordinal(house)}|ruler-in-${ordinal(rulerHouse)}`;
}

let renderCount = 0;
let exactExampleCount = 0;
let genericFallbackCount = 0;
const selectedModernKeys = new Set();
for (let house = 1; house <= 12; house += 1) {
  for (const sign of signs) {
    const ruler = modernRulers[sign];
    for (let rulerHouse = 1; rulerHouse <= 12; rulerHouse += 1) {
      if (rulerHouse === house) continue;
      const rulerCorpusKey = corpusKeyForRuler(house, sign, ruler, rulerHouse);
      const expectedRuler = canonicalByKey.get(rulerCorpusKey);
      assert.ok(expectedRuler, `${house}/${sign}/${ruler}-in-${rulerHouse}: missing ruler coverage.`);
      if (expectedRuler.category === "empty_house_ruler_generic") genericFallbackCount += 1;
      else exactExampleCount += 1;

      for (const voice of ["you", "Friend"]) {
        const result = sourceRenderer.renderNatalEmptyHouse({
          house,
          sign,
          primaryRuler: ruler,
          rulerHouse,
          voice,
        }, renderOpts);
        const base = authoredByKey.get(`empty-${ordinal(house)}`);
        const signRow = authoredByKey.get(`empty-${ordinal(house)}|${sign}`);
        const rulerRow = authoredByKey.get(rulerCorpusKey);
        const field = voice === "you" ? "body_you" : "body_they";

        assert.equal(result.note, base[field], `${house}/${sign}/${rulerHouse}/${voice}: base essay.`);
        assert.deepEqual(result.parts, [signRow[field], rulerRow[field]], `${house}/${sign}/${rulerHouse}/${voice}: sign then ruler.`);
        assert.equal(result.body, result.parts.join("\n\n"));
        assert.equal(result.templateKey, "fallback-template/natal.empty-house-v14");
        assert.deepEqual(result.sourceKeys, [base.contentKey, signRow.contentKey, rulerRow.contentKey]);
        result.sourceKeys.forEach((key) => selectedModernKeys.add(key));
        renderCount += 1;
      }
    }
  }
}

assert.equal(renderCount, 3168, "All 1,584 modern-ruler fact combinations must render in both voices.");
assert.equal(exactExampleCount, 308, "House-1 specifics and matching planet examples must win when exact keys exist.");
assert.equal(genericFallbackCount, 1276, "Generic ruler-house rows must carry uncovered houses 2–12 combinations.");
assert.equal(selectedModernKeys.size, 541, "Every V14 serving row must be reachable under the modern launch map.");
assert.deepEqual(
  effectiveRows.hookRows
    .filter((row) => row.contentKey.startsWith(prefix) && !selectedModernKeys.has(row.contentKey))
    .map((row) => row.contentKey),
  [],
  "The modern launch map must leave zero unreachable V14 serving rows."
);

for (let house = 1; house <= 12; house += 1) {
  assert.throws(
    () => sourceRenderer.renderNatalEmptyHouse({
      house,
      sign: signs[house - 1],
      primaryRuler: modernRulers[signs[house - 1]],
      rulerHouse: house,
      voice: "you",
    }, renderOpts),
    browserSourceModule.SourceGapError,
    `House ${house}: same-house ruler placement must be unreachable.`
  );
}

const traditionalBacklogKeys = [];
for (const [sign, traditionalRuler] of Object.entries(traditionalOuterRulers)) {
  assert.throws(
    () => sourceRenderer.renderNatalEmptyHouse({ house: 1, sign, primaryRuler: traditionalRuler, rulerHouse: 2, voice: "you" }, renderOpts),
    browserSourceModule.RoleViolationError,
    `${sign}: Phase 1 must reject a traditional ruler passed into the modern contract.`
  );
  for (let rulerHouse = 2; rulerHouse <= 12; rulerHouse += 1) {
    const neededKey = `fallback-hook/empty-house/rising-ruler/${sign}/${traditionalRuler}/${rulerHouse}`;
    traditionalBacklogKeys.push(neededKey);
    assert.ok(
      !effectiveRows.hookRows.some((row) => row.contentKey === neededKey),
      `${neededKey}: traditional house-1 wording must remain owner-to-author.`
    );
    assert.throws(
      () => sourceRenderer.renderNatalEmptyHouse({
        house: 1,
        sign,
        primaryRuler: traditionalRuler,
        rulerHouse,
        rulerSystem: "traditional",
        voice: "you",
      }, renderOpts),
      browserSourceModule.SourceGapError,
      `${neededKey}: missing traditional house-1 content must produce SOURCE_GAP.`
    );
  }
  const traditionalNonHouse1 = sourceRenderer.renderNatalEmptyHouse({
    house: 2,
    sign,
    primaryRuler: traditionalRuler,
    rulerHouse: 3,
    rulerSystem: "traditional",
    voice: "you",
  }, renderOpts);
  assert.equal(traditionalNonHouse1.parts.length, 2, `${sign}: generic coverage should support traditional houses 2–12.`);
}
assert.equal(traditionalBacklogKeys.length, 33);
assert.deepEqual(projection.traditional_authoring_backlog.rising_rulers, traditionalOuterRulers);
assert.equal(new Set(traditionalBacklogKeys).size, 33);
assert.deepEqual(
  projection.traditional_authoring_backlog.keys,
  traditionalBacklogKeys,
  "The review contract must retain all 33 pre-assigned traditional house-1 keys."
);

assert.match(appSource, /const activeEmptyHouseRulerSystem: EmptyHouseRulerSystem = "modern"/u);
assert.match(appSource, /const emptyHouseV14ModernSignRulers[\s\S]*?Scorpio: "Pluto"[\s\S]*?Aquarius: "Uranus"[\s\S]*?Pisces: "Neptune"/u);
assert.match(appSource, /emptyHouseSignRulersBySystem[\s\S]*?traditional: traditionalSignRulers/u);
assert.match(appSource, /function emptyHouseContext[\s\S]*?emptyHouseSignRulersBySystem\[activeEmptyHouseRulerSystem\]\[sign\][\s\S]*?positions\.find\(\(candidate\) => candidate\.planet === ruler\)/u);
assert.doesNotMatch(appSource, /rulerOccurrence: emptyHouseRulerOccurrence/u);

if (promoted) {
  assert.equal(servingV14Rows.length, 541);
  assert.equal(approval.status, "approved");
  const distRenderer = createDistRenderer(templates, rows);
  for (const facts of [
    { house: 1, sign: "scorpio", primaryRuler: "pluto", rulerHouse: 9, voice: "you" },
    { house: 1, sign: "aquarius", primaryRuler: "uranus", rulerHouse: 6, voice: "Friend" },
    { house: 2, sign: "aries", primaryRuler: "mars", rulerHouse: 11, voice: "you" },
    { house: 2, sign: "pisces", primaryRuler: "neptune", rulerHouse: 7, voice: "Friend" },
    { house: 12, sign: "leo", primaryRuler: "sun", rulerHouse: 3, voice: "you" },
  ]) {
    const sourceResult = sourceRenderer.renderNatalEmptyHouse(facts);
    assert.deepEqual(distRenderer.renderNatalEmptyHouse(facts), sourceResult, "Dist/source parity.");
    assert.deepEqual(renderNatalEmptyHouseNode(facts), sourceResult, "Node/source parity.");
  }
  assert.throws(
    () => renderNatalEmptyHouseNode({ house: 1, sign: "scorpio", primaryRuler: "mars", rulerHouse: 2, voice: "you" }),
    NodeRoleViolationError
  );
  assert.throws(
    () => renderNatalEmptyHouseNode({ house: 2, sign: "aries", primaryRuler: "mars", rulerHouse: 2, voice: "you" }),
    NodeSourceGapError
  );
} else {
  assert.equal(servingV14Rows.length, 0, "Unapproved Friend rows must not enter the serving source store.");
  assert.equal(approval.status, "needs_review");
  assert.equal(authored.distribution_state, "staged");
}

console.log(`empty-house V14 modern passed: 550 governed rows, 541 serving projections, ${renderCount} dual-voice renders, ${promoted ? "dist/browser/Node parity" : "Friend approval still gated"}`);
