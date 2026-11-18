import { AdminDisclosureSummary } from "./AdminNativeControls";
import type { SkyWritingSystem } from "./skyWritingSystems";

const references = {
  placement: { name: "Placement writing", contract: "Placement composition · format 5", documentation: "SKY_PLACEMENT_V5.md" },
  summary: { name: "Daily Sky summary", contract: "Daily summary assembly", documentation: "SKY_WRITING_SYSTEMS.md" }
};
export default function SkyWritingSystemDetails({ system }: { system: SkyWritingSystem }) {
  const entry = references[system];
  return <details className="admin-workspace-details admin-writing-system-details" aria-label={`${entry.name} system details`}>
    <AdminDisclosureSummary>Writing reference</AdminDisclosureSummary>
    <div className="admin-composition-source-card">
      <strong>{entry.contract}</strong>
      <a href={`https://github.com/usrnmtkn/astrology-portal/blob/main/docs/content-management/${entry.documentation}`} target="_blank" rel="noreferrer">Writing documentation ↗</a>
    </div>
  </details>;
}
