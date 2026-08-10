#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = "packages/astro-knowledge/review/lived-experience-108-v1";
const payloadsPath = path.join(repoRoot, reviewRoot, "lived-experience-108-payloads.json");
const workbookPath = `${reviewRoot}/TLDR-LL-FULL-108-LIVED-EXPERIENCE-OWNER-APPROVED.xlsx`;
const rowsPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json",
);
const recordsRoot = `${reviewRoot}/records`;
const approvedAt = "2026-08-10";
const livedPrefixes = [
  "fallback-hook/natal-aspect-lived/",
  "fallback-hook/placement-house-lived/",
  "fallback-hook/placement-sign-lived/",
  "fallback-hook/planet-lived/",
];
const signs = new Set([
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]);
const exactAspects = new Set(["conjunction", "inconjunct", "opposition", "sextile", "square"]);

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function payloadSha256(payload) {
  return sha256(JSON.stringify(payload));
}

function normalizeObject(value) {
  const normalized = String(value).trim().toLowerCase().replaceAll("_", "-");
  if (normalized === "part-of-fortune" || normalized === "north-node" || normalized === "south-node") {
    return normalized;
  }
  if (!/^[a-z]+(?:-[a-z]+)*$/u.test(normalized)) {
    throw new Error(`Unsupported object token: ${value}`);
  }
  return normalized;
}

function normalizeAspect(value) {
  if (!exactAspects.has(value)) throw new Error(`Unsupported aspect token: ${value}`);
  return value === "inconjunct" ? "quincunx" : value;
}

function mapWorkbookKey(workbookKey) {
  const parts = workbookKey.split("|");
  if (parts.length === 3) {
    const [objectA, aspect, objectB] = parts;
    return {
      family: "natal-aspect-lived",
      contentKey: `fallback-hook/natal-aspect-lived/${normalizeObject(objectA)}/${normalizeAspect(aspect)}/${normalizeObject(objectB)}`,
    };
  }

  if (parts.length === 2) {
    const [object, placement] = parts;
    const normalizedObject = normalizeObject(object);
    const houseMatch = placement.match(/^([1-9]|1[0-2])(?:st|nd|rd|th) house$/u);
    if (houseMatch) {
      return {
        family: "placement-house-lived",
        contentKey: `fallback-hook/placement-house-lived/${normalizedObject}/${Number(houseMatch[1])}`,
      };
    }
    if (signs.has(placement)) {
      return {
        family: "placement-sign-lived",
        contentKey: `fallback-hook/placement-sign-lived/${normalizedObject}/${placement}`,
      };
    }
    throw new Error(`Ambiguous two-part workbook key: ${workbookKey}`);
  }

  if (parts.length === 1 && parts[0] === "jupiter") {
    return {
      family: "planet-lived",
      contentKey: "fallback-hook/planet-lived/jupiter",
    };
  }

  throw new Error(`Ambiguous workbook key: ${workbookKey}`);
}

function isLivedRow(row) {
  return livedPrefixes.some((prefix) => String(row?.contentKey ?? "").startsWith(prefix));
}

const packet = JSON.parse(fs.readFileSync(payloadsPath, "utf8"));
if (
  packet.name !== "lived-experience-108-v1"
  || packet.approvedAt !== approvedAt
  || packet.approvalRecord !== workbookPath
  || packet.exactWordingApproved !== true
  || Object.keys(packet.payloads ?? {}).length !== 108
) {
  throw new Error("Lived-experience packet metadata does not match the owner-approved 108-row release.");
}

const source = JSON.parse(fs.readFileSync(rowsPath, "utf8"));
const existingApprovedRows = source.hookRows.filter((row) => row.review_status === "approved" && !isLivedRow(row));
const existingApprovedRowsSha256 = sha256(JSON.stringify(existingApprovedRows));
const rowsByKey = new Map(source.hookRows.map((row) => [row.contentKey, row]));
const mappedKeys = new Set();
const manifestRows = [];
const familyCounts = {};

fs.mkdirSync(path.join(repoRoot, recordsRoot), { recursive: true });

