import { ChevronLeft, FileText } from "lucide-react";
import { useId } from "react";

export type ReportStateTone = "neutral" | "info" | "warning" | "error";

export function ReportLoading() {
  return <svg className="report-loading" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <circle className="report-loading__track" cx="24" cy="24" r="16"/>
    <path d="M24 8a16 16 0 0 1 16 16"/>
    <circle className="report-loading__dot" cx="40" cy="24" r="3"/>
  </svg>;
}

export function ReportBack({ href = "/reports/", className = "floating-back-button" }: { href?: string; className?: string }) {
  const library = href === "/reports/";
  return <button type="button" className={`report-back ${className}`} aria-label={library ? "Back to Reports" : "Back"} onClick={() => window.location.assign(href)}>
    <ChevronLeft size={18} aria-hidden="true"/><span>{library ? "Reports" : "Back"}</span>
  </button>;
}

/** Shared presentation for report loading, access and terminal states. */
export function ReportStateCard({ title, message, tone = "neutral", loading = false, library = false, action, backHref = "/reports/" }: {
  title?: string; message?: string; tone?: ReportStateTone; loading?: boolean; library?: boolean;
  action?: { label: string; href?: string; onClick?: () => void }; backHref?: string;
}) {
  const titleId = useId();
  const Heading = library ? "h2" : "h1";
  const card = <section className={`report-state-card report-state-card--${tone}`} role="status" aria-live="polite" aria-busy={loading || undefined} aria-labelledby={title ? titleId : undefined}>
    <span className="report-state-card__icon" aria-hidden="true">{loading ? <ReportLoading/> : <FileText size={24}/>}</span>
    {title && <Heading id={titleId}>{title}</Heading>}
    {message && <p>{message}</p>}
    {action && (action.href ? <a className="primary-button report-action" href={action.href}>{action.label}</a> : <button className="primary-button report-action" type="button" onClick={action.onClick}>{action.label}</button>)}
  </section>;
  return library ? card : <main className="report-state-page"><ReportBack href={backHref}/>{card}</main>;
}

export function reportProgressLabel(status?: string) {
  return ({ writing: "Writing", calculating: "Preparing", queued: "Queued to continue", waiting: "Queued to continue", validating: "Checking", judging: "Checking", checking: "Checking", revising: "Revising" } as Record<string, string>)[status ?? ""] ?? "Preparing";
}
