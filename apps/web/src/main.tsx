import React from "react";
import { createRoot } from "react-dom/client";

const localAdminOrigin = "http://127.0.0.1:5174";

function isAdminContentPath() {
  return (
    window.location.pathname === "/admin/content" ||
    window.location.pathname === "/admin/generated-content" ||
    window.location.pathname === "/content/admin"
  );
}

function redirectLocalAdminPath() {
  if (!isAdminContentPath()) {
    return false;
  }

  if (window.location.hostname !== "127.0.0.1" && window.location.hostname !== "localhost") {
    return false;
  }

  if (window.location.port !== "5173") {
    return false;
  }

  const adminPath = window.location.pathname === "/admin/generated-content" ? "/admin/generated-content" : "/admin/content";
  window.location.replace(`${localAdminOrigin}${adminPath}${window.location.search}${window.location.hash}`);
  return true;
}

async function startApp() {
  if (redirectLocalAdminPath()) {
    return;
  }

  if (!isAdminContentPath()) {
    await import("./styles.css");
    await Promise.all([
      import("./styles/responsive.css"),
      import("./styles/card-systems.css")
    ]);
  }

  const { App } = await import("./App");

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void startApp();
