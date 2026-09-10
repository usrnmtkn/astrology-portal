import { DignityBadge, DurationLabelText, statusPillClassName, type PlacementDignity, type PlacementRowStatus } from "./charts/PlacementRows";

export type ArticlePillData = {
  dignity?: PlacementDignity | PlacementDignity[] | null;
  uppercaseDignity?: boolean;
  statuses?: PlacementRowStatus[];
  durationLabel?: string | null;
  labels?: Array<{ label: string; tone?: "muted" | "neutral" | "term" }>;
};

export function ArticlePills({ pills }: { pills?: ArticlePillData }) {
  const dignities = Array.isArray(pills?.dignity) ? pills.dignity : pills?.dignity ? [pills.dignity] : [];
  if (!pills || !(dignities.length || pills.statuses?.length || pills.durationLabel || pills.labels?.length)) return null;

  return (
    <div className="article-pills" aria-label="Article details">
      {pills.durationLabel ? (
        <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
          <DurationLabelText label={pills.durationLabel} />
        </span>
      ) : null}
      {pills.statuses?.map((status) => (
        <span className={statusPillClassName(status.tone)} key={status.label}>{status.label}</span>
      ))}
      <DignityBadge dignity={dignities} uppercase={pills.uppercaseDignity} />
      {pills.labels?.map(({ label, tone = "neutral" }) => (
        <span className={tone === "term" ? "ui-pill house-transit-term-tag" : `ui-pill ui-pill--${tone}`} key={label}>{label}</span>
      ))}
    </div>
  );
}
