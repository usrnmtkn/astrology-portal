import { useEffect, useState } from "react";
import type { RetrogradeCycle, RetrogradeHistory, RetrogradeStation } from "../services/retrogradeHistory";
import { getRetrogradeHistoryOffMainThread } from "../services/skyCalculationClient";
import "../styles/retrograde-history.css";

export type RetrogradeHistoryContext = { planet: string; sign: string; referenceDate: string; timeZone: string };
const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function RetrogradeHistoryFacts({ history, timeZone }: { history: RetrogradeHistory; timeZone: string }) {
  if (history.status !== "ready") {
    const messages = {
      "not-retrograde": "No active retrograde on this reference date. Choose a date within the retrograde to look back.",
      unsupported: "Retrograde history is available for Mercury through Pluto and Chiron.",
      "out-of-range": "This date is outside the available ephemeris range.",
      "incomplete-cycle": "A complete retrograde cycle could not be calculated within the available ephemeris range."
    };
    return <p>{messages[history.status]}</p>;
  }
  const date = (instant: string) => new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(instant));
  const station = (value: RetrogradeStation) => `${date(value.instant)} · ${value.degree.toFixed(2)}° ${title(value.sign)}`;
  const cycle = (value: RetrogradeCycle) => <>
    <span>Retrograde station: {station(value.retrograde)}</span>
    <span>Direct station: {station(value.direct)}</span>
    {value.segments.filter(segment => segment.sign === history.sign).map(segment => <span key={segment.start}>
      Retrograde in {title(segment.sign)}: {date(segment.start)} to {date(segment.end)}
    </span>)}
  </>;
  return <dl className="retrograde-history-facts">
    {history.current && <div><dt>Current cycle</dt><dd>{cycle(history.current)}</dd></div>}
    <div><dt>Previous retrograde in {title(history.sign ?? "")}</dt><dd>{history.sameSign ? cycle(history.sameSign) : "No earlier complete cycle found within the searched dates."}</dd></div>
    <div><dt>Degree comparison · within 4° of the start station</dt><dd>{history.degreeMatch ? <>
      {cycle(history.degreeMatch.cycle)}
      <span>{history.degreeMatch.exact ? "Exact crossing" : `Closest approach: ${history.degreeMatch.distanceDegrees.toFixed(2)}° away`} · {date(history.degreeMatch.closestInstant)}</span>
    </> : "No earlier complete cycle found within 4° in the searched dates."}</dd></div>
    {history.coverage && <div><dt>Search coverage</dt><dd>{date(history.coverage.start)} to {date(history.coverage.end)} · {history.coverage.completedCycles} complete earlier cycles checked. Dates shown in {timeZone}.</dd></div>}
  </dl>;
}

/** On demand in the calculation worker, so history does not delay the Sky list
 * or Calendar grid. A route change clears the old receipt immediately. */
export function RetrogradeHistoryDisclosure({ context }: { context: RetrogradeHistoryContext }) {
  const key = JSON.stringify(context);
  return <HistoryDisclosure key={key} context={context} />;
}

function HistoryDisclosure({ context }: { context: RetrogradeHistoryContext }) {
  const { planet, sign, referenceDate } = context;
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<RetrogradeHistory | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open || history) return;
    let current = true;
    setError(false);
    void getRetrogradeHistoryOffMainThread(planet, sign, new Date(referenceDate))
      .then(value => { if (current) setHistory(value); })
      .catch(() => { if (current) setError(true); });
    return () => { current = false; };
  }, [open, history, planet, sign, referenceDate, attempt]);
  return <details className="retrograde-history" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Previous retrograde</summary>
    {open && (history ? <RetrogradeHistoryFacts history={history} timeZone={context.timeZone} />
      : error ? <p role="alert">Retrograde history could not load. <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></p>
        : <p role="status">Calculating previous retrogrades…</p>)}
  </details>;
}
