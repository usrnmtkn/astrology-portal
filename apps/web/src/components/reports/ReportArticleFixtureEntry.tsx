import React from "react";
import { createRoot } from "react-dom/client";
import "../../styles.css";
import "../../styles/report-article.css";
import { ReportArticleFixtureHarness } from "./ReportArticleFixtureHarness";

const root = document.getElementById("root");

if (root && import.meta.env.DEV) {
  createRoot(root).render(
    <React.StrictMode>
      <ReportArticleFixtureHarness />
    </React.StrictMode>
  );
}
