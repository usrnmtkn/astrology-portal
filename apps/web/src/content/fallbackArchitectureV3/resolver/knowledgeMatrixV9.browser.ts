export type KnowledgeMatrixGovernance = "owner-approved";

export type KnowledgeMatrixTransitRow = {
  source_row: number;
  Key: string;
  Archive: string | null;
  Planet: string | null;
  Sign: string | null;
  Event: string | null;
  Dates: string | null;
  "Themes (keywords)": string | null;
  Copy: string | null;
  Judge: string | null;
  Source: string | null;
  Governance: KnowledgeMatrixGovernance;
};

export type KnowledgeMatrixHouseRow = {
  source_row: number;
  Key: string;
  Archive: string | null;
  "Rising sign": string | null;
  House: number | null;
  "House source": string | null;
  Planet: string | null;
  "Transit sign": string | null;
  Event: string | null;
  "Life area": string | null;
  Experience: string | null;
  "Advice type": string | null;
  Judge: string | null;
  Source: string | null;
  Substantive: string | null;
  Governance: KnowledgeMatrixGovernance;
};

export type KnowledgeMatrixRowsFile = {
  schema: string;
  version: string;
  source_workbook: string;
  source_workbook_sha256: string;
  transit_meanings: KnowledgeMatrixTransitRow[];
  house_activations: KnowledgeMatrixHouseRow[];
};

export type KnowledgeMatrixManifest = {
  schema: string;
  version: string;
  source_of_truth: string;
  source_sha256: string;
  source_policy: {
    rewrite_or_clean_copy: boolean;
    preserve_workbook_copy_exactly: boolean;
    authority_column: "Governance";
    serving_authority: KnowledgeMatrixGovernance;
    historical_lineage_columns: ["Judge"];
    authority_rule: string;
    change_control: string;
  };
  canonical_rows: {
    file: string;
    sha256: string;
    transit_rows: number;
    house_rows: number;
    owner_approved_rows: number;
  };
  transit_meanings: {
    runtime_key: string[];
    copy_column: "Copy";
    authority_column: "Governance";
    lineage_column: "Judge";
    duplicate_resolution: string;
  };
  house_activations: {
    primary_runtime_key: string[];
    secondary_key: "Event";
    copy_column: "Experience";
    authority_column: "Governance";
    lineage_column: "Judge";
    duplicate_resolution: string;
    exclusion_rules: string[];
  };
  validation: {
    copy_digest_algorithm: string;
    transit_copy_digest: string;
    house_experience_digest: string;
    combined_copy_experience_digest: string;
  };
  verified_build: {
    transit_eligible_rows: number;
    transit_runtime_keys: number;
    house_eligible_rows: number;
    house_primary_keys: number;
    house_event_runtime_keys: number;
    excluded_house_rows: number;
    build_warnings: number;
  };
};

export type KnowledgeMatrixBuildReport = {
  version: string;
  governance_counts: Record<string, number>;
  transit_rows: number;
  house_rows: number;
  runtime: {
    transit_eligible_rows: number;
    transit_keys: number;
    house_eligible_rows: number;
    house_primary_keys: number;
    house_event_keys: number;
    excluded_house_rows: number;
  };
  warning_count: number;
  warnings: unknown[];
  build_passed: boolean;
};

export type KnowledgeMatrixRuntimeResult = {
  body: string;
  contentKey: string;
  governance: KnowledgeMatrixGovernance;
  judgeLineage: string | null;
  sourceVersion: string;
  sourceRow: number;
};

export type KnowledgeMatrixV9Resolver = {
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
    ownerApprovedRows: number;
    transitEligibleRows: number;
    transitRuntimeKeys: number;
    houseEligibleRows: number;
    housePrimaryKeys: number;
    houseEventRuntimeKeys: number;
    excludedHouseRows: number;
  }>;
};

const EXCLUDED_PREFIX = "[EXCLUDE FROM FALLBACK]";
const OWNER_APPROVED: KnowledgeMatrixGovernance = "owner-approved";

