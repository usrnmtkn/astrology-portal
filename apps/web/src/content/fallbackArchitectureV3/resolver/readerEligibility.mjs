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

const QUARANTINED_CONTENT_KEYS = new Set([]);

const EXACT_SYNASTRY_ASPECTS = new Set([
  "conjunction",
  "opposition",
  "square",
  "trine",
  "sextile"
]);

const GROUPED_SYNASTRY_ASPECTS = new Set(["hard", "soft"]);
const DAILY_CONTINUITY_PREFIXES = ["fallback-hook/daily-", "daily-glance-variant/"];

export function transitReaderTier(row) {
  if (!String(row?.contentKey ?? "").startsWith("authored/transit-")) return null;
  if (!READER_ELIGIBLE_REVIEW_STATUSES.has(String(row?.review_status ?? "").trim().toLowerCase())) {
    return null;
  }
  return hasExactOwnerApproval(row) ? "exact-owner-approved" : "legacy-reviewed";
}

export function synastryReaderTier(row) {
  if (!String(row?.contentKey ?? "").startsWith("fallback-hook/synastry-pair/")) return null;
  if (!READER_ELIGIBLE_REVIEW_STATUSES.has(String(row?.review_status ?? "").trim().toLowerCase())) {
    return null;
  }

  const aspect = String(row.contentKey).split("/").at(-1) ?? "";
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

export function hasExactOwnerApproval(row) {
  const approval = row?.approval;
  return approval?.approvalLevel === "exact_owner_approved"
    && typeof approval.recordPath === "string"
    && approval.recordPath.trim().length > 0
    && typeof approval.payloadSha256 === "string"
    && /^[a-f0-9]{64}$/iu.test(approval.payloadSha256)
    && typeof approval.approvedAt === "string"
    && approval.approvedAt.trim().length > 0;
}

export function requiresExactOwnerApproval(contentKey) {
  return EXACT_APPROVAL_REQUIRED_PREFIXES.some((prefix) => String(contentKey ?? "").startsWith(prefix));
}

export function isGovernedReaderEligible(row, { allowUnreviewed = false } = {}) {
  if (allowUnreviewed) return true;
  if (QUARANTINED_CONTENT_KEYS.has(row.contentKey)) return false;
  if (!READER_ELIGIBLE_REVIEW_STATUSES.has(String(row.review_status ?? "").trim().toLowerCase())) return false;
  if (String(row.contentKey).startsWith("fallback-hook/synastry-pair/")) {
    return synastryReaderTier(row) !== null;
  }
  if (String(row.contentKey).startsWith("authored/transit-")) {
    return transitReaderTier(row) !== null;
  }
  if (DAILY_CONTINUITY_PREFIXES.some((prefix) => String(row.contentKey).startsWith(prefix))) {
    return true;
  }
  return !requiresExactOwnerApproval(row.contentKey) || hasExactOwnerApproval(row);
}

export function readerEligibilityReason(row) {
  if (QUARANTINED_CONTENT_KEYS.has(row.contentKey)) return "known-current-contract-failure";
  if (!READER_ELIGIBLE_REVIEW_STATUSES.has(String(row.review_status ?? "").trim().toLowerCase())) return "review-status";
  if (String(row.contentKey).startsWith("fallback-hook/synastry-pair/")) {
    return synastryReaderTier(row) === null ? "unsupported-synastry-family" : null;
  }
  if (String(row.contentKey).startsWith("authored/transit-")) {
    return transitReaderTier(row) === null ? "transit-review-status" : null;
  }
  if (DAILY_CONTINUITY_PREFIXES.some((prefix) => String(row.contentKey).startsWith(prefix))) {
    return null;
  }
  if (requiresExactOwnerApproval(row.contentKey) && !hasExactOwnerApproval(row)) return "exact-owner-approval-required";
  return null;
}
