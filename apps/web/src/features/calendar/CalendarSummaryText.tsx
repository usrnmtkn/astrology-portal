import { skySummaryParagraphs, type SummaryPart } from '../../content/skyDailySummary';
import type { SkySnapshot } from '../../types';
import { slugContentPart } from '../../services/generatedContentKeys';

export function CalendarSummaryText({ parts, sky, date }: {
  parts: SummaryPart[]; sky: SkySnapshot | null; date: string;
}) {
  const sun = sky?.positions.find(position => position.planet === 'Sun');
  return <>{skySummaryParagraphs(parts).map((paragraph, i) => <p key={i}>{paragraph.map((part, j) =>
    part.action === 'sun' && sun
      ? <a key={j} className="sky-daily-summary__link" href={`?date=${date}#sky/placement/sun/${slugContentPart(sun.sign)}`}>{part.text}</a>
      : <span key={j}>{part.text}</span>
  )}</p>)}</>;
}
