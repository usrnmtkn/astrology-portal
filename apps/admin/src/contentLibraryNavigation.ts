import { seasonArticleIdentity } from '../../../src/shared/seasonArticle';
import { isSkyReaderPreviewDate, skyPreviewReferenceDate } from '../../../src/shared/skyReaderPreview';
import { studioPassageEditHref } from '../../../src/shared/studioPassageEdit';
import { calendarPassageReviewParams } from './calendarPassageReviewRoute';
export { default as ContentLibraryActionLabel } from './ContentLibraryActionLabel';

type LibraryRow = { content_key: string; target_date?: string | null };
export type LibraryDestination = {
  areas: Array<'sky' | 'calendar'>;
  label: string;
  detail: string;
  kind: 'article' | 'passage' | 'source' | 'workspace';
  sourceKey?: string;
  date?: string;
};

/** Reader destinations describe the content's use, independently of publication status. */
export function contentLibraryDestination(row: LibraryRow): LibraryDestination | null {
  const key = row.content_key;
  const date = [row.target_date, key.split('/').at(-1)].find(value => value && isSkyReaderPreviewDate(value)) ?? undefined;
  if (seasonArticleIdentity(key)) return { areas: ['sky', 'calendar'], label: 'Sky & Calendar · Season article',
    detail: 'Also available in Articles & Guides.', kind: 'article' };
  if (key.startsWith('studio-lunation/')) return { areas: ['calendar'], label: 'Calendar · Lunation writing workspace',
    detail: 'Saved lunar writing in progress.', kind: 'workspace', date };
  if (key.startsWith('authored/sky-lunation-macro/')) return { areas: ['sky', 'calendar'], label: 'Sky & Calendar · Lunation passage',
    detail: 'Shared by matching New Moon or Full Moon readings.', kind: 'passage' };
  if (key.startsWith('calendar-passage/daily/')) {
    if (key.endsWith('/shared')) return { areas: ['calendar'], label: 'Calendar · Daily overview template', detail: 'Shared across dates.', kind: 'source' };
    const params = calendarPassageReviewParams(key);
    return { areas: ['calendar'], label: 'Calendar · Daily overview', kind: 'passage',
      detail: params ? `${params.get('date')} · ${params.get('timeZone')} · This date only.` : 'Date or time zone needs checking.',
      date: params?.get('date') ?? undefined };
  }
  if (/^authored\/calendar-moon-transition\//u.test(key)) return { areas: ['calendar'], label: 'Calendar · Moon transition', detail: 'Shared by the daily overview and Moon event card.', kind: 'source' };
  if (/^(?:authored\/calendar-|calendar\/|cms\/calendar-|slot-template\/calendar\/|fallback-template\/calendar|fallback-hook\/calendar-)/u.test(key)) {
    return { areas: ['calendar'], label: 'Calendar · Shared passage', detail: 'Reusable writing for matching dates.', kind: 'source' };
  }
  if (/^sky-article(?:-revision)?\//u.test(key)) return { areas: ['sky'], label: 'Sky · Dated article',
    detail: key.includes('/day/') ? `For ${date ?? 'the selected date'} (ET) only.`
      : date ? `Visit begins ${date}.` : 'Writing for one placement visit.', kind: 'article', date,
    sourceKey: key.replace(/^sky-article-revision\//u, 'sky-article/') };
  if (/^sky-article-workspace\//u.test(key)) return { areas: ['sky'], label: 'Sky · Article writing workspace',
    detail: date ? `Visit begins ${date}.` : 'Saved article work in progress.', kind: 'workspace', date };
  if (key.startsWith('sky/article-template/')) return { areas: ['sky'], label: 'Sky · Article template', detail: 'Reusable article structure.', kind: 'source' };
  if (key.startsWith('sky/article-edition/')) return { areas: ['sky'], label: 'Sky · Saved article edition', detail: 'Writing for one placement visit.', kind: 'article', date };
  if (/^sky-season-fallback\//u.test(key)) return { areas: ['sky'], label: 'Sky · Placement passage',
    detail: date ? `Visit begins ${date}.` : 'Writing for one placement visit.', kind: 'passage', date, sourceKey: key };
  if (/^(?:sky-placement\/article\/|sky-lilith\/article\/|sky-nodes\/|fallback-hook\/sky-placement-(?:hook|lived|turn)\/moon\/)/u.test(key)) {
    return { areas: ['sky'], label: 'Sky · Shared placement reading', detail: 'Reusable writing when a dated article is unavailable.', kind: 'source', sourceKey: key };
  }
  if (/^(?:sky[./]aspect[./]|sky-card\/|authored\/sky-aspect|fallback-hook\/sky-aspect)/u.test(key)) {
    return { areas: ['sky', 'calendar'], label: 'Sky & Calendar · Aspect passage', detail: 'Shared by matching aspect events.', kind: 'source' };
  }
  if (/^(?:sky[./]|sky\/|sky-placement\/|cms\/sky-|authored\/sky-|fallback-hook\/sky-)/u.test(key)) {
    return { areas: ['sky'], label: 'Sky · Shared writing', detail: 'Reusable source for Sky content.', kind: 'source' };
  }
  return null;
}

export async function contentLibrarySkyEditParams(row: LibraryRow, readerDate: string | null, readerTimeZone?: string) {
  const destination = contentLibraryDestination(row);
  if (!destination?.sourceKey) return null;
  const timeZone = readerTimeZone ?? (await import('../../web/src/services/skySelection')).getInitialLocation().location.timeZone ?? 'UTC';
  const date = destination.date ?? readerDate ?? skyPreviewReferenceDate(new Date().toISOString(), timeZone);
  const href = studioPassageEditHref({ surface: 'sky', date, timeZone, sourceKey: destination.sourceKey });
  if (!href) return null;
  const params = new URLSearchParams(href.split('?')[1]);
  params.set('from', 'library');
  return params;
}

function normalized(value: string) {
  return value.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const sourceDateFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });

function containsWords(value: string, query: string) {
  const words = normalized(value).split(' ');
  return query.split(' ').every(token => words.some(word => word.startsWith(token)));
}

/** Title matches lead; source-key searches must match a continuous path, not unrelated path words. */
export function contentLibrarySearchRank(row: LibraryRow, title: string, query: string): number | null {
  const search = normalized(query);
  if (!search) return 0;
  const headline = normalized(title);
  if (headline === search) return 0;
  if (headline.startsWith(search)) return 1;
  if (containsWords(title, search)) return 2;
  const destination = contentLibraryDestination(row);
  const writtenDate = destination?.date ? sourceDateFormatter.format(new Date(`${destination.date}T12:00:00Z`)) : '';
  if (destination && containsWords(`${title} ${destination.label} ${destination.detail} ${writtenDate}`, search)) return 3;
  if (row.content_key.toLowerCase().includes(query.trim().toLowerCase())) return 4;
  let key = row.content_key;
  try { key = decodeURIComponent(key); } catch { /* Retain an invalid source key for exact lookup. */ }
  return normalized(key).includes(search) ? 4 : null;
}
