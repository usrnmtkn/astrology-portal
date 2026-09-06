import { createHash } from "node:crypto";
import fs from "node:fs";
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
type GovernedMeaningSourceKind = "knowledge_index" | "owner_approved_cms_snapshot";

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
    sourceKind: GovernedMeaningSourceKind | null;
    evidenceSurface: EvidenceSurface;
    canonicalIds: string[];
    targetUsages: TargetUsage[];
    mappingBases: string[];
    unresolvedKnowledgeIds: string[];
    packet: Record<string, unknown> | null;
    promptEvidence: string | null;
    indexSha256: string | null;
    governanceSourceSha256: string | null;
    packetSha256: string | null;
  };
};

const APPROVED_MEANING_AUTHORITIES = new Set(["owner-approved-prose", "factual-evidence"]);
const FILTER_ID = "ask-tldr-approved-meaning-v1";
const CMS_TRANSIT_CANDIDATES_URL = new URL(
  "../../packages/astro-knowledge/review/transit-aspect-you-refresh-candidates-2026-09-04.json",
  import.meta.url
);
const CMS_TRANSIT_AUTHORIZATION_URL = new URL(
  "../../packages/astro-knowledge/review/transit-aspect-you-refresh-376-owner-live-2026-09-04.json",
  import.meta.url
);
const CONJUNCTION_SOFT_PLANETS = new Set(["venus", "sun", "mercury", "jupiter"]);

let cmsTransitSnapshotCache: null | {
  candidateFileSha256: string;
  authorizationFileSha256: string;
  recordsByKey: Map<string, FactRecord>;
  approvalsByKey: Map<string, FactRecord>;
} = null;

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value: unknown) {
  return sha256(JSON.stringify(value));
}

function parseJsonFile(url: URL) {
  const raw = fs.readFileSync(url, "utf8");
  return { raw, value: JSON.parse(raw) as FactRecord, sha256: sha256(raw) };
}

function recordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is FactRecord => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function contentSlug(value: unknown) {
  return words(value).toLowerCase().replace(/[_\s]+/gu, "-").replace(/[^a-z0-9-]+/gu, "").replace(/-+/gu, "-");
}

