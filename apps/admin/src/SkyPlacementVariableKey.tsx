import { useEffect, useRef, useState } from "react";
import { compositionVariableColors } from "./CompositionVariableKey";
import { StudioButton } from "./StudioControls";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import {
  SKY_WRITING_LIBRARY_FIELD_IDS,
  SKY_WRITING_LIBRARY_GROUPS,
  loadSkyWritingLibrarySeeds,
  skyWritingLibraryInstalled,
  type SkyWritingLibraryComposition
} from "./skyWritingLibrary";
// @ts-ignore Shared with the publication validator and reader resolver.
import { SKY_PLACEMENT_VARIABLES, skyPlacementVariableSegments } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";

const variableColors = compositionVariableColors(SKY_PLACEMENT_VARIABLES);
const phraseClass = (kind: string) => ["planet", "sign"].includes(kind) ? "variable-phrase" : "variable-hook";

export type SkyVariableFacts = Record<string, string | undefined>;

type PhraseSourceContext = {
  planet: string;
  sign: string;
  record: Record<string, any>;
  label?: string;
  onLoadSource?: (key: string) => Promise<Record<string, any> | undefined>;
  onEdit?: (sourceId: string) => void;
};

function sourceTextAtPath(record: Record<string, any> | undefined, path: string) {
  if (!record) return "";
  const value = path.split(".").reduce<any>((current, key) => current && typeof current === "object" ? current[key] : undefined, record);
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.text === "string") return value.text;
  return "";
}

export function SkyVariableText({ value, facts }: { value: string; facts: SkyVariableFacts }) {
  return <>{skyPlacementVariableSegments(value, facts).map((part: { text: string; token?: string; name?: string; available?: boolean }, index: number) => part.token
    ? <span key={index} className={`admin-composition-variable ${part.available ? "variable-fact" : "variable-unmapped"}`}
      data-variable-color={variableColors.get(part.name ?? "")}
      title={`${part.token}${part.available ? " · calculated value" : " · needs a calculated value"}`}>{part.text}</span>
    : <span key={index}>{part.text}</span>)}</>;
}

