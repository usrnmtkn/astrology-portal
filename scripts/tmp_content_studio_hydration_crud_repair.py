from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text()


def write(path, text):
    (ROOT / path).write_text(text)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def replace_all_checked(text, old, new, minimum, label):
    count = text.count(old)
    if count < minimum:
        raise RuntimeError(f"{label}: expected at least {minimum} matches, found {count}")
    return text.replace(old, new)


# ---------------------------------------------------------------------------
# Admin generated-content API: CRUD semantics, cursor reads, concurrency.
# ---------------------------------------------------------------------------
path = "api/admin/generated-content.ts"
text = read(path)

text = replace_once(
    text,
    '  evergreenBy?: string | null;\n  ownerAction?:',
    '  evergreenBy?: string | null;\n  expectedUpdatedAt?: string;\n  ownerAction?:',
    "write-body optimistic version field"
)
text = replace_once(
    text,
    '  judge_why?: string | null;\n};',
    '  judge_why?: string | null;\n  updated_at?: string | null;\n};',
    "existing row updated_at"
)

cursor_helpers = r'''
function boundedGeneratedContentLimit(value: string | null, fallback = 50, maximum = 1000) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), maximum);
}

type GeneratedContentCursor = { id: string; updatedAt: string };

function encodeGeneratedContentCursor(row: { id?: unknown; updated_at?: unknown } | undefined) {
  if (!row || typeof row.id !== "string" || typeof row.updated_at !== "string") return null;
  return Buffer.from(JSON.stringify({ id: row.id, updatedAt: row.updated_at }), "utf8").toString("base64url");
}

function decodeGeneratedContentCursor(value: string): GeneratedContentCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<GeneratedContentCursor>;
    if (typeof parsed.id !== "string" || !parsed.id || typeof parsed.updatedAt !== "string" || !Number.isFinite(Date.parse(parsed.updatedAt))) {
      throw new Error("invalid cursor payload");
    }
    return { id: parsed.id, updatedAt: parsed.updatedAt };
  } catch {
    throw new GeneratedContentRequestError("cursor is invalid.");
  }
}
'''
text = replace_once(
    text,
    '\nasync function listGeneratedContent(req: IncomingMessage) {',
    '\n' + cursor_helpers + '\nasync function listGeneratedContent(req: IncomingMessage) {',
    "cursor helpers"
)

text = replace_once(
    text,
    '  const cursor = requestUrl.searchParams.get("cursor");\n  const limit = Math.min(Number(requestUrl.searchParams.get("limit") ?? "50"), 1000);\n  const offset = Math.max(Number(requestUrl.searchParams.get("offset") ?? "0"), 0);',
    '  const cursor = requestUrl.searchParams.get("cursor");\n  const limit = boundedGeneratedContentLimit(requestUrl.searchParams.get("limit"));\n  const supportsUpdatedCursor = !id && scope !== "compatibility" && !startDate && !endDate;\n  const offset = supportsUpdatedCursor ? 0 : Math.max(Number(requestUrl.searchParams.get("offset") ?? "0"), 0);',
    "list limit and cursor mode"
)

text = replace_once(
    text,
    '  if (!id && surface) {\n    params.set("surface", `eq.${surface}`);\n  }',
    '  if (!id && supportsUpdatedCursor && cursor) {\n    const decodedCursor = decodeGeneratedContentCursor(cursor);\n    params.set("or", `(updated_at.lt.${decodedCursor.updatedAt},and(updated_at.eq.${decodedCursor.updatedAt},id.lt.${decodedCursor.id}))`);\n  }\n\n  if (!id && surface) {\n    params.set("surface", `eq.${surface}`);\n  }',
    "list cursor filter"
)

# Create must be a true create, not an upsert.
text = replace_once(
    text,
    '  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {\n    method: "POST",\n    headers: {\n      ...adminHeaders(),\n      prefer: "resolution=merge-duplicates,return=representation"\n    },\n    body: JSON.stringify(row)\n  });\n  const payload = await response.json().catch(() => null);\n\n  if (!response.ok) {\n    throw new Error(`Supabase create failed with ${response.status}: ${JSON.stringify(payload)}`);\n  }',
    '  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations`, {\n    method: "POST",\n    headers: {\n      ...adminHeaders(),\n      prefer: "return=representation"\n    },\n    body: JSON.stringify(row)\n  });\n  const payload = await response.json().catch(() => null);\n\n  if (!response.ok) {\n    if (response.status === 409) {\n      throw new GeneratedContentRequestError("A row already exists for this content key, target date, and mode. Open the saved row instead of creating over it.", 409);\n    }\n    throw new Error(`Supabase create failed with ${response.status}: ${JSON.stringify(payload)}`);\n  }',
    "single-create conflict semantics"
)

