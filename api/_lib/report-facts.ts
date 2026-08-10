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

export type ComposeReportFactsInput = {
  userId: string;
  subjectId?: string | null;
  natalSubject: ReportChartSubject;
  location: ReportChartSubject["location"];
  reportDomain: ReportDomain;
  reportHorizon: ReportHorizon;
  start: string;
  end: string;
  regenerate?: boolean;
};

type ReportFactsIdentityInput = Pick<
  ComposeReportFactsInput,
  "userId" | "subjectId" | "reportDomain" | "reportHorizon" | "start"
>;

export type ReportFactsAstroClient = {
  serviceVersion(): Promise<string>;
  reportWindow(input: Omit<ComposeReportFactsInput, "userId" | "subjectId" | "regenerate">): Promise<JsonObject>;
};

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
      end: input.end
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

export function createTldrAstroReportFactsClient({
  baseUrl = process.env.TLDRASTRO_API_URL || process.env.VITE_TLDRASTRO_API_URL || DEFAULT_TLDRASTRO_API_URL,
  fetchImpl = fetch
}: {
  baseUrl?: string;
  fetchImpl?: FetchLike;
} = {}): ReportFactsAstroClient {
  const normalizedBaseUrl = baseUrl.replace(/\/$/u, "");

  async function request<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetchImpl(`${normalizedBaseUrl}${path}`, body === undefined ? undefined : {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`TLDR Astro API request failed with ${response.status}: ${JSON.stringify(payload)}`);
    }
    return payload as T;
  }

  return {
    async serviceVersion() {
      const status = await request<{ version?: unknown }>("/meta/status");
      if (typeof status.version !== "string" || !status.version.trim()) {
        throw new Error("TLDR Astro API status did not include a service version.");
      }
      return status.version;
    },
    reportWindow(input) {
      return request<JsonObject>("/timing/report-window", {
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
        includeContentFacts: false
      });
    }
  };
}
