import { Component, type ErrorInfo, type ReactNode } from "react";
import "../styles/loading.css";

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
    console.error("Page rendering failed", error, info.componentStack);
    this.setState({ detail: error instanceof Error ? `${error.name}: ${error.message}` : "An unexpected rendering error occurred." });
  }
  retry = () => { if (this.state.failed) this.setState({ failed: false, detail: "" }); };
  componentDidMount() {
    if (this.props.recoveryHref) window.addEventListener("hashchange", this.retry);
  }
  componentWillUnmount() {
    window.removeEventListener("hashchange", this.retry);
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
        {this.props.recoveryHref && this.state.detail && <details>
          <summary>Error details</summary>
          <p>{this.state.detail}</p>
        </details>}
    </div>;
  }
}
