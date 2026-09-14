import type { ReactNode } from "react";
import { StudioButton } from "./StudioControls";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";

export default function SkyForecastTemplateStudio({ period, rows, busy, onOpen, editor }: {
  period: SkyForecastPeriod;
  rows: { content_key: string; status: string }[];
  busy: boolean;
  onOpen: (period: SkyForecastPeriod) => void;
  editor: ReactNode;
}) {
  const template = skyForecastTemplates[period];
  const saved = rows.find(row => row.content_key === template.contentKey);
  return <section className="admin-daily-glance-studio" aria-label={template.title}>
    <header className="admin-section-heading-row">
      <div>
        <h3>{template.title}</h3>
        <p>{template.description}</p>
      </div>
      <StudioButton disabled={busy} onClick={() => onOpen(period)}>Open {period === "weekly-sky" ? "weekly" : "monthly"} template</StudioButton>
    </header>
    <p>{saved ? `Saved template · ${saved.status.toLowerCase()}` : "Open to find your saved template or start a draft."}</p>
    <p className="admin-field-hint">These are manual writing templates. Saving does not generate or publish an overview.</p>
    {editor}
  </section>;
}
