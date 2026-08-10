import fs from "node:fs";
import path from "node:path";

const artifactPath = process.argv[2];
if (!artifactPath) throw new Error("Usage: node scripts/backfill-report-run-cost.mjs <run-artifact.json>");

const pricingPath = path.resolve(process.cwd(), "config/report-model-pricing-v1.json");
const pricing = JSON.parse(fs.readFileSync(pricingPath, "utf8"));
const artifact = JSON.parse(fs.readFileSync(path.resolve(artifactPath), "utf8"));

let inputTokens = 0;
let cachedInputTokens = 0;
let outputTokens = 0;
let estimatedCostUsd = 0;
let incompleteCallCount = 0;

for (const call of artifact.calls ?? []) {
  if (!call.usage) {
    incompleteCallCount += 1;
    continue;
  }
  const rates = pricing.models?.[call.model];
  if (!rates) throw new Error(`No pricing entry for '${call.model}'.`);
  const cached = Math.max(0, Math.min(call.usage.cachedInputTokens ?? 0, call.usage.inputTokens ?? 0));
  const uncached = Math.max(0, (call.usage.inputTokens ?? 0) - cached);
  inputTokens += call.usage.inputTokens ?? 0;
  cachedInputTokens += cached;
  outputTokens += call.usage.outputTokens ?? 0;
  estimatedCostUsd += ((uncached * rates.input) + (cached * rates.cachedInput) + ((call.usage.outputTokens ?? 0) * rates.output)) / 1_000_000;
}

artifact.usageTotals = {
  ...artifact.usageTotals,
  inputTokens,
  cachedInputTokens,
  outputTokens,
  totalTokens: inputTokens + outputTokens,
  tokenCountTotal: inputTokens + outputTokens,
  estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
  estimateLabel: "estimate_not_provider_invoice",
  incompleteCallCount,
  pricing: {
    version: pricing.version,
    serviceTier: pricing.serviceTier,
    contextBand: pricing.contextBand,
    source: pricing.source
  }
};
fs.writeFileSync(path.resolve(artifactPath), `${JSON.stringify(artifact, null, 2)}\n`);

if (artifact.reportPath && fs.existsSync(artifact.reportPath)) {
  const markdown = fs.readFileSync(artifact.reportPath, "utf8");
  const replacement = `**Estimated API cost:** $${estimatedCostUsd.toFixed(6)} (estimate, not provider invoice; ${incompleteCallCount} call${incompleteCallCount === 1 ? "" : "s"} has unknown usage)`;
  const updated = markdown.replace(/^\*\*(?:Configured monetary cost|Estimated API cost):\*\*.*$/mu, replacement);
  fs.writeFileSync(artifact.reportPath, updated);
}

process.stdout.write(`${JSON.stringify(artifact.usageTotals, null, 2)}\n`);
