#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const outputPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/sky-placement-copy-preservation-2026-08-22/conflicts.json"
);
const checkOnly = process.argv.includes("--check");
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const words = (value) => String(value ?? "").trim().split(/\s+/u).filter(Boolean).length;
const sha256 = (value) => crypto.createHash("sha256").update(String(value ?? ""), "utf8").digest("hex");
const eligibleStatuses = new Set(["approved", "approved_reuse", "reviewed"]);

const materializedPath = path.join(packageRoot, "source-rows/sky-placement-house-templates-v1.json");
const transitPath = path.join(packageRoot, "source-rows/transit-synastry-rows-v1.json");
const materialized = readJson(materializedPath).rows ?? [];
const transitRows = readJson(transitPath).authoredCards ?? [];

const conflicts = [];
for (const servingRow of materialized) {
  if (servingRow.template_selection?.selected_from !== "owner-approved-matrix-ingress") continue;
  const [, planet, sign, housePart] = servingRow.contentKey.split("/");
  const house = Number(housePart.replace("house-", ""));
  const candidateKey = `authored/transit-house-sign/${planet}/${house}/${sign}`;
  const candidate = transitRows.find((row) => {
    const body = String(row.body_you ?? row.body ?? "").trim();
    return row.contentKey === candidateKey
      && eligibleStatuses.has(String(row.review_status ?? "").trim().toLowerCase())
      && body;
  });
  if (!candidate) continue;

  const servingBody = String(servingRow.body_you).trim();
  const candidateBody = String(candidate.body_you ?? candidate.body).trim();
  conflicts.push({
    contentKey: servingRow.contentKey,
    planet,
    sign,
    house,
    current: {
      selectedFrom: servingRow.template_selection.selected_from,
      sourceKeys: servingRow.source_keys,
      wordCount: words(servingBody),
      bodySha256: sha256(servingBody),
      bodyYou: servingBody
    },
    exactApprovedCandidate: {
      contentKey: candidate.contentKey,
      reviewStatus: candidate.review_status,
      approvedVia: candidate.approved_via ?? candidate.approval?.evidence ?? null,
      approvalLevel: candidate.approval?.approvalLevel ?? null,
      sourceKeys: candidate.source_keys ?? [],
      wordCount: words(candidateBody),
      bodySha256: sha256(candidateBody),
      bodyYou: candidateBody
    },
    decision: "needs-owner-serving-approval"
  });
}

conflicts.sort((left, right) => left.contentKey.localeCompare(right.contentKey));
const byApproval = Object.fromEntries(Object.entries(conflicts.reduce((counts, row) => {
  const approval = row.exactApprovedCandidate.approvedVia ?? "unrecorded";
  counts[approval] = (counts[approval] ?? 0) + 1;
  return counts;
}, {})).sort((left, right) => left[0].localeCompare(right[0])));

const artifact = {
  schema: "tldrastro-sky-placement-copy-selection-conflicts-v1",
  generatedOn: "2026-08-22",
  purpose: "Exact review inventory for approved planet/sign/house passages currently displaced by compact matrix rows. This report does not authorize serving changes.",
  currentServingRows: materialized.length,
  conflictCount: conflicts.length,
  byApproval,
  conflicts
};
const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (existing !== serialized) {
    console.error("Sky-placement copy-preservation conflict inventory is stale. Run npm run audit:owner-copy-selection-conflicts.");
    process.exit(1);
  }
  console.log(`Sky-placement copy-preservation conflict inventory is current (${conflicts.length} conflicts).`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);
  console.log(JSON.stringify({ conflictCount: conflicts.length, byApproval }, null, 2));
}
