import { useEffect, useMemo, useState } from "react";
import { announceContentUpdate } from "../../web/src/services/contentUpdateSignal";
import { adminCredentialHeaders } from "./adminSecret";
import SkyFallbackVariantFamilyEditor from "./SkyFallbackVariantFamilyEditor";

type Preview = { contentKey: string; page: string; servingEnabled: boolean };

type AdminRow = {
  id: string;
  content_key: string;
  status: string;
  event_type?: string | null;
  sections?: unknown;
  updated_at?: string | null;
};

type EditablePath =
  | "tldrWhat"
  | "tldrTakeaway"
  | "placementArticle"
  | "fallback.hook"
  | "fallback.lived"
  | "fallback.turn";

type FieldDefinition = {
  path: EditablePath;
  label: string;
  description: string;
  rows: number;
};

type BatchFieldFilter = "all" | "hook" | "lived" | "turn";

interface Props {
  secret: string;
  contentKey: string;
  effectiveRecord: Record<string, unknown>;
  disabled: boolean;
}

const mainReaderFields: FieldDefinition[] = [
  {
    path: "tldrWhat",
    label: "TLDR What",
    description: "The current-sky mechanism. Keep it distinct from the article and fallback copy.",
    rows: 3
  },
  {
    path: "tldrTakeaway",
    label: "TLDR Takeaway",
    description: "The reader priority or consequence. It should add something rather than repeat the article.",
    rows: 3
  },
  {
    path: "placementArticle",
    label: "Placement article",
    description: "The long-form reader layer. Do not paste the TLDR or fallback sentences into this field.",
    rows: 12
  }
];

const fallbackFields: FieldDefinition[] = [
  {
    path: "fallback.hook",
    label: "Hook",
    description: "Legacy serving fallback opening. Keep this stable while the evergreen variant family is authored and reviewed.",
    rows: 4
  },
  {
    path: "fallback.lived",
    label: "Lived",
    description: "Legacy serving fallback consequence or recognizable situation.",
    rows: 4
  },
  {
    path: "fallback.turn",
    label: "Turn",
    description: "Legacy serving fallback turn. It remains unchanged until a separate replacement release is approved.",
    rows: 4
  }
];

const allContinuousFields = [...mainReaderFields, ...fallbackFields];
const planetOrder = ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"];
const signOrder = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function valueAt(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => record(current)[part], source);
}

function setValueAt(source: Record<string, unknown>, path: string, value: unknown) {
  const next = structuredClone(source);
  const parts = path.split(".");
  let cursor = next;
  for (const part of parts.slice(0, -1)) {
    cursor[part] = { ...record(cursor[part]) };
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts.at(-1) ?? path] = value;
  return next;
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(base);
  for (const [key, value] of Object.entries(override)) {
    const current = next[key];
    next[key] = current && value
      && typeof current === "object" && !Array.isArray(current)
      && typeof value === "object" && !Array.isArray(value)
      ? deepMerge(record(current), record(value))
      : structuredClone(value);
  }
  return next;
}

function editableValues(source: Record<string, unknown>) {
  return Object.fromEntries(allContinuousFields.map((field) => [
    field.path,
    String(valueAt(source, field.path) ?? "")
  ])) as Record<EditablePath, string>;
}

function rowSections(row: AdminRow) {
  return record(row.sections);
}

function rowEffectiveRecord(row: AdminRow) {
  const sections = rowSections(row);
  return deepMerge(record(sections.packageRecord), record(sections.packageDraft));
}

function rowHasDraft(row: AdminRow) {
  return Object.keys(record(rowSections(row).packageDraft)).length > 0;
}

function rowHasVariantFamilyDraft(row: AdminRow) {
  const family = record(rowSections(row).skyFallbackVariantFamilyDraft);
  return Array.isArray(family.lanes) && family.lanes.length > 0;
}

function continuousIdentity(contentKey: string) {
  const match = contentKey.match(/^sky-placement\/article\/([^/]+)\/([^/]+)$/u);
  return match ? { planet: match[1], sign: match[2] } : null;
}

