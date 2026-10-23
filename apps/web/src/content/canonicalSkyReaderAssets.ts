import readerUrl from './fallbackArchitectureV3/canonical-sky-reader-transport-v1.json?url';
import { withRequestDeadline } from '../services/requestDeadline';

type ReaderAssets = { schema: string; corpus: Record<string, any>; lunarSource: Record<string, any> };
let pending: Promise<ReaderAssets> | null = null;

/** One immutable, complete reader payload; failures never establish readiness. */
export function loadCanonicalSkyReaderAssets(): Promise<ReaderAssets> {
  pending ??= withRequestDeadline(async signal => {
    let value: unknown;
    // SSR and Node verification use the identical parsed source without a URL fetch.
    if (typeof readerUrl !== 'string') value = readerUrl;
    else if (import.meta.env.SSR) value = (await import('./fallbackArchitectureV3/canonical-sky-reader-transport-v1.json')).default;
    else {
      for (let attempt = 0; ; attempt++) {
        try {
          const response = await withRequestDeadline(requestSignal => fetch(readerUrl, { signal: requestSignal }), { signal });
          if (!response.ok) {
            void response.body?.cancel().catch(() => {});
            throw Object.assign(new Error('Canonical reader source request failed.'), { cause: response.status });
          }
          value = await response.json();
          break;
        } catch (error) {
          if (attempt || signal.aborted || !(error instanceof TypeError || error instanceof Error
            && (error.name === 'TimeoutError' || typeof error.cause === 'number'
              && (error.cause === 408 || error.cause === 429 || error.cause >= 500)))) throw error;
        }
      }
    }
    const assets = value as ReaderAssets;
    if (assets?.schema !== 'tldr-canonical-sky-reader-transport/v1' || !assets.corpus?.content || !assets.lunarSource?.records) {
      throw new Error('SKY_V4_SOURCE_GAP: complete canonical reader sources unavailable.');
    }
    return assets;
  }, { timeoutMs: 30_000 }).catch(error => { pending = null; throw error; });
  return pending;
}
