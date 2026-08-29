import type { IncomingMessage, ServerResponse } from "node:http";
import fallbackRows from "../../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
import placementInterim from "../../apps/web/src/content/fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json";
import fallbackTemplates from "../../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json";
// The generated package bundle is the production renderer used by the reader app.
// @ts-ignore The generated JavaScript bundle intentionally has no declaration file.
import { createFallbackRenderer } from "../../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

type PackageRow = Record<string, unknown> & {
  contentKey: string;
  content_role: string;
  review_status: string;
};

const planets = new Set(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "lilith", "north-node", "south-node"]);
const signs = new Set(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]);

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
    if (size > 512_000) throw new Error("Preview request is too large.");
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function normalizeInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Preview selection is missing.");
  const input = value as Record<string, unknown>;
  const planet = typeof input.planet === "string" ? input.planet : "";
  const sign = typeof input.sign === "string" ? input.sign : "";
  const house = typeof input.house === "string" ? input.house : "";
  const audience = input.audience === "they" ? "they" : "you";
  if (!planets.has(planet) || !signs.has(sign) || !/^(?:[1-9]|1[0-2])$/u.test(house)) throw new Error("Choose a valid planet, sign, and house.");
  if (!Array.isArray(input.overrides) || input.overrides.length > 32) throw new Error("Preview source overrides are invalid.");
  const overrides = input.overrides.filter((candidate): candidate is PackageRow => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const row = candidate as Record<string, unknown>;
    return typeof row.contentKey === "string"
      && row.contentKey.startsWith("fallback-")
      && typeof row.content_role === "string"
      && typeof row.review_status === "string";
  });
  return { audience, house, overrides, planet, sign };
}

function renderPreview(input: ReturnType<typeof normalizeInput>) {
  const hooks = new Map((fallbackRows.hookRows as unknown as PackageRow[]).map((row) => [row.contentKey, row]));
  const vocabulary = new Map(([
    ...(fallbackRows.vocabularyRows as unknown as PackageRow[]),
    ...(placementInterim.vocabularyRows as unknown as PackageRow[])
  ]).map((row) => [row.contentKey, row]));
  const templates = new Map(([
    ...(fallbackTemplates.templates as unknown as PackageRow[]),
    ...(placementInterim.templates as unknown as PackageRow[])
  ]).map((row) => [row.contentKey, row]));

  input.overrides.forEach((row) => {
    if (row.contentKey.startsWith("fallback-template/")) templates.set(row.contentKey, row);
    else if (row.contentKey.startsWith("fallback-vocab/")) vocabulary.set(row.contentKey, row);
    else hooks.set(row.contentKey, row);
  });

  const renderer = createFallbackRenderer(
    { templates: [...templates.values()] },
    { hookRows: [...hooks.values()], vocabularyRows: [...vocabulary.values()] }
  );
  return renderer.renderNatalPlacement({
    house: Number(input.house),
    planet: input.planet,
    sign: input.sign,
    voice: input.audience === "you" ? "you" : "Maya"
  });
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
    const rendered = renderPreview(normalizeInput(await readJsonBody(req)));
    sendJson(res, 200, { ok: true, rendered });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : "The reader preview could not be assembled." });
  }
}
