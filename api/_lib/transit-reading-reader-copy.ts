/**
 * Exact narrative fields consumed by GeneratedReportArticle. `summary` is the
 * single visible TLDR. `tldr` is a provider compatibility alias, not a second
 * paragraph. Provider/model metadata and empty legacy sections are not prose.
 * Keep storage, fact checks, writing checks and judging on this projection.
 */
export function transitReadingReaderCopy(draft: {
  headline?: string | null;
  summary?: string | null;
  body?: string | null;
}) {
  return {
    headline: draft.headline ?? "",
    summary: draft.summary ?? "",
    body: draft.body ?? ""
  };
}

export function transitReadingReaderText(draft: Parameters<typeof transitReadingReaderCopy>[0]) {
  return Object.values(transitReadingReaderCopy(draft)).filter((value) => value.trim()).join("\n\n");
}

/** A write acknowledgement without the full saved report is not completion. */
export function assertSavedTransitReading(rows: Array<{
  id?: string; headline?: string | null; summary?: string | null; body?: string | null;
}>, expected: Parameters<typeof transitReadingReaderCopy>[0]) {
  const saved = rows[0];
  if (rows.length !== 1 || !saved?.id?.trim() || !saved.body?.trim()
    || JSON.stringify(transitReadingReaderCopy(saved)) !== JSON.stringify(transitReadingReaderCopy(expected))) {
    throw new Error("The report save did not confirm a complete matching result. Do not mark this job complete.");
  }
}
