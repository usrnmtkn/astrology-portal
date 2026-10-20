import {connectionPointTitle as title} from "../../web/src/content/connectionTransit";
import type {AdminDraft} from "./GeneratedContentAdminDashboard";
import {compatibilityAspectKey, type CompatibilityAspectSelection} from "./compatibilityAspectSources";

export function compatibilityAspectSourceDraft(selection: CompatibilityAspectSelection): AdminDraft {
  const contentKey = compatibilityAspectKey(selection);
  if (!contentKey) throw new Error("Choose both planets or points and an aspect.");
  return {
    id: null, contentKey, surface: "synastry", mode: "in_depth", status: "DRAFT",
    headline: `${title(selection.first)} ${selection.aspect} ${title(selection.second)}`,
    summary: "", body: "", lane: "reference", reviewState: "needs-review", blockType: "fallback_hook",
    promptVersion: "manual-admin", reviewerNotes: "",
    sections: { packageRecord: {
      contentKey, content_role: "full_copy", grammar_frame: "complete_sentence",
      body_you: "", body_they: "", review_status: "needs_review"
    } },
    facts: { fallbackArchitectureV3: true, ...selection },
    sourceSnapshot: {
      contentType: "synastry-aspect-exact", contentSystem: "fallback", content_role: "full_copy",
      review_status: "needs_review", sourcePackage: "tldrastro-fallback-architecture-v3",
      authoringSource: "admin-dashboard"
    }
  };
}
