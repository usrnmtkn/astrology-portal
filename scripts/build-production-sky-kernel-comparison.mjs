#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { prepareProductionPreCallGate } = require("../src/astro-writing/productionPreCallGate.cjs");
const outputPath = path.join(
  root,
  "packages/astro-knowledge/review/production-sky-kernel-comparison-v1/comparison.json"
);
const sha256 = (value) => crypto.createHash("sha256")
  .update(typeof value === "string" ? value : JSON.stringify(value))
  .digest("hex");

const fixtures = [
  {
    id: "daily-multi-object",
    input: {
      contentKey: "sky-daily-2026-08-14",
      surface: "sky",
      mode: "feed",
      eventType: "daily-sky",
      facts: {
        sun: { sign: "Leo" },
        moon: { sign: "Pisces" },
        topAspects: [
          { from: "Jupiter", type: "opposition", to: "Moon" },
          { from: "Mars", type: "trine", to: "Saturn" }
        ]
      },
      knowledgeIds: ["sky-jupiter-opposition-moon", "sky-mars-trine-saturn"]
    }
  },
  {
    id: "season-with-supporting-aspect",
    input: {
      contentKey: "sky-season-leo-2026-08-14",
      surface: "sky",
      mode: "feed",
      eventType: "seasonal-current",
      facts: {
        sun: { sign: "Leo" },
        supportingAspects: [{ from: "Sun", type: "trine", to: "Saturn" }]
      },
      knowledgeIds: ["sky-sun-trine-saturn"]
    }
  },
  {
    id: "lunar-cycle-with-supporting-aspect",
    input: {
      contentKey: "sky-moon-pisces-2026-08-14",
      surface: "sky",
      mode: "feed",
      eventType: "lunar-cycle",
      facts: {
        moon: { sign: "Pisces" },
        supportingAspects: [{ from: "Moon", type: "square", to: "Mercury" }]
      },
      knowledgeIds: ["sky-moon-square-mercury"]
    }
  },
  {
    id: "exact-sky-aspect",
    input: {
      contentKey: "sky-aspect-jupiter-opposition-moon-2026-08-14",
      surface: "sky",
      mode: "in_depth",
      eventType: "current-aspect",
      facts: { aspect: { from: "Jupiter", type: "opposition", to: "Moon" } },
      knowledgeIds: ["sky-jupiter-opposition-moon"]
    }
  },
  {
    id: "retrograde-body",
    input: {
      contentKey: "sky-retrograde-mercury-2026-08-14",
      surface: "sky",
      mode: "feed",
      eventType: "retrograde",
      facts: { position: { planet: "Mercury" } },
      knowledgeIds: ["sky-retrograde-mercury"]
    }
  },
  {
    id: "lunation-with-supporting-aspect",
    input: {
      contentKey: "sky-lunation-full-moon-aquarius-2026-08-14",
      surface: "sky",
      mode: "in_depth",
      eventType: "full-moon",
      facts: {
        moonEvent: { name: "Full Moon", sign: "Aquarius" },
        topAspects: [{ from: "Moon", type: "opposition", to: "Sun" }]
      },
      knowledgeIds: ["sky-moon-opposition-sun"]
    }
  }
];

const rows = fixtures.map(({ id, input }) => {
  const legacy = prepareProductionPreCallGate(input, {});
  const governed = prepareProductionPreCallGate(input, {
    WRITING_KERNEL_GOVERNED_SURFACES: "sky",
    WRITING_KERNEL_SKY_CANARY_PERCENT: "100"
  });
  assert.equal(legacy.governedPromptEnabled, false);
  assert.equal(governed.governedPromptEnabled, true);
  assert.equal(legacy.evidence.packet.packetSha256, governed.evidence.packet.packetSha256);
  assert.deepEqual(legacy.canonicalIds, governed.canonicalIds);
  return {
    fixtureId: id,
    contentKey: input.contentKey,
    legacy: {
      promptMode: "unchanged-existing-production-prompt",
      legacyRequestEvidenceSha256: sha256({
        facts: input.facts,
        knowledgeIds: input.knowledgeIds,
        sourceSnapshot: input.sourceSnapshot ?? {},
        voiceNotes: input.voiceNotes ?? ""
      }),
      governedKnowledgeAppended: false
    },
    governed: {
      promptMode: "existing-surface-prompt-plus-governed-evidence",
      governedKnowledgeAppended: true,
      governedPromptSha256: sha256(governed.governedPrompt),
      governedPromptChars: governed.governedPrompt.length
    },
    evidence: {
      canonicalIds: governed.canonicalIds,
      targets: governed.evidence.packet.packetKind === "ordered-multi-target"
        ? governed.evidence.packet.packets.map((packet) => ({
            canonicalId: packet.canonicalId,
            temporality: packet.temporality,
            targetUsage: packet.targetUsage,
            recordsIncluded: packet.totals.recordsIncluded,
            chars: packet.totals.chars,
            packetSha256: packet.packetSha256,
            evidenceSha256: packet.evidenceSha256
          }))
        : [{
            canonicalId: governed.evidence.packet.canonicalId,
            temporality: governed.evidence.packet.temporality,
            targetUsage: governed.evidence.packet.targetUsage,
            recordsIncluded: governed.evidence.packet.totals.recordsIncluded,
            chars: governed.evidence.packet.totals.chars,
            packetSha256: governed.evidence.packet.packetSha256,
            evidenceSha256: governed.evidence.packet.evidenceSha256
          }],
      knowledgeIndexSha256: governed.evidence.packet.indexSha256,
      packetSha256: governed.evidence.packet.packetSha256,
      recordsIncluded: governed.evidence.packet.totals.recordsIncluded,
      chars: governed.evidence.packet.totals.chars
    },
    voiceIsolation: {
      friendsPhraseEvidenceIncluded: false,
      phraseIndexSha256: [...new Set(governed.phraseEvidence.map((entry) => entry.phraseIndexSha256))]
    },
    governance: governed.governance
  };
});

const artifact = {
  schemaVersion: 1,
  artifactKind: "non-serving-production-request-comparison",
  surface: "sky",
  fixtureCount: rows.length,
  comparisonBoundary: "deterministic request/evidence construction only",
  outputParityStatus: "NOT_RUN_LIVE_CALLS_REQUIRE_SEPARATE_BOUNDED_AUTHORIZATION",
  providerCallsMade: 0,
  servingChanged: false,
  approvalChanged: false,
  geminiProductionEnabled: false,
  rows
};
const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

if (process.argv.includes("--write")) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);
  console.log(`Wrote ${path.relative(root, outputPath)}`);
} else {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== serialized) {
    throw new Error(`PRODUCTION_SKY_COMPARISON_STALE: run node scripts/build-production-sky-kernel-comparison.mjs --write`);
  }
  console.log("Production Sky kernel comparison is current.");
}

console.log(JSON.stringify({
  fixtureCount: rows.length,
  maximumTargetsInOneRequest: Math.max(...rows.map((row) => row.evidence.targets.length)),
  liveCallsMade: 0,
  servingChanged: false
}, null, 2));
