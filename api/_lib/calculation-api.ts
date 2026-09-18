const DEFAULT_CALCULATION_API_URL = "https://tldrastro-api-27165565299.us-central1.run.app";

/** One place for the calculation service host every server path calls. */
export function calculationApiBaseUrl(explicit?: string) {
  const configured = explicit
    || process.env.TLDRASTRO_API_URL
    || process.env.VITE_TLDRASTRO_API_URL
    || DEFAULT_CALCULATION_API_URL;

  return configured.replace(/\/$/u, "");
}

/**
 * A failed calculation request is only useful if it says what came back. An
 * unreachable or redeployed service answers with HTML or nothing at all, which
 * leaves no JSON payload to report, so the response's own words are used
 * instead of stringifying an absent payload.
 */
export function calculationApiFailureDetail(body: string, payload?: unknown) {
  if (payload !== null && payload !== undefined) return JSON.stringify(payload);

  const text = body.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
  if (!text) return "an empty response body";

  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}

export function describeCalculationApiFailure(failure: {
  target: string;
  status: number;
  statusText?: string;
  body: string;
  payload?: unknown;
}) {
  const status = failure.statusText?.trim()
    ? `${failure.status} ${failure.statusText.trim()}`
    : String(failure.status);

  return `${status} from ${failure.target}: ${calculationApiFailureDetail(failure.body, failure.payload)}`;
}

/** Reads a response once so both the parsed payload and its words stay available. */
export async function readCalculationApiResponse(response: Response) {
  const body = await response.text();
  let payload: unknown = null;

  if (body.trim()) {
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      payload = null;
    }
  }

  return { body, payload };
}
