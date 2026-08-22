import type { IncomingMessage, ServerResponse } from "node:http";
import { currentSkyFacts } from "../_lib/current-sky.js";
import { generateSkyArticleTemplateSlots } from "../_lib/content-generation.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { skyArticleEditionFactsFromSnapshot } from "../_lib/sky-article-facts.js";
import {
  skyArticleTemplateSlotNeedsAdditionalFacts,
  unfinishedSkyArticleTemplateSlots
} from "../_lib/sky-article-template-slots.js";
import { skyArticleTemplatePlaceholders } from "../../apps/web/src/content/skyArticleTemplateCompiler.js";

loadLocalWebEnv();

type TemplateRow = {
  id: string;
  content_key: string;
  headline?: string | null;
  body?: string | null;
  status?: string | null;
  lane?: string | null;
  review_state?: string | null;
  event_type?: string | null;
  source_snapshot?: Record<string, unknown> | null;
};

type RequestBody = {
  templateId?: string;
  referenceDate?: string;
  existingSlotValues?: Record<string, unknown>;
  provider?: "openai" | "claude" | "anthropic";
  voiceNotes?: string;
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function isAuthorized(req: IncomingMessage) {
  const secret = process.env.CONTENT_GENERATION_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.authorization === `Bearer ${secret}`;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > 256_000) throw new Error("Request body is too large.");
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as RequestBody;
}

function adminHeaders() {
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, authorization: `Bearer ${key}` };
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL")).replace(/\/$/u, "");
}

async function loadApprovedTemplate(templateId: string) {
  const params = new URLSearchParams({
    id: `eq.${templateId}`,
    select: "id,content_key,headline,body,status,lane,review_state,event_type,source_snapshot",
    limit: "1"
  });
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null) as TemplateRow[] | { message?: string } | null;
  if (!response.ok) {
    throw new Error(`Could not load the canonical template: ${JSON.stringify(payload)}`);
  }
  const row = Array.isArray(payload) ? payload[0] : null;
  if (!row) throw new Error("The selected Sky article template no longer exists.");

  const reviewStatus = typeof row.source_snapshot?.review_status === "string"
    ? row.source_snapshot.review_status.trim().toLowerCase()
    : "";
  const approved = ["REVIEWED", "LIVE"].includes(row.status ?? "")
    && (row.lane ?? "reference") === "reference"
    && !row.review_state
    && ["approved", "approved_reuse", "reviewed"].includes(reviewStatus);
  if (row.event_type !== "sky-article-template" || !approved) {
    throw new Error("AI fields can be generated only from an approved, non-serving Sky article template.");
  }
  if (!row.body?.trim()) throw new Error("The selected Sky article template has no body.");
  return row;
}

function templatePlanet(row: TemplateRow) {
  const fromKey = row.content_key.match(/^sky(?:\/|-)article-template\/([a-z-]+)\//u)?.[1];
  if (fromKey && !["slow-mover", "nodes"].includes(fromKey)) return fromKey;
  return row.headline?.match(/(?:article\s+—\s+)?([A-Za-z-]+)\s+(?:Enters|in)\b/u)?.[1]?.toLowerCase() ?? null;
}

function existingStringValues(value: Record<string, unknown> | undefined) {
  return Object.fromEntries(Object.entries(value ?? {})
    .filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Use POST." });
    return;
  }
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    if (!body.templateId?.trim()) throw new Error("templateId is required.");
    const referenceDate = body.referenceDate ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(referenceDate)) throw new Error("referenceDate must be YYYY-MM-DD.");

    const template = await loadApprovedTemplate(body.templateId.trim());
    const planet = templatePlanet(template);
    if (!planet) throw new Error("The selected template does not identify one Sky planet.");
    const snapshot = await currentSkyFacts(new Date(`${referenceDate}T12:00:00.000Z`));
    const facts = skyArticleEditionFactsFromSnapshot(snapshot, planet);
    const placeholders = skyArticleTemplatePlaceholders(template.body ?? "")
      .filter((placeholder) => placeholder.name !== "risingBlocks");
    const existingSlotValues = existingStringValues(body.existingSlotValues);
    const unfinished = unfinishedSkyArticleTemplateSlots({
      placeholders,
      calculatedSlotValues: facts.slotValues,
      existingSlotValues
    });
    const blockedSlots = unfinished.filter(skyArticleTemplateSlotNeedsAdditionalFacts);
    const requestedSlots = unfinished.filter((slot) => !skyArticleTemplateSlotNeedsAdditionalFacts(slot));
    if (!requestedSlots.length) {
      sendJson(res, 200, {
        ok: true,
        slotValues: {},
        blockedSlots,
        facts,
        generation: null,
        message: blockedSlots.length
          ? "The remaining fields require governed dates, aspects, or historical source facts and were not sent to the model."
          : "There are no unfinished AI-eligible template fields."
      });
      return;
    }

    const generation = await generateSkyArticleTemplateSlots({
      templateKey: template.content_key.replace(/^sky-article-template\//u, "sky/article-template/"),
      templateBody: template.body ?? "",
      planet: facts.planet,
      sign: facts.sign,
      facts,
      requestedSlots,
      provider: body.provider,
      voiceNotes: body.voiceNotes
    });
    sendJson(res, 200, {
      ok: true,
      slotValues: generation.slotValues,
      blockedSlots,
      facts,
      generation: {
        provider: generation.provider,
        model: generation.model,
        responseId: generation.responseId ?? null,
        generatedAt: generation.generatedAt,
        requestedSlots: generation.requestedSlots,
        generationMetadata: generation.generation_metadata ?? null
      }
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Sky article template slot error."
    });
  }
}
