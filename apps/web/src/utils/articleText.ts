export function stripTldrPrefix(value: string) {
  return value
    .replace(/^(?:\*\*)?(?:TLDR|TDLR)(?:\*\*)?\s*:\s*/i, "")
    .trim();
}

export function isLegacySkyArticleScaffoldHeading(heading: string) {
  const normalized = heading.trim().toLowerCase().replace(/:+$/u, "");

  return [
    "tldr",
    "what you may notice",
    "what to do",
    "timing",
    "reflection",
    "integration",
    "closing",
    "closing statement",
    "planetary meaning",
    "how it may show up",
    "how to work with it",
    "home and family"
  ].includes(normalized);
}

export function stripLegacySkyArticleScaffoldPrefix(text: string) {
  return text.replace(
    /^(?:TLDR|What You May Notice|What To Do|Timing|Reflection|Integration|Closing|Closing Statement|Planetary Meaning|How It May Show Up|How To Work With It|Home And Family)\s*:\s*/iu,
    ""
  ).trim();
}

export function cleanGeneratedSectionHeading(heading: string) {
  const cleaned = heading.replace(/^\d{1,2}\s*[.\-·:]\s*/u, "").trim();

  return isLegacySkyArticleScaffoldHeading(cleaned) ? "" : cleaned;
}

export function cleanGeneratedSectionBody(body: string) {
  return stripLegacySkyArticleScaffoldPrefix(stripTldrPrefix(body));
}

export function comparableText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function escapeRegExpLiteral(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
