#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const reviewPath = "packages/astro-knowledge/review/between-you-two-v2-2026-09-05/full-authoring-review.json";
const outputPath = "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-v2-rows.json";
const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));

function approvalFor(record, piece) {
  if (record.reviewStatus !== "owner_approved") return undefined;
  return {
    approvalLevel: "exact_owner_approved",
    approvalEffect: "exact_wording_approval",
    approvedAt: "2026-09-05",
    approvalSource: `${reviewPath}#${record.id}:${piece}`
  };
}

function makeRow({ contentKey, bodyYou, bodyThey, record, piece, sourceKey = null }) {
  const approved = record.reviewStatus === "owner_approved";
  const row = {
    contentKey,
    content_role: "fallback_hook",
    grammar_frame: "complete_sentence",
    body_you: bodyYou,
    body_they: bodyThey,
    review_status: approved ? "approved" : "needs_review",
    owner_authored: approved,
    between_you_two_v2: true,
    v2_piece: piece,
    v2_review_status: record.reviewStatus,
    review_source: `${reviewPath}#${record.id}`
  };
  if (sourceKey) row.source_key = sourceKey;
  const approval = approvalFor(record, piece);
  if (approval) row.approval = approval;
  return row;
}

const rows = [];
for (const record of review.records) {
  if (record.family && record.transiting) {
    rows.push(makeRow({
      contentKey: `fallback-hook/pair-daily/v2/headline/${record.family}/${record.transiting}`,
      bodyYou: record.headline.body_you,
      bodyThey: record.headline.body_they,
      record,
      piece: "headline",
      sourceKey: record.bodyContentKey
    }));
    rows.push(makeRow({
      contentKey: `fallback-hook/pair-daily/v2/move/${record.family}/${record.transiting}`,
      bodyYou: record.move.body_you,
      bodyThey: record.move.body_they,
      record,
      piece: "move",
      sourceKey: record.bodyContentKey
    }));
    continue;
  }

  if (record.evidenceTier === "shared-moon") {
    rows.push(makeRow({
      contentKey: `fallback-hook/pair-daily/v2/shared-moon/${record.element}/headline`,
      bodyYou: record.headline,
      bodyThey: record.headline,
      record,
      piece: "headline"
    }));
    rows.push(makeRow({
      contentKey: `fallback-hook/pair-daily/v2/shared-moon/${record.element}/body`,
      bodyYou: record.body,
      bodyThey: record.body,
      record,
      piece: "body"
    }));
    continue;
  }

  throw new Error(`Unsupported V2 review record: ${record.id}`);
}

const approved = rows.filter((row) => row.review_status === "approved");
const held = rows.filter((row) => row.review_status === "needs_review");
if (rows.length !== 64) throw new Error(`Expected 64 V2 rows, got ${rows.length}`);
if (approved.length !== 12) throw new Error(`Expected 12 owner-approved V2 rows, got ${approved.length}`);
if (held.length !== 52) throw new Error(`Expected 52 held V2 rows, got ${held.length}`);
if (new Set(rows.map((row) => row.contentKey)).size !== rows.length) throw new Error("Duplicate V2 source key");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({
  schema: "tldrastro-between-you-two-v2-source-rows/v1",
  description: "Between You Two V2 relationship-first headline/move and shared-Moon rows. Reader eligibility remains governed by review_status and structured owner approval.",
  rowCount: rows.length,
  approvedCount: approved.length,
  needsReviewCount: held.length,
  rows
}, null, 2) + "\n");
console.log(`Wrote ${outputPath}: ${rows.length} rows (${approved.length} approved, ${held.length} held).`);
