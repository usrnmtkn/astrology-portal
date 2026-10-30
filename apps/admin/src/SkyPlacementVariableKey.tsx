import { ZODIAC_SEASON_VARIABLES, zodiacSeasonSourceKey } from "../../web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
import { useEffect, useRef, useState } from "react";
import { compositionVariableColors } from "./CompositionVariableKey";
import { StudioButton, StudioInput } from "./StudioControls";
import { PageLoading } from "../../../src/shared/components/PageLoading";
import { AdminDataTable } from "./AdminBrowseComponents";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
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

import { variableLabel, variableMatches } from './variablePresentation';
import { studioVariableEditorHref } from './studioCustomVariableClient';

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

export function SkyVariableText({ value, facts, source, references = [], onEditPhrase, disabled = false }: {
  value: string; facts: SkyVariableFacts; source?: Record<string, any>; references?: Record<string, any>[];
  onEditPhrase?: (name: string) => void; disabled?: boolean;
}) {
  const segments = source ? skyPlacementArticleVariableSegments(value, facts, source, references) : skyPlacementVariableSegments(value, facts);
  return <>{segments.map((part: { text: string; token?: string; name?: string; kind?: string; reason?: string; available?: boolean }, index: number) => {
    if (!part.token) return <span key={index}>{part.text}</span>;
    const className = `admin-composition-variable ${!part.available ? "variable-unmapped" : part.kind && part.kind !== "fact" ? phraseClass(part.kind) : "variable-fact"}`;
    const title = `${part.token} · ${part.reason || (part.kind && part.kind !== "fact" ? "Writing Library phrase" : part.available ? "calculated value" : "needs a calculated value")}`;
    const phrase = libraryPhraseSlots.find(slot => slot.name === part.name);
    if (onEditPhrase && part.kind === 'custom' && part.name) return <a key={index} className={`${className} studio-variable-value`}
      data-variable-color={variableColors.get(part.name)} href={studioVariableEditorHref(part.name)} target="_blank" rel="noopener noreferrer"
      aria-label={`Edit saved variable ${part.name} in a separate tab`} aria-disabled={disabled} onClick={event => { if (disabled) event.preventDefault(); }} title={title}>{part.text}</a>;
    return onEditPhrase && phrase && part.kind !== 'fact' && part.kind !== 'custom'
      ? <StudioButton key={index} type="button" className={`${className} studio-variable-value`} data-variable-color={variableColors.get(part.name ?? '')}
        data-article-phrase={part.name} aria-label={`Edit saved wording for ${variableLabel(phrase.name)}`} title={title} disabled={disabled}
        onClick={() => onEditPhrase(phrase.name)}>{part.text}</StudioButton>
      : <span key={index} className={className} data-variable-color={variableColors.get(part.name ?? '')} title={title}>{part.text}</span>;
  })}</>;
}

