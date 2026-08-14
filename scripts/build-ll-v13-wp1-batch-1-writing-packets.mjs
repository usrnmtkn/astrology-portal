#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { buildIndex } = require("../.agents/skills/marie-satori-writer/scripts/build-voice-index.js");
const { buildNatalWritingPacket, renderNatalModelInput } = require("../.agents/skills/marie-satori-writer/scripts/natal-writing-packet.js");
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/review/ll-matrix-v13-wp1-review-batch-manifest.json"), "utf8"));
const batch = manifest.batches.find((item) => item.batchId === "WP1-B01");
if (!batch || batch.rowCount !== 132) throw new Error("WP1-B01 manifest is missing or changed.");
const entries = buildIndex().entries;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const rows = batch.rows.map((row) => {
  const packet = buildNatalWritingPacket({ surface: "natal-aspect", key: row.rowKey, voice: "self", indexEntries: entries });
  const friendPacket = buildNatalWritingPacket({ surface: "natal-aspect", key: row.rowKey, voice: "friend", indexEntries: entries });
  const selfModelInput = packet.generationAllowed
    ? renderNatalModelInput(packet, { voice: "self", task: `Author one fresh, owner-review-gated self natal delineation for ${row.rowKey}. Return only the finished passage.` })
    : null;
  return {
    rowKey: row.rowKey,
    metadataSha256: row.metadataSha256,
    status: packet.status,
    generationAllowed: packet.generationAllowed,
    evidenceSummary: packet.evidenceSummary,
    packet: {
      packetVersion: packet.packetVersion,
      target: packet.target,
      factBoundary: packet.factBoundary,
      authoringSource: packet.authoringSource,
      evidencePolicy: packet.evidencePolicy,
      evidenceSummary: packet.evidenceSummary,
      ownerPassages: packet.ownerPassages,
      promptBlockSha256: sha256(packet.promptBlock),
      authoringTasks: packet.generationAllowed ? [
        { voice: "self", entryPoint: "reader-own-experience", modelInputSha256: sha256(selfModelInput) }
      ] : [],
      friendAuthoring: {
        status: friendPacket.status,
        generationAllowed: friendPacket.generationAllowed,
        evidenceSurface: friendPacket.evidencePolicy.evidenceSurface,
        evidenceSummary: friendPacket.evidenceSummary,
        blockedPendingOwnerCalibration: !friendPacket.generationAllowed
      },
      governance: packet.governance
    }
  };
});

const output = {
  schemaVersion: "ll-v13-wp1-batch-01-writing-packets-v2-author-from-mechanism",
  generatedAt: "2026-08-13T00:00:00.000Z",
  batchId: batch.batchId,
  existingCandidateProseIncluded: false,
  governance: {
    approvalEffect: "none",
    servingEffect: "none",
    generationAllowedOnlyWhenPacketReady: true,
    autoPublish: false,
    writerPromotion: false
  },
  summary: {
    rows: rows.length,
    ready: rows.filter((row) => row.generationAllowed).length,
    insufficientEvidence: rows.filter((row) => !row.generationAllowed).length
  },
  standards: buildNatalWritingPacket({ surface: "natal-aspect", key: "moon|sextile|venus", voice: "self", indexEntries: entries }).standards,
  rows
};
const outputPath = path.join(repoRoot, "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-writing-packets-v2.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.summary));
