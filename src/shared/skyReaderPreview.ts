import type { CompiledSkyArticleEdition } from '../../apps/web/src/content/skyArticleTemplateCompiler';
import type { LocationInput } from './types';

export const skyReaderPreviewPath = '/studio/sky-reader-preview';
export const skyReaderPreviewProtocol = 'studio-sky-reader-preview/v1';
export type SkyReaderPreviewRequest = {
  protocol: typeof skyReaderPreviewProtocol;
  channel: string;
  type: 'render';
  requestId: number;
  planet: string;
  sign: string;
  date: string;
  location: LocationInput;
  mode: 'published' | 'draft';
  theme: 'light' | 'dark';
  draft: { edition: CompiledSkyArticleEdition; baseCompiledHash: string; baseVersion?: string; requiresPublishedBase?: boolean } | null;
};
export type SkyReaderPreviewSource = {
  title: string;
  keys: string[];
  versions: string[];
  role: 'Dated article' | 'Shared fallback';
  status: 'Published' | 'Bundled fallback' | 'Draft simulation';
  validFrom: string;
  validTo: string;
};
export type SkyReaderPreviewResult = {
  instant: string;
  timeZone: string;
  placement: { planet: string; sign: string; signKey: string };
  published: SkyReaderPreviewSource;
  displayed: SkyReaderPreviewSource;
  draftSelected: boolean;
  draftError: string | null;
};

export function isSkyReaderPreviewDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value)
    && Number.isFinite(Date.parse(`${value}T12:00:00Z`))
    && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

export function skyPreviewReferenceDate(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}

export function isTrustedSkyPreviewParent(parentOrigin: string, readerOrigin: string, configuredStudioOrigin?: string) {
  try {
    const parent = new URL(parentOrigin), reader = new URL(readerOrigin);
    if (!['http:', 'https:'].includes(parent.protocol) || parent.origin !== parentOrigin) return false;
    if (parent.origin === reader.origin || configuredStudioOrigin && parent.origin === new URL(configuredStudioOrigin).origin) return true;
    return ['localhost', '127.0.0.1'].includes(reader.hostname) && parent.hostname === reader.hostname && parent.protocol === reader.protocol
      && (reader.port === '5173' && parent.port === '5174' || reader.port === '4173' && parent.port === '4174');
  } catch { return false; }
}

export function skyReaderPreviewFrameUrl(origin: string, channel: string) {
  const url = new URL(skyReaderPreviewPath, skyReaderOrigin(origin));
  url.searchParams.set('parentOrigin', origin);
  url.searchParams.set('channel', channel);
  return url.href;
}

export function skyReaderOrigin(origin: string) {
  const parent = new URL(origin);
  // Match the existing standalone Studio/main-reader development pair.
  const reader = new URL(import.meta.env?.VITE_STUDIO_READER_ORIGIN || parent.origin);
  if (!import.meta.env?.VITE_STUDIO_READER_ORIGIN && ['localhost', '127.0.0.1'].includes(reader.hostname) && reader.port === '5174') reader.port = '5173';
  return reader.origin;
}

export function skyReaderDateHref(origin: string, planet: string, sign: string, date: string, csv = false) {
  if (!isSkyReaderPreviewDate(date)) throw new Error('Choose a valid reader date.');
  const reader = skyReaderOrigin(origin);
  return `${reader === origin ? '' : reader}/?date=${date}${csv ? '&studioExport=sky-article-csv' : ''}#/sky/placement/${planet}/${sign}`;
}
