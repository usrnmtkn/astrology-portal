import { getSupabaseClient } from "./auth";

export const reportReadyEvent = "tldrastro:report-ready";

export type ReportLibrarySourceKind = "generated_interpretation" | "premium_report";
export type ReportLibraryStatus = "generating" | "ready" | "needs_attention";

export type ReportLibraryItem = {
  id: string;
  sourceKind: ReportLibrarySourceKind;
  sourceId: string;
  reportKind: "friend_transit_reading" | "premium_report";
  title: string;
  subtitle: string;
  status: ReportLibraryStatus;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
  seenAt: string | null;
  archivedAt: string | null;
  route: string;
};

export type GeneratedReportRecord = {
  id: string;
  subjectType: string;
  subjectId: string;
  contentKey: string;
  status: string;
  eventType: string | null;
  targetDate: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type GeneratedReportRow = {
  id: string;
  subject_type: string;
  subject_id: string;
  content_key: string;
  status: string;
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

type PremiumReportRow = {
  id: string;
  report_type: string;
  subject_id: string | null;
  period_start: string;
  period_end: string;
  status: string;
  report_domain: string | null;
  report_horizon: string | null;
  fulfillment_status: string;
  delivered_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReportLibraryStateRow = {
  source_kind: ReportLibrarySourceKind;
  source_id: string;
  archived_at: string | null;
  seen_at: string | null;
};

export type ReportReadyEventDetail = {
  sourceKind: ReportLibrarySourceKind;
  sourceId: string;
  title: string;
  route: string;
};

const customerPremiumFulfillmentStates = new Set([
  "awaiting_birth_data",
  "queued",
  "calculating",
  "writing",
  "validating",
  "judging",
  "live"
]);

function compactDate(value: string | null) {
  if (!value) return "";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function premiumReportTitle(row: PremiumReportRow) {
  if (row.report_type === "year_ahead") return "Year Ahead";
  if (row.report_type === "relationship") return "Relationship Report";
  if (row.report_type === "saturn_return") return "Saturn Return";
  const domain = row.report_domain?.replaceAll("_", " ") ?? "general";
  const horizon = row.report_horizon?.replaceAll("_", " ") ?? "report";
  return `${domain.replace(/^./u, (letter) => letter.toUpperCase())} · ${horizon}`;
}

function premiumReportStatus(row: PremiumReportRow): ReportLibraryStatus {
  if (row.fulfillment_status === "awaiting_birth_data") return "needs_attention";
  if (row.fulfillment_status === "live" || row.delivered_at || row.status === "live") return "ready";
  return "generating";
}

function stateKey(sourceKind: ReportLibrarySourceKind, sourceId: string) {
  return `${sourceKind}:${sourceId}`;
}

async function authenticatedContext() {
  const client = await getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.user.id) return null;
  return { client, userId: data.session.user.id };
}

export function dispatchReportReady(detail: ReportReadyEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ReportReadyEventDetail>(reportReadyEvent, { detail }));
}

export async function listReportLibrary(): Promise<ReportLibraryItem[]> {
  const context = await authenticatedContext();
  if (!context) return [];
  const { client, userId } = context;

  const [generatedResult, premiumResult, stateResult] = await Promise.all([
    client
      .from("user_generated_interpretations")
      .select("id, subject_type, subject_id, content_key, status, event_type, target_date, headline, summary, body, created_at, updated_at")
      .eq("user_id", userId)
      .eq("subject_type", "friend_transit_reading")
      .in("status", ["DRAFT", "LIVE", "ARCHIVED"])
      .order("updated_at", { ascending: false })
      .returns<GeneratedReportRow[]>(),
    client
      .from("user_reports")
      .select("id, report_type, subject_id, period_start, period_end, status, report_domain, report_horizon, fulfillment_status, delivered_at, revoked_at, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .returns<PremiumReportRow[]>(),
    client
      .from("user_report_library_state")
      .select("source_kind, source_id, archived_at, seen_at")
      .eq("user_id", userId)
      .returns<ReportLibraryStateRow[]>()
  ]);

  if (generatedResult.error) throw generatedResult.error;
  if (premiumResult.error) throw premiumResult.error;
  if (stateResult.error) throw stateResult.error;

  const states = new Map(
    (stateResult.data ?? []).map((row) => [stateKey(row.source_kind, row.source_id), row])
  );

  const generated = (generatedResult.data ?? []).flatMap<ReportLibraryItem>((row) => {
    if (!row.body.trim()) return [];
    const state = states.get(stateKey("generated_interpretation", row.id));
    return [{
      id: `generated_interpretation:${row.id}`,
      sourceKind: "generated_interpretation",
      sourceId: row.id,
      reportKind: "friend_transit_reading",
      title: row.headline?.trim() || "Friends reading",
      subtitle: ["Friends", "Right now", compactDate(row.target_date)].filter(Boolean).join(" · "),
      status: "ready",
      targetDate: row.target_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      readyAt: row.updated_at,
      seenAt: state?.seen_at ?? null,
      archivedAt: state ? state.archived_at : (row.status === "ARCHIVED" ? row.updated_at : null),
      route: `/reports/generated/${row.id}`
    }];
  });

  const premium = (premiumResult.data ?? []).flatMap<ReportLibraryItem>((row) => {
    if (!customerPremiumFulfillmentStates.has(row.fulfillment_status) || row.revoked_at) return [];
    const state = states.get(stateKey("premium_report", row.id));
    return [{
      id: `premium_report:${row.id}`,
      sourceKind: "premium_report",
      sourceId: row.id,
      reportKind: "premium_report",
      title: premiumReportTitle(row),
      subtitle: [compactDate(row.period_start), compactDate(row.period_end)].filter(Boolean).join(" - "),
      status: premiumReportStatus(row),
      targetDate: row.period_start,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      readyAt: row.delivered_at,
      seenAt: state?.seen_at ?? null,
      archivedAt: state?.archived_at ?? null,
      route: `/reports/${row.id}`
    }];
  });

  return [...generated, ...premium].sort((left, right) => (
    Date.parse(right.readyAt ?? right.updatedAt) - Date.parse(left.readyAt ?? left.updatedAt)
  ));
}

export async function loadGeneratedReportById(reportId: string): Promise<GeneratedReportRecord | null> {
  const context = await authenticatedContext();
  if (!context) return null;
  const { client, userId } = context;
  const { data, error } = await client
    .from("user_generated_interpretations")
    .select("id, subject_type, subject_id, content_key, status, event_type, target_date, headline, summary, body, created_at, updated_at")
    .eq("user_id", userId)
    .eq("id", reportId)
    .eq("subject_type", "friend_transit_reading")
    .in("status", ["DRAFT", "LIVE", "ARCHIVED"])
    .limit(1)
    .returns<GeneratedReportRow[]>();
  if (error) throw error;
  const row = data?.[0];
  if (!row || !row.body.trim()) return null;
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    contentKey: row.content_key,
    status: row.status,
    eventType: row.event_type,
    targetDate: row.target_date,
    headline: row.headline,
    summary: row.summary,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function upsertLibraryState(
  sourceKind: ReportLibrarySourceKind,
  sourceId: string,
  patch: { archived_at?: string | null; seen_at?: string | null }
) {
  const context = await authenticatedContext();
  if (!context) throw new Error("Sign in to manage reports.");
  const { client, userId } = context;
  const { error } = await client
    .from("user_report_library_state")
    .upsert({
      user_id: userId,
      source_kind: sourceKind,
      source_id: sourceId,
      ...patch,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,source_kind,source_id" });
  if (error) throw error;
}

export async function markReportSeen(item: Pick<ReportLibraryItem, "sourceKind" | "sourceId">) {
  await upsertLibraryState(item.sourceKind, item.sourceId, { seen_at: new Date().toISOString() });
}

export async function markReportArchived(
  item: Pick<ReportLibraryItem, "sourceKind" | "sourceId">,
  archived: boolean
) {
  await upsertLibraryState(item.sourceKind, item.sourceId, {
    archived_at: archived ? new Date().toISOString() : null
  });
}

export function unreadReadyReports(items: ReportLibraryItem[]) {
  return items.filter((item) => item.status === "ready" && !item.seenAt && !item.archivedAt);
}
