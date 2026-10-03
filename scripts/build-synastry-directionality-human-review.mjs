import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSynastryDirectionalityInventory,
  repoRoot
} from "./build-synastry-directionality-inventory.mjs";
import {
  DIRECTIONALITY_ACTION,
  HUMAN_REVIEW_EXPECTED_COUNTS,
  classifySynastryDirectionality
} from "./synastry-directionality-human-review.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
void here;

export const HUMAN_REVIEW_OUTPUT_DIR = path.join(
  repoRoot,
  "packages/astro-knowledge/review/synastry-directionality-inventory-2026-09-07"
);
export const HUMAN_REVIEW_JSON_PATH = path.join(HUMAN_REVIEW_OUTPUT_DIR, "human-review-inventory.json");
export const HUMAN_REVIEW_MD_PATH = path.join(HUMAN_REVIEW_OUTPUT_DIR, "HUMAN-REVIEW-SUMMARY.md");

function countBy(values, selector) {
  const counts = {};
  for (const value of values) {
    const key = selector(value) ?? "null";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function buildSynastryDirectionalityHumanReview() {
  // The structural inventory remains the source of truth for which rows are
  // currently governed and serving. Human semantic decisions layer on top.
  const structural = buildSynastryDirectionalityInventory({ enforceExpectedCounts: true });

  const rows = structural.rows.map((row) => {
    const decision = classifySynastryDirectionality(row.contentKey);
    return {
      ...row,
      ...decision,
      reciprocalCandidate: decision.action === DIRECTIONALITY_ACTION.RECIPROCAL_NO_REVERSE,
      decisionSource: "human_directionality_review_2026-09-08"
    };
  });

  const actionCounts = countBy(rows, (row) => row.action);
  assert.equal(rows.length, HUMAN_REVIEW_EXPECTED_COUNTS.servingRows);
  assert.equal(structural.summary.canonicalPairCount, HUMAN_REVIEW_EXPECTED_COUNTS.canonicalPairs);
  assert.deepEqual(actionCounts, HUMAN_REVIEW_EXPECTED_COUNTS.actions);

  for (const row of rows) {
    assert.notEqual(row.existingSemanticDirection, null, `${row.contentKey}: human review must classify current meaning`);
    if (row.action === DIRECTIONALITY_ACTION.AUTHOR_REVERSE) {
      assert.equal(typeof row.missingSemanticDirection, "string", `${row.contentKey}: reverse-author row needs missing direction`);
      assert.notEqual(row.existingSemanticDirection, row.missingSemanticDirection, `${row.contentKey}: existing and missing direction must differ`);
    } else {
      assert.equal(row.missingSemanticDirection, null, `${row.contentKey}: non-author row must not invent a missing direction`);
    }
  }

  return {
    ...structural,
    schemaVersion: 2,
    recordType: "synastry_directionality_human_review_inventory",
    inventoryId: "synastry-directionality-human-review-2026-09-08",
    generatedFrom: {
      ...structural.generatedFrom,
      humanDecisionModule: "scripts/synastry-directionality-human-review.mjs"
    },
    semanticInferencePolicy: "human_reviewed",
    notes: [
      "All 483 governed synastry rows have now received a human directionality classification.",
      "AUTHOR_REVERSE means the existing serving passage has a directional mechanism and a materially different semantic reverse should be authored.",
      "RECIPROCAL_NO_REVERSE means the existing relationship mechanism is genuinely shared enough that a second directional passage would manufacture a distinction.",
      "NEEDS_DIRECTION_REVIEW is reserved for ten mixed-role rows that should not be forced into either category yet.",
      "This inventory does not authorize renderer, Content Studio, canonical source, or serving-copy changes."
    ],
    summary: {
      ...structural.summary,
      actionCounts,
      humanReviewDecisionCount: rows.length,
      authorReverseCount: actionCounts.AUTHOR_REVERSE ?? 0,
      reciprocalNoReverseCount: actionCounts.RECIPROCAL_NO_REVERSE ?? 0,
      needsDirectionReviewCount: actionCounts.NEEDS_DIRECTION_REVIEW ?? 0
    },
    rows
  };
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderHumanReviewMarkdown(inventory) {
  const unresolved = inventory.rows.filter((row) => row.action === DIRECTIONALITY_ACTION.NEEDS_DIRECTION_REVIEW);
  const lines = [
    "# Synastry Directionality Human Review",
    "",
    "Date: 2026-09-08",
    "Status: **corpus classification complete; serving changes not authorized**",
    "",
    `- Governed synastry rows reviewed: **${inventory.summary.humanReviewDecisionCount}**`,
    `- Need a complementary semantic reverse: **${inventory.summary.authorReverseCount}**`,
    `- Genuinely reciprocal / no reverse: **${inventory.summary.reciprocalNoReverseCount}**`,
    `- Still need special editorial direction review: **${inventory.summary.needsDirectionReviewCount}**`,
    "",
    "## Remaining special-review rows",
    "",
    "| Content key | Current classification |",
    "| --- | --- |"
  ];

  for (const row of unresolved) {
    lines.push(`| ${markdownCell(row.contentKey)} | ${markdownCell(row.existingSemanticDirection)} |`);
  }

  lines.push(
    "",
    "## Authoring consequence",
    "",
    "The reverse-writing project is now bounded at 397 rows, not 478 or 483. The 76 reciprocal rows do not receive manufactured reverse copy. The 10 mixed-role rows stay outside mass authoring until they receive a more specific editorial decision.",
    "",
    "Existing serving prose remains locked. The next authoring stage should add review candidates for the missing semantic direction only, in small Project Author-calibrated batches.",
    ""
  );

  return lines.join("\n");
}

export function writeSynastryDirectionalityHumanReview() {
  const inventory = buildSynastryDirectionalityHumanReview();
  assert(
    path.resolve(HUMAN_REVIEW_OUTPUT_DIR).startsWith(path.resolve(repoRoot, "packages/astro-knowledge/review") + path.sep),
    "Human directionality output must stay under packages/astro-knowledge/review"
  );
  fs.mkdirSync(HUMAN_REVIEW_OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(HUMAN_REVIEW_JSON_PATH, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  fs.writeFileSync(HUMAN_REVIEW_MD_PATH, `${renderHumanReviewMarkdown(inventory)}\n`, "utf8");
  return inventory;
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const inventory = writeSynastryDirectionalityHumanReview();
  console.log(
    `PASS human directionality review: ${inventory.summary.humanReviewDecisionCount} rows; `
    + `${inventory.summary.authorReverseCount} AUTHOR_REVERSE; `
    + `${inventory.summary.reciprocalNoReverseCount} RECIPROCAL_NO_REVERSE; `
    + `${inventory.summary.needsDirectionReviewCount} NEEDS_DIRECTION_REVIEW.`
  );
}
