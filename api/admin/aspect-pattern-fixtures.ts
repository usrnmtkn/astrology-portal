import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";

type FixtureName =
  | "grand_square"
  | "t_square"
  | "grand_trine"
  | "kite"
  | "yod"
  | "mystic_rectangle";

const require = createRequire(import.meta.url);
const { buildAspectPatternInterpretationContexts, detectPatterns, rankAspectPatterns, resolveAspectPatternCopies } = require("../../packages/astro-knowledge/engine/aspect-patterns/index.js") as {
  buildAspectPatternInterpretationContexts(detectionResult: unknown, context: Record<string, unknown>): unknown[];
  resolveAspectPatternCopies(contexts: unknown[]): unknown[];
  detectPatterns(input: unknown): Record<string, unknown> & {
    patterns: Array<Record<string, unknown>>;
    relationships: Array<Record<string, unknown>>;
  };
  rankAspectPatterns(detectionResult: unknown, context: Record<string, unknown>): Record<string, unknown>;
};
const { fixtures } = require("../../packages/astro-knowledge/engine/aspect-patterns/fixtures.js") as {
  fixtures: Record<FixtureName, {
    planets: Array<Record<string, unknown>>;
    aspects: Array<Record<string, unknown>>;
  }>;
};

const fixtureLabels: Record<FixtureName, string> = {
  grand_square: "Grand Square",
  t_square: "T-Square",
  grand_trine: "Grand Trine",
  kite: "Kite",
  yod: "Yod",
  mystic_rectangle: "Mystic Rectangle"
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function fixtureResult(name: FixtureName, includeCopy = false) {
  const fixture = fixtures[name];
  const detection = detectPatterns(fixture);
  const rankingContext = {
    planets: fixture.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270
  };
  const aspectPatterns = {
    ...detection,
    ranking: rankAspectPatterns(detection, rankingContext)
  };
  const aspectPatternsWithContexts = {
    ...aspectPatterns,
    interpretationContexts: buildAspectPatternInterpretationContexts(aspectPatterns, rankingContext)
  };
  const aspectPatternsResponse = includeCopy
    ? {
        ...aspectPatternsWithContexts,
        resolvedCopy: resolveAspectPatternCopies(aspectPatternsWithContexts.interpretationContexts)
      }
    : aspectPatternsWithContexts;

  return {
    ok: true,
    source: "fixture",
    fixture: {
      id: name,
      label: fixtureLabels[name]
    },
    sky: {
      aspects: fixture.aspects.map((aspect) => ({
        ...aspect,
        id: aspect.id,
        from: aspect.pointA,
        to: aspect.pointB,
        bodyA: aspect.pointA,
        bodyB: aspect.pointB,
        separation: aspect.exactAngle
      })),
      aspectPatterns: aspectPatternsResponse
    },
    aspectPatterns: aspectPatternsResponse
  };
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Use GET." });
    return;
  }

  const requestUrl = new URL(req.url ?? "/api/admin/aspect-pattern-fixtures", "http://localhost");
  const name = requestUrl.searchParams.get("fixture") as FixtureName | null;
  const includeCopy = ["1", "true", "yes"].includes((requestUrl.searchParams.get("includeAspectPatternCopy") ?? "").toLowerCase());

  if (!name || !Object.prototype.hasOwnProperty.call(fixtures, name)) {
    sendJson(res, 400, {
      ok: false,
      error: "Unknown aspect-pattern fixture.",
      fixtures: Object.entries(fixtureLabels).map(([id, label]) => ({ id, label }))
    });
    return;
  }

  sendJson(res, 200, fixtureResult(name, includeCopy));
}
