import { useEffect, useState } from "react";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton } from "./StudioControls";
import { wheelTooltipFields } from "../../web/src/content/wheelTooltipCatalog";
import { wheelTooltipHouseVariable } from "../../web/src/content/wheelTooltipValidation";

export default function WheelTooltipsStudio({ onEdit, busy, selectedKey }: { onEdit: (key: string) => void; busy: boolean; selectedKey?: string }) {
  const [group, setGroup] = useState("House ruler popup");
  const [key, setKey] = useState("cms/wheel-tooltip/ruler/title");
  const field = wheelTooltipFields.find(field => field.key === key)!;
  useEffect(() => {
    const selected = wheelTooltipFields.find(field => field.key === selectedKey);
    if (selected) { setGroup(selected.group); setKey(selected.key); }
  }, [selectedKey]);
  const chooseVariables = () => { setGroup("Variable wording"); setKey("cms/wheel-tooltip/variables/owner-you-title"); };
  return <section className="studio-surface studio-section" aria-label="Wheel tooltip sources">
    <section className="admin-editor-guidance" aria-label="Wheel tooltip selection">
      <h2>Wheel tooltip wording</h2>
      <p>Edit the hover details and house-ruler popup used by the Sky, You and Friend wheels. Names, pronouns and chart facts fill the listed variables automatically.</p>
      <label>Tooltip group<AdminSelect value={group} onChange={event => {
        setGroup(event.target.value);
        setKey(wheelTooltipFields.find(field => field.group === event.target.value)!.key);
      }}>{[...new Set(wheelTooltipFields.map(field => field.group))].map(group => <option key={group}>{group}</option>)}</AdminSelect></label>
      <label>Wording source<AdminSelect value={key} onChange={event => setKey(event.target.value)}>{wheelTooltipFields.filter(field => field.group === group).map(field => <option key={field.key} value={field.key}>{field.label}</option>)}</AdminSelect></label>
      {group === "Variable wording" ? <p>Edit how ownerPossessive, possessive, houseOrdinal and rulerHouseOrdinal read in house-ruler popups. Name and pronoun forms follow the active profile. House formats use the calculated house: {"{{house}}"} is its number and {"{{houseOrdinal}}"} is its ordinal.</p>
        : <StudioButton type="button" disabled={busy} onClick={chooseVariables}>Edit variable wording</StudioButton>}
      <p>Existing app wording:</p><p>{field.body}</p>
      {field.allowedSlots.length > 0 && <p>{wheelTooltipHouseVariable(key) ? "Keep at least one calculated house variable; you can use either or both: " : "Keep these automatic variables; you can move or repeat them: "}{field.allowedSlots.map(slot => `{{${slot}}}`).join(", ")}.</p>}
      <p>Opening a source loads its saved version. Save draft stores wording without serving it. Saving a published source as a draft hides that tooltip until you publish again. Use Save &amp; publish to update the reader tooltip.</p>
      <StudioButton type="button" disabled={busy} onClick={() => onEdit(key)}>Edit tooltip wording</StudioButton>
    </section>
  </section>;
}
