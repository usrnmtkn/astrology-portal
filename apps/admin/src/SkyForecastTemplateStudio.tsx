import { lazy, Suspense, type ReactNode } from "react";
import type { CalendarTemplatePreviewProps } from "./CalendarTemplatePreview";
import { StudioButton } from "./StudioControls";
import { PageLoading } from "../../web/src/components/PageLoading";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";

const CalendarTemplatePreview = lazy(() => import("./CalendarTemplatePreview"));
export default function SkyForecastTemplateStudio({ period, rows, busy, onOpen, editor, loadRows, draft, onEditSource, onEditOverview, onBrowseSeasonTransitions }: {
  period: SkyForecastPeriod;
  busy: boolean;
  onOpen: (period: SkyForecastPeriod) => void;
  editor: ReactNode;
} & CalendarTemplatePreviewProps) {
  const template = skyForecastTemplates[period];
  const saved = rows.find(row => row.content_key === template.contentKey);
  return <section className="admin-daily-glance-studio" aria-label={template.title}>
    <header className="admin-section-heading-row">
      <div>
        <h3>{template.title}</h3>
        <p>{template.description}</p>
      </div>
      <StudioButton disabled={busy} onClick={() => onOpen(period)}>Open {period.split("-")[0]} template</StudioButton>
    </header>
    <p>{saved ? `Saved template · ${saved.status.toLowerCase()}` : "Open to find your saved template or start a draft."}</p>
    <Suspense fallback={<PageLoading message="Loading template preview…" />}><CalendarTemplatePreview period={period} rows={rows} loadRows={loadRows} draft={draft} onEditSource={onEditSource} onEditOverview={onEditOverview} onBrowseSeasonTransitions={onBrowseSeasonTransitions} /></Suspense>
    <p className="admin-field-hint">Previewing or saving a template does not publish an overview.</p>
    {editor}
  </section>;
}
