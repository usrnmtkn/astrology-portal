import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import {
  assertCompiledSkyArticleEdition,
  hasExactSkyArticleOwnerApproval,
  reviseSkyArticleEdition,
  skyArticleEditableFields,
  skyArticleEditionFieldChanges,
  skyArticleEditionRecord
} from "../../apps/web/src/content/skyArticleTemplateCompiler.js";
import { validateCmsTemplate } from "../../apps/web/src/content/cmsTemplateValidation.js";
import skyV4ReaderCopyOwnerApproval from "../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-reader-copy-280-owner-approval-v1.json" with { type: "json" };
import skyV4ReaderCopyServingRelease from "../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-reader-copy-280-serving-release-v1.json" with { type: "json" };

loadLocalWebEnv();

const adminStorageTimeoutMs = 8_000;

class AdminStorageTimeoutError extends Error {
  constructor() {
    super(`Content storage did not respond within ${adminStorageTimeoutMs / 1000} seconds.`);
    this.name = "AdminStorageTimeoutError";
  }
}

async function adminStorageFetch(input: string, init: RequestInit = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, adminStorageTimeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new AdminStorageTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

type ReviewStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship" | "modifier";

type GeneratedContentWriteBody = {
  id?: string;
  contentKey?: string;
  surface?: GeneratedContentSurface;
  mode?: "feed" | "in_depth" | "article" | "card";
  eventType?: string;
  targetDate?: string | null;
  status?: ReviewStatus;
  headline?: string;
  summary?: string;
  body?: string;
  sections?: unknown;
  facts?: unknown;
  knowledgeIds?: string[];
  sourceSnapshot?: unknown;
  reviewStatus?: string;
  sourceLifecycleAction?: "archive" | "restore";
  editorialNotes?: string;
  revertToPackageOriginal?: boolean;
  lane?: "serving" | "reference" | string | null;
  reviewState?: string | null;
  promptVersion?: string;
  provider?: string;
  model?: string;
  blockType?: string | null;
  reviewerNotes?: string;
  evergreen?: boolean;
  evergreenAt?: string | null;
  evergreenBy?: string | null;
  expectedUpdatedAt?: string;
  ownerAction?:
    | "approve-and-schedule"
    | "approve-package-revision"
    | "approve-sky-article-edition"
    | "save-sky-article-edition-revision"
    | "publish-sky-article-edition-revision";
};

type GeneratedContentRequestBody = GeneratedContentWriteBody & {
  rows?: GeneratedContentWriteBody[];
};

class GeneratedContentRequestError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "GeneratedContentRequestError";
    this.statusCode = statusCode;
  }
}

type ExistingGeneratedContentRow = {
  id: string;
  content_key: string;
  surface?: string | null;
  target_date: string | null;
  mode: string;
  event_type?: string | null;
  status: ReviewStatus;
  headline?: string | null;
  summary?: string | null;
  body?: string | null;
  sections?: Record<string, unknown> | null;
  facts?: Record<string, unknown> | null;
  lane?: string | null;
  review_state?: string | null;
  block_type?: string | null;
  provider?: string | null;
  prompt_version?: string | null;
  source_snapshot?: Record<string, unknown> | null;
  judge_score?: number | null;
  judge_verdict?: string | null;
  judge_gate?: string | null;
  judge_why?: string | null;
  updated_at?: string | null;
};

type SkippedLiveGeneratedContentRow = {
  contentKey: string;
  id?: string;
  status: "LIVE";
};

function assertValidCmsTemplate({
  contentKey,
  headline,
  summary,
  body,
  sourceSnapshot
}: {
  contentKey?: string | null;
  headline?: string | null;
  summary?: string | null;
  body?: string | null;
  sourceSnapshot?: unknown;
}) {
  const snapshot = isRecord(sourceSnapshot) ? sourceSnapshot : {};
  if (!contentKey?.startsWith("cms/") && snapshot.contentSystem !== "cms-surface-override") return;
  const allowedSlots = Array.isArray(snapshot.allowedSlots)
    ? snapshot.allowedSlots.filter((slot): slot is string => typeof slot === "string")
    : [];
  const validation = validateCmsTemplate({
    allowedSlots,
    headline: headline ?? "",
    summary: summary ?? "",
    body: body ?? ""
  });
  if (validation.errors.length > 0) {
    throw new Error(`CMS template cannot be published: ${validation.errors.join(" ")}`);
  }
}

type HeldSkyAspectSourceDraft = {
  id: string;
  canonicalId: string;
  bodyA: string;
  bodyB: string;
  aspect: string;
  body: string;
  authorityClass: "unverified";
  governanceState: "needs-owner-decision";
  surfacePermission: string[];
  status: "NEEDS_OWNER_DECISION";
  sourcePath: string;
  provenance: Record<string, unknown> | null;
};

const allowedStatuses = new Set<ReviewStatus>(["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "ERROR"]);
const reviewStatuses: ReviewStatus[] = ["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "ERROR"];
const fallbackArchitectureV3Provider = "tldrastro-fallback-architecture-v3";
const fallbackArchitectureV3EligibleReviews = new Set(["approved", "approved_reuse"]);
const fallbackArchitectureV3ReviewStatuses = new Set(["needs_review", "approved", "approved_reuse", "deprecated"]);
const skyV4CanonicalStagePackage = "SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30";
const calendarAspectContentStudioStagePackage = "CALENDAR-ASPECT-CONSEQUENCE-FIRST-CONTENT-STUDIO-2026-09-01";
const calendarAspectBatch2AId = "sky-calendar-batch-2a-venus-saturn-squares-2026-09-01";
const skyV4OwnerApprovedReaderCopyKeys = new Set(skyV4ReaderCopyOwnerApproval.approved_keys);
const skyV4ServingReleasedReaderCopyKeys = skyV4ReaderCopyServingRelease.serving_enabled === true
  ? skyV4OwnerApprovedReaderCopyKeys
  : new Set<string>();
const personalizedSampleSurfaces = new Set<GeneratedContentSurface>(["you", "natal", "synastry", "composite", "relationship"]);
const sampleOnlyReviewerNote = "INTERNAL CONTENT TEST. This row is for testing templates, voice, and knowledge hooks. Do not publish it as global app content. Real You, Synastry, Composite, and Relationship content must be generated from user-specific chart or bond facts.";
let contentRoleContractCache: { styleRules?: { bannedWords?: string[] } } | null = null;

function isSampleOnlyRow(surface?: GeneratedContentSurface, contentKey?: string) {
  return Boolean(surface && personalizedSampleSurfaces.has(surface)) || Boolean(contentKey?.startsWith("sample-"));
}

function normalizedGeneratedContentBlockType(blockType: unknown, surface?: GeneratedContentSurface, mode?: GeneratedContentWriteBody["mode"]) {
  if (typeof blockType !== "string") return undefined;
  const value = blockType.trim();
  if (!value) return undefined;
  if (value === "general_article") {
    return surface === "sky" || mode === "article" ? "sky_article" : "essay";
  }
  return value;
}

function contentRoleContract() {
  if (contentRoleContractCache) return contentRoleContractCache;

  const contractPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../apps/web/src/content/fallbackArchitectureV3/contracts/CONTENT-ROLE-CONTRACT.json"
  );
  contentRoleContractCache = JSON.parse(fs.readFileSync(contractPath, "utf8")) as { styleRules?: { bannedWords?: string[] } };
  return contentRoleContractCache;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isCmsGeneratedContentWriteBody(body: GeneratedContentWriteBody) {
  return Boolean(
    body.contentKey?.startsWith("cms/")
    || (isRecord(body.sourceSnapshot) && body.sourceSnapshot.contentSystem === "cms-surface-override")
  );
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value : "";
}

function v3PackageRecord(row: Pick<ExistingGeneratedContentRow, "sections">) {
  const sections = isRecord(row.sections) ? row.sections : {};
  return isRecord(sections.packageRecord) ? sections.packageRecord : {};
}

function isFallbackArchitectureV3Row(row: ExistingGeneratedContentRow | undefined) {
  return row?.provider === fallbackArchitectureV3Provider
    || stringFrom(row?.source_snapshot?.sourcePackage) === "tldrastro-fallback-architecture-v3"
    || Boolean(row?.facts?.fallbackArchitectureV3);
}

function packageReviewStatus(row: ExistingGeneratedContentRow, requested?: string) {
  const existing = requested
    || stringFrom(row.source_snapshot?.review_status)
    || stringFrom(row.facts?.review_status)
    || stringFrom(v3PackageRecord(row).review_status)
    || "needs_review";

  return existing.trim();
}

function readerServingForPackageReview(reviewStatus: string) {
  return fallbackArchitectureV3EligibleReviews.has(reviewStatus);
}

function governedStageKind(
  record: Record<string, unknown>,
  sourceSnapshot: Record<string, unknown>,
  facts: Record<string, unknown>
) {
  const packages = new Set([
    stringFrom(record.source_package),
    stringFrom(sourceSnapshot.sourcePackage)
  ]);
  if (packages.has(skyV4CanonicalStagePackage)) return "sky-v4" as const;
  if (packages.has(calendarAspectContentStudioStagePackage)) return "calendar-aspect" as const;
  const ownerApproval = isRecord(sourceSnapshot.ownerApproval) ? sourceSnapshot.ownerApproval : {};
  if (
    stringFrom(facts.calendarAspectBatch) === calendarAspectBatch2AId
    || stringFrom(ownerApproval.batchId) === calendarAspectBatch2AId
  ) return "calendar-aspect" as const;
  return null;
}

function packageRoleCanServeExactCopy(contentRole: string) {
  return !["fallback_source", "source_material"].includes(contentRole);
}

function normalizeNatalAspectTheyNameVariable(contentKey: string | undefined, value: unknown) {
  const supportsNamedFriendCopy = Boolean(
    contentKey?.startsWith("fallback-hook/natal-aspect-lived/")
    || contentKey?.startsWith("authored/transit-aspect/")
  );
  if (!supportsNamedFriendCopy || typeof value !== "string") return value;
  return value.replace(/\{\{Name\}\}|\{Name\}/gu, "{{Name}}");
}

function fallbackArchitectureV3CreateState(body: GeneratedContentWriteBody) {
  const sections = isRecord(body.sections) ? { ...body.sections } : {};
  const facts = isRecord(body.facts) ? { ...body.facts } : {};
  const sourceSnapshot = isRecord(body.sourceSnapshot) ? { ...body.sourceSnapshot } : {};
  const record = isRecord(sections.packageRecord) ? { ...sections.packageRecord } : {};
  const isPackageRow = body.provider === fallbackArchitectureV3Provider
    || stringFrom(sourceSnapshot.sourcePackage) === "tldrastro-fallback-architecture-v3"
    || facts.fallbackArchitectureV3 === true
    || Boolean(record.content_role);

  if (!isPackageRow) return null;

  const hasPackageDraft = isRecord(sections.packageDraft);
  const reviewStatus = (hasPackageDraft
    ? "needs_review"
    : stringFrom(body.reviewStatus)
      || stringFrom(sourceSnapshot.review_status)
      || stringFrom(facts.review_status)
      || stringFrom(record.review_status)
      || "needs_review").trim();

  if (!fallbackArchitectureV3ReviewStatuses.has(reviewStatus)) {
    throw new Error("review_status must be needs_review, approved, or approved_reuse.");
  }

  const stageKind = governedStageKind(record, sourceSnapshot, facts);
  if (stageKind && reviewStatus !== "needs_review") {
    throw new Error("Governed Content Studio stage rows cannot be published outside their explicit owner-approval and release flow.");
  }

  if (!hasPackageDraft) record.review_status = reviewStatus;
  record.body_they = normalizeNatalAspectTheyNameVariable(body.contentKey, record.body_they);
  if (typeof record.body_they === "string") sections.body_they = record.body_they;
  sections.packageRecord = record;
  facts.review_status = reviewStatus;
  sourceSnapshot.review_status = reviewStatus;
  const contentRole = stringFrom(record.content_role)
    || stringFrom(sourceSnapshot.content_role)
    || stringFrom(facts.content_role);
  const readerServing = !stageKind
    && packageRoleCanServeExactCopy(contentRole)
    && readerServingForPackageReview(reviewStatus);
  facts.readerServing = readerServing;

  return {
    facts,
    lane: readerServing ? "serving" : "reference",
    provider: fallbackArchitectureV3Provider,
    readerServing,
    reviewState: readerServing ? null : stageKind === "calendar-aspect" ? "owner-review-required" : "needs-review",
    sections,
    sourceSnapshot,
    status: readerServing ? "LIVE" as const : "DRAFT" as const
  };
}

function packagePlaceholders(value: unknown) {
  const matches = stringFrom(value).match(/{{\s*[\w.-]+\s*}}/g) ?? [];
  return new Set(matches.map((match) => match.replace(/\s+/g, "")));
}

function packageStringFields(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]];
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => packageStringFields(child, prefix ? `${prefix}.${key}` : key));
}

