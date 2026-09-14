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
  return <section className="admin-daily-glance-studio" aria-label={`${template.label} workspace`}>
    <header className="admin-section-heading-row">
      <div>
        <h3>{template.title}</h3>
        <p>{template.description}</p>
      </div>
      <StudioButton disabled={busy} onClick={() => onOpen(period)}>Open {period === "weekly-sky" ? "weekly" : "monthly"} template</StudioButton>
    </header>
    <p>{saved ? `Saved template · ${saved.status.toLowerCase()}` : "No saved template in the loaded library. Open it to check for saved work or start a draft."}</p>
    <p className="admin-field-hint">These templates are writing references. Saving one does not generate an overview or add it to the public Calendar.</p>
    {editor}
  </section>;
}
