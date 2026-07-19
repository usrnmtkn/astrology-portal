import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";

type PatternType = "t_square" | "grand_square" | "grand_trine" | "kite" | "yod" | "mystic_rectangle";
type TimingState = "exact" | "applying" | "separating" | "mixed";
type TriggerMode = "single" | "multiple" | "shared_planet";

type AuthoredActivationRecord = {
  id: string;
  version: string;
  patternType: PatternType;
  status: string;
  priority?: number;
  eligibility: {
    targetRoles: string[];
    timingStates?: TimingState[];
    patternConfidence?: string[];
    triggerModes?: TriggerMode[];
  };
  content: { sections: Array<{ id: string; template: string; required: boolean; conditions?: unknown[] }> };
  languageRules: { prohibitedClaims: string[]; prohibitedTerms?: string[] };
  provenance: { sourceIds: string[]; editorialStatus: string; reviewedBy?: string; reviewedAt?: string };
};

type ActivationContext = {
  patternId: string;
  patternType: PatternType;
  calculatedFor: string;
  natalPattern?: { confidence?: string };
  triggers: Array<{ activationId: string; movingBody: string; targetNatalPlanet: string; targetRoles?: string[]; aspectType: string; orb: number; applying: boolean }>;
  primaryTrigger: { activationId: string };
  activationSummary: { triggerCount: number; timingState: TimingState; sharedPlanetFanout?: boolean };
};

type ResolvedCopy = {
  source: { recordId: string; contentLevel: string; status: string };
  content: { eyebrow?: string; headline: string; overview: string; sections: Array<{ id: string; body: string }> };
  diagnostics: { templateId: string; missingSlots: string[]; skippedSections: string[]; validationWarnings?: string[] };
};

const require = createRequire(import.meta.url);
const {
  AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS,
  GOVERNED_ACTIVATION_COPY_RECORDS,
  buildAspectPatternActivationInterpretationContexts,
  buildAspectPatternInterpretationContexts,
  buildPatternActivations,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternActivationCopy,
  validateAuthoredAspectPatternActivationRecord
} = require("../../packages/astro-knowledge/engine/aspect-patterns/index.js") as {
  AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS: AuthoredActivationRecord[];
  GOVERNED_ACTIVATION_COPY_RECORDS: Array<{ patternType: PatternType; contentLevel: string; status: string }>;
  buildAspectPatternActivationInterpretationContexts(detectionResult: unknown, options: Record<string, unknown>): ActivationContext[];
  buildAspectPatternInterpretationContexts(detectionResult: unknown, context: Record<string, unknown>): unknown[];
  buildPatternActivations(detectionResult: unknown, transitAspects: unknown[], options: Record<string, unknown>): Record<string, unknown>;
  detectPatterns(input: unknown): Record<string, unknown>;
  rankAspectPatterns(detectionResult: unknown, context: Record<string, unknown>): Record<string, unknown>;
  resolveAspectPatternActivationCopy(context: ActivationContext, options?: { authoredRecords?: AuthoredActivationRecord[] }): ResolvedCopy;
  validateAuthoredAspectPatternActivationRecord(record: AuthoredActivationRecord, context: ActivationContext): { ok: boolean; errors: string[]; warnings: string[]; missingSlots: string[]; unknownSlots: string[] };
};
const { fixtures } = require("../../packages/astro-knowledge/engine/aspect-patterns/fixtures.js") as {
  fixtures: Record<string, { planets: Array<Record<string, unknown>>; aspects: Array<Record<string, unknown>> }>;
};

const calculatedFor = "2026-07-19T12:00:00.000Z";
const goldenDir = path.resolve(process.cwd(), "packages/astro-knowledge/engine/aspect-patterns/fixtures/activation/copy");

const routeRows = [
  { key: "t_square.apex", patternType: "t_square", pattern: "T-square", targetRole: "apex", roleLabel: "Apex" },
  { key: "t_square.opposition_member", patternType: "t_square", pattern: "T-square", targetRole: "opposition_axis", roleLabel: "Opposition member" },
  { key: "grand_square.member", patternType: "grand_square", pattern: "Grand Square", targetRole: "opposition_axis", roleLabel: "Member" },
  { key: "grand_trine.member", patternType: "grand_trine", pattern: "Grand Trine", targetRole: "pattern_member", roleLabel: "Member" },
  { key: "kite.focal_planet", patternType: "kite", pattern: "Kite", targetRole: "focal_planet", roleLabel: "Focal planet" },
  { key: "kite.resource_planet", patternType: "kite", pattern: "Kite", targetRole: "resource_planet", roleLabel: "Resource planet" },
  { key: "yod.apex", patternType: "yod", pattern: "Yod", targetRole: "apex", roleLabel: "Apex" },
  { key: "mystic_rectangle.member", patternType: "mystic_rectangle", pattern: "Mystic Rectangle", targetRole: "opposition_axis", roleLabel: "Member" }
] as const;

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function fixtureWithOrbs(fixture: typeof fixtures[string], orbForAspect: (aspect: Record<string, unknown>) => number) {
  return {
    planets: fixture.planets,
    aspects: fixture.aspects.map((aspect) => ({ ...aspect, orb: orbForAspect(aspect) }))
  };
}

