import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Search,
  ShieldCheck
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminCredentialHeaders, adminSecretStorageKey, normalizeAdminSecret } from "./adminSecret";
import { AdminAccessGate } from "./AdminStudioPrimitives";
import { loadOwnerSessionAccessToken, watchOwnerSessionAccessToken } from "./ownerSession";
import "./admin.css";
import "./admin-components.css";

type AskTldrQuestion = {
  id: string;
  displayQuestion: string;
  primaryIntent: string;
  secondaryIntents: string[];
  questionTypes: string[];
  defaultTimeWindow: string;
  evidenceFocus: string[];
};

type AskTldrPillar = {
  id: string;
  label: string;
  description: string;
  defaultEvidencePriority: string[];
  questions: AskTldrQuestion[];
};

type AuditPrimary = {
  id: string;
  factorKey: string | null;
  kind: string;
  temporalState: string;
  houses: number[];
  angles: string[];
  points: string[];
  governedMeaningStatus: string;
  governedCanonicalIds: string[];
  questionRelevanceStatus: string;
  questionRelevanceCanonicalIds: string[];
};

type AuditRow = {
  pillarId: string;
  questionId: string;
  question: string;
  questionTypes?: string[];
  timeWindow?: string;
  status: string;
  questionRelevantCandidateCount?: number;
  writerEligibleEvidenceIds?: string[];
  primary?: AuditPrimary | null;
  blockReason?: string | null;
};

type AskTldrStudioPayload = {
  ok: true;
  generatedAt: string;
  calibrationAsOf: string;
  reviewOnly: true;
  taxonomy: {
    version: string;
    status: string;
    ownerApproved: boolean;
    promotionAuthorized: boolean;
    runtimeEnabled: boolean;
    pillarCount: number;
    questionCount: number;
    routingPolicy: Record<string, boolean>;
  };
  answerModel: {
    version: string;
    status: string;
    ownerApproved: boolean;
    promotionAuthorized: boolean;
    runtimeEnabled: boolean;
    principles: Record<string, unknown>;
    evidenceKinds: string[];
    sourceContracts: Record<string, string[]>;
    answerContracts: Record<string, unknown>;
  };
  pillars: AskTldrPillar[];
  authorities: {
    natalAscendant: {
      id: string;
      status: string;
      approvedScope: string;
      meaning: string;
      meaningSha256: string;
      governance: {
        readerCopyApproved: boolean;
        servingChangesAuthorized: boolean;
        promotionAuthorized: boolean;
        runtimeEnabled: boolean;
        autoPublish: boolean;
      };
      boundaries: string[];
    };
  };
  audit: {
    schema: string;
    note: string;
    totalQuestions: number;
    calculatedCandidateCount: number;
    counts: Record<string, number>;
    byPillar: Record<string, Record<string, number>>;
    uniqueSemanticAuthorityGapCount: number;
    rows: AuditRow[];
  };
};

type StudioTab = "questions" | "calibration";

const cardStyle = {
  border: "1px solid var(--admin-border, #d9d9d9)",
  borderRadius: 14,
  padding: 18,
  background: "var(--admin-surface, #fff)"
} as const;

const mutedStyle = { opacity: 0.72 } as const;

function prettyToken(value: string) {
  return value.replaceAll("_", " ");
}

function windowLabel(value: string) {
  if (value === "1_month") return "1 month";
  if (value === "4_months") return "4 months";
  if (value === "12_months") return "12 months";
  return prettyToken(value);
}

function statusLabel(status: string) {
  if (status === "primary_question_ready") return "Ready in fixture";
  if (status === "no_relevant_fixture_evidence") return "No relevant fixture evidence";
  if (status === "primary_semantic_gap") return "Semantic authority gap";
  if (status === "primary_question_relevance_gap") return "Question relevance gap";
  return prettyToken(status);
}

function statusColor(status: string) {
  if (status === "primary_question_ready") return "#166534";
  if (status === "no_relevant_fixture_evidence") return "#92400e";
  return "#991b1b";
}

