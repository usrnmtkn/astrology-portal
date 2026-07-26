import type { IncomingMessage, ServerResponse } from "node:http";
import skyAspectGenerator from "../../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

const planets = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "north-node",
  "south-node",
  "lilith"
] as const;
const signs = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
] as const;
const traditionalPlacementBodies = new Set([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto"
]);
const pointPlacementBodies = new Set(["chiron", "north-node", "lilith"]);
const oppositeSign: Record<string, string> = {
  aries: "libra",
  taurus: "scorpio",
  gemini: "sagittarius",
  cancer: "capricorn",
  leo: "aquarius",
  virgo: "pisces",
  libra: "aries",
  scorpio: "taurus",
  sagittarius: "gemini",
  capricorn: "cancer",
  aquarius: "leo",
  pisces: "virgo"
};
const maxJudgeRegenerations = 2;

type PlacementArgs = {
  planet: string;
  sign: string;
};

type PlacementLint = {
  score?: number;
  fails?: number;
  warns?: number;
  findings?: unknown[];
};

type PlacementJudge = {
  score?: number;
  verdict?: string;
  gate?: "auto-publish" | "human-review" | "regenerate";
  weakest?: string;
  why?: string;
};

type PlacementResult = {
  status: "clean" | "needs-review" | "skipped";
  reason?: string;
  note?: string;
  text?: string;
  attempts?: number;
  provider?: string;
  model?: string;
  temperature?: number | null;
  lint?: PlacementLint | null;
  judge?: PlacementJudge | null;
  gate?: PlacementJudge["gate"];
  repair?: unknown;
  lintRetryAvoidTerms?: string[][];
  facts?: {
    planet?: string;
    body?: string;
    sign?: string;
    placementSource?: string;
    derivedFrom?: {
      planet?: string;
      sign?: string;
      frame?: string;
    } | null;
  };
};

type PlacementGenerator = (
  args: PlacementArgs,
  options: {
    withJudge: true;
    judgeFeedback?: string;
  }
) => Promise<PlacementResult>;

type ExistingPlacementRow = {
  id: string;
  content_key: string;
  status: string;
  updated_at: string;
};

const generatePlacementCard = (
  skyAspectGenerator as unknown as {
    generatePlacementCard?: PlacementGenerator;
  }
).generatePlacementCard;

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function isAuthorized(req: IncomingMessage) {
  const cronSecret = process.env.CRON_SECRET ?? process.env.CONTENT_GENERATION_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return req.headers.authorization === `Bearer ${cronSecret}`;
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL")).replace(/\/$/, "");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function judgeAutoPublishEnabled() {
  return process.env.SKY_ASPECT_JUDGE_CALIBRATED === "true"
    && process.env.SKY_PLACEMENT_JUDGE_CALIBRATED === "true";
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function batchSize() {
  return boundedInteger(process.env.SKY_PLACEMENT_BATCH_SIZE, 4, 1, 12);
}

function refreshDays() {
  return boundedInteger(process.env.SKY_PLACEMENT_REFRESH_DAYS, 180, 1, 730);
}

function placementSource(planet: string, sign: string) {
  if (traditionalPlacementBodies.has(planet)) {
    return `data/placements/sign/${planet}-${sign}.json`;
  }

  if (pointPlacementBodies.has(planet)) {
    return `data/points/placements/sign/${planet}-${sign}.json`;
  }

  if (planet === "south-node" && oppositeSign[sign]) {
    return `data/points/placements/sign/north-node-${oppositeSign[sign]}.json`;
  }

  throw new Error(`No canonical sky-placement source path for ${planet} in ${sign}.`);
}

function contentKeyFor({ planet, sign }: PlacementArgs) {
  return `sky.placement.${planet.replace(/-/g, "_")}.${sign.replace(/-/g, "_")}`;
}

function firstParagraph(text: string) {
  return text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).find(Boolean) ?? "";
}

