import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ContentGenerationQualityError,
  generateContent,
  saveGeneratedInterpretation,
  type GenerateContentInput
} from "./_lib/content-generation.js";

type AdminGenerateContentInput = GenerateContentInput & {
  save?: boolean;
};

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as AdminGenerateContentInput;
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function isAuthorized(req: IncomingMessage) {
  const secret = process.env.CONTENT_GENERATION_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return req.headers.authorization === `Bearer ${secret}`;
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
    const input = await readJsonBody(req);
    const generated = await generateContent(input);
    const saved = input.save === false ? [] : await saveGeneratedInterpretation(input, generated);

    sendJson(res, 200, {
      ok: true,
      contentKey: input.contentKey,
      generated,
      saved
    });
  } catch (error) {
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
