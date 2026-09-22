import { getSupabaseClient } from "./auth";
import type { GeneratedReportKind, GeneratedReportRecord, ReportLibraryItem, ReportLibrarySourceKind } from "./reportLibrary";
import type { ReportDeliveryPayload } from "./reportFulfillment";

export type SharedReportPayload =
  | {
      sourceKind: "generated_interpretation";
      reportKind: GeneratedReportKind;
      report: GeneratedReportRecord;
    }
  | {
      sourceKind: "premium_report";
      reportKind: "premium_report";
      report: NonNullable<ReportDeliveryPayload["report"]>;
    };

async function accessToken(expectedUserId?: string) {
  const client = await getSupabaseClient();
  const session = await client?.auth.getSession();
  if (session?.error) throw session.error;
  if (expectedUserId && session?.data.session?.user.id !== expectedUserId) {
    throw new Error("Your account changed. Open the report again.");
  }
  return session?.data.session?.access_token ?? "";
}

export async function createReportShareLink(item: Pick<ReportLibraryItem, "sourceKind" | "sourceId" | "vanitySlug" | "ownerId">) {
  const token = await accessToken(item.ownerId);
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
  await accessToken(item.ownerId);
  return payload.shareUrl;
}

export async function stopReportSharing(item: Pick<ReportLibraryItem, "sourceKind" | "sourceId" | "ownerId">) {
  const token = await accessToken(item.ownerId);
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
  return sourceKind === "generated_interpretation" ? "Saved reading" : "Report";
}
