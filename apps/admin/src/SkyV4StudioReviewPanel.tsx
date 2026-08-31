import { useState } from "react";
import { adminCredentialHeaders } from "./adminSecret";

type Preview = { contentKey: string; page: string; servingEnabled: boolean };

interface Props {
  secret: string;
  contentKey: string;
  effectiveRecord: Record<string, unknown>;
  disabled: boolean;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export default function SkyV4StudioReviewPanel(props: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const provenance = record(props.effectiveRecord.studio_provenance);
  const contentType = String(props.effectiveRecord.studio_content_type ?? "");
  const values = (key: string) => Array.isArray(props.effectiveRecord[key]) ? (props.effectiveRecord[key] as unknown[]).map(String).filter(Boolean) : [];
  const readOnlyFields = values("studio_read_only_fields");
  const draftFields: Record<string, unknown> = {};
  for (const item of Array.isArray(props.effectiveRecord.studio_editable_fields) ? props.effectiveRecord.studio_editable_fields : []) {
    const field = record(item);
    if (!field || typeof field.path !== "string") continue;
    const path = field.path.split(".");
    let value: unknown = props.effectiveRecord;
    for (const part of path) value = record(value)?.[part];
    draftFields[field.path] = value;
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

  return <>
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
      <p><strong>Review:</strong> {String(provenance?.reviewStatus ?? "Unknown")} via <code>{String(provenance?.approvedVia ?? "Not recorded")}</code></p>
      <p><strong>Draft status:</strong> {String(props.effectiveRecord.studio_version_status ?? "draft")} · <strong>Serving:</strong> {props.effectiveRecord.serving_enabled === true ? "Enabled" : "OFF — owner review wall"}</p>
      {readOnlyFields.length > 0 && <p><strong>Read-only identity:</strong> {readOnlyFields.join(", ")}</p>}
    </section>
  </>;
}
