import { withRequestDeadline } from "../services/requestDeadline";
import skyV4CanonicalCorpusUrl from "./fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json?url";
import correctionManifestUrl from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1.json?url";
import correctionChunk1Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-1.json?url";
import correctionChunk2Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-2.json?url";
import correctionChunk3Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-3.json?url";
import correctionChunk4Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-4.json?url";
import lunarManifestUrl from "./fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1.json?url";
import lunarChunk1Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1-chunk-1.json?url";
import lunarChunk2Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1-chunk-2.json?url";

let pending: Promise<unknown[]> | null = null;

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
      return withRequestDeadline(async signal => {
        const response = await withRequestDeadline(requestSignal => fetch(imported, { signal: requestSignal }), { signal });
        if (!response.ok) throw new Error(`SKY_V4_SOURCE_GAP: reader package returned ${response.status}.`);
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
      }, { timeoutMs: 30_000 });
    }
    return (imported as { default?: unknown })?.default ?? imported;
  }
  return Promise.all([
    loadJson(skyV4CanonicalCorpusUrl),
    loadJson(correctionManifestUrl),
    ...[correctionChunk1Url, correctionChunk2Url, correctionChunk3Url, correctionChunk4Url].map(loadJson),
    loadJson(lunarManifestUrl),
    loadJson(lunarChunk1Url),
    loadJson(lunarChunk2Url)
  ]);
}
