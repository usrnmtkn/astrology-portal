import { useState } from "react";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton } from "./StudioControls";
import { connectionActivationKey, connectionAspects, connectionPoints, connectionPointTitle, connectionBridgeTemplates } from "../../web/src/content/connectionTransit";

export default function ConnectionTransitStudio({ onEdit, onOpenTransits, busy }: {
  onEdit: (key: string) => void; onOpenTransits: () => void; busy: boolean;
}) {
  const [yourPoint, setYourPoint] = useState("ascendant");
  const [theirPoint, setTheirPoint] = useState("saturn");
  const [aspect, setAspect] = useState("square");
  const key = connectionActivationKey(yourPoint, aspect, theirPoint)!;
  return <section className="studio-surface studio-section" aria-label="Connection transit sources">
    <p>Connection details use three independent sources. Between you two keeps its existing approved passages.</p>
    <section className="admin-editor-guidance" aria-label="Transit reading source">
      <h2>Transit reading</h2>
      <p>Uses the existing complete You or Friend personal transit reading and its calculated end date.</p>
      <StudioButton type="button" onClick={onOpenTransits}>Open Personal Transits</StudioButton>
    </section>
    <section className="admin-editor-guidance" aria-label="Connection activation content type">
      <h2>Connection Activations</h2>
      <p>Exact directional passages for What this activates. New entries start empty and unpublished. Existing synastry and bond text is never copied into these entries.</p>
      <label>Your point<AdminSelect value={yourPoint} onChange={e => setYourPoint(e.target.value)}>{connectionPoints.map(p => <option key={p} value={p}>{connectionPointTitle(p)}</option>)}</AdminSelect></label>
      <label>Aspect<AdminSelect value={aspect} onChange={e => setAspect(e.target.value)}>{connectionAspects.map(a => <option key={a} value={a}>{a}</option>)}</AdminSelect></label>
      <label>Their point<AdminSelect value={theirPoint} onChange={e => setTheirPoint(e.target.value)}>{connectionPoints.map(p => <option key={p} value={p}>{connectionPointTitle(p)}</option>)}</AdminSelect></label>
      <p><code>{key}</code></p>
      <p>The reader sees body_you for this direction. Use {"{{holder1}}"} for the friend. The opposite direction has its own key; body_they is retained for editorial review and never substitutes for a missing body_you.</p>
      <StudioButton type="button" disabled={busy} onClick={() => onEdit(key)}>Open activation draft</StudioButton>
    </section>
    <section className="admin-editor-guidance" aria-label="Connection transit bridge content type">
      <h2>Connection Transit Bridges</h2>
      <p>Calculated templates appear only alongside a published activation. Opening an editor does not publish a template.</p>
      {connectionBridgeTemplates.map(t => <article key={t.contentKey}>
        <h3>{t.label}</h3><p>{t.body}</p>
        <StudioButton type="button" disabled={busy} onClick={() => onEdit(t.contentKey)}>Edit {t.label.toLowerCase()} bridge</StudioButton>
      </article>)}
    </section>
  </section>;
}
