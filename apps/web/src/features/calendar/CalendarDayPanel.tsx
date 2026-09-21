import { ChevronRight } from "lucide-react";
import type { SummaryPart } from "../../content/skyDailySummary";
import type { LunarCalendarEvent } from "../../services/ephemeris";
import type { SkySnapshot } from "../../types";
import {
  CalendarMoodStar,
  calendarMoodOf,
  checkInSubtitle,
  checkInTitle,
  moodToneVar,
  socialWordOf,
  type CalendarCheckInEntry
} from "./CalendarCheckIn";
import { CalendarKindLabel, CalendarKindTag } from "./CalendarKindTag";
import { CalendarSlideout } from "./CalendarSlideout";
import { CalendarSummaryText } from "./CalendarSummaryText";
import { calendarKindFromEvent, type CalendarEventKind } from "./calendarKinds";

export type CalendarDayEventCard = {
  event: LunarCalendarEvent;
  kind?: CalendarEventKind;
  title: string;
  excerpt?: string;
  meta: string;
  isKey?: boolean;
};

export type CalendarSeasonTransit = {
  id: string;
  glyph: string;
  title: string;
  meta: string;
  retrograde?: boolean;
  event?: LunarCalendarEvent;
};

export type CalendarMoonPassage = {
  contentKey: string;
  paragraphs: string[];
  role?: "lunation" | "leftover";
};

