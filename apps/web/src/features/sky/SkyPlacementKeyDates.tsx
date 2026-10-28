import { ChevronDown, ChevronRight } from "lucide-react";
import { PreparedProse } from "../../components/FormattedWritingContent";
import { aspectGlyph, pointGlyph, signGlyph } from "../../components/charts/chartAssets";
import { zodiacSigns } from "../../services/chartMath";
import type { SkyDetail, SkyDetailKeyDate } from "./SkyDetailArticle";

function eventGlyph(label: string) {
  const aspect = ["conjunction", "sextile", "square", "trine", "opposition", "quincunx"].find(value => new RegExp(`\\b${value}\\b`, "iu").test(label));
  if (aspect) return { text: aspectGlyph(aspect), tone: aspect };
  if (/stations retrograde/iu.test(label)) return { text: "℞", tone: "station" };
  if (/stations direct/iu.test(label)) return { text: "D", tone: "station" };
  const sign = zodiacSigns.find(value => new RegExp(`\\b${value}\\b`, "iu").test(label));
  return { text: sign ? signGlyph(sign) : pointGlyph(label.split(" ")[0]), tone: "station" };
}

export function SkyPlacementKeyDates({ dates, intro, context, pending }: {
  dates: SkyDetailKeyDate[];
  intro?: string | null;
  context?: SkyDetail["placementContext"];
  pending?: boolean;
}) {
  const zone = context?.timeZone ?? "UTC";
  const reference = context ? Date.parse(context.referenceDate) : NaN;
  const next = dates.findIndex(entry => entry.occursAt && Date.parse(entry.occursAt) >= reference);
  const format = (instant: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: zone, ...options }).format(new Date(instant));
  const calendarKey = (instant: string) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
    return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
  };
  return <details className="sky-placement-key-dates sky-placement-article__panel">
    <summary><h2>Key dates</h2>{!pending && <span className="sky-placement-key-dates__count">{dates.length}</span>}<span className="sky-placement-article__chevron"><ChevronDown aria-hidden="true" /></span></summary>
    {pending ? <p role="status">Calculating key dates…</p> : <>
      {intro && <PreparedProse text={intro} />}
      {dates.length ? <ol>{dates.map((entry, index) => {
        const instant = entry.occursAt;
        const key = instant ? calendarKey(instant) : null;
        const date = instant ? format(instant, { month: "short", day: "numeric" }) : entry.date;
        const weekday = instant ? format(instant, { weekday: "short" }) : "";
        const meta = instant ? `${format(instant, { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}${entry.endsAt ? ` · until ${format(entry.endsAt, { month: "short", day: "numeric", year: "numeric" })}` : ""}` : entry.date;
        const glyph = eventGlyph(entry.label);
        const content = <>
          <time className="sky-placement-key-dates__date" dateTime={instant} aria-label={entry.date}><strong>{date}</strong><span>{weekday}</span></time>
          <span className={`sky-placement-key-dates__glyph sky-placement-key-dates__glyph--${glyph.tone}`} aria-hidden="true">{glyph.text}</span>
          <span className="sky-placement-key-dates__copy"><span className="sky-placement-key-dates__title"><strong>{entry.label}</strong>{index === next && <span className="sky-placement-key-dates__next">Next</span>}</span><span className="sky-placement-key-dates__meta"><span className="sky-placement-key-dates__mobile-date">{weekday}, {date} · </span>{meta}</span></span>
          {key && <span className="sky-placement-key-dates__arrow"><ChevronRight aria-hidden="true" /></span>}
        </>;
        return <li key={`${entry.date}-${entry.label}`} className={instant && Date.parse(instant) < reference ? "is-past" : undefined}>
          {key ? <a href={`/?date=${key}#calendar?view=day&date=${key}`}>{content}</a> : <div className="sky-placement-key-dates__row">{content}</div>}
        </li>;
      })}</ol> : <p>No key dates in this placement’s calculated window.</p>}
    </>}
  </details>;
}
