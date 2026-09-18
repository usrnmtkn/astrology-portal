import { studioShellAttributes } from "./studioTheme";
import "./studio-system.css";
import { AdminDataTable, AdminDisclosureSummary, StudioButton } from "./studio-ds/components";
import { ListPage } from "./studio-ds/page-templates";
import { MetricCard } from "./studio-ds/patterns";
import { metricGrid, surfacePanel, surfaceSection, tableScroll } from "./studio-ds/recipes";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { adminCredentialHeaders, adminSecretStorageKey, normalizeAdminSecret } from "./adminSecret";
import { AdminAccessGate } from "./AdminStudioPrimitives";
import { PageLoading } from "../../web/src/components/PageLoading";
import NeedsAttentionDashboard from "./NeedsAttentionDashboard";
import { loadOwnerSessionAccessToken, watchOwnerSessionAccessToken } from "./ownerSession";

type CoverageAuthority = {
  id: string;
  ownerAuthority: string;
  studioOverlay: string;
  servingSource: string;
  resolver: string;
  readerDestinations: string[];
  failurePolicy: string;
};

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
  authority: CoverageAuthority;
};

type CoveragePayload = {
  ok: true;
  generatedAt: string;
  authority: string;
  readerEligibility: {
    status: string;
    lane: string;
    review_state: null;
  } | null;
  summary: {
    complete: number;
    incomplete: number;
    unresolvedQueue: number;
    unresolvedIssues: number;
    unresolvedOptionalQueue: number;
    unresolvedOptionalIssues: number;
    unresolvedShadowed: number;
    unresolvedRetired: number;
  };
  coverage: CoverageRow[];
  notes: {
    friendsIntentionalGap: string | null;
    unresolvedReasonCounts: Record<string, number>;
    unresolvedWorkload: Record<string, { records: number; decisions: number }>;
    unresolvedOptionalWorkload: Record<string, { records: number; decisions: number }>;
    unresolvedShadowedReasonCounts: Record<string, number>;
    unresolvedRetiredReasonCounts: Record<string, number>;
  };
};