# Add single-create validation and honor requested status/provider/model.
needle = '  const blockType = normalizedGeneratedContentBlockType(body.blockType, body.surface, body.mode);\n  const isCmsRow = isCmsGeneratedContentWriteBody(body);\n  const packageState = fallbackArchitectureV3CreateState(body);'
replacement = '''  if (body.status && !allowedStatuses.has(body.status)) {
    throw new GeneratedContentRequestError("status must be DRAFT, REVIEWED, LIVE, ARCHIVED, or ERROR.");
  }

  const blockType = normalizedGeneratedContentBlockType(body.blockType, body.surface, body.mode);
  const isCmsRow = isCmsGeneratedContentWriteBody(body);
  const packageState = fallbackArchitectureV3CreateState(body);
  if (!packageState && body.status === "LIVE") {
    if (isSampleOnlyRow(body.surface, body.contentKey)) {
      throw new GeneratedContentRequestError("Personalized content test rows cannot be published globally. Generate real user or bond scoped content instead.");
    }
    const requestedLane = typeof body.lane === "string" && body.lane.trim() ? body.lane.trim() : "serving";
    if (requestedLane !== "serving") {
      throw new GeneratedContentRequestError("Published content must use the serving lane.", 409);
    }
    if (body.reviewState) {
      throw new GeneratedContentRequestError("Published content cannot retain a review hold.", 409);
    }
    assertValidCmsTemplate({
      contentKey: body.contentKey,
      headline: body.headline,
      summary: body.summary,
      body: body.body,
      sourceSnapshot: body.sourceSnapshot
    });
    assertCanPublishGeneratedContent(body);
  }'''
text = replace_once(text, needle, replacement, "single-create validation")
text = replace_once(
    text,
    '    status: packageState?.status ?? "DRAFT",',
    '    status: packageState?.status ?? body.status ?? "DRAFT",',
    "single-create status"
)
text = replace_once(
    text,
    '    provider: packageState?.provider ?? (isCmsRow ? "manual-admin" : "claude"),\n    model: "manual",',
    '    provider: packageState?.provider ?? (typeof body.provider === "string" && body.provider.trim() ? body.provider.trim() : "manual-admin"),\n    model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : "manual",',
    "single-create provenance"
)

# Bulk-write LIVE invariants and correct request errors.
text = replace_all_checked(
    text,
    'throw new Error("Personalized content test rows cannot be published globally. Generate real user or bond scoped content instead.");',
    'throw new GeneratedContentRequestError("Personalized content test rows cannot be published globally. Generate real user or bond scoped content instead.");',
    2,
    "sample publish request classification"
)
marker = '  if (body.status === "LIVE") {\n    const requestedEdition = isRecord(body.sections) ? skyArticleEditionRecord(body.sections.skyArticleEdition) : null;'
insert = '''  if (body.status === "LIVE") {
    const requestedLane = typeof body.lane === "string" && body.lane.trim() ? body.lane.trim() : "serving";
    if (requestedLane !== "serving") {
      throw new GeneratedContentRequestError("Published content must use the serving lane.", 409);
    }
    if (body.reviewState) {
      throw new GeneratedContentRequestError("Published content cannot retain a review hold.", 409);
    }
    const requestedEdition = isRecord(body.sections) ? skyArticleEditionRecord(body.sections.skyArticleEdition) : null;'''
# This marker occurs in generatedContentRowFromWriteBody only after the first create function was altered above.
if text.count(marker) != 1:
    raise RuntimeError(f"bulk LIVE invariant marker: expected 1, found {text.count(marker)}")
text = text.replace(marker, insert, 1)

# Existing-row fetch must include version identity.
text = replace_once(
    text,
    '  params.set("select", "id,content_key,surface,target_date,mode,event_type,status,headline,summary,body,sections,facts,lane,review_state,block_type,provider,prompt_version,source_snapshot,judge_score,judge_verdict,judge_gate,judge_why");',
    '  params.set("select", "id,content_key,surface,target_date,mode,event_type,status,headline,summary,body,sections,facts,lane,review_state,block_type,provider,prompt_version,source_snapshot,judge_score,judge_verdict,judge_gate,judge_why,updated_at");',
    "row lookup version"
)

