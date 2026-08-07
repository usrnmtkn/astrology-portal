import type {
  NatalAspectPatternActivationTimingWindow,
  NatalAspectPatternReaderItem
} from "../../services/natalAspectPatterns";
import { DurationLabelText } from "../../components/charts/PlacementRows";
import { pointGlyph } from "../../components/charts/chartAssets";
import { NatalAspectPatternActivationsSection } from "../you/NatalAspectPatternsSection";

export type FriendBondTransitView = {
  id: string;
  headline: string;
  timingRange?: string;
  effectFamily?: "soft" | "hard";
  effectBody: string;
  activationBody: string;
};

function possessiveFriendName(name: string) {
  const trimmed = name.trim();

  return /s$/iu.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}

export type FriendHouseTransitView = {
  id: string;
  transitPlanet: string;
  title: string;
  durationLabel: string | null;
  timingRange: string;
  rowSummary: string;
  termLabel: string;
  keywords: string[];
  house: number;
  houseLabel: string;
};

export type FriendPersonalTransitGroup = {
  key: "short" | "long";
  label: string;
  transits: Array<{
    id: string;
    title: string;
    durationLabel: string;
    rangeLabel: string;
    timingLabel: string;
    summary: string;
    orb: string;
  }>;
};

export type FriendDailyForecastView = {
  headline: string;
  body: string;
};

type FriendPersonalTransit = FriendPersonalTransitGroup["transits"][number];

function FriendPersonalTransitCard({
  onOpen,
  transit
}: {
  onOpen: (id: string) => void;
  transit: FriendPersonalTransit;
}) {
  return (
    <button
      aria-label={`Open full entry for ${transit.title}`}
      className="updates-aspect-row friend-transit-row"
      onClick={() => onOpen(transit.id)}
      type="button"
    >
      <span className="updates-aspect-row__content">
        <h3 className="updates-aspect-row__title">{transit.title}</h3>
        <span className="updates-aspect-row__meta-line" aria-label={transit.timingLabel}>
          <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
            <DurationLabelText label={transit.durationLabel} />
          </span>
          <span>{transit.rangeLabel}</span>
        </span>
        <p className="updates-aspect-row__description transit-card-preview">{transit.summary}</p>
      </span>
      <span className="updates-aspect-row__meta" aria-label={`${transit.timingLabel}, ${transit.orb} orb`}>
        <span className="updates-aspect-row__dot" aria-hidden="true" />
        <span className="updates-aspect-row__orb">{transit.orb}</span>
      </span>
    </button>
  );
}

