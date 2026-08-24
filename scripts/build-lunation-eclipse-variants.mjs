#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  const hasApprovedBodyReplacement = card.proposed.approvedBodyEdits
    .some((edit) => edit.ownerApproved === true);
  if (hasApprovedBodyReplacement) {
    return {
      body: sectionById(card, "bookBodyRemainder").text,
      reviewStatus: "approved",
      policy: "exact-owner-approved-eclipse-body"
    };
  }

  const sourceBody = applyApprovedOmissions(card);
  const opening = card.original.bookOpeningSentence;
  if (!sourceBody.startsWith(opening)) {
    throw new Error(`Evergreen opening drifted for house ${card.house}.`);
  }
  return {
    body: sourceBody.slice(opening.length).trimStart(),
    reviewStatus: "approved_reuse",
    policy: "exact-evergreen-remainder-reuse"
  };
}

function approvedSectionCard(card, id, body, reviewStatus = "approved", extra = {}) {
  const { policy = "exact-owner-approved-eclipse-section", ...metadata } = extra;
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
      template_slots: [...new Set([...body.matchAll(/\{\{([\w.]+)\}\}/gu)].map((match) => match[1]))]
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
      suppress_cycle_anchor: card.proposed.cycleAnchorSuppressed === true
    })
  ];
});

const sharedSectionDefinitions = [
  ["nature", "eclipseNature"],
  ["mechanics", "eclipseMechanics"],
  ["recommendation", "eclipseNoRitual"],
  ["close", "eclipseClose"]
];
const sharedSectionCards = sharedSectionDefinitions.map(([id, packetId]) => {
  const bodies = new Set(packet.cards.map((card) => sectionById(card, packetId).text));
  if (bodies.size !== 1) throw new Error(`Shared ${id} section drifted across Pisces cards.`);
  const body = [...bodies][0];
  return {
    ...approvedSectionCard(packet.cards[0], id, body),
    contentKey: `authored/lunation-eclipse-section/pisces/shared/${id}`,
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
    headline: `Pisces Lunar Eclipse for ${title(card.risingSign)} Rising`,
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
