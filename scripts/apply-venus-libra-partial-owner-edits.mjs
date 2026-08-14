#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3");
const sourcePath = path.join(reviewRoot, "venus-libra-partial-rewrite-result-v1.json");
const requestPath = path.join(reviewRoot, "venus-libra-v2-rewrite-request-pending.json");
const outputPath = path.join(reviewRoot, "venus-libra-partial-rewrite-owner-edit-v2.json");
const renderedPath = path.join(reviewRoot, "venus-libra-partial-rewrite-rendered-cold-read-v2.md");

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const request = JSON.parse(fs.readFileSync(requestPath, "utf8"));

const generatedDevelopment = `When agreement comes this easily, the first answer can look like a finished decision before you have named your preference. A collaborator chooses the direction, you say it works, and before anyone assigns the follow-up, you offer to rewrite the draft, send the updates, and deliver the final version. The decision takes five minutes; carrying it out costs you several more hours. When you finally say you preferred another version, their response shows whether they will reopen the decision and share the revisions or expect you to keep carrying out the original plan.

A shared purchase can hide the same imbalance. You agree to split the cost, put the charge on your card, and accept a smaller repayment because asking for the exact difference feels awkward. You save the receipt, calculate what is still owed, and send another reminder. The agreement stays easy because you carry the missing money and the work of collecting it.

State your preference while the choice is still open, then shape the arrangement around both answers. Pay attention to what follows: who changes the plan, who covers the difference, and who takes responsibility for the work their choice created. Honesty shows whether the connection can stay warm once your answer has equal weight.`;

const ownerEditedDevelopment = `When agreement comes this easily, the first answer can look like a finished decision before you have named your preference. A collaborator chooses the direction, you say it works, and before anyone assigns the follow-up, you offer to rewrite the draft, send the updates, and deliver the final version. The decision takes five minutes; carrying it out costs you several more hours. When you finally say you preferred another version, their response tells you which one it was: they reopen the decision and split the revisions, or they expect you to keep carrying the plan you never picked.

A shared purchase can hide the same imbalance. You agree to split the cost, put the charge on your card, and accept a smaller repayment because asking for the exact difference feels awkward. You save the receipt, calculate what is still owed, and send another reminder. The agreement stays easy because you carry the missing money and the work of collecting it.

State your preference while the choice is still open, then shape the arrangement around both answers. Pay attention to what follows: who changes the plan, who covers the difference, and who takes responsibility for the work their choice created.`;

assert.equal(source.draft.development, generatedDevelopment, "The generated development changed before the owner edits could be applied.");
for (const field of ["opening", "tension", "close"]) {
  assert.equal(
    source.draft[field],
    request.partialRewrite.protectedFields[field],
    `Protected field changed: ${field}`
  );
}

const readJsonl = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
  .trim()
  .split(/\n/u)
  .filter(Boolean)
  .map(JSON.parse);
const ownerCorrections = [...new Map(
  [
    ...readJsonl("data/writing/owner-corrections.jsonl"),
    ...readJsonl("data/writing/owner-feedback-corpus.jsonl")
  ].map((entry) => [String(entry.bad).trim().toLowerCase(), entry])
).values()];

const article = {
  opening: source.draft.opening,
  tension: source.draft.tension,
  development: ownerEditedDevelopment,
  close: source.draft.close
};
const lint = validateCopy(article, {
  family: request.family,
  register: request.register,
  surface: request.surface,
  plan: source.plan,
  expectedPlaceholders: request.expectedPlaceholders,
  requiredFields: ["opening", "tension", "development", "close"],
  protectedOwnerLines: request.protectedOwnerLines,
  reservedNegationPivots: request.reservedNegationPivots,
  literalEvidenceRequirements: request.literalEvidenceRequirements,
  ownerCorrections
});

assert.equal(lint.passed, true, JSON.stringify(lint.violations, null, 2));
assert.equal(lint.counts.vagueOutcomeClauses, 0);
assert.equal((Object.values(article).join("\n").match(/\bwhether\b/giu) ?? []).length, 0);

const output = structuredClone(source);
output.draft.development = ownerEditedDevelopment;
output.draft.reviewStatus = "needs_review";
output.draft.ownerApproved = false;
output.draft.servingAuthorized = false;
output.lint = lint;
output.status = "human-review-required";
output.report.failureCategories = [];
output.report.finalLintStatus = "PASS";
output.report.finalEvalStatus = "OWNER_GATE_REQUIRED";
output.report.automaticallyRevised = 0;
output.report.ownerDirectedDeterministicEdits = 2;
output.candidateHistory.ownerDirectedDeterministicEdits = [
  "Replaced the vague banned-word outcome clause with the owner's concrete two-outcome sentence.",
  "Cut the repeated connection-can-stay-warm sentence so the paragraph ends on the concrete consequence."
];
output.candidateHistory.sourceCandidate = path.relative(repoRoot, sourcePath);
output.candidateHistory.apiCallsAdded = 0;

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

const renderedClose = article.close.replace("{{exitDate}}", "December 4, 2026");
const rendered = `# Venus in Libra partial rewrite: rendered cold-read page, v2

## Review notes (not page copy)

- Status: human-review-required; review_status: needs_review; ownerApproved false; nothing staged or serving.
- Two owner-directed deterministic edits were applied to the generated development only. No API call, Terra call, retry, or automatic model revision was made.
- The owner-authored opening, tension, and close remain byte-exact.
- Deterministic lint: PASS.
- Banned-word count: 0.
- Vague-outcome-clause count: 0.
- Negation pivots: 1 total (1 owner-reserved, 0 generated).
- Spine scaffolds: 0.
- The only render-time substitution below is \`{{exitDate}}\` to December 4, 2026.

---

# Venus in Libra

August 6, 2026 to December 4, 2026

${article.opening}

${article.tension}

${article.development}

${renderedClose}

## Key dates

August 6, 2026 to December 4, 2026
`;
fs.writeFileSync(renderedPath, rendered);

console.log(JSON.stringify({
  output: path.relative(repoRoot, outputPath),
  rendered: path.relative(repoRoot, renderedPath),
  lint,
  apiCalls: 0
}, null, 2));
