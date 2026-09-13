import { adminCredentialHeaders } from "./adminSecret";

export type GeneratedContentEditorRow = {
  id: string;
  content_key: string;
  status: string;
  updated_at?: string | null;
  sections?: unknown;
  event_type?: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function request(path: string, secret: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(abort, 10_000);
  try {
    const response = await fetch(path, {
      ...options, cache: "no-store", signal: controller.signal,
      headers: { "content-type": "application/json", ...adminCredentialHeaders(secret) }
    });
    const payload: unknown = await response.json();
    if (!response.ok || !isObject(payload) || payload.ok !== true) {
      throw new Error(isObject(payload) && typeof payload.error === "string"
        ? payload.error : `Content Studio returned an invalid response (${response.status}). Reload before retrying.`);
    }
    return payload;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Content Studio request was interrupted. Reload before retrying; a save has not been confirmed.");
    if (error instanceof SyntaxError) throw new Error("Content Studio did not receive JSON from its API. Check the API connection, then reload.");
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

function rowsFromPayload(payload: Record<string, unknown>): GeneratedContentEditorRow[] {
  if (!Array.isArray(payload.rows) || payload.rows.some(row => !isObject(row)
    || typeof row.id !== "string" || !row.id || typeof row.content_key !== "string" || !row.content_key
    || typeof row.status !== "string")) {
    throw new Error("Content Studio returned an invalid rows response. Reload before editing.");
  }
  return payload.rows as GeneratedContentEditorRow[];
}

export async function readGeneratedContentRows(path: string, secret: string, signal?: AbortSignal) {
  const rows: GeneratedContentEditorRow[] = [];
  const cursors = new Set<string>();
  let nextPath = path;
  for (let page = 0; page < 125; page += 1) {
    const payload = await request(nextPath, secret, { signal });
    rows.push(...rowsFromPayload(payload));
    if (payload.nextCursor === null || payload.nextCursor === undefined) return rows;
    if (typeof payload.nextCursor !== "string" || !payload.nextCursor || cursors.has(payload.nextCursor)) {
      throw new Error("Content Studio returned an invalid pagination cursor. The inventory is incomplete.");
    }
    cursors.add(payload.nextCursor);
    const url = new URL(path, "http://studio.invalid");
    url.searchParams.set("cursor", payload.nextCursor);
    nextPath = `${url.pathname}${url.search}`;
  }
  throw new Error("Content Studio inventory exceeded the page limit. Narrow the selection before editing.");
}

function submittedDraftFields(draftSections: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(draftSections).filter(([key]) => key === "packageDraft" || key === "skyFallbackVariantFamilyDraft"));
}

function saveMayHaveCompleted(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /(?:timed out|timeout|408|interrupted|late response|not been confirmed)/iu.test(message);
}

async function verifyTimedOutSave(row: GeneratedContentEditorRow, draftSections: Record<string, unknown>, secret: string) {
  const path = `/api/admin/generated-content?contentKey=${encodeURIComponent(row.content_key)}&status=DRAFT&visibility=all&limit=10`;
  const payload = await request(path, secret);
  const submitted = submittedDraftFields(draftSections);
  return rowsFromPayload(payload)
    .filter((candidate) => candidate.content_key === row.content_key && candidate.updated_at)
    .find((candidate) => containsSubmittedFields(candidate.sections, submitted)) ?? null;
}

export async function saveGeneratedContentDraft(row: GeneratedContentEditorRow, sections: Record<string, unknown>, secret: string) {
  if (!row.updated_at || row.id.startsWith("package:")) {
    throw new Error("Open a saved Content Library draft before using this editor.");
  }
  const draftSections = structuredClone(sections);
  if (isObject(draftSections.packageDraft)) {
    // Approval/serving flags belong to the server, not the editor's copy patch.
    // Carrying an old flag forward can reject the next save after draft staging.
    delete draftSections.packageDraft.owner_approved;
    delete draftSections.packageDraft.serving_enabled;
    delete draftSections.packageDraft.review_status;
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request("/api/admin/generated-content", secret, {
      method: "PATCH",
      body: JSON.stringify({ id: row.id, expectedUpdatedAt: row.updated_at, sections: draftSections, reviewStatus: "needs_review" })
    });
  } catch (error) {
    if (!saveMayHaveCompleted(error)) throw error;
    try {
      const verified = await verifyTimedOutSave(row, draftSections, secret);
      if (verified) return verified;
    } catch {
      // Keep the original timeout as the useful error. Never issue a second write.
    }
    throw error;
  }

  const saved = rowsFromPayload(payload);
  // A live baseline can fork a new draft id. The content identity must stay fixed.
  if (saved.length !== 1 || saved[0].content_key !== row.content_key || !saved[0].updated_at
    || !containsSubmittedFields(saved[0].sections, submittedDraftFields(draftSections))) {
    throw new Error("The API did not confirm the saved draft. Reload before retrying.");
  }
  return saved[0];
}

function containsSubmittedFields(saved: unknown, submitted: unknown): boolean {
  if (Array.isArray(submitted)) return Array.isArray(saved) && saved.length === submitted.length
    && submitted.every((value, index) => containsSubmittedFields(saved[index], value));
  if (isObject(submitted)) return isObject(saved)
    && Object.entries(submitted).every(([key, value]) => containsSubmittedFields(saved[key], value));
  return saved === submitted;
}

// Shared JSON/timeout contract for secondary Studio reads and previews.
export { request as requestStudioJson };
