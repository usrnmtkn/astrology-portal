import { contentGenerationProvider } from "./provider-config.js";
import {
  FRIEND_TRANSIT_READING_PROMPT_VERSION,
  friendTransitReadingPrompt,
  friendTransitReadingRequestLock,
  validateFriendTransitReadingDraft,
  type FriendTransitReadingBrief,
  type FriendTransitReadingDraft
} from "./friend-transit-reading.js";
import {
  claimFriendReportJob,
  claimFriendReportJobs,
  completeFriendReportJob,
  retryFriendReportJob,
  type FriendReportJobRow
} from "./friend-report-lifecycle.js";
import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.js";
import { callOpenAIResponses } from "../../src/astro-writing/openAIResponses.cjs";
import { validateCopy } from "../../src/astro-writing/validateCopy.mjs";

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
};

type ProviderPayload = {
  headline?: unknown;
  tldr?: unknown;
  summary?: unknown;
  body?: unknown;
};

type GeneratedFriendTransitReading = FriendTransitReadingDraft & {
  model: string;
  responseId?: string;
  retryCount: number;
};

class FriendTransitReadingQualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FriendTransitReadingQualityError";
  }
}

export const FRIEND_TRANSIT_READING_PROVIDER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "tldr", "summary", "body"],
  properties: {
    headline: { type: "string" },
    tldr: { type: "string" },
    summary: { type: "string" },
    body: { type: "string" }
  }
} as const;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function generationProvider() {
  return contentGenerationProvider({ contentType: "friend_transit_reading" });
}

function responseOutputText(payload: {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
}) {
  if (payload.output_text) return payload.output_text;
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join("\n")
    .trim();
}

function claudeToolInput(payload: {
  content?: Array<{ type?: string; name?: string; input?: unknown }>;
}) {
  return payload.content?.find((item) => (
    item.type === "tool_use" &&
    item.name === "tldr_astro_friend_transit_reading" &&
    item.input
  ))?.input;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stripTldrPrefix(value: string) {
  return value.trim().replace(/^tldr\s*:\s*/iu, "").trim();
}

function normalizeProviderDraft(
  payload: ProviderPayload,
  expectedHeadline: string,
  model: string,
  responseId: string | undefined,
  retryCount: number
): GeneratedFriendTransitReading {
  const tldr = stripTldrPrefix(stringValue(payload.tldr) || stringValue(payload.summary));
  const body = stringValue(payload.body);
  if (!tldr || !body) {
    throw new FriendTransitReadingQualityError("The provider did not return a complete Friends reading.");
  }
  return {
    headline: expectedHeadline,
    tldr,
    summary: tldr,
    body,
    action: "",
    timing: "",
    sections: [],
    model,
    responseId,
    retryCount
  };
}

function validateGeneratedReading(
  draft: GeneratedFriendTransitReading,
  brief: FriendTransitReadingBrief,
  expectedHeadline: string
) {
  if (draft.summary.trim().length < 40) {
    throw new FriendTransitReadingQualityError("Friends reading summary is too thin.");
  }
  if (draft.body.trim().length < 180) {
    throw new FriendTransitReadingQualityError("Friends reading body is too thin.");
  }
  if (draft.body.includes("—") || draft.summary.includes("—")) {
    throw new FriendTransitReadingQualityError("Friends reading used an em dash.");
  }

  const factLock = validateFriendTransitReadingDraft({ draft, brief, expectedHeadline });
  if (!factLock.passed) {
    throw new FriendTransitReadingQualityError(
      `Friends reading failed fact lock: ${factLock.issues.map((issue) => `${issue.code}: ${issue.message}`).join(" ")}`
    );
  }

  const writingValidation = validateCopy(draft, {
    validationProfile: "friends-transit",
    family: "friend-transit-reading",
    register: "third_person"
  });
  if (!writingValidation.passed) {
    throw new FriendTransitReadingQualityError(
      `Friends reading failed writing validation: ${writingValidation.violations.map((issue: { category?: string; detail?: string }) => `${issue.category ?? "rule"}: ${issue.detail ?? "failed"}`).join("; ")}`
    );
  }
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

async function generateOpenAI(
  brief: FriendTransitReadingBrief,
  headline: string,
  feedback: string,
  retryCount: number
) {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_GENERATION_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const { response, payload } = await callOpenAIResponses({
    apiKey,
    role: "WRITER",
    surface: "friends",
    family: "friends-transit",
    request: {
      model,
      input: promptForAttempt(brief, headline, feedback),
      text: {
        format: {
          type: "json_schema",
          name: "tldr_astro_friend_transit_reading",
          strict: true,
          schema: FRIEND_TRANSIT_READING_PROVIDER_SCHEMA
        }
      }
    }
  });
  const typedPayload = payload as {
    id?: string;
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(typedPayload.error?.message ?? `OpenAI Friends reading request failed with ${response.status}.`);
  const output = responseOutputText(typedPayload);
  if (!output) throw new Error("OpenAI Friends reading response did not include generated text.");
  return normalizeProviderDraft(JSON.parse(output) as ProviderPayload, headline, model, typedPayload.id, retryCount);
}

async function generateClaude(
  brief: FriendTransitReadingBrief,
  headline: string,
  feedback: string,
  retryCount: number
) {
  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 2200,
      messages: [{ role: "user", content: [{ type: "text", text: promptForAttempt(brief, headline, feedback) }] }],
      tools: [{
        name: "tldr_astro_friend_transit_reading",
        description: "Return the short TLDR Astro Friends transit reading.",
        input_schema: FRIEND_TRANSIT_READING_PROVIDER_SCHEMA
      }],
      tool_choice: { type: "tool", name: "tldr_astro_friend_transit_reading" }
    })
  });
  const payload = await response.json().catch(() => null) as {
    id?: string;
    content?: Array<{ type?: string; name?: string; input?: unknown }>;
    error?: { message?: string };
  } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? `Claude Friends reading request failed with ${response.status}.`);
  const toolInput = payload ? claudeToolInput(payload) : null;
  if (!toolInput || typeof toolInput !== "object" || Array.isArray(toolInput)) {
    throw new Error("Claude Friends reading response did not include generated content.");
  }
  return normalizeProviderDraft(toolInput as ProviderPayload, headline, model, payload?.id, retryCount);
}

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

