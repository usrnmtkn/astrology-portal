import { Component, type ErrorInfo, type ReactNode } from "react";
import "../styles/loading.css";

const readerRecoverySessionKey = "tldrastro:reader-page-recovery";
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
 * discarded. The route-level timestamp prevents reload loops for real bugs.
 */
function reloadReaderRouteOnce() {
  if (!readerRecoveryRoute()) return false;
  const route = `${window.location.pathname}${window.location.hash}`;
  const now = Date.now();
  try {
    const previous = JSON.parse(window.sessionStorage.getItem(readerRecoverySessionKey) ?? "null") as { route?: unknown; at?: unknown } | null;
    if (previous?.route === route && typeof previous.at === "number" && now - previous.at < readerRecoveryCooldownMs) {
      return false;
    }
    window.sessionStorage.setItem(readerRecoverySessionKey, JSON.stringify({ route, at: now }));
  } catch {
    // Storage can be unavailable in hardened browser modes. A single reload is
    // still preferable to leaving a reader on a stale deployment shell.
  }
  window.location.reload();
  return true;
}

export function PageLoading({ message = "Loading page…" }: { message?: string }) {
  return <div className="app-loading" role="status" aria-live="polite" aria-busy="true">
    <span>{message}</span>
    <div className="app-loading__lines" aria-hidden="true"><span /><span /><span /></div>
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
export class PageLoadBoundary extends Component<PageLoadBoundaryProps, { failed: boolean; detail: string }> {
  state = { failed: false, detail: "" };
  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics in the current browser only. Never send Studio copy,
    // credentials, or the current URL to an external error-reporting service.
    const detail = errorDetail(error);
    console.error("Page rendering failed", error, info.componentStack);
    if (reloadReaderRouteOnce()) return;
    this.setState({ detail });
  }

  retry = () => { if (this.state.failed) this.setState({ failed: false, detail: "" }); };

  handlePreloadError = (event: Event) => {
    const payload = (event as Event & { payload?: unknown }).payload;
    const detail = payload ? errorDetail(payload) : "A page asset from an older deployment could not be loaded.";
    event.preventDefault();
    if (reloadReaderRouteOnce()) return;
    this.setState({ failed: true, detail });
  };

  componentDidMount() {
    if (this.props.recoveryHref) window.addEventListener("hashchange", this.retry);
    window.addEventListener("vite:preloadError", this.handlePreloadError);
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
