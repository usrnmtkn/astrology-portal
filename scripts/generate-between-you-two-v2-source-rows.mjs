#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const reviewPath = "packages/astro-knowledge/review/between-you-two-v2-2026-09-05/full-authoring-review.json";
const outputPath = "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-v2-rows.json";
const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));

function approvalFor(record, piece, direction) {
  const approved = direction === "you"
    ? record.reviewStatusYou === "owner_approved"
    : record.reviewStatusThey === "owner_approved";
  if (!approved) return undefined;
  return {
    approvalLevel: "exact_owner_approved",
    approvalEffect: "exact_wording_approval",
    approvedAt: "2026-09-05",
    approvalSource: (record.ownerApprovalSources ?? [reviewPath])[0],
    direction
  };
}

function makeDirectionalRow({ contentKey, body, record, piece, direction, sourceKey = null }) {
  const approved = direction === "you"
    ? record.reviewStatusYou === "owner_approved"
    : record.reviewStatusThey === "owner_approved";
  const row = {
    contentKey,
    content_role: "fallback_hook",
    grammar_frame: "complete_sentence",
    body,
    review_status: approved ? "approved" : "needs_review",
    owner_authored: approved,
    between_you_two_v2: true,
    v2_piece: piece,
    v2_direction: direction,
    v2_review_status: approved ? "owner_approved" : "proposed",
    review_source: `${reviewPath}#${record.id}`
  };
  if (sourceKey) row.source_key = sourceKey;
  const approval = approvalFor(record, piece, direction);
  if (approval) row.approval = approval;
  return row;
}

function makeSharedMoonRow({ contentKey, body, record, piece }) {
  const approved = record.reviewStatus === "owner_approved";
  const row = {
    contentKey,
    content_role: "fallback_hook",
    grammar_frame: "complete_sentence",
    body_you: body,
    body_they: body,
    review_status: approved ? "approved" : "needs_review",
    owner_authored: approved,
    between_you_two_v2: true,
    v2_piece: piece,
    v2_direction: "shared",
    v2_review_status: record.reviewStatus,
    review_source: `${reviewPath}#${record.id}`
  };
  if (approved) {
    row.approval = {
      approvalLevel: "exact_owner_approved",
      approvalEffect: "exact_wording_approval",
      approvedAt: "2026-09-05",
      approvalSource: (record.ownerApprovalSources ?? [reviewPath])[0],
      direction: "shared"
    };
  }
  return row;
}

const rows = [];
for (const record of review.records) {
  if (record.family && record.transiting) {
    for (const direction of ["you", "they"]) {
      const suffix = direction;
      const headlineBody = direction === "you" ? record.headline.body_you : record.headline.body_they;
      const moveBody = direction === "you" ? record.move.body_you : record.move.body_they;
      const v2Body = direction === "you" ? record.v2Body?.body_you : record.v2Body?.body_they;
      rows.push(makeDirectionalRow({
        contentKey: `fallback-hook/pair-daily/v2/headline/${record.family}/${record.transiting}/${suffix}`,
        body: headlineBody,
        record,
        piece: "headline",
        direction,
        sourceKey: record.bodyContentKey
      }));
      if (typeof v2Body === "string" && v2Body.trim()) {
        rows.push(makeDirectionalRow({
          contentKey: `fallback-hook/pair-daily/v2/body/${record.family}/${record.transiting}/${suffix}`,
          body: v2Body,
          record,
          piece: "body",
          direction,
          sourceKey: record.bodyContentKey
        }));
      }
      rows.push(makeDirectionalRow({
        contentKey: `fallback-hook/pair-daily/v2/move/${record.family}/${record.transiting}/${suffix}`,
        body: moveBody,
        record,
        piece: "move",
        direction,
        sourceKey: record.bodyContentKey
      }));
    }
    continue;
  }

  if (record.evidenceTier === "shared-moon") {
    rows.push(makeSharedMoonRow({
      contentKey: `fallback-hook/pair-daily/v2/shared-moon/${record.element}/headline`,
      body: record.headline,
      record,
      piece: "headline"
    }));
    rows.push(makeSharedMoonRow({
      contentKey: `fallback-hook/pair-daily/v2/shared-moon/${record.element}/body`,
      body: record.body,
      record,
      piece: "body"
    }));
    continue;
  }

  throw new Error(`Unsupported V2 review record: ${record.id}`);
}

const approved = rows.filter((row) => row.review_status === "approved");
const held = rows.filter((row) => row.review_status === "needs_review");
if (rows.length !== 127) throw new Error(`Expected 127 direction-safe V2 rows, got ${rows.length}`);
if (approved.length !== 45) throw new Error(`Expected 45 owner-approved V2 rows, got ${approved.length}`);
if (held.length !== 82) throw new Error(`Expected 82 held V2 rows, got ${held.length}`);
if (new Set(rows.map((row) => row.contentKey)).size !== rows.length) throw new Error("Duplicate V2 source key");
if (approved.some((row) => row.v2_direction === "they")) throw new Error("Reverse-direction V2 copy must remain held until explicitly reviewed.");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({
  schema: "tldrastro-between-you-two-v2-source-rows/v3",
  description: "Between You Two V2 relationship-first headline/body/move and shared-Moon rows. Bond approvals are direction-specific so unseen reverse-direction wording cannot inherit owner approval. An approved V2 lead body is additive and does not replace the canonical bond-effect body used by other relationship surfaces.",
  rowCount: rows.length,
  approvedCount: approved.length,
  needsReviewCount: held.length,
  rows
}, null, 2) + "\n");
console.log(`Wrote ${outputPath}: ${rows.length} rows (${approved.length} approved, ${held.length} held).`);
