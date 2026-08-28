import React from "react";
import { createRoot } from "react-dom/client";
import "../../web/src/styles/theme.css";
import "../../web/src/styles/pill.css";
import { GeneratedContentAdminDashboard } from "./GeneratedContentAdminDashboard";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GeneratedContentAdminDashboard />
  </React.StrictMode>
);
