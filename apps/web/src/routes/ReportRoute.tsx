import { lazy, Suspense } from "react";
import { ReportCheckoutResultView, ReportDeliveryView } from "../components/reports/ReportDeliveryView";
import "../styles/report-article.css";

const ReportLibraryView = lazy(() =>
  import("../components/reports/ReportLibraryView").then((module) => ({ default: module.ReportLibraryView }))
);

const GeneratedReportDeliveryView = lazy(() =>
  import("../components/reports/ReportLibraryView").then((module) => ({ default: module.GeneratedReportDeliveryView }))
);

function LibraryFallback() {
  return <main className="report-delivery-state" role="status" />;
}

export function ReportRoute() {
  const path = window.location.pathname.replace(/\/+$/u, "") || "/";
  if (path === "/reports/checkout/success") return <ReportCheckoutResultView result="success" />;
  if (path === "/reports/checkout/cancel") return <ReportCheckoutResultView result="cancel" />;
  if (path === "/reports") return <Suspense fallback={<LibraryFallback />}><ReportLibraryView /></Suspense>;
  if (/^\/reports\/generated\/[^/]+$/u.test(path)) {
    return <Suspense fallback={<LibraryFallback />}><GeneratedReportDeliveryView /></Suspense>;
  }
  return <ReportDeliveryView />;
}
