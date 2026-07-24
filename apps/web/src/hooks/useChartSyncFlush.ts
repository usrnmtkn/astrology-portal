import { getAuthAccount, onAuthAccountChange } from "../services/auth";
import { flushManualChartSync } from "../services/manualCharts";

let activeUserId: string | null = null;
let activeFlush: Promise<void> | null = null;
let queuedUserId: string | null = null;

function requestFlush(userId: string) {
  if (activeFlush) {
    queuedUserId = userId;
    return;
  }

  activeFlush = flushManualChartSync(userId)
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      const nextUserId = queuedUserId;

      activeFlush = null;
      queuedUserId = null;

      if (nextUserId) {
        requestFlush(nextUserId);
      }
    });
}

function requestActiveUserFlush() {
  if (activeUserId) {
    requestFlush(activeUserId);
    return;
  }

  void getAuthAccount()
    .then((account) => {
      activeUserId = account?.id ?? null;

      if (activeUserId) {
        requestFlush(activeUserId);
      }
    })
    .catch(() => undefined);
}

function installChartSyncFlushListeners() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  const handleFocus = () => requestActiveUserFlush();
  const handleOnline = () => requestActiveUserFlush();
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      requestActiveUserFlush();
    }
  };
  const unsubscribeAuth = onAuthAccountChange((account) => {
    activeUserId = account?.id ?? null;

    if (activeUserId) {
      requestFlush(activeUserId);
    } else {
      queuedUserId = null;
    }
  });

  window.addEventListener("focus", handleFocus);
  window.addEventListener("online", handleOnline);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  requestActiveUserFlush();

  return () => {
    unsubscribeAuth();
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("online", handleOnline);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

const removeChartSyncFlushListeners = installChartSyncFlushListeners();

if (import.meta.hot) {
  import.meta.hot.dispose(removeChartSyncFlushListeners);
}
