export type KnowledgeMatrixJudge =
  | "owner-approved-v8-locked"
  | "rewritten-owner-voice-audited-v5";

export type KnowledgeMatrixTransitEntry = {
  planet: string;
  transit_sign: string;
  event_type: string;
  copy: string;
  judge: KnowledgeMatrixJudge;
  archive?: string;
  sources?: string[];
  source_row_count?: number;
};

export type KnowledgeMatrixHouseEvent = {
  event_type: string;
  copy: string;
  judge: KnowledgeMatrixJudge;
  archive?: string;
  sources?: string[];
  source_row_count?: number;
};

export type KnowledgeMatrixHouseEntry = {
  rising_sign: string;
  transit_planet: string;
  transit_sign: string;
  house: number;
  events: Record<string, KnowledgeMatrixHouseEvent>;
};

export type KnowledgeMatrixTransitFile = {
  version: string;
  index_key: string[];
  entries: Record<string, KnowledgeMatrixTransitEntry>;
};

export type KnowledgeMatrixHouseFile = {
  version: string;
  primary_index_key: string[];
  secondary_key: string;
  entries: Record<string, KnowledgeMatrixHouseEntry>;
};

export type KnowledgeMatrixManifest = {
  schema: string;
  version: string;
  source_policy: {
    rewrite_or_clean_copy: boolean;
    preserve_workbook_copy_exactly: boolean;
    locked_status: KnowledgeMatrixJudge;
    legacy_approved_status: KnowledgeMatrixJudge;
  };
  transit_meanings: {
    runtime_key: string[];
    precedence: KnowledgeMatrixJudge[];
  };
  house_activations: {
    primary_runtime_key: string[];
    secondary_key: string;
    exclusion_rules: string[];
    precedence: KnowledgeMatrixJudge[];
  };
  validation: {
    required_zero_occurrences: {
      em_dash: string;
      whether: string;
      banned_vocabulary: string[];
    };
    expected_build_warnings: number;
  };
  verified_build: {
    transit_primary_keys: number;
    house_primary_keys: number;
    house_event_entries: number;
    build_warnings: number;
  };
};

export type KnowledgeMatrixBuildReport = {
  warning_count: number;
  warnings: unknown[];
  build_passed: boolean;
};

export type KnowledgeMatrixRuntimeResult = {
  body: string;
  contentKey: string;
  judge: KnowledgeMatrixJudge;
  sourceVersion: string;
};

export type KnowledgeMatrixV8Resolver = {
  renderTransitMeaning(facts: {
    planet: string;
    transitSign: string;
    eventType: string;
  }): KnowledgeMatrixRuntimeResult | null;
  renderHouseActivation(facts: {
    risingSign: string;
    planet: string;
    transitSign: string;
    house: number;
    eventType: string;
  }): KnowledgeMatrixRuntimeResult | null;
  counts: Readonly<{
    transitPrimaryKeys: number;
    housePrimaryKeys: number;
    houseEventEntries: number;
  }>;
};

const EXCLUDED_PREFIX = "[EXCLUDE FROM FALLBACK]";
const STATUS_PRECEDENCE: readonly KnowledgeMatrixJudge[] = [
  "owner-approved-v8-locked",
  "rewritten-owner-voice-audited-v5"
];

