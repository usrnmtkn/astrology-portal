import fs from "node:fs";
import { callOpenAIResponses } from "../../src/astro-writing/openAIResponses.cjs";
import { REPORT_JUDGE_THRESHOLD, reportFulfillmentConfig } from "./report-fulfillment-config.js";
import type { GeneratedTransitReadingDraft } from "./transit-reading-generation.js";
import type { GeneratedTransitReportSurface } from "./transit-reading-owner-evidence.js";

export const GENERATED_REPORT_JUDGE_ADAPTER_VERSION = "generated-report-judge-adapter-v1.0";
export const GENERATED_REPORT_JUDGE_ADAPTER_PATH = "tldr-astro-phrasebank/TLDR-GENERATED-REPORT-JUDGE-ADAPTER-V1-OWNER.md";
const REPORT_JUDGE_PATH = "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3.4-OWNER.md";
const REPORT_OWNER_REVIEW_EVIDENCE_PATH = "tldr-astro-phrasebank/TLDR-REPORT-OWNER-REVIEW-EVIDENCE-2026-08-11.md";

export const GENERATED_REPORT_JUDGE_CATEGORIES = [
  "astrology_chronology",
  "factual_traceability",
  "lived_experience",
  "interpretive_movement",
  "owner_voice",
  "natural_language",
  "syntax_variety",
  "emotional_temperature",
  "density"
] as const;

export const GENERATED_REPORT_JUDGE_HARD_GATES = [
  "astrology_chronology",
  "factual_traceability",
  "lived_experience",
  "interpretive_movement",
  "owner_voice"
] as const;

export type GeneratedReportJudgeCategory = typeof GENERATED_REPORT_JUDGE_CATEGORIES[number];
export type GeneratedReportJudgeScores = Record<GeneratedReportJudgeCategory, number>;
export type GeneratedReportJudgeFinding = {
  category: GeneratedReportJudgeCategory;
  location: string;
  finding: string;
};
export type GeneratedReportJudgeResult = {
  scores: GeneratedReportJudgeScores;
  overall: number;
  verdict: "pass" | "below_threshold";
  findings: GeneratedReportJudgeFinding[];
};
export type GeneratedReportJudgeAudit = {
  version: typeof GENERATED_REPORT_JUDGE_ADAPTER_VERSION;
  threshold: number;
  verdict: "pass";
  overall: number;
  provider: string;
  model: string;
  attempts: 1 | 2;
};

type JudgeProviderPayload = {
  scores: GeneratedReportJudgeScores;
  findings: GeneratedReportJudgeFinding[];
};

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
        required: ["category", "location", "finding"],
        properties: {
          category: { type: "string", enum: [...GENERATED_REPORT_JUDGE_CATEGORIES] },
          location: { type: "string" },
          finding: { type: "string" }
        }
      }
    }
  }
} as const;

function requiredFile(path: string) {
  return fs.readFileSync(path, "utf8");
}

function outputText(payload: {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
}) {
  if (payload.output_text) return payload.output_text;
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((entry) => entry.text)
    .filter((value): value is string => Boolean(value))
    .join("\n")
    .trim() ?? "";
}

function claudeToolInput(payload: {
  content?: Array<{ type?: string; name?: string; input?: unknown }>;
}) {
  return payload.content?.find((entry) => entry.type === "tool_use" && entry.name === "tldr_generated_report_judge")?.input;
}

function assertProviderPayload(value: unknown): JudgeProviderPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Generated report judge returned invalid structured output.");
  const payload = value as Partial<JudgeProviderPayload>;
  if (!payload.scores || typeof payload.scores !== "object" || Array.isArray(payload.scores) || !Array.isArray(payload.findings)) {
    throw new Error("Generated report judge omitted scores or findings.");
  }
  for (const category of GENERATED_REPORT_JUDGE_CATEGORIES) {
    const score = (payload.scores as Partial<GeneratedReportJudgeScores>)[category];
    if (typeof score !== "number" || score < 0 || score > 4) throw new Error(`Generated report judge returned an invalid ${category} score.`);
  }
  for (const finding of payload.findings) {
    if (!finding || !GENERATED_REPORT_JUDGE_CATEGORIES.includes(finding.category) || !finding.location?.trim() || !finding.finding?.trim()) {
      throw new Error("Generated report judge returned an invalid finding.");
    }
  }
  return payload as JudgeProviderPayload;
}

export function generatedReportJudgeOverall(scores: GeneratedReportJudgeScores) {
  return GENERATED_REPORT_JUDGE_CATEGORIES.reduce((sum, category) => sum + scores[category], 0) / (4 * GENERATED_REPORT_JUDGE_CATEGORIES.length);
}

