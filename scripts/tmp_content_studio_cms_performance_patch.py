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

# -----------------------------------------------------------------------------
# Content Studio: cancellable, progressive inventory pagination.
# -----------------------------------------------------------------------------
path = "apps/admin/src/GeneratedContentAdminDashboard.tsx"
text = read(path)

text = replace_once(
    text,
    '''async function loadGeneratedContentPage(path: string, secret: string) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[]; nextCursor?: string | null }>(path, secret);
    } catch (error) {
      const retryDelay = generatedContentPageRetryDelaysMs[attempt];
      if (retryDelay === undefined || !isRetryableAdminReadError(error)) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
    }
  }
}''',
    '''async function loadGeneratedContentPage(path: string, secret: string, signal?: AbortSignal) {
  for (let attempt = 0; ; attempt += 1) {
    if (signal?.aborted) throw signal.reason ?? new Error("Content inventory load was cancelled.");
    try {
      return await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[]; nextCursor?: string | null }>(path, secret, { signal });
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error;
      const retryDelay = generatedContentPageRetryDelaysMs[attempt];
      if (retryDelay === undefined || !isRetryableAdminReadError(error)) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
    }
  }
}''',
    "cancellable generated content page loader"
)

text = replace_once(
    text,
    '''async function loadAllGeneratedContentRows(
  secret: string,
  visibility: "editorial" | "all" = "editorial",
  scope: "all" | "compatibility" = "all",
  onPage?: (rows: AdminGeneratedContentRow[], complete: boolean) => void
) {''',
    '''async function loadAllGeneratedContentRows(
  secret: string,
  visibility: "editorial" | "all" = "editorial",
  scope: "all" | "compatibility" = "all",
  onPage?: (rows: AdminGeneratedContentRow[], complete: boolean) => void,
  signal?: AbortSignal
) {''',
    "inventory loader signal"
)

text = replace_once(
    text,
    '''  for (let page = 0; page < 125; page += 1) {
    const result = await loadGeneratedContentPage(
      `/api/admin/generated-content?status=all&visibility=${visibility}&scope=${scope}&limit=${pageSize}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      secret
    );''',
    '''  for (let page = 0; page < 125; page += 1) {
    if (signal?.aborted) throw signal.reason ?? new Error("Content inventory load was cancelled.");
    const result = await loadGeneratedContentPage(
      `/api/admin/generated-content?status=all&visibility=${visibility}&scope=${scope}&limit=${pageSize}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      secret,
      signal
    );''',
    "inventory page abort"
)

text = replace_once(
    text,
    '''  const skyArticleWorkspaceAutosaveSequenceRef = useRef(0);''',
    '''  const skyArticleWorkspaceAutosaveSequenceRef = useRef(0);
  const dashboardLoadSequenceRef = useRef(0);
  const dashboardLoadControllerRef = useRef<AbortController | null>(null);''',
    "dashboard load refs"
)

text = replace_once(
    text,
    '''  async function loadDashboardData(secretOverride?: string, persistOnSuccess = false, credentialKind: "session" | "secret" = "secret") {
    const normalizedSecret = normalizeAdminSecret(secretOverride ?? secret);
    if (!normalizedSecret) {''',
    '''  async function loadDashboardData(secretOverride?: string, persistOnSuccess = false, credentialKind: "session" | "secret" = "secret") {
    const loadSequence = ++dashboardLoadSequenceRef.current;
    dashboardLoadControllerRef.current?.abort();
    const loadController = new AbortController();
    dashboardLoadControllerRef.current = loadController;
    const normalizedSecret = normalizeAdminSecret(secretOverride ?? secret);
    if (!normalizedSecret) {''',
    "dashboard load sequence"
)

