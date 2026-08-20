#!/usr/bin/env node

import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { inspectProductionEvidence, requestPreview } = require("../src/astro-writing/productionEvidenceInspector.cjs");

const input = {
  contentKey: "sky-aspect-jupiter-opposition-moon-2026-08-14",
  surface: "sky",
  mode: "feed",
  eventType: "current-aspect",
  facts: { aspect: { from: "jupiter", type: "opposition", to: "moon" } },
  knowledgeIds: ["sky-jupiter-opposition-moon"]
};
const providerRequest = {
  provider: "openai",
  model: "fixture-model",
  endpoint: "https://api.openai.com/v1/responses",
  method: "POST",
  headers: { authorization: "[REDACTED]", "content-type": "application/json" },
  body: { model: "fixture-model", input: "EXACT_FIXTURE_PROMPT", store: false }
};
const inspection = inspectProductionEvidence({
  input,
  env: {
    WRITING_KERNEL_GOVERNED_SURFACES: "sky",
    WRITING_KERNEL_SKY_CANARY_PERCENT: "100"
  },
  role: "WRITER",
  providerRequest
});
assert.deepEqual(inspection.input.legacyKnowledgeIds, input.knowledgeIds);
assert.deepEqual(inspection.canonical.canonicalIds, ["body/jupiter", "aspect/opposition", "body/moon"]);
assert.ok(inspection.selectedEvidence.length > 0);
assert.ok(inspection.selectedEvidence.every((record) => record.authorityClass && record.temporality && record.sourceSha256 && record.evidenceSha256));
assert.ok(inspection.exclusions.length === 3);
assert.equal(inspection.governedPrompt.enabled, true);
assert.equal(inspection.activation.canary.selected, true);
assert.equal(inspection.providerRequest.body.input, "EXACT_FIXTURE_PROMPT");
assert.equal(inspection.providerRequest.headers.authorization, "[REDACTED]");
assert.ok(inspection.providerRequest.requestSha256);
assert.ok(inspection.inspectionSha256);
assert.throws(() => requestPreview({
  ...providerRequest,
  headers: { authorization: "Bearer secret" }
}), /PRODUCTION_INSPECTOR_SECRET_REJECTED/u);

console.log(JSON.stringify({
  status: "pass",
  canonicalTargetsShown: inspection.canonical.canonicalIds.length,
  evidenceRecordsShown: inspection.selectedEvidence.length,
  exactRequestBodyShown: true,
  secretsAccepted: false,
  liveCallsMade: 0
}, null, 2));
