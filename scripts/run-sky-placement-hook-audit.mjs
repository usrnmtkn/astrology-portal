#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { HOUSE_BLEED_NOUNS } from "../src/astro-writing/validateCopy.mjs";
import { REVIEW_FIELDS, canonicalAstrologyReviewInstructions, CANONICAL_REVIEWER_INSTRUCTIONS_VERSION } from "../src/astro-writing/canonicalInstructions.mjs";
import { REVIEW_SCHEMA } from "../src/astro-writing/reviewDraft.mjs";
import openAIResponses from "../src/astro-writing/openAIResponses.cjs";

const require = createRequire(import.meta.url);
const { normalizeArgs } = require("../packages/astro-knowledge/scripts/generate-sky-placement-articles.js");
const { loadLocalEnv } = require("../packages/astro-knowledge/scripts/daily-glance-writer-runtime.js");
const { callOpenAIResponses } = openAIResponses;

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "packages/astro-knowledge/review/hook-audit-2026-08");
const RUN_PATH = path.join(OUT_DIR, "run-record.json");
const SOURCE_PATH = path.join(ROOT, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const BUNDLE_PATH = path.join(ROOT, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json");
const MANIFEST_PATH = path.join(ROOT, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json");
const PLACEMENT_SPEC_PATH = path.join(ROOT, "packages/astro-knowledge/voice/tldr-astro/sky-placement.json");
const BANNED_WORDS_PATH = path.join(ROOT, "packages/astro-knowledge/voice/banned-words.json");
const ROW_PATTERN = /^fallback-hook\/sky-placement-(tagline|hook|lived|turn)\/([^/]+)\/([^/]+)$/u;
const EXCLUDED_BODIES = new Set(["moon", "lilith"]);
const DEFAULT_MODEL = "gpt-5.6-terra";
const DEFAULT_REASONING = "medium";

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function sha(text) { return crypto.createHash("sha256").update(text).digest("hex"); }
function outputText(payload) {
  return payload.output_text ?? (payload.output ?? []).flatMap((item) => item.content ?? [])
    .map((item) => item.text).filter(Boolean).join("\n");
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
function compileTerm(term) {
  try {
    const patternLike = term.includes("\\b") || term.includes("\\s") || term.includes("(?:") || term.includes("|") || term.includes("[");
    return new RegExp(patternLike ? term : `\\b${term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "giu");
  } catch {
    return null;
  }
}
function deterministicIssues(text, sourceRow, bundledRow, failBans, bannedWords) {
  const issues = [];
  if (text.includes("—")) issues.push({ category: "em_dash", term: "—" });
  if (/\bwhether\b/iu.test(text)) issues.push({ category: "banned_word", term: "whether" });
  if (/\b(?:you|your|yours|yourself|yourselves)\b/iu.test(text)) issues.push({ category: "register_violation", term: text.match(/\b(?:you|your|yours|yourself|yourselves)\b/iu)?.[0] });
  for (const item of [...failBans, ...bannedWords]) {
    if (item.term === "—" || item.term === "whether") continue;
    const pattern = compileTerm(item.term);
    if (!pattern) continue;
    const match = text.match(pattern);
    if (match) issues.push({ category: "banned_word", term: item.term, match: match[0], reason: item.reason ?? null });
  }
  if (!bundledRow) issues.push({ category: "protected_line_drift", reason: "Serving bundle row is missing." });
  else {
    for (const field of ["body_you", "body_they"]) {
      if ((sourceRow[field] ?? null) !== (bundledRow[field] ?? null)) {
        issues.push({ category: "protected_line_drift", field, reason: "Bundled text differs from approved source text." });
      }
    }
  }
  return [...new Map(issues.map((item) => [JSON.stringify(item), item])).values()];
}
function governedPlan(planet, sign) {
  const { meaning, authoringLayer } = normalizeArgs({ planet, sign });
  return {
    content_type: "sky-placement-fallback-row",
    object: planet,
    sign,
    house: null,
    event_type: "placement",
    object_function: [authoringLayer.planetFunction, authoringLayer.planetUseful, authoringLayer.planetDistortion].filter(Boolean),
    sign_mechanics: [authoringLayer.signMethod, authoringLayer.signBehavior, authoringLayer.signNeed, authoringLayer.signDistortion, authoringLayer.pairColor].filter(Boolean),
    actual_house_domain: null,
    core_tension: meaning.challenge ?? authoringLayer.signDistortion,
    what_changes: meaning.body ?? authoringLayer.pairColor,
    constructive_expression: meaning.gift ?? authoringLayer.planetUseful,
    overcorrection: meaning.challenge ?? authoringLayer.planetDistortion,
    observable_behaviors: [authoringLayer.signBehavior, authoringLayer.pairColor].filter(Boolean),
    possible_consequences: [meaning.challenge, authoringLayer.signDistortion].filter(Boolean),
    allowed_life_domain_examples: [],
    do_not_assume: ["a house, motive, biography, relationship status, or life domain not supplied by governed facts"],
    house_bleed_risks: HOUSE_BLEED_NOUNS[sign] ?? [],
    stock_trope_risks: ["generic domestic props", "generic dating scenes", "generic workplace shorthand", "therapy shorthand", "advocacy-default framing"],
    unearned_motives: ["a specific psychological explanation not supplied by governed facts"],
    meaning_source: meaning.source
  };
}
function loadRows() {
  const source = readJson(SOURCE_PATH);
  const bundle = readJson(BUNDLE_PATH);
  const manifest = new Set(readJson(MANIFEST_PATH).keys.map((key) => key.replace(/^hook:/u, "")));
  const bundled = new Map(bundle.hookRows.map((row) => [row.contentKey, row]));
  const placementSpec = readJson(PLACEMENT_SPEC_PATH);
  const bannedWords = readJson(BANNED_WORDS_PATH).bannedWords ?? [];
  const rows = source.hookRows.filter((row) => {
    const match = row.contentKey.match(ROW_PATTERN);
    return match && manifest.has(row.contentKey) && !EXCLUDED_BODIES.has(match[2]);
  }).map((row) => {
    const [, slot, planet, sign] = row.contentKey.match(ROW_PATTERN);
    const text = row.body_you ?? row.body_they ?? row.body ?? "";
    return {
      contentKey: row.contentKey,
      slot,
      planet,
      sign,
      text,
      textHash: sha(text),
      reviewStatus: row.review_status,
      sourceKeys: row.source_keys ?? [],
      deterministicIssues: deterministicIssues(text, row, bundled.get(row.contentKey), placementSpec.outputBans?.fail ?? [], bannedWords),
      plan: governedPlan(planet, sign)
    };
  }).sort((a, b) => a.contentKey.localeCompare(b.contentKey));
  if (rows.length !== 576) throw new Error(`Expected 576 eligible serving rows; found ${rows.length}.`);
  if (new Set(rows.map((row) => row.contentKey)).size !== rows.length) throw new Error("Eligible serving rows contain duplicate content keys.");
  return rows;
}
function usageTotals(results) {
  const totals = { input_tokens: 0, output_tokens: 0, total_tokens: 0, reasoning_tokens: 0, cached_input_tokens: 0 };
  for (const result of results) {
    const usage = result.provider?.usage ?? {};
    totals.input_tokens += usage.input_tokens ?? 0;
    totals.output_tokens += usage.output_tokens ?? 0;
    totals.total_tokens += usage.total_tokens ?? ((usage.input_tokens ?? 0) + (usage.output_tokens ?? 0));
    totals.reasoning_tokens += usage.output_tokens_details?.reasoning_tokens ?? 0;
    totals.cached_input_tokens += usage.input_tokens_details?.cached_tokens ?? 0;
  }
  return totals;
}
function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) { const key = keyFn(item); counts[key] = (counts[key] ?? 0) + 1; }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])));
}
function failureCategories(result) {
  return [...new Set((result.modelReview?.violations ?? []).map((v) => v.category))];
}
function severity(result) {
  const failedChecks = REVIEW_FIELDS.filter((field) => result.modelReview?.[field]?.status === "FAIL").length;
  const blocking = (result.modelReview?.violations ?? []).filter((v) => v.severity === "blocking").length;
  return blocking * 100 + failedChecks * 10 + (result.modelReview?.violations?.length ?? 0);
}
function writeReport(results, metadata) {
  const semanticRevise = results.filter((r) => r.modelReview.decision === "REVISE");
  const semanticPass = results.filter((r) => r.modelReview.decision === "PASS");
  const deterministicFlagged = results.filter((r) => r.deterministicIssues.length > 0);
  const categoryRows = semanticRevise.flatMap((r) => failureCategories(r).map((category) => ({ category })));
  const summary = {
    schema: "tldrastro-sky-placement-hook-audit-v1",
    status: "complete",
    generatedAt: new Date().toISOString(),
    ...metadata,
    totalRows: results.length,
    semantic: { pass: semanticPass.length, revise: semanticRevise.length, passRate: Number((semanticPass.length / results.length).toFixed(4)) },
    deterministic: { clean: results.length - deterministicFlagged.length, flagged: deterministicFlagged.length },
    usage: usageTotals(results),
    failuresByCategory: countBy(categoryRows, (x) => x.category),
    resultsByBody: Object.fromEntries([...new Set(results.map((r) => r.planet))].sort().map((planet) => {
      const group = results.filter((r) => r.planet === planet);
      return [planet, { total: group.length, pass: group.filter((r) => r.modelReview.decision === "PASS").length, revise: group.filter((r) => r.modelReview.decision === "REVISE").length }];
    })),
    resultsBySlot: Object.fromEntries([...new Set(results.map((r) => r.slot))].sort().map((slot) => {
      const group = results.filter((r) => r.slot === slot);
      return [slot, { total: group.length, pass: group.filter((r) => r.modelReview.decision === "PASS").length, revise: group.filter((r) => r.modelReview.decision === "REVISE").length }];
    })),
    deterministicByCategory: countBy(deterministicFlagged.flatMap((r) => r.deterministicIssues.map((i) => i)), (x) => x.category),
    rows: results.map((r) => ({
      contentKey: r.contentKey, planet: r.planet, sign: r.sign, slot: r.slot, text: r.text,
      verdict: r.modelReview.decision,
      failedChecks: REVIEW_FIELDS.filter((field) => r.modelReview[field]?.status === "FAIL"),
      categories: failureCategories(r), violations: r.modelReview.violations,
      deterministicIssues: r.deterministicIssues, provider: r.provider
    }))
  };
  const worst = [...semanticRevise].sort((a, b) => severity(b) - severity(a) || a.contentKey.localeCompare(b.contentKey)).slice(0, 10);
  const clean = semanticPass.filter((r) => r.deterministicIssues.length === 0).slice(0, 5);
  const groupedBatches = [
    ["literal clarity and translated metaphor", ["literal_first_read_clarity", "metaphor_requires_translation"]],
    ["observable examples that prove the astrology", ["example_proves_astrology", "observable_behavior", "stock_trope"]],
    ["owner voice and generic self-help", ["voice_match", "generic_self_help"]],
    ["astrology integrity and sign/house boundaries", ["astrology_integrity", "planet_or_point_function", "sign_house_separation"]],
    ["register, motive, and specialist shorthand", ["register_consistency", "invented_motive", "clinical_shorthand", "advocacy_register_drift"]],
    ["tagline clarity", ["tagline_stands_alone"]],
    ["redundancy and restraint", ["redundancy"]]
  ];
  const batchPlan = groupedBatches.map(([focus, categories], index) => {
    const keys = semanticRevise.filter((result) => categories.some((category) => failureCategories(result).includes(category))).map((result) => result.contentKey);
    return { batch: index + 1, focus, categories, rowCount: new Set(keys).size };
  }).filter((batch) => batch.rowCount > 0);
  summary.spotCheck = { worstKeys: worst.map((r) => r.contentKey), cleanKeys: clean.map((r) => r.contentKey) };
  summary.recommendedPhase2Batches = batchPlan;
  fs.writeFileSync(path.join(OUT_DIR, "triage-report.json"), `${JSON.stringify(summary, null, 2)}\n`);

  const lines = [
    "# Sky placement fallback-hook audit, Phase 1", "",
    `- Reviewer: \`${metadata.model}\`, reasoning \`${metadata.reasoningEffort}\``,
    `- Reviewer contract: \`${metadata.reviewerInstructionsVersion}\``,
    `- Live calls: ${results.length}`, `- Tokens: ${summary.usage.total_tokens} total (${summary.usage.input_tokens} input, ${summary.usage.output_tokens} output, ${summary.usage.reasoning_tokens} reasoning; ${summary.usage.cached_input_tokens} cached input)`,
    `- Semantic: ${summary.semantic.pass} PASS, ${summary.semantic.revise} REVISE (${(summary.semantic.passRate * 100).toFixed(1)}% pass)`,
    `- Deterministic: ${summary.deterministic.clean} clean, ${summary.deterministic.flagged} flagged`, "",
    "## Failure classes", "", "| Category | Rows |", "|---|---:|",
    ...Object.entries(summary.failuresByCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`), "",
    "## By body", "", "| Body | Total | PASS | REVISE |", "|---|---:|---:|---:|",
    ...Object.entries(summary.resultsByBody).map(([k, v]) => `| ${k} | ${v.total} | ${v.pass} | ${v.revise} |`), "",
    "## By slot", "", "| Slot | Total | PASS | REVISE |", "|---|---:|---:|---:|",
    ...Object.entries(summary.resultsBySlot).map(([k, v]) => `| ${k} | ${v.total} | ${v.pass} | ${v.revise} |`), "",
    "## Deterministic findings", "", "| Category | Rows/findings |", "|---|---:|",
    ...Object.entries(summary.deterministicByCategory).map(([k, v]) => `| ${k} | ${v} |`), "",
    "## Ten worst entries", ""
  ];
  for (const r of worst) {
    lines.push(`### \`${r.contentKey}\``, "", r.text, "", `Verdict: **${r.modelReview.decision}**`, "", `Categories: ${failureCategories(r).join(", ") || "none"}`, "");
  }
  lines.push("## Five clean PASS entries", "");
  for (const r of clean) lines.push(`### \`${r.contentKey}\``, "", r.text, "");
  lines.push("## Recommended Phase 2 batching", "");
  for (const batch of batchPlan) lines.push(`${batch.batch}. **${batch.focus}**: ${batch.rowCount} rows (${batch.categories.join(", ")})`);
  lines.push("", "## Per-row results", "", "| contentKey | Verdict | Failed checks | Categories | Deterministic |", "|---|---|---|---|---|");
  for (const row of summary.rows) {
    lines.push(`| \`${row.contentKey}\` | ${row.verdict} | ${row.failedChecks.join(", ") || "none"} | ${row.categories.join(", ") || "none"} | ${row.deterministicIssues.map((item) => item.category).join(", ") || "clean"} |`);
  }
  lines.push("", "No copy, status, reviewer configuration, or serving data changed in this audit.", "");
  fs.writeFileSync(path.join(OUT_DIR, "triage-report.md"), `${lines.join("\n")}\n`);
  return summary;
}

const rows = loadRows();
if (process.argv.includes("--plan")) {
  console.log(JSON.stringify({ eligibleRows: rows.length, excludedBodies: [...EXCLUDED_BODIES], byBody: countBy(rows, (r) => r.planet), bySlot: countBy(rows, (r) => r.slot), deterministicFlagged: rows.filter((r) => r.deterministicIssues.length).length }, null, 2));
  process.exit(0);
}
if (!process.argv.includes("--authorize-live")) throw new Error("No billed call was made. Pass --authorize-live only after explicit owner authorization.");

fs.mkdirSync(OUT_DIR, { recursive: true });
loadLocalEnv();
const envArg = process.argv.indexOf("--env-file");
loadExplicitEnv(envArg >= 0 ? process.argv[envArg + 1] : null);
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
const model = process.env.OPENAI_REVIEW_MODEL ?? process.env.OPENAI_JUDGE_MODEL ?? DEFAULT_MODEL;
const reasoningEffort = DEFAULT_REASONING;
if (model !== DEFAULT_MODEL) throw new Error(`Calibrated audit requires ${DEFAULT_MODEL}; resolved ${model}.`);

const existing = fs.existsSync(RUN_PATH) ? readJson(RUN_PATH) : { results: [] };
const completed = new Map(existing.results.map((r) => [`${r.contentKey}|${r.textHash}`, r]));
const results = rows.map((row) => completed.get(`${row.contentKey}|${row.textHash}`)).filter(Boolean);
let callCount = results.length;
const pending = rows.filter((row) => !completed.has(`${row.contentKey}|${row.textHash}`));
const concurrency = 4;
let cursor = 0;

async function reviewRow(row) {
  const draft = { [row.slot]: row.text };
  const { response, payload } = await callOpenAIResponses({
    apiKey: process.env.OPENAI_API_KEY,
    role: "REVIEWER",
    taskInstructions: "Audit exactly one serving Sky Placement slot. For every violation category, use the exact lowercase snake_case check ID from the reviewer contract. Evaluate only the supplied slot, while using the governed planet/sign plan as astrology context. Return PASS or REVISE only.",
    request: {
      model,
      input: JSON.stringify({ plan: row.plan, family: "sky-placement", register: "collective", contentKey: row.contentKey, slot: row.slot, draft }, null, 2),
      reasoning: { effort: reasoningEffort },
      max_output_tokens: 4000,
      text: { format: { type: "json_schema", name: "sky_placement_hook_audit", strict: true, schema: REVIEW_SCHEMA } }
    }
  });
  if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI reviewer failed with ${response.status} for ${row.contentKey}.`);
  const text = outputText(payload);
  if (!text) throw new Error(`OpenAI reviewer returned no output for ${row.contentKey}.`);
  const modelReview = JSON.parse(text);
  return {
    ...row,
    modelReview,
    provider: {
      responseId: payload.id ?? null,
      responseModel: payload.model ?? model,
      reasoningEffort: payload.reasoning?.effort ?? reasoningEffort,
      usage: payload.usage ?? null
    }
  };
}
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= pending.length) return;
    const row = pending[index];
    const result = await reviewRow(row);
    results.push(result);
    callCount += 1;
    results.sort((a, b) => a.contentKey.localeCompare(b.contentKey));
    fs.writeFileSync(RUN_PATH, `${JSON.stringify({ schema: "tldrastro-sky-placement-hook-audit-run-v1", status: "running", model, reasoningEffort, reviewerInstructionsVersion: CANONICAL_REVIEWER_INSTRUCTIONS_VERSION, reviewerInstructionsHash: sha(canonicalAstrologyReviewInstructions), authorizedCallCount: 576, callCount, results }, null, 2)}\n`);
    process.stdout.write(`${callCount}/576 ${row.contentKey}: ${result.modelReview.decision}\n`);
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
if (callCount !== 576 || results.length !== 576) throw new Error(`Audit completed ${callCount} calls and ${results.length} results; expected 576 exactly.`);
const metadata = { model, reasoningEffort, reviewerInstructionsVersion: CANONICAL_REVIEWER_INSTRUCTIONS_VERSION, reviewerInstructionsHash: sha(canonicalAstrologyReviewInstructions), callCount, authorizedCallCount: 576 };
fs.writeFileSync(RUN_PATH, `${JSON.stringify({ schema: "tldrastro-sky-placement-hook-audit-run-v1", status: "complete", ...metadata, usage: usageTotals(results), results }, null, 2)}\n`);
const report = writeReport(results, metadata);
console.log(JSON.stringify({ status: report.status, totalRows: report.totalRows, semantic: report.semantic, deterministic: report.deterministic, usage: report.usage }, null, 2));
