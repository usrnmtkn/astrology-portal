import { Component, type ErrorInfo, type ReactNode } from "react";
import { LoadingIllustration } from "./LoadingIllustration";
import "../styles/loading.css";

const readerRecoveryHistoryKey = "__tldrastroReaderPageRecovery";
const readerRecoveryCooldownMs = 2 * 60 * 1000;
const recoverableReaderHash = /^#\/?(?:you|sky|calendar|friends)(?:[/?]|$)/u;

function readerRecoveryRoute() {
  if (typeof window === "undefined") return false;
  if (window.location.pathname !== "/") return false;
  return window.location.hash === "" || recoverableReaderHash.test(window.location.hash);
}

function errorDetail(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  return "An unexpected rendering error occurred.";
}

/**
 * A Vercel alias can move to a new deployment while an existing reader tab
 * still points at an older hashed chunk. One guarded reload is safe on the
 * read-only reader surfaces and gives the browser the current HTML/chunk map.
 * Admin/report routes are deliberately excluded so unsaved editor work is not
 * discarded. The history-entry timestamp survives one reload without leaking
 * the recovery state into other tabs or future sessions.
 */
export function reloadReaderRouteOnce() {
  if (!readerRecoveryRoute()) return false;
  const route = `${window.location.pathname}${window.location.hash}`;
  const now = Date.now();
  try {
    const historyState = window.history.state && typeof window.history.state === "object" ? window.history.state as Record<string, unknown> : {};
    const previous = historyState[readerRecoveryHistoryKey] as { route?: unknown; at?: unknown } | undefined;
    if (previous?.route === route && typeof previous.at === "number" && now - previous.at < readerRecoveryCooldownMs) {
      return false;
    }
    window.history.replaceState({ ...historyState, [readerRecoveryHistoryKey]: { route, at: now } }, "", window.location.href);
  } catch {
    // Without a reliable loop guard, keep recovery manual.
    return false;
  }
  window.location.reload();
  return true;
}

export function PageLoading({
  message = "Loading page…",
  compact = false,
  announce = true
}: {
  message?: string;
  compact?: boolean;
  /** When false, the visible loader stays inside a parent busy region and must not expose a second accessible name. */
  announce?: boolean;
  /** @deprecated Orbs are the default loader. Kept so existing call sites typecheck. */
  illustrated?: boolean;
}) {
  return <div className={`app-loading app-loading--illustrated${compact ? " app-loading--compact" : ""}`} role={announce ? "status" : undefined} aria-label={announce ? message : undefined} aria-live={announce ? "polite" : undefined} aria-busy={announce ? true : undefined} aria-hidden={announce ? undefined : true}>
    <LoadingIllustration compact={compact} />
    <span>{message}</span>
  </div>;
}

export function PageLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="app-loading" role="alert">
    <span>{message}</span>
    <button type="button" className="app-loading__action" onClick={onRetry}>Retry</button>
  </div>;
}

type PageLoadBoundaryProps = {
  children: ReactNode;
  resetKey?: string;
  recoveryHref?: string;
  recoveryLabel?: string;
  renderFallback?: (detail: string, retry: () => void) => ReactNode;
};
export class PageLoadBoundary extends Component<PageLoadBoundaryProps, { failed: boolean; detail: string; assetFailure: boolean }> {
  state = { failed: false, detail: "", assetFailure: false };
  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics in the current browser only. Never send Studio copy,
    // credentials, or the current URL to an external error-reporting service.
    const detail = errorDetail(error);
    console.error("Page rendering failed", error, info.componentStack);
    if (reloadReaderRouteOnce()) return;
    this.setState({ detail });
  }

  retry = () => {
    if (!this.state.failed) return;
    // React.lazy caches a failed import, and an old chunk URL cannot recover
    // by remounting it. An explicit retry fetches the current HTML/chunk map.
    if (this.state.assetFailure && this.props.recoveryHref) { window.location.reload(); return; }
    this.setState({ failed: false, detail: "", assetFailure: false });
  };

  handlePreloadError = (event: Event) => {
    // A mounted child boundary owns its failed route; the root must retain
    // navigation instead of replacing the entire application as well.
    if (event.defaultPrevented) return;
    const payload = (event as Event & { payload?: unknown }).payload;
    const detail = payload ? errorDetail(payload) : "A page asset from an older deployment could not be loaded.";
    if (reloadReaderRouteOnce()) { event.preventDefault(); return; }
    // Suppressing this event makes Vite resolve the import as undefined. Keep
    // the original rejection so React receives the actual asset failure.
    this.setState({ failed: true, detail, assetFailure: true });
  };

  componentDidMount() {
    if (this.props.recoveryHref) window.addEventListener("hashchange", this.retry);
    // Route/editor boundaries own failed assets. The outer reader boundary
    // still catches React errors, but must not also replace the navigation.
    if (this.props.resetKey !== undefined || this.props.recoveryHref) {
      window.addEventListener("vite:preloadError", this.handlePreloadError);
    }
  }
  componentWillUnmount() {
    window.removeEventListener("hashchange", this.retry);
    window.removeEventListener("vite:preloadError", this.handlePreloadError);
  }
  componentDidUpdate(previous: Readonly<{ resetKey?: string }>) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.retry();
  }
  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.renderFallback) return this.props.renderFallback(this.state.detail, this.retry);
    return <div className="app-loading" role="alert">
        <span>This page could not load. Try another page or reload to try again.</span>
        {this.props.recoveryHref && <>
          <button type="button" className="app-loading__action" onClick={this.retry}>Retry page</button>
          <a className="app-loading__action" href={this.props.recoveryHref}>{this.props.recoveryLabel ?? "Open another page"}</a>
        </>}
        <button type="button" className="app-loading__action" onClick={() => window.location.reload()}>Reload page</button>
        {this.state.detail && <details>
          <summary>Error details</summary>
          <p>{this.state.detail}</p>
        </details>}
    </div>;
  }
}
