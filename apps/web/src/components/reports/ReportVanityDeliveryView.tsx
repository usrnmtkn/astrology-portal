import { useEffect, useMemo, useState } from "react";
import { ReportStateCard } from "./ReportStateCard";
import { ReaderUnavailable } from "../ReaderUnavailable";
import { PageLoadState } from "../PageLoading";
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
  const loading = message === "Loading report…" || message === "Opening report…";
  return <ReportStateCard title={loading ? "Preparing your report" : message} loading={loading} action={loading ? undefined : {label:"Back to Reports",href:"/reports/"}}/>;
}

export function LegacyGeneratedReportRedirect({ reportId }: { reportId: string }) {
  const [failed, setFailed] = useState(false);
  const [missing, setMissing] = useState(false);
  const [pending, setPending] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<unknown>();

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    void loadGeneratedReportById(reportId).then((report) => {
      if (cancelled) return;
      if (!report) {
        setMissing(true); setPending(false);
        return;
      }
      window.location.replace(generatedReportVanityPath(report));
    }).catch(error => {
      if (!cancelled) { setFailure(error); setFailed(true); setPending(false); }
    });
    return () => { cancelled = true; };
  }, [reportId, attempt]);

  if (missing) return <ReaderUnavailable kind="report"/>;
  return <PageLoadState scope="page" what="This report" cause={failure} failed={failed} pending={pending} onRetry={() => setAttempt(value => value + 1)}><DeliveryState message="Opening report…"/></PageLoadState>;
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
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing">("loading");
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<unknown>();

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    if (shareKey) {
      void loadSharedReport(shareKey).then((payload) => {
        if (cancelled) return;
        setShared(payload);
        setStatus("ready");
      }).catch(error => {
        if (!cancelled) { setFailure(error); setStatus("error"); }
      });
      return () => { cancelled = true; };
    }

    let timer: ReturnType<typeof setTimeout>;
    let hasLoaded = false;
    setItem(null);
    setStatus("loading");
    async function refresh() {
      try {
        const resolved = await resolveReportLibraryItemByVanitySlug(slug);
        if (cancelled) return;
        if (!resolved) { setStatus("missing"); return; }
        hasLoaded = true;
        setItem(resolved);
        setStatus("ready");
        if (resolved.status === "ready") {
          await markReportSeen(resolved).catch(() => undefined);
        } else if (resolved.status === "generating") {
          timer = setTimeout(refresh, 10_000);
        }
      } catch (error) {
        if (!cancelled) {
          setFailure(error);
          if (!hasLoaded) setStatus("error");
          timer = setTimeout(refresh, 10_000);
        }
      }
    }
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [shareKey, slug, attempt]);

  if (status === "loading" || status === "error") return <PageLoadState scope="page" what="This report" cause={failure} failed={status === "error"} pending={status === "loading"} onRetry={() => setAttempt(value => value + 1)}><DeliveryState message="Loading report…" /></PageLoadState>;
  if (status === "missing") return <ReaderUnavailable kind="report"/>;
  if (shared) return <SharedReportView payload={shared} />;
  if (!item) return <DeliveryState message="This report is unavailable." />;
  if (item.sourceKind === "premium_report") return <ReportDeliveryView reportId={item.sourceId}/>;
  if (item.status === "generating") {
    return <ReportStateCard title="Preparing your report" loading message={item.progressLabel ?? "Preparing"}/>;
  }
  if (item.status === "needs_attention") {
    return <ReportStateCard title={item.progressLabel ?? "Could not finish"} tone={item.progressLabel === "Needs review" ? "warning" : "error"}
      message={item.statusMessage ?? "This report could not be prepared."} action={{label:"Back to Reports",href:"/reports/"}}/>;
  }
  if (item.sourceKind === "generated_interpretation") {
    return <GeneratedReportDeliveryView reportId={item.sourceId} />;
  }
  return <ReportDeliveryView reportId={item.sourceId} />;
}

export function legacyPremiumReportId(segment: string) {
  return isReportUuidSegment(segment) ? segment : "";
}
