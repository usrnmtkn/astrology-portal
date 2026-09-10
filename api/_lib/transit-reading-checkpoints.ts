import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import type { SupabaseReportAdmin } from "./supabase-report-admin.js";
import type { ReportModelCallInput, ReportModelResult } from "./report-model-client.js";

// Each cron invocation may perform one new provider call. Replaying saved
// responses runs the existing fact/voice/review gates again, without billing.
const MAX_STEPS = 6;
const INVOCATION_BUDGET_MS = 240_000;
type Context = {
  admin: SupabaseReportAdmin;
  family: "you" | "friend";
  jobId: string;
  attempt: number;
  step: number;
  called: boolean;
  deadline: number;
};
type Checkpoint<T> = {
  id: string;
  request_hash: string;
  state: "started" | "complete" | "failed";
  response: ReportModelResult<T> | null;
};
const context = new AsyncLocalStorage<Context>();

export class TransitReadingCheckpointYield extends Error {
  constructor() { super("Report progress saved; continue in the next worker invocation."); }
}
export class TransitReadingCheckpointStopped extends Error {
  constructor(message: string, options?: ErrorOptions) { super(message, options); }
}

export function withTransitReadingCheckpoints<T>(
  input: Pick<Context, "admin" | "family" | "jobId" | "attempt">,
  run: () => Promise<T>
): Promise<T> {
  return context.run({ ...input, step: 0, called: false, deadline: Date.now() + INVOCATION_BUDGET_MS }, run);
}

export async function checkpointTransitReadingModel<T>(
  input: ReportModelCallInput<T>,
  call: (input: ReportModelCallInput<T>) => Promise<ReportModelResult<T>>
): Promise<ReportModelResult<T>> {
  const scope = context.getStore();
  if (!scope) return call(input);
  const step = scope.step++;
  if (step >= MAX_STEPS) throw new TransitReadingCheckpointStopped("Report generation exceeded its six-step limit.");
  const jobColumn = `${scope.family}_job_id`;
  const requestHash = createHash("sha256").update(JSON.stringify({
    version: 1, provider: input.provider, model: input.model,
    prompt: input.prompt, schemaName: input.schemaName, schema: input.schema
  })).digest("hex");
  const saved = await scope.admin.selectOne<Checkpoint<T>>("transit_report_model_checkpoints", new URLSearchParams({
    [jobColumn]: `eq.${scope.jobId}`, attempt: `eq.${scope.attempt}`, step: `eq.${step}`, select: "*"
  })).catch((cause) => { throw new TransitReadingCheckpointStopped("Report checkpoints could not be read safely.", { cause }); });
  if (saved) {
    if (saved.request_hash !== requestHash) throw new TransitReadingCheckpointStopped(
      "Report instructions or evidence changed after a checkpoint. A fresh reviewed run is required."
    );
    if (saved.state !== "complete" || !saved.response) throw new TransitReadingCheckpointStopped(
      "A report model step has no confirmed saved response. Automatic replay stopped to avoid duplicate billing."
    );
    input.validateResponse?.(saved.response.value);
    return saved.response;
  }
  if (scope.called) throw new TransitReadingCheckpointYield();
  const remaining = scope.deadline - Date.now();
  if (remaining < 30_000) throw new TransitReadingCheckpointStopped("Report preparation exhausted the worker time budget.");
  scope.called = true;
  // A unique row is reserved BEFORE billing. After a crash, a started row is
  // ambiguous and must be inspected, never silently sent to the provider again.
  const [reserved] = await scope.admin.insert<Checkpoint<T>>("transit_report_model_checkpoints", {
    [jobColumn]: scope.jobId, attempt: scope.attempt, step,
    request_hash: requestHash, state: "started", provider: input.provider,
    model: input.model, schema_name: input.schemaName
  }).catch((cause) => { throw new TransitReadingCheckpointStopped("Report checkpoint reservation failed; no new call was sent.", { cause }); });
  if (!reserved) throw new TransitReadingCheckpointStopped("Could not reserve report model checkpoint.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new TransitReadingCheckpointStopped(
    `Report model step ${step + 1} exceeded the worker time budget.`
  )), Math.max(1, scope.deadline - Date.now()));
  try {
    if (Date.now() >= scope.deadline) throw new TransitReadingCheckpointStopped("Report checkpoint reservation exhausted the worker time budget.");
    const result = await call({ ...input, signal: controller.signal, disableFallback: true });
    const rows = await scope.admin.update<Checkpoint<T>>("transit_report_model_checkpoints", `id=eq.${reserved.id}&state=eq.started`, {
      state: "complete", response: result, completed_at: new Date().toISOString()
    });
    if (rows.length !== 1) throw new Error("Report response could not be checkpointed.");
    return result;
  } catch (error) {
    // A failed persistence write can leave a started row, which also fails closed.
    await scope.admin.update("transit_report_model_checkpoints", `id=eq.${reserved.id}&state=eq.started`, {
      state: "failed", error: (error instanceof Error ? error.message : "Model step failed").slice(0, 2000),
      completed_at: new Date().toISOString()
    }).catch(() => undefined);
    throw new TransitReadingCheckpointStopped(
      `Report model step ${step + 1} did not complete safely. Saved earlier steps are retained for inspection.`, { cause: error }
    );
  } finally {
    clearTimeout(timer);
  }
}
