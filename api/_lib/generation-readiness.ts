import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contentGenerationProvider, type GenerationProvider } from "./provider-config.js";
import { reportFulfillmentConfig } from "./report-fulfillment-config.js";
import { createSupabaseReportAdmin } from "./supabase-report-admin.js";
import { currentSkyFacts } from "./current-sky.js";

export type GenerationReadinessClass =
  | "configuration"
  | "packaging"
  | "database"
  | "calculation"
  | "queue";

export type GenerationReadinessCheck = {
  id: string;
  family: "shared" | "content_studio" | "generated_reports" | "premium_reports";
  class: GenerationReadinessClass;
  status: "pass" | "warn" | "fail";
  message: string;
};

export type GenerationReadinessResult = {
  schema: "tldr-generation-readiness.v1";
  status: "ready" | "degraded" | "blocked";
  checkedAt: string;
  checks: GenerationReadinessCheck[];
};

const root = fileURLToPath(new URL("../../", import.meta.url));

function providerKey(provider: GenerationProvider) {
  return provider === "claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
}

function configuredProviderCheck(
  id: string,
  family: GenerationReadinessCheck["family"],
  contentType: string
): GenerationReadinessCheck[] {
  try {
    const provider = contentGenerationProvider({ contentType });
    const key = providerKey(provider);
    return [
      {
        id: `${id}.provider`, family, class: "configuration", status: "pass",
        message: `${provider} is the configured generation provider.`
      },
      {
        id: `${id}.key`, family, class: "configuration",
        status: process.env[key]?.trim() ? "pass" : "fail",
        message: process.env[key]?.trim()
          ? `${provider} generation credentials are configured.`
          : `${provider} generation credentials are missing.`
      }
    ];
  } catch (error) {
    return [{
      id: `${id}.provider`, family, class: "configuration", status: "fail",
      message: error instanceof Error ? error.message : "Generation provider configuration is invalid."
    }];
  }
}

function runtimeAssetChecks(): GenerationReadinessCheck[] {
  const required = [
    "config/agent-memory-sources-v1.json",
    "data/writing/OWNER_CORRECTIONS.jsonl",
    "data/writing/owner-corrections.jsonl",
    "data/writing/owner-feedback-corpus.jsonl"
  ];
  return required.map((relative) => {
    const exists = fs.existsSync(path.join(root, relative));
    return {
      id: `runtime.${relative}`,
      family: "content_studio" as const,
      class: "packaging" as const,
      status: exists ? "pass" as const : "fail" as const,
      message: exists ? `${relative} is available at runtime.` : `${relative} is missing from the deployed function bundle.`
    };
  });
}

