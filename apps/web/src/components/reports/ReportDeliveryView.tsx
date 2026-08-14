import { useEffect, useMemo, useState } from "react";
import { loadReportDelivery, resumeReportEntitlement, type ReportDeliveryPayload } from "../../services/reportFulfillment";
import { ReportArticle, type ReportDocument } from "./ReportArticle";

function reportIdFromPath() {
  return window.location.pathname.match(/^\/reports\/([^/]+)$/u)?.[1] ?? "";
}

function documentFromDelivery(payload: NonNullable<ReportDeliveryPayload["report"]>): ReportDocument {
  const overview = payload.units.find((unit) => unit.content_key.endsWith(":overview")) ?? payload.units[0];
  const chapters = payload.units.filter((unit) => unit !== overview).flatMap((unit, index) => {
    const unitId = unit.content_key.split(":").at(-1) ?? String(index);
    const primary = { id: unitId, kicker: payload.reportDomain.replaceAll("_", " "), title: unit.headline ?? "", paragraphs: [unit.timing ?? "", unit.summary ?? "", unit.body ?? ""].filter(Boolean) };
    const sections = (unit.sections ?? []).map((section, sectionIndex) => ({ id: `${unitId}-${sectionIndex}`, kicker: payload.reportHorizon.replaceAll("_", " "), title: section.heading ?? "", paragraphs: [section.body ?? ""].filter(Boolean) }));
    return [primary, ...sections];
  });
  return {
    id: payload.id,
    reportType: "report",
    cover: { kicker: payload.reportDomain.replaceAll("_", " "), title: overview?.headline ?? "", subtitle: overview?.summary ?? "", meta: [payload.periodStart, payload.periodEnd] },
    chapters,
    colophon: { factsEngine: payload.factsEngine, generatedAt: payload.deliveredAt ?? undefined, entries: [{ label: "Facts hash", value: payload.factsHash }] }
  };
}

export function ReportDeliveryView() {
  const reportId = useMemo(reportIdFromPath, []);
  const [payload, setPayload] = useState<ReportDeliveryPayload | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
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
        if (!value.ready) timer = setTimeout(() => void refresh(), 10_000);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Report unavailable.");
      }
    }
    void refresh();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [reportId]);
  if (error) return <main className="report-delivery-state" data-report-error="unavailable" />;
  if (!payload?.ready || !payload.report) return <main className="report-delivery-state" role="status"><h1>Preparing your report</h1><p data-report-status={payload?.status ?? "loading"}>{payload?.status ?? "loading"}</p>{payload?.status === "awaiting_birth_data" && <a href="/#you">Add birth information</a>}</main>;
  return <ReportArticle report={documentFromDelivery(payload.report)} />;
}

export function ReportCheckoutResultView({ result }: { result: "success" | "cancel" }) {
  return result === "success"
    ? <main className="report-delivery-state" data-checkout-result={result}><h1>Preparing your report</h1></main>
    : <main className="report-delivery-state" data-checkout-result={result} />;
}