async function existingPlacementRows() {
  const params = new URLSearchParams({
    content_key: "like.sky.placement.*",
    target_date: "is.null",
    mode: "eq.feed",
    select: "id,content_key,status,updated_at",
    order: "updated_at.asc"
  });
  const key = serviceRoleKey();
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    throw new Error(`Sky-placement cache lookup failed with ${response.status}.`);
  }

  return await response.json() as ExistingPlacementRow[];
}

function generationCandidates(rows: ExistingPlacementRow[]) {
  const byKey = new Map(rows.map((row) => [row.content_key, row]));
  const staleBefore = Date.now() - refreshDays() * 24 * 60 * 60 * 1000;
  const missing: Array<{ args: PlacementArgs; existing: ExistingPlacementRow | null }> = [];
  const stale: Array<{ args: PlacementArgs; existing: ExistingPlacementRow | null }> = [];

  for (const planet of planets) {
    for (const sign of signs) {
      const args = { planet, sign };
      const existing = byKey.get(contentKeyFor(args)) ?? null;

      if (!existing) {
        missing.push({ args, existing });
      } else if (
        existing.status === "ERROR"
        || !Number.isFinite(Date.parse(existing.updated_at))
        || Date.parse(existing.updated_at) < staleBefore
      ) {
        stale.push({ args, existing });
      }
    }
  }

  return [...missing, ...stale];
}

async function generateWithJudgeRouting(args: PlacementArgs) {
  if (!generatePlacementCard) {
    throw new Error("sky-placement-engine-not-ready");
  }

  let result: PlacementResult | null = null;
  let feedback = "";
  let attempts = 0;

  for (let pass = 0; pass <= maxJudgeRegenerations; pass += 1) {
    result = await generatePlacementCard(args, {
      withJudge: true,
      ...(feedback ? { judgeFeedback: feedback } : {})
    });
    attempts += result.attempts ?? 0;

    if (result.status !== "clean" || result.gate !== "regenerate") {
      return {
        result,
        gate: result.status === "clean" ? result.gate ?? "human-review" : "human-review",
        judgePasses: pass + 1,
        attempts,
        cappedRegeneration: false
      };
    }

    feedback = [
      result.judge?.why,
      result.judge?.weakest ? `Weakest beat: ${result.judge.weakest}.` : ""
    ].filter(Boolean).join(" ");
  }

  if (!result) {
    throw new Error("Sky-placement judge routing completed without a result.");
  }

  return {
    result,
    gate: "human-review" as const,
    judgePasses: maxJudgeRegenerations + 1,
    attempts,
    cappedRegeneration: true
  };
}

