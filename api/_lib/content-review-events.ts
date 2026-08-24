import { createHash } from "node:crypto";

export const contentReviewEventSurfaces = ["you-daily", "weekly-horoscope"] as const;
export type ContentReviewEventSurface = typeof contentReviewEventSurfaces[number];

export type ContentReviewEventFlag = {
  id: "conditional-section-omitted";
  status: "needs_review";
  sectionId: string;
  omittedContentKey: string;
  fallbackContentKey: string | null;
  reason: "missing-or-ineligible";
};

export type ContentReviewEventContext = {
  surface: ContentReviewEventSurface;
  eventDate: string;
  eventKind?: string;
  sign?: string;
  risingSign?: string;
};

export type ContentReviewEventRequest = {
  flags: ContentReviewEventFlag[];
  context: ContentReviewEventContext;
};

const allowedSectionIds = new Set([
  "opening",
  "nature",
  "mechanics",
  "evergreen-body",
  "eclipse-house-layer",
  "ruler-retrograde",
  "recommendation",
  "close"
]);

function isSupportedOmittedContentKey(value: string) {
  return /^authored\/lunation-eclipse-section\/[a-z-]+\/(?:shared\/(?:nature|mechanics|recommendation|close)|rising-[a-z-]+\/house-(?:[1-9]|1[0-2])\/(?:opening|evergreen-body))$/u.test(value)
    || /^authored\/lunation-eclipse-house-layer\/solar\/house-(?:[1-9]|1[0-2])$/u.test(value)
    || value === "fallback-hook/lunation-ruler-retro";
}

function isSupportedFallbackContentKey(value: string) {
  return /^authored\/book-ritual-and-the-moon\/lunation-horoscope\/(?:new-moon|full-moon)\/[a-z-]+\/rising-[a-z-]+\/house-(?:[1-9]|1[0-2])$/u.test(value);
}

function limitedString(value: unknown, maximum: number, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error("A required review-event field is missing.");
    return undefined;
  }
  if (typeof value !== "string") throw new Error("Review-event fields must be strings.");
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new Error("A review-event field has an invalid length.");
  return normalized;
}

function normalizedOptionalId(value: unknown) {
  const normalized = limitedString(value, 40);
  if (!normalized) return undefined;
  if (!/^[a-z0-9-]+$/u.test(normalized)) throw new Error("Review-event identifiers must be normalized.");
  return normalized;
}

function normalizedFlag(value: unknown): ContentReviewEventFlag {
  if (!value || typeof value !== "object") throw new Error("Review-event flags must be objects.");
  const flag = value as Record<string, unknown>;
  if (
    flag.id !== "conditional-section-omitted"
    || flag.status !== "needs_review"
    || flag.reason !== "missing-or-ineligible"
  ) {
    throw new Error("Only omitted conditional sections can enter this queue.");
  }
  const sectionId = limitedString(flag.sectionId, 100, true)!;
  const omittedContentKey = limitedString(flag.omittedContentKey, 500, true)!;
  const fallbackContentKey = limitedString(flag.fallbackContentKey, 500) ?? null;
  if (!allowedSectionIds.has(sectionId) || !isSupportedOmittedContentKey(omittedContentKey)) {
    throw new Error("Unknown omitted conditional section.");
  }
  if (fallbackContentKey && !isSupportedFallbackContentKey(fallbackContentKey)) {
    throw new Error("Unknown evergreen fallback key.");
  }
  return {
    id: "conditional-section-omitted",
    status: "needs_review",
    sectionId,
    omittedContentKey,
    fallbackContentKey,
    reason: "missing-or-ineligible"
  };
}

export function normalizeContentReviewEventRequest(value: unknown): ContentReviewEventRequest {
  if (!value || typeof value !== "object") throw new Error("A review-event request body is required.");
  const body = value as Record<string, unknown>;
  const rawContext = body.context;
  if (!rawContext || typeof rawContext !== "object") throw new Error("Review-event context is required.");
  const context = rawContext as Record<string, unknown>;
  if (!contentReviewEventSurfaces.includes(context.surface as ContentReviewEventSurface)) {
    throw new Error("Unknown review-event surface.");
  }
  const eventDate = limitedString(context.eventDate, 40, true)!;
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/u.test(eventDate) || !Number.isFinite(Date.parse(eventDate))) {
    throw new Error("Review-event date must be an ISO date.");
  }
  if (!Array.isArray(body.flags) || body.flags.length === 0 || body.flags.length > 10) {
    throw new Error("Review-event requests must contain between one and ten flags.");
  }
  return {
    flags: body.flags.map(normalizedFlag),
    context: {
      surface: context.surface as ContentReviewEventSurface,
      eventDate,
      eventKind: normalizedOptionalId(context.eventKind),
      sign: normalizedOptionalId(context.sign),
      risingSign: normalizedOptionalId(context.risingSign)
    }
  };
}

export function contentReviewEventFingerprint(
  flag: ContentReviewEventFlag,
  context: ContentReviewEventContext
) {
  return createHash("sha256").update([
    context.surface,
    context.eventDate.slice(0, 10),
    context.eventKind ?? "",
    context.sign ?? "",
    context.risingSign ?? "",
    flag.sectionId,
    flag.omittedContentKey
  ].join("|"), "utf8").digest("hex");
}
