import { lazy, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ReportCheckoutResultView, ReportDeliveryView } from "../components/reports/ReportDeliveryView";
import type { ReportTheme } from "../components/reports/ReportTopNavigation";
import "../styles/report-article.css";
import "../styles/report-library.css";

const ReportTopNavigation = lazy(() =>
  import("../components/reports/ReportTopNavigation").then((module) => ({ default: module.ReportTopNavigation }))
);

const ReportLibraryView = lazy(() =>
  import("../components/reports/ReportLibraryView").then((module) => ({ default: module.ReportLibraryView }))
);

const GeneratedReportDeliveryView = lazy(() =>
  import("../components/reports/ReportLibraryView").then((module) => ({ default: module.GeneratedReportDeliveryView }))
);

function LibraryFallback() {
  return <main className="report-delivery-state" role="status" />;
}

function storedReportTheme(): ReportTheme {
  return window.localStorage.getItem("tldrastro:theme") === "dark" ? "dark" : "light";
}

function ReportThemeBoundary({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ReportTheme>(storedReportTheme);

  useEffect(() => {
    const previousTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = theme;
    return () => {
      if (previousTheme) document.documentElement.dataset.theme = previousTheme;
      else delete document.documentElement.dataset.theme;
    };
  }, [theme]);

  return (
    <div className={`app-shell mode-detail report-route-root theme-${theme}`}>
      <Suspense fallback={null}>
        <ReportTopNavigation theme={theme} onThemeChange={setTheme} />
      </Suspense>
      {children}
    </div>
  );
}

export function ReportRoute() {
  const path = window.location.pathname.replace(/\/+$/u, "") || "/";
  let content: ReactNode;

  if (path === "/reports/checkout/success") content = <ReportCheckoutResultView result="success" />;
  else if (path === "/reports/checkout/cancel") content = <ReportCheckoutResultView result="cancel" />;
  else if (path === "/reports") content = <Suspense fallback={<LibraryFallback />}><ReportLibraryView /></Suspense>;
  else if (/^\/reports\/generated\/[^/]+$/u.test(path)) {
    content = <Suspense fallback={<LibraryFallback />}><GeneratedReportDeliveryView /></Suspense>;
  } else content = <ReportDeliveryView />;

  return <ReportThemeBoundary>{content}</ReportThemeBoundary>;
}
