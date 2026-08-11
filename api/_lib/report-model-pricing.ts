import fs from "node:fs";
import path from "node:path";
import type { ReportModelUsage } from "./report-model-client.ts";

export const REPORT_MODEL_PRICING_PATH = "config/report-model-pricing-v1.json";

type ModelRates = { input: number; cachedInput: number; output: number };
type PricingConfig = {
  schema: string;
  version: string;
  currency: "USD";
  unit: "per_1m_tokens";
  serviceTier: string;
  contextBand: string;
  source: string;
  planningProfiles?: Record<string, {
    basis: string; units: number;
    operationsPerUnit: Array<{ model: string; stage: string; inputTokens: number; outputTokens: number }>;
    operationsPerReport?: Array<{ model: string; stage: string; inputTokens: number; outputTokens: number }>;
  }>;
  models: Record<string, ModelRates>;
};

let cached: PricingConfig | null = null;

export function reportModelPricing(): PricingConfig {
  if (cached) return cached;
  const file = path.resolve(process.cwd(), REPORT_MODEL_PRICING_PATH);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as PricingConfig;
  if (parsed.schema !== "tldrastro.report-model-pricing.v1" || parsed.currency !== "USD" || parsed.unit !== "per_1m_tokens") {
    throw new Error(`Unsupported report pricing config '${REPORT_MODEL_PRICING_PATH}'.`);
  }
  for (const [model, rates] of Object.entries(parsed.models)) {
    if (![rates.input, rates.cachedInput, rates.output].every((value) => Number.isFinite(value) && value >= 0)) {
      throw new Error(`Invalid report pricing for '${model}'.`);
    }
  }
  cached = parsed;
  return parsed;
}

export function estimateReportPlanningProfile(horizon: string) {
  const pricing = reportModelPricing();
  const profile = pricing.planningProfiles?.[horizon];
  if (!profile) return null;
  const perUnit = profile.operationsPerUnit.map((operation) => {
    const usage = { inputTokens: operation.inputTokens, outputTokens: operation.outputTokens, totalTokens: operation.inputTokens + operation.outputTokens };
    return { ...operation, totalTokens: usage.totalTokens, estimatedCostUsd: estimateReportModelCost(operation.model, usage) };
  });
  const perReport = (profile.operationsPerReport ?? []).map((operation) => {
    const usage = { inputTokens: operation.inputTokens, outputTokens: operation.outputTokens, totalTokens: operation.inputTokens + operation.outputTokens };
    return { ...operation, totalTokens: usage.totalTokens, estimatedCostUsd: estimateReportModelCost(operation.model, usage) };
  });
  return {
    basis: profile.basis, units: profile.units,
    totalTokens: perUnit.reduce((sum, operation) => sum + operation.totalTokens, 0) * profile.units
      + perReport.reduce((sum, operation) => sum + operation.totalTokens, 0),
    estimatedCostUsd: Number((perUnit.reduce((sum, operation) => sum + operation.estimatedCostUsd, 0) * profile.units
      + perReport.reduce((sum, operation) => sum + operation.estimatedCostUsd, 0)).toFixed(6)),
    operationsPerUnit: perUnit,
    operationsPerReport: perReport
  };
}

export function estimateReportModelCost(model: string, usage: ReportModelUsage) {
  const pricing = reportModelPricing();
  const rates = pricing.models[model];
  if (!rates) throw new Error(`REPORT_MODEL_PRICE_MISSING: no owner-editable pricing entry for '${model}'.`);
  const cachedInput = Math.max(0, Math.min(usage.cachedInputTokens ?? 0, usage.inputTokens));
  const uncachedInput = Math.max(0, usage.inputTokens - cachedInput);
  return Number((((uncachedInput * rates.input) + (cachedInput * rates.cachedInput) + (usage.outputTokens * rates.output)) / 1_000_000).toFixed(6));
}
