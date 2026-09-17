import { Fragment, useState, type ReactNode } from "react";
import { StudioTabs } from "./StudioControls";
import { skyDebilityField } from "../../web/src/content/skyDebilityCatalog";
import { skyDebilityPhraseSets, skyDebilityPlacementId } from "../../web/src/content/skyDebilityPhrases";
import { buildSkyDebilityComposition, skyDebilityTemplateKey, type SkyDebilityMappedPart } from "./skyDebilityComposition";

type View = "reading" | "map" | "template";
const views: { value: View; label: string }[] = [
  { value: "reading", label: "Read-through" },
  { value: "map", label: "Composition map" },
  { value: "template", label: "Full template" }
];
const placementLabel = (key: string) => {
  const row = skyDebilityPhraseSets.find(item => skyDebilityPlacementId(item.planetTitle, item.signTitle) === key);
  return row ? `${row.planetTitle} in ${row.signTitle}` : key;
};

export function SkyDebilityCompositionMap({ composition, read, onSelectSource, busy, hasUnsaved }: {
  composition: ReturnType<typeof buildSkyDebilityComposition>;
  read: (key: string) => string | null | undefined;
  onSelectSource: (key: string) => void;
  busy: boolean;
  hasUnsaved: boolean;
}) {
  const [view, setView] = useState<View>("reading");
  const [variable, setVariable] = useState<string | null>(null);
  const { copy } = composition;
  const body = (name: string) => read(skyDebilityTemplateKey(name)) ?? "";
  const editLink = (key: string, text: ReactNode, phrase = false) => {
    if (typeof text === "string" && !text.trim()) return text;
    const label = `Edit ${skyDebilityField(key)?.label ?? key}`;
    if (!phrase) return <span role="button" tabIndex={busy ? -1 : 0} aria-disabled={busy}
      className="admin-summary-template-words" aria-label={label} title={skyDebilityField(key)?.label ?? key}
      data-source-key={key} onClick={() => { if (!busy) onSelectSource(key); }}
      onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (!busy) onSelectSource(key); } }}>{text}</span>;
    return <a href={`#exact-content?q=${encodeURIComponent(key)}`} aria-disabled={busy} tabIndex={busy ? -1 : 0}
      className="admin-composition-variable admin-template-reader-variable variable-copy"
      aria-label={label} title={skyDebilityField(key)?.label ?? key} data-source-key={key}
      onClick={event => { event.preventDefault(); if (!busy) onSelectSource(key); }}>{text}</a>;
  };
  function mapped(parts: readonly SkyDebilityMappedPart[]) {
    return parts.map((part, index) => <Fragment key={index}>{part.sourceKey
      ? editLink(part.sourceKey, part.text, part.kind === "phrase")
      : <span className={part.kind === "fact" ? "admin-composition-variable variable-fact" : undefined}
          data-source-kind={part.kind} title={part.kind === "fact" ? `Calculated example: ${part.slot ?? "planet"}` : "List punctuation and conjunction supplied by the app"}>{part.text}</span>}</Fragment>);
  }
  function rawTemplate(name: string) {
    const key = skyDebilityTemplateKey(name);
    return body(name).split(/(\{[^{}]+\})/gu).filter(Boolean).map((part, index) => {
      const match = /^\{([^{}]+)\}$/u.exec(part);
      return <Fragment key={index}>{match ? <a href="#sky-writeups?view=daily-summary" className="admin-composition-variable admin-template-reader-variable variable-copy"
        aria-label={`Inspect ${match[1]} variable`} onClick={event => { event.preventDefault(); setVariable(match[1]); }}>{part}</a>
        : editLink(key, part)}</Fragment>;
    });
  }
  const sourceKeys = [...new Set((variable ? composition.slots[variable] ?? [] : []).flatMap(part => part.sourceKey ? [part.sourceKey] : []))];
  if (variable === "signConditionClause" && !sourceKeys.length) sourceKeys.push(skyDebilityTemplateKey(copy.allPlacementKeys.length === 1 ? "signConditionOne" : "signConditionMany"));
  if (variable === "dignityExplanationSentence" && !sourceKeys.length) sourceKeys.push(skyDebilityTemplateKey(copy.allPlacementKeys.length === 1 ? "dignityExplanationOne" : "dignityExplanationMany"));
  const oneKey = copy.legacyContext ? "signConditionOne" : "dignityExplanationOne";
  const manyKey = copy.legacyContext ? "signConditionMany" : "dignityExplanationMany";
  const branchLabel = copy.legacyContext ? "connecting phrase" : "explanation";

  return <section className="admin-template-reader-drilldown admin-sky-summary-composition studio-surface" aria-label="Effort summary composition map">
    <header className="admin-section-heading-row"><div>
      <h4>Full card and composition map</h4>
      <p>Read the complete card, inspect its source wording, or read the full template with variables. These views use the same selected examples and working copy.</p>
    </div></header>
    <StudioTabs label="Effort summary views" tabs={views} value={view} onValueChange={value => { setView(value); setVariable(null); }}>
      {view === "map" && <div className="admin-composition-variable-legend" aria-label="Effort composition key">
        <span className="variable-fact">Calculated example</span><span className="variable-copy">Placement wording: click to edit</span><span>Connecting words: click to edit the template</span>
      </div>}
      {view === "template" && <p>Click a variable to see what supplies it. Click the surrounding wording to edit that template. This is a reference view, not another saved copy.</p>}
      <div className="admin-template-reader-surface" data-testid="sky-debility-preview">
        <div className="admin-composition-preview-chrome"><span>{view === "template" ? "Full template" : "Full card"}</span>
          <span>{hasUnsaved ? "Unsaved working preview" : "Working preview"} · example placements</span></div>
        <div className="admin-template-reader-copy">
          {view === "template" ? <section className="admin-composition-preview-field field-body" aria-label="Full effort summary template" data-testid="sky-debility-full-template">
            <h4>{rawTemplate("openingHook")}</h4>
            <p>{rawTemplate("countLabel")} {rawTemplate("countUnit")}</p>
            <p>{rawTemplate("experienceTemplate")}</p>
            <p>{rawTemplate("contextTemplate")}</p>
            <p><span className="admin-composition-variable variable-fact">Calculated planet-in-sign links</span></p>
          </section> : !copy.visible ? <div role="status">
            {copy.hiddenReason === "no-qualifying-planets" ? <p>The reader card is hidden when no planets qualify. The Full template tab is still available for editing.</p>
              : <><p>This example cannot be assembled until the writing below is corrected.</p>{copy.errors.map(error => <p key={error}>{error}</p>)}</>}
          </div> : view === "map" && composition.errors.length ? <div role="alert">{composition.errors.map(error => <p key={error}>{error}</p>)}</div> :
            <section className="admin-composition-preview-field field-body" aria-label={view === "reading" ? "Complete effort summary" : "Mapped effort summary"}>
              <h4>{view === "map" ? mapped(composition.heading) : copy.openingHook}</h4>
              <p>{view === "map" ? <>{mapped(composition.countLabel)} {mapped(composition.countUnit)}</> : `${copy.countLabel} ${copy.countUnit}`}</p>
              {copy.paragraphs.map((paragraph, index) => <p key={index} data-testid={`effort-paragraph-${index}`}>{view === "map" ? mapped(composition.paragraphs[index]) : paragraph}</p>)}
              <p>{copy.allPlacementKeys.map((key, index) => <Fragment key={key}>{index > 0 ? ", " : ""}<a href={`/#sky/placement/${key}`} target="_blank" rel="noreferrer" aria-label={`Read about ${placementLabel(key)}`}>{placementLabel(key)}</a></Fragment>)}.</p>
            </section>}
        </div>
      </div>
      {view === "template" && variable && <section className="admin-editor-guidance" aria-label="Selected template variable" aria-live="polite">
        <h4>{`{${variable}}`}</h4>
        <p>{copy.slots[variable] ?? "No value for this example. Choose qualifying placements to inspect the contributing wording."}</p>
        {sourceKeys.length ? sourceKeys.map(key => <p key={key}><strong>{skyDebilityField(key)?.label}</strong><br />{editLink(key, read(key) ?? "Missing wording", key.includes("/placement/"))}</p>)
          : <p>This value is calculated from the selected example, rather than authored in a wording field.</p>}
      </section>}
    </StudioTabs>
    <details className="admin-workspace-details">
      <summary>Sources and selection rules</summary>
      <p>Selected branch: {copy.allPlacementKeys.length === 0 ? "card hidden" : `${copy.allPlacementKeys.length === 1 ? "one-planet" : "multiple-planet"} ${branchLabel}`}.</p>
      <p>Selected matched examples: {copy.selectedPlacementKeys.length ? copy.selectedPlacementKeys.map(placementLabel).join(", ") : "none"}.</p>
      {copy.omittedExamplePlacementKeys.length > 0 && <p>{copy.omittedExamplePlacementKeys.map(placementLabel).join(", ")} remain in the count, planetary functions, and links. Their experiences, situations, and responses are not among the three selected examples.</p>}
      <p>Experiences and situations use “or”; responses, planet names, and functions use “and”. {editLink(skyDebilityTemplateKey("exampleOrder"), "Edit example order")}.</p>
      <p>{editLink(skyDebilityTemplateKey(oneKey), `Edit one-planet ${branchLabel}`)} · {editLink(skyDebilityTemplateKey(manyKey), `Edit multiple-planet ${branchLabel}`)}</p>
      {copy.requiredKeys.map(key => <p key={key}>{editLink(key, skyDebilityField(key)?.label ?? key)}</p>)}
    </details>
  </section>;
}
