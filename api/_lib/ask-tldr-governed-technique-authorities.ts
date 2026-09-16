import { createHash } from "node:crypto";
import fs from "node:fs";

type FactRecord = Record<string, unknown>;
type AuthoritySurface = "you-natal" | "you-transit";
type AuthorityUsage = "primary" | "mechanism-reference";

type SnapshotCandidate = {
  id: string;
  kind: string;
  facts: FactRecord;
  points?: string[];
  houses?: number[];
};

export type AskTldrTechniqueAuthorityMeaning = {
  status: "full";
  sourceKind: "owner_approved_manifestation_set" | "owner_approved_profection_doctrine";
  evidenceSurface: AuthoritySurface;
  canonicalIds: string[];
  targetUsages: AuthorityUsage[];
  mappingBases: string[];
  unresolvedKnowledgeIds: string[];
  packet: Record<string, unknown>;
  promptEvidence: string;
  indexSha256: null;
  governanceSourceSha256: string;
  packetSha256: string;
};

const ECLIPSE_HOUSE_PATH = "packages/astro-knowledge/data/manifestation-sets/owner-reference-gaps-v1.json";
const ECLIPSE_HOUSE_URL = new URL(`../../${ECLIPSE_HOUSE_PATH}`, import.meta.url);
const PROFECTION_PATH = "tldr-astro-phrasebank/TLDR-REPORT-HORIZONS-GENERATION-PROMPT-V2-OWNER.md";
const PROFECTION_URL = new URL(`../../${PROFECTION_PATH}`, import.meta.url);

const TWELFTH_HOUSE_PROFECTION_DOCTRINE = "A 12th-house profection makes endings, withdrawal, private processing, closure, and reduced participation more available as major themes. When an ending matters emotionally, grief or mourning may be part of the experience, even when the ending is wanted or necessary.";
const TWELFTH_HOUSE_GRIEF_BOUNDARY = "Do not teach that a 12th-house profection is intrinsically about grief.";

