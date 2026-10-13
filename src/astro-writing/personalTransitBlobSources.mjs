import { createHash } from 'node:crypto';
import { PersonalTransitInputError, parsePersonalTransitSources, readPersonalTransitSources } from './personalTransitWriterContext.mjs';

const maxBytes = 2 * 1024 * 1024;
const failure = () => new PersonalTransitInputError(409, 'Personal Transit writing sources failed verification. No generation was started.');

export function parsePersonalTransitBlobReference(value) {
  if (!value?.startsWith('blob:')) return null;
  const reference = JSON.parse(value.slice(5));
  if (reference.schema !== 'personal-transit-private-blob/v1'
    || !/^store_[A-Za-z0-9]+$/u.test(reference.storeId)
    || !/^[a-f0-9]{64}$/u.test(reference.sha256)
    || reference.pathname !== `personal-transit/${reference.sha256}.json`) throw failure();
  return reference;
}

// The authenticated handler loads an immutable, hash-pinned private snapshot.
// No private document is bundled with the app or fetched by a browser.
export function createPersonalTransitSourceReader(getBlob = async (...args) => (await import('@vercel/blob')).get(...args), timeoutMs = 10_000) {
  let cachedKey, cached;
  return async function readSources() {
    const value = process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES;
    if (!value?.startsWith('blob:')) return readPersonalTransitSources();
    try {
      const reference = parsePersonalTransitBlobReference(value);
      if (cachedKey !== value || !cached) {
        cachedKey = value;
        const pending = (async () => {
          const controller = new AbortController();
          let timer;
          try {
            const download = async () => {
              const result = await getBlob(reference.pathname, { access: 'private', storeId: reference.storeId, abortSignal: controller.signal });
              if (result?.statusCode !== 200 || !result.stream || result.blob?.size > maxBytes) throw failure();
              const reader = result.stream.getReader(), chunks = [];
              let bytes = 0;
              try {
                for (;;) {
                  const { done, value: chunk } = await reader.read();
                  if (done) break;
                  bytes += chunk.byteLength;
                  if (bytes > maxBytes) throw failure();
                  chunks.push(Buffer.from(chunk));
                }
              } finally { await reader.cancel().catch(() => {}); }
              const body = Buffer.concat(chunks);
              if (createHash('sha256').update(body).digest('hex') !== reference.sha256) throw failure();
              return parsePersonalTransitSources(body.toString('utf8'));
            };
            return await Promise.race([download(), new Promise((_, reject) => {
              timer = setTimeout(() => { controller.abort(); reject(failure()); }, timeoutMs);
            })]);
          } finally { clearTimeout(timer); }
        })();
        cached = pending;
        pending.catch(() => { if (cached === pending) cached = undefined; });
      }
      return structuredClone(await cached);
    } catch { throw failure(); }
  };
}

export const readPersonalTransitSourcesForRequest = createPersonalTransitSourceReader();
