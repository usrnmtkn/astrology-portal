import assert from "node:assert/strict";
import fs from "node:fs";

import { hasTarotReferenceInReaderCopy } from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerContentBoundary.mjs";

const readJson = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));

const bundle = readJson("../apps/web/src/content/fallbackArchitectureV3/bundled-lunation-eclipse-house-layers-v3.json");
const queue = readJson("../packages/astro-knowledge/review/solar-eclipse-tarot-migration-queue-2026-09-06.json");

assert.equal(queue.schema, "astrology-tarot-legacy-migration-queue/v1");
assert.equal(queue.surface, "lunation-eclipse-house-layer");
assert.equal(queue.contentType, "astrology");
assert.equal(queue.count, 12);
assert.equal(queue.items.length, 12);
assert.deepEqual(queue.items.map((item) => item.house), Array.from({ length: 12 }, (_, index) => index + 1));
assert.equal(queue.governance.reviewOnly, true);
assert.equal(queue.governance.replacementCopyApproved, false);
assert.equal(queue.governance.servingChangeAuthorized, false);
assert.equal(queue.governance.historicalSourceMustBePreserved, true);

const cardsByKey = new Map(bundle.authoredCards.map((card) => [card.contentKey, card]));
assert.equal(bundle.authoredCards.length, 12);

for (const item of queue.items) {
  const card = cardsByKey.get(item.contentKey);
  assert.ok(card, `Missing solar eclipse house-layer source ${item.contentKey}`);
  assert.equal(card.house, item.house, `${item.contentKey}: house drift`);
  assert.equal(card.review_status, "approved_reuse", `${item.contentKey}: review-status drift`);
  assert.equal(card.owner_authored, true, `${item.contentKey}: owner-authored drift`);
  assert.equal(card.approval?.approvalLevel, "exact_owner_approved", `${item.contentKey}: approval drift`);
  assert.equal(card.promotion_authorized, true, `${item.contentKey}: serving authorization drift`);
  assert.equal(card.protected_content?.body_sha256, item.protectedBodySha256, `${item.contentKey}: protected body drift`);
  assert.equal(item.finding, "tarot-reference-in-astrology-copy");
  assert.equal(item.replacementStatus, "needs-owner-review");
  assert.equal(hasTarotReferenceInReaderCopy(card), true, `${item.contentKey}: queued row no longer contains Tarot interpretation`);
  assert.equal(Object.hasOwn(item, "replacementBody"), false, `${item.contentKey}: review queue must not contain unapproved replacement prose`);
}

assert.equal(
  new Set(queue.items.map((item) => item.contentKey)).size,
  12,
  "Solar eclipse Tarot migration queue must contain 12 unique content keys."
);

console.log("solar eclipse Tarot migration queue: ok (12 protected astrology rows, review-only, no replacement approval)");
