import { adminCredentialHeaders } from "./adminSecret";
import { readStudioInventoryPages } from "./studioInventoryPagination";
import { studioRequestTimeoutMs } from "./studioRequestPolicy";

export type GeneratedContentEditorRow = {
  id: string;
  content_key: string;
  status: string;
  updated_at?: string | null;
  sections?: unknown;
  event_type?: string | null;
  source_snapshot?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

class StudioRequestError extends Error {
  constructor(message: string, readonly saveUncertain: boolean) { super(message); }
}

async function request(path: string, secret: string, options: RequestInit = {}) {
  const method = (options.method ?? "GET").toUpperCase();
  const isWrite = ["POST", "PATCH", "DELETE"].includes(method);
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(abort, studioRequestTimeoutMs(path, method));
  try {
    const response = await fetch(path, {
      ...options, cache: "no-store", signal: controller.signal,
      headers: { "content-type": "application/json", ...adminCredentialHeaders(secret) }
    });
    const payload: unknown = await response.json();
    if (!response.ok || !isObject(payload) || payload.ok !== true) {
      throw new StudioRequestError(isObject(payload) && typeof payload.error === "string"
        ? payload.error : `Content Studio returned an invalid response (${response.status}). Reload before retrying.`,
      isWrite && (response.ok || response.status === 408 || response.status >= 500));
    }
    return payload;
  } catch (error) {
    if (error instanceof StudioRequestError) throw error;
    if (controller.signal.aborted) throw new StudioRequestError(isWrite
      ? "Content Studio request was interrupted. Reload before retrying; a save has not been confirmed."
      : "Loading content was interrupted. Try again; no changes were submitted.", isWrite);
    throw new StudioRequestError(error instanceof SyntaxError
      ? "Content Studio did not receive JSON from its API. Reload to verify the saved state before retrying."
      : error instanceof Error ? error.message : "Content Studio could not connect. Reload before retrying.", isWrite);
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

export function studioInventoryDocumentPath(contentKey: string, extras: { status?: string; limit?: number } = {}) {
  const params = new URLSearchParams({
    contentKey,
    status: extras.status ?? "all",
    visibility: "all",
    limit: String(extras.limit ?? 1)
  });
  return `/api/admin/generated-content-inventory?${params}`;
}

// Several rows at once, for surfaces that show saved copy the inventory list does not carry.
export function studioInventoryDocumentsPath(contentKeys: readonly string[]) {
  const params = new URLSearchParams({ status: "all", visibility: "all", limit: "80" });
  for (const key of contentKeys) params.append("contentKeys", key);
  return `/api/admin/generated-content-inventory?${params}`;
}

export function studioPackageSourcePath(contentKey: string) {
  return `/api/admin/package-source?contentKey=${encodeURIComponent(contentKey)}`;
}

export type StudioContentDocument = {
  rows: Array<Record<string, unknown> & { content_key: string }>;
  packageSource: Record<string, unknown> | null;
};

export async function readStudioContentDocument(
  contentKey: string,
  secret: string,
  options: RequestInit = {}
): Promise<StudioContentDocument> {
  const payload = await request(studioInventoryDocumentPath(contentKey), secret, options);
  if (!Array.isArray(payload.rows) || payload.rows.some((row) => !isObject(row) || row.content_key !== contentKey)) {
    throw new Error("The selected source could not be verified.");
  }
  const rows = payload.rows.filter(isObject) as StudioContentDocument["rows"];
  if (rows.length) return { rows, packageSource: null };
  const pkg = await request(studioPackageSourcePath(contentKey), secret, options);
  if (pkg.packageSource != null && !isObject(pkg.packageSource)) {
    throw new Error("The packaged source could not be verified.");
  }
  return { rows: [], packageSource: isObject(pkg.packageSource) ? pkg.packageSource : null };
}

export async function readGeneratedContentRows(path: string, secret: string, signal?: AbortSignal) {
  const rows: GeneratedContentEditorRow[] = [];
  await readStudioInventoryPages(async cursor => {
    const url = new URL(path, "http://studio.invalid");
    if (cursor !== null) url.searchParams.set("cursor", cursor);
    const payload = await request(`${url.pathname}${url.search}`, secret, { signal });
    return { rows: rowsFromPayload(payload), nextCursor: payload.nextCursor };
  }, page => rows.push(...page), signal);
  return rows;
}

function submittedDraftFields(draftSections: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(draftSections).filter(([key]) => key === "packageDraft" || key === "skyFallbackVariantFamilyDraft"));
}

function saveMayHaveCompleted(error: unknown) {
  if (error instanceof StudioRequestError) return error.saveUncertain;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /(?:timed out|timeout|408|interrupted|late response|not been confirmed)/iu.test(message);
}

async function verifyTimedOutSave(row: GeneratedContentEditorRow, draftSections: Record<string, unknown>, secret: string) {
  const path = studioInventoryDocumentPath(row.content_key, { status: "DRAFT", limit: 10 });
  const payload = await request(path, secret);
  const submitted = submittedDraftFields(draftSections);
  if (!Object.keys(submitted).length) return null;
  return rowsFromPayload(payload)
    .filter((candidate) => candidate.content_key === row.content_key && candidate.status === "DRAFT"
      && candidate.updated_at && Date.parse(candidate.updated_at) > Date.parse(row.updated_at!)
      && (candidate.id === row.id || (isObject(candidate.source_snapshot)
        && candidate.source_snapshot.targetRowId === row.id
        && candidate.source_snapshot.targetRowUpdatedAt === row.updated_at)))
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
