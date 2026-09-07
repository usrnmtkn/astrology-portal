import { createHash } from "node:crypto";
import fs from "node:fs";

type FactRecord = Record<string, unknown>;
export type AskTldrAuthoritySurface = "you-natal" | "you-transit";
export type AskTldrAuthorityUsage = "primary" | "mechanism-reference";

export type AskTldrSnapshotCandidate = {
  id: string;
  kind: string;
  facts: FactRecord;
  points?: string[];
  houses?: number[];
};

export type AskTldrSnapshotMeaning = {
  status: "full";
  sourceKind: "owner_approved_internal_mechanism" | "owner_approved_manifestation_set";
  evidenceSurface: AskTldrAuthoritySurface;
  canonicalIds: string[];
  targetUsages: AskTldrAuthorityUsage[];
  mappingBases: string[];
  unresolvedKnowledgeIds: string[];
  packet: Record<string, unknown>;
  promptEvidence: string;
  indexSha256: null;
  governanceSourceSha256: string;
  packetSha256: string;
};

const NATAL_HOUSE_APPROVAL_URL = new URL(
  "../../packages/astro-knowledge/review/natal-house-mechanism-owner-approval-2026-08-20.json",
  import.meta.url
);
const NATAL_HOUSE_SOURCE_FILES = [
  {
    path: "packages/astro-knowledge/review/natal-placement-canonical-mechanisms-review-2026-08-17.json",
    url: new URL("../../packages/astro-knowledge/review/natal-placement-canonical-mechanisms-review-2026-08-17.json", import.meta.url)
  },
  {
    path: "packages/astro-knowledge/review/natal-house-canonical-mechanisms-review-wave-2-2026-08-17.json",
    url: new URL("../../packages/astro-knowledge/review/natal-house-canonical-mechanisms-review-wave-2-2026-08-17.json", import.meta.url)
  }
] as const;
const NATAL_ASCENDANT_AUTHORITY_PATH = "config/ask-tldr/authorities/natal-ascendant-v1.json";
const NATAL_ASCENDANT_AUTHORITY_URL = new URL(`../../${NATAL_ASCENDANT_AUTHORITY_PATH}`, import.meta.url);
const NATAL_ASCENDANT_MEANING_SHA256 = "6181083942c0c2252263653561acb5397cebeaab2d118f2a94d32294b085113b";
const SR_OVERLAY_PATH = "packages/astro-knowledge/data/manifestation-sets/sr-overlays-v1.json";
const SR_OVERLAY_URL = new URL(`../../${SR_OVERLAY_PATH}`, import.meta.url);
const SR_OVERLAY_ELIGIBLE_POINTS = new Set([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"
]);

let natalHouseCache: null | {
  approvalSha256: string;
  decisionsByKey: Map<string, FactRecord>;
  sourceByKey: Map<string, { row: FactRecord; path: string; sourceSha256: string }>;
} = null;
let natalAscendantCache: null | {
  sourceSha256: string;
  meaning: string;
} = null;
let srOverlayCache: null | {
  sourceSha256: string;
  recordsByKey: Map<string, FactRecord>;
} = null;

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function record(value: unknown): FactRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as FactRecord : null;
}

