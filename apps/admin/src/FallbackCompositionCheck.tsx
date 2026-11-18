export type AdminFallbackCompositionDiagnostic = {
  title: string;
  status: string;
  body: string;
  template: string;
  slots: string[];
  sourceLanes: string[];
  action: string;
};

export default function FallbackCompositionCheck({ diagnostic }: { diagnostic: AdminFallbackCompositionDiagnostic }) {
  return (
    <section className="studio-surface studio-section admin-fallback-diagnostic-panel" aria-label="Fallback composition check">
      <div className="admin-fallback-diagnostic-heading">
        <div>
          <p className="admin-eyebrow">Fallback system</p>
          <h3>{diagnostic.title}</h3>
        </div>
        <strong>{diagnostic.status}</strong>
      </div>
      <p>{diagnostic.body}</p>
      <div className="admin-fallback-diagnostic-grid">
        <div>
          <span>Template</span>
          <code>{diagnostic.template}</code>
        </div>
        <div>
          <span>Assembled slots</span>
          <ul>
            {diagnostic.slots.map((slot) => <li key={slot}><code>{slot}</code></li>)}
          </ul>
        </div>
        <div>
          <span>Source lanes</span>
          <ul>
            {diagnostic.sourceLanes.map((lane) => <li key={lane}><code>{lane}</code></li>)}
          </ul>
        </div>
      </div>
      <p><strong>Fix path:</strong> {diagnostic.action}</p>
    </section>
  );
}
