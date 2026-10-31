// This independent, small entry runs while the reader/admin bundles download.
const root = document.getElementById("root");
const startup = document.getElementById("app-startup");
const readerRecoveryHistoryKey = "__tldrastroReaderPageRecovery";
const readerRecoveryCooldownMs = 2 * 60 * 1000;
const recoverableReaderHash = /^#\/?(?:you|sky|calendar|friends)(?:[/?]|$)/u;
const failedPageAssets = new Set();
const rememberPageAsset = (href) => {
  const url = new URL(href, location.href);
  if (url.origin === location.origin && /^\/assets\/[^/]+\.js$/u.test(url.pathname)) failedPageAssets.add(url.href);
};
// WebKit can retain a failed module preload across document navigation.
// Refresh selected same-origin JS before an explicit recovery.
window.__tldrastroRecoverPageAssets = () => failedPageAssets.size
  ? Promise.allSettled([...failedPageAssets].map(async (href) => {
    const response = await fetch(href, { cache: "reload", signal: AbortSignal.timeout(5000) });
    await response.arrayBuffer();
  })).then(() => {}) : undefined;
try {
  document.documentElement.dataset.theme = localStorage.getItem("tldrastro:theme") === "dark" ? "dark" : "light";
} catch { /* The loading screen also works when storage is unavailable. */ }

// Resolve the saved app choice before any bundle arrives. Keep one effective
// loader preference for CSS, Lottie, the mounted reader and standalone Studio.
const motionRoot = document.documentElement;
const systemMotion = matchMedia("(prefers-reduced-motion: reduce)");
try {
  const saved = localStorage.getItem("tldrastro:pageAnimations");
  motionRoot.dataset.pageMotion = saved === "off" || saved === "system" ? saved : "on";
} catch { motionRoot.dataset.pageMotion = "on"; }
const syncLoaderMotion = () => {
  const choice = motionRoot.dataset.pageMotion;
  motionRoot.toggleAttribute("data-reduce-motion", choice === "off" || (choice === "system" && systemMotion.matches));
};
syncLoaderMotion();
systemMotion.addEventListener("change", syncLoaderMotion);
// The settings hook updates pageMotion even when storage is unavailable.
new MutationObserver(syncLoaderMotion).observe(motionRoot, { attributes: true, attributeFilter: ["data-page-motion"] });

const readerPathname = (pathname) => pathname.replace(/\/+$/u, "") || "/";
const readerRecoveryRoute = () => {
  const query = new URLSearchParams(location.search);
  if (["auth", "code", "readerReturn", "returnTo"].some(key => query.has(key))) return false;
  const path = readerPathname(location.pathname);
  if (path === "/learn" || path.startsWith("/learn/") || path === "/friends") return true;
  if (path !== "/") return false;
  return location.hash === "" || recoverableReaderHash.test(location.hash);
};
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
// Share the same route and history guard with mounted recovery. This shell
// stays available when a module download fails; other pages remain manual.
window.__tldrastroReloadReaderOnce = reloadReaderRouteOnce;

const showStartupMessage = (failed = false) => {
  if (!startup?.isConnected) return;
  if (failed) clearTimeout(timeout);
  startup.setAttribute("role", failed ? "alert" : "status");
  startup.setAttribute("aria-busy", String(!failed));
  const message = startup.querySelector("[data-startup-message]");
  if (message) message.textContent = failed
    ? "The page could not load. Check your connection and try again."
    : "Still loading. You can wait or try reloading the page.";
  const action = startup.querySelector("button");
  if (action) action.hidden = false;
};
startup?.querySelector("button")?.addEventListener("click", async (event) => {
  event.currentTarget.disabled = true;
  // Head preloads can fail before this independent recovery script starts.
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) rememberPageAsset(link.href);
  await window.__tldrastroRecoverPageAssets();
  location.reload();
});
const timeout = window.setTimeout(() => showStartupMessage(), 12000);
const observer = new MutationObserver(() => {
  if (!startup?.isConnected) { clearTimeout(timeout); observer.disconnect(); }
});
if (root) observer.observe(root, { childList: true });
window.addEventListener("tldrastro:startup-error", () => showStartupMessage(true));
window.addEventListener("unhandledrejection", () => showStartupMessage(true));
window.addEventListener("error", (event) => {
  const script = event.target instanceof HTMLScriptElement ? event.target : null;
  // Optional artwork must never trigger reader recovery or hide a healthy app.
  if (script?.hasAttribute("data-startup-decoration")) return;
  const href = script?.src || (event.target instanceof HTMLLinkElement && event.target.rel === "modulepreload" ? event.target.href : "");
  if (href) rememberPageAsset(href);
  if (!startup?.isConnected) return;
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
