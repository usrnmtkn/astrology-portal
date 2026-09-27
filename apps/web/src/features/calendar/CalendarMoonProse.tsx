import { Fragment } from 'react';
import { FormattedProse, FormattedText } from '../../components/FormattedProse';

/** Moon-context links may navigate only to a dated Calendar event. */
export function calendarMoonEventHref(href: string) {
  if (!href.startsWith('#calendar?')) return null;
  const query = new URLSearchParams(href.slice('#calendar?'.length));
  if (query.get('view') !== 'day' || !/^\d{4}-\d{2}-\d{2}$/u.test(query.get('date') ?? '') || !query.get('event')) return null;
  if ([...query.keys()].some(key => !['view', 'date', 'event', 'timeZone'].includes(key))) return null;
  return href;
}

export function CalendarMoonProse({ text, className }: { text: string; className?: string }) {
  const links = [...text.matchAll(/\[([^\]\n]+)\]\(([^\s)]+)\)/gu)]
    .filter(match => calendarMoonEventHref(match[2]));
  if (!links.length) return <FormattedProse text={text} className={className} />;
  let cursor = 0;
  const pieces = links.map(match => {
    const before = text.slice(cursor, match.index);
    cursor = match.index! + match[0].length;
    return <Fragment key={match.index}><FormattedText text={before} /><a href={match[2]}><FormattedText text={match[1]} /></a></Fragment>;
  });
  return <p className={className}>{pieces}<FormattedText text={text.slice(cursor)} /></p>;
}
