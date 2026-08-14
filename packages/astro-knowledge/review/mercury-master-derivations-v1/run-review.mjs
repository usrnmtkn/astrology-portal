#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { deterministicEditorialReview, reviewDraft, REVIEW_SCHEMA } from "../../../../src/astro-writing/reviewDraft.mjs";
import openAIResponses from "../../../../src/astro-writing/openAIResponses.cjs";

const require = createRequire(import.meta.url);
const { loadLocalEnv } = require("../../scripts/daily-glance-writer-runtime.js");
const { callOpenAIResponses } = openAIResponses;

const ROOT = path.resolve(import.meta.dirname, "../../../..");
const PACKAGE_DIR = path.resolve(import.meta.dirname);
const CANDIDATES_PATH = path.join(PACKAGE_DIR, "candidates.json");
const MASTER_PATH = path.join(ROOT, "packages/astro-knowledge/review/mercury-ingress-masters-v7/TLDR-Mercury-Ingress-Articles-V7.md");
const PLANS_PATH = path.join(ROOT, "packages/astro-knowledge/review/mercury-placements-pilot-v1/meaning-plans.json");
const CORRECTIONS_PATH = path.join(ROOT, "data/writing/owner-corrections.jsonl");
const EXPECTED_SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "pisces"];
const REVIEW_MODEL = "gpt-5.6-terra";
const REASONING_EFFORT = "medium";

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function loadExplicitEnv(filePath) {
  if (!filePath) return;
  for (const line of fs.readFileSync(path.resolve(filePath), "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) || process.env[key] !== undefined) continue;
    let value = trimmed.slice(separator + 1).trim();
    if (/^["'].*["']$/u.test(value)) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/u).filter(Boolean).map(JSON.parse);
}

function outputText(payload) {
  return payload.output_text ?? (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((item) => item.text)
    .filter(Boolean)
    .join("\n");
}

function usageTotals(records) {
  const totals = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0 };
  for (const record of records) {
    const usage = record.provider?.usage ?? {};
    totals.inputTokens += usage.input_tokens ?? 0;
    totals.outputTokens += usage.output_tokens ?? 0;
    totals.reasoningTokens += usage.output_tokens_details?.reasoning_tokens ?? 0;
    totals.totalTokens += usage.total_tokens ?? 0;
  }
  return totals;
}

function normalizedPlan(raw) {
  return {
    content_type: "sky-placement",
    object: "mercury",
    sign: raw.sign,
    house: null,
    event_type: "placement",
    object_function: [raw.objectFunction],
    sign_mechanics: [raw.signMechanics],
    core_tension: raw.coreTension,
    what_changes: raw.whatChanges,
    constructive_expression: raw.constructiveExpression,
    overcorrection: raw.overcorrection,
    observable_behaviors: raw.likelyObservableBehaviors,
    possible_consequences: raw.likelyConsequences,
    allowed_life_domain_examples: raw.allowedLivedDomains,
    do_not_assume: raw.DO_NOT_ASSUME,
    house_bleed_risks: raw.prohibitedDomainAssumptions,
    stock_trope_risks: raw.stockTropeRisks,
    unearned_motives: raw.unearnedMotives,
    governed_evidence: raw.governedEvidence
  };
}

function assertPackage(candidates, masterText) {
  const signs = candidates.cards.map((entry) => entry.sign);
  if (JSON.stringify(signs) !== JSON.stringify(EXPECTED_SIGNS)) {
    throw new Error(`Expected exactly the eleven non-Aquarius signs; got ${signs.join(", ")}.`);
  }
  if (candidates.cards.some((entry) => entry.sign === "aquarius")) {
    throw new Error("Aquarius is an owner-derived control and must not be re-derived.");
  }
  for (const entry of candidates.cards) {
    for (const [slot, excerpts] of Object.entries(entry.masterExcerpts ?? {})) {
      if (!Array.isArray(excerpts) || excerpts.length === 0) throw new Error(`${entry.sign}/${slot} has no master excerpt.`);
      for (const excerpt of excerpts) {
        if (!masterText.includes(excerpt)) throw new Error(`${entry.sign}/${slot} excerpt is not byte-present in the landed master: ${excerpt}`);
      }
    }
  }
  const governance = candidates.governance ?? {};
  for (const field of ["ownerApproved", "promotionAuthorized", "canonical", "serving"]) {
    if (governance[field] !== false) throw new Error(`Governance field ${field} must remain false.`);
  }
  if (governance.reviewStatus !== "needs_review") throw new Error("Review status must remain needs_review.");
}

function failureCategories(records) {
  const counts = new Map();
  for (const record of records) {
    for (const violation of record.review.violations ?? []) {
      counts.set(violation.category, (counts.get(violation.category) ?? 0) + 1);
    }
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function correctCrossFieldLocations(card, result) {
  const fields = ["tagline", "hook", "lived", "turn"];
  const violations = (result.violations ?? []).map((violation) => {
    let location = violation.location;
    if (violation.reason === "Collective copy contains second person.") {
      location = fields.find((field) => /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(card[field])) ?? location;
    } else if (violation.category === "banned_language") {
      location = fields.find((field) => card[field].toLowerCase().includes(violation.reason.toLowerCase())) ?? location;
    }
    if (location === violation.location) return violation;
    return {
      ...violation,
      location,
      text: card[location],
      revision_instruction: `Correct only the failed ${location} material.`
    };
  });
  return {
    ...result,
    violations,
    required_revisions: violations.map((violation) => ({ field: violation.location, instruction: violation.revision_instruction }))
  };
}

function markdownFor(candidates, records, summary) {
  const bySign = new Map(records.map((record) => [record.sign, record]));
  const lines = [
    "# Mercury master derivations v1: owner selection sheet",
    "",
    "Status: `needs_review`. These are natal-register rewrites from canonical Mercury-in-sign mechanisms, not approved fallback rows.",
    "",
    "No canonical claims were changed. The ingress-master excerpts shown below are historical audit references only, not wording templates. Aquarius is excluded because the owner already derived that card on 2026-08-11.",
    "",
    "## Batch result",
    "",
    `- Cards derived: ${summary.draftedCount}`,
    `- Deterministic lint clean: ${summary.lintPassed}/${summary.draftedCount}`,
    `- Terra final PASS: ${summary.reviewerPassed}/${summary.draftedCount}`,
    `- Human review required: ${summary.humanReviewRequired}`,
    `- Reviewer calls: ${summary.callCount}`,
    `- Tokens: ${summary.usage.totalTokens} total (${summary.usage.inputTokens} input, ${summary.usage.outputTokens} output, ${summary.usage.reasoningTokens} reasoning)`,
    "",
    "## Owner-derived Aquarius control",
    "",
    "Aquarius was not regenerated or reviewed in this run. It remains the owner-derived mapping control recorded in the prior Mercury decision sheet.",
    ""
  ];
  for (const entry of candidates.cards) {
    const result = bySign.get(entry.sign);
    lines.push(`## Mercury in ${entry.sign[0].toUpperCase()}${entry.sign.slice(1)}`, "");
    lines.push(`Status: \`${result.status}\` · Lint: \`${result.lint.decision}\` · Terra: \`${result.review.decision}\``, "");
    for (const slot of ["tagline", "hook", "lived", "turn"]) {
      lines.push(`### ${slot[0].toUpperCase()}${slot.slice(1)}`, "", `**Natal candidate:** ${entry.card[slot]}`, "", "**Historical master excerpt(s):**", "");
      for (const excerpt of entry.masterExcerpts[slot]) lines.push(`> ${excerpt.replaceAll("\n", "\n> ")}`, "");
    }
    lines.push("**Allowed operations recorded:**", "");
    for (const operation of entry.operations) lines.push(`- ${operation}`);
    lines.push("");
    if (result.review.violations.length) {
      lines.push("**Reviewer findings:**", "");
      for (const finding of result.review.violations) {
        lines.push(`- \`${finding.category}\` (${finding.severity}, ${finding.location}): ${finding.reason}`);
      }
      lines.push("");
    } else {
      lines.push("**Reviewer findings:** none.", "");
    }
  }
  lines.push("## Governance", "", "- `reviewStatus`: `needs_review`", "- `ownerApproved`: `false`", "- `promotionAuthorized`: `false`", "- `canonical`: `false`", "- `serving`: `false`");
  return `${lines.join("\n")}\n`;
}

function reportMarkdown(summary) {
  return `# Mercury master derivations v1: batch report

- Drafted: ${summary.draftedCount}
- First-pass deterministic PASS: ${summary.lintPassed}/${summary.draftedCount}
- First-pass Terra PASS: ${summary.reviewerPassed}/${summary.draftedCount}
- Automatic revisions: 0
- Human-review-required: ${summary.humanReviewRequired}
- Reviewer: ${summary.model} at ${summary.reasoningEffort}
- Calls: ${summary.callCount}
- Tokens: ${summary.usage.totalTokens} total (${summary.usage.inputTokens} input, ${summary.usage.outputTokens} output, ${summary.usage.reasoningTokens} reasoning)
- Failure categories: ${Object.keys(summary.failureCategories).length ? JSON.stringify(summary.failureCategories) : "none"}
- Lint status: ${summary.lintPassed === summary.draftedCount ? "clean" : "findings recorded"}
- Eval status: ${summary.reviewerPassed === summary.draftedCount ? "all PASS" : "owner selection required for reviewer findings"}

No generation calls or revision calls were made. Nothing was staged, served, promoted, made canonical, or labeled owner-approved.
`;
}

if (process.argv.includes("--render-existing")) {
  const existingCandidates = readJson(CANDIDATES_PATH);
  const cardsBySign = new Map(existingCandidates.cards.map((entry) => [entry.sign, entry.card]));
  const existingRecords = readJson(path.join(PACKAGE_DIR, "review-results.json")).map((record) => ({
    ...record,
    lint: correctCrossFieldLocations(cardsBySign.get(record.sign), record.lint),
    review: correctCrossFieldLocations(cardsBySign.get(record.sign), record.review)
  }));
  const existingSummary = readJson(path.join(PACKAGE_DIR, "batch-report.json"));
  fs.writeFileSync(path.join(PACKAGE_DIR, "lint-results.json"), `${JSON.stringify(existingRecords.map(({ sign, lint }) => ({ sign, ...lint })), null, 2)}\n`);
  fs.writeFileSync(path.join(PACKAGE_DIR, "review-results.json"), `${JSON.stringify(existingRecords, null, 2)}\n`);
  fs.writeFileSync(path.join(PACKAGE_DIR, "batch-report.md"), reportMarkdown(existingSummary));
  fs.writeFileSync(path.join(PACKAGE_DIR, "derivations-sheet.md"), markdownFor(existingCandidates, existingRecords, existingSummary));
  process.stdout.write("Rendered Markdown from preserved results; live calls made: 0.\n");
  process.exit(0);
}

if (!process.argv.includes("--authorize-live")) {
  throw new Error("No billed calls were made. Pass --authorize-live only under the standing owner authorization for Step 2.");
}

loadLocalEnv();
loadExplicitEnv(argValue("--env-file"));
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

const candidates = readJson(CANDIDATES_PATH);
const plans = readJson(PLANS_PATH);
const corrections = readJsonl(CORRECTIONS_PATH);
const masterText = fs.readFileSync(MASTER_PATH, "utf8");
assertPackage(candidates, masterText);

const records = [];
for (const entry of candidates.cards) {
  const plan = normalizedPlan(plans[entry.sign]);
  const lint = deterministicEditorialReview({
    draft: entry.card,
    plan,
    context: { corrections },
    family: "natal-specialized-placement",
    register: "second_person",
    expectedPlaceholders: [],
    requiredFields: ["tagline", "hook", "lived", "turn"],
    protectedOwnerLines: []
  });
  let provider = null;
  const review = await reviewDraft({
    draft: entry.card,
    plan,
    context: { corrections },
    family: "natal-specialized-placement",
    register: "second_person",
    expectedPlaceholders: [],
    requiredFields: ["tagline", "hook", "lived", "turn"],
    protectedOwnerLines: [],
    modelClient: async ({ input, schema }) => {
      const { response, payload } = await callOpenAIResponses({
        apiKey: process.env.OPENAI_API_KEY,
        role: "REVIEWER",
        taskInstructions: "Review this natal Mercury-in-sign rewrite as a complete four-slot natal placement card. Diagnose only. Use exact rubric category IDs. Return PASS or REVISE; never replacement prose.",
        request: {
          model: REVIEW_MODEL,
          input,
          reasoning: { effort: REASONING_EFFORT },
          max_output_tokens: 4000,
          text: { format: { type: "json_schema", name: "mercury_master_derivation_review", strict: true, schema: schema ?? REVIEW_SCHEMA } }
        }
      });
      if (!response.ok) throw new Error(payload.error?.message ?? `Reviewer failed with ${response.status} for ${entry.sign}.`);
      const text = outputText(payload);
      if (!text) throw new Error(`Reviewer returned no output for ${entry.sign}.`);
      provider = {
        responseId: payload.id ?? null,
        requestedModel: REVIEW_MODEL,
        actualModel: payload.model ?? REVIEW_MODEL,
        requestedReasoningEffort: REASONING_EFFORT,
        actualReasoningEffort: payload.reasoning?.effort ?? REASONING_EFFORT,
        usage: payload.usage ?? null
      };
      return JSON.parse(text);
    }
  });
  const record = {
    sign: entry.sign,
    contentKeyStem: `fallback-hook/sky-placement-{tagline|hook|lived|turn}/mercury/${entry.sign}`,
    lint: correctCrossFieldLocations(entry.card, lint),
    review: correctCrossFieldLocations(entry.card, review),
    status: lint.decision === "PASS" && review.decision === "PASS" ? "pipeline-review-passed" : "human-review-required",
    provider
  };
  records.push(record);
  fs.writeFileSync(path.join(PACKAGE_DIR, "review-results.partial.json"), `${JSON.stringify(records, null, 2)}\n`);
  process.stdout.write(`${records.length}/11 ${entry.sign}: lint=${lint.decision} terra=${review.decision}\n`);
}

if (records.length !== 11) throw new Error(`Expected 11 reviewer calls; completed ${records.length}.`);
const usage = usageTotals(records);
const summary = {
  schemaVersion: 1,
  batchId: candidates.batchId,
  draftedCount: candidates.cards.length,
  lintPassed: records.filter((record) => record.lint.decision === "PASS").length,
  reviewerPassed: records.filter((record) => record.review.decision === "PASS").length,
  humanReviewRequired: records.filter((record) => record.status === "human-review-required").length,
  automaticRevisions: 0,
  callCount: records.length,
  model: REVIEW_MODEL,
  reasoningEffort: REASONING_EFFORT,
  usage,
  failureCategories: failureCategories(records),
  governance: candidates.governance
};

fs.writeFileSync(path.join(PACKAGE_DIR, "lint-results.json"), `${JSON.stringify(records.map(({ sign, lint }) => ({ sign, ...lint })), null, 2)}\n`);
fs.writeFileSync(path.join(PACKAGE_DIR, "review-results.json"), `${JSON.stringify(records, null, 2)}\n`);
fs.writeFileSync(path.join(PACKAGE_DIR, "run-record.json"), `${JSON.stringify({
  schemaVersion: 1,
  batchId: candidates.batchId,
  authorizedScope: "Eleven Terra reviewer calls for Step 2; no writer or revision calls.",
  exportBoundary: {
    sent: ["derived four-slot card", "governed Mercury meaning plan"],
    notSent: ["master excerpts", "owner corrections", "owner corpus text"]
  },
  requestedModel: REVIEW_MODEL,
  requestedReasoningEffort: REASONING_EFFORT,
  callCount: records.length,
  usage,
  calls: records.map(({ sign, provider }) => ({ sign, ...provider }))
}, null, 2)}\n`);
fs.writeFileSync(path.join(PACKAGE_DIR, "batch-report.json"), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(PACKAGE_DIR, "batch-report.md"), reportMarkdown(summary));
fs.writeFileSync(path.join(PACKAGE_DIR, "derivations-sheet.md"), markdownFor(candidates, records, summary));
fs.rmSync(path.join(PACKAGE_DIR, "review-results.partial.json"), { force: true });
console.log(JSON.stringify(summary, null, 2));