text = replace_once(
    text,
    '  const existing = await fetchExistingRowById(body.id);\n  const isPackageRow = isFallbackArchitectureV3Row(existing);',
    '''  const existing = await fetchExistingRowById(body.id);
  if (!existing) {
    throw new GeneratedContentRequestError("Content row was not found.", 404);
  }
  if (body.expectedUpdatedAt && body.expectedUpdatedAt !== existing.updated_at) {
    throw new GeneratedContentRequestError("This content changed after the editor was opened. Reload the row before saving so a newer edit is not overwritten.", 409);
  }
  const isPackageRow = isFallbackArchitectureV3Row(existing);
  const effectiveContentKey = body.contentKey ?? existing.content_key;
  const effectiveSurface = (body.surface ?? existing.surface) as GeneratedContentSurface | undefined;''',
    "update existence and optimistic lock"
)

# Owner actions may carry the optimistic version field.
text = replace_all_checked(
    text,
    '!["id", "ownerAction"].includes(key)',
    '!["id", "ownerAction", "expectedUpdatedAt"].includes(key)',
    3,
    "owner action optimistic version allowance"
)

# The update sample guard must use effective existing identity when PATCH is partial.
text = replace_once(
    text,
    '    if (body.status === "LIVE" && isSampleOnlyRow(body.surface, body.contentKey)) {',
    '    if (body.status === "LIVE" && isSampleOnlyRow(effectiveSurface, effectiveContentKey)) {',
    "effective sample identity"
)

text = replace_once(
    text,
    '    if (body.status === "LIVE") {\n      const requestedEdition = isRecord(body.sections) ? skyArticleEditionRecord(body.sections.skyArticleEdition) : null;',
    '''    if (body.status === "LIVE") {
      if (!isPackageRow) {
        const effectiveLane = typeof body.lane === "string" && body.lane.trim()
          ? body.lane.trim()
          : existing.lane ?? "serving";
        if (effectiveLane !== "serving") {
          throw new GeneratedContentRequestError("Published content must use the serving lane.", 409);
        }
      }
      const requestedEdition = isRecord(body.sections) ? skyArticleEditionRecord(body.sections.skyArticleEdition) : null;''',
    "effective live lane guard"
)

# DELETE must be version-aware, missing-row aware, and protect LIVE rows.
old_delete = '''async function deleteGeneratedContent(req: IncomingMessage) {
  const requestUrl = new URL(req.url ?? "/api/admin/generated-content", "http://localhost");
  const id = requestUrl.searchParams.get("id");

  if (!id) {
    throw new Error("id is required.");
  }

  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase delete failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}'''
new_delete = '''async function deleteGeneratedContent(req: IncomingMessage) {
  const requestUrl = new URL(req.url ?? "/api/admin/generated-content", "http://localhost");
  const id = requestUrl.searchParams.get("id");
  const expectedUpdatedAt = requestUrl.searchParams.get("expectedUpdatedAt");

  if (!id) {
    throw new GeneratedContentRequestError("id is required.");
  }

  const existing = await fetchExistingRowById(id);
  if (!existing) {
    throw new GeneratedContentRequestError("Content row was not found.", 404);
  }
  if (existing.status === "LIVE") {
    throw new GeneratedContentRequestError("Published rows cannot be hard-deleted. Demote or archive the row first.", 409);
  }
  if (expectedUpdatedAt && expectedUpdatedAt !== existing.updated_at) {
    throw new GeneratedContentRequestError("This content changed after it was selected for deletion. Reload before deleting it.", 409);
  }

  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase delete failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}'''
text = replace_once(text, old_delete, new_delete, "delete guards")

# Stable general cursor response. Compatibility retains its id cursor.
old_get_response = '''      const rows = await listGeneratedContent(req);
      const requestLimit = Math.min(Number(requestUrl.searchParams.get("limit") ?? "50"), 1000);
      sendJson(res, 200, {
        ok: true,
        rows,
        ...(requestUrl.searchParams.get("scope") === "compatibility"
          ? { nextCursor: rows.length === requestLimit ? rows.at(-1)?.id ?? null : null }
          : {})
      });'''
new_get_response = '''      const rows = await listGeneratedContent(req);
      const requestLimit = boundedGeneratedContentLimit(requestUrl.searchParams.get("limit"));
      const scope = requestUrl.searchParams.get("scope") ?? "all";
      const hasDateRange = Boolean(requestUrl.searchParams.get("startDate") || requestUrl.searchParams.get("endDate"));
      const nextCursor = rows.length === requestLimit
        ? scope === "compatibility"
          ? rows.at(-1)?.id ?? null
          : hasDateRange
            ? null
            : encodeGeneratedContentCursor(rows.at(-1))
        : null;
      sendJson(res, 200, { ok: true, rows, nextCursor });'''
text = replace_once(text, old_get_response, new_get_response, "GET cursor response")