async function databaseChecks(): Promise<GenerationReadinessCheck[]> {
  if (!(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return [{
      id: "database.credentials", family: "shared", class: "configuration", status: "fail",
      message: "Supabase server credentials are not configured."
    }];
  }
  try {
    const admin = createSupabaseReportAdmin();
    await admin.request("report_fulfillment_controls?select=id,worker_paused&limit=1");
    const [youRunning, friendRunning, premiumRunning] = await Promise.all([
      admin.request<Array<{ id: string; locked_at: string | null }>>(
        "you_report_jobs?state=eq.running&select=id,locked_at&limit=100"
      ),
      admin.request<Array<{ id: string; locked_at: string | null }>>(
        "friend_report_jobs?state=eq.running&select=id,locked_at&limit=100"
      ),
      admin.request<Array<{ id: string; lease_expires_at: string | null }>>(
        "report_fulfillment_jobs?state=eq.running&select=id,lease_expires_at&limit=100"
      )
    ]);
    const staleBefore = Date.now() - 10 * 60_000;
    const staleYou = youRunning.filter((row) => row.locked_at && Date.parse(row.locked_at) < staleBefore).length;
    const staleFriend = friendRunning.filter((row) => row.locked_at && Date.parse(row.locked_at) < staleBefore).length;
    const stalePremium = premiumRunning.filter((row) => row.lease_expires_at && Date.parse(row.lease_expires_at) < Date.now()).length;
    const staleCount = staleYou + staleFriend + stalePremium;
    return [
      {
        id: "database.service", family: "shared", class: "database", status: "pass",
        message: "The generation services can read the production database."
      },
      {
        id: "queue.stale-running", family: "shared", class: "queue", status: staleCount ? "warn" : "pass",
        message: staleCount
          ? `${staleCount} generation job${staleCount === 1 ? " is" : "s are"} still marked running past the expected lease window.`
          : "No stale running generation jobs were found."
      }
    ];
  } catch (error) {
    return [{
      id: "database.service", family: "shared", class: "database", status: "fail",
      message: error instanceof Error ? `Database readiness failed: ${error.message}` : "Database readiness failed."
    }];
  }
}

async function calculationCheck(): Promise<GenerationReadinessCheck> {
  try {
    const sky = await currentSkyFacts(new Date());
    return {
      id: "calculation.current-sky", family: "shared", class: "calculation",
      status: sky.positions.length ? "pass" : "fail",
      message: sky.positions.length
        ? "The current-Sky calculation dependency returned planetary positions."
        : "The current-Sky calculation dependency returned no positions."
    };
  } catch (error) {
    return {
      id: "calculation.current-sky", family: "shared", class: "calculation", status: "fail",
      message: error instanceof Error ? `Calculation readiness failed: ${error.message}` : "Calculation readiness failed."
    };
  }
}

function premiumConfigurationChecks(): GenerationReadinessCheck[] {
  try {
    const config = reportFulfillmentConfig();
    const writerKey = config.writerProvider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    const judgeKey = config.judgeProvider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    const workerSecret = process.env.REPORT_FULFILLMENT_WORKER_SECRET?.trim();
    return [
      {
        id: "premium.writer", family: "premium_reports", class: "configuration",
        status: process.env[writerKey]?.trim() ? "pass" : "fail",
        message: process.env[writerKey]?.trim()
          ? `${config.writerProvider} premium-report writer credentials are configured.`
          : `${config.writerProvider} premium-report writer credentials are missing.`
      },
      {
        id: "premium.judge", family: "premium_reports", class: "configuration",
        status: process.env[judgeKey]?.trim() ? "pass" : "fail",
        message: process.env[judgeKey]?.trim()
          ? `${config.judgeProvider} premium-report judge credentials are configured.`
          : `${config.judgeProvider} premium-report judge credentials are missing.`
      },
      {
        id: "premium.worker-secret", family: "premium_reports", class: "configuration",
        status: workerSecret ? "pass" : "fail",
        message: workerSecret ? "The report worker secret is configured." : "The report worker secret is missing."
      }
    ];
  } catch (error) {
    return [{
      id: "premium.config", family: "premium_reports", class: "configuration", status: "fail",
      message: error instanceof Error ? error.message : "Premium report configuration is invalid."
    }];
  }
}

export async function generationReadiness(): Promise<GenerationReadinessResult> {
  const checks: GenerationReadinessCheck[] = [
    ...runtimeAssetChecks(),
    ...configuredProviderCheck("content-studio.article", "content_studio", "sky_article"),
    ...configuredProviderCheck("generated.you-day", "generated_reports", "you_day_reading"),
    ...configuredProviderCheck("generated.you-week", "generated_reports", "you_week_reading"),
    ...configuredProviderCheck("generated.friend", "generated_reports", "friend_transit_reading"),
    ...premiumConfigurationChecks(),
    ...(await databaseChecks()),
    await calculationCheck()
  ];
  const status = checks.some((check) => check.status === "fail")
    ? "blocked"
    : checks.some((check) => check.status === "warn") ? "degraded" : "ready";
  return { schema: "tldr-generation-readiness.v1", status, checkedAt: new Date().toISOString(), checks };
}