async function savePlacementCard(
  args: PlacementArgs,
  existing: ExistingPlacementRow | null,
  routed: Awaited<ReturnType<typeof generateWithJudgeRouting>>
) {
  const { result } = routed;
  const normalizedPlanet = result.facts?.planet ?? result.facts?.body;
  const normalizedSign = result.facts?.sign;
  const expectedSource = placementSource(args.planet, args.sign);

  if (
    normalizedPlanet !== args.planet
    || normalizedSign !== args.sign
    || result.facts?.placementSource !== expectedSource
  ) {
    throw new Error(`Sky-placement generator returned non-canonical facts for ${args.planet} in ${args.sign}.`);
  }

  const clean = result.status === "clean"
    && result.lint?.score === 3
    && result.lint.fails === 0;
  const gate = clean && routed.gate === "auto-publish" ? "auto-publish" : "human-review";
  const canAutoPublish = clean
    && gate === "auto-publish"
    && result.judge?.score === 3
    && judgeAutoPublishEnabled();
  const reviewState = canAutoPublish
    ? null
    : gate === "auto-publish"
      ? "sky-placement-judge-calibration-required"
      : "sky-placement-voice-needs-review";
  const now = new Date().toISOString();
  const key = serviceRoleKey();
  const contentKey = contentKeyFor(args);
  const response = await fetch(
    existing
      ? `${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(existing.id)}`
      : `${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`,
    {
      method: existing ? "PATCH" : "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        prefer: existing ? "return=representation" : "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify({
        content_key: contentKey,
        surface: "sky",
        mode: "feed",
        status: canAutoPublish ? "LIVE" : "DRAFT",
        lane: "serving",
        review_state: reviewState,
        event_type: "collective-placement-card",
        target_date: null,
        block_type: "sky_placement",
        facts: {
          planet: args.planet,
          sign: args.sign
        },
        knowledge_ids: [`${args.planet}-${args.sign}`],
        source_snapshot: {
          contentType: "sky-placement-card",
          placementFacts: {
            planet: args.planet,
            sign: args.sign
          },
          placementSource: expectedSource,
          placementDerivation: result.facts?.derivedFrom ?? null,
          skyPlacementVoiceLint: result.lint,
          skyPlacementJudge: result.judge
            ? {
                ...result.judge,
                gate,
                originalGate: result.gate,
                cappedRegeneration: routed.cappedRegeneration
              }
            : null,
          skyPlacementRepair: result.repair ?? null,
          skyPlacementLintRetryAvoidTerms: result.lintRetryAvoidTerms ?? [],
          generationAttempts: routed.attempts,
          judgePasses: routed.judgePasses,
          temperature: result.temperature ?? null
        },
        judge_score: result.judge?.score ?? null,
        judge_verdict: clean ? result.judge?.verdict ?? "" : "lint-failed",
        judge_gate: gate,
        judge_why: clean
          ? [
              result.judge?.why,
              routed.cappedRegeneration
                ? `Regeneration cap reached after ${routed.judgePasses} judged drafts.`
                : ""
            ].filter(Boolean).join(" ")
          : result.note ?? "Card did not pass the deterministic voice linter.",
        prompt_version: "sky-placement-card-v1",
        provider: result.provider,
        model: result.model,
        headline: `${args.planet.replace(/(^|-)([a-z])/g, (_, prefix, letter) => `${prefix ? " " : ""}${letter.toUpperCase()}`)} in ${args.sign[0].toUpperCase()}${args.sign.slice(1)}`,
        summary: firstParagraph(result.text ?? ""),
        body: result.text ?? "",
        sections: {},
        flags: canAutoPublish
          ? []
          : gate === "auto-publish"
            ? ["SKY_PLACEMENT_JUDGE_CALIBRATION_REQUIRED"]
            : ["SKY_PLACEMENT_VOICE_REVIEW_REQUIRED"],
        reviewed_at: canAutoPublish ? now : null,
        published_at: canAutoPublish ? now : null,
        error: clean ? null : result.note ?? "Sky-placement voice lint failed.",
        updated_at: now
      })
    }
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Sky-placement save failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return {
    contentKey,
    status: canAutoPublish ? "live-auto-publish" : "needs-review",
    gate,
    clean
  };
}

async function generatePlacementBatch() {
  const rows = await existingPlacementRows();
  const candidates = generationCandidates(rows);
  const limit = batchSize();
  const report = {
    requested: limit,
    candidates: candidates.length,
    generated: 0,
    autoPublished: 0,
    needsReview: 0,
    skipped: [] as Array<{ contentKey: string; reason: string }>,
    cards: [] as Array<{ contentKey: string; status: string }>
  };

  for (const candidate of candidates) {
    if (report.generated >= limit) break;

    const contentKey = contentKeyFor(candidate.args);
    const routed = await generateWithJudgeRouting(candidate.args);

    if (routed.result.status === "skipped") {
      report.skipped.push({
        contentKey,
        reason: routed.result.reason ?? "source-gap"
      });
      continue;
    }

    const saved = await savePlacementCard(candidate.args, candidate.existing, routed);
    report.generated += 1;
    report.autoPublished += saved.status === "live-auto-publish" ? 1 : 0;
    report.needsReview += saved.status === "needs-review" ? 1 : 0;
    report.cards.push({
      contentKey: saved.contentKey,
      status: saved.status
    });
  }

  return report;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, 405, { error: "Use GET or POST." });
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  if (!generatePlacementCard) {
    sendJson(res, 503, {
      ok: false,
      error: "sky-placement-engine-not-ready"
    });
    return;
  }

  try {
    const report = await generatePlacementBatch();
    sendJson(res, 200, { ok: true, report });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown sky-placement generation error."
    });
  }
}
