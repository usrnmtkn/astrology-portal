import { AdminDisclosureSummary } from "./AdminNativeControls";
import { skyWritingSystems, type SkyWritingSystem } from "./skyWritingSystems";

export default function SkyWritingSystemDetails({ system }: { system: SkyWritingSystem }) {
  const entry = skyWritingSystems[system];
  return <details className="admin-workspace-details admin-writing-system-details" aria-label={`${entry.name} system details`}>
    <AdminDisclosureSummary>Writing system & versions</AdminDisclosureSummary>
    <div className="admin-composition-source-card">
      <strong>{entry.contract}</strong>
      <p>{entry.purpose}</p>
      <code>{entry.source}</code>
      <p>Version numbers describe a format or proposal. Live status belongs to a published content source; a draft or newer document does not replace it automatically.</p>
      {entry.history.map(item => <div key={item.label}>
        <div className="admin-sky-writing-source-actions"><strong>{item.label}</strong><span className="ui-pill">{item.status}</span></div><p>{item.detail}</p>
      </div>)}
      <a href={`https://github.com/usrnmtkn/astrology-portal/blob/main/docs/content-management/${entry.documentation}`} target="_blank" rel="noreferrer">Read the current system contract ↗</a>
    </div>
  </details>;
}
