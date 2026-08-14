import fs from "node:fs";
import path from "node:path";
import {
  repairMechanicalPostDedupSeams,
  validateAssembledReport,
  validateReportKeyDateFormat
} from "../api/_lib/report-assembly.js";
import { verifyReportFactLock } from "../api/_lib/report-fact-lock.js";
import { assembleDeterministicReportKeyDates, reportKeyDateEventManifest } from "../api/_lib/report-key-dates.js";

type JsonRecord = Record<string, unknown>;

function loadEnv(sourcePath: string) {
  const text = fs.readFileSync(sourcePath, "utf8");
  return Object.fromEntries(text.split(/\r?\n/u).flatMap((line) => {
    const match = /^([A-Z0-9_]+)=(.*)$/u.exec(line.trim());
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/gu, "")]] : [];
  }));
}

const apply = process.argv.includes("--apply");
const manifestArgument = process.argv.find((argument) => argument.startsWith("--manifest="));
const envArgument = process.argv.find((argument) => argument.startsWith("--env-file="));
const outputArgument = process.argv.find((argument) => argument.startsWith("--out="));
const manifestPath = path.resolve(manifestArgument?.slice("--manifest=".length)
  ?? "scripts/fixtures/report-8b3e266e-assembly-repair-v1.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
  schema: string;
  reportId: string;
  sourceUnits: Record<string, Array<{ eventId: string; title: string; sentence: string }>>;
  provenance: JsonRecord;
};
if (manifest.schema !== "tldrastro.report-assembly-repair.v1") throw new Error("Unsupported report repair manifest.");

const envPath = path.resolve(envArgument?.slice("--env-file=".length) ?? "apps/web/.env.local");
if (!fs.existsSync(envPath)) throw new Error("Pass --env-file=/absolute/path/to/apps/web/.env.local for the Production dry run.");
const env = loadEnv(envPath);
const base = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error("Production Supabase environment is unavailable.");
const headers = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
async function request<T>(resource: string, init: RequestInit = {}) {
  const response = await fetch(`${base}/rest/v1/${resource}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${resource} failed with ${response.status}: ${text}`);
  return text ? JSON.parse(text) as T : null as T;
}

const [report] = await request<Array<JsonRecord>>(`user_reports?id=eq.${manifest.reportId}&select=*`);
if (!report) throw new Error(`Report ${manifest.reportId} was not found.`);
if (report.status !== "needs_review" && report.fulfillment_status !== "exception") {
  throw new Error(`Report must be needs_review or the reviewed assembly exception; found ${String(report.status)}/${String(report.fulfillment_status)}.`);
}
const rows = await request<Array<JsonRecord>>(`user_generated_interpretations?subject_id=eq.${manifest.reportId}&subject_type=eq.report_unit&select=*`);
const [job] = await request<Array<JsonRecord>>(`report_fulfillment_jobs?report_id=eq.${manifest.reportId}&select=*&order=created_at.desc&limit=1`);
if (!job) throw new Error("Report fulfillment job was not found.");
if (apply && report.fulfillment_status === "exception") {
  if (!["exception", "paused"].includes(String(job.state))) {
    throw new Error(`Reviewed assembly repair expected a stopped job; found ${String(job.state)}.`);
  }
  if (!String(job.last_error ?? "").includes("REPORT_ASSEMBLY_COHERENCE_REPAIR_REJECTED")) {
    throw new Error(`Reviewed assembly repair found an unrelated failure: ${String(job.last_error)}`);
  }
}
const prefix = `report:${manifest.reportId}:`;
const byUnit = new Map(rows.map((row) => [String(row.content_key).replace(prefix, ""), row]));
const sourceUnits = Object.entries(manifest.sourceUnits).map(([unitId, keyDates]) => {
  const row = byUnit.get(unitId);
  if (!row) throw new Error(`Missing persisted source unit ${unitId}.`);
  return {
    unitId,
    draft: {
      headline: String(row.headline ?? ""), summary: String(row.summary ?? ""), body: String(row.body ?? ""),
      sections: Array.isArray(row.sections) ? row.sections as Array<{ heading?: string; body?: string }> : [],
      keyDates
    }
  };
});
const facts = report.facts as Record<string, unknown>;
const keyDatesDraft = assembleDeterministicReportKeyDates({
  reportHorizon: String(report.report_horizon) as "12_months",
  frozenFacts: facts,
  sourceUnits
});
const formatIssues = validateReportKeyDateFormat(keyDatesDraft, sourceUnits);
const factLock = verifyReportFactLock(keyDatesDraft, facts);
const assembledUnits = rows.flatMap((row) => {
  const unitId = String(row.content_key).replace(prefix, "");
  if (unitId === "key-dates") return [];
  return [{
    unitId,
    draft: {
      headline: String(row.headline ?? ""), summary: String(row.summary ?? ""), body: String(row.body ?? ""),
      sections: Array.isArray(row.sections) ? row.sections as Array<{ heading?: string; body?: string }> : []
    }
  }];
});
const mechanicalCoherence = repairMechanicalPostDedupSeams(assembledUnits);
if (mechanicalCoherence.remaining.length) {
  throw new Error(`Repair manifest leaves non-mechanical coherence gaps: ${JSON.stringify(mechanicalCoherence.remaining)}`);
}
const assemblyIssues = validateAssembledReport([...mechanicalCoherence.units, { unitId: "key-dates", draft: keyDatesDraft }]);
const blocking = [...formatIssues, ...factLock.issues, ...assemblyIssues.filter((issue) => issue.severity === "error")];
if (blocking.length) throw new Error(`Repair manifest failed validation: ${JSON.stringify(blocking)}`);

