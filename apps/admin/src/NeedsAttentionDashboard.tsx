import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminCredentialHeaders, adminSecretStorageKey, normalizeAdminSecret } from "./adminSecret";
import { AdminAccessGate } from "./AdminStudioPrimitives";
import { isPublishedButUnwired, type ContentWiringRow } from "./contentWiringStatus";
import { loadOwnerSessionAccessToken, watchOwnerSessionAccessToken } from "./ownerSession";
import "./admin.css";
import "./admin-components.css";
import "./admin-form-density.css";
import "./admin-content-studio-layout.css";

type CoverageRow = {
  id: string;
  label: string;
  missing: number;
  state: "complete" | "incomplete";
  detail: string;
};

type CoveragePayload = {
  ok: true;
  generatedAt: string;
  summary: {
    complete: number;
    incomplete: number;
    unresolvedIssues: number;
    unresolvedOptionalIssues: number;
    unresolvedShadowed: number;
    unresolvedRetired: number;
  };
  coverage: CoverageRow[];
};

type InventoryRow = ContentWiringRow & {
  id: string;
  headline?: string | null;
  surface?: string | null;
  updated_at?: string | null;
};

type InventoryPayload = {
  ok: true;
  rows: InventoryRow[];
  nextCursor: string | null;
};

type AttentionItem = {
  id: string;
  kind: "coverage" | "error" | "required" | "unwired";
  title: string;
  problem: string;
  why: string;
  actionLabel: string;
  actionHref: string;
  contentKey?: string;
};

function editorHrefForKey(contentKey: string) {
  return `/admin/content#exact-content?q=${encodeURIComponent(contentKey)}`;
}

function buildAttentionItems(coverage: CoveragePayload, liveRows: InventoryRow[], errorRows: InventoryRow[]) {
  const items: AttentionItem[] = [];

  if (coverage.summary.unresolvedIssues > 0) {
    items.push({
      id: "required-editorial-decisions",
      kind: "required",
      title: `${coverage.summary.unresolvedIssues} required editorial decision${coverage.summary.unresolvedIssues === 1 ? "" : "s"}`,
      problem: "Required reader coverage still depends on unresolved governed source records.",
      why: "These are the unresolved records that remain after shadowed, retired, and optional source material is excluded.",
      actionLabel: "Review required decisions",
      actionHref: "/admin/content#unresolved-content"
    });
  }

  for (const row of liveRows.filter(isPublishedButUnwired)) {
    items.push({
      id: `unwired-${row.id}`,
      kind: "unwired",
      title: row.headline?.trim() || row.content_key,
      problem: "Published copy is not connected to a reader surface.",
      why: "The row is LIVE in the serving lane, but no verified reader call site requests this content-key family.",
      actionLabel: "Open content row",
      actionHref: editorHrefForKey(row.content_key),
      contentKey: row.content_key
    });
  }

  for (const row of errorRows) {
    items.push({
      id: `error-${row.id}`,
      kind: "error",
      title: row.headline?.trim() || row.content_key,
      problem: "This content row is in an error state.",
      why: "Content marked ERROR needs inspection before it can be treated as healthy editorial inventory.",
      actionLabel: "Inspect error",
      actionHref: editorHrefForKey(row.content_key),
      contentKey: row.content_key
    });
  }

  for (const row of coverage.coverage.filter((candidate) => candidate.state === "incomplete")) {
    items.push({
      id: `coverage-${row.id}`,
      kind: "coverage",
      title: row.label,
      problem: `${row.missing} required coverage item${row.missing === 1 ? " is" : "s are"} missing.`,
      why: row.detail,
      actionLabel: "Open content coverage",
      actionHref: `/admin/content/coverage#${row.id}`
    });
  }

  return items;
}

