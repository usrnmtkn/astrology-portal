import type sourceShape from "./skyMoonSummarySources.json";
export type SkyMoonSummarySources = typeof sourceShape;

// Provenance is data, not executable code. Fetch it only when the summary
// workspace or a Moon editor requests it; failed requests remain retryable.
let pendingSources: Promise<SkyMoonSummarySources> | undefined;
export function loadSkyMoonSummarySources(): Promise<SkyMoonSummarySources> {
  if (!pendingSources) {
    pendingSources = fetch(new URL("./skyMoonSummarySources.json", import.meta.url)).then(async response => {
      if (!response.ok) throw new Error("Moon source details could not load. Please retry.");
      const sources = await response.json() as SkyMoonSummarySources;
      if (!Array.isArray(sources.rows)) throw new Error("Moon source details are invalid. Please retry.");
      return sources;
    }).catch(error => { pendingSources = undefined; throw error; });
  }
  return pendingSources;
}
