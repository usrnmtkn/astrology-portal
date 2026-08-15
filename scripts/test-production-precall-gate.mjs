#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapter = require("../src/astro-writing/productionEvidenceAdapter.cjs");
const gateModule = require("../src/astro-writing/productionPreCallGate.cjs");

const adminAliases = [
  ["you", "you-natal", "natal-sun-in-aries", "placement-sign/sun/aries"],
  ["you", "you-natal", "sun-in-aries", "placement-sign/sun/aries"],
  ["you", "you-natal", "sun-9", "placement-house/sun/9"],
  ["you", "you-natal", "natal-moon-trine-saturn", "natal-aspect/moon/saturn/trine"],
  ["you", "you-natal", "moon-trine-saturn", "natal-aspect/moon/saturn/trine"],
  ["you", "you-transit", "transit-natal-saturn-square-venus", "transit-aspect/saturn/venus/square"],
  ["you", "you-transit", "saturn-square-venus", "transit-aspect/saturn/venus/square"],
  ["synastry", "friends-synastry", "synastry-venus-sextile-ascendant", "synastry-aspect/venus/ascendant/sextile"],
  ["synastry", "friends-synastry", "relationship-venus-sextile-ascendant", "synastry-aspect/venus/ascendant/sextile"],
  ["synastry", "friends-synastry", "venus-sextile-ascendant", "synastry-aspect/venus/ascendant/sextile"],
  ["synastry", "friends-synastry", "synastry-venus-in-4-house", "house-overlay/venus/4"],
  ["synastry", "friends-synastry", "relationship-venus-in-4-house", "house-overlay/venus/4"],
  ["synastry", "friends-synastry", "personal-planet-house4", "house/4"],
  ["composite", "friends-synastry", "composite-sun-square-moon", "composite-aspect/moon/sun/square"],
  ["composite", "friends-synastry", "sun-square-moon", "composite-aspect/moon/sun/square"],
  ["composite", "friends-synastry", "composite-venus-house4", "composite-placement/venus/4"],
  ["relationship", "friends-synastry", "relationship-timing-pluto", "body/pluto"],
  ["relationship", "friends-synastry", "friends-circle-saturn", "body/saturn"]
];

for (const [surface, evidenceSurface, legacyId, canonicalId] of adminAliases) {
  const mapped = adapter.mapLegacyIdentifier(legacyId, { surface, evidenceSurface });
  assert.ok(mapped.canonicalIds.includes(canonicalId), `${legacyId} did not resolve to ${canonicalId}`);
}

assert.throws(
  () => adapter.mapLegacyIdentifier("sky-jupiter-opposition-moon", { surface: "synastry", evidenceSurface: "friends-synastry" }),
  /PRODUCTION_EVIDENCE_SURFACE_MISMATCH/u
);
assert.throws(
  () => adapter.mapLegacyIdentifier("unknown-legacy-id", { surface: "sky", evidenceSurface: "sky" }),
  /PRODUCTION_EVIDENCE_IDENTIFIER_UNMAPPED/u
);

const skyInput = {
  contentKey: "sky-daily-2026-08-14",
  surface: "sky",
  mode: "feed",
  eventType: "daily-sky",
  facts: { topAspects: [{ from: "Jupiter", type: "opposition", to: "Moon" }] },
  knowledgeIds: ["sky-jupiter-opposition-moon"]
};
const first = gateModule.prepareProductionPreCallGate(skyInput, {});
const second = gateModule.prepareProductionPreCallGate(skyInput, {});
assert.equal(first.gateSha256, second.gateSha256, "production gate must be deterministic");
assert.equal(first.evidence.packet.packetKind, "ordered-multi-target");
assert.deepEqual(first.evidence.packet.canonicalIds, ["body/jupiter", "aspect/opposition", "body/moon"]);
assert.equal(first.evidence.packet.packets.length, 3);
for (const [index, packet] of first.evidence.packet.packets.entries()) {
  assert.equal(packet.canonicalId, first.evidence.packet.canonicalIds[index]);
  assert.equal(packet.indexSha256, first.evidence.packet.indexSha256);
  assert.ok(packet.packetSha256 && packet.evidenceSha256.length > 0);
  assert.ok(packet.evidence.every((record) => (
    record.temporality
    && record.surfacePermission.length
    && record.path
    && record.sourceSha256
    && record.evidenceSha256
  )));
}
assert.ok(first.phraseEvidence.every((entry) => entry.excludedReason.includes("not approved for sky")));
assert.equal(first.governedPromptEnabled, false, "legacy production prompt is the default during migration");

