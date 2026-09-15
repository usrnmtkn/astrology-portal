import { lazy, Suspense, useState, type ReactNode } from "react";
import type { CalendarTemplatePreviewProps } from "./CalendarTemplatePreview";
import { StudioButton } from "./StudioControls";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";

const MonthlyPhraseStudio = lazy(() => import("./MonthlyPhraseStudio"));
const CalendarTemplatePreview = lazy(() => import("./CalendarTemplatePreview"));
export default function SkyForecastTemplateStudio({ period, rows, busy, onOpen, editor, loadRows, draft, onEditSource, onEditOverview, credential, registerCloseGuard }: {
  credential: string;
  registerCloseGuard?: (guard: (() => boolean) | null) => void;
  period: SkyForecastPeriod;
  busy: boolean;
  onOpen: (period: SkyForecastPeriod) => void;
  editor: ReactNode;
} & CalendarTemplatePreviewProps) {
  const [compose, setCompose] = useState(false);
  const template = skyForecastTemplates[period];
  const saved = rows.find(row => row.content_key === template.contentKey);
  if (compose && period === "monthly-sky") return <Suspense fallback={<p role="status">Loading monthly phrase composer…</p>}><MonthlyPhraseStudio credential={credential} onClose={() => setCompose(false)} registerCloseGuard={registerCloseGuard} /></Suspense>;
  return <section className="admin-daily-glance-studio" aria-label={template.title}>
    <header className="admin-section-heading-row">
      <div>
        <h3>{template.title}</h3>
        <p>{template.description}</p>
      </div>
      <div className="admin-new-actions"><StudioButton disabled={busy} onClick={() => onOpen(period)}>Open {period.split("-")[0]} template</StudioButton>
        {period === "monthly-sky" && <StudioButton disabled={busy || Boolean(draft)} onClick={() => setCompose(true)}>Generate monthly draft</StudioButton>}</div>
    </header>
    <p>{saved ? `Saved template · ${saved.status.toLowerCase()}` : "Open to find your saved template or start a draft."}</p>
    <Suspense fallback={<p>Loading template preview…</p>}><CalendarTemplatePreview period={period} rows={rows} loadRows={loadRows} draft={draft} onEditSource={onEditSource} onEditOverview={onEditOverview} /></Suspense>
    <p className="admin-field-hint">Previewing or saving a template does not publish an overview.</p>
    {editor}
  </section>;
}
