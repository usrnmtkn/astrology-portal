/** Primary Studio action names the selected contact, not a secondary exact-passage path. */
export function transitNatalExactActionLabel(exists: boolean, title: string) {
  const name = title.trim();
  if (!name) throw new Error("The transit title could not be verified.");
  return exists ? `Edit ${name}` : `Write ${name}`;
}

/** Editor-only scope information. Never changes reader selection or publication. */
export type TransitSourceEditScope = {
  kind: "exact" | "exact-variant" | "shared";
  label: string;
  explanation: string;
};

export function transitSourceEditScope(exactKey: string | null, sourceKey: string): TransitSourceEditScope {
  if (exactKey && sourceKey === exactKey) return {
    kind: "exact", label: "Aspect-specific source",
    explanation: exactKey.split("/").length === 8
      ? "This is the source for the selected six-part situation. You and Friend have separate writing fields."
      : "This is the source for the selected transit and natal contact. You and Friend have separate writing fields."
  };
  if (exactKey && exactKey.split("/").length === 8) {
    const parent = exactKey.split("/").slice(0, 5).join("/");
    if (sourceKey === parent) return {
      kind: "shared", label: "Three-part aspect source",
      explanation: "This is the three-part aspect write-up. The selected six-part situation is saved separately."
    };
  }
  if (exactKey && sourceKey.startsWith(`${exactKey}/`)) return {
    kind: "exact-variant", label: "Aspect-specific variant",
    explanation: "This source belongs to the selected contact, but only to a particular variant or context. The base passage is edited separately."
  };
  const family = sourceKey.startsWith("authored/transit-aspect/") ? sourceKey.split("/")[4] : null;
  const uses = family === "soft" ? "multiple aspects, including trines and sextiles"
    : family === "hard" ? "multiple aspects, including squares and oppositions"
    : "other transit selections";
  return {
    kind: "shared", label: "Shared fallback source",
    explanation: `This source can be used by ${uses}. Publishing a change affects every reading that selects it, not just the contact selected above.`
  };
}

export type TransitExactPassageState = {
  exists: boolean;
  savedStatus: string | null;
  detail: string;
  row: { id: string; status?: string | null; updated_at?: string | null } | null;
};

/** A saved LIVE flag is editorial state, not proof of reader eligibility. */
export function transitExactPassageState(contentKey: string, payload: unknown): TransitExactPassageState {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("The exact passage could not be verified.");
  const value = payload as Record<string, unknown>;
  if (!Array.isArray(value.rows) || value.rows.length > 1) throw new Error("The exact passage could not be verified.");
  for (const candidate of value.rows) {
    if (!candidate || typeof candidate !== "object" || candidate.content_key !== contentKey || typeof candidate.id !== "string" || !candidate.id) {
      throw new Error("The exact passage could not be verified.");
    }
  }
  const packaged = value.packageSource as Record<string, unknown> | null | undefined;
  if (packaged != null && (packaged.contentKey !== contentKey || ![packaged.body, packaged.body_you, packaged.body_they].some(body => typeof body === "string" && body.trim()))) {
    throw new Error("The packaged exact passage could not be verified.");
  }
  const saved = value.rows[0];
  const row = saved ? { id: saved.id as string, status: typeof saved.status === "string" ? saved.status : null, updated_at: typeof saved.updated_at === "string" ? saved.updated_at : null } : null;
  const savedStatus = row?.status?.toUpperCase() ?? null;
  const exists = Boolean(packaged) || Boolean(row);
  const detail = !exists ? "No write-up is saved for this exact contact yet. The editor below is for this aspect only; shared fallback writing is not copied or changed."
    : savedStatus === "DRAFT" ? "A draft is saved for this contact. It does not appear in the reader preview until reviewed and published."
    : savedStatus === "ARCHIVED" || savedStatus === "RETIRED" ? "This aspect-specific passage is archived or retired. Opening it does not restore or publish it."
    : savedStatus === "REVIEWED" ? "The aspect-specific passage has been reviewed. Review alone does not publish it."
    : row ? "An aspect-specific record is saved. The reader preview identifies the source actually in use; saving and publishing are separate actions."
    : "An aspect-specific source exists in the reader package. Opening it does not change its publication state.";
  return { exists, savedStatus, detail, row };
}
