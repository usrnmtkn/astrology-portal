import type { LunarCalendarEvent } from "../../services/ephemeris";
import { calendarLunationContextEvents, calendarLunationLinkLabel } from "./calendarLunationLinks";

export function CalendarLunationContext({ dateKey, events, timeZone, onOpenEvent }: {
  dateKey: string;
  events: LunarCalendarEvent[];
  timeZone: string;
  onOpenEvent: (event: LunarCalendarEvent) => void;
}) {
  const context = calendarLunationContextEvents(dateKey, events);
  if (!context.length) return null;
  return <div className="calendar-lunation-context" aria-label="Lunar cycle readings">
    {context.map(({ relation, event }) => <p key={event.id}>
      {relation}: <button className="calendar-reading__toggle" type="button" onClick={() => onOpenEvent(event)}>
        {calendarLunationLinkLabel(event, timeZone)}
      </button>
    </p>)}
  </div>;
}
