import { isReaderFacingCopy } from "./readerSafety.js";
import { horoscopeEditionFromRow } from './horoscopeEditions.mjs';
import { skyArticleEditionRecord, hasExactSkyArticleOwnerApproval } from "./skyArticleTemplateCompiler.js";
type GeneratedContentRow = { content_key: string; provider?: string | null; source_snapshot?: Record<string, unknown> | null; facts?: Record<string, unknown> | null; flags?: string[] | null };
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }

function generatedRowSourceType(row: Pick<GeneratedContentRow, "source_snapshot">) {
  const sourceSnapshot = row.source_snapshot && typeof row.source_snapshot === "object"
    ? row.source_snapshot as Record<string, unknown>
    : null;
  const sourceType = typeof sourceSnapshot?.sourceType === "string" ? sourceSnapshot.sourceType : "";

  return sourceType;
}

export function isEmergencyFloorContentKey(contentKey: string) {
  return contentKey.startsWith("fallback-hook/")
    || contentKey.startsWith("slot-template/")
    || contentKey.startsWith("vocab/")
    || contentKey.startsWith("fallback-vocab/")
    || contentKey.startsWith("guide-phrase/");
}

function isLegacyLiveWritingRow(row: Pick<GeneratedContentRow, "content_key" | "provider" | "source_snapshot">) {
  if (isEmergencyFloorContentKey(row.content_key)) {
    return false;
  }

  const sourceType = generatedRowSourceType(row);

  return row.provider === "local-normalized-dashboard-source"
    || sourceType === "normalized-dashboard-source"
    || sourceType === "source-grounded-generated-snapshot";
}

function generatedRowSectionCopyValues(sections: unknown): string[] {
  if (typeof sections === "string") {
    return [sections];
  }

  if (Array.isArray(sections)) {
    return sections.flatMap((section) => {
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        return [];
      }

      const record = section as Record<string, unknown>;

      return [record.body, record.text]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    });
  }

  if (sections && typeof sections === "object") {
    const record = sections as Record<string, unknown>;
    const nestedSections = Array.isArray(record.sections) ? generatedRowSectionCopyValues(record.sections) : [];

    return [record.body, record.text, ...nestedSections]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  }

  return [];
}

export function generatedRowPackageRole(row: Pick<GeneratedContentRow, "facts" | "source_snapshot"> & { sections?: unknown }) {
  const facts = row.facts && typeof row.facts === "object" ? row.facts as Record<string, unknown> : {};
  const sourceSnapshot = row.source_snapshot && typeof row.source_snapshot === "object"
    ? row.source_snapshot as Record<string, unknown>
    : {};
  const sections = row.sections && typeof row.sections === "object" ? row.sections as Record<string, unknown> : {};
  const record = sections.packageRecord && typeof sections.packageRecord === "object"
    ? sections.packageRecord as Record<string, unknown>
    : {};
  const role = sourceSnapshot.content_role
    ?? sourceSnapshot.contentRole
    ?? facts.content_role
    ?? facts.contentRole
    ?? record.content_role
    ?? record.contentRole;
  const review = sourceSnapshot.review_status
    ?? sourceSnapshot.reviewStatus
    ?? facts.review_status
    ?? facts.reviewStatus
    ?? record.review_status
    ?? record.reviewStatus;

  return {
    role: typeof role === "string" ? role : "",
    reviewStatus: typeof review === "string" ? review : ""
  };
}

