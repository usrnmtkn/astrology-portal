export type KnowledgeMatrixV13Governance =
  | "owner-approved-v13-direct-language"
  | "owner-lived-experience-ll-v9-owner-approved"
  | "owner-approved-clarity-fix-ll-v12";

export type KnowledgeMatrixV13Row = {
  sheet: "PlacementMeanings" | "AspectMeanings" | "NodesPhasesFortune";
  workbookRow: number;
  key: string;
  contentKey: string;
  runtimeFamily: string;
  copy: string;
  governance: KnowledgeMatrixV13Governance;
  ownerApproved: true;
  authorship: "owner_authored";
  payloadSha256: string;
  workbookProvenance: {
    path: string;
    sheet: string;
    keyCell: string;
    copyCell: string;
    governanceCell: string;
    ownerApprovedCell: string;
    category: string | null;
    themes: string | null;
    pageRef: string | null;
  };
};

export type KnowledgeMatrixV13File = {
  schema: "tldrastro.knowledge-matrix.rows.v13";
  version: "v13-direct-language-owner-approved";
  approvedAt: "2026-08-10";
  sourceWorkbook: string;
  sourceWorkbookSha256: string;
  governance: {
    authorityField: "ownerApproved";
    requiredValue: true;
    allowedLabels: KnowledgeMatrixV13Governance[];
    canonicalDecisionKey: string;
    canonicalDecision: string;
    discardedPath: string;
  };
  counts: {
    sourceRows: number;
    ownerApprovedRows: number;
    excludedUnapprovedRows: number;
    clarityStrictV13Rows: number;
    bySheet: Record<string, number>;
    byGovernance: Record<KnowledgeMatrixV13Governance, number>;
    byRuntimeFamily: Record<string, number>;
  };
  rows: KnowledgeMatrixV13Row[];
};

export type KnowledgeMatrixV13Result = {
  body: string;
  contentKey: string;
  governance: KnowledgeMatrixV13Governance;
  payloadSha256: string;
  sourceVersion: string;
  workbookRow: number;
};

export type KnowledgeMatrixV13Resolver = {
  renderContentKey(contentKey: string): KnowledgeMatrixV13Result | null;
  renderNatalPlacement(facts: {
    planet: string;
    sign: string;
    house?: number | null;
  }): KnowledgeMatrixV13Result | null;
  renderNatalAspect(facts: {
    planetA: string;
    aspect: string;
    planetB: string;
  }): KnowledgeMatrixV13Result | null;
  renderWorkbookKey(key: string): KnowledgeMatrixV13Result | null;
  counts: Readonly<{
    ownerApprovedRows: number;
    placementRows: number;
    aspectRows: number;
    pointRows: number;
  }>;
};

const ALLOWED_GOVERNANCE: readonly KnowledgeMatrixV13Governance[] = [
  "owner-approved-v13-direct-language",
  "owner-lived-experience-ll-v9-owner-approved",
  "owner-approved-clarity-fix-ll-v12"
];

function normalizeObject(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replaceAll("_", "-").replace(/\s+/gu, "-");
}

function normalizeAspect(value: unknown) {
  const aspect = normalizeObject(value);
  return aspect === "inconjunct" ? "quincunx" : aspect;
}

function toResult(row: KnowledgeMatrixV13Row, sourceVersion: string): KnowledgeMatrixV13Result {
  return {
    body: row.copy,
    contentKey: row.contentKey,
    governance: row.governance,
    payloadSha256: row.payloadSha256,
    sourceVersion,
    workbookRow: row.workbookRow
  };
}

