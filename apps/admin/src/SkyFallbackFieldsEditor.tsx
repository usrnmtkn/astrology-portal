import { useEffect, useRef, useState } from "react";
import { skyRetrogradeBodies, type SkyPlacementSelection } from "./skyPlacementAssembly";
import SkyPlacementVariableKey, { SkyVariableText } from "./SkyPlacementVariableKey";
import SkyPhraseCompositionEditor from "./SkyPhraseCompositionEditor";
import SkyIngressComposer from "./SkyIngressComposer";
import SkySectionPacketEditor from "./SkySectionPacketEditor";
import { makeSkyArticleOutline, SKY_ARTICLE_OUTLINES, type SkyEditorialSection } from "./skyArticleOutlines";
// @ts-ignore Shared inline-variable contract used by the reader and save API.
import { isSkyPlacementVariableField, skyPlacementVariableFacts, skyPlacementVariableIssues } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";
// @ts-ignore Shared reader/editor schema; editor labels are never rendered as prose.
import { skyEvergreenLayout, SKY_EVERGREEN_SECTIONS_PATH } from "../../web/src/content/fallbackArchitectureV3/resolver/skyEvergreenSections.mjs";

type Field = { key: string; label: string; value: string };
type Props = {
  contentKey: string;
  fields: Field[];
  source?: Record<string, unknown>;
  kind: string;
  initialField?: string;
  selection?: SkyPlacementSelection;
  disabled: boolean;
  onChange: (path: string, value: unknown) => void;
  onLoadSource?: (key: string) => Promise<Record<string, any> | undefined>;
  onOpenSource: (key: string, path: string) => void;
};
const title = (value: string) => value.split("-").map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ");

type EvergreenSection = SkyEditorialSection;

