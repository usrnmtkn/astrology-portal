import { GENERATED_REPORT_JUDGE_CATEGORIES, GENERATED_REPORT_JUDGE_FINDING_CATEGORIES } from "./transit-reading-judge-rules.js";

export const GENERATED_REPORT_JUDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scores", "findings"],
  properties: {
    scores: {
      type: "object",
      additionalProperties: false,
      required: [...GENERATED_REPORT_JUDGE_CATEGORIES],
      properties: Object.fromEntries(GENERATED_REPORT_JUDGE_CATEGORIES.map((category) => [
        category,
        { type: "number", minimum: 0, maximum: 4 }
      ]))
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "location", "finding", "draftQuote", "sourcePath", "sourceQuote", "ownerComparisons"],
        properties: {
          category: { type: "string", enum: [...GENERATED_REPORT_JUDGE_FINDING_CATEGORIES] },
          location: { type: "string" },
          finding: { type: "string" },
          draftQuote: { type: "string", pattern: "\\S" },
          sourcePath: { type: ["string", "null"] },
          sourceQuote: { type: ["string", "null"] },
          ownerComparisons: { type: "array", items: {
            type: "object", additionalProperties: false,
            required: ["evidenceId", "quote", "difference"],
            properties: {
              evidenceId: { type: "string", pattern: "\\S" },
              quote: { type: "string", pattern: "\\S" },
              difference: { type: "string", pattern: "\\S" }
            }
          } }
        }
      }
    }
  }
} as const;
