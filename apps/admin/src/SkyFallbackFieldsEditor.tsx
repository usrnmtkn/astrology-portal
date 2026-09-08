import { useEffect, useRef, useState } from "react";
import { skyRetrogradeBodies, type SkyPlacementSelection } from "./skyPlacementAssembly";

type Field = { key: string; label: string; value: string };
type Props = {
  contentKey: string;
  fields: Field[];
  kind: string;
  initialField?: string;
  selection?: SkyPlacementSelection;
  disabled: boolean;
  onChange: (path: string, value: string) => void;
  onOpenSource: (key: string, path: string) => void;
};
const title = (value: string) => value.split("-").map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ");

export default function SkyFallbackFieldsEditor({ contentKey, kind, fields: sourceFields, initialField, selection, disabled, onChange, onOpenSource }: Props) {
  const [selectedField, setSelectedField] = useState(initialField ?? "");
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
        : skyRetrogradeBodies.has(planet) ? `This writing is shared by ${title(planet)} in ${title(sign)}, direct and retrograde. The retrograde page adds a separate opening paragraph.` : `The placement article and fallback hooks describe ${title(planet)} in ${title(sign)}.`}</p>
      <div className="admin-sky-writing-source-actions" role="group" aria-label="Choose writing source">
        {retrograde
          ? <><span className="ui-pill">Editing retrograde writing</span>{hasSign && <button type="button" disabled={disabled} onClick={() => onOpenSource(`sky-placement/article/${planet}/${sign}`, "placementArticle")}>Edit shared placement writing</button>}</>
          : <><span className="ui-pill">Editing shared placement writing</span>{skyRetrogradeBodies.has(planet) && <button type="button" disabled={disabled} onClick={() => onOpenSource(`sky-placement/retrograde/${planet}`, "Body")}>Edit retrograde writing</button>}</>}
      </div>
    </div>}
    {field ? <>
      <label className="admin-field-wide">
        <span>Writing section</span>
        <select aria-label="Writing section" value={field.key} onChange={event => setSelectedField(event.target.value)}>
          {fields.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
      </label>
      <label className="admin-review-copy-editor">
        <span>{field.label}</span>
        {retrograde && <small className="admin-field-hint">{field.key === "Body" ? "The full opening paragraph on the retrograde detail page." : "The short version used by retrograde cards. It does not replace the detail-page opening."}</small>}
        {field.key.startsWith("fallback.") && <small className="admin-field-hint">Used when the full placement article is unavailable.{skyRetrogradeBodies.has(planet) && " Shared by direct and retrograde pages."}</small>}
        <textarea ref={textarea} className="admin-copy-field-body" aria-label={`Fallback field ${field.label}`} data-sky-field={field.key}
          value={field.value} onChange={event => onChange(field.key, event.target.value)} />
      </label>
      <p className="admin-sky-writing-count">{field.value.trim() ? field.value.trim().split(/\s+/u).length : 0} words · {field.value.length} characters</p>
      <details className="admin-workspace-details">
        <summary>Preview this section</summary>
        <p className="admin-sky-writing-preview">{field.value || "No writing saved for this section."}</p>
      </details>
    </> : <p>No editable writing fields are available for this source.</p>}
  </section>;
}
