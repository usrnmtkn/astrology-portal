import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type AdminResponse = {
  error?: string;
  code?: string;
  entitlementId?: string;
  reportId?: string | null;
};

class AdminRequestError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = "") {
    super(message);
    this.name = "AdminRequestError";
    this.status = status;
    this.code = code;
  }
}

type Dashboard = {
  billingMode: "free_test" | "stripe";
  metrics: {
    orders: number; entitlementStatuses: Record<string, number>; fulfillmentStatuses: Record<string, number>;
    jobStates: Record<string, number>; exceptionDepth: number; auditDepth: number;
    averageDeliveryMinutes: number | null; averageJudgeScore: number | null;
    averageAcceptedTokenCount: number; averageTotalTokenCount: number; averageEstimatedSpendUsd: number;
    validatorPassRate: number | null; judgePassRate: number | null; attemptDistribution: Record<string, number>; judgeScoreDistribution: Record<string, number>;
  };
  reports: Array<Record<string, unknown>>;
  audits: Array<Record<string, unknown>>;
  users: Array<{ id: string; label: string }>;
  callEstimates: Record<string, {
    unitCount: number; cleanPathCalls: number; expectedCallBudget: number; safetyMarginCalls: number;
    recommendedCallBudget: number; tokenBudget: number; planning: { estimatedCostUsd: number; totalTokens: number } | null;
  }>;
};

