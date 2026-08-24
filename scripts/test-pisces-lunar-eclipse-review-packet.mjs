import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";

const reviewDir = "packages/astro-knowledge/review/lunation-card-assembly-v1";
const packet = JSON.parse(fs.readFileSync(`${reviewDir}/pisces-lunar-eclipse-review-packet-v1.json`, "utf8"));
const trial = JSON.parse(fs.readFileSync(`${reviewDir}/pisces-lunar-eclipse-intro-variants-trial-v1.json`, "utf8"));
const source = JSON.parse(fs.readFileSync(`${reviewDir}/source/ritual-and-the-moon-lunation-horoscopes-v1.json`, "utf8"));
const madlib = JSON.parse(fs.readFileSync(`${reviewDir}/source/horoscope-madlib-v1.json`, "utf8"));
const spanCatalog = JSON.parse(fs.readFileSync(`${reviewDir}/source/pisces-lunar-eclipse-intention-span-candidates-v1.json`, "utf8"));
const bodyEditCatalog = JSON.parse(fs.readFileSync(`${reviewDir}/source/pisces-lunar-eclipse-body-edits-v1.json`, "utf8"));
const continuityCatalog = JSON.parse(fs.readFileSync(`${reviewDir}/source/pisces-lunar-eclipse-continuity-candidates-v1.json`, "utf8"));
const sourceByKey = new Map(source.entries.map((entry) => [entry.contentKey, entry]));
const spansByKey = new Map(spanCatalog.spans.map((span) => [span.contentKey, span]));
const bodyEditsByKey = new Map();
for (const edit of bodyEditCatalog.edits) {
  const edits = bodyEditsByKey.get(edit.contentKey) ?? [];
  edits.push(edit);
  bodyEditsByKey.set(edit.contentKey, edits);
}
const continuityByKey = new Map();
for (const edit of continuityCatalog.candidates) {
  const edits = continuityByKey.get(edit.contentKey) ?? [];
  edits.push(edit);
  continuityByKey.set(edit.contentKey, edits);
}
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const reminderPattern = /\b(?:the Pisces full moon|this Pisces full moon|this full moon|the full moon|full moon energy|each full moon|during this lunation|this month's full moon)\b/giu;
const expandedReminderPattern = /\b(?:the Pisces full moon|this Pisces full moon|this full moon|the full moon|full moon energy|each full moon|during this lunation|this month's full moon|this mystical moon|this mystical Pisces full moon|this celestial event)\b/giu;

assert.equal(packet.schema, "pisces-lunar-eclipse-review-packet/v1");
assert.equal(packet.status, "needs_owner_composition_review");
assert.equal(packet.serving, false);
assert.equal(packet.cards.length, 12);
assert.deepEqual(packet.cards.map((card) => card.house), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
assert.equal(new Set(packet.cards.map((card) => card.risingSign)).size, 12);

for (const card of packet.cards) {
  const sourceEntry = sourceByKey.get(card.sourceContentKey);
  assert.ok(sourceEntry, `Missing source entry ${card.sourceContentKey}`);
  assert.equal(sourceEntry.lunationSign, "pisces");
  assert.equal(sourceEntry.lunationKind, "full-moon");
  assert.equal(card.original.bookBody, sourceEntry.body);
  assert.equal(card.sourceBodySha256, hash(sourceEntry.body));
  const originalOpening = card.original.bookOpeningSentence;
  const originalRemainder = sourceEntry.body.slice(originalOpening.length + 1);
  assert.equal(card.proposed.sourceBookRemainderSha256, hash(originalRemainder));
  assert.deepEqual(
    card.proposed.removedSentences,
    card.house === 4
      ? ["Home is where the heart is.", "Each full moon has a theme that helps you understand your past in a new way."]
      : []
  );
  assert.equal(card.proposed.replacedSentences.length, 1);
  assert.equal(card.proposed.replacedSentences[0].from, originalOpening);
  const approvedSpan = spansByKey.get(card.sourceContentKey);
  const approvedBodyEdits = bodyEditsByKey.get(card.sourceContentKey) ?? [];
  const reviewContinuityEdits = continuityByKey.get(card.sourceContentKey) ?? [];
  let expectedSourceBody = sourceEntry.body;
  const operations = [
    ...(approvedSpan ? [{ ...approvedSpan, replacement: "" }] : []),
    ...approvedBodyEdits,
    ...reviewContinuityEdits
  ].sort((a, b) => b.start - a.start);
  for (const operation of operations) {
    if (operation.reviewStatus === "needs_owner_exact_review") {
      assert.equal(operation.ownerApproved, false);
      assert.equal(operation.promotionAuthorized, false);
    } else {
      assert.equal(operation.ownerApproved, true);
    }
    assert.equal(sourceEntry.body.slice(operation.start, operation.end), operation.text);
    assert.equal(hash(operation.text), operation.sha256);
    expectedSourceBody = `${expectedSourceBody.slice(0, operation.start)}${operation.replacement}${expectedSourceBody.slice(operation.end)}`;
  }
  if (approvedSpan) {
    assert.equal(approvedSpan.ownerApproved, true);
    assert.equal(sourceEntry.body.slice(approvedSpan.start, approvedSpan.end), approvedSpan.text);
    assert.equal(hash(approvedSpan.text), approvedSpan.sha256);
    assert.equal(card.proposed.omittedDeclaredIntentionBlocks.length, 1);
    assert.deepEqual(card.proposed.omittedDeclaredIntentionBlocks[0], {
      start: approvedSpan.start,
      end: approvedSpan.end,
      sha256: approvedSpan.sha256,
      text: approvedSpan.text,
      ownerApproved: true,
      approvedAt: approvedSpan.approvedAt
    });
  } else {
    assert.deepEqual(card.proposed.omittedDeclaredIntentionBlocks, []);
  }
  assert.deepEqual(card.proposed.approvedBodyEdits, approvedBodyEdits.map((edit) => ({
    start: edit.start,
    end: edit.end,
    sha256: edit.sha256,
    text: edit.text,
    replacement: edit.replacement,
    ownerApproved: true,
    approvedAt: edit.approvedAt
  })));
  assert.deepEqual(card.proposed.reviewContinuityEdits, reviewContinuityEdits.map((edit) => ({
    start: edit.start,
    end: edit.end,
    sha256: edit.sha256,
    text: edit.text,
    replacement: edit.replacement,
    changeReason: edit.changeReason,
    reviewStatus: edit.reviewStatus,
    ownerApproved: false,
    promotionAuthorized: false
  })));
  const expectedOpeningBoundary = expectedSourceBody.indexOf(". ") + 1;
  const expectedRemainder = expectedSourceBody.slice(expectedOpeningBoundary + 1);
  assert.equal(card.proposed.completeBookBody, `${card.proposed.replacedSentences[0].to} ${expectedRemainder}`);
  const expectedCompleteTemplate = card.proposed.sections
    .filter((section) => section.text)
    .filter((section) => section.id !== "dynamicBlocks")
    .map((section) => section.text)
    .join("\n\n");
  assert.equal(card.proposed.completeCardTemplate, expectedCompleteTemplate);
  assert.equal(card.proposed.completeCardTemplateSha256, hash(expectedCompleteTemplate));
  const expectedReminderMatches = [...expectedRemainder.matchAll(reminderPattern)].map((match) => match[0]);
  assert.deepEqual(card.proposed.continuityReview.matches, expectedReminderMatches);
  assert.equal(card.proposed.continuityReview.repeatedLunationReminderCount, expectedReminderMatches.length);
  assert.equal(
    card.proposed.continuityReview.status,
    expectedReminderMatches.length ? "needs_owner_exact_edit" : reviewContinuityEdits.length ? "candidate_clear_needs_owner_review" : "clear"
  );
  assert.equal(card.proposed.continuityReview.candidateEditCount, reviewContinuityEdits.length);
  assert.deepEqual(
    [...expectedRemainder.matchAll(expandedReminderPattern)].map((match) => match[0]),
    [],
    `House ${card.house} still re-announces the lunation after the eclipse opening.`
  );
  assert.ok(!card.proposed.completeBookBody.includes(originalOpening));
  assert.equal(card.review.bookOpeningSentence, "OWNER_APPROVED_2026_08_24");
  assert.match(card.proposed.sections[0].text, /^The Pisces lunar eclipse shines upon your /);
  assert.doesNotMatch(card.proposed.sections[0].text, /\bhits\b/u);
  if (card.house === 4) assert.equal(card.proposed.sections[0].text, "The Pisces lunar eclipse shines upon your 4th house of home, family, and generational karma.");
  assert.equal(card.proposed.cycleAnchorSuppressed, card.house === 10);
  assert.equal(card.proposed.sections.find((section) => section.id === "cycleAnchor").text, card.house === 10 ? null : packet.sharedLayers.cycleAnchor);
  assert.equal(card.proposed.sections.find((section) => section.id === "eclipseNature").text, madlib.templates.eclipseNatureDefaultCandidate);
  assert.equal(card.proposed.sections.find((section) => section.id === "eclipseMechanics").text, madlib.templates.eclipseMechanicsCandidate);
  assert.equal(card.proposed.sections.find((section) => section.id === "eclipseNoRitual").text, madlib.templates.eclipseNoRitualCandidate);
  assert.equal(card.proposed.sections.find((section) => section.id === "eclipseClose").text, madlib.templates.eclipseAdviceCandidate);
}

assert.equal(packet.cards.reduce((sum, card) => sum + card.proposed.omittedDeclaredIntentionBlocks.length, 0), 2);
assert.equal(packet.cards.reduce((sum, card) => sum + card.proposed.reviewContinuityEdits.length, 0), 40);
assert.equal(packet.cards.reduce((sum, card) => sum + card.proposed.continuityReview.repeatedLunationReminderCount, 0), 0);
for (const edit of continuityCatalog.candidates) {
  assert.equal(edit.reviewStatus, "needs_owner_exact_review");
  assert.equal(edit.ownerApproved, false);
  assert.equal(edit.promotionAuthorized, false);
  if (!edit.replacement) continue;
  const lint = validateCopy(edit.replacement, {
    validationProfile: "shared-only",
    register: "second_person",
    surface: "card"
  });
  assert.equal(lint.passed, true, `House ${edit.house} continuity replacement failed deterministic writing lint: ${JSON.stringify(lint.violations)}`);
}
assert.equal(trial.schema, "pisces-lunar-eclipse-intro-variants-trial/v1");
assert.equal(trial.status, "editorial_experiment_non_serving");
assert.equal(trial.ownerApproved, false);
assert.equal(trial.supersedesApprovedPacket, false);
assert.equal(trial.cards.length, 12);
assert.deepEqual(trial.cards.map((card) => card.introVariant), [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6]);
assert.equal(new Set(trial.cards.map((card) => card.intro)).size, 12);
assert.deepEqual(trial.flow, ["intro", "protectedBodyRemainder", "matchingNewMoonAnchorUnlessAlreadyInIntroOrBook", "recommendation", "close"]);
for (const card of trial.cards) {
  assert.match(card.intro, /Pisces lunar eclipse/u);
  assert.doesNotMatch(card.intro, /\bhits\b|full moon eclipse/iu);
  assert.equal(card.recommendation, madlib.templates.eclipseNoRitualCandidate);
  assert.equal(card.close, madlib.templates.eclipseAdviceCandidate);
  const introCarriesExactCycleAnchor = card.introVariant === 3 || card.introVariant === 4;
  assert.equal(card.cycleAnchorSuppressed, introCarriesExactCycleAnchor || card.house === 10);
  assert.equal(card.cycleAnchor, introCarriesExactCycleAnchor || card.house === 10 ? null : "Six months ago, this lunar cycle began with the New Moon in Pisces on {{matchingNewMoonDate}}.");
}
assert.equal(trial.cards.find((card) => card.house === 4).houseTopics, "home and family");
const trialHouseFour = trial.cards.find((card) => card.house === 4);
assert.match(trialHouseFour.protectedBodyRemainder, /^Home isn't just a place - it's a feeling\./u);
assert.doesNotMatch(trialHouseFour.protectedBodyRemainder, /Home is where the heart is|Pisces full moon|this full moon|full moon energy|Each full moon|During this lunation/iu);
assert.match(trialHouseFour.protectedBodyRemainder, /where their story ends and yours begins\./u);
assert.match(trialHouseFour.protectedBodyRemainder, /Understanding them does not mean you have to keep repeating them\./u);
assert.equal(
  trialHouseFour.intro,
  "Your 4th house of home and family is where this Pisces lunar eclipse is doing its work. A situation that has been developing since the New Moon in Pisces on March 18 may reach a conclusion, change direction, or reveal information you did not have when it began."
);
console.log("Pisces lunar-eclipse review packet passed: exact matching-New-Moon dates in variants 3/4, 2 approved intention omissions, duplicate anchors suppressed.");
