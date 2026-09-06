import {
  passesReaderContentBoundary,
  readerContentBoundaryReason,
  type ReaderContentBoundaryRow
} from "./readerContentBoundary.browser.ts";

export type GovernedReaderRow = ReaderContentBoundaryRow & {
  contentKey: string;
  review_status?: string | null;
};

export const READER_ELIGIBLE_REVIEW_STATUSES = new Set([
  "approved",
  "approved_reuse",
  "reviewed"
]);

const EXACT_APPROVAL_REQUIRED_PREFIXES = [
  "authored/transit-",
  "authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-",
  "authored/lunation-eclipse-section/",
  "fallback-hook/daily-",
  "fallback-hook/natal-aspect-lived/",
  "fallback-hook/synastry-pair/",
  "daily-glance-variant/"
];

// Rows with a known owner-writing-contract failure remain here until their
// exact approved replacement is applied to the canonical source lineage.
const QUARANTINED_CONTENT_KEYS = new Set<string>([]);

const EXACT_SYNASTRY_ASPECTS = new Set([
  "conjunction",
  "opposition",
  "square",
  "trine",
  "sextile"
]);

const GROUPED_SYNASTRY_ASPECTS = new Set(["hard", "soft"]);
const DAILY_CONTINUITY_PREFIXES = ["fallback-hook/daily-", "daily-glance-variant/"];

export type SynastryReaderTier =
  | "exact-owner-approved"
  | "owner-approved-grouped"
  | "legacy-reviewed";

export type TransitReaderTier = "exact-owner-approved" | "legacy-reviewed";

export function transitReaderTier(row: GovernedReaderRow): TransitReaderTier | null {
  if (!row.contentKey.startsWith("authored/transit-")) return null;
  if (!READER_ELIGIBLE_REVIEW_STATUSES.has(String(row.review_status ?? "").trim().toLowerCase())) {
    return null;
  }
  if (!passesReaderContentBoundary(row)) return null;
  return hasExactOwnerApproval(row) ? "exact-owner-approved" : "legacy-reviewed";
}

export function synastryReaderTier(row: GovernedReaderRow): SynastryReaderTier | null {
  if (!row.contentKey.startsWith("fallback-hook/synastry-pair/")) return null;
  if (!READER_ELIGIBLE_REVIEW_STATUSES.has(String(row.review_status ?? "").trim().toLowerCase())) {
    return null;
  }
  if (!passesReaderContentBoundary(row)) return null;

  const aspect = row.contentKey.split("/").at(-1) ?? "";
  if (EXACT_SYNASTRY_ASPECTS.has(aspect) && hasExactOwnerApproval(row)) {
    return "exact-owner-approved";
  }
  if (GROUPED_SYNASTRY_ASPECTS.has(aspect) && hasExactOwnerApproval(row)) {
    return "owner-approved-grouped";
  }
  if (EXACT_SYNASTRY_ASPECTS.has(aspect) || GROUPED_SYNASTRY_ASPECTS.has(aspect)) {
    return "legacy-reviewed";
  }
  return null;
}

export function hasExactOwnerApproval(row: GovernedReaderRow): boolean {
  const approval = row.approval;

  return approval?.approvalLevel === "exact_owner_approved"
    && typeof approval.recordPath === "string"
    && approval.recordPath.trim().length > 0
    && typeof approval.payloadSha256 === "string"
    && /^[a-f0-9]{64}$/iu.test(approval.payloadSha256)
    && typeof approval.approvedAt === "string"
    && approval.approvedAt.trim().length > 0;
}

export function requiresExactOwnerApproval(contentKey: string): boolean {
  return EXACT_APPROVAL_REQUIRED_PREFIXES.some((prefix) => contentKey.startsWith(prefix));
}

export function isGovernedReaderEligible(
  row: GovernedReaderRow,
  { allowUnreviewed = false }: { allowUnreviewed?: boolean } = {}
): boolean {
  if (allowUnreviewed) return true;
  if (QUARANTINED_CONTENT_KEYS.has(row.contentKey)) return false;
  if (!READER_ELIGIBLE_REVIEW_STATUSES.has(String(row.review_status ?? "").trim().toLowerCase())) {
    return false;
  }
  if (!passesReaderContentBoundary(row)) return false;
  if (row.contentKey.startsWith("fallback-hook/synastry-pair/")) {
    return synastryReaderTier(row) !== null;
  }
  if (row.contentKey.startsWith("authored/transit-")) {
    return transitReaderTier(row) !== null;
  }
  if (DAILY_CONTINUITY_PREFIXES.some((prefix) => row.contentKey.startsWith(prefix))) {
    return true;
  }
  return !requiresExactOwnerApproval(row.contentKey) || hasExactOwnerApproval(row);
}

export function readerEligibilityReason(row: GovernedReaderRow): string | null {
  if (QUARANTINED_CONTENT_KEYS.has(row.contentKey)) return "known-current-contract-failure";
  if (!READER_ELIGIBLE_REVIEW_STATUSES.has(String(row.review_status ?? "").trim().toLowerCase())) {
    return "review-status";
  }
  const boundaryReason = readerContentBoundaryReason(row);
  if (boundaryReason) return boundaryReason;
  if (row.contentKey.startsWith("fallback-hook/synastry-pair/")) {
    return synastryReaderTier(row) === null ? "unsupported-synastry-family" : null;
  }
  if (row.contentKey.startsWith("authored/transit-")) {
    return transitReaderTier(row) === null ? "transit-review-status" : null;
  }
  if (DAILY_CONTINUITY_PREFIXES.some((prefix) => row.contentKey.startsWith(prefix))) {
    return null;
  }
  if (requiresExactOwnerApproval(row.contentKey) && !hasExactOwnerApproval(row)) {
    return "exact-owner-approval-required";
  }
  return null;
}