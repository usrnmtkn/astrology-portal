import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { jsonRequestBody, reportUrl, requireReportUser, sendJson } from "./_lib/report-http.js";
import { createSupabaseReportAdmin } from "./_lib/supabase-report-admin.js";

type SourceKind = "generated_interpretation" | "premium_report";

type ShareRow = {
  id: string;
  user_id: string;
  source_kind: SourceKind;
  source_id: string;
  share_key: string;
  revoked_at: string | null;
};

type GeneratedRow = {
  id: string;
  user_id: string;
  subject_type: string;
  subject_id: string;
  content_key: string;
  status: string;
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  source_snapshot: { friendName?: unknown } | null;
  created_at: string;
  updated_at: string;
};

type PremiumRow = {
  id: string;
  user_id: string;
  report_domain: string;
  report_horizon: string;
  period_start: string;
  period_end: string;
  status: string;
  fulfillment_status: string;
  facts_engine: string;
  facts_hash: string;
  entitlement_id: string;
  delivered_at: string | null;
  revoked_at: string | null;
};

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function validShortShareKey(value: string) {
  return /^[A-Za-z0-9_-]{22}$/u.test(value);
}

function validShareKey(value: string) {
  return validShortShareKey(value) || validUuid(value);
}

function createShareKey() {
  return randomBytes(16).toString("base64url");
}

function shareFragment(shareKey: string) {
  return validShortShareKey(shareKey)
    ? `#s=${shareKey}`
    : `#share=${shareKey}`;
}

function validVanitySlug(value: string) {
  return value.length >= 3
    && value.length <= 120
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
}

