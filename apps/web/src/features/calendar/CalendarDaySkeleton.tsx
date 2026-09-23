import { LoadingStatus, SkeletonBar } from "../../components/CardSkeleton";

export function StoicCardSkeleton({ wide = false, moon = false }: { wide?: boolean; moon?: boolean }) {
  return <button className={`calendar-stoic-card card-skeleton${wide ? " is-wide" : ""}${moon ? " calendar-stoic-card--moon" : ""}`} type="button" disabled tabIndex={-1} aria-hidden="true">
    <span className="card-skeleton-tag" />
    <span className="calendar-stoic-card__copy">
      <span className="eyebrow calendar-kind-label"><SkeletonBar short /></span>
      <strong><SkeletonBar title /></strong>
    </span>
    <p className="calendar-stoic-card__excerpt"><SkeletonBar /><br /><SkeletonBar /></p>
    <span className="calendar-stoic-card__cta"><span><SkeletonBar short /></span><span><SkeletonBar short /></span></span>
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