old_generated = '''        loadAllGeneratedContentRows(
          normalizedSecret,
          needsExtendedInventory || loadsCompatibilityFirst ? "all" : "editorial",
          loadsCompatibilityFirst ? "compatibility" : "all",
          loadsCompatibilityFirst
            ? (loadedRows, complete) => {
                setRows(loadedRows);
                setMessage(complete
                  ? `Loaded ${loadedRows.length} compatibility records.`
                  : `Loaded ${loadedRows.length} compatibility records…`);
              }
            : undefined
        ),
        adminJsonRequest<{ ok: boolean; rows?: AdminReviewRecord[]; records?: AdminReviewRecord[]; counts?: unknown }>("/api/admin/review-records?surface=upcomingAspects&status=all", normalizedSecret),
        adminJsonRequest<{ ok: boolean; rows: AdminUserGeneratedContentRow[] }>("/api/admin/user-generated-content?status=all&limit=100", normalizedSecret),
        loadAdminSourceDraftCatalog(normalizedSecret),
        adminJsonRequest<{ ok: boolean; rows: AdminContentReviewEventRow[] }>("/api/admin/content-review-events?limit=250", normalizedSecret)'''
new_generated = '''        loadAllGeneratedContentRows(
          normalizedSecret,
          needsExtendedInventory || loadsCompatibilityFirst ? "all" : "editorial",
          loadsCompatibilityFirst ? "compatibility" : "all",
          (loadedRows, complete) => {
            if (loadSequence !== dashboardLoadSequenceRef.current || loadController.signal.aborted) return;
            setRows(loadedRows);
            const inventoryLabel = loadsCompatibilityFirst ? "compatibility records" : "content records";
            setMessage(complete
              ? `Loaded ${loadedRows.length} ${inventoryLabel}.`
              : `Loaded ${loadedRows.length} ${inventoryLabel}…`);
          },
          loadController.signal
        ),
        adminJsonRequest<{ ok: boolean; rows?: AdminReviewRecord[]; records?: AdminReviewRecord[]; counts?: unknown }>("/api/admin/review-records?surface=upcomingAspects&status=all", normalizedSecret, { signal: loadController.signal }),
        adminJsonRequest<{ ok: boolean; rows: AdminUserGeneratedContentRow[] }>("/api/admin/user-generated-content?status=all&limit=100", normalizedSecret, { signal: loadController.signal }),
        loadAdminSourceDraftCatalog(normalizedSecret),
        adminJsonRequest<{ ok: boolean; rows: AdminContentReviewEventRow[] }>("/api/admin/content-review-events?limit=250", normalizedSecret, { signal: loadController.signal })'''
text = replace_once(text, old_generated, new_generated, "progressive initial inventory")

text = replace_once(
    text,
    '''      if (generatedResult.status === "rejected") {
        throw generatedResult.reason;
      }

      const review:''',
    '''      if (loadSequence !== dashboardLoadSequenceRef.current || loadController.signal.aborted) return false;
      if (generatedResult.status === "rejected") {
        throw generatedResult.reason;
      }

      const review:''',
    "stale load guard before commit"
)

text = replace_once(
    text,
    '''    } catch (error) {
      const accessDenied = error instanceof AdminRequestError && error.status === 401;''',
    '''    } catch (error) {
      if (loadSequence !== dashboardLoadSequenceRef.current || loadController.signal.aborted) return false;
      const accessDenied = error instanceof AdminRequestError && error.status === 401;''',
    "stale load guard catch"
)

text = replace_once(
    text,
    '''    } finally {
      setIsLoading(false);
    }
  }

  function submitAdminSecret() {''',
    '''    } finally {
      if (loadSequence === dashboardLoadSequenceRef.current) setIsLoading(false);
    }
  }

  function submitAdminSecret() {''',
    "stale load guard finally"
)

