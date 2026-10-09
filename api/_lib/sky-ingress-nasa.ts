import { createHash } from "node:crypto";

const commands: Record<string, string> = {
  sun: "10", moon: "301", mercury: "199", venus: "299", mars: "499", jupiter: "599",
  saturn: "699", uranus: "799", neptune: "899", pluto: "999", chiron: "2060;"
};

/** Curated NASA explanatory sources; factual context only, never voice or
 * dated-event evidence. Read complete relevant paragraphs, with provenance. */
export async function skyIngressNasaExplanation(planet: string) {
  const source = planet === "sun" ? {
    url: "https://science.nasa.gov/solar-system/skywatching/night-sky-network/embracing-the-equinox/",
    title: "Embracing the Equinox", match: /equatorial plane|length of day and night/iu
  } : ["mars", "saturn"].includes(planet) ? {
    url: "https://science.nasa.gov/image-article/apod-2016-september-15-retrograde-mars-and-saturn/",
    title: "Retrograde Mars and Saturn", match: /apparent backwards|orbital motion of Earth/iu
  } : null;
  if (!source) return { status: "not-retrieved", reason: "No relevant curated NASA explanation for this body." };
  try {
    const response = await fetch(source.url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`NASA Science HTTP ${response.status}`);
    const html = await response.text();
    if (html.length > 2_000_000) throw new Error("NASA source exceeds the retrieval bound");
    const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/giu)]
      .map(match => match[1].replace(/<[^>]*>/gu, " ").replace(/&nbsp;|&#160;/gu, " ")
        .replace(/&#8217;|&rsquo;/gu, "’").replace(/&#8211;|&ndash;/gu, "–")
        .replace(/&#8212;|&mdash;/gu, "—").replace(/&amp;/gu, "&").replace(/\s+/gu, " ").trim())
      .filter(text => source.match.test(text));
    let words = 0;
    const selected = paragraphs.filter(text => {
      const count = text.split(/\s+/u).length;
      if (words + count > 200) return false;
      words += count; return true;
    });
    if (!selected.length) throw new Error("NASA source has no complete matching explanatory paragraph");
    return { status: "retrieved", role: "astronomy-explanation-only", sourceUrl: source.url, title: source.title,
      retrievedAt: new Date().toISOString(), responseSha256: createHash("sha256").update(html).digest("hex"),
      textSha256: createHash("sha256").update(selected.join("\n\n")).digest("hex"), paragraphs: selected };
  } catch (error) {
    return { status: "unavailable", sourceUrl: source.url, retrievedAt: new Date().toISOString(),
      reason: error instanceof Error ? error.message : "NASA explanation retrieval failed" };
  }
}

/** One independent position comparison, never a certification of event times. */
export async function skyIngressNasaReceipt(planet: string, instant: string, swissLongitude?: number) {
  const command = commands[planet];
  const scope = "One geocentric apparent ecliptic longitude at the reference instant; no ingress, aspect-root or historical recurrence verification.";
  if (!command || !Number.isFinite(swissLongitude)) return { status: "unsupported", scope };
  const params = new URLSearchParams({ format: "json", COMMAND: `'${command}'`, OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'", EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'",
    TLIST: String(Date.parse(instant) / 86400000 + 2440587.5), TLIST_TYPE: "'JD'", TIME_TYPE: "'UT'",
    QUANTITIES: "'31'", CSV_FORMAT: "'YES'", ANG_FORMAT: "'DEG'", EXTRA_PREC: "'YES'" });
  const requestUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?${params}`;
  try {
    const response = await fetch(requestUrl, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`Horizons HTTP ${response.status}`);
    const payload = await response.json() as { result?: string; signature?: unknown };
    const row = payload.result?.match(/\$\$SOE\s*([^\n]+)\s*\$\$EOE/u)?.[1];
    const columns = row?.split(",").map(value => value.trim()).filter(Boolean);
    const longitude = Number(columns?.at(-2));
    if (!row || !Number.isFinite(longitude) || longitude < 0 || longitude >= 360) throw new Error("Horizons returned no valid longitude");
    const difference = Math.abs(longitude - (swissLongitude as number)) % 360;
    const differenceArcseconds = Math.min(difference, 360 - difference) * 3600;
    return { status: differenceArcseconds <= 30 ? "matched" : "disagreement", scope, planet, instant,
      requestUrl, retrievedAt: new Date().toISOString(), signature: payload.signature,
      responseSha256: createHash("sha256").update(payload.result ?? "").digest("hex"),
      longitude, swissLongitude, differenceArcseconds, toleranceArcseconds: 30 };
  } catch (error) {
    return { status: "unavailable", scope, requestUrl, retrievedAt: new Date().toISOString(),
      reason: error instanceof Error ? error.message : "Horizons request failed" };
  }
}
