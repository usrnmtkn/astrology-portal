import { createRequire } from "node:module";
import type { AskTldrRankedEvidence } from "./ask-tldr-model.ts";
import type { AskTldrCalculatedEvidenceCandidate } from "./ask-tldr-evidence-adapter.ts";

const require = createRequire(import.meta.url);
const productionEvidence = require("../../src/astro-writing/productionEvidenceAdapter.cjs") as {
  mapLegacyIdentifier: (legacyIdentifier: string, context?: Record<string, unknown>) => {
    legacyIdentifier: string;
    canonicalIds: string[];
    targetUsages: Array<"primary" | "mechanism-reference">;
    mappingBasis: string;
  };
  canonicalBody: (value: unknown) => string;
};
const knowledgeResolver = require("../../packages/astro-knowledge/scripts/knowledge-resolver.js") as {
  resolve: (canonicalId: string, options?: { surface?: string; usage?: "primary" | "mechanism-reference" }) => {
    id: string;
    kind: string | null;
    records: Array<Record<string, unknown>>;
  };
  buildPacket: (canonicalId: string, options?: Record<string, unknown>) => Record<string, unknown>;
  buildMultiTargetPacket: (canonicalIds: string[], options?: Record<string, unknown>) => Record<string, unknown>;
  packetToPrompt: (packet: Record<string, unknown>) => string;
  multiTargetPacketToPrompt: (packet: Record<string, unknown>) => string;
  loadIndex: () => { byId: Map<string, unknown>; indexSha256: string };
};

type FactRecord = Record<string, unknown>;
type TargetUsage = "primary" | "mechanism-reference";
type EvidenceSurface = "you-natal" | "you-transit";

type RankedCalculatedEvidence = AskTldrRankedEvidence & Pick<
  AskTldrCalculatedEvidenceCandidate,
  "label" | "facts" | "knowledgeIds"
>;

type MeaningTarget = {
  canonicalId: string;
  targetUsage: TargetUsage;
  mappingBasis: string;
};

export type AskTldrGovernedFactor = RankedCalculatedEvidence & {
  governedMeaning: {
    status: "full" | "partial" | "missing";
    evidenceSurface: EvidenceSurface;
    canonicalIds: string[];
    targetUsages: TargetUsage[];
    mappingBases: string[];
    unresolvedKnowledgeIds: string[];
    packet: Record<string, unknown> | null;
    promptEvidence: string | null;
    indexSha256: string | null;
    packetSha256: string | null;
  };
};

const APPROVED_MEANING_AUTHORITIES = new Set(["owner-approved-prose", "factual-evidence"]);
const FILTER_ID = "ask-tldr-approved-meaning-v1";

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function approvedMeaningRecord(record: Record<string, unknown>) {
  return APPROVED_MEANING_AUTHORITIES.has(words(record.authorityClass));
}

function surfaceForKind(kind: AskTldrRankedEvidence["kind"]): EvidenceSurface {
  return ["natal_placement", "natal_aspect", "profection", "solar_return_overlay"].includes(kind)
    ? "you-natal"
    : "you-transit";
}

function mappingContext(surface: EvidenceSurface) {
  return surface === "you-natal"
    ? { surface: "natal", eventType: "natal", evidenceSurface: "you-natal" }
    : { surface: "you", eventType: "transit", evidenceSurface: "you-transit" };
}

function mapLegacyIdentifier(legacyIdentifier: string, surface: EvidenceSurface) {
  try {
    return productionEvidence.mapLegacyIdentifier(legacyIdentifier, mappingContext(surface));
  } catch {
    return null;
  }
}

function targetsFromMapping(mapping: ReturnType<typeof mapLegacyIdentifier>): MeaningTarget[] {
  if (!mapping) return [];
  return mapping.canonicalIds.map((canonicalId, index) => ({
    canonicalId,
    targetUsage: mapping.targetUsages[index] ?? "mechanism-reference",
    mappingBasis: mapping.mappingBasis
  }));
}

function directMechanismTarget(canonicalId: string, mappingBasis: string): MeaningTarget[] {
  return knowledgeResolver.loadIndex().byId.has(canonicalId)
    ? [{ canonicalId, targetUsage: "mechanism-reference", mappingBasis }]
    : [];
}

function transitFields(facts: FactRecord) {
  return {
    transitPlanet: words(facts.transitPlanet),
    natalPoint: words(facts.natalPoint),
    aspect: words(facts.aspect)
  };
}

