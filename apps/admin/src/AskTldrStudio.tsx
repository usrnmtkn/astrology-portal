import {
  ArrowLeft,
  Check,
  CircleAlert,
  Eye,
  MessageCircleQuestion,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "./AdminStudioPrimitives";
import { adminCredentialHeaders, adminSecretStorageKey, normalizeAdminSecret } from "./adminSecret";
import { loadOwnerSessionAccessToken, watchOwnerSessionAccessToken } from "./ownerSession";
import "./admin.css";
import "./admin-components.css";
import "./admin-form-density.css";
import "./admin-content-studio-layout.css";

type AskQuestion = {
  id: string;
  displayQuestion: string;
  baseDisplayQuestion: string;
  primaryIntent: string;
  secondaryIntents: string[];
  questionTypes: string[];
  defaultTimeWindow: "1_month" | "4_months" | "12_months";
  evidenceFocus?: string[];
  edited: boolean;
  overlayUpdatedAt: string | null;
};

type AskPillar = {
  id: string;
  label: string;
  description: string;
  questions: AskQuestion[];
};

type AskHistory = {
  id: string;
  question: string;
  answer: string;
  status: string;
  reviewState: string;
  reviewerNotes: string;
  model: string | null;
  createdAt: string | null;
  diagnostics: Record<string, unknown>;
};

type AskPayload = {
  ok: true;
  ownerPreviewOnly: true;
  runtimeEnabled: false;
  governance: {
    status: string;
    promotionAuthorized: boolean;
    runtimeEnabled: boolean;
    pillarCount: number;
    questionCount: number;
  };
  storage: { available: boolean; error: string | null };
  chart: { ready: true; label: string } | { ready: false; reason: string };
  pillars: AskPillar[];
  history: AskHistory[];
};

type EvidenceItem = {
  id: string;
  role: "primary" | "supporting";
  label: string;
  kind: string;
  temporalState: string;
  exactAt: string | null;
  relevance: {
    status: string;
    matched: { houses: number[]; angles: string[]; points: string[] };
  };
};

type PreviewResponse = {
  ok: true;
  ownerPreviewOnly: true;
  runtimeEnabled: false;
  preparation: {
    allowed: boolean;
    reason?: string | null;
    evidence?: EvidenceItem[];
    relevanceReceiptSha256?: string;
    voiceReceiptSha256?: string;
  };
  preview: null | {
    draftId: string | null;
    questionText: string;
    answer: string;
    factLock: { passed?: boolean };
    judge: Record<string, unknown> | null;
    releaseStatus: string;
    blockers: string[];
    calls: Array<{ role: string; provider: string | null; model: string | null }>;
    classifier: unknown;
  };
};

type ApiError = { error?: string };
type View = "preview" | "questions" | "drafts";

const cardStyle = {
  border: "1px solid var(--admin-border, #d9d9d9)",
  borderRadius: 14,
  padding: 18,
  background: "var(--admin-surface, #fff)"
} as const;
const mutedStyle = { color: "var(--admin-text-muted, #666)" } as const;

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

function compactHash(value?: string | null) {
  return value ? `${value.slice(0, 10)}…${value.slice(-6)}` : "";
}

export default function AskTldrStudio() {
  const [payload, setPayload] = useState<AskPayload | null>(null);
  const [credential, setCredential] = useState("");
  const [emergencySecret, setEmergencySecret] = useState(() => normalizeAdminSecret(window.localStorage.getItem(adminSecretStorageKey) ?? ""));
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("preview");
  const [pillarId, setPillarId] = useState("career");
  const [questionId, setQuestionId] = useState("career.recognition");
  const [useFreeText, setUseFreeText] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>({});
  const [savingQuestionId, setSavingQuestionId] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState("");

  async function request<T>(nextCredential: string, init?: RequestInit): Promise<T> {
    const normalized = normalizeAdminSecret(nextCredential);
    if (!normalized) throw new Error("Owner access is required.");
    const headers = new Headers(init?.headers);
    for (const [key, value] of Object.entries(adminCredentialHeaders(normalized))) headers.set(key, value);
    if (init?.body) headers.set("content-type", "application/json");
    const response = await fetch("/api/admin/ask-tldr", { ...init, headers });
    const body = await response.json().catch(() => null) as T | ApiError | null;
    if (!response.ok || body === null) {
      const apiError = body as ApiError | null;
      throw new Error(apiError?.error || `Ask TLDR request failed (${response.status}).`);
    }
    return body as T;
  }

  function hydrate(next: AskPayload) {
    setQuestionDrafts(Object.fromEntries(next.pillars.flatMap((pillar) => pillar.questions.map((question) => [question.id, question.displayQuestion]))));
    setReviewNotes(Object.fromEntries(next.history.map((row) => [row.id, row.reviewerNotes])));
  }

  async function loadStudio(nextCredential: string) {
    const normalized = normalizeAdminSecret(nextCredential);
    if (!normalized) return;
    setLoading(true);
    setError("");
    try {
      const next = await request<AskPayload>(normalized);
      setCredential(normalized);
      setPayload(next);
      hydrate(next);
      const activePillar = next.pillars.find((pillar) => pillar.id === pillarId) ?? next.pillars[0];
      if (activePillar && !activePillar.questions.some((question) => question.id === questionId)) {
        setPillarId(activePillar.id);
        setQuestionId(activePillar.questions[0]?.id ?? "");
      }
    } catch (nextError) {
      setPayload(null);
      setError(nextError instanceof Error ? nextError.message : "Ask TLDR Studio could not be loaded.");
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
      setBootstrapping(false);
    });
    const stopWatching = watchOwnerSessionAccessToken((token) => {
      if (!cancelled && token) void loadStudio(token);
    });
    return () => {
      cancelled = true;
      stopWatching();
    };
  }, []);

  const selectedPillar = payload?.pillars.find((pillar) => pillar.id === pillarId) ?? null;
  const selectedQuestion = selectedPillar?.questions.find((question) => question.id === questionId) ?? null;
  const chartReason = payload && !payload.chart.ready ? payload.chart.reason : "";
  const visibleQuestions = useMemo(() => {
    if (!payload) return [] as Array<{ pillar: AskPillar; question: AskQuestion }>;
    const term = questionSearch.trim().toLowerCase();
    return payload.pillars.flatMap((pillar) => pillar.questions.map((question) => ({ pillar, question }))).filter(({ pillar, question }) => (
      !term
      || pillar.label.toLowerCase().includes(term)
      || question.displayQuestion.toLowerCase().includes(term)
      || question.primaryIntent.toLowerCase().includes(term)
      || question.id.toLowerCase().includes(term)
    ));
  }, [payload, questionSearch]);

  function changePillar(nextPillarId: string) {
    setPillarId(nextPillarId);
    const next = payload?.pillars.find((pillar) => pillar.id === nextPillarId);
    setQuestionId(next?.questions[0]?.id ?? "");
    setPreview(null);
  }

  function submitEmergencyAccess() {
    const normalized = normalizeAdminSecret(emergencySecret);
    if (!normalized) return;
    window.localStorage.setItem(adminSecretStorageKey, normalized);
    void loadStudio(normalized);
  }

  async function generatePreview() {
    if (!credential || !selectedPillar) return;
    if (useFreeText && !freeText.trim()) {
      setError("Type a question before generating a free-text preview.");
      return;
    }
    if (!useFreeText && !selectedQuestion) return;
    setGenerating(true);
    setError("");
    setPreview(null);
    try {
      const next = await request<PreviewResponse>(credential, {
        method: "POST",
        body: JSON.stringify({
          action: "preview",
          pillarId: selectedPillar.id,
          questionId: useFreeText ? undefined : selectedQuestion?.id,
          freeText: useFreeText ? freeText.trim() : undefined
        })
      });
      setPreview(next);
      if (next.preview?.draftId) await loadStudio(credential);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Ask TLDR preview could not be generated.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveQuestion(question: AskQuestion) {
    const displayQuestion = questionDrafts[question.id]?.trim() ?? "";
    if (!credential || !displayQuestion) return;
    setSavingQuestionId(question.id);
    try {
      await request(credential, { method: "POST", body: JSON.stringify({ action: "save_question", questionId: question.id, displayQuestion }) });
      await loadStudio(credential);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Question wording could not be saved.");
    } finally {
      setSavingQuestionId("");
    }
  }

  async function resetQuestion(question: AskQuestion) {
    if (!credential) return;
    setSavingQuestionId(question.id);
    try {
      await request(credential, { method: "POST", body: JSON.stringify({ action: "reset_question", questionId: question.id }) });
      await loadStudio(credential);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Question wording could not be reset.");
    } finally {
      setSavingQuestionId("");
    }
  }

  async function reviewDraft(row: AskHistory, decision: "approved" | "rejected") {
    if (!credential) return;
    setReviewingId(row.id);
    try {
      await request(credential, {
        method: "POST",
        body: JSON.stringify({ action: "review_preview", previewId: row.id, decision, reviewerNotes: reviewNotes[row.id] ?? "" })
      });
      await loadStudio(credential);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Preview review could not be saved.");
    } finally {
      setReviewingId("");
    }
  }

  if (!payload && (bootstrapping || loading)) {
    return <main className="admin-dashboard"><section className="admin-main" style={{ padding: 28 }}><h1>Loading Ask TLDR…</h1></section></main>;
  }

  if (!payload) {
    return (
      <main className="admin-dashboard">
        <section className="admin-main" style={{ padding: 28, maxWidth: 980, margin: "0 auto" }}>
          <a href="/admin/content"><ArrowLeft size={15} aria-hidden="true" /> Content Studio</a>
          <h1>Ask TLDR</h1>
          <AdminAccessGate disabled={!normalizeAdminSecret(emergencySecret)} onChange={setEmergencySecret} onSubmit={submitEmergencyAccess} value={emergencySecret} />
          {error && <p role="alert">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dashboard">
      <section className="admin-main" style={{ padding: 28, maxWidth: 1320, margin: "0 auto", width: "100%" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <a href="/admin/content"><ArrowLeft size={15} aria-hidden="true" /> Content Studio</a>
            <p className="admin-eyebrow">Owner preview · not reader-serving</p>
            <h1>Ask TLDR</h1>
            <p>Edit governed question wording, preview answers against your chart, and review saved calibration drafts.</p>
          </div>
          <button type="button" className="admin-create-button admin-secondary-button" onClick={() => void loadStudio(credential)} disabled={loading}>
            <RefreshCw size={16} aria-hidden="true" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        <section style={{ ...cardStyle, marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <strong><Sparkles size={16} aria-hidden="true" /> Owner preview only</strong>
          <span>Runtime: <strong>{payload.governance.runtimeEnabled ? "ON" : "OFF"}</strong></span>
          <span>Promotion: <strong>{payload.governance.promotionAuthorized ? "authorized" : "not authorized"}</strong></span>
          <span>{payload.governance.questionCount} questions · {payload.governance.pillarCount} pillars</span>
          <span>Chart: <strong>{payload.chart.ready ? payload.chart.label : "not available"}</strong></span>
        </section>

        {!payload.storage.available && <p role="alert" style={cardStyle}>Draft storage unavailable: {payload.storage.error}</p>}
        {!payload.chart.ready && <p role="alert" style={cardStyle}><CircleAlert size={17} aria-hidden="true" /> {chartReason}</p>}
        {error && <p role="alert" style={cardStyle}>{error}</p>}

        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }} aria-label="Ask TLDR Studio sections">
          <button type="button" className={view === "preview" ? "admin-create-button" : "admin-create-button admin-secondary-button"} onClick={() => setView("preview")}><Eye size={16} aria-hidden="true" /> Preview</button>
          <button type="button" className={view === "questions" ? "admin-create-button" : "admin-create-button admin-secondary-button"} onClick={() => setView("questions")}><MessageCircleQuestion size={16} aria-hidden="true" /> Questions ({payload.governance.questionCount})</button>
          <button type="button" className={view === "drafts" ? "admin-create-button" : "admin-create-button admin-secondary-button"} onClick={() => setView("drafts")}><Save size={16} aria-hidden="true" /> Draft review ({payload.history.length})</button>
        </nav>

        {view === "preview" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, .8fr) minmax(360px, 1.2fr)", gap: 18, alignItems: "start" }}>
            <section style={cardStyle}>
              <h2>Ask a question</h2>
              <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>Pillar
                <select value={pillarId} onChange={(event) => changePillar(event.target.value)}>{payload.pillars.map((pillar) => <option key={pillar.id} value={pillar.id}>{pillar.label}</option>)}</select>
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button type="button" className={!useFreeText ? "admin-create-button" : "admin-create-button admin-secondary-button"} onClick={() => setUseFreeText(false)}>Evergreen</button>
                <button type="button" className={useFreeText ? "admin-create-button" : "admin-create-button admin-secondary-button"} onClick={() => setUseFreeText(true)}>Free text</button>
              </div>
              {useFreeText ? (
                <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>Your question
                  <textarea rows={5} value={freeText} onChange={(event) => setFreeText(event.target.value)} placeholder={`Ask something about ${selectedPillar?.label ?? "this area of life"}…`} />
                </label>
              ) : (
                <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>Question
                  <select value={questionId} onChange={(event) => setQuestionId(event.target.value)}>{selectedPillar?.questions.map((question) => <option key={question.id} value={question.id}>{question.displayQuestion}</option>)}</select>
                </label>
              )}
              <p style={mutedStyle}>{selectedPillar?.description}</p>
              <button type="button" className="admin-create-button" onClick={() => void generatePreview()} disabled={generating || !payload.chart.ready || !payload.storage.available || (useFreeText ? !freeText.trim() : !selectedQuestion)}>
                <Sparkles size={16} aria-hidden="true" /> {generating ? "Generating governed preview…" : "Generate owner preview"}
              </button>
              <p style={{ ...mutedStyle, fontSize: 13 }}>Evergreen: 2 model calls. Free text: 3 model calls maximum. Public runtime remains disabled.</p>
            </section>

            <section style={{ ...cardStyle, minHeight: 340 }} aria-live="polite">
              {!preview && <p style={mutedStyle}>{generating ? "Calculating, writing, and checking…" : "Your reader-facing answer will appear here and save to Draft review."}</p>}
              {preview && !preview.preview && <><h2>Generation stopped safely</h2><p>{preview.preparation.reason ?? "The governed evidence was not sufficient for this question."}</p></>}
              {preview?.preview && (
                <>
                  <p className="admin-eyebrow">Reader-facing preview</p>
                  <h2>{preview.preview.questionText}</h2>
                  <div style={{ fontSize: 18, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{preview.preview.answer}</div>
                  <p>Fact lock: <strong>{preview.preview.factLock.passed ? "passed" : "blocked"}</strong> · Judge: <strong>{preview.preview.releaseStatus}</strong></p>
                  {preview.preview.blockers.length > 0 && <p role="alert">Release blockers: {preview.preview.blockers.join(", ")}</p>}
                  <details>
                    <summary>Why this answer / evidence inspector</summary>
                    {(preview.preparation.evidence ?? []).map((factor) => (
                      <div key={factor.id} style={{ ...cardStyle, padding: 12, marginTop: 8 }}>
                        <strong>{factor.role === "primary" ? "Primary" : "Supporting"}: {factor.label}</strong>
                        <p style={mutedStyle}>{factor.kind} · {factor.temporalState}{factor.exactAt ? ` · exact ${factor.exactAt}` : ""}</p>
                        <p>Matched: {[
                          ...factor.relevance.matched.houses.map((house) => `${house}H`),
                          ...factor.relevance.matched.angles,
                          ...factor.relevance.matched.points
                        ].join(", ") || "governed bridge"}</p>
                      </div>
                    ))}
                    <small style={mutedStyle}>Relevance {compactHash(preview.preparation.relevanceReceiptSha256)} · voice {compactHash(preview.preparation.voiceReceiptSha256)}</small>
                  </details>
                  <details><summary>Model calls and judge detail</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify({ calls: preview.preview.calls, judge: preview.preview.judge, classifier: preview.preview.classifier }, null, 2)}</pre></details>
                </>
              )}
            </section>
          </div>
        )}

        {view === "questions" && (
          <section>
            <div style={{ ...cardStyle, display: "flex", gap: 8, marginBottom: 12 }}><Search size={17} aria-hidden="true" /><input style={{ flex: 1 }} value={questionSearch} onChange={(event) => setQuestionSearch(event.target.value)} placeholder="Search question, pillar, intent, or ID" /></div>
            <div style={{ display: "grid", gap: 12 }}>
              {visibleQuestions.map(({ pillar, question }) => {
                const draft = questionDrafts[question.id] ?? question.displayQuestion;
                const changed = draft.trim() !== question.displayQuestion;
                return (
                  <article key={question.id} style={cardStyle}>
                    <p className="admin-eyebrow">{pillar.label} · {question.id}</p>
                    <label style={{ display: "grid", gap: 6 }}>Reader-facing question
                      <input value={draft} onChange={(event) => setQuestionDrafts((current) => ({ ...current, [question.id]: event.target.value }))} />
                    </label>
                    {question.edited && <p style={mutedStyle}>Package wording: {question.baseDisplayQuestion}</p>}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button type="button" className="admin-create-button" disabled={!changed || savingQuestionId === question.id || !payload.storage.available} onClick={() => void saveQuestion(question)}><Save size={15} aria-hidden="true" /> Save wording</button>
                      {question.edited && <button type="button" className="admin-create-button admin-secondary-button" disabled={savingQuestionId === question.id} onClick={() => void resetQuestion(question)}><RotateCcw size={15} aria-hidden="true" /> Reset to package</button>}
                    </div>
                    <details style={{ marginTop: 10 }}><summary>Advanced routing (read-only)</summary><p>Intent: {question.primaryIntent} · Types: {question.questionTypes.join(", ")} · Window: {question.defaultTimeWindow}</p><p>Secondary intents: {question.secondaryIntents.join(", ")}</p><p>Evidence focus: {question.evidenceFocus?.join(" · ") || "pillar defaults"}</p></details>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {view === "drafts" && (
          <section style={{ display: "grid", gap: 12 }}>
            {payload.history.length === 0 && <div style={cardStyle}><h2>No Ask TLDR drafts yet.</h2><p style={mutedStyle}>Generate an owner preview and it will appear here automatically.</p></div>}
            {payload.history.map((row) => (
              <article key={row.id} style={cardStyle}>
                <p className="admin-eyebrow">{row.reviewState.replaceAll("_", " ")} · {formatDate(row.createdAt)}</p>
                <h2>{row.question}</h2>
                <div style={{ fontSize: 17, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{row.answer}</div>
                <label style={{ display: "grid", gap: 6, marginTop: 12 }}>Owner notes<textarea rows={3} value={reviewNotes[row.id] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [row.id]: event.target.value }))} /></label>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button type="button" className="admin-create-button" disabled={reviewingId === row.id} onClick={() => void reviewDraft(row, "approved")}><Check size={15} aria-hidden="true" /> Approve preview</button>
                  <button type="button" className="admin-create-button admin-secondary-button" disabled={reviewingId === row.id} onClick={() => void reviewDraft(row, "rejected")}><X size={15} aria-hidden="true" /> Reject preview</button>
                </div>
                <details style={{ marginTop: 10 }}><summary>Evidence, judge, and release packet</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(row.diagnostics, null, 2)}</pre></details>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
