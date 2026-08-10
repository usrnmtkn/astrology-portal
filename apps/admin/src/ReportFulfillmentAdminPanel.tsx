import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type Dashboard = {
  metrics: {
    orders: number; entitlementStatuses: Record<string, number>; fulfillmentStatuses: Record<string, number>;
    jobStates: Record<string, number>; exceptionDepth: number; auditDepth: number;
    averageDeliveryMinutes: number | null; averageJudgeScore: number | null; averageTokenCount: number; averageTokenSpendUsd: number;
    validatorPassRate: number | null; judgePassRate: number | null; attemptDistribution: Record<string, number>; judgeScoreDistribution: Record<string, number>;
  };
  reports: Array<Record<string, unknown>>;
  audits: Array<Record<string, unknown>>;
  users: Array<{ id: string; label: string }>;
  callEstimates: Record<string, { unitCount: number; cleanPathCalls: number; recommendedCallBudget: number; tokenBudget: number; configuredMaxCostUsd: number }>;
};

export function ReportFulfillmentAdminPanel({ secret }: { secret: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [grant, setGrant] = useState({ userId: "", reportDomain: "general", reportHorizon: "12_months", windowStart: new Date().toISOString().slice(0, 10) });

  async function request(init?: RequestInit) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/report-fulfillment", {
        ...init,
        headers: { authorization: `Bearer ${secret}`, "content-type": "application/json", ...(init?.headers ?? {}) }
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? `Request failed with ${response.status}.`);
      return payload;
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    try { setDashboard(await request()); setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Fulfillment metrics unavailable."); }
  }

  async function action(actionName: string, reportId?: string, entitlementId?: string, extra: Record<string, unknown> = {}) {
    try {
      await request({ method: "POST", body: JSON.stringify({ action: actionName, reportId, entitlementId, ...extra }) });
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Fulfillment action failed."); }
  }

  useEffect(() => { if (secret) void load(); }, [secret]);
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
      {message && <p className="admin-save-toast is-error" role="status">{message}</p>}
      <section className="admin-content-toolbar">
        <div><p className="admin-eyebrow">Owner-only comp path</p><h3>Grant report</h3><p>Creates the same fulfillment envelope as checkout, then pauses before any billed model call.</p></div>
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
          <article className="admin-status-card"><span>Tokens/report</span><strong>{metrics.averageTokenCount.toFixed(0)}</strong></article>
          <article className="admin-status-card"><span>Spend/report</span><strong>${metrics.averageTokenSpendUsd.toFixed(4)}</strong></article>
          <article className="admin-status-card"><span>Attempt distribution</span><strong><code>{JSON.stringify(metrics.attemptDistribution)}</code></strong></article>
          <article className="admin-status-card"><span>Judge distribution</span><strong><code>{JSON.stringify(metrics.judgeScoreDistribution)}</code></strong></article>
        </div>
      )}
      <div className="admin-content-table-scroll">
        <table className="admin-content-table">
          <thead><tr><th>Report</th><th>Source</th><th>Domain</th><th>Horizon</th><th>Status</th><th>Attempts</th><th>Last failure</th><th>Actions</th></tr></thead>
          <tbody>{dashboard?.reports.map((report) => (
            <tr key={String(report.id)}>
              <td><code>{String(report.id)}</code></td>
              <td>{String(report.entitlement_source)}</td>
              <td>{String(report.report_domain)}</td><td>{String(report.report_horizon)}</td><td>{String(report.fulfillment_status)}</td>
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
