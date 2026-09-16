import type { IncomingMessage, ServerResponse } from "node:http";
import { loadLocalWebEnv } from "./_lib/local-env.ts";
import {
  composeRelationshipFacts,
  createSupabaseRelationshipFactsDataSource,
  createTldrAstroRelationshipClient,
  readRelationshipReport,
  RELATIONSHIP_REPORT_AUTH_REQUIRED_CODE,
  RelationshipFactsInputError,
  RelationshipReportUnavailableError,
  type RelationshipSubject
} from "./_lib/relationship-facts.ts";
import {
  createSupabaseReportEnvelopeStore,
  ReportFactsFrozenError
} from "./_lib/report-envelope.ts";

loadLocalWebEnv();

type RelationshipFactsRequest = {
  subject?: RelationshipSubject;
  periodStart?: string;
  periodEnd?: string;
  regenerate?: boolean;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function bearerToken(req: IncomingMessage) {
  const match = req.headers.authorization?.match(/^Bearer\s+(.+)$/iu);

  return match?.[1] ?? "";
}

async function authenticatedUserId(req: IncomingMessage) {
  const token = bearerToken(req);

  if (!token) {
    return null;
  }

  const key = serviceRoleKey();
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${token}`
    }
  });
  const payload = await response.json().catch(() => null) as { id?: unknown } | null;

  return response.ok && typeof payload?.id === "string" ? payload.id : null;
}

async function readJsonBody(req: IncomingMessage): Promise<RelationshipFactsRequest> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  return raw ? JSON.parse(raw) as RelationshipFactsRequest : {};
}

function subjectFromQuery(req: IncomingMessage): RelationshipSubject | undefined {
  const url = new URL(req.url ?? "/api/relationship-report-facts", "http://localhost");
  const kind = url.searchParams.get("subjectKind");
  const id = url.searchParams.get("subjectId");

  if ((kind === "friendship" || kind === "manual_chart") && id) {
    return { kind, id };
  }

  return undefined;
}

function periodStartFromQuery(req: IncomingMessage) {
  return new URL(req.url ?? "/api/relationship-report-facts", "http://localhost")
    .searchParams.get("periodStart") ?? undefined;
}

function requiredInput(input: RelationshipFactsRequest) {
  if (!input.subject || !input.periodStart) {
    throw new RelationshipFactsInputError("subject and periodStart are required.");
  }

  return {
    subject: input.subject,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    regenerate: input.regenerate
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, 405, { ok: false, code: "method_not_allowed" });
    return;
  }

  try {
    const viewerUserId = await authenticatedUserId(req);

    if (!viewerUserId) {
      sendJson(res, 401, { ok: false, code: RELATIONSHIP_REPORT_AUTH_REQUIRED_CODE });
      return;
    }

    const key = serviceRoleKey();
    const url = supabaseUrl();
    const dataSource = createSupabaseRelationshipFactsDataSource({
      supabaseUrl: url,
      serviceRoleKey: key
    });
    const envelopeStore = createSupabaseReportEnvelopeStore({
      supabaseUrl: url,
      serviceRoleKey: key
    });

    if (req.method === "GET") {
      const input = requiredInput({
        subject: subjectFromQuery(req),
        periodStart: periodStartFromQuery(req)
      });
      const report = await readRelationshipReport({
        viewerUserId,
        subject: input.subject,
        periodStart: input.periodStart
      }, { dataSource, envelopeStore });

      sendJson(res, report ? 200 : 404, report
        ? { ok: true, report }
        : { ok: false, code: "relationship_report_not_found" });
      return;
    }

    const input = requiredInput(await readJsonBody(req));
    const report = await composeRelationshipFacts({
      viewerUserId,
      ...input
    }, {
      dataSource,
      envelopeStore,
      astroClient: createTldrAstroRelationshipClient()
    });

    sendJson(res, 200, { ok: true, report });
  } catch (error) {
    if (error instanceof RelationshipReportUnavailableError) {
      sendJson(res, error.statusCode, { ok: false, code: error.code });
      return;
    }

    if (error instanceof RelationshipFactsInputError) {
      sendJson(res, error.statusCode, { ok: false, code: error.code });
      return;
    }

    if (error instanceof ReportFactsFrozenError) {
      sendJson(res, 409, { ok: false, code: "report_facts_frozen" });
      return;
    }

    console.error("relationship-report-facts failed", error);
    sendJson(res, 500, { ok: false, code: "relationship_facts_failed" });
  }
}
