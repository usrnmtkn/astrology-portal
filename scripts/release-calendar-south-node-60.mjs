#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const batchId = "sky-calendar-south-node-60-v1";
const reviewRelative = `packages/astro-knowledge/review/${batchId}`;
const reviewRoot = path.join(repoRoot, reviewRelative);
const recordsRoot = path.join(reviewRoot, "records");
const editorialAuthorizationRelative = `${reviewRelative}/owner-batch-authorization.json`;
const servingAuthorizationRelative = `${reviewRelative}/owner-serving-authorization.json`;
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");

const counterpartBodies = [
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
  "lilith",
];
const aspects = ["conjunction", "sextile", "square", "trine", "opposition"];
const mirroredNorthNodeAspect = {
  conjunction: "opposition",
  sextile: "trine",
  square: "square",
  trine: "sextile",
  opposition: "conjunction",
};
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
  trine: {
    business: "A supportive opening is available here; use what becomes easier without assuming ease will do the work for you.",
    shadow: "The ease of a trine can make the opening easy to miss, leave unused, or go unexamined.",
    arcApplying: "Support and coordination build toward exactness.",
    arcSeparating: "The opening begins to recede after exactness.",
  },
  opposition: {
    business: "Both positions are visible; deal with the tradeoff directly instead of pretending one side can disappear.",
    shadow: "The conflict hardens when each side treats the other as the obstacle instead of part of the decision.",
    arcApplying: "The two positions become more explicit as exactness approaches.",
    arcSeparating: "The standoff begins to loosen after exactness.",
  },
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function gitBlobSha(content) {
  const bytes = Buffer.from(content, "utf8");
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

const editorialAuthorization = readJson(path.join(repoRoot, editorialAuthorizationRelative));
const servingAuthorization = readJson(path.join(repoRoot, servingAuthorizationRelative));

if (
  editorialAuthorization.authority !== "owner"
  || editorialAuthorization.decision !== "approve"
  || editorialAuthorization.batchId !== batchId
  || editorialAuthorization.approvalEffect !== "exact_wording_approval"
  || editorialAuthorization.memberCount !== 60
  || editorialAuthorization.approvedCandidateHeadSha !== "2005e620da8a98f8cbc2e1aa711f4cc127f5ddac"
) {
  throw new Error("South Node release requires the locked 60-record exact-wording owner approval.");
}
if (
  servingAuthorization.authority !== "owner"
  || servingAuthorization.decision !== "approve"
  || servingAuthorization.sourceEditorialBatchId !== batchId
  || servingAuthorization.sourceEditorialAuthorizationPath !== editorialAuthorizationRelative
  || servingAuthorization.memberCount !== 60
  || servingAuthorization.runtimeEligible !== true
  || servingAuthorization.contentStudioEditable !== true
  || servingAuthorization.geometryPolicy !== "single-node-axis-event"
  || servingAuthorization.editorialPolicy !== "distinct-north-and-south-pole-copy"
  || !servingAuthorization.capabilities?.includes("batch_generation")
  || !servingAuthorization.capabilities?.includes("serving")
  || !servingAuthorization.capabilities?.includes("content_studio_sync")
) {
  throw new Error("South Node release requires explicit owner serving and Content Studio authorization.");
}

const rows = [];
for (const body of counterpartBodies) {
  const fileName = `${body}.json`;
  const recordPath = path.join(recordsRoot, fileName);
  const raw = fs.readFileSync(recordPath, "utf8");
  if (gitBlobSha(raw) !== editorialAuthorization.recordFileBlobs?.[fileName]) {
    throw new Error(`${fileName}: owner-approved candidate blob drifted.`);
  }
  const packet = JSON.parse(raw);
  if (packet.counterpartBody !== body || !Array.isArray(packet.records) || packet.records.length !== 5) {
    throw new Error(`${fileName}: invalid South Node candidate packet.`);
  }
  for (const row of packet.records) {
    const expectedKey = `sky.aspect.${body}.${row.aspect}.south-node`;
    if (!aspects.includes(row.aspect) || row.contentKey !== expectedKey) {
      throw new Error(`${fileName}: row escaped the 60-record South Node release scope.`);
    }
    if (row.mirroredNorthNodeAspect !== mirroredNorthNodeAspect[row.aspect]) {
      throw new Error(`${expectedKey}: North Node mirror metadata drifted.`);
    }
    if (!row.summary?.trim() || !row.body?.trim() || !row.body.startsWith(row.summary)) {
      throw new Error(`${expectedKey}: summary/body contract failed.`);
    }
    if (!/\bSouth Node\b/u.test(row.body) || /\bNorth Node\b/u.test(row.body)) {
      throw new Error(`${expectedKey}: pole-specific wording boundary failed.`);
    }
    rows.push({ ...row, counterpartBody: body, sourcePacket: `${reviewRelative}/records/${fileName}` });
  }
}

if (rows.length !== 60 || new Set(rows.map((row) => row.contentKey)).size !== 60) {
  throw new Error("South Node serving release must contain exactly 60 unique records.");
}

fs.mkdirSync(transitRoot, { recursive: true });
const manifestRows = [];
for (const row of rows) {
  const id = `${row.counterpartBody}-${row.aspect}-south-node`;
  const runtimeRelative = `packages/astro-knowledge/data/transits/${id}.json`;
  const runtimePath = path.join(repoRoot, runtimeRelative);
  const readerCopy = {
    summary: row.summary,
    body: row.body,
    approvedVia: `exact owner-approved South Node Calendar batch ${batchId}; ${editorialAuthorizationRelative}; serving authorized by ${servingAuthorizationRelative}`,
  };
  const transit = {
    id,
    transiting: row.counterpartBody,
    aspect: row.aspect,
    other: "south-node",
    base: row.summary,
    ...aspectMetadata[row.aspect],
    voiceNeutral: true,
    status: "LIVE",
    readerCopy,
  };
  fs.writeFileSync(runtimePath, `${JSON.stringify(transit, null, 2)}\n`);
  manifestRows.push({
    contentKey: row.contentKey,
    runtimeFile: runtimeRelative,
    sourcePacket: row.sourcePacket,
    mirroredNorthNodeAspect: row.mirroredNorthNodeAspect,
    summarySha256: sha256(row.summary),
    bodySha256: sha256(row.body),
    readerCopySha256: sha256(JSON.stringify(readerCopy)),
  });
}

fs.writeFileSync(path.join(reviewRoot, "shipping-manifest.json"), `${JSON.stringify({
  schemaVersion: 1,
  name: "Sky Calendar South Node pole-specific serving release",
  batchId,
  editorialAuthorizationPath: editorialAuthorizationRelative,
  servingAuthorizationPath: servingAuthorizationRelative,
  rowCount: manifestRows.length,
  geometryPolicy: "single-node-axis-event",
  editorialPolicy: "distinct-north-and-south-pole-copy",
  contentStudioEditable: true,
  runtimeStatus: "LIVE",
  rows: manifestRows,
}, null, 2)}\n`);

console.log("Released 60 exact owner-approved South Node Calendar interpretations.", {
  southNodeRuntimeRecords: manifestRows.length,
  geometryEventsAdded: 0,
  contentStudioEditable: true,
});
