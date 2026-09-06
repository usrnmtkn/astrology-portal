import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "../../web/src/styles/theme.css";
import "../../web/src/styles/pill.css";
import { GeneratedContentAdminDashboard } from "./GeneratedContentAdminDashboard";
import { setupAdminReaderLinkTargets } from "./adminReaderLinks";
import "./admin-row-selection.css";
import "./admin-form-density.css";
import "./admin-diagnostic-overlap.css";

const ContentCoverageDashboard = lazy(() => import("./ContentCoverageDashboard"));

const isCoverageRoute = window.location.pathname.replace(/\/$/u, "") === "/admin/content/coverage";
const root = document.getElementById("root")!;

createRoot(root).render(
  <React.StrictMode>
    {isCoverageRoute ? (
      <Suspense fallback={<div style={{ padding: 24 }}>Loading content coverage…</div>}>
        <ContentCoverageDashboard />
      </Suspense>
    ) : (
      <GeneratedContentAdminDashboard />
    )}
  </React.StrictMode>
);

setupAdminReaderLinkTargets(root);
