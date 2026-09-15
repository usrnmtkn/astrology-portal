import { lazy, Suspense, useState, type ReactNode } from "react";
import type { CalendarTemplatePreviewProps } from "./CalendarTemplatePreview";
import { StudioButton } from "./StudioControls";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";

const MonthlyTemplateStudio = lazy(() => import("./MonthlyTemplateStudio"));
const CalendarTemplatePreview = lazy(() => import("./CalendarTemplatePreview"));
export default function SkyForecastTemplateStudio({ period, rows, busy, onOpen, editor, loadRows, draft, onEditSource, onEditOverview, secret = "", registerMonthlyCloseGuard, monthlyCloseGuard }: {
  secret?: string;
  registerMonthlyCloseGuard?: (guard:(()=>boolean)|null)=>void;
  monthlyCloseGuard?: { current: (()=>boolean)|null };
  period: SkyForecastPeriod;
  busy: boolean;
  onOpen: (period: SkyForecastPeriod) => void;
  editor: ReactNode;
} & CalendarTemplatePreviewProps) {
  const [monthlyOpen, setMonthlyOpen] = useState(false);
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
    {period === "monthly-sky" && <div className="admin-new-actions"><StudioButton onClick={() => { if(monthlyOpen && monthlyCloseGuard?.current && !monthlyCloseGuard.current()) return; setMonthlyOpen(value => !value); }} aria-expanded={monthlyOpen}>{monthlyOpen ? "Close monthly phrase editor" : "Open monthly phrase editor"}</StudioButton></div>}
    {period === "monthly-sky" && monthlyOpen && <Suspense fallback={<p role="status">Loading monthly sentence templates…</p>}><MonthlyTemplateStudio secret={secret} registerCloseGuard={registerMonthlyCloseGuard} /></Suspense>}
    <p>{saved ? `Saved template · ${saved.status.toLowerCase()}` : "Open to find your saved template or start a draft."}</p>
    <Suspense fallback={<p>Loading template preview…</p>}><CalendarTemplatePreview period={period} rows={rows} loadRows={loadRows} draft={draft} onEditSource={onEditSource} onEditOverview={onEditOverview} /></Suspense>
    <p className="admin-field-hint">Previewing or saving a template does not publish an overview.</p>
    {editor}
  </section>;
}
