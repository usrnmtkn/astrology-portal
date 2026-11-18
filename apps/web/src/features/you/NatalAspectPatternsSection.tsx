import { FormattedText } from "../../components/FormattedProse";
import { NatalInsightCard } from "../../components/NatalInsightCard";
import { DurationLabelText } from "../../components/charts/PlacementRows";
import type { NatalAspectPatternActivationTimingWindow, NatalAspectPatternReaderItem } from "../../services/natalAspectPatterns";

export type NatalAspectPatternsSectionStatus = "loading" | "ready" | "unavailable";

const activationSectionLabels: Record<string, string> = {
  current_emphasis: "Current emphasis",
  transit_trigger: "Transit trigger",
  pattern_role: "Pattern role",
  linked_patterns: "Linked patterns",
  timing: "Timing",
  watch_for: "Watch for",
  confidence_note: "Reading note"
};

function activationSectionLabel(sectionId: string): string | null {
  return activationSectionLabels[sectionId] ?? null;
}

function independentItems(items: NatalAspectPatternReaderItem[]) {
  return items.filter((item) => !item.isContained);
}

function childItems(parent: NatalAspectPatternReaderItem, items: NatalAspectPatternReaderItem[]) {
  const childIds = new Set(parent.childPatternIds);
  return items.filter((item) => item.isContained && (childIds.has(item.patternId) || item.parentPatternIds.includes(parent.patternId)));
}

export function NatalAspectPatternsSection({
  items,
  onOpenDetail,
  status,
  title = "Patterns in your chart",
  cardsOnly = false
}: {
  items: NatalAspectPatternReaderItem[];
  onOpenDetail?: (item: NatalAspectPatternReaderItem, nestedItems: NatalAspectPatternReaderItem[]) => void;
  status: NatalAspectPatternsSectionStatus;
  title?: string;
  cardsOnly?: boolean;
}) {
  if (status === "unavailable") {
    return null;
  }

  if (status === "loading") {
    return null;
  }

  const topLevel = independentItems(items);
  const primary = topLevel[0] ?? null;
  const additional = topLevel.slice(1);

  if (!primary) {
    return null;
  }

  if (cardsOnly) return <>{topLevel.map(item => <PatternPreviewCard item={item} key={item.patternId} nestedItems={childItems(item, items)} onOpenDetail={onOpenDetail}/>)}</>;

  return (
    <section className="natal-patterns-section" aria-label={title}>
      <span className="eyebrow section-label">{title}</span>
      <div className="natal-patterns-stack">
        <PatternPreviewCard
          item={primary}
          nestedItems={childItems(primary, items)}
          onOpenDetail={onOpenDetail}
        />
        {additional.map((item) => (
          <PatternPreviewCard
            item={item}
            key={item.patternId}
            nestedItems={childItems(item, items)}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </section>
  );
}

function PatternPreviewCard({
  item,
  nestedItems,
  onOpenDetail
}: {
  item: NatalAspectPatternReaderItem;
  nestedItems: NatalAspectPatternReaderItem[];
  onOpenDetail?: (item: NatalAspectPatternReaderItem, nestedItems: NatalAspectPatternReaderItem[]) => void;
}) {
  const copy = item.copy.content;

  const glyphs: Record<string, string> = { yod: "⚻", grand_trine: "△", t_square: "□", grand_square: "□", kite: "◇", mystic_rectangle: "▱" };
  const members = item.memberNames?.filter(name => name.trim()).map(name => name.toLowerCase() === "moon" ? "the Moon" : name[0].toUpperCase() + name.slice(1));
  const label = members?.length ? `${copy.eyebrow ?? item.patternType}: ${new Intl.ListFormat("en", { type: "conjunction" }).format(members)}` : copy.eyebrow;
  return <NatalInsightCard glyph={glyphs[item.patternType] ?? "✦"} meta={label} title={copy.headline} body={copy.overview} onOpen={onOpenDetail ? () => onOpenDetail(item, nestedItems) : undefined}/>;
}

export function NatalAspectPatternActivationsSection({
  items,
  timingOverrides = {}
}: {
  items: NatalAspectPatternReaderItem[];
  timingOverrides?: Record<string, NatalAspectPatternActivationTimingWindow>;
}) {
  const activeItems = items
    .filter((item) => item.activationCopy)
    .sort((first, second) => {
      const firstPriority = first.activationEmphasis === "primary" ? 0 : 1;
      const secondPriority = second.activationEmphasis === "primary" ? 0 : 1;

      return firstPriority - secondPriority || first.rank - second.rank || first.patternId.localeCompare(second.patternId);
    });

  if (activeItems.length === 0) {
    return null;
  }

  return (
    <section className="natal-patterns-section natal-patterns-section--activations friend-transit-group" aria-label="Active chart patterns">
      <span className="eyebrow section-label">Active chart patterns</span>
      <div className="updates-aspect-list friend-transit-list active-chart-pattern-list">
        {activeItems.map((item) => (
          <ActiveNowCallout item={item} key={`${item.patternId}-activation`} timingOverride={timingOverrides[item.patternId]} />
        ))}
      </div>
    </section>
  );
}

function ActiveNowCallout({
  item,
  timingOverride
}: {
  item: NatalAspectPatternReaderItem;
  timingOverride?: NatalAspectPatternActivationTimingWindow;
}) {
  const activation = item.activationCopy?.content;
  if (!activation) return null;

  const sections = activation.sections.filter((section) => section.body.trim() && section.id !== "timing" && activationSectionLabel(section.id));
  const timingWindow = timingOverride ?? item.activationTimingWindow;
  const emphasisLabel = item.activationEmphasis === "primary" ? "Now" : "Also";
  const activeRangeLabel = timingWindow
    ? timingWindow.activeRangeLabel ?? `${timingWindow.rangeLabel} (Exact: ${timingWindow.exactLabel})`
    : "";
  const calloutClass = [
    "updates-aspect-row",
    "friend-transit-row",
    "active-chart-pattern-row",
    item.activationEmphasis === "primary" ? "active-chart-pattern-row--primary" : "active-chart-pattern-row--secondary"
  ].join(" ");

  return (
    <article className={calloutClass}>
      <span className="updates-aspect-row__content">
        <span className="updates-aspect-row__title">{activation.headline}</span>
        {timingWindow ? (
          <span className="updates-aspect-row__meta-line" aria-label={`${timingWindow.durationLabel ?? "Duration"}, ${activeRangeLabel}`}>
            <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
              <DurationLabelText label={timingWindow.durationLabel ?? "Duration"} />
            </span>
            <span>{activeRangeLabel}</span>
          </span>
        ) : null}
        {activation.eyebrow ? <span className="updates-aspect-row__meta-line">{activation.eyebrow}</span> : null}
        <span className="updates-aspect-row__description">{activation.overview}</span>
        {sections.length > 0 ? (
          <span className="updates-aspect-row__detail">
            <span>{item.copy.content.headline}</span>
            {sections.map((section) => (
              <span key={`${item.patternId}-active-${section.id}-${section.body}`}>
                {activationSectionLabel(section.id)}: <FormattedText text={section.body} />
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="updates-aspect-row__meta" aria-label={`${item.copy.content.headline}, ${emphasisLabel.toLowerCase()}`}>
        <span className="updates-aspect-row__dot" aria-hidden="true" />
        <span className="updates-aspect-row__orb">{emphasisLabel}</span>
      </span>
    </article>
  );
}
