import { StudioButton, StudioTextarea } from "./StudioControls";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import {
  SKY_WRITING_LIBRARY_GROUPS,
  installSkyWritingLibrary,
  preferSkyWritingLibrary,
  skyWritingLibraryInstalled,
  skyWritingLibraryIsPrimary,
  type SkyWritingLibraryComposition,
  type SkyWritingLibrarySource
} from "./skyWritingLibrary";

type Props = {
  contentKey: string;
  composition: SkyWritingLibraryComposition;
  disabled: boolean;
  onChange: (composition: SkyWritingLibraryComposition) => void;
  onOpenSource: (contentKey: string, field: string) => void;
  onAdvancedSource: (sourceId: string) => void;
};

function updateSource(composition: SkyWritingLibraryComposition, id: string, source: SkyWritingLibrarySource) {
  return { ...composition, sources: { ...composition.sources, [id]: source } };
}

export default function SkyWritingLibraryEditor({ contentKey, composition, disabled, onChange, onOpenSource, onAdvancedSource }: Props) {
  const installed = skyWritingLibraryInstalled(composition);
  const primary = skyWritingLibraryIsPrimary(composition);

  if (!installed) return <section className="admin-sky-writing-context" aria-label="Sky writing library">
    <p className="admin-eyebrow">Editable writing library</p>
    <h4>Planet · sign · placement · experiences</h4>
    <p>Add the reusable phrase fields that power a richer placement fallback. The library is stored inside this placement’s existing V5 composition, so there is no second content database and no reader copy is invented.</p>
    <StudioButton type="button" disabled={disabled} onClick={() => onChange(installSkyWritingLibrary(composition))}>Add writing library fields</StudioButton>
  </section>;

  return <section className="admin-sky-writing-editor" aria-label="Sky writing library">
    <div className="admin-sky-writing-context">
      <p className="admin-eyebrow">Editable writing library</p>
      <h4>Planet · sign · placement · experiences</h4>
      <p>Edit the phrases directly here. Planet and sign sources can be reused across matching placements; planet × sign and experience sources stay specific to this placement. Calculated dates, motion, signs, and aspects remain read-only facts.</p>
      <p role="status"><strong>{primary ? "Writing library is the primary V5 fallback structure." : "Writing library fields are available, but the existing V5 structure still controls required fallback sections."}</strong></p>
      {!primary && <StudioButton type="button" disabled={disabled} onClick={() => onChange(preferSkyWritingLibrary(composition))}>Use writing library as primary fallback structure</StudioButton>}
      <small>This changes the draft structure only. It keeps the previous source fields in the record for provenance and rollback; it does not publish or alter the approved serving baseline.</small>
    </div>

    {SKY_WRITING_LIBRARY_GROUPS.map((group, groupIndex) => <details className="admin-workspace-details" key={group.id} open={groupIndex < 3 || undefined}>
      <AdminDisclosureSummary>{group.label}</AdminDisclosureSummary>
      <p>{group.description}</p>
      <div className="admin-review-stack">
        {group.fields.map(item => {
          const source = composition.sources[item.id];
          if (!source) return null;
          const reference = source.reference;
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
              <small>Source: <code>{contentKey}#ingress.sources.{item.id}</code> · scope: {item.kind}</small>
              <StudioButton type="button" disabled={disabled} onClick={() => onAdvancedSource(item.id)}>Advanced source tools</StudioButton>
            </div>
          </div>;
        })}
      </div>
    </details>)}
  </section>;
}
