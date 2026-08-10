import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vercel = JSON.parse(fs.readFileSync(path.join(repoRoot, "vercel.json"), "utf8"));
const functionConfig = vercel.functions?.["api/**/*.ts"];
const expectedIncludeGlob = "{artifacts/*.md,config/*.json,packages/astro-knowledge/data/manifestation-sets/*.json,tldr-astro-phrasebank/*.md}";

assert.ok(functionConfig, "Every TypeScript API function must receive the report runtime include manifest.");
assert.equal(functionConfig.includeFiles, expectedIncludeGlob, "Vercel report runtime includeFiles must remain the audited single-glob manifest.");
assert.doesNotMatch(functionConfig.includeFiles, /api\/_lib|\.ts/u, "Compiled API helpers must be traced from emitted .js imports, not shipped as raw TypeScript includeFiles.");

const exactRuntimeAssets = [
  "artifacts/marie-satori-love-connection-2026-owner-v1.md",
  "artifacts/marie-satori-personal-health-2026-owner-v1.md",
  "artifacts/marie-satori-work-money-2026-owner-v1.md",
  "artifacts/marie-satori-year-ahead-2026-FINAL.md",
  "config/report-model-pricing-v1.json",
  "packages/astro-knowledge/data/manifestation-sets/year-ahead-v1.json",
  "tldr-astro-phrasebank/TLDR-LOVE-CONNECTION-DEEPDIVE-GENERATION-PROMPT-OWNER.md",
  "tldr-astro-phrasebank/TLDR-PERSONAL-HEALTH-DEEPDIVE-GENERATION-PROMPT-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-AUTOMATED-FULFILLMENT-RULING-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V3-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-HORIZONS-GENERATION-PROMPT-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md",
  "tldr-astro-phrasebank/TLDR-WORK-MONEY-DEEPDIVE-GENERATION-PROMPT-OWNER.md",
  "tldr-astro-phrasebank/TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md"
];

for (const relativePath of exactRuntimeAssets) {
  assert.ok(fs.existsSync(path.join(repoRoot, relativePath)), `Missing report runtime asset: ${relativePath}`);
}

const reportHelpers = fs.readdirSync(path.join(repoRoot, "api/_lib"))
  .filter((name) => /^report-.*\.ts$/u.test(name))
  .map((name) => `api/_lib/${name}`);
assert.ok(reportHelpers.includes("api/_lib/report-billing-window.ts"), "Billing-window helper must remain in the traced report helper set.");
assert.ok(reportHelpers.includes("api/_lib/report-owner-comparison.ts"), "Owner-comparison helper must remain in the traced report helper set.");

const reportRuntimeSource = reportHelpers
  .map((relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8"))
  .join("\n");
for (const relativePath of exactRuntimeAssets) {
  assert.match(reportRuntimeSource, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), `Runtime asset is no longer referenced by report code: ${relativePath}`);
}

assert.doesNotMatch(
  reportRuntimeSource,
  /card-judge-v3-1-mechanism-records/u,
  "Card mechanism records must not become an implicit report-fulfillment dependency."
);

console.log(`Report runtime asset contract passed: ${reportHelpers.length} compiled helpers and ${exactRuntimeAssets.length} runtime-read assets are deployment-traced.`);