write(path, text)


# ---------------------------------------------------------------------------
# Admin dashboard: stable cursor hydration + optimistic version propagation.
# ---------------------------------------------------------------------------
path = "apps/admin/src/GeneratedContentAdminDashboard.tsx"
text = read(path)
old_loader = '''  const pageSize = scope === "compatibility" ? 500 : 400;
  const allRows: AdminGeneratedContentRow[] = [];
  let cursor: string | null = null;

  for (let offset = 0; offset < 50000; offset += pageSize) {
    const result = await loadGeneratedContentPage(
      `/api/admin/generated-content?status=all&visibility=${visibility}&scope=${scope}&limit=${pageSize}${scope === "compatibility" ? cursor ? `&cursor=${encodeURIComponent(cursor)}` : "" : `&offset=${offset}`}`,
      secret
    );
    const pageRows = assertRowsPayload(result, "/api/admin/generated-content");

    allRows.push(...pageRows);
    const complete = scope === "compatibility" ? !result.nextCursor : pageRows.length < pageSize;
    onPage?.(dedupeGeneratedContentRows(allRows), complete);
    if (complete) {
      break;
    }
    if (scope === "compatibility") cursor = result.nextCursor ?? null;
  }'''
new_loader = '''  const pageSize = scope === "compatibility" ? 500 : 400;
  const allRows: AdminGeneratedContentRow[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 125; page += 1) {
    const result = await loadGeneratedContentPage(
      `/api/admin/generated-content?status=all&visibility=${visibility}&scope=${scope}&limit=${pageSize}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      secret
    );
    const pageRows = assertRowsPayload(result, "/api/admin/generated-content");

    allRows.push(...pageRows);
    const complete = !result.nextCursor;
    onPage?.(dedupeGeneratedContentRows(allRows), complete);
    if (complete) break;
    cursor = result.nextCursor ?? null;
  }'''
text = replace_once(text, old_loader, new_loader, "dashboard cursor loader")

# saveDraft: attach the loaded row version to PATCH requests.
text = replace_once(
    text,
    '    const isPackageDraft = draftIsFallbackArchitectureV3(draftForSave);\n    const isGuidedHeldReview = isPackageDraft && guidedReviewKey === draftForSave.contentKey;\n\n    try {',
    '    const isPackageDraft = draftIsFallbackArchitectureV3(draftForSave);\n    const isGuidedHeldReview = isPackageDraft && guidedReviewKey === draftForSave.contentKey;\n    const persistedRow = draftForSave.id ? rows.find((row) => row.id === draftForSave.id) : null;\n    const expectedUpdatedAt = persistedRow?.updated_at ?? undefined;\n\n    try {',
    "saveDraft loaded version"
)
text = replace_once(
    text,
    '      const method = draftForSave.id ? "PATCH" : "POST";\n      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {\n        method,\n        body: JSON.stringify(body)\n      });',
    '      const method = draftForSave.id ? "PATCH" : "POST";\n      const versionedBody = method === "PATCH" && expectedUpdatedAt ? { ...body, expectedUpdatedAt } : body;\n      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {\n        method,\n        body: JSON.stringify(versionedBody)\n      });',
    "saveDraft optimistic payload"
)

# Bulk PATCH requests also carry the version loaded into the selection.
text = replace_once(
    text,
    '          body: JSON.stringify(requestBody)\n        });',
    '          body: JSON.stringify(row.updated_at ? { ...requestBody, expectedUpdatedAt: row.updated_at } : requestBody)\n        });',
    "bulk optimistic payload"
)

# Bulk deletes carry a version token; API independently protects LIVE rows.
text = replace_once(
    text,
    '      await Promise.all(deletable.map((row) => adminJsonRequest<{ ok: boolean }>(`/api/admin/generated-content?id=${encodeURIComponent(row.id)}`, secret, {\n        method: "DELETE"\n      })));',
    '      await Promise.all(deletable.map((row) => adminJsonRequest<{ ok: boolean }>(`/api/admin/generated-content?id=${encodeURIComponent(row.id)}${row.updated_at ? `&expectedUpdatedAt=${encodeURIComponent(row.updated_at)}` : ""}`, secret, {\n        method: "DELETE"\n      })));',
    "bulk delete optimistic payload"
)
write(path, text)


