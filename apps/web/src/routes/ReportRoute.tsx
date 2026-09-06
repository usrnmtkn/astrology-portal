import { ReportCheckoutResultView, ReportDeliveryView } from "../components/reports/ReportDeliveryView";
import { GeneratedReportDeliveryView, ReportLibraryView } from "../components/reports/ReportLibraryView";
import "../styles/report-article.css";
import "../styles/report-library.css";

export function ReportRoute() {
  const path = window.location.pathname.replace(/\/+$/u, "") || "/";
  if (path === "/reports/checkout/success") return <ReportCheckoutResultView result="success" />;
  if (path === "/reports/checkout/cancel") return <ReportCheckoutResultView result="cancel" />;
  if (path === "/reports") return <ReportLibraryView />;
  if (/^\/reports\/generated\/[^/]+$/u.test(path)) return <GeneratedReportDeliveryView />;
  return <ReportDeliveryView />;
}
