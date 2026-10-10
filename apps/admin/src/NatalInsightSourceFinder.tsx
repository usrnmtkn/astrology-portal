import { useState } from "react";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import { StudioButton } from "./StudioControls";
import { studioServingStatusRow } from "./studioServingStatus";
import { Text } from "./studio-ds/primitives";
import type { WritingSurfaceAdminAccess, WritingSurfaceMapItem, WritingSurfaceCmsStarter } from "./writingSurfaceSourceMap";

type Row = { content_key: string; headline: string | null; status: string };
export type NatalInsightSourceProps = {
  insightSurfaces: WritingSurfaceMapItem[];
  insightAccess: Record<string, WritingSurfaceAdminAccess>;
  onOpenInsight: (surface: WritingSurfaceMapItem, starter: WritingSurfaceCmsStarter) => void;
};

export default function NatalInsightSourceFinder({ insightSurfaces, insightAccess, onOpenInsight, rows, isLoading, onOpenSource }: NatalInsightSourceProps & {
  rows: Row[];
  isLoading: boolean;
  onOpenSource: (key: string, label: string) => void;
}) {
  const [selectedKey, setSelectedKey] = useState("");
  const savedRows = rows.filter(row => row.content_key.startsWith("cms/natal-insight/"));
  const selectedRow = savedRows.find(row => row.content_key === selectedKey);
  const surfaces = insightSurfaces.filter(surface => surface.id.startsWith("natal-insight-"));
  return <section className="admin-natal-source-group" aria-label="Deeper insights writing">
    <header><h3>Deeper insights</h3>
      <Text size="body" tone="secondary">Edit the shared guides and reading templates used in You and Friends.</Text>
    </header>
    <div className="admin-natal-source-grid">
      {surfaces.map(surface => {
        const [guide, ...templates] = insightAccess[surface.id]?.cmsStarters ?? [];
        if (!guide) return null;
        const row = savedRows.find(row => row.content_key === guide.contentKey);
        return <article className="admin-natal-source-card" key={surface.id}>
          <div className="admin-natal-source-card-heading">
            <h4>{row?.headline || guide.headline}</h4>
            <ContentLiveStatusBadge row={studioServingStatusRow(row, guide.contentKey)} />
          </div>
          <StudioButton disabled={isLoading} onClick={() => onOpenInsight(surface, guide)}>{guide.label}</StudioButton>
          <details className="admin-workspace-details">
            <AdminDisclosureSummary>Reading templates and variants</AdminDisclosureSummary>
            <div className="admin-action-row">
              {templates.map(starter => <StudioButton key={starter.contentKey} disabled={isLoading} onClick={() => onOpenInsight(surface, starter)}>{starter.label}</StudioButton>)}
            </div>
          </details>
        </article>;
      })}
    </div>
    {!surfaces.length && <Text role="status" size="body" tone="secondary">The guide list is unavailable. Reload to try again, or open saved writing below.</Text>}
    <section className="admin-natal-source-group" aria-label="Saved natal insight writing">
      <header><h3>Saved writing</h3></header>
      <label className="admin-filter-form">
        <span>Guide, template, or passage</span>
        <AdminSelect value={selectedKey} onChange={event => setSelectedKey(event.target.value)} disabled={isLoading}>
          <option value="">Choose saved writing</option>
          {savedRows.map(row => <option key={row.content_key} value={row.content_key}>{row.headline || "Untitled"} · {row.content_key.slice("cms/natal-insight/".length)}</option>)}
        </AdminSelect>
      </label>
      {!isLoading && !savedRows.length && <Text size="body" tone="secondary">No natal insight writing has been saved yet. Open a guide above to start a draft.</Text>}
      <StudioButton disabled={isLoading || !selectedRow} onClick={() => selectedRow && onOpenSource(selectedRow.content_key, selectedRow.headline || "Natal insight")}>Edit saved writing</StudioButton>
    </section>
  </section>;
}
