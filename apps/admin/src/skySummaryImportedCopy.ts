import supplied from "./skySummaryImportedCopy.json";

// Keep the supplied sentences intact in the import; the composer owns terminal punctuation.
export function importedSkySummary(key: string): string | undefined {
  return supplied.rows.find(row => row.key === key)?.body.replace(/\.$/u, "");
}
export const skySummaryImportProvenance = supplied.provenance;
