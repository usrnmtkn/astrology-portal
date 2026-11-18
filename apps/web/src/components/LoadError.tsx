import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { EightBall } from "./EightBall";
import { ReaderUnavailable, type ReaderUnavailableKind } from "./ReaderUnavailable";
import "../styles/load-error.css";

export type LoadErrorCause = "network" | "offline" | "server";
function errorStatus(error: unknown): number | undefined {
  const value = error as { status?: number; statusCode?: number; response?: { status?: number } } | undefined;
  return value?.status ?? value?.statusCode ?? value?.response?.status;
}
export function loadErrorCause(error?: unknown): LoadErrorCause {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  const value = error as { status?: number; statusCode?: number; message?: string; response?: { status?: number } } | undefined;
  const status = errorStatus(error);
  return status && status >= 500 || /\b(?:HTTP|status|server)\s*5\d\d\b/iu.test(value?.message ?? String(error ?? "")) ? "server" : "network";
}
const causes = {
  network: "Check your connection and try again.",
  offline: "You're offline. Reconnect and try again.",
  server: "Something went wrong on our side. Try again in a moment."
};
type LoadErrorProps = {
  scope?: "page" | "section"; what?: string; message?: string; cause?: unknown;
  onRetry: () => void | Promise<unknown>; retrying?: boolean; attempts?: number;
  notFoundKind?: ReaderUnavailableKind;
};

export function LoadError({ scope = "section", what = "This page", message, cause, onRetry, retrying = false, attempts = 0, notFoundKind = "page" }: LoadErrorProps) {
  const id = useId(), button = useRef<HTMLButtonElement>(null), wasRetrying = useRef(false);
  const [localRetrying, setLocalRetrying] = useState(false), [localAttempts, setLocalAttempts] = useState(0);
  const busy = retrying || localRetrying, count = Math.max(attempts, localAttempts);
  const reason = typeof cause === "string" && cause in causes ? cause as LoadErrorCause : loadErrorCause(cause);
  const repeated = count >= 3;
  useEffect(() => {
    if (attempts > 0 && !busy) button.current?.focus({ preventScroll: true });
  }, [attempts]);
  useEffect(() => {
    if (wasRetrying.current && !busy) button.current?.focus({ preventScroll: true });
    wasRetrying.current = busy;
  }, [busy]);
  async function retry() {
    if (busy) return;
    setLocalAttempts(value => value + 1); setLocalRetrying(true);
    try { await onRetry(); } catch { /* The existing request owner presents its failure. */ }
    finally { setLocalRetrying(false); }
  }
  if (scope === "page" && !busy && [404, 410].includes(errorStatus(cause) ?? 0)) return <ReaderUnavailable kind={notFoundKind}/>;
  return <section className={`load-error load-error--${scope}`} data-attempts={count} aria-busy={busy} aria-labelledby={`${id}-title`}>
    {scope === "page" ? <EightBall key={count} glyph="…"/> : <span className="load-error__icon" aria-hidden="true"><CloudOff size={22}/></span>}
    <div className="load-error__message" role="alert">
      <h2 id={`${id}-title`}>{scope === "page" ? repeated && !busy ? "Ask again later." : "Reply hazy, try again." : message ?? `${what} could not load.`}</h2>
      <p>{scope === "page" ? <><span>{message ?? `${what} could not load.`}</span>{" "}</> : null}{repeated && !busy ? "This is taking longer than usual." : causes[reason]}</p>
    </div>
    <button ref={button} type="button" className="load-error__retry" disabled={busy} onClick={() => void retry()}>
      {busy ? <span className="load-error__spinner" aria-hidden="true"/> : <RefreshCw size={scope === "page" ? 16 : 14} strokeWidth={2.2} aria-hidden="true"/>}
      {busy ? "Trying again…" : "Try again"}
    </button>
    {scope === "page" && repeated && !busy && <a className="load-error__today" href="/#sky">Go to Today</a>}
  </section>;
}

/** Retains only retry presentation while the existing request owner loads. */
export function LoadErrorState({ failed, pending, children, ...props }: LoadErrorProps & { failed: boolean; pending: boolean; children?: ReactNode }) {
  const [hadFailure, setHadFailure] = useState(failed), [attempts, setAttempts] = useState(0), [requested, setRequested] = useState(false);
  useEffect(() => {
    if (failed) setHadFailure(true);
    else if (!pending && !requested) { setHadFailure(false); setAttempts(0); }
  }, [failed, pending, requested]);
  async function retry() {
    setAttempts(value => value + 1); setRequested(true);
    try { await props.onRetry(); } finally { setRequested(false); }
  }
  return failed || hadFailure && pending || requested
    ? <LoadError {...props} attempts={attempts} retrying={attempts > 0 && pending || requested} onRetry={retry}/>
    : <>{children}</>;
}