function normalizedKeyPart(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function transitRuntimeKey(row: KnowledgeMatrixTransitRow) {
  return [row.Planet, row.Sign, row.Event].map(normalizedKeyPart).join("|");
}

function housePrimaryRuntimeKey(row: KnowledgeMatrixHouseRow) {
  return [row["Rising sign"], row.Planet, row["Transit sign"], row.House]
    .map(normalizedKeyPart)
    .join("|");
}

function houseEventRuntimeKey(row: KnowledgeMatrixHouseRow) {
  return `${housePrimaryRuntimeKey(row)}|${normalizedKeyPart(row.Event)}`;
}

function assertExactSchema(
  manifest: KnowledgeMatrixManifest,
  rowsFile: KnowledgeMatrixRowsFile,
  buildReport: KnowledgeMatrixBuildReport
) {
  if (
    manifest.schema !== "tldrastro.knowledge-matrix-import.v9"
    || manifest.version !== "v9-owner-approved-governance-labeled"
    || manifest.source_policy.rewrite_or_clean_copy !== false
    || manifest.source_policy.preserve_workbook_copy_exactly !== true
    || manifest.source_policy.authority_column !== "Governance"
    || manifest.source_policy.serving_authority !== OWNER_APPROVED
    || JSON.stringify(manifest.source_policy.historical_lineage_columns) !== JSON.stringify(["Judge"])
    || rowsFile.schema !== "tldrastro.knowledge-matrix.rows.v9"
    || rowsFile.version !== manifest.version
    || rowsFile.source_workbook !== manifest.source_of_truth
    || rowsFile.source_workbook_sha256 !== manifest.source_sha256
    || buildReport.version !== manifest.version
  ) {
    throw new Error("Knowledge matrix v9 manifest or source is not the governance-labeled owner-approved package.");
  }

  if (
    manifest.verified_build.build_warnings !== 0
    || buildReport.warning_count !== 0
    || buildReport.warnings.length !== 0
    || buildReport.build_passed !== true
  ) {
    throw new Error("Knowledge matrix v9 has build warnings; runtime ingestion is blocked.");
  }

  if (
    rowsFile.transit_meanings.length !== manifest.canonical_rows.transit_rows
    || rowsFile.house_activations.length !== manifest.canonical_rows.house_rows
    || rowsFile.transit_meanings.length + rowsFile.house_activations.length
      !== manifest.canonical_rows.owner_approved_rows
    || buildReport.transit_rows !== manifest.canonical_rows.transit_rows
    || buildReport.house_rows !== manifest.canonical_rows.house_rows
    || buildReport.governance_counts[OWNER_APPROVED] !== manifest.canonical_rows.owner_approved_rows
  ) {
    throw new Error("Knowledge matrix v9 canonical row count mismatch.");
  }
}

export function createKnowledgeMatrixV9Resolver(
  manifest: KnowledgeMatrixManifest,
  rowsFile: KnowledgeMatrixRowsFile,
  buildReport: KnowledgeMatrixBuildReport
): KnowledgeMatrixV9Resolver {
  assertExactSchema(manifest, rowsFile, buildReport);

  const allRows = [...rowsFile.transit_meanings, ...rowsFile.house_activations];
  if (allRows.some((row) => row.Governance !== OWNER_APPROVED)) {
    throw new Error("Knowledge matrix v9 contains a row not authorized by Governance.");
  }

  const transitIndex = new Map<string, KnowledgeMatrixTransitRow>();
  let transitEligibleRows = 0;
  for (const row of rowsFile.transit_meanings) {
    if (!row.Planet || !row.Sign || !row.Event || !row.Copy) continue;
    if (row.Copy.startsWith(EXCLUDED_PREFIX)) continue;
    transitEligibleRows += 1;
    const key = transitRuntimeKey(row);
    if (!transitIndex.has(key)) transitIndex.set(key, row);
  }

  const housePrimaryKeys = new Set<string>();
  const houseIndex = new Map<string, KnowledgeMatrixHouseRow>();
  let houseEligibleRows = 0;
  let excludedHouseRows = 0;
  for (const row of rowsFile.house_activations) {
    const eligible = Boolean(
      row["Rising sign"]
      && row.Planet
      && row["Transit sign"]
      && row.Event
      && Number.isInteger(row.House)
      && Number(row.House) >= 1
      && Number(row.House) <= 12
      && row.Experience
      && !row.Experience.startsWith(EXCLUDED_PREFIX)
    );
    if (!eligible) {
      excludedHouseRows += 1;
      continue;
    }
    houseEligibleRows += 1;
    housePrimaryKeys.add(housePrimaryRuntimeKey(row));
    const key = houseEventRuntimeKey(row);
    if (!houseIndex.has(key)) houseIndex.set(key, row);
  }

  const expected = manifest.verified_build;
  if (
    transitEligibleRows !== expected.transit_eligible_rows
    || transitIndex.size !== expected.transit_runtime_keys
    || houseEligibleRows !== expected.house_eligible_rows
    || housePrimaryKeys.size !== expected.house_primary_keys
    || houseIndex.size !== expected.house_event_runtime_keys
    || excludedHouseRows !== expected.excluded_house_rows
  ) {
    throw new Error(
      `Knowledge matrix v9 count mismatch: transit rows ${transitEligibleRows}/${expected.transit_eligible_rows}, transit keys ${transitIndex.size}/${expected.transit_runtime_keys}, house rows ${houseEligibleRows}/${expected.house_eligible_rows}, house primary ${housePrimaryKeys.size}/${expected.house_primary_keys}, house events ${houseIndex.size}/${expected.house_event_runtime_keys}, excluded ${excludedHouseRows}/${expected.excluded_house_rows}.`
    );
  }

  return Object.freeze({
    renderTransitMeaning({ planet, transitSign, eventType }) {
      const runtimeKey = [planet, transitSign, eventType].map(normalizedKeyPart).join("|");
      const row = transitIndex.get(runtimeKey);
      return row
        ? {
            body: row.Copy!,
            contentKey: `knowledge-matrix-v9/transit/${runtimeKey}`,
            governance: row.Governance,
            judgeLineage: row.Judge,
            sourceVersion: manifest.version,
            sourceRow: row.source_row
          }
        : null;
    },
    renderHouseActivation({ risingSign, planet, transitSign, house, eventType }) {
      const runtimeKey = [risingSign, planet, transitSign, house, eventType]
        .map(normalizedKeyPart)
        .join("|");
      const row = houseIndex.get(runtimeKey);
      return row
        ? {
            body: row.Experience!,
            contentKey: `knowledge-matrix-v9/house/${runtimeKey}`,
            governance: row.Governance,
            judgeLineage: row.Judge,
            sourceVersion: manifest.version,
            sourceRow: row.source_row
          }
        : null;
    },
    counts: Object.freeze({
      ownerApprovedRows: allRows.length,
      transitEligibleRows,
      transitRuntimeKeys: transitIndex.size,
      houseEligibleRows,
      housePrimaryKeys: housePrimaryKeys.size,
      houseEventRuntimeKeys: houseIndex.size,
      excludedHouseRows
    })
  });
}
