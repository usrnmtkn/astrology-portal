import { GeneratedReportJudgeEvidenceError } from "./transit-reading-judge-evidence.js";

/** Exact string fields from this request's locked brief, never generated excerpts. */
function sourceFields(brief: unknown) {
  const fields = new Map<string, string>();
  const visit = (value: unknown, pointer: string) => {
    if (typeof value === "string") {
      if (pointer && value.trim()) fields.set(pointer, value);
    } else if (value && typeof value === "object") {
      for (const key of Object.keys(value)) {
        visit((value as Record<string, unknown>)[key], `${pointer}/${key.replace(/~/gu, "~0").replace(/\//gu, "~1")}`);
      }
    }
  };
  visit(brief, "");
  return fields;
}

export function reportJudgeSourcePointerSchema(schema: Record<string, unknown>, brief: unknown) {
  const result = structuredClone(schema) as {
    properties: { findings: { items: { required: string[]; properties: Record<string, unknown> } } };
  };
  const finding = result.properties.findings.items;
  finding.required = finding.required.filter(key => key !== "sourceQuote");
  delete finding.properties.sourceQuote;
  finding.properties.sourcePath = { type: ["string", "null"], enum: [null, ...sourceFields(brief).keys()] };
  return result as unknown as Record<string, unknown>;
}

/** Resolve selected paths into whole original passages, preserving the raw response. */
export function resolveReportJudgeSourcePointers(value: unknown, brief: unknown): unknown {
  const fail = (message: string): never => { throw new GeneratedReportJudgeEvidenceError(`source reference: ${message}`); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("expected an object.");
  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.findings)) return fail("expected findings.");
  const fields = sourceFields(brief);
  return { ...payload, findings: payload.findings.map((finding: unknown) => {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) return fail("invalid finding.");
    const row = finding as Record<string, unknown>;
    if (Object.hasOwn(row, "sourceQuote")) return fail("provider must select a sourcePath, not return sourceQuote.");
    if (row.sourcePath === null) return { ...row, sourceQuote: null };
    if (typeof row.sourcePath !== "string" || !fields.has(row.sourcePath)) return fail("path is not an exact string field in the locked brief.");
    return { ...row, sourceQuote: fields.get(row.sourcePath)! };
  }) };
}
