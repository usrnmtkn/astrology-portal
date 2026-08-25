#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyContentPromotionPlan,
  ApprovalValidationError,
  buildApprovalApplication,
  buildContentPromotionPlan,
  sha256,
  spanSha256,
  writeJsonAtomically
} from "./lib/content-approval-governance.mjs";

const span = "This exact source passage is awaiting an omission decision.";
const queue = {
  schema: "approval-queue/v1",
  items: [
    {
      id: "span-1",
      type: "span",
      title: "Intention block",
      contentKey: "book/example/1",
      span,
      sha256: spanSha256(span),
      options: ["keep", "edit", "rewrite"]
    },
    {
      id: "domain-1",
      type: "domain",
      title: "Domain grant",
      options: ["approve", "reject"]
    }
  ]
};
const partial = {
  schema: "approval-set/v1",
  decidedAt: "2026-08-24T12:00:00.000Z",
  total: 2,
  decided: 1,
  complete: false,
  decisions: [{
    id: "span-1",
    type: "span",
    choice: "edit",
    contentKey: "book/example/1",
    sourceSha256: spanSha256(span),
    omitText: span,
    approvedAt: "2026-08-24T12:00:00.000Z"
  }]
};

const application = buildApprovalApplication(queue, partial);
assert.equal(application.decisions.length, 1);
assert.equal(application.unresolved.length, 1);
assert.equal(application.unresolved[0].id, "domain-1");
assert.equal(application.complete, false);

assert.throws(
  () => buildApprovalApplication(queue, {
    ...partial,
    decisions: [{ ...partial.decisions[0], sourceSha256: "0000000000000000" }]
  }),
  (error) => error instanceof ApprovalValidationError && error.message.includes("sourceSha256 is stale")
);
assert.throws(
  () => buildApprovalApplication(queue, {
    ...partial,
    decisions: [{ ...partial.decisions[0], omitText: "a re-derived boundary" }]
  }),
  (error) => error instanceof ApprovalValidationError && error.message.includes("exact omitText")
);

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "tldr-approval-"));
const output = path.join(temporary, "application.json");
writeJsonAtomically(output, application);
assert.deepEqual(JSON.parse(fs.readFileSync(output, "utf8")), application);

const sentinel = fs.readFileSync(output, "utf8");
assert.throws(
  () => buildApprovalApplication(queue, { ...partial, total: 99 }),
  ApprovalValidationError
);
assert.equal(fs.readFileSync(output, "utf8"), sentinel, "invalid preflight must not change the application file");

const queuePath = path.join(temporary, "queue.json");
const deskPath = path.join(temporary, "approval-desk.html");
fs.writeFileSync(queuePath, `${JSON.stringify({
  ...queue,
  items: queue.items.map((item, index) => index === 0 ? { ...item, title: "Safe </script> title" } : item)
}, null, 2)}\n`);
execFileSync(process.execPath, [
  path.resolve("scripts/build-content-approval-desk.mjs"),
  `--queue=${queuePath}`,
  `--out=${deskPath}`
]);
const desk = fs.readFileSync(deskPath, "utf8");
assert.match(desk, /TLDR Astro approval desk/u);
assert.match(desk, /Export approvals\.json/u);
assert.doesNotMatch(desk, /Safe <\/script> title/u, "embedded queue data must not be able to close the script tag");

const promotionRepo = path.join(temporary, "promotion-repo");
const promotionSourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/example.json";
const promotionAbsolute = path.join(promotionRepo, promotionSourcePath);
fs.mkdirSync(path.dirname(promotionAbsolute), { recursive: true });
const oldText = "Old copy stays exact until an owner supplies the replacement.";
const newText = "The owner supplied this complete replacement.";
const untouched = {
  contentKey: "fallback-hook/daily-body/soft/mars",
  body_you: "This approved neighbor must not change.",
  review_status: "approved"
};
fs.writeFileSync(promotionAbsolute, `${JSON.stringify({ rows: [{
  contentKey: "fallback-hook/daily-body/square/sun",
  body_you: oldText,
  review_status: "needs_review"
}, untouched] }, null, 2)}\n`);

const promotionQueue = {
  schema: "approval-queue/v1",
  items: [{
    id: "promote-1",
    type: "choice",
    title: "Promote exact replacement",
    contentKey: "fallback-hook/daily-body/square/sun",
    options: ["rewrite", "reject"],
    promotion: {
      sourcePath: promotionSourcePath,
      objectPath: "/rows/0",
      contentKey: "fallback-hook/daily-body/square/sun",
      textField: "body_you",
      sourceTextSha256: sha256(oldText),
      reviewStatus: "approved",
      approvalRecordPath: "review/owner-ruling.md"
    }
  }]
};
const promotionSet = {
  schema: "approval-set/v1",
  decidedAt: "2026-08-25T12:00:00.000Z",
  total: 1,
  decided: 1,
  complete: true,
  decisions: [{
    id: "promote-1",
    type: "choice",
    choice: "rewrite",
    text: newText,
    approvedAt: "2026-08-25T12:00:00.000Z"
  }]
};
const promotionApplication = buildApprovalApplication(promotionQueue, promotionSet);
const plan = buildContentPromotionPlan({ repoRoot: promotionRepo, application: promotionApplication, baseCommitSha: "fixture-base" });
assert.equal(plan.changes.length, 1);
assert.equal(JSON.parse(fs.readFileSync(promotionAbsolute, "utf8")).rows[0].body_you, oldText, "dry-run must not modify source");
assert.throws(
  () => applyContentPromotionPlan({ repoRoot: promotionRepo, plan, expectedPlanSha256: "wrong" }),
  /PROMOTION_PLAN_HASH_MISMATCH/u
);
const receipt = applyContentPromotionPlan({ repoRoot: promotionRepo, plan, expectedPlanSha256: plan.planSha256 });
const promoted = JSON.parse(fs.readFileSync(promotionAbsolute, "utf8"));
assert.equal(promoted.rows[0].body_you, newText);
assert.equal(promoted.rows[0].review_status, "approved");
assert.equal(promoted.rows[0].approval.approvalLevel, "exact_owner_approved");
assert.deepEqual(promoted.rows[1], untouched, "unrelated approved rows must remain byte-equivalent as JSON values");
assert.deepEqual(receipt.unrelatedApprovedRowsChanged, []);
assert.throws(
  () => buildContentPromotionPlan({ repoRoot: promotionRepo, application: promotionApplication }),
  /PROMOTION_SOURCE_TEXT_STALE/u
);

console.log("Content approval governance tests passed.");
