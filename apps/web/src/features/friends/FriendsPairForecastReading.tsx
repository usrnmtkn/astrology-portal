import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { frictionFlowCopy, type FrictionFlowCopy } from "../../content/frictionFlowCopy";
import { FormattedProse } from "../../components/FormattedProse";
import { AspectBadge } from "../../components/charts/AspectBadge";
import { pointGlyph, aspectGlyph } from "../../components/charts/chartAssets";
import { PageLoadError, PageLoading } from "../../components/PageLoading";
import { forecastContactLabel } from "../../content/relationshipForecastCopy";
import { precisePersonalOrb } from "../../services/personalDailyTransits";
import type { ForecastContact, RelationshipForecastDay } from "../../services/relationshipForecast";
import { useForecastContactTimings } from "./useForecastExplanationSources";
import { forecastPersonalReading, type ForecastNormalizer } from "./forecastPersonalReading";
import { forecastAspectOrder, forecastDayLinks } from "./forecastDayLinks";
import { forecastPersonHref, navigateForecast } from "./forecastDayNavigation";

const glyphs: Record<string, string> = { conjunction: "☌", sextile: "⚹", square: "□", trine: "△", opposition: "☍" };
export function PairForecastContact({ contact, detail, timeZone, friendName, children, copy = frictionFlowCopy() }: { contact: ForecastContact; detail?: boolean; timeZone: string; friendName?: string; children?:ReactNode; copy?:FrictionFlowCopy }) {
  return <li className="pair-forecast-contact" data-endpoint-owner={contact.owner}><span aria-hidden="true">{glyphs[contact.aspect]}</span><div>
    <strong>{forecastContactLabel(contact,friendName,copy)}</strong>
    {detail && <>
      <small>{copy("contact/orb", {orb:precisePersonalOrb(contact.orb)})}{contact.timeLord ? ` · ${copy("contact/timeLord")}` : ""}
        {contact.exactAt.length ? ` · ${copy("contact/exact", {times:contact.exactAt.map(at => new Date(at).toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" })).join(", ")})}` : contact.continuesFromPreviousDay ? ` · ${copy("contact/continuing")}` : ""}</small>
    </>}
    {children}
  </div></li>;
}


export function FriendsPairForecastReading({ day, today, timeZone, friendName, chartId, normalize, copyLoading, copyError, onRetryCopy, copy = frictionFlowCopy() }: {
  day: RelationshipForecastDay; today: boolean; timeZone: string; friendName: string; chartId: string;
  normalize: ForecastNormalizer; copyLoading: boolean; copyError: boolean; onRetryCopy?: () => void; copy?: FrictionFlowCopy;
}) {
  const id = useId();
  const groups = forecastDayLinks(day);
  const [expanded, setExpanded] = useState<string[]>(() => groups[0] ? [groups[0].link.id] : []);
  const displayed = [...new Map(groups.flatMap(group => group.contacts).map(contact => [contact.id, contact])).values()];
  const timing = useForecastContactTimings(displayed, timeZone);
  const weekday = new Date(`${day.date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" });
  return groups.length > 0 ? <div className="pair-forecast-reading">
    {groups.length > 0 && <>
      <div className="pair-forecast-section-heading"><h3>Between you</h3><div className="pair-forecast-tally" aria-label="Transit counts by aspect">
        {forecastAspectOrder.map(aspect => {
          const count = groups.reduce((sum, group) => sum + group.contacts.filter(contact => contact.aspect === aspect).length, 0);
          return count ? <span key={aspect} className="aspect-badge pair-forecast-tally-item" data-aspect={aspect} aria-label={`${count} ${aspect}`}><span aria-hidden="true">{aspectGlyph(aspect)}</span>{count}</span> : null;
        })}
      </div></div>
      {(timing.loading || copyLoading) && <PageLoading compact message={copy("availability/loading")}/>}
      {(timing.error || copyError) && <PageLoadError message={copy("availability/error")} onRetry={() => { timing.retry(); onRetryCopy?.(); }}/>}
      {groups.map(({ link, contacts }, index) => {
        const open = expanded.includes(link.id), panelId = `${id}-${index}`;
        return <section className="pair-forecast-link" key={link.id}>
          <button className="pair-forecast-link-toggle" type="button" aria-expanded={open} aria-controls={panelId}
            onClick={() => setExpanded(current => open ? current.filter(key => key !== link.id) : [...current, link.id])}>
            <span className="pair-forecast-link-glyphs" aria-hidden="true">{pointGlyph(link.readerPoint)} <AspectBadge aspect={link.aspect}/> {pointGlyph(link.friendPoint)}</span>
            <span className="pair-forecast-link-title">Your {link.readerPoint} {link.aspect} {friendName}’s {link.friendPoint}</span>
            <span className="pair-forecast-link-orb">{precisePersonalOrb(link.orb)}</span>
            <span className="pair-forecast-link-count">{contacts.length} {contacts.length === 1 ? "transit" : "transits"} {today ? "today" : `on ${weekday}`}</span>
            <span className="pair-forecast-chevron" aria-hidden="true"><ChevronDown/></span>
          </button>
          <div id={panelId} hidden={!open} className="pair-forecast-link-contacts">
            {contacts.map(contact => {
              const window = timing.timings.get(contact.id);
              const reading = window && !copyLoading && !copyError ? forecastPersonalReading(contact, window, friendName, timeZone, normalize) : null;
              const exact = contact.exactAt.filter(at => Date.parse(at) >= Date.parse(day.start) && Date.parse(at) < Date.parse(day.end));
              const meta = exact.length ? `Exact ${exact.map(at => new Date(at).toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" })).join(", ")}`
                : today ? "Active today" : copy("contact/orb", { orb: precisePersonalOrb(contact.orb) });
              const title = `${contact.planet} ${contact.aspect} ${contact.owner === "reader" ? "your" : `${friendName}’s`} ${contact.target}`;
              const body = <><AspectBadge aspect={contact.aspect}/><div className="pair-forecast-transit-copy"><strong>{title}</strong><small>{meta}</small>
                {reading && <div className="pair-forecast-transit-preview modal-dialog__content" data-content-key={reading.contentKey}><FormattedProse text={reading.body}/></div>}</div>
                {reading && <span className="pair-forecast-chevron" aria-hidden="true"><ChevronRight/></span>}</>;
              return reading ? <a key={contact.id} className="pair-forecast-transit" data-endpoint-owner={contact.owner}
                href={forecastPersonHref(contact.owner === "reader" ? null : chartId, day.date, contact)}
                onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) { event.preventDefault(); navigateForecast(event.currentTarget.href); } }}>{body}</a>
                : <div key={contact.id} className="pair-forecast-transit" data-endpoint-owner={contact.owner}>{body}</div>;
            })}
          </div>
        </section>;
      })}
    </>}
  </div> : null;
}
