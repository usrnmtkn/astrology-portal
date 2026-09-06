#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyBoundedOwnerBatchAuthorization,
  assertBatchGenerationAuthorized,
  assertServingAuthorized,
  generatedApprovalState,
  markPipelineReady,
} from "../src/astro-writing/approvalGovernance.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const batchId = "sky-calendar-exact-approved-2026-09-06-final-83";
const reviewRelative = `packages/astro-knowledge/review/${batchId}`;
const reviewRoot = path.join(repoRoot, reviewRelative);
const previousPayloadRelative =
  "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-05-north-node-48/current-owner-payloads.json";
const evidenceRelative = `${reviewRelative}/owner-batch-authorization.json`;
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const protectedKeys = new Set([
  "sky.aspect.sun.opposition.moon",
  "sky.aspect.saturn.opposition.pluto",
]);
const allowedAspects = new Set(["conjunction", "sextile", "square", "opposition"]);

const aspectMetadata = {
  conjunction: {
    business: "The two concerns arrive in the same decision; work with the point they now share.",
    shadow: "Because both concerns are active at once, acting on one can obscure what the other still needs.",
    arcApplying: "The two concerns become harder to separate as exactness approaches.",
    arcSeparating: "The fused emphasis begins to loosen after exactness.",
  },
  sextile: {
    business: "A workable option is available; use the move that connects the two concerns.",
    shadow: "The opportunity can remain unused if nobody makes the concrete move it requires.",
    arcApplying: "The workable option becomes easier to recognize as exactness approaches.",
    arcSeparating: "The opening becomes less immediate after exactness.",
  },
  square: {
    business: "A practical mismatch needs adjustment; change the arrangement instead of repeating the same workaround.",
    shadow: "Pressure escalates when each side keeps demanding terms the other cannot sustain.",
    arcApplying: "The mismatch becomes harder to work around as exactness approaches.",
    arcSeparating: "The pressure eases after exactness, leaving the changed arrangement to prove itself.",
  },
  opposition: {
    business: "Both positions are visible; deal with the tradeoff directly instead of pretending one side can disappear.",
    shadow: "The conflict hardens when each side treats the other as the obstacle instead of part of the decision.",
    arcApplying: "The two positions become more explicit as exactness approaches.",
    arcSeparating: "The standoff begins to loosen after exactness.",
  },
};

const ruling = JSON.parse(fs.readFileSync(path.join(reviewRoot, "owner-ruling.json"), "utf8"));
if (
  ruling.type !== "bounded_contextual_owner_batch_authorization" ||
  ruling.authority !== "owner" ||
  ruling.decision !== "approve"
) {
  throw new Error("Release requires bounded owner approval.");
}
if (ruling.batchId !== batchId) throw new Error("Unexpected batch.");
if (
  ruling.surface !== "sky-calendar-exact-aspect" ||
  ruling.approvedField !== "readerCopy.body"
) {
  throw new Error("Unexpected release surface.");
}
if (
  !ruling.capabilities?.includes("batch_generation") ||
  !ruling.capabilities?.includes("serving")
) {
  throw new Error("Serving authorization missing.");
}
if (ruling.evidenceRecordPath !== evidenceRelative) {
  throw new Error("Evidence path mismatch.");
}

const rows = ruling.payloadFiles
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(reviewRoot, file), "utf8")).rows)
  .sort((a, b) => a.contentKey.localeCompare(b.contentKey));

if (
  rows.length !== 83 ||
  ruling.memberCount !== 83 ||
  new Set(rows.map((row) => row.contentKey)).size !== 83
) {
  throw new Error("Expected exactly 83 unique final Chiron/Lilith rows.");
}

