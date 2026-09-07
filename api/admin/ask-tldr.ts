import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized, CONTENT_ADMIN_SESSION_HEADER } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import {
  prepareEvergreenAskTldrCalibration,
  prepareFreeTextAskTldrCalibration
} from "../_lib/ask-tldr-pipeline.js";
import {
  askTldrAnswerCalibrationScope,
  askTldrClassifierCalibrationScope,
  runAskTldrClassifierCalibration,
  runPreparedAskTldrAnswerCalibration,
  type AskTldrProviderCall
} from "../_lib/ask-tldr-provider.js";
import type {
  AskTldrAnswerModelConfig,
  AskTldrPillarDefinition,
  AskTldrPillarId,
  AskTldrQuestionDefinition,
  AskTldrTimeWindow
} from "../_lib/ask-tldr-model.js";
import {
  createTldrAstroReportFactsClient,
  type ReportChartSubject
} from "../_lib/report-facts.js";
import {
  natalPointLongitudesFromChart,
  reportBillingWindow,
  requireReportBirthProfile
} from "../_lib/report-billing-window.js";
import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "../_lib/supabase-report-admin.js";
import { callReportCalibrationModel, judgeModelTarget, writerModelTarget } from "../_lib/report-model-client.js";
import type { ReportDomain, ReportHorizon } from "../_lib/report-types.js";
import answerModelJson from "../../config/ask-tldr/answer-model-v1.json" with { type: "json" };
import manifestJson from "../../config/ask-tldr/manifest.json" with { type: "json" };
import selfJson from "../../config/ask-tldr/pillars/self.json" with { type: "json" };
import loveJson from "../../config/ask-tldr/pillars/love.json" with { type: "json" };
import careerJson from "../../config/ask-tldr/pillars/career.json" with { type: "json" };
import moneyJson from "../../config/ask-tldr/pillars/money.json" with { type: "json" };
import educationJson from "../../config/ask-tldr/pillars/education.json" with { type: "json" };
import homeFamilyJson from "../../config/ask-tldr/pillars/home_family.json" with { type: "json" };
import dailyLifeHealthJson from "../../config/ask-tldr/pillars/daily_life_health.json" with { type: "json" };
import socialJson from "../../config/ask-tldr/pillars/social.json" with { type: "json" };
import spiritualityJson from "../../config/ask-tldr/pillars/spirituality.json" with { type: "json" };

loadLocalWebEnv();

const answerModel = answerModelJson as unknown as AskTldrAnswerModelConfig;
const pillars = [
  selfJson,
  loveJson,
  careerJson,
  moneyJson,
  educationJson,
  homeFamilyJson,
  dailyLifeHealthJson,
  socialJson,
  spiritualityJson
] as unknown as AskTldrPillarDefinition[];
const pillarsById = new Map(pillars.map((pillar) => [pillar.id, pillar]));
const questionsById = new Map(pillars.flatMap((pillar) => pillar.questions.map((question) => [question.id, { pillar, question }] as const)));

const QUESTION_PREFIX = "ask-tldr/question/";
const PREVIEW_PREFIX = "ask-tldr/preview/";
const PREVIEW_HISTORY_LIMIT = 30;
const MAX_BODY_BYTES = 32_000;

type GeneratedContentRow = {
  id: string;
  content_key: string;
  surface?: string | null;
  mode?: string | null;
  status?: string | null;
  headline?: string | null;
  summary?: string | null;
  body?: string | null;
  sections?: Record<string, unknown> | null;
  source_snapshot?: Record<string, unknown> | null;
  review_state?: string | null;
  reviewer_notes?: string | null;
  provider?: string | null;
  model?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type OwnerIdentity = { id: string; email: string | null };

type AskTldrRequestBody = {
  action?: "save_question" | "reset_question" | "preview" | "review_preview";
  questionId?: string;
  displayQuestion?: string;
  pillarId?: AskTldrPillarId;
  freeText?: string;
  previewId?: string;
  decision?: "approved" | "rejected";
  reviewerNotes?: string;
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

async function readBody(req: IncomingMessage): Promise<AskTldrRequestBody> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BODY_BYTES) throw new Error("Ask TLDR admin request is too large.");
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as AskTldrRequestBody;
}

