import { StudioButton } from "./StudioControls";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import { SkyInlineTemplate } from "./SkyInlineTemplate";
import type { SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";
import { skyDebilitySlots } from "../../web/src/content/skyDebilityCopy";
import { skyDebilityFields } from "../../web/src/content/skyDebilityCatalog";
import type { SummaryCompositionRow } from "./skySummaryComposition";

const previewSlots = skyDebilitySlots({
  framework: "traditional-seven-planet-sign",
  traditionalCount: 7,
  knownCount: 7,
  count: 2,
  planets: []
});

export function SkyDebilityStudio({
  rows,
  onEdit,
  busy
}: {
  rows: SummaryCompositionRow[];
  onEdit: (field: SkySummaryField, initialBody?: string) => void;
  busy: boolean;
}) {
  const slots = Object.fromEntries(Object.entries(previewSlots).map(([name, value]) => [
    name,
    <span className="admin-composition-variable variable-fact" title="Calculated sky fact">{value}</span>
  ]));
  return (
    <section className="admin-daily-glance-studio" aria-label="Without their tools editor">
      <header className="admin-section-heading-row">
        <div>
          <p className="admin-eyebrow">Sky Write-ups</p>
          <h3>Without their tools</h3>
          <p>This card sits under The sky today. Counts, planet names, and signs stay calculated. Edit the surrounding wording, then Save &amp; publish.</p>
        </div>
      </header>
      <div className="admin-daily-glance-pair-list" aria-label="Without their tools fields">
        {skyDebilityFields.map(field => {
          const saved = rows.find(row => row.content_key === field.key);
          const body = saved?.body ?? field.body;
          return (
            <article key={field.key} aria-label={field.label}>
              <div>
                <strong>{field.label}</strong>
                <SkyInlineTemplate field={field} body={body} slots={slots} onEdit={onEdit} busy={busy} label={field.label} />
                <p><ContentLiveStatusBadge row={saved ?? { id: `builtin:${field.key}` }} /></p>
                {field.allowedSlots.length > 0 ? <small> · Calculated fields: {field.allowedSlots.map(slot => `{${slot}}`).join(", ")}</small> : null}
              </div>
              <StudioButton type="button" disabled={busy} onClick={() => onEdit(field)}>Edit wording</StudioButton>
            </article>
          );
        })}
      </div>
    </section>
  );
}
