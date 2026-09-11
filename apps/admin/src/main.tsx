import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "../../web/src/styles/pill.css";
import { GeneratedContentAdminDashboard } from "./GeneratedContentAdminDashboard";
import { setupAdminReaderLinkTargets } from "./adminReaderLinks";
import { PageLoadBoundary } from "../../web/src/components/PageLoading";

const ContentCoverageDashboard = lazy(() => import("./ContentCoverageDashboard"));
const MemoryGraphDashboard = lazy(() => import("./MemoryGraphDashboard"));

const isCoverageRoute = window.location.pathname.replace(/\/$/u, "") === "/admin/content/coverage";
const isMemoryRoute = window.location.pathname.replace(/\/$/u, "") === "/admin/content/memory";
const root = document.getElementById("root")!;

createRoot(root).render(
  <React.StrictMode>
    <PageLoadBoundary recoveryHref={isCoverageRoute || isMemoryRoute ? "/admin/content#review-queue" : "#review-queue"} recoveryLabel="Open Review Queue">
    {isMemoryRoute ? (
      <Suspense fallback={<div className="app-loading" role="status">Loading memory graph…</div>}><MemoryGraphDashboard /></Suspense>
    ) : isCoverageRoute ? (
      <Suspense fallback={<div className="app-loading" role="status" aria-busy="true">Loading content coverage…</div>}>
        <ContentCoverageDashboard />
      </Suspense>
    ) : (
      <GeneratedContentAdminDashboard />
    )}
    </PageLoadBoundary>
  </React.StrictMode>
);

setupAdminReaderLinkTargets(root);