function contentStore(): SupabaseReportAdmin {
  return createSupabaseReportAdmin({
    supabaseUrl: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}

function supabaseAuthConfig() {
  const url = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/u, "");
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.VITE_SUPABASE_ANON_KEY
    ?? process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? "";
  return { url, key };
}

async function ownerIdentity(req: IncomingMessage): Promise<OwnerIdentity | null> {
  const token = words(firstHeader(req.headers[CONTENT_ADMIN_SESSION_HEADER]));
  const { url, key } = supabaseAuthConfig();
  if (!token || !url || !key) return null;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, authorization: `Bearer ${token}` }
  });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as { id?: unknown; email?: unknown } | null;
  const id = words(payload?.id);
  if (!id) return null;
  return { id, email: words(payload?.email) || null };
}

async function askRows(store: SupabaseReportAdmin) {
  return store.request<GeneratedContentRow[]>(
    "generated_interpretations?select=id,content_key,surface,mode,status,headline,summary,body,sections,source_snapshot,review_state,reviewer_notes,provider,model,created_at,updated_at&surface=eq.ask_tldr&order=updated_at.desc&limit=250"
  );
}

function activeQuestionOverlays(rows: GeneratedContentRow[]) {
  const byQuestion = new Map<string, GeneratedContentRow>();
  for (const row of rows) {
    if (row.mode !== "question" || row.status === "ARCHIVED" || !row.content_key.startsWith(QUESTION_PREFIX)) continue;
    const questionId = row.content_key.slice(QUESTION_PREFIX.length);
    if (!byQuestion.has(questionId)) byQuestion.set(questionId, row);
  }
  return byQuestion;
}

function effectivePillars(rows: GeneratedContentRow[]) {
  const overlays = activeQuestionOverlays(rows);
  return pillars.map((pillar) => ({
    id: pillar.id,
    label: pillar.label,
    description: pillar.description ?? "",
    defaultEvidencePriority: pillar.defaultEvidencePriority ?? [],
    questions: pillar.questions.map((question) => {
      const overlay = overlays.get(question.id);
      const displayQuestion = words(overlay?.body) || question.displayQuestion;
      return {
        ...question,
        baseDisplayQuestion: question.displayQuestion,
        displayQuestion,
        edited: Boolean(overlay && displayQuestion !== question.displayQuestion),
        overlayId: overlay?.id ?? null,
        overlayUpdatedAt: overlay?.updated_at ?? null
      };
    })
  }));
}

function previewHistory(rows: GeneratedContentRow[]) {
  return rows
    .filter((row) => row.mode === "preview" && row.content_key.startsWith(PREVIEW_PREFIX))
    .slice(0, PREVIEW_HISTORY_LIMIT)
    .map((row) => ({
      id: row.id,
      question: row.headline ?? "",
      answer: row.body ?? "",
      summary: row.summary ?? "",
      status: row.status ?? "DRAFT",
      reviewState: row.review_state ?? "needs_owner_review",
      reviewerNotes: row.reviewer_notes ?? "",
      provider: row.provider ?? null,
      model: row.model ?? null,
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
      diagnostics: row.sections ?? {}
    }));
}

function chartName(data: unknown, fallback: string | null) {
  const root = record(data);
  const profile = record(root?.profile) ?? root;
  const charts = Array.isArray(profile?.charts) ? profile.charts : [];
  const first = record(charts[0]);
  return words(first?.name) || fallback || "Owner chart";
}

async function ownerChartContext(identity: OwnerIdentity | null, store: SupabaseReportAdmin) {
  if (!identity) {
    return { ready: false as const, reason: "Sign in with the owner account to preview against your chart." };
  }
  try {
    const profileRow = await store.selectOne<{ data?: unknown }>(
      "user_profiles",
      new URLSearchParams({ user_id: `eq.${identity.id}`, select: "data" })
    );
    const socialProfile = await store.selectOne<{ natal_chart?: unknown }>(
      "social_profiles",
      new URLSearchParams({ user_id: `eq.${identity.id}`, select: "natal_chart" })
    );
    const birth = requireReportBirthProfile(profileRow?.data, true);
    const natalPointLongitudes = {
      ...(birth.natalPointLongitudes ?? {}),
      ...natalPointLongitudesFromChart(socialProfile?.natal_chart)
    };
    return {
      ready: true as const,
      userId: identity.id,
      label: chartName(profileRow?.data, identity.email),
      birth,
      natalPointLongitudes
    };
  } catch (error) {
    return {
      ready: false as const,
      reason: error instanceof Error ? error.message.replace(/^[A-Z_]+:\s*/u, "") : "Owner chart could not be loaded."
    };
  }
}

