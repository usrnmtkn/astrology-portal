import { AlertTriangle, BookOpenText, Check, Columns2, RefreshCw, Save, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { adminCredentialHeaders } from "./adminSecret";

type AspectPatternWriteupKind = "natal" | "activation";
type AuthoredStatus = "draft" | "reviewed" | "approved" | "deprecated";
type PreviewMode = "authored" | "fallback" | "compare";

type AspectPatternWriteupResponse = {
  ok?: boolean;
  error?: string;
  generatedAt?: string;
  persistence?: {
    path: string;
    configured: boolean;
    savedRows: number;
  };
  slots?: string[];
  fieldOrder?: string[];
  governedConditions?: string[];
  summary?: Record<string, number>;
  rows?: AspectPatternWriteupRow[];
};

type AspectPatternWriteupRow = {
  kind: AspectPatternWriteupKind;
  key: string;
  patternType: string;
  patternName: string;
  targetRole: string | null;
  targetRoleLabel: string | null;
  generatedContentId: string | null;
  contentKey: string;
  lastUpdated: string | null;
  status: AuthoredStatus;
  contentLevel: string;
  validationState: string;
  fallbackAvailable: boolean;
  productionSelected: boolean;
  contentLevels: Array<{ contentLevel: string; recordId: string; status: string; editable: boolean; available: boolean }>;
  eligibleConfidence: string[];
  houseEligibility: string;
  timingEligibility: string[];
  triggerModeEligibility: string[];
  sourceState: string;
  sourceIds: string[];
  record: AuthoredAspectPatternRecord;
  previews: AspectPatternPreview[];
};

type AuthoredAspectPatternRecord = {
  id: string;
  version: string;
  patternType: string;
  status: AuthoredStatus;
  eligibility: Record<string, unknown>;
  content: {
    eyebrow?: string;
    headline: string;
    overview: string;
    sections: Array<{ id: string; template: string; required: boolean; conditions?: unknown[] }>;
  };
  languageRules: {
    certainty?: string;
    prohibitedClaims: string[];
    prohibitedTerms?: string[];
  };
  provenance: {
    sourceIds: string[];
    editorialStatus: string;
    reviewedBy?: string;
    reviewedAt?: string;
  };
};

type AspectPatternPreview = {
  fixtureId: string;
  authored: ResolvedCopy;
  fallback: ResolvedCopy;
  changedFields: string[];
  selectedRecordId: string;
  selectedContentLevel: string;
  selectedTemplateId: string;
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
    missingSlots: string[];
    unknownSlots: string[];
  };
};

type ResolvedCopy = {
  source: {
    recordId: string;
    contentLevel: string;
    status: string;
  };
  content: {
    eyebrow?: string;
    headline: string;
    overview: string;
    sections: Array<{ id: string; body: string }>;
  };
  diagnostics: {
    templateId: string;
    missingSlots: string[];
    skippedSections: string[];
    validationWarnings?: string[];
    attemptedRecordIds?: string[];
  };
};

const statusOptions: AuthoredStatus[] = ["draft", "reviewed", "approved", "deprecated"];
const contentLevels = ["authored", "source_grounded_template", "madlib_fallback", "emergency_fallback"];
const natalWriteupFields = ["eyebrow", "headline", "overview", "how_it_works", "planet_roles", "pressure_or_support", "derived_point", "watch_for", "confidence_note"];
const activationWriteupFields = ["eyebrow", "headline", "overview", "current_emphasis", "transit_trigger", "pattern_role", "linked_patterns", "timing", "watch_for", "confidence_note"];

