export type ReportVanityInput = {
  targetDate?: string | null;
  createdAt?: string | null;
  subjectLabel?: string | null;
  title?: string | null;
};

function asciiSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/&/gu, " and ")
    .replace(/[’']/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .replace(/-{2,}/gu, "-");
}

function canonicalDate(value: string | null | undefined) {
  const date = value?.match(/^\d{4}-\d{2}-\d{2}/u)?.[0];
  return date ?? "report";
}

export function reportVanitySlug(input: ReportVanityInput) {
  const date = canonicalDate(input.targetDate ?? input.createdAt);
  const subject = asciiSlug(input.subjectLabel?.trim() || input.title?.trim() || "reading") || "reading";
  return `${date}-${subject}`;
}

export function reportVanityPath(input: ReportVanityInput) {
  return `/reports/${reportVanitySlug(input)}`;
}

export function reportShareKeyFromHash(hash: string) {
  const shortMatch = hash.match(/^#s=([A-Za-z0-9_-]{22})$/u);
  if (shortMatch?.[1]) return shortMatch[1];
  const legacyMatch = hash.match(/^#share=([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu);
  return legacyMatch?.[1] ?? "";
}

export function isReportUuidSegment(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}
