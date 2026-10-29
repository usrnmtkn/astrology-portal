import { articleTemplateWithHoroscopes } from "../../apps/web/src/content/skyArticleHoroscopes.mjs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { AdminHttpError, adminErrorStatus, adminFetchJson, adminStorageRows, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { requireContentAdmin } from "../_lib/admin-auth.js";
import { defaultIngressOpenAiModel, generateSkyArticleTemplateSlots, RejectedSkyArticleDraftError } from "../_lib/content-generation.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { calculateSkyArticleEditionFacts } from "../_lib/sky-article-facts.js";
import {
  skyArticleTemplateSlotNeedsAdditionalFacts,
  unfinishedSkyArticleTemplateSlots
} from "../_lib/sky-article-template-slots.js";
import { skyArticleTemplatePlaceholders } from "../../apps/web/src/content/skyArticleTemplateCompiler.js";
import { isSkyIngressEssay, isSkyIngressArticle, skyIngressTemplateForFormat, SKY_INGRESS_ARTICLE_FORMAT, type SkyArticleFormat } from "../../apps/web/src/content/skyIngressEssay.mjs";
import { ingressWriterContractReceipt } from '../_lib/transit-ingress-editorial-authority.js';
import { hasVerifiedSameSignHistory } from "../../apps/web/src/services/retrogradeHistory.js";
import { loadSkySeasonMeaning } from '../_lib/sky-season-meaning.js';
import { buildSkyIngressWritingContext, buildIngressTemplateReference } from '../_lib/sky-ingress-writing.js';
import { approvedVoiceStyleReference } from '../../src/astro-writing/approvedVoiceStyle.mjs';
import { loadExplicitWritingFeedback, ingressWritingFeedbackTarget } from '../_lib/studio-explicit-writing-feedback.js';
import { createHash } from 'node:crypto';
import { skyArticleVisitReference } from '../_lib/sky-article-visit-reference.js';

loadLocalWebEnv();

type TemplateRow = {
  id: string;
  content_key: string;
  headline?: string | null;
  body?: string | null;
  sections?: unknown;
  status?: string | null;
  lane?: string | null;
  review_state?: string | null;
  event_type?: string | null;
  source_snapshot?: Record<string, unknown> | null;
};

type RequestBody = {
  expectedModel?: string;
  includeRetrogradeHistory?: boolean;
  format?: SkyArticleFormat;
  templateId?: string;
  visit?: { planet: string; sign: string };
  articleScope?: 'visit' | 'day';
  referenceDate?: string;
  existingSlotValues?: Record<string, unknown>;
  provider?: "openai" | "claude" | "anthropic";
  voiceNotes?: string;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function adminHeaders() {
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, authorization: `Bearer ${key}` };
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL")).replace(/\/$/u, "");
}

async function loadApprovedTemplate(templateId: string) {
  const params = new URLSearchParams({
    id: `eq.${templateId}`,
    select: "id,content_key,headline,body,sections,status,lane,review_state,event_type,source_snapshot",
    limit: "1"
  });
  const response = await adminFetchJson(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
    headers: adminHeaders()
  });
  const payload = response.payload;
  if (!response.ok) {
    throw new AdminHttpError(502, `Could not load the canonical template: ${JSON.stringify(payload)}`);
  }
  const row = adminStorageRows<TemplateRow>(payload)[0];
  if (!row) throw new AdminHttpError(404, "The selected Sky article template no longer exists.");

  const reviewStatus = typeof row.source_snapshot?.review_status === "string"
    ? row.source_snapshot.review_status.trim().toLowerCase()
    : "";
  const approved = ["REVIEWED", "LIVE"].includes(row.status ?? "")
    && (row.lane ?? "reference") === "reference"
    && !row.review_state
    && ["approved", "approved_reuse", "reviewed"].includes(reviewStatus);
  if (row.event_type !== "sky-article-template" || !approved) {
    throw new AdminHttpError(422, "AI fields can be generated only from an approved, non-serving Sky article template.");
  }
  if (!row.body?.trim()) throw new AdminHttpError(422, "The selected Sky article template has no body.");
  return row;
}

