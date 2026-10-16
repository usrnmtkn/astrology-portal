import type { AdminDraft } from "./GeneratedContentAdminDashboard";
import { connectionBridgeTemplates, connectionSourceSlots, CONNECTION_ACTIVATION_PREFIX, isConnectionSourceKey } from "../../web/src/content/connectionTransit";

export function connectionSourceDraft(contentKey: string): AdminDraft {
  if (!isConnectionSourceKey(contentKey)) throw new Error("Choose a supported connection source.");
  const activation = contentKey.startsWith(CONNECTION_ACTIVATION_PREFIX);
  const template = connectionBridgeTemplates.find(t => t.contentKey === contentKey);
  const body = template?.body ?? "";
  const record = { contentKey, content_role: activation ? "full_copy" : "template", grammar_frame: "complete_sentence",
    ...(activation ? { body_you: "", body_they: "" } : { body, requiredSlots: [...connectionSourceSlots(contentKey)] }), review_status: "needs_review" };
  return { id: null, contentKey, surface: "friends", mode: "in_depth", status: "DRAFT", lane: "reference", reviewState: "needs-review",
    headline: activation ? contentKey.slice(CONNECTION_ACTIVATION_PREFIX.length).replaceAll("/", " · ") : template!.label,
    summary: "", body, blockType: activation ? "fallback_hook" : "fallback_template", promptVersion: "manual-admin", reviewerNotes: "",
    sections: { packageRecord: record }, facts: { fallbackArchitectureV3: true }, sourceSnapshot: {
      contentType: activation ? "connection-activation" : "connection-transit-bridge", contentSystem: "fallback",
      content_role: record.content_role, review_status: "needs_review", sourcePackage: "tldrastro-fallback-architecture-v3", authoringSource: "admin-dashboard"
    } };
}
