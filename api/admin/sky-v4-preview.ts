import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
// The canonical stage resolver is shared by Content Studio and the future serving promotion.
// @ts-ignore The governed JavaScript resolver intentionally has no declaration file.
import { renderSkyV4StudioPreview } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";

loadLocalWebEnv();
const require = createRequire(import.meta.url);
const corpus = require("../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json");

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "private, no-store");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > 1_000_000) throw new Error("Preview request is too large.");
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

export function normalizeSkyV4PreviewInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Preview selection is missing.");
  const input = value as Record<string, unknown>;
  const contentKey = typeof input.contentKey === "string" ? input.contentKey : "";
  if (!/^(?:sky-placement|sky-lunation|sky-nodes|sky-lilith|sky-context|sky-v4)\//u.test(contentKey)) {
    throw new Error("Choose a canonical SKY V4 content record.");
  }
  const draftFields = input.draftFields && typeof input.draftFields === "object" && !Array.isArray(input.draftFields)
    ? input.draftFields as Record<string, unknown>
    : {};
  if (Object.keys(draftFields).length > 16) throw new Error("Too many draft fields were supplied.");
  return { contentKey, draftFields };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST." });
    return;
  }
  try {
    const input = normalizeSkyV4PreviewInput(await readJsonBody(req));
    const rendered = renderSkyV4StudioPreview(corpus, input);
    sendJson(res, 200, { ok: true, rendered });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : "The SKY V4 preview could not be assembled." });
  }
}
