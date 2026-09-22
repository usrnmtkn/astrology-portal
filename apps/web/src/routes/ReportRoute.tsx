import { lazy, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { observeVerifiedAccount, type VerifiedAccountState } from "../services/verifiedAccountObserver";
import { reportShareKeyFromHash } from "../services/reportLinks";
import { PageLoading } from "../components/PageLoading";
import type { ReportTheme } from "../components/reports/ReportTopNavigation";
import "../styles/report-article.css";
import "../styles/report-library.css";

const ReportTopNavigation = lazy(() =>
  import("../components/reports/ReportTopNavigation").then((module) => ({ default: module.ReportTopNavigation }))
);

const ReportLibraryView = lazy(() =>
  import("../components/reports/ReportLibraryView").then((module) => ({ default: module.ReportLibraryView }))
);

const ReportVanityDeliveryView = lazy(() =>
  import("../components/reports/ReportVanityDeliveryView").then((module) => ({ default: module.ReportVanityDeliveryView }))
);

const LegacyGeneratedReportRedirect = lazy(() =>
  import("../components/reports/ReportVanityDeliveryView").then((module) => ({ default: module.LegacyGeneratedReportRedirect }))
);

const ReportDeliveryView = lazy(() =>
  import("../components/reports/ReportDeliveryView").then((module) => ({ default: module.ReportDeliveryView }))
);

const ReportCheckoutResultView = lazy(() =>
  import("../components/reports/ReportDeliveryView").then((module) => ({ default: module.ReportCheckoutResultView }))
);

function LibraryFallback() {
  return <PageLoading message="Loading report…" />;
}

function deferred(node: ReactNode) {
  return <Suspense fallback={<LibraryFallback />}>{node}</Suspense>;
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function PrivateReportBoundary({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<VerifiedAccountState>({ id: null, checked: false, error: false });
  const [retry, setRetry] = useState(0);
  useEffect(() => observeVerifiedAccount(setAccount), [retry]);
  if (!account.checked) return <LibraryFallback />;
  const accessFallback = <div className="report-library-loading type-body-muted" role="status">
    <p>{account.error ? "Your account could not be checked." : "Sign in to view your reports."}</p>
    {account.error ? <button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button>
      : <a href={`/?auth=login&readerReturn=${encodeURIComponent(window.location.pathname)}`}>Sign in</a>}
  </div>;
  if (!account.id) return /^\/reports\/?$/u.test(window.location.pathname)
    ? deferred(<ReportLibraryView accessFallback={accessFallback} />)
    : <main className="report-delivery-state">{accessFallback}</main>;
  return <div key={account.id}>{children}</div>;
}

export function ReportRoute() {
  const path = window.location.pathname.replace(/\/+$/u, "") || "/";
  let content: ReactNode;

  if (path === "/reports/checkout/success") content = deferred(<ReportCheckoutResultView result="success" />);
  else if (path === "/reports/checkout/cancel") content = deferred(<ReportCheckoutResultView result="cancel" />);
  else if (path === "/reports") content = deferred(<ReportLibraryView />);
  else {
    const legacyGeneratedId = path.match(/^\/reports\/generated\/([^/]+)$/u)?.[1] ?? "";
    const singleSegment = path.match(/^\/reports\/([^/]+)$/u)?.[1] ?? "";
    if (legacyGeneratedId && isUuid(legacyGeneratedId)) {
      content = deferred(<LegacyGeneratedReportRedirect reportId={legacyGeneratedId} />);
    } else if (singleSegment && isUuid(singleSegment)) {
      content = deferred(<ReportDeliveryView reportId={singleSegment} />);
    } else if (singleSegment) {
      content = deferred(<ReportVanityDeliveryView slug={singleSegment} />);
    } else {
      content = <LibraryFallback />;
    }
  }

  const publicShare = /^\/reports\/[^/]+$/u.test(path) && !isUuid(path.split("/").at(-1) ?? "") && reportShareKeyFromHash(window.location.hash);
  return <ReportThemeBoundary>{publicShare
    ? content : <PrivateReportBoundary>{content}</PrivateReportBoundary>}</ReportThemeBoundary>;
}
