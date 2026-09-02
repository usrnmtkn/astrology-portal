import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
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
  return {
    contentKey,
    draftFields,
    governedAspectSource,
    calendarAspectSource,
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
    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "POST") {
    sendAdminMethodNotAllowed(res, ["POST"]);
    return;
  }
  try {
    const input = normalizeSkyV4PreviewInput(await readAdminJsonBody<unknown>(req, 1_000_000));
    const rendered = input.calendarAspectSource
      ? renderCalendarAspectStudioPreview(input.calendarAspectSource, {
          body: typeof input.draftFields.Body === "string" ? input.draftFields.Body : input.calendarAspectSource.Body,
          dateLine: input.dateLine
        })
      : renderSkyV4StudioPreview(corpus, input);
    sendAdminJson(res, 200, { ok: true, rendered });
  } catch (error) {
    const status = error instanceof AdminHttpError ? error.statusCode : 400;
    sendAdminJson(res, status, { ok: false, error: error instanceof Error ? error.message : "The SKY V4 preview could not be assembled." });
  }
}
