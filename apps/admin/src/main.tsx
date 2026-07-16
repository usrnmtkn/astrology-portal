import React from "react";
import { createRoot } from "react-dom/client";
import { GeneratedContentAdminDashboard } from "../../web/src/admin/GeneratedContentAdminDashboard";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GeneratedContentAdminDashboard />
  </React.StrictMode>
);