function generatedSubjectLabel(row: GeneratedRow) {
  const snapshotName = row.source_snapshot?.friendName;
  if (typeof snapshotName === "string" && snapshotName.trim()) return snapshotName.trim();
  return row.headline?.match(/^What's going on with (.+?) right now\?$/u)?.[1]?.trim() || "Friend";
}

async function assertOwnerCanShare(
  admin: ReturnType<typeof createSupabaseReportAdmin>,
  userId: string,
  sourceKind: SourceKind,
  sourceId: string
) {
  if (sourceKind === "generated_interpretation") {
    const row = await admin.selectOne<Pick<GeneratedRow, "id" | "status" | "body">>(
      "user_generated_interpretations",
      new URLSearchParams({
        id: `eq.${sourceId}`,
        user_id: `eq.${userId}`,
        subject_type: "eq.friend_transit_reading",
        select: "id,status,body"
      })
    );
    if (!row || !["DRAFT", "LIVE", "ARCHIVED"].includes(row.status) || !row.body?.trim()) {
      throw new Error("Only completed saved readings can be shared.");
    }
    return;
  }

  const report = await admin.selectOne<Pick<PremiumRow, "id" | "status" | "fulfillment_status" | "revoked_at">>(
    "user_reports",
    new URLSearchParams({
      id: `eq.${sourceId}`,
      user_id: `eq.${userId}`,
      select: "id,status,fulfillment_status,revoked_at"
    })
  );
  if (!report || report.revoked_at || report.status !== "live" || report.fulfillment_status !== "live") {
    throw new Error("Only completed active reports can be shared.");
  }
}

function parseSourceRequest(body: { sourceKind?: unknown; sourceId?: unknown }) {
  const sourceKind = body.sourceKind;
  const sourceId = typeof body.sourceId === "string" ? body.sourceId : "";
  if (sourceKind !== "generated_interpretation" && sourceKind !== "premium_report") {
    throw new Error("Unsupported report source.");
  }
  if (!validUuid(sourceId)) {
    throw new Error("Invalid report share request.");
  }
  return { sourceKind, sourceId } as const;
}

async function createOrReuseShare(req: IncomingMessage, res: ServerResponse) {
  const user = await requireReportUser(req);
  const body = await jsonRequestBody<{ sourceKind?: unknown; sourceId?: unknown; vanitySlug?: unknown }>(req);
  const { sourceKind, sourceId } = parseSourceRequest(body);
  const vanitySlug = typeof body.vanitySlug === "string" ? body.vanitySlug : "";
  if (!validVanitySlug(vanitySlug)) {
    return sendJson(res, 400, { error: "Invalid report share request." });
  }

  const admin = createSupabaseReportAdmin();
  await assertOwnerCanShare(admin, user.id, sourceKind, sourceId);

  const existing = await admin.selectOne<ShareRow>(
    "report_share_links",
    new URLSearchParams({
      user_id: `eq.${user.id}`,
      source_kind: `eq.${sourceKind}`,
      source_id: `eq.${sourceId}`,
      select: "id,user_id,source_kind,source_id,share_key,revoked_at"
    })
  );

  let shareKey = existing?.share_key ?? "";
  if (!existing) {
    shareKey = createShareKey();
    await admin.insert<ShareRow>("report_share_links", {
      user_id: user.id,
      source_kind: sourceKind,
      source_id: sourceId,
      share_key: shareKey
    });
  } else if (existing.revoked_at) {
    shareKey = createShareKey();
    await admin.update<ShareRow>("report_share_links", `id=eq.${existing.id}`, {
      share_key: shareKey,
      revoked_at: null,
      updated_at: new Date().toISOString()
    });
  }

  res.setHeader("cache-control", "no-store");
  return sendJson(res, 200, {
    shareUrl: reportUrl(`/reports/${vanitySlug}${shareFragment(shareKey)}`, req)
  });
}

async function revokeShare(req: IncomingMessage, res: ServerResponse) {
  const user = await requireReportUser(req);
  const body = await jsonRequestBody<{ sourceKind?: unknown; sourceId?: unknown }>(req);
  const { sourceKind, sourceId } = parseSourceRequest(body);
  const admin = createSupabaseReportAdmin();
  const existing = await admin.selectOne<ShareRow>(
    "report_share_links",
    new URLSearchParams({
      user_id: `eq.${user.id}`,
      source_kind: `eq.${sourceKind}`,
      source_id: `eq.${sourceId}`,
      select: "id,user_id,source_kind,source_id,share_key,revoked_at"
    })
  );
  if (!existing || existing.revoked_at) {
    res.setHeader("cache-control", "no-store");
    return sendJson(res, 200, { ok: true, revoked: false });
  }
  await admin.update<ShareRow>("report_share_links", `id=eq.${existing.id}`, {
    revoked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  res.setHeader("cache-control", "no-store");
  return sendJson(res, 200, { ok: true, revoked: true });
}

async function loadSharedGenerated(
  admin: ReturnType<typeof createSupabaseReportAdmin>,
  share: ShareRow
) {
  const row = await admin.selectOne<GeneratedRow>(
    "user_generated_interpretations",
    new URLSearchParams({
      id: `eq.${share.source_id}`,
      user_id: `eq.${share.user_id}`,
      subject_type: "eq.friend_transit_reading",
      select: "id,user_id,subject_type,subject_id,content_key,status,event_type,target_date,headline,summary,body,source_snapshot,created_at,updated_at"
    })
  );
  if (!row || !["DRAFT", "LIVE", "ARCHIVED"].includes(row.status) || !row.body.trim()) return null;
  return {
    sourceKind: "generated_interpretation" as const,
    reportKind: "friend_transit_reading" as const,
    report: {
      id: row.id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      subjectLabel: generatedSubjectLabel(row),
      contentKey: row.content_key,
      status: row.status,
      eventType: row.event_type,
      targetDate: row.target_date,
      headline: row.headline,
      summary: row.summary,
      body: row.body,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  };
}

async function loadSharedPremium(
  admin: ReturnType<typeof createSupabaseReportAdmin>,
  share: ShareRow
) {
  const report = await admin.selectOne<PremiumRow>(
    "user_reports",
    new URLSearchParams({
      id: `eq.${share.source_id}`,
      user_id: `eq.${share.user_id}`,
      select: "id,user_id,report_domain,report_horizon,period_start,period_end,status,fulfillment_status,facts_engine,facts_hash,entitlement_id,delivered_at,revoked_at"
    })
  );
  if (!report || report.revoked_at || report.status !== "live" || report.fulfillment_status !== "live") return null;
  const entitlement = await admin.selectOne<{ status: string }>(
    "report_entitlements",
    new URLSearchParams({ id: `eq.${report.entitlement_id}`, user_id: `eq.${share.user_id}`, select: "status" })
  );
  if (!entitlement || entitlement.status === "revoked" || entitlement.status === "refunded") return null;

  const units = await admin.request<Array<{
    content_key: string;
    headline: string | null;
    summary: string | null;
    body: string | null;
    sections: Array<{ heading?: string; body?: string }> | null;
    source_snapshot: { renderMetadata?: { timing?: unknown } } | null;
  }>>(`user_generated_interpretations?subject_id=eq.${report.id}&subject_type=eq.report_unit&status=eq.DRAFT&select=content_key,headline,summary,body,sections,source_snapshot&order=content_key.asc`);

  return {
    sourceKind: "premium_report" as const,
    reportKind: "premium_report" as const,
    report: {
      id: report.id,
      reportDomain: report.report_domain,
      reportHorizon: report.report_horizon,
      periodStart: report.period_start,
      periodEnd: report.period_end,
      factsEngine: report.facts_engine,
      factsHash: report.facts_hash,
      deliveredAt: report.delivered_at,
      units: units.map(({ source_snapshot, ...unit }) => ({
        ...unit,
        timing: typeof source_snapshot?.renderMetadata?.timing === "string"
          ? source_snapshot.renderMetadata.timing
          : null
      }))
    }
  };
}

async function loadShare(req: IncomingMessage, res: ServerResponse) {
  const shareKey = new URL(req.url ?? "/api/report-share", "http://localhost").searchParams.get("share") ?? "";
  if (!validShareKey(shareKey)) return sendJson(res, 400, { error: "Invalid share link." });
  const admin = createSupabaseReportAdmin();
  const share = await admin.selectOne<ShareRow>(
    "report_share_links",
    new URLSearchParams({
      share_key: `eq.${shareKey}`,
      revoked_at: "is.null",
      select: "id,user_id,source_kind,source_id,share_key,revoked_at"
    })
  );
  if (!share) return sendJson(res, 404, { error: "This shared report is unavailable." });

  const payload = share.source_kind === "generated_interpretation"
    ? await loadSharedGenerated(admin, share)
    : await loadSharedPremium(admin, share);
  if (!payload) return sendJson(res, 404, { error: "This shared report is unavailable." });
  res.setHeader("cache-control", "private, no-store");
  return sendJson(res, 200, payload);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method === "POST") return await createOrReuseShare(req, res);
    if (req.method === "DELETE") return await revokeShare(req, res);
    if (req.method === "GET") return await loadShare(req, res);
    return sendJson(res, 405, { error: "Use GET, POST, or DELETE." });
  } catch (error) {
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Could not share the report." });
  }
}
