#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3");
const result = JSON.parse(fs.readFileSync(path.join(reviewRoot, "venus-libra-v2-rewrite-result.json"), "utf8"));
const facts = JSON.parse(fs.readFileSync(path.join(reviewRoot, "venus-libra-engine-facts-2026-08-13.json"), "utf8"));
if (!result.draft) throw new Error("The writer result contains no draft to render.");

const replacements = new Map([
  ["entryDate", facts.transitStart],
  ["exitDate", facts.transitEnd],
  ["priorSign", facts.priorSign[0].toUpperCase() + facts.priorSign.slice(1)],
  ["priorSignEntryDate", facts.priorSignEntryDate],
  ["priorSignExitDate", facts.priorSignExitDate]
]);

function renderTokens(text) {
  return String(text).replace(/\{\{([\w.]+)\}\}/gu, (match, name) => replacements.get(name) ?? match);
}

const violations = result.lint?.violations ?? [];
const page = `# Venus in Libra v2: rendered cold-read page

## Review notes (not page copy)

- Status: needs_review; pipeline status: ${result.status}; ownerApproved false; nothing staged or serving.
- Writer: gpt-5.6-sol, xhigh; exactly one billed call; no Terra; no retries; no automatic revisions.
- Usage: ${result.report.modelUsage.input_tokens} input tokens; ${result.report.modelUsage.output_tokens} output tokens (${result.report.modelUsage.output_tokens_details.reasoning_tokens} reasoning); ${result.report.modelUsage.total_tokens} total.
- Deterministic lint: ${result.lint.passed ? "PASS" : "REVISE"}.
${violations.map((item) => `  - ${item.category}: ${item.detail}`).join("\n")}
- The page below preserves the Sol output unchanged except for rendering the five engine-owned date/sign placeholders.
- Aspect insert: not authored or altered by this writer run.

---

# Venus in Libra

${facts.transitStart} to ${facts.transitEnd}

${renderTokens(result.draft.opening)}

${renderTokens(result.draft.tension)}

${renderTokens(result.draft.development)}

${renderTokens(result.draft.close)}

## Key dates

${facts.transitStart} to ${facts.transitEnd}
`;

const outPath = path.join(reviewRoot, "venus-libra-v2-rendered-cold-read.md");
fs.writeFileSync(outPath, page);
console.log(outPath);