const governed = gateModule.prepareProductionPreCallGate(skyInput, {
  WRITING_KERNEL_GOVERNED_SURFACES: "sky",
  WRITING_KERNEL_SKY_CANARY_PERCENT: "100"
});
assert.equal(governed.governedPromptEnabled, true);
assert.equal(governed.canary.selected, true);
assert.match(governed.governedPrompt, /ORDERED CANONICAL OBJECTS|CANONICAL OBJECT/u);

const placementBodies = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"
];
const placementSigns = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
let placementPackets = 0;
for (const body of placementBodies) {
  for (const sign of placementSigns) {
    const placementInput = {
      contentKey: `sky.placement.base.${body.replaceAll("-", "_")}.${sign}`,
      surface: "sky",
      mode: "feed",
      eventType: "collective-placement-card",
      facts: { placement: { planet: body, sign } },
      knowledgeIds: [`sky-placement-${body}-${sign}`]
    };
    const placementGate = gateModule.prepareProductionPreCallGate(placementInput, {});
    const expectedCanonicalBody = body.replaceAll("-", "_");
    const expectedCanonicalSign = sign;
    assert.deepEqual(
      placementGate.canonicalIds,
      [`placement-sign/${expectedCanonicalBody}/${expectedCanonicalSign}`],
      `${body} in ${sign} did not resolve to its placement-sign object`
    );
    assert.equal(placementGate.validation.register, "collective_with_second_person_close");
    if (body === "south-node") {
      assert.ok(placementGate.evidence.packet.evidence.some((record) => (
        record.store.startsWith("matrix-v9") && record.field === "Copy"
      )), `South Node in ${sign} did not receive real V9 South Node evidence`);
      assert.ok(placementGate.evidence.packet.evidence.every((record) => (
        record.usage !== "primary" || !record.rowKey?.startsWith("north node|")
      )), `South Node in ${sign} received North Node doctrine at primary`);
    }
    assert.equal(placementGate.governedPromptEnabled, false, "canary zero must leave placement prompt bytes unchanged");
    placementPackets += 1;
  }
}
assert.equal(placementPackets, 168);

const approvedPlacementFixture = [
  "The shadow of Aquarius is the group that swallows the person: control dressed up as progress, the crowd deciding it speaks for everyone.",
  "Pluto here keeps exposing which of our shared structures were built to serve the many and which only claimed to.",
  "You don't get to opt out of an era this size.",
  "You only get to decide what you're helping to build inside it."
].join(" ");
const placementValidation = validateCopy(approvedPlacementFixture, {
  validationProfile: "sky-placement",
  register: "collective_with_second_person_close"
});
assert.equal(placementValidation.passed, true, JSON.stringify(placementValidation.violations));
const placementBodyViolation = validateCopy(
  `You can feel the pressure before anyone names it. ${approvedPlacementFixture}`,
  { validationProfile: "sky-placement", register: "collective_with_second_person_close" }
);
assert.equal(placementBodyViolation.passed, false);
assert.ok(placementBodyViolation.violations.some((entry) => entry.category === "register_consistency"));
const namedButDisabled = gateModule.prepareProductionPreCallGate(skyInput, {
  WRITING_KERNEL_GOVERNED_SURFACES: "sky"
});
assert.equal(namedButDisabled.governedPromptEnabled, false, "naming Sky alone must not globally activate it");
assert.equal(namedButDisabled.canary.percent, 0);
const globalOverride = gateModule.prepareProductionPreCallGate(skyInput, {
  WRITING_KERNEL_GOVERNED_SURFACES: "sky",
  WRITING_KERNEL_SKY_GLOBAL_ENABLE: "1"
});
assert.equal(globalOverride.governedPromptEnabled, true);
assert.throws(
  () => gateModule.prepareProductionPreCallGate(skyInput, {
    WRITING_KERNEL_GOVERNED_SURFACES: "sky",
    WRITING_KERNEL_SKY_CANARY_PERCENT: "101"
  }),
  /PRODUCTION_SKY_CANARY_INVALID/u
);
assert.throws(
  () => gateModule.prepareProductionPreCallGate(skyInput, { WRITING_KERNEL_GOVERNED_SURFACES: "synastry" }),
  /PRODUCTION_SURFACE_PROMOTION_UNAUTHORIZED/u
);

