#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  isGovernedReaderEligible,
  readerEligibilityReason
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";

const sourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-eclipse-variants-v1.json";
const sectionSourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-eclipse-sections-v1.json";
const packetPath = "packages/astro-knowledge/review/lunation-card-assembly-v1/pisces-lunar-eclipse-review-packet-v1.json";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const sectionSource = JSON.parse(fs.readFileSync(sectionSourcePath, "utf8"));
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(source.schema, "lunation-eclipse-variants/v1");
assert.equal(source.status, "review-held");
assert.equal(source.count, 12);
assert.equal(source.sectionCount, 28);
assert.equal(source.authoredCards.length, 12);
assert.equal(source.sectionCards.length, 28);
assert.equal(new Set(source.authoredCards.map((card) => card.contentKey)).size, 12);
assert.equal(new Set(source.sectionCards.map((card) => card.contentKey)).size, 28);
assert.equal(sectionSource.schema, "lunation-eclipse-sections/v1");
assert.equal(sectionSource.status, "owner-approved");
assert.equal(sectionSource.count, 28);
assert.deepEqual(sectionSource.authoredCards, source.sectionCards);

for (const card of source.authoredCards) {
  const reviewCard = packet.cards.find((candidate) => candidate.house === card.house);
  assert.ok(reviewCard, `Missing packet card for house ${card.house}.`);
  assert.equal(card.body, reviewCard.proposed.completeCardTemplate);
  assert.equal(card.protected_content.body_sha256, hash(card.body));
  assert.equal(card.protected_content.char_count, card.body.length);
  assert.equal(card.review_status, "needs_review");
  assert.equal(card.promotion_authorized, false);
  assert.equal(card.approval, null);
  assert.equal(card.editorial_review.whole_card, "PENDING");
  assert.match(card.contentKey, /^authored\/book-ritual-and-the-moon\/lunation-horoscope\/eclipse-lunar\/pisces\/rising-[a-z-]+\/house-(?:[1-9]|1[0-2])$/u);
}

assert.equal(source.authoredCards.filter((card) => card.editorial_review.continuity_status === "clear").length, 1);
assert.equal(source.authoredCards.find((card) => card.house === 4).editorial_review.continuity_status, "clear");
assert.equal(source.authoredCards.filter((card) => card.editorial_review.continuity_status === "candidate_clear_needs_owner_review").length, 11);
assert.equal(source.authoredCards.reduce((sum, card) => sum + card.editorial_review.repeated_lunation_reminder_count, 0), 0);
assert.equal(source.authoredCards.filter((card) => card.protected_content.template_slots.includes("matchingNewMoonDate")).length, 11);
assert.deepEqual(source.authoredCards.find((card) => card.house === 10).protected_content.template_slots, []);

const heldCard = source.authoredCards[0];
assert.equal(isGovernedReaderEligible(heldCard), false);
assert.equal(readerEligibilityReason(heldCard), "review-status");
const statusOnlyPromotion = { ...heldCard, review_status: "approved" };
assert.equal(isGovernedReaderEligible(statusOnlyPromotion), false);
assert.equal(readerEligibilityReason(statusOnlyPromotion), "exact-owner-approval-required");
const exactlyApproved = {
  ...statusOnlyPromotion,
  approval: {
    approvalLevel: "exact_owner_approved",
    recordPath: packetPath,
    payloadSha256: heldCard.protected_content.body_sha256,
    approvedAt: "2026-08-24"
  }
};
assert.equal(isGovernedReaderEligible(exactlyApproved), true);
assert.equal(readerEligibilityReason(exactlyApproved), null);

for (const section of source.sectionCards) {
  assert.ok(["approved", "approved_reuse"].includes(section.review_status));
  assert.equal(section.approval.approvalLevel, "exact_owner_approved");
  assert.equal(section.approval.payloadSha256, hash(section.body));
  assert.equal(section.protected_content.body_sha256, hash(section.body));
  assert.equal(isGovernedReaderEligible(section), true);
  assert.equal(readerEligibilityReason(section), null);
}
assert.equal(source.sectionCards.filter((section) => section.eclipse_section === "opening").length, 12);
assert.equal(source.sectionCards.filter((section) => section.eclipse_section === "evergreen-body").length, 12);
const houseFourBody = source.sectionCards.find((section) => section.house === 4 && section.eclipse_section === "evergreen-body");
assert.match(houseFourBody.body, /^Home isn't just a place - it's a feeling\./u);
assert.doesNotMatch(houseFourBody.body, /Home is where the heart is\./u);
assert.equal(houseFourBody.review_status, "approved");
assert.equal(source.sectionCards.find((section) => section.house === 10 && section.eclipse_section === "evergreen-body").suppress_cycle_anchor, true);

const runtimeBundleSource = fs.readFileSync("apps/web/src/content/fallbackArchitectureV3LunationBookBundle.ts", "utf8");
assert.match(
  runtimeBundleSource,
  /lunation-eclipse-sections-v1/u,
  "The deferred reader bundle must include approved eclipse sections."
);
assert.doesNotMatch(
  runtimeBundleSource,
  /lunation-eclipse-variants-v1/u,
  "Review-held complete eclipse drafts must remain outside the reader bundle."
);

console.log("Lunation eclipse variants passed: 12 review-held templates remain dark while 28 independently approved card/shared sections are reader-eligible.");