function packageLeafFields(value: unknown, prefix = ""): Array<[string, unknown]> {
  if (!isRecord(value)) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) => packageLeafFields(child, prefix ? `${prefix}.${key}` : key));
}

function packageValueAt(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, part) => isRecord(current) ? current[part] : undefined, value);
}

function setPackageValueAt(record: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return record;
  let target = record;
  for (const part of parts.slice(0, -1)) {
    const child = isRecord(target[part]) ? { ...target[part] } : {};
    target[part] = child;
    target = child;
  }
  target[parts.at(-1) as string] = structuredClone(value);
  return record;
}

function isEditablePackageCopyPath(path: string, packageRecord?: Record<string, unknown>) {
  const studioPaths = Array.isArray(packageRecord?.studio_editable_fields)
    ? packageRecord.studio_editable_fields
      .filter(isRecord)
      .map((field) => stringFrom(field.path))
      .filter(Boolean)
    : [];
  return studioPaths.includes(path)
    || ["fact_line", "opening", "tension", "development", "close", "body", "body_you", "body_they"]
    .includes(path)
    || path.startsWith("era_layer.");
}

function validateSkyV4TransitPovCopy(record: Record<string, unknown>, packageDraft: Record<string, unknown> | null) {
  if (stringFrom(record.source_package) !== skyV4CanonicalStagePackage) return { passed: true, hardFailures: [] as string[] };
  const effective = packageDraft ?? record;
  const fields = Array.isArray(record.studio_editable_fields)
    ? record.studio_editable_fields.filter(isRecord).map((field) => stringFrom(field.path)).filter(Boolean)
    : [];
  const copy = fields.map((path) => packageValueAt(effective, path)).filter((value) => typeof value === "string").join("\n\n");
  const hardFailures: string[] = [];
  if (/\byou have (?:a|an) (?:gift|talent|natural ability|instinct)\b/iu.test(copy)) {
    hardFailures.push("STP-02 natal-trait framing");
  }
  if (/\b(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith|north node|south node) in [a-z-]+ (?:people|person|native|individuals)\b/iu.test(copy)) {
    hardFailures.push("STP-01 planet-in-sign identity language");
  }
  if (/\bright now,? you are\b/iu.test(copy)) hardFailures.push("STP-10 time-adverb trait sentence");
  if (record.studio_content_type === "continuous-placement" && !/(?:\benters?\b|\breaches?\b|\bmoves? (?:through|into)\b|\btransit(?:s|ing)? through\b|\bduring this transit\b|\bseason\b|\bcurrent cycle\b|\b(?:while|during|when|with)\b[^.!?]{0,80}\b(?:in|through|reaches?)\b)/iu.test(copy)) {
    hardFailures.push("STP-03 missing current-sky anchor");
  }
  return { passed: hardFailures.length === 0, hardFailures };
}

function validateFallbackArchitectureV3Copy(row: ExistingGeneratedContentRow, patch: Record<string, unknown>) {
  const record = v3PackageRecord(row);
  const bannedWords = contentRoleContract().styleRules?.bannedWords ?? [];
  const canonicalPackageBody = typeof record.body === "string"
    ? record.body
    : typeof record.body_you === "string"
      ? record.body_you
      : undefined;
  const editableFields: Array<[string, unknown, unknown]> = [
    ["headline", patch.headline, record.headline],
    ["summary", patch.summary, record.summary],
    ["body", patch.body, canonicalPackageBody]
  ];
  const sections = isRecord(patch.sections) ? patch.sections : {};
  editableFields.push(["body_you", sections.body_you, record.body_you]);
  editableFields.push(["body_they", sections.body_they, record.body_they]);
  const packageDraft = isRecord(sections.packageDraft) ? sections.packageDraft : null;
  if (packageDraft) {
    const changedPaths = packageLeafFields(packageDraft)
      .filter(([field, value]) => JSON.stringify(value) !== JSON.stringify(packageValueAt(record, field)))
      .map(([field]) => field);
    const structuralChanges = changedPaths.filter((field) => !isEditablePackageCopyPath(field, record));
    if (structuralChanges.length) {
      throw new Error(`Package proposals cannot change read-only fields: ${structuralChanges.join(", ")}.`);
    }
    for (const [field, value] of packageStringFields(packageDraft).filter(([field]) => isEditablePackageCopyPath(field, record))) {
      editableFields.push([`packageDraft.${field}`, value, packageValueAt(record, field)]);
    }
    for (const field of ["contentKey", "content_role", "grammar_frame", "render_policy"]) {
      if (packageDraft[field] !== record[field]) {
        throw new Error(`Package proposals cannot change ${field}.`);
      }
    }
  }

  for (const [field, value, original] of editableFields) {
    if (typeof value !== "string") continue;
    if (value.includes("—")) {
      throw new Error(`${field} contains an em dash. Use a comma, colon, or separate sentence instead.`);
    }

    const lower = value.toLowerCase();
    const banned = bannedWords.find((word) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(lower);
    });
    if (banned) {
      throw new Error(`${field} contains banned word "${banned}".`);
    }

    const originalSlots = packagePlaceholders(original);
    for (const slot of packagePlaceholders(value)) {
      const isAllowedFriendName = (
        row.content_key.startsWith("fallback-hook/natal-aspect-lived/")
        || row.content_key.startsWith("authored/transit-aspect/")
      )
        && field.endsWith("body_they")
        && slot === "{{Name}}";
      if (isAllowedFriendName) continue;
      if (!originalSlots.has(slot)) {
        throw new Error(`${field} contains unresolved placeholder ${slot} that was not in the package original.`);
      }
    }
  }
}

function assertFallbackArchitectureV3StructureLocked(row: ExistingGeneratedContentRow, body: GeneratedContentRequestBody) {
  const structuralChecks: Array<[string, unknown, unknown]> = [
    ["contentKey", body.contentKey, row.content_key],
    ["surface", body.surface, row.surface],
    ["mode", body.mode, row.mode],
    ["eventType", body.eventType, row.event_type],
    ["blockType", body.blockType, row.block_type]
  ];

  for (const [field, next, existing] of structuralChecks) {
    if (next === undefined || next === null) continue;
    if (String(next).trim() !== String(existing ?? "").trim()) {
      throw new Error(`Package rows cannot change ${field}. Structural changes must come from a package drop.`);
    }
  }

  const existingRole = stringFrom(row.source_snapshot?.content_role)
    || stringFrom(row.facts?.content_role)
    || stringFrom(v3PackageRecord(row).content_role);
  const nextSnapshot = isRecord(body.sourceSnapshot) ? body.sourceSnapshot : {};
  const nextRole = stringFrom(nextSnapshot.content_role);

  if (nextRole && existingRole && nextRole !== existingRole) {
    throw new Error("Package rows cannot change content role. Structural changes must come from a package drop.");
  }
}