# ---------------------------------------------------------------------------
# Reader hydration: governed dynamic natal exact keys + demotion cache revision.
# ---------------------------------------------------------------------------
path = "apps/web/src/services/generatedContent.ts"
text = read(path)
text = replace_once(
    text,
    'import { selectLatestLiveServingDashboardRows } from "./fallbackArchitectureV3DashboardOverlay";',
    'import { selectLatestLiveServingDashboardRows } from "./fallbackArchitectureV3DashboardOverlay";\nimport { isFallbackDashboardRecordAllowed } from "../content/fallbackArchitectureV3/dashboardExtensions";',
    "dashboard extension import"
)
old_version = '''  const { data: versionRows, error: versionError } = await supabase
    .from("generated_interpretations")
    .select("updated_at")
    .eq("provider", fallbackArchitectureV3Provider)
    .eq("status", "LIVE")
    .eq("lane", "serving")
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<Array<Pick<GeneratedContentRow, "updated_at">>>();

  if (versionError) {
    console.warn("Fallback architecture V3 live overlay version failed to load; cached/local copy remains active.", versionError);
    return cached?.bundle ?? null;
  }

  const dashboardVersion = fallbackArchitectureV3DashboardVersionFromRows(versionRows ?? []);'''
new_version = '''  const { data: runtimeRevision, error: runtimeRevisionError } = await supabase
    .rpc("content_runtime_revision", { p_provider: fallbackArchitectureV3Provider });
  let dashboardVersion = typeof runtimeRevision === "string" ? Date.parse(runtimeRevision) : 0;

  if (runtimeRevisionError || !Number.isFinite(dashboardVersion)) {
    // Backward-compatible rollout path while the DB migration reaches an environment.
    // This fallback cannot detect every demotion, so it is used only when the revision
    // RPC is unavailable.
    const { data: versionRows, error: versionError } = await supabase
      .from("generated_interpretations")
      .select("updated_at")
      .eq("provider", fallbackArchitectureV3Provider)
      .eq("status", "LIVE")
      .eq("lane", "serving")
      .order("updated_at", { ascending: false })
      .limit(1)
      .returns<Array<Pick<GeneratedContentRow, "updated_at">>>();
    if (versionError) {
      console.warn("Fallback architecture V3 live overlay version failed to load; cached/local copy remains active.", versionError);
      return cached?.bundle ?? null;
    }
    dashboardVersion = fallbackArchitectureV3DashboardVersionFromRows(versionRows ?? []);
  }'''
text = replace_once(text, old_version, new_version, "runtime revision watermark")

text = replace_once(
    text,
    '''  const currentCoreKeys = new Set(currentCoreManifest.keys.map((manifestKey) => {
  const separatorIndex = manifestKey.indexOf(":");
  return separatorIndex >= 0 ? manifestKey.slice(separatorIndex + 1) : manifestKey;
}));
  const overlayRows = selectLatestLiveServingDashboardRows(''',
    '''  const currentCoreKeys = new Set(currentCoreManifest.keys.map((manifestKey) => {
    const separatorIndex = manifestKey.indexOf(":");
    return separatorIndex >= 0 ? manifestKey.slice(separatorIndex + 1) : manifestKey;
  }));
  for (const row of rows) {
    const extensionRecord = { ...packageRecord(row), contentKey: row.content_key };
    if (isFallbackDashboardRecordAllowed(extensionRecord, currentCoreKeys)) {
      currentCoreKeys.add(row.content_key);
    }
  }
  const overlayRows = selectLatestLiveServingDashboardRows(''',
    "dynamic natal exact hydration"
)
write(path, text)


# Preview must use the same dynamic-key eligibility as production hydration.
path = "api/admin/natal-placement-preview.ts"
text = read(path)
text = replace_once(
    text,
    'import { loadLocalWebEnv } from "../_lib/local-env.js";',
    'import { loadLocalWebEnv } from "../_lib/local-env.js";\nimport { isFallbackDashboardRecordAllowed } from "../../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions.js";',
    "preview extension import"
)
text = replace_once(
    text,
    '  if (!currentPackageKeys.has(candidate.packageRow.contentKey)) return "not-current-package-key";',
    '  if (!isFallbackDashboardRecordAllowed(candidate.packageRow, currentPackageKeys)) return "not-current-package-key";',
    "preview dynamic key eligibility"
)
write(path, text)


