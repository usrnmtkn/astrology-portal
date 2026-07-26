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

const generatePlacementCard = (
  skyAspectGenerator as unknown as {
    generatePlacementCard: (
      args: { planet: string; sign: string },
      options: { withJudge: true }
    ) => Promise<GenerationResult>;
  }
).generatePlacementCard;
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

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

    const base = await generatePlacementCard({
      planet: contact.planet,
      sign: contact.sign
    }, {
      withJudge: true
    });

    if (base.status !== "clean" || !base.text) {
      skipped.push({
        ...contact,
        status: "skipped",
        reason: base.reason ?? "base-generation-failed"
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
      baseText: base.text
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
      base: base.text,
      renderedCard: `${topper.text}\n\n${base.text}`,
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