function applyFallbackArchitectureV3ReviewPatch(row: ExistingGeneratedContentRow, body: GeneratedContentRequestBody, patch: Record<string, unknown>) {
  const storedSections = isRecord(row.sections) ? row.sections : {};
  const sections = { ...storedSections, ...(isRecord(body.sections) ? body.sections : {}) };
  const facts = { ...(isRecord(row.facts) ? row.facts : {}), ...(isRecord(body.facts) ? body.facts : {}) };
  const sourceSnapshot = {
    ...(isRecord(row.source_snapshot) ? row.source_snapshot : {}),
    ...(isRecord(body.sourceSnapshot) ? body.sourceSnapshot : {})
  };
  const record = { ...v3PackageRecord(row) };
  const incomingRecord = isRecord(sections.packageRecord) ? sections.packageRecord : {};
  const packageOriginalRecord = isRecord(storedSections.packageOriginalRecord)
    ? { ...storedSections.packageOriginalRecord }
    : { ...record };
  const hasPackageDraft = isRecord(sections.packageDraft);
  const reviewStatus = body.sourceLifecycleAction === "archive"
    ? "deprecated"
    : body.sourceLifecycleAction === "restore"
      ? "needs_review"
      : hasPackageDraft
        ? "needs_review"
        : packageReviewStatus(row, body.reviewStatus || stringFrom(sourceSnapshot.review_status));
  const stageKind = governedStageKind(record, sourceSnapshot, facts);
  const isSkyV4CanonicalStage = stageKind === "sky-v4";
  const isCalendarAspectStage = stageKind === "calendar-aspect";
  const isSkyV4OwnerApprovedReaderCopy = isSkyV4CanonicalStage
    && skyV4OwnerApprovedReaderCopyKeys.has(row.content_key);

  if (!fallbackArchitectureV3ReviewStatuses.has(reviewStatus)) {
    throw new Error("review_status must be needs_review, approved, approved_reuse, or deprecated.");
  }
  if (
    isSkyV4CanonicalStage
    && reviewStatus !== "needs_review"
    && !(isSkyV4OwnerApprovedReaderCopy && reviewStatus === "approved")
  ) {
    throw new Error("SKY V4 content may only use an approval state authorized by its hash-bound owner-approval ledger.");
  }
  if (isCalendarAspectStage && reviewStatus !== "needs_review") {
    throw new Error("Calendar aspect drafts require a separate exact owner approval and serving release before promotion.");
  }

  if (body.revertToPackageOriginal) {
    Object.assign(record, packageOriginalRecord);
    patch.headline = stringFrom(packageOriginalRecord.headline) || row.headline || "";
    patch.summary = stringFrom(packageOriginalRecord.summary) || row.summary || "";
    patch.body = stringFrom(packageOriginalRecord.body ?? packageOriginalRecord.body_you) || row.body || "";
    sections.body_you = packageOriginalRecord.body_you ?? null;
    sections.body_they = packageOriginalRecord.body_they ?? null;
  }

  // Package records use several prose shapes. Only copy explicitly editable
  // fields from the client; structural and provenance fields stay locked to
  // the installed package record. This includes nested studio fields such as
  // era_layer.* rather than only the older top-level prose fields.
  if (!body.revertToPackageOriginal && !hasPackageDraft) {
    for (const [field, value] of packageLeafFields(incomingRecord)) {
      if (isEditablePackageCopyPath(field, record)) {
        setPackageValueAt(record, field, value);
      }
    }
  }

  // Package rows are rendered from sections.packageRecord, not from the
  // dashboard's top-level mirrors. Keep every editable prose field in sync so
  // a successful admin save cannot silently leave the reader on stale copy.
  if (!hasPackageDraft && typeof patch.headline === "string") {
    record.headline = patch.headline;
  }
  if (!hasPackageDraft && typeof patch.summary === "string") {
    record.summary = patch.summary;
  }
  const topLevelBodyChanged = !hasPackageDraft && typeof patch.body === "string" && patch.body !== (row.body ?? "");
  const packageRole = stringFrom(record.content_role)
    || stringFrom(sourceSnapshot.content_role)
    || stringFrom(facts.content_role);
  const incomingBodyYouChanged = typeof incomingRecord.body_you === "string"
    && incomingRecord.body_you !== v3PackageRecord(row).body_you;
  const sectionBodyYouChanged = typeof sections.body_you === "string"
    && sections.body_you !== v3PackageRecord(row).body_you;
  if (topLevelBodyChanged && !incomingBodyYouChanged && !sectionBodyYouChanged) {
    if (record.render_policy === "sky-placement-continuous-v2") {
      throw new Error("Continuous Sky write-ups must be edited in Opening, Tension, Development, and Close so the reader structure stays intact.");
    }
    if (packageRole === "vocabulary") {
      record.body = patch.body;
    } else if (typeof record.body_you === "string") {
      record.body_you = patch.body;
      sections.body_you = patch.body;
    } else {
      record.body = patch.body;
    }
  }
  if (!hasPackageDraft && typeof sections.body_you === "string") {
    record.body_you = sections.body_you;
  }
  if (!hasPackageDraft && typeof sections.body_they === "string") {
    record.body_they = sections.body_they;
  }
  if (hasPackageDraft && isRecord(sections.packageDraft)) {
    const normalizedDraftBodyThey = normalizeNatalAspectTheyNameVariable(
      row.content_key,
      sections.packageDraft.body_they
    );
    sections.packageDraft = typeof normalizedDraftBodyThey === "string"
      ? { ...sections.packageDraft, body_they: normalizedDraftBodyThey }
      : sections.packageDraft;
  }
  record.body_they = normalizeNatalAspectTheyNameVariable(row.content_key, record.body_they);
  if (typeof record.body_they === "string") sections.body_they = record.body_they;

  if (record.render_policy === "sky-placement-continuous-v2" && typeof record.body_you === "string") {
    record.body_you = [record.opening, record.tension, record.development, record.close]
      .filter((part) => typeof part === "string" && part.trim())
      .join("\n\n");
  }

  const calendarDraftBody = isCalendarAspectStage
    ? stringFrom(packageValueAt(hasPackageDraft ? sections.packageDraft : null, "Body") ?? record.Body ?? record.CurrentServingBody)
    : "";
  const readerBody = isCalendarAspectStage
    ? calendarDraftBody
    : packageRole === "vocabulary"
    ? stringFrom(record.body)
    : record.render_policy === "sky-placement-continuous-v2" && typeof record.body_you !== "string"
    ? [
        record.opening,
        record.tension,
        record.development,
        isRecord(record.era_layer) ? record.era_layer.frame : null,
        isRecord(record.era_layer) ? record.era_layer.handoff : null,
        isRecord(record.era_layer) ? record.era_layer.recurrence : null,
        isRecord(record.era_layer) ? record.era_layer.collective_lesson : null,
        record.close
      ].filter((part) => typeof part === "string" && part.trim()).join("\n\n")
    : stringFrom(record.body_you ?? record.body ?? record.text);
  patch.headline = hasPackageDraft ? row.headline ?? "" : patch.headline;
  patch.summary = hasPackageDraft ? row.summary ?? "" : patch.summary;
  patch.body = hasPackageDraft ? row.body ?? readerBody : readerBody;
  sections.body_you = record.body_you ?? null;
  sections.body_they = record.body_they ?? null;
  const skyV4Validation = validateSkyV4TransitPovCopy(
    record,
    hasPackageDraft && isRecord(sections.packageDraft) ? sections.packageDraft : null
  );
  if (isSkyV4CanonicalStage) sections.skyV4Validation = skyV4Validation;

  const editorialReview = sections.contentStudioReview;
  if (editorialReview !== undefined && editorialReview !== null && body.sourceLifecycleAction !== "archive") {
    if (!isRecord(editorialReview)) throw new Error("Content Studio editorial review must be an object or null.");
    if (!skyV4Validation.passed) {
      throw new Error(`SKY V4 POV validation failed: ${skyV4Validation.hardFailures.join(", ")}.`);
    }
    const copySha256 = stringFrom(editorialReview.copySha256);
    const reviewedAt = stringFrom(editorialReview.reviewedAt);
    const statement = stringFrom(editorialReview.statement);
    if (
      editorialReview.schema !== "content-studio-editorial-review/v1"
      || editorialReview.decision !== "approved-exact-copy"
      || !/^[a-f0-9]{64}$/u.test(copySha256)
      || !reviewedAt
      || !Number.isFinite(Date.parse(reviewedAt))
      || !statement.includes(copySha256)
    ) {
      throw new Error("Content Studio editorial review is invalid or incomplete.");
    }
    if (reviewStatus !== "needs_review") {
      throw new Error("Content Studio editorial review can only be recorded while the row remains at needs_review.");
    }
    const currentCopySha256 = createHash("sha256").update(JSON.stringify({
      headline: stringFrom(patch.headline ?? row.headline),
      summary: stringFrom(patch.summary ?? row.summary),
      body: readerBody
    }), "utf8").digest("hex");
    if (copySha256 !== currentCopySha256) {
      throw new Error("Content Studio editorial review hash does not match the exact saved Headline, Summary, and Body.");
    }
  }

  if (!hasPackageDraft) record.review_status = reviewStatus;
  if (isSkyV4CanonicalStage) {
    record.owner_approved = isSkyV4OwnerApprovedReaderCopy && reviewStatus === "approved";
    record.serving_enabled = record.owner_approved
      && skyV4ServingReleasedReaderCopyKeys.has(row.content_key)
      && !hasPackageDraft;
  }
  if (isCalendarAspectStage) {
    record.owner_approved = false;
    record.serving_enabled = false;
    record.studio_version_status = "draft";
  }
  if (typeof body.editorialNotes === "string") {
    record.editorial_notes = body.editorialNotes;
  }

  sections.packageRecord = record;
  sections.packageOriginalRecord = packageOriginalRecord;
  const versionId = `draft-${String(patch.updated_at).replace(/[^0-9]/gu, "")}`;
  sections.dashboardEditHistory = [
    ...(Array.isArray(sections.dashboardEditHistory) ? sections.dashboardEditHistory : []),
    {
      versionId,
      versionStatus: "draft",
      editedAt: patch.updated_at,
      headline: row.headline ?? "",
      summary: row.summary ?? "",
      body: row.body ?? "",
      review_status: packageReviewStatus(row),
      sourceBaselineSha256: stringFrom(record.source_baseline_sha256),
      packageDraft: hasPackageDraft ? structuredClone(sections.packageDraft) : null,
      changedFields: hasPackageDraft
        ? packageStringFields(sections.packageDraft)
          .filter(([field]) => isEditablePackageCopyPath(field, record))
          .filter(([field, value]) => JSON.stringify(value) !== JSON.stringify(packageValueAt(packageOriginalRecord, field)))
          .map(([field]) => field)
        : []
    }
  ].slice(-25);

  facts.review_status = reviewStatus;
  const readerServing = !stageKind
    && packageRoleCanServeExactCopy(packageRole)
    && readerServingForPackageReview(reviewStatus);
  facts.readerServing = readerServing;
  if (isCalendarAspectStage) facts.stageOnly = true;
  sourceSnapshot.review_status = reviewStatus;

  patch.sections = sections;
  patch.facts = facts;
  patch.source_snapshot = sourceSnapshot;
  patch.status = readerServing ? "LIVE" : "DRAFT";
  patch.lane = readerServing ? "serving" : "reference";
  patch.review_state = readerServing
    ? null
    : isCalendarAspectStage
      ? "owner-review-required"
      : isSkyV4CanonicalStage && reviewStatus === "approved"
      ? "serving-disabled"
      : "needs-review";
  validateFallbackArchitectureV3Copy(row, patch);
}

function sourceSnapshotSourceType(sourceSnapshot: unknown) {
  return sourceSnapshot && typeof sourceSnapshot === "object" && !Array.isArray(sourceSnapshot)
    ? String((sourceSnapshot as Record<string, unknown>).sourceType ?? "")
    : "";
}

function isEmergencyFloorContentKey(contentKey?: string) {
  const key = contentKey?.trim() ?? "";

  return key.startsWith("fallback-hook/")
    || key.startsWith("slot-template/")
    || key.startsWith("vocab/")
    || key.startsWith("fallback-vocab/")
    || key.startsWith("guide-phrase/");
}

function isLegacyLiveWritingCandidate(row: {
  contentKey?: string;
  content_key?: string;
  provider?: string | null;
  promptVersion?: string | null;
  prompt_version?: string | null;
  sourceSnapshot?: unknown;
  source_snapshot?: unknown;
}) {
  const contentKey = row.contentKey ?? row.content_key ?? "";

  if (isEmergencyFloorContentKey(contentKey)) {
    return false;
  }

  const sourceType = sourceSnapshotSourceType(row.sourceSnapshot ?? row.source_snapshot);
  const promptVersion = row.promptVersion ?? row.prompt_version ?? "";

  return row.provider === "local-normalized-dashboard-source"
    || sourceType === "normalized-dashboard-source"
    || sourceType === "source-grounded-generated-snapshot"
    || String(promptVersion).startsWith("migration-seed");
}

function assertCanPublishGeneratedContent(row: Parameters<typeof isLegacyLiveWritingCandidate>[0] & {
  blockType?: string | null;
  block_type?: string | null;
  judgeScore?: number | null;
  judge_score?: number | null;
  judgeGate?: string | null;
  judge_gate?: string | null;
  sections?: unknown;
  eventType?: string | null;
  event_type?: string | null;
}) {
  if (isLegacyLiveWritingCandidate(row)) {
    throw new Error("Legacy local/source-grounded generated rows cannot be published LIVE. Use fallback-hook, slot-template, vocab, or newly authored rows instead.");
  }

  const skyBlockType = row.blockType ?? row.block_type;
  const eventType = row.eventType ?? row.event_type;
  const edition = isRecord(row.sections) ? skyArticleEditionRecord(row.sections.skyArticleEdition) : null;
  if (eventType === "sky-article-edition" || edition) {
    const compiled = assertCompiledSkyArticleEdition(edition);
    const snapshot = (row.sourceSnapshot ?? row.source_snapshot) as Record<string, unknown> | null | undefined;
    const approval = isRecord(snapshot?.ownerApproval) ? snapshot.ownerApproval : null;
    if (approval?.approved !== true || approval?.action !== "approve-sky-article-edition" || !hasExactSkyArticleOwnerApproval(compiled, snapshot)) {
      throw new Error("Compiled Sky article editions require the owner's explicit Approve & publish edition action.");
    }
    if (row.contentKey && row.contentKey !== compiled.contentKey) {
      throw new Error("Compiled Sky article edition content key does not match its immutable compilation record.");
    }
  }
  if (skyBlockType === "sky_aspect" || skyBlockType === "sky_placement") {
    const sourceSnapshot = (row.sourceSnapshot ?? row.source_snapshot) as Record<string, unknown> | null | undefined;
    const lint = (skyBlockType === "sky_placement"
      ? sourceSnapshot?.skyPlacementVoiceLint ?? sourceSnapshot?.skyPlacementTopperVoiceLint
      : sourceSnapshot?.skyAspectVoiceLint) as { score?: number; fails?: number } | undefined;
    const judge = (skyBlockType === "sky_placement"
      ? sourceSnapshot?.skyPlacementJudge ?? sourceSnapshot?.skyPlacementTopperJudge
      : sourceSnapshot?.skyAspectJudge) as { recommendation?: string; approvalSource?: string } | undefined;
    const judgeScore = row.judgeScore ?? row.judge_score;
    const judgeGate = row.judgeGate ?? row.judge_gate;
    const humanApprovalEligible = judgeGate === "human-review"
      && judge?.recommendation === "approve"
      && judge.approvalSource === "llm-advisory";
    const legacyAutoPublishEligible = skyBlockType === "sky_aspect" && judgeGate === "auto-publish";

    if (lint?.score !== 3 || lint.fails !== 0 || judgeScore !== 3 || (!legacyAutoPublishEligible && !humanApprovalEligible)) {
      throw new Error("Sky cards can be published only after lint 3/0, judge score 3, and an explicit human-review recommendation.");
    }
  }
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

export function listHeldSkyAspectSourceDrafts(): HeldSkyAspectSourceDraft[] {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.."
  );
  const sourceRoot = path.join(
    repoRoot,
    "packages/astro-knowledge/data/points/aspects/sky/four-body-unverified"
  );

  return fs.readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const absolutePath = path.join(sourceRoot, entry.name);
      const source = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Record<string, unknown>;
      if (
        source.kind !== "sky-aspect"
        || typeof source.id !== "string"
        || typeof source.canonicalId !== "string"
        || typeof source.body !== "string"
        || source.authorityClass !== "unverified"
        || source.governanceState !== "needs-owner-decision"
        || source.status !== "NEEDS_OWNER_DECISION"
      ) {
        throw new Error(`${path.relative(repoRoot, absolutePath)} is not a held Current Sky aspect draft.`);
      }
      return {
        id: source.id,
        canonicalId: source.canonicalId,
        bodyA: stringFrom(source.bodyA),
        bodyB: stringFrom(source.bodyB),
        aspect: stringFrom(source.aspect),
        body: source.body,
        authorityClass: "unverified" as const,
        governanceState: "needs-owner-decision" as const,
        surfacePermission: Array.isArray(source.surfacePermission) ? source.surfacePermission.filter((value): value is string => typeof value === "string") : [],
        status: "NEEDS_OWNER_DECISION" as const,
        sourcePath: path.relative(repoRoot, absolutePath),
        provenance: isRecord(source.provenance) ? source.provenance : null
      };
    })
    .sort((first, second) => first.id.localeCompare(second.id));
}

