import { FormattedParagraph, FormattedText } from "../../components/FormattedProse";
import { skySummaryParagraphs, type SummaryPart } from '../../content/skyDailySummary';
import type { SkySnapshot } from '../../types';
import { slugContentPart } from '../../services/generatedContentKeys';

export function CalendarSummaryText({ parts, sky, date }: {
  parts: SummaryPart[]; sky: SkySnapshot | null; date: string;
}) {
  const sun = sky?.positions.find(position => position.planet === 'Sun');
  return <>{skySummaryParagraphs(parts).map((paragraph, i) => <FormattedParagraph key={i} parts={paragraph} renderPart={(part, j) =>
    part.action === 'sun' && sun
      ? <a key={j} className="sky-daily-summary__link" href={`?date=${date}#sky/placement/sun/${slugContentPart(sun.sign)}`}><FormattedText text={part.text} /></a>
      : part.action === 'event' && part.eventId
        ? <a key={j} className="sky-daily-summary__link" href={`#calendar?${new URLSearchParams({ view: 'day', date, event: part.eventId, timeZone: sky?.location.timeZone || 'UTC' })}`}><FormattedText text={part.text} /></a>
        : undefined
  } />)}</>;
}
