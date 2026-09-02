import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
// The generated package bundle is the production renderer used by the reader app.
// @ts-ignore The generated JavaScript bundle intentionally has no declaration file.
import { createFallbackRenderer } from "../../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

type PackageRow = Record<string, unknown> & {
  contentKey: string;
  content_role: string;
  review_status?: string;
};

type PreviewOverrideCandidate = {
  id: string;
  lane: string | null;
  packageRow: PackageRow;
  provider: string | null;
  status: string;
  updatedAt: string | null;
};

type IgnoredPreviewOverride = {
  contentKey: string;
  reason: "not-live" | "not-serving" | "wrong-provider" | "not-current-package-key" | "not-reader-approved";
};

const require = createRequire(import.meta.url);
const fallbackRows = require("../../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json") as {
  hookRows: PackageRow[];
  vocabularyRows: PackageRow[];
};
const placementInterim = require("../../apps/web/src/content/fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json") as {
  templates: PackageRow[];
  vocabularyRows: PackageRow[];
};
const fallbackTemplates = require("../../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json") as {
  templates: PackageRow[];
};
const bundledManifest = require("../../apps/web/src/content/fallbackArchitectureV3/bundled-manifest-v3.json") as {
  keys: string[];
};

const planets = new Set(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "lilith", "north-node", "south-node"]);
const signs = new Set(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]);
const approvedReviewStatuses = new Set(["approved", "approved_reuse", "reviewed"]);
const fallbackProvider = "tldrastro-fallback-architecture-v3";
const currentPackageKeys = new Set(bundledManifest.keys.map((key) => {
  const separator = key.indexOf(":");
  return separator >= 0 ? key.slice(separator + 1) : key;
}));

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

function normalizeOverrideCandidate(value: unknown): PreviewOverrideCandidate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const packageRow = candidate.packageRow;
  if (!packageRow || typeof packageRow !== "object" || Array.isArray(packageRow)) return null;
  const row = packageRow as Record<string, unknown>;
  if (
    typeof row.contentKey !== "string"
    || !row.contentKey.startsWith("fallback-")
    || typeof row.content_role !== "string"
  ) {
    return null;
  }
  return {
    id: typeof candidate.id === "string" ? candidate.id : "",
    lane: typeof candidate.lane === "string" ? candidate.lane : null,
    packageRow: row as PackageRow,
    provider: typeof candidate.provider === "string" ? candidate.provider : null,
    status: typeof candidate.status === "string" ? candidate.status : "",
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : null
  };
}

export function normalizeNatalPlacementPreviewInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Preview selection is missing.");
  const input = value as Record<string, unknown>;
  const planet = typeof input.planet === "string" ? input.planet : "";
  const sign = typeof input.sign === "string" ? input.sign : "";
  const house = typeof input.house === "string" ? input.house : "";
  const audience = input.audience === "they" ? "they" : "you";
  const motion = input.motion === "retrograde" || input.isRetrograde === true ? "retrograde" : "direct";
  if (!planets.has(planet) || !signs.has(sign) || (house && !/^(?:[1-9]|1[0-2])$/u.test(house))) {
    throw new Error("Choose a valid planet and sign. If provided, the house must be between 1 and 12.");
  }
  if (!Array.isArray(input.overrides) || input.overrides.length > 64) throw new Error("Preview source overrides are invalid.");
  const overrides = input.overrides
    .map(normalizeOverrideCandidate)
    .filter((candidate): candidate is PreviewOverrideCandidate => Boolean(candidate));
  return { audience, house, motion, overrides, planet, sign };
}

function ignoredReason(candidate: PreviewOverrideCandidate): IgnoredPreviewOverride["reason"] | null {
  if (candidate.status !== "LIVE") return "not-live";
  if (candidate.lane !== "serving") return "not-serving";
  if (candidate.provider !== fallbackProvider) return "wrong-provider";
  if (!currentPackageKeys.has(candidate.packageRow.contentKey)) return "not-current-package-key";
  const reviewStatus = typeof candidate.packageRow.review_status === "string" ? candidate.packageRow.review_status : "";
  if (candidate.packageRow.content_role === "template" && !reviewStatus) return null;
  if (!approvedReviewStatuses.has(reviewStatus)) return "not-reader-approved";
  return null;
}

export function productionNatalPlacementPreviewOverrides(candidates: PreviewOverrideCandidate[]) {
  const ignored: IgnoredPreviewOverride[] = [];
  const eligible = candidates
    .map((candidate) => ({ candidate, reason: ignoredReason(candidate) }))
    .filter(({ candidate, reason }) => {
      if (!reason) return true;
      ignored.push({ contentKey: candidate.packageRow.contentKey, reason });
      return false;
    })
    .map(({ candidate }) => candidate)
    .sort((first, second) => {
      const firstUpdated = Date.parse(first.updatedAt ?? "");
      const secondUpdated = Date.parse(second.updatedAt ?? "");
      const firstVersion = Number.isFinite(firstUpdated) ? firstUpdated : 0;
      const secondVersion = Number.isFinite(secondUpdated) ? secondUpdated : 0;
      if (firstVersion !== secondVersion) return secondVersion - firstVersion;
      return second.id.localeCompare(first.id);
    });

  const seen = new Set<string>();
  const applied = eligible.filter((candidate) => {
    const key = candidate.packageRow.contentKey;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    appliedRows: applied.map((candidate) => candidate.packageRow),
    appliedOverrideKeys: applied.map((candidate) => candidate.packageRow.contentKey),
    ignoredOverrides: ignored
  };
}

export function renderNatalPlacementPreviewState(input: ReturnType<typeof normalizeNatalPlacementPreviewInput>) {
  const hooks = new Map((fallbackRows.hookRows as unknown as PackageRow[]).map((row) => [row.contentKey, row]));
  const vocabulary = new Map(([
    ...(fallbackRows.vocabularyRows as unknown as PackageRow[]),
    ...(placementInterim.vocabularyRows as unknown as PackageRow[])
  ]).map((row) => [row.contentKey, row]));
  const templates = new Map(([
    ...(fallbackTemplates.templates as unknown as PackageRow[]),
    ...(placementInterim.templates as unknown as PackageRow[])
  ]).map((row) => [row.contentKey, row]));
  const productionOverrides = productionNatalPlacementPreviewOverrides(input.overrides);

  productionOverrides.appliedRows.forEach((row) => {
    if (row.contentKey.startsWith("fallback-template/")) templates.set(row.contentKey, row);
    else if (row.contentKey.startsWith("fallback-vocab/")) vocabulary.set(row.contentKey, row);
    else hooks.set(row.contentKey, row);
  });

  const renderer = createFallbackRenderer(
    { templates: [...templates.values()] },
    { hookRows: [...hooks.values()], vocabularyRows: [...vocabulary.values()] }
  );
  const rendered = renderer.renderNatalPlacement({
    ...(input.house ? { house: Number(input.house) } : {}),
    isRetrograde: input.motion === "retrograde",
    planet: input.planet,
    sign: input.sign,
    voice: input.audience === "you" ? "you" : "Maya"
  });

  return {
    rendered,
    appliedOverrideKeys: productionOverrides.appliedOverrideKeys,
    ignoredOverrides: productionOverrides.ignoredOverrides
  };
}

export function renderNatalPlacementPreview(input: ReturnType<typeof normalizeNatalPlacementPreviewInput>) {
  return renderNatalPlacementPreviewState(input).rendered;
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
    const state = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(await readJsonBody(req)));
    sendJson(res, 200, { ok: true, ...state });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : "The reader preview could not be assembled." });
  }
}
