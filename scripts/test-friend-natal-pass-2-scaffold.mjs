#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const hashRows = (rows) => sha256(JSON.stringify(rows));
const packageRoot = "apps/web/src/content/fallbackArchitectureV3";
const scaffoldPath = "packages/astro-knowledge/review/friend-natal-pass-2-scaffold-v1.json";
const scaffold = readJson(scaffoldPath);

assert.equal(scaffold.status, "ACTIVE_REVIEW_GATED");
assert.equal(scaffold.currentPhase, "governed_candidate_sources_and_slot_grammar");
assert.equal(scaffold.contentAuthored, false);
assert.equal(scaffold.servingChangesAuthorized, false);
assert.equal(scaffold.autoPublish, false);
assert.equal(scaffold.writerPromotionAuthorized, false);
assert.deepEqual(scaffold.activationGates, {
  populatedVerdictWorkbookImported: true,
  ownerDecisionsImported: true,
  pass2SplitApproachExplicitlyAuthorized: true
});
assert.equal(scaffold.ownerAuthorization.statement, "i pass-2 authorization");
assert.equal(scaffold.ownerAuthorization.scope.length, 4);
assert.equal(scaffold.ownerAuthorization.doesNotApproveCandidateWording, true);
assert.equal(scaffold.ownerAuthorization.doesNotAuthorizeServingChanges, true);
assert.equal(scaffold.ownerAuthorization.doesNotAuthorizeAutoPublish, true);
assert.equal(scaffold.ownerAuthorization.doesNotAuthorizeWriterPromotion, true);

assert.equal(scaffold.candidateFiles.length, 5);
for (const candidateFile of scaffold.candidateFiles) {
  const candidateDocument = readJson(candidateFile.path);
  assert.deepEqual(candidateDocument.rows, [], `${candidateFile.path}: candidate rows require composed-output evidence before addition.`);
  assert.equal(candidateDocument.status, "active_review_gated");
  assert.equal(candidateDocument.servingChangesAuthorized, false);
  assert.equal(candidateDocument.promotionAuthorized, false);
}
assert.deepEqual(scaffold.untouchedFamilies, [{
  family: "fallback-hook/element-pattern/*",
  reason: "OwnerDecision resolved: reader-addressed comparison surface; second person remains legitimate"
}]);

const grammarContract = readJson(`${packageRoot}/contracts/FRIEND-NATAL-SLOT-GRAMMAR-V2.json`);
assert.equal(grammarContract.status, "active_review_gated");
assert.equal(grammarContract.servingChangesAuthorized, false);
assert.equal(grammarContract.slotTypes.plural_house_topic_list.grammaticalNumber, "plural");
assert.deepEqual(grammarContract.slotTypes.plural_house_topic_list.allowedVerbForms, ["base"]);
assert.equal(grammarContract.compositionRules.runtimeConjugationAllowed, false);
assert.equal(grammarContract.composedOutputQa.requiresRenderedSampleOrStableContract, true);

const sourcePath = `${packageRoot}/source-rows/fallback-source-rows-v3.json`;
const templatesPath = `${packageRoot}/templates/fallback-templates-v3.json`;
const friendVocabularyPath = `${packageRoot}/source-rows/friend-natal-vocabulary-they-candidates-v1.json`;
const friendRowsPath = `${packageRoot}/source-rows/friend-natal-row-level-candidates-v1.json`;
const source = readJson(sourcePath);
const baseline = scaffold.canonicalBaselines;

assert.equal(sha256(fs.readFileSync(sourcePath)), baseline.fallbackSourceRowsSha256, "Canonical fallback source drifted during blocked pass-2 preparation.");
assert.equal(sha256(fs.readFileSync(templatesPath)), baseline.fallbackTemplatesSha256, "Canonical fallback templates drifted during blocked pass-2 preparation.");
assert.equal(sha256(fs.readFileSync(friendVocabularyPath)), baseline.friendVocabularyCandidatesSha256, "Round-1 vocabulary candidates drifted.");
assert.equal(sha256(fs.readFileSync(friendRowsPath)), baseline.friendRowCandidatesSha256, "Round-1 row candidates drifted.");

const familyRows = (prefix) => source.hookRows.filter((row) => row.contentKey.startsWith(prefix));
assert.equal(familyRows("fallback-hook/element-pattern/").length, 16);
assert.equal(hashRows(familyRows("fallback-hook/element-pattern/")), baseline.elementPatternRowsSha256);
assert.equal(familyRows("fallback-hook/ruler-method/").length, 84);
assert.equal(hashRows(familyRows("fallback-hook/ruler-method/")), baseline.rulerMethodRowsSha256);
assert.equal(hashRows(familyRows("fallback-hook/placement-sentence/")), baseline.placementSentenceRowsSha256);
assert.equal(hashRows(familyRows("fallback-hook/placement-house-sentence/")), baseline.placementHouseSentenceRowsSha256);
assert.equal(hashRows(familyRows("fallback-hook/empty-house-")), baseline.emptyHouseFrameRowsSha256);
assert.equal(hashRows(familyRows("fallback-hook/house-glossary/")), baseline.houseGlossaryRowsSha256);

let approvedCandidates = 0;
let discardedCandidates = 0;
for (const path of [friendVocabularyPath, friendRowsPath]) {
  const document = readJson(path);
  const rows = [...(document.vocabularyRows ?? []), ...(document.hookRows ?? [])];
  for (const row of rows) {
    if (row.review_status === "owner_approved_candidate") approvedCandidates += 1;
    if (row.review_status === "discarded") discardedCandidates += 1;
    assert.equal(row.promotionAuthorized, false, `${row.contentKey}: promotion was authorized before import.`);
  }
}
assert.equal(approvedCandidates, 2);
assert.equal(discardedCandidates, 41);

const llMatrix = readJson("packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/ll-matrix-v13.json");
assert.equal(llMatrix.rows.length, 1014);
assert.equal(llMatrix.rows.filter((row) => row.ownerApproved === true).length, 301);
assert.equal(llMatrix.rows.filter((row) => row.ownerApproved !== true).length, 713);

console.log("friend natal pass-2 scaffold: ok (active and review-gated; 2 approved candidates, 41 discarded; 3 rulings applied; 0 pass-2 authored rows; 301/713 LL split pinned; canonical families unchanged)");
