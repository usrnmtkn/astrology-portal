import { useState } from "react";
import { StudioButton, StudioTextarea } from "./StudioControls";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import {
  SKY_WRITING_LIBRARY_FIELD_IDS,
  SKY_WRITING_LIBRARY_GROUPS,
  installSkyWritingLibrary,
  loadSkyWritingLibrarySeeds,
  preferSkyWritingLibrary,
  skyWritingLibraryInstalled,
  skyWritingLibraryIsPrimary,
  skyWritingLibrarySourceModuleEnabled,
  toggleSkyWritingLibrarySourceModule,
  type SkyWritingLibraryComposition,
  type SkyWritingLibrarySource
} from "./skyWritingLibrary";

type RecordValue = Record<string, any>;
type Props = {
  contentKey: string;
  planet: string;
  sign: string;
  sourceRecord: RecordValue;
  composition: SkyWritingLibraryComposition;
  disabled: boolean;
  onChange: (composition: SkyWritingLibraryComposition) => void;
  onOpenSource: (contentKey: string, field: string) => void;
  onLoadSource?: (contentKey: string) => Promise<RecordValue | undefined>;
  onAdvancedSource: (sourceId: string) => void;
};

function updateSource(composition: SkyWritingLibraryComposition, id: string, source: SkyWritingLibrarySource) {
  return { ...composition, sources: { ...composition.sources, [id]: source } };
}

function filledLibraryFields(composition: SkyWritingLibraryComposition) {
  return SKY_WRITING_LIBRARY_FIELD_IDS.filter(id => {
    const source = composition.sources[id];
    return Boolean(source?.reference || source?.text?.trim());
  }).length;
}

export default function SkyWritingLibraryEditor({ contentKey, planet, sign, sourceRecord, composition, disabled, onChange, onOpenSource, onLoadSource, onAdvancedSource }: Props) {
  const installed = skyWritingLibraryInstalled(composition);
  const primary = skyWritingLibraryIsPrimary(composition);
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState("");

  async function fillFromGovernedSources() {
    if (disabled || seeding) return;
    setSeeding(true);
    setSeedStatus("");
    try {
      const before = filledLibraryFields(composition);
      const { values, provenance } = await loadSkyWritingLibrarySeeds(sourceRecord, planet, sign, onLoadSource);
      const next = installSkyWritingLibrary(composition, values);
      const after = filledLibraryFields(next);
      onChange(next);
      const added = Math.max(0, after - before);
      const available = Object.values(values).filter(value => value.trim()).length;
      setSeedStatus(`${added} empty field${added === 1 ? "" : "s"} filled. ${available} governed source value${available === 1 ? " was" : "s were"} available for this placement; existing writing was not overwritten.${Object.keys(provenance).length ? "" : " No reusable source copy was available."}`);
    } catch (reason) {
      setSeedStatus(reason instanceof Error ? reason.message : "Writing library sources could not be loaded.");
    } finally {
      setSeeding(false);
    }
  }

  if (!installed) return <section className="admin-sky-writing-context" aria-label="Sky writing library">
    <p className="admin-eyebrow">Editable writing library</p>
    <h4>Planet · sign · placement · experiences</h4>
    <p>Add the reusable phrase fields and prefill every field that has a clean existing source. Placement fields reuse this record’s approved TLDR/fallback copy; planet and sign fields pull from the governed fallback vocabulary. Nothing new is generated and nothing is published by this action.</p>
    <StudioButton type="button" disabled={disabled || seeding} onClick={() => void fillFromGovernedSources()}>{seeding ? "Loading governed sources…" : "Add prefilled writing library"}</StudioButton>
    {seedStatus && <p role="status">{seedStatus}</p>}
  </section>;

  return <section className="admin-sky-writing-editor" aria-label="Sky writing library">
    <div className="admin-sky-writing-context">
      <p className="admin-eyebrow">Editable writing library</p>
      <h4>Planet · sign · placement · experiences</h4>
      <p>Edit the phrases directly here. Planet and sign language starts from existing governed vocabulary; planet × sign fields start from this placement’s current approved TLDR/fallback copy where the source role matches cleanly. Empty optional fields stay empty instead of receiving invented prose.</p>
      <div className="admin-sky-writing-source-actions">
        <StudioButton type="button" disabled={disabled || seeding} onClick={() => void fillFromGovernedSources()}>{seeding ? "Loading governed sources…" : "Fill empty fields from source library"}</StudioButton>
        {!primary && <StudioButton type="button" disabled={disabled} onClick={() => onChange(preferSkyWritingLibrary(composition))}>Use writing library as primary fallback structure</StudioButton>}
      </div>
      {seedStatus && <p role="status">{seedStatus}</p>}
      <p role="status"><strong>{primary ? "Writing library is the primary V5 fallback structure in this draft." : "The existing V5 structure still controls required fallback sections."}</strong></p>
      <small>Source filling never overwrites a field you have already written or linked. Using the library as the primary structure changes the draft only; Save & publish remains a separate owner action.</small>
    </div>

    {SKY_WRITING_LIBRARY_GROUPS.map((group, groupIndex) => <details className="admin-workspace-details" key={group.id} open={groupIndex < 3 || undefined}>
      <AdminDisclosureSummary>{group.label}</AdminDisclosureSummary>
      <p>{group.description}</p>
      {group.id === "experiences" && <p>An experience can live in the library without appearing in reader copy. Choose <strong>Include in fallback</strong> only for the manifestations that actually belong in this article.</p>}
      <div className="admin-review-stack">
        {group.fields.map(item => {
          const source = composition.sources[item.id];
          if (!source) return null;
          const reference = source.reference;
          const included = group.id === "experiences" && skyWritingLibrarySourceModuleEnabled(composition, item.id);
          return <div className="admin-editor-guidance" key={item.id}>
            <label className="admin-review-copy-editor">
              <span><strong>{item.label}</strong> <code>{`{{${item.id}}}`}</code></span>
              <small>{item.description}</small>
              {reference ? <>
                <p>Linked exact revision: <code>{reference.contentKey}#{reference.field}</code></p>
                <div className="admin-sky-writing-source-actions">
                  <StudioButton type="button" onClick={() => onOpenSource(reference.contentKey, reference.field)}>Edit linked source</StudioButton>
                  <StudioButton type="button" disabled={disabled} onClick={() => onChange(updateSource(composition, item.id, { kind: source.kind, text: "" }))}>Use local writing</StudioButton>
                </div>
              </> : <StudioTextarea
                rows={item.rows ?? 4}
                aria-label={`Writing library ${item.label}`}
                className="admin-copy-field-body"
                disabled={disabled}
                value={source.text ?? ""}
                onChange={event => onChange(updateSource(composition, item.id, { ...source, text: event.target.value }))}
              />}
            </label>
            <div className="admin-sky-writing-source-actions">
              {group.id === "experiences" && <StudioButton
                type="button"
                aria-pressed={included}
                disabled={disabled || (!included && composition.modules.length >= 32)}
                onClick={() => onChange(toggleSkyWritingLibrarySourceModule(composition, item.id, item.label))}
              >{included ? "Remove from fallback" : "Include in fallback"}</StudioButton>}
              <small>Local source: <code>{contentKey}#ingress.sources.{item.id}</code> · scope: {item.kind}</small>
              <StudioButton type="button" disabled={disabled} onClick={() => onAdvancedSource(item.id)}>Advanced source tools</StudioButton>
            </div>
          </div>;
        })}
      </div>
    </details>)}
  </section>;
}