for (const row of rows) {
  const parts = row.contentKey.split(".");
  if (parts.length !== 5 || parts[0] !== "sky" || parts[1] !== "aspect") {
    throw new Error(`${row.contentKey}: invalid exact-aspect key.`);
  }
  const [, , transiting, aspect, other] = parts;
  if (!allowedAspects.has(aspect)) {
    throw new Error(`${row.contentKey}: excluded aspect escaped release scope.`);
  }
  if (
    row.contentKey.includes("north-node") ||
    row.contentKey.includes("south-node") ||
    row.contentKey.includes(".trine.") ||
    row.contentKey.includes(".quincunx.")
  ) {
    throw new Error(`${row.contentKey}: node/trine/minor aspect escaped final-83 scope.`);
  }
  if (transiting !== "chiron" && other !== "chiron" && transiting !== "lilith" && other !== "lilith") {
    throw new Error(`${row.contentKey}: outside Chiron/Lilith release scope.`);
  }
  if (row.contentKey === "sky.aspect.saturn.square.lilith") {
    throw new Error("Already-approved Saturn square Lilith must not be re-released.");
  }
  if (!row.body?.startsWith(row.summary ?? "")) {
    throw new Error(`${row.contentKey}: summary/body mismatch.`);
  }
  if (sha256(row.body) !== row.bodySha256) {
    throw new Error(`${row.contentKey}: body hash mismatch.`);
  }
  if (protectedKeys.has(row.contentKey)) {
    throw new Error(`${row.contentKey}: protected benchmark cannot be released here.`);
  }
}

const canonical = rows.map((row) => `${row.contentKey}:${row.bodySha256}`).join("\n");
if (sha256(canonical) !== ruling.memberSetSha256) {
  throw new Error("Member-set hash mismatch.");
}

const authorization = {
  type: ruling.type,
  authority: ruling.authority,
  decision: ruling.decision,
  batchId: ruling.batchId,
  evidenceRecordPath: ruling.evidenceRecordPath,
  ownerStatement: ruling.ownerStatement,
  decisionContext: ruling.decisionContext,
  surface: ruling.surface,
  approvedField: ruling.approvedField,
  capabilities: ruling.capabilities,
  approvedAt: ruling.approvedAt,
  memberCount: rows.length,
  memberSetSha256: ruling.memberSetSha256,
  members: rows.map((row) => ({
    contentKey: row.contentKey,
    payloadSha256: row.bodySha256,
  })),
};
fs.writeFileSync(
  path.join(reviewRoot, "owner-batch-authorization.json"),
  `${JSON.stringify(authorization, null, 2)}\n`,
);
fs.mkdirSync(path.join(reviewRoot, "records"), { recursive: true });

const manifestRows = [];
for (const row of rows) {
  const approvalState = applyBoundedOwnerBatchAuthorization(
    markPipelineReady(generatedApprovalState()),
    {
      authorization,
      contentKey: row.contentKey,
      field: ruling.approvedField,
      payloadSha256: row.bodySha256,
      surface: ruling.surface,
    },
  );
  assertBatchGenerationAuthorized(approvalState);
  assertServingAuthorized(approvalState);

  const [, , transiting, aspect, other] = row.contentKey.split(".");
  const id = `${transiting}-${aspect}-${other}`;
  const transitPath = path.join(transitRoot, `${id}.json`);

  let previousReaderCopy = null;
  if (fs.existsSync(transitPath)) {
    try {
      previousReaderCopy = JSON.parse(fs.readFileSync(transitPath, "utf8")).readerCopy ?? null;
    } catch {
      previousReaderCopy = null;
    }
  }

  const transit = {
    id,
    transiting,
    aspect,
    other,
    base: row.summary,
    ...aspectMetadata[aspect],
    voiceNeutral: true,
    status: "LIVE",
    readerCopy: {
      summary: row.summary,
      body: row.body,
      approvedVia: `bounded owner-approved exact Calendar batch ${ruling.batchId}; ${evidenceRelative}`,
    },
  };
  fs.writeFileSync(transitPath, `${JSON.stringify(transit, null, 2)}\n`);

  const recordRelative = `${reviewRelative}/records/${id}-exact-approval.json`;
  fs.writeFileSync(
    path.join(repoRoot, recordRelative),
    `${JSON.stringify(
      {
        schemaVersion: 2,
        contentKey: row.contentKey,
        surface: ruling.surface,
        approvedField: ruling.approvedField,
        approvalLevel: "exact_owner_approved",
        authority: "owner",
        decision: "approve",
        approvedAt: ruling.approvedAt,
        ownerStatement: ruling.ownerStatement,
        decisionContext: ruling.decisionContext,
        batchId: ruling.batchId,
        evidenceRecordPath: evidenceRelative,
        capabilities: ruling.capabilities,
        bodySha256: row.bodySha256,
        summary: row.summary,
        body: row.body,
        sourceApprovalBatch: row.sourceApprovalBatch ?? null,
        sourceApprovedAt: row.sourceApprovedAt ?? null,
      },
      null,
      2,
    )}\n`,
  );

  manifestRows.push({
    contentKey: row.contentKey,
    sourceFile: path.relative(repoRoot, transitPath),
    recordPath: recordRelative,
    bodySha256: row.bodySha256,
    previousReaderCopySha256: sha256(JSON.stringify(previousReaderCopy)),
  });
}