text = replace_once(
    text,
    '''    let cancelled = false;
    setIsLoading(true);
    void loadAllGeneratedContentRows(secret, "all")
      .then((allRows) => {
        if (cancelled) return;
        setRows(allRows);
        setAllRowsLoaded(true);
        setMessage(`Loaded the extended ${allRows.length}-row content inventory.`);
      })''',
    '''    let cancelled = false;
    const controller = new AbortController();
    setIsLoading(true);
    void loadAllGeneratedContentRows(
      secret,
      "all",
      "all",
      (loadedRows, complete) => {
        if (cancelled) return;
        setRows(loadedRows);
        setMessage(complete
          ? `Loaded the extended ${loadedRows.length}-row content inventory.`
          : `Loaded ${loadedRows.length} extended content records…`);
      },
      controller.signal
    )
      .then((allRows) => {
        if (cancelled) return;
        setRows(allRows);
        setAllRowsLoaded(true);
        setMessage(`Loaded the extended ${allRows.length}-row content inventory.`);
      })''',
    "progressive extended inventory"
)

text = replace_once(
    text,
    '''    return () => {
      cancelled = true;
      setIsLoading(false);
    };
  }, [activePage, categoryFilter, showReferenceRows, showRetiredRows, allRowsLoaded, loadState, secret]);''',
    '''    return () => {
      cancelled = true;
      controller.abort();
      setIsLoading(false);
    };
  }, [activePage, categoryFilter, showReferenceRows, showRetiredRows, allRowsLoaded, loadState, secret]);''',
    "cancel extended inventory"
)

text = replace_once(
    text,
    '''    return () => {
      cancelled = true;
      unsubscribe();
    };''',
    '''    return () => {
      cancelled = true;
      dashboardLoadControllerRef.current?.abort();
      unsubscribe();
    };''',
    "cancel dashboard load on unmount"
)

write(path, text)

# -----------------------------------------------------------------------------
# Reader hydration: replace OFFSET/range scans with stable primary-key cursors.
# Full result ordering is restored in memory before precedence selection.
# -----------------------------------------------------------------------------
path = "apps/web/src/services/generatedContent.ts"
text = read(path)

marker = '''function fallbackArchitectureV3DashboardVersionFromRows(rows: Pick<GeneratedContentRow, "updated_at">[]) {
  return rows.reduce((version, row) => {
    const nextVersion = Date.parse(row.updated_at ?? "");
    return Number.isFinite(nextVersion) ? Math.max(version, nextVersion) : version;
  }, 0);
}
'''
replacement = marker + '''
function sortGeneratedRowsNewestFirst(rows: GeneratedContentRow[]) {
  return [...rows].sort((first, second) => {
    const firstUpdated = Date.parse(first.updated_at ?? "");
    const secondUpdated = Date.parse(second.updated_at ?? "");
    const firstVersion = Number.isFinite(firstUpdated) ? firstUpdated : 0;
    const secondVersion = Number.isFinite(secondUpdated) ? secondUpdated : 0;
    if (firstVersion !== secondVersion) return secondVersion - firstVersion;
    return second.id.localeCompare(first.id);
  });
}
'''
text = replace_once(text, marker, replacement, "reader newest-first helper")

old = '''  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;

  for (let page = 0; page < 10; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("generated_interpretations")
      .select("id, content_key, surface, mode, status, lane, review_state, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, flags, provider, judge_score, judge_gate, model, updated_at")
      .eq("provider", fallbackArchitectureV3Provider)
      .eq("status", "LIVE")
      .eq("lane", "serving")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to)
      .returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Fallback architecture V3 live overlay failed to load; cached/local copy remains active.", error);
      return cached?.bundle ?? null;
    }

    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }'''
new = '''  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;
  let cursorId: string | null = null;

  for (let page = 0; page < 10; page += 1) {
    let query = supabase
      .from("generated_interpretations")
      .select("id, content_key, surface, mode, status, lane, review_state, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, flags, provider, judge_score, judge_gate, model, updated_at")
      .eq("provider", fallbackArchitectureV3Provider)
      .eq("status", "LIVE")
      .eq("lane", "serving")
      .order("id", { ascending: true })
      .limit(pageSize);
    if (cursorId) query = query.gt("id", cursorId);
    const { data, error } = await query.returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Fallback architecture V3 live overlay failed to load; cached/local copy remains active.", error);
      return cached?.bundle ?? null;
    }

    rows.push(...(data ?? []));
    const lastId = data?.at(-1)?.id ?? null;
    if (!data || data.length < pageSize || !lastId) break;
    cursorId = lastId;
  }'''