function templatePlanet(row: Pick<TemplateRow, 'content_key' | 'headline'>) {
  const fromKey = row.content_key.match(/^sky(?:\/|-)article-template\/([a-z-]+)\//u)?.[1];
  if (fromKey && !["slow-mover", "nodes"].includes(fromKey)) return fromKey;
  return row.headline?.match(/(?:article\s+—\s+)?([A-Za-z-]+)\s+(?:Enters|in)\b/u)?.[1]?.toLowerCase() ?? null;
}

function existingStringValues(value: Record<string, unknown> | undefined) {
  return Object.fromEntries(Object.entries(value ?? {})
    .filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function visitReference(value: unknown, format: unknown) {
  try { return skyArticleVisitReference(value, format); }
  catch (error) { throw new AdminHttpError(400, error instanceof Error ? error.message : 'Invalid dated visit.'); }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const inspect = req.method === 'GET' && new URL(req.url ?? '/', 'http://studio.invalid').searchParams.get('inspect') === 'ingress-voice';
  if (req.method !== "POST" && !inspect) {
    sendAdminMethodNotAllowed(res, ["POST", "GET"]);
    return;
  }
  if (!await requireContentAdmin(req, res)) return;

  try {
    if (inspect) {
      const params = new URL(req.url ?? '/', 'http://studio.invalid').searchParams;
      let correctionDelivery;
      let templateKey: string | undefined;
      const templateId = params.get('templateId')?.trim();
      if (params.has('templateId')) {
        if (!templateId) throw new AdminHttpError(400, 'templateId is required for correction inspection.');
        if (templateId !== 'builtin:moon-ingress-v3') {
          if (params.has('planet') || params.has('sign')) throw new AdminHttpError(400, 'Choose a saved template or a visit for inspection.');
          const template = await loadApprovedTemplate(templateId);
          templateKey = template.content_key.replace(/^sky-article-template\//u, 'sky/article-template/');
        }
      }
      if (!templateKey && (params.has('planet') || params.has('sign') || templateId)) {
        const reference = visitReference({ planet: params.get('planet') ?? (templateId ? 'moon' : undefined), sign: params.get('sign') }, SKY_INGRESS_ARTICLE_FORMAT);
        templateKey = reference?.content_key;
      }
      if (templateKey) {
        const feedback = await loadExplicitWritingFeedback(ingressWritingFeedbackTarget(templateKey));
        correctionDelivery = { templateKey, ...feedback.receipt,
          sectionSha256: createHash('sha256').update(feedback.prompt).digest('hex') };
      }
      const source = approvedVoiceStyleReference({surface:'sky',family:'sky-ingress-essay'});
      sendAdminJson(res, 200, {ok:true,scope:'sky-ingress-essay',voiceBenchmark:source.receipt,
        writerContract:ingressWriterContractReceipt(),
        ...(correctionDelivery ? {correctionDelivery} : {}),
        sourcePolicy:{meaning:'knowledge-base-and-calendar',facts:'calculated-ingress-coverage',voice:'selected-style-references'},
        providerCalls:0,saved:false,published:false});
      return;
    }
    const body = await readAdminJsonBody<RequestBody>(req, 256_000);
    if (body.format === undefined) throw new AdminHttpError(400, "Choose an explicit ingress or saved-guide format before generation.");
    if (body.expectedModel !== undefined) {
      if (typeof body.expectedModel !== 'string' || !body.expectedModel.trim()
        || !isSkyIngressEssay(body.format) || body.provider !== 'openai') throw new AdminHttpError(400, 'expectedModel requires an OpenAI ingress request.');
      if (body.expectedModel !== (process.env.OPENAI_INGRESS_MODEL ?? defaultIngressOpenAiModel)) {
        throw new AdminHttpError(409, 'The configured ingress model differs from the requested model. No generation was sent.');
      }
    }
    if (body.includeRetrogradeHistory !== undefined && typeof body.includeRetrogradeHistory !== "boolean") throw new AdminHttpError(400, "includeRetrogradeHistory must be a boolean.");
    if (body.format !== undefined && body.format !== "saved-template" && !isSkyIngressEssay(body.format)) throw new AdminHttpError(400, "Unsupported article format.");
    if (isSkyIngressEssay(body.format) && !isSkyIngressArticle(body.format)) throw new AdminHttpError(409, 'Generation for this ingress format is retired. Select Ingress article to use the current ingress writer. Saved text remains unchanged.');
    if (body.articleScope === 'day') throw new AdminHttpError(409, 'New generation uses the full calculated visit. Open a saved day article to edit its existing wording and coverage.');
    if (body.articleScope !== undefined && body.articleScope !== 'visit') throw new AdminHttpError(400, 'Choose full-visit article coverage.');
    const visit = visitReference(body.visit, body.format);
    const builtinMoon = body.templateId === 'builtin:moon-ingress-v3';
    if (visit && body.templateId !== undefined) throw new AdminHttpError(400, 'Choose a dated visit or a saved template, not both.');
    if (builtinMoon && !isSkyIngressArticle(body.format)) throw new AdminHttpError(400, 'The standard Moon layout requires the current ingress article format.');
    if (!visit && (typeof body.templateId !== "string" || !body.templateId.trim())) throw new AdminHttpError(400, "templateId is required.");
    if (body.provider !== undefined && !["openai", "claude", "anthropic"].includes(body.provider)) throw new AdminHttpError(400, "Invalid provider.");
    if (body.voiceNotes !== undefined && typeof body.voiceNotes !== "string") throw new AdminHttpError(400, "voiceNotes must be text.");
    if (body.existingSlotValues !== undefined && (!body.existingSlotValues || typeof body.existingSlotValues !== "object" || Array.isArray(body.existingSlotValues) || Object.values(body.existingSlotValues).some((value) => typeof value !== "string"))) throw new AdminHttpError(400, "existingSlotValues must contain text fields.");
    const referenceDate = body.referenceDate ?? new Date().toISOString().slice(0, 10);
    const instant = new Date(`${referenceDate}T12:00:00.000Z`);
    if (typeof referenceDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(referenceDate) || !Number.isFinite(instant.getTime()) || instant.toISOString().slice(0, 10) !== referenceDate) throw new AdminHttpError(400, "referenceDate must be a valid YYYY-MM-DD date.");

    const savedTemplate = visit || builtinMoon ? null : await loadApprovedTemplate(body.templateId!.trim());
    const planet = builtinMoon ? 'moon' : visit?.planet ?? (savedTemplate && templatePlanet(savedTemplate));
    if (!planet) throw new Error("The selected template does not identify one Sky planet.");
    const ingress = isSkyIngressEssay(body.format);
    const facts = await calculateSkyArticleEditionFacts(instant, planet, body.format);
    const reference = visit ?? (builtinMoon ? visitReference({ planet: 'moon', sign: facts.sign }, body.format) : null);
    const template: Pick<TemplateRow, 'content_key' | 'body' | 'headline' | 'sections' | 'source_snapshot'> = reference ?? savedTemplate!;
    if (visit && facts.sign !== visit.sign) throw new AdminHttpError(422, 'The selected date is in a different sign. Choose the calculated placement before generating.');
    if (ingress && "nasa" in facts && facts.nasa.status === "disagreement") throw new AdminHttpError(422, "Swiss and NASA/JPL positions disagree. Resolve the calculation evidence before writing.");
    const templateSign = template.content_key.split("/").at(-1);
    if (ingress && ![facts.sign, "ingress"].includes(templateSign ?? "")) throw new AdminHttpError(422, "The reference date is in a different sign. Open the template for the calculated placement.");
    const completeTemplate = ingress ? skyIngressTemplateForFormat(body.format) : articleTemplateWithHoroscopes(template.body ?? "", template.sections);
    const placeholders = ingress ? [...facts.templateFields] : skyArticleTemplatePlaceholders(completeTemplate)
      .filter((placeholder) => placeholder.name !== "risingBlocks")
      .map((placeholder) => ({ ...placeholder,
        description: (template.source_snapshot?.editorialImport as {slotDescriptions?: Record<string, string[]>} | undefined)?.slotDescriptions?.[placeholder.name]?.join("\n") || placeholder.description
      }));
    const existingSlotValues = existingStringValues(body.existingSlotValues);
    const unfinished = unfinishedSkyArticleTemplateSlots({
      placeholders,
      calculatedSlotValues: facts.slotValues,
      existingSlotValues
    });
    const includeHistory = body.includeRetrogradeHistory === true && hasVerifiedSameSignHistory(facts.retrogradeHistory);
    const needsFacts = (slot: { name: string; description?: string }) => ingress
      ? (slot.name === "priorOccurrenceSection" && !includeHistory) || (slot.name === "majorTransitSections" && !("events" in facts && facts.events.some(event => event.type === "aspect")))
      : skyArticleTemplateSlotNeedsAdditionalFacts(slot);
    const blockedSlots = unfinished.filter(needsFacts);
    const requestedSlots = unfinished.filter((slot) => !needsFacts(slot));
    if (!requestedSlots.length) {
      sendAdminJson(res, 200, {
        ok: true,
        slotValues: {},
        blockedSlots,
        facts,
        generation: null,
        message: blockedSlots.length
          ? "The remaining fields need additional verified facts or selected retrograde history and were not sent to the model."
          : "There are no unfinished AI-eligible template fields."
      });
      return;
    }

    const seasonMeaning = await loadSkySeasonMeaning(facts.planet, facts.sign);
    const writingFacts = { ...facts, retrogradeHistory: includeHistory ? facts.retrogradeHistory : undefined,
      retrogradeHistoryIncluded: includeHistory };
    const generation = await generateSkyArticleTemplateSlots({
      templateKey: template.content_key.replace(/^sky-article-template\//u, "sky/article-template/"),
      templateBody: completeTemplate,
      planet: facts.planet,
      sign: facts.sign,
      facts: writingFacts,
      requestedSlots,
      provider: body.provider,
      voiceNotes: body.voiceNotes,
      seasonMeaning,
      ...(ingress ? { ingressWriting: buildSkyIngressWritingContext(writingFacts),
        ingressTemplateReference: buildIngressTemplateReference(template.content_key, template.body!) } : {}),
    });
    sendAdminJson(res, 200, {
      ok: true,
      slotValues: generation.slotValues,
      blockedSlots,
      facts,
      generation: {
        retrogradeHistory: includeHistory ? facts.retrogradeHistory : null,
        provider: generation.provider,
        model: generation.model,
        responseId: generation.responseId ?? null,
        ...(generation.providerCalls !== undefined ? { providerCalls: generation.providerCalls } : {}),
        generatedAt: generation.generatedAt,
        requestedSlots: generation.requestedSlots,
        generationMetadata: generation.generation_metadata ?? null,
        memoryReceipt: generation.memoryReceipt ?? null,
        ...(reference ? { templateOrigin: reference.origin } : {}),
        ...(generation.ingressValidation ? { ingressValidation: generation.ingressValidation } : {})
      }
    });
  } catch (error) {
    if (error instanceof RejectedSkyArticleDraftError) {
      sendAdminJson(res, 422, { ok: false, error: error.message, rejectedGeneration: error.candidate });
      return;
    }
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Sky article template slot error."
    });
  }
}
