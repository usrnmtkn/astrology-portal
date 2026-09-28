import { useEffect, useState } from "react";
import type { LunarCalendarEvent } from "../../services/ephemeris";
import type { LocationInput } from "../../types";
import { getLunarCalendarRangeEventsOffMainThread } from "../../services/skyCalculationClient";
import { calendarCycleLinkQuery, calendarLunationLinkLabel, resolveCalendarCycleLink } from "./calendarLunationLinks";

export function CalendarCycleLink({ event, link, location, onOpenEvent }: {
  event: LunarCalendarEvent;
  link: string;
  location: LocationInput;
  onOpenEvent: (event: LunarCalendarEvent) => void;
}) {
  const [target, setTarget] = useState<LunarCalendarEvent | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "missing">("loading");
  const [retry, setRetry] = useState(0);
  const supported = Boolean(calendarCycleLinkQuery(event, link));
  useEffect(() => {
    const query = calendarCycleLinkQuery(event, link);
    if (!query) return;
    let active = true;
    setTarget(null);
    setState("loading");
    void getLunarCalendarRangeEventsOffMainThread(location, query.start, query.end).then(events => {
      if (!active) return;
      const resolved = resolveCalendarCycleLink(event, link, events);
      setTarget(resolved);
      setState(resolved ? "ready" : "missing");
    }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [event.id, event.startsAt, event.sign, event.title, event.eclipseType, link, location.latitude, location.longitude, location.timeZone, retry]);

  if (/^https?:\/\//i.test(link)) return <a className="calendar-reading__toggle" href={link}>Read related article</a>;
  if (!supported) return null;
  if (state === "loading") return <p role="status">Loading related Moon…</p>;
  if (state === "error") return <button className="calendar-reading__toggle" type="button" onClick={() => setRetry(value => value + 1)}>Retry related Moon</button>;
  if (!target) return <p>No matching Moon reading is available.</p>;
  return <button className="calendar-reading__toggle" type="button" onClick={() => onOpenEvent(target)}>
    Read {calendarLunationLinkLabel(target, location.timeZone || "UTC")}
  </button>;
}
