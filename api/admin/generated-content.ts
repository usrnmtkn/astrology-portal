import type { IncomingMessage, ServerResponse } from "node:http";
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

loadLocalWebEnv();

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
  ownerAction?:
    | "approve-and-schedule"
    | "approve-sky-article-edition"
    | "save-sky-article-edition-revision"
    | "publish-sky-article-edition-revision";
};

type GeneratedContentRequestBody = GeneratedContentWriteBody & {
  rows?: GeneratedContentWriteBody[];
};

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
const fallbackArchitectureV3ReviewStatuses = new Set(["needs_review", "approved", "approved_reuse"]);
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

function packagePlaceholders(value: unknown) {
  const matches = stringFrom(value).match(/{{\s*[\w.-]+\s*}}/g) ?? [];
  return new Set(matches.map((match) => match.replace(/\s+/g, "")));
}

function packageStringFields(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]];
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => packageStringFields(child, prefix ? `${prefix}.${key}` : key));
}

function packageValueAt(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, part) => isRecord(current) ? current[part] : undefined, value);
}

function isEditablePackageCopyPath(path: string) {
  return ["fact_line", "opening", "tension", "development", "close", "body", "body_you", "body_they"]
    .includes(path)
    || path.startsWith("era_layer.");
}

function validateFallbackArchitectureV3Copy(row: ExistingGeneratedContentRow, patch: Record<string, unknown>) {
  const record = v3PackageRecord(row);
  const bannedWords = contentRoleContract().styleRules?.bannedWords ?? [];
  const editableFields: Array<[string, unknown, unknown]> = [
    ["headline", patch.headline, record.headline],
    ["summary", patch.summary, record.summary],
    ["body", patch.body, record.body]
  ];
  const sections = isRecord(patch.sections) ? patch.sections : {};
  editableFields.push(["body_you", sections.body_you, record.body_you]);
  editableFields.push(["body_they", sections.body_they, record.body_they]);
  const packageDraft = isRecord(sections.packageDraft) ? sections.packageDraft : null;
  if (packageDraft) {
    for (const [field, value] of packageStringFields(packageDraft).filter(([field]) => isEditablePackageCopyPath(field))) {
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
  const reviewStatus = hasPackageDraft
    ? "needs_review"
    : packageReviewStatus(row, body.reviewStatus || stringFrom(sourceSnapshot.review_status));

  if (!fallbackArchitectureV3ReviewStatuses.has(reviewStatus)) {
    throw new Error("review_status must be needs_review, approved, or approved_reuse.");
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
  // prose fields from the client; structural and provenance fields stay locked
  // to the installed package record.
  if (!body.revertToPackageOriginal) {
    for (const field of [
      "headline",
      "summary",
      "body",
      "body_you",
      "body_they",
      "opening",
      "tension",
      "development",
      "close"
    ]) {
      if (typeof incomingRecord[field] === "string") {
        record[field] = incomingRecord[field];
      }
    }
  }

  // Package rows are rendered from sections.packageRecord, not from the
  // dashboard's top-level mirrors. Keep every editable prose field in sync so
  // a successful admin save cannot silently leave the reader on stale copy.
  if (typeof patch.headline === "string") {
    record.headline = patch.headline;
  }
  if (typeof patch.summary === "string") {
    record.summary = patch.summary;
  }
  const topLevelBodyChanged = typeof patch.body === "string" && patch.body !== (row.body ?? "");
  const incomingBodyYouChanged = typeof incomingRecord.body_you === "string"
    && incomingRecord.body_you !== v3PackageRecord(row).body_you;
  const sectionBodyYouChanged = typeof sections.body_you === "string"
    && sections.body_you !== v3PackageRecord(row).body_you;
  if (topLevelBodyChanged && !incomingBodyYouChanged && !sectionBodyYouChanged) {
    if (record.render_policy === "sky-placement-continuous-v2") {
      throw new Error("Continuous Sky write-ups must be edited in Opening, Tension, Development, and Close so the reader structure stays intact.");
    }
    if (typeof record.body_you === "string") {
      record.body_you = patch.body;
      sections.body_you = patch.body;
    } else {
      record.body = patch.body;
    }
  }
  if (typeof sections.body_you === "string") {
    record.body_you = sections.body_you;
  }
  if (typeof sections.body_they === "string") {
    record.body_they = sections.body_they;
  }

  if (record.render_policy === "sky-placement-continuous-v2" && typeof record.body_you === "string") {
    record.body_you = [record.opening, record.tension, record.development, record.close]
      .filter((part) => typeof part === "string" && part.trim())
      .join("\n\n");
  }

  const readerBody = record.render_policy === "sky-placement-continuous-v2" && typeof record.body_you !== "string"
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
  patch.body = readerBody;
  sections.body_you = record.body_you ?? null;
  sections.body_they = record.body_they ?? null;

  if (!hasPackageDraft) record.review_status = reviewStatus;
  if (typeof body.editorialNotes === "string") {
    record.editorial_notes = body.editorialNotes;
  }

  sections.packageRecord = record;
  sections.packageOriginalRecord = packageOriginalRecord;
  sections.dashboardEditHistory = [
    ...(Array.isArray(sections.dashboardEditHistory) ? sections.dashboardEditHistory : []),
    {
      editedAt: patch.updated_at,
      headline: row.headline ?? "",
      summary: row.summary ?? "",
      body: row.body ?? "",
      review_status: packageReviewStatus(row)
    }
  ].slice(-25);

  facts.review_status = reviewStatus;
  facts.readerServing = readerServingForPackageReview(reviewStatus);
  sourceSnapshot.review_status = reviewStatus;

  patch.sections = sections;
  patch.facts = facts;
  patch.source_snapshot = sourceSnapshot;
  patch.status = readerServingForPackageReview(reviewStatus) ? "LIVE" : "DRAFT";
  patch.lane = readerServingForPackageReview(reviewStatus) ? "serving" : "reference";
  patch.review_state = readerServingForPackageReview(reviewStatus) ? null : "needs-review";
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
  const sourceRoot = path.join(
    process.cwd(),
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
        throw new Error(`${path.relative(process.cwd(), absolutePath)} is not a held Current Sky aspect draft.`);
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
        sourcePath: path.relative(process.cwd(), absolutePath),
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
  const limit = Math.min(Number(requestUrl.searchParams.get("limit") ?? "50"), 1000);
  const offset = Math.max(Number(requestUrl.searchParams.get("offset") ?? "0"), 0);
  const selectColumns = [
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
  const params = new URLSearchParams({
    select: selectColumns.join(","),
    order: startDate || endDate ? "target_date.asc.nullslast" : "updated_at.desc",
    limit: id ? "1" : String(limit),
    offset: id ? "0" : String(offset)
  });

  if (id) {
    params.set("id", `eq.${id}`);
  } else if (visibility === "editorial") {
    params.set("lane", "eq.serving");
    params.set("status", "neq.ARCHIVED");
  } else if (status !== "all") {
    params.set("status", `eq.${status}`);
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
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
      headers: adminHeaders()
    });
    const payload = await response.json().catch(() => null);

    if (response.ok) {
      return payload;
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

  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
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

  const blockType = normalizedGeneratedContentBlockType(body.blockType, body.surface, body.mode);
  const isCmsRow = isCmsGeneratedContentWriteBody(body);
  const row = {
    content_key: body.contentKey.trim(),
    surface: body.surface,
    mode: body.mode,
    status: "DRAFT",
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
    provider: isCmsRow ? "manual-admin" : "claude",
    model: "manual",
    headline: body.headline ?? "",
    summary: body.summary ?? "",
    body: body.body ?? "",
    sections: body.sections ?? [],
    reviewer_notes: body.reviewerNotes ?? (isSampleOnlyRow(body.surface, body.contentKey) ? sampleOnlyReviewerNote : "")
  };

  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(row)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
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
    throw new Error("Personalized content test rows cannot be published globally. Generate real user or bond scoped content instead.");
  }

  if (body.status === "LIVE") {
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
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
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
  params.set("select", "id,content_key,surface,target_date,mode,event_type,status,headline,summary,body,sections,facts,lane,review_state,block_type,provider,prompt_version,source_snapshot,judge_score,judge_verdict,judge_gate,judge_why");
  params.set("id", `eq.${id}`);
  params.set("limit", "1");
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase row lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return Array.isArray(payload) ? payload[0] as ExistingGeneratedContentRow | undefined : undefined;
}

async function patchGeneratedContentRow(id: string, patch: Record<string, unknown>) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(id)}`, {
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
  return payload as ExistingGeneratedContentRow[];
}

async function upsertGeneratedContentRow(row: Record<string, unknown>) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
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
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
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

  const existing = await fetchExistingRowById(body.id);
  const isPackageRow = isFallbackArchitectureV3Row(existing);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

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
      return patchGeneratedContentRow(existing.id, revisionPatch);
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
    });
    await patchGeneratedContentRow(existing.id, {
      status: "ARCHIVED",
      lane: "reference",
      review_state: "published-revision",
      updated_at: now
    });
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
      .filter(([key, value]) => !["id", "ownerAction"].includes(key) && value !== undefined)
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
    patch.status = "LIVE";
    patch.lane = "serving";
    patch.review_state = null;
    patch.reviewed_at = now;
    patch.published_at = now;
  }

  if (body.ownerAction === "approve-sky-article-edition") {
    if (!existing || existing.block_type !== "sky_article" || existing.event_type !== "sky-article-edition") {
      throw new Error("Approve & publish edition is available only for compiled Sky article editions.");
    }
    const unexpectedFields = Object.entries(body)
      .filter(([key, value]) => !["id", "ownerAction"].includes(key) && value !== undefined)
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
    if (body.status === "LIVE" && isSampleOnlyRow(body.surface, body.contentKey)) {
      throw new Error("Personalized content test rows cannot be published globally. Generate real user or bond scoped content instead.");
    }

    if (body.status === "LIVE") {
      const requestedEdition = isRecord(body.sections) ? skyArticleEditionRecord(body.sections.skyArticleEdition) : null;
      if (existing?.event_type === "sky-article-edition" || body.eventType === "sky-article-edition" || requestedEdition) {
        throw new Error("Use Approve & publish edition so the exact compiled Sky article receives an owner approval record.");
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

  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(body.id)}`, {
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

  return payload;
}

async function deleteGeneratedContent(req: IncomingMessage) {
  const requestUrl = new URL(req.url ?? "/api/admin/generated-content", "http://localhost");
  const id = requestUrl.searchParams.get("id");

  if (!id) {
    throw new Error("id is required.");
  }

  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(id)}`, {
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

  return payload;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!isContentAdminAuthorized(req)) {
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

      sendJson(res, 200, { ok: true, rows: await listGeneratedContent(req) });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (Array.isArray(body.rows)) {
        const result = await bulkUpsertGeneratedContent(body);
        sendJson(res, 200, { ok: true, rows: result.rows, skippedLiveRows: result.skippedLiveRows });
        return;
      }

      sendJson(res, 200, { ok: true, rows: await createGeneratedContentFromBody(body) });
      return;
    }

    if (req.method === "PATCH") {
      sendJson(res, 200, { ok: true, rows: await updateGeneratedContent(req) });
      return;
    }

    if (req.method === "DELETE") {
      sendJson(res, 200, { ok: true, rows: await deleteGeneratedContent(req) });
      return;
    }

    sendJson(res, 405, { error: "Use GET, POST, PATCH, or DELETE." });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown generated content admin error."
    });
  }
}