async function readJsonBody(req: IncomingMessage) {
  const preParsedBody = (req as IncomingMessage & { body?: unknown }).body;

  if (typeof preParsedBody === "string") {
    return JSON.parse(preParsedBody) as GeneratedContentRequestBody;
  }

  if (preParsedBody && typeof preParsedBody === "object") {
    return preParsedBody as GeneratedContentRequestBody;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    throw new Error("Request JSON body is required.");
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as GeneratedContentRequestBody;
}

function adminHeaders() {
  const key = serviceRoleKey();

  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json"
  };
}

function missingGeneratedInterpretationsColumn(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const message = "message" in payload && typeof payload.message === "string" ? payload.message : "";
  const match = message.match(/column generated_interpretations\.([a-z_]+) does not exist/i)
    ?? message.match(/column "([a-z_]+)" does not exist/i);

  return match?.[1] ?? null;
}


function boundedGeneratedContentLimit(value: string | null, fallback = 50, maximum = 1000) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), maximum);
}

type GeneratedContentCursor = { id: string; updatedAt: string };

function encodeGeneratedContentCursor(row: { id?: unknown; updated_at?: unknown } | undefined) {
  if (!row || typeof row.id !== "string" || typeof row.updated_at !== "string") return null;
  return Buffer.from(JSON.stringify({ id: row.id, updatedAt: row.updated_at }), "utf8").toString("base64url");
}

function decodeGeneratedContentCursor(value: string): GeneratedContentCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<GeneratedContentCursor>;
    if (typeof parsed.id !== "string" || !parsed.id || typeof parsed.updatedAt !== "string" || !Number.isFinite(Date.parse(parsed.updatedAt))) {
      throw new Error("invalid cursor payload");
    }
    return { id: parsed.id, updatedAt: parsed.updatedAt };
  } catch {
    throw new GeneratedContentRequestError("cursor is invalid.");
  }
}


function generatedContentDetailSelectColumns() {
  return [
    "id",
    "content_key",
    "surface",
    "mode",
    "status",
    "event_type",
    "target_date",
    "headline",
    "summary",
    "body",
    "sections",
    "block_type",
    "lane",
    "review_state",
    "evergreen",
    "evergreen_at",
    "evergreen_by",
    "facts",
    "knowledge_ids",
    "source_snapshot",
    "judge_score",
    "judge_verdict",
    "judge_gate",
    "judge_why",
    "reviewer_notes",
    "prompt_version",
    "provider",
    "model",
    "reviewed_at",
    "published_at",
    "updated_at",
    "created_at"
  ];
}

function generatedContentInventorySelectColumns() {
  return [
    "id",
    "content_key",
    "surface",
    "mode",
    "status",
    "event_type",
    "target_date",
    "headline",
    "summary",
    "block_type",
    "lane",
    "review_state",
    "evergreen",
    "judge_score",
    "judge_gate",
    "prompt_version",
    "provider",
    "updated_at",
    "source_type:source_snapshot->>sourceType",
    "source_review_status:source_snapshot->>review_status",
    "source_lane:source_snapshot->>lane",
    "source_content_role_camel:source_snapshot->>contentRole",
    "source_content_role:source_snapshot->>content_role",
    "source_source_role_camel:source_snapshot->>sourceRole",
    "source_source_role:source_snapshot->>source_role",
    "source_role:source_snapshot->>role",
    "source_content_type_camel:source_snapshot->>contentType",
    "source_content_type:source_snapshot->>content_type",
    "source_type_alias:source_snapshot->>type",
    "source_bucket:source_snapshot->>bucket",
    "source_target_family:source_snapshot->>targetContentFamily",
    "source_content_system:source_snapshot->>contentSystem",
    "source_flags:source_snapshot->flags",
    "source_package:source_snapshot->>sourcePackage",
    "source_tier:source_snapshot->>tier",
    "source_phrasebank_tier:source_snapshot->>phrasebankTier",
    "source_provenance_tier:source_snapshot->>provenanceTier",
    "source_source_tier:source_snapshot->>sourceTier",
    "source_review_priority:source_snapshot->reviewPriority",
    "source_review_sequence:source_snapshot->reviewSequence",
    "source_planet:source_snapshot->>planet",
    "source_body:source_snapshot->>body",
    "source_point:source_snapshot->>point",
    "source_angle:source_snapshot->>angle",
    "source_object:source_snapshot->>object",
    "source_sign:source_snapshot->>sign",
    "source_reader_sign:source_snapshot->>readerSign",
    "source_other_sign:source_snapshot->>otherSign",
    "source_app_destination_camel:source_snapshot->>appDestination",
    "source_app_destination:source_snapshot->>app_destination",
    "source_render_policy:source_snapshot->>render_policy",
    "source_surface:source_snapshot->>surface",
    "source_destination:source_snapshot->>destination",
    "source_motion:source_snapshot->>motion",
    "source_is_retrograde_camel:source_snapshot->isRetrograde",
    "source_is_retrograde:source_snapshot->is_retrograde",
    "source_retrograde:source_snapshot->retrograde",
    "source_direction:source_snapshot->>direction",
    "source_phase:source_snapshot->>phase",
    "source_lunation_kind:source_snapshot->>lunationKind",
    "source_kind:source_snapshot->>kind",
    "source_eclipse_type_camel:source_snapshot->>eclipseType",
    "source_eclipse_type:source_snapshot->>eclipse_type",
    "facts_fallback_v3:facts->fallbackArchitectureV3",
    "facts_content_role:facts->>content_role",
    "facts_review_status:facts->>review_status",
    "facts_planet:facts->>planet",
    "facts_body:facts->>body",
    "facts_point:facts->>point",
    "facts_angle:facts->>angle",
    "facts_object:facts->>object",
    "facts_sign:facts->>sign",
    "facts_reader_sign:facts->>readerSign",
    "facts_other_sign:facts->>otherSign",
    "facts_app_destination_camel:facts->>appDestination",
    "facts_app_destination:facts->>app_destination",
    "facts_surface:facts->>surface",
    "facts_destination:facts->>destination",
    "facts_reader_surface:facts->>readerSurface",
    "facts_render_policy:facts->>render_policy",
    "facts_motion:facts->>motion",
    "facts_is_retrograde_camel:facts->isRetrograde",
    "facts_is_retrograde:facts->is_retrograde",
    "facts_retrograde:facts->retrograde",
    "facts_direction:facts->>direction",
    "facts_phase:facts->>phase",
    "facts_lunation_kind:facts->>lunationKind",
    "facts_kind:facts->>kind",
    "facts_eclipse_type_camel:facts->>eclipseType",
    "facts_eclipse_type:facts->>eclipse_type",
    "package_content_role:sections->packageRecord->>content_role",
    "package_review_status:sections->packageRecord->>review_status",
    "package_review_category:sections->packageRecord->>studio_review_category",
    "package_owner_approved:sections->packageRecord->owner_approved",
    "package_render_policy:sections->packageRecord->>render_policy",
    "package_source_package:sections->packageRecord->>source_package"
  ];
}

function compactInventoryRecord(entries: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(entries).filter(([, value]) => (
    value !== undefined && value !== null && value !== ""
  )));
}

function inventoryBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function inventoryNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function generatedContentInventoryRow(value: unknown) {
  const row = isRecord(value) ? value : {};
  const sourceSnapshot = compactInventoryRecord({
    sourceType: row.source_type,
    review_status: row.source_review_status,
    lane: row.source_lane,
    contentRole: row.source_content_role_camel,
    content_role: row.source_content_role,
    sourceRole: row.source_source_role_camel,
    source_role: row.source_source_role,
    role: row.source_role,
    contentType: row.source_content_type_camel,
    content_type: row.source_content_type,
    type: row.source_type_alias,
    bucket: row.source_bucket,
    targetContentFamily: row.source_target_family,
    contentSystem: row.source_content_system,
    flags: row.source_flags,
    sourcePackage: row.source_package,
    tier: row.source_tier,
    phrasebankTier: row.source_phrasebank_tier,
    provenanceTier: row.source_provenance_tier,
    sourceTier: row.source_source_tier,
    reviewPriority: inventoryNumber(row.source_review_priority),
    reviewSequence: inventoryNumber(row.source_review_sequence),
    planet: row.source_planet,
    body: row.source_body,
    point: row.source_point,
    angle: row.source_angle,
    object: row.source_object,
    sign: row.source_sign,
    readerSign: row.source_reader_sign,
    otherSign: row.source_other_sign,
    appDestination: row.source_app_destination_camel,
    app_destination: row.source_app_destination,
    render_policy: row.source_render_policy,
    surface: row.source_surface,
    destination: row.source_destination,
    motion: row.source_motion,
    isRetrograde: inventoryBoolean(row.source_is_retrograde_camel),
    is_retrograde: inventoryBoolean(row.source_is_retrograde),
    retrograde: inventoryBoolean(row.source_retrograde),
    direction: row.source_direction,
    phase: row.source_phase,
    lunationKind: row.source_lunation_kind,
    kind: row.source_kind,
    eclipseType: row.source_eclipse_type_camel,
    eclipse_type: row.source_eclipse_type
  });
  const facts = compactInventoryRecord({
    fallbackArchitectureV3: inventoryBoolean(row.facts_fallback_v3),
    content_role: row.facts_content_role,
    review_status: row.facts_review_status,
    planet: row.facts_planet,
    body: row.facts_body,
    point: row.facts_point,
    angle: row.facts_angle,
    object: row.facts_object,
    sign: row.facts_sign,
    readerSign: row.facts_reader_sign,
    otherSign: row.facts_other_sign,
    appDestination: row.facts_app_destination_camel,
    app_destination: row.facts_app_destination,
    surface: row.facts_surface,
    destination: row.facts_destination,
    readerSurface: row.facts_reader_surface,
    render_policy: row.facts_render_policy,
    motion: row.facts_motion,
    isRetrograde: inventoryBoolean(row.facts_is_retrograde_camel),
    is_retrograde: inventoryBoolean(row.facts_is_retrograde),
    retrograde: inventoryBoolean(row.facts_retrograde),
    direction: row.facts_direction,
    phase: row.facts_phase,
    lunationKind: row.facts_lunation_kind,
    kind: row.facts_kind,
    eclipseType: row.facts_eclipse_type_camel,
    eclipse_type: row.facts_eclipse_type
  });
  const packageRecord = compactInventoryRecord({
    content_role: row.package_content_role,
    review_status: row.package_review_status,
    studio_review_category: row.package_review_category,
    owner_approved: inventoryBoolean(row.package_owner_approved),
    render_policy: row.package_render_policy,
    source_package: row.package_source_package
  });

  return {
    id: row.id,
    content_key: row.content_key,
    surface: row.surface,
    mode: row.mode,
    status: row.status,
    event_type: row.event_type ?? null,
    target_date: row.target_date ?? null,
    headline: row.headline ?? null,
    summary: row.summary ?? null,
    body: null,
    sections: Object.keys(packageRecord).length > 0 ? { packageRecord } : null,
    block_type: row.block_type ?? null,
    lane: row.lane ?? null,
    review_state: row.review_state ?? null,
    evergreen: row.evergreen ?? null,
    facts: Object.keys(facts).length > 0 ? facts : null,
    source_snapshot: Object.keys(sourceSnapshot).length > 0 ? sourceSnapshot : null,
    judge_score: row.judge_score ?? null,
    judge_gate: row.judge_gate ?? null,
    prompt_version: row.prompt_version ?? null,
    provider: row.provider ?? null,
    updated_at: row.updated_at ?? null,
    inventory_only: true
  };
}

