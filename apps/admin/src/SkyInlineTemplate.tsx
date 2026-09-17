import { StudioButton } from "./StudioControls";
import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { currentSkySummaryWording, skySummaryTemplateErrors, type SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";
import { isSkyDebilityKey, skyDebilityTemplateErrors } from "../../web/src/content/skyDebilityCatalog";

function EditableWords({ value, label, disabled, onChange }: { value: string; label: string; disabled: boolean; onChange: (value: string) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (ref.current && ref.current.textContent !== value && document.activeElement !== ref.current) ref.current.textContent = value;
  }, [value]);
  return <span ref={ref} role="textbox" aria-label={label} aria-disabled={disabled} aria-multiline="false"
    contentEditable={disabled ? false : "plaintext-only"} suppressContentEditableWarning tabIndex={disabled ? -1 : 0}
    className="admin-summary-template-words" data-placeholder="Add words"
    onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }}
    onInput={event => onChange((event.currentTarget.textContent ?? "").replace(/[\r\n]+/gu, " "))} />;
}

// Only literal text is editable. Variables are sibling nodes, never descendants
// of a contenteditable region, so selecting/deleting text cannot alter a slot.
export function SkyInlineTemplate({ field, body, slots, onEdit, busy, label }: {
  field: SkySummaryField; body: string; slots: Record<string, ReactNode>;
  onEdit: (field: SkySummaryField, initialBody?: string) => void; busy: boolean; label: string;
}) {
  const initial = currentSkySummaryWording(field.key, body);
  const [draft, setDraft] = useState(initial);
  const chunks = draft.split(/(\{[^{}]+\})/gu);
  const errors = isSkyDebilityKey(field.key) ? skyDebilityTemplateErrors(field.key, draft) : skySummaryTemplateErrors(field.key, draft);
  return <>
    <p aria-label={label}>{chunks.map((chunk, index) => /^\{[^{}]+\}$/u.test(chunk)
      ? <Fragment key={index}>{slots[chunk.slice(1, -1)] ?? <span contentEditable={false} className="admin-composition-variable variable-fact">{chunk.slice(1, -1).replace(/([A-Z])/gu, " $1")}</span>}</Fragment>
      : <EditableWords key={index} value={chunk} label={`${field.label} connecting words ${Math.floor(index / 2) + 1}`} disabled={busy}
        onChange={value => { const next = [...chunks]; next[index] = value.replace(/[{}]/gu, ""); setDraft(next.join("")); }} />)}</p>
    {errors.length > 0 && <div role="alert">{errors.join(" ")}</div>}
    {draft !== initial && <div className="admin-editor-guidance">
      <StudioButton type="button" disabled={busy || errors.length > 0} onClick={() => onEdit(field, draft)}>Review and save wording</StudioButton>
      <StudioButton type="button" disabled={busy} onClick={() => setDraft(initial)}>Discard wording changes</StudioButton>
      <p>Unsaved wording. Review and save opens the existing Save draft and Save & publish controls.</p>
    </div>}
  </>;
}
