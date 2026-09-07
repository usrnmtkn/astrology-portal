import {
  FRIEND_TRANSIT_READING_PROMPT_VERSION,
  friendTransitReadingPrompt,
  friendTransitReadingRequestLock,
  validateFriendTransitReadingDraft,
  type FriendTransitReadingBrief
} from "./friend-transit-reading.js";
import { createSupabaseReportAdmin } from "./supabase-report-admin.js";
import {
  generateGovernedTransitReading,
  TRANSIT_READING_PROVIDER_SCHEMA,
  type GeneratedTransitReadingDraft
} from "./transit-reading-generation.js";
import { validateCopy } from "../../src/astro-writing/validateCopy.mjs";

export const FRIEND_TRANSIT_READING_PROVIDER_SCHEMA = {
  ...TRANSIT_READING_PROVIDER_SCHEMA,
  required: ["headline", "tldr", "summary", "body"]
} as const;

export type FriendTransitReadingRow = {
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
  friend_report_entitlement_id?: string | null;
};

function compactBriefForRecovery(brief: FriendTransitReadingBrief): FriendTransitReadingBrief {
  const primaryThemes = brief.primaryThemes.slice(0, 2);
  const longerCycles = brief.longerCycles.slice(0, 2);
  const relationshipActivations = brief.relationshipActivations.slice(0, 1);
  const houseContext = brief.houseContext.slice(0, 2);
  const activePatterns = brief.activePatterns.slice(0, 1);
  return {
    ...brief,
    primaryThemes,
    relationshipActivations,
    houseContext,
    longerCycles,
    activePatterns,
    counts: {
      ...brief.counts,
      primaryThemes: primaryThemes.length,
      relationshipActivations: relationshipActivations.length,
      houseContext: houseContext.length,
      longerCycles: longerCycles.length,
      activePatterns: activePatterns.length
    }
  };
}

function promptForAttempt(brief: FriendTransitReadingBrief, headline: string, feedback: string) {
  return [
    friendTransitReadingPrompt({ brief, headline }),
    "",
    "PROVIDER RESPONSE CONTRACT",
    "Return exactly four JSON fields: headline, tldr, summary, body.",
    "Do not return action, timing, sections, sceneLock, or astrologyDrilldown. The server supplies those empty fields after validation.",
    feedback ? `\nRETRY CORRECTION\n${feedback}` : ""
  ].filter(Boolean).join("\n");
}

function validateGeneratedReading(
  draft: GeneratedTransitReadingDraft,
  brief: FriendTransitReadingBrief,
  expectedHeadline: string
) {
  const factLock = validateFriendTransitReadingDraft({ draft, brief, expectedHeadline });
  if (!factLock.passed) {
    return {
      passed: false,
      message: `Friends reading failed fact lock: ${factLock.issues.map((issue) => `${issue.code}: ${issue.message}`).join(" ")}`
    };
  }

  const writingValidation = validateCopy(draft, {
    validationProfile: "friends-transit",
    family: "friend-transit-reading",
    register: "third_person"
  });
  if (!writingValidation.passed) {
    return {
      passed: false,
      message: `Friends reading failed writing validation: ${writingValidation.violations.map((issue: { category?: string; detail?: string }) => `${issue.category ?? "rule"}: ${issue.detail ?? "failed"}`).join("; ")}`
    };
  }
  return { passed: true };
}

async function generateReading(brief: FriendTransitReadingBrief, headline: string) {
  return generateGovernedTransitReading({
    brief,
    headline,
    contentType: "friend_transit_reading",
    surface: "friends",
    family: "friends-transit",
    schemaName: "tldr_astro_friend_transit_reading",
    toolDescription: "Return the short TLDR Astro Friends transit reading.",
    promptForAttempt,
    validate: validateGeneratedReading,
    compactBriefForRecovery,
    minSummaryLength: 40,
    minBodyLength: 180,
    claudeMaxTokens: 2200,
    recoveryLabel: "Friends reading"
  });
}

async function existingReading(userId: string, subjectId: string, contentKey: string, targetDate: string) {
  const admin = createSupabaseReportAdmin();
  return admin.selectOne<FriendTransitReadingRow>(
    "user_generated_interpretations",
    new URLSearchParams({
      user_id: `eq.${userId}`,
      subject_type: "eq.friend_transit_reading",
      subject_id: `eq.${subjectId}`,
      content_key: `eq.${contentKey}`,
      target_date: `eq.${targetDate}`,
      mode: "eq.in_depth",
      select: "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,provider,model,updated_at,friend_report_entitlement_id",
      order: "updated_at.desc"
    })
  );
}

async function saveReading(input: {
  userId: string;
  subjectId: string;
  targetDate: string;
  entitlementId?: string | null;
  locked: ReturnType<typeof friendTransitReadingRequestLock>;
  generated: GeneratedTransitReadingDraft;
  provider: "openai" | "claude";
}) {
  const admin = createSupabaseReportAdmin();
  return admin.insert<FriendTransitReadingRow>("user_generated_interpretations", {
    user_id: input.userId,
    subject_type: "friend_transit_reading",
    subject_id: input.subjectId,
    content_key: input.locked.contentKey,
    surface: input.locked.surface,
    mode: input.locked.mode,
    status: "DRAFT",
    event_type: input.locked.eventType,
    target_date: input.targetDate,
    facts: input.locked.facts,
    knowledge_ids: input.locked.knowledgeIds,
    source_snapshot: input.locked.sourceSnapshot,
    prompt_version: FRIEND_TRANSIT_READING_PROMPT_VERSION,
    provider: input.provider,
    model: input.generated.model,
    headline: input.generated.headline,
    summary: input.generated.summary,
    body: input.generated.body,
    sections: { sections: [], sceneLock: null, astrologyDrilldown: null },
    response_id: input.generated.responseId,
    error: null,
    ...(input.entitlementId ? { friend_report_entitlement_id: input.entitlementId } : {})
  }, { onConflict: "user_id,subject_type,subject_id,content_key,target_date,mode" });
}

export async function generateFriendTransitReadingForUser(input: {
  userId: string;
  subjectId: string;
  targetDate: string;
  facts?: Record<string, unknown>;
  entitlementId?: string | null;
}) {
  const locked = friendTransitReadingRequestLock({
    brief: input.facts?.friendTransitsBrief,
    subjectId: input.subjectId,
    targetDate: input.targetDate
  });
  const existing = await existingReading(input.userId, input.subjectId, locked.contentKey, input.targetDate);
  if (existing && ["DRAFT", "REVIEWED", "LIVE"].includes(existing.status) && existing.body.trim()) {
    return { reused: true, contentKey: locked.contentKey, saved: [existing], generated: null };
  }

  const { draft, provider } = await generateReading(locked.brief, locked.headline);
  const saved = await saveReading({
    userId: input.userId,
    subjectId: input.subjectId,
    targetDate: input.targetDate,
    entitlementId: input.entitlementId,
    locked,
    generated: draft,
    provider
  });
  return { reused: false, contentKey: locked.contentKey, saved, generated: draft };
}