function CheckInCard({
  entry,
  onCheckIn
}: {
  entry?: CalendarCheckInEntry;
  onCheckIn: () => void;
}) {
  const mood = calendarMoodOf(entry);

  if (!entry) {
    return (
      <button className="calendar-checkin-card is-empty" onClick={onCheckIn} type="button">
        <CalendarMoodStar className="calendar-checkin-card__star" filled={false} mood={2} />
        <span className="calendar-checkin-card__copy">
          <strong>Check in</strong>
          <small className="calendar-checkin-card__hint is-web">Record your mood and sleep for this day</small>
          <small className="calendar-checkin-card__hint is-mobile">Mood, rest, and a few words about today</small>
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button className="calendar-checkin-card" onClick={onCheckIn} type="button">
      <span className="calendar-checkin-card__marks">
        <CalendarMoodStar className="calendar-checkin-card__star" mood={entry.mood ?? 2} />
        <span className="calendar-checkin-card__sleep" aria-label={`Rest ${entry.sleep}`}>
          <span className="calendar-checkin-card__sleep-fill" style={{ width: `${entry.sleep}%` }} />
          <span>{entry.sleep}</span>
        </span>
      </span>
      <span className="calendar-checkin-card__copy">
        <strong>{checkInTitle(entry)}</strong>
        <small className="calendar-checkin-card__subtitle">{checkInSubtitle(entry)}</small>
        <span className="calendar-checkin-card__meters">
          {entry.mood != null ? (
          <span>
            <span>Mood</span>
            <span className="calendar-checkin-card__meter">
              <span style={{ width: `${((entry.mood + 1) / 5) * 100}%`, background: moodToneVar(entry.mood) }} />
            </span>
            <span>{mood?.label}</span>
          </span>
          ) : null}
          <span>
            <span>Rest</span>
            <span className="calendar-checkin-card__meter">
              <span style={{ width: `${entry.sleep}%`, background: "var(--calendar-rest-fill)" }} />
            </span>
            <span>{entry.sleep}%</span>
          </span>
          <span>
            <span>Social</span>
            <span className="calendar-checkin-card__meter">
              <span style={{ width: `${entry.social}%`, background: "var(--calendar-social-fill)" }} />
            </span>
            <span>{entry.social != null ? socialWordOf(entry.social) : "—"}</span>
          </span>
        </span>
      </span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  );
}

export function CalendarDayPanel({
  dateKey,
  title,
  dateLine,
  metaLine,
  elementTag,
  elementClass,
  phaseEmoji,
  sunSummary = [],
  sky = null,
  paragraphs,
  moonPassages = [],
  prompt,
  events,
  seasonTransits,
  checkInEntry,
  isToday = false,
  embedded = false,
  showSky = true,
  showCheckIn = true,
  onClose,
  onOpenEvent,
  onCheckIn
}: {
  dateKey: string;
  title: string;
  dateLine: string;
  metaLine: string;
  elementTag?: string;
  elementClass?: string;
  phaseEmoji?: string;
  sunSummary?: SummaryPart[];
  sky?: SkySnapshot | null;
  paragraphs: string[];
  moonPassages?: CalendarMoonPassage[];
  prompt?: string;
  events: CalendarDayEventCard[];
  seasonTransits: CalendarSeasonTransit[];
  checkInEntry?: CalendarCheckInEntry;
  isToday?: boolean;
  embedded?: boolean;
  showSky?: boolean;
  showCheckIn?: boolean;
  onClose?: () => void;
  onOpenEvent: (event: LunarCalendarEvent) => void;
  onCheckIn: () => void;
}) {
  const seasonFirst = [...events].sort((left, right) => {
    const leftSeason = (left.kind ?? calendarKindFromEvent(left.event)) === "season" ? 0 : 1;
    const rightSeason = (right.kind ?? calendarKindFromEvent(right.event)) === "season" ? 0 : 1;
    return leftSeason - rightSeason;
  });

  const body = (
      <article className={`calendar-day-panel${embedded ? " is-embedded" : ""}`} data-calendar-date={dateKey}>
        {showSky ? (
        <section className={`calendar-sky-card${embedded ? "" : " is-flush"}`}>
          <p className="calendar-sky-card__date">
            <span>{dateLine}</span>
            {isToday ? <span className="calendar-sky-card__today">Today</span> : null}
          </p>
          <div className="calendar-sky-card__lockup">
            {phaseEmoji ? <span className="calendar-sky-card__visual" aria-hidden="true">{phaseEmoji}</span> : null}
            <div className="calendar-sky-card__copy">
              <h2 className="calendar-sky-card__title">{title}</h2>
              <p className="calendar-sky-card__meta">
                {elementTag ? (
                  <span className={`calendar-sky-card__element ${elementClass ?? ""}`}>{elementTag}</span>
                ) : null}
                {metaLine ? <span>{metaLine}</span> : null}
              </p>
            </div>
          </div>
          <div className="calendar-sky-card__body">
            {sunSummary.length > 0 ? (
              <section aria-label="Sun in season">
                <CalendarSummaryText date={dateKey} parts={sunSummary} sky={sky} />
              </section>
            ) : null}
            {moonPassages.length > 0 ? moonPassages.map((passage) => (
              <section
                aria-label="Moon guidance"
                data-guidance-key={passage.contentKey}
                key={passage.contentKey}
              >
                {passage.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
              </section>
            )) : paragraphs.length > 0 ? (
              <section aria-label="Moon guidance">
                {paragraphs.map((paragraph) => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
              </section>
            ) : null}
            {prompt ? <p className="calendar-sky-card__prompt">{prompt}</p> : null}
          </div>
        </section>
        ) : null}

        {showCheckIn ? <CheckInCard entry={checkInEntry} onCheckIn={onCheckIn} /> : null}

        {seasonFirst.length > 0 ? (
        <section className="calendar-day-events" aria-label={`${seasonFirst.length} events`}>
          <span className="calendar-section-label">{seasonFirst.length} {seasonFirst.length === 1 ? "event" : "events"}</span>
          <div className="calendar-day-events__grid">
            {seasonFirst.map((card) => {
              const kind: CalendarEventKind = card.kind ?? calendarKindFromEvent(card.event);
              const rest = seasonFirst.filter((item) => (item.kind ?? calendarKindFromEvent(item.event)) !== "season");
              const isSeason = (card.kind ?? calendarKindFromEvent(card.event)) === "season";
              const wide = isSeason || (!isSeason && rest.length % 2 === 1 && rest.at(-1) === card);

              return (
                <button
                  className={`calendar-stoic-card${wide ? " is-wide" : ""}`}
                  key={card.event.id}
                  onClick={() => onOpenEvent(card.event)}
                  type="button"
                >
                  <CalendarKindTag event={card.event} kind={kind} />
                  <span className="calendar-stoic-card__copy">
                    <CalendarKindLabel event={card.event} kind={kind} />
                    <strong>{card.title}</strong>
                  </span>
                  {card.excerpt ? <p className="calendar-stoic-card__excerpt">{card.excerpt}</p> : null}
                  <span className="calendar-stoic-card__cta">
                    <span>{card.meta}</span>
                    {card.isKey ? <span className="calendar-stoic-card__key">⭐ Key</span> : null}
                    <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        ) : null}

        {seasonTransits.length > 0 ? (
          <section className="calendar-season-transits" aria-label="Season-long transits">
            <span className="calendar-section-label">
              Season-long transits
              <small>
                {seasonTransits.filter((row) => row.retrograde).length
                  ? `${seasonTransits.filter((row) => row.retrograde).length} of ${seasonTransits.length} retrograde`
                  : "All direct"}
              </small>
            </span>
            <ul>
              {seasonTransits.map((row) => {
                const content = (
                  <>
                    <CalendarKindTag glyph={row.glyph} kind={row.retrograde ? "station" : "ingress"} />
                    <span className="calendar-season-transits__title">{row.title}</span>
                    <small>{row.meta}</small>
                  </>
                );

                return (
                  <li className={row.retrograde ? "is-rx" : undefined} key={row.id}>
                    {row.event ? (
                      <button onClick={() => onOpenEvent(row.event!)} type="button">
                        {content}
                      </button>
                    ) : (
                      <span className="calendar-season-transits__row">{content}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </article>
  );

  if (embedded) {
    return body;
  }

  return (
    <CalendarSlideout label="Day slideout" onClose={onClose ?? (() => undefined)} variant="day">
      {body}
    </CalendarSlideout>
  );
}
