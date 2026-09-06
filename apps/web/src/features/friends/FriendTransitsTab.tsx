import type { NatalAspectPatternActivationTimingWindow } from "../../services/natalAspectPatterns";
import { DailyMoonContextTags } from "../../components/DailyMoonContextTags";
import { DurationLabelText } from "../../components/charts/PlacementRows";
import { pointGlyph } from "../../components/charts/chartAssets";
import { NatalAspectPatternActivationsSection } from "../you/NatalAspectPatternsSection";
import type {
  FriendPersonalTransitView,
  FriendTransitsBrief
} from "./friendTransitsBrief";

function FriendPersonalTransitCard({
  onOpen,
  transit
}: {
  onOpen: (id: string) => void;
  transit: FriendPersonalTransitView;
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

export type FriendTransitReadingView = {
  headline: string | null;
  summary: string | null;
  body: string;
};

export function FriendTransitsTab({
  brief,
  isLoading = false,
  onGenerateReading,
  onOpenBondTransit,
  onOpenHouseTransit,
  onOpenPersonalTransit,
  reading,
  readingStatus = "idle",
  readingAvailable = false,
  patternTimingOverrides
}: {
  brief: FriendTransitsBrief;
  isLoading?: boolean;
  onGenerateReading?: () => void;
  onOpenBondTransit: (id: string) => void;
  onOpenHouseTransit: (id: string) => void;
  onOpenPersonalTransit: (id: string) => void;
  reading?: FriendTransitReadingView | null;
  readingStatus?: "idle" | "loading" | "ready" | "locked";
  readingAvailable?: boolean;
  patternTimingOverrides: Record<string, NatalAspectPatternActivationTimingWindow>;
}) {
  const {
    friendName,
    primaryThemes,
    relationshipActivations,
    houseContext,
    daily,
    longerCycles,
    activePatterns,
    hasAnyTransit
  } = brief;

  return (
    <div className="friend-tab-pane friend-compat-stage friend-transits-stage friend-transits-stage--full" aria-label={`${friendName} transits`}>
      <div className="friend-profile-copy-column">
        {isLoading ? (
          <div className="feature-loading-fallback" role="status">
            Calculating transits for the selected date…
          </div>
        ) : null}
        {!isLoading && readingAvailable ? (
          <article className="friends-logic-card friend-transit-reading" aria-label={`What's going on with ${friendName} right now?`}>
            <div className="friend-transit-reading__topline">
              <span>Right now</span>
              <span className="friend-transit-reading__premium">Paid reading</span>
            </div>
            <h3>{`What's going on with ${friendName} right now?`}</h3>
            {readingStatus === "ready" && reading ? (
              <>
                {reading.summary ? <p>{reading.summary}</p> : null}
                {reading.body.split(/\n{2,}/u).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </>
            ) : readingStatus === "loading" ? (
              <p role="status">Preparing {friendName}&apos;s reading…</p>
            ) : readingStatus === "locked" ? (
              <>
                <p>This is a paid reading. Purchase access to unlock a personalized summary of {friendName}&apos;s current transits.</p>
                <button className="friend-transit-reading__cta" onClick={onGenerateReading} type="button">Unlock this reading</button>
              </>
            ) : (
              <>
                <p>A concise, personalized synthesis of the strongest themes active for {friendName} right now.</p>
                <button className="friend-transit-reading__cta" onClick={onGenerateReading} type="button">Unlock this reading</button>
              </>
            )}
          </article>
        ) : null}
        {daily?.forecast ? (
          <section className="daily-horoscope-summary friend-daily-forecast" aria-label={`Daily forecast for ${friendName}`}>
            <h3>{daily.forecast.headline}</h3>
            <p>{daily.forecast.body}</p>
            <DailyMoonContextTags context={daily.forecast.moonContext} />
          </section>
        ) : null}
        {daily && daily.doItems.length === 3 && daily.dontItems.length === 3 ? (
          <section className="friend-transit-guidance" aria-label={`${friendName}'s do and don't`}>
            <div className="daily-dodont friend-transit-dodont">
              <div>
                <span className="eyebrow section-label">Do</span>
                <ul>{daily.doItems.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <span className="eyebrow section-label">Don&apos;t</span>
                <ul>{daily.dontItems.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </section>
        ) : null}
        {relationshipActivations.length > 0 && (
          <section className="friend-transit-group" aria-label="Between you two">
            <span className="eyebrow section-label friend-section-label">Between you two</span>
            <div className="updates-aspect-list friend-transit-list">
              {relationshipActivations.map((card) => (
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
        {primaryThemes.length > 0 ? (
          <section className="friend-transit-group" aria-label="Short-term themes">
            <span className="eyebrow section-label friend-section-label">Active for {friendName}</span>
            <div className="updates-aspect-list friend-transit-list">
              {primaryThemes.map((transit) => (
                <FriendPersonalTransitCard
                  key={transit.id}
                  onOpen={onOpenPersonalTransit}
                  transit={transit}
                />
              ))}
            </div>
          </section>
        ) : null}
        {houseContext.length > 0 && (
          <section className="friend-transit-group" aria-label="House transits">
            <span className="eyebrow section-label friend-section-label">Where it lands</span>
            <div className="updates-aspect-list friend-transit-list">
              {houseContext.map((card) => (
                <button
                  aria-label={`Open full entry for ${card.title}`}
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
        {longerCycles.length > 0 ? (
          <section className="friend-transit-group" aria-label="Long-term themes">
            <span className="eyebrow section-label friend-section-label">Longer cycles</span>
            <div className="updates-aspect-list friend-transit-list">
              {longerCycles.map((transit) => (
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
          items={activePatterns}
          timingOverrides={patternTimingOverrides}
        />
        {!isLoading && !hasAnyTransit && (
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
