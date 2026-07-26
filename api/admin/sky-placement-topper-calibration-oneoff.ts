import type { IncomingMessage, ServerResponse } from "node:http";
import skyAspectGenerator from "../../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js";
import skyVoiceJudge from "../../packages/astro-knowledge/scripts/judge-sky-voice.js";
import placementCalibration from "../../packages/astro-knowledge/scripts/test-placement-calibration.js";
import { currentSkyFacts, type PlanetPosition, type SkyAspect } from "../_lib/current-sky.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

export const maxDuration = 300;

type JudgeTarget = {
  provider: string;
  model: string;
  temperature: number;
};

type GenerationResult = {
  text?: string;
  status: string;
  attempts?: number;
  lint?: unknown;
  judge?: unknown;
  gate?: string;
  provider?: string;
  model?: string;
  temperature?: number | null;
  repair?: unknown;
  facts?: unknown;
  reason?: string;
};

type CalibrationReport = {
  pass: boolean;
  samples: number;
  goldMean: number;
  weakMean: number;
  separation: number;
  goldOffVoice: number;
  goldsAtThree: number;
  weakPassedAsThree: number;
  golds: unknown[];
  weakControls: unknown[];
};

const generatePlacementTopper = (
  skyAspectGenerator as unknown as {
    generatePlacementTopper: (
      args: {
        planet: string;
        sign: string;
        aspect: string;
        other: string;
        otherSign: string;
        orb: number;
        baseText: string;
      },
      options: { withJudge: true }
    ) => Promise<GenerationResult>;
  }
).generatePlacementTopper;
const judgeConfig = (
  skyVoiceJudge as unknown as {
    judgeConfig: () => JudgeTarget;
  }
).judgeConfig;
const runPlacementCalibration = (
  placementCalibration as unknown as {
    runPlacementCalibration: (
      options: { concurrency: number; samples: number }
    ) => Promise<CalibrationReport>;
  }
).runPlacementCalibration;

const topperMaxOrb = 1;
const supportedAspects = new Set(["conjunction", "sextile", "square", "trine", "opposition"]);

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function isAuthorized(req: IncomingMessage) {
  const cronSecret = process.env.CRON_SECRET ?? process.env.CONTENT_GENERATION_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return req.headers.authorization === `Bearer ${cronSecret}`;
}

function isConfirmed(req: IncomingMessage) {
  return req.headers["x-one-off-confirmation"] === "run-sky-placement-topper-calibration";
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

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function baseContentKey(planet: string, sign: string) {
  return `sky.placement.base.${planet.replace(/-/g, "_")}.${sign.replace(/-/g, "_")}`;
}

async function livePlacementBase(planet: string, sign: string) {
  const params = new URLSearchParams({
    content_key: `eq.${baseContentKey(planet, sign)}`,
    target_date: "is.null",
    mode: "eq.feed",
    status: "eq.LIVE",
    lane: "eq.serving",
    review_state: "is.null",
    select: "content_key,body,updated_at,judge_score,judge_gate,source_snapshot",
    limit: "1"
  });
  const key = serviceRoleKey();
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    throw new Error(`Live placement-base lookup failed with ${response.status}.`);
  }

  const rows = await response.json() as Array<{
    content_key: string;
    body: string;
    updated_at: string;
    judge_score: number | null;
    judge_gate: string | null;
    source_snapshot?: Record<string, unknown> | null;
  }>;
  const row = rows[0];
  const lint = row?.source_snapshot?.skyPlacementVoiceLint as { score?: number; fails?: number } | undefined;

  return row
    && row.judge_score === 3
    && row.judge_gate === "auto-publish"
    && lint?.score === 3
    && lint.fails === 0
    && row.body.split(/\n\s*\n/).filter(Boolean).length === 2
    ? row
    : null;
}

