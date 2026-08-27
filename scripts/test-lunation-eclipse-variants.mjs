#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  isGovernedReaderEligible,
  readerEligibilityReason
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";

const sourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-eclipse-variants-v1.json";
const sectionSourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-eclipse-sections-v1.json";
const bookSourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-book-cards-v1.json";
const packetPath = "packages/astro-knowledge/review/lunation-card-assembly-v1/pisces-lunar-eclipse-review-packet-v1.json";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const sectionSource = JSON.parse(fs.readFileSync(sectionSourcePath, "utf8"));
const bookSource = JSON.parse(fs.readFileSync(bookSourcePath, "utf8"));
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(source.schema, "lunation-eclipse-variants/v1");
assert.equal(source.status, "review-held");
assert.equal(source.count, 12);
assert.equal(source.sectionCount, 30);
assert.equal(source.authoredCards.length, 12);
assert.equal(source.sectionCards.length, 30);
assert.equal(new Set(source.authoredCards.map((card) => card.contentKey)).size, 12);
assert.equal(new Set(source.sectionCards.map((card) => card.contentKey)).size, 30);
assert.equal(sectionSource.schema, "lunation-eclipse-sections/v1");
assert.equal(sectionSource.status, "owner-approved");
assert.equal(sectionSource.count, 30);
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
  assert.equal(card.headline, "Pisces Lunar Eclipse Horoscope");
  assert.match(card.contentKey, /^authored\/book-ritual-and-the-moon\/lunation-horoscope\/eclipse-lunar\/pisces\/rising-[a-z-]+\/house-(?:[1-9]|1[0-2])$/u);
}

assert.equal(source.authoredCards.filter((card) => card.editorial_review.continuity_status === "needs_owner_exact_edit").length, 12);
assert.equal(source.authoredCards.reduce((sum, card) => sum + card.editorial_review.repeated_lunation_reminder_count, 0), 43);
assert.equal(source.authoredCards.filter((card) => card.protected_content.template_slots.includes("matchingNewMoonDate")).length, 12);
assert.deepEqual(source.authoredCards.find((card) => card.house === 10).protected_content.template_slots, ["matchingNewMoonDate"]);

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
const sharedLunarSections = source.sectionCards.filter((section) => section.contentKey.startsWith(
  "authored/lunation-eclipse-section/shared/lunar/"
));
assert.equal(sharedLunarSections.length, 6);
assert.deepEqual(
  sharedLunarSections.map((section) => section.eclipse_section).sort(),
  ["close", "close", "mechanics", "nature", "recommendation", "recommendation"]
);
assert.ok(sharedLunarSections.every((section) => section.lunation_sign === null));
assert.ok(source.sectionCards.every((section) => !section.contentKey.includes("/pisces/shared/")));
const houseFourBody = source.sectionCards.find((section) => section.house === 4 && section.eclipse_section === "evergreen-body");
assert.match(houseFourBody.body, /^Home is where the heart is\. Home isn't just a place - it's a feeling\./u);
assert.doesNotMatch(houseFourBody.body, /This month's full moon intention is/u);
assert.equal(houseFourBody.review_status, "approved_reuse");
assert.equal(source.sectionCards.find((section) => section.house === 10 && section.eclipse_section === "evergreen-body").suppress_cycle_anchor, false);
assert.ok(sharedLunarSections.some((section) => section.contentKey.endsWith("/recommendation-endings")));
assert.ok(sharedLunarSections.some((section) => section.contentKey.endsWith("/close-endings")));

for (const section of source.sectionCards.filter((candidate) => candidate.eclipse_section === "evergreen-body")) {
  const sourceBook = bookSource.authoredCards.find((candidate) => (
    candidate.lunation_kind === "full-moon"
    && candidate.lunation_sign === "pisces"
    && candidate.house === section.house
  ));
  assert.ok(sourceBook, `Missing protected source book cell for house ${section.house}.`);
  assert.equal(section.protected_content.source_body_sha256, hash(sourceBook.body));
  let expected = sourceBook.body;
  for (const omission of [...section.protected_content.approved_omissions].sort((left, right) => right.start - left.start)) {
    assert.equal(omission.ownerApproved, true);
    assert.equal(sourceBook.body.slice(omission.start, omission.end), omission.text);
    assert.equal(hash(omission.text), omission.sha256);
    expected = `${expected.slice(0, omission.start)}${expected.slice(omission.end)}`;
  }
  const expectedRemainder = expected.slice(expected.indexOf(". ") + 2);
  assert.equal(section.body, expectedRemainder, `House ${section.house} must emit the protected remainder exactly.`);
  assert.equal(section.protected_content.preservedBookRemainderSha256, hash(expectedRemainder));
}
const houseTenBody = source.sectionCards.find((section) => section.house === 10 && section.eclipse_section === "evergreen-body");
assert.match(houseTenBody.body, /Invest in yourself and watch magick happen\./u);
assert.doesNotMatch(houseTenBody.body, /A title, project, or opportunity|schedule, responsibilities, pay/u);

const runtimeBundleSource = fs.readFileSync("apps/web/src/content/fallbackArchitectureV3LunationBookBundle.ts", "utf8");
assert.match(
  runtimeBundleSource,
  /bundled-lunation-eclipse-sections-v3/u,
  "The deferred reader bundle must include approved eclipse sections."
);
assert.doesNotMatch(
  runtimeBundleSource,
  /lunation-eclipse-variants-v1/u,
  "Review-held complete eclipse drafts must remain outside the reader bundle."
);

const materializerOutputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tldrastro-lunation-eclipse-import-"));
const materializerOutputPath = path.join(materializerOutputDirectory, "dashboard-rows.json");

try {
  execFileSync(process.execPath, [
    "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs",
    `--out=${materializerOutputPath}`
  ], { stdio: "pipe" });

  const materializedRows = JSON.parse(fs.readFileSync(materializerOutputPath, "utf8")).rows;
  const materializedByKey = new Map(materializedRows.map((row) => [row.content_key, row]));

  for (const card of source.authoredCards) {
    const materialized = materializedByKey.get(card.contentKey);

    assert.ok(materialized, `Content Library materializer must include ${card.contentKey}.`);
    assert.equal(materialized.body, card.body);
    assert.equal(materialized.status, "DRAFT");
    assert.equal(materialized.lane, "reference");
    assert.equal(materialized.review_state, "needs-review");
    assert.equal(materialized.facts.review_status, "needs_review");
    assert.equal(materialized.source_snapshot.review_status, "needs_review");
    assert.deepEqual(materialized.sections.packageRecord, card);
  }
} finally {
  fs.rmSync(materializerOutputDirectory, { recursive: true, force: true });
}

console.log("Lunation eclipse variants passed: 12 review-held templates remain dark, materialize unchanged for Content Library review, and keep every serving evergreen section hash-linked to its protected book source.");
