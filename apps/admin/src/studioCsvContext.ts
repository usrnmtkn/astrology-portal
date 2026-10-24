import { articleReaderHref } from '../../../src/shared/articleLibrary';
import type { LiveStatus } from './ContentLiveStatus';
import type { CsvContentRow, CsvRecord } from './studioCsv';
import { placementSourcesReaderHref, placementSourcesReferenceDate } from './skyPlacementSourceSelection';
import { skySeasonFallbackIdentity } from '../../web/src/content/skySeasonFallback';

const object = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};

export function csvSourceContext(row: CsvContentRow, status: LiveStatus, origin: string, instant: string): CsvRecord {
  const key = row.content_key;
  const edition = object(object(row.sections).skyArticleEdition);
  const visit = object(object(row.sections).seasonFallback);
  const placement = /^(?:sky-article(?:-revision)?|sky-placement\/article|sky-article-workspace)\/([^/]+)\/([^/]+)/u.exec(key);
  const special = /^sky-(lilith\/article|nodes\/([^/]+))\/([^/]+)/u.exec(key);
  const moon = /^fallback-hook\/sky-placement-(?:hook|lived|turn)\/moon\/([^/]+)/u.exec(key);
  const seasonal = skySeasonFallbackIdentity(key);
  const planet = placement?.[1] ?? (special?.[1] === 'lilith/article' ? 'lilith' : special?.[2]) ?? seasonal?.planet ?? (moon ? 'moon' : '');
  const sign = placement?.[2] ?? special?.[3] ?? seasonal?.sign ?? moon?.[1] ?? '';
  const role = key.startsWith('sky-article-revision/') || object(row.sections).packageDraft ? 'Pending revision'
    : /^(?:sky-article|sky-season-fallback)\//u.test(key) ? 'Dated article'
      : key.startsWith('sky-article-workspace/') ? 'Writing workspace'
        : /^sky\/article-template\//u.test(key) ? 'Reusable template'
          : planet && sign ? 'Shared fallback' : 'Editable source';
  let href = planet && sign ? placementSourcesReaderHref(planet, sign, instant) : '';
  if (status.live && /^(?:article\/(?:manual|guide)|cms\/(?:article|guide))\//u.test(key)) href = articleReaderHref(key);
  const facts = object(row.facts);
  if (status.live && key.startsWith('education/astro-101/') && typeof facts.slug === 'string' && facts.slug.startsWith('/learn/')) href = facts.slug;
  return {
    source_role: role,
    saved_status: row.status,
    publication_status: status.live ? 'Live' : row.status === 'LIVE' ? 'Inactive' : row.status,
    publication_detail: status.detail,
    target_date: row.target_date ?? '',
    valid_from: typeof edition.validFrom === 'string' ? edition.validFrom : typeof visit.seasonStart === 'string' ? visit.seasonStart : '',
    valid_to: typeof edition.validTo === 'string' ? edition.validTo : typeof visit.seasonEnd === 'string' ? visit.seasonEnd : '',
    validity_note: edition.validFrom || visit.seasonStart ? 'Start inclusive; end exclusive.' : 'No dated article window is assigned to this source.',
    reference_date: placementSourcesReferenceDate(instant),
    reader_url: href ? new URL(href, origin).href : '',
    reader_link_detail: planet && sign ? 'Shows the selected published Sky article; dated articles can replace shared fallback writing.' : href ? 'Opens the published article.' : 'An exact reader link requires published copy and its chart, person, or event context.',
    exported_at: instant,
  };
}