function assertExactSchema(file: KnowledgeMatrixV13File) {
  if (
    file.schema !== "tldrastro.knowledge-matrix.rows.v13"
    || file.version !== "v13-direct-language-owner-approved"
    || file.approvedAt !== "2026-08-10"
    || file.governance.authorityField !== "ownerApproved"
    || file.governance.requiredValue !== true
    || file.counts.sourceRows !== 1014
    || file.counts.ownerApprovedRows !== 301
    || file.counts.excludedUnapprovedRows !== 713
    || file.counts.clarityStrictV13Rows !== 195
    || file.rows.length !== 301
  ) {
    throw new Error("Knowledge matrix V13 is not the canonical owner-approved package.");
  }
  if (
    JSON.stringify(file.counts.bySheet) !== JSON.stringify({
      PlacementMeanings: 113,
      AspectMeanings: 165,
      NodesPhasesFortune: 23
    })
    || JSON.stringify(file.counts.byGovernance) !== JSON.stringify({
      "owner-approved-v13-direct-language": 194,
      "owner-lived-experience-ll-v9-owner-approved": 106,
      "owner-approved-clarity-fix-ll-v12": 1
    })
  ) {
    throw new Error("Knowledge matrix V13 owner-approved counts do not match the canonical workbook.");
  }
  if (!file.governance.discardedPath.includes("Gemini") || !file.governance.discardedPath.includes("blind-edit")) {
    throw new Error("Knowledge matrix V13 does not preserve the discarded-path governance ruling.");
  }
}

export function createKnowledgeMatrixV13Resolver(file: KnowledgeMatrixV13File): KnowledgeMatrixV13Resolver {
  assertExactSchema(file);
  const byContentKey = new Map<string, KnowledgeMatrixV13Row>();
  const byWorkbookKey = new Map<string, KnowledgeMatrixV13Row>();
  for (const row of file.rows) {
    if (
      row.ownerApproved !== true
      || row.authorship !== "owner_authored"
      || !ALLOWED_GOVERNANCE.includes(row.governance)
      || !row.copy
      || !row.contentKey
      || !/^[a-f0-9]{64}$/u.test(row.payloadSha256)
      || row.workbookProvenance.path !== file.sourceWorkbook
      || row.workbookProvenance.sheet !== row.sheet
      || row.workbookRow < 2
    ) {
      throw new Error(`Knowledge matrix V13 row is incomplete or unauthorized: ${row.sheet}/${row.key}`);
    }
    if (byContentKey.has(row.contentKey) || byWorkbookKey.has(row.key)) {
      throw new Error(`Knowledge matrix V13 duplicate key: ${row.contentKey}`);
    }
    byContentKey.set(row.contentKey, row);
    byWorkbookKey.set(row.key, row);
  }
  if (byContentKey.size !== file.counts.ownerApprovedRows) {
    throw new Error("Knowledge matrix V13 unique runtime-key count mismatch.");
  }

  const readContentKey = (contentKey: string) => {
    const row = byContentKey.get(contentKey);
    return row ? toResult(row, file.version) : null;
  };

  return Object.freeze({
    renderContentKey: readContentKey,
    renderNatalPlacement({ planet, sign, house }) {
      const normalizedPlanet = normalizeObject(planet);
      const normalizedSign = normalizeObject(sign);
      if (house) {
        return readContentKey(`fallback-hook/placement-house-lived/${normalizedPlanet}/${house}`)
          ?? readContentKey(`fallback-hook/house-lived/${house}`);
      }
      return readContentKey(`fallback-hook/placement-sign-lived/${normalizedPlanet}/${normalizedSign}`)
        ?? readContentKey(`fallback-hook/sign-lived/${normalizedSign}`)
        ?? readContentKey(`fallback-hook/planet-lived/${normalizedPlanet}`);
    },
    renderNatalAspect({ planetA, aspect, planetB }) {
      const normalizedA = normalizeObject(planetA);
      const normalizedB = normalizeObject(planetB);
      const normalizedAspect = normalizeAspect(aspect);
      return readContentKey(`fallback-hook/natal-aspect-lived/${normalizedA}/${normalizedAspect}/${normalizedB}`)
        ?? readContentKey(`fallback-hook/natal-aspect-lived/${normalizedB}/${normalizedAspect}/${normalizedA}`);
    },
    renderWorkbookKey(key) {
      const row = byWorkbookKey.get(String(key).trim().toLowerCase());
      return row ? toResult(row, file.version) : null;
    },
    counts: Object.freeze({
      ownerApprovedRows: file.rows.length,
      placementRows: file.rows.filter((row) => row.sheet === "PlacementMeanings").length,
      aspectRows: file.rows.filter((row) => row.sheet === "AspectMeanings").length,
      pointRows: file.rows.filter((row) => row.sheet === "NodesPhasesFortune").length
    })
  });
}