export default function SkyPlacementVariableKey({ facts, onInsert, onInsertPhrase, disabled = false, phraseSource, omitKinds = [], usedNames }: {
  facts: SkyVariableFacts;
  onInsert?: (token: string) => void;
  onInsertPhrase?: (token: string) => void;
  disabled?: boolean;
  phraseSource?: PhraseSourceContext;
  omitKinds?: string[];
  usedNames?: string[];
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [usedOnly, setUsedOnly] = useState(false);
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

      // A shared sign source that is missing or fails to load leaves its own row
      // empty. It must never blank the rest of the table.
      await Promise.all(ZODIAC_SEASON_VARIABLES.map(async field => {
        if (composition?.sources[field.id]) return;
        const key = zodiacSeasonSourceKey(field.id, phraseSource.sign);
        let row: Record<string, any> | undefined;
        let reason = "";
        try { row = await loadSource?.(key); } catch (cause) { reason = cause instanceof Error ? cause.message : "could not be loaded"; }
        values[field.id] = typeof row?.body === "string" ? row.body : "";
        provenance[field.id] = reason
          ? `${key}#body · ${reason}`
          : `${key}#body · Shared across sign-aware templates. Publish changes to update references.`;
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

  const selectedKind = !phraseSource && kind === 'writing' ? 'all' : kind;
  const included = (name: string, label: string, description: string, value: string, isPhrase: boolean) =>
    (!usedOnly || !usedNames || usedNames.includes(name)) && (selectedKind === 'all' || selectedKind === (isPhrase ? 'writing' : 'fact'))
    && (availability === 'all' || isPhrase && phraseLoading || (availability === 'ready') === Boolean(value.trim()))
    && variableMatches(query, name, label, description, value);
  const factRows = SKY_PLACEMENT_VARIABLES.filter((item: { name: string; description: string }) => included(item.name, variableLabel(item.name), item.description, facts[item.name] ?? '', false));
  const phraseGroups = (phraseSource ? SKY_WRITING_LIBRARY_GROUPS : []).map(group => ({ ...group, fields: group.fields.filter(item =>
    !omitKinds.includes(item.kind) && included(item.id, item.label, item.description, phraseValues[item.id] ?? '', true)) })).filter(group => group.fields.length);
  const count = factRows.length + phraseGroups.reduce((total, group) => total + group.fields.length, 0);
  return <>
    <div className="admin-filter-form" role="group" aria-label="Sky variable filters">
      <label><span>Find a variable</span><StudioInput type="search" aria-label="Find Sky variable" placeholder="Name, meaning, token, or wording" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label><span>Type</span><AdminSelect aria-label="Sky variable type" value={selectedKind} onChange={event => setKind(event.target.value)}><option value="all">All types</option><option value="fact">Calculated facts</option>{phraseSource && <option value="writing">Saved writing</option>}</AdminSelect></label>
      <label><span>Availability</span><AdminSelect aria-label="Sky variable availability" value={availability} onChange={event => setAvailability(event.target.value)}><option value="all">All values</option><option value="ready">With a value</option><option value="missing">Missing a value</option></AdminSelect></label>
      {usedNames && <label className="studio-contained-toggle"><StudioInput type="checkbox" checked={usedOnly} onChange={event => setUsedOnly(event.target.checked)} />Only variables used in this section</label>}
      {(query || kind !== 'all' || availability !== 'all' || usedOnly) && <StudioButton onClick={() => { setQuery(''); setKind('all'); setAvailability('all'); setUsedOnly(false); }}>Clear variable filters</StudioButton>}
    </div>
    <p className="admin-field-hint" role="status">{count} matching variables. Calculated facts come from the placement or preview; saved writing comes from its named source. Inserting a token keeps that connection.</p>
    {!count && <p role="status">No matching Sky variables. Clear the filters or search by name or meaning.</p>}
    {factRows.length > 0 && <details className="admin-workspace-details admin-sky-variable-key" open={Boolean(query) || kind === 'fact' || undefined}>
      <AdminDisclosureSummary>Calculated Sky variables</AdminDisclosureSummary>
      <p>Read-only facts supplied by the selected placement or a calculated occurrence. Dates and aspect lists stay unavailable until the calculation exists; Content Studio never invents them.</p>
      <AdminDataTable label="Calculated Sky variable values" columns={["Variable", "Value", "When it is available"]}>
        {factRows.map((variable: { name: string; description: string; availability: string }) => <tr key={variable.name}>
          <th scope="row" data-label="Variable">
            <span>{variableLabel(variable.name)}</span><br />
            {onInsert ? <StudioButton type="button" disabled={disabled} aria-label={`Insert {{${variable.name}}}`} onClick={() => onInsert(`{{${variable.name}}}`)}>
              <code data-variable-color={variableColors.get(variable.name)}>{`{{${variable.name}}}`}</code>
            </StudioButton> : <><code data-variable-color={variableColors.get(variable.name)}>{`{{${variable.name}}}`}</code></>}
            <p>{variable.description}</p>
          </th>
          <td data-label="Value"><span className={facts[variable.name] ? "variable-fact" : "variable-unmapped"}>{facts[variable.name] || "Needs calculated occurrence"}</span></td>
          <td data-label="When it is available"><small>{variable.availability}</small></td>
        </tr>)}
      </AdminDataTable>
    </details>}

    {(phraseGroups.length > 0 || phraseError) && <details className="admin-workspace-details admin-sky-variable-key" aria-label="Editable phrase variables" open>
      <AdminDisclosureSummary>Editable phrase variables</AdminDisclosureSummary>
      <p><strong>Current writing for {contextLabel}.</strong> Editable phrase variables can be used directly in Placement articles, motion-specific Placement articles, and placement composition templates. Their prose is edited in the Writing Library. Empty fields stay empty until authored.</p>
      {phraseLoading && <PageLoading compact message="Loading the current Writing Library values…" />}
      {phraseError && <p role="alert">{phraseError}</p>}
      {!phraseSource && <p>Choose a planet and sign to load the phrase values.</p>}
      {phraseGroups.map((group, groupIndex) => <details className="admin-workspace-details" key={group.id} open={Boolean(query) || kind === 'writing' || groupIndex < 3 || undefined}>
          <AdminDisclosureSummary>{group.label}</AdminDisclosureSummary>
          <p>{group.description}</p>
          <AdminDataTable label={`${group.label} phrases for ${contextLabel}`} columns={["Variable", "Writing", "Where it is stored", "Edit"]}>
            {group.fields.map(item => {
              const currentValue = phraseValues[item.id]?.trim() ?? "";
              const sourceLabel = phraseProvenance[item.id] || "No governed source is mapped yet.";
              const insert = onInsertPhrase ?? onInsert;
              const token = <code data-variable-color={variableColors.get(item.id)}>{`{{${item.id}}}`}</code>;
              return <tr key={item.id}>
                <th scope="row" data-label="Variable">
                  <span>{item.label}</span><br />
                  {insert ? <StudioButton type="button" disabled={disabled} aria-label={`Insert {{${item.id}}}`} onClick={() => insert(`{{${item.id}}}`)}>{token}</StudioButton> : token}
                  <p>{item.description}</p>
                </th>
                <td data-label="Writing">
                  <span className={currentValue ? phraseClass(item.kind) : "variable-unmapped"}>{phraseLoading ? "Loading selected content…" : currentValue || "No writing has been saved for this optional field."}</span>
                  <small>{currentValue ? "Loaded" : "Empty"}</small>
                </td>
                <td data-label="Where it is stored">
                  <span className="admin-field-hint">{scopeLabel(item.kind)}</span>
                  <p className="admin-natal-source-key"><span>Source key</span><code>{sourceLabel}</code></p>
                  {!phraseInstalled && currentValue && <p>This is governed prefill text. It becomes an editable placement value when the Writing Library is saved.</p>}
                </td>
                <td data-label="Edit">
                  {phraseSource?.onEdit && <StudioButton type="button" disabled={disabled || phraseLoading} onClick={() => phraseSource.onEdit?.(item.id)}>Edit {item.label.toLowerCase()}</StudioButton>}
                </td>
              </tr>;
            })}
          </AdminDataTable>
        </details>)}
    </details>}
  </>;
}
