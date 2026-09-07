import {
  YOU_TRANSIT_READING_PROMPT_VERSION,
  compactYouTransitReadingBrief,
  youTransitReadingPrompt,
  youTransitReadingRequestLock,
  validateYouTransitReadingDraft,
  type YouTransitReadingBrief
} from "./you-transit-reading.js";
import { createSupabaseReportAdmin } from "./supabase-report-admin.js";
import {
  generateGovernedTransitReading,
  type GeneratedTransitReadingDraft
} from "./transit-reading-generation.js";
import { validateCopy } from "../../src/astro-writing/validateCopy.mjs";

export type YouTransitReadingRow = {
  id: string;
  content_key: string;
  surface: string;
  mode: string;
  status: string;
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  sections: unknown | null;
  provider: string | null;
  model: string | null;
  updated_at: string;
  you_report_entitlement_id?: string | null;
};

function promptForAttempt(brief: YouTransitReadingBrief, headline: string, feedback: string) {
  return [
    youTransitReadingPrompt({ brief, headline }),
    "",
    "PROVIDER RESPONSE CONTRACT",
    "Return exactly four JSON fields: headline, tldr, summary, body.",
    feedback ? `\nRETRY CORRECTION\n${feedback}` : ""
  ].filter(Boolean).join("\n");
}

function validateGeneratedReading(
  draft: GeneratedTransitReadingDraft,
  brief: YouTransitReadingBrief,
  expectedHeadline: string
) {
  const factLock = validateYouTransitReadingDraft({ draft, brief, expectedHeadline });
  if (!factLock.passed) {
    return {
      passed: false,
      message: `You report failed fact lock: ${factLock.issues.map((issue) => `${issue.code}: ${issue.message}`).join(" ")}`
    };
  }

  const writingValidation = validateCopy(draft, {
    validationProfile: "shared-only",
    family: "you-transit-reading",
    register: "second_person"
  });
  if (!writingValidation.passed) {
    return {
      passed: false,
      message: `You report failed writing validation: ${writingValidation.violations.map((issue: { category?: string; detail?: string }) => `${issue.category ?? "rule"}: ${issue.detail ?? "failed"}`).join("; ")}`
    };
  }
  return { passed: true };
}

async function generateReading(brief: YouTransitReadingBrief, headline: string) {
  return generateGovernedTransitReading({
    brief,
    headline,
    contentType: brief.window === "day" ? "you_day_reading" : "you_week_reading",
    surface: "you",
    family: "you-transit-reading",
    schemaName: "tldr_astro_you_transit_reading",
    toolDescription: `Return the TLDR Astro in-depth ${brief.window} transit reading.`,
    promptForAttempt,
    validate: validateGeneratedReading,
    compactBriefForRecovery: compactYouTransitReadingBrief,
    minSummaryLength: 40,
    minBodyLength: brief.window === "day" ? 180 : 320,
    maxBodyLength: brief.window === "day" ? 2200 : 4200,
    claudeMaxTokens: brief.window === "day" ? 2200 : 3200,
    recoveryLabel: brief.window === "day" ? "You day report" : "You week report"
  });
}

async function existingReading(
  userId: string,
  locked: ReturnType<typeof youTransitReadingRequestLock>
) {
  const admin = createSupabaseReportAdmin();
  return admin.selectOne<YouTransitReadingRow>(
    "user_generated_interpretations",
    new URLSearchParams({
      user_id: `eq.${userId}`,
      subject_type: `eq.${locked.subjectType}`,
      subject_id: `eq.${locked.subjectId}`,
      content_key: `eq.${locked.contentKey}`,
      target_date: `eq.${locked.brief.targetDate}`,
      mode: "eq.in_depth",
      select: "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,provider,model,updated_at,you_report_entitlement_id",
      order: "updated_at.desc"
    })
  );
}

async function saveReading(input: {
  userId: string;
  entitlementId?: string | null;
  locked: ReturnType<typeof youTransitReadingRequestLock>;
  generated: GeneratedTransitReadingDraft;
  provider: "openai" | "claude";
}) {
  const admin = createSupabaseReportAdmin();
  return admin.insert<YouTransitReadingRow>("user_generated_interpretations", {
    user_id: input.userId,
    subject_type: input.locked.subjectType,
    subject_id: input.locked.subjectId,
    content_key: input.locked.contentKey,
    surface: input.locked.surface,
    mode: input.locked.mode,
    status: "DRAFT",
    event_type: input.locked.eventType,
    target_date: input.locked.brief.targetDate,
    facts: input.locked.facts,
    knowledge_ids: input.locked.knowledgeIds,
    source_snapshot: input.locked.sourceSnapshot,
    prompt_version: YOU_TRANSIT_READING_PROMPT_VERSION,
    provider: input.provider,
    model: input.generated.model,
    headline: input.generated.headline,
    summary: input.generated.summary,
    body: input.generated.body,
    sections: { sections: [], sceneLock: null, astrologyDrilldown: null },
    response_id: input.generated.responseId,
    error: null,
    ...(input.entitlementId ? { you_report_entitlement_id: input.entitlementId } : {})
  }, { onConflict: "user_id,subject_type,subject_id,content_key,target_date,mode" });
}

export async function generateYouTransitReadingForUser(input: {
  userId: string;
  facts?: Record<string, unknown>;
  entitlementId?: string | null;
}) {
  const locked = youTransitReadingRequestLock({ brief: input.facts?.youTransitReadingBrief });
  const existing = await existingReading(input.userId, locked);
  if (existing && ["DRAFT", "REVIEWED", "LIVE"].includes(existing.status) && existing.body.trim()) {
    return { reused: true, contentKey: locked.contentKey, saved: [existing], generated: null };
  }

  const { draft, provider } = await generateReading(locked.brief, locked.headline);
  const saved = await saveReading({
    userId: input.userId,
    entitlementId: input.entitlementId,
    locked,
    generated: draft,
    provider
  });
  return { reused: false, contentKey: locked.contentKey, saved, generated: draft };
}