function titlePart(value: string) {
  return value.replace(/-/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function preferredRow(left: AdminRow, right: AdminRow) {
  const score = (row: AdminRow) => rowHasDraft(row)
    ? 3
    : row.event_type === "sky-v4-reader-copy-draft"
      ? 2
      : row.status === "LIVE"
        ? 1
        : 0;
  const scoreDifference = score(right) - score(left);
  if (scoreDifference) return scoreDifference > 0 ? right : left;
  return String(right.updated_at ?? "") > String(left.updated_at ?? "") ? right : left;
}

function uniqueContinuousRows(rows: AdminRow[]) {
  const byKey = new Map<string, AdminRow>();
  for (const row of rows) {
    const identity = continuousIdentity(row.content_key);
    if (!identity) continue;
    const effective = rowEffectiveRecord(row);
    if (String(effective.studio_content_type ?? "") !== "continuous-placement") continue;
    const previous = byKey.get(row.content_key);
    byKey.set(row.content_key, previous ? preferredRow(previous, row) : row);
  }
  return [...byKey.values()].sort((left, right) => {
    const leftIdentity = continuousIdentity(left.content_key)!;
    const rightIdentity = continuousIdentity(right.content_key)!;
    return planetOrder.indexOf(leftIdentity.planet) - planetOrder.indexOf(rightIdentity.planet)
      || signOrder.indexOf(leftIdentity.sign) - signOrder.indexOf(rightIdentity.sign);
  });
}

function fallbackPath(filter: Exclude<BatchFieldFilter, "all">): EditablePath {
  return `fallback.${filter}` as EditablePath;
}

export default function SkyV4StudioReviewPanel(props: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFields, setCurrentFields] = useState<Record<EditablePath, string>>(() => editableValues(props.effectiveRecord));
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [currentSaveMessage, setCurrentSaveMessage] = useState<string | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchRows, setBatchRows] = useState<AdminRow[]>([]);
  const [planetFilter, setPlanetFilter] = useState("all");
  const [signFilter, setSignFilter] = useState("all");
  const [fieldFilter, setFieldFilter] = useState<BatchFieldFilter>("all");
  const [search, setSearch] = useState("");
  const [batchEdits, setBatchEdits] = useState<Record<string, Partial<Record<EditablePath, string>>>>({});
  const [savingBatchKey, setSavingBatchKey] = useState<string | null>(null);
  const [batchSaveMessage, setBatchSaveMessage] = useState<Record<string, string>>({});

  const provenance = record(props.effectiveRecord.studio_provenance);
  const contentType = String(props.effectiveRecord.studio_content_type ?? "");
  const isContinuousPlacement = contentType === "continuous-placement" && Boolean(continuousIdentity(props.contentKey));
  const identity = continuousIdentity(props.contentKey);
  const values = (key: string) => Array.isArray(props.effectiveRecord[key]) ? (props.effectiveRecord[key] as unknown[]).map(String).filter(Boolean) : [];
  const readOnlyFields = values("studio_read_only_fields");
  const baselineFields = useMemo(() => editableValues(props.effectiveRecord), [props.contentKey, props.effectiveRecord]);

  useEffect(() => {
    setCurrentFields(editableValues(props.effectiveRecord));
    setCurrentSaveMessage(null);
  }, [props.contentKey, props.effectiveRecord]);

  const draftFields: Record<string, unknown> = {};
  if (isContinuousPlacement) {
    for (const field of allContinuousFields) draftFields[field.path] = currentFields[field.path];
  } else {
    for (const item of Array.isArray(props.effectiveRecord.studio_editable_fields) ? props.effectiveRecord.studio_editable_fields : []) {
      const field = record(item);
      if (typeof field.path !== "string") continue;
      draftFields[field.path] = valueAt(props.effectiveRecord, field.path);
    }
  }

  const currentDirty = isContinuousPlacement && allContinuousFields.some((field) => currentFields[field.path] !== baselineFields[field.path]);
  const continuousRows = useMemo(() => uniqueContinuousRows(batchRows), [batchRows]);
  const visibleBatchRows = useMemo(() => continuousRows.filter((row) => {
    const rowIdentity = continuousIdentity(row.content_key)!;
    if (planetFilter !== "all" && rowIdentity.planet !== planetFilter) return false;
    if (signFilter !== "all" && rowIdentity.sign !== signFilter) return false;
    if (search.trim()) {
      const haystack = `${rowIdentity.planet} ${rowIdentity.sign} ${Object.values(editableValues(rowEffectiveRecord(row))).join(" ")}`.toLowerCase();
      if (!haystack.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  }), [continuousRows, planetFilter, signFilter, search]);

  async function generatedContentRows(url: string) {
    const response = await fetch(url, { headers: adminCredentialHeaders(props.secret) });
    const payload = await response.json() as unknown;
    if (!response.ok) throw new Error(record(payload).error as string || `Content Studio request failed (${response.status}).`);
    if (!Array.isArray(payload)) throw new Error("Content Studio returned an unexpected row payload.");
    return payload as AdminRow[];
  }

  async function fetchCurrentStoredRow() {
    const rows = await generatedContentRows(`/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(props.contentKey)}&limit=20`);
    const continuous = uniqueContinuousRows(rows);
    const exact = continuous.find((row) => row.content_key === props.contentKey);
    if (!exact) throw new Error(`Could not load the stored Content Studio row for ${props.contentKey}.`);
    return exact;
  }

  async function saveDraft(row: AdminRow, changes: Partial<Record<EditablePath, string>>) {
    const effective = rowEffectiveRecord(row);
    let nextDraft = structuredClone(effective);
    for (const [path, value] of Object.entries(changes)) {
      if (typeof value !== "string") continue;
      nextDraft = setValueAt(nextDraft, path, value);
    }
    const sections = { ...rowSections(row), packageDraft: nextDraft };
    const response = await fetch("/api/admin/generated-content", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...adminCredentialHeaders(props.secret) },
      body: JSON.stringify({
        id: row.id,
        sections,
        reviewStatus: "needs_review"
      })
    });
    const payload = await response.json() as unknown;
    if (!response.ok) throw new Error(record(payload).error as string || `Draft save failed (${response.status}).`);
    announceContentUpdate({
      contentKey: row.content_key,
      published: false,
      updatedAt: new Date().toISOString()
    });
    return payload;
  }

  async function saveCurrentGroupedDraft() {
    if (!isContinuousPlacement || !currentDirty) return;
    setSavingCurrent(true);
    setError(null);
    setCurrentSaveMessage(null);
    try {
      const row = await fetchCurrentStoredRow();
      await saveDraft(row, currentFields);
      setCurrentSaveMessage("Draft saved. The approved serving baseline remains live until this version is separately reviewed and released.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The grouped SKY V4 draft could not be saved.");
    } finally {
      setSavingCurrent(false);
    }
  }

  async function loadContinuousFallbacks() {
    setBatchLoading(true);
    setBatchError(null);
    try {
      const rows = await generatedContentRows("/api/admin/generated-content?status=all&visibility=all&surface=sky&limit=1000");
      const continuous = uniqueContinuousRows(rows);
      setBatchRows(continuous);
      if (planetFilter === "all" && identity?.planet) setPlanetFilter(identity.planet);
      if (continuous.length !== 120) {
        setBatchError(`Loaded ${continuous.length}/120 continuous placement records. Filters still work, but the batch review is incomplete.`);
      }
    } catch (reason) {
      setBatchError(reason instanceof Error ? reason.message : "Continuous placement fallbacks could not be loaded.");
    } finally {
      setBatchLoading(false);
    }
  }

  async function toggleBatchReview() {
    const next = !batchOpen;
    setBatchOpen(next);
    if (next && !batchRows.length && !batchLoading) await loadContinuousFallbacks();
  }

  function batchValue(row: AdminRow, path: EditablePath) {
    const edited = batchEdits[row.id]?.[path];
    if (typeof edited === "string") return edited;
    return String(valueAt(rowEffectiveRecord(row), path) ?? "");
  }

  function updateBatchValue(row: AdminRow, path: EditablePath, value: string) {
    setBatchEdits((current) => ({
      ...current,
      [row.id]: { ...current[row.id], [path]: value }
    }));
    setBatchSaveMessage((current) => ({ ...current, [row.content_key]: "" }));
  }

  async function saveBatchFallbackDraft(row: AdminRow) {
    const changes: Partial<Record<EditablePath, string>> = {};
    for (const field of fallbackFields) changes[field.path] = batchValue(row, field.path);
    setSavingBatchKey(row.content_key);
    setBatchError(null);
    try {
      await saveDraft(row, changes);
      setBatchSaveMessage((current) => ({
        ...current,
        [row.content_key]: "Draft saved · serving baseline unchanged"
      }));
      setBatchEdits((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      await loadContinuousFallbacks();
    } catch (reason) {
      setBatchSaveMessage((current) => ({
        ...current,
        [row.content_key]: reason instanceof Error ? reason.message : "Draft save failed."
      }));
    } finally {
      setSavingBatchKey(null);
    }
  }

  async function renderPreview() {
    setError(null);
    const previewSurface = contentType === "aspect" ? {
      kind: "continuous",
      subjectBody: String(props.effectiveRecord.BodyA ?? ""),
      subjectSign: String(props.effectiveRecord.SignA ?? ""),
      calculatedDate: String(props.effectiveRecord.calculatedDate ?? ""),
      calculatedOrb: String(props.effectiveRecord.calculatedOrb ?? "")
    } : undefined;
    try {
      const response = await fetch("/api/admin/sky-v4-preview", {
        method: "POST",
        headers: { "content-type": "application/json", ...adminCredentialHeaders(props.secret) },
        body: JSON.stringify({ contentKey: props.contentKey, draftFields, previewSurface })
      });
      const payload = await response.json() as { ok?: boolean; rendered?: Preview; error?: string };
      if (!response.ok || !payload.rendered) throw new Error(payload.error || `Preview failed (${response.status}).`);
      setPreview(payload.rendered);
    } catch (reason) {
      setPreview(null);
      setError(reason instanceof Error ? reason.message : "The canonical preview could not be assembled.");
    }
  }

  const fieldsForBatch = fieldFilter === "all"
    ? fallbackFields
    : fallbackFields.filter((field) => field.path === fallbackPath(fieldFilter));

  return <>
    {isContinuousPlacement && <section className="admin-hook-detail-section" aria-label="SKY V4 continuous placement grouped editor">
      <div>
        <p className="admin-eyebrow">Continuous placement editor</p>
        <h3>{identity ? `${titlePart(identity.planet)} in ${titlePart(identity.sign)}` : props.contentKey}</h3>
        <p>The main article, current serving fallback, and new evergreen fallback family are managed together here. New variant-family work stays non-serving until exact copy and a separate release are approved.</p>
      </div>

      <div className="admin-editor-guidance" aria-label="Main reader copy">
        <p className="admin-eyebrow">Main reader copy</p>
        <h4>TLDR + placement article</h4>
        {mainReaderFields.map((field) => <label key={field.path}>
          <span><strong>{field.label}</strong></span>
          <small>{field.description}</small>
          <textarea
            rows={field.rows}
            value={currentFields[field.path]}
            disabled={props.disabled || savingCurrent}
            onChange={(event) => setCurrentFields((current) => ({ ...current, [field.path]: event.target.value }))}
          />
        </label>)}
      </div>

      <div className="admin-editor-guidance" aria-label="Legacy fallback copy">
        <p className="admin-eyebrow">Legacy serving fallback</p>
        <h4>Hook · Lived · Turn</h4>
        <p>This is the currently governed fallback baseline. Keep it stable while the longer evergreen variant family is authored, reviewed, and separately released.</p>
        {fallbackFields.map((field) => <label key={field.path}>
          <span><strong>{field.label}</strong> <code>{field.path}</code></span>
          <small>{field.description}</small>
          <textarea
            rows={field.rows}
            value={currentFields[field.path]}
            disabled={props.disabled || savingCurrent}
            onChange={(event) => setCurrentFields((current) => ({ ...current, [field.path]: event.target.value }))}
          />
        </label>)}
      </div>

      <SkyFallbackVariantFamilyEditor
        secret={props.secret}
        contentKey={props.contentKey}
        headline={identity ? `${titlePart(identity.planet)} in ${titlePart(identity.sign)}` : props.contentKey}
        disabled={props.disabled}
      />

      <div className="admin-fallback-row-actions">
        <button type="button" disabled={props.disabled || savingCurrent || !currentDirty} onClick={() => void saveCurrentGroupedDraft()}>
          {savingCurrent ? "Saving draft…" : "Save grouped draft"}
        </button>
        <button type="button" disabled={props.disabled || batchLoading} onClick={() => void toggleBatchReview()}>
          {batchOpen ? "Hide legacy fallback review" : "Review all 120 legacy continuous fallbacks"}
        </button>
      </div>
      {currentSaveMessage && <p className="admin-editor-guidance">{currentSaveMessage}</p>}

      {batchOpen && <section className="admin-hook-detail-section" aria-label="Continuous placement legacy fallback batch review">
        <div>
          <p className="admin-eyebrow">Legacy continuous placement fallbacks</p>
          <h4>Review current Hook · Lived · Turn across all 120 placements</h4>
          <p>These are the existing fallback fields, not the new evergreen variant families. Saving here creates a non-serving Content Studio draft and never overwrites the approved serving baseline.</p>
        </div>

        <div className="admin-review-filter-grid" aria-label="Continuous fallback filters">
          <label>
            <span>Planet</span>
            <select value={planetFilter} onChange={(event) => setPlanetFilter(event.target.value)}>
              <option value="all">All planets</option>
              {planetOrder.map((planet) => <option key={planet} value={planet}>{titlePart(planet)}</option>)}
            </select>
          </label>
          <label>
            <span>Sign</span>
            <select value={signFilter} onChange={(event) => setSignFilter(event.target.value)}>
              <option value="all">All signs</option>
              {signOrder.map((sign) => <option key={sign} value={sign}>{titlePart(sign)}</option>)}
            </select>
          </label>
          <label>
            <span>Field</span>
            <select value={fieldFilter} onChange={(event) => setFieldFilter(event.target.value as BatchFieldFilter)}>
              <option value="all">Hook + Lived + Turn</option>
              <option value="hook">Hook only</option>
              <option value="lived">Lived only</option>
              <option value="turn">Turn only</option>
            </select>
          </label>
          <label>
            <span>Search copy</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search legacy fallback copy" />
          </label>
        </div>

        <div className="admin-fallback-row-actions">
          <strong>{batchLoading ? "Loading…" : `${visibleBatchRows.length} shown · ${continuousRows.length}/120 loaded`}</strong>
          <button type="button" disabled={batchLoading || props.disabled} onClick={() => void loadContinuousFallbacks()}>Refresh</button>
        </div>
        {batchError && <p role="alert">{batchError}</p>}

        <div className="admin-review-stack">
          {visibleBatchRows.map((row) => {
            const rowIdentity = continuousIdentity(row.content_key)!;
            const hasUnsavedEdit = Boolean(batchEdits[row.id] && Object.keys(batchEdits[row.id]).length);
            return <article className="admin-hook-detail-section" key={row.content_key}>
              <div>
                <p className="admin-eyebrow">{titlePart(rowIdentity.planet)} · {titlePart(rowIdentity.sign)}</p>
                <h4>{titlePart(rowIdentity.planet)} in {titlePart(rowIdentity.sign)}</h4>
                <p><code>{row.content_key}</code> · {rowHasDraft(row) ? "Existing draft" : "Serving baseline"}{rowHasVariantFamilyDraft(row) ? " · Evergreen family draft" : ""}</p>
              </div>
              {fieldsForBatch.map((field) => <label key={`${row.id}-${field.path}`}>
                <span><strong>{field.label}</strong> <code>{field.path}</code></span>
                <textarea
                  rows={4}
                  value={batchValue(row, field.path)}
                  disabled={props.disabled || savingBatchKey === row.content_key}
                  onChange={(event) => updateBatchValue(row, field.path, event.target.value)}
                />
              </label>)}
              <div className="admin-fallback-row-actions">
                <button
                  type="button"
                  disabled={props.disabled || savingBatchKey === row.content_key || !hasUnsavedEdit}
                  onClick={() => void saveBatchFallbackDraft(row)}
                >
                  {savingBatchKey === row.content_key ? "Saving draft…" : "Save fallback draft"}
                </button>
                {batchSaveMessage[row.content_key] && <small>{batchSaveMessage[row.content_key]}</small>}
              </div>
            </article>;
          })}
        </div>
      </section>}
    </section>}

    <section className="admin-hook-detail-section" aria-label="Production-parity SKY V4 preview">
      <div>
        <p className="admin-eyebrow">Canonical resolver preview</p>
        <h3>Render this draft through SKY V4</h3>
        <p>This calls the shared canonical resolver. It never promotes or serves the draft.</p>
      </div>
      <button type="button" disabled={props.disabled} onClick={() => void renderPreview()}>Render canonical preview</button>
      {error && <p role="alert">{error}</p>}
      {preview?.contentKey === props.contentKey && <div className="admin-editor-guidance" aria-label="Rendered SKY V4 reader preview">
        <strong>{preview.servingEnabled ? "Serving" : "Stage preview · serving OFF"}</strong>
        <pre>{preview.page}</pre>
      </div>}
    </section>

    <section className="admin-hook-detail-section" aria-label="SKY V4 source provenance">
      <p className="admin-eyebrow">Governed provenance</p>
      <p><strong>Approved baseline:</strong> <code>{String(props.effectiveRecord.source_baseline_sha256 ?? "Missing")}</code></p>
      <p><strong>Review:</strong> {String(provenance.reviewStatus ?? "Unknown")} via <code>{String(provenance.approvedVia ?? "Not recorded")}</code></p>
      <p><strong>Draft status:</strong> {String(props.effectiveRecord.studio_version_status ?? "draft")} · <strong>Serving:</strong> {props.effectiveRecord.serving_enabled === true ? "Enabled" : "OFF — owner review wall"}</p>
      {readOnlyFields.length > 0 && <p><strong>Read-only identity:</strong> {readOnlyFields.join(", ")}</p>}
    </section>
  </>;
}
