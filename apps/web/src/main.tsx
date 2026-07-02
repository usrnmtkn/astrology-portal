import React from "react";
import { createRoot } from "react-dom/client";

function isAdminContentPath() {
  return window.location.pathname === "/admin/content" || window.location.pathname === "/admin/generated-content";
}

async function startApp() {
  if (!isAdminContentPath()) {
    await import("./styles.css");
    await import("./styles/responsive.css");
    await import("./styles/card-systems.css");
  }

  const { App } = await import("./App");

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void startApp();
