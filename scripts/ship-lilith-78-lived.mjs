#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = "packages/astro-knowledge/review/lilith-78-lived-v2";
const payloadsRelativePath = `${reviewRoot}/lilith-78-lived-payloads.json`;
const payloadsPath = path.join(repoRoot, payloadsRelativePath);
const workbookPath = `${reviewRoot}/TLDR-LILITH-78-LIVED-EXPERIENCE-V2-OWNER-EDITED.xlsx`;
const rowsPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json",
);
const ownerExamplesPath = path.join(repoRoot, "data/writing/OWNER_APPROVED_EXAMPLES.jsonl");
const recordsRoot = `${reviewRoot}/records`;
const approvedAt = "2026-08-10";
const destinationPrefix = "fallback-hook/natal-aspect-lived/lilith/";
const aspects = new Set(["conjunction", "opposition", "square", "trine", "sextile", "quincunx"]);
const counterparts = new Set([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "north-node",
  "south-node",
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function payloadSha256(payload) {
  return sha256(JSON.stringify(payload));
}

function normalizeCounterpart(value) {
  const normalized = String(value).trim().toLowerCase().replaceAll("_", "-");
  if (!counterparts.has(normalized)) {
    throw new Error(`Unsupported or ambiguous Lilith counterpart: ${value}`);
  }
  return normalized;
}

function mapWorkbookKey(workbookKey) {
  const parts = workbookKey.split("|");
  if (parts.length !== 3 || parts[0] !== "lilith") {
    throw new Error(`Ambiguous Lilith workbook key: ${workbookKey}`);
  }
  const aspect = String(parts[1]).trim().toLowerCase();
  if (!aspects.has(aspect)) {
    throw new Error(`Unsupported or ambiguous Lilith aspect: ${parts[1]}`);
  }
  return `${destinationPrefix}${aspect}/${normalizeCounterpart(parts[2])}`;
}

const packet = JSON.parse(fs.readFileSync(payloadsPath, "utf8"));
if (
  packet.name !== "lilith-78-lived-v2"
  || packet.approvedAt !== approvedAt
  || packet.approvalRecord !== workbookPath
  || packet.exactWordingApproved !== true
  || Object.keys(packet.payloads ?? {}).length !== 78
) {
  throw new Error("Lilith packet metadata does not match the owner-approved 78-row release.");
}

const source = JSON.parse(fs.readFileSync(rowsPath, "utf8"));
const ownerExamples = fs.readFileSync(ownerExamplesPath, "utf8").trim().split(/\n/u).map((line) => JSON.parse(line));
const ownerExamplesById = new Map(ownerExamples.map((entry) => [entry.id, entry]));
const existingApprovedRows = source.hookRows.filter((row) => (
  row.review_status === "approved"
  && !String(row.contentKey ?? "").startsWith(destinationPrefix)
));
const existingApprovedRowsSha256 = sha256(JSON.stringify(existingApprovedRows));
const rowsByKey = new Map(source.hookRows.map((row) => [row.contentKey, row]));
const mappedKeys = new Set();
const aspectCounts = {};
const counterpartCounts = {};
const manifestRows = [];

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
    || typeof entry.payload.astroHint !== "string"
    || !entry.payload.astroHint.trim()
    || typeof entry.payload.sourceMechanism !== "string"
    || !entry.payload.sourceMechanism.trim()
  ) {
    throw new Error(`${workbookKey}: payload must contain non-empty body, astroHint, and sourceMechanism strings.`);
  }

  const contentKey = mapWorkbookKey(workbookKey);
  if (mappedKeys.has(contentKey)) throw new Error(`${workbookKey}: duplicate destination ${contentKey}`);
  mappedKeys.add(contentKey);

  const [, aspect, counterpart] = workbookKey.split("|");
  const normalizedCounterpart = normalizeCounterpart(counterpart);
  aspectCounts[aspect] = (aspectCounts[aspect] ?? 0) + 1;
  counterpartCounts[normalizedCounterpart] = (counterpartCounts[normalizedCounterpart] ?? 0) + 1;

  const recordName = `${String(entry.row).padStart(3, "0")}-natal-aspect-lived-lilith-${aspect}-${normalizedCounterpart}-exact-approval.json`;
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
    astroHint: entry.payload.astroHint,
    sourceMechanism: entry.payload.sourceMechanism,
    reader_only: true,
    render_policy: "reader-only-exact-lived-v1",
    review_status: "approved",
    source_keys: [workbookPath],
    approval,
  };
  const ownerExample = {
    id: `serving:${contentKey}`,
    contentKey,
    family: "natal",
    register: "second_person",
    text: entry.payload.body,
    ownerApproved: true,
    authority: "serving-review-status-approved",
    source: "fallbackArchitectureV3",
  };
  const currentOwnerExample = ownerExamplesById.get(ownerExample.id);
  if (currentOwnerExample) {
    const comparableOwnerExample = { ...currentOwnerExample, text: ownerExample.text };
    if (JSON.stringify(comparableOwnerExample) !== JSON.stringify(ownerExample)) {
      throw new Error(`${contentKey}: owner-approved writing index entry differs beyond the approved body.`);
    }
  }
  ownerExamplesById.set(ownerExample.id, ownerExample);

  const current = rowsByKey.get(contentKey);
  if (current) {
    const comparableCurrent = structuredClone(current);
    comparableCurrent.body = row.body;
    if (comparableCurrent.approval) {
      comparableCurrent.approval.payloadSha256 = row.approval.payloadSha256;
    }
    if (JSON.stringify(comparableCurrent) !== JSON.stringify(row)) {
      throw new Error(`${contentKey}: existing destination differs beyond owner-approved body/hash fields.`);
    }
    source.hookRows[source.hookRows.indexOf(current)] = row;
    rowsByKey.set(contentKey, row);
  } else {
    source.hookRows.push(row);
    rowsByKey.set(contentKey, row);
  }

  const record = {
    schemaVersion: 1,
    id: `lilith-78-lived-v2-${String(entry.row).padStart(3, "0")}`,
    approvalLevel: "exact_owner_approved",
    authorship: "owner_authored",
    provenanceNote: "Owner-authored Lilith lived-experience copy and astrology hint supplied verbatim. The sourceMechanism field is provenance metadata and is never rendered.",
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
      approvedAstroHintCell: `F${entry.row + 1}`,
      ownerStatusCell: `H${entry.row + 1}`,
    },
    additionalBilledCalls: 0,
  };
  fs.writeFileSync(path.join(repoRoot, recordPath), `${JSON.stringify(record, null, 2)}\n`);
  manifestRows.push({
    workbookRow: entry.row,
    workbookKey,
    contentKey,
    recordPath,
    payloadSha256: entry.sha256,
  });
}

