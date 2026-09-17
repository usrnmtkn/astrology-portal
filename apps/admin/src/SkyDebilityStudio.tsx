import { useState } from "react";
import { StudioButton, StudioTextarea } from "./StudioControls";
import { AdminSelect } from "./AdminNativeControls";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import type { SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";
import {
  skyDebilityFields, skyDebilityLegacyNames, skyDebilityTemplateErrors
} from "../../web/src/content/skyDebilityCatalog";
import { assembleSkyDebilityCopy } from "../../web/src/content/skyDebilityAssembly";
import {
  skyDebilityConditionLabel, skyDebilityPhraseGuidance, skyDebilityPhraseKey,
  skyDebilityPhraseNames, skyDebilityPhraseSets, skyDebilityPlacementId
} from "../../web/src/content/skyDebilityPhrases";
import {
  DIGNITY_SIGNS, TRADITIONAL_DIGNITY_PLANETS, planetSignDebilities, traditionalSkyDebilities
} from "../../web/src/services/planetSignDignity.mjs";
import type { SummaryCompositionRow } from "./skySummaryComposition";

const templateNames = ["openingHook", "experienceTemplate", "contextTemplate", "signConditionOne", "signConditionMany", "exampleOrder", "countLabel", "countUnit"];
const templateGuidance: Record<string, string> = {
  contextTemplate: "Edit the shared detriment/fall explanation and the wording around the response here. This paragraph is used for every qualifying combination.",
  signConditionOne: "Edit the connecting wording for a single planet here. Keep {signTitle}; it inserts that planet's calculated sign, such as Aries for Saturn in Aries.",
  exampleOrder: "Use all seven planet names once, separated by commas. This order selects examples only; it does not change the count or dignity."
};
export function SkyDebilityStudio({ rows, onEdit, busy }: {
  rows: SummaryCompositionRow[];
  onEdit: (field: SkySummaryField, initialBody?: string) => void;
  busy: boolean;
}) {
  const [selection, setSelection] = useState<Record<string, string>>({ Venus: "Scorpio", Mars: "Cancer", Saturn: "Aries" });
  const [placement, setPlacement] = useState("venus/scorpio");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const savedRow = (key: string) => rows.find(row => row.content_key === key);
  const fieldByKey = (key: string) => skyDebilityFields.find(field => field.key === key)!;
  const savedBody = (key: string) => savedRow(key)?.body ?? fieldByKey(key)?.body;
  const read = (key: string) => Object.prototype.hasOwnProperty.call(drafts, key) ? drafts[key] : savedBody(key);
  const snapshot = traditionalSkyDebilities(TRADITIONAL_DIGNITY_PLANETS.map(planet => ({
    planet,
    // "Not qualifying" is a composition-preview choice, not an absent sky fact.
    sign: selection[planet] || DIGNITY_SIGNS.find(sign => !planetSignDebilities(planet, sign).length)!
  })));
  const preview = assembleSkyDebilityCopy(snapshot, read);
  const selected = skyDebilityPhraseSets.find(row => skyDebilityPlacementId(row.planetTitle, row.signTitle) === placement)!;
  const exampleLabel = (key: string) => {
    const row = skyDebilityPhraseSets.find(item => skyDebilityPlacementId(item.planetTitle, item.signTitle) === key);
    return row ? `${row.planetTitle} in ${row.signTitle}` : key;
  };
  function editor(key: string, guidance?: string) {
    const field = fieldByKey(key);
    const saved = savedRow(key);
    const body = read(key) ?? "";
    const errors = skyDebilityTemplateErrors(key, body);
    const dirty = body !== savedBody(key);
    const inputId = `effort-wording-${key.replace(/[^a-z0-9]/giu, "-")}`;
    return <article key={key} aria-label={field.label}>
      <div>
        <label htmlFor={inputId}><strong>{field.label}</strong></label>
        {guidance && <p>{guidance}</p>}
        <StudioTextarea id={inputId} aria-label={field.label} rows={field.allowedSlots.length ? 4 : 2}
          disabled={busy} value={body} onChange={event => setDrafts(current => ({ ...current, [key]: event.target.value }))} />
        {field.allowedSlots.length > 0 && <p>Keep these slots: {field.allowedSlots.map(name => `{${name}}`).join(", ")}.</p>}
        {errors.length > 0 && <p role="alert">{errors.join(" ")}</p>}
        <p><ContentLiveStatusBadge row={saved ?? { id: `builtin:${key}` }} />{dirty ? " · Unsaved wording in preview" : ""}</p>
      </div>
      <div>
        <StudioButton type="button" disabled={busy || errors.length > 0} onClick={() => onEdit(field, body)}>Review and save wording</StudioButton>
        {dirty && <StudioButton type="button" disabled={busy} onClick={() => setDrafts(current => {
          const next = { ...current }; delete next[key]; return next;
        })}>Discard wording changes</StudioButton>}
      </div>
    </article>;
  }
  return <section className="admin-daily-glance-studio" aria-label="Detriment and fall summary editor" data-testid="sky-debility-studio">
    <header className="admin-section-heading-row">
      <div>
        <p className="admin-eyebrow">Sky Write-ups · Detriment and fall</p>
        <h3>Things may take more effort right now</h3>
        <p>Edit the card template and all {skyDebilityPhraseSets.length} matched placement sets here. Each experience stays with its situation and response. Planet names, signs, dignity, and counts remain calculated.</p>
        <p>Review and save wording opens the existing Save draft and Save &amp; publish controls. Editing this preview does not publish anything.</p>
      </div>
    </header>

    <section aria-label="Effort summary combination preview">
      <h4>Combination preview</h4>
      <p>Choose placements to check the wording. This is an editorial preview, not the sky for a particular date.</p>
      <div className="admin-daily-glance-pair-list">
        {TRADITIONAL_DIGNITY_PLANETS.map(planet => <article key={planet}>
          <label htmlFor={`effort-preview-${planet}`}>{planet}</label>
          <AdminSelect id={`effort-preview-${planet}`} aria-label={`Preview ${planet} placement`} value={selection[planet] ?? ""}
            onChange={event => setSelection(current => ({ ...current, [planet]: event.target.value }))}>
            <option value="">Not in detriment or fall</option>
            {skyDebilityPhraseSets.filter(row => row.planetTitle === planet).map(row => <option key={row.signTitle} value={row.signTitle}>
              {row.signTitle} · {skyDebilityConditionLabel(planet, row.signTitle)}
            </option>)}
          </AdminSelect>
        </article>)}
      </div>
      <div className="admin-editor-guidance" aria-live="polite" data-testid="sky-debility-preview">
        {preview.visible ? <>
          <h4>{preview.openingHook}</h4>
          <p>{preview.countLabel} {preview.countUnit}</p>
          {preview.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <p>{snapshot.planets.map(row => `${row.planet} in ${row.sign}`).join(", ")}.</p>
          <p><strong>Selected examples:</strong> {preview.selectedPlacementKeys.map(exampleLabel).join(", ")}.</p>
          {preview.omittedExamplePlacementKeys.length > 0 && <p>The count, planet/function sentence, and placement links also include {preview.omittedExamplePlacementKeys.map(exampleLabel).join(", ")}. Only three matched examples are used to keep the card readable.</p>}
        </> : preview.hiddenReason === "no-qualifying-planets" ? <p>The card is hidden when no planets qualify. A zero count does not promise an easy day.</p> :
          <div role="alert"><strong>Writing needs attention before this combination can be shown.</strong>{preview.errors.map(error => <p key={error}>{error}</p>)}</div>}
      </div>
    </section>

    <details open>
      <summary>Placement wording · {skyDebilityPhraseSets.length} matched sets</summary>
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
    <details>
      <summary>Card template, heading, and example order</summary>
      <p>Experiences and situations are joined with “or”; responses, planet names, and functions are joined with “and”. Example order chooses up to three complete sets, not a difficulty score.</p>
      <div className="admin-daily-glance-pair-list">{templateNames.map(name => editor(`cms/sky-debility/${name}`, templateGuidance[name]))}</div>
    </details>
    <details>
      <summary>Legacy wording for reference</summary>
      <p>Preserved for recovery. These older title and body fields are not used by the new summary.</p>
      <div className="admin-daily-glance-pair-list">{skyDebilityLegacyNames.map(name => {
        const field = fieldByKey(`cms/sky-debility/${name}`);
        return <article key={field.key}><strong>{field.label}</strong><p>{savedBody(field.key)}</p></article>;
      })}</div>
    </details>
  </section>;
}
