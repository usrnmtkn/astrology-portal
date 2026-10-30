import { studioLazy as lazy } from "./studioLazy";
import { Suspense, type ReactNode } from "react";
import type { CalendarTemplatePreviewProps } from "./CalendarTemplatePreview";
import { StudioButton } from "./StudioControls";
import { PageLoading } from "../../../src/shared/components/PageLoading";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";
import type { StudioPassageEdit } from '../../../src/shared/studioPassageEdit';

const CalendarPassageEditor = lazy(() => import("./CalendarPassageEditor"));
const CalendarTemplatePreview = lazy(() => import("./CalendarTemplatePreview"));
export default function SkyForecastTemplateStudio({ period, rows, busy, onOpen, editor, loadRows, draft, onEditSource, onEditOverview, onBrowseSeasonTransitions, secret, readerEntry }: {
  secret: string;
  period: SkyForecastPeriod;
  busy: boolean;
  onOpen: (period: SkyForecastPeriod) => void;
  editor: ReactNode;
  readerEntry?: StudioPassageEdit | null;
} & CalendarTemplatePreviewProps) {
  const template = skyForecastTemplates[period];
  const saved = rows.find(row => row.content_key === template.contentKey);
  return <section className="admin-daily-glance-studio" aria-label={template.title}>
    {period === "monthly-sky" ? <>
      <h3>Publish the monthly reading</h3>
      <p>Publish your Monthly edition in Horoscopes. Calendar Month uses its TLDR and links to the complete reading.</p>
      <a className="admin-source-action" href="#horoscopes">Open Monthly horoscopes</a>
      <p className="admin-field-hint">Earlier Calendar monthly passages remain in Content Library.</p>
    </> : <Suspense fallback={<PageLoading message="Loading assembled passage editor…" />}><CalendarPassageEditor key={`${period}|${readerEntry?.sourceKey ?? ''}|${readerEntry?.date ?? ''}|${readerEntry?.timeZone ?? ''}`} period={period} loadRows={loadRows} secret={secret} onEditSource={onEditSource} readerEntry={readerEntry} sourceEditor={editor} sourceDraft={draft} /></Suspense>}
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
    {period === 'monthly-sky' && editor}
  </section>;
}
