import type { AdminGeneratedContentRow } from "./GeneratedContentAdminDashboard";
import type { SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";

export async function loadSkySummaryEditingSource(field: SkySummaryField, initialBody: string | undefined,
  read: (key: string) => Promise<{ rows: AdminGeneratedContentRow[] }>) {
  const { skySummaryCandidateReceipt, loadSkySummarySourceBank } = await import("./skySummarySourceBank");
  const suppliedBank = initialBody !== undefined && /^cms\/sky-daily-summary\/(sun|moon)\//u.test(field.key)
    ? await loadSkySummarySourceBank() : undefined;
  const candidateReceipt = suppliedBank && initialBody !== undefined ? skySummaryCandidateReceipt(field.key, initialBody, suppliedBank) : undefined;
  const result = await read(field.key);
  if (!Array.isArray(result.rows)) throw new Error("Could not load the saved summary wording. Please try again.");
  const moonSource = /^cms\/sky-daily-summary\/moon\/[^/]+\/[^/]+$/u.test(field.key)
    ? (await (await import("./skyMoonSummarySources")).loadSkyMoonSummarySources()).rows.find(row => row.key === field.key) : undefined;
  let existing = result.rows.find(row => row.content_key === field.key);
  if (!existing && field.key.startsWith("cms/sky-daily-summary/ingress/")) {
    const { ingressTldrSourceKeys, publishedIngressTldr } = await import("./skyIngressTldrSources");
    const [planet, sign] = field.label.split(" enters ");
    const sources = await Promise.all(ingressTldrSourceKeys(planet, sign).map(async key => {
      const response = await read(key);
      if (!Array.isArray(response.rows)) throw new Error("Could not check the existing ingress TLDR. Please try again.");
      return response.rows;
    }));
    existing = publishedIngressTldr(sources.flat(), planet, sign);
  }
  return { existing, candidateReceipt, moonSource };
}
