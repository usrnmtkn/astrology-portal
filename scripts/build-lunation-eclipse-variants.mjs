#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sharedLunationEclipseSectionKey } from "../apps/web/src/content/fallbackArchitectureV3/resolver/lunationEclipseSectionKeys.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/lunation-card-assembly-v1/pisces-lunar-eclipse-review-packet-v1.json"
);
const outputPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-eclipse-variants-v1.json"
);
const sectionOutputPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-eclipse-sections-v1.json"
);
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const wordCount = (value) => value.trim().split(/\s+/u).filter(Boolean).length;
const title = (value) => value.replace(/(^|-)([a-z])/gu, (_match, separator, letter) => `${separator}${letter.toUpperCase()}`);

const packetText = fs.readFileSync(reviewPath, "utf8");
const packet = JSON.parse(packetText);
if (packet.schema !== "pisces-lunar-eclipse-review-packet/v1" || packet.cards.length !== 12) {
  throw new Error("Expected the twelve-card Pisces lunar-eclipse review packet.");
}

const reviewRecordPath = path.relative(repoRoot, reviewPath);

function exactApproval(body) {
  return {
    approvalLevel: "exact_owner_approved",
    recordPath: reviewRecordPath,
    payloadSha256: sha256(body),
    approvedAt: "2026-08-24"
  };
}

function sectionById(card, id) {
  const section = card.proposed.sections.find((candidate) => candidate.id === id);
  if (!section?.text) throw new Error(`Missing ${id} section for house ${card.house}.`);
  return section;
}

function applyApprovedOmissions(card) {
  let body = card.original.bookBody;
  const omissions = [...card.proposed.omittedDeclaredIntentionBlocks]
    .filter((span) => span.ownerApproved === true)
    .sort((left, right) => right.start - left.start);

  for (const span of omissions) {
    const actual = body.slice(span.start, span.end);
    if (actual !== span.text || sha256(actual) !== span.sha256) {
      throw new Error(`Approved intention omission drifted for house ${card.house}.`);
    }
    body = `${body.slice(0, span.start)}${body.slice(span.end)}`;
  }
  return body;
}

function evergreenBodySection(card) {
  if (card.proposed.approvedBodyEdits.length > 0) {
    throw new Error(`Complete eclipse body replacements are prohibited for house ${card.house}.`);
  }

  if (sha256(card.original.bookBody) !== card.sourceBodySha256) {
    throw new Error(`Protected source body drifted for house ${card.house}.`);
  }
  const sourceBody = applyApprovedOmissions(card);
  const opening = card.original.bookOpeningSentence;
  if (!sourceBody.startsWith(opening)) {
    throw new Error(`Evergreen opening drifted for house ${card.house}.`);
  }
  const sourceRemainder = card.original.bookBody.slice(opening.length).trimStart();
  const emittedRemainder = sourceBody.slice(opening.length).trimStart();
  if (sectionById(card, "bookBodyRemainder").text !== emittedRemainder) {
    throw new Error(`Protected book remainder drifted in the review packet for house ${card.house}.`);
  }
  return {
    body: emittedRemainder,
    reviewStatus: "approved_reuse",
    policy: card.proposed.omittedDeclaredIntentionBlocks.length > 0
      ? "exact-evergreen-remainder-with-approved-omissions"
      : "exact-evergreen-remainder-reuse",
    protectedContent: {
      source_body_sha256: card.sourceBodySha256,
      source_opening_sha256: sha256(opening),
      source_remainder_sha256: sha256(sourceRemainder),
      preservedBookRemainderSha256: sha256(emittedRemainder),
      approved_omissions: card.proposed.omittedDeclaredIntentionBlocks.map((span) => ({
        start: span.start,
        end: span.end,
        sha256: span.sha256,
        text: span.text,
        ownerApproved: span.ownerApproved === true,
        approvedAt: span.approvedAt
      }))
    }
  };
}

function approvedSectionCard(card, id, body, reviewStatus = "approved", extra = {}) {
  const {
    policy = "exact-owner-approved-eclipse-section",
    protectedContent = {},
    ...metadata
  } = extra;
  const contentKey = `authored/lunation-eclipse-section/pisces/rising-${card.risingSign}/house-${card.house}/${id}`;
  return {
    contentKey,
    content_role: "full_copy",
    body,
    review_status: reviewStatus,
    owner_authored: true,
    lunation_kind: "eclipse-lunar",
    lunation_sign: "pisces",
    rising_sign: card.risingSign,
    house: card.house,
    eclipse_section: id,
    source_keys: [card.sourceContentKey, reviewRecordPath],
    source_release: "pisces-lunar-eclipse-review-packet-v1",
    approval: exactApproval(body),
    promotion_authorized: true,
    protected_content: {
      policy,
      body_sha256: sha256(body),
      word_count: wordCount(body),
      char_count: body.length,
      template_slots: [...new Set([...body.matchAll(/\{\{([\w.]+)\}\}/gu)].map((match) => match[1]))],
      ...protectedContent
    },
    ...metadata
  };
}