# Any Content Studio announcement invalidates shared natal/relationship promises.
path = "apps/web/src/services/contentUpdateSignal.ts"
text = read(path)
text = replace_once(
    text,
    'export const contentUpdateStorageKey = "tldrastro:content-update";',
    'import { clearSharedGeneratedContentCache } from "./sharedGeneratedContentCache";\n\nexport const contentUpdateStorageKey = "tldrastro:content-update";',
    "shared cache import"
)
text = replace_once(
    text,
    'export function subscribeToContentUpdates(listener: (notice: ContentUpdateNotice) => void) {\n  if (typeof window === "undefined") return () => undefined;',
    'export function subscribeToContentUpdates(listener: (notice: ContentUpdateNotice) => void) {\n  if (typeof window === "undefined") return () => undefined;\n  const notify = (notice: ContentUpdateNotice) => {\n    clearSharedGeneratedContentCache();\n    listener(notice);\n  };',
    "shared cache notify"
)
text = replace_all_checked(text, 'if (notice) listener(notice);', 'if (notice) notify(notice);', 2, "content update listeners")
text = replace_once(text, 'if (event.data) listener(event.data);', 'if (event.data) notify(event.data);', "broadcast cache invalidation")
write(path, text)


# ---------------------------------------------------------------------------
# Prepopulation may refresh drafts, but must never overwrite a published target.
# ---------------------------------------------------------------------------
path = "api/admin/prepopulate-content.ts"
text = read(path)
helper = r'''
function queueTargetKey(row: Pick<QueueRow, "content_key" | "target_date" | "mode">) {
  return [row.content_key, row.target_date ?? "", row.mode].join("\u0000");
}

async function liveQueueTargets(rows: QueueRow[]) {
  const contentKeys = Array.from(new Set(rows.map((row) => row.content_key)));
  if (contentKeys.length === 0) return new Set<string>();
  const params = new URLSearchParams({ select: "content_key,target_date,mode", status: "eq.LIVE" });
  params.set("content_key", `in.(${contentKeys.map((key) => `"${key}"`).join(",")})`);
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase live queue lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return new Set((Array.isArray(payload) ? payload : []).map((row) => queueTargetKey(row as QueueRow)));
}
'''
text = replace_once(text, '\nasync function saveRows(rows: QueueRow[]) {', '\n' + helper + '\nasync function saveRows(rows: QueueRow[]) {', "prepopulate live helper")
old_save = '''async function saveRows(rows: QueueRow[]) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(rows)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase queue save failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}'''
new_save = '''async function saveRows(rows: QueueRow[]) {
  const liveTargets = await liveQueueTargets(rows);
  const pendingRows = rows.filter((row) => !liveTargets.has(queueTargetKey(row)));
  const skippedLiveRows = rows.filter((row) => liveTargets.has(queueTargetKey(row))).map((row) => row.content_key);
  if (pendingRows.length === 0) return { rows: [], skippedLiveRows };

  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(pendingRows)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase queue save failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return { rows: Array.isArray(payload) ? payload : [], skippedLiveRows };
}'''
text = replace_once(text, old_save, new_save, "prepopulate live protection")
text = replace_once(
    text,
    '    const saved = await saveRows(rows);\n\n    sendJson(res, 200, {\n      ok: true,\n      surface: requestedSurface,\n      targetDate,\n      inserted: rows.length,\n      rows: saved\n    });',
    '    const saved = await saveRows(rows);\n\n    sendJson(res, 200, {\n      ok: true,\n      surface: requestedSurface,\n      targetDate,\n      inserted: saved.rows.length,\n      skippedLiveRows: saved.skippedLiveRows,\n      rows: saved.rows\n    });',
    "prepopulate response"
)
write(path, text)


# ---------------------------------------------------------------------------
# Focused executable QA.
# ---------------------------------------------------------------------------
crud_test = r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import { Readable } from "node:stream";

process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "crud-guard-secret";
process.env.SUPABASE_URL = "https://crud-guard.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "crud-guard-service-role";

const { default: handler } = await import("../api/admin/generated-content.ts");
process.env.CONTENT_GENERATION_SECRET = "crud-guard-secret";
process.env.SUPABASE_URL = "https://crud-guard.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "crud-guard-service-role";

