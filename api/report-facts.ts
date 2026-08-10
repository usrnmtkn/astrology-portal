import type { IncomingMessage, ServerResponse } from "node:http";
import { loadLocalWebEnv } from "./_lib/local-env.ts";
import {
  composeReportFacts,
  createTldrAstroReportFactsClient,
  readReportFacts,
  ReportFactsInputError,
  type ComposeReportFactsInput
} from "./_lib/report-facts.ts";
import {
  createSupabaseReportEnvelopeStore,
  ReportFactsFrozenError
} from "./_lib/report-envelope.ts";

loadLocalWebEnv();

type ReportFactsRequest = Omit<ComposeReportFactsInput, "userId">;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
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

async function authenticatedUserId(req: IncomingMessage) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/iu)?.[1];
  if (!token) return null;
  const key = serviceRoleKey();
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: key, authorization: `Bearer ${token}` }
  });
  const payload = await response.json().catch(() => null) as { id?: unknown } | null;
  return response.ok && typeof payload?.id === "string" ? payload.id : null;
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) as ReportFactsRequest : {} as ReportFactsRequest;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, code: "method_not_allowed" });
    return;
  }
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) {
      sendJson(res, 401, { ok: false, code: "report_auth_required" });
      return;
    }
    const input = await readBody(req);
    const key = serviceRoleKey();
    const url = supabaseUrl();
    const envelopeStore = createSupabaseReportEnvelopeStore({
      supabaseUrl: url,
      serviceRoleKey: key
    });
    const existing = await readReportFacts({
      userId,
      subjectId: input.subjectId,
      reportDomain: input.reportDomain,
      reportHorizon: input.reportHorizon,
      start: input.start
    }, envelopeStore);
    const report = existing && !input.regenerate
      ? existing
      : await composeReportFacts({ ...input, userId }, {
        envelopeStore,
        astroClient: createTldrAstroReportFactsClient()
      });
    sendJson(res, 200, { ok: true, report });
  } catch (error) {
    if (error instanceof ReportFactsInputError) {
      sendJson(res, error.statusCode, { ok: false, code: error.code, error: error.message });
      return;
    }
    if (error instanceof ReportFactsFrozenError) {
      sendJson(res, 409, { ok: false, code: "report_facts_frozen" });
      return;
    }
    console.error("report-facts failed", error);
    sendJson(res, 500, { ok: false, code: "report_facts_failed" });
  }
}
