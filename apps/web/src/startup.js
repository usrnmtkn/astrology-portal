// This independent, small entry runs while the reader/admin bundles download.
const root = document.getElementById("root");
const startup = document.getElementById("app-startup");
try {
  document.documentElement.dataset.theme = localStorage.getItem("tldrastro:theme") === "dark" ? "dark" : "light";
} catch { /* The loading screen also works when storage is unavailable. */ }

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
  if (event.target instanceof HTMLScriptElement || event instanceof ErrorEvent) showStartupMessage(true);
}, true);
window.addEventListener("vite:preloadError", (event) => {
  // Do not reload automatically: a lazy chunk failure must not discard form edits.
  if (startup?.isConnected) { event.preventDefault(); showStartupMessage(true); }
});