fs.writeFileSync(
  path.join(reviewRoot, "shipping-manifest.json"),
  `${JSON.stringify(
    {
      schemaVersion: 2,
      name: "Sky Calendar final 83 exact owner-approved Chiron + Lilith release",
      batchId: ruling.batchId,
      approvedAt: ruling.approvedAt,
      ownerStatement: ruling.ownerStatement,
      surface: ruling.surface,
      approvedField: ruling.approvedField,
      capabilities: ruling.capabilities,
      memberSetSha256: ruling.memberSetSha256,
      evidenceRecordPath: evidenceRelative,
      rowCount: manifestRows.length,
      previousProjectionPath: previousPayloadRelative,
      previousRowCount: 296,
      combinedRowCount: 379,
      protectedUntouched: [...protectedKeys].sort(),
      rows: manifestRows,
    },
    null,
    2,
  )}\n`,
);

const overlayPayloads = {};
for (const row of rows) {
  const legacyKey = row.contentKey.replace(/^sky\.aspect\./u, "sky.");
  const payload = { summary: row.summary, body: row.body };
  overlayPayloads[legacyKey] = {
    sha256: sha256(JSON.stringify(payload)),
    payload,
  };
}
fs.writeFileSync(
  path.join(reviewRoot, "owner-payload-overlay.json"),
  `${JSON.stringify(
    {
      schemaVersion: 2,
      name: "Final 83 exact-owner-approved Chiron + Lilith overlay",
      batchId: ruling.batchId,
      previousProjectionPath: previousPayloadRelative,
      previousRowCount: 296,
      overlayRowCount: 83,
      combinedRowCount: 379,
      memberSetSha256: ruling.memberSetSha256,
      payloads: overlayPayloads,
    },
    null,
    2,
  )}\n`,
);

const previous = JSON.parse(
  fs.readFileSync(path.join(repoRoot, previousPayloadRelative), "utf8"),
);
if (previous.rowCount !== 296 || Object.keys(previous.payloads ?? {}).length !== 296) {
  throw new Error("Previous owner payload projection must contain exactly 296 rows.");
}

const currentPayloads = JSON.parse(JSON.stringify(previous.payloads));
for (const row of rows) {
  const legacyKey = row.contentKey.replace(/^sky\.aspect\./u, "sky.");
  if (Object.hasOwn(currentPayloads, legacyKey)) {
    throw new Error(`${row.contentKey}: overlay collides with prior approved corpus.`);
  }
  const payload = { summary: row.summary, body: row.body };
  currentPayloads[legacyKey] = {
    sha256: sha256(JSON.stringify(payload)),
    payload,
  };
}

const payloadSetSha256 = sha256(
  JSON.stringify(
    Object.entries(currentPayloads)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([contentKey, entry]) => ({
        contentKey,
        payloadSha256: entry.sha256,
      })),
  ),
);

fs.writeFileSync(
  path.join(reviewRoot, "current-owner-payloads.json"),
  `${JSON.stringify(
    {
      schemaVersion: 2,
      name: "Complete 379-row owner-approved Sky Calendar major exact-aspect payload projection",
      rowCount: 379,
      approvedOverlayCount: 83,
      protectedBaselineCount: protectedKeys.size,
      previousProjectionPath: previousPayloadRelative,
      overlayBatchId: ruling.batchId,
      overlayEvidenceRecordPath: evidenceRelative,
      payloadSetSha256,
      payloads: currentPayloads,
    },
    null,
    2,
  )}\n`,
);

console.log("Released final 83 hash-bound owner-approved Chiron + Lilith Calendar aspects.", {
  previousExactCount: 296,
  releasedRows: 83,
  currentExactCount: 379,
});
