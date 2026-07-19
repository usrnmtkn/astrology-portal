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
const {
  buildAspectPatternActivationInterpretationContexts,
  buildAspectPatternInterpretationContexts,
  buildPatternActivations,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternActivationCopies,
  resolveAspectPatternCopies
} = require("../../packages/astro-knowledge/engine/aspect-patterns/index.js") as {
  buildAspectPatternActivationInterpretationContexts(detectionResult: unknown, options: Record<string, unknown>): unknown[];
  buildAspectPatternInterpretationContexts(detectionResult: unknown, context: Record<string, unknown>): unknown[];
  buildPatternActivations(detectionResult: unknown, transitAspects: unknown[], options: Record<string, unknown>): Record<string, unknown>;
  resolveAspectPatternActivationCopies(contexts: unknown[]): unknown[];
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

const activationFixtureTransits: Record<FixtureName, Array<Record<string, unknown>>> = {
  grand_square: [{ id: "fixture-transit.saturn.square.moon", movingBody: "saturn", targetNatalPlanet: "moon", aspectType: "square", orb: 0.5, applying: true }],
  t_square: [{ id: "fixture-transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true }],
  grand_trine: [{ id: "fixture-transit.venus.trine.moon", movingBody: "venus", targetNatalPlanet: "moon", aspectType: "trine", orb: 1.1, applying: false }],
  kite: [{ id: "fixture-transit.sun.trine.mars", movingBody: "sun", targetNatalPlanet: "mars", aspectType: "trine", orb: 1, applying: false }],
  yod: [{ id: "fixture-transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }],
  mystic_rectangle: [{ id: "fixture-transit.mercury.sextile.moon", movingBody: "mercury", targetNatalPlanet: "moon", aspectType: "sextile", orb: 2.2, applying: false }]
};

function fixtureResult(name: FixtureName, includeCopy = false, includeActivation = false, includeActivationContexts = false, includeActivationCopy = false) {
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
  const activation = includeActivation
    ? buildPatternActivations(aspectPatternsWithContexts, activationFixtureTransits[name], { calculatedFor: "2026-07-19T12:00:00.000Z" })
    : null;
  const activationWithContexts = activation && includeActivationContexts
    ? {
        ...activation,
        interpretationContexts: buildAspectPatternActivationInterpretationContexts(
          { ...aspectPatternsWithContexts, activation },
          { activation, natalContexts: aspectPatternsWithContexts.interpretationContexts }
        )
      }
    : activation;
  const activationWithCopy = activationWithContexts && includeActivationCopy && Array.isArray((activationWithContexts as { interpretationContexts?: unknown[] }).interpretationContexts)
    ? {
        ...activationWithContexts,
        resolvedCopy: resolveAspectPatternActivationCopies((activationWithContexts as { interpretationContexts: unknown[] }).interpretationContexts)
      }
    : activationWithContexts;
  const aspectPatternsWithActivation = activationWithCopy
    ? { ...aspectPatternsWithContexts, activation: activationWithCopy }
    : aspectPatternsWithContexts;
  const aspectPatternsResponse = includeCopy
    ? {
        ...aspectPatternsWithActivation,
        resolvedCopy: resolveAspectPatternCopies(aspectPatternsWithContexts.interpretationContexts)
      }
    : aspectPatternsWithActivation;

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
  const includeActivation = ["1", "true", "yes"].includes((requestUrl.searchParams.get("includeAspectPatternActivation") ?? "").toLowerCase());
  const includeActivationContexts = includeActivation && ["1", "true", "yes"].includes((requestUrl.searchParams.get("includeAspectPatternActivationContexts") ?? "").toLowerCase());
  const includeActivationCopy = includeActivationContexts && ["1", "true", "yes"].includes((requestUrl.searchParams.get("includeAspectPatternActivationCopy") ?? "").toLowerCase());

  if (!name || !Object.prototype.hasOwnProperty.call(fixtures, name)) {
    sendJson(res, 400, {
      ok: false,
      error: "Unknown aspect-pattern fixture.",
      fixtures: Object.entries(fixtureLabels).map(([id, label]) => ({ id, label }))
    });
    return;
  }

  sendJson(res, 200, fixtureResult(name, includeCopy, includeActivation, includeActivationContexts, includeActivationCopy));
}