function normalizedKeyPart(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function transitRuntimeKey(entry: KnowledgeMatrixTransitEntry) {
  return [entry.planet, entry.transit_sign, entry.event_type]
    .map(normalizedKeyPart)
    .join("|");
}

function housePrimaryRuntimeKey(entry: KnowledgeMatrixHouseEntry) {
  return [entry.rising_sign, entry.transit_planet, entry.transit_sign, entry.house]
    .map(normalizedKeyPart)
    .join("|");
}

function houseEventRuntimeKey(entry: KnowledgeMatrixHouseEntry, eventType: string) {
  return `${housePrimaryRuntimeKey(entry)}|${normalizedKeyPart(eventType)}`;
}

function statusRank(status: KnowledgeMatrixJudge) {
  const rank = STATUS_PRECEDENCE.indexOf(status);
  return rank === -1 ? Number.POSITIVE_INFINITY : rank;
}

export function chooseKnowledgeMatrixCandidate<T extends { judge: KnowledgeMatrixJudge }>(
  candidates: readonly T[]
): T | null {
  return candidates.reduce<T | null>((winner, candidate) => {
    if (!winner || statusRank(candidate.judge) < statusRank(winner.judge)) {
      return candidate;
    }
    return winner;
  }, null);
}

function assertExactSchema(
  manifest: KnowledgeMatrixManifest,
  transitFile: KnowledgeMatrixTransitFile,
  houseFile: KnowledgeMatrixHouseFile,
  buildReport: KnowledgeMatrixBuildReport
) {
  if (
    manifest.schema !== "tldrastro.knowledge-matrix-import.v8"
    || manifest.version !== "v8-owner-approved-locked"
    || manifest.source_policy.rewrite_or_clean_copy !== false
    || manifest.source_policy.preserve_workbook_copy_exactly !== true
    || JSON.stringify(manifest.transit_meanings.precedence) !== JSON.stringify(STATUS_PRECEDENCE)
    || JSON.stringify(manifest.house_activations.precedence) !== JSON.stringify(STATUS_PRECEDENCE)
    || transitFile.version !== manifest.version
    || houseFile.version !== manifest.version
  ) {
    throw new Error("Knowledge matrix v8 manifest or source version is not the owner-approved package.");
  }

  if (
    manifest.validation.expected_build_warnings !== 0
    || manifest.verified_build.build_warnings !== 0
    || buildReport.warning_count !== 0
    || buildReport.warnings.length !== 0
    || buildReport.build_passed !== true
  ) {
    throw new Error("Knowledge matrix v8 has build warnings; runtime ingestion is blocked.");
  }
}

function assertCopyValidation(copy: string, manifest: KnowledgeMatrixManifest, sourceKey: string) {
  const zero = manifest.validation.required_zero_occurrences;
  const lowered = copy.toLowerCase();

  if (copy.includes(zero.em_dash)) {
    throw new Error(`Knowledge matrix v8 em dash validation failed: ${sourceKey}`);
  }
  if (new RegExp(`\\b${zero.whether.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "iu").test(copy)) {
    throw new Error(`Knowledge matrix v8 whether validation failed: ${sourceKey}`);
  }
  for (const phrase of zero.banned_vocabulary) {
    if (lowered.includes(phrase.toLowerCase())) {
      throw new Error(`Knowledge matrix v8 banned vocabulary validation failed (${phrase}): ${sourceKey}`);
    }
  }
}

function candidateMap<T extends { judge: KnowledgeMatrixJudge }>(
  candidates: Iterable<readonly [string, T]>
) {
  const grouped = new Map<string, T[]>();
  for (const [key, candidate] of candidates) {
    const keyed = grouped.get(key) ?? [];
    keyed.push(candidate);
    grouped.set(key, keyed);
  }
  return new Map(
    [...grouped.entries()].map(([key, keyed]) => [key, chooseKnowledgeMatrixCandidate(keyed)!])
  );
}

export function createKnowledgeMatrixV8Resolver(
  manifest: KnowledgeMatrixManifest,
  transitFile: KnowledgeMatrixTransitFile,
  houseFile: KnowledgeMatrixHouseFile,
  buildReport: KnowledgeMatrixBuildReport
): KnowledgeMatrixV8Resolver {
  assertExactSchema(manifest, transitFile, houseFile, buildReport);

  const transitCandidates: Array<readonly [string, KnowledgeMatrixTransitEntry]> = [];
  for (const [sourceKey, entry] of Object.entries(transitFile.entries)) {
    const expectedSourceKey = `${entry.planet}|${entry.transit_sign}|${entry.event_type}`;
    if (sourceKey !== expectedSourceKey) {
      throw new Error(`Knowledge matrix v8 transit key mismatch: ${sourceKey}`);
    }
    if (!entry.planet || !entry.transit_sign || !entry.event_type || !entry.copy) {
      throw new Error(`Knowledge matrix v8 transit entry is incomplete: ${sourceKey}`);
    }
    if (!STATUS_PRECEDENCE.includes(entry.judge)) {
      throw new Error(`Knowledge matrix v8 transit judge is not serving: ${sourceKey}`);
    }
    if (entry.copy.startsWith(EXCLUDED_PREFIX)) continue;
    assertCopyValidation(entry.copy, manifest, sourceKey);
    transitCandidates.push([transitRuntimeKey(entry), entry]);
  }

  const housePrimaryKeys = new Set<string>();
  const houseCandidates: Array<readonly [string, KnowledgeMatrixHouseEvent]> = [];
  for (const [sourceKey, entry] of Object.entries(houseFile.entries)) {
    const expectedSourceKey = `${entry.rising_sign}|${entry.transit_planet}|${entry.transit_sign}|${entry.house}`;
    if (sourceKey !== expectedSourceKey) {
      throw new Error(`Knowledge matrix v8 house key mismatch: ${sourceKey}`);
    }
    if (
      !entry.rising_sign
      || !entry.transit_planet
      || !entry.transit_sign
      || !Number.isInteger(entry.house)
      || entry.house < 1
      || entry.house > 12
      || !entry.events
      || Array.isArray(entry.events)
    ) {
      throw new Error(`Knowledge matrix v8 house entry is incomplete: ${sourceKey}`);
    }
    housePrimaryKeys.add(housePrimaryRuntimeKey(entry));
    for (const [eventType, event] of Object.entries(entry.events)) {
      if (eventType !== event.event_type) {
        throw new Error(`Knowledge matrix v8 house event key mismatch: ${sourceKey}|${eventType}`);
      }
      if (!event.copy || !STATUS_PRECEDENCE.includes(event.judge)) {
        throw new Error(`Knowledge matrix v8 house event is incomplete: ${sourceKey}|${eventType}`);
      }
      if (event.copy.startsWith(EXCLUDED_PREFIX)) continue;
      assertCopyValidation(event.copy, manifest, `${sourceKey}|${eventType}`);
      houseCandidates.push([houseEventRuntimeKey(entry, eventType), event]);
    }
  }

  const transitIndex = candidateMap(transitCandidates);
  const houseIndex = candidateMap(houseCandidates);
  const expected = manifest.verified_build;
  if (
    transitIndex.size !== expected.transit_primary_keys
    || housePrimaryKeys.size !== expected.house_primary_keys
    || houseIndex.size !== expected.house_event_entries
  ) {
    throw new Error(
      `Knowledge matrix v8 count mismatch: transit ${transitIndex.size}/${expected.transit_primary_keys}, house ${housePrimaryKeys.size}/${expected.house_primary_keys}, events ${houseIndex.size}/${expected.house_event_entries}.`
    );
  }

  return Object.freeze({
    renderTransitMeaning({ planet, transitSign, eventType }) {
      const runtimeKey = [planet, transitSign, eventType].map(normalizedKeyPart).join("|");
      const entry = transitIndex.get(runtimeKey);
      return entry
        ? {
            body: entry.copy,
            contentKey: `knowledge-matrix-v8/transit/${runtimeKey}`,
            judge: entry.judge,
            sourceVersion: manifest.version
          }
        : null;
    },
    renderHouseActivation({ risingSign, planet, transitSign, house, eventType }) {
      const runtimeKey = [risingSign, planet, transitSign, house, eventType]
        .map(normalizedKeyPart)
        .join("|");
      const event = houseIndex.get(runtimeKey);
      return event
        ? {
            body: event.copy,
            contentKey: `knowledge-matrix-v8/house/${runtimeKey}`,
            judge: event.judge,
            sourceVersion: manifest.version
          }
        : null;
    },
    counts: Object.freeze({
      transitPrimaryKeys: transitIndex.size,
      housePrimaryKeys: housePrimaryKeys.size,
      houseEventEntries: houseIndex.size
    })
  });
}