if (mappedKeys.size !== 78) throw new Error(`Expected 78 unique destinations, found ${mappedKeys.size}.`);
for (const aspect of aspects) {
  if (aspectCounts[aspect] !== 13) throw new Error(`Expected 13 ${aspect} rows, found ${aspectCounts[aspect] ?? 0}.`);
}
for (const counterpart of counterparts) {
  if (counterpartCounts[counterpart] !== 6) {
    throw new Error(`Expected 6 ${counterpart} rows, found ${counterpartCounts[counterpart] ?? 0}.`);
  }
}

fs.writeFileSync(rowsPath, `${JSON.stringify(source, null, 1)}\n`);
fs.writeFileSync(
  ownerExamplesPath,
  `${[...ownerExamplesById.values()]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((entry) => JSON.stringify(entry))
    .join("\n")}\n`,
);
fs.writeFileSync(
  path.join(repoRoot, reviewRoot, "shipping-manifest.json"),
  `${JSON.stringify({
    schemaVersion: 1,
    release: "lilith-78-lived-v2",
    approvedAt,
    sourceWorkbook: workbookPath,
    payloadsPath: payloadsRelativePath,
    rowCount: manifestRows.length,
    aspectCounts,
    counterpartCounts,
    invariants: {
      existingApprovedRowsSha256,
      existingApprovedRowsChanged: 0,
      payloadHashAlgorithm: "sha256(JSON.stringify(payload))",
    },
    rows: manifestRows,
  }, null, 2)}\n`,
);

console.log(`Shipped ${manifestRows.length}/78 Lilith lived-experience rows.`);
console.log(JSON.stringify({ aspectCounts, counterpartCounts }));
console.log(`Existing approved rows SHA-256: ${existingApprovedRowsSha256}`);