const base = {
  surface: "sky", mode: "feed", event_type: "manual", target_date: null,
  headline: "", summary: "", sections: {}, facts: {}, source_snapshot: {},
  knowledge_ids: [], block_type: "essay", flags: [], provider: "manual-admin",
  prompt_version: "manual-admin", model: "manual", reviewer_notes: "",
  evergreen: false, evergreen_at: null, evergreen_by: null,
  judge_score: null, judge_verdict: null, judge_gate: null, judge_why: null,
  reviewed_at: null, published_at: null, created_at: "2026-09-02T10:00:00.000Z"
};
let rows = new Map([
  ["draft-id", { ...base, id: "draft-id", content_key: "crud/draft", status: "DRAFT", lane: "serving", review_state: "EDITORIAL_REVIEW_REQUIRED", body: "draft old", updated_at: "2026-09-02T10:00:00.000Z" }],
  ["reference-id", { ...base, id: "reference-id", content_key: "crud/reference", status: "DRAFT", lane: "reference", review_state: null, body: "reference", updated_at: "2026-09-02T10:01:00.000Z" }],
  ["sample-id", { ...base, id: "sample-id", content_key: "sample-you-crud", surface: "you", status: "DRAFT", lane: "serving", review_state: null, body: "sample", updated_at: "2026-09-02T10:02:00.000Z" }],
  ["live-id", { ...base, id: "live-id", content_key: "crud/live", status: "LIVE", lane: "serving", review_state: null, body: "live", updated_at: "2026-09-02T10:03:00.000Z" }]
]);
const requests = [];
const pageRows = [
  { ...base, id: "page-b", content_key: "page/b", status: "DRAFT", lane: "serving", review_state: null, body: "b", updated_at: "2026-09-02T12:00:00.000Z" },
  { ...base, id: "page-a", content_key: "page/a", status: "DRAFT", lane: "serving", review_state: null, body: "a", updated_at: "2026-09-02T11:00:00.000Z" }
];

function targetKey(row) { return [row.content_key, row.target_date ?? "", row.mode].join("|"); }

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const method = init.method ?? "GET";
  requests.push({ method, url: url.toString(), body: init.body ? JSON.parse(String(init.body)) : null });
  assert.equal(url.origin, "https://crud-guard.invalid");
  assert.equal(url.pathname, "/rest/v1/generated_interpretations");

  if (method === "GET") {
    const idFilter = url.searchParams.get("id");
    if (idFilter?.startsWith("eq.")) {
      const row = rows.get(idFilter.slice(3));
      return Response.json(row ? [row] : []);
    }
    const cursor = url.searchParams.get("or") ?? "";
    return Response.json(cursor.includes("updated_at.lt") ? [pageRows[1]] : pageRows);
  }
  if (method === "PATCH") {
    const id = (url.searchParams.get("id") ?? "").replace(/^eq\./u, "");
    const existing = rows.get(id);
    if (!existing) return Response.json([]);
    const patch = JSON.parse(String(init.body));
    const next = { ...existing, ...patch, updated_at: "2026-09-02T13:00:00.000Z" };
    rows.set(id, next);
    return Response.json([next]);
  }
  if (method === "DELETE") {
    const id = (url.searchParams.get("id") ?? "").replace(/^eq\./u, "");
    const existing = rows.get(id);
    if (!existing) return Response.json([]);
    rows.delete(id);
    return Response.json([existing]);
  }
  if (method === "POST") {
    assert.equal(url.searchParams.has("on_conflict"), false, "Single create must not use upsert semantics.");
    const created = JSON.parse(String(init.body));
    const duplicate = [...rows.values()].find((row) => targetKey(row) === targetKey(created));
    if (duplicate) return Response.json({ code: "23505", message: "duplicate key" }, { status: 409 });
    const next = { ...base, ...created, id: "created-id", updated_at: "2026-09-02T13:30:00.000Z", created_at: "2026-09-02T13:30:00.000Z" };
    rows.set(next.id, next);
    return Response.json([next]);
  }
  throw new Error(`Unexpected ${method} ${url}`);
};

function req(method, url, body) {
  const stream = body === undefined ? Readable.from([]) : Readable.from([JSON.stringify(body)]);
  stream.method = method; stream.url = url; stream.headers = { authorization: "Bearer crud-guard-secret" };
  return stream;
}
function res() {
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const response = { statusCode: 0, setHeader() {}, end(value) { resolve({ status: this.statusCode, payload: value ? JSON.parse(value) : null }); } };
  return { done, response };
}
async function invoke(method, url, body) {
  const { done, response } = res();
  await handler(req(method, url, body), response);
  return done;
}

let result = await invoke("PATCH", "/api/admin/generated-content", { id: "missing", body: "x" });
assert.equal(result.status, 404);
result = await invoke("DELETE", "/api/admin/generated-content?id=missing");
assert.equal(result.status, 404);

result = await invoke("PATCH", "/api/admin/generated-content", { id: "reference-id", status: "LIVE" });
assert.equal(result.status, 409, "LIVE + reference must be rejected.");
assert.equal(rows.get("reference-id").status, "DRAFT");

result = await invoke("PATCH", "/api/admin/generated-content", { id: "sample-id", status: "LIVE" });
assert.notEqual(result.status, 200, "Partial PATCH must not publish an existing sample row.");

result = await invoke("PATCH", "/api/admin/generated-content", { id: "draft-id", expectedUpdatedAt: "2026-09-02T00:00:00.000Z", body: "stale overwrite" });
assert.equal(result.status, 409);
assert.equal(rows.get("draft-id").body, "draft old");