let eclipseHouseCache: null | {
  sourceSha256: string;
  recordsByKey: Map<string, FactRecord>;
} = null;
let profectionCache: null | {
  sourceSha256: string;
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

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function eclipseActivationHouse(candidate: SnapshotCandidate) {
  // An eclipse candidate can also carry natal-contact houses. Only the event's
  // own natalHouse is eligible for the approved eclipse-house authority.
  return numberValue(candidate.facts.natalHouse);
}

function loadEclipseHouseSnapshot() {
  if (eclipseHouseCache) return eclipseHouseCache;
  const source = parseJsonFile(ECLIPSE_HOUSE_URL);
  const approval = record(source.value.approval);
  const sourceRecords = record(source.value.records);
  if (source.value.id !== "owner-reference-report-gaps-v1"
    || source.value.kind !== "manifestation-set-collection"
    || source.value.review_status !== "approved"
    || approval?.status !== "owner_approved"
    || words(approval?.approvedOn) !== "2026-08-10"
    || !sourceRecords) {
    throw new Error("ASK_TLDR_ECLIPSE_HOUSE_AUTHORITY_INVALID");
  }
  eclipseHouseCache = {
    sourceSha256: source.sha256,
    recordsByKey: new Map(Object.entries(sourceRecords).flatMap(([key, value]) => {
      const row = record(value);
      return row ? [[key, row] as const] : [];
    }))
  };
  return eclipseHouseCache;
}

export function ownerApprovedEclipseHousePlacement(
  candidate: SnapshotCandidate,
  unresolvedKnowledgeIds: string[]
): AskTldrTechniqueAuthorityMeaning | null {
  if (candidate.kind !== "eclipse") return null;
  const house = eclipseActivationHouse(candidate);
  if (house === null || house < 1 || house > 12) return null;
  const contentKey = `eclipse-house-placement/${house}`;
  const snapshot = loadEclipseHouseSnapshot();
  const row = snapshot.recordsByKey.get(contentKey);
  const match = record(row?.match);
  const copyClaim = record(row?.copyClaim);
  const text = words(copyClaim?.text);
  if (!row
    || row.factorType !== "eclipse-house-placement"
    || match?.house !== house
    || row.review_status !== "approved"
    || copyClaim?.review_status !== "approved"
    || !text
    || !words(row.provenance).toLowerCase().includes("owner")) {
    return null;
  }

  const domain = stringArray(row.domain);
  const manifestations = stringArray(row.possibleLivedManifestations);
  const doNotAssume = stringArray(row.doNotAssume);
  const evidence = [{
    authorityClass: "owner-approved-prose",
    surfacePermission: ["you-transit"],
    store: "owner-approved-eclipse-house-manifestation-set",
    path: ECLIPSE_HOUSE_PATH,
    field: "copyClaim.text",
    rowKey: contentKey,
    sourceSha256: snapshot.sourceSha256,
    text,
    usage: "primary",
    temporality: "dated-event",
    framingAllowed: true,
    evidenceSha256: sha256Json({ contentKey, text, sourceSha256: snapshot.sourceSha256 })
  }];
  const packetWithoutHash = {
    schemaVersion: 1,
    packetKind: "ask-tldr-owner-approved-eclipse-house-placement",
    canonicalId: contentKey,
    surface: "you-transit",
    register: "article",
    evidence,
    constraints: {
      activationHouse: house,
      domain,
      possibleLivedManifestations: manifestations,
      doNotAssume,
      natalContactsAreNotSemanticAuthority: true
    }
  };
  const packetSha256 = sha256Json(packetWithoutHash);
  const packet = { ...packetWithoutHash, packetSha256 };
  const promptEvidence = [
    `CANONICAL OBJECT: ${contentKey}`,
    "TEMPORALITY: dated-event",
    "SURFACE: you-transit",
    `ACTIVATION HOUSE: ${house}`,
    "BOUNDARY: use only the eclipse's natal-house placement; natal contacts require separate authority",
    "",
    "ASTROLOGICAL TRUTH (owner-approved eclipse house-placement manifestation set)",
    `--- [owner-approved-prose; source=${contentKey}]`,
    text,
    doNotAssume.length ? `DO NOT ASSUME: ${doNotAssume.join(" | ")}` : ""
  ].filter(Boolean).join("\n");
  return {
    status: "full",
    sourceKind: "owner_approved_manifestation_set",
    evidenceSurface: "you-transit",
    canonicalIds: [contentKey],
    targetUsages: ["primary"],
    mappingBases: ["owner-approved-eclipse-house-placement"],
    unresolvedKnowledgeIds,
    packet,
    promptEvidence,
    indexSha256: null,
    governanceSourceSha256: snapshot.sourceSha256,
    packetSha256
  };
}

function loadTwelfthHouseProfectionSnapshot() {
  if (profectionCache) return profectionCache;
  const raw = fs.readFileSync(PROFECTION_URL, "utf8");
  if (!raw.includes("**Status:** `owner_approved`")
    || !raw.includes("**Owner approved:** `true`")
    || !raw.includes("**Active in production:** `true`")
    || !raw.includes(TWELFTH_HOUSE_PROFECTION_DOCTRINE)
    || !raw.includes(TWELFTH_HOUSE_GRIEF_BOUNDARY)) {
    throw new Error("ASK_TLDR_PROFECTION_AUTHORITY_INVALID");
  }
  profectionCache = { sourceSha256: sha256(raw) };
  return profectionCache;
}

export function ownerApprovedTwelfthHouseProfection(
  candidate: SnapshotCandidate,
  unresolvedKnowledgeIds: string[]
): AskTldrTechniqueAuthorityMeaning | null {
  if (candidate.kind !== "profection") return null;
  const house = numberValue(candidate.facts.house) ?? candidate.houses?.[0] ?? null;
  if (house !== 12) return null;
  const snapshot = loadTwelfthHouseProfectionSnapshot();
  const canonicalId = "profection-year-house-12";
  const evidence = [{
    authorityClass: "owner-approved-prose",
    surfacePermission: ["you-natal"],
    store: "owner-approved-profection-doctrine",
    path: PROFECTION_PATH,
    field: "twelfth-house-profection-treatment",
    rowKey: canonicalId,
    sourceSha256: snapshot.sourceSha256,
    text: TWELFTH_HOUSE_PROFECTION_DOCTRINE,
    usage: "primary",
    temporality: "annual",
    framingAllowed: true,
    evidenceSha256: sha256Json({
      canonicalId,
      doctrineSha256: sha256(TWELFTH_HOUSE_PROFECTION_DOCTRINE),
      sourceSha256: snapshot.sourceSha256
    })
  }];
  const packetWithoutHash = {
    schemaVersion: 1,
    packetKind: "ask-tldr-owner-approved-profection-doctrine",
    canonicalId,
    surface: "you-natal",
    register: "article",
    evidence,
    constraints: {
      house: 12,
      griefBoundary: TWELFTH_HOUSE_GRIEF_BOUNDARY
    }
  };
  const packetSha256 = sha256Json(packetWithoutHash);
  const packet = { ...packetWithoutHash, packetSha256 };
  const promptEvidence = [
    `CANONICAL OBJECT: ${canonicalId}`,
    "TEMPORALITY: annual",
    "SURFACE: you-natal",
    "",
    "ASTROLOGICAL TRUTH (owner-approved 12th-house profection doctrine)",
    `--- [owner-approved-prose; source=${canonicalId}]`,
    TWELFTH_HOUSE_PROFECTION_DOCTRINE,
    `BOUNDARY: ${TWELFTH_HOUSE_GRIEF_BOUNDARY}`
  ].join("\n");
  return {
    status: "full",
    sourceKind: "owner_approved_profection_doctrine",
    evidenceSurface: "you-natal",
    canonicalIds: [canonicalId],
    targetUsages: ["primary"],
    mappingBases: ["owner-approved-12th-house-profection-doctrine"],
    unresolvedKnowledgeIds,
    packet,
    promptEvidence,
    indexSha256: null,
    governanceSourceSha256: snapshot.sourceSha256,
    packetSha256
  };
}
