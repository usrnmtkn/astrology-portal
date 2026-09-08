import { Component, type ReactNode } from "react";
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

export class PageLoadBoundary extends Component<{ children: ReactNode; resetKey?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: Readonly<{ resetKey?: string }>) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="app-loading" role="alert">
      <span>This page could not load. Try another page or reload to try again.</span>
      <button type="button" className="app-loading__action" onClick={() => window.location.reload()}>Reload page</button>
    </div>;
  }
}
