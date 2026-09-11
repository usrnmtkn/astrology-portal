import type { createSupabaseReportAdmin } from "./supabase-report-admin.js";

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
