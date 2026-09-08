import supplied from "./skySummaryImportedCopy.json";
import clauses from "../../web/src/content/skyDailySummaryClauses.json";

// Keep the supplied sentences intact in the import; the composer owns terminal punctuation.
export function importedSkySummary(key: string): string | undefined {
  const [body, sign] = key.replace("cms/sky-daily-summary/", "").split("/");
  if (body === "sun" || body === "moon") {
    const current = (clauses[body] as Record<string, string>)[sign];
    if (current) return current;
  }
  return supplied.rows.find(row => row.key === key)?.body.replace(/\.$/u, "");
}
export const skySummaryImportProvenance = supplied.provenance;
