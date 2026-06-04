import { Archive, Check, Eye, Plus, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { GeneratedContentMode } from "../services/generatedContent";
import "./admin.css";

type GeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";

type AdminGeneratedContentRow = {
  id: string;
  content_key: string;
  surface: GeneratedContentSurface;
  mode: GeneratedContentMode;
  status: GeneratedContentStatus;
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string | null;
  sections: Array<{ heading: string; body: string }> | Record<string, unknown> | null;
  reviewer_notes: string | null;
  prompt_version: string | null;
  model: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

type AdminGeneratedContentDraft = {
  id?: string;
  contentKey: string;
  surface: GeneratedContentSurface;
  mode: GeneratedContentMode;
  status: GeneratedContentStatus;
  eventType: string;
  targetDate: string;
  headline: string;
  summary: string;
  body: string;
  sectionsJson: string;
  factsJson: string;
  sourceSnapshotJson: string;
  knowledgeIds: string;
  reviewerNotes: string;
};

const adminSecretStorageKey = "tldrastro:contentAdminSecret";

function dateInputValue(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createAdminDraft(date = dateInputValue()): AdminGeneratedContentDraft {
  return {
    contentKey: `sky-daily-${date}`,
    surface: "sky",
    mode: "feed",
    status: "DRAFT",
    eventType: "daily_sky",
    targetDate: date,
    headline: "",
    summary: "",
    body: "",
    sectionsJson: "[]",
    factsJson: JSON.stringify({
      date,
      note: "Add the current astrology facts that should guide this interpretation."
    }, null, 2),
    sourceSnapshotJson: "{}",
    knowledgeIds: "",
    reviewerNotes: ""
  };
}

function adminDraftFromRow(row: AdminGeneratedContentRow): AdminGeneratedContentDraft {
  return {
    id: row.id,
    contentKey: row.content_key,
    surface: row.surface,
    mode: row.mode,
    status: row.status,
    eventType: row.event_type ?? "",
    targetDate: row.target_date ?? "",
    headline: row.headline ?? "",
    summary: row.summary ?? "",
    body: row.body ?? "",
    sectionsJson: JSON.stringify(row.sections ?? [], null, 2),
    factsJson: "{}",
    sourceSnapshotJson: "{}",
    knowledgeIds: "",
    reviewerNotes: row.reviewer_notes ?? ""
  };
}

function parseAdminJson(value: string, label: string) {
  try {
    return value.trim() ? JSON.parse(value) : {};
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

async function adminJsonRequest<T>(path: string, secret: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
      ...(options.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => null) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with ${response.status}.`);
  }

  return payload;
}

export function GeneratedContentAdminDashboard() {
  const [secret, setSecret] = useState(() => {
    try {
      return window.localStorage.getItem(adminSecretStorageKey) ?? "";
    } catch {
      return "";
    }
  });
  const [secretDraft, setSecretDraft] = useState(secret);
  const [surface, setSurface] = useState<GeneratedContentSurface | "all">("sky");
  const [status, setStatus] = useState<GeneratedContentStatus | "all">("DRAFT");
  const [rows, setRows] = useState<AdminGeneratedContentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminGeneratedContentDraft>(() => createAdminDraft());
  const [message, setMessage] = useState("Enter the content generation secret to review drafts.");
  const [isLoading, setIsLoading] = useState(false);
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;
  const canUseApi = secret.trim().length > 0;

  async function loadRows(nextStatus = status, nextSurface = surface) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: nextStatus,
        limit: "75"
      });

      if (nextSurface !== "all") {
        params.set("surface", nextSurface);
      }

      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?${params}`,
        secret
      );

      setRows(payload.rows ?? []);
      setMessage(`Loaded ${(payload.rows ?? []).length} ${nextStatus.toLowerCase()} rows.`);

      if (!payload.rows?.some((row) => row.id === selectedId)) {
        const firstRow = payload.rows?.[0] ?? null;
        setSelectedId(firstRow?.id ?? null);
        if (firstRow) {
          setDraft(adminDraftFromRow(firstRow));
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load generated content.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (canUseApi) {
      void loadRows();
    }
  }, [secret]);

  function saveSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSecret = secretDraft.trim();

    setSecret(nextSecret);
    try {
      if (nextSecret) {
        window.localStorage.setItem(adminSecretStorageKey, nextSecret);
      } else {
        window.localStorage.removeItem(adminSecretStorageKey);
      }
    } catch {
      return;
    }
  }

  function selectRow(row: AdminGeneratedContentRow) {
    setSelectedId(row.id);
    setDraft(adminDraftFromRow(row));
  }

  function updateDraft<K extends keyof AdminGeneratedContentDraft>(key: K, value: AdminGeneratedContentDraft[K]) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value
    }));
  }

  async function createDraft() {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            contentKey: draft.contentKey,
            surface: draft.surface,
            mode: draft.mode,
            status: draft.status,
            eventType: draft.eventType,
            targetDate: draft.targetDate || null,
            headline: draft.headline,
            summary: draft.summary,
            body: draft.body,
            sections: parseAdminJson(draft.sectionsJson, "Sections"),
            facts: parseAdminJson(draft.factsJson, "Facts"),
            sourceSnapshot: parseAdminJson(draft.sourceSnapshotJson, "Source snapshot"),
            knowledgeIds: draft.knowledgeIds.split(",").map((item) => item.trim()).filter(Boolean),
            reviewerNotes: draft.reviewerNotes
          })
        }
      );
      const row = payload.rows?.[0];

      if (row) {
        setSelectedId(row.id);
        setDraft(adminDraftFromRow(row));
      }

      setMessage("Draft created.");
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create draft.");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateDraft() {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{
        ok: boolean;
        generated: {
          headline: string;
          summary: string;
          body: string;
          sections: Array<{ heading: string; body: string }>;
        };
        saved: AdminGeneratedContentRow[];
      }>(
        "/api/generate-content",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            contentKey: draft.contentKey,
            surface: draft.surface,
            mode: draft.mode,
            eventType: draft.eventType,
            targetDate: draft.targetDate || undefined,
            facts: parseAdminJson(draft.factsJson, "Facts"),
            knowledgeIds: draft.knowledgeIds.split(",").map((item) => item.trim()).filter(Boolean),
            sourceSnapshot: parseAdminJson(draft.sourceSnapshotJson, "Source snapshot"),
            voiceNotes: draft.reviewerNotes
          })
        }
      );
      const row = payload.saved?.[0];

      if (row) {
        setSelectedId(row.id);
        setDraft(adminDraftFromRow(row));
      } else {
        setDraft((currentDraft) => ({
          ...currentDraft,
          headline: payload.generated.headline,
          summary: payload.generated.summary,
          body: payload.generated.body,
          sectionsJson: JSON.stringify(payload.generated.sections ?? [], null, 2)
        }));
      }

      setMessage("Generated a new OpenAI draft.");
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate content.");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveDraft(nextStatus = draft.status) {
    if (!draft.id) {
      await createDraft();
      return;
    }

    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "PATCH",
          body: JSON.stringify({
            id: draft.id,
            status: nextStatus,
            headline: draft.headline,
            summary: draft.summary,
            body: draft.body,
            sections: parseAdminJson(draft.sectionsJson, "Sections"),
            reviewerNotes: draft.reviewerNotes
          })
        }
      );
      const row = payload.rows?.[0];

      if (row) {
        setDraft(adminDraftFromRow(row));
        setSelectedId(row.id);
      }

      setMessage(nextStatus === "LIVE" ? "Published live." : nextStatus === "ARCHIVED" ? "Archived." : "Saved.");
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save draft.");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteDraft() {
    if (!draft.id || !window.confirm("Delete this generated content row? This cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?id=${encodeURIComponent(draft.id)}`,
        secret,
        { method: "DELETE" }
      );
      setDraft(createAdminDraft());
      setSelectedId(null);
      setMessage("Deleted.");
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete row.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <p className="admin-eyebrow">Internal content ops</p>
          <h1>Generated Content Review</h1>
          <p>Generate, edit, approve, publish, archive, or delete OpenAI-written astrology content before it appears in the public app.</p>
        </div>
        <a className="admin-public-link" href="/">
          Public app
        </a>
      </header>

      <section className="admin-secret-panel" aria-label="Admin access">
        <form onSubmit={saveSecret}>
          <label>
            <span>CONTENT_GENERATION_SECRET</span>
            <input
              type="password"
              value={secretDraft}
              onChange={(event) => setSecretDraft(event.target.value)}
              placeholder="Paste the secret for this session"
            />
          </label>
          <button type="submit">
            <Save size={16} aria-hidden="true" />
            Save Secret
          </button>
        </form>
        <p>{message}</p>
      </section>

      <section className="admin-workbench">
        <aside className="admin-list-panel" aria-label="Generated content list">
          <div className="admin-controls">
            <label>
              <span>Surface</span>
              <select value={surface} onChange={(event) => {
                const nextSurface = event.target.value as GeneratedContentSurface | "all";
                setSurface(nextSurface);
                void loadRows(status, nextSurface);
              }}>
                <option value="all">All</option>
                <option value="sky">Sky</option>
                <option value="you">You</option>
                <option value="natal">Natal</option>
                <option value="synastry">Synastry</option>
                <option value="composite">Composite</option>
                <option value="relationship">Relationship</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={status} onChange={(event) => {
                const nextStatus = event.target.value as GeneratedContentStatus | "all";
                setStatus(nextStatus);
                void loadRows(nextStatus, surface);
              }}>
                <option value="DRAFT">Draft</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="LIVE">Live</option>
                <option value="ARCHIVED">Archived</option>
                <option value="ERROR">Error</option>
                <option value="all">All</option>
              </select>
            </label>
            <button type="button" onClick={() => void loadRows()} disabled={isLoading || !canUseApi}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
            <button type="button" onClick={() => {
              const nextDraft = createAdminDraft();
              setDraft(nextDraft);
              setSelectedId(null);
            }}>
              <Plus size={16} aria-hidden="true" />
              New
            </button>
          </div>

          <div className="admin-row-list">
            {rows.map((row) => (
              <button
                type="button"
                key={row.id}
                className={`admin-row-card ${row.id === selectedId ? "selected" : ""}`}
                onClick={() => selectRow(row)}
              >
                <span className={`admin-status status-${row.status.toLowerCase()}`}>{row.status}</span>
                <strong>{row.headline || row.content_key}</strong>
                <small>{row.surface} · {row.mode} · {row.target_date ?? "no date"}</small>
              </button>
            ))}
            {rows.length === 0 && (
              <p className="admin-empty">No rows match this filter yet.</p>
            )}
          </div>
        </aside>

        <section className="admin-editor-panel" aria-label="Generated content editor">
          <div className="admin-editor-toolbar">
            <div>
              <p className="admin-eyebrow">{selectedRow ? "Editing existing row" : "Creating new row"}</p>
              <h2>{draft.headline || draft.contentKey}</h2>
            </div>
            <div className="admin-toolbar-actions">
              <button type="button" onClick={generateDraft} disabled={isLoading || !canUseApi}>
                <Sparkles size={16} aria-hidden="true" />
                Generate
              </button>
              <button type="button" onClick={() => void saveDraft()} disabled={isLoading || !canUseApi}>
                <Save size={16} aria-hidden="true" />
                Save
              </button>
              <button type="button" onClick={() => void saveDraft("REVIEWED")} disabled={isLoading || !draft.id}>
                <Check size={16} aria-hidden="true" />
                Reviewed
              </button>
              <button className="admin-live-button" type="button" onClick={() => void saveDraft("LIVE")} disabled={isLoading || !draft.id}>
                <Eye size={16} aria-hidden="true" />
                Publish Live
              </button>
              <button type="button" onClick={() => void saveDraft("ARCHIVED")} disabled={isLoading || !draft.id}>
                <Archive size={16} aria-hidden="true" />
                Archive
              </button>
              <button className="admin-danger-button" type="button" onClick={() => void deleteDraft()} disabled={isLoading || !draft.id}>
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </button>
            </div>
          </div>

          <div className="admin-form-grid">
            <label>
              <span>Content key</span>
              <input value={draft.contentKey} onChange={(event) => updateDraft("contentKey", event.target.value)} />
            </label>
            <label>
              <span>Surface</span>
              <select value={draft.surface} onChange={(event) => updateDraft("surface", event.target.value as GeneratedContentSurface)}>
                <option value="sky">Sky</option>
                <option value="you">You</option>
                <option value="natal">Natal</option>
                <option value="synastry">Synastry</option>
                <option value="composite">Composite</option>
                <option value="relationship">Relationship</option>
              </select>
            </label>
            <label>
              <span>Mode</span>
              <select value={draft.mode} onChange={(event) => updateDraft("mode", event.target.value as GeneratedContentMode)}>
                <option value="feed">Feed</option>
                <option value="in_depth">In-depth</option>
                <option value="article">Article</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={draft.status} onChange={(event) => updateDraft("status", event.target.value as GeneratedContentStatus)}>
                <option value="DRAFT">Draft</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="LIVE">Live</option>
                <option value="ARCHIVED">Archived</option>
                <option value="ERROR">Error</option>
              </select>
            </label>
            <label>
              <span>Event type</span>
              <input value={draft.eventType} onChange={(event) => updateDraft("eventType", event.target.value)} />
            </label>
            <label>
              <span>Target date</span>
              <input type="date" value={draft.targetDate} onChange={(event) => updateDraft("targetDate", event.target.value)} />
            </label>
          </div>

          <label className="admin-field-wide">
            <span>Headline</span>
            <input value={draft.headline} onChange={(event) => updateDraft("headline", event.target.value)} />
          </label>
          <label className="admin-field-wide">
            <span>Summary</span>
            <textarea value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} rows={3} />
          </label>
          <label className="admin-field-wide">
            <span>Body</span>
            <textarea value={draft.body} onChange={(event) => updateDraft("body", event.target.value)} rows={12} />
          </label>
          <label className="admin-field-wide">
            <span>Reviewer notes / extra voice notes</span>
            <textarea value={draft.reviewerNotes} onChange={(event) => updateDraft("reviewerNotes", event.target.value)} rows={3} />
          </label>

          <details className="admin-advanced">
            <summary>Generation inputs</summary>
            <label>
              <span>Knowledge IDs, comma separated</span>
              <input value={draft.knowledgeIds} onChange={(event) => updateDraft("knowledgeIds", event.target.value)} />
            </label>
            <label>
              <span>Facts JSON</span>
              <textarea value={draft.factsJson} onChange={(event) => updateDraft("factsJson", event.target.value)} rows={8} />
            </label>
            <label>
              <span>Source snapshot JSON</span>
              <textarea value={draft.sourceSnapshotJson} onChange={(event) => updateDraft("sourceSnapshotJson", event.target.value)} rows={8} />
            </label>
            <label>
              <span>Sections JSON</span>
              <textarea value={draft.sectionsJson} onChange={(event) => updateDraft("sectionsJson", event.target.value)} rows={6} />
            </label>
          </details>

          <section className="admin-preview" aria-label="Content preview">
            <p className="admin-eyebrow">User preview</p>
            <h3>{draft.headline || "Untitled"}</h3>
            {draft.summary && <strong>{draft.summary}</strong>}
            {draft.body.split(/\n{2,}/).filter(Boolean).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        </section>
      </section>
    </main>
  );
}