function reportDomainForPillar(pillarId: AskTldrPillarId): ReportDomain {
  if (pillarId === "career" || pillarId === "money" || pillarId === "education") return "work_money";
  if (pillarId === "love" || pillarId === "social") return "love_connection";
  if (pillarId === "daily_life_health") return "personal_health";
  return "general";
}

function reportHorizon(timeWindow: AskTldrTimeWindow): ReportHorizon {
  return timeWindow;
}

function reportSubject(chart: Awaited<ReturnType<typeof ownerChartContext>> & { ready: true }): ReportChartSubject {
  const location = chart.birth.birthLocation!;
  return {
    name: chart.label,
    datetime: {
      date: chart.birth.birthDate,
      time: chart.birth.birthTime,
      timeKnown: Boolean(chart.birth.birthTime && !chart.birth.birthTimeUnknown),
      timeZone: location.timeZone ?? null
    },
    location,
    settings: { houseSystem: "whole_sign", zodiac: "tropical", aspectProfile: "standard" }
  };
}

async function calculatedReportWindow(input: {
  chart: Awaited<ReturnType<typeof ownerChartContext>> & { ready: true };
  pillarId: AskTldrPillarId;
  timeWindow: AskTldrTimeWindow;
  now: Date;
}) {
  const horizon = reportHorizon(input.timeWindow);
  const window = reportBillingWindow({
    horizon,
    purchasedAt: input.now.toISOString(),
    birthDate: input.chart.birth.birthDate
  });
  const subject = reportSubject(input.chart);
  return createTldrAstroReportFactsClient().reportWindow({
    natalSubject: subject,
    location: subject.location,
    reportDomain: reportDomainForPillar(input.pillarId),
    reportHorizon: horizon,
    start: window.start,
    end: window.end,
    natalPointLongitudes: input.chart.natalPointLongitudes
  });
}

const callModel: AskTldrProviderCall = async ({ role, prompt, schemaName, schema }) => {
  const target = role === "judge" ? judgeModelTarget() : writerModelTarget();
  return callReportCalibrationModel({
    provider: target.provider,
    model: target.model,
    prompt,
    schemaName,
    schema
  });
};

function summarizeEvidence(prepared: ReturnType<typeof prepareEvergreenAskTldrCalibration>) {
  return prepared.questionBoundPacket.evidence.map((factor) => ({
    id: factor.id,
    role: factor.role,
    label: "label" in factor ? factor.label : factor.id,
    kind: factor.kind,
    temporalState: factor.temporalState,
    exactAt: factor.exactAt ?? null,
    startsAt: factor.startsAt ?? null,
    endsAt: factor.endsAt ?? null,
    houses: factor.houses ?? [],
    angles: factor.angles ?? [],
    points: factor.points ?? [],
    score: "score" in factor ? factor.score : null,
    relevance: {
      status: factor.questionRelevance.status,
      matched: factor.questionRelevance.matched,
      canonicalIds: factor.questionRelevance.canonicalIds
    },
    meaningStatus: factor.governedMeaning.status,
    provenance: factor.provenance
  }));
}

