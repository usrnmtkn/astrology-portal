import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "../../web/src/styles/theme.css";
import "../../web/src/styles/pill.css";
import { GeneratedContentAdminDashboard } from "./GeneratedContentAdminDashboard";
import { setupAdminReaderLinkTargets } from "./adminReaderLinks";

const ContentCoverageDashboard = lazy(() => import("./ContentCoverageDashboard"));
const AskTldrStudio = lazy(() => import("./AskTldrStudio"));

const normalizedPath = window.location.pathname.replace(/\/$/u, "");
const isCoverageRoute = normalizedPath === "/admin/content/coverage";
const isAskTldrRoute = normalizedPath === "/admin/content/ask-tldr";
const root = document.getElementById("root")!;

createRoot(root).render(
  <React.StrictMode>
    {isCoverageRoute ? (
      <Suspense fallback={<div style={{ padding: 24 }}>Loading content coverage…</div>}>
        <ContentCoverageDashboard />
      </Suspense>
    ) : isAskTldrRoute ? (
      <Suspense fallback={<div style={{ padding: 24 }}>Loading Ask TLDR…</div>}>
        <AskTldrStudio />
      </Suspense>
    ) : (
      <GeneratedContentAdminDashboard />
    )}
  </React.StrictMode>
);

setupAdminReaderLinkTargets(root);
