import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";
import { useEffect, useMemo, useRef, useState } from "react";
import { announceContentUpdate } from "../../web/src/services/contentUpdateSignal";
import { readGeneratedContentRows, saveGeneratedContentDraft } from "./generatedContentClient";
import { adminCredentialHeaders } from "./adminSecret";

type AdminRow = {
  id: string;
  content_key: string;
  status: string;
  event_type?: string | null;
  sections?: unknown;
  updated_at?: string | null;
};

type Variant = { id: string; text: string };
type SectionKey = "hooks" | "developments" | "shadows" | "closes";
type Lane = {
  id: string;
  label: string;
  hooks: Variant[];
  developments: Variant[];
  shadows: Variant[];
  closes: Variant[];
};
type VariantFamily = {
  schema: "sky-continuous-fallback-variant-family/v1";
  contentKey: string;
  familyVersion: string;
  selectionPolicy: "event-locked-v1";
  ownerApproved: false;
  servingEnabled: false;
  lanes: Lane[];
};

type VariantPreview = {
  contentKey: string;
  page: string;
  servingEnabled: boolean;
  selection: {
    familyVersion: string;
    eventInstanceId: string;
    selectionLockKey: string;
    laneId: string;
    laneLabel: string;
    hookId: string;
    developmentId: string;
    shadowId: string;
    closeId: string;
  };
};

interface Props {
  secret: string;
  contentKey: string;
  headline: string;
  disabled: boolean;
}

