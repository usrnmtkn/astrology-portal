import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ContentGenerationHardEditorialError,
  ContentGenerationQualityError,
  generateContent,
  hardEditorialFailureResponse,
  natalPlacementGenerationSafetySummary,
  saveGeneratedInterpretation,
  type GenerateContentInput
} from "./_lib/content-generation.js";
import { contentGenerationProvider } from "./_lib/provider-config.js";

type AdminGenerateContentInput = GenerateContentInput & {
  save?: boolean;
};

async function readJsonBody(req: IncomingMessage) {
  const parsedBody = (req as IncomingMessage & { body?: unknown }).body;

  if (parsedBody && typeof parsedBody === "object") {
    return parsedBody as AdminGenerateContentInput;
  }

  if (typeof parsedBody === "string" && parsedBody.trim()) {
    return JSON.parse(parsedBody) as AdminGenerateContentInput;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody.trim()) {
    throw new Error("Generate content request body was empty.");
  }

  return JSON.parse(rawBody) as AdminGenerateContentInput;
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function adminDraftFailureMetadata(input: GenerateContentInput | null, violations: string[]) {
  if (!input) {
    return {
      title: "",
      draftBody: null,
      appBody: null,
      editStatus: "needs_generation",
      sourceType: "generation_failed",
      sourceIds: [],
      sourcePaths: [],
      provider: contentGenerationProvider(),
      model: null,
      providerKeyPresent: false,
      retryCount: null,
      violations,
      softWarnings: [],
      styleNotes: [],
      sourceSafety: {
        sourceBodyExcluded: true,
        astrologyBodySent: false,
        tarotNotesExcluded: true,
        businessNotesExcluded: true,
        authoredSourceGenerationAllowed: envFlagEnabled("ALLOW_PRIVATE_SOURCE_MODEL_GENERATION") || envFlagEnabled("ALLOW_AUTHORED_SOURCE_MODEL_GENERATION")
      }
    };
  }

  return adminDraftMetadata(input, undefined, violations);
}

function isAuthorized(req: IncomingMessage) {
  const secret = process.env.CONTENT_GENERATION_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return req.headers.authorization === `Bearer ${secret}`;
}

function envFlagEnabled(name: string) {
  return ["1", "true", "yes", "on", "enabled"].includes(String(process.env[name] ?? "").trim().toLowerCase());
}

function providerFromInput(input: GenerateContentInput) {
  return contentGenerationProvider({
    requestedProvider: input.provider,
    blockType: typeof input.facts.blockType === "string" ? input.facts.blockType : null,
    contentType: typeof input.facts.contentType === "string" ? input.facts.contentType : null
  });
}

function providerKeyPresent(provider: string) {
  if (provider === "claude" || provider === "anthropic") {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  if (provider === "openai") {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  return false;
}

function adminDraftMetadata(input: GenerateContentInput, generated?: Awaited<ReturnType<typeof generateContent>>, violations: string[] = []) {
  const provider = providerFromInput(input);
  const safety = natalPlacementGenerationSafetySummary(input);

  return {
    title: generated?.headline ?? input.headline ?? "",
    draftBody: generated?.body ?? null,
    appBody: null,
    editStatus: generated ? "needs_review" : "needs_generation",
    sourceType: generated ? "generated_draft" : "generation_failed",
    sourceIds: safety.sourceIds,
    sourcePaths: safety.sourcePaths,
    provider,
    model: generated?.model ?? null,
    providerKeyPresent: providerKeyPresent(provider),
    retryCount: generated?.retryCount ?? null,
    violations,
    softWarnings: generated?.softWarnings ?? [],
    styleNotes: generated?.styleNotes ?? [],
    sourceSafety: safety.sourceSafety
  };
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

  let input: AdminGenerateContentInput | null = null;

  try {
    input = await readJsonBody(req);
    const adminSafety = natalPlacementGenerationSafetySummary(input);
    const sourceSnapshot = adminSafety.isPrimaryNatalPlacement
      ? {
          ...(input.sourceSnapshot ?? {}),
          adminDraftGeneration: {
            sourceIds: adminSafety.sourceIds,
            sourcePaths: adminSafety.sourcePaths,
            sourceSafety: adminSafety.sourceSafety,
            provider: providerFromInput(input)
          }
        }
      : input.sourceSnapshot;
    const generationInput = {
      ...input,
      sourceSnapshot
    };
    const generated = await generateContent(generationInput);
    const saved = input.save === false ? [] : await saveGeneratedInterpretation(generationInput, generated);

    sendJson(res, 200, {
      ok: true,
      contentKey: input.contentKey,
      generated,
      saved,
      adminDraft: adminDraftMetadata(generationInput, generated)
    });
  } catch (error) {
    if (error instanceof ContentGenerationHardEditorialError) {
      sendJson(res, 422, {
        ok: false,
        errorType: "hard_editorial_violation",
        error: error.message,
        ...hardEditorialFailureResponse(error),
        adminDraft: adminDraftFailureMetadata(input, error.violations)
      });
      return;
    }

    const isQualityError = error instanceof ContentGenerationQualityError;
    const message = error instanceof Error ? error.message : "Unknown generation error.";

    sendJson(res, isQualityError ? 422 : 500, {
      ok: false,
      error: isQualityError
        ? `Quality gate rejected this draft after retries. Click Generate again or narrow the row facts, voice notes, or headline. Last guidance: ${message}`
        : message,
      errorType: isQualityError ? "quality_gate" : "generation_error"
    });
  }
}
