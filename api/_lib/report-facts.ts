import {
  createReportEnvelope,
  fetchReportEnvelope,
  type ReportEnvelopeStore,
  type UserReportRow
} from "./report-envelope.js";
import {
  REPORT_DOMAINS,
  REPORT_HORIZONS,
  type ReportDomain,
  type ReportHorizon
} from "./report-types.js";

const DEFAULT_TLDRASTRO_API_URL = "https://tldrastro-api-27165565299.us-central1.run.app";

type JsonObject = Record<string, unknown>;

export type ReportChartSubject = {
  name?: string | null;
  datetime: {
    date: string;
    time?: string | null;
    timeKnown: boolean;
    timeZone?: string | null;
    utc?: string | null;
  };
  location: {
    label: string;
    latitude: number;
    longitude: number;
    timeZone?: string | null;
  };
  settings?: {
    houseSystem?: "whole_sign";
    zodiac?: "tropical";
    aspectProfile?: "standard" | "tight";
  };
};

export type ReportNatalPointLongitudes = Partial<Record<"Ascendant" | "Midheaven", number>>;

export type ComposeReportFactsInput = {
  userId: string;
  subjectId?: string | null;
  natalSubject: ReportChartSubject;
  location: ReportChartSubject["location"];
  reportDomain: ReportDomain;
  reportHorizon: ReportHorizon;
  start: string;
  end: string;
  natalPointLongitudes?: ReportNatalPointLongitudes;
  regenerate?: boolean;
};

type ReportFactsIdentityInput = Pick<
  ComposeReportFactsInput,
  "userId" | "subjectId" | "reportDomain" | "reportHorizon" | "start"
>;

export type ReportFactsAstroClient = {
  preflight(): Promise<void>;
  serviceVersion(): Promise<string>;
  reportWindow(input: Omit<ComposeReportFactsInput, "userId" | "subjectId" | "regenerate">): Promise<JsonObject>;
};

export function normalizeReportFactDates(value: JsonObject, timeZone = "UTC"): JsonObject {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  });
  const visit = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(visit);
    if (!input || typeof input !== "object") return input;
    const output: JsonObject = {};
    for (const [key, child] of Object.entries(input as JsonObject)) {
      output[key] = visit(child);
      if ((/(?:At|Moment)$/u.test(key) || key === "startsAt" || key === "endsAt") && typeof child === "string") {
        const timestamp = Date.parse(child);
        if (Number.isFinite(timestamp)) {
          const parts = formatter.formatToParts(new Date(timestamp));
          const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
          output[`${key}Date`] = `${part("year")}-${part("month")}-${part("day")}`;
        }
      }
    }
    return output;
  };
  return visit(value) as JsonObject;
}

export type ReportFactsDependencies = {
  envelopeStore: ReportEnvelopeStore;
  astroClient: ReportFactsAstroClient;
};

export class ReportFactsInputError extends Error {
  readonly statusCode = 400;
  readonly code = "report_facts_input";

  constructor(message: string) {
    super(message);
    this.name = "ReportFactsInputError";
  }
}

function periodDate(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new ReportFactsInputError("Report start and end must be ISO dates or timestamps.");
  }
  return new Date(timestamp).toISOString().slice(0, 10);
}

function identity(input: ReportFactsIdentityInput) {
  return {
    userId: input.userId,
    reportType: "report" as const,
    reportDomain: input.reportDomain,
    reportHorizon: input.reportHorizon,
    subjectId: input.subjectId || null,
    periodStart: periodDate(input.start)
  };
}

function validateInput(input: ComposeReportFactsInput) {
  if (!input.userId || !input.natalSubject || !input.location || !input.reportDomain || !input.reportHorizon) {
    throw new ReportFactsInputError("natalSubject, location, reportDomain, reportHorizon, start, and end are required.");
  }
  if (!REPORT_DOMAINS.includes(input.reportDomain)) {
    throw new ReportFactsInputError("reportDomain must be general, work_money, love_connection, or personal_health.");
  }
  if (!REPORT_HORIZONS.includes(input.reportHorizon)) {
    throw new ReportFactsInputError("reportHorizon is not supported.");
  }
  if (Date.parse(input.end) <= Date.parse(input.start)) {
    throw new ReportFactsInputError("Report end must be after report start.");
  }
}

export async function composeReportFacts(
  input: ComposeReportFactsInput,
  dependencies: ReportFactsDependencies
): Promise<UserReportRow> {
  validateInput(input);
  const reportIdentity = identity(input);
  const existing = await fetchReportEnvelope(dependencies.envelopeStore, reportIdentity);
  if (existing && !input.regenerate) return existing;

  const periodEnd = periodDate(input.end);
  if (!input.regenerate) {
    const reusable = await dependencies.envelopeStore.findReusableFacts({
      userId: input.userId,
      subjectId: input.subjectId || null,
      reportHorizon: input.reportHorizon,
      periodStart: reportIdentity.periodStart,
      periodEnd
    });
    if (reusable) {
      return createReportEnvelope(dependencies.envelopeStore, {
        ...reportIdentity,
        periodEnd,
        facts: reusable.facts,
        factsEngine: reusable.facts_engine,
        status: "draft"
      });
    }
  }

  const [version, facts] = await Promise.all([
    dependencies.astroClient.serviceVersion(),
    dependencies.astroClient.reportWindow({
      natalSubject: input.natalSubject,
      location: input.location,
      reportHorizon: input.reportHorizon,
      start: input.start,
      end: input.end,
      natalPointLongitudes: input.natalPointLongitudes
    })
  ]);
  if (facts.reportHorizon !== input.reportHorizon) {
    throw new Error("TLDR Astro report-window response did not match the requested horizon.");
  }
  const factsEngine = `tldrastro-api@${version}`;
  return createReportEnvelope(dependencies.envelopeStore, {
    ...reportIdentity,
    periodEnd,
    facts,
    factsEngine,
    status: "draft"
  }, { regenerate: input.regenerate });
}

