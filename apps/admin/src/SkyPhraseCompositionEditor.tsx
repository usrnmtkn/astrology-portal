import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";
import { AdminSelect } from "./AdminNativeControls";
import { useRef } from "react";
import SkyPlacementVariableKey from "./SkyPlacementVariableKey";
// @ts-ignore Shared editorial ingredient vocabulary.
import { SKY_INGREDIENT_ROLES } from "../../web/src/content/fallbackArchitectureV3/resolver/skyEvergreenSections.mjs";

export type SkyPhrase = { id: string; text: string; joinBefore: string; source?: string; role?: string };

export default function SkyPhraseCompositionEditor({ phrases, disabled, facts, onChange, characterLimit = 20000 }: {
  phrases: SkyPhrase[];
  disabled: boolean;
  facts: Record<string, string>;
  onChange: (phrases: SkyPhrase[]) => void;
  characterLimit?: number;
}) {
  const activeInput = useRef<{ id: string; field: "text" | "joinBefore"; input: HTMLTextAreaElement } | null>(null);
  const characterCount = phrases.reduce((count, phrase) => count + phrase.text.length + phrase.joinBefore.length, 0);
  const remainingFor = (value: string) => Math.max(0, characterLimit - characterCount + value.length);
  const update = (id: string, patch: Partial<SkyPhrase>) => onChange(phrases.map(phrase => phrase.id === id ? { ...phrase, ...patch } : phrase));
  const move = (index: number, offset: number) => {
    const next = [...phrases];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  };
  return <div className="admin-sky-phrase-composition" role="group" aria-label="Phrase composition">
    <p>Arrange your exact phrases and write the text that connects them. Spaces, punctuation, and paragraph breaks are preserved. A composition with an empty phrase is withheld as a whole.</p>
    {phrases.map((phrase, index) => <div className="admin-workspace-details" key={phrase.id} role="group" aria-label={`Phrase ${index + 1}`}>
      <label className="admin-field-wide"><span>Ingredient role</span>
        <AdminSelect aria-label={`Ingredient role ${index + 1}`} value={phrase.role ?? ""} disabled={disabled} onChange={event => update(phrase.id, { role: event.target.value || undefined })}>
          <option value="">Unassigned</option>
          {SKY_INGREDIENT_ROLES.map((role: string) => <option key={role} value={role}>{role.replaceAll("-", " ")}</option>)}
        </AdminSelect>
      </label>
      <label className="admin-review-copy-editor">
        <span>{index === 0 ? "Text before first phrase" : "Connecting text before this phrase"}</span>
        <StudioTextarea aria-label={`Connecting text ${index + 1}`} className="admin-copy-field-summary" value={phrase.joinBefore} disabled={disabled} maxLength={Math.min(2000, remainingFor(phrase.joinBefore))}
          onFocus={event => { activeInput.current = { id: phrase.id, field: "joinBefore", input: event.currentTarget }; }}
          onChange={event => update(phrase.id, { joinBefore: event.target.value })} />
      </label>
      <label className="admin-review-copy-editor">
        <span>Phrase {index + 1}</span>
        <StudioTextarea aria-label={`Phrase text ${index + 1}`} className="admin-copy-field-body" value={phrase.text} disabled={disabled} maxLength={remainingFor(phrase.text)}
          onFocus={event => { activeInput.current = { id: phrase.id, field: "text", input: event.currentTarget }; }}
          onChange={event => update(phrase.id, { text: event.target.value })} />
      </label>
      <label className="admin-field-wide">
        <span>Corpus source or note</span>
        <StudioInput aria-label={`Phrase source ${index + 1}`} value={phrase.source ?? ""} disabled={disabled} maxLength={1000} onChange={event => update(phrase.id, { source: event.target.value })} />
      </label>
      <div className="admin-sky-writing-source-actions" role="group" aria-label={`Arrange phrase ${index + 1}`}>
        <StudioButton type="button" disabled={disabled || index === 0} onClick={() => move(index, -1)}>Move phrase {index + 1} up</StudioButton>
        <StudioButton type="button" disabled={disabled || index === phrases.length - 1} onClick={() => move(index, 1)}>Move phrase {index + 1} down</StudioButton>
        <StudioButton type="button" disabled={disabled} onClick={() => {
          if (phrase.text.trim() && !window.confirm("Remove this phrase from the draft composition?")) return;
          onChange(phrases.filter(item => item.id !== phrase.id));
        }}>Remove phrase {index + 1}</StudioButton>
      </div>
    </div>)}
    <StudioButton type="button" disabled={disabled || phrases.length >= 24} onClick={() => onChange([...phrases, { id: `phrase-${crypto.randomUUID()}`, text: "", joinBefore: "" }])}>Add phrase</StudioButton>
    <SkyPlacementVariableKey facts={facts} disabled={disabled} onInsert={token => {
      const active = activeInput.current;
      if (!active || !active.input.isConnected || disabled) return;
      const phrase = phrases.find(item => item.id === active.id);
      if (!phrase) return;
      const start = active.input.selectionStart;
      const end = active.input.selectionEnd;
      if (characterCount - (end - start) + token.length > characterLimit || (active.field === "joinBefore" && phrase.joinBefore.length - (end - start) + token.length > 2000)) return;
      update(active.id, { [active.field]: phrase[active.field].slice(0, start) + token + phrase[active.field].slice(end) });
      requestAnimationFrame(() => { active.input.focus({ preventScroll: true }); active.input.setSelectionRange(start + token.length, start + token.length); });
    }} />
  </div>;
}
