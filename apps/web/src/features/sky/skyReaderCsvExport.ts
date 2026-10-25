import { downloadCsv } from '../../../../../src/shared/csvDownload';
import { quoteCsvCell } from '../../../../../src/shared/csvText';
import type { SkyDetail } from './SkyDetailArticle';

export const skyReaderCsvRequest = 'sky-article-csv';

/** Export the resolved public article after the reader has rendered it. */
export function skyReaderCsvRecord(article: HTMLElement, detail: SkyDetail, href: string) {
  const source = detail.readerExport;
  if (!source || detail.placementFactsPending) throw new Error('Wait for the complete Sky article to load.');
  const body = [...article.querySelectorAll<HTMLElement>('.sky-detail-body h2, .sky-detail-body h3, .sky-detail-body p, .sky-detail-body li, .sky-detail-body dt, .sky-detail-body dd')]
    .filter(node => !node.closest('#sky-personalized-placement, button, details') && !node.parentElement?.closest('li'))
    .map(node => node.innerText.trim()).filter(Boolean).join('\n\n');
  if (!body) throw new Error('The complete Sky article could not be exported.');
  const url = new URL(href);
  url.searchParams.delete('studioExport');
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: source.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(source.instant));
  const referenceDate = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
  url.searchParams.set('date', referenceDate);
  const aspectDetails = [...article.querySelectorAll<HTMLElement>('.article-related-aspects-card')].map(group => {
    const heading = article.ownerDocument.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent?.trim();
    const passages = [...group.querySelectorAll<HTMLElement>('.article-related-aspects__copy')].map(passage => {
      const text = [...passage.querySelectorAll<HTMLElement>('h4, p, li, dt, dd')]
        .filter(node => !node.parentElement?.closest('li'))
        .map(node => node.textContent?.trim()).filter(Boolean);
      const links = [...passage.querySelectorAll<HTMLAnchorElement>('a[href]')].map(link => new URL(link.getAttribute('href')!, url.href).href);
      return [...text, ...links].join('\n\n');
    });
    const rows = [...group.querySelectorAll<HTMLElement>('.aspect-row')].map(row => row.innerText.trim());
    return [heading, ...passages, ...rows].filter(Boolean).join('\n\n');
  }).join('\n\n');
  const edition = source.rows.map(row => (row.sections as { skyArticleEdition?: { validFrom?: string; validTo?: string } } | undefined)?.skyArticleEdition).find(Boolean);
  const visit = source.rows.map(row => (row.sections as { seasonFallback?: { seasonStart?: string; seasonEnd?: string } } | undefined)?.seasonFallback).find(Boolean);
  return {
    format: 'content-studio-reader-csv/v1',
    export_scope: 'Public Sky article; personalized chart sections are separate',
    source_role: source.keys.some(key => key.startsWith('sky-article/')) ? 'Active dated article'
      : source.keys.some(key => key.startsWith('sky-season-fallback/')) ? 'Active dated article' : 'Shared fallback',
    publication_status: source.rows.some(row => row.status === 'LIVE') ? 'Live' : 'Bundled fallback',
    publication_detail: source.rows.some(row => row.status === 'LIVE') ? 'Resolved from the published reader sources.' : 'Resolved from bundled fallback writing; no saved Studio publication row supplied this article.',
    source_keys: source.keys.filter(key => key !== 'compiled-sky-article-edition-v2').join('\n'),
    saved_versions: source.rows.map(row => `${row.contentKey}: ${row.updatedAt ?? ''}`).join('\n'),
    reference_instant: source.instant,
    reference_date: referenceDate,
    time_zone: source.timeZone,
    valid_from: edition?.validFrom ?? visit?.seasonStart ?? '',
    valid_to: edition?.validTo ?? visit?.seasonEnd ?? '',
    validity_note: edition || visit ? 'Start inclusive; end exclusive.' : 'Dates below describe the displayed placement context.',
    displayed_dates: [...article.querySelectorAll<HTMLElement>('.article-id .article-duration')].map(node => node.innerText.trim()).join('\n'),
    reader_url: url.href,
    exported_at: new Date().toISOString(),
    title: detail.title,
    summary: article.querySelector<HTMLElement>('.article-tldr__copy')?.innerText.trim() ?? '',
    body,
    aspect_details: aspectDetails,
  };
}

export function exportRequestedSkyReaderCsv(article: HTMLElement, detail: SkyDetail) {
  const url = new URL(window.location.href);
  if (url.searchParams.get('studioExport') !== skyReaderCsvRequest) return false;
  const record = skyReaderCsvRecord(article, detail, url.href);
  const columns = Object.keys(record) as Array<keyof typeof record>;
  const csv = '\uFEFF' + [columns, columns.map(key => record[key])].map(row => row.map(quoteCsvCell).join(',')).join('\r\n') + '\r\n';
  downloadCsv(csv, `content-studio-reader-${detail.routePath?.replaceAll('/', '-')}-${record.reference_date}.csv`);
  url.searchParams.delete('studioExport');
  window.history.replaceState(window.history.state, '', url.href);
  return true;
}
