import { useState } from "react";
import { adminCredentialHeaders } from "./adminSecret";

type Preview = { contentKey: string; page: string; servingEnabled: boolean };

type EditablePath = "tldrWhat" | "tldrTakeaway" | "placementArticle" | "fallback.hook" | "fallback.lived" | "fallback.turn" | "FullPageBody" | "FallbackBody";
type FieldDefinition = { path: EditablePath; label: string; rows: number };

interface Props {
  secret: string;
  contentKey: string;
  effectiveRecord: Record<string, unknown>;
  disabled: boolean;
  hasChanges: boolean;
  onFieldChange: (path: string, value: string) => void;
  onSave: () => Promise<unknown>;
}

const mainReaderFields: FieldDefinition[] = [
  { path: "tldrWhat", label: "TLDR What", rows: 3 },
  { path: "tldrTakeaway", label: "TLDR Takeaway", rows: 3 },
  { path: "placementArticle", label: "Placement article", rows: 12 }
];
const fallbackFields: FieldDefinition[] = [
  { path: "fallback.hook", label: "Hook", rows: 4 },
  { path: "fallback.lived", label: "Lived", rows: 4 },
  { path: "fallback.turn", label: "Turn", rows: 4 }
];
const lunarContextFields: FieldDefinition[] = [
  { path: "FullPageBody", label: "Full-page context", rows: 7 },
  { path: "FallbackBody", label: "Fallback context", rows: 4 }
];
const allContinuousFields = [...mainReaderFields, ...fallbackFields];

function valueAt(source: Record<string, unknown>, path: string): unknown { return path.split(".").reduce<unknown>((value, part) => record(value)[part], source); }
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default function SkyV4StudioReviewPanel(props: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const provenance = record(props.effectiveRecord.studio_provenance);
  const contentType = String(props.effectiveRecord.studio_content_type ?? "");
  const isContinuousPlacement = contentType === "continuous-placement";
  const isLunarContext = contentType === "placement-lunar-context";
  const values = (key: string) => Array.isArray(props.effectiveRecord[key]) ? (props.effectiveRecord[key] as unknown[]).map(String).filter(Boolean) : [];
  const readOnlyFields = values("studio_read_only_fields");

  const draftFields: Record<string, unknown> = {};
  if (isContinuousPlacement || isLunarContext) {
    for (const field of isLunarContext ? lunarContextFields : allContinuousFields) {
      draftFields[field.path] = valueAt(props.effectiveRecord, field.path);
    }
  } else {
    for (const item of Array.isArray(props.effectiveRecord.studio_editable_fields) ? props.effectiveRecord.studio_editable_fields : []) {
      const field = record(item);
      if (typeof field.path !== "string") continue;
      draftFields[field.path] = valueAt(props.effectiveRecord, field.path);
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
        <h3>Main and fallback reader copy</h3>
      </div>

      <div className="admin-editor-guidance" aria-label="Main reader copy">
        <p className="admin-eyebrow">Main reader copy</p>
        <h4>TLDR + placement article</h4>
        {mainReaderFields.map((field) => <label key={field.path}>
          <span><strong>{field.label}</strong></span>
          <textarea
            rows={field.rows}
            value={String(valueAt(props.effectiveRecord, field.path) ?? "")}
            disabled={props.disabled}
            onChange={(event) => props.onFieldChange(field.path, event.target.value)}
          />
        </label>)}
      </div>

      <div className="admin-editor-guidance" aria-label="Fallback copy">
        <p className="admin-eyebrow">Fallback copy</p>
        <h4>Hook · Lived · Turn</h4>
        {fallbackFields.map((field) => <label key={field.path}>
          <span><strong>{field.label}</strong> <code>{field.path}</code></span>
          <textarea
            rows={field.rows}
            value={String(valueAt(props.effectiveRecord, field.path) ?? "")}
            disabled={props.disabled}
            onChange={(event) => props.onFieldChange(field.path, event.target.value)}
          />
        </label>)}
      </div>

      <div className="admin-fallback-row-actions">
        <button type="button" disabled={props.disabled || !props.hasChanges} onClick={() => void props.onSave()}>
          {props.disabled ? "Saving draft…" : "Save grouped draft"}
        </button>
      </div>
    </section>}

    {isLunarContext && <section className="admin-hook-detail-section" aria-label="SKY V4 placement lunar-context grouped editor">
      <div>
        <p className="admin-eyebrow">Sky Placement · Lunar context</p>
        <h3>Full-page and fallback event copy</h3>
      </div>
      {lunarContextFields.map((field) => <label key={field.path}>
        <span><strong>{field.label}</strong> <code>{field.path}</code></span>
        <textarea
          rows={field.rows}
          value={String(valueAt(props.effectiveRecord, field.path) ?? "")}
          disabled={props.disabled}
          onChange={(event) => props.onFieldChange(field.path, event.target.value)}
        />
      </label>)}
      <div className="admin-fallback-row-actions">
        <button type="button" disabled={props.disabled || !props.hasChanges} onClick={() => void props.onSave()}>
          {props.disabled ? "Saving draft…" : "Save lunar-context draft"}
        </button>
      </div>
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
