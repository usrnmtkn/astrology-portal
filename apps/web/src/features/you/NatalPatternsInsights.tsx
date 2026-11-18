import { useId } from "react";
import type { SkySnapshot } from "../../types";
import { NatalChartReadings } from "../../components/NatalChartReadings";
import type { NatalReadingAudience } from "../../content/natalChartReadings";
import { NatalAspectPatternsSection, type NatalAspectPatternsSectionStatus } from "./NatalAspectPatternsSection";
import type { NatalAspectPatternReaderItem } from "../../services/natalAspectPatterns";

export function NatalPatternsInsights({ snapshot, audience, ownerName, chartId, disabled, items = [], status, onOpenPattern }: {
  snapshot?: SkySnapshot | null; audience: NatalReadingAudience; ownerName?: string; chartId?: string; disabled?: boolean;
  items?: NatalAspectPatternReaderItem[]; status?: NatalAspectPatternsSectionStatus;
  onOpenPattern: (item: NatalAspectPatternReaderItem, nested: NatalAspectPatternReaderItem[]) => void;
}) {
  const titleId = useId();
  return <section className="natal-patterns-insights" aria-labelledby={titleId}>
    <h2 id={titleId}>Patterns &amp; Insights</h2>
    <div className="natal-patterns-insights__grid">
      {status && <NatalAspectPatternsSection items={items} status={status} onOpenDetail={onOpenPattern} cardsOnly/>}
      <NatalChartReadings snapshot={snapshot} audience={audience} ownerName={ownerName} chartId={chartId} disabled={disabled} presentation="insights" showHeading={false}/>
    </div>
  </section>;
}
