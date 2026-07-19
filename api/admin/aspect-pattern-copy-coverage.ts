import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";

type PatternType = "t_square" | "grand_square" | "grand_trine" | "kite" | "yod" | "mystic_rectangle";

const require = createRequire(import.meta.url);
const {
  AUTHORED_ASPECT_PATTERN_RECORDS,
  GOVERNED_COPY_RECORDS,
  buildAspectPatternInterpretationContexts,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternCopy,
  validateAuthoredAspectPatternRecord
} = require("../../packages/astro-knowledge/engine/aspect-patterns/index.js") as {
  AUTHORED_ASPECT_PATTERN_RECORDS: AuthoredRecord[];
  GOVERNED_COPY_RECORDS: CopyRecord[];
  buildAspectPatternInterpretationContexts(detectionResult: unknown, context: Record<string, unknown>): ContextRecord[];
  detectPatterns(input: unknown): Record<string, unknown>;
  rankAspectPatterns(detectionResult: unknown, context: Record<string, unknown>): Record<string, unknown>;
  resolveAspectPatternCopy(context: ContextRecord, options?: { authoredRecords?: AuthoredRecord[] }): ResolvedCopy;
  validateAuthoredAspectPatternRecord(record: AuthoredRecord, context: ContextRecord): ValidationResult;
};
const { fixtures } = require("../../packages/astro-knowledge/engine/aspect-patterns/fixtures.js") as {
  fixtures: Record<string, { planets: Array<Record<string, unknown>>; aspects: Array<Record<string, unknown>> }>;
};
const realFixtures = require("../../packages/astro-knowledge/engine/aspect-patterns/fixtures/real/index.js") as Record<string, {
  input: { planets: Array<Record<string, unknown>>; aspects: Array<Record<string, unknown>> };
}>;
const copyFixtures = require("../../packages/astro-knowledge/engine/aspect-patterns/fixtures/copy/index.js") as Record<string, {
  patternType: PatternType;
  resolvedCopy: ResolvedCopy;
}>;

type AuthoredRecord = {
  id: string;
  version: string;
  patternType: PatternType;
  status: string;
  eligibility: {
    confidence: string[];
    houseMode: string;
    variants?: string[];
  };
  content: {
    eyebrow?: string;
    headline: string;
    overview: string;
    sections: Array<{ id: string; template: string; required: boolean; conditions?: unknown[] }>;
  };
  languageRules: {
    certainty: string;
    prohibitedClaims: string[];
    prohibitedTerms?: string[];
  };
  provenance: {
    sourceIds: string[];
    editorialStatus: string;
    reviewedBy?: string;
    reviewedAt?: string;
  };
};

type CopyRecord = {
  id: string;
  patternType: PatternType;
  contentLevel: string;
  status: string;
};

type ContextRecord = {
  patternId: string;
  patternType: PatternType;
  geometry: { confidence: string };
  display?: { isContained?: boolean };
  derivedPoints?: Array<Record<string, unknown>>;
  roles?: Record<string, unknown>;
};

type ResolvedCopy = {
  source: {
    recordId: string;
    contentLevel: string;
    status: string;
  };
  content: {
    eyebrow?: string;
    headline: string;
    overview: string;
    sections: Array<{ id: string; body: string }>;
  };
  diagnostics: {
    templateId: string;
    missingSlots: string[];
    skippedSections: string[];
    validationWarnings?: string[];
  };
};

type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  missingSlots: string[];
  unknownSlots: string[];
};

