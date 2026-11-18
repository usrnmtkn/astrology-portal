import { LoadingStatus, SkeletonBar, SkeletonText } from "../../components/CardSkeleton";
import { FormattedProse } from "../../components/FormattedProse";

export function StoicCardSkeleton({ wide = false, moon = false, title, excerpt, meta, metaBelowTitle = false }: { wide?: boolean; moon?: boolean; title?: string; excerpt?: string; meta?: string; metaBelowTitle?: boolean }) {
  return <button className={`calendar-stoic-card card-skeleton${wide ? " is-wide" : ""}${moon ? " calendar-stoic-card--moon" : ""}`} type="button" disabled tabIndex={-1} aria-hidden="true" data-skeleton-measurable={title && excerpt !== undefined ? "" : undefined}>
    <span className="card-skeleton-tag" />
    <span className="calendar-stoic-card__copy">
      <span className="eyebrow calendar-kind-label"><SkeletonBar short /></span>
      <strong>{title ? <SkeletonText>{title}</SkeletonText> : <SkeletonBar title />}</strong>
      {metaBelowTitle ? <span className="calendar-stoic-card__meta">{meta ? <SkeletonText>{meta}</SkeletonText> : <SkeletonBar short />}</span> : null}
    </span>
    {excerpt ? <FormattedProse className="calendar-stoic-card__excerpt card-skeleton-prose" listClassName="formatted-prose-list card-skeleton-prose-list" text={excerpt} /> : excerpt === "" ? null : <p className="calendar-stoic-card__excerpt"><SkeletonBar /><br /><SkeletonBar /></p>}
    <span className="calendar-stoic-card__cta">{metaBelowTitle ? null : <span>{meta ? <SkeletonText>{meta}</SkeletonText> : <SkeletonBar short />}</span>}<span className="card-skeleton-disc card-skeleton-disc--small" /></span>
  </button>;
}

export function SeasonTransitRowSkeleton() {
  return <li className="card-skeleton" aria-hidden="true">
    <span className="calendar-season-transits__row">
      <span className="card-skeleton-tag" />
      <span className="calendar-season-transits__title"><SkeletonBar /></span>
      <small><SkeletonBar short /></small>
    </span>
  </li>;
}

/** Used before the calendar supplies a day's expected counts. */
export function CalendarDaySkeleton({ message = "Calculating calendar", announce = true }: { message?: string; announce?: boolean }) {
  return <div className="calendar-day-panel is-embedded" aria-busy="true">
    {announce ? <LoadingStatus>{message}</LoadingStatus> : null}
    <section className="calendar-day-events" aria-busy="true">
      <div className="calendar-day-events__grid"><StoicCardSkeleton /><StoicCardSkeleton /></div>
    </section>
    <section className="calendar-season-transits" aria-busy="true">
      <ul><SeasonTransitRowSkeleton /><SeasonTransitRowSkeleton /><SeasonTransitRowSkeleton /></ul>
    </section>
  </div>;
}

/** Only civil dates are shown before ephemeris data arrives. */
export function CalendarLoading({ month, dateKey, view }: { month: Date; dateKey: string; view: "week" | "weekly" | "month" }) {
  const [year, index, day] = dateKey.split("-").map(Number);
  const requested = new Date(Date.UTC(year, index - 1, day));
  const anchor = view === "month" || !Number.isFinite(requested.getTime()) ? new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1)) : requested;
  const first = new Date(anchor); first.setUTCDate(first.getUTCDate() - first.getUTCDay());
  const days = Array.from({length:view === "month" ? 42 : 7}, (_, i) => {
    const date = new Date(first); date.setUTCDate(first.getUTCDate() + i); return date;
  }).filter((_,i,all) => view !== "month" || all.slice(i-i%7,i-i%7+7).some(date=>date.getUTCMonth()===month.getMonth()));
  const weekday = (date: Date) => date.toLocaleDateString("en-US",{weekday:"short",timeZone:"UTC"});
  return <div className={`lunar-calendar-body is-${view} calendar-loading`} aria-busy="true" id="lunar-calendar-view-panel" role="tabpanel" aria-labelledby={`lunar-calendar-view-${view}-tab`}>
    <LoadingStatus>Calculating calendar</LoadingStatus>
    {view === "month" ? <section className="lunar-calendar-grid-panel">
      <div className="lunar-calendar-weekdays">{days.slice(0,7).map(date=><span key={weekday(date)}>{weekday(date)}</span>)}</div>
      <div className="lunar-calendar-grid">{days.map(date=><div key={date.toISOString()} className={`lunar-calendar-day card-skeleton${date.getUTCMonth()!==month.getMonth()?" is-outside":""}`}>
        <span className="lunar-calendar-day__number">{date.getUTCDate()}</span><span aria-hidden="true"><SkeletonBar short /></span>
      </div>)}</div>
    </section> : <>
      <section className="lunar-week-strip" aria-label="Selected week">{days.map(date=><div className="lunar-week-day card-skeleton" key={date.toISOString()}>
        <span className="lunar-week-day__weekday">{weekday(date)}</span><span className="lunar-week-day__date">{date.getUTCDate()}</span>
        <span className="card-skeleton-disc card-skeleton-disc--small" aria-hidden="true"/><span aria-hidden="true"><SkeletonBar short /></span>
      </div>)}</section>
      {view === "weekly" ? <div className="calendar-loading-week">{days.map(date=><section className="calendar-day-group card-skeleton" key={date.toISOString()}>
        <header className="calendar-day-group__header"><span>{date.getUTCDate()}</span><span>{date.toLocaleDateString("en-US",{weekday:"long",timeZone:"UTC"})}</span></header>
        <div aria-hidden="true">{Array.from({length:3},(_,i)=><div className="loading-calendar-event" key={i}><span className="card-skeleton-tag"/><SkeletonBar title/><SkeletonBar short/></div>)}<span className="loading-lines"><SkeletonBar/><SkeletonBar short/></span></div>
      </section>)}</div> : <div className="calendar-day-panel is-embedded"><section className="calendar-sky-card card-skeleton" aria-hidden="true">
        <span className="loading-card__heading"><span className="card-skeleton-disc"/><span><SkeletonBar title/><SkeletonBar short/></span></span>
        <span className="loading-lines"><SkeletonBar/><SkeletonBar/><SkeletonBar/><SkeletonBar short/></span>
      </section><span className="calendar-loading-checkin card-skeleton-bar" aria-hidden="true"/><CalendarDaySkeleton announce={false} /></div>}
    </>}
  </div>;
}
