import assert from "node:assert/strict";
import { REPORT_REDUNDANCY_SCHEMA } from "../api/_lib/report-assembly.ts";
import { REPORT_JUDGE_SCHEMA, reportOverviewSentenceContract } from "../api/_lib/report-judge.ts";
import {
  assertOpenAiStrictResponseSchema,
  callReportCalibrationModel,
  ReportProviderSchemaError
} from "../api/_lib/report-model-client.ts";
import {
  normalizeReportColdReadCritique,
  REPORT_DRAFT_SCHEMA,
  REPORT_REVISION_PATCH_SCHEMA,
  reportSentenceAddressedCritiqueSchema
} from "../api/_lib/report-writer-chain.ts";

const markdownHeavyKeyDates = {
  headline: "KEY TURNING POINTS",
  tldr: "FIXTURE_ONLY_TLDR.",
  summary: "FIXTURE_ONLY_SUMMARY.",
  body: "",
  action: "FIXTURE_ONLY_ACTION.",
  timing: "Across the report year",
  sections: [{
    heading: "KEY TURNING POINTS",
    body: [
      "- **A home responsibility reaches a decision point.** A lunar eclipse falls near natal Saturn.",
      "- **An old role needs different terms.** Uranus squares your natal Sun.",
      "- **The terms require scrutiny.** Credit and authority still have to be negotiated.",
      "- **A new method gets a practical test.** Repeat it during an ordinary week.",
      "- **A communication cycle begins.** Writing or teaching may continue developing.",
      "- **Communication expands.** Each opportunity can look manageable by itself.",
      "- **The communication becomes public.** Other people now have to understand it."
    ].join("\n\n")
  }]
};

const providerSchemas = new Map([
  ["report_unit_draft", REPORT_DRAFT_SCHEMA],
  ["report_unit_critique", reportSentenceAddressedCritiqueSchema(markdownHeavyKeyDates, true)],
  ["report_unit_cold_read", reportSentenceAddressedCritiqueSchema(markdownHeavyKeyDates, true)],
  ["report_unit_revision_spans", REPORT_REVISION_PATCH_SCHEMA],
  ["report_fulfillment_judge", REPORT_JUDGE_SCHEMA],
  ["report_redundancy_pass", REPORT_REDUNDANCY_SCHEMA]
]);

for (const [name, schema] of providerSchemas) {
  assert.doesNotThrow(() => assertOpenAiStrictResponseSchema(schema, name), `${name} must compile against OpenAI's strict response-schema subset.`);
}

const overviewContractPayload = {
  reportDomain: "general",
  reportHorizon: "12_months",
  unit: { unitId: "overview" }
};
const prose = (count) => Array.from({ length: count }, (_, index) => `Overview sentence ${index + 1}.`).join(" ");
assert.deepEqual(reportOverviewSentenceContract(overviewContractPayload, { body: prose(6), sections: [] }), {
  applicable: true,
  passed: true,
  sentenceCount: 6,
  minimum: 5,
  maximum: 7
}, "A six-sentence General 12-month overview must satisfy the owner-approved 5-7 sentence contract.");
assert.equal(
  reportOverviewSentenceContract(overviewContractPayload, { body: prose(8), sections: [] }).passed,
  false,
  "The eight-sentence overview observed in Generation 4 must be rejected even if the model judge otherwise scores it 4/4."
);
assert.equal(
  reportOverviewSentenceContract(overviewContractPayload, { body: prose(4), sections: [] }).passed,
  false,
  "A General 12-month overview shorter than five sentences must also fail."
);
assert.deepEqual(reportOverviewSentenceContract(
  { ...overviewContractPayload, unit: { unitId: "summer" } },
  { body: prose(8), sections: [] }
), {
  applicable: false,
  passed: true,
  sentenceCount: null,
  minimum: 5,
  maximum: 7
}, "The overview sentence contract must not leak into seasonal units.");

const sentenceIdsSchema = providerSchemas.get("report_unit_cold_read").properties.defects.items.properties.sentence_ids;
assert.equal(sentenceIdsSchema.minItems, 1, "The provider may still require at least one sentence ID.");
assert.equal("uniqueItems" in sentenceIdsSchema, false, "Unsupported uniqueItems must never be sent to the provider.");

for (const unsupported of ["uniqueItems", "allOf", "oneOf", "not", "dependentRequired", "dependentSchemas", "if", "then", "else"]) {
  const schema = unsupported === "uniqueItems"
    ? {
        type: "object", additionalProperties: false, required: ["ids"],
        properties: { ids: { type: "array", items: { type: "string" }, uniqueItems: true } }
      }
    : { type: "object", additionalProperties: false, required: [], properties: {}, [unsupported]: {} };
  assert.throws(
    () => assertOpenAiStrictResponseSchema(schema, `unsupported_${unsupported}`),
    (error) => error instanceof ReportProviderSchemaError && error.message.includes(`'${unsupported}'`),
    `${unsupported} must fail the local provider-schema compiler.`
  );
}

assert.throws(() => normalizeReportColdReadCritique(markdownHeavyKeyDates, {
  result: "defects",
  applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY" },
  defects: [{
    id: "duplicate-sentence-id",
    category: "unnatural_phrasing",
    sentence_ids: ["S1", "S1"],
    quote: "FIXTURE_ONLY_TLDR.",
    evidence: "FIXTURE_ONLY",
    evidence_ids: [],
    instruction: "FIXTURE_ONLY"
  }]
}), /repeated a sentence ID/u, "Runtime validation must retain the uniqueness constraint removed from the provider schema.");

let fetchCalls = 0;
let lifecycleCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("Provider fetch must not run for an invalid schema.");
};
try {
  await assert.rejects(callReportCalibrationModel({
    provider: "openai",
    model: "FIXTURE_ONLY_MODEL",
    prompt: "FIXTURE_ONLY_PROMPT",
    schemaName: "invalid_before_billing",
    schema: {
      type: "object", additionalProperties: false, required: ["ids"],
      properties: { ids: { type: "array", items: { type: "string" }, uniqueItems: true } }
    },
    beforeProviderCall: async () => { lifecycleCalls += 1; }
  }), ReportProviderSchemaError);
} finally {
  globalThis.fetch = originalFetch;
}
assert.equal(lifecycleCalls, 0, "Schema compilation must precede the metered lifecycle hook.");
assert.equal(fetchCalls, 0, "An unsupported keyword must never reach a provider request.");

console.log(`Report provider schema contract passed: ${providerSchemas.size} live schemas compile, the General 12-month overview enforces 5-7 sentences, unsupported keywords fail before billing, and sentence-ID uniqueness remains runtime-enforced.`);
