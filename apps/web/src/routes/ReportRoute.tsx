import { ReportCheckoutResultView, ReportDeliveryView } from "../components/reports/ReportDeliveryView";
import "../styles/report-article.css";

export function ReportRoute() {
  if (window.location.pathname === "/reports/checkout/success") return <ReportCheckoutResultView result="success" />;
  if (window.location.pathname === "/reports/checkout/cancel") return <ReportCheckoutResultView result="cancel" />;
  return <ReportDeliveryView />;
}