export function readReportFacts(
  input: ReportFactsIdentityInput,
  envelopeStore: ReportEnvelopeStore
) {
  return fetchReportEnvelope(envelopeStore, identity(input));
}

type FetchLike = typeof fetch;

const REQUIRED_REPORT_CALCULATION_FEATURES = [
  { id: "timing.report_window", path: "/timing/report-window", method: "POST" },
  { id: "timing.solar_return", path: "/timing/solar-return", method: "POST" }
] as const;

export class ReportCalculationApiPreflightError extends Error {
  readonly code = "CALCULATION_API_PREFLIGHT_FAILED";

  constructor(message: string) {
    super(`CALCULATION_API_PREFLIGHT_FAILED: ${message}`);
    this.name = "ReportCalculationApiPreflightError";
  }
}

export class ReportCalculationApiClientError extends Error {
  readonly code = "CALCULATION_API_CLIENT_ERROR";
  readonly statusCode: number;

  constructor(statusCode: number, payload: unknown) {
    super(`CALCULATION_API_CLIENT_ERROR: TLDR Astro API request failed with ${statusCode}: ${JSON.stringify(payload)}`);
    this.name = "ReportCalculationApiClientError";
    this.statusCode = statusCode;
  }
}

export function createTldrAstroReportFactsClient({
  baseUrl = process.env.TLDRASTRO_API_URL || process.env.VITE_TLDRASTRO_API_URL || DEFAULT_TLDRASTRO_API_URL,
  fetchImpl = fetch,
  preflightTimeoutMs = 5_000
}: {
  baseUrl?: string;
  fetchImpl?: FetchLike;
  preflightTimeoutMs?: number;
} = {}): ReportFactsAstroClient {
  const normalizedBaseUrl = baseUrl.replace(/\/$/u, "");

  async function preflightFetch(path: string, method: "GET" | "POST") {
    try {
      return await fetchImpl(`${normalizedBaseUrl}${path}`, {
        method,
        headers: method === "POST" ? { "content-type": "application/json" } : undefined,
        body: method === "POST" ? "{}" : undefined,
        signal: AbortSignal.timeout(preflightTimeoutMs)
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown network error";
      throw new ReportCalculationApiPreflightError(`${method} ${path} did not respond within ${preflightTimeoutMs}ms (${detail}).`);
    }
  }

  async function request<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetchImpl(`${normalizedBaseUrl}${path}`, body === undefined ? undefined : {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        throw new ReportCalculationApiClientError(response.status, payload);
      }
      throw new Error(`TLDR Astro API request failed with ${response.status}: ${JSON.stringify(payload)}`);
    }
    return payload as T;
  }

  return {
    async preflight() {
      const statusResponse = await preflightFetch("/meta/status", "GET");
      if (!statusResponse.ok) {
        throw new ReportCalculationApiPreflightError(`GET /meta/status returned ${statusResponse.status}.`);
      }
      const status = await statusResponse.json().catch(() => null) as { features?: unknown } | null;
      const features = Array.isArray(status?.features) ? status.features : [];
      for (const required of REQUIRED_REPORT_CALCULATION_FEATURES) {
        const advertised = features.some((feature) => {
          if (!feature || typeof feature !== "object") return false;
          const entry = feature as Record<string, unknown>;
          return entry.id === required.id && entry.path === required.path && entry.method === required.method;
        });
        if (!advertised) {
          throw new ReportCalculationApiPreflightError(`GET /meta/status is missing ${required.method} ${required.path} (${required.id}).`);
        }
      }
      await Promise.all(REQUIRED_REPORT_CALCULATION_FEATURES.map(async (required) => {
        const response = await preflightFetch(required.path, required.method);
        if (response.status !== 422) {
          throw new ReportCalculationApiPreflightError(`${required.method} ${required.path} contract probe returned ${response.status}; expected 422 for an intentionally incomplete payload.`);
        }
      }));
    },
    async serviceVersion() {
      const status = await request<{ version?: unknown }>("/meta/status");
      if (typeof status.version !== "string" || !status.version.trim()) {
        throw new Error("TLDR Astro API status did not include a service version.");
      }
      return status.version;
    },
    async reportWindow(input) {
      const facts = await request<JsonObject>("/timing/report-window", {
        natalSubject: input.natalSubject,
        start: input.start,
        end: input.end,
        location: input.location,
        reportHorizon: input.reportHorizon,
        settings: {
          houseSystem: "whole_sign",
          zodiac: "tropical",
          aspectProfile: "standard"
        },
        includeSolarReturn: input.reportHorizon === "12_months",
        includeContentFacts: false,
        natalPointLongitudes: input.natalPointLongitudes ?? {}
      });
      return normalizeReportFactDates(facts, input.location.timeZone || "UTC");
    }
  };
}