export function ReportFulfillmentAdminPanel({ secret }: { secret: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [focusedReportId, setFocusedReportId] = useState("");
  const [loading, setLoading] = useState(false);
  const [grant, setGrant] = useState({ userId: "", reportDomain: "general", reportHorizon: "12_months", windowStart: new Date().toISOString().slice(0, 10) });

  async function request(init?: RequestInit) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/report-fulfillment", {
        ...init,
        headers: { authorization: `Bearer ${secret}`, "content-type": "application/json", ...(init?.headers ?? {}) }
      });
      const payload = await response.json() as AdminResponse;
      if (!response.ok) throw new AdminRequestError(payload.error ?? `Request failed with ${response.status}.`, response.status, payload.code);
      return payload;
    } finally {
      setLoading(false);
    }
  }

  async function load(clearMessage = true) {
    try {
      const next = await request() as Dashboard;
      setDashboard(next);
      if (clearMessage) setMessage("");
      return next;
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Fulfillment metrics unavailable.");
      return null;
    }
  }

  async function action(actionName: string, reportId?: string, entitlementId?: string, extra: Record<string, unknown> = {}) {
    try {
      const result = await request({ method: "POST", body: JSON.stringify({ action: actionName, reportId, entitlementId, ...extra }) });
      const refreshed = await load(false);
      if (!refreshed) {
        if (actionName === "grant_comp") {
          setMessageTone("error");
          setMessage("The report was granted, but the fulfillment queue could not refresh. Use Refresh before granting anything else.");
        }
        return;
      }
      if (actionName === "grant_comp") {
        const grantedReportId = result.reportId
          ?? refreshed?.reports.find((report) => String(report.entitlement_id) === result.entitlementId)?.id;
        setFocusedReportId(grantedReportId ? String(grantedReportId) : "");
        setMessageTone("success");
        setMessage("Report granted. The fulfillment queue was refreshed and the new report row is focused below.");
      } else {
        setMessage("");
      }
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Fulfillment action failed.");
    }
  }

  useEffect(() => { if (secret) void load(); }, [secret]);
  useEffect(() => {
    if (!focusedReportId) return;
    const row = document.getElementById(`report-row-${focusedReportId}`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, [dashboard, focusedReportId]);
  const metrics = dashboard?.metrics;

  return (
    <section className="admin-template-page">
      <section className="admin-content-toolbar">
        <div><p className="admin-eyebrow">Purchased reports</p><h2>Fulfillment</h2><p>Queue health, gate outcomes, delivery time, spend, audit sampling, and terminal exceptions.</p></div>
        <div className="admin-toolbar-actions">
          <button type="button" onClick={() => void action("pause_worker")} disabled={loading}>Pause worker</button>
          <button type="button" onClick={() => void action("resume_worker")} disabled={loading}>Resume worker</button>
          <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} aria-hidden="true" />Refresh</button>
        </div>
      </section>
      {message && <p className={`admin-save-toast ${messageTone === "error" ? "is-error" : ""}`} role="status">{message}</p>}
      <section className="admin-content-toolbar">
        <div><p className="admin-eyebrow">{dashboard?.billingMode === "free_test" ? "Free-test shadow launch" : "Owner-only comp path"}</p><h3>Grant report</h3><p>Creates the fulfillment envelope directly, with no Stripe request, then pauses before any billed model call.</p></div>
        <div className="admin-toolbar-actions">
          <label>User
            <select value={grant.userId} onChange={(event) => setGrant({ ...grant, userId: event.target.value })}>
              <option value="">Select user</option>
              {dashboard?.users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}
            </select>
          </label>
          <label>Domain
            <select value={grant.reportDomain} onChange={(event) => setGrant({ ...grant, reportDomain: event.target.value })}>
              <option value="general">General</option><option value="work_money">Work &amp; Money</option>
              <option value="love_connection">Love &amp; Connection</option><option value="personal_health">Personal &amp; Health</option>
            </select>
          </label>
          <label>Horizon
            <select value={grant.reportHorizon} onChange={(event) => setGrant({ ...grant, reportHorizon: event.target.value })}>
              <option value="1_month">1 month</option><option value="4_months">4 months</option>
              <option value="6_months">6 months</option><option value="12_months">12 months</option>
            </select>
          </label>
          <label>Window start<input type="date" value={grant.windowStart} onChange={(event) => setGrant({ ...grant, windowStart: event.target.value })} /></label>
          <button type="button" disabled={loading || !grant.userId || !grant.windowStart} onClick={() => void action("grant_comp", undefined, undefined, grant)}>Grant report</button>
        </div>
      </section>
      {metrics && (
        <div className="admin-status-grid">
          <article className="admin-status-card"><span>Orders</span><strong>{metrics.orders}</strong></article>
          <article className="admin-status-card"><span>Exceptions</span><strong>{metrics.exceptionDepth}</strong></article>
          <article className="admin-status-card"><span>Audit queue</span><strong>{metrics.auditDepth}</strong></article>
          <article className="admin-status-card"><span>Delivery minutes</span><strong>{metrics.averageDeliveryMinutes?.toFixed(1) ?? "n/a"}</strong></article>
          <article className="admin-status-card"><span>Judge average</span><strong>{metrics.averageJudgeScore?.toFixed(3) ?? "n/a"}</strong></article>
          <article className="admin-status-card"><span>Validator pass</span><strong>{metrics.validatorPassRate === null ? "n/a" : `${(metrics.validatorPassRate * 100).toFixed(1)}%`}</strong></article>
          <article className="admin-status-card"><span>Judge pass</span><strong>{metrics.judgePassRate === null ? "n/a" : `${(metrics.judgePassRate * 100).toFixed(1)}%`}</strong></article>
          <article className="admin-status-card"><span>Accepted tokens/report</span><strong>{metrics.averageAcceptedTokenCount.toFixed(0)}</strong></article>
          <article className="admin-status-card"><span>Total tokens/report</span><strong>{metrics.averageTotalTokenCount.toFixed(0)}</strong></article>
          <article className="admin-status-card"><span>Estimated spend/report</span><strong>${metrics.averageEstimatedSpendUsd.toFixed(4)}</strong></article>
          <article className="admin-status-card"><span>Attempt distribution</span><strong><code>{JSON.stringify(metrics.attemptDistribution)}</code></strong></article>
          <article className="admin-status-card"><span>Judge distribution</span><strong><code>{JSON.stringify(metrics.judgeScoreDistribution)}</code></strong></article>
        </div>
      )}
      <div className="admin-content-table-scroll">
        <table className="admin-content-table">
          <thead><tr><th>Report</th><th>Source</th><th>Domain</th><th>Horizon</th><th>Status</th><th>Accepted / total tokens</th><th>Estimated USD</th><th>Attempts</th><th>Last failure</th><th>Actions</th></tr></thead>
          <tbody>{dashboard?.reports.map((report) => (
            <tr
              id={`report-row-${String(report.id)}`}
              key={String(report.id)}
              className={focusedReportId === String(report.id) ? "admin-report-row-focused" : ""}
            >
              <td><code>{String(report.id)}</code></td>
              <td>{String(report.entitlement_source)}</td>
              <td>{String(report.report_domain)}</td><td>{String(report.report_horizon)}</td><td>{String(report.fulfillment_status)}</td>
              <td>{Number(report.token_count ?? 0).toLocaleString()} / {Number(report.token_count_total ?? 0).toLocaleString()}</td>
              <td>${Number(report.token_spend_usd_estimate ?? 0).toFixed(4)} est.</td>
              <td><code>{JSON.stringify(report.attempt_counts ?? {})}</code></td>
              <td><code>{JSON.stringify(Array.isArray(report.failure_history) ? report.failure_history.at(-1) ?? null : null)}</code></td>
              <td>
                <div className="admin-toolbar-actions">
                  {report.fulfillment_status === "awaiting_authorization" && <button type="button" onClick={() => void action("authorize_generation", String(report.id), undefined, {
                    callBudget: Number(dashboard.callEstimates[String(report.report_horizon)]?.recommendedCallBudget ?? 44)
                  })}>Authorize {Number(dashboard.callEstimates[String(report.report_horizon)]?.recommendedCallBudget ?? 44)} calls</button>}
                  {report.fulfillment_status === "exception" && <button type="button" onClick={() => void action("rerun", String(report.id))}>Re-run</button>}
                  {report.fulfillment_status === "needs_review" && <button type="button" onClick={() => void action("release", String(report.id))}>Release</button>}
                  {!["revoked", "live"].includes(String(report.fulfillment_status)) && (report.entitlement_source === "comp"
                    ? <button type="button" onClick={() => void action("revoke_comp", String(report.id), String(report.entitlement_id))}>Revoke comp</button>
                    : <button type="button" onClick={() => void action("mark_refunded", String(report.id), String(report.entitlement_id))}>Mark refunded</button>)}
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="admin-content-table-scroll">
        <table className="admin-content-table">
          <thead><tr><th>Audit report</th><th>Reason</th><th>Status</th><th>Findings</th></tr></thead>
          <tbody>{dashboard?.audits.map((audit) => (
            <tr key={String(audit.id)}><td><code>{String(audit.report_id)}</code></td><td>{String(audit.reason)}</td><td>{String(audit.status)}</td><td><code>{JSON.stringify(audit.findings ?? [])}</code></td></tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