const stale = structuredClone(first);
stale.evidence.packet.indexSha256 = "0".repeat(64);
assert.throws(
  () => gateModule.assertProductionPreCallGate(stale, { role: "WRITER", input: skyInput }),
  /KNOWLEDGE_MULTI_PACKET_STALE/u
);
const tampered = structuredClone(first);
tampered.evidence.packet.packets[0].evidence[0].text += " tampered";
assert.throws(
  () => gateModule.assertProductionPreCallGate(tampered, { role: "WRITER", input: skyInput }),
  /KNOWLEDGE_PACKET_(UNAUTHORIZED|TAMPERED)/u
);

const validDraft = validateCopy("Pressure builds, attention narrows, and the next choice stays visible.", {
  validationProfile: first.validation.validationProfile,
  register: first.validation.register
});
assert.equal(validDraft.passed, true);
gateModule.assertProductionPreCallGate(first, { role: "REVIEWER", input: skyInput, draftValidation: validDraft });

const invalidDraft = validateCopy("Direction meets the need.", {
  validationProfile: first.validation.validationProfile,
  register: first.validation.register
});
assert.equal(invalidDraft.passed, false);
let billedCalls = 0;
assert.throws(() => {
  gateModule.assertProductionPreCallGate(first, { role: "REVIEWER", input: skyInput, draftValidation: invalidDraft });
  billedCalls += 1;
}, /PRODUCTION_DRAFT_VALIDATION_FAILED/u);
assert.equal(billedCalls, 0, "a deterministic failure must block before billing");

const telemetryLines = [];
const originalConsoleInfo = console.info;
console.info = (...args) => telemetryLines.push(args.join(" "));
try {
  const telemetryGate = gateModule.prepareProductionPreCallGate(skyInput, {
    WRITING_KERNEL_TELEMETRY: "1"
  });
  gateModule.assertProductionPreCallGate(telemetryGate, { role: "WRITER", input: skyInput });
  assert.throws(
    () => gateModule.assertProductionPreCallGate(telemetryGate, {
      role: "REVIEWER",
      input: skyInput,
      draftValidation: invalidDraft
    }),
    /PRODUCTION_DRAFT_VALIDATION_FAILED/u
  );
} finally {
  console.info = originalConsoleInfo;
}
assert.equal(telemetryLines.length, 2);
assert.match(telemetryLines[0], /provider-call-cleared/u);
assert.match(telemetryLines[1], /"providerCallPrevented":true/u);
assert.doesNotMatch(telemetryLines.join("\n"), /sky-daily-2026-08-14|sky-jupiter-opposition-moon/u, "telemetry must hash owner/request identifiers");

