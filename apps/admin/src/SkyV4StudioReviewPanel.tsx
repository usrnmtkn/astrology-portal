import { useEffect, useMemo, useState } from "react";
import { announceContentUpdate } from "../../web/src/services/contentUpdateSignal";
import { adminCredentialHeaders } from "./adminSecret";

type Preview = { contentKey: string; page: string; servingEnabled: boolean };

type AdminRow = { id: string; content_key: string; status: string; event_type?: string | null; sections?: unknown; updated_at?: string | null };
type EditablePath = "tldrWhat" | "tldrTakeaway" | "placementArticle" | "fallback.hook" | "fallback.lived" | "fallback.turn" | "FullPageBody" | "FallbackBody";
type FieldDefinition = { path: EditablePath; label: string; description: string; rows: number };

interface Props {
  secret: string;
  contentKey: string;
  effectiveRecord: Record<string, unknown>;
  disabled: boolean;
}

const mainReaderFields: FieldDefinition[] = [
  { path: "tldrWhat", label: "TLDR What", description: "Current-sky mechanism, distinct from the article.", rows: 3 },
  { path: "tldrTakeaway", label: "TLDR Takeaway", description: "Reader priority or consequence.", rows: 3 },
  { path: "placementArticle", label: "Placement article", description: "Long-form reader layer.", rows: 12 }
];
const fallbackFields: FieldDefinition[] = [
  { path: "fallback.hook", label: "Hook", description: "Independent fallback opening.", rows: 4 },
  { path: "fallback.lived", label: "Lived", description: "Recognizable human consequence.", rows: 4 },
  { path: "fallback.turn", label: "Turn", description: "Independent turn or choice.", rows: 4 }
];
const lunarContextFields: FieldDefinition[] = [
  { path: "FullPageBody", label: "Full-page context", description: "Event-day context for the full article.", rows: 7 },
  { path: "FallbackBody", label: "Fallback context", description: "Event-day context for fallback copy.", rows: 4 }
];
const allContinuousFields = [...mainReaderFields, ...fallbackFields];

