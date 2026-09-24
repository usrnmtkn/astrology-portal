import { LoadingStatus, SkeletonBar, SkeletonText } from "../../components/CardSkeleton";
import { FormattedProse } from "../../components/FormattedProse";

export function StoicCardSkeleton({ wide = false, moon = false, title, excerpt, meta }: { wide?: boolean; moon?: boolean; title?: string; excerpt?: string; meta?: string }) {
  return <button className={`calendar-stoic-card card-skeleton${wide ? " is-wide" : ""}${moon ? " calendar-stoic-card--moon" : ""}`} type="button" disabled tabIndex={-1} aria-hidden="true" data-skeleton-measurable={title && excerpt !== undefined ? "" : undefined}>
    <span className="card-skeleton-tag" />
    <span className="calendar-stoic-card__copy">
      <span className="eyebrow calendar-kind-label"><SkeletonBar short /></span>
      <strong>{title ? <SkeletonText>{title}</SkeletonText> : <SkeletonBar title />}</strong>
    </span>
    {excerpt ? <FormattedProse className="calendar-stoic-card__excerpt card-skeleton-prose" listClassName="formatted-prose-list card-skeleton-prose-list" text={excerpt} /> : excerpt === "" ? null : <p className="calendar-stoic-card__excerpt"><SkeletonBar /><br /><SkeletonBar /></p>}
    <span className="calendar-stoic-card__cta"><span>{meta ? <SkeletonText>{meta}</SkeletonText> : <SkeletonBar short />}</span><span className="card-skeleton-disc card-skeleton-disc--small" /></span>
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
export function CalendarDaySkeleton({ message = "Calculating calendar" }: { message?: string }) {
  return <div className="calendar-day-panel is-embedded" aria-busy="true">
    <LoadingStatus>{message}</LoadingStatus>
    <section className="calendar-day-events" aria-busy="true">
      <div className="calendar-day-events__grid"><StoicCardSkeleton /><StoicCardSkeleton /></div>
    </section>
    <section className="calendar-season-transits" aria-busy="true">
      <ul><SeasonTransitRowSkeleton /><SeasonTransitRowSkeleton /><SeasonTransitRowSkeleton /></ul>
    </section>
  </div>;
}
