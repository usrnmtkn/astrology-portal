import { ChevronRight } from "lucide-react";
import { DurationLabelText } from "../../components/charts/PlacementRows";
import type { NatalAspectPatternActivationTimingWindow, NatalAspectPatternReaderItem } from "../../services/natalAspectPatterns";

export type NatalAspectPatternsSectionStatus = "loading" | "ready" | "unavailable";

const sectionLabels: Record<string, string> = {
  feel: "What this can feel like",
  shows_up: "Where it tends to show up",
  complicated: "When it gets complicated",
  another_response: "Another response",
  level_2: "How the pattern works",
  how_it_works: "How it works",
  planet_roles: "Planet roles",
  pressure_or_support: "Pressure and support",
  derived_point: "Reference point",
  reference_point: "Reference point",
  watch_for: "Watch for",
  confidence_note: "Reading note"
};

const activationSectionLabels: Record<string, string> = {
  current_emphasis: "Current emphasis",
  transit_trigger: "Transit trigger",
  pattern_role: "Pattern role",
  linked_patterns: "Linked patterns",
  timing: "Timing",
  watch_for: "Watch for",
  confidence_note: "Reading note"
};

function sectionLabel(sectionId: string): string | null {
  return sectionLabels[sectionId] ?? null;
}

function activationSectionLabel(sectionId: string): string | null {
  return activationSectionLabels[sectionId] ?? null;
}

export function resolvedNatalAspectPatternSectionLabel(section: { id: string; title?: string }): string | null {
  return section.title ?? sectionLabel(section.id);
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
  status
}: {
  items: NatalAspectPatternReaderItem[];
  onOpenDetail?: (item: NatalAspectPatternReaderItem, nestedItems: NatalAspectPatternReaderItem[]) => void;
  status: NatalAspectPatternsSectionStatus;
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

  return (
    <section className="natal-patterns-section" aria-label="Patterns in your chart">
      <span className="eyebrow section-label">Patterns in your chart</span>
      <div className="natal-patterns-stack">
        <PatternPreviewCard
          item={primary}
          variant="primary"
          nestedItems={childItems(primary, items)}
          onOpenDetail={onOpenDetail}
        />
        {additional.map((item) => (
          <PatternPreviewCard
            item={item}
            key={item.patternId}
            variant="additional"
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
  onOpenDetail,
  variant
}: {
  item: NatalAspectPatternReaderItem;
  nestedItems: NatalAspectPatternReaderItem[];
  onOpenDetail?: (item: NatalAspectPatternReaderItem, nestedItems: NatalAspectPatternReaderItem[]) => void;
  variant: "primary" | "additional";
}) {
  const copy = item.copy.content;

  return (
    <article className={`natal-pattern-card natal-pattern-card--${variant}`}>
      <header className="natal-pattern-card__header">
        {copy.eyebrow ? <span>{copy.eyebrow}</span> : null}
        <h3>{copy.headline}</h3>
        <p>{copy.overview}</p>
      </header>
      <div className="natal-pattern-card__actions">
        <button
          type="button"
          className="natal-pattern-card__details-button"
          onClick={() => onOpenDetail?.(item, nestedItems)}
        >
          <span>Details</span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
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
                {activationSectionLabel(section.id)}: {section.body}
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
