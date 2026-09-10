import SkyPhraseCompositionEditor from "./SkyPhraseCompositionEditor";
import type { SkyEditorialSection, SkyParagraph, SkyPracticalItem } from "./skyArticleOutlines";
// @ts-ignore Canonical validation and editor metadata.
import { SKY_SECTION_ROLES, skyEvergreenSectionFragments } from "../../web/src/content/fallbackArchitectureV3/resolver/skyEvergreenSections.mjs";

export default function SkySectionPacketEditor({ section, disabled, facts, onChange }: {
  section: SkyEditorialSection; disabled: boolean; facts: Record<string, string>;
  onChange: (patch: Partial<SkyEditorialSection>) => void;
}) {
  const isPractical = Boolean(section.items);
  const units = section.items ?? section.paragraphs ?? [];
  const count = skyEvergreenSectionFragments(section).join("").length;
  const setUnits = (next: (SkyParagraph | SkyPracticalItem)[]) => onChange(isPractical ? { items: next as SkyPracticalItem[] } : { paragraphs: next as SkyParagraph[] });
  const update = (id: string, patch: Partial<SkyParagraph & SkyPracticalItem>) => setUnits(units.map(unit => unit.id === id ? { ...unit, ...patch } : unit));
  const move = (index: number, offset: number) => {
    const next = [...units];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setUnits(next);
  };
  const name = isPractical ? "Item" : "Paragraph";
  return <div role="group" aria-label="Section packet">
    <label className="admin-field-wide"><span>Section role</span>
      <select aria-label="Section role" disabled={disabled || isPractical} value={section.role ?? "main"} onChange={event => onChange({ role: event.target.value })}>
        {SKY_SECTION_ROLES.filter((role: string) => isPractical || role !== "practical").map((role: string) => <option value={role} key={role}>{role.replaceAll("-", " ")}</option>)}
      </select>
    </label>
    <label className="admin-field-wide"><span>Target depth</span>
      <select aria-label="Target depth" disabled={disabled} value={section.depth ?? "standard"} onChange={event => onChange({ depth: event.target.value })}>
        <option value="short">Short · usually 1–2 paragraphs</option><option value="standard">Standard · usually 2–4 paragraphs</option><option value="deep">Deep · usually 4–6 paragraphs</option>
      </select>
    </label>
    <p>Roles and depth guide your editing; they do not generate or shorten writing. Add as many examples or other ingredients as the passage needs, then arrange them within paragraphs. Empty planned paragraphs are omitted. A paragraph with an unfinished phrase is withheld.</p>
    {units.map((unit, index) => {
      const phraseCount = unit.phrases.reduce((n, phrase) => n + phrase.text.length + phrase.joinBefore.length, 0);
      return <details className="admin-workspace-details" key={unit.id}>
        <summary>{name} {index + 1}{"job" in unit && unit.job ? ` · ${unit.job}` : ""}</summary>
        {"job" in unit ? <label className="admin-field-wide"><span>Paragraph job</span>
          <input aria-label={`Paragraph job ${index + 1}`} value={unit.job} maxLength={120} disabled={disabled} onChange={event => update(unit.id, { job: event.target.value })} />
        </label> : <label className="admin-review-copy-editor"><span>Action</span>
          <textarea aria-label={`Practical action ${index + 1}`} className="admin-copy-field-summary" value={unit.action} maxLength={Math.max(0, 20000 - count + unit.action.length)} disabled={disabled} onChange={event => update(unit.id, { action: event.target.value })} />
          <small className="admin-field-hint">The action opens this item. Use the first phrase’s connecting text for the exact spacing and punctuation after it. An item without an action is omitted.</small>
        </label>}
        <SkyPhraseCompositionEditor phrases={unit.phrases} facts={facts} disabled={disabled} characterLimit={Math.max(0, 20000 - count + phraseCount)} onChange={phrases => update(unit.id, { phrases })} />
        <div className="admin-sky-writing-source-actions" role="group" aria-label={`Arrange ${name.toLowerCase()} ${index + 1}`}>
          <button type="button" disabled={disabled || index === 0} onClick={() => move(index, -1)}>Move {name.toLowerCase()} {index + 1} up</button>
          <button type="button" disabled={disabled || index === units.length - 1} onClick={() => move(index, 1)}>Move {name.toLowerCase()} {index + 1} down</button>
          <button type="button" disabled={disabled} onClick={() => {
            if ((phraseCount || ("action" in unit && unit.action.trim())) && !window.confirm(`Remove this ${name.toLowerCase()} and its writing from the draft?`)) return;
            setUnits(units.filter(item => item.id !== unit.id));
          }}>Remove {name.toLowerCase()} {index + 1}</button>
        </div>
      </details>;
    })}
    <button type="button" disabled={disabled || units.length >= 24} onClick={() => setUnits([...units, isPractical
      ? { id: `item-${crypto.randomUUID()}`, action: "", phrases: [] }
      : { id: `paragraph-${crypto.randomUUID()}`, job: "", phrases: [] }])}>Add {isPractical ? "practical item" : "paragraph"}</button>
  </div>;
}