function contextsFor(fixture: typeof fixtures[string], transitAspects: unknown[]) {
  const detection = detectPatterns(fixture);
  const rankingContext = {
    planets: fixture.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270
  };
  const ranked = {
    ...detection,
    ranking: rankAspectPatterns(detection, rankingContext)
  };
  const withContexts = {
    ...ranked,
    interpretationContexts: buildAspectPatternInterpretationContexts(ranked, rankingContext)
  };
  const activation = buildPatternActivations(withContexts, transitAspects, { calculatedFor });
  return buildAspectPatternActivationInterpretationContexts(
    { ...withContexts, activation },
    { activation, natalContexts: withContexts.interpretationContexts }
  );
}

function contextForCase(fixtureCase: { patternType: PatternType; fixture: typeof fixtures[string]; transitAspects: unknown[] }) {
  const context = contextsFor(fixtureCase.fixture, fixtureCase.transitAspects).find((candidate) => candidate.patternType === fixtureCase.patternType);
  if (!context) throw new Error(`Missing context for ${fixtureCase.patternType}.`);
  return context;
}

function goldenCases() {
  const wideYodFixture = fixtureWithOrbs(fixtures.yod, (aspect) => aspect.type === "sextile" ? 3.8 : 2.4);
  const partialYodFixture = fixtureWithOrbs(fixtures.yod, (aspect) => aspect.type === "sextile" ? 3.8 : 3.4);
  return {
    "t-square-apex-applying": { patternType: "t_square", fixture: fixtures.t_square, transitAspects: [{ id: "transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true }] },
    "t-square-opposition-separating": { patternType: "t_square", fixture: fixtures.t_square, transitAspects: [{ id: "transit.saturn.opposition.sun", movingBody: "saturn", targetNatalPlanet: "sun", aspectType: "opposition", orb: 1.2, applying: false }] },
    "grand-square-shared-planet": { patternType: "grand_square", fixture: fixtures.grand_square, transitAspects: [{ id: "transit.saturn.square.moon", movingBody: "saturn", targetNatalPlanet: "moon", aspectType: "square", orb: 0.5, applying: true }] },
    "grand-trine-separating": { patternType: "grand_trine", fixture: fixtures.grand_trine, transitAspects: [{ id: "transit.venus.trine.moon", movingBody: "venus", targetNatalPlanet: "moon", aspectType: "trine", orb: 1.1, applying: false }] },
    "kite-focal-applying": { patternType: "kite", fixture: fixtures.kite, transitAspects: [{ id: "transit.moon.opposition.saturn", movingBody: "moon", targetNatalPlanet: "saturn", aspectType: "opposition", orb: 0.4, applying: true }] },
    "kite-resource-separating": { patternType: "kite", fixture: fixtures.kite, transitAspects: [{ id: "transit.sun.trine.mars", movingBody: "sun", targetNatalPlanet: "mars", aspectType: "trine", orb: 1, applying: false }] },
    "yod-apex-applying": { patternType: "yod", fixture: fixtures.yod, transitAspects: [{ id: "transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }] },
    "mystic-rectangle-member-separating": { patternType: "mystic_rectangle", fixture: fixtures.mystic_rectangle, transitAspects: [{ id: "transit.mercury.sextile.moon", movingBody: "mercury", targetNatalPlanet: "moon", aspectType: "sextile", orb: 2.2, applying: false }] },
    "t-square-multi-trigger-mixed": { patternType: "t_square", fixture: fixtures.t_square, transitAspects: [
      { id: "transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true },
      { id: "transit.jupiter.trine.sun", movingBody: "jupiter", targetNatalPlanet: "sun", aspectType: "trine", orb: 1.5, applying: false }
    ] },
    "t-square-exact": { patternType: "t_square", fixture: fixtures.t_square, transitAspects: [{ id: "transit.exact", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0, applying: true }] },
    "t-square-applying": { patternType: "t_square", fixture: fixtures.t_square, transitAspects: [{ id: "transit.applying", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: true }] },
    "t-square-separating": { patternType: "t_square", fixture: fixtures.t_square, transitAspects: [{ id: "transit.separating", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: false }] },
    "wide-yod-apex": { patternType: "yod", fixture: wideYodFixture, transitAspects: [{ id: "transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }] },
    "partial-yod-apex": { patternType: "yod", fixture: partialYodFixture, transitAspects: [{ id: "transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }] }
  } satisfies Record<string, { patternType: PatternType; fixture: typeof fixtures[string]; transitAspects: unknown[] }>;
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

function targetRoleForContext(context: ActivationContext) {
  const primary = context.triggers.find((trigger) => trigger.activationId === context.primaryTrigger.activationId) || context.triggers[0];
  const role = primary?.targetRoles?.[0] || "pattern_member";
  return role === "spine" ? "resource_planet" : role;
}

function triggerModeForContext(context: ActivationContext): TriggerMode {
  if (context.activationSummary.sharedPlanetFanout) return "shared_planet";
  return context.activationSummary.triggerCount > 1 ? "multiple" : "single";
}

function routeKey(patternType: PatternType, targetRole: string) {
  if (patternType === "grand_square") return "grand_square.member";
  if (patternType === "grand_trine") return "grand_trine.member";
  if (patternType === "mystic_rectangle") return "mystic_rectangle.member";
  if (patternType === "t_square" && targetRole === "opposition_axis") return "t_square.opposition_member";
  return `${patternType}.${targetRole}`;
}

function readGoldenFixtureIds() {
  return fs.readdirSync(goldenDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .filter((fixtureId) => !fixtureId.startsWith("emergency-"));
}

function coverageReport() {
  const cases = goldenCases();
  const contextsByFixtureId = new Map(Object.entries(cases).map(([fixtureId, fixtureCase]) => [fixtureId, contextForCase(fixtureCase)]));
  const goldenFixtureIds = readGoldenFixtureIds();
  const goldenCounts = new Map<string, number>();
  const timingCoverage = new Set<TimingState>();
  const triggerCoverage = new Set<TriggerMode>();
  const confidenceCoverage = new Set<string>();
  for (const fixtureId of goldenFixtureIds) {
    const context = contextsByFixtureId.get(fixtureId);
    if (!context) continue;
    const key = routeKey(context.patternType, targetRoleForContext(context));
    goldenCounts.set(key, (goldenCounts.get(key) || 0) + 1);
    timingCoverage.add(context.activationSummary.timingState);
    triggerCoverage.add(triggerModeForContext(context));
    confidenceCoverage.add(context.natalPattern?.confidence || "exact");
  }

  const rows = routeRows.map((row) => {
    const approvedAuthored = AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS.filter((record) =>
      record.status === "approved" &&
      record.patternType === row.patternType &&
      record.eligibility.targetRoles.includes(row.targetRole)
    );
    const fallback = GOVERNED_ACTIVATION_COPY_RECORDS.some((record) => record.patternType === row.patternType && record.contentLevel === "source_grounded_template");
    const emergency = GOVERNED_ACTIVATION_COPY_RECORDS.some((record) => record.patternType === row.patternType && record.contentLevel === "emergency_fallback");
    const goldenFixtures = goldenCounts.get(row.key) || 0;
    return {
      ...row,
      approvedAuthored: approvedAuthored.length,
      fallback,
      emergency,
      goldenFixtures,
      timingStates: [...timingCoverage].sort(),
      triggerModes: [...triggerCoverage].sort(),
      confidence: [...confidenceCoverage].sort(),
      status: approvedAuthored.length > 0 && fallback && emergency && goldenFixtures > 0 ? "covered" : "needs_attention"
    };
  });

  const records = AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS.map((record) => {
    const matchedPreviews = [...contextsByFixtureId.entries()]
      .filter(([, context]) => context.patternType === record.patternType && record.eligibility.targetRoles.includes(targetRoleForContext(context)))
      .map(([fixtureId, context]) => {
        const authored = resolveAspectPatternActivationCopy(context, { authoredRecords: AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS });
        const fallback = resolveAspectPatternActivationCopy(context, { authoredRecords: [] });
        const validation = validateAuthoredAspectPatternActivationRecord(record, context);
        return {
          fixtureId,
          timingState: context.activationSummary.timingState,
          triggerMode: triggerModeForContext(context),
          confidence: context.natalPattern?.confidence || "exact",
          targetRole: targetRoleForContext(context),
          authored,
          fallback,
          changedFields: changedFields(authored, fallback),
          resolverSource: authored.source,
          validation
        };
      });
    return {
      id: record.id,
      version: record.version,
      status: record.status,
      patternType: record.patternType,
      eligibility: record.eligibility,
      contentSections: record.content.sections.map((section) => section.id),
      provenance: record.provenance,
      prohibitedClaims: record.languageRules.prohibitedClaims,
      prohibitedTerms: record.languageRules.prohibitedTerms || [],
      validationStatus: matchedPreviews.every((preview) => preview.validation.ok) ? "valid" : "needs_attention",
      previews: matchedPreviews
    };
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    rows,
    records,
    secondaryCoverage: {
      timingStates: [...timingCoverage].sort(),
      triggerModes: [...triggerCoverage].sort(),
      confidence: [...confidenceCoverage].sort(),
      emergencyFallbacks: GOVERNED_ACTIVATION_COPY_RECORDS.filter((record) => record.contentLevel === "emergency_fallback").length
    }
  };
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Use GET." });
    return;
  }

  sendJson(res, 200, coverageReport());
}