text = replace_once(text, old, new, "fallback dashboard keyset pagination")

old = '''  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;

  for (let page = 0; page < 10; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("generated_interpretations")
      .select("id, content_key, surface, mode, status, lane, review_state, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, flags, provider, judge_score, judge_gate, model, updated_at")
      .like("content_key", "authored/compat-pair/%")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to)
      .returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Compatibility dashboard content failed to load; bundled relationship copy remains active.", error);
      return null;
    }

    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  const seen = new Set<string>();
  const authoredCards: AuthoredCard[] = [];
  for (const row of rows) {'''
new = '''  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;
  let cursorId: string | null = null;

  for (let page = 0; page < 10; page += 1) {
    let query = supabase
      .from("generated_interpretations")
      .select("id, content_key, surface, mode, status, lane, review_state, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, flags, provider, judge_score, judge_gate, model, updated_at")
      .like("content_key", "authored/compat-pair/%")
      .order("id", { ascending: true })
      .limit(pageSize);
    if (cursorId) query = query.gt("id", cursorId);
    const { data, error } = await query.returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Compatibility dashboard content failed to load; bundled relationship copy remains active.", error);
      return null;
    }

    rows.push(...(data ?? []));
    const lastId = data?.at(-1)?.id ?? null;
    if (!data || data.length < pageSize || !lastId) break;
    cursorId = lastId;
  }

  const seen = new Set<string>();
  const authoredCards: AuthoredCard[] = [];
  for (const row of sortGeneratedRowsNewestFirst(rows)) {'''
text = replace_once(text, old, new, "compatibility keyset pagination")

old = '''  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;

  for (let page = 0; page < 10; page += 1) {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from("generated_interpretations")
      .select("id, content_key, surface, mode, status, lane, review_state, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, flags, provider, judge_score, judge_gate, model, updated_at")
      .eq("provider", fallbackArchitectureV3SkyPlacementProvider)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1)
      .returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Sky Placement dashboard partition failed to load; cached/local content remains active.", error);
      return cached?.bundle ?? null;
    }

    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }'''
new = '''  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;
  let cursorId: string | null = null;

  for (let page = 0; page < 10; page += 1) {
    let query = supabase
      .from("generated_interpretations")
      .select("id, content_key, surface, mode, status, lane, review_state, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, flags, provider, judge_score, judge_gate, model, updated_at")
      .eq("provider", fallbackArchitectureV3SkyPlacementProvider)
      .order("id", { ascending: true })
      .limit(pageSize);
    if (cursorId) query = query.gt("id", cursorId);
    const { data, error } = await query.returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Sky Placement dashboard partition failed to load; cached/local content remains active.", error);
      return cached?.bundle ?? null;
    }

    rows.push(...(data ?? []));
    const lastId = data?.at(-1)?.id ?? null;
    if (!data || data.length < pageSize || !lastId) break;
    cursorId = lastId;
  }'''
text = replace_once(text, old, new, "sky placement keyset pagination")

old = '''  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;

  for (let page = 0; page < 10; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from("generated_interpretations")
      .select(generatedContentSelect)
      .in("surface", surfaces)
      .eq("status", "LIVE")
      .eq("lane", "serving")
      .is("review_state", null)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (targetDate && !requestedSurfaces.includes("sky")) {
      query = query.or(`target_date.is.null,target_date.eq.${targetDate}`);
    }

    const { data, error } = await query.returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Live generated content failed to load; unpublished content will remain hidden.", error);
      return new Map<string, LiveGeneratedContent>();
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      break;
    }
  }

  return generatedContentMapFromRows(rows, previewMode);'''
