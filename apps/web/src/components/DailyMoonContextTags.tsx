export type DailyMoonContext = {
  sign: string;
  houseLabel: string | null;
  topic: string | null;
};

// Keep the context data wired while the reader-facing tags are temporarily hidden.
export const DAILY_MOON_CONTEXT_TAGS_VISIBLE = false;

function capitalizeTag(label: string) {
  return label ? `${label[0].toUpperCase()}${label.slice(1)}` : label;
}

export function dailyMoonContextTagLabels(context: DailyMoonContext) {
  const topicTags = context.topic
    ? context.topic
        .split(/\s*,\s*(?:and\s+)?|\s+and\s+/u)
        .map((label) => label.trim())
        .filter(Boolean)
        .map(capitalizeTag)
    : [];

  return [
    `Moon in ${context.sign}`,
    context.houseLabel,
    ...topicTags
  ].filter((label): label is string => Boolean(label));
}

export function DailyMoonContextTags({ context }: { context: DailyMoonContext }) {
  if (!DAILY_MOON_CONTEXT_TAGS_VISIBLE) {
    return null;
  }

  const labels = dailyMoonContextTagLabels(context);

  return (
    <div
      aria-label={labels.join(", ")}
      className="updates-aspect-row__meta-line daily-horoscope-summary__moon-tags"
    >
      {labels.map((label, index) => (
        <span className="ui-pill ui-pill--neutral ui-pill--mixed" key={`${index}-${label}`}>
          {label}
        </span>
      ))}
    </div>
  );
}
