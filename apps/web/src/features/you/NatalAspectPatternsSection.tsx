import { ChevronDown } from "lucide-react";
import type { NatalAspectPatternActivationTimingWindow, NatalAspectPatternReaderItem } from "../../services/natalAspectPatterns";

export type NatalAspectPatternsSectionStatus = "loading" | "ready" | "unavailable";

const emptyPatternMessage = "Your chart does not contain one of the six larger aspect patterns currently covered here. Your individual aspects still describe important connections between your planets.";

const sectionLabels: Record<string, string> = {
  how_it_works: "How it works",
  planet_roles: "Planet roles",
  pressure_or_support: "Pressure and support",
  derived_point: "Reference point",
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

function sectionLabel(sectionId: string) {
  return sectionLabels[sectionId] ?? sectionId.replace(/_/g, " ");
}

function activationSectionLabel(sectionId: string) {
  return activationSectionLabels[sectionId] ?? sectionId.replace(/_/g, " ");
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
  status
}: {
  items: NatalAspectPatternReaderItem[];
  status: NatalAspectPatternsSectionStatus;
}) {
  if (status === "unavailable") {
    return (
      <section className="you-empty-card natal-patterns-card natal-patterns-card--unavailable" aria-label="Patterns in your chart">
        <span>Patterns in your chart</span>
        <h3>Pattern notes are temporarily unavailable.</h3>
        <p>Everything else in your chart can still load while this section catches up.</p>
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section className="you-empty-card natal-patterns-card natal-patterns-card--loading" aria-label="Patterns in your chart">
        <span>Patterns in your chart</span>
        <h3>Checking larger chart patterns.</h3>
        <p>This will not block your placements or aspects.</p>
      </section>
    );
  }

  const topLevel = independentItems(items);
  const primary = topLevel[0] ?? null;
  const additional = topLevel.slice(1);

  return (
    <section className="natal-patterns-section" aria-label="Patterns in your chart">
      <span className="eyebrow section-label">Patterns in your chart</span>
      {primary ? (
        <div className="natal-patterns-stack">
          <PatternCopyCard item={primary} variant="primary" childItems={childItems(primary, items)} />
          {additional.map((item) => (
            <details className="natal-pattern-card natal-pattern-card--collapsed" key={item.patternId}>
              <summary>
                <span>
                  {item.copy.content.eyebrow ? <em>{item.copy.content.eyebrow}</em> : null}
                  <strong>{item.copy.content.headline}</strong>
                </span>
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <PatternCopyBody item={item} childItems={childItems(item, items)} />
            </details>
          ))}
        </div>
      ) : (
        <section className="you-empty-card natal-patterns-card natal-patterns-card--empty">
          <h3>Individual aspects still matter.</h3>
          <p>{emptyPatternMessage}</p>
        </section>
      )}
    </section>
  );
}

function PatternCopyCard({
  childItems: nestedItems,
  item,
  variant
}: {
  childItems: NatalAspectPatternReaderItem[];
  item: NatalAspectPatternReaderItem;
  variant: "primary" | "nested";
}) {
  return (
    <article className={`natal-pattern-card natal-pattern-card--${variant}`}>
      <PatternCopyBody item={item} childItems={nestedItems} />
    </article>
  );
}

function PatternCopyBody({
  childItems: nestedItems,
  item
}: {
  childItems: NatalAspectPatternReaderItem[];
  item: NatalAspectPatternReaderItem;
}) {
  const copy = item.copy.content;
  const sections = copy.sections.filter((section) => section.body.trim());

  return (
    <>
      <header className="natal-pattern-card__header">
        {copy.eyebrow ? <span>{copy.eyebrow}</span> : null}
        <h3>{copy.headline}</h3>
        <p>{copy.overview}</p>
      </header>

      {sections.length > 0 ? (
        <div className="natal-pattern-card__sections">
          {sections.map((section) => (
            <section key={`${item.patternId}-${section.id}-${section.body}`} className="natal-pattern-card__section">
              <h4>{sectionLabel(section.id)}</h4>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      ) : null}

      {nestedItems.length > 0 ? (
        <div className="natal-pattern-card__supporting" aria-label="Supporting pattern detail">
          <h4>Supporting pattern detail</h4>
          {nestedItems.map((child) => (
            <details key={child.patternId} className="natal-pattern-card__supporting-item">
              <summary>
                <span>{child.copy.content.headline}</span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <PatternCopyBody item={child} childItems={[]} />
            </details>
          ))}
        </div>
      ) : null}
    </>
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

  const sections = activation.sections.filter((section) => section.body.trim() && section.id !== "timing");
  const timingWindow = item.activationTimingWindow ?? timingOverride;
  const emphasisLabel = item.activationEmphasis === "primary" ? "Now" : "Also";
  const calloutClass = [
    "updates-aspect-row",
    "friend-transit-row",
    "active-chart-pattern-row",
    item.activationEmphasis === "primary" ? "active-chart-pattern-row--primary" : "active-chart-pattern-row--secondary"
  ].join(" ");

  return (
    <>
      <article className={calloutClass}>
        <span className="updates-aspect-row__content">
          <span className="updates-aspect-row__title">{activation.headline}</span>
          {timingWindow ? (
            <span className="updates-aspect-row__meta-line" aria-label={`Duration, ${timingWindow.rangeLabel}. Exact ${timingWindow.exactLabel}`}>
              <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">Duration</span>
              <span>Start {timingWindow.startLabel}</span>
              <span>Exact {timingWindow.exactLabel}</span>
              <span>End {timingWindow.endLabel}</span>
            </span>
          ) : null}
          {activation.eyebrow ? <span className="updates-aspect-row__meta-line">{activation.eyebrow}</span> : null}
          <span className="updates-aspect-row__description">{activation.overview}</span>
        </span>
        <span className="updates-aspect-row__meta" aria-label={`${item.copy.content.headline}, ${emphasisLabel.toLowerCase()}`}>
          <span className="updates-aspect-row__dot" aria-hidden="true" />
          <span className="updates-aspect-row__orb">{emphasisLabel}</span>
        </span>
      </article>
      {sections.map((section) => (
        <article className={`${calloutClass} active-chart-pattern-row--writeup`} key={`${item.patternId}-active-${section.id}-${section.body}`}>
          <span className="updates-aspect-row__content">
            <span className="updates-aspect-row__title">{activationSectionLabel(section.id)}</span>
            <span className="updates-aspect-row__meta-line">{item.copy.content.headline}</span>
            <span className="updates-aspect-row__description">{section.body}</span>
          </span>
          <span className="updates-aspect-row__meta" aria-label={`${activationSectionLabel(section.id)}, ${emphasisLabel.toLowerCase()}`}>
            <span className="updates-aspect-row__dot" aria-hidden="true" />
            <span className="updates-aspect-row__orb">{emphasisLabel}</span>
          </span>
        </article>
      ))}
    </>
  );
}

export { emptyPatternMessage as natalAspectPatternsEmptyMessage };
