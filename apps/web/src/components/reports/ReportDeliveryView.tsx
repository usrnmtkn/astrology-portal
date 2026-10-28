import { useEffect, useMemo, useState } from "react";
import { loadReportDelivery, resumeReportEntitlement, type ReportDeliveryPayload } from "../../services/reportFulfillment";
import { ReportArticle, type ReportDocument } from "./ReportArticle";
import { ReportStateCard, reportProgressLabel } from "./ReportStateCard";
import { ReaderUnavailable } from "../ReaderUnavailable";
import { PageLoadState } from "../PageLoading";

function reportIdFromPath() {
  return window.location.pathname.match(/^\/reports\/([^/]+)$/u)?.[1] ?? "";
}

export function documentFromDelivery(payload: NonNullable<ReportDeliveryPayload["report"]>): ReportDocument {
  const overview = payload.units.find((unit) => unit.content_key.endsWith(":overview")) ?? payload.units[0];
  const chapterUnits = overview ? [overview, ...payload.units.filter(unit => unit !== overview)] : [];
  const chapters = chapterUnits.flatMap((unit, index) => {
    const unitId = unit.content_key.split(":").at(-1) ?? String(index);
    const primary = { id: unitId, kicker: payload.reportDomain.replaceAll("_", " "), title: unit === overview ? "" : unit.headline ?? "", paragraphs: [unit.timing ?? "", unit === overview ? "" : unit.summary ?? "", unit.body ?? ""].filter(Boolean) };
    const sections = (unit.sections ?? []).map((section, sectionIndex) => ({ id: `${unitId}-${sectionIndex}`, kicker: payload.reportHorizon.replaceAll("_", " "), title: section.heading ?? "", paragraphs: [section.body ?? ""].filter(Boolean) }));
    return [primary, ...sections].filter(chapter => chapter.title || chapter.paragraphs.length);
  });
  return {
    id: payload.id,
    reportType: "report",
    cover: { kicker: payload.reportDomain.replaceAll("_", " "), title: overview?.headline ?? "", subtitle: overview?.summary ?? "", meta: [payload.periodStart, payload.periodEnd] },
    chapters,
    colophon: { factsEngine: payload.factsEngine, generatedAt: payload.deliveredAt ?? undefined, entries: [{ label: "Facts hash", value: payload.factsHash }] }
  };
}

export function ReportDeliveryView({ reportId: reportIdProp }: { reportId?: string } = {}) {
  const pathReportId = useMemo(reportIdFromPath, []);
  const reportId = reportIdProp ?? pathReportId;
  const [payload, setPayload] = useState<ReportDeliveryPayload | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError("");
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function refresh() {
      try {
        let value = await loadReportDelivery(reportId);
        if (value.status === "awaiting_birth_data" && value.entitlementId) {
          await resumeReportEntitlement(value.entitlementId);
          value = await loadReportDelivery(reportId);
        }
        if (cancelled) return;
        setPayload(value);
        if (!value.ready && !["needs_review", "exception", "revoked", "refunded"].includes(value.status ?? "")) timer = setTimeout(() => void refresh(), 10_000);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Report unavailable.");
      }
    }
    if (reportId) void refresh();
    else setError("Report unavailable.");
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [reportId, attempt]);
  if (!reportId || error === "Report not found.") return <ReaderUnavailable kind="report"/>;
  if (error === "Sign in to access reports.") return <ReportStateCard message="Sign in to view your reports." action={{label:"Sign in",href:"/?auth=login"}}/>;
  if (error || !payload) return <PageLoadState scope="page" what="This report" cause={error} failed={Boolean(error)} pending={!error && !payload} onRetry={() => setAttempt(value => value + 1)}>
    <ReportStateCard title="Preparing your report" loading/>
  </PageLoadState>;
  if (payload?.status === "needs_review") return <ReportStateCard title="Needs review" tone="warning" message="This report needs review before it can finish. Automatic rewriting has stopped." action={{label:"Back to Reports",href:"/reports/"}}/>;
  if (payload?.status === "exception") return <ReportStateCard title="Could not finish" tone="error" message="This report could not finish generating. Your saved reports are unchanged." action={{label:"Back to Reports",href:"/reports/"}}/>;
  if (!payload?.ready || !payload.report) return <ReportStateCard title="Preparing your report" loading
    message={payload?.status === "awaiting_birth_data" ? undefined : reportProgressLabel(payload?.status)}
    action={payload?.status === "awaiting_birth_data" ? {label:"Add birth information",href:"/#you"} : undefined}/>;
  return <ReportArticle report={documentFromDelivery(payload.report)} />;
}

export function ReportCheckoutResultView({ result }: { result: "success" | "cancel" }) {
  return result === "success"
    ? <ReportStateCard title="Preparing your report" loading/>
    : <main className="report-delivery-state" data-checkout-result={result} />;
}
