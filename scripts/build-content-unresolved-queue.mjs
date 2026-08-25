#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { readerEligibilityReason } from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows");
const defaultOutput = path.join(repoRoot, "packages/astro-knowledge/generated/content-unresolved-queue-v1.json");
const outputPath = path.resolve(process.argv.find((value) => value.startsWith("--out="))?.slice(6) ?? defaultOutput);
const checkOnly = process.argv.includes("--check");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableId(sourcePath, pointer) {
  return `unresolved-${sha256(`${sourcePath}|${pointer}`).slice(0, 16)}`;
}

const items = [];
const pendingReviewStatuses = new Set(["needs_review", "review_needed", "needs-review"]);
function belongsInUnresolvedQueue(value, reason) {
  if (!reason) return false;
  if (reason !== "review-status") return true;
  return pendingReviewStatuses.has(String(value.review_status ?? "").trim().toLowerCase());
}

function visit(value, sourcePath, pointer = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, sourcePath, `${pointer}/${index}`));
    return;
  }
  if (!value || typeof value !== "object") return;

  if (typeof value.contentKey === "string" && value.contentKey && value.review_status != null) {
    const reason = readerEligibilityReason(value);
    if (belongsInUnresolvedQueue(value, reason)) {
      items.push({
        id: stableId(sourcePath, pointer),
        contentKey: value.contentKey,
        contentRole: value.content_role ?? null,
        reviewStatus: value.review_status,
        reason,
        sourcePath,
        objectPath: pointer || "/",
        sourceSha256: sha256(JSON.stringify(value))
      });
    }
  }
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
      items.push({
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

const unique = [...new Map(items.map((item) => [`${item.sourcePath}|${item.objectPath}|${item.contentKey}`, item])).values()]
  .sort((a, b) => a.reason.localeCompare(b.reason) || a.contentKey.localeCompare(b.contentKey) || a.sourcePath.localeCompare(b.sourcePath));
const report = {
  schema: "tldrastro-content-unresolved-queue/v1",
  generatedFrom: path.relative(repoRoot, sourceRoot),
  count: unique.length,
  reasonCounts: Object.fromEntries([...new Set(unique.map((item) => item.reason))].sort().map((reason) => [reason, unique.filter((item) => item.reason === reason).length])),
  items: unique
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (existing !== serialized) {
    console.error("Content unresolved queue is stale. Run npm run build:content-unresolved-queue.");
    process.exit(1);
  }
  console.log(`Content unresolved queue is current (${unique.length} items).`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${unique.length} unresolved items).`);
}
