import type { IncomingMessage, ServerResponse } from "node:http";
import skyAspectGenerator from "../../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js";
import skyVoiceJudge from "../../packages/astro-knowledge/scripts/judge-sky-voice.js";
import placementCalibration from "../../packages/astro-knowledge/scripts/test-placement-calibration.js";
import { currentSkyFacts, type PlanetPosition } from "../_lib/current-sky.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

export const maxDuration = 300;

type JudgeTarget = {
  provider: string;
  model: string;
  temperature: number;
};

type PlacementGenerationResult = {
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
    ) => Promise<PlacementGenerationResult>;
  }
).generatePlacementCard;
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
const sampleBodies = ["sun", "moon", "mercury", "venus", "mars"];

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
  return req.headers["x-one-off-confirmation"] === "run-sky-placement-calibration";
}

function pointSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function samplePositions(positions: PlanetPosition[]) {
  const byBody = new Map(positions.map((position) => [pointSlug(position.planet), position]));

  return sampleBodies.map((body) => {
    const position = byBody.get(body);

    if (!position) {
      throw new Error(`Current sky did not include ${body}.`);
    }

    return {
      body,
      sign: pointSlug(position.sign),
      displayBody: position.planet,
      displaySign: position.sign
    };
  });
}

async function generateAuditSamples(positions: ReturnType<typeof samplePositions>) {
  return await Promise.all(positions.map(async (position) => {
    const result = await generatePlacementCard({
      planet: position.body,
      sign: position.sign
    }, {
      withJudge: true
    });

    return {
      planet: position.body,
      sign: position.sign,
      label: `${position.displayBody} in ${position.displaySign}`,
      text: result.text ?? "",
      status: result.status,
      attempts: result.attempts ?? 0,
      lint: result.lint ?? null,
      judge: result.judge ?? null,
      gate: result.gate ?? null,
      provider: result.provider ?? null,
      model: result.model ?? null,
      temperature: result.temperature ?? null,
      repair: result.repair ?? null,
      facts: result.facts ?? null
    };
  }));
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
        error: "placement-judge-target-mismatch",
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
        stopped: "calibration-separation-gate-failed"
      });
      return;
    }

    const sky = await currentSkyFacts(new Date());
    const positions = samplePositions(sky.positions);
    const samples = await generateAuditSamples(positions);

    sendJson(res, 200, {
      ok: true,
      target,
      calibration,
      currentSkyGeneratedAt: sky.generatedAt,
      samples,
      writes: {
        database: false,
        calibrationFlag: false,
        cronSchedule: false
      }
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown placement calibration error."
    });
  }
}
