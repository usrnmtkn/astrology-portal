import { useEffect, useState } from "react";
import { FormattedProse } from "../../components/FormattedProse";
import { PageLoading, PageLoadError } from "../../components/PageLoading";
import { CalendarSlideout } from "./CalendarSlideout";
import type { CalendarSubscriptionReading } from "./calendarFeedPreview";

export function CalendarLinkedReading({ id, date, timeZone, onClose }: {
  id: string; date: string; timeZone: string; onClose: () => void;
}) {
  const [reading, setReading] = useState<CalendarSubscriptionReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    let active = true;
    setReading(null); setError(null);
    void fetch(`/api/calendar-reading?${new URLSearchParams({ id, date, timeZone })}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 404 ? "This calendar event is not available." : "This reading could not load. Please try again.");
        const data = await response.json();
        if (data?.reading?.id !== id) throw new Error("This reading could not load. Please try again.");
        if (active) setReading(data.reading);
      })
      .catch(error => { if (active) setError(controller.signal.aborted ? "This reading took too long to load. Please try again." : error.message); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [id, date, timeZone, retry]);

  const dateLine = reading && new Intl.DateTimeFormat("en-US", {
    timeZone: reading.allDay ? "UTC" : timeZone, dateStyle: "full", ...(!reading.allDay ? { timeStyle: "short" as const } : {})
  }).format(new Date(reading.allDay ? `${reading.start}T12:00:00Z` : reading.start));
  return <CalendarSlideout label="Event reading" labelledBy={reading ? "calendar-linked-reading-title" : undefined} onClose={onClose}>
    {error ? <PageLoadError message={error} onRetry={() => setRetry(value => value + 1)} />
      : !reading ? <PageLoading compact message="Loading event reading…" />
      : <>
        <div className="calendar-reading__lockup">
          <h2 className="calendar-reading__title" id="calendar-linked-reading-title">{reading.title}</h2>
          <p className="calendar-reading__meta">{dateLine}{reading.cancelled ? " · Cancelled" : ""}</p>
        </div>
        <div className="calendar-reading__body">
          {reading.body && <FormattedProse text={reading.body} />}
          {reading.sourceUrl && <p><a href={reading.sourceUrl}>Read article</a></p>}
        </div>
      </>}
  </CalendarSlideout>;
}