export async function generateFriendTransitReading(brief: FriendTransitReadingBrief, headline: string) {
  const provider = generationProvider();
  let feedback = "";
  let lastQualityError: FriendTransitReadingQualityError | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const draft = provider === "claude"
        ? await generateClaude(brief, headline, feedback, attempt)
        : await generateOpenAI(brief, headline, feedback, attempt);
      validateGeneratedReading(draft, brief, headline);
      return { draft, provider };
    } catch (error) {
      if (!(error instanceof FriendTransitReadingQualityError)) throw error;
      lastQualityError = error;
      feedback = `${error.message}\nRewrite the short reading from the same governed brief. Do not add new facts, examples, sections, or technical claims.`;
    }
  }

  const recoveryBrief = compactBriefForRecovery(brief);
  const recoveryFeedback = [
    lastQualityError?.message ?? "The earlier draft did not pass the Friends reading quality lock.",
    "Final recovery attempt: use only the strongest evidence in this reduced governed brief.",
    "Keep the synthesis plain and concise. Do not add facts, examples, sections, dates, houses, signs, or technical claims that are not explicitly supplied."
  ].join("\n");
  const draft = provider === "claude"
    ? await generateClaude(recoveryBrief, headline, recoveryFeedback, 2)
    : await generateOpenAI(recoveryBrief, headline, recoveryFeedback, 2);
  validateGeneratedReading(draft, recoveryBrief, headline);
  return { draft, provider };
}

export async function existingFriendTransitReading(input: {
  admin?: SupabaseReportAdmin;
  userId: string;
  subjectId: string;
  contentKey: string;
  targetDate: string;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  return admin.selectOne<FriendTransitReadingRow>(
    "user_generated_interpretations",
    new URLSearchParams({
      user_id: `eq.${input.userId}`,
      subject_type: "eq.friend_transit_reading",
      subject_id: `eq.${input.subjectId}`,
      content_key: `eq.${input.contentKey}`,
      target_date: `eq.${input.targetDate}`,
      mode: "eq.in_depth",
      select: "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,provider,model,updated_at",
      order: "updated_at.desc"
    })
  );
}

export async function saveFriendTransitReading(input: {
  admin?: SupabaseReportAdmin;
  userId: string;
  subjectId: string;
  targetDate: string;
  locked: ReturnType<typeof friendTransitReadingRequestLock>;
  generated: GeneratedFriendTransitReading;
  provider: "openai" | "claude";
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
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
    error: null
  }, { onConflict: "user_id,subject_type,subject_id,content_key,target_date,mode" });
}

export async function processClaimedFriendReportJob(job: FriendReportJobRow) {
  const admin = createSupabaseReportAdmin();
  try {
    const locked = friendTransitReadingRequestLock({
      brief: job.brief,
      subjectId: job.subject_id,
      targetDate: job.target_date
    });
    const existing = await existingFriendTransitReading({
      admin,
      userId: job.user_id,
      subjectId: job.subject_id,
      contentKey: job.content_key,
      targetDate: job.target_date
    });
    if (existing && ["DRAFT", "REVIEWED", "LIVE"].includes(existing.status) && existing.body.trim()) {
      await completeFriendReportJob({ admin, jobId: job.id, resultId: existing.id });
      return { state: "complete" as const, saved: [existing], reused: true };
    }

    const { draft, provider } = await generateFriendTransitReading(locked.brief, locked.headline);
    const saved = await saveFriendTransitReading({
      admin,
      userId: job.user_id,
      subjectId: job.subject_id,
      targetDate: job.target_date,
      locked,
      generated: draft,
      provider
    });
    const row = saved[0];
    if (!row?.id) throw new Error("Friends report save did not return a saved reading.");
    await completeFriendReportJob({ admin, jobId: job.id, resultId: row.id });
    return { state: "complete" as const, saved, generated: draft, reused: false };
  } catch (error) {
    const state = await retryFriendReportJob({ admin, job, error });
    console.error("friend report job failed", { jobId: job.id, state, error });
    return { state, saved: [] as FriendTransitReadingRow[], error };
  }
}

export async function claimAndProcessFriendReportJob(jobId: string, workerId: string) {
  const job = await claimFriendReportJob({ workerId, jobId });
  if (!job) return { state: "not_claimed" as const, saved: [] as FriendTransitReadingRow[] };
  return processClaimedFriendReportJob(job);
}

export async function runFriendReportQueueBatch(workerId: string, limit = 3) {
  const jobs = await claimFriendReportJobs({ workerId, limit });
  const results = [];
  for (const job of jobs) {
    results.push({ jobId: job.id, ...(await processClaimedFriendReportJob(job)) });
  }
  return { claimed: jobs.length, results };
}