export function generatedReportJudgeVerdict(scores: GeneratedReportJudgeScores, threshold = REPORT_JUDGE_THRESHOLD) {
  const hardGatesPass = GENERATED_REPORT_JUDGE_HARD_GATES.every((category) => scores[category] >= 3);
  const releaseFloorsPass = scores.owner_voice >= 4 && scores.natural_language >= 4;
  return generatedReportJudgeOverall(scores) >= threshold && hardGatesPass && releaseFloorsPass
    ? "pass" as const
    : "below_threshold" as const;
}

function judgePrompt(input: {
  surface: GeneratedTransitReportSurface;
  reportKind: string;
  brief: unknown;
  draft: GeneratedTransitReadingDraft;
  ownerEvidence: string[];
}) {
  const approvedFeedback = input.ownerEvidence.length
    ? input.ownerEvidence.map((text, index) => `${index + 1}. ${text}`).join("\n")
    : "No additional generated-report owner feedback has been explicitly approved yet.";
  return [
    requiredFile(REPORT_JUDGE_PATH),
    "",
    requiredFile(GENERATED_REPORT_JUDGE_ADAPTER_PATH),
    "",
    "OWNER REVIEW EVIDENCE",
    requiredFile(REPORT_OWNER_REVIEW_EVIDENCE_PATH),
    "",
    "EXPLICITLY APPROVED GENERATED-REPORT OWNER FEEDBACK",
    approvedFeedback,
    "",
    "JUDGE THIS COMPLETE GENERATED REPORT",
    `Surface: ${input.surface}`,
    `Report kind: ${input.reportKind}`,
    "The governed brief is the factual ceiling. Do not ask the writer to invent a scene, fact, chart claim, date, or life circumstance that is absent from it.",
    "Return scores and diagnostic findings only. Do not return a verdict, overall score, replacement sentence, rewrite, or suggested prose.",
    "",
    "GOVERNED BRIEF",
    JSON.stringify(input.brief, null, 2),
    "",
    "COMPLETE DRAFT",
    JSON.stringify({
      headline: input.draft.headline,
      tldr: input.draft.tldr,
      summary: input.draft.summary,
      body: input.draft.body
    }, null, 2)
  ].join("\n");
}

async function callOpenAiJudge(prompt: string, surface: GeneratedTransitReportSurface, model: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const { response, payload } = await callOpenAIResponses({
    apiKey,
    role: "REVIEWER",
    surface,
    family: "generated-report-judge",
    request: {
      model,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "tldr_generated_report_judge",
          strict: true,
          schema: GENERATED_REPORT_JUDGE_SCHEMA
        }
      }
    }
  });
  const typed = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(typed.error?.message ?? `Generated report judge failed with ${response.status}.`);
  const text = outputText(typed);
  if (!text) throw new Error("Generated report judge response contained no structured output.");
  return assertProviderPayload(JSON.parse(text) as unknown);
}

async function callClaudeJudge(prompt: string, model: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 2400,
      messages: [{ role: "user", content: prompt }],
      tools: [{
        name: "tldr_generated_report_judge",
        description: "Return only diagnostic quality scores and findings for the generated report.",
        input_schema: GENERATED_REPORT_JUDGE_SCHEMA
      }],
      tool_choice: { type: "tool", name: "tldr_generated_report_judge" }
    })
  });
  const payload = await response.json().catch(() => null) as {
    content?: Array<{ type?: string; name?: string; input?: unknown }>;
    error?: { message?: string };
  } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? `Generated report judge failed with ${response.status}.`);
  const value = payload ? claudeToolInput(payload) : null;
  return assertProviderPayload(value);
}

export async function judgeGeneratedTransitReading(input: {
  surface: GeneratedTransitReportSurface;
  reportKind: string;
  brief: unknown;
  draft: GeneratedTransitReadingDraft;
  ownerEvidence?: string[];
}) {
  const config = reportFulfillmentConfig();
  const provider = config.judgeProvider;
  const model = config.judgeModel;
  const prompt = judgePrompt({ ...input, ownerEvidence: input.ownerEvidence ?? [] });
  const providerResult = provider === "claude" || provider === "anthropic"
    ? await callClaudeJudge(prompt, model)
    : provider === "openai"
      ? await callOpenAiJudge(prompt, input.surface, model)
      : (() => { throw new Error(`Unsupported generated report judge provider '${provider}'.`); })();
  const scores = providerResult.scores;
  const overall = generatedReportJudgeOverall(scores);
  return {
    result: {
      scores,
      overall,
      verdict: generatedReportJudgeVerdict(scores, REPORT_JUDGE_THRESHOLD),
      findings: providerResult.findings
    } satisfies GeneratedReportJudgeResult,
    provider,
    model,
    version: GENERATED_REPORT_JUDGE_ADAPTER_VERSION,
    threshold: REPORT_JUDGE_THRESHOLD
  };
}