export default function AskTldrStudio() {
  const [payload, setPayload] = useState<AskTldrStudioPayload | null>(null);
  const [credential, setCredential] = useState("");
  const [emergencySecret, setEmergencySecret] = useState(() => normalizeAdminSecret(window.localStorage.getItem(adminSecretStorageKey) ?? ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<StudioTab>("questions");
  const [query, setQuery] = useState("");
  const [showOnlyBlocked, setShowOnlyBlocked] = useState(false);

  async function loadStudio(nextCredential: string) {
    const normalized = normalizeAdminSecret(nextCredential);
    if (!normalized) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/ask-tldr-studio", {
        headers: adminCredentialHeaders(normalized)
      });
      const body = await response.json().catch(() => null) as AskTldrStudioPayload | { error?: string } | null;
      if (!response.ok || !body || !("ok" in body) || body.ok !== true) {
        throw new Error(body && "error" in body && body.error ? body.error : `Ask TLDR request failed (${response.status}).`);
      }
      setCredential(normalized);
      setPayload(body);
    } catch (nextError) {
      setPayload(null);
      setError(nextError instanceof Error ? nextError.message : "Ask TLDR Content Studio could not be loaded.");
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
      if (nextCredential) void loadStudio(nextCredential);
    });
    const stopWatching = watchOwnerSessionAccessToken((token) => {
      if (!cancelled && token) void loadStudio(token);
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
    void loadStudio(normalized);
  }

  const filteredPillars = useMemo(() => {
    if (!payload) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return payload.pillars;
    return payload.pillars
      .map((pillar) => ({
        ...pillar,
        questions: pillar.questions.filter((question) => [
          question.displayQuestion,
          question.id,
          question.primaryIntent,
          ...question.secondaryIntents,
          ...question.questionTypes,
          ...question.evidenceFocus
        ].some((value) => value.toLowerCase().includes(needle)))
      }))
      .filter((pillar) => pillar.questions.length > 0 || pillar.label.toLowerCase().includes(needle));
  }, [payload, query]);

  const calibrationRows = useMemo(() => {
    if (!payload) return [];
    return payload.audit.rows
      .filter((row) => !showOnlyBlocked || row.status !== "primary_question_ready")
      .sort((left, right) => {
        const leftBlocked = left.status === "primary_question_ready" ? 1 : 0;
        const rightBlocked = right.status === "primary_question_ready" ? 1 : 0;
        return leftBlocked - rightBlocked || left.pillarId.localeCompare(right.pillarId) || left.questionId.localeCompare(right.questionId);
      });
  }, [payload, showOnlyBlocked]);

  return (
    <main className="admin-dashboard">
      <section className="admin-main" style={{ padding: "28px", maxWidth: 1320, margin: "0 auto", width: "100%" }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 22 }}>
          <div>
            <a href="/admin/content" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <ArrowLeft size={15} aria-hidden="true" />
              Content Studio
            </a>
            <p className="admin-eyebrow">Content Studio</p>
            <h1 style={{ marginBottom: 8 }}>Ask TLDR</h1>
            <p style={{ maxWidth: 820, margin: 0 }}>
              Review the evergreen question taxonomy, evidence focus, calibration coverage, and internal semantic authorities without changing reader serving or approval state.
            </p>
          </div>
          <div className="admin-toolbar-actions">
            <a className="admin-create-button" href="/admin/content/coverage">Content coverage</a>
            <button
              type="button"
              className="admin-create-button"
              onClick={() => credential && void loadStudio(credential)}
              disabled={!credential || loading}
            >
              <RefreshCw size={16} aria-hidden="true" />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
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
            <section style={{ ...cardStyle, marginBottom: 18 }} aria-label="Ask TLDR governance">
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <ShieldCheck size={20} aria-hidden="true" />
                <div>
                  <p className="admin-eyebrow" style={{ marginBottom: 4 }}>Review wall</p>
                  <strong>Questions and calibration are visible here, but this workspace does not approve or serve generated answers.</strong>
                  <p style={{ margin: "8px 0 0" }}>
                    Taxonomy: <strong>{payload.taxonomy.status}</strong> · owner approved: <strong>{String(payload.taxonomy.ownerApproved)}</strong> · promotion authorized: <strong>{String(payload.taxonomy.promotionAuthorized)}</strong> · runtime enabled: <strong>{String(payload.taxonomy.runtimeEnabled)}</strong>
                  </p>
                  <p style={{ margin: "5px 0 0" }}>
                    Answer model: <strong>{payload.answerModel.status}</strong> · owner approved: <strong>{String(payload.answerModel.ownerApproved)}</strong> · promotion authorized: <strong>{String(payload.answerModel.promotionAuthorized)}</strong> · runtime enabled: <strong>{String(payload.answerModel.runtimeEnabled)}</strong>
                  </p>
                </div>
              </div>
            </section>

            <div role="tablist" aria-label="Ask TLDR review sections" style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "questions"}
                className="admin-create-button"
                onClick={() => setTab("questions")}
              >
                Questions · {payload.taxonomy.questionCount}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "calibration"}
                className="admin-create-button"
                onClick={() => setTab("calibration")}
              >
                Answer calibration · {payload.audit.counts.primary_question_ready ?? 0}/{payload.audit.totalQuestions}
              </button>
            </div>

            {tab === "questions" && (
              <section role="tabpanel" aria-label="Ask TLDR questions">
                <section style={{ ...cardStyle, marginBottom: 18 }}>
                  <label style={{ display: "grid", gap: 7, maxWidth: 620 }}>
                    <span style={{ fontWeight: 650 }}>Search questions and evidence focus</span>
                    <span style={{ position: "relative" }}>
                      <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: 12, opacity: 0.6 }} />
                      <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search question, intent, or evidence…"
                        style={{ width: "100%", paddingLeft: 36 }}
                      />
                    </span>
                  </label>
                  <p style={{ margin: "10px 0 0", ...mutedStyle }}>
                    Question text is intent, not evidence. The chart must independently supply the facts used in an answer.
                  </p>
                </section>

                <div style={{ display: "grid", gap: 16 }}>
                  {filteredPillars.map((pillar) => (
                    <section key={pillar.id} style={cardStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
                        <div>
                          <p className="admin-eyebrow">{pillar.id}</p>
                          <h2 style={{ margin: "2px 0 6px" }}>{pillar.label}</h2>
                          <p style={{ margin: 0, maxWidth: 850 }}>{pillar.description}</p>
                        </div>
                        <strong>{pillar.questions.length} question{pillar.questions.length === 1 ? "" : "s"}</strong>
                      </div>

                      <details style={{ marginTop: 12 }}>
                        <summary style={{ cursor: "pointer", fontWeight: 650 }}>Default evidence priority</summary>
                        <ol style={{ marginBottom: 0 }}>
                          {pillar.defaultEvidencePriority.map((item) => <li key={item}>{item}</li>)}
                        </ol>
                      </details>

                      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                        {pillar.questions.map((question) => (
                          <article key={question.id} style={{ borderTop: "1px solid var(--admin-border, #e2e2e2)", paddingTop: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                              <div style={{ minWidth: 0, flex: "1 1 480px" }}>
                                <h3 style={{ margin: 0 }}>{question.displayQuestion}</h3>
                                <p style={{ margin: "5px 0 0", ...mutedStyle }}>{question.id}</p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <strong>{windowLabel(question.defaultTimeWindow)}</strong>
                                <p style={{ margin: "4px 0 0", ...mutedStyle }}>{question.questionTypes.map(prettyToken).join(" · ")}</p>
                              </div>
                            </div>
                            <p style={{ margin: "10px 0 0" }}>
                              <strong>Intent:</strong> {prettyToken(question.primaryIntent)}
                              {question.secondaryIntents.length ? ` · ${question.secondaryIntents.map(prettyToken).join(" · ")}` : ""}
                            </p>
                            <div style={{ marginTop: 8 }}>
                              <strong>Evidence focus</strong>
                              <ul style={{ margin: "5px 0 0" }}>
                                {question.evidenceFocus.map((focus) => <li key={focus}>{focus}</li>)}
                              </ul>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            )}

            {tab === "calibration" && (
              <section role="tabpanel" aria-label="Ask TLDR answer calibration">
                <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 18 }} aria-label="Calibration summary">
                  <div style={cardStyle}>
                    <p className="admin-eyebrow">Question-ready</p>
                    <strong style={{ fontSize: 28 }}>{payload.audit.counts.primary_question_ready ?? 0}/{payload.audit.totalQuestions}</strong>
                  </div>
                  <div style={cardStyle}>
                    <p className="admin-eyebrow">Fail-closed</p>
                    <strong style={{ fontSize: 28 }}>{payload.audit.counts.no_relevant_fixture_evidence ?? 0}</strong>
                  </div>
                  <div style={cardStyle}>
                    <p className="admin-eyebrow">Semantic gaps</p>
                    <strong style={{ fontSize: 28 }}>{payload.audit.uniqueSemanticAuthorityGapCount}</strong>
                  </div>
                  <div style={cardStyle}>
                    <p className="admin-eyebrow">Calculated candidates</p>
                    <strong style={{ fontSize: 28 }}>{payload.audit.calculatedCandidateCount}</strong>
                  </div>
                </section>

                <section style={{ ...cardStyle, marginBottom: 18 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <AlertTriangle size={19} aria-hidden="true" />
                    <div>
                      <strong>Frozen-facts calibration, not live reader coverage.</strong>
                      <p style={{ margin: "6px 0 0" }}>{payload.audit.note}</p>
                      <p style={{ margin: "6px 0 0", ...mutedStyle }}>
                        Calibration fixture time: {new Date(payload.calibrationAsOf).toLocaleString()} · Studio payload refreshed: {new Date(payload.generatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </section>

                <section style={{ ...cardStyle, marginBottom: 18 }} aria-label="Internal semantic authority">
                  <p className="admin-eyebrow">Internal semantic authority</p>
                  <h2 style={{ margin: "2px 0 8px" }}>Natal Ascendant</h2>
                  <p style={{ margin: 0 }}>{payload.authorities.natalAscendant.meaning}</p>
                  <p style={{ margin: "10px 0 0" }}>
                    <strong>Status:</strong> {prettyToken(payload.authorities.natalAscendant.status)} · <strong>scope:</strong> {payload.authorities.natalAscendant.approvedScope}
                  </p>
                  <p style={{ margin: "6px 0 0", ...mutedStyle }}>
                    Reader-copy approved: {String(payload.authorities.natalAscendant.governance.readerCopyApproved)} · serving authorized: {String(payload.authorities.natalAscendant.governance.servingChangesAuthorized)} · runtime enabled: {String(payload.authorities.natalAscendant.governance.runtimeEnabled)}
                  </p>
                  <ul style={{ marginBottom: 0 }}>
                    {payload.authorities.natalAscendant.boundaries.map((boundary) => <li key={boundary}>{boundary}</li>)}
                  </ul>
                </section>

                <section style={{ ...cardStyle, marginBottom: 18 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 650 }}>
                    <input type="checkbox" checked={showOnlyBlocked} onChange={(event) => setShowOnlyBlocked(event.target.checked)} />
                    Show only blocked / fail-closed questions
                  </label>
                </section>

                <div style={{ overflowX: "auto", border: "1px solid var(--admin-border, #d9d9d9)", borderRadius: 14 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                    <thead>
                      <tr>
                        {['Question', 'Pillar', 'Status', 'Primary evidence', 'Meaning', 'Question relevance'].map((label) => (
                          <th key={label} scope="col" style={{ textAlign: "left", padding: 12, borderBottom: "1px solid var(--admin-border, #d9d9d9)" }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {calibrationRows.map((row) => (
                        <tr key={row.questionId}>
                          <td style={{ padding: 12, verticalAlign: "top", borderBottom: "1px solid var(--admin-border, #ececec)" }}>
                            <strong>{row.question}</strong>
                            <div style={mutedStyle}>{row.questionId}</div>
                            {row.blockReason && <div style={{ marginTop: 5, color: "#991b1b" }}>{row.blockReason}</div>}
                          </td>
                          <td style={{ padding: 12, verticalAlign: "top", borderBottom: "1px solid var(--admin-border, #ececec)" }}>{prettyToken(row.pillarId)}</td>
                          <td style={{ padding: 12, verticalAlign: "top", borderBottom: "1px solid var(--admin-border, #ececec)" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: statusColor(row.status), fontWeight: 700 }}>
                              {row.status === "primary_question_ready" ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
                              {statusLabel(row.status)}
                            </span>
                          </td>
                          <td style={{ padding: 12, verticalAlign: "top", borderBottom: "1px solid var(--admin-border, #ececec)", overflowWrap: "anywhere" }}>
                            {row.primary?.factorKey ?? row.primary?.id ?? "—"}
                          </td>
                          <td style={{ padding: 12, verticalAlign: "top", borderBottom: "1px solid var(--admin-border, #ececec)" }}>
                            {row.primary?.governedMeaningStatus ?? "—"}
                          </td>
                          <td style={{ padding: 12, verticalAlign: "top", borderBottom: "1px solid var(--admin-border, #ececec)" }}>
                            {row.primary?.questionRelevanceStatus ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
