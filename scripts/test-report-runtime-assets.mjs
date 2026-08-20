import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vercel = JSON.parse(fs.readFileSync(path.join(repoRoot, "vercel.json"), "utf8"));
const functionConfig = vercel.functions?.["api/**/*.ts"];
const expectedIncludeGlob = "{api/_lib,artifacts,config,src/astro-writing,packages/astro-knowledge/{generated,scripts,data,config,reference,voice,sources/authored/marie-satori-book},apps/web/{public/content,src/content},tldr-astro-phrasebank}/**/*.{cjs,js,json,md,mjs,ts}";

assert.ok(functionConfig, "Every TypeScript API function must receive the report runtime include manifest.");
assert.equal(functionConfig.includeFiles, expectedIncludeGlob, "Vercel report and writing-kernel runtime includeFiles must remain the audited single-glob manifest.");

const exactRuntimeAssets = [
  "api/_lib/content-generation.ts",
  "api/_lib/supabase-report-admin.ts",
  "artifacts/marie-satori-love-connection-2026-owner-v1.md",
  "artifacts/marie-satori-personal-health-2026-owner-v1.md",
  "artifacts/marie-satori-work-money-2026-owner-v1.md",
  "artifacts/marie-satori-year-ahead-2026-FINAL.md",
  "config/report-model-pricing-v1.json",
  "packages/astro-knowledge/data/manifestation-sets/owner-reference-gaps-v1.json",
  "packages/astro-knowledge/data/manifestation-sets/sr-overlays-v1.json",
  "packages/astro-knowledge/data/manifestation-sets/year-ahead-v1.json",
  "tldr-astro-phrasebank/TLDR-LOVE-CONNECTION-DEEPDIVE-GENERATION-PROMPT-OWNER.md",
  "tldr-astro-phrasebank/TLDR-PERSONAL-HEALTH-DEEPDIVE-GENERATION-PROMPT-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-AUTOMATED-FULFILLMENT-RULING-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V3-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V5-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V6-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V7-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-COLD-PROSE-RULE-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-EARNED-SENTENCE-RULING-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-HORIZONS-GENERATION-PROMPT-V2-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3.2-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3.3-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3.4-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-NO-CLEVERNESS-TAX-RULING-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-NATURALNESS-RULING-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-OWNER-REVIEW-EVIDENCE-2026-08-11.md",
  "tldr-astro-phrasebank/TLDR-REPORT-REDUNDANCY-PASS-V1-OWNER.md",
  "tldr-astro-phrasebank/TLDR-WORK-MONEY-DEEPDIVE-GENERATION-PROMPT-OWNER.md",
  "tldr-astro-phrasebank/TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md"
];

for (const relativePath of exactRuntimeAssets) {
  assert.ok(fs.existsSync(path.join(repoRoot, relativePath)), `Missing report runtime asset: ${relativePath}`);
}

const reportHelpers = fs.readdirSync(path.join(repoRoot, "api/_lib"))
  .filter((name) => /^report-.*\.ts$/u.test(name))
  .map((name) => `api/_lib/${name}`);
assert.match(functionConfig.includeFiles, /api\/_lib/u, "Vercel must include every statically imported report helper.");
assert.ok(reportHelpers.includes("api/_lib/report-billing-window.ts"), "Billing-window helper must remain in the traced report helper set.");
assert.ok(reportHelpers.includes("api/_lib/report-owner-comparison.ts"), "Owner-comparison helper must remain in the traced report helper set.");

const reportRuntimeSource = reportHelpers
  .map((relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8"))
  .join("\n");
for (const relativePath of exactRuntimeAssets.filter((item) => !item.startsWith("api/"))) {
  assert.match(reportRuntimeSource, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), `Runtime asset is no longer referenced by report code: ${relativePath}`);
}

assert.doesNotMatch(
  reportRuntimeSource,
  /card-judge-v3-1-mechanism-records/u,
  "Card mechanism records must not become an implicit report-fulfillment dependency."
);

console.log(`Report runtime asset contract passed: ${reportHelpers.length} static helpers and ${exactRuntimeAssets.length - 2} runtime-read assets are deployment-traced.`);
