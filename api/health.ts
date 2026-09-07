import type { IncomingMessage, ServerResponse } from "node:http";
import { getLunarCalendarWeek } from "../apps/web/src/services/ephemeris.js";
import type { LocationInput } from "../apps/web/src/types.js";

type DependencyResult = {
  ok: boolean;
  elapsedMs: number;
  detail?: Record<string, unknown>;
  error?: string;
};

const healthLocation: LocationInput = {
  label: "Health check",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};

const expectedExactAspectStudioRows = 439;
const expectedNodePoleStudioRows = 60;

function elapsedSince(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

async function checkEphemeris(): Promise<DependencyResult> {
  const startedAt = performance.now();

  try {
    const calendar = await getLunarCalendarWeek(healthLocation, new Date("2026-07-02T00:00:00Z"), { detail: "basic" });

    return {
      ok: calendar.days.length >= 7,
      elapsedMs: elapsedSince(startedAt),
      detail: {
        days: calendar.days.length,
        timeZone: calendar.timeZone
      }
    };
  } catch (error) {
    return {
      ok: false,
      elapsedMs: elapsedSince(startedAt),
      error: error instanceof Error ? error.message : "Ephemeris check failed."
    };
  }
}

async function checkContentGenerationImport(): Promise<DependencyResult> {
  const startedAt = performance.now();

  try {
    const module = await import("./_lib/content-generation.js");

    return {
      ok: typeof module.generateContent === "function",
      elapsedMs: elapsedSince(startedAt),
      detail: {
        generateContent: typeof module.generateContent
      }
    };
  } catch (error) {
    return {
      ok: false,
      elapsedMs: elapsedSince(startedAt),
      error: error instanceof Error ? error.message : "Content generation import failed."
    };
  }
}

async function checkReportFulfillment(): Promise<DependencyResult> {
  const startedAt = performance.now();

  try {
    const [{ createSupabaseReportAdmin }, { reportBillingMode }] = await Promise.all([
      import("./_lib/supabase-report-admin.js"),
      import("./_lib/report-fulfillment-config.js")
    ]);
    const admin = createSupabaseReportAdmin();
    const control = await admin.selectOne<{ id?: unknown; worker_paused?: unknown }>(
      "report_fulfillment_controls",
      new URLSearchParams({
        id: "eq.true",
        select: "id,worker_paused"
      })
    );
    const controlRowAvailable = control?.id === true;

    return {
      ok: controlRowAvailable,
      elapsedMs: elapsedSince(startedAt),
      detail: {
        controlRowAvailable,
        workerPaused: control?.worker_paused === true,
        billingMode: reportBillingMode()
      }
    };
  } catch (error) {
    return {
      ok: false,
      elapsedMs: elapsedSince(startedAt),
      error: error instanceof Error ? error.message : "Report fulfillment check failed."
    };
  }
}

async function checkContentStudioExactAspects(): Promise<DependencyResult> {
  const startedAt = performance.now();

  try {
    const { createSupabaseReportAdmin } = await import("./_lib/supabase-report-admin.js");
    const admin = createSupabaseReportAdmin();
    const params = new URLSearchParams({
      select: "content_key,source_snapshot",
      prompt_version: "eq.exact-sky-aspect-content-studio-v1",
      status: "eq.LIVE",
      lane: "eq.serving",
      review_state: "is.null",
      limit: "500"
    });
    const rows = await admin.request<Array<{
      content_key?: unknown;
      source_snapshot?: { nodeAxisPole?: unknown } | null;
    }>>(`generated_interpretations?${params}`);
    const northNodeRows = rows.filter((row) => row.source_snapshot?.nodeAxisPole === "north-node").length;
    const southNodeRows = rows.filter((row) => row.source_snapshot?.nodeAxisPole === "south-node").length;
    const exactRows = rows.length;
    const mirrorComplete = exactRows === expectedExactAspectStudioRows
      && northNodeRows === expectedNodePoleStudioRows
      && southNodeRows === expectedNodePoleStudioRows;

    return {
      ok: mirrorComplete,
      elapsedMs: elapsedSince(startedAt),
      detail: {
        exactRows,
        northNodeRows,
        southNodeRows,
        expectedExactRows: expectedExactAspectStudioRows,
        expectedNodePoleRows: expectedNodePoleStudioRows
      }
    };
  } catch (error) {
    return {
      ok: false,
      elapsedMs: elapsedSince(startedAt),
      error: error instanceof Error ? error.message : "Content Studio exact-aspect check failed."
    };
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, {
      ok: false,
      status: "method_not_allowed",
      timestamp: new Date().toISOString()
    });
    return;
  }

  const [ephemeris, contentGeneration, reportFulfillment, contentStudioExactAspects] = await Promise.all([
    checkEphemeris(),
    checkContentGenerationImport(),
    checkReportFulfillment(),
    checkContentStudioExactAspects()
  ]);
  const ok = ephemeris.ok
    && contentGeneration.ok
    && reportFulfillment.ok
    && contentStudioExactAspects.ok;

  sendJson(res, ok ? 200 : 503, {
    ok,
    status: ok ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    dependencies: {
      ephemeris,
      contentGeneration,
      reportFulfillment,
      contentStudioExactAspects
    }
  });
}
