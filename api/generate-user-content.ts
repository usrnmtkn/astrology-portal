import type { IncomingMessage, ServerResponse } from "node:http";
import {
  generateContent,
  type GenerateContentInput,
  type StoredGeneratedContent
} from "./_lib/content-generation.js";

type UserContentSubjectType =
  | "you_update"
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
  return process.env.CONTENT_GENERATION_PROVIDER?.toLowerCase() ?? "openai";
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

async function saveUserGeneratedInterpretation(
  userId: string,
  input: UserContentRequest,
  generated: StoredGeneratedContent
) {
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
      status: "LIVE",
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
    voiceNotes: input.voiceNotes
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
    const generated = await generateContent(generationInput(input));
    const saved = await saveUserGeneratedInterpretation(userId, input, generated);

    sendJson(res, 200, {
      ok: true,
      contentKey: input.contentKey,
      generated,
      saved
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown personalized generation error."
    });
  }
}
