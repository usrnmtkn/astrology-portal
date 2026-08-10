import type { ReportDomain, ReportHorizon } from "./report-types.ts";
import { estimateReportPlanningProfile } from "./report-model-pricing.ts";

export const REPORT_AUTOMATION_RULING_VERSION = "owner-approved-v1";
export const REPORT_AUTOMATION_RULING_PATH = "tldr-astro-phrasebank/TLDR-REPORT-AUTOMATED-FULFILLMENT-RULING-OWNER.md";
export const REPORT_JUDGE_THRESHOLD = 0.85;
export const REPORT_BILLING_MODE = "free_test" as const;

export type ReportSku = {
  key: string;
  legacyKey: string;
  nameEnv: string;
  reportDomain: ReportDomain;
  reportHorizon: ReportHorizon;
  priceEnv: string;
  amountEnv: string;
  requiresBirthTime: boolean;
};

const horizons: ReportHorizon[] = ["1_month", "4_months", "6_months", "12_months"];
const domains: ReportDomain[] = ["general", "work_money", "love_connection", "personal_health"];

function catalogHorizon(horizon: ReportHorizon) {
  return horizon.replace(/_months?$/u, "m");
}

function envSuffix(domain: ReportDomain, horizon: ReportHorizon) {
  return `${domain}_${horizon}`.toUpperCase();
}

export const REPORT_SKUS: ReportSku[] = domains.flatMap((reportDomain) => horizons.map((reportHorizon) => ({
  key: `${reportDomain}_${catalogHorizon(reportHorizon)}`,
  legacyKey: `${reportDomain}_${reportHorizon}`,
  nameEnv: `STRIPE_REPORT_NAME_${envSuffix(reportDomain, reportHorizon)}`,
  reportDomain,
  reportHorizon,
  priceEnv: `STRIPE_REPORT_PRICE_${envSuffix(reportDomain, reportHorizon)}`,
  amountEnv: `STRIPE_REPORT_AMOUNT_${envSuffix(reportDomain, reportHorizon)}`,
  requiresBirthTime: reportDomain !== "general" || reportHorizon === "12_months"
})));

function integerEnv(name: string, fallback: number, minimum = 0) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

function decimalEnv(name: string, fallback: number, minimum = 0, maximum = 1) {
  const parsed = Number.parseFloat(process.env[name] ?? "");
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export function reportSku(key: string) {
  return REPORT_SKUS.find((sku) => sku.key === key || sku.legacyKey === key) ?? null;
}

export function reportBillingMode() {
  const configured = process.env.REPORT_BILLING_MODE?.trim() || REPORT_BILLING_MODE;
  if (configured !== "free_test" && configured !== "stripe") throw new Error(`Unsupported report billing mode '${configured}'.`);
  return configured;
}

export function reportFulfillmentConfig() {
  const rulingVersion = process.env.REPORT_AUTOMATION_OWNER_RULING_VERSION?.trim() ?? "";
  const requestedAutoPublish = process.env.REPORT_AUTO_PUBLISH === "true";
  return {
    writerProvider: process.env.REPORT_WRITER_PROVIDER ?? "openai",
    writerModel: process.env.REPORT_WRITER_MODEL ?? process.env.OPENAI_GENERATION_MODEL ?? "gpt-5.6-sol",
    fallbackProvider: process.env.REPORT_FALLBACK_PROVIDER ?? "",
    fallbackModel: process.env.REPORT_FALLBACK_MODEL ?? "",
    judgeProvider: process.env.REPORT_JUDGE_PROVIDER ?? "openai",
    judgeModel: process.env.REPORT_JUDGE_MODEL ?? "gpt-5.6-terra",
    judgeThreshold: REPORT_JUDGE_THRESHOLD,
    validatorAttemptCap: integerEnv("REPORT_VALIDATOR_ATTEMPT_CAP", 3, 1),
    judgeAttemptCap: integerEnv("REPORT_JUDGE_ATTEMPT_CAP", 2, 1),
    auditSampleRate: decimalEnv("REPORT_AUDIT_SAMPLE_RATE", 0.05),
    firstCombinationAuditCount: integerEnv("REPORT_FIRST_COMBINATION_AUDIT_COUNT", 3),
    tokenBudget: integerEnv("REPORT_TOKEN_BUDGET", 1_450_000, 1),
    jobAttemptCap: integerEnv("REPORT_JOB_ATTEMPT_CAP", 5, 1),
    workerBatchSize: integerEnv("REPORT_WORKER_BATCH_SIZE", 5, 1),
    workerPaused: process.env.REPORT_WORKER_PAUSED === "true",
    rulingVersion,
    autoPublishRequested: requestedAutoPublish,
    autoPublishEnabled: requestedAutoPublish && rulingVersion === REPORT_AUTOMATION_RULING_VERSION
  };
}

export function resolvedStripePriceId(sku: ReportSku) {
  return process.env[sku.priceEnv]?.trim() ?? "";
}

export function reportCallEstimate(horizon: ReportHorizon) {
  const unitCount = horizon === "1_month" ? 4 : horizon === "4_months" || horizon === "6_months" ? 6 : 11;
  const cleanPathCalls = unitCount * 3; // draft + critique + judge
  const expectedCallBudget = unitCount * 4; // draft + critique + one splice revision + judge
  const safetyMarginCalls = unitCount; // one additional provider attempt per unit on average
  const recommendedCallBudget = expectedCallBudget + safetyMarginCalls;
  const config = reportFulfillmentConfig();
  const planning = horizon === "12_months" ? estimateReportPlanningProfile(horizon) : null;
  return {
    unitCount,
    cleanPathCalls,
    expectedCallBudget,
    safetyMarginCalls,
    recommendedCallBudget,
    tokenBudget: config.tokenBudget,
    planning
  };
}