async function listGeneratedContent(req: IncomingMessage) {
  const requestUrl = new URL(req.url ?? "/api/admin/generated-content", "http://localhost");
  const id = requestUrl.searchParams.get("id");
  const status = requestUrl.searchParams.get("status") ?? "DRAFT";
  const surface = requestUrl.searchParams.get("surface");
  const promptVersion = requestUrl.searchParams.get("promptVersion");
  const contentKey = requestUrl.searchParams.get("contentKey");
  const contentKeyPrefix = requestUrl.searchParams.get("contentKeyPrefix");
  const startDate = requestUrl.searchParams.get("startDate");
  const endDate = requestUrl.searchParams.get("endDate");
  const visibility = requestUrl.searchParams.get("visibility") ?? "all";
  const scope = requestUrl.searchParams.get("scope") ?? "all";
  const cursor = requestUrl.searchParams.get("cursor");
  const limit = boundedGeneratedContentLimit(requestUrl.searchParams.get("limit"));
  const view = requestUrl.searchParams.get("view") ?? "detail";
  if (!["detail", "inventory"].includes(view)) throw new GeneratedContentRequestError("view must be detail or inventory.");
  const inventoryView = view === "inventory" && !id && !contentKey && !contentKeyPrefix;
  const supportsUpdatedCursor = !id && scope !== "compatibility" && !startDate && !endDate;
  const offset = supportsUpdatedCursor ? 0 : Math.max(Number(requestUrl.searchParams.get("offset") ?? "0"), 0);
  const selectColumns = inventoryView ? generatedContentInventorySelectColumns() : generatedContentDetailSelectColumns();
  const params = new URLSearchParams({
    select: selectColumns.join(","),
    order: scope === "compatibility" ? "id.asc" : startDate || endDate ? "target_date.asc.nullslast,id.desc" : "updated_at.desc,id.desc",
    limit: id ? "1" : String(limit),
    offset: id ? "0" : String(offset)
  });

  if (id) {
    params.set("id", `eq.${id}`);
  } else if (scope === "compatibility") {
    const compatibilityFilters = [
      "content_key.like.compatibility.%",
      "content_key.like.compatibility/%",
      "content_key.like.authored/compat-%",
      "content_key.like.fallback-hook/friends%",
      "content_key.like.fallback-hook/relationship%",
      "content_key.like.fallback-hook/synastry%",
      "content_key.like.fallback-hook/pair-daily/%",
      "content_key.like.vocab/relationship/%",
      "content_key.like.slot-template/compatibility/%",
      "event_type.eq.friends.compatibility.planet-card",
      "block_type.eq.compatibility_planet_card"
    ];
    params.set("or", `(${compatibilityFilters.join(",")})`);
    if (cursor) params.set("id", `gt.${cursor}`);
  } else if (visibility === "editorial") {
    params.set("lane", "eq.serving");
    params.set("status", "neq.ARCHIVED");
  } else if (status !== "all") {
    params.set("status", `eq.${status}`);
  }

  if (!id && supportsUpdatedCursor && cursor) {
    const decodedCursor = decodeGeneratedContentCursor(cursor);
    params.set("or", `(updated_at.lt.${decodedCursor.updatedAt},and(updated_at.eq.${decodedCursor.updatedAt},id.lt.${decodedCursor.id}))`);
  }

  if (!id && surface) {
    params.set("surface", `eq.${surface}`);
  }

  if (!id && promptVersion) {
    params.set("prompt_version", `eq.${promptVersion}`);
  }

  if (!id && contentKey) {
    params.set("content_key", `eq.${contentKey}`);
  } else if (!id && contentKeyPrefix) {
    params.set("content_key", `like.${contentKeyPrefix}%`);
  }

  if (!id && startDate && endDate) {
    params.set("or", `(target_date.is.null,and(target_date.gte.${startDate},target_date.lte.${endDate}))`);
  } else if (!id && startDate) {
    params.set("or", `(target_date.is.null,target_date.gte.${startDate})`);
  } else if (!id && endDate) {
    params.set("or", `(target_date.is.null,target_date.lte.${endDate})`);
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
      headers: adminHeaders()
    });
    const payload = await response.json().catch(() => null);

    if (response.ok) {
      return inventoryView && Array.isArray(payload) ? payload.map(generatedContentInventoryRow) : payload;
    }

    const missingColumn = response.status === 400 ? missingGeneratedInterpretationsColumn(payload) : null;

    if (missingColumn && selectColumns.includes(missingColumn)) {
      const columnIndex = selectColumns.indexOf(missingColumn);

      selectColumns.splice(columnIndex, 1);
      params.set("select", selectColumns.join(","));
      continue;
    }

    throw new Error(`Supabase list failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  throw new Error("Supabase list failed after retrying missing generated_interpretations columns.");
}

function exactCountFromContentRange(contentRange: string | null) {
  const match = contentRange?.match(/\/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function countGeneratedContent(status: ReviewStatus, surface: GeneratedContentSurface | "all") {
  const params = new URLSearchParams({
    select: "id",
    status: `eq.${status}`,
    limit: "1"
  });

  if (surface !== "all") {
    params.set("surface", `eq.${surface}`);
  }

  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: {
      ...adminHeaders(),
      prefer: "count=exact",
      range: "0-0"
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase count failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return exactCountFromContentRange(response.headers.get("content-range"));
}

async function generatedContentStats(req: IncomingMessage) {
  const requestUrl = new URL(req.url ?? "/api/admin/generated-content", "http://localhost");
  const requestedSurface = requestUrl.searchParams.get("surface") as GeneratedContentSurface | "all" | null;
  const surface = requestedSurface ?? "all";
  const counts = Object.fromEntries(
    await Promise.all(reviewStatuses.map(async (status) => [status, await countGeneratedContent(status, surface)]))
  ) as Record<ReviewStatus, number>;

  return {
    counts,
    total: reviewStatuses.reduce((sum, status) => sum + counts[status], 0),
    surface
  };
}

async function createGeneratedContentFromBody(body: GeneratedContentWriteBody) {
  if (!body.contentKey?.trim()) {
    throw new Error("contentKey is required.");
  }

  if (!body.surface) {
    throw new Error("surface is required.");
  }

  if (!body.mode) {
    throw new Error("mode is required.");
  }

  if (!body.eventType?.trim()) {
    throw new Error("eventType is required.");
  }

  if (body.status && !allowedStatuses.has(body.status)) {
    throw new GeneratedContentRequestError("status must be DRAFT, REVIEWED, LIVE, ARCHIVED, or ERROR.");
  }

  const blockType = normalizedGeneratedContentBlockType(body.blockType, body.surface, body.mode);
  const isCmsRow = isCmsGeneratedContentWriteBody(body);
  const packageState = fallbackArchitectureV3CreateState(body);
  if (!packageState && body.status === "LIVE") {
    if (isSampleOnlyRow(body.surface, body.contentKey)) {
      throw new GeneratedContentRequestError("Personalized content test rows cannot be published globally. Generate real user or bond scoped content instead.");
    }
    const requestedLane = typeof body.lane === "string" && body.lane.trim() ? body.lane.trim() : "serving";
    if (requestedLane !== "serving") {
      throw new GeneratedContentRequestError("Published content must use the serving lane.", 409);
    }
    if (body.reviewState) {
      throw new GeneratedContentRequestError("Published content cannot retain a review hold.", 409);
    }
    assertValidCmsTemplate({
      contentKey: body.contentKey,
      headline: body.headline,
      summary: body.summary,
      body: body.body,
      sourceSnapshot: body.sourceSnapshot
    });
    assertCanPublishGeneratedContent(body);
  }
  const now = new Date().toISOString();
  const row = {
    content_key: body.contentKey.trim(),
    surface: body.surface,
    mode: body.mode,
    status: packageState?.status ?? body.status ?? "DRAFT",
    event_type: body.eventType.trim(),
    target_date: body.targetDate || null,
    facts: packageState?.facts ?? body.facts ?? {},
    knowledge_ids: body.knowledgeIds ?? [],
    source_snapshot: packageState?.sourceSnapshot ?? body.sourceSnapshot ?? {},
    ...(packageState ? { lane: packageState.lane } : typeof body.lane === "string" && body.lane.trim() ? { lane: body.lane.trim() } : {}),
    ...(packageState ? { review_state: packageState.reviewState } : body.reviewState !== undefined ? { review_state: body.reviewState || null } : {}),
    evergreen: Boolean(body.evergreen),
    evergreen_at: body.evergreen ? body.evergreenAt ?? new Date().toISOString() : null,
    evergreen_by: body.evergreen ? body.evergreenBy ?? "admin" : null,
    ...(blockType ? { block_type: blockType } : {}),
    prompt_version: typeof body.promptVersion === "string" && body.promptVersion.trim() ? body.promptVersion.trim() : "manual-admin",
    provider: packageState?.provider ?? (typeof body.provider === "string" && body.provider.trim() ? body.provider.trim() : "manual-admin"),
    model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : "manual",
    headline: body.headline ?? "",
    summary: body.summary ?? "",
    body: body.body ?? "",
    sections: packageState?.sections ?? body.sections ?? [],
    reviewer_notes: body.reviewerNotes ?? (isSampleOnlyRow(body.surface, body.contentKey) ? sampleOnlyReviewerNote : ""),
    ...(packageState?.readerServing ? { reviewed_at: now, published_at: now } : {})
  };

  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    },
    body: JSON.stringify(row)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 409) {
      throw new GeneratedContentRequestError("A row already exists for this content key, target date, and mode. Open the saved row instead of creating over it.", 409);
    }
    throw new Error(`Supabase create failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function generatedContentRowFromWriteBody(body: GeneratedContentWriteBody) {
  if (!body.contentKey?.trim()) {
    throw new Error("contentKey is required for every row.");
  }

  if (!body.surface) {
    throw new Error(`surface is required for ${body.contentKey}.`);
  }

  if (!body.mode) {
    throw new Error(`mode is required for ${body.contentKey}.`);
  }

  if (!body.eventType?.trim()) {
    throw new Error(`eventType is required for ${body.contentKey}.`);
  }

  if (body.status && !allowedStatuses.has(body.status)) {
    throw new Error(`status for ${body.contentKey} must be DRAFT, REVIEWED, LIVE, ARCHIVED, or ERROR.`);
  }

  if (body.status === "LIVE" && isSampleOnlyRow(body.surface, body.contentKey)) {
    throw new GeneratedContentRequestError("Personalized content test rows cannot be published globally. Generate real user or bond scoped content instead.");
  }

  if (body.status === "LIVE") {
    const requestedLane = typeof body.lane === "string" && body.lane.trim() ? body.lane.trim() : "serving";
    if (requestedLane !== "serving") {
      throw new GeneratedContentRequestError("Published content must use the serving lane.", 409);
    }
    if (body.reviewState) {
      throw new GeneratedContentRequestError("Published content cannot retain a review hold.", 409);
    }
    const requestedEdition = isRecord(body.sections) ? skyArticleEditionRecord(body.sections.skyArticleEdition) : null;
    if (body.eventType === "sky-article-edition" || requestedEdition) {
      throw new Error("Create compiled Sky article editions as drafts, then use Approve & publish edition.");
    }
    assertValidCmsTemplate({
      contentKey: body.contentKey,
      headline: body.headline,
      summary: body.summary,
      body: body.body,
      sourceSnapshot: body.sourceSnapshot
    });
    assertCanPublishGeneratedContent(body);
  }

  const blockType = normalizedGeneratedContentBlockType(body.blockType, body.surface, body.mode);
  const isCmsRow = isCmsGeneratedContentWriteBody(body);
  return {
    content_key: body.contentKey.trim(),
    surface: body.surface,
    mode: body.mode,
    status: body.status ?? "DRAFT",
    event_type: body.eventType.trim(),
    target_date: body.targetDate || null,
    facts: body.facts ?? {},
    knowledge_ids: body.knowledgeIds ?? [],
    source_snapshot: body.sourceSnapshot ?? {},
    ...(typeof body.lane === "string" && body.lane.trim() ? { lane: body.lane.trim() } : {}),
    ...(body.reviewState !== undefined ? { review_state: body.reviewState || null } : {}),
    evergreen: Boolean(body.evergreen),
    evergreen_at: body.evergreen ? body.evergreenAt ?? new Date().toISOString() : null,
    evergreen_by: body.evergreen ? body.evergreenBy ?? "admin" : null,
    ...(blockType ? { block_type: blockType } : {}),
    prompt_version: typeof body.promptVersion === "string" && body.promptVersion.trim() ? body.promptVersion.trim() : "manual-admin",
    provider: typeof body.provider === "string" && body.provider.trim() ? body.provider.trim() : isCmsRow ? "manual-admin" : "claude",
    model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : "manual",
    headline: body.headline ?? "",
    summary: body.summary ?? "",
    body: body.body ?? "",
    sections: body.sections ?? [],
    reviewer_notes: body.reviewerNotes ?? (isSampleOnlyRow(body.surface, body.contentKey) ? sampleOnlyReviewerNote : ""),
    updated_at: new Date().toISOString()
  };
}

async function fetchExistingRowsByContentKey(contentKeys: string[]) {
  const uniqueKeys = Array.from(new Set(contentKeys.map((key) => key.trim()).filter(Boolean)));
  const rows: ExistingGeneratedContentRow[] = [];

  for (let index = 0; index < uniqueKeys.length; index += 80) {
    const batch = uniqueKeys.slice(index, index + 80);
    const params = new URLSearchParams();
    params.set("select", "id,content_key,target_date,mode,status,provider,prompt_version,source_snapshot,block_type,judge_score,judge_gate");
    params.set("content_key", `in.(${batch.map((key) => `"${key}"`).join(",")})`);
    const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
      headers: adminHeaders()
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Supabase existing row lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    rows.push(...payload);
  }

  return rows;
}

async function fetchExistingRowById(id: string) {
  const params = new URLSearchParams();
  params.set("select", "id,content_key,surface,target_date,mode,event_type,status,headline,summary,body,sections,facts,lane,review_state,block_type,provider,prompt_version,source_snapshot,judge_score,judge_verdict,judge_gate,judge_why,updated_at");
  params.set("id", `eq.${id}`);
  params.set("limit", "1");
  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase row lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return Array.isArray(payload) ? payload[0] as ExistingGeneratedContentRow | undefined : undefined;
}

async function patchGeneratedContentRow(
  id: string,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string | null
) {
  const params = new URLSearchParams();
  params.set("id", `eq.${id}`);
  if (expectedUpdatedAt) params.set("updated_at", `eq.${expectedUpdatedAt}`);
  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
    method: "PATCH",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    },
    body: JSON.stringify(patch)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase review update failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  const rows = Array.isArray(payload) ? payload as ExistingGeneratedContentRow[] : [];
  if (rows.length === 0) {
    if (expectedUpdatedAt) {
      throw new GeneratedContentRequestError("This content changed before the update completed. Reload the row before saving so a newer edit is not overwritten.", 409);
    }
    throw new GeneratedContentRequestError("Content row was not found.", 404);
  }
  return rows;
}

