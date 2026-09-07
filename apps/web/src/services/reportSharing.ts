import { getSupabaseClient } from "./auth";
import type { GeneratedReportRecord, ReportLibraryItem, ReportLibrarySourceKind } from "./reportLibrary";
import type { ReportDeliveryPayload } from "./reportFulfillment";

export type SharedReportPayload =
  | {
      sourceKind: "generated_interpretation";
      reportKind: "friend_transit_reading";
      report: GeneratedReportRecord;
    }
  | {
      sourceKind: "premium_report";
      reportKind: "premium_report";
      report: NonNullable<ReportDeliveryPayload["report"]>;
    };

async function accessToken() {
  const client = await getSupabaseClient();
  const session = await client?.auth.getSession();
  return session?.data.session?.access_token ?? "";
}

export async function createReportShareLink(item: Pick<ReportLibraryItem, "sourceKind" | "sourceId" | "vanitySlug">) {
  const token = await accessToken();
  if (!token) throw new Error("Sign in to share reports.");
  const response = await fetch("/api/report-share", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sourceKind: item.sourceKind,
      sourceId: item.sourceId,
      vanitySlug: item.vanitySlug
    })
  });
  const payload = await response.json().catch(() => null) as { shareUrl?: string; error?: string } | null;
  if (!response.ok || !payload?.shareUrl) throw new Error(payload?.error ?? "Could not create a share link.");
  return payload.shareUrl;
}

export async function stopReportSharing(item: Pick<ReportLibraryItem, "sourceKind" | "sourceId">) {
  const token = await accessToken();
  if (!token) throw new Error("Sign in to manage report sharing.");
  const response = await fetch("/api/report-share", {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sourceKind: item.sourceKind,
      sourceId: item.sourceId
    })
  });
  const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "Could not stop sharing this report.");
}

export async function loadSharedReport(shareKey: string): Promise<SharedReportPayload> {
  const response = await fetch(`/api/report-share?share=${encodeURIComponent(shareKey)}`, {
    headers: { accept: "application/json" }
  });
  const payload = await response.json().catch(() => null) as SharedReportPayload & { error?: string };
  if (!response.ok || !payload?.sourceKind) throw new Error(payload?.error ?? "This shared report is unavailable.");
  return payload;
}

export function reportShareSourceLabel(sourceKind: ReportLibrarySourceKind) {
  return sourceKind === "generated_interpretation" ? "Friends reading" : "Report";
}