const reportSourcePath = "tldr-astro-phrasebank/TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md";
const reportSourceText = fs.readFileSync(path.join(root, reportSourcePath), "utf8");
const reportInput = {
  contentKey: "report:fixture:unit-01",
  surface: "year_ahead",
  mode: "report",
  eventType: "report_unit",
  facts: {},
  reportPayload: {
    schemaVersion: "report-generation-v3",
    reportDomain: "year_ahead",
    reportHorizon: "12_months",
    unit: { unitId: "unit-01" },
    canonicalOwnerPrompt: { sourcePath: reportSourcePath, text: reportSourceText },
    generationStandard: null,
    livedProseStandard: { sourcePath: reportSourcePath, text: reportSourceText },
    noClevernessRuling: { sourcePath: reportSourcePath, text: reportSourceText },
    ownerReviewEvidence: { sourcePath: reportSourcePath, text: reportSourceText },
    coldProseRuling: { sourcePath: reportSourcePath, text: reportSourceText },
    factors: [],
    manifestationSets: [],
    sourceGaps: [],
    voiceEvidence: [{
      sourcePath: reportSourcePath,
      sourceType: "owner_authored_final",
      surface: "report",
      eligible: true,
      text: reportSourceText
    }],
    outputGovernance: {
      status: "DRAFT",
      ownerApproved: false,
      promotionAuthorized: false,
      promotionAllowed: false
    }
  }
};
const reportGate = gateModule.prepareProductionPreCallGate(reportInput, {});
assert.equal(reportGate.evidence.kind, "report");
assert.equal(reportGate.governedPromptEnabled, false);
gateModule.assertProductionPreCallGate(reportGate, { role: "WRITER", input: reportInput });
assert.doesNotThrow(() => gateModule.assertProductionPreCallGate(reportGate, {
  role: "REVIEWER",
  input: reportInput,
  draftValidation: {
    checked: true,
    passed: false,
    violations: [{ category: "fixture", detail: "Reviewer is being called to repair this governed report finding." }]
  }
}));
assert.throws(() => gateModule.assertProductionPreCallGate(reportGate, {
  role: "REVIEWER",
  input: reportInput,
  draftValidation: { passed: false, violations: [] }
}), /PRODUCTION_DRAFT_VALIDATION_FAILED/u);
const staleReportInput = structuredClone(reportInput);
staleReportInput.reportPayload.livedProseStandard.text += "stale";
assert.throws(
  () => gateModule.prepareProductionPreCallGate(staleReportInput, {}),
  /PRODUCTION_REPORT_SOURCE_STALE/u
);

const productionSource = fs.readFileSync(path.join(root, "api/_lib/content-generation.ts"), "utf8");
const openAiCalls = [...productionSource.matchAll(/callOpenAIResponses\(\{/gu)];
assert.equal(openAiCalls.length, 5, "all five production OpenAI roles must remain enumerated");
for (const match of openAiCalls) {
  const prefix = productionSource.slice(Math.max(0, match.index - 900), match.index);
  assert.match(prefix, /assertProductionRoleGate\(/u, "an OpenAI call lacks an immediately preceding production gate");
}
const claudeFetch = productionSource.indexOf('fetch("https://api.anthropic.com/v1/messages"');
assert.ok(claudeFetch > 0);
assert.match(productionSource.slice(claudeFetch - 700, claudeFetch), /assertProductionRoleGate\(productionGate, "WRITER"/u);
for (const functionName of ["generateWithOpenAI", "generateWithClaude"]) {
  const start = productionSource.indexOf(`function ${functionName}`);
  const end = productionSource.indexOf("\n}", start);
  const functionPrefix = productionSource.slice(start, end);
  // indexOf returns -1 when absent, and -1 < anything, so a bare `gate < env`
  // comparison PASSES when the gate call has been deleted entirely — the exact
  // failure this assertion exists to catch. Require both to be present first.
  const gateAt = functionPrefix.indexOf("prepareProductionPreCallGate(input)");
  const envAt = functionPrefix.indexOf("requireEnv(");
  assert.ok(gateAt >= 0, `${functionName} must call prepareProductionPreCallGate(input)`);
  assert.ok(envAt >= 0, `${functionName} must read a provider key via requireEnv(, or this ordering check is meaningless`);
  assert.ok(gateAt < envAt, `${functionName} must gate before reading a provider key`);
}
assert.doesNotMatch(productionSource, /generativelanguage\.googleapis\.com|GEMINI_API_KEY/u, "Gemini production support is not authorized");

console.log(JSON.stringify({
  status: "pass",
  legacyAliasesCovered: adminAliases.length,
  orderedTargetsPreserved: first.evidence.packet.packets.length,
  providerRolesGated: openAiCalls.length + 1,
  staleAndTamperedPacketsBlockBeforeBilling: true,
  friendsPhraseEvidenceAvailableToSky: false,
  reportPayloadContractVerified: true,
  governedProductionSurfaceReady: "sky",
  skyPlacementPacketsCovered: placementPackets,
  placementRegisterFixturePassed: true,
  skyCanaryDefaultsOff: true,
  telemetryUsesHashedIdentifiers: true,
  liveCallsMade: 0
}, null, 2));