async function upsertGeneratedContentRow(row: Record<string, unknown>) {
  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(row)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase revision upsert failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload as ExistingGeneratedContentRow[];
}

function skyArticleRevisionContentKey(contentKey: string) {
  return `sky-article-revision/${contentKey.replace(/^sky-article\//u, "")}`;
}

function assertSkyArticleRevisionIdentity(
  base: ReturnType<typeof assertCompiledSkyArticleEdition>,
  revised: ReturnType<typeof assertCompiledSkyArticleEdition>
) {
  const immutableFields = [
    "contentKey",
    "templateKey",
    "templateHash",
    "fixedProseHash",
    "planet",
    "sign",
    "entryYear",
    "validFrom",
    "validTo",
    "transitStartInstant",
    "transitEndInstant"
  ] as const;
  const changed = immutableFields.filter((field) => base[field] !== revised[field]);
  if (changed.length > 0) {
    throw new Error(`Sky article revisions cannot change calculated identity fields: ${changed.join(", ")}.`);
  }
}

async function verifiedSkyArticleRevision(baseValue: unknown, revisedValue: unknown) {
  const base = assertCompiledSkyArticleEdition(baseValue);
  const submitted = assertCompiledSkyArticleEdition(revisedValue);
  assertSkyArticleRevisionIdentity(base, submitted);
  const canonical = await reviseSkyArticleEdition(base, skyArticleEditableFields(submitted));
  if (canonical.compiledHash !== submitted.compiledHash) {
    throw new Error("Sky article revision hash does not match its exact submitted fields.");
  }
  const changes = skyArticleEditionFieldChanges(base, skyArticleEditableFields(canonical));
  if (changes.length === 0) throw new Error("Sky article revision contains no changed fields.");
  return { base, revised: canonical, changes };
}

function skyArticleApprovalSnapshot(
  sourceSnapshot: Record<string, unknown> | null | undefined,
  edition: ReturnType<typeof assertCompiledSkyArticleEdition>,
  now: string
) {
  const snapshot = isRecord(sourceSnapshot) ? { ...sourceSnapshot } : {};
  snapshot.review_status = "approved";
  snapshot.ownerApproval = {
    approved: true,
    action: "approve-sky-article-edition",
    approvedAt: now,
    source: "content-studio-explicit-action",
    contentKey: edition.contentKey,
    templateKey: edition.templateKey,
    templateHash: edition.templateHash,
    fixedProseHash: edition.fixedProseHash,
    compiledHash: edition.compiledHash
  };
  return snapshot;
}

function generatedContentTargetKey({
  contentKey,
  targetDate,
  mode
}: Pick<GeneratedContentWriteBody, "contentKey" | "targetDate" | "mode">) {
  return [
    contentKey?.trim() ?? "",
    targetDate || "",
    mode ?? ""
  ].join("\u0000");
}

function existingGeneratedContentTargetKey(row: ExistingGeneratedContentRow) {
  return [
    row.content_key,
    row.target_date ?? "",
    row.mode
  ].join("\u0000");
}

async function bulkUpsertGeneratedContent(body: GeneratedContentRequestBody) {
  const rows = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("rows must be a non-empty array.");
  }

  const contentKeys = rows.map((row) => row.contentKey ?? "");
  const existingRows = await fetchExistingRowsByContentKey(contentKeys);
  const existingByTarget = new Map(existingRows.map((row) => [existingGeneratedContentTargetKey(row), row]));
  const skippedLiveRows: SkippedLiveGeneratedContentRow[] = [];
  const upsertRows = rows
    .filter((row) => {
      const contentKey = row.contentKey?.trim() ?? "";
      const existingRow = existingByTarget.get(generatedContentTargetKey(row));

      if (existingRow?.status === "LIVE") {
        skippedLiveRows.push({
          contentKey,
          id: existingRow.id,
          status: "LIVE"
        });
        return false;
      }

      return true;
    })
    .map(generatedContentRowFromWriteBody);
  const allRows = [];

  for (let index = 0; index < upsertRows.length; index += 100) {
    const batch = upsertRows.slice(index, index + 100);
    const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
      method: "POST",
      headers: {
        ...adminHeaders(),
        prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(batch)
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Supabase bulk upsert failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    allRows.push(...payload);
  }

  return {
    rows: allRows,
    skippedLiveRows
  };
}

