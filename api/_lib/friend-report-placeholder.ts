import { FRIEND_TRANSIT_READING_PROMPT_VERSION, friendTransitReadingRequestLock } from "./friend-transit-reading.js";
import type { FriendReportEntitlementRow } from "./friend-report-lifecycle.js";
import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.js";

export type FriendReportPlaceholderRow = {
  id: string;
  content_key: string;
  status: string;
  body: string;
  updated_at: string;
};

export async function ensureFriendReportPlaceholder(input: {
  admin?: SupabaseReportAdmin;
  entitlement: FriendReportEntitlementRow;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  const locked = friendTransitReadingRequestLock({
    brief: input.entitlement.brief,
    subjectId: input.entitlement.subject_id,
    targetDate: input.entitlement.target_date
  });
  const rows = await admin.insert<FriendReportPlaceholderRow>("user_generated_interpretations", {
    user_id: input.entitlement.user_id,
    subject_type: "friend_transit_reading",
    subject_id: input.entitlement.subject_id,
    content_key: input.entitlement.content_key,
    surface: locked.surface,
    mode: locked.mode,
    status: "DRAFT",
    event_type: locked.eventType,
    target_date: input.entitlement.target_date,
    facts: locked.facts,
    knowledge_ids: locked.knowledgeIds,
    source_snapshot: locked.sourceSnapshot,
    prompt_version: FRIEND_TRANSIT_READING_PROMPT_VERSION,
    provider: null,
    model: null,
    headline: locked.headline,
    summary: null,
    body: "",
    sections: { sections: [], sceneLock: null, astrologyDrilldown: null },
    response_id: null,
    error: null
  }, {
    onConflict: "user_id,subject_type,subject_id,content_key,target_date,mode",
    ignoreDuplicates: true
  });
  if (rows[0]) return rows[0];
  const existing = await admin.selectOne<FriendReportPlaceholderRow>(
    "user_generated_interpretations",
    new URLSearchParams({
      user_id: `eq.${input.entitlement.user_id}`,
      subject_type: "eq.friend_transit_reading",
      subject_id: `eq.${input.entitlement.subject_id}`,
      content_key: `eq.${input.entitlement.content_key}`,
      target_date: `eq.${input.entitlement.target_date}`,
      mode: "eq.in_depth",
      select: "id,content_key,status,body,updated_at"
    })
  );
  if (!existing) throw new Error("FRIEND_REPORT_PLACEHOLDER_NOT_CREATED");
  return existing;
}
