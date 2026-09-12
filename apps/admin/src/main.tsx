import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./studio-system.css";
import { GeneratedContentAdminDashboard } from "./GeneratedContentAdminDashboard";
import { setupAdminReaderLinkTargets } from "./adminReaderLinks";
import { PageLoadBoundary } from "../../web/src/components/PageLoading";
import { AdminPageError, AdminPageLoading } from "./AdminPageError";

const ContentCoverageDashboard = lazy(() => import("./ContentCoverageDashboard"));
const MemoryGraphDashboard = lazy(() => import("./MemoryGraphDashboard"));

const isCoverageRoute = window.location.pathname.replace(/\/$/u, "") === "/admin/content/coverage";
const isMemoryRoute = window.location.pathname.replace(/\/$/u, "") === "/admin/content/memory";
const root = document.getElementById("root")!;
const recoveryHref = isCoverageRoute || isMemoryRoute ? "/admin/content#review-queue" : "#review-queue";

createRoot(root).render(
  <React.StrictMode>
    <PageLoadBoundary recoveryHref={recoveryHref} recoveryLabel="Open Review Queue"
      renderFallback={(detail, retry) => <AdminPageError detail={detail} onRetry={retry} recoveryHref={recoveryHref} />}>
    {isMemoryRoute ? (
      <Suspense fallback={<AdminPageLoading label="Loading memory graph…" />}><MemoryGraphDashboard /></Suspense>
    ) : isCoverageRoute ? (
      <Suspense fallback={<AdminPageLoading label="Loading content coverage…" />}>
        <ContentCoverageDashboard />
      </Suspense>
    ) : (
      <GeneratedContentAdminDashboard />
    )}
    </PageLoadBoundary>
  </React.StrictMode>
);

setupAdminReaderLinkTargets(root);