function transitAspectFamily(planet: string, aspect: string) {
  const normalizedPlanet = contentSlug(planet);
  const normalizedAspect = contentSlug(aspect);
  if (["trine", "sextile"].includes(normalizedAspect)) return "soft";
  if (normalizedAspect === "conjunction" && CONJUNCTION_SOFT_PLANETS.has(normalizedPlanet)) return "soft";
  return "hard";
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

function loadCmsTransitSnapshot() {
  if (cmsTransitSnapshotCache) return cmsTransitSnapshotCache;
  const candidates = parseJsonFile(CMS_TRANSIT_CANDIDATES_URL);
  const authorization = parseJsonFile(CMS_TRANSIT_AUTHORIZATION_URL);
  if (authorization.value.decision !== "approve"
    || authorization.value.surface !== "personal-transits-you"
    || authorization.value.approvedField !== "body_you"
    || !recordArray(authorization.value.members).length
    || !Array.isArray(authorization.value.capabilities)
    || !authorization.value.capabilities.includes("serving")) {
    throw new Error("ASK_TLDR_CMS_TRANSIT_AUTHORIZATION_INVALID");
  }
  if (words(authorization.value.sourceRecordSha256) !== candidates.sha256) {
    throw new Error("ASK_TLDR_CMS_TRANSIT_SOURCE_HASH_MISMATCH");
  }
  const recordsByKey = new Map(recordArray(candidates.value.records).map((entry) => [words(entry.contentKey), entry]));
  const approvalsByKey = new Map(recordArray(authorization.value.members).map((entry) => [words(entry.contentKey), entry]));
  if (recordsByKey.size < 1 || approvalsByKey.size < 1) {
    throw new Error("ASK_TLDR_CMS_TRANSIT_SOURCE_EMPTY");
  }
  cmsTransitSnapshotCache = {
    candidateFileSha256: candidates.sha256,
    authorizationFileSha256: authorization.sha256,
    recordsByKey,
    approvalsByKey
  };
  return cmsTransitSnapshotCache;
}

function cmsTransitContentKeys(candidate: RankedCalculatedEvidence) {
  if (!["transit_to_natal", "return"].includes(candidate.kind)) return [];
  const { transitPlanet, natalPoint, aspect } = transitFields(candidate.facts);
  if (!transitPlanet || !natalPoint || !aspect) return [];
  const planet = contentSlug(transitPlanet);
  const point = contentSlug(natalPoint);
  const aspectSlug = contentSlug(aspect);
  const family = transitAspectFamily(planet, aspectSlug);
  return unique([
    `authored/transit-aspect/${planet}/${point}/${aspectSlug}`,
    `authored/transit-aspect/${planet}/${point}/${family}`
  ]);
}

function cmsTransitGovernedMeaning(
  candidate: RankedCalculatedEvidence,
  surface: EvidenceSurface,
  unresolvedKnowledgeIds: string[]
): AskTldrGovernedFactor["governedMeaning"] | null {
  if (surface !== "you-transit") return null;
  const snapshot = loadCmsTransitSnapshot();
  for (const contentKey of cmsTransitContentKeys(candidate)) {
    const source = snapshot.recordsByKey.get(contentKey);
    const approval = snapshot.approvalsByKey.get(contentKey);
    if (!source || !approval) continue;
    const text = words(source.proposedBodyYou);
    const textSha256 = words(source.proposedBodyYouSha256);
    const approvedPayloadSha256 = words(approval.payloadSha256);
    if (!text || !textSha256 || textSha256 !== approvedPayloadSha256 || sha256(text) !== textSha256) {
      throw new Error(`ASK_TLDR_CMS_TRANSIT_PAYLOAD_HASH_MISMATCH: ${contentKey}`);
    }
    const sourceAuthorityText = words(source.sourceBodyThey);
    const sourceAuthoritySha256 = words(source.sourceBodyTheySha256);
    const approvedAuthoritySha256 = words(approval.semanticAuthoritySha256);
    if (approvedAuthoritySha256 && (
      !sourceAuthorityText
      || sourceAuthoritySha256 !== approvedAuthoritySha256
      || sha256(sourceAuthorityText) !== sourceAuthoritySha256
    )) {
      throw new Error(`ASK_TLDR_CMS_TRANSIT_SEMANTIC_AUTHORITY_HASH_MISMATCH: ${contentKey}`);
    }
    const evidence = [{
      authorityClass: "owner-approved-prose",
      surfacePermission: ["you-transit"],
      store: "owner-approved-cms-transit-snapshot",
      path: "packages/astro-knowledge/review/transit-aspect-you-refresh-candidates-2026-09-04.json",
      field: "proposedBodyYou",
      rowKey: contentKey,
      sourceSha256: snapshot.candidateFileSha256,
      text,
      usage: "primary",
      temporality: "temporary-window",
      framingAllowed: true,
      evidenceSha256: sha256Json({
        contentKey,
        textSha256,
        semanticAuthoritySha256: approvedAuthoritySha256 || null,
        authorizationSha256: snapshot.authorizationFileSha256
      })
    }];
    const packetWithoutHash = {
      schemaVersion: 1,
      packetKind: "ask-tldr-owner-approved-cms-transit",
      contentKey,
      surface: "you-transit",
      register: "article",
      evidence,
      authorization: {
        path: "packages/astro-knowledge/review/transit-aspect-you-refresh-376-owner-live-2026-09-04.json",
        sha256: snapshot.authorizationFileSha256,
        payloadSha256: approvedPayloadSha256,
        semanticAuthoritySha256: approvedAuthoritySha256 || null
      }
    };
    const packetSha256 = sha256Json(packetWithoutHash);
    const packet = { ...packetWithoutHash, packetSha256 };
    const promptEvidence = [
      `CANONICAL OBJECT: cms:${contentKey}`,
      "TEMPORALITY: temporary-window",
      "SURFACE: you-transit",
      "",
      "ASTROLOGICAL TRUTH (owner-approved current Personal Transit meaning; not a prose template)",
      `--- [owner-approved-prose; source=${contentKey}]`,
      text
    ].join("\n");
    return {
      status: "full",
      sourceKind: "owner_approved_cms_snapshot",
      evidenceSurface: surface,
      canonicalIds: [`cms:${contentKey}`],
      targetUsages: ["primary"],
      mappingBases: ["owner-approved-cms-transit-aspect"],
      unresolvedKnowledgeIds,
      packet,
      promptEvidence,
      indexSha256: null,
      governanceSourceSha256: snapshot.authorizationFileSha256,
      packetSha256
    };
  }
  return null;
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

  if (status !== "full") {
    const cmsMeaning = cmsTransitGovernedMeaning(candidate, surface, explicit.unresolvedKnowledgeIds);
    if (cmsMeaning) return { ...candidate, governedMeaning: cmsMeaning };
  }

  if (!targets.length) {
    return {
      ...candidate,
      governedMeaning: {
        status,
        sourceKind: null,
        evidenceSurface: surface,
        canonicalIds: [],
        targetUsages: [],
        mappingBases: [],
        unresolvedKnowledgeIds: explicit.unresolvedKnowledgeIds,
        packet: null,
        promptEvidence: null,
        indexSha256: null,
        governanceSourceSha256: null,
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
      sourceKind: "knowledge_index",
      evidenceSurface: surface,
      canonicalIds: targets.map((target) => target.canonicalId),
      targetUsages: targets.map((target) => target.targetUsage),
      mappingBases: unique(targets.map((target) => target.mappingBasis)),
      unresolvedKnowledgeIds: explicit.unresolvedKnowledgeIds,
      packet,
      promptEvidence,
      indexSha256: words(packet.indexSha256) || null,
      governanceSourceSha256: words(packet.indexSha256) || null,
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
