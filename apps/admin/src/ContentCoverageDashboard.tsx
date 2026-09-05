import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { adminCredentialHeaders, adminSecretStorageKey, normalizeAdminSecret } from "./adminSecret";
import { AdminAccessGate } from "./AdminStudioPrimitives";
import { loadOwnerSessionAccessToken, watchOwnerSessionAccessToken } from "./ownerSession";
import "./admin.css";
import "./admin-components.css";

type CoverageRow = {
  id: string;
  label: string;
  ready: number;
  total: number;
  missing: number;
  percent: number;
  state: "complete" | "incomplete";
  detail: string;
  source: string;
};

type CoveragePayload = {
  ok: true;
  generatedAt: string;
  authority: string;
  summary: {
    complete: number;
    incomplete: number;
    unresolvedQueue: number;
  };
  coverage: CoverageRow[];
  notes: {
    friendsIntentionalGap: string | null;
    unresolvedReasonCounts: Record<string, number>;
  };
};

const cardStyle = {
  border: "1px solid var(--admin-border, #d9d9d9)",
  borderRadius: 14,
  padding: 18,
  background: "var(--admin-surface, #fff)"
} as const;

export default function ContentCoverageDashboard() {
  const [payload, setPayload] = useState<CoveragePayload | null>(null);
  const [credential, setCredential] = useState("");
  const [emergencySecret, setEmergencySecret] = useState(() => normalizeAdminSecret(window.localStorage.getItem(adminSecretStorageKey) ?? ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadCoverage(nextCredential: string) {
    const normalized = normalizeAdminSecret(nextCredential);
    if (!normalized) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/content-coverage", {
        headers: adminCredentialHeaders(normalized)
      });
      const body = await response.json().catch(() => null) as CoveragePayload | { error?: string } | null;
      if (!response.ok || !body || !("ok" in body) || body.ok !== true) {
        throw new Error(body && "error" in body && body.error ? body.error : `Coverage request failed (${response.status}).`);
      }
      setCredential(normalized);
      setPayload(body);
    } catch (nextError) {
      setPayload(null);
      setError(nextError instanceof Error ? nextError.message : "Coverage could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const saved = normalizeAdminSecret(window.localStorage.getItem(adminSecretStorageKey) ?? "");
    void loadOwnerSessionAccessToken().then((token) => {
      if (cancelled) return;
      const nextCredential = token || saved;
      if (nextCredential) void loadCoverage(nextCredential);
    });
    const stopWatching = watchOwnerSessionAccessToken((token) => {
      if (!cancelled && token) void loadCoverage(token);
    });
    return () => {
      cancelled = true;
      stopWatching();
    };
  }, []);

  function submitEmergencyAccess() {
    const normalized = normalizeAdminSecret(emergencySecret);
    if (!normalized) return;
    window.localStorage.setItem(adminSecretStorageKey, normalized);
    void loadCoverage(normalized);
  }

  return (
    <main className="admin-dashboard">
      <section className="admin-main" style={{ padding: "28px", maxWidth: 1220, margin: "0 auto", width: "100%" }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 26 }}>
          <div>
            <a href="/admin/content" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <ArrowLeft size={15} aria-hidden="true" />
              Content Studio
            </a>
            <p className="admin-eyebrow">Content operations</p>
            <h1 style={{ marginBottom: 8 }}>Content coverage</h1>
            <p style={{ maxWidth: 760, margin: 0 }}>
              One view of what is complete, what is missing, and which governed source proves the count.
            </p>
          </div>
          <button
            type="button"
            className="admin-create-button"
            onClick={() => credential && void loadCoverage(credential)}
            disabled={!credential || loading}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        {!payload && (
          <>
            <AdminAccessGate
              disabled={!normalizeAdminSecret(emergencySecret) || loading}
              onChange={setEmergencySecret}
              onSubmit={submitEmergencyAccess}
              value={emergencySecret}
            />
            {error && <p role="alert" style={{ marginTop: 14 }}>{error}</p>}
          </>
        )}

        {payload && (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 20 }} aria-label="Coverage summary">
              <div style={cardStyle}>
                <p className="admin-eyebrow">Complete corpora</p>
                <strong style={{ fontSize: 28 }}>{payload.summary.complete}</strong>
              </div>
              <div style={cardStyle}>
                <p className="admin-eyebrow">Incomplete corpora</p>
                <strong style={{ fontSize: 28 }}>{payload.summary.incomplete}</strong>
              </div>
              <div style={cardStyle}>
                <p className="admin-eyebrow">Unresolved queue</p>
                <strong style={{ fontSize: 28 }}>{payload.summary.unresolvedQueue}</strong>
              </div>
            </section>

            {payload.notes.friendsIntentionalGap && (
              <section style={{ ...cardStyle, marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <AlertTriangle size={18} aria-hidden="true" />
                <div>
                  <strong>Friends coverage has a visible gap</strong>
                  <p style={{ margin: "4px 0 0" }}>{payload.notes.friendsIntentionalGap}</p>
                </div>
              </section>
            )}

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }} aria-label="Content corpus coverage">
              {payload.coverage.map((row) => (
                <article key={row.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <p className="admin-eyebrow">{row.state === "complete" ? "Complete" : "Needs work"}</p>
                      <h2 style={{ fontSize: 18, margin: "4px 0 10px" }}>{row.label}</h2>
                    </div>
                    {row.state === "complete"
                      ? <CheckCircle2 size={20} aria-label="Complete" />
                      : <AlertTriangle size={20} aria-label="Incomplete" />}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 10 }}>
                    <strong style={{ fontSize: 30 }}>{row.ready}</strong>
                    <span>/ {row.total}</span>
                    <span style={{ marginLeft: "auto" }}>{row.percent}%</span>
                  </div>
                  <p style={{ margin: "0 0 12px" }}>{row.detail}</p>
                  <small style={{ overflowWrap: "anywhere" }}>Source: {row.source}</small>
                </article>
              ))}
            </section>

            <p style={{ marginTop: 20, opacity: 0.72 }}>
              Authority: {payload.authority}. Calculated {new Date(payload.generatedAt).toLocaleString()}.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
