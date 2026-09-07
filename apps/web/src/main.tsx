import React from "react";
import { createRoot } from "react-dom/client";
import { shouldPreloadInitialFriendCalculationRuntime } from "./features/friends/friendCalculationReadiness";
import {
  initialFriendProfileContentRequest,
  prepareFriendProfileRoute
} from "./features/friends/friendsRouting";

const ReportsGlobalLayer = React.lazy(() =>
  import("./features/reports/ReportsGlobalLayer").then((module) => ({ default: module.ReportsGlobalLayer }))
);

const localAdminOrigin = "http://127.0.0.1:5174";
const blankRestoreReloadKey = "tldrastro:blankRestoreReloadAt";
const blankRestoreResetKey = "tldrastro:blankRestoreResetAt";
const blankRestoreReloadCooldownMs = 10000;
const blankRestoreResetCooldownMs = 30000;
const localUiStateKeys = [
  "tldrastro:portalMode",
  "tldrastro:friendsTab",
  "tldrastro:pendingSignup",
  "tldrastro:generatedContentPreviewMode",
  "tldrastro:natalAspectPatterns",
  "tldrastro:natalAspectPatternActivation",
  "tldrastro:fallbackArchitectureV3:dashboardBundle",
  "tldrastro:fallbackArchitectureV3:dashboardBundleVersion"
];

function isContentCoveragePath() {
  return window.location.pathname.replace(/\/$/u, "") === "/admin/content/coverage";
}

function isAdminContentPath() {
  return (
    window.location.pathname === "/admin/content" ||
    window.location.pathname === "/admin/generated-content" ||
    window.location.pathname === "/content/admin" ||
    isContentCoveragePath()
  );
}

function isReportPath() {
  return /^\/reports(?:\/|$)/u.test(window.location.pathname);
}

async function setupAdminReaderLinks() {
  const { setupAdminReaderLinkTargets } = await import("../../admin/src/adminReaderLinks");
  setupAdminReaderLinkTargets();
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

  const adminPath = isContentCoveragePath()
    ? "/admin/content/coverage"
    : window.location.pathname === "/admin/generated-content"
      ? "/admin/generated-content"
      : "/admin/content";
  window.location.replace(`${localAdminOrigin}${adminPath}${window.location.search}${window.location.hash}`);
  return true;
}

async function loadAdminPresentationStyles() {
  await Promise.all([
    import("../../admin/src/admin-row-selection.css"),
    import("../../admin/src/admin-form-density.css"),
    import("../../admin/src/admin-content-studio-ux-compat.css")
  ]);
}

async function startApp() {
  if (redirectLocalAdminPath()) {
    return;
  }

  if (isContentCoveragePath()) {
    await loadAdminPresentationStyles();
    const { default: ContentCoverageDashboard } = await import("../../admin/src/ContentCoverageDashboard");
    createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <ContentCoverageDashboard />
      </React.StrictMode>
    );
    await setupAdminReaderLinks();
    return;
  }

  await prepareFriendProfileRoute(window.location.href);
  const appModulePromise = import("./App");
  const initialFriendProfileTab = initialFriendProfileContentRequest(window.location.href);

  if (shouldPreloadInitialFriendCalculationRuntime(initialFriendProfileTab)) {
    void import("./services/skyCalculationClient").then(({ preloadSwissEphemerisOffMainThread }) => (
      preloadSwissEphemerisOffMainThread()
    )).catch(() => {
      // The demand-driven calculation reports any runtime failure in the active view.
    });
  }

  if (isAdminContentPath()) {
    await loadAdminPresentationStyles();
  } else {
    await import("./styles.css");
  }

  const { App } = await appModulePromise;
  const reportPath = isReportPath();

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
      {!isAdminContentPath() && !reportPath ? (
        <React.Suspense fallback={null}>
          <ReportsGlobalLayer />
        </React.Suspense>
      ) : null}
    </React.StrictMode>
  );

  if (isAdminContentPath()) {
    await setupAdminReaderLinks();
  } else if (!reportPath) {
    setupBlankRestoreRecovery();
  }
}

function setupBlankRestoreRecovery() {
  if (isAdminContentPath() || isReportPath()) {
    return;
  }

  const shouldReload = () => {
    const root = document.getElementById("root");
    const appShell = root?.querySelector(".app-shell");

    if (!root || !root.firstElementChild || !appShell) {
      return true;
    }

    const shellStyle = window.getComputedStyle(appShell);
    const shellBounds = appShell.getBoundingClientRect();
    const shellText = appShell.textContent?.trim() ?? "";

    return (
      shellText.length === 0 ||
      shellBounds.width === 0 ||
      shellBounds.height === 0 ||
      shellStyle.display === "none" ||
      shellStyle.visibility === "hidden" ||
      shellStyle.opacity === "0"
    );
  };

  const clearTransientLocalState = () => {
    for (const key of localUiStateKeys) {
      window.localStorage.removeItem(key);
    }

    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);

      if (key?.startsWith("tldrastro:")) {
        window.sessionStorage.removeItem(key);
      }
    }
  };

  const reloadOnce = ({ resetState = false }: { resetState?: boolean } = {}) => {
    const now = Date.now();
    const previous = Number(window.sessionStorage.getItem(blankRestoreReloadKey) ?? "0");
    const previousReset = Number(window.sessionStorage.getItem(blankRestoreResetKey) ?? "0");

    if (Number.isFinite(previous) && now - previous < blankRestoreReloadCooldownMs) {
      if (resetState && Number.isFinite(previousReset) && now - previousReset >= blankRestoreResetCooldownMs) {
        clearTransientLocalState();
        window.sessionStorage.setItem(blankRestoreResetKey, String(now));
        window.location.replace(window.location.pathname || "/");
      }

      return;
    }

    if (resetState && Number.isFinite(previousReset) && now - previousReset >= blankRestoreResetCooldownMs) {
      clearTransientLocalState();
      window.sessionStorage.setItem(blankRestoreResetKey, String(now));
    }

    window.sessionStorage.setItem(blankRestoreReloadKey, String(now));
    window.location.reload();
  };

  const checkAfterRestore = (event: PageTransitionEvent) => {
    if (!event.persisted) {
      return;
    }

    checkSoon({ requireVisible: true });
  };

  const checkSoon = ({ requireVisible = false }: { requireVisible?: boolean } = {}) => {
    window.setTimeout(() => {
      if (requireVisible && document.visibilityState === "hidden") {
        return;
      }

      if (shouldReload()) {
        reloadOnce({ resetState: true });
      }
    }, 250);
  };

  window.addEventListener("pageshow", checkAfterRestore);
  window.addEventListener("focus", () => checkSoon());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkSoon({ requireVisible: true });
    }
  });
  // Focus, visibility, and bfcache restoration cover the known blank-restore
  // cases. A few bounded startup checks catch a failed initial mount without
  // keeping a layout-reading timer alive for the lifetime of the page.
  for (const delay of [1000, 5000, 15000]) {
    window.setTimeout(() => {
      if (document.visibilityState === "visible" && shouldReload()) {
        reloadOnce({ resetState: true });
      }
    }, delay);
  }
}

void startApp();