function CoverageDashboard() {
  const [payload, setPayload] = useState<CoveragePayload | null>(null);
  const [credential, setCredential] = useState("");
  const [emergencySecret, setEmergencySecret] = useState(() => normalizeAdminSecret(window.localStorage.getItem(adminSecretStorageKey) ?? ""));
  const [loading, setLoading] = useState(false);
  // True until the owner-session check has decided whether there is a credential
  // to load with, so the sign-in gate never flashes while data is on its way.
  const [bootstrapping, setBootstrapping] = useState(true);
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
      setBootstrapping(false);
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
    <main className="admin-dashboard studio-standalone" {...studioShellAttributes()}>
      <ListPage>
        {error && <p role="alert">{error}</p>}
        <header className="admin-dashboard-header">
          <div>
            <a href="/admin/content" >
              <ArrowLeft size={15} aria-hidden="true" />
              Content Studio
            </a>
            <p className="admin-eyebrow">Content operations</p>
            <h1 >Content coverage</h1>
            <p >
              One view of what is complete, what is missing, and the authority chain from owner source to reader destination.
            </p>
          </div>
          <div className="admin-toolbar-actions">
            <a className="admin-create-button admin-secondary-button" href="/admin/content/coverage?view=attention">Needs attention</a>
            <StudioButton
              type="button"
              className="admin-create-button admin-secondary-button"
              onClick={() => credential && void loadCoverage(credential)}
              disabled={!credential || loading}
            >
              <RefreshCw size={16} aria-hidden="true" />
              {loading ? "Refreshing…" : "Refresh"}
            </StudioButton>
          </div>
        </header>

        {!payload && (loading || bootstrapping) && (
          <PageLoading message="Checking access and loading coverage." />
        )}

        {!payload && !loading && !bootstrapping && (
          <>
            <AdminAccessGate
              disabled={!normalizeAdminSecret(emergencySecret) || loading}
              onChange={setEmergencySecret}
              onSubmit={submitEmergencyAccess}
              value={emergencySecret}
            />
          </>
        )}

        {payload && (
          <>
            <section className={surfaceSection} aria-label="Coverage summary">
              <div className={metricGrid}>
                <MetricCard label="Complete corpora" value={payload.summary.complete} />
                <MetricCard label="Incomplete corpora" value={payload.summary.incomplete} />
                <MetricCard label="Required decisions" value={payload.summary.unresolvedIssues} />
                <MetricCard label="Optional enrichment" value={payload.summary.unresolvedOptionalIssues} />
                <MetricCard label="Required source records" value={payload.summary.unresolvedQueue} />
                <MetricCard label="Resolved source history" value={payload.summary.unresolvedShadowed + payload.summary.unresolvedRetired} />
              </div>
            </section>

            {Object.keys(payload.notes.unresolvedWorkload).length > 0 && (
              <section className={surfacePanel} aria-label="Editorial backlog classes">
                <p className="admin-eyebrow">Required editorial work</p>
                {Object.entries(payload.notes.unresolvedWorkload).map(([workClass, counts]) => (
                  <p key={workClass} >
                    <strong>{workClass.replaceAll("-", " ")}:</strong> {counts.decisions} decisions · {counts.records} source records
                  </p>
                ))}
                <p >
                  Shadowed and governed retired source rows remain preserved as audit history and are not counted as required owner work.
                </p>
              </section>
            )}

            {Object.keys(payload.notes.unresolvedOptionalWorkload).length > 0 && (
              <section className={surfacePanel} aria-label="Optional editorial enrichment">
                <p className="admin-eyebrow">Optional enrichment</p>
                {Object.entries(payload.notes.unresolvedOptionalWorkload).map(([workClass, counts]) => (
                  <p key={workClass} >
                    <strong>{workClass.replaceAll("-", " ")}:</strong> {counts.decisions} decisions · {counts.records} source records
                  </p>
                ))}
                <p >
                  These candidates can improve rotation or depth later, but current reader coverage resolves without them.
                </p>
              </section>
            )}

            {payload.readerEligibility && (
              <section className={surfacePanel} aria-label="Reader database eligibility">
                <p className="admin-eyebrow">Database overlay rule</p>
                <strong>Actually serving requires all three conditions</strong>
                <p >
                  status = {payload.readerEligibility.status} · lane = {payload.readerEligibility.lane} · review_state = null
                </p>
                <p >
                  A draft can sit in the serving lane without becoming reader copy. Lane alone is not publication authority.
                </p>
              </section>
            )}

            {payload.notes.friendsIntentionalGap && (
              <section className={surfacePanel}>
                <AlertTriangle size={18} aria-hidden="true" />
                <div>
                  <strong>Friends coverage has a visible gap</strong>
                  <p >{payload.notes.friendsIntentionalGap}</p>
                </div>
              </section>
            )}

            <section className="admin-list-panel" aria-label="Content corpus coverage">
              <div className={tableScroll}>
                {payload.coverage.length > 0 ? (
                  <AdminDataTable label="Content corpus coverage" columns={["Corpus", "State", "Ready", "Detail", "Authority"]}>
                    {payload.coverage.map((row) => (
                      <tr id={row.id} key={row.id}>
                        <td data-label="Corpus">
                          <h2>{row.label}</h2>
                          <small>Count source: {row.source}</small>
                        </td>
                        <td data-label="State">{row.state === "complete" ? "Complete" : "Needs work"}</td>
                        <td data-label="Ready">{row.ready} / {row.total} · {row.percent}%</td>
                        <td data-label="Detail">{row.detail}</td>
                        <td data-label="Authority">
                          <details>
                            <AdminDisclosureSummary>Authority chain</AdminDisclosureSummary>
                            <div>
                              <p><strong>Owner authority:</strong> {row.authority.ownerAuthority}</p>
                              <p><strong>Studio overlay:</strong> {row.authority.studioOverlay}</p>
                              <p><strong>Serving source:</strong> {row.authority.servingSource}</p>
                              <p><strong>Resolver:</strong> {row.authority.resolver}</p>
                              <p><strong>Reader:</strong> {row.authority.readerDestinations.join(" · ")}</p>
                              <p><strong>Fail closed:</strong> {row.authority.failurePolicy}</p>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </AdminDataTable>
                ) : <p className="admin-empty">No corpora are listed in this coverage snapshot.</p>}
              </div>
            </section>

            <p className={`${surfacePanel} admin-field-hint`}>
              Authority: {payload.authority}. Calculated {new Date(payload.generatedAt).toLocaleString()}.
            </p>
          </>
        )}
      </ListPage>
    </main>
  );
}

export default function ContentCoverageDashboard() {
  const view = new URLSearchParams(window.location.search).get("view");
  return view === "attention" ? <NeedsAttentionDashboard /> : <CoverageDashboard />;
}
