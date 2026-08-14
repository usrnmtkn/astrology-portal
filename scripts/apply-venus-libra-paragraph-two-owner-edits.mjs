#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3");
const sourcePath = path.join(reviewRoot, "venus-libra-partial-rewrite-owner-edit-v2.json");
const requestPath = path.join(reviewRoot, "venus-libra-v2-rewrite-request-pending.json");
const outputPath = path.join(reviewRoot, "venus-libra-partial-rewrite-owner-edit-v3.json");
const renderedPath = path.join(reviewRoot, "venus-libra-partial-rewrite-rendered-cold-read-v3.md");

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const request = JSON.parse(fs.readFileSync(requestPath, "utf8"));

const ownerApprovedLoudestVoiceSentence = "The loudest voice makes the choice while the more accommodating person takes the extra bill, revisions, or responsibility.";
const tensionContinuation = `${ownerApprovedLoudestVoiceSentence} Resentment then grows inside a connection that looks good from the outside.`;

for (const field of ["opening", "tension", "close"]) {
  assert.equal(
    source.draft[field],
    request.partialRewrite.protectedFields[field],
    `Protected field changed before the paragraph-two owner edit: ${field}`
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

const renderedTension = `${source.draft.tension} ${tensionContinuation}`;
const article = {
  opening: source.draft.opening,
  tension: renderedTension,
  development: source.draft.development,
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
assert.equal(source.draft.tension, request.partialRewrite.protectedFields.tension);
assert.equal(renderedTension.endsWith(tensionContinuation), true);
assert.equal(renderedTension.includes(ownerApprovedLoudestVoiceSentence), true);
assert.equal(renderedTension.includes("The loudest voice makes the choice."), false);
assert.equal(renderedTension.includes("The clearest voice makes the choice"), false);
assert.equal(renderedTension.includes("Resentment then grows inside an arrangement that still looks calm."), false);

const output = structuredClone(source);
output.draft.tensionContinuation = tensionContinuation;
output.draft.renderedTension = renderedTension;
output.draft.reviewStatus = "needs_review";
output.draft.ownerApproved = false;
output.draft.servingAuthorized = false;
output.lint = lint;
output.status = "human-review-required";
output.report.failureCategories = [];
output.report.finalLintStatus = "PASS";
output.report.finalEvalStatus = "OWNER_GATE_REQUIRED";
output.report.automaticallyRevised = 0;
output.report.ownerDirectedDeterministicEdits = (source.report.ownerDirectedDeterministicEdits ?? 0) + 2;
output.candidateHistory.ownerDirectedParagraphTwoContinuation = [
  "Restored the corrected loudest-voice sentence after the byte-protected paragraph-two opening.",
  "Restored the corrected resentment sentence after the byte-protected paragraph-two opening."
];
output.candidateHistory.sourceCandidate = path.relative(repoRoot, sourcePath);
output.candidateHistory.apiCallsAdded = 0;

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

const renderedClose = article.close.replace("{{exitDate}}", "December 4, 2026");
const rendered = `# Venus in Libra partial rewrite: rendered cold-read page, v3

## Review notes (not page copy)

- Status: human-review-required; review_status: needs_review; ownerApproved false; nothing staged or serving.
- Two owner-directed sentences were restored at the end of paragraph 2. No API call, Terra call, retry, or automatic model revision was made.
- PHRASE evidence was not applied to this held page; it begins with the next placement.
- The owner-authored opening, stored tension field, development, and close remain byte-exact to the v2 candidate. The restored sentences are stored as a governed paragraph-two continuation.
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
  protectedTensionByteExact: source.draft.tension === request.partialRewrite.protectedFields.tension,
  renderedParagraphTwo: renderedTension,
  lint,
  apiCalls: 0
}, null, 2));
