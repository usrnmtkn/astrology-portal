import { FormattedParagraph, FormattedText } from '../../components/FormattedProse';

/** Keep the assembled preview and reader identical, including their calculated article links. */
export function CalendarPassageProse({ text }: { text: string }) {
  return <>{text.split(/\n\s*\n/u).filter(Boolean).map((paragraph, index) => {
    const parts: Array<{ text: string; href?: string }> = [];
    let cursor = 0;
    // Only app-owned Calendar article routes are links. Arbitrary HTML/URLs stay plain text.
    for (const match of paragraph.matchAll(/\[([^\]\n]+)\]\((\?date=\d{4}-\d{2}-\d{2}#sky\/(?:placement\/[a-z]+\/[a-z]+|lunation\/\d{4}-\d{2}-\d{2}\/[a-z]+))\)/gu)) {
      if (match.index! > cursor) parts.push({ text: paragraph.slice(cursor, match.index) });
      // Studio lives at /admin/content; article links always belong to the reader root.
      parts.push({ text: match[1], href: `/${match[2]}` });
      cursor = match.index! + match[0].length;
    }
    if (cursor < paragraph.length) parts.push({ text: paragraph.slice(cursor) });
    return <FormattedParagraph key={index} parts={parts} renderPart={part => part.href
      ? <a href={part.href}><FormattedText text={part.text} /></a> : null} />;
  })}</>;
}