export function FriendTransitsTab({
  bondTransits,
  dailyForecast,
  dailyDoItems = [],
  dailyDontItems = [],
  friendName,
  houseTransits,
  onOpenBondTransit,
  onOpenHouseTransit,
  onOpenPersonalTransit,
  patternItems,
  patternTimingOverrides,
  personalTransitGroups
}: {
  bondTransits: FriendBondTransitView[];
  dailyForecast?: FriendDailyForecastView | null;
  dailyDoItems?: string[];
  dailyDontItems?: string[];
  friendName: string;
  houseTransits: FriendHouseTransitView[];
  onOpenBondTransit: (id: string) => void;
  onOpenHouseTransit: (id: string) => void;
  onOpenPersonalTransit: (id: string) => void;
  patternItems: NatalAspectPatternReaderItem[];
  patternTimingOverrides: Record<string, NatalAspectPatternActivationTimingWindow>;
  personalTransitGroups: FriendPersonalTransitGroup[];
}) {
  const personalTransitCount = personalTransitGroups.reduce((count, group) => count + group.transits.length, 0);
  const shortTermGroup = personalTransitGroups.find((group) => group.key === "short");
  const longTermGroup = personalTransitGroups.find((group) => group.key === "long");
  const shortTermTransits = shortTermGroup?.transits ?? [];
  const longTermTransits = longTermGroup?.transits ?? [];
  const hasActivePattern = patternItems.some((item) => Boolean(item.activationCopy));
  const hasAnyTransit = Boolean(dailyForecast) || personalTransitCount > 0 || houseTransits.length > 0 || bondTransits.length > 0 || hasActivePattern;
  const hasDailyGuidance = dailyDoItems.length === 3 && dailyDontItems.length === 3;

  return (
    <div className="friend-tab-pane friend-compat-stage friend-transits-stage friend-transits-stage--full" aria-label={`${friendName} transits`}>
      <div className="friend-profile-copy-column">
        {dailyForecast ? (
          <section className="daily-horoscope-summary friend-daily-forecast" aria-label={`Daily forecast for ${friendName}`}>
            <span className="eyebrow section-label friend-section-label">Today for {friendName}</span>
            <h3>{dailyForecast.headline}</h3>
            <p>{dailyForecast.body}</p>
          </section>
        ) : null}
        {hasDailyGuidance ? (
          <section className="friend-transit-guidance" aria-label={`${friendName}'s do and don't`}>
            <div className="daily-dodont friend-transit-dodont">
              <div>
                <span className="eyebrow section-label">Do</span>
                <ul>{dailyDoItems.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <span className="eyebrow section-label">Don&apos;t</span>
                <ul>{dailyDontItems.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </section>
        ) : null}
        {bondTransits.length > 0 && (
          <section className="friend-transit-group" aria-label="Between you two">
            <span className="eyebrow section-label friend-section-label">Between you two</span>
            <span className="friend-section-sublabel">Strongest influences first</span>
            {([
              { key: "soft", label: "Supportive", cards: bondTransits.filter((card) => card.effectFamily === "soft") },
              { key: "hard", label: "Friction", cards: bondTransits.filter((card) => card.effectFamily === "hard") },
              { key: "other", label: "", cards: bondTransits.filter((card) => card.effectFamily !== "soft" && card.effectFamily !== "hard") }
            ] as const).filter((bucket) => bucket.cards.length > 0).map((bucket) => (
              <div className="friend-bond-transit-bucket" key={bucket.key}>
                {bucket.label ? (
                  <span className="friend-section-sublabel friend-bond-transit-bucket__label">{bucket.label}</span>
                ) : null}
                <div className="updates-aspect-list friend-transit-list">
                  {bucket.cards.map((card) => (
                    <button
                      aria-label={`Open full entry for ${card.headline}`}
                      className="updates-aspect-row friend-transit-row"
                      key={card.id}
                      onClick={() => onOpenBondTransit(card.id)}
                      type="button"
                    >
                      <span className="updates-aspect-row__content">
                        <h3 className="updates-aspect-row__title">{card.headline}</h3>
                        {card.timingRange ? (
                          <span className="updates-aspect-row__meta-line">{card.timingRange}</span>
                        ) : null}
                        <p className="updates-aspect-row__description">{card.effectBody}</p>
                        {card.activationBody ? (
                          <p className="updates-aspect-row__description friend-bond-transit-activation">
                            {card.activationBody}
                          </p>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
        {shortTermTransits.length > 0 ? (
          <section className="friend-transit-group" aria-label="Short-term themes">
            <span className="eyebrow section-label friend-section-label">Active for {friendName}</span>
            <div className="updates-aspect-list friend-transit-list">
              {shortTermTransits.map((transit) => (
                <FriendPersonalTransitCard
                  key={transit.id}
                  onOpen={onOpenPersonalTransit}
                  transit={transit}
                />
              ))}
            </div>
          </section>
        ) : null}
        {houseTransits.length > 0 && (
          <section className="friend-transit-group" aria-label="House transits">
            <span className="eyebrow section-label friend-section-label">Life areas in motion</span>
            <div className="updates-aspect-list friend-transit-list">
              {houseTransits.map((card) => (
                <button
                  aria-label={`Open full entry for ${card.title}`}
                  className="updates-aspect-row updates-aspect-row--house"
                  key={card.id}
                  onClick={() => onOpenHouseTransit(card.id)}
                  type="button"
                >
                  <span className="updates-aspect-row__content">
                    <span className="eyebrow section-label house-transit-eyebrow">
                      <span className="planet-glyph" aria-hidden="true">{pointGlyph(card.transitPlanet)}</span>
                      {" "}Sky transit · {possessiveFriendName(friendName)} chart
                    </span>
                    <span className="updates-aspect-row__title">{card.title}</span>
                    <span className="updates-aspect-row__meta-line">
                      {card.timingRange ? <span>{card.timingRange}</span> : null}
                      {card.durationLabel ? (
                        <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
                          <DurationLabelText label={card.durationLabel} />
                        </span>
                      ) : null}
                      <span>{card.houseLabel}</span>
                    </span>
                    {card.rowSummary ? (
                      <span className="updates-aspect-row__description transit-card-preview">{card.rowSummary}</span>
                    ) : null}
                    <span className="house-transit-keywords" aria-label="House keywords">
                      {card.keywords.map((keyword) => (
                        <span className="ui-pill ui-pill--muted house-transit-keyword" key={`${card.id}-${keyword}`}>
                          {keyword}
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
        {longTermTransits.length > 0 ? (
          <section className="friend-transit-group" aria-label="Long-term themes">
            <span className="eyebrow section-label friend-section-label">Longer cycles</span>
            <div className="updates-aspect-list friend-transit-list">
              {longTermTransits.map((transit) => (
                <FriendPersonalTransitCard
                  key={transit.id}
                  onOpen={onOpenPersonalTransit}
                  transit={transit}
                />
              ))}
            </div>
          </section>
        ) : null}
        <NatalAspectPatternActivationsSection
          items={patternItems}
          timingOverrides={patternTimingOverrides}
        />
        {!hasAnyTransit && (
          <article className="friends-logic-card">
            <span>Transits</span>
            <h3>No prioritized transits are active.</h3>
            <p>The sky is still moving, but no prioritized personalized transit is active for {friendName} in this window.</p>
          </article>
        )}
      </div>
    </div>
  );
}