function tightestContacts(positions: PlanetPosition[], aspects: SkyAspect[]) {
  const positionByName = new Map(positions.map((position) => [position.planet, position]));

  return positions.flatMap((position) => {
    const aspect = aspects
      .filter((candidate) => candidate.from === position.planet || candidate.to === position.planet)
      .filter((candidate) => supportedAspects.has(slug(candidate.type)))
      .filter((candidate) => Number.isFinite(candidate.orb) && candidate.orb <= topperMaxOrb)
      .slice()
      .sort((first, second) => first.orb - second.orb)[0];

    if (!aspect) return [];

    const otherName = aspect.from === position.planet ? aspect.to : aspect.from;
    const otherPosition = positionByName.get(otherName);

    return otherPosition
      ? [{
          planet: slug(position.planet),
          sign: slug(position.sign),
          aspect: slug(aspect.type),
          other: slug(otherName),
          otherSign: slug(otherPosition.sign),
          orb: aspect.orb,
          label: `${position.planet} in ${position.sign} ${aspect.type} ${otherName} in ${otherPosition.sign}`
        }]
      : [];
  });
}

async function generateTopperSamples(positions: PlanetPosition[], aspects: SkyAspect[]) {
  const samples = [];
  const skipped = [];

  for (const contact of tightestContacts(positions, aspects)) {
    if (samples.length >= 5) break;

    const base = await livePlacementBase(contact.planet, contact.sign);

    if (!base) {
      skipped.push({
        ...contact,
        status: "skipped",
        reason: "missing-reader-eligible-live-base"
      });
      continue;
    }

    const topper = await generatePlacementTopper({
      planet: contact.planet,
      sign: contact.sign,
      aspect: contact.aspect,
      other: contact.other,
      otherSign: contact.otherSign,
      orb: contact.orb,
      baseText: base.body
    }, {
      withJudge: true
    });

    if (topper.status === "skipped" || !topper.text) {
      skipped.push({
        ...contact,
        status: "skipped",
        reason: topper.reason ?? "topper-source-gap"
      });
      continue;
    }

    samples.push({
      ...contact,
      status: topper.status,
      topper: topper.text,
      base: base.body,
      baseContentKey: base.content_key,
      baseUpdatedAt: base.updated_at,
      renderedCard: `${topper.text}\n\n${base.body}`,
      lint: topper.lint ?? null,
      judge: topper.judge ?? null,
      gate: topper.gate ?? null,
      provider: topper.provider ?? null,
      model: topper.model ?? null,
      temperature: topper.temperature ?? null,
      repair: topper.repair ?? null,
      facts: topper.facts ?? null
    });
  }

  return { samples, skipped };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST." });
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }

  if (!isConfirmed(req)) {
    sendJson(res, 400, { ok: false, error: "Missing one-off confirmation header." });
    return;
  }

  try {
    const target = judgeConfig();

    if (
      target.provider !== "openai"
      || target.model !== "gpt-4.1"
      || target.temperature !== 0.1
    ) {
      sendJson(res, 412, {
        ok: false,
        error: "placement-topper-judge-target-mismatch",
        target
      });
      return;
    }

    const calibration = await runPlacementCalibration({
      concurrency: 3,
      samples: 5
    });

    if (!calibration.pass) {
      sendJson(res, 200, {
        ok: false,
        target,
        calibration,
        samples: [],
        stopped: "placement-topper-calibration-separation-gate-failed"
      });
      return;
    }

    const sky = await currentSkyFacts(new Date());
    const sampleReport = await generateTopperSamples(sky.positions, sky.aspects);

    sendJson(res, 200, {
      ok: true,
      target,
      calibration,
      currentSkyGeneratedAt: sky.generatedAt,
      topperMaxOrb,
      samples: sampleReport.samples,
      skippedContacts: sampleReport.skipped,
      flags: {
        enabled: process.env.SKY_PLACEMENT_TOPPERS_ENABLED === "true",
        calibrated: process.env.SKY_PLACEMENT_TOPPER_JUDGE_CALIBRATED === "true"
      },
      writes: {
        database: false,
        calibrationFlag: false,
        enableFlag: false,
        cronSchedule: false
      }
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown placement-topper calibration error."
    });
  }
}
