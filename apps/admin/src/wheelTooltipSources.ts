import type { AdminDraft } from "./GeneratedContentAdminDashboard";
import { wheelTooltipField } from "../../web/src/content/wheelTooltipCatalog";

export function wheelTooltipSourceDraft(key: string): AdminDraft {
  const field = wheelTooltipField(key);
  if (!field) throw new Error("Choose a registered wheel tooltip source.");
  return {
    id: null, contentKey: key, surface: "sky", mode: "card", status: "DRAFT", lane: "serving",
    reviewState: "EDITORIAL_REVIEW_REQUIRED", headline: field.label, summary: "", body: field.body,
    blockType: "essay", promptVersion: "wheel-tooltip-template-v1", sections: null, facts: null, reviewerNotes: "",
    sourceSnapshot: { contentType: "mustache-template", contentSystem: "cms-surface-override", authoringSource: "admin-dashboard",
      cmsSurfaceId: "wheel-tooltips", readerLocation: "Sky, You and Friends → interactive wheel tooltips",
      allowedSlots: field.allowedSlots, baselineSource: "existing-interactive-wheel-ui" }
  };
}