async function savePreviewDraft(input: {
  store: SupabaseReportAdmin;
  pillarId: AskTldrPillarId;
  questionId: string | null;
  questionText: string;
  source: "evergreen" | "free_text";
  prepared: ReturnType<typeof prepareEvergreenAskTldrCalibration>;
  result: Awaited<ReturnType<typeof runPreparedAskTldrAnswerCalibration>>;
  classifier: unknown;
}) {
  const writerCall = input.result.calls.find((call) => call.role === "writer");
  const previewKey = `${PREVIEW_PREFIX}${crypto.randomUUID()}`;
  const rows = await input.store.insert<GeneratedContentRow>("generated_interpretations", {
    content_key: previewKey,
    surface: "ask_tldr",
    mode: "preview",
    status: "DRAFT",
    headline: input.questionText,
    summary: input.result.status,
    body: input.result.writerOutput.answer,
    sections: {
      schema: "ask-tldr-owner-preview-draft.v1",
      ownerPreviewOnly: true,
      runtimeEnabled: false,
      pillarId: input.pillarId,
      questionId: input.questionId,
      source: input.source,
      plan: input.prepared.plan,
      evidence: summarizeEvidence(input.prepared),
      relevanceReceiptSha256: input.prepared.relevanceReceipt.receiptSha256,
      voiceReceiptSha256: input.prepared.voiceReceipt.receiptSha256,
      factLock: input.result.factLock,
      judge: input.result.judge,
      releasePacket: input.result.releasePacket,
      calls: input.result.calls,
      classifier: input.classifier
    },
    source_snapshot: {
      contentSystem: "ask-tldr-owner-preview",
      answerModelVersion: answerModel.version,
      taxonomyVersion: manifestJson.version,
      writerRequestSha256: input.prepared.writerRequest?.requestSha256 ?? null,
      ownerPreviewOnly: true,
      runtimeEnabled: false
    },
    review_state: "needs_owner_review",
    reviewer_notes: null,
    provider: writerCall?.provider ?? null,
    model: writerCall?.model ?? null
  });
  return rows[0]?.id ?? null;
}

async function saveQuestionOverlay(store: SupabaseReportAdmin, questionId: string, displayQuestion: string) {
  const found = questionsById.get(questionId);
  if (!found) throw new Error(`Unknown Ask TLDR question '${questionId}'.`);
  const normalized = displayQuestion.trim().replace(/\s+/gu, " ");
  if (normalized.length < 3 || normalized.length > 240) {
    throw new Error("Question wording must be between 3 and 240 characters.");
  }
  const contentKey = `${QUESTION_PREFIX}${questionId}`;
  const existing = await store.selectOne<GeneratedContentRow>(
    "generated_interpretations",
    new URLSearchParams({ content_key: `eq.${contentKey}`, mode: "eq.question", status: "neq.ARCHIVED", select: "*", order: "updated_at.desc" })
  );
  const row = {
    content_key: contentKey,
    surface: "ask_tldr",
    mode: "question",
    status: "DRAFT",
    headline: found.pillar.label,
    summary: found.question.primaryIntent,
    body: normalized,
    sections: {
      schema: "ask-tldr-question-overlay.v1",
      immutableRouting: {
        primaryIntent: found.question.primaryIntent,
        secondaryIntents: found.question.secondaryIntents,
        questionTypes: found.question.questionTypes,
        defaultTimeWindow: found.question.defaultTimeWindow,
        evidenceFocus: found.question.evidenceFocus ?? []
      }
    },
    source_snapshot: {
      contentSystem: "ask-tldr-question-overlay",
      questionId,
      pillarId: found.pillar.id,
      baseDisplayQuestion: found.question.displayQuestion,
      taxonomyVersion: manifestJson.version,
      ownerPreviewOnly: true,
      runtimeEnabled: false
    },
    review_state: "owner_override",
    provider: "owner-authored",
    model: null
  };
  if (existing?.id) {
    const params = new URLSearchParams({ id: `eq.${existing.id}` });
    const updated = await store.update<GeneratedContentRow>("generated_interpretations", params.toString(), row);
    return updated[0] ?? existing;
  }
  const inserted = await store.insert<GeneratedContentRow>("generated_interpretations", row);
  return inserted[0] ?? null;
}

async function resetQuestionOverlay(store: SupabaseReportAdmin, questionId: string) {
  if (!questionsById.has(questionId)) throw new Error(`Unknown Ask TLDR question '${questionId}'.`);
  const contentKey = `${QUESTION_PREFIX}${questionId}`;
  const rows = await store.request<GeneratedContentRow[]>(
    `generated_interpretations?select=id,content_key,status&content_key=eq.${encodeURIComponent(contentKey)}&mode=eq.question&status=neq.ARCHIVED`
  );
  for (const row of rows) {
    const params = new URLSearchParams({ id: `eq.${row.id}` });
    await store.update<GeneratedContentRow>("generated_interpretations", params.toString(), {
      status: "ARCHIVED",
      review_state: "reset_to_package"
    });
  }
  return rows.length;
}

