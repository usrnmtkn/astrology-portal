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
  effectBody: string;
  activationBody: string;
};

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

export function FriendTransitsTab({
  bondTransits,
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

  return (
    <div className="friend-tab-pane friend-compat-stage friend-transits-stage friend-transits-stage--full" aria-label={`${friendName} transits`}>
      <div className="friend-profile-copy-column">
        <NatalAspectPatternActivationsSection
          items={patternItems}
          timingOverrides={patternTimingOverrides}
        />
        {bondTransits.length > 0 && (
          <section className="friend-transit-group" aria-label="Between you two right now">
            <span className="eyebrow section-label friend-section-label">Between you two right now</span>
            <div className="updates-aspect-list friend-transit-list">
              {bondTransits.map((card) => (
                <button
                  aria-label={`Open full entry for ${card.headline}`}
                  className="updates-aspect-row friend-transit-row"
                  key={card.id}
                  onClick={() => onOpenBondTransit(card.id)}
                  type="button"
                >
                  <span className="updates-aspect-row__content">
                    <h3 className="updates-aspect-row__title">{card.headline}</h3>
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
          </section>
        )}
        {houseTransits.length > 0 && (
          <section className="friend-transit-group" aria-label="House transits">
            <span className="eyebrow section-label friend-section-label">House transits</span>
            <div className="updates-aspect-list friend-transit-list">
              {houseTransits.map((card) => (
                <button
                  className="updates-aspect-row updates-aspect-row--house"
                  key={card.id}
                  onClick={() => onOpenHouseTransit(card.id)}
                  type="button"
                >
                  <span className="updates-aspect-row__glyphs" aria-hidden="true">
                    <span className="planet-glyph">{pointGlyph(card.transitPlanet)}</span>
                  </span>
                  <span className="updates-aspect-row__content">
                    <span className="updates-aspect-row__title">{card.title}</span>
                    <span className="updates-aspect-row__meta-line">
                      {card.durationLabel ? (
                        <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
                          <DurationLabelText label={card.durationLabel} />
                        </span>
                      ) : null}
                      {card.timingRange ? <span>{card.timingRange}</span> : null}
                    </span>
                    {card.rowSummary ? (
                      <span className="updates-aspect-row__description transit-card-preview">{card.rowSummary}</span>
                    ) : null}
                    <span className="house-transit-keywords" aria-label="House keywords">
                      <span className="ui-pill house-transit-term-tag">{card.termLabel}</span>
                      {card.keywords.map((keyword) => (
                        <span className="ui-pill ui-pill--muted house-transit-keyword" key={`${card.id}-${keyword}`}>
                          {keyword}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="updates-aspect-row__meta" aria-label={card.houseLabel}>
                    <span className="updates-aspect-row__dot" aria-hidden="true" />
                    <span className="updates-aspect-row__orb">{card.house}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
        {personalTransitGroups.map((group) => (
          <section className="friend-transit-group" aria-label={group.label} key={group.key}>
            <span className="eyebrow section-label friend-section-label">{group.label}</span>
            <div className="updates-aspect-list friend-transit-list">
              {group.transits.map((transit) => (
                <button
                  aria-label={`Open full entry for ${transit.title}`}
                  className="updates-aspect-row friend-transit-row"
                  key={transit.id}
                  onClick={() => onOpenPersonalTransit(transit.id)}
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
              ))}
            </div>
          </section>
        ))}
        {personalTransitCount === 0 && houseTransits.length === 0 && (
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
