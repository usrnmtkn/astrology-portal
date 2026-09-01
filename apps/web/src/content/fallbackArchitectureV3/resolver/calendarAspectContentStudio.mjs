import { sha256Text } from "./contentIntegrity.mjs";

export const CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION = "CALENDAR-ASPECT-CONSEQUENCE-FIRST-CONTENT-STUDIO-2026-09-01";
export const CALENDAR_ASPECT_DRAFT_SOURCE = "apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-consequence-first-drafts-v1.json";
export const SKY_V4_CONTENT_STUDIO_PACKAGE_VERSION = "SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function title(value) {
  return text(value)
    .replace(/[-_]+/gu, " ")
    .replace(/\b\w/gu, (match) => match.toUpperCase());
}

function upperSentenceStart(value) {
  const body = text(value);
  return body ? `${body.charAt(0).toUpperCase()}${body.slice(1)}` : body;
}

function lowerSentenceStart(value) {
  const body = text(value);
  return body ? `${body.charAt(0).toLowerCase()}${body.slice(1)}` : body;
}

function normalizedIdentity(draft) {
  const planetA = text(draft.planetA).toLowerCase();
  const signA = text(draft.signA).toLowerCase();
  const aspect = text(draft.aspect).toLowerCase();
  const planetB = text(draft.planetB).toLowerCase();
  const signB = text(draft.signB).toLowerCase();
  if (!planetA || !signA || !aspect || !planetB || !signB) {
    throw new Error(`CALENDAR_ASPECT_STAGE: ${draft.contentKey ?? "unknown"} is missing aspect identity.`);
  }
  return { planetA, signA, aspect, planetB, signB };
}

function sourceIdentity(source, draft) {
  if (draft.sourceKind === "composed-card") {
    return {
      planetA: text(source.planetA).toLowerCase(),
      signA: text(source.signA).toLowerCase(),
      aspect: text(source.aspect).toLowerCase(),
      planetB: text(source.planetB).toLowerCase(),
      signB: text(source.signB).toLowerCase()
    };
  }
  const parts = text(source.contentKey).split("/");
  if (parts.length !== 7 || parts[0] !== "fallback-hook" || parts[1] !== "sky-aspect-sign") {
    throw new Error(`CALENDAR_ASPECT_STAGE: ${draft.contentKey} is not a sign-specific aspect hook.`);
  }
  return {
    planetA: parts[2],
    signA: parts[3],
    aspect: parts[4],
    planetB: parts[5],
    signB: parts[6]
  };
}

export function assertCalendarAspectDraftSource(source, draft) {
  if (!source || !draft) throw new Error("CALENDAR_ASPECT_STAGE: source and draft are required.");
  if (!text(draft.contentKey) || !text(draft.body)) {
    throw new Error("CALENDAR_ASPECT_STAGE: every draft needs contentKey and body.");
  }
  const expectedKey = draft.sourceKind === "composed-card" ? text(source.id) : text(source.contentKey);
  if (expectedKey !== text(draft.contentKey)) {
    throw new Error(`CALENDAR_ASPECT_STAGE: source key mismatch for ${draft.contentKey}.`);
  }
  const expected = normalizedIdentity(draft);
  const actual = sourceIdentity(source, draft);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`CALENDAR_ASPECT_STAGE: identity drift for ${draft.contentKey}.`);
  }
  const sourceBody = draft.sourceKind === "composed-card" ? text(source.forecast) : text(source.body_you);
  if (!sourceBody) throw new Error(`CALENDAR_ASPECT_STAGE: ${draft.contentKey} source body is empty.`);
  return { expected, sourceBody };
}

export function calendarAspectStudioRecord(source, draft) {
  const { expected, sourceBody } = assertCalendarAspectDraftSource(source, draft);
  const headline = `${title(expected.planetA)} in ${title(expected.signA)} ${expected.aspect} ${title(expected.planetB)} in ${title(expected.signB)}`;
  const baseline = structuredClone(source);
  const baselineSha256 = sha256Text(JSON.stringify(baseline));
  const proposedBody = text(draft.body);
  return {
    contentKey: text(draft.contentKey),
    Headline: headline,
    Body: proposedBody,
    BodyA: expected.planetA,
    SignA: expected.signA,
    BodyB: expected.planetB,
    SignB: expected.signB,
    AspectType: expected.aspect,
    CalendarSourceKind: draft.sourceKind,
    CurrentServingBody: sourceBody,
    content_role: draft.sourceKind === "composed-card" ? "full_copy" : "fallback_hook",
    review_status: "needs_review",
    surface: "sky",
    render_policy: "calendar-aspect-content-studio-preview-v1",
    source_package: SKY_V4_CONTENT_STUDIO_PACKAGE_VERSION,
    source_draft_package: CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION,
    source_draft_file: CALENDAR_ASPECT_DRAFT_SOURCE,
    source_baseline_sha256: baselineSha256,
    studio_content_type: "calendar-aspect",
    studio_review_category: "reader-copy",
    studio_editable_fields: [
      { path: "Body", label: "Calendar Exact today body" }
    ],
    studio_read_only_fields: [
      "contentKey", "Headline", "BodyA", "SignA", "BodyB", "SignB", "AspectType",
      "CalendarSourceKind", "CurrentServingBody", "review_status", "source_package",
      "source_draft_package", "source_draft_file", "source_baseline_sha256"
    ],
    studio_source_baseline: baseline,
    studio_provenance: {
      reviewStatus: "needs_review",
      sourceKind: draft.sourceKind,
      sourcePath: text(draft.sourcePath),
      reviewPath: text(draft.reviewPath),
      currentServingPayloadSha256: text(draft.currentServingPayloadSha256) || null
    },
    studio_version_status: "draft",
    owner_approved: false,
    serving_enabled: false,
    note: "Consequence-first Calendar rewrite staged for owner review. The current serving baseline remains unchanged until a separate exact owner approval and serving release."
  };
}

export function renderCalendarAspectStudioPreview(source, { body, dateLine = "" } = {}) {
  const draftBody = text(body ?? source?.Body);
  if (!draftBody) throw new Error("CALENDAR_ASPECT_STAGE: preview body is empty.");
  const label = text(source?.Headline) || "Calendar aspect";
  const sourceKind = text(source?.CalendarSourceKind);
  const normalizedDateLine = text(dateLine);
  let readerBody;
  if (sourceKind === "composed-card") {
    readerBody = normalizedDateLine
      ? `${normalizedDateLine}, ${lowerSentenceStart(draftBody)}`
      : upperSentenceStart(draftBody);
  } else {
    readerBody = normalizedDateLine
      ? `${normalizedDateLine}. ${upperSentenceStart(draftBody)}`
      : upperSentenceStart(draftBody);
  }
  return {
    contentKey: text(source?.contentKey),
    contentType: "calendar-aspect",
    resolution: "calendar-exact-today-draft",
    servingEnabled: false,
    page: `# Exact today\n\n## ${label}\n\n${readerBody}`
  };
}