async function reviewPreview(store: SupabaseReportAdmin, previewId: string, decision: "approved" | "rejected", reviewerNotes: string) {
  const existing = await store.selectOne<GeneratedContentRow>(
    "generated_interpretations",
    new URLSearchParams({ id: `eq.${previewId}`, surface: "eq.ask_tldr", mode: "eq.preview", select: "*" })
  );
  if (!existing) throw new Error("Ask TLDR preview draft was not found.");
  const params = new URLSearchParams({ id: `eq.${previewId}` });
  const updated = await store.update<GeneratedContentRow>("generated_interpretations", params.toString(), {
    status: decision === "approved" ? "REVIEWED" : "ARCHIVED",
    review_state: decision,
    reviewer_notes: reviewerNotes.trim() || null
  });
  return updated[0] ?? existing;
}

async function previewAnswer(input: {
  body: AskTldrRequestBody;
  rows: GeneratedContentRow[];
  identity: OwnerIdentity | null;
  store: SupabaseReportAdmin;
}) {
  const pillarId = input.body.pillarId;
  if (!pillarId || !pillarsById.has(pillarId)) throw new Error("Choose an Ask TLDR pillar first.");
  const pillar = pillarsById.get(pillarId)!;
  const overlays = activeQuestionOverlays(input.rows);
  const now = new Date();
  const freeText = words(input.body.freeText);
  let questionId: string | null = null;
  let questionText = "";
  let timeWindow: AskTldrTimeWindow;
  let classificationResult: Awaited<ReturnType<typeof runAskTldrClassifierCalibration>> | null = null;

  if (freeText) {
    questionText = freeText;
    const classifierScope = askTldrClassifierCalibrationScope({ pillarId, questionText });
    classificationResult = await runAskTldrClassifierCalibration({
      pillar,
      questionText,
      authorization: {
        authorized: true,
        purpose: "ask_tldr_calibration",
        scopeSha256: classifierScope,
        maxCalls: 1
      },
      callModel
    });
    timeWindow = classificationResult.classification.timeWindow ?? "4_months";
  } else {
    questionId = words(input.body.questionId);
    const source = pillar.questions.find((question) => question.id === questionId);
    if (!source) throw new Error("Choose an evergreen question from the selected pillar.");
    const overlay = overlays.get(source.id);
    questionText = words(overlay?.body) || source.displayQuestion;
    timeWindow = source.defaultTimeWindow;
  }

  const chart = await ownerChartContext(input.identity, input.store);
  if (!chart.ready) {
    return {
      ok: true as const,
      ownerPreviewOnly: true as const,
      runtimeEnabled: false as const,
      preview: null,
      preparation: { allowed: false, reason: chart.reason },
      chart: { ready: false, reason: chart.reason }
    };
  }
  const reportWindow = await calculatedReportWindow({ chart, pillarId, timeWindow, now });

  let prepared;
  if (freeText && classificationResult) {
    prepared = prepareFreeTextAskTldrCalibration({
      model: answerModel,
      pillar,
      questionText,
      classification: classificationResult.classification,
      reportWindow,
      now
    });
  } else {
    const sourceQuestion = pillar.questions.find((question) => question.id === questionId)!;
    const effectiveQuestion: AskTldrQuestionDefinition = { ...sourceQuestion, displayQuestion: questionText };
    const effectivePillar: AskTldrPillarDefinition = {
      ...pillar,
      questions: pillar.questions.map((question) => question.id === effectiveQuestion.id ? effectiveQuestion : question)
    };
    prepared = prepareEvergreenAskTldrCalibration({
      model: answerModel,
      pillar: effectivePillar,
      question: effectiveQuestion,
      reportWindow,
      now
    });
  }

  if (!prepared.preparationAllowed || !prepared.writerRequest) {
    return {
      ok: true as const,
      ownerPreviewOnly: true as const,
      runtimeEnabled: false as const,
      preview: null,
      preparation: {
        allowed: false,
        reason: prepared.preparationBlockReason,
        candidateCount: prepared.candidateCount,
        evidence: summarizeEvidence(prepared)
      },
      chart: { ready: true, label: chart.label }
    };
  }

  const scope = askTldrAnswerCalibrationScope(prepared);
  const result = await runPreparedAskTldrAnswerCalibration({
    prepared,
    authorization: {
      authorized: true,
      purpose: "ask_tldr_calibration",
      scopeSha256: scope,
      maxCalls: 2
    },
    callModel
  });
  const draftId = await savePreviewDraft({
    store: input.store,
    pillarId,
    questionId,
    questionText,
    source: freeText ? "free_text" : "evergreen",
    prepared,
    result,
    classifier: classificationResult
  }).catch(() => null);

  return {
    ok: true as const,
    ownerPreviewOnly: true as const,
    runtimeEnabled: false as const,
    chart: { ready: true, label: chart.label },
    preparation: {
      allowed: true,
      candidateCount: prepared.candidateCount,
      evidence: summarizeEvidence(prepared),
      relevanceReceiptSha256: prepared.relevanceReceipt.receiptSha256,
      voiceReceiptSha256: prepared.voiceReceipt.receiptSha256
    },
    preview: {
      draftId,
      source: freeText ? "free_text" : "evergreen",
      pillarId,
      questionId,
      questionText,
      answer: result.writerOutput.answer,
      factLock: result.factLock,
      judge: result.judge,
      releaseStatus: result.releasePacket?.releaseStatus ?? "blocked",
      blockers: result.releasePacket?.blockers ?? [],
      calls: result.calls,
      classifier: classificationResult
    }
  };
}

