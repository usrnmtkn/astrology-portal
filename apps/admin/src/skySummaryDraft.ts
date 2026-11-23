import type { AdminDraft } from "./GeneratedContentAdminDashboard";
import type { SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";
import { importedSkySummary, skySummaryImportProvenance } from "./skySummaryImportedCopy";

// Construct a summary draft only after its editor and supplied copy have loaded.
export function newSkySummaryDraft(field: SkySummaryField, headline: string, initialBody?: string,
  candidateReceipt?: unknown, moonSource?: unknown): AdminDraft {
  return {
    id: null, contentKey: field.key, surface: "sky", mode: "card", status: "DRAFT",
    headline, summary: "", body: initialBody ?? (field.body || importedSkySummary(field.key) || ""), lane: "serving", reviewState: "EDITORIAL_REVIEW_REQUIRED",
    blockType: "essay", promptVersion: "cms-surface-template-v1", sections: null, facts: null, reviewerNotes: "",
    sourceSnapshot: {
      contentType: "mustache-template", contentSystem: "cms-surface-override", contentLevel: "owner-authored",
      authoringSource: "admin-dashboard", cmsSurfaceId: field.key.startsWith("cms/sky-debility/") ? "sky-debility-card" : "sky-daily-summary",
      readerLocation: field.key.startsWith("cms/sky-debility/") ? "Sky → Without their tools card" : "Sky → Daily Sky Summary; Calendar → Sun introduction",
      allowedSlots: field.allowedSlots,
      ...(initialBody !== undefined && candidateReceipt ? { suppliedBank: candidateReceipt } : {}),
      ...(moonSource ? { moonSource, sourceAttachment: "daily-sky-summary-moon-system-v6-owner-phrases-audited.md" } : {}),
      ...(importedSkySummary(field.key) !== undefined ? { suppliedCopy: skySummaryImportProvenance } : {})
    }
  };
}
