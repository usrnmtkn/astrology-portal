import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AstroGlyph } from "./AstroGlyph";
import type { RetrogradeCycle, RetrogradeHistory, RetrogradeStation } from "../../services/retrogradeHistory";
import { getRetrogradeHistoryOffMainThread } from "../../services/skyCalculationClient";
import type { RetrogradeHistoryContext } from "../../components/RetrogradeHistory";
import copy from "../../content/retrogradeCycleNarratives.json";
import "../../styles/retrograde-cycles.css";

const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const glyphs = ["♈︎", "♉︎", "♊︎", "♋︎", "♌︎", "♍︎", "♎︎", "♏︎", "♐︎", "♑︎", "♒︎", "♓︎"];
// Truncate to the occupied arcminute; rounding a re-entry can falsely show 0°
// of the next sign instead of 29°59′ in the sign just entered.
const degree = (station: RetrogradeStation) => {
  const minutes = Math.floor(station.degree * 60);
  return `${Math.floor(minutes / 60)}°${String(minutes % 60).padStart(2, "0")}′`;
};
function localDate(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}
const civilDays = (start: string, end: string, zone: string) => Math.round((Date.parse(localDate(end, zone)) - Date.parse(localDate(start, zone))) / 86_400_000);
const format = (instant: string, timeZone: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(new Date(instant));
const date = (instant: string, zone: string) => format(instant, zone, { month: "short", day: "numeric", year: "numeric" });
const shortDate = (instant: string, zone: string) => format(instant, zone, { month: "short", day: "numeric" });
const time = (instant: string, zone: string) => format(instant, zone, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
function OpenDate({ instant, zone }: { instant: string; zone: string }) {
  const key = localDate(instant, zone);
  return <a className="retrograde-cycles__open" href={`/?date=${key}#calendar?view=day&date=${key}`}>Open {date(instant, zone)} →</a>;
}
function Comparison({ history, zone }: { history: RetrogradeHistory; zone: string }) {
  const cycles = [history.sameSign, history.current, history.nextSameSign];
  const labels = ["Previous", "Current", "Next"];
  const years = cycles.filter(Boolean).map(cycle => format(cycle!.retrograde.instant, zone, { year: "numeric" }));
  const yearsLabel = years.length > 1 ? `${years.slice(0, -1).join(", ")} and ${years.at(-1)}` : years[0];
  const transitionSigns = [...new Set(cycles.flatMap(cycle => cycle?.signTransitions?.map(entry => entry.sign) ?? []))];
  const stationCell = (station?: RetrogradeStation) => station ? <>
    {shortDate(station.instant, zone)}<span className="retrograde-cycles__degree" aria-label={`${degree(station)} ${title(station.sign)}`}>{degree(station)} <AstroGlyph text={glyphs[signs.indexOf(station.sign)]} /></span>
  </> : "—";
  const row = (label: string, values: React.ReactNode[]) => <tr key={label}><th scope="row">{label}</th>{values.map((value, index) => <td key={labels[index]} className={index === 1 ? "is-current" : undefined}>{value}</td>)}</tr>;
  return <details className="retrograde-cycles__compare retrograde-cycles__card">
    <summary><span>Compare cycles<span className="retrograde-cycles__meta">{yearsLabel} stations and duration</span></span><ChevronDown aria-hidden="true" /></summary>
    <div className="retrograde-cycles__table-scroll" tabIndex={0} role="region" aria-label="Cycle comparison">
      <table>
        <caption className="sr-only">Retrograde stations and duration. Calendar days in {zone}.</caption>
        <thead><tr><th scope="col"><span className="sr-only">Event</span></th>{cycles.map((cycle, index) => <th scope="col" key={labels[index]} className={index === 1 ? "is-current" : undefined}>{cycle ? format(cycle.retrograde.instant, zone, { year: "numeric" }) : "—"}<span>{labels[index]}</span></th>)}</tr></thead>
        <tbody>
          <tr className="retrograde-cycles__band"><th colSpan={4} scope="rowgroup">Stations</th></tr>
          {row("Retrograde", cycles.map(cycle => stationCell(cycle?.retrograde)))}
          {transitionSigns.map(sign => row(`Back into ${title(sign)}`, cycles.map(cycle => stationCell(cycle?.signTransitions?.find(entry => entry.sign === sign)))))}
          {row("Direct", cycles.map(cycle => stationCell(cycle?.direct)))}
        </tbody>
        <tbody>
          <tr className="retrograde-cycles__band"><th colSpan={4} scope="rowgroup">Duration</th></tr>
          {row("Retrograde", cycles.map(cycle => cycle ? `${civilDays(cycle.retrograde.instant, cycle.direct.instant, zone)} days` : "—"))}
          {row(`In ${title(history.sign ?? "")}`, cycles.map(cycle => cycle ? `${cycle.segments.filter(segment => segment.sign === history.sign).reduce((days, segment) => days + civilDays(segment.start, segment.end, zone), 0)} days` : "—"))}
        </tbody>
      </table>
    </div>
  </details>;
}
function CycleCards({ history, zone }: { history: RetrogradeHistory; zone: string }) {
  const current = history.current!;
  const previous = history.sameSign;
  const next = history.nextSameSign;
  const crossing = history.previousCrossing;
  const previousInstant = crossing?.instant ?? previous?.retrograde.instant;
  const relative = (instant: string, future: boolean) => {
    const years = Math.round(Math.abs(Date.parse(instant) - Date.parse(current.retrograde.instant)) / (365.2425 * 86_400_000));
    const days = Math.abs(civilDays(current.retrograde.instant, instant, zone));
    const quantity = years || days;
    const unit = `${years ? "year" : "day"}${quantity === 1 ? "" : "s"}`;
    return future ? `in ${quantity} ${unit}` : `${quantity} ${unit} ago`;
  };
  const dateLine = (instant: string, future: boolean) => `${format(instant, zone, { weekday: "long", month: "short", day: "numeric", year: "numeric" })} · ${relative(instant, future)}`;
  const suppliedCopy = history.planet === copy.planet && history.sign === copy.sign && new Date(current.retrograde.instant).getUTCFullYear() === copy.referenceYear;
  const nextEntry = next?.signTransitions.find(entry => entry.sign === copy.nextBodyDate.sign);
  const nextCopyMatches = suppliedCopy && nextEntry;
  return <div className="retrograde-cycles">
    <details open className="retrograde-cycles__section">
      <summary>Previous retrograde<span className="retrograde-cycles__chevron"><ChevronDown aria-hidden="true" /></span></summary>
      {previousInstant ? <div className="retrograde-cycles__card">
        <div className="retrograde-cycles__date">{dateLine(previousInstant, false)}<div className="retrograde-cycles__meta">{crossing ? `${time(crossing.instant, zone)} · ${title(history.planet)} at ${degree(current.retrograde)} ${title(current.retrograde.sign)}` : `${time(previousInstant, zone)} · Stations retrograde in ${title(previous!.retrograde.sign)}`}</div></div>
        {suppliedCopy && crossing ? <p>{copy.previousBody}</p> : !crossing && <p>No exact crossing of the current station degree in this cycle.</p>}
        <OpenDate instant={previousInstant} zone={zone} />
      </div> : <p>No previous complete retrograde in {title(history.sign ?? "")} within the available dates.</p>}
      <Comparison history={history} zone={zone} />
    </details>
    <details open className="retrograde-cycles__section">
      <summary>Next retrograde<span className="retrograde-cycles__chevron"><ChevronDown aria-hidden="true" /></span></summary>
      {next ? <div className="retrograde-cycles__card">
        <div className="retrograde-cycles__date">{dateLine(next.retrograde.instant, true)}<div className="retrograde-cycles__meta">Stations retrograde in {title(next.retrograde.sign)} · direct {date(next.direct.instant, zone)}</div></div>
        {nextCopyMatches && <p>{copy.nextBody.replace("Oct 18", shortDate(nextEntry.instant, zone))}</p>}
        <OpenDate instant={next.retrograde.instant} zone={zone} />
      </div> : <p>No next complete retrograde in {title(history.sign ?? "")} within the available dates.</p>}
    </details>
  </div>;
}
export function RetrogradeCycles({ context }: { context: RetrogradeHistoryContext }) {
  const [history, setHistory] = useState<RetrogradeHistory | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { planet, sign, referenceDate, timeZone } = context;
  useEffect(() => {
    let active = true;
    setHistory(null); setError(false);
    void getRetrogradeHistoryOffMainThread(planet, sign, new Date(referenceDate))
      .then(value => { if (active) setHistory(value); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [planet, sign, referenceDate, attempt]);
  if (error) return <p role="alert">Retrograde cycles could not load. <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></p>;
  if (!history) return <p role="status">Calculating retrograde cycles…</p>;
  if (history.status !== "ready" || !history.current) return <p>Retrograde cycles are unavailable for this event.</p>;
  return <CycleCards history={history} zone={timeZone} />;
}