const cardSectionCards = packet.cards.flatMap((card) => {
  const review = card.review;
  for (const [field, value] of Object.entries({
    bookOpeningSentence: review.bookOpeningSentence,
    eclipseNature: review.eclipseNature,
    eclipseMechanics: review.eclipseMechanics,
    eclipseNoRitual: review.eclipseNoRitual,
    eclipseClose: review.eclipseClose
  })) {
    if (!String(value).startsWith("OWNER_APPROVED")) {
      throw new Error(`House ${card.house} ${field} is not owner-approved.`);
    }
  }

  const evergreen = evergreenBodySection(card);
  return [
    approvedSectionCard(card, "opening", sectionById(card, "opening").text),
    approvedSectionCard(card, "evergreen-body", evergreen.body, evergreen.reviewStatus, {
      policy: evergreen.policy,
      protectedContent: evergreen.protectedContent,
      suppress_cycle_anchor: card.proposed.cycleAnchorSuppressed === true
    })
  ];
});

const sharedSectionDefinitions = [
  { id: "nature", packetField: "nature" },
  { id: "mechanics", packetField: "mechanics" },
  { id: "recommendation", packetField: "noRitual" },
  { id: "close", packetField: "close" },
  { id: "recommendation", packetField: "endingsNoRitual", houseVariant: 4 },
  { id: "close", packetField: "endingsClose", houseVariant: 4 }
];
const sharedSectionCards = sharedSectionDefinitions.map(({ id, packetField, houseVariant = null }) => {
  const body = packet.sharedLayers[packetField];
  if (!body) throw new Error(`Missing shared ${packetField} section.`);
  return {
    ...approvedSectionCard(packet.cards[0], id, body),
    contentKey: sharedLunationEclipseSectionKey("eclipse-lunar", id, houseVariant),
    lunation_sign: null,
    rising_sign: null,
    house: null,
    source_keys: [reviewRecordPath]
  };
});
const sectionCards = [...cardSectionCards, ...sharedSectionCards];

const authoredCards = packet.cards.map((card) => {
  const body = card.proposed.completeCardTemplate;
  if (!body || sha256(body) !== card.proposed.completeCardTemplateSha256) {
    throw new Error(`Complete-card template hash mismatch for house ${card.house}.`);
  }
  const contentKey = `authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-lunar/pisces/rising-${card.risingSign}/house-${card.house}`;
  return {
    contentKey,
    content_role: "full_copy",
    headline: "Pisces Lunar Eclipse Horoscope",
    body,
    review_status: "needs_review",
    owner_authored: true,
    lunation_kind: "eclipse-lunar",
    lunation_sign: "pisces",
    rising_sign: card.risingSign,
    house: card.house,
    source_keys: [
      card.sourceContentKey,
      path.relative(repoRoot, reviewPath)
    ],
    source_release: "pisces-lunar-eclipse-review-packet-v1",
    approval: null,
    promotion_authorized: false,
    protected_content: {
      policy: "exact-template-owner-review-held",
      body_sha256: sha256(body),
      word_count: wordCount(body),
      char_count: body.length,
      template_slots: [...new Set([...body.matchAll(/\{\{([\w.]+)\}\}/gu)].map((match) => match[1]))]
    },
    editorial_review: {
      whole_card: card.review.wholeCard,
      continuity_status: card.proposed.continuityReview.status,
      repeated_lunation_reminder_count: card.proposed.continuityReview.repeatedLunationReminderCount
    }
  };
});

const output = {
  schema: "lunation-eclipse-variants/v1",
  version: "pisces-lunar-eclipse-review-packet-v1",
  status: "review-held",
  source_artifact: path.relative(repoRoot, reviewPath),
  source_sha256: sha256(packetText),
  count: authoredCards.length,
  sectionCount: sectionCards.length,
  authoredCards,
  sectionCards
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(sectionOutputPath, `${JSON.stringify({
  schema: "lunation-eclipse-sections/v1",
  version: "pisces-lunar-eclipse-review-packet-v1",
  status: "owner-approved",
  source_artifact: path.relative(repoRoot, reviewPath),
  source_sha256: sha256(packetText),
  count: sectionCards.length,
  authoredCards: sectionCards
}, null, 2)}\n`);
console.log(`Wrote ${authoredCards.length} review-held eclipse variants to ${path.relative(repoRoot, outputPath)} and ${sectionCards.length} approved sections to ${path.relative(repoRoot, sectionOutputPath)}.`);
