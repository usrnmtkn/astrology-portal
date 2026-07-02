import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ContentGenerationHardEditorialError,
  ContentGenerationQualityError,
  generateContent,
  hardEditorialFailureResponse,
  type GenerateContentInput,
  type StoredGeneratedContent
} from "./_lib/content-generation.js";
import { contentGenerationProvider } from "./_lib/provider-config.js";

type UserContentSubjectType =
  | "you_update"
  | "you_transit"
  | "natal_summary"
  | "natal_placement"
  | "natal_aspect"
  | "synastry_summary"
  | "synastry_aspect"
  | "composite_summary"
  | "composite_placement"
  | "composite_aspect";

type UserContentRequest = GenerateContentInput & {
  subjectType: UserContentSubjectType;
  subjectId: string;
  status?: "DRAFT" | "LIVE";
};

type SupabaseUserPayload = {
  id?: string;
  user?: {
    id?: string;
  };
  error?: string;
  msg?: string;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function supabaseAnonKey() {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    serviceRoleKey()
  );
}

function contentProvider() {
  return contentGenerationProvider();
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as UserContentRequest;
}

function bearerToken(req: IncomingMessage) {
  const header = req.headers.authorization;
  const match = header?.match(/^Bearer\s+(.+)$/i);

  return match?.[1] ?? "";
}

async function requireAuthenticatedUser(req: IncomingMessage) {
  const token = bearerToken(req);

  if (!token) {
    throw new Error("Sign in before generating personalized content.");
  }

  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey(),
      authorization: `Bearer ${token}`
    }
  });
  const payload = await response.json().catch(() => null) as SupabaseUserPayload | null;
  const userId = payload?.id ?? payload?.user?.id;

  if (!response.ok || !userId) {
    throw new Error(payload?.error ?? payload?.msg ?? "Could not verify signed-in user.");
  }

  return userId;
}

function generatedSections(generated: StoredGeneratedContent) {
  return {
    sections: generated.sections ?? [],
    sceneLock: generated.sceneLock ?? null,
    astrologyDrilldown: generated.astrologyDrilldown ?? null
  };
}

type ExistingUserGeneratedRow = {
  id: string;
  status: string;
  content_key: string;
};

async function existingUserGeneratedInterpretation(userId: string, input: UserContentRequest) {
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    subject_type: `eq.${input.subjectType}`,
    subject_id: `eq.${input.subjectId}`,
    content_key: `eq.${input.contentKey}`,
    mode: `eq.${input.mode}`,
    select: "id,status,content_key",
    order: "updated_at.desc",
    limit: "1"
  });

  if (input.targetDate) {
    params.set("target_date", `eq.${input.targetDate}`);
  } else {
    params.set("target_date", "is.null");
  }

  const response = await fetch(`${supabaseUrl()}/rest/v1/user_generated_interpretations?${params.toString()}`, {
    headers: {
      apikey: serviceRoleKey(),
      authorization: `Bearer ${serviceRoleKey()}`
    }
  });
  const payload = await response.json().catch(() => null) as ExistingUserGeneratedRow[] | null;

  if (!response.ok) {
    throw new Error(`Supabase lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload?.[0] ?? null;
}

async function saveUserGeneratedInterpretation(
  userId: string,
  input: UserContentRequest,
  generated: StoredGeneratedContent
) {
  const status = input.status === "DRAFT" ? "DRAFT" : "LIVE";
  const response = await fetch(`${supabaseUrl()}/rest/v1/user_generated_interpretations?on_conflict=user_id,subject_type,subject_id,content_key,target_date,mode`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey(),
      authorization: `Bearer ${serviceRoleKey()}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      user_id: userId,
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      content_key: input.contentKey,
      surface: input.surface,
      mode: input.mode,
      status,
      event_type: input.eventType,
      target_date: input.targetDate,
      facts: input.facts,
      knowledge_ids: input.knowledgeIds ?? [],
      source_snapshot: input.sourceSnapshot ?? {},
      prompt_version: "tldr-astro-v4",
      provider: contentProvider(),
      model: generated.model,
      headline: generated.headline,
      summary: generated.summary,
      body: generated.body,
      sections: generatedSections(generated),
      response_id: generated.responseId
    })
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase save failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function generationInput(input: UserContentRequest): GenerateContentInput {
  return {
    contentKey: input.contentKey,
    surface: input.surface,
    mode: input.mode,
    eventType: input.eventType,
    headline: input.headline,
    targetDate: input.targetDate,
    facts: input.facts,
    knowledgeIds: input.knowledgeIds,
    sourceSnapshot: input.sourceSnapshot,
    voiceNotes: input.voiceNotes,
    allowQualityFallback: input.allowQualityFallback
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Use POST." });
    return;
  }

  try {
    const userId = await requireAuthenticatedUser(req);
    const input = await readJsonBody(req);
    const requestedStatus = input.status === "DRAFT" ? "DRAFT" : "LIVE";
    const existing = await existingUserGeneratedInterpretation(userId, input);

    if (requestedStatus === "DRAFT" && existing && (existing.status === "REVIEWED" || existing.status === "LIVE")) {
      sendJson(res, 200, {
        ok: true,
        contentKey: input.contentKey,
        skipped: true,
        status: existing.status,
        reason: "A reviewed or live write-up already exists."
      });
      return;
    }

    const generated = await generateContent(generationInput(input));
    const saved = await saveUserGeneratedInterpretation(userId, input, generated);

    sendJson(res, 200, {
      ok: true,
      contentKey: input.contentKey,
      generated,
      saved
    });
  } catch (error) {
    if (error instanceof ContentGenerationHardEditorialError) {
      sendJson(res, 422, {
        ok: false,
        errorType: "hard_editorial_violation",
        error: error.message,
        ...hardEditorialFailureResponse(error)
      });
      return;
    }

    if (error instanceof ContentGenerationQualityError) {
      sendJson(res, 422, {
        ok: false,
        errorType: "quality_gate",
        error: error.message
      });
      return;
    }

    console.error("generate-user-content failed", error);
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown personalized generation error."
    });
  }
}
