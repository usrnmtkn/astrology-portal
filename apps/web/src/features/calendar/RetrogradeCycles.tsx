import { useEffect, useState } from "react";
import { PageLoadState } from "../../components/PageLoading";
import { ChevronDown } from "lucide-react";
import type { RetrogradeCycle, RetrogradeHistory, RetrogradeStation } from "../../services/retrogradeHistory";
import { getRetrogradeHistoryOffMainThread } from "../../services/skyCalculationClient";
import type { RetrogradeHistoryContext } from "../../components/RetrogradeHistory";
import copy from "../../content/retrogradeCycleNarratives.json";
import "../../styles/retrograde-cycles.css";

const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
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
  const longest = Math.max(...cycles.map(cycle => cycle ? Date.parse(cycle.direct.instant) - Date.parse(cycle.retrograde.instant) : 0));
  const stationCell = (station: RetrogradeStation) => <span className="retrograde-cycles__station">{shortDate(station.instant, zone)}<span className="retrograde-cycles__degree">{degree(station)} {title(station.sign)}</span></span>;
  return <details className="retrograde-cycles__compare retrograde-cycles__card">
    <summary><span>Compare cycles<span className="retrograde-cycles__meta">{yearsLabel} stations and duration</span></span><ChevronDown aria-hidden="true" /></summary>
    <div className="retrograde-cycles__legend"><span><i />In {title(history.sign ?? "")}</span><span><i />Neighbouring sign</span></div>
    <div className="retrograde-cycles__table-scroll" role="region" aria-label="Cycle comparison">
      <table>
        <caption className="sr-only">Retrograde stations and duration. Calendar days in {zone}.</caption>
        <thead><tr>{["Year", "Stations retrograde", "Sign change", "Stations direct", "Length"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{cycles.map((cycle, index) => {
          if (!cycle) return <tr key={labels[index]}><th scope="row">{labels[index]}</th><td colSpan={4}>No complete cycle within the available dates.</td></tr>;
          const days = civilDays(cycle.retrograde.instant, cycle.direct.instant, zone);
          const inSign = cycle.segments.filter(segment => segment.sign === history.sign).reduce((total, segment) => total + civilDays(segment.start, segment.end, zone), 0);
          return <tr key={labels[index]} className={index === 1 ? "is-current" : undefined}>
            <th scope="row">{format(cycle.retrograde.instant, zone, { year: "numeric" })}<span>{labels[index]}</span></th>
            <td data-label="Retrograde">{stationCell(cycle.retrograde)}</td>
            <td data-label="Sign change">{cycle.signTransitions.length ? cycle.signTransitions.map(entry => <span className="retrograde-cycles__transition" key={entry.instant}>{shortDate(entry.instant, zone)}<span className="retrograde-cycles__degree">Back into {title(entry.sign)}</span></span>) : <span className="retrograde-cycles__station">None<span className="retrograde-cycles__degree">Stays in {title(cycle.retrograde.sign)}</span></span>}</td>
            <td data-label="Direct">{stationCell(cycle.direct)}</td>
            <td className="retrograde-cycles__length"><span>{days} days <small>· {inSign} in {title(history.sign ?? "")}</small></span>
              <svg className="retrograde-cycles__bar" viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label={`${days} days, ${inSign} in ${title(history.sign ?? "")}`}>
                {cycle.segments.map(segment => <rect key={segment.start} x={(Date.parse(segment.start) - Date.parse(cycle.retrograde.instant)) * 100 / longest} y={0} width={(Date.parse(segment.end) - Date.parse(segment.start)) * 100 / longest} height={8} rx={2} className={segment.sign === history.sign ? "in-sign" : "neighbouring-sign"}><title>{title(segment.sign)}: {shortDate(segment.start, zone)} – {shortDate(segment.end, zone)}</title></rect>)}
              </svg>
            </td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </details>;
}
function CycleCards({ history, zone, presentation }: { history: RetrogradeHistory; zone: string; presentation?: "article" }) {
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
  return <div className={`retrograde-cycles${presentation === "article" ? " retrograde-cycles--article" : ""}`}>
    <details open={presentation !== "article"} className="retrograde-cycles__section">
      <summary>Previous retrograde<span className="retrograde-cycles__chevron"><ChevronDown aria-hidden="true" /></span></summary>
      {previousInstant ? <div className="retrograde-cycles__card">
        <div className="retrograde-cycles__date">{dateLine(previousInstant, false)}<div className="retrograde-cycles__meta">{crossing ? `${time(crossing.instant, zone)} · ${title(history.planet)} at ${degree(current.retrograde)} ${title(current.retrograde.sign)}` : `${time(previousInstant, zone)} · Stations retrograde in ${title(previous!.retrograde.sign)}`}</div></div>
        {suppliedCopy && crossing ? <p>{copy.previousBody}</p> : !crossing && <p>No exact crossing of the current station degree in this cycle.</p>}
        <OpenDate instant={previousInstant} zone={zone} />
      </div> : <p>No previous complete retrograde in {title(history.sign ?? "")} within the available dates.</p>}
      <Comparison history={history} zone={zone} />
    </details>
    <details open={presentation !== "article"} className="retrograde-cycles__section">
      <summary>Next retrograde<span className="retrograde-cycles__chevron"><ChevronDown aria-hidden="true" /></span></summary>
      {next ? <div className="retrograde-cycles__card">
        <div className="retrograde-cycles__date">{dateLine(next.retrograde.instant, true)}<div className="retrograde-cycles__meta">Stations retrograde in {title(next.retrograde.sign)} · direct {date(next.direct.instant, zone)}</div></div>
        {nextCopyMatches && <p>{copy.nextBody.replace("Oct 18", shortDate(nextEntry.instant, zone))}</p>}
        <OpenDate instant={next.retrograde.instant} zone={zone} />
      </div> : <p>No next complete retrograde in {title(history.sign ?? "")} within the available dates.</p>}
    </details>
  </div>;
}
export function RetrogradeCycles({ context, presentation }: { context: RetrogradeHistoryContext; presentation?: "article" }) {
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
  const statusClass = presentation === "article" ? "sky-placement-article__status" : undefined;
  if (error || !history) return <PageLoadState what="Retrograde cycles" failed={error} pending={!history && !error} onRetry={() => setAttempt(value => value + 1)}><p className={statusClass} role="status">Calculating retrograde cycles…</p></PageLoadState>;
  if (history.status !== "ready" || !history.current) return <p className={statusClass}>Retrograde cycles are unavailable for this event.</p>;
  return <CycleCards history={history} zone={timeZone} presentation={presentation} />;
}
