#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

import { NATAL_QA_RUBRIC_SHA256 } from "./validate-natal-chart-content-qa.mjs";

const inventory = JSON.parse(fs.readFileSync("artifacts/natal-chart-content-qa-inventory-2026-08-12.json", "utf8"));
const results = JSON.parse(fs.readFileSync("packages/astro-knowledge/review/natal-chart-content-qa-semantic-results-2026-08-12.json", "utf8"));
const allowedVerdicts = new Set(["PASS", "EDIT", "CUT", "SOURCE_GAP"]);
const allowedDefects = new Set(["astrology-restated", "translation-required", "real-filler", "scaffold-grammar", "trait-first", "decorative-evidence", "premature-complication", "trait-naming", "whether", "other-named"]);
const inventoryByReviewId = new Map(inventory.reviewQueue.map((item) => [item.reviewId, item]));

assert.equal(results.status, "complete");
assert.equal(results.rubric.sha256, NATAL_QA_RUBRIC_SHA256);
assert.equal(results.results.length, 8110);
assert.deepEqual(results.summary, { completed: 7702, pending: 0, deferredPendingPass2: 408 });
assert.equal(results.provider.successfulBatchCalls, 386);
assert.equal(results.provider.preflightCalls, 1);
assert.equal(results.provider.totalRequestsIssued, 391);
assert.deepEqual(results.governance, { advisoryOnly: true, servingChanges: false, copyChanges: false, approvalChanges: false, autoPublish: false, writerPromotion: false });

const stableKeys = new Set();
let judged = 0;
let deferred = 0;
for (const result of results.results) {
  const source = inventoryByReviewId.get(result.reviewId);
  assert.ok(source, `Missing inventory source for ${result.reviewId}.`);
  assert.equal(source.renderedTextSha256, result.renderedTextSha256, `${result.reviewId} hash drifted.`);
  const stableKey = `${result.renderKey}|${result.renderedTextSha256}`;
  assert.ok(!stableKeys.has(stableKey), `Duplicate semantic result ${stableKey}.`);
  stableKeys.add(stableKey);
  if (result.status === "deferred-pending-pass-2") {
    deferred += 1;
    assert.equal(result.surface, "friend");
    assert.ok(source.deterministicFindings.includes("friend_second_person_leak"));
    assert.equal(result.verdict, null);
    continue;
  }
  judged += 1;
  assert.ok(allowedVerdicts.has(result.verdict));
  assert.equal(result.coreMessage.trim().split(/(?<=[.!?])\s+/u).filter(Boolean).length, 1, `${result.renderKey} core message is not one sentence.`);
  if (result.verdict === "EDIT" || result.verdict === "CUT") {
    assert.ok(allowedDefects.has(result.defectClass));
    assert.equal(Boolean(result.otherDefectName), result.defectClass === "other-named");
  } else {
    assert.equal(result.defectClass, null);
    assert.equal(result.otherDefectName, null);
  }
}

assert.equal(judged, 7702);
assert.equal(deferred, 408);
console.log("Natal whole-passage semantic QA results passed: 7,702 judged, 408 deferred, stable hashes, one-sentence messages, and advisory-only governance.");