export function isReaderServableGeneratedContentRow(
  row: Pick<GeneratedContentRow, "content_key" | "facts" | "flags" | "provider" | "source_snapshot"> & {
    status?: string | null;
    lane?: string | null;
    review_state?: string | null;
    headline?: string | null;
    summary?: string | null;
    body?: string | null;
    sections?: unknown;
  }
) {
  const normalizedContentKey = row.content_key.trim().toLowerCase();
  if (normalizedContentKey.startsWith('horoscope/')) return Boolean(horoscopeEditionFromRow(row));
  if (normalizedContentKey.startsWith("sky/article-template/") || normalizedContentKey.startsWith("sky-article-template/")) {
    return false;
  }
  const sections = isRecord(row.sections) ? row.sections : null;
  const skyArticleEdition = skyArticleEditionRecord(sections?.skyArticleEdition);
  if (skyArticleEdition) {
    if (row.status !== "LIVE" || row.lane !== "serving" || row.review_state) return false;
    if (row.content_key !== skyArticleEdition.contentKey) return false;
    if (!hasExactSkyArticleOwnerApproval(skyArticleEdition, row.source_snapshot)) return false;
  }
  const facts = row.facts && typeof row.facts === "object" ? row.facts : {};
  const store = facts.tldrStore && typeof facts.tldrStore === "object"
    ? facts.tldrStore as Record<string, unknown>
    : null;
  const metadataText = [
    row.content_key,
    row.provider,
    JSON.stringify(row.source_snapshot ?? {}),
    JSON.stringify(facts ?? {}),
    ...(Array.isArray(row.flags) ? row.flags : [])
  ].join(" ").toLowerCase();
  const copyValues = [
    row.summary,
    row.body,
    ...generatedRowSectionCopyValues(row.sections)
  ];
  const unsafeMetadataMarkers = [
    "legacy",
    "unsafe",
    "directional",
    "editorial-only",
    "editorial_only",
    "superseded",
    "local-normalized-dashboard-source",
    "revoice-pending",
    "revoice_pending",
    "reference-only",
    "raw_quarantine"
  ];
  const { role: packageRole, reviewStatus: packageReviewStatus } = generatedRowPackageRole(row);
  const blockedPackageRoles = new Set(["fallback_source", "source_material"]);
  const approvedPackageReviews = new Set(["approved", "approved_reuse", "reviewed"]);

  if (row.content_key.startsWith("cc/fallback")) return false;
  if (blockedPackageRoles.has(packageRole)) return false;
  if (packageReviewStatus && !approvedPackageReviews.has(packageReviewStatus)) return false;
  if (unsafeMetadataMarkers.some((marker) => metadataText.includes(marker))) return false;
  if (copyValues.some((value) => value && !isReaderFacingCopy(value))) return false;

  if (!store) {
    return true;
  }

  const flags = new Set([
    ...(Array.isArray(row.flags) ? row.flags : []),
    ...(Array.isArray(store.flags) ? store.flags.map(String) : [])
  ]);
  const lane = row.lane === undefined
    ? (typeof store.lane === "string" ? store.lane : null)
    : row.lane;
  const review = row.review_state === undefined
    ? (typeof store.review === "string" ? store.review : null)
    : row.review_state;
  const sourceStatus = typeof store.sourceStatus === "string" ? store.sourceStatus : null;

  if (row.status && row.status !== "LIVE") return false;
  if (lane && lane !== "serving") return false;
  if (review) return false;
  if (sourceStatus && ["REFERENCE_ONLY", "RAW_QUARANTINE", "MANUAL_ONLY", "DEPRECATED"].includes(sourceStatus)) return false;
  if (isLegacyLiveWritingRow(row)) return false;
  if (flags.has("REFERENCE_ONLY_NEVER_SERVE_VERBATIM")) return false;
  if (flags.has("PARAPHRASE_PENDING")) return false;
  if (flags.has("BLOCKLIST_MATCH")) return false;

  return true;
}

type GeneratedContentReaderBoundaryRow = { content_key: string; event_type?: string | null; surface?: string | null; source_snapshot?: Record<string, unknown> | null };
export function isGeneratedContentReaderBoundaryAllowed(row: GeneratedContentReaderBoundaryRow) {
  const contentType = typeof row.source_snapshot?.contentType === "string"
    ? row.source_snapshot.contentType
    : "";
  const isSynastryGeneratedLane = row.surface === "synastry"
    || contentType === "synastry-kb-seed"
    || row.event_type?.startsWith("synastry-")
    || row.content_key.startsWith("synastry.")
    || row.content_key.startsWith("synastry-")
    || /^A-[^/]+_B-[^/]+_/u.test(row.content_key);
  const isSkyPlacementWorkspace = row.content_key.startsWith("sky.placement.")
    || row.event_type === "collective-placement-card"
    || row.event_type === "collective-placement-topper"
    || row.event_type === "sky-article-edition"
    || row.event_type === "sky-article-edition-revision"
    || row.event_type === "sky-article-edition-workspace";

  if (!isSynastryGeneratedLane && !isSkyPlacementWorkspace) {
    return true;
  }

  // Package-originated rows are installed through
  // loadFallbackArchitectureV3DashboardBundle and rendered by the package
  // resolver. The generic generated-content map remains available to writer,
  // judge, and owner-review tooling, but must never become a second reader
  // copy source for synastry or Sky Placement.
  return false;
}
