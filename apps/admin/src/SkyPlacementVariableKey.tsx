import { ZODIAC_SEASON_VARIABLES, zodiacSeasonSourceKey } from "../../web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
import { useEffect, useRef, useState } from "react";
import { compositionVariableColors } from "./CompositionVariableKey";
import { StudioButton } from "./StudioControls";
import { PageLoading } from "../../web/src/components/PageLoading";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import {
  SKY_WRITING_LIBRARY_FIELD_IDS,
  SKY_WRITING_LIBRARY_GROUPS,
  installSkyWritingLibrary,
  loadSkyWritingLibrarySeeds,
  skyWritingLibraryInstalled,
  type SkyWritingLibraryComposition
} from "./skyWritingLibrary";
// @ts-ignore Same hash/scope checks as the article renderer.
import { resolveIngressSource } from "../../web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs";
// @ts-ignore Shared source-aware article preview.
import { skyPlacementArticleVariableSegments } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs";
// @ts-ignore Shared with the publication validator and reader resolver.
import { SKY_PLACEMENT_VARIABLES, skyPlacementVariableSegments } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";

const libraryPhraseSlots = SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields.map(field => ({ name: field.id })));
const variableColors = compositionVariableColors([...SKY_PLACEMENT_VARIABLES, ...libraryPhraseSlots]);
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


function scopeLabel(kind: string) {
  if (kind === "planet") return "Shared planet language";
  if (kind === "sign") return "Shared sign language";
  if (kind === "aspect") return "Aspect language";
  if (kind === "timing") return "Timing language";
  return "This planet-in-sign placement";
}

export function SkyVariableText({ value, facts, source, references = [] }: {
  value: string; facts: SkyVariableFacts; source?: Record<string, any>; references?: Record<string, any>[];
}) {
  const segments = source ? skyPlacementArticleVariableSegments(value, facts, source, references) : skyPlacementVariableSegments(value, facts);
  return <>{segments.map((part: { text: string; token?: string; name?: string; kind?: string; reason?: string; available?: boolean }, index: number) => part.token
    ? <span key={index} className={`admin-composition-variable ${!part.available ? "variable-unmapped" : part.kind && part.kind !== "fact" ? phraseClass(part.kind) : "variable-fact"}`}
      data-variable-color={variableColors.get(part.name ?? "")}
      title={`${part.token} · ${part.reason || (part.kind && part.kind !== "fact" ? "Writing Library phrase" : part.available ? "calculated value" : "needs a calculated value")}`}>{part.text}</span>
    : <span key={index}>{part.text}</span>)}</>;
}

