#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { lintArticle } = require("./lint-placement-voice.js");
const { PLANETS, SIGNS, toHookRows } = require("./generate-sky-placement-articles.js");

const root = path.join(__dirname, "..");
const defaultBundle = path.join(root, "review", "sky-placement-rewrite-pilot-v2-candidates.json");
const bundlePath = path.resolve(process.argv[2] || defaultBundle);

function fail(message) {
  throw new Error(message);
}

function auditBundle(value) {
  if (value?.schema !== "tldrastro-sky-placement-review-bundle-v1") fail("unexpected review-bundle schema");
  if (value.status !== "needs_review") fail("bundle status must remain needs_review");
  if (value.promotionAuthorized !== false) fail("bundle must explicitly deny promotion authorization");
  if (!Array.isArray(value.candidates) || value.candidates.length === 0) fail("bundle must contain candidates");

  const seen = new Set();
  const materializedRows = [];
  for (const candidate of value.candidates) {
    const key = `${candidate.planet}/${candidate.sign}`;
    if (seen.has(key)) fail(`duplicate candidate ${key}`);
    seen.add(key);
    if (!PLANETS.includes(candidate.planet) || !SIGNS.includes(candidate.sign)) fail(`invalid placement ${key}`);
    if (candidate.status !== "needs_review") fail(`${key} must remain needs_review`);
    if (candidate.promotionAuthorized !== false) fail(`${key} must explicitly deny promotion authorization`);
    if (candidate.judgeResult?.score !== 3) fail(`${key} is not judge 3`);

    const lint = lintArticle({ ...candidate.article, planet: candidate.planet });
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
    reviewStatus: value.status,
    promotionAuthorized: value.promotionAuthorized
  };
}

if (require.main === module) {
  try {
    const result = auditBundle(JSON.parse(fs.readFileSync(bundlePath, "utf8")));
    console.log(`Review bundle clean: ${result.candidates} candidates, ${result.rows} needs_review rows, ${result.lint3} lint-3 articles, promotionAuthorized=${result.promotionAuthorized}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = { auditBundle };