const eventIds = new Set(reportKeyDateEventManifest(facts, "12_months").map((event) => event.eventId));
for (const [unitId, entries] of Object.entries(manifest.sourceUnits)) {
  for (const entry of entries) if (!eventIds.has(entry.eventId)) throw new Error(`Unknown event ${entry.eventId} in ${unitId}.`);
}

const result = {
  mode: apply ? "apply" : "dry_run",
  reportId: manifest.reportId,
  currentStatus: report.status,
  currentFulfillmentStatus: report.fulfillment_status,
  currentJobState: job.state,
  selectedKeyDates: Object.values(manifest.sourceUnits).flat().length,
  keyDates: keyDatesDraft.body,
  mechanicalCoherenceRepairs: mechanicalCoherence.repairs,
  warnings: assemblyIssues.filter((issue) => issue.severity !== "error")
};
if (outputArgument) {
  const outputPath = path.resolve(outputArgument.slice("--out=".length));
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    mode: result.mode,
    reportId: result.reportId,
    selectedKeyDates: result.selectedKeyDates,
    warningCount: result.warnings.length,
    outputPath
  }));
} else {
  console.log(JSON.stringify(result, null, 2));
}

if (!apply) process.exit(0);

for (const sourceUnit of sourceUnits) {
  const row = byUnit.get(sourceUnit.unitId) as JsonRecord;
  await request(`user_generated_interpretations?id=eq.${String(row.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      source_snapshot: {
        ...row.source_snapshot as JsonRecord,
        keyDateEntries: sourceUnit.draft.keyDates,
        assemblyRepairManifest: { schema: manifest.schema, provenance: manifest.provenance }
      }
    })
  });
}
for (const repair of mechanicalCoherence.repairs) {
  const row = byUnit.get(repair.unitId) as JsonRecord;
  const assembled = mechanicalCoherence.units.find((unit) => unit.unitId === repair.unitId);
  if (!row || !assembled) throw new Error(`Missing persisted coherence-repair unit ${repair.unitId}.`);
  await request(`user_generated_interpretations?id=eq.${String(row.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      headline: assembled.draft.headline ?? "",
      summary: assembled.draft.summary ?? "",
      body: assembled.draft.body ?? "",
      sections: assembled.draft.sections ?? [],
      source_snapshot: {
        ...row.source_snapshot as JsonRecord,
        assemblyCoherenceRepairs: [
          ...(Array.isArray((row.source_snapshot as JsonRecord | undefined)?.assemblyCoherenceRepairs)
            ? (row.source_snapshot as JsonRecord).assemblyCoherenceRepairs as unknown[] : []),
          { schema: "report-assembly-coherence-repair.v2", ...repair, boundedCallCount: 0 }
        ]
      }
    })
  });
}
const keyDateRow = byUnit.get("key-dates");
if (!keyDateRow) throw new Error("Missing persisted key-dates unit.");
await request(`user_generated_interpretations?id=eq.${String(keyDateRow.id)}`, {
  method: "PATCH",
  headers: { Prefer: "return=minimal" },
  body: JSON.stringify({
    headline: keyDatesDraft.headline,
    summary: keyDatesDraft.summary,
    body: keyDatesDraft.body,
    sections: keyDatesDraft.sections,
    source_snapshot: {
      ...keyDateRow.source_snapshot as JsonRecord,
      fulfillmentPassed: true,
      deterministicAssembly: {
        schema: "report-key-dates-assembly.v3",
        sourceUnitIds: sourceUnits.map((unit) => unit.unitId),
        writerChainSkipped: true,
        coldReadSkipped: true,
        judgeSkipped: true,
        formatContractValidated: true,
        repairManifest: path.relative(process.cwd(), manifestPath)
      },
      validatorResults: [],
      assemblyRepairManifest: { schema: manifest.schema, provenance: manifest.provenance }
    }
  })
});
await request(`user_reports?id=eq.${manifest.reportId}`, {
  method: "PATCH", headers: { Prefer: "return=minimal" },
  body: JSON.stringify({ status: "needs_review", fulfillment_status: "needs_review" })
});
await request(`report_fulfillment_jobs?id=eq.${String(job.id)}`, {
  method: "PATCH", headers: { Prefer: "return=minimal" },
  body: JSON.stringify({
    state: "complete", step: "complete", run_after: new Date().toISOString(),
    locked_at: null, locked_by: null, lease_expires_at: null, last_error: null
  })
});
console.log(JSON.stringify({ applied: true, jobId: job.id, countersPreserved: true, status: "needs_review" }));