function natalAspectFields(facts: FactRecord) {
  return {
    from: words(facts.from ?? facts.from_),
    to: words(facts.to),
    aspect: words(facts.type ?? facts.aspect)
  };
}

function natalPlacementFields(facts: FactRecord, candidate: RankedCalculatedEvidence) {
  return {
    point: words(facts.point ?? facts.planet) || words(candidate.points?.[0]),
    sign: words(facts.sign),
    house: numberValue(facts.house) ?? candidate.houses?.[0] ?? null
  };
}

function derivedMeaningTargets(candidate: RankedCalculatedEvidence, surface: EvidenceSurface): MeaningTarget[] {
  const targets: MeaningTarget[] = [];

  if (candidate.kind === "transit_to_natal" || candidate.kind === "return") {
    const { transitPlanet, natalPoint, aspect } = transitFields(candidate.facts);
    if (transitPlanet && natalPoint && aspect) {
      targets.push(...targetsFromMapping(mapLegacyIdentifier(
        `transit-natal-${transitPlanet}-${aspect}-${natalPoint}`,
        surface
      )));
      if (candidate.kind === "return") {
        const returnId = productionEvidence.canonicalBody(transitPlanet) === "jupiter"
          ? "jupiter-return-cycle"
          : productionEvidence.canonicalBody(transitPlanet) === "saturn"
            ? "saturn-return"
            : "planetary-return-framework";
        targets.push(...targetsFromMapping(mapLegacyIdentifier(returnId, surface)));
      }
    }
  }

  if (candidate.kind === "natal_aspect") {
    const { from, to, aspect } = natalAspectFields(candidate.facts);
    if (from && to && aspect) {
      targets.push(...targetsFromMapping(mapLegacyIdentifier(`natal-${from}-${aspect}-${to}`, surface)));
    }
  }

  if (candidate.kind === "natal_placement") {
    const { point, sign, house } = natalPlacementFields(candidate.facts, candidate);
    if (point && sign) {
      targets.push(...targetsFromMapping(mapLegacyIdentifier(`natal-${point}-in-${sign}`, surface)));
    }
    if (point && house !== null) {
      targets.push(...targetsFromMapping(mapLegacyIdentifier(`natal-${point}-in-house-${house}`, surface)));
    }
    if (!targets.length && point) {
      targets.push(...directMechanismTarget(`body/${productionEvidence.canonicalBody(point)}`, "natal-placement-body-mechanism"));
      if (house !== null) targets.push(...directMechanismTarget(`house/${house}`, "natal-placement-house-mechanism"));
    }
  }

  if (candidate.kind === "transit_through_house") {
    const planet = words(candidate.facts.transitPlanet ?? candidate.facts.planet) || words(candidate.points?.[0]);
    const house = numberValue(candidate.facts.transitHouse ?? candidate.facts.house) ?? candidate.houses?.[0] ?? null;
    if (planet && house !== null) {
      const canonicalId = `transit-house/${productionEvidence.canonicalBody(planet)}/${house}`;
      if (knowledgeResolver.loadIndex().byId.has(canonicalId)) {
        targets.push({ canonicalId, targetUsage: "primary", mappingBasis: "transit-house-exact" });
      } else {
        targets.push(...directMechanismTarget(`body/${productionEvidence.canonicalBody(planet)}`, "transit-house-body-mechanism"));
        targets.push(...directMechanismTarget(`house/${house}`, "transit-house-generic-house-mechanism"));
      }
    }
  }

  if (candidate.kind === "profection") {
    const house = numberValue(candidate.facts.house) ?? candidate.houses?.[0] ?? null;
    const ruler = words(candidate.facts.ruler) || words(candidate.points?.[0]);
    if (house !== null) targets.push(...directMechanismTarget(`house/${house}`, "profection-house-mechanism"));
    if (ruler) targets.push(...directMechanismTarget(`body/${productionEvidence.canonicalBody(ruler)}`, "profection-ruler-mechanism"));
  }

  if (candidate.kind === "solar_return_overlay") {
    const point = words(candidate.facts.point) || words(candidate.points?.[0]);
    const house = numberValue(candidate.facts.house) ?? candidate.houses?.[0] ?? null;
    if (point) targets.push(...directMechanismTarget(`body/${productionEvidence.canonicalBody(point)}`, "solar-return-overlay-body-mechanism"));
    if (house !== null) targets.push(...directMechanismTarget(`house/${house}`, "solar-return-overlay-house-mechanism"));
  }

  if (candidate.kind === "eclipse") {
    const kind = words(candidate.facts.kind).toLowerCase();
    const sign = words(candidate.facts.sign);
    if (sign) {
      const lunation = kind.includes("solar") ? "new-moon" : kind.includes("lunar") ? "full-moon" : "";
      if (lunation) {
        targets.push(...targetsFromMapping(mapLegacyIdentifier(`sky-lunation-${lunation}-${sign}`, surface)));
      }
    }
  }

  return targets;
}

