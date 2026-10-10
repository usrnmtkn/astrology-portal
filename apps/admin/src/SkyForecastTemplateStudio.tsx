import { lazy, Suspense, type ReactNode } from "react";
import type { CalendarTemplatePreviewProps } from "./CalendarTemplatePreview";
import { StudioButton } from "./StudioControls";
import { PageLoading } from "../../../src/shared/components/PageLoading";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";

const CalendarPassageEditor = lazy(() => import("./CalendarPassageEditor"));
const CalendarTemplatePreview = lazy(() => import("./CalendarTemplatePreview"));
export default function SkyForecastTemplateStudio({ period, rows, busy, onOpen, editor, loadRows, draft, onEditSource, onEditOverview, onBrowseSeasonTransitions, secret }: {
  secret: string;
  period: SkyForecastPeriod;
  busy: boolean;
  onOpen: (period: SkyForecastPeriod) => void;
  editor: ReactNode;
} & CalendarTemplatePreviewProps) {
  const template = skyForecastTemplates[period];
  const saved = rows.find(row => row.content_key === template.contentKey);
  return <section className="admin-daily-glance-studio" aria-label={template.title}>
    <Suspense fallback={<PageLoading message="Loading assembled passage editor…" />}><CalendarPassageEditor key={period} period={period} loadRows={loadRows} secret={secret} onEditSource={onEditSource} /></Suspense>
    <details><summary>Reference templates and source previews</summary>
    <header className="admin-section-heading-row">
      <div>
        <h3>{template.title}</h3>
        <p>{template.description}</p>
      </div>
      <div className="admin-new-actions">
        <StudioButton disabled={busy} onClick={() => onOpen(period)}>Open {period.split("-")[0]} template</StudioButton>
        {period === "daily-sky" && <a className="admin-source-action" href="#sky-writeups?view=daily-summary&section=sun">Edit Sun summaries</a>}
      </div>
    </header>
    <p>{saved ? `Saved template · ${saved.status.toLowerCase()}` : "Open to find your saved template or start a draft."}</p>
    <Suspense fallback={<PageLoading message="Loading template preview…" />}><CalendarTemplatePreview period={period} rows={rows} loadRows={loadRows} draft={draft} onEditSource={onEditSource} onEditOverview={onEditOverview} onBrowseSeasonTransitions={onBrowseSeasonTransitions} /></Suspense>
    <p className="admin-field-hint">Previewing or saving a template does not publish an overview.</p>
    </details>
    {editor}
  </section>;
}
