import { useEffect, useState } from 'react';
import { FormattedProse } from '../../components/FormattedProse';
import { subscribeToContentUpdates, subscribeToContentRevalidation } from '../../services/contentUpdateSignal';
import { calendarLocationParams, type CalendarLocation } from './calendarSubscription';

/** Reads the same dated, published planning passage as the subscription. */
export function CalendarActivityGuidance({ date, timeZone, location, nested = false }: { date: string; timeZone: string; location: CalendarLocation; nested?: boolean }) {
  const { latitude, longitude, label } = location;
  const key = `${date}/${timeZone}/${latitude}/${longitude}/${label}`;
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ key: string; body?: string; error?: boolean }>({ key: '' });
  const retry = () => setVersion(value => value + 1);
  useEffect(() => subscribeToContentUpdates(retry), []);
  useEffect(() => subscribeToContentRevalidation(retry), []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/calendar-reading?${new URLSearchParams({ id: `daily-${date}`, date, timeZone, ...calendarLocationParams({ latitude, longitude, label }) })}`,
      { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]) })
      .then(async response => {
        if (response.status === 404) return '';
        if (!response.ok) throw new Error('unavailable');
        const payload = await response.json();
        if (payload.reading?.id !== `daily-${date}` || typeof payload.reading.body !== 'string') throw new Error('unavailable');
        return payload.reading.body;
      })
      .then(body => { if (!controller.signal.aborted) setState({ key, body }); })
      .catch(() => { if (!controller.signal.aborted) setState({ key, error: true }); });
    return () => controller.abort();
  }, [date, timeZone, latitude, longitude, label, key, version]);
  if (state.key !== key) return <p role="status">Loading daily planning…</p>;
  if (state.error) return <p role="status">Daily planning couldn’t load. <button type="button" className="learn-jump__link" onClick={retry}>Try again</button></p>;
  if (!state.body) return null;
  const Heading = nested ? 'h3' : 'h2';
  const dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
  return <section className="lunar-month-overview lunar-month-overview--monthly" aria-label="Daily planning">
    <Heading className="calendar-sky-card__title">Daily planning · {dateLabel}</Heading>
    <FormattedProse text={state.body} />
  </section>;
}