function compatibleKnowledgeTarget(kind: AskTldrRankedEvidence["kind"], canonicalId: string) {
  if (kind === "transit_to_natal" || kind === "return") {
    return canonicalId.startsWith("transit-aspect/") || canonicalId.startsWith("body/")
      || canonicalId.startsWith("aspect/") || canonicalId.startsWith("doc/");
  }
  if (kind === "natal_aspect") return canonicalId.startsWith("natal-aspect/");
  if (kind === "natal_placement") {
    return canonicalId.startsWith("placement-sign/") || canonicalId.startsWith("placement-house/")
      || canonicalId.startsWith("body/") || canonicalId.startsWith("house/");
  }
  if (kind === "transit_through_house") return canonicalId.startsWith("transit-house/") || canonicalId.startsWith("body/") || canonicalId.startsWith("house/");
  if (kind === "eclipse") return canonicalId.startsWith("lunation/") || canonicalId.includes("eclipse");
  if (kind === "profection") return canonicalId.includes("profection") || canonicalId.startsWith("body/") || canonicalId.startsWith("house/");
  if (kind === "solar_return_overlay") return canonicalId.includes("solar_return") || canonicalId.startsWith("body/") || canonicalId.startsWith("house/");
  return false;
}

function explicitKnowledgeTargets(candidate: RankedCalculatedEvidence, surface: EvidenceSurface) {
  const unresolvedKnowledgeIds: string[] = [];
  const targets: MeaningTarget[] = [];
  for (const knowledgeId of candidate.knowledgeIds ?? []) {
    const mapping = mapLegacyIdentifier(knowledgeId, surface);
    if (!mapping) {
      unresolvedKnowledgeIds.push(knowledgeId);
      continue;
    }
    const compatible = targetsFromMapping(mapping).filter((target) => compatibleKnowledgeTarget(candidate.kind, target.canonicalId));
    if (!compatible.length) {
      unresolvedKnowledgeIds.push(knowledgeId);
      continue;
    }
    targets.push(...compatible);
  }
  return { targets, unresolvedKnowledgeIds };
}

function dedupeTargets(targets: MeaningTarget[]) {
  const result: MeaningTarget[] = [];
  const indexes = new Map<string, number>();
  for (const target of targets) {
    const priorIndex = indexes.get(target.canonicalId);
    if (priorIndex === undefined) {
      indexes.set(target.canonicalId, result.length);
      result.push(target);
      continue;
    }
    if (result[priorIndex].targetUsage === "mechanism-reference" && target.targetUsage === "primary") {
      result[priorIndex] = target;
    }
  }
  return result;
}

function availableApprovedTargets(targets: MeaningTarget[], surface: EvidenceSurface) {
  return targets.filter((target) => {
    const resolved = knowledgeResolver.resolve(target.canonicalId, { surface, usage: target.targetUsage });
    return resolved.kind && resolved.records.some(approvedMeaningRecord);
  });
}

function meaningStatus(candidate: RankedCalculatedEvidence, targets: MeaningTarget[]) {
  const ids = targets.map((target) => target.canonicalId);
  const bases = targets.map((target) => target.mappingBasis);
  if (!targets.length) return "missing" as const;

  if (candidate.kind === "transit_to_natal") {
    const exact = ids.some((id) => id.startsWith("transit-aspect/"));
    const composed = ids.filter((id) => id.startsWith("body/")).length >= 2 && ids.some((id) => id.startsWith("aspect/"));
    return exact || composed ? "full" as const : "partial" as const;
  }
  if (candidate.kind === "return") {
    const transitMeaning = ids.some((id) => id.startsWith("transit-aspect/"))
      || (ids.filter((id) => id.startsWith("body/")).length >= 2 && ids.some((id) => id.startsWith("aspect/")));
    const returnFramework = ids.some((id) => id.startsWith("doc/") && bases.some((basis) => basis.includes("static-legacy-identifier")));
    return transitMeaning && returnFramework ? "full" as const : "partial" as const;
  }
  if (candidate.kind === "natal_aspect") return ids.some((id) => id.startsWith("natal-aspect/")) ? "full" as const : "partial" as const;
  if (candidate.kind === "natal_placement") {
    return ids.some((id) => id.startsWith("placement-sign/") || id.startsWith("placement-house/")) ? "full" as const : "partial" as const;
  }
  if (candidate.kind === "transit_through_house") return ids.some((id) => id.startsWith("transit-house/")) ? "full" as const : "partial" as const;
  if (candidate.kind === "eclipse") return ids.some((id) => id.includes("eclipse")) ? "full" as const : "partial" as const;
  if (candidate.kind === "profection") return ids.some((id) => id.includes("profection")) ? "full" as const : "partial" as const;
  if (candidate.kind === "solar_return_overlay") return ids.some((id) => id.includes("solar_return")) ? "full" as const : "partial" as const;
  return "partial" as const;
}

