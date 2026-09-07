import supplied from "./skySummaryImportedCopy.json";
import clauses from "../../web/src/content/skyDailySummaryClauses.json";

// Keep the supplied sentences intact in the import; the composer owns terminal punctuation.
export function importedSkySummary(key: string): string | undefined {
  if (key === "cms/sky-daily-summary/sun/virgo") return clauses.sun.virgo;
  if (key === "cms/sky-daily-summary/moon/cancer") return clauses.moon.cancer;
  return supplied.rows.find(row => row.key === key)?.body.replace(/\.$/u, "");
}
export const skySummaryImportProvenance = supplied.provenance;
