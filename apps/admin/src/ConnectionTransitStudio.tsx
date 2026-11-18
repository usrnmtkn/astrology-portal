import { useState } from "react";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton } from "./StudioControls";
import { FrictionFlowStudio } from "./FrictionFlowStudio";
import { connectionActivationKey, connectionAspects, connectionPoints, connectionPointTitle, connectionBridgeTemplates } from "../../web/src/content/connectionTransit";

export default function ConnectionTransitStudio({ onEdit, onOpenTransits, busy }: {
  onEdit: (key: string) => void; onOpenTransits: () => void; busy: boolean;
}) {
  const [selection, setSelection] = useState(["ascendant", "square", "saturn"]);
  const key = connectionActivationKey(...selection as [string,string,string])!;
  return <section className="studio-surface studio-section" aria-label="Connection transit sources">
    <FrictionFlowStudio busy={busy} onEdit={onEdit}/>
    <section className="admin-editor-guidance" aria-label="Transit reading source">
      <h2>Transit reading</h2>
      <p>Existing complete You/Friend transit reading with calculated timing.</p>
      <StudioButton type="button" onClick={onOpenTransits}>Open Personal Transits</StudioButton>
    </section>
    <section className="admin-editor-guidance" aria-label="Connection activation content type">
      <h2>Connection Activations</h2>
      <p>What this activates. New passages start empty and unpublished.</p>
      {["Your point", "Aspect", "Their point"].map((label,index) => <label key={label}>{label}<AdminSelect value={selection[index]} onChange={e => setSelection(values => values.map((value,i) => i === index ? e.target.value : value))}>{(index === 1 ? connectionAspects : connectionPoints).map(value => <option key={value} value={value}>{connectionPointTitle(value)}</option>)}</AdminSelect></label>)}
      <p><code>{key}</code></p>
      <p>Use {"{{holder1}}"} for the friend. Reverse direction needs its own key. Reciprocal copy is editorial only.</p>
      <StudioButton type="button" disabled={busy} onClick={() => onEdit(key)}>Open activation draft</StudioButton>
    </section>
    <section className="admin-editor-guidance" aria-label="Connection transit bridge content type">
      <h2>Connection Transit Bridges</h2>
      <p>Each bridge requires its own publication and a published activation.</p>
      {connectionBridgeTemplates.map(t => <article key={t.contentKey}>
        <h3>{t.label}</h3><p>{t.body}</p>
        <StudioButton type="button" disabled={busy} onClick={() => onEdit(t.contentKey)}>Edit {t.label.toLowerCase()} bridge</StudioButton>
      </article>)}
    </section>
  </section>;
}