new = '''  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;
  let cursorId: string | null = null;

  for (let page = 0; page < 10; page += 1) {
    let query = supabase
      .from("generated_interpretations")
      .select(generatedContentSelect)
      .in("surface", surfaces)
      .eq("status", "LIVE")
      .eq("lane", "serving")
      .is("review_state", null)
      .order("id", { ascending: true })
      .limit(pageSize);

    if (cursorId) query = query.gt("id", cursorId);
    if (targetDate && !requestedSurfaces.includes("sky")) {
      query = query.or(`target_date.is.null,target_date.eq.${targetDate}`);
    }

    const { data, error } = await query.returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Live generated content failed to load; unpublished content will remain hidden.", error);
      return new Map<string, LiveGeneratedContent>();
    }

    rows.push(...(data ?? []));
    const lastId = data?.at(-1)?.id ?? null;
    if (!data || data.length < pageSize || !lastId) break;
    cursorId = lastId;
  }

  return generatedContentMapFromRows(sortGeneratedRowsNewestFirst(rows), previewMode);'''
text = replace_once(text, old, new, "live reader keyset pagination")

write(path, text)

# -----------------------------------------------------------------------------
# DB indexes shaped to Content Studio and reader cursor scans.
# -----------------------------------------------------------------------------
path = "apps/web/supabase/migrations/20260902060000_content_studio_hydration_crud_reliability.sql"
text = read(path)
anchor = '''create index if not exists generated_interpretations_active_serving_updated_idx
  on public.generated_interpretations (updated_at desc, id desc)
  where lane = 'serving' and status <> 'ARCHIVED';
'''
addition = anchor + '''
create index if not exists generated_interpretations_provider_id_idx
  on public.generated_interpretations (provider, id)
  where provider is not null;

create index if not exists generated_interpretations_live_serving_surface_id_idx
  on public.generated_interpretations (surface, id)
  where status = 'LIVE' and lane = 'serving' and review_state is null;
'''
text = replace_once(text, anchor, addition, "cursor indexes")
text += '''
-- Refresh planner statistics after the lifecycle normalization and new indexes.
analyze public.generated_interpretations;
'''
write(path, text)

