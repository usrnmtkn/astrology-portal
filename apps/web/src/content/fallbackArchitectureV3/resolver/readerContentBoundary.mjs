// Owner ruling, 2026-09-06: astrology reader copy must not use tarot as an
// interpretive framework. Tarot may exist in an explicitly designated Tarot
// surface later; mixed astrology/tarot copy fails closed unless separately
// owner-approved.
//
// Migration note: the legacy lunation library predates this boundary and
// contains historical tarot/astrology blends. Do not blank that entire reader
// surface in one release. New or explicitly typed content is gated now, while
// legacy cells enter the gate as they are repaired. The known live Virgo/Gemini
// offender is included immediately.

export const READER_CONTENT_TYPES = Object.freeze({
  ASTROLOGY: "astrology",
  TAROT: "tarot",
  MIXED: "mixed"
});

const LEGACY_ASTROLOGY_BOUNDARY_KEYS = new Set([
  "authored/book-ritual-and-the-moon/lunation-horoscope/new-moon/virgo/rising-gemini/house-4"
]);

const READER_COPY_FIELDS = Object.freeze([
  "headline",
  "tagline",
  "title",
  "body",
  "body_you",
  "body_they",
  "focus",
  "strategy",
  "summary",
  "preview_note",
  "core_theme",
  "sign_jurisdiction",
  "lived_experience",
  "rulership_twist",
  "history_echo",
  "closing_charge"
]);

const EXPLICIT_TAROT_REFERENCE = /\b(?:tarot|major\s+arcana|minor\s+arcana)\b/iu;
const TAROT_CARD_NAME = "(?:the\\s+)?(?:chariot|emperor|empress|hierophant|high\\s+priestess|hermit|magician|fool|lovers|devil|hanged\\s+man|wheel\\s+of\\s+fortune|temperance|judg(?:e)?ment)";
const TAROT_CARD_CONTEXT = new RegExp(
  `(?:\\b${TAROT_CARD_NAME}\\b[^.!?\\n]{0,80}\\b(?:card|arcana|tarot)\\b|\\b(?:card|arcana|tarot)\\b[^.!?\\n]{0,80}\\b${TAROT_CARD_NAME}\\b|\\b(?:corresponds?\\s+to|represented\\s+by|associated\\s+with)\\b[^.!?\\n]{0,80}\\b${TAROT_CARD_NAME}\\b)`,
  "iu"
);

function readerCopyStrings(row) {
  const values = READER_COPY_FIELDS
    .map((field) => row?.[field])
    .filter((value) => typeof value === "string");

  for (const section of row?.article_sections ?? []) {
    if (typeof section?.heading === "string") values.push(section.heading);
    if (typeof section?.body === "string") values.push(section.body);
  }
  for (const entry of row?.rising_horoscopes ?? []) {
    if (typeof entry?.body === "string") values.push(entry.body);
  }

  return values;
}

export function readerContentType(row) {
  const declared = String(row?.reader_content_type ?? row?.content_type ?? "")
    .trim()
    .toLowerCase();
  return Object.values(READER_CONTENT_TYPES).includes(declared)
    ? declared
    : null;
}

export function hasTarotReferenceInReaderCopy(row) {
  return readerCopyStrings(row).some((value) => (
    EXPLICIT_TAROT_REFERENCE.test(value) || TAROT_CARD_CONTEXT.test(value)
  ));
}

function mixedContentHasOwnerApproval(row) {
  const boundary = row?.content_boundary;
  const approval = row?.approval;
  return boundary?.mixedOwnerApproved === true
    && approval?.approvalLevel === "exact_owner_approved"
    && typeof approval.recordPath === "string"
    && approval.recordPath.trim().length > 0
    && typeof approval.payloadSha256 === "string"
    && /^[a-f0-9]{64}$/iu.test(approval.payloadSha256)
    && typeof approval.approvedAt === "string"
    && approval.approvedAt.trim().length > 0;
}

export function readerContentBoundaryReason(row) {
  const contentType = readerContentType(row);
  const legacyAstrologyBoundaryApplies = LEGACY_ASTROLOGY_BOUNDARY_KEYS.has(String(row?.contentKey ?? ""));

  if (!contentType && !legacyAstrologyBoundaryApplies) return null;
  if (contentType === READER_CONTENT_TYPES.TAROT) return null;
  if (contentType === READER_CONTENT_TYPES.MIXED) {
    return mixedContentHasOwnerApproval(row)
      ? null
      : "mixed-astrology-tarot-owner-approval-required";
  }
  return hasTarotReferenceInReaderCopy(row)
    ? "tarot-reference-in-astrology-copy"
    : null;
}

export function passesReaderContentBoundary(row) {
  return readerContentBoundaryReason(row) === null;
}
