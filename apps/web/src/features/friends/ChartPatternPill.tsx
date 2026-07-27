import type { NatalAspectPatternPillSummary } from "../../services/natalAspectPatterns";

export function ChartPatternPill({
  summary
}: {
  summary: NatalAspectPatternPillSummary;
}) {
  const count = summary.patternNames.length;
  const accessibleLabel = `${count} confirmed chart ${count === 1 ? "pattern" : "patterns"}: ${summary.patternNames.join(", ")}`;

  return (
    <span className="chart-pattern-pill" aria-label={accessibleLabel}>
      {summary.label}
    </span>
  );
}
