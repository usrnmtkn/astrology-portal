import { getSupabaseClient } from "./auth";
import { reportVanityPath, reportVanitySlug } from "./reportLinks";

export const reportReadyEvent = "tldrastro:report-ready";

export type ReportLibrarySourceKind = "generated_interpretation" | "premium_report";
export type ReportLibraryStatus = "generating" | "ready" | "needs_attention";
export type GeneratedReportKind = "friend_transit_reading" | "you_day_reading" | "you_week_reading";

export type ReportLibraryItem = {
  ownerId?: string;
  id: string;
  sourceKind: ReportLibrarySourceKind;
  sourceId: string;
  reportKind: GeneratedReportKind | "premium_report";
  title: string;
  subjectLabel: string;
  subtitle: string;
  status: ReportLibraryStatus;
  progressLabel?: string;
  statusMessage?: string;
  targetDate: string | null;
  periodEnd: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
  seenAt: string | null;
  archivedAt: string | null;
  isShared: boolean;
  vanitySlug: string;
  route: string;
};

export type GeneratedReportRecord = {
  id: string;
  subjectType: GeneratedReportKind;
  subjectId: string;
  subjectLabel: string;
  contentKey: string;
  status: string;
  eventType: string | null;
  targetDate: string | null;
  periodEnd: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type GeneratedReportRow = {
  error?: string | null;
  id: string;
  subject_type: GeneratedReportKind;
  subject_id: string;
  content_key: string;
  status: string;
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  source_snapshot: Record<string, unknown> | null;
  friend_report_entitlement_id: string | null;
  you_report_entitlement_id: string | null;
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
  deleted_at: string | null;
  seen_at: string | null;
};

type ReportShareStateRow = {
  source_kind: ReportLibrarySourceKind;
  source_id: string;
  revoked_at: string | null;
};

export type ReportReadyEventDetail = {
  sourceKind: ReportLibrarySourceKind;
  sourceId: string;
  title: string;
  route: string;
};

const generatedReportSubjectTypes: GeneratedReportKind[] = [
  "friend_transit_reading",
  "you_day_reading",
  "you_week_reading"
];

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

function generatedSubjectLabel(row: Pick<GeneratedReportRow, "subject_type" | "source_snapshot" | "headline">) {
  if (row.subject_type === "you_day_reading" || row.subject_type === "you_week_reading") return "You";
  const snapshotName = row.source_snapshot?.friendName;
  if (typeof snapshotName === "string" && snapshotName.trim()) return snapshotName.trim();
  const headlineName = row.headline?.match(/^What's going on with (.+?) right now\?$/u)?.[1]?.trim();
  return headlineName || "Friend";
}

function generatedVanitySubject(row: Pick<GeneratedReportRow, "subject_type" | "source_snapshot" | "headline">) {
  if (row.subject_type === "you_day_reading") return "your-day";
  if (row.subject_type === "you_week_reading") return "your-week";
  return generatedSubjectLabel(row);
}

function generatedPeriodEnd(row: Pick<GeneratedReportRow, "subject_type" | "source_snapshot" | "target_date">) {
  if (row.subject_type === "friend_transit_reading" || row.subject_type === "you_day_reading") return row.target_date;
  const periodEnd = row.source_snapshot?.periodEnd;
  return typeof periodEnd === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(periodEnd) ? periodEnd : row.target_date;
}

function generatedReportStatus(row: GeneratedReportRow): ReportLibraryStatus {
  if (row.body.trim()) return "ready";
  if (row.status === "ERROR") return "needs_attention";
  return "generating";
}

function stateKey(sourceKind: ReportLibrarySourceKind, sourceId: string) {
  return `${sourceKind}:${sourceId}`;
}

async function authenticatedContext(expectedUserId?: string) {
  const client = await getSupabaseClient();
  if (!client) {
    if (expectedUserId) throw new Error("Your session could not be confirmed. Please try again.");
    return null;
  }
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (expectedUserId && data.session?.user.id !== expectedUserId) {
    throw new Error("Your session could not be confirmed. Please try again.");
  }
  if (!data.session?.user.id) return null;
  return { client, userId: data.session.user.id };
}

export function dispatchReportReady(detail: ReportReadyEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ReportReadyEventDetail>(reportReadyEvent, { detail }));
}

function generatedProgressLabel(row: GeneratedReportRow, status: ReportLibraryStatus) {
  if (status === "needs_attention") return row.error?.includes("quality gate") ? "Needs review" : "Could not finish";
  if (status !== "generating") return undefined;
  const progress = row.source_snapshot?.reportProgress;
  const stage = progress && typeof progress === "object" ? (progress as { stage?: unknown }).stage : undefined;
  switch (stage) {
    case "writing": return "Writing";
    case "checking": return "Checking";
    case "revising": return "Revising";
    case "waiting": return "Queued to continue";
    default: return "Preparing";
  }
}

export async function listReportLibrary(options: { expectedUserId?: string } = {}): Promise<ReportLibraryItem[]> {
  const context = await authenticatedContext(options.expectedUserId);
  if (!context) return [];
  const { client, userId } = context;

  const [generatedResult, premiumResult, stateResult, shareResult] = await Promise.all([
    client
      .from("user_generated_interpretations")
      .select("id, subject_type, subject_id, content_key, status, error, event_type, target_date, headline, summary, body, source_snapshot, friend_report_entitlement_id, you_report_entitlement_id, created_at, updated_at")
      .eq("user_id", userId)
      .in("subject_type", generatedReportSubjectTypes)
      .in("status", ["DRAFT", "LIVE", "ARCHIVED", "ERROR"])
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
      .select("source_kind, source_id, archived_at, seen_at, deleted_at")
      .eq("user_id", userId)
      .returns<ReportLibraryStateRow[]>(),
    client
      .from("report_share_links")
      .select("source_kind, source_id, revoked_at")
      .eq("user_id", userId)
      .returns<ReportShareStateRow[]>()
  ]);

  if (generatedResult.error) throw generatedResult.error;
  if (premiumResult.error) throw premiumResult.error;
  if (stateResult.error) throw stateResult.error;
  if (shareResult.error) throw shareResult.error;

  const states = new Map(
    (stateResult.data ?? []).map((row) => [stateKey(row.source_kind, row.source_id), row])
  );
  const activeShares = new Set(
    (shareResult.data ?? [])
      .filter((row) => !row.revoked_at)
      .map((row) => stateKey(row.source_kind, row.source_id))
  );

  const generated = (generatedResult.data ?? []).flatMap<ReportLibraryItem>((row) => {
    const hasBody = Boolean(row.body.trim());
    const lifecyclePlaceholder = Boolean(row.friend_report_entitlement_id || row.you_report_entitlement_id);
    if (!hasBody && !lifecyclePlaceholder) return [];
    const state = states.get(stateKey("generated_interpretation", row.id));
    if (state?.deleted_at) return [];
    const title = row.headline?.trim() || (row.subject_type === "friend_transit_reading" ? "Friends reading" : "Your transit report");
    const subjectLabel = generatedSubjectLabel(row);
    const status = generatedReportStatus(row);
    const singleDayWindow = { periodEnd: row.target_date };
    const periodEnd = row.subject_type === "you_week_reading" ? generatedPeriodEnd(row) : singleDayWindow.periodEnd;
    const vanitySlug = reportVanitySlug({ targetDate: row.target_date, createdAt: row.created_at, subjectLabel: generatedVanitySubject(row), title });
    return [{
      ownerId: userId,
      id: `generated_interpretation:${row.id}`,
      sourceKind: "generated_interpretation",
      sourceId: row.id,
      reportKind: row.subject_type,
      title,
      subjectLabel,
      subtitle: row.subject_type === "friend_transit_reading" ? "Friends" : "You",
      status,
      progressLabel: generatedProgressLabel(row, status),
      statusMessage: status === "needs_attention"
        ? row.error?.includes("quality gate")
          ? "This report did not pass its content checks. No finished report is available."
          : "This report could not finish generating. Your saved reports are unchanged."
        : undefined,
      targetDate: row.target_date,
      periodEnd,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      readyAt: status === "ready" ? row.updated_at : null,
      seenAt: state?.seen_at ?? null,
      archivedAt: state ? state.archived_at : (row.status === "ARCHIVED" ? row.updated_at : null),
      isShared: status === "ready" && activeShares.has(stateKey("generated_interpretation", row.id)),
      vanitySlug,
      route: `/reports/${vanitySlug}`
    }];
  });

  const premium = (premiumResult.data ?? []).flatMap<ReportLibraryItem>((row) => {
    if (!customerPremiumFulfillmentStates.has(row.fulfillment_status) || row.revoked_at) return [];
    const state = states.get(stateKey("premium_report", row.id));
    if (state?.deleted_at) return [];
    const title = premiumReportTitle(row);
    const subjectLabel = title;
    const vanitySlug = reportVanitySlug({ targetDate: row.period_start, createdAt: row.created_at, subjectLabel, title });
    return [{
      ownerId: userId,
      id: `premium_report:${row.id}`,
      sourceKind: "premium_report",
      sourceId: row.id,
      reportKind: "premium_report",
      title,
      subjectLabel,
      subtitle: [compactDate(row.period_start), compactDate(row.period_end)].filter(Boolean).join(" - "),
      status: premiumReportStatus(row),
      targetDate: row.period_start,
      periodEnd: row.period_end,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      readyAt: row.delivered_at,
      seenAt: state?.seen_at ?? null,
      archivedAt: state?.archived_at ?? null,
      isShared: activeShares.has(stateKey("premium_report", row.id)),
      vanitySlug,
      route: `/reports/${vanitySlug}`
    }];
  });

  return [...generated, ...premium].sort((left, right) => (
    Date.parse(right.readyAt ?? right.updatedAt) - Date.parse(left.readyAt ?? left.updatedAt)
  ));
}

export async function resolveReportLibraryItemByVanitySlug(slug: string) {
  const items = await listReportLibrary();
  return items.find((item) => item.vanitySlug === slug) ?? null;
}

export async function loadGeneratedReportById(reportId: string): Promise<GeneratedReportRecord | null> {
  const context = await authenticatedContext();
  if (!context) return null;
  const { client, userId } = context;
  const deletion = await client.from("user_report_library_state")
    .select("deleted_at").eq("user_id", userId)
    .eq("source_kind", "generated_interpretation").eq("source_id", reportId).maybeSingle();
  if (deletion.error) throw deletion.error;
  if (deletion.data?.deleted_at) return null;
  const { data, error } = await client
    .from("user_generated_interpretations")
    .select("id, subject_type, subject_id, content_key, status, error, event_type, target_date, headline, summary, body, source_snapshot, friend_report_entitlement_id, you_report_entitlement_id, created_at, updated_at")
    .eq("user_id", userId)
    .eq("id", reportId)
    .in("subject_type", generatedReportSubjectTypes)
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
    subjectLabel: generatedSubjectLabel(row),
    contentKey: row.content_key,
    status: row.status,
    eventType: row.event_type,
    targetDate: row.target_date,
    periodEnd: generatedPeriodEnd(row),
    headline: row.headline,
    summary: row.summary,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function generatedReportVanityPath(report: Pick<GeneratedReportRecord, "subjectType" | "targetDate" | "createdAt" | "subjectLabel" | "headline">) {
  const subjectLabel = report.subjectType === "you_day_reading"
    ? "your-day"
    : report.subjectType === "you_week_reading"
      ? "your-week"
      : report.subjectLabel;
  return reportVanityPath({
    targetDate: report.targetDate,
    createdAt: report.createdAt,
    subjectLabel,
    title: report.headline
  });
}

async function upsertLibraryState(
  sourceKind: ReportLibrarySourceKind,
  sourceId: string,
  patch: { archived_at?: string | null; seen_at?: string | null; deleted_at?: string },
  expectedUserId?: string
) {
  const context = await authenticatedContext(expectedUserId);
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

export async function markReportSeen(item: Pick<ReportLibraryItem, "sourceKind" | "sourceId" | "ownerId">) {
  await upsertLibraryState(item.sourceKind, item.sourceId, { seen_at: new Date().toISOString() }, item.ownerId);
}

export async function markReportArchived(
  item: Pick<ReportLibraryItem, "sourceKind" | "sourceId" | "ownerId">,
  archived: boolean
) {
  await upsertLibraryState(item.sourceKind, item.sourceId, {
    archived_at: archived ? new Date().toISOString() : null
  }, item.ownerId);
}

export function unreadReadyReports(items: ReportLibraryItem[]) {
  return items.filter((item) => item.status === "ready" && !item.seenAt && !item.archivedAt);
}

// A library deletion retains fulfillment and payment history, but has no Restore action.
export async function deleteReport(item: Pick<ReportLibraryItem, "sourceKind" | "sourceId" | "ownerId">) {
  await upsertLibraryState(item.sourceKind, item.sourceId, { deleted_at: new Date().toISOString() }, item.ownerId);
}
