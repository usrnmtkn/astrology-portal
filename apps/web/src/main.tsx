import React from "react";
import { createRoot } from "react-dom/client";
import { PageLoading, PageLoadBoundary } from "./components/PageLoading";
import { shouldPreloadInitialFriendCalculationRuntime } from "./features/friends/friendCalculationReadiness";
import { preloadFriendsExperience } from "./features/friends/friendsExperienceLoader";
import {
  initialFriendProfileContentRequest,
  isFriendsHref,
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

function isMemoryGraphPath() {
  return window.location.pathname.replace(/\/$/u, "") === "/admin/content/memory";
}

function isAdminContentPath() {
  return (
    window.location.pathname === "/admin/content" ||
    window.location.pathname === "/admin/generated-content" ||
    window.location.pathname === "/content/admin" ||
    isContentCoveragePath() || isMemoryGraphPath()
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

  const adminPath = isMemoryGraphPath() ? "/admin/content/memory" : isContentCoveragePath()
    ? "/admin/content/coverage"
    : window.location.pathname === "/admin/generated-content"
      ? "/admin/generated-content"
      : "/admin/content";
  window.location.replace(`${localAdminOrigin}${adminPath}${window.location.search}${window.location.hash}`);
  return true;
}

async function loadAdminPresentationStyles() {
  await import("../../admin/src/studio-system.css");
}

async function startApp() {
  if (redirectLocalAdminPath()) {
    return;
  }

  if (isAdminContentPath()) {
    await loadAdminPresentationStyles();
    const { AdminPageError, AdminPageLoading } = await import("../../admin/src/AdminPageError");
    const dashboard = isMemoryGraphPath()
      ? React.lazy(() => import("../../admin/src/MemoryGraphDashboard"))
      : isContentCoveragePath()
      ? React.lazy(() => import("../../admin/src/ContentCoverageDashboard"))
      : React.lazy(() => import("../../admin/src/GeneratedContentAdminDashboard").then(module => ({ default: module.GeneratedContentAdminDashboard })));
    const Dashboard = dashboard;
    createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <PageLoadBoundary recoveryHref="/admin/content#review-queue" renderFallback={(detail, onRetry) => <AdminPageError detail={detail} onRetry={onRetry} recoveryHref="/admin/content#review-queue" />}><React.Suspense fallback={<AdminPageLoading label="Loading Content Studio…" />}>
          <Dashboard />
        </React.Suspense></PageLoadBoundary>
      </React.StrictMode>
    );
    await setupAdminReaderLinks();
    return;
  }

  const appModulePromise = import("./App");
  const friendRoutePromise = prepareFriendProfileRoute(window.location.href);
  void friendRoutePromise.then(() => {
    if (!isFriendsHref(window.location.href)) return;
    return preloadFriendsExperience();
  }).catch(() => { /* The mounted route owns import errors and recovery. */ });
  const readerStylesPromise = import("./styles.css");
  // These routes all need astronomy. Fetch/initialize it alongside the app
  // download rather than starting the worker waterfall after React mounts.
  if (/^#\/?(?:sky|calendar)(?:[/?]|$)/u.test(window.location.hash)) {
    void import("./services/skyCalculationClient").then(({ preloadSwissEphemerisOffMainThread }) => (
      preloadSwissEphemerisOffMainThread()
    )).catch(() => { /* The active route owns its error and retry state. */ });
  }
  await friendRoutePromise;
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
    await readerStylesPromise;
  }

  const { App } = await appModulePromise;
  if (!isAdminContentPath()) {
    const { refreshContentPublications } = await import("./services/contentPublications");
    // Publication state restores its verified cache synchronously. Revalidate
    // in the background: an unavailable content service must not block the
    // entire reader or delay starting the live ephemeris calculation.
    // Content loaders still await this shared request before selecting rows;
    // installed revisions notify mounted readers through contentUpdateSignal.
    void refreshContentPublications();
  }
  const reportPath = isReportPath();

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <PageLoadBoundary><React.Suspense fallback={<PageLoading />}><App /></React.Suspense></PageLoadBoundary>
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

    // Loading and recoverable errors are rendered pages, not a blank restore.
    // Never auto-reload them or clear state while their requests are pending.
    if (root?.querySelector(".app-loading")) return false;

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

void startApp().catch(() => window.dispatchEvent(new Event("tldrastro:startup-error")));