export default function SkyFallbackFieldsEditor({ contentKey, kind, fields: sourceFields, source, initialField, selection, disabled, onChange, onOpenSource, onLoadSource }: Props) {
  const [selectedField, setSelectedField] = useState(initialField ?? "");
  const [outline, setOutline] = useState("ingress");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const placement = contentKey.match(/^sky-placement\/article\/([^/]+)\/([^/]+)$/u);
  const retrograde = contentKey.match(/^sky-placement\/retrograde\/([^/]+)$/u);
  const planet = placement?.[1] ?? retrograde?.[1] ?? "";
  const fields = planet ? sourceFields.map(field => ({ ...field, label: field.label.replace(/ draft$/u, "") })) : sourceFields;
  const sign = placement?.[2] ?? (selection?.planet === planet ? selection.sign : "");
  const hasSign = Boolean(sign && sign !== "all");
  const rxContext = Boolean(retrograde || skyRetrogradeBodies.has(planet) && selection?.planet === planet && selection.motion === "retrograde");
  const fallbackField = fields.find(field => field.key === (retrograde ? "Body" : "placementArticle")) ?? fields[0];
  const field = fields.find(item => item.key === selectedField) ?? fallbackField;
  const supportsVariables = field && isSkyPlacementVariableField(contentKey, field.key);
  const variableFacts = skyPlacementVariableFacts({ planet, sign, isRetrograde: rxContext });
  const variableIssues: string[] = supportsVariables ? skyPlacementVariableIssues(field.value) : [];
  const evergreen: EvergreenSection[] = placement ? skyEvergreenLayout(source) : [];
  const move = (index: number, offset: number) => {
    const next = [...evergreen];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(SKY_EVERGREEN_SECTIONS_PATH, next);
  };
  const selectedSection = evergreen.find(section => `${SKY_EVERGREEN_SECTIONS_PATH}.${section.id}` === field?.key && !section.source);
  const selectedBlock = evergreen.find(section => (section.source ? `fallback.${section.source}` : `${SKY_EVERGREEN_SECTIONS_PATH}.${section.id}`) === field?.key);
  const changeSection = (patch: Partial<EvergreenSection>) => onChange(SKY_EVERGREEN_SECTIONS_PATH,
    evergreen.map(section => section.id === selectedSection?.id ? { ...section, ...patch } : section));
  const changeWriting = (value: string) => selectedSection ? changeSection({ body: value }) : field && onChange(field.key, value);
  const insertVariable = (token: string) => {
    const input = textarea.current;
    if (!input || !field || disabled) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    changeWriting(field.value.slice(0, start) + token + field.value.slice(end));
    requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
      input.setSelectionRange(start + token.length, start + token.length);
    });
  };

  // This component is deferred. Focus after it mounts, rather than racing the
  // dashboard's scroll request against a lazy-loaded editor.
  useEffect(() => {
    setSelectedField(initialField ?? "");
    if (initialField) textarea.current?.focus({ preventScroll: true });
  }, [initialField]);

  if (!planet) return <section className="admin-sky-edition-fields" aria-label="Editable fallback fields">
    <header>
      <p className="admin-eyebrow">Editable copy</p>
      <h3>{kind === "article" ? "Article paragraphs" : "Aspect audience versions"}</h3>
      <p>{kind === "article" ? "Each field is a section of the complete article, not a reusable variable." : "Each field is the complete aspect passage for its named reader surface."}</p>
    </header>
    {fields.map(item => <label className="admin-review-copy-editor" key={item.key}>
      <span>{item.label}</span>
      <small className="admin-field-hint">Internal source field: <code>{item.key}</code></small>
      <textarea aria-label={`Fallback field ${item.label}`} data-sky-field={item.key} value={item.value} onChange={event => onChange(item.key, event.target.value)} />
    </label>)}
  </section>;

  return <section className="admin-sky-writing-editor" aria-label="Writing editor">
    {planet && <div className="admin-sky-writing-context" aria-label="Placement writing context">
      <strong>{title(planet)}{rxContext ? " Rx" : ""}{hasSign ? ` in ${title(sign)}` : " · all signs"}</strong>
      <p>{retrograde
        ? `This is the retrograde opening. It appears before the shared placement writing and is reused for ${title(planet)} retrograde in every sign.`
        : skyRetrogradeBodies.has(planet) ? `Choose a shared article or a motion-specific article for ${title(planet)} in ${title(sign)}. Each fallback block can also target direct or retrograde motion.` : `The placement article and fallback hooks describe ${title(planet)} in ${title(sign)}.`}</p>
      <div className="admin-sky-writing-source-actions" role="group" aria-label="Choose writing source">
        {retrograde
          ? <><span className="ui-pill">Editing retrograde writing</span>{hasSign && <button type="button" disabled={disabled} onClick={() => onOpenSource(`sky-placement/article/${planet}/${sign}`, "placementArticle")}>Edit shared placement writing</button>}</>
          : <><span className="ui-pill">Editing placement writing</span>{skyRetrogradeBodies.has(planet) && <button type="button" disabled={disabled} onClick={() => onOpenSource(`sky-placement/retrograde/${planet}`, "Body")}>Edit retrograde writing</button>}</>}
      </div>
    </div>}
    {placement && <details className="admin-workspace-details" open={initialField?.startsWith("ingress") || undefined}>
      <summary>V5 sentence composition</summary>
      <SkyIngressComposer source={{ ...source, contentKey }} motion={rxContext ? "retrograde" : "direct"} disabled={disabled}
        initialField={initialField} onChange={value => onChange("ingress", value)} onOpenSource={onOpenSource} onLoadSource={onLoadSource} />
    </details>}
    {placement && <details className="admin-workspace-details admin-evergreen-sections" open={field?.key.startsWith("fallback.") || undefined}>
      <summary>Evergreen sections</summary>
      <p>Reusable writing for any occurrence of this placement. The full placement article takes priority. When it is unavailable, the blocks matching the selected motion appear in this order. Empty blocks are skipped.</p>
      <ol aria-label="Evergreen section order">
        {evergreen.map((section, index) => {
          const path = section.source ? `fallback.${section.source}` : `${SKY_EVERGREEN_SECTIONS_PATH}.${section.id}`;
          const item = fields.find(item => item.key === path);
          return <li key={section.id}>
            <button type="button" className="admin-evergreen-section-name" aria-pressed={field?.key === path} onClick={() => { setSelectedField(path); textarea.current?.focus({ preventScroll: true }); }}>
              {item?.label || "Untitled section"}<small>{item?.value.trim() ? "Has writing" : "Empty · skipped"} · {section.motion && section.motion !== "all" ? section.motion : "shared"}</small>
            </button>
            <label>Motion<select aria-label={`Motion for ${item?.label || "section"}`} disabled={disabled} value={section.motion ?? "all"} onChange={event => onChange(SKY_EVERGREEN_SECTIONS_PATH, evergreen.map(block => block.id === section.id ? { ...block, motion: event.target.value } : block))}>
              <option value="all">Shared</option><option value="direct">Direct</option>{skyRetrogradeBodies.has(planet) && <option value="retrograde">Retrograde</option>}
            </select></label>
            <div role="group" aria-label={`Arrange ${item?.label || "section"}`}>
              <button type="button" disabled={disabled || index === 0} aria-label={`Move ${item?.label || "section"} up`} onClick={() => move(index, -1)}>↑</button>
              <button type="button" disabled={disabled || index === evergreen.length - 1} aria-label={`Move ${item?.label || "section"} down`} onClick={() => move(index, 1)}>↓</button>
              {!section.source && <button type="button" disabled={disabled} aria-label={`Remove ${item?.label || "section"}`} onClick={() => {
                if ((item?.value.trim() || section.paragraphs || section.items || section.phrases?.some(phrase => phrase.text.trim())) && !window.confirm("Remove this section from the evergreen passage? Save & publish applies the removal.")) return;
                onChange(SKY_EVERGREEN_SECTIONS_PATH, evergreen.filter(item => item.id !== section.id));
                if (selectedSection?.id === section.id) setSelectedField("fallback.hook");
              }}>Remove</button>}
            </div>
          </li>;
        })}
      </ol>
      <button type="button" disabled={disabled || evergreen.length >= 24} onClick={() => {
        const id = `section-${crypto.randomUUID()}`;
        onChange(SKY_EVERGREEN_SECTIONS_PATH, [...evergreen, { id, label: "New section", body: "", motion: rxContext ? "retrograde" : "direct" }]);
        setSelectedField(`${SKY_EVERGREEN_SECTIONS_PATH}.${id}`);
        textarea.current?.focus({ preventScroll: true });
      }}>Add section</button>
      <label className="admin-field-wide"><span>Article structure</span>
        <select aria-label="Article structure" value={outline} disabled={disabled} onChange={event => setOutline(event.target.value)}>
          {SKY_ARTICLE_OUTLINES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <p>Add an empty editorial outline after your existing sections. Choose a structure appropriate to this source. It supplies paragraph jobs, not writing or additional calculated facts. The existing article, date, and personal-horoscope sections keep their current behavior.</p>
      <button type="button" disabled={disabled || evergreen.length + (SKY_ARTICLE_OUTLINES.find(item => item.id === outline)?.sections.length ?? 0) > 24} onClick={() => {
        const additions = makeSkyArticleOutline(outline, rxContext ? "retrograde" : "direct");
        onChange(SKY_EVERGREEN_SECTIONS_PATH, [...evergreen, ...additions]);
        if (additions[0]) setSelectedField(`${SKY_EVERGREEN_SECTIONS_PATH}.${additions[0].id}`);
      }}>Add article outline</button>
    </details>}
    {field ? <>
      <label className="admin-field-wide">
        <span>Writing section</span>
        <select aria-label="Writing section" value={field.key} onChange={event => setSelectedField(event.target.value)}>
          {fields.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
      </label>
      {selectedSection && <label className="admin-field-wide"><span>Section name</span>
        <input aria-label="Section name" value={selectedSection.label ?? ""} maxLength={120} disabled={disabled} onChange={event => changeSection({ label: event.target.value })} />
        <small className="admin-field-hint">For organizing your writing in Studio. Readers see the passage only.</small>
      </label>}
      {selectedBlock && !selectedSection?.paragraphs && !selectedSection?.items && <button type="button" disabled={disabled} onClick={() => {
        const { source: _source, body: _body, phrases, ...block } = selectedBlock;
        onChange(SKY_EVERGREEN_SECTIONS_PATH, evergreen.map(section => section.id === block.id ? {
          ...block, label: field.label, role: block.role ?? "main", depth: block.depth ?? "standard",
          paragraphs: [{ id: `paragraph-${crypto.randomUUID()}`, job: "Existing passage", phrases: phrases ?? [{ id: `phrase-${crypto.randomUUID()}`, text: field.value, joinBefore: "", source: `${contentKey}#${field.key}` }] }]
        } : section));
        setSelectedField(`${SKY_EVERGREEN_SECTIONS_PATH}.${block.id}`);
      }}>Organize into paragraphs</button>}
      {selectedBlock && !selectedSection?.phrases && !selectedSection?.paragraphs && !selectedSection?.items && <button type="button" disabled={disabled} onClick={() => {
        const { source: originalSource, body: _body, ...block } = selectedBlock;
        onChange(SKY_EVERGREEN_SECTIONS_PATH, evergreen.map(section => section.id === block.id ? {
          ...block, label: field.label, phrases: [{ id: `phrase-${crypto.randomUUID()}`, text: field.value, joinBefore: "", source: `${contentKey}#${field.key}` }]
        } : section));
        setSelectedField(`${SKY_EVERGREEN_SECTIONS_PATH}.${block.id}`);
      }}>Compose from phrases</button>}
      {selectedSection && (selectedSection.paragraphs || selectedSection.items) ? <SkySectionPacketEditor section={selectedSection} disabled={disabled} facts={variableFacts} onChange={changeSection} /> : selectedSection?.phrases ? <SkyPhraseCompositionEditor phrases={selectedSection.phrases} disabled={disabled} facts={variableFacts} onChange={phrases => changeSection({ phrases })} /> : <label className="admin-review-copy-editor">
        <span>{field.label}</span>
        {retrograde && <small className="admin-field-hint">{field.key === "Body" ? "The full opening paragraph on the retrograde detail page." : "The short version used by retrograde cards. It does not replace the detail-page opening."}</small>}
        {field.key.startsWith("fallback.") && <small className="admin-field-hint">Used when the full placement article is unavailable.{skyRetrogradeBodies.has(planet) && " Its motion setting controls which page includes it."}</small>}
        <textarea ref={textarea} className="admin-copy-field-body" aria-label={`Fallback field ${field.label}`} data-sky-field={field.key}
          value={field.value} disabled={disabled} aria-invalid={variableIssues.length > 0 || undefined} onChange={event => changeWriting(event.target.value)} />
      </label>}
      <p className="admin-sky-writing-count">{field.value.trim() ? field.value.trim().split(/\s+/u).length : 0} words · {field.value.length} characters</p>
      {supportsVariables && !selectedSection?.phrases && !selectedSection?.paragraphs && !selectedSection?.items && <SkyPlacementVariableKey facts={variableFacts} onInsert={insertVariable} disabled={disabled} />}
      {variableIssues.length > 0 && <div role="alert">{variableIssues.map(issue => <p key={issue}>{issue}</p>)}</div>}
      <details className="admin-workspace-details">
        <summary>Preview this section</summary>
        <p className="admin-sky-writing-preview">{field.value ? supportsVariables ? <SkyVariableText value={field.value} facts={variableFacts} /> : field.value : "No writing saved for this section."}</p>
      </details>
    </> : <p>No editable writing fields are available for this source.</p>}
  </section>;
}
