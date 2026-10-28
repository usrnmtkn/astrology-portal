import type { AdminDraft } from "./GeneratedContentAdminDashboard";
import { frictionFlowField } from "../../web/src/content/frictionFlowCatalog";

export function frictionFlowSourceDraft(key: string): AdminDraft {
  const field = frictionFlowField(key);
  if (!field) throw new Error("Choose a registered Friction/Flow writing source.");
  return {
    id: null, contentKey: key, surface: "relationship", mode: "card", status: "DRAFT",
    lane: "serving", reviewState: "EDITORIAL_REVIEW_REQUIRED", headline: `${field.group}: ${field.label}`,
    summary: "", body: field.body, blockType: "essay", promptVersion: "cms-surface-template-v1",
    sections: null, facts: null, reviewerNotes: "",
    sourceSnapshot: {
      contentType: "mustache-template", contentSystem: "cms-surface-override",
      authoringSource: "admin-dashboard", cmsSurfaceId: "friends-friction-flow",
      readerLocation: "Friends → Feed → Friction and flow",
      allowedSlots: field.allowedSlots, baselineSource: "existing-friction-flow-ui"
    }
  };
}
