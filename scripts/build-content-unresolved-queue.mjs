#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  isGovernedReaderEligible,
  readerEligibilityReason
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows");
const defaultOutput = path.join(repoRoot, "packages/astro-knowledge/generated/content-unresolved-queue-v1.json");
const outputPath = path.resolve(process.argv.find((value) => value.startsWith("--out="))?.slice(6) ?? defaultOutput);
const checkOnly = process.argv.includes("--check");
const retirementRegistry = JSON.parse(fs.readFileSync(path.join(repoRoot, "config/content-unresolved-retirements-v1.json"), "utf8"));
const retirementFamilies = Array.isArray(retirementRegistry.families) ? retirementRegistry.families : [];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableId(sourcePath, pointer) {
  return `unresolved-${sha256(`${sourcePath}|${pointer}`).slice(0, 16)}`;
}

const pendingReviewStatuses = new Set(["needs_review", "review_needed", "needs-review"]);
function belongsInUnresolvedQueue(value, reason) {
  if (!reason) return false;
  if (reason !== "review-status") return true;
  return pendingReviewStatuses.has(String(value.review_status ?? "").trim().toLowerCase());
}

function retirementFor(contentKey) {
  return retirementFamilies.find((family) => (
    typeof family.contentKeyPrefix === "string" && contentKey.startsWith(family.contentKeyPrefix)
  )) ?? null;
}

const candidates = [];
const recordsByContentKey = new Map();

function registerRecord(value, sourcePath, pointer) {
  if (typeof value.contentKey !== "string" || !value.contentKey || value.review_status == null) return;
  const contentKey = value.contentKey;
  const records = recordsByContentKey.get(contentKey) ?? [];
  records.push({
    sourcePath,
    objectPath: pointer || "/",
    reviewStatus: value.review_status,
    readerEligible: isGovernedReaderEligible(value),
    sourceSha256: sha256(JSON.stringify(value))
  });
  recordsByContentKey.set(contentKey, records);

  const reason = readerEligibilityReason(value);
  if (!belongsInUnresolvedQueue(value, reason)) return;
  candidates.push({
    id: stableId(sourcePath, pointer),
    contentKey,
    contentRole: value.content_role ?? null,
    reviewStatus: value.review_status,
    reason,
    sourcePath,
    objectPath: pointer || "/",
    sourceSha256: sha256(JSON.stringify(value))
  });
}

function visit(value, sourcePath, pointer = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, sourcePath, `${pointer}/${index}`));
    return;
  }
  if (!value || typeof value !== "object") return;

  registerRecord(value, sourcePath, pointer);
  for (const [key, child] of Object.entries(value)) visit(child, sourcePath, `${pointer}/${key}`);
}

for (const fileName of fs.readdirSync(sourceRoot).filter((name) => name.endsWith(".json")).sort()) {
  const absolute = path.join(sourceRoot, fileName);
  const relative = path.relative(repoRoot, absolute);
  visit(JSON.parse(fs.readFileSync(absolute, "utf8")), relative);
}

const dailyVariantsPath = path.join(sourceRoot, "daily-glance-variants-v1.json");
const dailyVariants = JSON.parse(fs.readFileSync(dailyVariantsPath, "utf8"));
for (const [contentKey, set] of Object.entries(dailyVariants.keys ?? {})) {
  for (const [kind, collection] of [["headline", set.headlines], ["body", set.bodies], ["pairing", set.pairings]]) {
    for (const item of collection ?? []) {
      const syntheticKey = `daily-glance-variant/${contentKey}/${kind}/${item.id}`;
      const reason = readerEligibilityReason({ ...item, contentKey: syntheticKey });
      if (!belongsInUnresolvedQueue(item, reason)) continue;
      const sourcePath = path.relative(repoRoot, dailyVariantsPath);
      const pointer = `/keys/${contentKey}/${kind}/${item.id}`;
      candidates.push({
        id: stableId(sourcePath, pointer),
        contentKey: syntheticKey,
        contentRole: kind,
        reviewStatus: item.review_status,
        reason,
        sourcePath,
        objectPath: pointer,
        sourceSha256: sha256(JSON.stringify(item))
      });
    }
  }
}

const uniqueCandidates = [...new Map(candidates.map((item) => [`${item.sourcePath}|${item.objectPath}|${item.contentKey}`, item])).values()]
  .sort((a, b) => a.reason.localeCompare(b.reason) || a.contentKey.localeCompare(b.contentKey) || a.sourcePath.localeCompare(b.sourcePath));

function eligiblePeersFor(item) {
  return (recordsByContentKey.get(item.contentKey) ?? []).filter((record) => (
    record.readerEligible
    && (record.sourcePath !== item.sourcePath || record.objectPath !== item.objectPath)
  ));
}

const retiredItems = [];
const shadowedItems = [];
const actionableItems = [];
for (const item of uniqueCandidates) {
  const retirement = retirementFor(item.contentKey);
  if (retirement) {
    retiredItems.push({
      ...item,
      retirement: {
        id: retirement.id,
        reason: retirement.reason,
        evidence: retirement.evidence,
        replacement: retirement.replacement
      }
    });
    continue;
  }

  const eligiblePeers = eligiblePeersFor(item);
  if (!eligiblePeers.length) {
    actionableItems.push(item);
    continue;
  }
  shadowedItems.push({
    ...item,
    shadowReason: "reader-eligible-peer-exists",
    readerEligiblePeers: eligiblePeers
  });
}

function reasonCounts(items) {
  return Object.fromEntries([...new Set(items.map((item) => item.reason))].sort()
    .map((reason) => [reason, items.filter((item) => item.reason === reason).length]));
}

function retirementReasonCounts(items) {
  return Object.fromEntries([...new Set(items.map((item) => item.retirement.reason))].sort()
    .map((reason) => [reason, items.filter((item) => item.retirement.reason === reason).length]));
}

const actionableContentKeys = [...new Set(actionableItems.map((item) => item.contentKey))].sort();
const report = {
  schema: "tldrastro-content-unresolved-queue/v1",
  generatedFrom: path.relative(repoRoot, sourceRoot),
  count: actionableItems.length,
  issueCount: actionableContentKeys.length,
  actionableContentKeys,
  reasonCounts: reasonCounts(actionableItems),
  items: actionableItems,
  shadowedCount: shadowedItems.length,
  shadowedReasonCounts: reasonCounts(shadowedItems),
  shadowedItems,
  retiredCount: retiredItems.length,
  retiredReasonCounts: retirementReasonCounts(retiredItems),
  retiredItems,
  semantics: {
    count: "Actionable unresolved source records.",
    issueCount: "Unique actionable content keys, which is the closer measure of owner/editorial decisions remaining.",
    items: "Actionable unresolved records with no governed retirement and no reader-eligible peer using the same contentKey.",
    shadowedItems: "Pending source records retained as audit evidence but excluded from owner/editorial backlog because an exact-key reader-eligible peer already exists.",
    retiredItems: "Pending source records retained as audit evidence but excluded from owner/editorial backlog because a governed retirement or supersession decision already exists."
  }
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (existing !== serialized) {
    console.error("Content unresolved queue is stale. Run npm run build:content-unresolved-queue.");
    process.exit(1);
  }
  console.log(`Content unresolved queue is current (${actionableItems.length} actionable records / ${actionableContentKeys.length} decisions, ${shadowedItems.length} shadowed, ${retiredItems.length} retired).`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${actionableItems.length} actionable records / ${actionableContentKeys.length} decisions, ${shadowedItems.length} shadowed, ${retiredItems.length} retired).`);
}
