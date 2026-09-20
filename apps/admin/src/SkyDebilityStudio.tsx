import { useEffect, useRef, useState } from "react";
import { StudioButton, StudioTextarea } from "./StudioControls";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import type { SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";
import { skyDebilityFields, skyDebilityLegacyNames, skyDebilityTemplateErrors, skyDebilityTemplateSlots } from "../../web/src/content/skyDebilityCatalog";
import { SkyDebilityCompositionMap } from "./SkyDebilityCompositionMap";
import { buildSkyDebilityComposition } from "./skyDebilityComposition";
import {
  skyDebilityConditionLabel, skyDebilityPhraseGuidance, skyDebilityPhraseKey,
  skyDebilityPhraseNames, skyDebilityPhraseSets, skyDebilityPlacementId
} from "../../web/src/content/skyDebilityPhrases";
import {
  DIGNITY_SIGNS, TRADITIONAL_DIGNITY_PLANETS, planetSignDebilities, traditionalSkyDebilities
} from "../../web/src/services/planetSignDignity.mjs";
import type { SummaryCompositionRow } from "./skySummaryComposition";

const templateNames = ["openingHook", "experienceTemplate", "contextTemplate", "dignityExplanationOne", "dignityExplanationMany", "exampleOrder", "countLabel", "countUnit", "signConditionOne", "signConditionMany"];
const templateGuidance: Record<string, string> = {
  contextTemplate: "Edit the count-first explanation and response paragraph here. The count statement is emphasized. The planetList variable inserts inline links with each calculated sign and any Rx marker. Your placement wording supplies the functions and responses.",
  dignityExplanationOne: "A complete sentence for one qualifying planet. Keep {signTitle} so its calculated sign is named. Include the sentence's final punctuation.",
  dignityExplanationMany: "A complete sentence for several qualifying planets, explaining detriment or fall in everyday terms. Include the sentence's final punctuation.",
  signConditionOne: "Preserved for older saved paragraph templates containing {signConditionClause}. The count-first template uses the one-planet explanation instead. Keep {signTitle}.",
  signConditionMany: "Preserved for older saved paragraph templates containing {signConditionClause}. The count-first template uses the multiple-planet explanation instead.",
  exampleOrder: "Use all seven planet names once, separated by commas. This order selects examples only; it does not change the count or dignity."
};
const rowSignature = (row?: SummaryCompositionRow) => JSON.stringify([row?.id, row?.updated_at, row?.status, row?.body]);

export function SkyDebilityStudio({ rows, onEdit, busy }: {
  rows: SummaryCompositionRow[];
  onEdit: (field: SkySummaryField, initialBody?: string) => void;
  busy: boolean;
}) {
  const [selection, setSelection] = useState<Record<string, string>>({ Venus: "Scorpio", Mars: "Cancer", Saturn: "Aries" });
  // Illustration controls only, never a fallback for the reader's ephemeris.
  const [previewMotion, setPreviewMotion] = useState<Record<string, "direct" | "retrograde">>({ Saturn: "retrograde" });
  const [placement, setPlacement] = useState("venus/scorpio");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeEditor = useRef<HTMLElement>(null);
  const submitted = useRef(new Map<string, { body: string; signature: string }>());
  const savedRow = (key: string) => rows.find(row => row.content_key === key);
  const fieldByKey = (key: string) => skyDebilityFields.find(field => field.key === key)!;
  const savedBody = (key: string) => savedRow(key)?.body ?? fieldByKey(key)?.body;
  const read = (key: string) => Object.prototype.hasOwnProperty.call(drafts, key) ? drafts[key] : savedBody(key);
  const previewPositions = TRADITIONAL_DIGNITY_PLANETS.map(planet => ({
    planet,
    // "Not qualifying" is an editorial choice, not an absent sky fact.
    sign: selection[planet] || DIGNITY_SIGNS.find(sign => !planetSignDebilities(planet, sign).length)!,
    motion: previewMotion[planet] ?? "direct" as const
  }));
  const snapshot = traditionalSkyDebilities(previewPositions);
  const composition = buildSkyDebilityComposition(snapshot, read);
  const hasUnsaved = Object.entries(drafts).some(([key, value]) => value !== savedBody(key));
  const selected = skyDebilityPhraseSets.find(row => skyDebilityPlacementId(row.planetTitle, row.signTitle) === placement)!;

  useEffect(() => {
    if (!activeKey) return;
    activeEditor.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
    activeEditor.current?.scrollIntoView({ block: "nearest" });
  }, [activeKey]);
  useEffect(() => {
    // Preserve cancelled reviews and newer local typing; use the saved row
    // after a successful review instead of shadowing it with an earlier draft.
    const completed = [...submitted.current].filter(([key, value]) => {
      const row = rows.find(item => item.content_key === key);
      return row && !row.inventory_only && rowSignature(row) !== value.signature;
    });
    if (!completed.length) return;
    for (const [key] of completed) submitted.current.delete(key);
    setDrafts(current => {
      const next = { ...current };
      for (const [key, value] of completed) if (next[key] === value.body) delete next[key];
      return next;
    });
  }, [rows]);
  function selectSource(key: string) {
    if (busy || !fieldByKey(key)) return;
    setActiveKey(key);
    if (key.includes("/placement/")) setPlacement(key.split("/placement/")[1].split("/").slice(0, 2).join("/"));
    if (key === activeKey) {
      activeEditor.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
      activeEditor.current?.scrollIntoView({ block: "nearest" });
    }
  }
  function editor(key: string, guidance?: string, prefix = "field") {
    const field = fieldByKey(key);
    const saved = savedRow(key);
    const body = read(key) ?? "";
    const slots = skyDebilityTemplateSlots(key, body);
    const errors = skyDebilityTemplateErrors(key, body);
    const dirty = body !== savedBody(key);
    const inputId = `effort-wording-${prefix}-${key.replace(/[^a-z0-9]/giu, "-")}`;
    return <article key={key} aria-label={field.label}>
      <div>
        <label htmlFor={inputId}><strong>{field.label}</strong></label>
        {guidance && <p>{guidance}</p>}
        <StudioTextarea id={inputId} aria-label={field.label} rows={slots.length ? 4 : 2}
          disabled={busy} value={body} onChange={event => setDrafts(current => ({ ...current, [key]: event.target.value }))} />
        {slots.length > 0 && <p>Keep these slots: {slots.map(name => `{${name}}`).join(", ")}.</p>}
        {errors.length > 0 && <p role="alert">{errors.join(" ")}</p>}
        <p>{saved ? <ContentLiveStatusBadge row={saved} /> : <span>App default · no saved override</span>}{dirty ? " · Unsaved wording in preview" : ""}</p>
      </div>
      <div>
        <StudioButton type="button" disabled={busy || saved?.inventory_only || errors.length > 0} onClick={() => {
          submitted.current.set(key, { body, signature: rowSignature(saved) });
          onEdit({ ...field, allowedSlots: [...slots] }, body);
        }}>Review and save wording</StudioButton>
        {dirty && <StudioButton type="button" disabled={busy} onClick={() => setDrafts(current => {
          const next = { ...current }; delete next[key]; return next;
        })}>Discard wording changes</StudioButton>}
      </div>
    </article>;
  }
  const activeName = activeKey?.split("/").at(-1) ?? "";
  const activeGuidance = templateGuidance[activeName] ?? skyDebilityPhraseGuidance[activeName as keyof typeof skyDebilityPhraseGuidance];
  return <section className="admin-daily-glance-studio" aria-label="Detriment and fall summary editor" data-testid="sky-debility-studio">
    <header className="admin-section-heading-row">
      <div>
        <p className="admin-eyebrow">Sky Write-ups · Detriment and fall</p>
        <h3>Things may take more effort right now</h3>
        <p>Read the complete card first. Use Composition map to select wording and edit its source, or Full template to inspect the variables. All {skyDebilityPhraseSets.length} matched placement sets remain available below.</p>
        <p>Changes here update the working preview. Review and save wording opens the existing Save draft and Save &amp; publish controls; changing the preview alone does not publish anything.</p>
      </div>
    </header>

    <SkyDebilityCompositionMap composition={composition} read={read} onSelectSource={selectSource} busy={busy} hasUnsaved={hasUnsaved} positions={previewPositions} />

    {activeKey && <section ref={activeEditor} className="admin-editor-guidance" aria-label="Selected composition source" data-testid="sky-debility-selected-source">
      <header className="admin-section-heading-row"><h4>Selected source</h4><StudioButton type="button" onClick={() => setActiveKey(null)}>Close source editor</StudioButton></header>
      {editor(activeKey, activeGuidance, "selected")}
    </section>}

    <details className="admin-workspace-details">
      <AdminDisclosureSummary>Change preview placements</AdminDisclosureSummary>
      <p>These are examples for checking the composition, not the sky for a particular date. Changing a sign or motion does not change saved wording.</p>
      <div className="admin-daily-glance-context-form">
        {TRADITIONAL_DIGNITY_PLANETS.map(planet => <div key={planet}>
          <label htmlFor={`effort-preview-${planet}`}><span>{planet}</span>
            <AdminSelect id={`effort-preview-${planet}`} aria-label={`Preview ${planet} placement`} value={selection[planet] ?? ""}
              onChange={event => setSelection(current => ({ ...current, [planet]: event.target.value }))}>
              <option value="">Not in detriment or fall</option>
              {skyDebilityPhraseSets.filter(row => row.planetTitle === planet).map(row => <option key={row.signTitle} value={row.signTitle}>
                {row.signTitle} · {skyDebilityConditionLabel(planet, row.signTitle)}
              </option>)}
            </AdminSelect>
          </label>
          {planet !== "Sun" && planet !== "Moon" && <label htmlFor={`effort-motion-${planet}`}><span>Motion</span>
            <AdminSelect id={`effort-motion-${planet}`} aria-label={`Preview ${planet} motion`} value={previewMotion[planet] ?? "direct"}
              onChange={event => setPreviewMotion(current => ({ ...current, [planet]: event.target.value === "retrograde" ? "retrograde" : "direct" }))}>
              <option value="direct">Direct</option><option value="retrograde">Retrograde (Rx)</option>
            </AdminSelect>
          </label>}
        </div>)}
      </div>
    </details>
    <details className="admin-workspace-details">
      <AdminDisclosureSummary>Placement wording · {skyDebilityPhraseSets.length} matched sets</AdminDisclosureSummary>
      <label htmlFor="effort-placement-editor">Planet and sign to edit</label>
      <AdminSelect id="effort-placement-editor" aria-label="Planet and sign to edit" value={placement} onChange={event => setPlacement(event.target.value)}>
        {skyDebilityPhraseSets.map(row => <option key={skyDebilityPlacementId(row.planetTitle, row.signTitle)} value={skyDebilityPlacementId(row.planetTitle, row.signTitle)}>
          {row.planetTitle} in {row.signTitle} · {skyDebilityConditionLabel(row.planetTitle, row.signTitle)}
        </option>)}
      </AdminSelect>
      <p>Condition: {skyDebilityConditionLabel(selected.planetTitle, selected.signTitle)}. This is read from the shared dignity lookup and cannot be changed by editing the prose.</p>
      <div className="admin-daily-glance-pair-list">
        {skyDebilityPhraseNames.map(name => editor(skyDebilityPhraseKey(selected.planetTitle, selected.signTitle, name), skyDebilityPhraseGuidance[name]))}
      </div>
    </details>
    <details className="admin-workspace-details">
      <AdminDisclosureSummary>Card template, heading, and example order</AdminDisclosureSummary>
      <p>Experiences and situations are joined with “or”; responses and functions are joined with “and”. The planetList variable displays comma-separated placement links. Example order chooses up to three complete sets, not a difficulty score.</p>
      <div className="admin-daily-glance-pair-list">{templateNames.map(name => editor(`cms/sky-debility/${name}`, templateGuidance[name]))}</div>
    </details>
    <details className="admin-workspace-details">
      <AdminDisclosureSummary>Legacy wording for reference</AdminDisclosureSummary>
      <p>Preserved for recovery. These older title and body fields are not used by the new summary.</p>
      <div className="admin-daily-glance-pair-list">{skyDebilityLegacyNames.map(name => {
        const field = fieldByKey(`cms/sky-debility/${name}`);
        return <article key={field.key}><strong>{field.label}</strong><p>{savedBody(field.key)}</p></article>;
      })}</div>
    </details>
  </section>;
}