export function resolveAskTldrGovernedFactor(candidate: RankedCalculatedEvidence): AskTldrGovernedFactor {
  if (!candidate.facts || typeof candidate.facts !== "object" || Array.isArray(candidate.facts)) {
    throw new Error(`ASK_TLDR_CALCULATED_FACTS_REQUIRED: ${candidate.id}`);
  }
  const surface = surfaceForKind(candidate.kind);
  const explicit = explicitKnowledgeTargets(candidate, surface);
  const targets = availableApprovedTargets(
    dedupeTargets([...explicit.targets, ...derivedMeaningTargets(candidate, surface)]),
    surface
  );
  const status = meaningStatus(candidate, targets);
  if (!targets.length) {
    return {
      ...candidate,
      governedMeaning: {
        status,
        evidenceSurface: surface,
        canonicalIds: [],
        targetUsages: [],
        mappingBases: [],
        unresolvedKnowledgeIds: explicit.unresolvedKnowledgeIds,
        packet: null,
        promptEvidence: null,
        indexSha256: null,
        packetSha256: null
      }
    };
  }

  const options = {
    surface,
    register: "article",
    targetUsages: targets.map((target) => target.targetUsage),
    targetUsage: targets[0].targetUsage,
    recordFilter: approvedMeaningRecord,
    filterId: FILTER_ID,
    includeRelated: true
  };
  const packet = targets.length === 1
    ? knowledgeResolver.buildPacket(targets[0].canonicalId, options)
    : knowledgeResolver.buildMultiTargetPacket(targets.map((target) => target.canonicalId), options);
  const promptEvidence = targets.length === 1
    ? knowledgeResolver.packetToPrompt(packet)
    : knowledgeResolver.multiTargetPacketToPrompt(packet);

  return {
    ...candidate,
    governedMeaning: {
      status,
      evidenceSurface: surface,
      canonicalIds: targets.map((target) => target.canonicalId),
      targetUsages: targets.map((target) => target.targetUsage),
      mappingBases: unique(targets.map((target) => target.mappingBasis)),
      unresolvedKnowledgeIds: explicit.unresolvedKnowledgeIds,
      packet,
      promptEvidence,
      indexSha256: words(packet.indexSha256) || null,
      packetSha256: words(packet.packetSha256) || null
    }
  };
}

export function buildAskTldrGovernedAnswerPacket(answerPacket: {
  schema: string;
  question: Record<string, unknown>;
  decisionMode: string;
  answerContract: Record<string, unknown>;
  evidence: RankedCalculatedEvidence[];
  evidenceIds: string[];
  generationAllowed: boolean;
  generationBlockReason: string | null;
}) {
  if (!answerPacket.generationAllowed) {
    return {
      schema: "ask-tldr-governed-answer-packet.v1" as const,
      question: answerPacket.question,
      decisionMode: answerPacket.decisionMode,
      answerContract: answerPacket.answerContract,
      evidence: [] as AskTldrGovernedFactor[],
      evidenceIds: answerPacket.evidenceIds,
      generationAllowed: false,
      generationBlockReason: answerPacket.generationBlockReason ?? "NO_RELEVANT_CALCULATED_EVIDENCE"
    };
  }

  const evidence = answerPacket.evidence.map(resolveAskTldrGovernedFactor);
  const primary = evidence.find((factor) => factor.role === "primary");
  const generationAllowed = primary?.governedMeaning.status === "full";
  return {
    schema: "ask-tldr-governed-answer-packet.v1" as const,
    question: answerPacket.question,
    decisionMode: answerPacket.decisionMode,
    answerContract: answerPacket.answerContract,
    evidence,
    evidenceIds: answerPacket.evidenceIds,
    generationAllowed,
    generationBlockReason: generationAllowed ? null : "PRIMARY_GOVERNED_INTERPRETATION_INCOMPLETE"
  };
}
