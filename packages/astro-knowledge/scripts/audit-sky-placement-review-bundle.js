#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { lintArticle } = require("./lint-placement-voice.js");
const { PLANETS, SIGNS, toHookRows } = require("./generate-sky-placement-articles.js");

const root = path.join(__dirname, "..");
const defaultBundle = path.join(root, "review", "sky-placement-rewrite-pilot-v2-candidates.json");
const bundlePath = path.resolve(process.argv[2] || defaultBundle);
const GRANDFATHERED_PUNCTUATION_BUNDLES = new Set([
  "sky-placement-rewrite-pilot-v2-candidates.json",
  "sky-placement-voice-pass-v3-candidates.json",
  "sky-placement-voice-pass-v4-gpt-5.6-review-candidates.json",
  "sky-placement-voice-pass-v6-targeted-candidates.json",
  "sky-placement-voice-pass-v7-writer-candidates.json",
  "sky-placement-voice-pass-v8-source-derived-candidates.json",
  "sky-placement-voice-pass-v9-neptune-libra-owner-turn-candidate.json"
]);

function fail(message) {
  throw new Error(message);
}

function auditBundle(value, { sourcePath = bundlePath } = {}) {
  if (value?.schema !== "tldrastro-sky-placement-review-bundle-v1") fail("unexpected review-bundle schema");
  if (value.status !== "needs_review") fail("bundle status must remain needs_review");
  if (!["needs_voice_pass", "voice_pass_draft"].includes(value.editorialStatus)) {
    fail("bundle editorialStatus must be needs_voice_pass or voice_pass_draft");
  }
  if (value.promotionAuthorized !== false) fail("bundle must explicitly deny promotion authorization");
  if (!Array.isArray(value.candidates) || value.candidates.length === 0) fail("bundle must contain candidates");

  const seen = new Set();
  const materializedRows = [];
  let currentJudge3 = 0;
  let ownerEdited = 0;
  let voicePassDrafts = 0;
  const allowLegacySecondPerson = Number.parseInt(String(value.version || "0"), 10) < 4;
  const allowLegacyGenericPeople = Number.parseInt(String(value.version || "0"), 10) < 8;
  const allowLegacyTagline = Number.parseInt(String(value.version || "0"), 10) < 10;
  const allowLegacyRepeatedGenericPerson = Number.parseInt(String(value.version || "0"), 10) < 11;
  const allowLegacyPerformanceFraming = Number.parseInt(String(value.version || "0"), 10) < 12;
  const allowLegacyPunctuation = GRANDFATHERED_PUNCTUATION_BUNDLES.has(path.basename(sourcePath));
  for (const candidate of value.candidates) {
    const key = `${candidate.planet}/${candidate.sign}`;
    if (seen.has(key)) fail(`duplicate candidate ${key}`);
    seen.add(key);
    if (!PLANETS.includes(candidate.planet) || !SIGNS.includes(candidate.sign)) fail(`invalid placement ${key}`);
    if (candidate.status !== "needs_review") fail(`${key} must remain needs_review`);
    if (candidate.promotionAuthorized !== false) fail(`${key} must explicitly deny promotion authorization`);
    if (candidate.recommendedDecision !== "revise") fail(`${key} must remain revise until the voice pass is complete`);
    if (candidate.voicePass) {
      voicePassDrafts++;
      if (candidate.voicePass.source !== "owner-guided-offline-rewrite") fail(`${key} voice pass must identify owner-guided offline provenance`);
      if (candidate.voicePass.status !== "pending_owner_review") fail(`${key} voice pass must remain pending owner review`);
      if (candidate.judgeResult?.status !== "not_run_after_voice_pass" || ![2, 3].includes(candidate.judgeResult?.priorScore)) {
        fail(`${key} voice pass must preserve the prior judge score without presenting it as current`);
      }
    } else if (candidate.ownerEdit) {
      ownerEdited++;
      if (!["owner-verbatim", "owner-directed-review"].includes(candidate.ownerEdit.source)) {
        fail(`${key} owner edit must identify owner provenance`);
      }
      if (candidate.ownerEdit.status !== "pending_owner_approval") fail(`${key} owner edit must remain pending owner approval`);
      if (!Array.isArray(candidate.ownerEdit.slots) || candidate.ownerEdit.slots.length === 0) fail(`${key} owner edit must identify its slots`);
      if (candidate.judgeResult?.status !== "stale_after_owner_edit" || candidate.judgeResult?.priorScore !== 3) {
        fail(`${key} owner edit must preserve the prior judge result as stale provenance`);
      }
    } else {
      if (candidate.judgeResult?.score !== 3) fail(`${key} is not judge 3`);
      currentJudge3++;
    }

    const lint = lintArticle({
      ...candidate.article,
      planet: candidate.planet,
      sign: candidate.sign,
      allowLegacySecondPerson,
      allowLegacyGenericPeople,
      allowLegacyTagline,
      allowLegacyRepeatedGenericPerson,
      allowLegacyPerformanceFraming
    }, { allowLegacyPunctuation });
    if (lint.score !== 3 || lint.fails !== 0 || lint.warns !== 0) {
      fail(`${key} does not lint 3: ${JSON.stringify(lint.findings)}`);
    }
    if (candidate.lint?.score !== lint.score || candidate.lint?.fails !== lint.fails || candidate.lint?.warns !== lint.warns) {
      fail(`${key} saved lint result is stale`);
    }

    const rows = toHookRows(
      { planet: candidate.planet, sign: candidate.sign },
      candidate.article,
      { source: candidate.meaningSource, model: value.generation?.model, gate: "owner-review" }
    );
    if (rows.length !== 5) fail(`${key} must materialize exactly five rows`);
    if (rows.some((row) => row.review_status !== "needs_review" || row.body_you !== row.body_they)) {
      fail(`${key} materialized an approved or voice-mismatched row`);
    }
    materializedRows.push(...rows);
  }

  return {
    candidates: value.candidates.length,
    rows: materializedRows.length,
    lint3: value.candidates.length,
    currentJudge3,
    ownerEdited,
    voicePassDrafts,
    reviewStatus: value.status,
    editorialStatus: value.editorialStatus,
    promotionAuthorized: value.promotionAuthorized
  };
}

if (require.main === module) {
  try {
    const result = auditBundle(JSON.parse(fs.readFileSync(bundlePath, "utf8")));
    console.log(`Review bundle clean: ${result.candidates} candidates, ${result.rows} needs_review rows, ${result.lint3} lint-3 articles, ${result.currentJudge3} current judge-3 results, ${result.ownerEdited} owner-edited pending rejudge, editorialStatus=${result.editorialStatus}, promotionAuthorized=${result.promotionAuthorized}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = { auditBundle };