export default function SkyPlacementVariableKey({ facts, onInsert, onInsertPhrase, disabled = false, phraseSource, omitKinds = [] }: {
  facts: SkyVariableFacts;
  onInsert?: (token: string) => void;
  onInsertPhrase?: (token: string) => void;
  disabled?: boolean;
  phraseSource?: PhraseSourceContext;
  omitKinds?: string[];
}) {
  const loadSourceRef = useRef(phraseSource?.onLoadSource);
  loadSourceRef.current = phraseSource?.onLoadSource;
  const [phraseValues, setPhraseValues] = useState<Record<string, string>>({});
  const [phraseProvenance, setPhraseProvenance] = useState<Record<string, string>>({});
  const [phraseLoading, setPhraseLoading] = useState(false);
  const [phraseError, setPhraseError] = useState("");
  const [phraseInstalled, setPhraseInstalled] = useState(false);

  // Row hydration recreates object identities. Only changed content should
  // reload phrase values, otherwise the picker can continuously hydrate itself.
  const phraseSourceRevision = JSON.stringify(phraseSource?.record ?? null);
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
      const rawComposition = phraseSource.record.ingress as SkyWritingLibraryComposition | undefined;
      const installed = skyWritingLibraryInstalled(rawComposition);
      // Saved local or linked library fields are authoritative, including blanks.
      // Governed prefill is needed only before a library exists.
      const seeds = installed ? { values: {}, provenance: {} } : await loadSkyWritingLibrarySeeds(
        phraseSource.record, phraseSource.planet, phraseSource.sign, loadSource
      );
      const values: Record<string, string> = { ...seeds.values };
      const provenance: Record<string, string> = { ...seeds.provenance };
      const composition = installed && rawComposition ? installSkyWritingLibrary(rawComposition) : rawComposition;

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
            const checked = resolveIngressSource({ ...phraseSource.record, ingress: composition }, sourceId, target ? [target] : []);
            values[sourceId] = checked.reason ? "" : checked.text ?? "";
            provenance[sourceId] = checked.reason || `${source.reference.contentKey}#${source.reference.field}`;
          } else {
            values[sourceId] = typeof source.text === "string" ? source.text : "";
            provenance[sourceId] = `${phraseSource.record.contentKey ?? "selected placement"}#ingress.sources.${sourceId}`;
          }
        }
      }

      await Promise.all(ZODIAC_SEASON_VARIABLES.map(async field => {
        if (composition?.sources[field.id]) return;
        const key = zodiacSeasonSourceKey(field.id, phraseSource.sign);
        const row = await loadSource?.(key);
        values[field.id] = typeof row?.body === "string" ? row.body : "";
        provenance[field.id] = `${key}#body · Shared across sign-aware templates. Publish changes to update references.`;
      }));
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
  }, [phraseSource?.planet, phraseSource?.sign, phraseSourceRevision]);

  const contextLabel = phraseSource?.label ?? (phraseSource ? `${phraseSource.planet} in ${phraseSource.sign}` : "the selected placement");

  return <>
    <details className="admin-workspace-details admin-sky-variable-key">
      <AdminDisclosureSummary>Calculated Sky variables</AdminDisclosureSummary>
      <p>Read-only facts supplied by the selected placement or a calculated occurrence. Dates and aspect lists stay unavailable until the calculation exists; Content Studio never invents them.</p>
      <dl>
        {SKY_PLACEMENT_VARIABLES.map((variable: { name: string; description: string; availability: string }) => <div key={variable.name}>
          <dt>{onInsert ? <StudioButton type="button" disabled={disabled} aria-label={`Insert {{${variable.name}}}`} onClick={() => onInsert(`{{${variable.name}}}`)}>
            <code data-variable-color={variableColors.get(variable.name)}>{`{{${variable.name}}}`}</code>
          </StudioButton> : <code data-variable-color={variableColors.get(variable.name)}>{`{{${variable.name}}}`}</code>}</dt>
          <dd><p>{variable.description}</p><div className="admin-sky-variable-value"><span className={facts[variable.name] ? "variable-fact" : "variable-unmapped"}>{facts[variable.name] || "Needs calculated occurrence"}</span><small>{variable.availability}</small></div></dd>
        </div>)}
      </dl>
    </details>

    <details className="admin-workspace-details admin-sky-variable-key" aria-label="Editable phrase variables" open>
      <AdminDisclosureSummary>Editable phrase variables</AdminDisclosureSummary>
      <p><strong>Current writing for {contextLabel}.</strong> Editable phrase variables can be used directly in Placement articles, motion-specific Placement articles, and placement composition templates. Their prose is edited in the Writing Library. Empty fields stay empty until authored.</p>
      {phraseLoading && <PageLoading compact message="Loading the current Writing Library values…" />}
      {phraseError && <p role="alert">{phraseError}</p>}
      {!phraseSource && <p>Choose a planet and sign to load the phrase values.</p>}
      {SKY_WRITING_LIBRARY_GROUPS.map(group => ({ ...group, fields: group.fields.filter(item => !omitKinds.includes(item.kind)) })).filter(group => group.fields.length).map((group, groupIndex) => <details className="admin-workspace-details" key={group.id} open={groupIndex < 3 || undefined}>
          <AdminDisclosureSummary>{group.label}</AdminDisclosureSummary>
          <p>{group.description}</p>
          <dl>
            {group.fields.map(item => {
              const currentValue = phraseValues[item.id]?.trim() ?? "";
              const sourceLabel = phraseProvenance[item.id] || "No governed source is mapped yet.";
              const insert = onInsertPhrase ?? onInsert;
              const token = <code data-variable-color={variableColors.get(item.id)}>{`{{${item.id}}}`}</code>;
              return <div key={item.id}>
                <dt>{insert ? <StudioButton type="button" disabled={disabled} aria-label={`Insert {{${item.id}}}`} onClick={() => insert(`{{${item.id}}}`)}>{token}</StudioButton> : token}</dt>
                <dd>
                  <p>{item.label}. {item.description}</p>
                  <div className="admin-sky-variable-value">
                    <span className={currentValue ? phraseClass(item.kind) : "variable-unmapped"}>{phraseLoading ? "Loading selected content…" : currentValue || "No writing has been saved for this optional field."}</span>
                    <small>{currentValue ? "Loaded" : "Empty"}</small>
                  </div>
                  <details className="admin-workspace-details">
                    <AdminDisclosureSummary>Source and scope</AdminDisclosureSummary>
                    <p>{scopeLabel(item.kind)}</p>
                    <p><code>{sourceLabel}</code></p>
                    {!phraseInstalled && currentValue && <p>This is governed prefill text. It becomes an editable placement value when the Writing Library is saved.</p>}
                  </details>
                  {phraseSource?.onEdit && <StudioButton type="button" disabled={disabled || phraseLoading} onClick={() => phraseSource.onEdit?.(item.id)}>Edit {item.label.toLowerCase()}</StudioButton>}
                </dd>
              </div>;
            })}
          </dl>
        </details>)}
    </details>
  </>;
}
