#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3");
const diagnosticRoot = path.join(reviewRoot, "venus-libra-v2-failed-retrieval");
const resultPath = path.join(reviewRoot, "venus-libra-v2-writer-result.json");
const requestPath = path.join(reviewRoot, "venus-libra-v2-writer-request.json");
const renderedPath = path.join(reviewRoot, "venus-libra-v2-rendered-cold-read.md");
const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
const request = JSON.parse(fs.readFileSync(requestPath, "utf8"));
const rendered = fs.readFileSync(renderedPath, "utf8");
if ((result.context?.counts?.examples ?? 0) !== 0) throw new Error("Diagnostic run did not have an empty positive-evidence pool.");
if (result.report?.billedCalls !== 1) throw new Error("Diagnostic run call count drifted.");

fs.mkdirSync(diagnosticRoot, { recursive: true });
fs.writeFileSync(path.join(diagnosticRoot, "run-record.json"), `${JSON.stringify({
  status: "failed-retrieval",
  classification: "diagnostic-only",
  ownerRuling: "if the article does not go through both the writing-pipeline and the satori voice, fail the article and rewrite.",
  voiceEvidenceEligible: false,
  draftEligible: false,
  baselineEligible: false,
  rewriteRequired: true,
  failure: {
    code: "OWNER_POSITIVE_EVIDENCE_EMPTY",
    sourceIds: result.draft?.generation_metadata?.sourceIds ?? result.draft?.generationMetadata?.sourceIds ?? [],
    positiveOwnerPassageCount: result.context?.counts?.examples ?? 0
  },
  rawWriterResult: result
}, null, 2)}\n`);
fs.writeFileSync(path.join(diagnosticRoot, "writer-request.json"), `${JSON.stringify({
  ...request,
  diagnosticOnly: true,
  invalidatedBy: "OWNER_POSITIVE_EVIDENCE_EMPTY"
}, null, 2)}\n`);
fs.writeFileSync(path.join(diagnosticRoot, "rendered-output.md"), rendered.replace(
  /^# Venus in Libra v2: rendered cold-read page/u,
  "# Venus in Libra v2: FAILED RETRIEVAL diagnostic output"
));
for (const filePath of [resultPath, requestPath, renderedPath]) fs.unlinkSync(filePath);
console.log(JSON.stringify({ diagnosticRoot, status: "failed-retrieval", preservedOnlyAsDiagnostic: true }, null, 2));
