import { isSkyReaderPreviewDate, skyPreviewReferenceDate } from './skyReaderPreview';

export type StudioPassageEdit = {
  surface: 'calendar' | 'sky'; date: string; timeZone: string; sourceKey: string; instant?: string;
};

export function skyPassageEditSource(keys: string[]) {
  return keys.find(key => /^sky-article\//u.test(key))
    ?? keys.find(key => /^(?:sky-season-fallback\/|sky-placement\/article\/|sky-lilith\/article\/|sky-nodes\/|fallback-hook\/sky-placement-(?:hook|lived|turn)\/moon\/)/u.test(key));
}

export function skyPassageEditPlacement(key: string) {
  const parts = key.split('/');
  return parts[0] === 'sky-article' ? { planet: parts[1], sign: parts[2] }
    : parts[0] === 'sky-season-fallback' ? { planet: parts[2], sign: parts[3] }
    : parts[0] === 'sky-lilith' ? { planet: 'lilith', sign: parts[2] }
    : parts[0] === 'sky-nodes' ? { planet: parts[1], sign: parts[2] }
    : { planet: parts[2], sign: parts[3] };
}

export function parseStudioPassageEdit(hash: string): StudioPassageEdit | null {
  const [route, query] = hash.replace(/^#/u, '').split('?');
  const params = new URLSearchParams(query);
  const surface = route === 'calendar-writeups' ? 'calendar' : route === 'sky-writeups' ? 'sky' : null;
  const date = params.get('date') ?? '', timeZone = params.get('timeZone') ?? '', sourceKey = params.get('editSource') ?? '';
  if (!surface || !isSkyReaderPreviewDate(date) || !timeZone || timeZone.length > 100 || sourceKey.length > 400) return null;
  try { new Intl.DateTimeFormat('en', { timeZone }).format(0); } catch { return null; }
  if (surface === 'calendar' ? sourceKey !== `calendar-passage/daily/${date}/${encodeURIComponent(timeZone)}`
    && !/^authored\/calendar-moon-transition\/[a-z]+\/[a-z]+$/u.test(sourceKey)
    : skyPassageEditSource([sourceKey]) !== sourceKey || !/^[a-z0-9/_-]+$/u.test(sourceKey)) return null;
  if (surface === 'sky' && (!skyPassageEditPlacement(sourceKey).planet || !skyPassageEditPlacement(sourceKey).sign)) return null;
  const instant = params.get('instant');
  if (instant && (!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/u.test(instant) || !Number.isFinite(Date.parse(instant))
    || skyPreviewReferenceDate(instant, timeZone) !== date)) return null;
  return { surface, date, timeZone, sourceKey, ...(instant ? { instant } : {}) };
}

export function studioPassageEditHref(context: StudioPassageEdit) {
  const params = new URLSearchParams({ view: context.surface === 'calendar' ? 'daily-sky' : 'catalog',
    date: context.date, timeZone: context.timeZone, editSource: context.sourceKey });
  if (context.surface === 'sky') {
    const placement = skyPassageEditPlacement(context.sourceKey);
    params.set('planet', placement.planet); params.set('sign', placement.sign);
  }
  if (context.instant) params.set('instant', context.instant);
  const hash = `#${context.surface}-writeups?${params}`;
  return parseStudioPassageEdit(hash) ? `/admin/content${hash}` : null;
}