function titlePart(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function joinOrNone(values: string[] | undefined) {
  return values && values.length ? values.join(", ") : "none";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "not saved";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function sectionTemplate(record: AuthoredAspectPatternRecord, sectionId: string) {
  if (sectionId === "eyebrow") return record.content.eyebrow ?? "";
  if (sectionId === "headline") return record.content.headline ?? "";
  if (sectionId === "overview") return record.content.overview ?? "";
  return record.content.sections.find((section) => section.id === sectionId)?.template ?? "";
}

function updateRecordField(record: AuthoredAspectPatternRecord, sectionId: string, value: string) {
  if (sectionId === "eyebrow") {
    return { ...record, content: { ...record.content, eyebrow: value } };
  }
  if (sectionId === "headline") {
    return { ...record, content: { ...record.content, headline: value } };
  }
  if (sectionId === "overview") {
    return { ...record, content: { ...record.content, overview: value } };
  }

  const existing = record.content.sections.find((section) => section.id === sectionId);
  const sections = existing
    ? record.content.sections.map((section) => section.id === sectionId ? { ...section, template: value } : section)
    : record.content.sections.concat({ id: sectionId, template: value, required: false, conditions: [] });
  return { ...record, content: { ...record.content, sections } };
}

function copyText(copy: ResolvedCopy) {
  return [
    copy.content.eyebrow,
    copy.content.headline,
    copy.content.overview,
    ...copy.content.sections.map((section) => `${titlePart(section.id)}: ${section.body}`)
  ].filter(Boolean).join("\n\n");
}

function cloneRecord(record: AuthoredAspectPatternRecord) {
  return JSON.parse(JSON.stringify(record)) as AuthoredAspectPatternRecord;
}

export function AspectPatternWriteups({ initialKind = "natal", secret = "" }: { initialKind?: AspectPatternWriteupKind; secret?: string }) {
  const [kind, setKind] = useState<AspectPatternWriteupKind>(initialKind);
  const [response, setResponse] = useState<AspectPatternWriteupResponse | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState<AuthoredAspectPatternRecord | null>(null);
  const [draftPreviews, setDraftPreviews] = useState<AspectPatternPreview[]>([]);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("compare");
  const [statusFilter, setStatusFilter] = useState<AuthoredStatus | "all">("all");
  const [patternFilter, setPatternFilter] = useState("all");
  const [contentLevelFilter, setContentLevelFilter] = useState("all");
  const [validationFilter, setValidationFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const activeFieldRef = useRef<string>("overview");

  const rows = response?.rows ?? [];
  const selectedRow = rows.find((row) => row.key === selectedKey) ?? rows[0] ?? null;
  const fieldOrder = response?.fieldOrder ?? (kind === "activation" ? activationWriteupFields : natalWriteupFields);
  const slots = response?.slots ?? [];
  const summary = response?.summary ?? {};
  const patterns = useMemo(() => Array.from(new Set(rows.map((row) => row.patternType))).sort(), [rows]);
  const draftPreview = draftPreviews.length > 0 ? draftPreviews : selectedRow?.previews ?? [];
  const filteredRows = useMemo(() => rows.filter((row) => {
    const haystack = [
      row.record.id,
      row.record.content.headline,
      row.record.content.overview,
      ...row.record.content.sections.map((section) => section.template),
      ...row.sourceIds
    ].join(" ").toLowerCase();
    return (statusFilter === "all" || row.status === statusFilter)
      && (patternFilter === "all" || row.patternType === patternFilter)
      && (contentLevelFilter === "all" || row.contentLevels.some((level) => level.contentLevel === contentLevelFilter))
      && (validationFilter === "all" || row.validationState === validationFilter)
      && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
  }), [contentLevelFilter, patternFilter, query, rows, statusFilter, validationFilter]);

  async function loadWriteups(nextKind = kind) {
    setIsLoading(true);
    setError("");
    try {
      const result = await fetch(`/api/admin/aspect-pattern-writeups?kind=${nextKind}`, { method: "GET" });
      const json = await result.json() as AspectPatternWriteupResponse;
      if (!result.ok || json.ok === false) throw new Error(json.error || `Aspect-pattern write-ups failed with ${result.status}.`);
      setResponse(json);
      const firstRow = json.rows?.[0] ?? null;
      setSelectedKey((current) => json.rows?.some((row) => row.key === current) ? current : firstRow?.key ?? "");
      setDraft(firstRow ? cloneRecord(firstRow.record) : null);
      setDraftPreviews(firstRow?.previews ?? []);
      setMessage(`Loaded ${json.rows?.length ?? 0} ${nextKind === "activation" ? "Active Now" : "Natal"} write-ups.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Aspect-pattern write-ups failed.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadWriteups(kind);
  }, [kind]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => {
      setMessage((current) => current === message ? "" : current);
    }, 7_000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (selectedRow) {
      setDraft(cloneRecord(selectedRow.record));
      setDraftPreviews(selectedRow.previews);
    }
  }, [selectedRow?.key]);

  useEffect(() => {
    if (!draft) return;
    const timeout = window.setTimeout(() => {
      void previewDraft(draft);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [draft]);

  function selectKind(nextKind: AspectPatternWriteupKind) {
    setKind(nextKind);
    setSelectedKey("");
    setDraft(null);
    setPreviewMode("compare");
  }

  function updateField(sectionId: string, value: string) {
    activeFieldRef.current = sectionId;
    setDraft((current) => current ? updateRecordField(current, sectionId, value) : current);
  }

  function insertSlot(slot: string) {
    const field = activeFieldRef.current || "overview";
    const token = `{{${slot}}}`;
    setDraft((current) => {
      if (!current) return current;
      const currentValue = sectionTemplate(current, field);
      return updateRecordField(current, field, `${currentValue}${currentValue.endsWith(" ") || !currentValue ? "" : " "}${token}`);
    });
  }

  async function saveDraft(nextStatus?: AuthoredStatus) {
    if (!draft || !selectedRow) return;
    setIsLoading(true);
    setError("");
    try {
      const record = { ...draft, status: nextStatus ?? draft.status };
      const result = await fetch("/api/admin/aspect-pattern-writeups", {
        method: selectedRow.generatedContentId ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json",
          ...adminCredentialHeaders(secret)
        },
        body: JSON.stringify({
          kind,
          generatedContentId: selectedRow.generatedContentId,
          record,
          reviewer: "admin"
        })
      });
      const json = await result.json() as { ok?: boolean; error?: string; dashboard?: AspectPatternWriteupResponse };
      if (!result.ok || json.ok === false) throw new Error(json.error || `Save failed with ${result.status}.`);
      if (json.dashboard) setResponse(json.dashboard);
      setDraft(record);
      setMessage(`${record.id} saved as ${titlePart(record.status)}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save aspect-pattern write-up.");
    } finally {
      setIsLoading(false);
    }
  }

  async function previewDraft(record: AuthoredAspectPatternRecord) {
    try {
      const result = await fetch("/api/admin/aspect-pattern-writeups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, action: "preview", record })
      });
      const json = await result.json() as { ok?: boolean; error?: string; previews?: AspectPatternPreview[] };
      if (!result.ok || json.ok === false) throw new Error(json.error || `Preview failed with ${result.status}.`);
      setDraftPreviews(json.previews ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh aspect-pattern preview.");
    }
  }

  const preview = draftPreview[0];

  return (
    <section className="admin-template-page aspect-writeups-page" aria-label="Aspect pattern write-ups">
      <section className="admin-panel aspect-writeups-header" aria-label="Aspect pattern write-up controls">
        <div>
          <p className="admin-eyebrow">Content / Aspect Patterns</p>
          <h2>Aspect Patterns</h2>
          <p>Review, edit, preview, approve, and publish authored aspect-pattern write-ups through the normal content repository.</p>
        </div>
        <div className="admin-new-actions">
          <button className={kind === "natal" ? "admin-primary-button" : ""} type="button" onClick={() => selectKind("natal")}>Natal Write-ups</button>
          <button className={kind === "activation" ? "admin-primary-button" : ""} type="button" onClick={() => selectKind("activation")}>Active Now Write-ups</button>
          <button type="button" onClick={() => void loadWriteups(kind)} disabled={isLoading}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <section className="admin-panel aspect-diagnostics-error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>{error}</p>
        </section>
      )}
      {message && (
        <div className="admin-save-toast" role="status">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")} aria-label="Dismiss notification">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="admin-status-grid aspect-writeups-summary" aria-label="Aspect pattern write-up coverage summary">
        {[
          ["Routes", summary.totalRoutes ?? rows.length, "actual registry routes"],
          ["Approved authored", summary.approvedAuthored ?? 0, "eligible for production"],
          ["Fallback covered", summary.fallbackCovered ?? 0, "source fallback exists"],
          ["Selected", summary.selectedInProduction ?? 0, "production resolver selection"]
        ].map(([label, value, note]) => (
          <article className="admin-status-card" key={String(label)}>
            <span>{label}</span>
            <strong className="admin-stat-value">{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>

      <section className="admin-panel aspect-writeups-filters" aria-label="Aspect pattern filters">
        <label>
          <span>Pattern</span>
          <select value={patternFilter} onChange={(event) => setPatternFilter(event.target.value)}>
            <option value="all">All patterns</option>
            {patterns.map((pattern) => <option key={pattern} value={pattern}>{titlePart(pattern)}</option>)}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AuthoredStatus | "all")}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => <option key={status} value={status}>{titlePart(status)}</option>)}
          </select>
        </label>
        <label>
          <span>Content level</span>
          <select value={contentLevelFilter} onChange={(event) => setContentLevelFilter(event.target.value)}>
            <option value="all">All levels</option>
            {contentLevels.map((level) => <option key={level} value={level}>{titlePart(level)}</option>)}
          </select>
        </label>
        <label>
          <span>Validation</span>
          <select value={validationFilter} onChange={(event) => setValidationFilter(event.target.value)}>
            <option value="all">All validation</option>
            <option value="valid">Valid</option>
            <option value="needs_attention">Needs attention</option>
          </select>
        </label>
        <label className="aspect-writeups-search">
          <span>Search</span>
          <div className="admin-search-input-shell">
            <Search size={15} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Record ID, headline, section, source" />
          </div>
        </label>
      </section>

      <div className="aspect-writeups-layout">
        <section className="admin-panel aspect-writeups-list" aria-label={`${kind} aspect pattern records`}>
          <h3>{kind === "activation" ? "Active Now routes" : "Natal pattern records"}</h3>
          {filteredRows.map((row) => (
            <button
              className={row.key === selectedRow?.key ? "is-selected" : ""}
              key={row.key}
              type="button"
              onClick={() => {
                setSelectedKey(row.key);
                setDraft(cloneRecord(row.record));
                setDraftPreviews(row.previews);
              }}
            >
              <strong>{row.patternName}{row.targetRoleLabel ? `: ${row.targetRoleLabel}` : ""}</strong>
              <span>{row.record.id}</span>
              <small>{titlePart(row.status)} · {titlePart(row.validationState)} · {row.productionSelected ? "selected" : "fallback available"}</small>
            </button>
          ))}
          {!filteredRows.length && <p className="admin-empty">No aspect-pattern write-ups match these filters.</p>}
        </section>

        {selectedRow && draft ? (
          <section className="admin-panel aspect-writeups-editor" aria-label="Aspect pattern write-up editor">
            <header>
              <div>
                <p className="admin-eyebrow">{selectedRow.patternName}{selectedRow.targetRoleLabel ? ` / ${selectedRow.targetRoleLabel}` : ""}</p>
                <h3>{draft.id}</h3>
                <p>Version {draft.version} · {titlePart(selectedRow.contentLevel)} · Last updated {formatDate(selectedRow.lastUpdated)}</p>
              </div>
              <div className="admin-new-actions">
                <button type="button" onClick={() => void saveDraft("draft")} disabled={isLoading}>
                  <Save size={15} aria-hidden="true" />
                  Save draft
                </button>
                <button type="button" onClick={() => void saveDraft("reviewed")} disabled={isLoading}>
                  <Check size={15} aria-hidden="true" />
                  Mark reviewed
                </button>
                <button className="admin-primary-button" type="button" onClick={() => void saveDraft("approved")} disabled={isLoading}>
                  Publish approved
                </button>
              </div>
            </header>

            <div className="aspect-writeups-meta-grid">
              <Meta label="Record ID" value={draft.id} />
              <Meta label="Pattern type" value={draft.patternType} />
              <Meta label="Allowed confidence" value={joinOrNone(selectedRow.eligibleConfidence)} />
              <Meta label="House eligibility" value={selectedRow.houseEligibility} />
              <Meta label="Timing eligibility" value={joinOrNone(selectedRow.timingEligibility)} />
              <Meta label="Trigger modes" value={joinOrNone(selectedRow.triggerModeEligibility)} />
              <Meta label="Source state" value={selectedRow.sourceState} />
              <Meta label="Fallback available" value={selectedRow.fallbackAvailable ? "yes" : "no"} />
              <Meta label="Production selected" value={selectedRow.productionSelected ? "yes" : "no"} />
              <Meta label="Content repository" value={response?.persistence?.path ?? "generated_interpretations"} />
            </div>

            <label className="aspect-writeups-status">
              <span>Status</span>
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AuthoredStatus })}>
                {statusOptions.map((status) => <option key={status} value={status}>{titlePart(status)}</option>)}
              </select>
            </label>

            <section className="aspect-writeups-fields" aria-label="Governed editable fields">
              {fieldOrder.map((field) => (
                <label key={field}>
                  <span>{titlePart(field)}</span>
                  <textarea
                    value={sectionTemplate(draft, field)}
                    onChange={(event) => updateField(field, event.target.value)}
                    onFocus={() => {
                      activeFieldRef.current = field;
                    }}
                    rows={field === "headline" || field === "eyebrow" ? 2 : 4}
                  />
                </label>
              ))}
            </section>

            <section className="aspect-writeups-readonly" aria-label="Read-only governance">
              <h4>Governance</h4>
              <div>
                <Meta label="Required slots" value="validated by production resolver" />
                <Meta label="Available slots" value={`${slots.length} approved slots`} />
                <Meta label="Prohibited claims" value={joinOrNone(draft.languageRules.prohibitedClaims)} />
                <Meta label="Prohibited terms" value={joinOrNone(draft.languageRules.prohibitedTerms)} />
                <Meta label="Source IDs" value={joinOrNone(draft.provenance.sourceIds)} />
                <Meta label="Reviewer" value={draft.provenance.reviewedBy ?? "not set"} />
                <Meta label="Review date" value={draft.provenance.reviewedAt ?? "not set"} />
                <Meta label="Conditions" value={joinOrNone(response?.governedConditions)} />
              </div>
            </section>
          </section>
        ) : null}

        <aside className="admin-panel aspect-writeups-preview" aria-label="Aspect pattern preview">
          <header>
            <div>
              <p className="admin-eyebrow">Production resolver preview</p>
              <h3>Preview</h3>
            </div>
            <div className="admin-new-actions">
              <button className={previewMode === "authored" ? "admin-primary-button" : ""} type="button" onClick={() => setPreviewMode("authored")}>
                <BookOpenText size={15} aria-hidden="true" />
                Authored
              </button>
              <button className={previewMode === "fallback" ? "admin-primary-button" : ""} type="button" onClick={() => setPreviewMode("fallback")}>Fallback</button>
              <button className={previewMode === "compare" ? "admin-primary-button" : ""} type="button" onClick={() => setPreviewMode("compare")}>
                <Columns2 size={15} aria-hidden="true" />
                Compare
              </button>
            </div>
          </header>

          {preview ? (
            <>
              <div className="aspect-writeups-meta-grid">
                <Meta label="Fixture" value={preview.fixtureId} />
                <Meta label="Selected record" value={preview.selectedRecordId} />
                <Meta label="Selected level" value={preview.selectedContentLevel} />
                <Meta label="Template ID" value={preview.selectedTemplateId} />
                <Meta label="Changed fields" value={joinOrNone(preview.changedFields)} />
                <Meta label="Missing slots" value={joinOrNone(preview.validation.missingSlots)} />
                <Meta label="Skipped sections" value={joinOrNone(preview.authored.diagnostics.skippedSections)} />
                <Meta label="Warnings" value={joinOrNone(preview.validation.warnings.concat(preview.authored.diagnostics.validationWarnings ?? []))} />
              </div>

              {preview.validation.errors.length > 0 && (
                <div className="aspect-writeups-validation is-error">
                  <strong>Approval blocked</strong>
                  <p>{preview.validation.errors.join(", ")}</p>
                </div>
              )}

              {previewMode === "compare" ? (
                <div className="aspect-writeups-compare">
                  <PreviewColumn title="Authored result" copy={preview.authored} />
                  <PreviewColumn title="Approved fallback" copy={preview.fallback} />
                </div>
              ) : (
                <PreviewColumn title={previewMode === "authored" ? "Authored result" : "Approved fallback"} copy={previewMode === "authored" ? preview.authored : preview.fallback} />
              )}
            </>
          ) : (
            <p className="admin-empty">Select a record to preview its resolved write-up.</p>
          )}

          <section className="aspect-writeups-slots" aria-label="Slot insertion controls">
            <h4>Approved slots</h4>
            <div>
              {slots.map((slot) => (
                <button key={slot} type="button" onClick={() => insertSlot(slot)}>
                  {slot}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PreviewColumn({ copy, title }: { copy: ResolvedCopy; title: string }) {
  return (
    <section>
      <h4>{title}</h4>
      <p><code>{copy.source.contentLevel}</code> · <code>{copy.source.recordId}</code></p>
      <pre>{copyText(copy)}</pre>
    </section>
  );
}
