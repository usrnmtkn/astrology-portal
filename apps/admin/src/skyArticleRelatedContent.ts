export type ArticleWindow = { planet: string; sign: string; transitStartInstant: string; transitEndInstant: string };
export type ArticleEvent = { id: string; type: string; title: string; startsAt: string; planets?: string[]; aspect?: string };
export type ArticleEventFacts = ArticleWindow & {
  referenceTimeZone?: string;
  eventCoverage?: { start: string; end: string; complete: boolean };
  events?: ArticleEvent[];
};
const identity = (value: string) => value.toLowerCase().replaceAll(' ', '-');

/** Follow-through events and other planets' events never become this article's aspects. */
export function articlePeriodAspects(window: ArticleWindow, facts: ArticleEventFacts | null | undefined) {
  const start = Date.parse(window.transitStartInstant), end = Date.parse(window.transitEndInstant);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('The saved article period is invalid.');
  if (!facts || typeof facts.planet !== 'string' || typeof facts.sign !== 'string'
    || identity(facts.planet) !== identity(window.planet) || identity(facts.sign) !== identity(window.sign)
    || Date.parse(facts.transitStartInstant) !== start || Date.parse(facts.transitEndInstant) !== end
    || !Array.isArray(facts.events) || !facts.eventCoverage
    || Date.parse(facts.eventCoverage.start) !== start || !Number.isFinite(Date.parse(facts.eventCoverage.end))
    || Date.parse(facts.eventCoverage.end) <= start || Date.parse(facts.eventCoverage.end) > end
    || facts.eventCoverage.complete !== (Date.parse(facts.eventCoverage.end) === end)) return null;
  const coverageEnd = Date.parse(facts.eventCoverage.end);
  const seen = new Set<string>();
  const events = facts.events.filter(event => {
    if (!event || typeof event.title !== 'string' || typeof event.aspect !== 'string' || typeof event.id !== 'string') return false;
    const at = Date.parse(event.startsAt);
    if (event.type !== 'aspect' || !event.aspect || !Array.isArray(event.planets) || event.planets.length !== 2
      || event.planets.some(planet => typeof planet !== 'string')
      || !event.planets.some(planet => identity(planet) === identity(window.planet))
      || !Number.isFinite(at) || at < start || at >= coverageEnd || seen.has(event.id)) return false;
    seen.add(event.id); return true;
  }).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return { events, complete: facts.eventCoverage.complete, coverageEnd: facts.eventCoverage.end };
}

export function articleAspectHref(event: ArticleEvent) {
  if (event.planets?.length !== 2 || !event.aspect) return undefined;
  return `/#/sky/aspect/${encodeURIComponent(identity(event.planets[0]))}/${encodeURIComponent(identity(event.aspect))}/${encodeURIComponent(identity(event.planets[1]))}/at/${encodeURIComponent(event.startsAt)}`;
}

/** Endpoints are exclusive: an edition ending at ingress does not overlap it. */
export function horoscopeOverlapsArticle(window: ArticleWindow, edition: { startsAt: string; endsAt: string }) {
  const start = Date.parse(edition.startsAt), end = Date.parse(edition.endsAt);
  return start < end && start < Date.parse(window.transitEndInstant)
    && end > Date.parse(window.transitStartInstant);
}

/** The existing date lookup samples noon UTC. Choose a noon inside the saved
 * period, rather than the ingress's civil date (which may sample before it). */
export function articleFactsReferenceDate(window: ArticleWindow) {
  const start = Date.parse(window.transitStartInstant), end = Date.parse(window.transitEndInstant);
  const midpoint = new Date(start + (end - start) / 2);
  const noon = Date.UTC(midpoint.getUTCFullYear(), midpoint.getUTCMonth(), midpoint.getUTCDate(), 12);
  const candidate = noon < start ? noon + 86_400_000 : noon >= end ? noon - 86_400_000 : noon;
  return candidate >= start && candidate < end ? new Date(candidate).toISOString().slice(0, 10) : null;
}
