import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
// The canonical stage resolver is shared by Content Studio and the future serving promotion.
// @ts-ignore The governed JavaScript resolver intentionally has no declaration file.
import { renderSkyV4StudioPreview } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
// @ts-ignore Calendar aspect drafts use the same governed Content Studio shape without changing serving copy.
import {
  calendarAspectStudioRecord,
  renderCalendarAspectStudioPreview
} from "../../apps/web/src/content/fallbackArchitectureV3/resolver/calendarAspectContentStudio.mjs";

loadLocalWebEnv();
const require = createRequire(import.meta.url);
const corpus = require("../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json");
const governedAspectCorpus = require("../../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json");
const calendarAspectDrafts = require("../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-consequence-first-drafts-v1.json");
const composedCalendarCards = require("../../packages/astro-knowledge/data/sky-calendar/composed-cards-v1.json");
const placementLunarManifest = require("../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1.json");
const placementLunarRecords = placementLunarManifest.chunk_files.flatMap((fileName: string) => (
  require(`../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/${fileName}`).records
));

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "private, no-store");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > 1_000_000) throw new Error("Preview request is too large.");
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function calendarAspectDraftForKey(contentKey: string) {
  return Array.isArray(calendarAspectDrafts.drafts)
    ? calendarAspectDrafts.drafts.find((draft: Record<string, unknown>) => draft.contentKey === contentKey)
    : undefined;
}

function calendarAspectSourceForDraft(draft: Record<string, unknown>) {
  if (draft.sourceKind === "composed-card") {
    return Array.isArray(composedCalendarCards.cards)
      ? composedCalendarCards.cards.find((row: Record<string, unknown>) => row.id === draft.contentKey)
      : undefined;
  }
  return Array.isArray(governedAspectCorpus.hookRows)
    ? governedAspectCorpus.hookRows.find((row: Record<string, unknown>) => row.contentKey === draft.contentKey)
    : undefined;
}

export function normalizeSkyV4PreviewInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Preview selection is missing.");
  const input = value as Record<string, unknown>;
  const contentKey = typeof input.contentKey === "string" ? input.contentKey : "";
  if (!/^(?:sky-placement|sky-lunation|sky-nodes|sky-lilith|sky-context|sky-v4|sky-card|fallback-hook\/sky-aspect-sign)\//u.test(contentKey)) {
    throw new Error("Choose a canonical SKY V4 or staged Calendar aspect content record.");
  }
  const draftFields = input.draftFields && typeof input.draftFields === "object" && !Array.isArray(input.draftFields)
    ? input.draftFields as Record<string, unknown>
    : {};
  if (Object.keys(draftFields).length > 16) throw new Error("Too many draft fields were supplied.");
  const boundedArray = (key: string, max: number) => Array.isArray(input[key]) ? input[key].slice(0, max) : [];
  const boundedRecord = (key: string) => input[key] && typeof input[key] === "object" && !Array.isArray(input[key])
    ? input[key] as Record<string, unknown>
    : {};
  const boundedString = (key: string) => typeof input[key] === "string" ? String(input[key]).slice(0, 20_000) : "";
  const calendarDraft = calendarAspectDraftForKey(contentKey) as Record<string, unknown> | undefined;
  let calendarAspectSource: Record<string, unknown> | undefined;
  if (calendarDraft) {
    const source = calendarAspectSourceForDraft(calendarDraft) as Record<string, unknown> | undefined;
    if (!source) throw new Error("The staged Calendar aspect lost its serving source baseline.");
    const unexpected = Object.keys(draftFields).filter((field) => field !== "Body");
    if (unexpected.length) throw new Error(`Calendar aspect drafts may only edit Body: ${unexpected.join(", ")}.`);
    calendarAspectSource = calendarAspectStudioRecord(source, calendarDraft) as Record<string, unknown>;
  }
  const governedAspectSource = !calendarDraft && contentKey.startsWith("fallback-hook/sky-aspect-sign/")
    ? governedAspectCorpus.hookRows.find((row: Record<string, unknown>) => row.contentKey === contentKey && row.review_status === "approved")
    : undefined;
  if (!calendarDraft && contentKey.startsWith("fallback-hook/sky-aspect-sign/") && !governedAspectSource) {
    throw new Error("Choose an approved governed aspect record or a staged Calendar aspect draft.");
  }
  const placementLunarContextSource = contentKey.startsWith("sky-placement/lunar-context/")
    ? placementLunarRecords.find((row: Record<string, unknown>) => row.ContentKey === contentKey)
    : undefined;
  return {
    contentKey,
    draftFields,
    governedAspectSource,
    calendarAspectSource,
    placementLunarContextSource: placementLunarContextSource ? {
      ...placementLunarContextSource,
      contentKey: placementLunarContextSource.ContentKey,
      headline: `${placementLunarContextSource.Planet} · ${placementLunarContextSource.EventLabel}`,
      studio_content_type: "placement-lunar-context",
      studio_editable_fields: [
        { path: "FullPageBody", label: "Full-page context" },
        { path: "FallbackBody", label: "Fallback context" }
      ],
      source_baseline_sha256: placementLunarManifest.copy_sha256,
      serving_enabled: false
    } : undefined,
    dateLine: boundedString("dateLine"),
    cycleContext: boundedString("cycleContext"),
    eclipseContext: boundedString("eclipseContext"),
    facts: boundedRecord("facts"),
    contexts: boundedArray("contexts", 12),
    motionConditions: boundedArray("motionConditions", 12),
    aspects: boundedArray("aspects", 24),
    eventContextAspectIds: boundedArray("eventContextAspectIds", 24),
    overlaySettings: boundedRecord("overlaySettings"),
    overlaySuppressions: boundedRecord("overlaySuppressions"),
    previewSurface: boundedRecord("previewSurface"),
    exactAvailable: input.exactAvailable !== false,
    signFallbackAvailable: input.signFallbackAvailable !== false,
    genericFallbackAvailable: input.genericFallbackAvailable !== false
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST." });
    return;
  }
  try {
    const input = normalizeSkyV4PreviewInput(await readJsonBody(req));
    const rendered = input.calendarAspectSource
      ? renderCalendarAspectStudioPreview(input.calendarAspectSource, {
          body: typeof input.draftFields.Body === "string" ? input.draftFields.Body : input.calendarAspectSource.Body,
          dateLine: input.dateLine
        })
      : renderSkyV4StudioPreview(corpus, input);
    sendJson(res, 200, { ok: true, rendered });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : "The SKY V4 preview could not be assembled." });
  }
}
