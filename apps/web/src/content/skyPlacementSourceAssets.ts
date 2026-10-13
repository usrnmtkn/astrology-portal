import { withRequestDeadline } from "../services/requestDeadline";
import skyV4CanonicalCorpusUrl from "./fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json?url";
import correctionManifest from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1.json";
import correctionChunk1Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-1.json?url";
import correctionChunk2Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-2.json?url";
import correctionChunk3Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-3.json?url";
import correctionChunk4Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-4.json?url";
import lunarManifest from "./fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1.json";
import lunarChunk1Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1-chunk-1.json?url";
import lunarChunk2Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1-chunk-2.json?url";

let pending: Promise<unknown[]> | null = null;
// Content-hashed build assets are immutable. Preserve each completed download
// when another source fails, and share in-flight work across reader retries.
const sources = new Map<string, Promise<unknown>>();

function isTransient(error: unknown) {
  return error instanceof Error && (error instanceof TypeError || error.name === "TimeoutError"
    || typeof error.cause === "number" && (error.cause === 408 || error.cause === 429 || error.cause >= 500));
}

export function loadSkyPlacementSourceAssets() {
  pending ??= loadSources().catch((error) => { pending = null; throw error; });
  return pending;
}

async function loadSources() {
  // Vite resolves `?url` to an on-demand asset URL in the reader build. The
  // Node/esbuild parity harness resolves the same import to the parsed JSON
  // module. Support both representations so verification exercises the same
  // deferred boundary without teaching production to accept a thin fallback.
  async function loadJson(imported: unknown) {
    if (typeof imported === "string") {
      let source = sources.get(imported);
      if (source) return source;
      const attempt = async (signal: AbortSignal) => {
        const response = await withRequestDeadline(requestSignal => fetch(imported, { signal: requestSignal }), { signal });
        if (!response.ok) {
          void response.body?.cancel().catch(() => {});
          throw new Error(`SKY_V4_SOURCE_GAP: reader package returned ${response.status}.`, { cause: response.status });
        }
        const reader = response.body?.getReader();
        if (!reader) return response.json() as Promise<unknown>;
        // Large complete source files can take longer than one API request on
        // a slow connection. Bound inactivity between chunks, and the complete
        // download separately; never accept partial JSON or a thinner passage.
        const decoder = new TextDecoder();
        let json = "";
        try {
          while (true) {
            const { done, value } = await withRequestDeadline(() => reader.read(), { signal });
            if (done) return JSON.parse(json + decoder.decode()) as unknown;
            json += decoder.decode(value, { stream: true });
          }
        } finally {
          void reader.cancel().catch(() => {});
        }
      };
      source = withRequestDeadline(async signal => {
        try {
          return await attempt(signal);
        } catch (error) {
          // A single stalled connection must not strand a cold reader at Retry.
          // Both attempts share the original total budget; invalid JSON and
          // permanent HTTP failures still fail closed without another request.
          if (signal.aborted || !isTransient(error)) throw error;
          await new Promise(resolve => setTimeout(resolve, 250));
          signal.throwIfAborted();
          return attempt(signal);
        }
      }, { timeoutMs: 30_000 }).catch(error => { sources.delete(imported); throw error; });
      sources.set(imported, source);
      return source;
    }
    return (imported as { default?: unknown })?.default ?? imported;
  }
  return Promise.all([
    loadJson(skyV4CanonicalCorpusUrl),
    // These small manifests were already embedded by Vite as base64 URLs.
    // Embed their identical parsed values instead of encoding and fetching them.
    loadJson(correctionManifest),
    ...[correctionChunk1Url, correctionChunk2Url, correctionChunk3Url, correctionChunk4Url].map(loadJson),
    loadJson(lunarManifest),
    loadJson(lunarChunk1Url),
    loadJson(lunarChunk2Url)
  ]);
}
