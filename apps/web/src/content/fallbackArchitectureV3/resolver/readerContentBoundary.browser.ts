// Owner ruling, 2026-09-06: astrology reader copy must not use tarot as an
// interpretive framework. Tarot may exist in an explicitly designated Tarot
// surface later; mixed astrology/tarot copy fails closed unless separately
// owner-approved.

export const READER_CONTENT_TYPES = Object.freeze({
  ASTROLOGY: "astrology",
  TAROT: "tarot",
  MIXED: "mixed"
} as const);

export type ReaderContentType = typeof READER_CONTENT_TYPES[keyof typeof READER_CONTENT_TYPES];

export type ReaderContentBoundaryRow = {
  reader_content_type?: string | null;
  content_type?: string | null;
  headline?: string | null;
  tagline?: string | null;
  title?: string | null;
  body?: string | null;
  body_you?: string | null;
  body_they?: string | null;
  focus?: string | null;
  strategy?: string | null;
  summary?: string | null;
  preview_note?: string | null;
  core_theme?: string | null;
  sign_jurisdiction?: string | null;
  lived_experience?: string | null;
  rulership_twist?: string | null;
  history_echo?: string | null;
  closing_charge?: string | null;
  article_sections?: { heading?: string | null; body?: string | null }[] | null;
  rising_horoscopes?: { body?: string | null }[] | null;
  content_boundary?: { mixedOwnerApproved?: boolean | null } | null;
  approval?: {
    approvalLevel?: string | null;
    recordPath?: string | null;
    payloadSha256?: string | null;
    approvedAt?: string | null;
  } | null;
};

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
] as const);

const EXPLICIT_TAROT_REFERENCE = /\b(?:tarot|major\s+arcana|minor\s+arcana)\b/iu;
const TAROT_CARD_NAME = "(?:the\\s+)?(?:chariot|emperor|empress|hierophant|high\\s+priestess|hermit|magician|fool|lovers|devil|hanged\\s+man|wheel\\s+of\\s+fortune|temperance|judg(?:e)?ment)";
const TAROT_CARD_CONTEXT = new RegExp(
  `(?:\\b${TAROT_CARD_NAME}\\b[^.!?\\n]{0,80}\\b(?:card|arcana|tarot)\\b|\\b(?:card|arcana|tarot)\\b[^.!?\\n]{0,80}\\b${TAROT_CARD_NAME}\\b|\\b(?:corresponds?\\s+to|represented\\s+by|associated\\s+with)\\b[^.!?\\n]{0,80}\\b${TAROT_CARD_NAME}\\b)`,
  "iu"
);

function readerCopyStrings(row: ReaderContentBoundaryRow): string[] {
  const values = READER_COPY_FIELDS
    .map((field) => row[field])
    .filter((value): value is string => typeof value === "string");

  for (const section of row.article_sections ?? []) {
    if (typeof section?.heading === "string") values.push(section.heading);
    if (typeof section?.body === "string") values.push(section.body);
  }
  for (const entry of row.rising_horoscopes ?? []) {
    if (typeof entry?.body === "string") values.push(entry.body);
  }

  return values;
}

export function readerContentType(row: ReaderContentBoundaryRow): ReaderContentType {
  const declared = String(row.reader_content_type ?? row.content_type ?? "")
    .trim()
    .toLowerCase();
  return Object.values(READER_CONTENT_TYPES).includes(declared as ReaderContentType)
    ? declared as ReaderContentType
    : READER_CONTENT_TYPES.ASTROLOGY;
}

export function hasTarotReferenceInReaderCopy(row: ReaderContentBoundaryRow): boolean {
  return readerCopyStrings(row).some((value) => (
    EXPLICIT_TAROT_REFERENCE.test(value) || TAROT_CARD_CONTEXT.test(value)
  ));
}

function mixedContentHasOwnerApproval(row: ReaderContentBoundaryRow): boolean {
  const boundary = row.content_boundary;
  const approval = row.approval;
  return boundary?.mixedOwnerApproved === true
    && approval?.approvalLevel === "exact_owner_approved"
    && typeof approval.recordPath === "string"
    && approval.recordPath.trim().length > 0
    && typeof approval.payloadSha256 === "string"
    && /^[a-f0-9]{64}$/iu.test(approval.payloadSha256)
    && typeof approval.approvedAt === "string"
    && approval.approvedAt.trim().length > 0;
}

export function readerContentBoundaryReason(row: ReaderContentBoundaryRow): string | null {
  const contentType = readerContentType(row);
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

export function passesReaderContentBoundary(row: ReaderContentBoundaryRow): boolean {
  return readerContentBoundaryReason(row) === null;
}
