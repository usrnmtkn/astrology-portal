import { useEffect, useMemo, useState } from "react";
import {
  generatedReportVanityPath,
  loadGeneratedReportById,
  markReportSeen,
  resolveReportLibraryItemByVanitySlug,
  type ReportLibraryItem
} from "../../services/reportLibrary";
import { isReportUuidSegment, reportShareKeyFromHash } from "../../services/reportLinks";
import { loadSharedReport, type SharedReportPayload } from "../../services/reportSharing";
import { ReportArticle } from "./ReportArticle";
import { documentFromDelivery, ReportDeliveryView } from "./ReportDeliveryView";
import { GeneratedReportArticle, GeneratedReportDeliveryView } from "./ReportLibraryView";

function DeliveryState({ message }: { message: string }) {
  return <main className="report-delivery-state" role="status"><p>{message}</p></main>;
}

export function LegacyGeneratedReportRedirect({ reportId }: { reportId: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadGeneratedReportById(reportId).then((report) => {
      if (cancelled) return;
      if (!report) {
        setFailed(true);
        return;
      }
      window.location.replace(generatedReportVanityPath(report));
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => { cancelled = true; };
  }, [reportId]);

  return <DeliveryState message={failed ? "This report is unavailable." : "Opening report…"} />;
}

function SharedReportView({ payload }: { payload: SharedReportPayload }) {
  if (payload.sourceKind === "generated_interpretation") {
    return <GeneratedReportArticle report={payload.report} backHref="/" />;
  }
  return <ReportArticle report={documentFromDelivery(payload.report)} backHref="/" />;
}

export function ReportVanityDeliveryView({ slug }: { slug: string }) {
  const shareKey = useMemo(() => reportShareKeyFromHash(window.location.hash), []);
  const [item, setItem] = useState<ReportLibraryItem | null>(null);
  const [shared, setShared] = useState<SharedReportPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    if (shareKey) {
      void loadSharedReport(shareKey).then((payload) => {
        if (cancelled) return;
        setShared(payload);
        setStatus("ready");
      }).catch(() => {
        if (!cancelled) setStatus("error");
      });
      return () => { cancelled = true; };
    }

    void resolveReportLibraryItemByVanitySlug(slug).then(async (resolved) => {
      if (cancelled) return;
      if (!resolved) {
        setStatus("error");
        return;
      }
      setItem(resolved);
      setStatus("ready");
      if (resolved.status === "ready") {
        try {
          await markReportSeen(resolved);
        } catch {
          // Reading access is independent of notification state.
        }
      }
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });
    return () => { cancelled = true; };
  }, [shareKey, slug]);

  if (status === "loading") return <DeliveryState message="Loading report…" />;
  if (status === "error") return <DeliveryState message="This report is unavailable." />;
  if (shared) return <SharedReportView payload={shared} />;
  if (!item) return <DeliveryState message="This report is unavailable." />;
  if (item.sourceKind === "generated_interpretation") {
    return <GeneratedReportDeliveryView reportId={item.sourceId} />;
  }
  return <ReportDeliveryView reportId={item.sourceId} />;
}

export function legacyPremiumReportId(segment: string) {
  return isReportUuidSegment(segment) ? segment : "";
}
