import type { ReportGenerationPayload } from "./report-generation.ts";
import {
  prepareProductionPreCallGate,
  assertProductionPreCallGate
} from "../../src/astro-writing/productionPreCallGate.cjs";

export type ReportProductionRole = "WRITER" | "COLD_REVIEWER" | "REVIEWER" | "REVISER";

export type ReportProductionValidation = {
  checked: true;
  passed: boolean;
  violations: Array<{ category: string; detail: string }>;
};

export type ReportProductionKernel = {
  input: ReturnType<typeof reportProductionInput>;
  gate: ReturnType<typeof prepareProductionPreCallGate>;
  role: ReportProductionRole;
  draftValidation: ReportProductionValidation | null;
};

export function reportProductionInput(payload: ReportGenerationPayload) {
  return {
    contentKey: `report:${payload.reportDomain}:${payload.reportHorizon}:${payload.unit.unitId}`,
    surface: "year_ahead" as const,
    mode: "report" as const,
    eventType: "report-unit",
    facts: {
      reportId: payload.reportId,
      reportDomain: payload.reportDomain,
      reportHorizon: payload.reportHorizon,
      unitId: payload.unit.unitId
    },
    knowledgeIds: [] as string[],
    reportPayload: payload
  };
}

export function reportProductionValidation(
  issues: Array<{ code?: string; category?: string; message?: string; detail?: string }> = []
): ReportProductionValidation {
  return {
    checked: true,
    passed: issues.length === 0,
    violations: issues.map((issue) => ({
      category: String(issue.category ?? issue.code ?? "report_validation"),
      detail: String(issue.detail ?? issue.message ?? "Report validation finding.")
    }))
  };
}

export function prepareReportProductionKernel(
  payload: ReportGenerationPayload,
  role: ReportProductionRole,
  draftValidation: ReportProductionValidation | null = null
): ReportProductionKernel {
  const input = reportProductionInput(payload);
  const gate = prepareProductionPreCallGate(input);
  return { input, gate, role, draftValidation };
}

export function assertReportProductionKernel(kernel: ReportProductionKernel | null | undefined) {
  if (!kernel) {
    throw new Error("PRODUCTION_REPORT_PRECALL_GATE_MISSING: no provider call is allowed.");
  }
  if (kernel.gate?.evidence?.kind !== "report") {
    throw new Error("PRODUCTION_REPORT_PRECALL_GATE_INVALID: governed report evidence is required. No provider call is allowed.");
  }
  return assertProductionPreCallGate(kernel.gate, {
    role: kernel.role,
    input: kernel.input,
    draftValidation: kernel.draftValidation
  });
}
