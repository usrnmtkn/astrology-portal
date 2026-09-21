import type { createSupabaseReportAdmin } from "./supabase-report-admin.js";

// Only an explicit, authorized report request may make a deleted result visible
// again. Workers and ordinary library reads must preserve deletion. Revoke old
// share links before clearing the tombstone so requesting a report never shares it.
export async function restoreRequestedGeneratedReport(
  admin: ReturnType<typeof createSupabaseReportAdmin>,
  userId: string,
  sourceId: string
) {
  const identity = {
    user_id: `eq.${userId}`,
    source_kind: "eq.generated_interpretation",
    source_id: `eq.${sourceId}`
  };
  const state = await admin.selectOne<{ deleted_at: string | null; updated_at: string }>(
    "user_report_library_state",
    new URLSearchParams({ ...identity, select: "deleted_at,updated_at" })
  );
  if (!state?.deleted_at) return;

  const now = new Date().toISOString();
  await admin.update("report_share_links", new URLSearchParams({
    ...identity, revoked_at: "is.null"
  }).toString(), { revoked_at: now, updated_at: now });
  const restored = await admin.update("user_report_library_state", new URLSearchParams({
    ...identity, deleted_at: `eq.${state.deleted_at}`, updated_at: `eq.${state.updated_at}`
  }).toString(), { deleted_at: null, archived_at: null, seen_at: null, updated_at: now });
  if (restored.length !== 1) {
    throw new Error("Report library state changed during this request. Please try again.");
  }
}

export async function isReportDeleted(
  admin: ReturnType<typeof createSupabaseReportAdmin>,
  userId: string,
  sourceKind: "generated_interpretation" | "premium_report",
  sourceId: string
) {
  const state = await admin.selectOne<{ deleted_at: string | null }>(
    "user_report_library_state",
    new URLSearchParams({ user_id: `eq.${userId}`, source_kind: `eq.${sourceKind}`, source_id: `eq.${sourceId}`, select: "deleted_at" })
  );
  return Boolean(state?.deleted_at);
}