function records(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is FactRecord => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    : [];
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

function slug(value: unknown) {
  return words(value).toLowerCase().replace(/[_\s]+/gu, "-").replace(/[^a-z0-9-]+/gu, "").replace(/-+/gu, "-");
}

function houseLabel(house: number) {
  const suffix = house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th";
  return `${house}${suffix} house`;
}

function candidatePoint(candidate: AskTldrSnapshotCandidate) {
  return words(candidate.facts.point ?? candidate.facts.planet) || words(candidate.points?.[0]);
}

function candidateHouse(candidate: AskTldrSnapshotCandidate) {
  return numberValue(candidate.facts.house) ?? candidate.houses?.[0] ?? null;
}

function loadNatalAscendantAuthority() {
  if (natalAscendantCache) return natalAscendantCache;
  const source = parseJsonFile(NATAL_ASCENDANT_AUTHORITY_URL);
  const governance = record(source.value.governance);
  const meaning = words(source.value.meaning);
  const meaningSha256 = words(source.value.meaningSha256);
  if (source.value.schema !== "ask-tldr-internal-semantic-authority/v1"
    || source.value.id !== "natal-angle-ascendant-v1"
    || source.value.canonicalId !== "natal-angle/ascendant"
    || source.value.factorKey !== "natal-angle:ascendant"
    || source.value.status !== "owner_approved"
    || source.value.ownerApproved !== true
    || source.value.approvedOn !== "2026-09-06"
    || source.value.approvedScope !== "ask-tldr-internal-semantic-authority"
    || !meaning
    || meaningSha256 !== NATAL_ASCENDANT_MEANING_SHA256
    || sha256(meaning) !== NATAL_ASCENDANT_MEANING_SHA256
    || governance?.readerCopyApproved !== false
    || governance?.servingChangesAuthorized !== false
    || governance?.promotionAuthorized !== false
    || governance?.runtimeEnabled !== false
    || governance?.autoPublish !== false) {
    throw new Error("ASK_TLDR_NATAL_ASCENDANT_AUTHORITY_INVALID");
  }
  natalAscendantCache = { sourceSha256: source.sha256, meaning };
  return natalAscendantCache;
}

function ownerApprovedNatalAscendantMechanism(
  candidate: AskTldrSnapshotCandidate,
  unresolvedKnowledgeIds: string[]
): AskTldrSnapshotMeaning | null {
  const point = candidatePoint(candidate);
  const house = candidateHouse(candidate);
  if (candidate.kind !== "natal_placement" || slug(point) !== "ascendant" || house !== 1) return null;
  const snapshot = loadNatalAscendantAuthority();
  const canonicalId = "internal-mechanism:natal-angle:ascendant";
  const evidence = [{
    authorityClass: "factual-evidence",
    surfacePermission: ["you-natal:mechanism-reference"],
    store: "owner-approved-internal-natal-angle-authority",
    path: NATAL_ASCENDANT_AUTHORITY_PATH,
    field: "meaning",
    rowKey: "natal-angle:ascendant",
    sourceSha256: snapshot.sourceSha256,
    text: snapshot.meaning,
    usage: "mechanism-reference",
    temporality: "lifelong-pattern",
    framingAllowed: false,
    evidenceSha256: sha256Json({
      canonicalId,
      meaningSha256: NATAL_ASCENDANT_MEANING_SHA256,
      sourceSha256: snapshot.sourceSha256
    })
  }];
  const packetWithoutHash = {
    schemaVersion: 1,
    packetKind: "ask-tldr-owner-approved-internal-natal-angle-authority",
    canonicalId,
    surface: "you-natal",
    register: "article",
    evidence,
    authorization: {
      path: NATAL_ASCENDANT_AUTHORITY_PATH,
      sha256: snapshot.sourceSha256,
      approvedMeaningSha256: NATAL_ASCENDANT_MEANING_SHA256,
      approvedScope: "ask-tldr-internal-semantic-authority",
      readerCopyApproved: false,
      servingChangesAuthorized: false,
      promotionAuthorized: false,
      runtimeEnabled: false
    }
  };
  const packetSha256 = sha256Json(packetWithoutHash);
  const packet = { ...packetWithoutHash, packetSha256 };
  const promptEvidence = [
    `CANONICAL OBJECT: ${canonicalId}`,
    "TEMPORALITY: lifelong-pattern",
    "SURFACE: you-natal",
    "USAGE: internal Ascendant semantic mechanism only; not sign-specific or aspect-specific reader copy",
    "",
    "ASTROLOGICAL MECHANISM (owner-approved generic natal Ascendant meaning; not mandatory reader copy)",
    "--- [factual-evidence; source=natal-angle:ascendant]",
    snapshot.meaning
  ].join("\n");
  return {
    status: "full",
    sourceKind: "owner_approved_internal_mechanism",
    evidenceSurface: "you-natal",
    canonicalIds: [canonicalId],
    targetUsages: ["mechanism-reference"],
    mappingBases: ["owner-approved-generic-natal-ascendant-semantic-authority"],
    unresolvedKnowledgeIds,
    packet,
    promptEvidence,
    indexSha256: null,
    governanceSourceSha256: snapshot.sourceSha256,
    packetSha256
  };
}

function loadNatalHouseSnapshot() {
  if (natalHouseCache) return natalHouseCache;
  const approval = parseJsonFile(NATAL_HOUSE_APPROVAL_URL);
  const authority = record(approval.value.authority);
  const governance = record(approval.value.governance);
  const counts = record(approval.value.counts);
  const sourceArtifacts = Array.isArray(approval.value.sourceArtifacts)
    ? approval.value.sourceArtifacts.map(words).filter(Boolean)
    : [];
  if (approval.value.schema !== "tldr-natal-house-mechanism-owner-approval/v1"
    || words(authority?.rulingDate) !== "2026-08-20"
    || governance?.internalMechanismsOnly !== true
    || governance?.readerCopyApproved !== false
    || governance?.servingChangesAuthorized !== false
    || governance?.autoPublish !== false
    || governance?.writerPromotion !== false
    || counts?.approvedSupported !== 156
    || counts?.retainedSourceGap !== 12
    || NATAL_HOUSE_SOURCE_FILES.some(({ path }) => !sourceArtifacts.includes(path))) {
    throw new Error("ASK_TLDR_NATAL_HOUSE_MECHANISM_AUTHORIZATION_INVALID");
  }

  const decisions = records(approval.value.decisions);
  const decisionsByKey = new Map(decisions.map((entry) => [words(entry.runtimeKey), entry]));
  if (decisionsByKey.size !== 168) {
    throw new Error("ASK_TLDR_NATAL_HOUSE_MECHANISM_DECISION_COUNT_INVALID");
  }

  const sourceByKey = new Map<string, { row: FactRecord; path: string; sourceSha256: string }>();
  for (const sourceFile of NATAL_HOUSE_SOURCE_FILES) {
    const parsed = parseJsonFile(sourceFile.url);
    for (const row of records(parsed.value.rows)) {
      const runtimeKey = words(row.runtimeKey);
      if (!runtimeKey) continue;
      sourceByKey.set(runtimeKey, { row, path: sourceFile.path, sourceSha256: parsed.sha256 });
    }
  }

  natalHouseCache = { approvalSha256: approval.sha256, decisionsByKey, sourceByKey };
  return natalHouseCache;
}

export function ownerApprovedNatalHouseMechanism(
  candidate: AskTldrSnapshotCandidate,
  unresolvedKnowledgeIds: string[]
): AskTldrSnapshotMeaning | null {
  if (candidate.kind !== "natal_placement") return null;
  const point = candidatePoint(candidate);
  const house = candidateHouse(candidate);
  if (!point || house === null || house < 1 || house > 12) return null;

  const ascendantAuthority = ownerApprovedNatalAscendantMechanism(candidate, unresolvedKnowledgeIds);
  if (ascendantAuthority) return ascendantAuthority;

  const runtimeKey = `${slug(point)}|${houseLabel(house)}`;
  const snapshot = loadNatalHouseSnapshot();
  const decision = snapshot.decisionsByKey.get(runtimeKey);
  const source = snapshot.sourceByKey.get(runtimeKey);
  if (!decision || words(decision.decision) !== "approve_internal_mechanism" || !source) return null;

  const text = words(source.row.proposedAstrologySupport);
  const textSha256 = words(source.row.proposedAstrologySupportSha256);
  const approvedTextSha256 = words(decision.proposedAstrologySupportSha256);
  const evidenceSha256 = words(source.row.sourceEvidenceSha256);
  const approvedEvidenceSha256 = words(decision.sourceEvidenceSha256);
  const sourceStatus = words(source.row.evidenceStatus || source.row.sourceCoverageStatus);
  if (sourceStatus !== "SUPPORTED"
    || !text
    || !textSha256
    || textSha256 !== approvedTextSha256
    || sha256(text) !== textSha256
    || !evidenceSha256
    || evidenceSha256 !== approvedEvidenceSha256) {
    throw new Error(`ASK_TLDR_NATAL_HOUSE_MECHANISM_HASH_MISMATCH: ${runtimeKey}`);
  }

  const canonicalId = `internal-mechanism:${runtimeKey}`;
  const evidence = [{
    authorityClass: "factual-evidence",
    surfacePermission: ["you-natal:mechanism-reference"],
    store: "owner-approved-internal-natal-mechanism",
    path: source.path,
    field: "proposedAstrologySupport",
    rowKey: runtimeKey,
    sourceSha256: source.sourceSha256,
    text,
    usage: "mechanism-reference",
    temporality: "lifelong-pattern",
    framingAllowed: false,
    evidenceSha256: sha256Json({ canonicalId, runtimeKey, textSha256, approvedEvidenceSha256, approvalSha256: snapshot.approvalSha256 })
  }];
  const packetWithoutHash = {
    schemaVersion: 1,
    packetKind: "ask-tldr-owner-approved-internal-natal-mechanism",
    canonicalId,
    surface: "you-natal",
    register: "article",
    evidence,
    authorization: {
      path: "packages/astro-knowledge/review/natal-house-mechanism-owner-approval-2026-08-20.json",
      sha256: snapshot.approvalSha256,
      decision: "approve_internal_mechanism",
      proposedAstrologySupportSha256: approvedTextSha256,
      sourceEvidenceSha256: approvedEvidenceSha256,
      readerCopyApproved: false,
      servingChangesAuthorized: false
    }
  };
  const packetSha256 = sha256Json(packetWithoutHash);
  const packet = { ...packetWithoutHash, packetSha256 };
  const promptEvidence = [
    `CANONICAL OBJECT: ${canonicalId}`,
    "TEMPORALITY: lifelong-pattern",
    "SURFACE: you-natal",
    "USAGE: internal astrology mechanism only; generated prose remains calibration-only and non-serving",
    "",
    "ASTROLOGICAL MECHANISM (owner-approved AstrologySupport source; not reader copy)",
    `--- [factual-evidence; source=${runtimeKey}]`,
    text
  ].join("\n");
  return {
    status: "full",
    sourceKind: "owner_approved_internal_mechanism",
    evidenceSurface: "you-natal",
    canonicalIds: [canonicalId],
    targetUsages: ["mechanism-reference"],
    mappingBases: ["owner-approved-internal-natal-house-mechanism"],
    unresolvedKnowledgeIds,
    packet,
    promptEvidence,
    indexSha256: null,
    governanceSourceSha256: snapshot.approvalSha256,
    packetSha256
  };
}

function loadSrOverlaySnapshot() {
  if (srOverlayCache) return srOverlayCache;
  const source = parseJsonFile(SR_OVERLAY_URL);
  if (source.value.id !== "sr-overlay-manifestation-sets-v1"
    || source.value.kind !== "manifestation-set-collection") {
    throw new Error("ASK_TLDR_SR_OVERLAY_SOURCE_INVALID");
  }
  const recordObject = record(source.value.records);
  if (!recordObject) throw new Error("ASK_TLDR_SR_OVERLAY_SOURCE_EMPTY");
  srOverlayCache = {
    sourceSha256: source.sha256,
    recordsByKey: new Map(Object.entries(recordObject).flatMap(([key, value]) => {
      const row = record(value);
      return row ? [[key, row] as const] : [];
    }))
  };
  return srOverlayCache;
}

export function ownerApprovedSolarReturnOverlay(
  candidate: AskTldrSnapshotCandidate,
  unresolvedKnowledgeIds: string[]
): AskTldrSnapshotMeaning | null {
  if (candidate.kind !== "solar_return_overlay") return null;
  const point = candidatePoint(candidate);
  const house = candidateHouse(candidate);
  const pointSlug = slug(point);
  if (!pointSlug || !SR_OVERLAY_ELIGIBLE_POINTS.has(pointSlug) || house === null || house < 1 || house > 12) return null;
  const contentKey = `sr-overlay/${pointSlug}/${house}`;
  const snapshot = loadSrOverlaySnapshot();
  const row = snapshot.recordsByKey.get(contentKey);
  const match = record(row?.match);
  const copyClaim = record(row?.copyClaim);
  const text = words(copyClaim?.text);
  if (!row
    || row.factorType !== "sr-overlay"
    || match?.house !== house
    || slug(match?.overlayPoint) !== pointSlug
    || row.review_status !== "approved"
    || copyClaim?.review_status !== "approved"
    || !text
    || !words(row.provenance).includes("owner-approved")) {
    return null;
  }

  const evidence = [{
    authorityClass: "owner-approved-prose",
    surfacePermission: ["you-natal"],
    store: "owner-approved-sr-overlay-manifestation-set",
    path: SR_OVERLAY_PATH,
    field: "copyClaim.text",
    rowKey: contentKey,
    sourceSha256: snapshot.sourceSha256,
    text,
    usage: "primary",
    temporality: "annual",
    framingAllowed: true,
    evidenceSha256: sha256Json({ contentKey, text, sourceSha256: snapshot.sourceSha256 })
  }];
  const packetWithoutHash = {
    schemaVersion: 1,
    packetKind: "ask-tldr-owner-approved-sr-overlay",
    canonicalId: contentKey,
    surface: "you-natal",
    register: "article",
    evidence,
    constraints: {
      domain: Array.isArray(row.domain) ? row.domain : [],
      possibleLivedManifestations: Array.isArray(row.possibleLivedManifestations) ? row.possibleLivedManifestations : [],
      doNotAssume: Array.isArray(row.doNotAssume) ? row.doNotAssume : []
    }
  };
  const packetSha256 = sha256Json(packetWithoutHash);
  const packet = { ...packetWithoutHash, packetSha256 };
  const promptEvidence = [
    `CANONICAL OBJECT: ${contentKey}`,
    "TEMPORALITY: annual",
    "SURFACE: you-natal",
    "",
    "ASTROLOGICAL TRUTH (owner-approved Solar Return overlay manifestation set)",
    `--- [owner-approved-prose; source=${contentKey}]`,
    text,
    Array.isArray(row.doNotAssume) && row.doNotAssume.length ? `DO NOT ASSUME: ${row.doNotAssume.map(String).join(" | ")}` : ""
  ].filter(Boolean).join("\n");
  return {
    status: "full",
    sourceKind: "owner_approved_manifestation_set",
    evidenceSurface: "you-natal",
    canonicalIds: [contentKey],
    targetUsages: ["primary"],
    mappingBases: ["owner-approved-sr-overlay-manifestation-set"],
    unresolvedKnowledgeIds,
    packet,
    promptEvidence,
    indexSha256: null,
    governanceSourceSha256: snapshot.sourceSha256,
    packetSha256
  };
}