async function updateGeneratedContent(req: IncomingMessage) {
  const body = await readJsonBody(req);

  if (!body.id) {
    throw new Error("id is required.");
  }

  if (body.status && !allowedStatuses.has(body.status)) {
    throw new Error("status must be DRAFT, REVIEWED, LIVE, ARCHIVED, or ERROR.");
  }
  if (body.sourceLifecycleAction && !["archive", "restore"].includes(body.sourceLifecycleAction)) {
    throw new Error("sourceLifecycleAction must be archive or restore.");
  }

  const existing = await fetchExistingRowById(body.id);
  if (!existing) {
    throw new GeneratedContentRequestError("Content row was not found.", 404);
  }
  if (body.expectedUpdatedAt && body.expectedUpdatedAt !== existing.updated_at) {
    throw new GeneratedContentRequestError("This content changed after the editor was opened. Reload the row before saving so a newer edit is not overwritten.", 409);
  }
  const isPackageRow = isFallbackArchitectureV3Row(existing);
  const effectiveContentKey = body.contentKey ?? existing.content_key;
  const effectiveSurface = (body.surface ?? existing.surface) as GeneratedContentSurface | undefined;

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (body.ownerAction === "approve-package-revision") {
    if (!existing || !isPackageRow) {
      throw new Error("Approve & publish revision is available only for fallback package rows.");
    }
    const unexpectedFields = Object.entries(body)
      .filter(([key, value]) => !["id", "ownerAction", "expectedUpdatedAt"].includes(key) && value !== undefined)
      .map(([key]) => key);
    if (unexpectedFields.length > 0) {
      throw new Error(`Approve & publish revision cannot be combined with other changes: ${unexpectedFields.join(", ")}.`);
    }

    const isGovernedAspectDraft = existing.event_type === "sky-v4-governed-aspect-draft";
    const targetRowId = isGovernedAspectDraft ? stringFrom(existing.source_snapshot?.targetRowId) : existing.id;
    if (!targetRowId) throw new Error("This governed revision is missing its live target row.");
    const target = targetRowId === existing.id ? existing : await fetchExistingRowById(targetRowId);
    if (!target || !isFallbackArchitectureV3Row(target)) {
      throw new Error("The fallback package row targeted by this revision no longer exists.");
    }

    const proposalSections = isRecord(existing.sections) ? existing.sections : {};
    const packageDraft = isRecord(proposalSections.packageDraft) ? proposalSections.packageDraft : null;
    if (!packageDraft) {
      throw new Error("Save the copy revision before approving and publishing it.");
    }
    const targetSections = isRecord(target.sections) ? target.sections : {};
    const targetRecord = v3PackageRecord(target);
    const targetSnapshot = isRecord(target.source_snapshot) ? target.source_snapshot : {};
    if (
      stringFrom(targetRecord.source_package) === skyV4CanonicalStagePackage
      || stringFrom(targetSnapshot.sourcePackage) === skyV4CanonicalStagePackage
    ) {
      throw new Error("SKY V4 reader copy must use its hash-bound owner approval workflow.");
    }
    const contentRole = stringFrom(targetRecord.content_role)
      || stringFrom(targetSnapshot.content_role)
      || stringFrom(target.facts?.content_role);
    if (["fallback_source", "source_material"].includes(contentRole)) {
      throw new GeneratedContentRequestError("Source-material package rows cannot be published as exact reader copy.");
    }

    validateFallbackArchitectureV3Copy(target, {
      sections: { ...targetSections, packageDraft }
    });
    const promotedRecord = structuredClone(targetRecord);
    for (const [field, value] of packageLeafFields(packageDraft)) {
      if (isEditablePackageCopyPath(field, targetRecord)) {
        setPackageValueAt(promotedRecord, field, value);
      }
    }
    const now = new Date().toISOString();
    const promotionPatch: Record<string, unknown> = { updated_at: now };
    applyFallbackArchitectureV3ReviewPatch(target, {
      id: target.id,
      headline: stringFrom(promotedRecord.headline) || target.headline || "",
      summary: stringFrom(promotedRecord.summary) || target.summary || "",
      body: stringFrom(promotedRecord.body_you ?? promotedRecord.body ?? promotedRecord.text) || target.body || "",
      sections: {
        ...targetSections,
        body_you: promotedRecord.body_you ?? targetSections.body_you ?? null,
        body_they: promotedRecord.body_they ?? targetSections.body_they ?? null,
        packageRecord: promotedRecord,
        packageDraft: null
      },
      facts: { ...(target.facts ?? {}), review_status: "approved" },
      sourceSnapshot: { ...targetSnapshot, review_status: "approved" },
      reviewStatus: "approved"
    }, promotionPatch);
    const finalSections = isRecord(promotionPatch.sections) ? { ...promotionPatch.sections } : {};
    delete finalSections.packageDraft;
    const history = Array.isArray(finalSections.dashboardEditHistory)
      ? finalSections.dashboardEditHistory.slice()
      : [];
    if (isRecord(history.at(-1))) {
      history[history.length - 1] = {
        ...history.at(-1),
        versionStatus: "published",
        approvedAt: now,
        review_status: "approved"
      };
    }
    finalSections.dashboardEditHistory = history;
    promotionPatch.sections = finalSections;
    promotionPatch.reviewed_at = now;
    promotionPatch.published_at = now;
    let revisionExpectedUpdatedAt = body.expectedUpdatedAt ?? existing.updated_at ?? null;
    if (target.id !== existing.id && body.expectedUpdatedAt) {
      const claimedAt = new Date().toISOString();
      await patchGeneratedContentRow(existing.id, { updated_at: claimedAt }, body.expectedUpdatedAt);
      revisionExpectedUpdatedAt = claimedAt;
    }
    const published = await patchGeneratedContentRow(target.id, promotionPatch, target.updated_at);
    if (target.id !== existing.id) {
      await patchGeneratedContentRow(existing.id, {
        status: "ARCHIVED",
        lane: "reference",
        review_state: "published-revision",
        updated_at: now
      }, revisionExpectedUpdatedAt);
    }
    return published;
  }

  if (body.ownerAction === "save-sky-article-edition-revision") {
    if (!existing || !["sky-article-edition", "sky-article-edition-revision"].includes(existing.event_type ?? "")) {
      throw new Error("Article autosave is available only for compiled Sky article editions.");
    }
    const sections = isRecord(body.sections) ? body.sections : null;
    const existingSections = isRecord(existing.sections) ? existing.sections : {};
    const baseValue = existing.event_type === "sky-article-edition-revision"
      ? existingSections.skyArticleRevisionBase
      : existingSections.skyArticleEdition;
    const { base, revised, changes } = await verifiedSkyArticleRevision(baseValue, sections?.skyArticleEdition);
    const now = new Date().toISOString();
    const targetRowId = existing.event_type === "sky-article-edition-revision"
      ? stringFrom(existing.source_snapshot?.targetRowId)
      : existing.id;
    const targetContentKey = base.contentKey;
    const revisionSnapshot = {
      ...(isRecord(existing.source_snapshot) ? existing.source_snapshot : {}),
      review_status: "needs_review",
      ownerApproval: null,
      targetRowId,
      targetContentKey,
      baseCompiledHash: base.compiledHash,
      changedFields: changes.map(({ fieldId, label }) => ({ fieldId, label })),
      savedAt: now
    };
    const revisionSections = {
      skyArticleEdition: revised,
      skyArticleRevisionBase: base
    };
    const revisionPatch = {
      headline: revised.headline,
      summary: revised.tldr,
      body: revised.body,
      sections: revisionSections,
      status: "DRAFT",
      lane: "reference",
      review_state: "owner-review-required",
      source_snapshot: revisionSnapshot,
      updated_at: now,
      published_at: null
    };

    if (existing.status !== "LIVE") {
      return patchGeneratedContentRow(existing.id, revisionPatch, body.expectedUpdatedAt);
    }

    return upsertGeneratedContentRow({
      content_key: skyArticleRevisionContentKey(base.contentKey),
      surface: "sky",
      mode: "article",
      event_type: "sky-article-edition-revision",
      target_date: existing.target_date,
      facts: existing.facts ?? {},
      knowledge_ids: [],
      block_type: "sky_article",
      prompt_version: "sky-article-owner-field-revision-v1",
      provider: "owner-edited-sky-article",
      model: "manual",
      reviewer_notes: "Owner field revision. Non-serving until Publish changes.",
      ...revisionPatch
    });
  }

  if (body.ownerAction === "publish-sky-article-edition-revision") {
    if (!existing || existing.event_type !== "sky-article-edition-revision") {
      throw new Error("Publish changes is available only for a saved Sky article revision.");
    }
    const sections = isRecord(existing.sections) ? existing.sections : {};
    const { base, revised, changes } = await verifiedSkyArticleRevision(
      sections.skyArticleRevisionBase,
      sections.skyArticleEdition
    );
    const targetRowId = stringFrom(existing.source_snapshot?.targetRowId);
    if (!targetRowId) throw new Error("Sky article revision is missing its live target row.");
    let revisionExpectedUpdatedAt = body.expectedUpdatedAt ?? existing.updated_at ?? null;
    if (body.expectedUpdatedAt) {
      const claimedAt = new Date().toISOString();
      await patchGeneratedContentRow(existing.id, { updated_at: claimedAt }, body.expectedUpdatedAt);
      revisionExpectedUpdatedAt = claimedAt;
    }
    const target = await fetchExistingRowById(targetRowId);
    if (!target || target.event_type !== "sky-article-edition") {
      throw new Error("The live Sky article targeted by this revision no longer exists.");
    }
    const current = assertCompiledSkyArticleEdition(target.sections?.skyArticleEdition);
    if (current.compiledHash !== base.compiledHash) {
      throw new Error("The live Sky article changed after this draft began. Reopen it before publishing.");
    }
    const now = new Date().toISOString();
    const targetSnapshot = isRecord(target.source_snapshot) ? { ...target.source_snapshot } : {};
    const history = Array.isArray(targetSnapshot.skyArticleRevisionHistory)
      ? targetSnapshot.skyArticleRevisionHistory.slice()
      : [];
    history.push({
      edition: current,
      ownerApproval: targetSnapshot.ownerApproval ?? null,
      replacedAt: now
    });
    const approvedSnapshot = skyArticleApprovalSnapshot(targetSnapshot, revised, now);
    approvedSnapshot.skyArticleRevisionHistory = history;
    approvedSnapshot.lastFieldRevision = {
      changedFields: changes.map(({ fieldId, label }) => ({ fieldId, label })),
      revisionRowId: existing.id,
      publishedAt: now
    };
    const published = await patchGeneratedContentRow(target.id, {
      headline: revised.headline,
      summary: revised.tldr,
      body: revised.body,
      sections: { skyArticleEdition: revised },
      source_snapshot: approvedSnapshot,
      status: "LIVE",
      lane: "serving",
      review_state: null,
      reviewed_at: now,
      published_at: now,
      updated_at: now
    }, target.updated_at);
    await patchGeneratedContentRow(existing.id, {
      status: "ARCHIVED",
      lane: "reference",
      review_state: "published-revision",
      updated_at: now
    }, revisionExpectedUpdatedAt);
    return published;
  }

  if (body.ownerAction === "approve-and-schedule") {
    if (!existing || !["sky_aspect", "sky_placement"].includes(existing.block_type ?? "")) {
      throw new Error("Approve and schedule is available only for generated Sky aspect and placement rows.");
    }
    const includesCopyEdit = [body.headline, body.summary, body.body, body.sections]
      .some((value) => value !== undefined);
    if (includesCopyEdit) {
      throw new Error("Save and revalidate copy edits before approving and scheduling the row.");
    }
    const unexpectedFields = Object.entries(body)
      .filter(([key, value]) => !["id", "ownerAction", "expectedUpdatedAt"].includes(key) && value !== undefined)
      .map(([key]) => key);
    if (unexpectedFields.length > 0) {
      throw new Error(`Approve and schedule cannot be combined with other changes: ${unexpectedFields.join(", ")}.`);
    }
    if (existing.judge_gate !== "human-review") {
      throw new Error("Approve and schedule requires the human-review judge gate.");
    }
    assertCanPublishGeneratedContent({
      ...existing,
      contentKey: existing.content_key,
      provider: existing.provider,
      promptVersion: existing.prompt_version,
      sourceSnapshot: existing.source_snapshot,
      blockType: existing.block_type,
      judgeScore: existing.judge_score,
      judgeGate: existing.judge_gate
    });
    const now = new Date().toISOString();
    const isSkyPlacement = existing.block_type === "sky_placement";
    patch.status = isSkyPlacement ? "REVIEWED" : "LIVE";
    patch.lane = isSkyPlacement ? "reference" : "serving";
    patch.review_state = isSkyPlacement ? "owner-approved-package-import-required" : null;
    patch.reviewed_at = now;
    patch.published_at = isSkyPlacement ? null : now;
    if (isSkyPlacement) {
      patch.source_snapshot = {
        ...(existing.source_snapshot ?? {}),
        ownerApproval: {
          approved: true,
          action: "approve-sky-placement-for-package",
          approvedAt: now,
          contentKey: existing.content_key,
          source: "content-studio-explicit-action"
        }
      };
    }
  }

  if (body.ownerAction === "approve-sky-article-edition") {
    if (!existing || existing.block_type !== "sky_article" || existing.event_type !== "sky-article-edition") {
      throw new Error("Approve & publish edition is available only for compiled Sky article editions.");
    }
    const unexpectedFields = Object.entries(body)
      .filter(([key, value]) => !["id", "ownerAction", "expectedUpdatedAt"].includes(key) && value !== undefined)
      .map(([key]) => key);
    if (unexpectedFields.length > 0) {
      throw new Error(`Approve & publish edition cannot be combined with other changes: ${unexpectedFields.join(", ")}.`);
    }
    const edition = assertCompiledSkyArticleEdition(existing.sections?.skyArticleEdition);
    if (
      existing.content_key !== edition.contentKey
      || existing.headline !== edition.headline
      || existing.summary !== edition.tldr
      || existing.body !== edition.body
    ) {
      throw new Error("The saved edition no longer matches its compiled record. Recompile it before approval.");
    }
    const now = new Date().toISOString();
    const sourceSnapshot = skyArticleApprovalSnapshot(existing.source_snapshot, edition, now);
    patch.status = "LIVE";
    patch.lane = "serving";
    patch.review_state = null;
    patch.reviewed_at = now;
    patch.published_at = now;
    patch.source_snapshot = sourceSnapshot;
  }

  if (isPackageRow && existing) {
    assertFallbackArchitectureV3StructureLocked(existing, body);
  }

  if (body.status) {
    if (body.status === "LIVE" && isSampleOnlyRow(effectiveSurface, effectiveContentKey)) {
      throw new GeneratedContentRequestError("Personalized content test rows cannot be published globally. Generate real user or bond scoped content instead.");
    }

    if (body.status === "LIVE") {
      const requestedEdition = isRecord(body.sections) ? skyArticleEditionRecord(body.sections.skyArticleEdition) : null;
      if (existing?.event_type === "sky-article-edition" || body.eventType === "sky-article-edition" || requestedEdition) {
        throw new GeneratedContentRequestError("Use Approve & publish edition so the exact compiled Sky article receives an owner approval record.", 409);
      }
      if (!isPackageRow) {
        const effectiveLane = typeof body.lane === "string" && body.lane.trim()
          ? body.lane.trim()
          : existing.lane ?? "serving";
        if (effectiveLane !== "serving") {
          throw new GeneratedContentRequestError("Published content must use the serving lane.", 409);
        }
      }
      assertValidCmsTemplate({
        contentKey: body.contentKey ?? existing?.content_key,
        headline: body.headline ?? existing?.headline,
        summary: body.summary ?? existing?.summary,
        body: body.body ?? existing?.body,
        sourceSnapshot: body.sourceSnapshot ?? existing?.source_snapshot
      });
      assertCanPublishGeneratedContent({
        ...existing,
        contentKey: body.contentKey ?? existing?.content_key,
        provider: body.provider ?? existing?.provider,
        promptVersion: body.promptVersion ?? existing?.prompt_version,
        sourceSnapshot: body.sourceSnapshot ?? existing?.source_snapshot,
        blockType: body.blockType ?? existing?.block_type,
        eventType: body.eventType ?? existing?.event_type,
        sections: body.sections ?? existing?.sections,
        judgeScore: existing?.judge_score,
        judgeGate: existing?.judge_gate
      });
    }

    patch.status = body.status;

    if (body.status === "REVIEWED") {
      patch.reviewed_at = new Date().toISOString();
      patch.review_state = null;
    }

    if (body.status === "LIVE") {
      const now = new Date().toISOString();
      patch.reviewed_at = now;
      patch.published_at = now;
      patch.review_state = null;
    }
  }

  if (typeof body.contentKey === "string") {
    patch.content_key = body.contentKey.trim();
  }

  if (body.surface) {
    patch.surface = body.surface;
  }

  if (body.mode) {
    patch.mode = body.mode;
  }

  if (typeof body.eventType === "string") {
    patch.event_type = body.eventType.trim();
  }

  if (body.targetDate !== undefined) {
    patch.target_date = body.targetDate || null;
  }

  if (typeof body.headline === "string") {
    patch.headline = body.headline;
  }

  if (typeof body.summary === "string") {
    patch.summary = body.summary;
  }

  if (typeof body.body === "string") {
    patch.body = body.body;
  }

  if (body.sections !== undefined) {
    patch.sections = body.sections;
  }

  if (body.facts !== undefined) {
    patch.facts = body.facts;
  }

  if (body.knowledgeIds !== undefined) {
    patch.knowledge_ids = body.knowledgeIds;
  }

  if (body.sourceSnapshot !== undefined) {
    patch.source_snapshot = body.sourceSnapshot;
  }

  if (typeof body.lane === "string") {
    patch.lane = body.lane.trim() || "serving";
  }

  if (body.reviewState !== undefined) {
    patch.review_state = body.reviewState || null;
  }

  if (typeof body.promptVersion === "string") {
    patch.prompt_version = body.promptVersion.trim() || "manual-admin";
  }

  if (body.blockType !== undefined) {
    patch.block_type = normalizedGeneratedContentBlockType(body.blockType, body.surface, body.mode) ?? null;
  }

  if (typeof body.reviewerNotes === "string") {
    patch.reviewer_notes = body.reviewerNotes;
  }

  if (typeof body.evergreen === "boolean") {
    patch.evergreen = body.evergreen;
    patch.evergreen_at = body.evergreen ? body.evergreenAt ?? new Date().toISOString() : null;
    patch.evergreen_by = body.evergreen ? body.evergreenBy ?? "admin" : null;
  }

  const editsSkyCopy = ["sky_aspect", "sky_placement"].includes(existing?.block_type ?? "") && (
    (body.headline !== undefined && body.headline !== existing.headline)
    || (body.summary !== undefined && body.summary !== existing.summary)
    || (body.body !== undefined && body.body !== existing.body)
    || (body.sections !== undefined && JSON.stringify(body.sections) !== JSON.stringify(existing.sections))
  );

  if (editsSkyCopy) {
    patch.status = "DRAFT";
    patch.review_state = "sky-voice-needs-review";
    patch.judge_score = null;
    patch.judge_verdict = null;
    patch.judge_gate = null;
    patch.judge_why = "Card copy changed after judging and must be generated or judged again.";
    patch.published_at = null;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("No review fields were provided.");
  }

  if (isPackageRow && existing) {
    applyFallbackArchitectureV3ReviewPatch(existing, body, patch);
  }

  const existingPackageRecord = existing ? v3PackageRecord(existing) : {};
  const forksGovernedAspectDraft = Boolean(
    isPackageRow
    && existing
    && existing.status === "LIVE"
    && stringFrom(existingPackageRecord.studio_content_type) === "aspect"
    && isRecord((patch.sections as Record<string, unknown> | undefined)?.packageDraft)
  );
  const forksSkyV4ServingDraft = Boolean(
    isPackageRow
    && existing
    && existing.status === "LIVE"
    && stringFrom(existingPackageRecord.source_package) === skyV4CanonicalStagePackage
    && skyV4ServingReleasedReaderCopyKeys.has(existing.content_key)
    && isRecord((patch.sections as Record<string, unknown> | undefined)?.packageDraft)
  );
  if ((forksGovernedAspectDraft || forksSkyV4ServingDraft) && existing) {
    const skyV4ReaderDraft = forksSkyV4ServingDraft && !forksGovernedAspectDraft;
    return upsertGeneratedContentRow({
      content_key: existing.content_key,
      surface: existing.surface,
      target_date: existing.target_date,
      mode: "studio-draft",
      event_type: skyV4ReaderDraft ? "sky-v4-reader-copy-draft" : "sky-v4-governed-aspect-draft",
      block_type: existing.block_type,
      provider: "owner-content-studio",
      prompt_version: skyV4ReaderDraft ? "sky-v4-reader-copy-draft-v1" : "sky-v4-governed-aspect-draft-v1",
      reviewer_notes: skyV4ReaderDraft
        ? "Versioned reader-copy draft. The approved SKY V4 serving baseline remains LIVE and unchanged."
        : "Versioned reader-copy draft. The approved governed aspect baseline remains LIVE and unchanged.",
      knowledge_ids: [],
      ...patch,
      source_snapshot: {
        ...(isRecord(patch.source_snapshot) ? patch.source_snapshot : {}),
        targetRowId: existing.id,
        targetContentKey: existing.content_key
      },
      status: "DRAFT",
      lane: "reference",
      review_state: "owner-review-required",
      published_at: null
    });
  }

  const updateParams = new URLSearchParams();
  updateParams.set("id", `eq.${body.id}`);
  if (body.expectedUpdatedAt) updateParams.set("updated_at", `eq.${body.expectedUpdatedAt}`);
  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${updateParams.toString()}`, {
    method: "PATCH",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    },
    body: JSON.stringify(patch)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase review update failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  const updatedRows = Array.isArray(payload) ? payload : [];
  if (updatedRows.length === 0) {
    if (body.expectedUpdatedAt) {
      throw new GeneratedContentRequestError("This content changed before the update completed. Reload the row before saving so a newer edit is not overwritten.", 409);
    }
    throw new GeneratedContentRequestError("Content row was not found.", 404);
  }

  return updatedRows;
}

async function deleteGeneratedContent(req: IncomingMessage) {
  const requestUrl = new URL(req.url ?? "/api/admin/generated-content", "http://localhost");
  const id = requestUrl.searchParams.get("id");
  const expectedUpdatedAt = requestUrl.searchParams.get("expectedUpdatedAt");

  if (!id) {
    throw new GeneratedContentRequestError("id is required.");
  }

  const existing = await fetchExistingRowById(id);
  if (!existing) {
    throw new GeneratedContentRequestError("Content row was not found.", 404);
  }
  if (existing.status === "LIVE") {
    throw new GeneratedContentRequestError("Published rows cannot be hard-deleted. Demote or archive the row first.", 409);
  }
  if (expectedUpdatedAt && expectedUpdatedAt !== existing.updated_at) {
    throw new GeneratedContentRequestError("This content changed after it was selected for deletion. Reload before deleting it.", 409);
  }

  const deleteParams = new URLSearchParams();
  deleteParams.set("id", `eq.${id}`);
  deleteParams.set("status", "neq.LIVE");
  if (expectedUpdatedAt) deleteParams.set("updated_at", `eq.${expectedUpdatedAt}`);
  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${deleteParams.toString()}`, {
    method: "DELETE",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase delete failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  const deletedRows = Array.isArray(payload) ? payload : [];
  if (deletedRows.length === 0) {
    throw new GeneratedContentRequestError("This content changed, was already deleted, or became published before deletion completed. Reload before trying again.", 409);
  }

  return deletedRows;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  try {
    if (req.method === "GET") {
      const requestUrl = new URL(req.url ?? "/api/admin/generated-content", "http://localhost");
      if (requestUrl.searchParams.get("sourceDrafts") === "sky-aspects") {
        sendJson(res, 200, { ok: true, rows: listHeldSkyAspectSourceDrafts() });
        return;
      }
      if (requestUrl.searchParams.get("stats") === "true") {
        sendJson(res, 200, { ok: true, stats: await generatedContentStats(req) });
        return;
      }

      const rows = await listGeneratedContent(req);
      const requestLimit = boundedGeneratedContentLimit(requestUrl.searchParams.get("limit"));
      const scope = requestUrl.searchParams.get("scope") ?? "all";
      const hasDateRange = Boolean(requestUrl.searchParams.get("startDate") || requestUrl.searchParams.get("endDate"));
      const nextCursor = rows.length === requestLimit
        ? scope === "compatibility"
          ? rows.at(-1)?.id ?? null
          : hasDateRange
            ? null
            : encodeGeneratedContentCursor(rows.at(-1))
        : null;
      sendJson(res, 200, { ok: true, rows, nextCursor });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (Array.isArray(body.rows)) {
        const result = await bulkUpsertGeneratedContent(body);
        sendJson(res, 200, { ok: true, rows: result.rows, skippedLiveRows: result.skippedLiveRows });
        return;
      }

      const rows = await createGeneratedContentFromBody(body);
      if (!Array.isArray(rows) || rows.length === 0) throw new Error("Create completed without returning the saved row.");
      sendJson(res, 200, { ok: true, rows });
      return;
    }

    if (req.method === "PATCH") {
      const rows = await updateGeneratedContent(req);
      if (!Array.isArray(rows) || rows.length === 0) throw new Error("Update completed without returning the saved row.");
      sendJson(res, 200, { ok: true, rows });
      return;
    }

    if (req.method === "DELETE") {
      const rows = await deleteGeneratedContent(req);
      if (!Array.isArray(rows) || rows.length === 0) throw new Error("Delete completed without returning the removed row.");
      sendJson(res, 200, { ok: true, rows });
      return;
    }

    sendJson(res, 405, { error: "Use GET, POST, PATCH, or DELETE." });
  } catch (error) {
    sendJson(
      res,
      error instanceof GeneratedContentRequestError
        ? error.statusCode
        : error instanceof AdminStorageTimeoutError
          ? 504
          : 500,
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown generated content admin error."
      }
    );
  }
}