export default function SkyPlacementVariableKey({ facts, onInsert, disabled = false, phraseSource }: {
  facts: SkyVariableFacts;
  onInsert?: (token: string) => void;
  disabled?: boolean;
  phraseSource?: PhraseSourceContext;
}) {
  const loadSourceRef = useRef(phraseSource?.onLoadSource);
  loadSourceRef.current = phraseSource?.onLoadSource;
  const [phraseValues, setPhraseValues] = useState<Record<string, string>>({});
  const [phraseProvenance, setPhraseProvenance] = useState<Record<string, string>>({});
  const [phraseLoading, setPhraseLoading] = useState(false);
  const [phraseError, setPhraseError] = useState("");
  const [phraseInstalled, setPhraseInstalled] = useState(false);

  useEffect(() => {
    let active = true;
    if (!phraseSource) {
      setPhraseValues({});
      setPhraseProvenance({});
      setPhraseLoading(false);
      setPhraseError("");
      setPhraseInstalled(false);
      return () => { active = false; };
    }
    setPhraseLoading(true);
    setPhraseError("");
    void (async () => {
      const loadSource = loadSourceRef.current;
      const { values: seededValues, provenance: seededProvenance } = await loadSkyWritingLibrarySeeds(
        phraseSource.record,
        phraseSource.planet,
        phraseSource.sign,
        loadSource
      );
      const values = { ...seededValues };
      const provenance = { ...seededProvenance };
      const composition = phraseSource.record.ingress as SkyWritingLibraryComposition | undefined;
      const installed = skyWritingLibraryInstalled(composition);

      if (installed && composition) {
        const linkedRecords = new Map<string, Record<string, any> | undefined>();
        for (const sourceId of SKY_WRITING_LIBRARY_FIELD_IDS) {
          const source = composition.sources[sourceId];
          if (!source) continue;
          if (source.reference) {
            let target: Record<string, any> | undefined;
            if (source.reference.contentKey === phraseSource.record.contentKey) target = phraseSource.record;
            else if (linkedRecords.has(source.reference.contentKey)) target = linkedRecords.get(source.reference.contentKey);
            else if (loadSource) {
              try {
                target = await loadSource(source.reference.contentKey);
              } catch {
                target = undefined;
              }
              linkedRecords.set(source.reference.contentKey, target);
            }
            values[sourceId] = sourceTextAtPath(target, source.reference.field);
            provenance[sourceId] = `${source.reference.contentKey}#${source.reference.field}`;
          } else {
            values[sourceId] = typeof source.text === "string" ? source.text : "";
            provenance[sourceId] = `${phraseSource.record.contentKey ?? "selected placement"}#ingress.sources.${sourceId}`;
          }
        }
      }

      if (!active) return;
      setPhraseValues(values);
      setPhraseProvenance(provenance);
      setPhraseInstalled(installed);
      setPhraseLoading(false);
    })().catch(reason => {
      if (!active) return;
      setPhraseError(reason instanceof Error ? reason.message : "Editable phrase values could not be loaded.");
      setPhraseLoading(false);
    });
    return () => { active = false; };
  }, [phraseSource?.planet, phraseSource?.sign, phraseSource?.record]);

  const contextLabel = phraseSource?.label ?? (phraseSource ? `${phraseSource.planet} in ${phraseSource.sign}` : "the selected placement");

  return <>
    <details className="admin-workspace-details admin-sky-variable-key">
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
      <p>Use plain <code>{"{{variableName}}"}</code> syntax for the calculated facts listed here. Structural blocks such as aspects, lunations, and optional article sections belong to composition, not inside prose as fake variables.</p>
    </details>

    <details className="admin-workspace-details admin-sky-variable-key" aria-label="Editable phrase variables">
      <AdminDisclosureSummary>Editable phrase variables</AdminDisclosureSummary>
      <p>These are the authored prose values for <strong>{contextLabel}</strong>. Each variable now shows its loaded text directly beside the variable, using the same source-text pattern as the Main template.</p>
      {phraseLoading && <p role="status">Loading phrase content for {contextLabel}…</p>}
      {phraseError && <p role="alert">{phraseError}</p>}
      {phraseSource && <p role="status"><strong>{phraseInstalled ? "Writing Library values loaded for this placement." : "Showing governed prefill content for this placement."}</strong></p>}
      {!phraseSource && <p>Choose a planet and sign source to load the current phrase values.</p>}
      <div className="admin-review-stack">
        {SKY_WRITING_LIBRARY_GROUPS.map((group, groupIndex) => <details className="admin-workspace-details" key={group.id} open={groupIndex < 3 || undefined}>
          <AdminDisclosureSummary>{group.label}</AdminDisclosureSummary>
          <p>{group.description}</p>
          <dl>
            {group.fields.map(item => {
              const currentValue = phraseValues[item.id]?.trim() ?? "";
              const sourceLabel = phraseProvenance[item.id] || `No governed source mapped for ${contextLabel}`;
              return <div key={item.id}>
                <dt>
                  <span className={`admin-composition-variable ${phraseClass(item.kind)}`}><code>{`{{${item.id}}}`}</code></span>
                  <strong>{item.label}</strong>
                </dt>
                <dd>
                  <div className="admin-sky-template-comparison">
                    <div>
                      <span className="admin-eyebrow">{phraseInstalled ? "Saved Writing Library text" : "Loaded prefill text"}</span>
                      <p className="admin-composition-source-copy">{phraseLoading ? "Loading selected content…" : currentValue || "Empty · no source text is currently mapped to this variable."}</p>
                    </div>
                    <div>
                      <span className="admin-eyebrow">Source</span>
                      <p className="admin-composition-source-copy">{sourceLabel}</p>
                      <div className="admin-sky-variable-value">
                        <span className={currentValue ? phraseClass(item.kind) : "variable-unmapped"}>{currentValue ? phraseInstalled ? "Loaded phrase value" : "Prefill source available" : "Empty"}</span>
                        <small>scope: {item.kind}</small>
                      </div>
                    </div>
                  </div>
                  <details className="admin-workspace-details">
                    <AdminDisclosureSummary>About {item.label.toLowerCase()}</AdminDisclosureSummary>
                    <p>{item.description}</p>
                  </details>
                  {phraseSource?.onEdit && <StudioButton type="button" disabled={disabled || phraseLoading} onClick={() => phraseSource.onEdit?.(item.id)}>{phraseInstalled ? `Edit ${item.label.toLowerCase()}` : `Open Writing Library for ${item.label.toLowerCase()}`}</StudioButton>}
                </dd>
              </div>;
            })}
          </dl>
        </details>)}
      </div>
    </details>
  </>;
}