async function getPayload(req: IncomingMessage) {
  let store: SupabaseReportAdmin | null = null;
  let rows: GeneratedContentRow[] = [];
  let storageError: string | null = null;
  try {
    store = contentStore();
    rows = await askRows(store);
  } catch (error) {
    storageError = error instanceof Error ? error.message : "Ask TLDR draft storage is unavailable.";
  }
  const identity = await ownerIdentity(req).catch(() => null);
  const chart = store ? await ownerChartContext(identity, store) : {
    ready: false as const,
    reason: "Ask TLDR draft storage is unavailable, so the owner chart cannot be loaded here."
  };
  return {
    ok: true as const,
    ownerPreviewOnly: true as const,
    runtimeEnabled: false as const,
    governance: {
      taxonomyVersion: manifestJson.version,
      answerModelVersion: answerModel.version,
      status: answerModelJson.status,
      ownerApproved: answerModelJson.ownerApproved,
      promotionAuthorized: answerModelJson.promotionAuthorized,
      runtimeEnabled: answerModelJson.runtimeEnabled,
      pillarCount: manifestJson.pillarCount,
      questionCount: manifestJson.questionCount
    },
    storage: { available: Boolean(store && !storageError), error: storageError },
    chart: chart.ready ? { ready: true, label: chart.label } : { ready: false, reason: chart.reason },
    pillars: effectivePillars(rows),
    history: previewHistory(rows)
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  try {
    if (req.method === "GET") {
      sendJson(res, 200, await getPayload(req));
      return;
    }
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "Use GET or POST." });
      return;
    }
    const body = await readBody(req);
    const store = contentStore();
    if (body.action === "save_question") {
      const questionId = words(body.questionId);
      const displayQuestion = words(body.displayQuestion);
      const row = await saveQuestionOverlay(store, questionId, displayQuestion);
      sendJson(res, 200, { ok: true, ownerPreviewOnly: true, runtimeEnabled: false, row });
      return;
    }
    if (body.action === "reset_question") {
      const archived = await resetQuestionOverlay(store, words(body.questionId));
      sendJson(res, 200, { ok: true, ownerPreviewOnly: true, runtimeEnabled: false, archived });
      return;
    }
    if (body.action === "review_preview") {
      const previewId = words(body.previewId);
      if (!previewId || (body.decision !== "approved" && body.decision !== "rejected")) {
        throw new Error("Preview id and approved/rejected decision are required.");
      }
      const row = await reviewPreview(store, previewId, body.decision, words(body.reviewerNotes));
      sendJson(res, 200, { ok: true, ownerPreviewOnly: true, runtimeEnabled: false, row });
      return;
    }
    if (body.action === "preview") {
      const rows = await askRows(store);
      const identity = await ownerIdentity(req);
      sendJson(res, 200, await previewAnswer({ body, rows, identity, store }));
      return;
    }
    sendJson(res, 400, { ok: false, error: "Unknown Ask TLDR admin action." });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      ownerPreviewOnly: true,
      runtimeEnabled: false,
      error: error instanceof Error ? error.message : "Ask TLDR Content Studio request failed."
    });
  }
}