result = await invoke("PATCH", "/api/admin/generated-content", { id: "draft-id", expectedUpdatedAt: "2026-09-02T10:00:00.000Z", body: "fresh edit" });
assert.equal(result.status, 200);
assert.equal(rows.get("draft-id").body, "fresh edit");

result = await invoke("DELETE", "/api/admin/generated-content?id=live-id&expectedUpdatedAt=2026-09-02T10%3A03%3A00.000Z");
assert.equal(result.status, 409, "Published content must not hard-delete.");
assert.ok(rows.has("live-id"));

result = await invoke("PATCH", "/api/admin/generated-content", { id: "live-id", expectedUpdatedAt: "2026-09-02T10:03:00.000Z", status: "DRAFT" });
assert.equal(result.status, 200);
const demotedVersion = result.payload.rows[0].updated_at;
result = await invoke("DELETE", `/api/admin/generated-content?id=live-id&expectedUpdatedAt=${encodeURIComponent(demotedVersion)}`);
assert.equal(result.status, 200);
assert.equal(rows.has("live-id"), false);

result = await invoke("POST", "/api/admin/generated-content", {
  contentKey: "crud/draft", surface: "sky", mode: "feed", eventType: "manual", body: "must not replace"
});
assert.equal(result.status, 409, "Duplicate Create must conflict rather than overwrite.");
assert.equal(rows.get("draft-id").body, "fresh edit");

result = await invoke("POST", "/api/admin/generated-content", {
  contentKey: "crud/new-reference-live", surface: "sky", mode: "feed", status: "LIVE", lane: "reference", eventType: "manual", body: "no"
});
assert.equal(result.status, 409);

const firstPage = await invoke("GET", "/api/admin/generated-content?status=all&visibility=all&limit=2");
assert.equal(firstPage.status, 200);
assert.ok(firstPage.payload.nextCursor);
const secondPage = await invoke("GET", `/api/admin/generated-content?status=all&visibility=all&limit=2&cursor=${encodeURIComponent(firstPage.payload.nextCursor)}`);
assert.equal(secondPage.status, 200);
const cursorRequest = requests.map((item) => ({ ...item, parsed: new URL(item.url) })).find((item) => item.method === "GET" && (item.parsed.searchParams.get("or") ?? "").includes("updated_at.lt"));
assert.ok(cursorRequest, "Second inventory page must use a stable updated_at/id cursor.");
assert.equal(cursorRequest.parsed.searchParams.get("offset"), "0");

console.log("Content Studio CRUD and hydration guards passed.");
'''
write("scripts/test-content-studio-crud-hydration-guards.mjs", crud_test)

reliability_test = r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("api/admin/generated-content.ts", "utf8");
const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
const runtime = fs.readFileSync("apps/web/src/services/generatedContent.ts", "utf8");
const signal = fs.readFileSync("apps/web/src/services/contentUpdateSignal.ts", "utf8");
const preview = fs.readFileSync("api/admin/natal-placement-preview.ts", "utf8");
const prepopulate = fs.readFileSync("api/admin/prepopulate-content.ts", "utf8");
const migration = fs.readFileSync("apps/web/supabase/migrations/20260902060000_content_studio_hydration_crud_reliability.sql", "utf8");

assert.match(api, /expectedUpdatedAt\?: string/u);
assert.match(api, /Published rows cannot be hard-deleted/u);
assert.match(api, /A row already exists for this content key/u);
assert.match(api, /encodeGeneratedContentCursor/u);
assert.match(dashboard, /expectedUpdatedAt/u);
assert.doesNotMatch(dashboard, /scope === "compatibility" \? cursor[\s\S]{0,180}: `&offset=\$\{offset\}`/u);
assert.match(runtime, /\.rpc\("content_runtime_revision"/u);
assert.match(runtime, /isFallbackDashboardRecordAllowed/u);
assert.match(preview, /isFallbackDashboardRecordAllowed/u);
assert.match(signal, /clearSharedGeneratedContentCache\(\)/u);
assert.match(prepopulate, /skippedLiveRows/u);
assert.match(prepopulate, /status: "eq\.LIVE"/u);
assert.match(migration, /generated_interpretations_provider_updated_idx/u);
assert.match(migration, /generated_interpretations_active_serving_updated_idx/u);
assert.match(migration, /content_runtime_revision/u);

console.log("Content Studio hydration reliability wiring passed.");
'''
write("scripts/test-content-studio-hydration-reliability.mjs", reliability_test)

print("Content Studio application repair patches written.")