async function loadInventory(credential: string, status: "ERROR" | "LIVE") {
  const rows: InventoryRow[] = [];
  let cursor = "";

  do {
    const params = new URLSearchParams({
      status,
      visibility: "all",
      view: "inventory",
      limit: "1000"
    });
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(`/api/admin/generated-content?${params.toString()}`, {
      headers: adminCredentialHeaders(credential)
    });
    const body = await response.json().catch(() => null) as InventoryPayload | { error?: string } | null;
    if (!response.ok || !body || !("ok" in body) || body.ok !== true) {
      throw new Error(body && "error" in body && body.error ? body.error : `Content inventory request failed (${response.status}).`);
    }
    rows.push(...body.rows);
    cursor = body.nextCursor ?? "";
  } while (cursor);

  return rows;
}

export default function NeedsAttentionDashboard() {
  const [coverage, setCoverage] = useState<CoveragePayload | null>(null);
  const [liveRows, setLiveRows] = useState<InventoryRow[]>([]);
  const [errorRows, setErrorRows] = useState<InventoryRow[]>([]);
  const [credential, setCredential] = useState("");
  const [emergencySecret, setEmergencySecret] = useState(() => normalizeAdminSecret(window.localStorage.getItem(adminSecretStorageKey) ?? ""));
  const [loading, setLoading] = useState(false);
  // True until the owner-session check has decided whether there is a credential
  // to load with, so the sign-in gate never flashes while data is on its way.
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState("");

  async function loadAttention(nextCredential: string) {
    const normalized = normalizeAdminSecret(nextCredential);
    if (!normalized) return;
    setLoading(true);
    setError("");
    try {
      const coverageResponse = await fetch("/api/admin/content-coverage", {
        headers: adminCredentialHeaders(normalized)
      });
      const coverageBody = await coverageResponse.json().catch(() => null) as CoveragePayload | { error?: string } | null;
      if (!coverageResponse.ok || !coverageBody || !("ok" in coverageBody) || coverageBody.ok !== true) {
        throw new Error(coverageBody && "error" in coverageBody && coverageBody.error ? coverageBody.error : `Coverage request failed (${coverageResponse.status}).`);
      }
      const [nextLiveRows, nextErrorRows] = await Promise.all([
        loadInventory(normalized, "LIVE"),
        loadInventory(normalized, "ERROR")
      ]);
      setCredential(normalized);
      setCoverage(coverageBody);
      setLiveRows(nextLiveRows);
      setErrorRows(nextErrorRows);
    } catch (nextError) {
      setCoverage(null);
      setLiveRows([]);
      setErrorRows([]);
      setError(nextError instanceof Error ? nextError.message : "Needs attention could not be loaded.");
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
      if (nextCredential) void loadAttention(nextCredential);
      setBootstrapping(false);
    });
    const stopWatching = watchOwnerSessionAccessToken((token) => {
      if (!cancelled && token) void loadAttention(token);
    });
    return () => {
      cancelled = true;
      stopWatching();
    };
  }, []);

  const items = useMemo(() => coverage ? buildAttentionItems(coverage, liveRows, errorRows) : [], [coverage, liveRows, errorRows]);
  const groups = useMemo(() => ({
    required: items.filter((item) => item.kind === "required"),
    unwired: items.filter((item) => item.kind === "unwired"),
    errors: items.filter((item) => item.kind === "error"),
    coverage: items.filter((item) => item.kind === "coverage")
  }), [items]);

  function submitEmergencyAccess() {
    const normalized = normalizeAdminSecret(emergencySecret);
    if (!normalized) return;
    window.localStorage.setItem(adminSecretStorageKey, normalized);
    void loadAttention(normalized);
  }

  const groupDefinitions = [
    { key: "required", label: "Required editorial decisions", items: groups.required },
    { key: "unwired", label: "Published but not connected", items: groups.unwired },
    { key: "errors", label: "Content errors", items: groups.errors },
    { key: "coverage", label: "Required coverage gaps", items: groups.coverage }
  ];

  return (
    <main className="admin-dashboard">
      <section className="admin-main">
        <header className="admin-dashboard-header">
          <div>
            <a href="/admin/content" className="admin-breadcrumb">
              <ArrowLeft size={15} aria-hidden="true" /> Content Studio
            </a>
            <p className="admin-eyebrow">Content operations</p>
            <h1>Needs attention</h1>
            <p>Only work that can change required reader coverage or fix a broken content state appears here. Optional enrichment and historical records stay out of this queue.</p>
          </div>
          <div className="admin-toolbar-actions">
            <a className="admin-create-button admin-secondary-button" href="/admin/content/coverage">Content coverage</a>
            <button type="button" className="admin-create-button admin-secondary-button" onClick={() => credential && void loadAttention(credential)} disabled={!credential || loading}>
              <RefreshCw size={16} aria-hidden="true" />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        {!coverage && (loading || bootstrapping) && (
          <section className="admin-content-toolbar admin-initial-loading" aria-label="Loading" aria-live="polite">
            <div>
              <p className="admin-eyebrow">Connecting to Content Studio</p>
              <h2>Loading…</h2>
              <p>Checking access and loading coverage.</p>
            </div>
            <RefreshCw size={22} aria-hidden="true" />
          </section>
        )}

        {!coverage && !loading && !bootstrapping && (
          <>
            <AdminAccessGate disabled={!normalizeAdminSecret(emergencySecret) || loading} onChange={setEmergencySecret} onSubmit={submitEmergencyAccess} value={emergencySecret} />
            {error && <p role="alert">{error}</p>}
          </>
        )}

        {coverage && (
          <>
            <section className="admin-status-grid" aria-label="Needs attention summary">
              <article className="admin-status-card"><span>Needs attention</span><strong>{items.length}</strong></article>
              <article className="admin-status-card"><span>Healthy corpora</span><strong>{coverage.summary.complete}</strong></article>
              <article className="admin-status-card"><span>Optional enrichment</span><strong>{coverage.summary.unresolvedOptionalIssues}</strong></article>
              <article className="admin-status-card"><span>Historical, not actionable</span><strong>{coverage.summary.unresolvedShadowed + coverage.summary.unresolvedRetired}</strong></article>
            </section>

            {items.length === 0 ? (
              <section className="admin-empty-state" aria-label="No required content attention">
                <CheckCircle2 size={20} aria-hidden="true" />
                <strong>No required content work is waiting.</strong>
                <p>Required editorial decisions, known publishing errors, published-but-unconnected rows, and required corpus gaps are all clear. Optional enrichment remains available separately.</p>
                {coverage.summary.unresolvedOptionalIssues > 0 && <a href="/admin/content#unresolved-content">Review optional enrichment</a>}
              </section>
            ) : (
              <div className="admin-review-stack">
                {groupDefinitions.filter((group) => group.items.length > 0).map((group) => (
                  <section className="admin-hook-detail-section" key={group.key} aria-label={group.label}>
                    <div>
                      <p className="admin-eyebrow">{group.items.length} item{group.items.length === 1 ? "" : "s"}</p>
                      <h2>{group.label}</h2>
                    </div>
                    <div className="admin-review-stack">
                      {group.items.map((item) => (
                        <article className="admin-fallback-row" key={item.id}>
                          <div>
                            <div className="admin-fallback-row-actions">
                              <AlertTriangle size={16} aria-hidden="true" />
                              <strong>{item.title}</strong>
                            </div>
                            <p><strong>Problem:</strong> {item.problem}</p>
                            <p><strong>Why it matters:</strong> {item.why}</p>
                            {item.contentKey && <p><code>{item.contentKey}</code></p>}
                          </div>
                          <a className="admin-create-button" href={item.actionHref}>{item.actionLabel}</a>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {coverage.summary.unresolvedOptionalIssues > 0 && (
              <section className="admin-content-toolbar" aria-label="Optional editorial enrichment">
                <div>
                  <p className="admin-eyebrow">Optional</p>
                  <h2>Enrichment is separate from required work</h2>
                  <p>{coverage.summary.unresolvedOptionalIssues} optional decisions can add rotation or depth later. They are not counted in Needs attention because current reader coverage does not depend on them.</p>
                </div>
                <a className="admin-create-button admin-secondary-button" href="/admin/content#unresolved-content">Review optional enrichment</a>
              </section>
            )}

            <p className="admin-field-hint">Coverage calculated {new Date(coverage.generatedAt).toLocaleString()}.</p>
          </>
        )}
      </section>
    </main>
  );
}