const sectionDefinitions: Array<{ key: SectionKey; label: string; description: string }> = [
  { key: "hooks", label: "Hook / opening", description: "Long evergreen opening. Explain the astrology and establish this lane's central argument." },
  { key: "developments", label: "Development", description: "Deepen the same mechanism with recognizable behavior and consequence." },
  { key: "shadows", label: "Shadow / tension", description: "Show how the same strength can become costly without changing the lane's subject." },
  { key: "closes", label: "Close", description: "Land the meaning without starting a second argument or assigning generic homework." }
];

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function rowSections(row: AdminRow) {
  return record(row.sections);
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

function rowEffectiveRecord(row: AdminRow) {
  const sections = rowSections(row);
  return deepMerge(record(sections.packageRecord), record(sections.packageDraft));
}

function rowHasDraft(row: AdminRow) {
  return Object.keys(record(rowSections(row).packageDraft)).length > 0;
}

function preferredRow(left: AdminRow, right: AdminRow) {
  const score = (row: AdminRow) => rowHasDraft(row)
    ? 3
    : row.event_type === "sky-v4-reader-copy-draft"
      ? 2
      : row.status === "LIVE"
        ? 1
        : 0;
  const difference = score(right) - score(left);
  if (difference) return difference > 0 ? right : left;
  return String(right.updated_at ?? "") > String(left.updated_at ?? "") ? right : left;
}

function defaultFamily(contentKey: string): VariantFamily {
  return {
    schema: "sky-continuous-fallback-variant-family/v1",
    contentKey,
    familyVersion: "draft-v1",
    selectionPolicy: "event-locked-v1",
    ownerApproved: false,
    servingEnabled: false,
    lanes: [{ id: "lane-1", label: "Lane 1", hooks: [], developments: [], shadows: [], closes: [] }]
  };
}

function normalizeVariant(value: unknown, fallbackId: string): Variant {
  const source = record(value);
  return {
    id: typeof source.id === "string" && source.id.trim() ? source.id.trim() : fallbackId,
    text: typeof source.text === "string" ? source.text : ""
  };
}

function normalizeFamily(value: unknown, contentKey: string): VariantFamily {
  const source = record(value);
  const lanes = Array.isArray(source.lanes) ? source.lanes : [];
  return {
    schema: "sky-continuous-fallback-variant-family/v1",
    contentKey,
    familyVersion: typeof source.familyVersion === "string" && source.familyVersion.trim() ? source.familyVersion.trim() : "draft-v1",
    selectionPolicy: "event-locked-v1",
    ownerApproved: false,
    servingEnabled: false,
    lanes: lanes.length ? lanes.map((laneValue, laneIndex) => {
      const lane = record(laneValue);
      const id = typeof lane.id === "string" && lane.id.trim() ? lane.id.trim() : `lane-${laneIndex + 1}`;
      const variants = (key: SectionKey) => (Array.isArray(lane[key]) ? lane[key] as unknown[] : [])
        .map((item, index) => normalizeVariant(item, `${key.slice(0, -1)}-${index + 1}`));
      return {
        id,
        label: typeof lane.label === "string" && lane.label.trim() ? lane.label : id,
        hooks: variants("hooks"),
        developments: variants("developments"),
        shadows: variants("shadows"),
        closes: variants("closes")
      };
    }) : defaultFamily(contentKey).lanes
  };
}

function familyFromRow(row: AdminRow, contentKey: string) {
  return normalizeFamily(rowSections(row).skyFallbackVariantFamilyDraft, contentKey);
}

function nextId(prefix: string, variants: Variant[]) {
  const existing = new Set(variants.map((variant) => variant.id));
  let index = variants.length + 1;
  while (existing.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function laneComplete(lane: Lane) {
  return sectionDefinitions.every(({ key }) => lane[key].some((variant) => variant.text.trim()));
}

export default function SkyFallbackVariantFamilyEditor(props: Props) {
  const [openedRow, setOpenedRow] = useState<AdminRow | null>(null);
  const context = useRef(0);
  const [family, setFamily] = useState<VariantFamily>(() => defaultFamily(props.contentKey));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventInstanceId, setEventInstanceId] = useState(`${props.contentKey}:preview-event-1`);
  const [preview, setPreview] = useState<VariantPreview | null>(null);

  const completeLaneCount = useMemo(() => family.lanes.filter(laneComplete).length, [family]);

  async function generatedContentRows() {
    const payload = await readGeneratedContentRows(`/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(props.contentKey)}&limit=20`, props.secret);
    const rows = payload.filter((row) => row.content_key === props.contentKey);
    if (!rows.length) throw new Error(`Could not load the stored Content Studio row for ${props.contentKey}.`);
    return rows.reduce(preferredRow);
  }

  async function loadFamily() {
    const generation = ++context.current;
    setOpenedRow(null);
    setLoading(true);
    setError(null);
    try {
      const row = await generatedContentRows();
      if (generation !== context.current) return;
      setOpenedRow(row);
      setFamily(familyFromRow(row, props.contentKey));
    } catch (reason) {
      if (generation === context.current) setError(reason instanceof Error ? reason.message : "Fallback variant family could not be loaded.");
    } finally {
      if (generation === context.current) setLoading(false);
    }
  }

  useEffect(() => {
    setSaving(false);
    setFamily(defaultFamily(props.contentKey));
    setEventInstanceId(`${props.contentKey}:preview-event-1`);
    setPreview(null);
    setMessage(null);
    void loadFamily();
    return () => { context.current += 1; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.contentKey, props.secret]);

  function updateLane(index: number, patch: Partial<Lane>) {
    setFamily((current) => ({
      ...current,
      lanes: current.lanes.map((lane, laneIndex) => laneIndex === index ? { ...lane, ...patch } : lane)
    }));
    setPreview(null);
    setMessage(null);
  }

  function addLane() {
    setFamily((current) => {
      let index = current.lanes.length + 1;
      const ids = new Set(current.lanes.map((lane) => lane.id));
      while (ids.has(`lane-${index}`)) index += 1;
      return {
        ...current,
        lanes: [...current.lanes, { id: `lane-${index}`, label: `Lane ${index}`, hooks: [], developments: [], shadows: [], closes: [] }]
      };
    });
    setPreview(null);
  }

  function removeLane(index: number) {
    setFamily((current) => ({ ...current, lanes: current.lanes.filter((_, laneIndex) => laneIndex !== index) }));
    setPreview(null);
  }

  function updateVariant(laneIndex: number, section: SectionKey, variantIndex: number, patch: Partial<Variant>) {
    const lane = family.lanes[laneIndex];
    updateLane(laneIndex, {
      [section]: lane[section].map((variant, index) => index === variantIndex ? { ...variant, ...patch } : variant)
    } as Partial<Lane>);
  }

  function addVariant(laneIndex: number, section: SectionKey) {
    const lane = family.lanes[laneIndex];
    const prefix = section.slice(0, -1);
    updateLane(laneIndex, {
      [section]: [...lane[section], { id: nextId(prefix, lane[section]), text: "" }]
    } as Partial<Lane>);
  }

  function removeVariant(laneIndex: number, section: SectionKey, variantIndex: number) {
    const lane = family.lanes[laneIndex];
    updateLane(laneIndex, {
      [section]: lane[section].filter((_, index) => index !== variantIndex)
    } as Partial<Lane>);
  }

  async function saveFamily() {
    const generation = context.current;
    const row = openedRow;
    if (!row || row.content_key !== props.contentKey) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const sections = rowSections(row);
      const saved = await saveGeneratedContentDraft(row, {
        ...sections,
        packageDraft: rowEffectiveRecord(row),
        skyFallbackVariantFamilyDraft: family
      }, props.secret);
      if (generation !== context.current) return;
      setOpenedRow(saved);
      announceContentUpdate({ contentKey: props.contentKey, published: false, updatedAt: new Date().toISOString() });
      setMessage("Variant family draft saved. The approved serving baseline and legacy fallback remain unchanged.");

    } catch (reason) {
      if (generation === context.current) setError(reason instanceof Error ? reason.message : "Fallback variant family could not be saved.");
    } finally {
      if (generation === context.current) setSaving(false);
    }
  }

  async function renderPreview() {
    setError(null);
    setPreview(null);
    try {
      const response = await fetch("/api/admin/sky-fallback-variant-preview", {
        method: "POST",
        headers: { "content-type": "application/json", ...adminCredentialHeaders(props.secret) },
        body: JSON.stringify({
          contentKey: props.contentKey,
          headline: props.headline,
          eventInstanceId,
          family
        })
      });
      const payload = await response.json() as { rendered?: VariantPreview; error?: string };
      if (!response.ok || !payload.rendered) throw new Error(payload.error || `Variant preview failed (${response.status}).`);
      setPreview(payload.rendered);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fallback variant preview could not be assembled.");
    }
  }

  return <section className="admin-hook-detail-section" aria-label="Evergreen fallback variant family">
    <div>
      <p className="admin-eyebrow">New fallback architecture · non-serving</p>
      <h4>Evergreen fallback variant family</h4>
      <p>Build longer approved sections in coherent lanes. A lane is selected once from the astronomical event instance and released family version, so refreshing the browser or returning on another day cannot reroll the article.</p>
      <p><strong>{completeLaneCount}/{family.lanes.length} lanes complete.</strong> Draft families do not replace the legacy serving fallback until exact copy and a separate release are approved.</p>
    </div>

    <div className="admin-review-filter-grid">
      <label>
        <span>Family version</span>
        <StudioInput
          value={family.familyVersion}
          disabled={props.disabled || saving || loading || !openedRow}
          onChange={(event) => {
            setFamily((current) => ({ ...current, familyVersion: event.target.value }));
            setPreview(null);
          }}
        />
        <small>Serving releases will pin this version for an event instance. Changing it intentionally creates a different selection namespace.</small>
      </label>
      <label>
        <span>Event instance ID for preview</span>
        <StudioInput value={eventInstanceId} disabled={props.disabled || saving || loading || !openedRow} onChange={(event) => setEventInstanceId(event.target.value)} />
        <small>Use the same value twice to verify refresh/day-to-day stability. Production will supply an immutable ephemeris event ID.</small>
      </label>
    </div>

    <div className="admin-review-stack">
      {family.lanes.map((lane, laneIndex) => <article className="admin-hook-detail-section" key={`${lane.id}-${laneIndex}`}>
        <div className="admin-review-filter-grid">
          <label>
            <span>Lane ID</span>
            <StudioInput value={lane.id} disabled={props.disabled || saving || loading || !openedRow} onChange={(event) => updateLane(laneIndex, { id: event.target.value })} />
          </label>
          <label>
            <span>Lane label</span>
            <StudioInput value={lane.label} disabled={props.disabled || saving || loading || !openedRow} onChange={(event) => updateLane(laneIndex, { label: event.target.value })} />
          </label>
        </div>
        <p><strong>{laneComplete(lane) ? "Complete lane" : "Incomplete lane"}</strong> · selection never mixes sections across lanes.</p>

        {sectionDefinitions.map((section) => <div className="admin-editor-guidance" key={`${lane.id}-${section.key}`}>
          <p className="admin-eyebrow">{section.label}</p>
          <p>{section.description}</p>
          {lane[section.key].map((variant, variantIndex) => <label key={`${lane.id}-${section.key}-${variantIndex}`}>
            <span><strong>Variant {variantIndex + 1}</strong> <code>{variant.id}</code></span>
            <StudioInput
              aria-label={`${section.label} variant ID`}
              value={variant.id}
              disabled={props.disabled || saving || loading || !openedRow}
              onChange={(event) => updateVariant(laneIndex, section.key, variantIndex, { id: event.target.value })}
            />
            <StudioTextarea
              rows={section.key === "closes" ? 4 : 7}
              value={variant.text}
              disabled={props.disabled || saving || loading || !openedRow}
              onChange={(event) => updateVariant(laneIndex, section.key, variantIndex, { text: event.target.value })}
            />
            <StudioButton type="button" disabled={props.disabled || saving || loading || !openedRow} onClick={() => removeVariant(laneIndex, section.key, variantIndex)}>Remove variant</StudioButton>
          </label>)}
          <StudioButton type="button" disabled={props.disabled || saving || loading || !openedRow} onClick={() => addVariant(laneIndex, section.key)}>Add {section.label.toLowerCase()} variant</StudioButton>
        </div>)}

        <StudioButton type="button" disabled={props.disabled || saving || loading || !openedRow || family.lanes.length === 1} onClick={() => removeLane(laneIndex)}>Remove lane</StudioButton>
      </article>)}
    </div>

    <div className="admin-fallback-row-actions">
      <StudioButton type="button" disabled={props.disabled || saving || loading || !openedRow} onClick={addLane}>Add lane</StudioButton>
      <StudioButton type="button" disabled={props.disabled || saving || loading || !openedRow} onClick={() => void saveFamily()}>{saving ? "Saving family…" : "Save variant family draft"}</StudioButton>
      <StudioButton type="button" disabled={props.disabled || loading || completeLaneCount === 0 || !eventInstanceId.trim()} onClick={() => void renderPreview()}>Preview event-locked fallback</StudioButton>
      <StudioButton type="button" disabled={props.disabled || loading} onClick={() => void loadFamily()}>{loading ? "Loading…" : "Reload family"}</StudioButton>
    </div>

    {message && <p className="admin-editor-guidance">{message}</p>}
    {error && <p role="alert">{error}</p>}
    {preview && <div className="admin-editor-guidance" aria-label="Event-locked fallback preview">
      <strong>Stage preview · serving OFF</strong>
      <p><strong>Locked selection:</strong> {preview.selection.laneLabel} · {preview.selection.hookId} / {preview.selection.developmentId} / {preview.selection.shadowId} / {preview.selection.closeId}</p>
      <p><code>{preview.selection.selectionLockKey}</code></p>
      <pre>{preview.page}</pre>
    </div>}
  </section>;
}