const patternOrder: PatternType[] = ["t_square", "grand_square", "grand_trine", "kite", "yod", "mystic_rectangle"];
const patternLabels: Record<PatternType, string> = {
  t_square: "T-square",
  grand_square: "Grand Square",
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

function rankedContexts(fixtureName: string) {
  const fixture = fixtures[fixtureName];
  return rankedContextsForInput(fixture);
}

function rankedRealContexts(fixtureName: string) {
  return rankedContextsForInput(realFixtures[fixtureName].input);
}

function rankedContextsForInput(fixture: { planets: Array<Record<string, unknown>>; aspects: Array<Record<string, unknown>> }) {
  const detection = detectPatterns(fixture);
  const rankingContext = {
    planets: fixture.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270
  };
  const withRanking = {
    ...detection,
    ranking: rankAspectPatterns(detection, rankingContext)
  };
  return buildAspectPatternInterpretationContexts(withRanking, rankingContext);
}

function contextsByFixtureId() {
  const contexts = new Map<string, ContextRecord>();
  const syntheticContexts = {
    "t-square-strong-sign-only": contextFor("t_square", "t_square"),
    "t-square-strong-with-house": withPointHouse(contextFor("t_square", "t_square"), "empty_leg", 6),
    "t-square-partial-sign-only": contextFor("partial_t_square", "t_square"),
    "grand-square-strong": contextFor("grand_square", "grand_square"),
    "grand-square-contained-t-square": rankedContexts("grand_square").find((context) => context.patternType === "t_square" && context.display?.isContained),
    "grand-trine-strong": contextFor("grand_trine", "grand_trine"),
    "grand-trine-multiple-real": rankedRealContexts("grand-trine-a").find((context) => context.patternType === "grand_trine"),
    "kite-strong": contextFor("kite", "kite"),
    "kite-contained-grand-trine": contextFor("kite", "grand_trine"),
    "yod-strong-sign-only": contextFor("yod", "yod"),
    "yod-strong-with-house": withPointHouse(contextFor("yod", "yod"), "fallout_point", 8),
    "yod-wide-real-sign-only": rankedRealContexts("yod-wide-a").find((context) => context.patternType === "yod"),
    "mystic-rectangle-strong": contextFor("mystic_rectangle", "mystic_rectangle")
  };
  for (const [id, context] of Object.entries(syntheticContexts)) {
    if (context) contexts.set(id, context);
  }
  return contexts;
}

function contextFor(fixtureName: string, patternType: PatternType) {
  return rankedContexts(fixtureName).find((context) => context.patternType === patternType);
}

function withPointHouse(context: ContextRecord | undefined, pointType: string, house: number) {
  if (!context) return context;
  const copy = JSON.parse(JSON.stringify(context)) as ContextRecord;
  for (const point of copy.derivedPoints || []) {
    if (point.type === pointType) point.house = house;
  }
  if (pointType === "empty_leg" && copy.roles?.emptyLeg && typeof copy.roles.emptyLeg === "object") {
    (copy.roles.emptyLeg as { house?: number }).house = house;
  }
  if (pointType === "fallout_point" && copy.roles?.falloutPoint && typeof copy.roles.falloutPoint === "object") {
    (copy.roles.falloutPoint as { house?: number }).house = house;
  }
  return copy;
}

function changedFields(authored: ResolvedCopy, fallback: ResolvedCopy) {
  const changed = [];
  for (const field of ["eyebrow", "headline", "overview"] as const) {
    if (authored.content[field] !== fallback.content[field]) changed.push(field);
  }
  if (JSON.stringify(authored.content.sections) !== JSON.stringify(fallback.content.sections)) changed.push("sections");
  if (authored.source.contentLevel !== fallback.source.contentLevel) changed.push("contentLevel");
  return changed;
}

function coverageReport() {
  const contextMap = contextsByFixtureId();
  const goldenByPattern = new Map<PatternType, string[]>();
  for (const [fixtureId, fixture] of Object.entries(copyFixtures)) {
    if (fixtureId.startsWith("emergency-")) continue;
    const list = goldenByPattern.get(fixture.patternType) || [];
    list.push(fixtureId);
    goldenByPattern.set(fixture.patternType, list);
  }

  const rows = patternOrder.map((patternType) => {
    const authoredRecords = AUTHORED_ASPECT_PATTERN_RECORDS.filter((record) => record.patternType === patternType);
    const approvedAuthoredRecords = authoredRecords.filter((record) => record.status === "approved");
    const goldenFixtureIds = goldenByPattern.get(patternType) || [];
    const hasSourceTemplate = GOVERNED_COPY_RECORDS.some((record) => record.patternType === patternType && record.contentLevel === "source_grounded_template");
    const hasMadlib = GOVERNED_COPY_RECORDS.some((record) => record.patternType === patternType && record.contentLevel === "madlib_fallback");
    const hasEmergency = GOVERNED_COPY_RECORDS.some((record) => record.patternType === patternType && record.contentLevel === "emergency_fallback");

    return {
      patternType,
      pattern: patternLabels[patternType],
      authored: authoredRecords.length,
      approvedAuthored: approvedAuthoredRecords.length,
      sourceTemplate: hasSourceTemplate,
      madlib: hasMadlib,
      emergency: hasEmergency,
      goldenFixtures: goldenFixtureIds.length,
      status: approvedAuthoredRecords.length > 0 && hasSourceTemplate && hasMadlib && hasEmergency && goldenFixtureIds.length > 0 ? "covered" : "needs_attention"
    };
  });

  const records = AUTHORED_ASPECT_PATTERN_RECORDS.map((record) => {
    const fixtureIds = goldenByPattern.get(record.patternType) || [];
    const previews = fixtureIds.flatMap((fixtureId) => {
      const context = contextMap.get(fixtureId);
      if (!context) return [];
      const authored = resolveAspectPatternCopy(context, { authoredRecords: AUTHORED_ASPECT_PATTERN_RECORDS });
      const fallback = resolveAspectPatternCopy(context, { authoredRecords: [] });
      const validation = validateAuthoredAspectPatternRecord(record, context);
      return [{
        fixtureId,
        confidence: context.geometry.confidence,
        contained: Boolean(context.display?.isContained),
        authored,
        fallback,
        changedFields: changedFields(authored, fallback),
        resolverSource: authored.source,
        validation
      }];
    });
    const validationContexts = previews.map((preview) => preview.validation);
    return {
      id: record.id,
      version: record.version,
      status: record.status,
      patternType: record.patternType,
      eligibility: record.eligibility,
      contentSections: record.content.sections.map((section) => section.id),
      provenance: record.provenance,
      prohibitedClaims: record.languageRules.prohibitedClaims,
      validationStatus: validationContexts.every((validation) => validation.ok) ? "valid" : "needs_attention",
      previews
    };
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    rows,
    records
  };
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Use GET." });
    return;
  }

  sendJson(res, 200, coverageReport());
}
