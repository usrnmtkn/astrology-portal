// This independent, small entry runs while the reader/admin bundles download.
const root = document.getElementById("root");
const startup = document.getElementById("app-startup");
const readerRecoveryHistoryKey = "__tldrastroReaderPageRecovery";
const readerRecoveryCooldownMs = 2 * 60 * 1000;
const recoverableReaderHash = /^#\/?(?:you|sky|calendar|friends)(?:[/?]|$)/u;
try {
  document.documentElement.dataset.theme = localStorage.getItem("tldrastro:theme") === "dark" ? "dark" : "light";
} catch { /* The loading screen also works when storage is unavailable. */ }

const readerRecoveryRoute = () => location.pathname === "/" && (
  location.hash === "" || recoverableReaderHash.test(location.hash)
);

const reloadReaderRouteOnce = () => {
  if (!readerRecoveryRoute()) return false;
  const route = `${location.pathname}${location.hash}`;
  const now = Date.now();
  try {
    const historyState = history.state && typeof history.state === "object" ? history.state : {};
    const previous = historyState[readerRecoveryHistoryKey];
    if (previous?.route === route && typeof previous.at === "number" && now - previous.at < readerRecoveryCooldownMs) {
      return false;
    }
    history.replaceState({ ...historyState, [readerRecoveryHistoryKey]: { route, at: now } }, "", location.href);
  } catch {
    // Without a reliable loop guard, keep recovery manual.
    return false;
  }
  location.reload();
  return true;
};

const showStartupMessage = (failed = false) => {
  if (!startup?.isConnected) return;
  startup.setAttribute("role", failed ? "alert" : "status");
  startup.setAttribute("aria-busy", String(!failed));
  const message = startup.querySelector("[data-startup-message]");
  if (message) message.textContent = failed
    ? "The page could not load. Check your connection and try again."
    : "Still loading. You can wait or try reloading the page.";
  const action = startup.querySelector("button");
  if (action) action.hidden = false;
};
startup?.querySelector("button")?.addEventListener("click", () => location.reload());
const timeout = window.setTimeout(() => showStartupMessage(), 12000);
const observer = new MutationObserver(() => {
  if (!startup?.isConnected) { clearTimeout(timeout); observer.disconnect(); }
});
if (root) observer.observe(root, { childList: true });
window.addEventListener("tldrastro:startup-error", () => showStartupMessage(true));
window.addEventListener("unhandledrejection", () => showStartupMessage(true));
window.addEventListener("error", (event) => {
  if (!startup?.isConnected) return;
  const script = event.target instanceof HTMLScriptElement ? event.target : null;
  if (script?.src.includes("/assets/") && reloadReaderRouteOnce()) return;
  if (script || event instanceof ErrorEvent) showStartupMessage(true);
}, true);
window.addEventListener("vite:preloadError", (event) => {
  if (!startup?.isConnected) return;
  // Reader surfaces can safely reload once to pick up the current deployment.
  // Admin/report paths remain manual so unsaved authoring work is never lost.
  if (reloadReaderRouteOnce()) { event.preventDefault(); return; }
  // Let the import reject normally; preventDefault would resolve it undefined.
  showStartupMessage(true);
});