# -----------------------------------------------------------------------------
# Regression tests for load behavior and cursor pagination.
# -----------------------------------------------------------------------------
write("scripts/test-content-studio-cms-performance.mjs", r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
const reader = fs.readFileSync("apps/web/src/services/generatedContent.ts", "utf8");
const migration = fs.readFileSync("apps/web/supabase/migrations/20260902060000_content_studio_hydration_crud_reliability.sql", "utf8");

assert.match(dashboard, /loadGeneratedContentPage\(path: string, secret: string, signal\?: AbortSignal\)/u);
assert.match(dashboard, /dashboardLoadControllerRef\.current\?\.abort\(\)/u, "A newer CMS load must cancel the previous inventory request.");
assert.match(dashboard, /loadSequence !== dashboardLoadSequenceRef\.current/u, "Late inventory responses must not overwrite a newer dashboard load.");
assert.match(dashboard, /\(loadedRows, complete\) => \{[\s\S]{0,320}setRows\(loadedRows\)/u, "Content Studio should paint inventory progressively instead of waiting for the entire table.");

for (const fn of [
  "loadFallbackArchitectureV3DashboardBundle",
  "loadFallbackArchitectureV3CompatibilityDashboardBundle",
  "loadFallbackArchitectureV3SkyPlacementDashboardBundle",
  "loadLiveGeneratedContentForSurfaces"
]) {
  const start = reader.indexOf(`function ${fn}`) >= 0 ? reader.indexOf(`function ${fn}`) : reader.indexOf(`function ${fn}`);
  const exportStart = reader.indexOf(`export async function ${fn}`);
  const index = exportStart >= 0 ? exportStart : start;
  assert.ok(index >= 0, `${fn} must exist.`);
  const nextExport = reader.indexOf("\nexport ", index + 10);
  const body = reader.slice(index, nextExport >= 0 ? nextExport : reader.length);
  assert.doesNotMatch(body, /\.range\(/u, `${fn} must not use OFFSET/range pagination.`);
  assert.match(body, /\.gt\("id", cursorId\)/u, `${fn} must advance by an ID cursor.`);
}

assert.match(reader, /sortGeneratedRowsNewestFirst\(rows\)/u, "Reader precedence must be restored after ID-cursor batch loading.");
assert.match(migration, /generated_interpretations_provider_id_idx/u);
assert.match(migration, /generated_interpretations_live_serving_surface_id_idx/u);
assert.match(migration, /analyze public\.generated_interpretations/u);

console.log("Content Studio CMS performance and cursor-pagination contract passed.");
''')

write("docs/content-studio-cms-reliability-plan.md", '''# Content Studio CMS reliability plan

## Goal

Content Studio must behave like a CMS rather than a bulk database browser: edits are versioned, publishing has one reader-serving meaning, inventory loads remain responsive as the corpus grows, and the reader sees the same eligible copy that Studio previews.

## Production baseline (2026-09-02)

- `generated_interpretations`: about 14.9k rows / 89 MB total relation size.
- Default editorial inventory: about 9.1k active serving rows.
- Heavy JSON/prose fields in that inventory alone: about 35 MB before HTTP/JSON overhead.
- Existing first-page editorial query: roughly 614 ms DB execution before transfer.
- Deep reader hydration page near offset 3000: roughly 426 ms DB execution.
- Postgres logs contain repeated statement-timeout cancellations during large content scans.

## Repair shipped in this branch

1. **CRUD safety**: create no longer silently overwrites, LIVE rows cannot be hard-deleted, invalid publish state is rejected, and 404/409 responses distinguish missing/stale records.
2. **Optimistic concurrency**: ordinary saves, bulk actions, autosaves, package approval, and Sky publication carry the last observed `updated_at` version and reject stale editors.
3. **Hydration parity**: natal Studio preview and reader use the same generated production projection and serving eligibility; dynamic exact natal keys have a governed extension contract.
4. **Cache invalidation**: fallback reader caches use a provider revision watermark so edit, publish, demotion, or archive invalidates stale content.
5. **Cursor pagination**: Admin inventory uses an opaque `(updated_at,id)` cursor; reader bulk hydration uses primary-key cursors instead of growing OFFSET scans, then restores newest-first precedence in memory.
6. **Query indexes**: indexes cover active Studio ordering, provider cursor scans, and LIVE serving surface cursor scans; migration refreshes planner statistics.
7. **Cancellable inventory loads**: a superseded CMS load is aborted and late responses cannot replace state from a newer navigation/auth load. Inventory progress is surfaced page by page.

## Next performance threshold

After this release, measure Content Studio initial usable time and transferred bytes. If the active editorial inventory still transfers more than 8 MB or takes more than 2 seconds on a warm production connection, the next change should split the API into:

- a compact **inventory projection** (identity, status, title, routing metadata, version), and
- a full **document detail** request fetched only when an editor opens.

That is intentionally a second phase because several current list classifiers inspect JSON metadata. Moving them to a compact projection should be done as an explicit schema contract rather than silently dropping fields.

## Release gates

- Focused CRUD/hydration/concurrency/performance tests pass.
- `npm run typecheck`, `npm run build:web`, and `npm run build:admin` pass.
- Migration is reviewed before production application.
- After migration: compare `EXPLAIN (ANALYZE, BUFFERS)` for Studio first page and reader cursor scans against this baseline.
- Production smoke: create draft, read it back, edit, stale-edit conflict, publish, reader hydration, demote, cache refresh, archive, restore, and protected delete.
''')

print("Content Studio CMS performance patch written.")