function valueAt(source: Record<string, unknown>, path: string): unknown { return path.split(".").reduce<unknown>((value, part) => record(value)[part], source); }
function setValueAt(source: Record<string, unknown>, path: string, value: unknown) {
  const next = structuredClone(source); const parts = path.split("."); let cursor = next;
  for (const part of parts.slice(0, -1)) { cursor[part] = { ...record(cursor[part]) }; cursor = cursor[part] as Record<string, unknown>; }
  cursor[parts.at(-1) ?? path] = value; return next;
}
function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(base);
  for (const [key, value] of Object.entries(override)) {
    const current = next[key];
    next[key] = current && value && typeof current === "object" && !Array.isArray(current) && typeof value === "object" && !Array.isArray(value)
      ? deepMerge(record(current), record(value)) : structuredClone(value);
  }
  return next;
}
function editableValues(source: Record<string, unknown>, definitions: FieldDefinition[] = allContinuousFields) {
  return Object.fromEntries(definitions.map((field) => [field.path, String(valueAt(source, field.path) ?? "")])) as Record<EditablePath, string>;
}
function rowSections(row: AdminRow) { return record(row.sections); }
function rowEffectiveRecord(row: AdminRow) { const sections = rowSections(row); return deepMerge(record(sections.packageRecord), record(sections.packageDraft)); }
function rowHasDraft(row: AdminRow) { return Object.keys(record(rowSections(row).packageDraft)).length > 0; }
function continuousIdentity(key: string) { const match = key.match(/^sky-placement\/article\/([^/]+)\/([^/]+)$/u); return match ? { planet: match[1], sign: match[2] } : null; }
function lunarContextIdentity(key: string) { const match = key.match(/^sky-placement\/lunar-context\/([^/]+)\/([^/]+)$/u); return match ? { eventType: match[1], planet: match[2] } : null; }
function titlePart(value: string) { return value.replace(/-/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()); }
function preferredRow(left: AdminRow, right: AdminRow) {
  const score = (row: AdminRow) => rowHasDraft(row) ? 3 : row.event_type === "sky-v4-reader-copy-draft" ? 2 : row.status === "LIVE" ? 1 : 0;
  if (score(right) !== score(left)) return score(right) > score(left) ? right : left;
  return String(right.updated_at ?? "") > String(left.updated_at ?? "") ? right : left;
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default function SkyV4StudioReviewPanel(props: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFields, setCurrentFields] = useState<Record<EditablePath, string>>(() => editableValues(props.effectiveRecord));
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [currentSaveMessage, setCurrentSaveMessage] = useState<string | null>(null);

  const provenance = record(props.effectiveRecord.studio_provenance);
  const contentType = String(props.effectiveRecord.studio_content_type ?? "");
  const isContinuousPlacement = contentType === "continuous-placement" && Boolean(continuousIdentity(props.contentKey));
  const isLunarContext = contentType === "placement-lunar-context" && Boolean(lunarContextIdentity(props.contentKey));
  const identity = continuousIdentity(props.contentKey);
  const lunarIdentity = lunarContextIdentity(props.contentKey);
  const currentFieldDefinitions = isLunarContext ? lunarContextFields : allContinuousFields;
  const values = (key: string) => Array.isArray(props.effectiveRecord[key]) ? (props.effectiveRecord[key] as unknown[]).map(String).filter(Boolean) : [];
  const readOnlyFields = values("studio_read_only_fields");
  const baselineFields = useMemo(
    () => editableValues(props.effectiveRecord, contentType === "placement-lunar-context" ? lunarContextFields : allContinuousFields),
    [props.contentKey, props.effectiveRecord, contentType]
  );

  useEffect(() => {
    setCurrentFields(editableValues(props.effectiveRecord, contentType === "placement-lunar-context" ? lunarContextFields : allContinuousFields));
    setCurrentSaveMessage(null);
  }, [props.contentKey, props.effectiveRecord]);

  const draftFields: Record<string, unknown> = {};
  if (isContinuousPlacement || isLunarContext) {
    for (const field of currentFieldDefinitions) draftFields[field.path] = currentFields[field.path];
  } else {
    for (const item of Array.isArray(props.effectiveRecord.studio_editable_fields) ? props.effectiveRecord.studio_editable_fields : []) {
      const field = record(item);
      if (typeof field.path !== "string") continue;
      draftFields[field.path] = valueAt(props.effectiveRecord, field.path);
    }
  }

  const currentDirty = (isContinuousPlacement || isLunarContext)
    && currentFieldDefinitions.some((field) => currentFields[field.path] !== baselineFields[field.path]);

  async function generatedContentRows(url: string) {
    const response = await fetch(url, { headers: adminCredentialHeaders(props.secret) });
    const payload = await response.json() as unknown;
    if (!response.ok) throw new Error(record(payload).error as string || `Content Studio request failed (${response.status}).`);
    if (!Array.isArray(payload)) throw new Error("Content Studio returned an unexpected row payload.");
    return payload as AdminRow[];
  }

  async function fetchCurrentStoredRow() {
    const rows = await generatedContentRows(`/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(props.contentKey)}&limit=20`);
    const exact = rows.filter((row) => row.content_key === props.contentKey).reduce<AdminRow | undefined>(
      (preferred, row) => preferred ? preferredRow(preferred, row) : row,
      undefined
    );
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
    if ((!isContinuousPlacement && !isLunarContext) || !currentDirty) return;
    setSavingCurrent(true);
    setError(null);
    setCurrentSaveMessage(null);
    try {
      const row = await fetchCurrentStoredRow();
      await saveDraft(row, currentFields);
      setCurrentSaveMessage(props.effectiveRecord.serving_enabled === true
        ? "Draft saved. The approved serving baseline remains live until this version is separately reviewed and released."
        : "Draft saved. This proposal remains non-serving until it receives explicit owner approval and a serving release.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The grouped SKY V4 draft could not be saved.");
    } finally {
      setSavingCurrent(false);
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
    } : isLunarContext ? {
      kind: "continuous",
      subjectBody: String(props.effectiveRecord.Planet ?? ""),
      subjectSign: "Aries"
    } : undefined;
    try {
      const response = await fetch("/api/admin/sky-v4-preview", {
        method: "POST",
        headers: { "content-type": "application/json", ...adminCredentialHeaders(props.secret) },
        body: JSON.stringify({
          contentKey: props.contentKey,
          draftFields,
          previewSurface,
          facts: isLunarContext ? { eventSign: "Aries", oppositeSign: "Libra" } : undefined
        })
      });
      const payload = await response.json() as { ok?: boolean; rendered?: Preview; error?: string };
      if (!response.ok || !payload.rendered) throw new Error(payload.error || `Preview failed (${response.status}).`);
      setPreview(payload.rendered);
    } catch (reason) {
      setPreview(null);
      setError(reason instanceof Error ? reason.message : "The canonical preview could not be assembled.");
    }
  }

  return <>
    {isContinuousPlacement && <section className="admin-hook-detail-section" aria-label="SKY V4 continuous placement grouped editor">
      <div>
        <p className="admin-eyebrow">Continuous placement editor</p>
        <h3>{identity ? `${titlePart(identity.planet)} in ${titlePart(identity.sign)}` : props.contentKey}</h3>
        <p>All six reader fields belong to this one placement record. The main article and fallback copy are separated here so you can edit them without hunting through different Content Studio areas.</p>
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

      <div className="admin-editor-guidance" aria-label="Fallback copy">
        <p className="admin-eyebrow">Fallback copy</p>
        <h4>Hook · Lived · Turn</h4>
        <p>These three fields are independent fallback writing. They should not be excerpts from the placement article or repeats of the TLDR.</p>
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

      <div className="admin-fallback-row-actions">
        <button type="button" disabled={props.disabled || savingCurrent || !currentDirty} onClick={() => void saveCurrentGroupedDraft()}>
          {savingCurrent ? "Saving draft…" : "Save grouped draft"}
        </button>
      </div>
      {currentSaveMessage && <p className="admin-editor-guidance">{currentSaveMessage}</p>}
    </section>}

    {isLunarContext && <section className="admin-hook-detail-section" aria-label="SKY V4 placement lunar-context grouped editor">
      <div>
        <p className="admin-eyebrow">Sky Placement · Lunar context</p>
        <h3>{lunarIdentity ? `${titlePart(lunarIdentity.planet)} · ${titlePart(lunarIdentity.eventType)}` : props.contentKey}</h3>
        <p>These two fields are one event-day module. The full-page and fallback versions stay together so they cannot drift into separate records.</p>
      </div>
      {lunarContextFields.map((field) => <label key={field.path}>
        <span><strong>{field.label}</strong> <code>{field.path}</code></span>
        <small>{field.description}</small>
        <textarea
          rows={field.rows}
          value={currentFields[field.path] ?? ""}
          disabled={props.disabled || savingCurrent}
          onChange={(event) => setCurrentFields((current) => ({ ...current, [field.path]: event.target.value }))}
        />
      </label>)}
      <div className="admin-fallback-row-actions">
        <button type="button" disabled={props.disabled || savingCurrent || !currentDirty} onClick={() => void saveCurrentGroupedDraft()}>
          {savingCurrent ? "Saving draft…" : "Save lunar-context draft"}
        </button>
      </div>
      {currentSaveMessage && <p className="admin-editor-guidance">{currentSaveMessage}</p>}
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
