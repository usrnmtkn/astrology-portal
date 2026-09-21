import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { LunarCalendarEvent } from "../../services/ephemeris";
import { AstroGlyph } from "./AstroGlyph";
import { CalendarKindTag } from "./CalendarKindTag";
import { type CalendarEventKind } from "./calendarKinds";

export type CalendarDayGroupRow = {
  id: string;
  kind: CalendarEventKind;
  glyph?: string;
  title: string;
  meta?: string;
  excerpt?: string;
  event?: LunarCalendarEvent;
};

export function CalendarDayGroup({
  dateKey,
  number,
  numberClass,
  weekday,
  isToday = false,
  isSelected = false,
  rows,
  paragraphs = [],
  prompt,
  guidanceKey,
  onSelectDay,
  onOpenEvent
}: {
  dateKey: string;
  number: string;
  numberClass: string;
  weekday: string;
  isToday?: boolean;
  isSelected?: boolean;
  rows: CalendarDayGroupRow[];
  paragraphs?: string[];
  prompt?: string;
  guidanceKey?: string;
  onSelectDay: () => void;
  onOpenEvent: (event: LunarCalendarEvent) => void;
}) {
  return (
    <section
      className={`calendar-day-group${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
      id={`calendar-day-group-${dateKey}`}
    >
      <button
        aria-label={`${number} ${weekday}${isToday ? " · Today" : ""}`}
        className="calendar-day-group__header"
        onClick={onSelectDay}
        type="button"
      >
        <span aria-hidden="true" className={`lunar-calendar-day__number ${numberClass}`}>{number}</span>
        <span className="calendar-day-group__weekday">
          {weekday}
          {isToday ? <span> · Today</span> : null}
        </span>
        <ChevronRight size={12} aria-hidden="true" />
      </button>
      {rows.length > 0 ? (
        <div className="calendar-day-group__rows">
          {rows.map((row) => (
            <div className="calendar-day-group__block" key={row.id}>
              <button
                className="calendar-day-group__row"
                onClick={() => (
                  row.event ? onOpenEvent(row.event) : onSelectDay()
                )}
                type="button"
              >
                <CalendarKindTag event={row.event} glyph={row.glyph} kind={row.kind} />
                <span>{row.title}</span>
                {row.meta ? <small>{row.meta}</small> : <span />}
              </button>
              {row.excerpt ? <p className="calendar-day-group__excerpt">{row.excerpt}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      {paragraphs.length > 0 || prompt ? (
        <div className="calendar-day-group__blurb" data-guidance-key={guidanceKey || undefined}>
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
          {prompt ? <p className="calendar-day-group__prompt">{prompt}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export function CalendarSeasonPill({
  sign,
  glyph,
  daysLeft,
  onClick
}: {
  sign: string;
  glyph: string;
  daysLeft?: number | null;
  onClick: () => void;
}) {
  return (
    <button className="calendar-season-pill" onClick={onClick} type="button">
      <span>
        <span className="calendar-season-pill__glyph">
          <AstroGlyph text={glyph} />
        </span>
        <strong>{sign} season</strong>
        {daysLeft != null && daysLeft > 0 ? (
          <span className="calendar-season-pill__left">
            · {daysLeft}D left
          </span>
        ) : null}
      </span>
      <ChevronRight size={12} aria-hidden="true" />
    </button>
  );
}

export function CalendarDayGroupList({
  children,
  label
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="calendar-day-groups" aria-label={label}>
      {children}
    </div>
  );
}
