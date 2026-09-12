import { compositionVariableColors } from "./CompositionVariableKey";
import { StudioButton } from "./StudioControls";
import { AdminDisclosureSummary } from "./AdminNativeControls";
// @ts-ignore Shared with the publication validator and reader resolver.
import { SKY_PLACEMENT_VARIABLES, skyPlacementVariableSegments } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";

const variableColors = compositionVariableColors(SKY_PLACEMENT_VARIABLES);

export type SkyVariableFacts = Record<string, string | undefined>;

export function SkyVariableText({ value, facts }: { value: string; facts: SkyVariableFacts }) {
  return <>{skyPlacementVariableSegments(value, facts).map((part: { text: string; token?: string; name?: string; available?: boolean }, index: number) => part.token
    ? <span key={index} className={`admin-composition-variable ${part.available ? "variable-fact" : "variable-unmapped"}`}
      data-variable-color={variableColors.get(part.name ?? "")}
      title={`${part.token}${part.available ? " · calculated value" : " · needs a calculated value"}`}>{part.text}</span>
    : <span key={index}>{part.text}</span>)}</>;
}

export default function SkyPlacementVariableKey({ facts, onInsert, disabled = false }: {
  facts: SkyVariableFacts;
  onInsert?: (token: string) => void;
  disabled?: boolean;
}) {
  return <details className="admin-workspace-details admin-sky-variable-key">
    <AdminDisclosureSummary>Calculated Sky variables</AdminDisclosureSummary>
    <p>These are read-only facts supplied by the selected placement or calculated occurrence. {onInsert ? "Select one to insert it at the cursor in the writing field." : "Open a section’s editor to insert a fact at the cursor."}</p>
    <p>Planet, sign, and motion use the selected preview context. Dates and aspect lists require a calculated occurrence and remain marked until those facts are available. Missing facts never become invented dates, aspects, or empty reader text.</p>
    <dl>
      {SKY_PLACEMENT_VARIABLES.map((variable: { name: string; description: string; availability: string }) => <div key={variable.name}>
        <dt>{onInsert ? <StudioButton type="button" disabled={disabled} aria-label={`Insert {{${variable.name}}}`} onClick={() => onInsert(`{{${variable.name}}}`)}>
          <code data-variable-color={variableColors.get(variable.name)}>{`{{${variable.name}}}`}</code>
        </StudioButton> : <code data-variable-color={variableColors.get(variable.name)}>{`{{${variable.name}}}`}</code>}</dt>
        <dd><p>{variable.description}</p><div className="admin-sky-variable-value"><span className={facts[variable.name] ? "variable-fact" : "variable-unmapped"}>{facts[variable.name] || "Needs calculated occurrence"}</span><small>{variable.availability}</small></div></dd>
      </div>)}
    </dl>
    <p>Editable planet lore, zodiac-sign lore, planet × sign synthesis, experience hooks, and optional context live under <strong>Placement composition → Editable writing library</strong>. Those named sources can be inserted into composition section templates, but they are not inline calculated variables.</p>
    <p>Use plain <code>{"{{variableName}}"}</code> syntax for the calculated facts listed here. Structural blocks such as aspects, lunations, and optional article sections belong to composition, not inside prose as fake variables.</p>
  </details>;
}