for (const [workbookKey, entry] of Object.entries(packet.payloads)) {
  const recomputed = payloadSha256(entry.payload);
  if (recomputed !== entry.sha256) {
    throw new Error(`${workbookKey}: payload hash mismatch (${recomputed} != ${entry.sha256})`);
  }
  if (
    !entry.payload
    || typeof entry.payload.body !== "string"
    || !entry.payload.body.trim()
    || typeof entry.payload.sourceMechanism !== "string"
    || !entry.payload.sourceMechanism.trim()
  ) {
    throw new Error(`${workbookKey}: payload must contain non-empty body and sourceMechanism strings.`);
  }

  const { family, contentKey } = mapWorkbookKey(workbookKey);
  if (mappedKeys.has(contentKey)) throw new Error(`${workbookKey}: duplicate destination ${contentKey}`);
  mappedKeys.add(contentKey);
  familyCounts[family] = (familyCounts[family] ?? 0) + 1;

  const recordName = `${String(entry.row).padStart(3, "0")}-${contentKey.slice("fallback-hook/".length).replaceAll("/", "-")}-exact-approval.json`;
  const recordPath = `${recordsRoot}/${recordName}`;
  const approval = {
    approvalLevel: "exact_owner_approved",
    recordPath,
    payloadSha256: entry.sha256,
    approvedAt,
  };
  const row = {
    contentKey,
    content_role: "fallback_hook",
    grammar_frame: "complete_sentence",
    body: entry.payload.body,
    sourceMechanism: entry.payload.sourceMechanism,
    reader_only: true,
    render_policy: "reader-only-exact-lived-v1",
    review_status: "approved",
    source_keys: [workbookPath],
    approval,
  };

  const current = rowsByKey.get(contentKey);
  if (current) {
    if (JSON.stringify(current) !== JSON.stringify(row)) {
      throw new Error(`${contentKey}: existing destination differs from the approved payload.`);
    }
  } else {
    source.hookRows.push(row);
    rowsByKey.set(contentKey, row);
  }

  const record = {
    schemaVersion: 1,
    id: `lived-experience-108-v1-${String(entry.row).padStart(3, "0")}`,
    approvalLevel: "exact_owner_approved",
    authorship: "owner_authored",
    provenanceNote: "Owner-authored lived-experience copy supplied verbatim. The sourceMechanism field is provenance metadata and is never rendered.",
    contentKey,
    workbookKey,
    payloadSha256: entry.sha256,
    payloadHashAlgorithm: "sha256(JSON.stringify(payload))",
    payload: entry.payload,
    approvedAt,
    approvalEffect: "exact_wording_approval",
    sourceWorkbook: {
      path: workbookPath,
      sheet: "OwnerLivedReview",
      row: entry.row + 1,
      approvedBodyCell: `E${entry.row + 1}`,
      ownerStatusCell: `G${entry.row + 1}`,
    },
    additionalBilledCalls: 0,
  };
  fs.writeFileSync(path.join(repoRoot, recordPath), `${JSON.stringify(record, null, 2)}\n`);
  manifestRows.push({
    workbookRow: entry.row,
    workbookKey,
    contentKey,
    family,
    recordPath,
    payloadSha256: entry.sha256,
  });
}

if (mappedKeys.size !== 108) throw new Error(`Expected 108 unique destinations, found ${mappedKeys.size}.`);
const expectedFamilyCounts = {
  "natal-aspect-lived": 97,
  "placement-house-lived": 8,
  "placement-sign-lived": 2,
  "planet-lived": 1,
};
if (Object.entries(expectedFamilyCounts).some(([family, count]) => familyCounts[family] !== count)) {
  throw new Error(`Unexpected family counts: ${JSON.stringify(familyCounts)}`);
}

fs.writeFileSync(rowsPath, `${JSON.stringify(source, null, 1)}\n`);
fs.writeFileSync(
  path.join(repoRoot, reviewRoot, "shipping-manifest.json"),
  `${JSON.stringify({
    schemaVersion: 1,
    release: "lived-experience-108-v1",
    approvedAt,
    sourceWorkbook: workbookPath,
    payloadsPath: `${reviewRoot}/lived-experience-108-payloads.json`,
    rowCount: manifestRows.length,
    familyCounts,
    invariants: {
      existingApprovedRowsSha256,
      existingApprovedRowsChanged: 0,
      payloadHashAlgorithm: "sha256(JSON.stringify(payload))",
    },
    rows: manifestRows,
  }, null, 2)}\n`,
);

console.log(`Shipped ${manifestRows.length}/108 lived-experience rows.`);
console.log(JSON.stringify(familyCounts));
console.log(`Existing approved rows SHA-256: ${existingApprovedRowsSha256}`);
