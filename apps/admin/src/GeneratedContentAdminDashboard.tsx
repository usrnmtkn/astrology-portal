import {
  Activity,
  Archive,
  BookOpenText,
  Check,
  Database,
  FileText,
  Flag,
  KeyRound,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Save,
  Search,
  Server,
  Sparkles,
  Trash2,
  Users
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  fallbackHookDefinitions,
  lunarCalendarContentKeyDefinitions,
  type FallbackHookDefinition,
  type LunarCalendarContentKeyDefinition
} from "../../web/src/content/fallbackHooks";
import { isReaderFacingCopy } from "../../web/src/content/readerSafety";
import skyContentSnapshot from "../../web/src/content/skyContentSnapshot.json";
import "./admin.css";

type GeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship" | "modifier" | "friends";
type GeneratedContentMode = "feed" | "in_depth" | "article" | "card" | string;
type AdminDashboardPage =
  | "overview"
  | "articles"
  | "content"
  | "reviewQueue"
  | "compositeByType"
  | "connection"
  | "appBehavior"
  | "vocabulary"
  | "slotDictionary"
  | "knowledge"
  | "templates"
  | "hooks"
  | "users"
  | "releaseNotes";
type AdminContentClass = "phrasebank" | "fallback-hook" | "vocab" | "reference" | "legacy" | "user-generated" | "other";
type AdminContentClassFilter = AdminContentClass | "all";
type AdminPhrasebankTier = "CONFIRMED" | "REVIEWED" | "SESSION_APPROVED_DRAFT" | "none";
type AdminPhrasebankTierFilter = AdminPhrasebankTier | "all";
type AdminContentCategoryFilter = "all" | "Sky" | "Natal Aspects" | "Natal Angles" | "Natal Chart" | "Relationship" | "Condition Modifiers" | "Fallback Templates";
type AdminFallbackHookSectionFilter = "all" | "sky" | "you" | "friends" | "lunar-calendar" | "settings";
type WritingSurfaceAreaFilter = "all" | "sky" | "you" | "friends" | "calendar" | "settings";
type WritingSurfaceStatusFilter = "all" | "complete" | "partial" | "missing";
type AdminArticlePointFilter = "all" | "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto" | "other";

type AdminGeneratedContentRow = {
  id: string;
  content_key: string;
  surface: GeneratedContentSurface;
  mode: GeneratedContentMode;
  status: GeneratedContentStatus;
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string | null;
  sections: unknown;
  block_type?: string | null;
  lane?: string | null;
  review_state?: string | null;
  evergreen?: boolean | null;
  evergreen_at?: string | null;
  evergreen_by?: string | null;
  facts?: Record<string, unknown> | null;
  knowledge_ids?: string[] | null;
  source_snapshot?: Record<string, unknown> | null;
  reviewer_notes?: string | null;
  prompt_version?: string | null;
  provider?: string | null;
  model?: string | null;
  reviewed_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type LocalSkySnapshotRow = {
  id: string;
  contentKey: string;
  aliases?: string[];
  surface: GeneratedContentSurface;
  mode: GeneratedContentMode;
  eventType: string | null;
  targetDate: string | null;
  headline: string | null;
  summary: string | null;
  body: string | null;
  sections?: unknown;
  blockType?: string | null;
  provider?: string | null;
  sourceSnapshot?: Record<string, unknown> | null;
  model?: string | null;
  updatedAt?: string | null;
};

type AdminReviewRecord = {
  id: string;
  source: string;
  surface: GeneratedContentSurface;
  status: GeneratedContentStatus;
  mode: GeneratedContentMode;
  title: string;
  subtitle: string;
  targetDate: string | null;
  contentKey: string;
  eventType: string | null;
  summary: string;
  body: string;
  sections?: unknown;
  blockType?: string | null;
  facts?: Record<string, unknown> | null;
  sourceSnapshot?: Record<string, unknown> | null;
  reviewerNotes?: string | null;
  provider?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  updatedAt?: string | null;
  rawGlobalRow?: AdminGeneratedContentRow;
};

type AdminUserGeneratedContentRow = {
  id: string;
  user_id: string;
  subject_type: string;
  subject_id: string;
  content_key: string;
  surface: GeneratedContentSurface;
  mode: GeneratedContentMode;
  status: GeneratedContentStatus;
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string | null;
  error?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type AdminContentFact = {
  id?: string;
  content_key?: string;
  key?: string;
  surface?: string;
  mode?: string;
  facts?: Record<string, unknown> | null;
  updated_at?: string | null;
};

type HookCatalogItem =
  | { type: "fallback"; key: string; label: string; section: AdminFallbackHookSectionFilter; definition: FallbackHookDefinition }
  | { type: "lunar"; key: string; label: string; section: "lunar-calendar"; definition: LunarCalendarContentKeyDefinition };
type AdminLoadState = "idle" | "loading" | "loaded" | "accessDenied" | "error";
type AdminAppDisplaySource = "dashboard-article" | "reviewed-phrasebank" | "madlib-fallback";

type AdminDraft = {
  id: string | null;
  contentKey: string;
  surface: GeneratedContentSurface;
  mode: GeneratedContentMode;
  status: GeneratedContentStatus;
  headline: string;
  summary: string;
  body: string;
  lane: string;
  reviewState: string;
  blockType: string;
  promptVersion: string;
  appDisplaySource: AdminAppDisplaySource;
  sourceSnapshot: Record<string, unknown> | null;
};

type AdminVocabularySection = "planets" | "signs" | "natal" | "relationship" | "career";
type AdminVocabularyCategoryFilter = AdminVocabularySection | "all";

const adminSecretStorageKey = "tldrastro:contentAdminSecret";

function getLocalContentGenerationSecret() {
  return (globalThis as typeof globalThis & { __LOCAL_CONTENT_GENERATION_SECRET__?: string }).__LOCAL_CONTENT_GENERATION_SECRET__ ?? "";
}

const vocabularySections: Array<{ key: AdminVocabularySection; label: string; description: string }> = [
  { key: "planets", label: "Planets", description: "Planet meanings, placements, and phase language." },
  { key: "signs", label: "Signs", description: "Sign tone, style, needs, and expression." },
  { key: "natal", label: "Natal", description: "Birth-chart phrases, houses, angles, and placements." },
  { key: "relationship", label: "Relationship", description: "Synastry, composite, friends, romantic, and family phrases." },
  { key: "career", label: "Career", description: "Work, vocation, money, and public-facing purpose phrases." }
];

const adminPageHashKeys: Record<AdminDashboardPage, string> = {
  overview: "home",
  articles: "articles",
  content: "exact-content",
  reviewQueue: "review-queue",
  compositeByType: "composite-review",
  connection: "connection",
  appBehavior: "app-behavior",
  vocabulary: "vocabulary",
  slotDictionary: "slots",
  knowledge: "fallback-hooks",
  templates: "templates",
  hooks: "surface-map",
  users: "users",
  releaseNotes: "release-notes"
};

const adminPageByHashKey = {
  review: "reviewQueue",
  ...Object.fromEntries(
    Object.entries(adminPageHashKeys).map(([page, hashKey]) => [hashKey, page])
  )
} as Record<string, AdminDashboardPage>;

const adminNavGroups: Array<{
  label: string;
  items: Array<{ page: AdminDashboardPage; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    label: "Review",
    items: [
      { page: "overview", label: "Studio Home", icon: LayoutDashboard },
      { page: "reviewQueue", label: "Review Queue", icon: Check },
      { page: "content", label: "Content Library", icon: BookOpenText },
      { page: "articles", label: "Articles", icon: FileText },
      { page: "compositeByType", label: "Composite Review", icon: Users },
      { page: "users", label: "Users", icon: Users }
    ]
  },
  {
    label: "Composition",
    items: [
      { page: "templates", label: "Templates", icon: Sparkles },
      { page: "slotDictionary", label: "Slots", icon: KeyRound },
      { page: "vocabulary", label: "Vocabulary & Phrases", icon: BookOpenText },
      { page: "knowledge", label: "Fallback Hooks", icon: FileText },
      { page: "hooks", label: "Surface Map", icon: Flag }
    ]
  },
  {
    label: "System",
    items: [
      { page: "connection", label: "Connection", icon: Server },
      { page: "appBehavior", label: "App Behavior", icon: Activity },
      { page: "releaseNotes", label: "Release Notes", icon: Archive }
    ]
  }
];

const contentStatuses: GeneratedContentStatus[] = ["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "ERROR"];
const contentClassFilters: Array<{ key: AdminContentClassFilter; label: string }> = [
  { key: "all", label: "All classes" },
  { key: "phrasebank", label: "Phrasebank content" },
  { key: "fallback-hook", label: "Fallback-hook" },
  { key: "vocab", label: "Vocab" },
  { key: "reference", label: "Reference" },
  { key: "legacy", label: "Generated legacy" },
  { key: "user-generated", label: "User-generated" },
  { key: "other", label: "Other" }
];
const tierFilters: Array<{ key: AdminPhrasebankTierFilter; label: string }> = [
  { key: "all", label: "All tiers" },
  { key: "CONFIRMED", label: "CONFIRMED" },
  { key: "REVIEWED", label: "REVIEWED" },
  { key: "SESSION_APPROVED_DRAFT", label: "SESSION_APPROVED_DRAFT" },
  { key: "none", label: "No tier" }
];
const categoryFilters: Array<{ key: AdminContentCategoryFilter; label: string }> = [
  { key: "all", label: "All categories" },
  { key: "Sky", label: "Sky" },
  { key: "Natal Aspects", label: "Natal Aspects" },
  { key: "Natal Angles", label: "Natal Angles" },
  { key: "Natal Chart", label: "Natal Chart" },
  { key: "Relationship", label: "Relationship" },
  { key: "Condition Modifiers", label: "Condition Modifiers" },
  { key: "Fallback Templates", label: "Fallback Templates" }
];
const fallbackSections: Array<{ key: AdminFallbackHookSectionFilter; label: string }> = [
  { key: "all", label: "All saved" },
  { key: "sky", label: "Sky" },
  { key: "you", label: "Natal" },
  { key: "friends", label: "Friends" },
  { key: "lunar-calendar", label: "Lunar Calendar" },
  { key: "settings", label: "Settings" }
];
const articlePointFilters: Array<{ key: AdminArticlePointFilter; label: string }> = [
  { key: "all", label: "All planets and points" },
  { key: "sun", label: "Sun" },
  { key: "moon", label: "Moon" },
  { key: "mercury", label: "Mercury" },
  { key: "venus", label: "Venus" },
  { key: "mars", label: "Mars" },
  { key: "jupiter", label: "Jupiter" },
  { key: "saturn", label: "Saturn" },
  { key: "uranus", label: "Uranus" },
  { key: "neptune", label: "Neptune" },
  { key: "pluto", label: "Pluto" },
  { key: "other", label: "Other articles" }
];
const appDisplaySourceFilters: Array<{ key: AdminAppDisplaySource | "all"; label: string }> = [
  { key: "all", label: "All display sources" },
  { key: "dashboard-article", label: "This dashboard article" },
  { key: "reviewed-phrasebank", label: "Reviewed phrasebank copy" },
  { key: "madlib-fallback", label: "Simple fallback copy" }
];
const relationshipTypes = ["romantic", "friendship", "family", "coworkers", "creative", "exes", "complicated"];

function adminHashForPage(page: AdminDashboardPage, params?: URLSearchParams) {
  const query = params?.toString();
  return `#${adminPageHashKeys[page]}${query ? `?${query}` : ""}`;
}

function parseAdminHash() {
  const rawHash = window.location.hash || "#home";
  const hashBody = rawHash.replace(/^#/, "");
  const [key = "home", query = ""] = hashBody.split("?");
  return {
    page: adminPageByHashKey[key] ?? "overview",
    params: new URLSearchParams(query)
  };
}

function adminPageTitle(activePage: AdminDashboardPage) {
  switch (activePage) {
    case "articles": return "Articles";
    case "content": return "Content Library";
    case "reviewQueue": return "Review Queue";
    case "compositeByType": return "Composite Review";
    case "connection": return "Connection";
    case "appBehavior": return "App Behavior";
    case "vocabulary": return "Vocabulary & Phrases";
    case "slotDictionary": return "Slots";
    case "knowledge": return "Fallback Hooks";
    case "templates": return "Templates";
    case "hooks": return "Surface Map";
    case "users": return "Users";
    case "releaseNotes": return "Release Notes";
    default: return "Content Studio";
  }
}

function adminPageBreadcrumb(activePage: AdminDashboardPage) {
  switch (activePage) {
    case "articles": return "Admin / Write / Articles";
    case "content": return "Admin / Write / Content library";
    case "reviewQueue": return "Admin / Publish / Review queue";
    case "compositeByType": return "Admin / Write / Composite review";
    case "connection": return "Admin / Connection";
    case "appBehavior": return "Admin / App behavior";
    case "vocabulary": return "Admin / Composition / Vocabulary & phrases";
    case "slotDictionary": return "Admin / Composition / Slots";
    case "knowledge": return "Admin / Composition / Fallback hooks";
    case "templates": return "Admin / Composition / Templates";
    case "hooks": return "Admin / App surfaces / Surface map";
    case "users": return "Admin / Users";
    case "releaseNotes": return "Admin / Release notes";
    default: return "Admin / Home";
  }
}

function adminPageDescription(activePage: AdminDashboardPage) {
  switch (activePage) {
    case "reviewQueue":
      return "Phrasebank-first publishing queue with content-class, tier, evergreen, and bulk sign-off controls.";
    case "content":
      return "The full editable library: saved content rows plus source rows ready to review, filter, edit, or promote.";
    case "knowledge":
      return "Saved fallback rows only. Local runtime hooks live in the Hook Catalog until they are authored.";
    case "vocabulary":
      return "Reusable vocab namespaces and phrase rows for generation, taglines, and relationship context.";
    case "hooks":
      return "Every public surface and runtime hook request, with saved coverage separated from local placeholders.";
    case "users":
      return "Read-mostly user-generated rows by subject, surface, status, and latest update.";
    default:
      return "A rebuilt admin dashboard organized around review, the full content library, fallback rows, vocab, and user output.";
  }
}

function contentStatusLabel(status: GeneratedContentStatus) {
  if (status === "LIVE") return "Published";
  if (status === "ERROR") return "Needs Review";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function slugifyContentPart(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "new-phrase";
}

function vocabularySectionFromKey(contentKey: string): AdminVocabularySection {
  const rawSection = contentKey.match(/^vocab\/([^/]+)/)?.[1];
  if (rawSection && vocabularySections.some((section) => section.key === rawSection)) {
    return rawSection as AdminVocabularySection;
  }
  const normalized = contentKey.replace(/[-_/.:]+/g, " ").toLowerCase();
  if (/\b(relationship|relationships|synastry|composite|friends|romantic|family|coworker|exes)\b/.test(normalized)) return "relationship";
  if (/\b(career|work|mission|purpose|money|calling)\b/.test(normalized)) return "career";
  if (/\b(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces|sign)\b/.test(normalized)) return "signs";
  if (/\b(natal|house|ascendant|midheaven|descendant|angle)\b/.test(normalized)) return "natal";
  return "planets";
}

function isVocabularySection(value: string): value is AdminVocabularySection {
  return vocabularySections.some((section) => section.key === value);
}

function vocabularyContentKey(section: AdminVocabularySection, headline: string) {
  return `vocab/${section}/${slugifyContentPart(headline)}`;
}

function draftIsVocabulary(draft: AdminDraft) {
  return draft.blockType === "vocabulary_phrase" || draft.contentKey.startsWith("vocab/");
}

function draftIsArticle(draft: AdminDraft) {
  return draft.mode === "article" || draft.blockType === "sky_article" || draft.contentKey.startsWith("sky/article/");
}

function draftIsSkyPlacement(draft: AdminDraft) {
  return draft.surface === "sky" && draft.contentKey.startsWith("sky.placement.");
}

function normalizeAppDisplaySource(value: unknown): AdminAppDisplaySource {
  return value === "reviewed-phrasebank" || value === "madlib-fallback" || value === "dashboard-article"
    ? value
    : "dashboard-article";
}

function appDisplaySourceFromSnapshot(sourceSnapshot: Record<string, unknown> | null | undefined): AdminAppDisplaySource {
  return normalizeAppDisplaySource(sourceSnapshot?.appDisplaySource ?? sourceSnapshot?.runtimeRenderer);
}

function contentLevelForAppDisplaySource(source: AdminAppDisplaySource) {
  return source === "madlib-fallback" ? "madlib-fallback" : "source-grounded";
}

function articlePointForRow(row: AdminGeneratedContentRow): AdminArticlePointFilter {
  const normalizedKey = row.content_key.toLowerCase();
  const keyMatch = normalizedKey.match(/^sky[./-](?:placement|article)[./-]([a-z-]+)/);
  const headlineMatch = normalizeText(row.headline).toLowerCase().match(/^(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\b/);
  const candidate = keyMatch?.[1]?.replace(/-/g, " ") || headlineMatch?.[1] || "";
  const point = candidate.split(/\s+/)[0];

  return articlePointFilters.some((filter) => filter.key === point) && point !== "all"
    ? point as AdminArticlePointFilter
    : "other";
}

function titleFromKey(contentKey: string) {
  return contentKey
    .split("/")
    .pop()
    ?.split(".")
    .pop()
    ?.replace(/[-_]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    || contentKey;
}

function rowTitle(row: AdminGeneratedContentRow | AdminReviewRecord | AdminUserGeneratedContentRow) {
  if ("content_key" in row) {
    return normalizeText(row.headline) || titleFromKey(row.content_key);
  }
  return normalizeText(row.title) || normalizeText(row.summary) || titleFromKey(row.contentKey);
}

function rowBody(row: AdminGeneratedContentRow | AdminReviewRecord | AdminUserGeneratedContentRow) {
  return "content_key" in row ? normalizeText(row.body) : normalizeText(row.body);
}

function contentClassForRow(row: AdminGeneratedContentRow | AdminReviewRecord): AdminContentClass {
  const contentKey = "content_key" in row ? row.content_key : row.contentKey;
  const blockType = "content_key" in row ? row.block_type : row.blockType;
  const promptVersion = "content_key" in row ? row.prompt_version : row.promptVersion;
  const provider = "content_key" in row ? row.provider : row.provider;
  const sourceSnapshot = "content_key" in row ? row.source_snapshot : row.sourceSnapshot;
  const flags = Array.isArray(sourceSnapshot?.flags) ? sourceSnapshot.flags.join(" ") : JSON.stringify(sourceSnapshot ?? {});
  const sourceContentType = typeof sourceSnapshot?.contentType === "string" ? sourceSnapshot.contentType : "";
  const sourceBucket = typeof sourceSnapshot?.bucket === "string" ? sourceSnapshot.bucket : "";
  const sourceTargetFamily = typeof sourceSnapshot?.targetContentFamily === "string" ? sourceSnapshot.targetContentFamily : "";
  const eventType = "content_key" in row ? row.event_type : row.eventType;

  if (contentKey.startsWith("fallback-hook/") || blockType === "fallback_template" || promptVersion === "fallback-hook-template-v1") return "fallback-hook";
  if (
    contentKey.startsWith("vocab/") ||
    contentKey.startsWith("vocab.") ||
    contentKey.startsWith("fallback-vocab/") ||
    contentKey.startsWith("guide-phrase/") ||
    eventType === "vocab" ||
    sourceContentType === "vocab" ||
    sourceBucket === "vocab" ||
    sourceTargetFamily === "vocab" ||
    blockType === "vocabulary_phrase" ||
    promptVersion === "vocab-v1" ||
    promptVersion === "tagline-v1"
  ) return "vocab";
  if (/REFERENCE_ONLY_NEVER_SERVE_VERBATIM|PARAPHRASE_PENDING|BLOCKLIST_MATCH/i.test(flags)) return "reference";
  if (provider && !/phrasebank|migration|local-normalized-dashboard-source/i.test(provider)) return "legacy";
  if (/^(natal|composite|transit|sky|synastry|relationship|you)[./-]/i.test(contentKey)) return "phrasebank";
  if (contentKey.includes("aspect") || contentKey.includes("placement") || contentKey.includes("synastry")) return "phrasebank";
  return "other";
}

function contentClassLabel(value: AdminContentClass) {
  return contentClassFilters.find((filter) => filter.key === value)?.label ?? "Other";
}

function draftEventType(draft: AdminDraft) {
  if (draft.blockType === "fallback_template" || draft.blockType === "fallback_hook" || draft.contentKey.startsWith("fallback-hook/")) return "fallback-hook";
  if (draft.blockType === "vocabulary_phrase" || draft.contentKey.startsWith("vocab/") || draft.contentKey.startsWith("fallback-vocab/") || draft.contentKey.startsWith("guide-phrase/")) return "vocab";
  if (draft.blockType === "template" || draft.contentKey.startsWith("slot-template/")) return "slot-template";
  if (draft.blockType === "sky_article" || draft.mode === "article") return "sky_article";
  return draft.blockType || "manual-content";
}

function draftSourceSnapshot(draft: AdminDraft) {
  if (draft.blockType === "fallback_template" || draft.blockType === "fallback_hook" || draft.contentKey.startsWith("fallback-hook/")) {
    return {
      ...(draft.sourceSnapshot ?? {}),
      contentType: "template",
      hook: draft.contentKey.replace(/^fallback-hook\//, "")
    };
  }

  return {
    ...(draft.sourceSnapshot ?? {}),
    contentType: draftEventType(draft),
    authoringSource: "admin-dashboard",
    appDisplaySource: draft.appDisplaySource
  };
}

function tierForRow(row: AdminGeneratedContentRow | AdminReviewRecord): AdminPhrasebankTier {
  const sourceSnapshot = "content_key" in row ? row.source_snapshot : row.sourceSnapshot;
  const raw = sourceSnapshot?.tier ?? sourceSnapshot?.phrasebankTier ?? sourceSnapshot?.provenanceTier ?? sourceSnapshot?.sourceTier;
  return raw === "CONFIRMED" || raw === "REVIEWED" || raw === "SESSION_APPROVED_DRAFT" ? raw : "none";
}

function contentCategoryForRow(row: AdminGeneratedContentRow | AdminReviewRecord): AdminContentCategoryFilter {
  const contentKey = "content_key" in row ? row.content_key : row.contentKey;
  const surface = "content_key" in row ? row.surface : row.surface;
  const blockType = "content_key" in row ? row.block_type : row.blockType;

  if (contentKey.startsWith("fallback-hook/") || blockType === "fallback_template") return "Fallback Templates";
  if (surface === "sky" || contentKey.startsWith("sky")) return "Sky";
  if (surface === "synastry" || surface === "composite" || surface === "relationship" || surface === "friends") return "Relationship";
  if (contentKey.includes("angle")) return "Natal Angles";
  if (contentKey.includes("aspect")) return "Natal Aspects";
  if (surface === "natal" || surface === "you") return "Natal Chart";
  if (surface === "modifier") return "Condition Modifiers";
  return "all";
}

function readerSafetyForRow(row: AdminGeneratedContentRow | AdminReviewRecord | AdminUserGeneratedContentRow) {
  const body = rowBody(row);
  const headline = "content_key" in row ? normalizeText(row.headline) : rowTitle(row);
  const status = row.status;
  const lane = "lane" in row ? row.lane : undefined;
  const reviewState = "review_state" in row ? row.review_state : undefined;

  if (!body && !headline) return { key: "fallback-needed", label: "Fallback needed", detail: "No reader-facing copy is present." };
  if (!isReaderFacingCopy(`${headline} ${body}`)) return { key: "reference-held", label: "Reference held", detail: "Copy looks like metadata or internal notes." };
  if (status !== "LIVE") return { key: "draft-held", label: "Draft held", detail: "Not published." };
  if (lane && lane !== "serving") return { key: "reference-held", label: "Reference held", detail: "Not in serving lane." };
  if (reviewState) return { key: "review-held", label: "Review held", detail: "Review state is still set." };
  return { key: "reader-ready", label: "Reader-ready", detail: "Published serving row with safe copy." };
}

function fallbackSectionForKey(key: string, surface?: string): AdminFallbackHookSectionFilter {
  if (key.includes("lunar") || key.startsWith("lunation/") || key.startsWith("season/") || key.startsWith("season-arc/") || key.startsWith("transit-fallback/")) return "lunar-calendar";
  if (key.includes("settings") || surface === "settings") return "settings";
  if (key.includes("friends") || key.includes("synastry") || key.includes("relationship") || surface === "friends" || surface === "relationship" || surface === "synastry" || surface === "composite") return "friends";
  if (key.includes("natal") || key.includes("you") || surface === "you" || surface === "natal") return "you";
  return "sky";
}

function canonicalFallbackContentKey(key: string) {
  return key.startsWith("fallback-hook/") ? key : `fallback-hook/${key}`;
}

function fallbackVocabularyContentKey(family: string, value: string) {
  const signPart = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `fallback-vocab/${family}/${signPart}`;
}

function fallbackAspectVerbDependency(signPart: string) {
  return fallbackVocabularyContentKey("aspect-verb", signPart);
}

function localSkySnapshotAdminRows(): AdminGeneratedContentRow[] {
  const rows = (skyContentSnapshot as { rows?: LocalSkySnapshotRow[] }).rows ?? [];

  return rows.map((row) => {
    const contentParts = row.contentKey.split(".");
    const aspectPart = row.eventType === "current-sky-aspect" ? contentParts.at(-2) ?? "" : "";
    const dependencies = aspectPart ? [fallbackAspectVerbDependency(aspectPart)] : [];

    return {
      id: `local-sky-snapshot:${row.id}`,
      content_key: row.contentKey,
      surface: row.surface,
      mode: row.mode,
      status: "LIVE",
      event_type: row.eventType,
      target_date: row.targetDate,
      headline: row.headline,
      summary: row.summary,
      body: row.body,
      sections: row.sections ?? null,
      block_type: row.blockType ?? null,
      lane: "serving",
      review_state: null,
      evergreen: true,
      provider: row.provider ?? "local-normalized-dashboard-source",
      model: row.model ?? null,
      source_snapshot: {
        ...(row.sourceSnapshot ?? { source: "skyContentSnapshot" }),
        aliases: row.aliases ?? [],
        dependencies
      },
      updated_at: row.updatedAt ?? null,
      created_at: row.updatedAt ?? null,
      prompt_version: "local-sky-snapshot"
    };
  });
}

function hookKeyFromSavedRow(row: AdminGeneratedContentRow) {
  return row.content_key.replace(/^fallback-hook\//, "");
}

function sectionsText(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function isCompositeRelationshipRow(row: AdminGeneratedContentRow) {
  return row.surface === "composite" || row.content_key.includes("composite") || row.block_type === "composite_aspect";
}

function relationshipTypeCopy(row: AdminGeneratedContentRow, type: string) {
  if (!row.sections || typeof row.sections !== "object") return "";
  const sections = row.sections as Record<string, unknown>;
  const byType = sections.byRelationshipType;
  if (!byType || typeof byType !== "object") return "";
  const value = (byType as Record<string, unknown>)[type];
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    return String(objectValue.body ?? objectValue.summary ?? objectValue.copy ?? "");
  }
  return "";
}

class AdminRequestError extends Error {
  status: number;
  path: string;
  method: string;
  details: string;

  constructor(message: string, options: { status: number; path: string; method: string; details?: string }) {
    super(message);
    this.name = "AdminRequestError";
    this.status = options.status;
    this.path = options.path;
    this.method = options.method;
    this.details = options.details ?? "";
  }
}

function dashboardErrorMessage(error: unknown) {
  if (error instanceof AdminRequestError) {
    if (error.status === 401) {
      return "Admin access was denied. Confirm CONTENT_GENERATION_SECRET, then reload content.";
    }

    if (/^Use POST\.$/i.test(error.details) || /^Use POST\.$/i.test(error.message)) {
      return `${error.path} rejected ${error.method}. The dashboard called an endpoint with the wrong HTTP method.`;
    }

    return `${error.path} failed with HTTP ${error.status}.`;
  }

  return error instanceof Error ? error.message : "Could not load admin content.";
}

async function adminJsonRequest<T>(path: string, secret: string, options: RequestInit = {}) {
  const method = options.method ?? "GET";
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const details = payload && typeof payload === "object" && "error" in payload ? String(payload.error) : `Request failed with ${response.status}`;
    const message = response.status === 401
      ? "Admin access was denied. Confirm CONTENT_GENERATION_SECRET, then reload content."
      : /^Use POST\.$/i.test(details)
      ? `${path} rejected ${method}. The dashboard called an endpoint with the wrong HTTP method.`
      : `${path} failed with HTTP ${response.status}.`;
    throw new AdminRequestError(message, {
      status: response.status,
      path,
      method,
      details
    });
  }

  return payload as T;
}

async function loadAllGeneratedContentRows(secret: string) {
  const pageSize = 1000;
  const allRows: AdminGeneratedContentRow[] = [];

  for (let offset = 0; offset < 10000; offset += pageSize) {
    const result = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?status=all&limit=${pageSize}&offset=${offset}`,
      secret
    );
    const pageRows = assertRowsPayload(result, "/api/admin/generated-content");

    allRows.push(...pageRows);
    if (pageRows.length < pageSize) {
      break;
    }
  }

  return allRows;
}

function assertRowsPayload<T>(payload: { rows?: T[] }, endpoint: string): T[] {
  if (!payload || !Array.isArray(payload.rows)) {
    throw new AdminRequestError("Invalid response schema.", {
      status: 200,
      path: endpoint,
      method: "GET",
      details: "Expected a JSON object with a rows array."
    });
  }

  return payload.rows;
}

function draftFromRow(row: AdminGeneratedContentRow): AdminDraft {
  return {
    id: row.id,
    contentKey: row.content_key,
    surface: row.surface,
    mode: row.mode,
    status: row.status,
    headline: normalizeText(row.headline),
    summary: normalizeText(row.summary),
    body: normalizeText(row.body),
    lane: row.lane ?? "serving",
    reviewState: row.review_state ?? "",
    blockType: row.block_type ?? "",
    promptVersion: row.prompt_version ?? "manual-admin",
    appDisplaySource: appDisplaySourceFromSnapshot(row.source_snapshot),
    sourceSnapshot: row.source_snapshot ?? null
  };
}

function emptyDraftForHook(item: HookCatalogItem): AdminDraft {
  const fallbackCopy = item.type === "fallback" ? item.definition.copy : null;
  return {
    id: null,
    contentKey: canonicalFallbackContentKey(item.key),
    surface: item.type === "fallback" && item.definition.surface !== "settings" ? item.definition.surface : "sky",
    mode: item.type === "fallback" ? item.definition.mode : "feed",
    status: "DRAFT",
    headline: fallbackCopy?.headline ?? item.label,
    summary: fallbackCopy?.summary ?? "",
    body: fallbackCopy?.body ?? "",
    lane: "serving",
    reviewState: "EDITORIAL_REVIEW_REQUIRED",
    blockType: "fallback_template",
    promptVersion: "fallback-hook-template-v1",
    appDisplaySource: "dashboard-article",
    sourceSnapshot: null
  };
}

function useSavedSecret() {
  const [secret, setSecret] = useState(() => {
    const localSecret = getLocalContentGenerationSecret();

    try {
      return window.localStorage.getItem(adminSecretStorageKey) ?? localSecret;
    } catch {
      return localSecret;
    }
  });

  function saveSecret(nextSecret: string) {
    setSecret(nextSecret);
    try {
      if (nextSecret.trim()) {
        window.localStorage.setItem(adminSecretStorageKey, nextSecret);
      } else {
        window.localStorage.removeItem(adminSecretStorageKey);
      }
    } catch {
      // Keep the in-memory field usable.
    }
  }

  return [secret, saveSecret] as const;
}

export function GeneratedContentAdminDashboard() {
  const [secret, setSecret] = useSavedSecret();
  const [activePage, setActivePage] = useState<AdminDashboardPage>(() => parseAdminHash().page);
  const [rows, setRows] = useState<AdminGeneratedContentRow[]>([]);
  const [reviewRows, setReviewRows] = useState<AdminReviewRecord[]>([]);
  const [userRows, setUserRows] = useState<AdminUserGeneratedContentRow[]>([]);
  const [facts, setFacts] = useState<AdminContentFact[]>([]);
  const [message, setMessage] = useState("Content Studio ready.");
  const [loadState, setLoadState] = useState<AdminLoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadDiagnostics, setLoadDiagnostics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [contentStatusFilter, setContentStatusFilter] = useState<GeneratedContentStatus | "all">("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<GeneratedContentStatus | "all">("all");
  const [contentClassFilter, setContentClassFilter] = useState<AdminContentClassFilter>("all");
  const [tierFilter, setTierFilter] = useState<AdminPhrasebankTierFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<AdminContentCategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [fallbackSectionFilter, setFallbackSectionFilter] = useState<AdminFallbackHookSectionFilter>("all");
  const [surfaceAreaFilter, setSurfaceAreaFilter] = useState<WritingSurfaceAreaFilter>("all");
  const [surfaceStatusFilter, setSurfaceStatusFilter] = useState<WritingSurfaceStatusFilter>("all");
  const [vocabularyCategory, setVocabularyCategory] = useState<AdminVocabularyCategoryFilter>("planets");
  const [articleStatusFilter, setArticleStatusFilter] = useState<GeneratedContentStatus | "all">("all");
  const [articlePointFilter, setArticlePointFilter] = useState<AdminArticlePointFilter>("all");
  const [articleDisplaySourceFilter, setArticleDisplaySourceFilter] = useState<AdminAppDisplaySource | "all">("all");
  const [articleQuery, setArticleQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkStatus, setBulkStatus] = useState<GeneratedContentStatus>("REVIEWED");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminDraft | null>(null);
  const handledHashRef = useRef("");
  const editorRef = useRef<HTMLElement | null>(null);

  const localSkySnapshotRows = useMemo(() => localSkySnapshotAdminRows(), []);
  const persistedContentKeys = useMemo(() => new Set(rows.map((row) => row.content_key)), [rows]);
  const visibleLocalSnapshots = useMemo(
    () => localSkySnapshotRows.filter((row) => !persistedContentKeys.has(row.content_key)),
    [localSkySnapshotRows, persistedContentKeys]
  );
  const visibleRows = useMemo(
    () => [...rows, ...visibleLocalSnapshots],
    [rows, visibleLocalSnapshots]
  );
  const savedFallbackRows = useMemo(
    () => visibleRows.filter((row) => contentClassForRow(row) === "fallback-hook"),
    [visibleRows]
  );
  const vocabRows = useMemo(
    () => visibleRows.filter((row) => contentClassForRow(row) === "vocab"),
    [visibleRows]
  );
  const slotEditableRows = useMemo(
    () => visibleRows.filter((row) => {
      const contentClass = contentClassForRow(row);
      return contentClass === "vocab" || contentClass === "fallback-hook" || row.content_key.startsWith("slot-template/");
    }),
    [visibleRows]
  );
  const phrasebankRows = useMemo(
    () => visibleRows.filter((row) => contentClassForRow(row) === "phrasebank"),
    [visibleRows]
  );
  const articleRows = useMemo(
    () => visibleRows.filter((row) => row.mode === "article" || row.block_type === "sky_article"),
    [visibleRows]
  );
  const filteredArticleRows = useMemo(() => articleRows.filter((row) => {
    const articleSearch = articleQuery.trim().toLowerCase();
    const haystack = [
      row.content_key,
      row.headline,
      row.summary,
      row.body,
      row.surface,
      row.mode,
      row.block_type,
      row.prompt_version
    ].join(" ").toLowerCase();

    return (articleStatusFilter === "all" || row.status === articleStatusFilter)
      && (articlePointFilter === "all" || articlePointForRow(row) === articlePointFilter)
      && (articleDisplaySourceFilter === "all" || appDisplaySourceFromSnapshot(row.source_snapshot) === articleDisplaySourceFilter)
      && (!articleSearch || haystack.includes(articleSearch));
  }), [articleRows, articleStatusFilter, articlePointFilter, articleDisplaySourceFilter, articleQuery]);
  const compositeRows = useMemo(
    () => visibleRows.filter(isCompositeRelationshipRow),
    [visibleRows]
  );
  const hookCatalogItems = useMemo<HookCatalogItem[]>(() => [
    ...fallbackHookDefinitions.map((definition) => ({
      type: "fallback" as const,
      key: definition.key,
      label: definition.label,
      section: fallbackSectionForKey(definition.key, definition.surface),
      definition
    })),
    ...lunarCalendarContentKeyDefinitions.map((definition) => ({
      type: "lunar" as const,
      key: definition.key,
      label: definition.label,
      section: "lunar-calendar" as const,
      definition
    }))
  ], []);
  const savedHookKeys = useMemo(
    () => new Set(savedFallbackRows.map((row) => hookKeyFromSavedRow(row)).concat(savedFallbackRows.map((row) => row.content_key))),
    [savedFallbackRows]
  );
  const selectedRow = visibleRows.find((row) => row.id === selectedRowId) ?? null;
  const statusCounts = useMemo(() => {
    const counts: Record<GeneratedContentStatus | "all", number> = { all: visibleRows.length, DRAFT: 0, REVIEWED: 0, LIVE: 0, ARCHIVED: 0, ERROR: 0 };
    visibleRows.forEach((row) => counts[row.status] += 1);
    return counts;
  }, [visibleRows]);
  const readerCounts = useMemo(() => {
    const counts = { "reader-ready": 0, "draft-held": 0, "reference-held": 0, "review-held": 0, "fallback-needed": 0 };
    visibleRows.forEach((row) => {
      const key = readerSafetyForRow(row).key as keyof typeof counts;
      counts[key] += 1;
    });
    return counts;
  }, [visibleRows]);
  const filteredRows = useMemo(() => visibleRows.filter((row) => {
    const haystack = [
      row.content_key,
      row.headline,
      row.summary,
      row.body,
      row.surface,
      row.mode,
      row.block_type,
      row.prompt_version
    ].join(" ").toLowerCase();
    const rowClass = contentClassForRow(row);
    const rowTier = tierForRow(row);
    const rowCategory = contentCategoryForRow(row);

    return (contentStatusFilter === "all" || row.status === contentStatusFilter)
      && (contentClassFilter === "all" || rowClass === contentClassFilter)
      && (tierFilter === "all" || rowTier === tierFilter)
      && (categoryFilter === "all" || rowCategory === categoryFilter)
      && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
  }), [visibleRows, contentStatusFilter, contentClassFilter, tierFilter, categoryFilter, query]);
  const filteredReviewRows = useMemo(() => reviewRows.filter((row) => {
    const haystack = [row.contentKey, row.title, row.summary, row.body, row.surface, row.mode, row.blockType].join(" ").toLowerCase();
    return (reviewStatusFilter === "all" || row.status === reviewStatusFilter)
      && (contentClassFilter === "all" || contentClassForRow(row) === contentClassFilter)
      && (tierFilter === "all" || tierForRow(row) === tierFilter)
      && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
  }), [reviewRows, reviewStatusFilter, contentClassFilter, tierFilter, query]);
  const filteredFallbackRows = useMemo(() => savedFallbackRows.filter((row) => (
    (fallbackSectionFilter === "all" || fallbackSectionForKey(row.content_key, row.surface) === fallbackSectionFilter)
      && (!query.trim() || `${row.content_key} ${row.headline ?? ""} ${row.summary ?? ""} ${row.body ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
  )), [savedFallbackRows, fallbackSectionFilter, query]);
  const filteredHookCatalog = useMemo(() => hookCatalogItems.filter((item) => (
    (fallbackSectionFilter === "all" || item.section === fallbackSectionFilter)
      && (!query.trim() || `${item.key} ${item.label}`.toLowerCase().includes(query.trim().toLowerCase()))
  )), [hookCatalogItems, fallbackSectionFilter, query]);
  const templateRows = useMemo(
    () => rows.filter((row) => row.content_key.startsWith("slot-template/")),
    [rows]
  );
  const filteredTemplateRows = useMemo(
    () => templateRows.filter((row) => !query.trim() || `${row.content_key} ${row.headline ?? ""} ${row.summary ?? ""} ${row.body ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())),
    [templateRows, query]
  );
  const vocabularyCategoryRows = useMemo(() => {
    const categoryNeedles: Record<string, string[]> = {
      planets: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "north node", "south node", "chiron"],
      signs: ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"],
      natal: ["natal", "house", "ascendant", "midheaven", "ic", "descendant"],
      relationship: ["relationship", "relationships", "synastry", "composite", "friends", "romantic", "family", "coworker", "coworkers", "exes"],
      career: ["career", "work", "mission", "purpose", "money", "calling"]
    };
    const needles = categoryNeedles[vocabularyCategory] ?? [];
    return vocabRows.filter((row) => {
      const haystack = `${row.content_key} ${row.headline ?? ""} ${row.summary ?? ""} ${row.body ?? ""} ${JSON.stringify(row.source_snapshot ?? {})}`
        .toLowerCase()
        .replace(/[-_/.:]+/g, " ");
      return needles.length === 0 || needles.some((needle) => new RegExp(`(^|\\s)${needle.replace(/\s+/g, "\\s+")}(\\s|$)`).test(haystack));
    });
  }, [vocabRows, vocabularyCategory]);
  const filteredVocabularyRows = useMemo(
    () => vocabularyCategoryRows.filter((row) => !query.trim() || `${row.content_key} ${row.headline ?? ""} ${row.summary ?? ""} ${row.body ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())),
    [vocabularyCategoryRows, query]
  );
  const filteredSlotEditableRows = useMemo(
    () => slotEditableRows.filter((row) => !query.trim() || `${row.content_key} ${row.headline ?? ""} ${row.summary ?? ""} ${row.body ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())),
    [slotEditableRows, query]
  );
  const selectedSavedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.id)),
    [rows, selectedIds]
  );
  const hasAccessIssue = loadState === "accessDenied" || (!secret.trim() && loadState !== "loaded");
  const hasLoadFailure = loadState === "error";

  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash || "#home";
      if (handledHashRef.current === hash) return;
      handledHashRef.current = hash;
      const { page, params } = parseAdminHash();
      closeEditor();
      setActivePage(page);

      const category = params.get("category") as AdminContentCategoryFilter | null;
      const source = params.get("source") as AdminContentClassFilter | null;
      const search = params.get("q");
      const section = params.get("section") as AdminFallbackHookSectionFilter | null;
      const area = params.get("area") as WritingSurfaceAreaFilter | null;
      const status = params.get("status") as WritingSurfaceStatusFilter | null;

      if (category && categoryFilters.some((filter) => filter.key === category)) setCategoryFilter(category);
      if (source && contentClassFilters.some((filter) => filter.key === source)) setContentClassFilter(source);
      setQuery(search ?? "");
      if (section && fallbackSections.some((filter) => filter.key === section)) setFallbackSectionFilter(section);
      if (area && ["all", "sky", "you", "friends", "calendar", "settings"].includes(area)) setSurfaceAreaFilter(area);
      if (status && ["all", "complete", "partial", "missing"].includes(status)) setSurfaceStatusFilter(status);
      if (page === "vocabulary" && params.get("category") === "relationship") setVocabularyCategory("relationship");
    }

    applyHash();
    window.addEventListener("hashchange", applyHash);
    window.addEventListener("popstate", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
      window.removeEventListener("popstate", applyHash);
    };
  }, []);

  useEffect(() => {
    if (secret.trim()) {
      void loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setAdminHash(nextHash: string, mode: "push" | "replace" = "push") {
    if (window.location.hash === nextHash) return;
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    if (mode === "replace") {
      window.history.replaceState(null, "", nextUrl);
    } else {
      window.history.pushState(null, "", nextUrl);
    }
    handledHashRef.current = "";
  }

  function closeEditor() {
    setSelectedRowId(null);
    setDraft(null);
  }

  function navigateAdminPage(page: AdminDashboardPage, params?: URLSearchParams, options: { keepEditorOpen?: boolean } = {}) {
    setIsCreateMenuOpen(false);
    if (!options.keepEditorOpen) {
      closeEditor();
    }
    if (page !== activePage && !params?.has("q")) {
      setQuery("");
    }
    setActivePage(page);
    setAdminHash(adminHashForPage(page, params));
  }

  async function loadDashboardData() {
    if (!secret.trim()) {
      setLoadState("idle");
      setLoadError("Admin access is required before content can load.");
      setLoadDiagnostics(null);
      setMessage("Paste CONTENT_GENERATION_SECRET, then load content.");
      return;
    }

    setLoadState("loading");
    setLoadError(null);
    setLoadDiagnostics(null);
    setIsLoading(true);
    try {
      const [generatedResult, reviewResult, usersResult] = await Promise.allSettled([
        loadAllGeneratedContentRows(secret),
        adminJsonRequest<{ ok: boolean; rows?: AdminReviewRecord[]; records?: AdminReviewRecord[]; counts?: unknown }>("/api/admin/review-records?surface=upcomingAspects&status=all", secret),
        adminJsonRequest<{ ok: boolean; rows: AdminUserGeneratedContentRow[] }>("/api/admin/user-generated-content?status=all&limit=100", secret)
      ]);

      if (generatedResult.status === "rejected") {
        throw generatedResult.reason;
      }

      const review: { ok?: boolean; rows?: AdminReviewRecord[]; records?: AdminReviewRecord[]; counts?: unknown } = reviewResult.status === "fulfilled" ? reviewResult.value : { rows: [] };
      const usersPayload = usersResult.status === "fulfilled" ? usersResult.value : { rows: [] };
      const generatedRows = generatedResult.value;
      const reviewRowsPayload = review.rows ?? review.records ?? [];
      setRows(generatedRows);
      setReviewRows(reviewRowsPayload.map((record: AdminReviewRecord) => {
        const rawGlobalRow = generatedRows.find((row) => row.id === record.id || row.content_key === record.contentKey);
        return { ...record, rawGlobalRow };
      }));
      setUserRows(usersPayload.rows ?? []);
      setFacts([]);

      const partialWarnings = [
        reviewResult.status === "rejected" ? "review records failed" : "",
        usersResult.status === "rejected" ? "user rows failed" : ""
      ].filter(Boolean);
      setLoadState("loaded");
      setMessage(`Loaded ${generatedRows.length} saved rows, ${reviewRowsPayload.length} review records, and ${usersPayload.rows?.length ?? 0} user rows.${partialWarnings.length ? ` Partial load: ${partialWarnings.join(", ")}.` : ""}`);
    } catch (error) {
      const nextMessage = dashboardErrorMessage(error);
      setLoadState(error instanceof AdminRequestError && error.status === 401 ? "accessDenied" : "error");
      setLoadError(nextMessage);
      setLoadDiagnostics(error instanceof AdminRequestError ? `${error.method} ${error.path} -> HTTP ${error.status}${error.details ? ` (${error.details})` : ""}` : null);
      setMessage(nextMessage);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveDraft(nextStatus?: GeneratedContentStatus) {
    if (!draft) return;
    setIsLoading(true);
    const status = nextStatus ?? draft.status;

    try {
      const body = {
        id: draft.id ?? undefined,
        contentKey: draft.contentKey,
        surface: draft.surface === "friends" ? "relationship" : draft.surface,
        mode: draft.mode,
        status,
        headline: draft.headline,
        summary: draft.summary,
        body: draft.body,
        lane: draft.lane,
        reviewState: status === "LIVE" || status === "REVIEWED" ? null : draft.reviewState || null,
        blockType: draft.blockType || null,
        promptVersion: draft.promptVersion || "manual-admin",
        eventType: draftEventType(draft),
        sourceSnapshot: draftSourceSnapshot(draft)
      };
      const method = draft.id ? "PATCH" : "POST";
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
        method,
        body: JSON.stringify(body)
      });
      const savedRows = payload.rows ?? [];
      const saved = savedRows[0];
      if (saved) {
        setRows((current) => {
          const without = current.filter((row) => row.id !== saved.id);
          return [saved, ...without];
        });
        setSelectedRowId(saved.id);
        setDraft(draftFromRow(saved));
      }
      setMessage(`${draft.contentKey} saved as ${contentStatusLabel(status)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save row.");
    } finally {
      setIsLoading(false);
    }
  }

  async function applyBulkStatus() {
    if (selectedSavedRows.length === 0) return;
    setIsLoading(true);
    try {
      const updates = await Promise.all(selectedSavedRows.map((row) => adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
        method: "PATCH",
        body: JSON.stringify({
          id: row.id,
          status: bulkStatus,
          reviewState: bulkStatus === "LIVE" || bulkStatus === "REVIEWED" ? null : row.review_state ?? null
        })
      })));
      const updatedRows = updates.flatMap((payload) => payload.rows ?? []);
      setRows((current) => current.map((row) => updatedRows.find((updated) => updated.id === row.id) ?? row));
      setSelectedIds(new Set());
      setMessage(`Updated ${updatedRows.length} rows to ${contentStatusLabel(bulkStatus)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update selected rows.");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteSelectedDrafts() {
    const deletable = selectedSavedRows.filter((row) => row.status !== "LIVE");
    if (deletable.length === 0) {
      setMessage("Published rows are protected. Demote before deleting.");
      return;
    }
    setIsLoading(true);
    try {
      await Promise.all(deletable.map((row) => adminJsonRequest<{ ok: boolean }>(`/api/admin/generated-content?id=${encodeURIComponent(row.id)}`, secret, {
        method: "DELETE"
      })));
      setRows((current) => current.filter((row) => !deletable.some((deleted) => deleted.id === row.id)));
      setSelectedIds(new Set());
      setMessage(`Deleted ${deletable.length} non-published rows.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete selected rows.");
    } finally {
      setIsLoading(false);
    }
  }

  function openRow(row: AdminGeneratedContentRow) {
    setSelectedRowId(row.id);
    setDraft(draftFromRow(row));
  }

  function openHookDraft(item: HookCatalogItem) {
    navigateAdminPage("knowledge", undefined, { keepEditorOpen: true });
    const saved = savedFallbackRows.find((row) => row.content_key === canonicalFallbackContentKey(item.key) || hookKeyFromSavedRow(row) === item.key);
    if (saved) {
      openRow(saved);
    } else {
      setSelectedRowId(null);
      setDraft(emptyDraftForHook(item));
    }
  }

  function handleCreateAction(page: AdminDashboardPage, nextMessage: string) {
    navigateAdminPage(page, undefined, { keepEditorOpen: true });
    setIsCreateMenuOpen(false);
    setSelectedRowId(null);
    setMessage(nextMessage);
    if (page === "articles") {
      setDraft({
        id: null,
        contentKey: "sky/article/new-row",
        surface: "sky",
        mode: "article",
        status: "DRAFT",
        headline: "",
        summary: "",
        body: "",
        lane: "serving",
        reviewState: "EDITORIAL_REVIEW_REQUIRED",
        blockType: "sky_article",
        promptVersion: "manual-admin",
        appDisplaySource: "dashboard-article",
        sourceSnapshot: null
      });
      return;
    }
    if (page === "content") {
      setDraft({
        id: null,
        contentKey: "content/manual/new-row",
        surface: "sky",
        mode: "feed",
        status: "DRAFT",
        headline: "",
        summary: "",
        body: "",
        lane: "serving",
        reviewState: "EDITORIAL_REVIEW_REQUIRED",
        blockType: "essay",
        promptVersion: "manual-admin",
        appDisplaySource: "dashboard-article",
        sourceSnapshot: null
      });
      return;
    }
    if (page === "vocabulary") {
      const section: AdminVocabularySection = isVocabularySection(vocabularyCategory) ? vocabularyCategory : "planets";
      setDraft({
        id: null,
        contentKey: vocabularyContentKey(section, ""),
        surface: "you",
        mode: "feed",
        status: "DRAFT",
        headline: "",
        summary: "",
        body: "",
        lane: "reference",
        reviewState: "EDITORIAL_REVIEW_REQUIRED",
        blockType: "vocabulary_phrase",
        promptVersion: "manual-admin",
        appDisplaySource: "dashboard-article",
        sourceSnapshot: null
      });
      return;
    }
    if (page === "templates") {
      setDraft({
        id: null,
        contentKey: "slot-template/manual/new-template",
        surface: "sky",
        mode: "card",
        status: "DRAFT",
        headline: "",
        summary: "",
        body: "",
        lane: "reference",
        reviewState: "EDITORIAL_REVIEW_REQUIRED",
        blockType: "template",
        promptVersion: "manual-admin",
        appDisplaySource: "dashboard-article",
        sourceSnapshot: null
      });
      return;
    }
    if (page === "knowledge") {
      setDraft({
        id: null,
        contentKey: "fallback-hook/manual/new-hook",
        surface: "sky",
        mode: "feed",
        status: "DRAFT",
        headline: "",
        summary: "",
        body: "",
        lane: "serving",
        reviewState: "EDITORIAL_REVIEW_REQUIRED",
        blockType: "fallback_template",
        promptVersion: "fallback-hook-template-v1",
        appDisplaySource: "dashboard-article",
        sourceSnapshot: null
      });
    }
  }

  function toggleRowSelection(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function onCatalogKeyDown(event: ReactKeyboardEvent<HTMLElement>, item: HookCatalogItem) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openHookDraft(item);
  }

  const nav = (
    <aside className="admin-sidebar">
      <a className="admin-brand" href="#home" onClick={() => navigateAdminPage("overview")}>
        <span className="admin-brand-mark">TL</span>
        <span>
          <strong>Content Studio</strong>
          <small>Phrasebank admin</small>
        </span>
      </a>
      <nav className="admin-nav" aria-label="Content operations">
        {adminNavGroups.map((group) => (
          <section key={group.label} className="admin-nav-section" aria-label={group.label}>
            <p className="admin-eyebrow">{group.label}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.page} type="button" onClick={() => navigateAdminPage(item.page)} aria-current={activePage === item.page ? "page" : undefined}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </section>
        ))}
      </nav>
      <section className="admin-sidebar-status" aria-label="Admin status">
        <span className={`ui-pill admin-status ${loadState === "loaded" ? "status-live" : loadState === "accessDenied" || loadState === "error" ? "status-error" : "status-draft"}`}>
          {loadState === "loaded" ? "Access verified" : loadState === "loading" ? "Loading" : secret.trim() ? "Access saved" : "Local only"}
        </span>
        <small>{loadState === "loaded" ? `${rows.length} saved rows loaded` : "Rows not loaded"}</small>
      </section>
    </aside>
  );

  return (
    <main className="admin-dashboard">
      {nav}
      <section className="admin-main">
        <header className="admin-dashboard-header">
          <div>
            <p className="admin-breadcrumb">{adminPageBreadcrumb(activePage)}</p>
            <h1>{adminPageTitle(activePage)}</h1>
            <p>{adminPageDescription(activePage)}</p>
          </div>
          <div className="admin-create-menu">
            <button className="admin-create-button" type="button" onClick={() => setIsCreateMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={isCreateMenuOpen}>
              <Plus size={16} aria-hidden="true" />
              Create
            </button>
            {isCreateMenuOpen && (
              <div className="admin-create-menu-panel" role="menu">
                <button type="button" role="menuitem" onClick={() => handleCreateAction("articles", "Create article opened in Articles.")}>
                  <FileText size={16} aria-hidden="true" />
                  <span>Create article</span>
                  <small>Author a reader-facing row</small>
                </button>
                <button type="button" role="menuitem" onClick={() => handleCreateAction("content", "Create content row opened.")}>
                  <BookOpenText size={16} aria-hidden="true" />
                  <span>Create content row</span>
                  <small>Add a saved row to the library</small>
                </button>
                <button type="button" role="menuitem" onClick={() => handleCreateAction("vocabulary", "Create reusable phrase opened in Vocabulary.")}>
                  <Sparkles size={16} aria-hidden="true" />
                  <span>Create reusable phrase</span>
                  <small>Vocab namespace row</small>
                </button>
                <button type="button" role="menuitem" onClick={() => handleCreateAction("templates", "Create template opened.")}>
                  <KeyRound size={16} aria-hidden="true" />
                  <span>Create template</span>
                  <small>Mustache scaffold</small>
                </button>
                <button type="button" role="menuitem" onClick={() => handleCreateAction("knowledge", "Create fallback hook opened.")}>
                  <Flag size={16} aria-hidden="true" />
                  <span>Create fallback hook</span>
                  <small>Saved route fallback</small>
                </button>
              </div>
            )}
          </div>
        </header>

        {message && <p className={`admin-save-toast ${loadState === "error" || loadState === "accessDenied" ? "is-error" : ""}`} role="status">{message}</p>}
        {hasAccessIssue && activePage !== "connection" && renderAccessGate()}
        {hasLoadFailure && renderLoadFailure()}

        {activePage === "overview" && (
          <section className="admin-template-page">
            <div className="admin-status-grid">
              <article className="admin-status-card">
                <span>Review queue</span>
                <strong className="admin-stat-value">{filteredReviewRows.length}</strong>
                <small>Rows needing editorial attention</small>
              </article>
              <article className="admin-status-card">
                <span>Phrasebank</span>
                <strong className="admin-stat-value">{phrasebankRows.length}</strong>
                <small>Primary reader-facing content</small>
              </article>
              <article className="admin-status-card">
                <span>Fallback rows</span>
                <strong className="admin-stat-value">{savedFallbackRows.length}</strong>
                <small>Saved rows only</small>
              </article>
              <article className="admin-status-card">
                <span>Hook catalog</span>
                <strong className="admin-stat-value">{hookCatalogItems.length - savedHookKeys.size}</strong>
                <small>Routes still local or missing</small>
              </article>
            </div>
            <div className="admin-studio-map">
              {[
                { page: "reviewQueue" as const, icon: Check, label: "Review Queue", text: "Bulk sign-off, status changes, evergreen locks, and reader-safety checks." },
                { page: "content" as const, icon: BookOpenText, label: "Content Library", text: "All editable saved and source rows, with filters for type, status, category, and key." },
                { page: "knowledge" as const, icon: Flag, label: "Fallback Rows", text: "Only saved fallback-hook rows. Local placeholders are kept out of this list." },
                { page: "hooks" as const, icon: KeyRound, label: "Hook Catalog", text: "Every route the runtime can request, with saved coverage and authoring entry points." },
                { page: "vocabulary" as const, icon: Sparkles, label: "Vocab", text: "Reusable phrase namespaces, natal taglines, relationship context, and style rows." },
                { page: "compositeByType" as const, icon: Users, label: "Composite by type", text: "Side-by-side relationship variants with romantic vocabulary gated." }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.label} type="button" onClick={() => navigateAdminPage(item.page)}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                    <small>{item.text}</small>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activePage === "reviewQueue" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar admin-review-queue-hero" aria-label="Review queue progress">
              <div>
                <p className="admin-eyebrow">Editorial workflow</p>
                <h2>Review, sign off, publish</h2>
                <p>Drafts and review holds stay out of reader routes. Published is the admin label for LIVE serving rows.</p>
              </div>
              <div className="admin-new-actions">
                <button type="button" onClick={() => void loadDashboardData()} disabled={isLoading}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Refresh
                </button>
                <button type="button" onClick={() => void applyBulkStatus()} disabled={selectedSavedRows.length === 0 || isLoading}>
                  <Check size={16} aria-hidden="true" />
                  Apply bulk
                </button>
              </div>
            </section>
            <section className="admin-content-filters admin-review-queue-filters" aria-label="Review queue filters">
              <div className="admin-review-filter-grid">
                <label>
                  <span>Status</span>
                  <select aria-label="Review status" value={reviewStatusFilter} onChange={(event) => setReviewStatusFilter(event.target.value as GeneratedContentStatus | "all")}>
                    <option value="all">All statuses</option>
                    {contentStatuses.map((status) => <option key={status} value={status}>{contentStatusLabel(status)}</option>)}
                  </select>
                </label>
                <label>
                  <span>Evergreen</span>
                  <select aria-label="Evergreen">
                    <option>All rows</option>
                    <option>Evergreen only</option>
                    <option>Hide evergreen</option>
                  </select>
                </label>
                <label>
                  <span>Content class</span>
                  <select aria-label="Review content class" value={contentClassFilter} onChange={(event) => setContentClassFilter(event.target.value as AdminContentClassFilter)}>
                    {contentClassFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Tier</span>
                  <select aria-label="Review tier" value={tierFilter} onChange={(event) => setTierFilter(event.target.value as AdminPhrasebankTierFilter)}>
                    {tierFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
                  </select>
                </label>
                <label className="admin-review-queue-search">
                  <span>Search</span>
                  <div className="admin-search-input-shell">
                    <Search size={15} aria-hidden="true" />
                    <input aria-label="Search review queue" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Key, title, body, surface" />
                  </div>
                </label>
              </div>
            </section>
            {renderBulkBar()}
            {renderReviewTable(filteredReviewRows)}
          </section>
        )}

        {activePage === "content" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar" aria-label="Content controls">
              <div className="admin-content-toolbar-copy">
                <p className="admin-eyebrow">Full content library</p>
                <h2>All editable content rows</h2>
                <p>{filteredRows.length} rows shown across articles, phrasebank copy, vocabulary, templates, fallback hooks, and source rows. Runtime serves only Published rows in the serving lane with no review hold.</p>
              </div>
              <div className="admin-new-actions" aria-label="Content admin shortcuts">
                <button type="button" onClick={() => navigateAdminPage("reviewQueue")}>
                  <Check size={16} aria-hidden="true" />
                  Review Queue
                </button>
                <button type="button" onClick={() => handleCreateAction("content", "New content row started.")}>
                  <Plus size={16} aria-hidden="true" />
                  New content row
                </button>
                <button type="button" onClick={() => navigateAdminPage("knowledge")}>
                  <FileText size={16} aria-hidden="true" />
                  Fallback hooks
                </button>
              </div>
            </section>
            {renderContentFilters()}
            <section className="admin-reader-safety-panel" aria-label="Reader safety status">
              <div>
                <p className="admin-eyebrow">Reader safety</p>
                <h3>Runtime Readiness</h3>
                <p>Reader routes only serve Published rows in the serving lane with safe reader-facing copy.</p>
              </div>
              <div className="admin-reader-safety-grid">
                <article className="reader-ready"><span>Reader-ready</span><strong>{readerCounts["reader-ready"]}</strong></article>
                <article><span>Draft/editorial</span><strong>{readerCounts["draft-held"]}</strong></article>
                <article><span>Reference/review held</span><strong>{readerCounts["reference-held"] + readerCounts["review-held"]}</strong></article>
                <article className={readerCounts["fallback-needed"] ? "needs-fallback" : ""}><span>Fallback needed</span><strong>{readerCounts["fallback-needed"]}</strong></article>
              </div>
            </section>
            {renderBulkBar()}
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Generated content records">
                {renderContentTable(filteredRows)}
              </aside>
            </section>
          </section>
        )}

        {activePage === "articles" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Article writing</p>
                <h2>Articles</h2>
                <p>{filteredArticleRows.length} of {articleRows.length} article rows shown. Filter by status, planet, display source, or text.</p>
              </div>
              <button type="button" onClick={() => handleCreateAction("articles", "New article draft started.")}>
                <Plus size={16} aria-hidden="true" />
                New Article
              </button>
            </section>
            {renderArticleFilters()}
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Article rows">
                {renderContentTable(filteredArticleRows)}
              </aside>
            </section>
          </section>
        )}

        {activePage === "knowledge" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Saved-first fallback rows</p>
                <h2>Fallback Hooks</h2>
                <p>Sky, Natal, Lunar Calendar, Settings, and Friends fallback rows appear here only after they exist in saved content.</p>
              </div>
              <button type="button" onClick={() => navigateAdminPage("hooks")}>
                <KeyRound size={16} aria-hidden="true" />
                Open Hook Catalog
              </button>
            </section>
            {renderFallbackTabs()}
            <label className="admin-field-wide">
              <span>Search fallback hooks</span>
              <input aria-label="Search fallback hooks" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hook name, key, surface, or body" />
            </label>
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Saved fallback hook rows">
                {renderContentTable(filteredFallbackRows)}
              </aside>
            </section>
          </section>
        )}

        {activePage === "hooks" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Runtime coverage</p>
                <h2>Surface Map</h2>
                <p>Public surfaces and content paths are mapped to saved rows, local hooks, vocab, and source material.</p>
              </div>
              <span className="ui-pill admin-status">{savedHookKeys.size}/{hookCatalogItems.length} saved</span>
            </section>
            <div className="admin-status-pills" role="group" aria-label="Filter surfaces by area">
              {[
                ["all", "All"],
                ["sky", "Sky"],
                ["you", "You"],
                ["friends", "Friends"],
                ["calendar", "Calendar"],
                ["settings", "Settings"]
              ].map(([key, label]) => (
                <button key={key} type="button" aria-pressed={surfaceAreaFilter === key} className={surfaceAreaFilter === key ? "active" : ""} onClick={() => setSurfaceAreaFilter(key as WritingSurfaceAreaFilter)}>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="admin-status-pills" role="group" aria-label="Filter surfaces by normalization status">
              {[
                ["all", "All"],
                ["complete", "Complete"],
                ["partial", "Partial"],
                ["missing", "Missing"]
              ].map(([key, label]) => (
                <button key={key} type="button" aria-pressed={surfaceStatusFilter === key} className={surfaceStatusFilter === key ? "active" : ""} onClick={() => setSurfaceStatusFilter(key as WritingSurfaceStatusFilter)}>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {renderFallbackTabs()}
            <section className="admin-fallback-row-list" aria-label="Hook catalog">
              {filteredHookCatalog.map((item) => {
                const saved = savedHookKeys.has(item.key) || savedHookKeys.has(canonicalFallbackContentKey(item.key));
                return (
                  <article key={`${item.type}-${item.key}`} className="admin-fallback-row" role="button" tabIndex={0} onClick={() => openHookDraft(item)} onKeyDown={(event) => onCatalogKeyDown(event, item)}>
                    <div className="admin-fallback-row-main">
                      <p className="admin-eyebrow">{item.section} / {item.type}</p>
                      <h3>{item.label}</h3>
                      <code>{canonicalFallbackContentKey(item.key)}</code>
                    </div>
                    <div className="admin-fallback-row-actions">
                      <span className={`ui-pill admin-status ${saved ? "status-live" : "status-draft"}`}>{saved ? "Saved row" : "Needs row"}</span>
                      <button type="button" onClick={(event) => { event.stopPropagation(); openHookDraft(item); }}>
                        <Plus size={15} aria-hidden="true" />
                        Author
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          </section>
        )}

        {activePage === "vocabulary" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Reusable phrases</p>
                <h2>Vocabulary & Phrases</h2>
                <p>Vocab rows cover planet topics, sign style, sign needs, natal taglines, relationship context, and career phrase families.</p>
              </div>
              <span className="ui-pill admin-status">{vocabRows.length} vocab rows</span>
            </section>
            <div className="admin-template-tabs" role="tablist" aria-label="Vocabulary categories">
              {vocabularySections.map(({ key, label }) => (
                <button key={key} type="button" role="tab" aria-selected={vocabularyCategory === key} className={vocabularyCategory === key ? "active" : ""} onClick={() => setVocabularyCategory(key)}>
                  {label}
                </button>
              ))}
            </div>
            <label className="admin-field-wide">
              <span>Search vocabulary</span>
              <input aria-label="Search vocabulary" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Namespace, phrase, key" />
            </label>
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Vocabulary rows">
                {renderContentTable(filteredVocabularyRows)}
              </aside>
            </section>
          </section>
        )}

        {activePage === "templates" && (
          <section className="admin-template-page">
            <section className="admin-phrasebook-panel" aria-label="Mustache template library">
              <div className="admin-section-heading-row">
                <div>
                  <p className="admin-eyebrow">Composition</p>
                  <h2>Mustache templates and voice scaffolds</h2>
                  <p>Templates now support the phrasebank review flow instead of competing with it as a generation workflow.</p>
                </div>
                <span className="ui-pill admin-status">{templateRows.length} saved</span>
              </div>
            </section>
            <label className="admin-field-wide">
              <span>Search templates</span>
              <input aria-label="Search templates" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Template name, key, or body" />
            </label>
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Template rows">
                {renderContentTable(filteredTemplateRows)}
              </aside>
            </section>
          </section>
        )}

        {activePage === "slotDictionary" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Composition slots</p>
                <h2>Slots</h2>
                <p>Calculated slots, vocab-backed slots, and fallback slots are grouped by source and readiness.</p>
              </div>
            </section>
            <div className="admin-status-pills">
              <button type="button" className="active"><span>Editable slot rows</span><strong>{slotEditableRows.length}</strong></button>
              <button type="button"><span>Needs rows</span><strong>{Math.max(0, hookCatalogItems.length - savedHookKeys.size)}</strong></button>
            </div>
            <label className="admin-field-wide">
              <span>Search slot-backed rows</span>
              <input aria-label="Search slot-backed rows" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Slot, vocab, fallback, or template key" />
            </label>
            <div className="admin-studio-map">
              {["Calculated facts", "Vocabulary rows", "Fallback rows", "Template slots"].map((label) => (
                <article key={label}>
                  <Database size={18} aria-hidden="true" />
                  <span>{label}</span>
                  <small>Source and readiness are visible before a row can be promoted.</small>
                </article>
              ))}
            </div>
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Editable slot-backed rows">
                {renderContentTable(filteredSlotEditableRows)}
              </aside>
            </section>
          </section>
        )}

        {activePage === "compositeByType" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Relationship-aware composite</p>
                <h2>Composite Review</h2>
                <p>Each composite aspect shows seven relationship-type variants. Romantic vocabulary should stay gated to romantic rows.</p>
              </div>
              <span className="ui-pill admin-status">{compositeRows.length} composite rows</span>
            </section>
            <div className="admin-template-card-list">
              {compositeRows.length === 0 && <p className="admin-empty">No composite rows with relationship-type sections are loaded yet.</p>}
              {renderEditor()}
              {compositeRows.map((row) => (
                <article className="admin-template-card" key={row.id}>
                  <div className="admin-section-heading-row">
                    <div>
                      <p className="admin-eyebrow">{contentStatusLabel(row.status)} / {tierForRow(row)}</p>
                      <h3>{rowTitle(row)}</h3>
                      <code>{row.content_key}</code>
                    </div>
                    <button type="button" onClick={() => openRow(row)}>Edit</button>
                  </div>
                  <section className="admin-template-rendered-preview" aria-label="Single voice fallback">
                    <p>{row.body || row.summary || "No shared meaning is saved yet."}</p>
                  </section>
                  <div className="admin-dependency-map-grid">
                    {relationshipTypes.map((type) => {
                      const copy = relationshipTypeCopy(row, type);
                      return (
                        <article key={type}>
                          <span>{type}{type === "romantic" ? " / gated" : ""}</span>
                          <strong>{copy ? "Authored" : "Falls back"}</strong>
                          <p>{copy || "Uses the single-voice composite bank for this relationship type."}</p>
                        </article>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === "connection" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Admin access</p>
                <h2>Connection</h2>
                <p>Save the content generation secret for local admin API calls.</p>
              </div>
              <button type="button" onClick={() => void loadDashboardData()} disabled={isLoading}>
                <RefreshCw size={16} aria-hidden="true" />
                Check Access
              </button>
            </section>
            <label className="admin-field-wide">
              <span>CONTENT_GENERATION_SECRET</span>
              <input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="Paste admin secret" />
            </label>
          </section>
        )}

        {activePage === "appBehavior" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Runtime rules</p>
                <h2>App Behavior</h2>
                <p>Runtime serving is constrained to Published rows in the serving lane with no review hold.</p>
              </div>
            </section>
            <div className="admin-studio-map">
              {["LIVE status", "Serving lane", "No review hold", "Reader-safe copy"].map((label) => (
                <article key={label}>
                  <Check size={18} aria-hidden="true" />
                  <span>{label}</span>
                  <small>Required before any row can be reader-facing.</small>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === "users" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Personalized output</p>
                <h2>Users</h2>
                <p>User-generated interpretations are separated from global phrasebank rows. Review here before changing private statuses.</p>
              </div>
              <span className="ui-pill admin-status">{userRows.length} user rows</span>
            </section>
            <div className="admin-content-table-scroll">
              <table className="admin-content-table">
                <thead className="admin-content-table-head">
                  <tr>
                    <th scope="col">Content</th>
                    <th scope="col">User</th>
                    <th scope="col">Subject</th>
                    <th scope="col">Surface</th>
                    <th scope="col">Status</th>
                    <th scope="col">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {userRows.map((row) => (
                    <tr key={row.id} className="admin-content-row">
                      <td className="admin-content-title-cell">
                        <strong className="admin-content-row-title">{rowTitle(row)}</strong>
                        <code className="admin-content-row-key">{row.content_key}</code>
                      </td>
                      <td><code>{row.user_id}</code></td>
                      <td className="admin-content-location"><strong>{row.subject_type}</strong><small>{row.subject_id}</small></td>
                      <td className="admin-content-location"><strong>{row.surface}</strong><small>{row.mode}</small></td>
                      <td><span className={`ui-pill admin-status status-${row.status.toLowerCase()}`}>{contentStatusLabel(row.status)}</span></td>
                      <td>{row.updated_at?.slice(0, 10) ?? row.created_at?.slice(0, 10) ?? "Local"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {userRows.length === 0 && <p className="admin-empty">No user-generated rows are loaded.</p>}
            </div>
          </section>
        )}

        {activePage === "releaseNotes" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Release notes</p>
                <h2>Release Notes</h2>
                <p>Dashboard IA rebuilt around phrasebank review, saved fallback rows, hook catalog authoring, vocab, and composite by type.</p>
              </div>
            </section>
            <div className="admin-template-card-list">
              <article className="admin-template-card">
                <p className="admin-eyebrow">Dashboard</p>
                <h3>Phrasebank-first rebuild</h3>
                <p>Legacy generation controls are no longer the main organizing principle. Review, the content library, fallback rows, hook catalog, vocab, composite variants, and users are separated.</p>
              </article>
            </div>
          </section>
        )}
      </section>
    </main>
  );

  function renderContentFilters() {
    return (
      <section className="admin-content-filters" aria-label="Content list filters">
        <div className="admin-status-pills" role="tablist" aria-label="Status">
          {(["all", ...contentStatuses] as Array<GeneratedContentStatus | "all">).map((status) => (
            <button key={status} type="button" role="tab" aria-selected={contentStatusFilter === status} className={contentStatusFilter === status ? "active" : ""} onClick={() => setContentStatusFilter(status)}>
              <span>{status === "all" ? "All" : contentStatusLabel(status)}</span>
              <strong>{statusCounts[status]}</strong>
            </button>
          ))}
        </div>
        <div className="admin-review-filter-grid">
          <label>
            <span>Category</span>
            <select aria-label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as AdminContentCategoryFilter)}>
              {categoryFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </select>
          </label>
          <label>
            <span>Content class</span>
            <select aria-label="Content class" value={contentClassFilter} onChange={(event) => setContentClassFilter(event.target.value as AdminContentClassFilter)}>
              {contentClassFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </select>
          </label>
          <label>
            <span>Tier</span>
            <select aria-label="Tier" value={tierFilter} onChange={(event) => setTierFilter(event.target.value as AdminPhrasebankTierFilter)}>
              {tierFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </select>
          </label>
          <label>
            <span>Search content</span>
            <input aria-label="Search content" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, app area, content key" />
          </label>
          <button type="button" onClick={() => void loadDashboardData()} disabled={isLoading}>
            <RefreshCw size={16} aria-hidden="true" />
            Apply Filters
          </button>
        </div>
      </section>
    );
  }

  function renderArticleFilters() {
    return (
      <section className="admin-content-filters" aria-label="Article filters">
        <div className="admin-review-filter-grid">
          <label>
            <span>Status</span>
            <select aria-label="Article status" value={articleStatusFilter} onChange={(event) => setArticleStatusFilter(event.target.value as GeneratedContentStatus | "all")}>
              <option value="all">All statuses</option>
              {contentStatuses.map((status) => <option key={status} value={status}>{contentStatusLabel(status)}</option>)}
            </select>
          </label>
          <label>
            <span>Planet or point</span>
            <select aria-label="Article planet or point" value={articlePointFilter} onChange={(event) => setArticlePointFilter(event.target.value as AdminArticlePointFilter)}>
              {articlePointFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </select>
          </label>
          <label>
            <span>App display source</span>
            <select aria-label="Article app display source" value={articleDisplaySourceFilter} onChange={(event) => setArticleDisplaySourceFilter(event.target.value as AdminAppDisplaySource | "all")}>
              {appDisplaySourceFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </select>
          </label>
          <label>
            <span>Search articles</span>
            <input aria-label="Search articles" value={articleQuery} onChange={(event) => setArticleQuery(event.target.value)} placeholder="Title, content key, body" />
          </label>
          <button
            type="button"
            onClick={() => {
              setArticleStatusFilter("all");
              setArticlePointFilter("all");
              setArticleDisplaySourceFilter("all");
              setArticleQuery("");
            }}
          >
            Clear filters
          </button>
        </div>
      </section>
    );
  }

  function renderAccessGate() {
    return (
      <section className="admin-content-toolbar admin-review-queue-hero" aria-label="Admin access required">
        <div>
          <p className="admin-eyebrow">Admin access required</p>
          <h2>Content is hidden until the dashboard can call the admin API</h2>
          <p>The saved rows are still in the admin API. Paste `CONTENT_GENERATION_SECRET`, then reload the dashboard data.</p>
        </div>
        <label className="admin-access-inline-field">
          <span>Secret</span>
          <input
            aria-label="Secret"
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void loadDashboardData();
              }
            }}
            placeholder="CONTENT_GENERATION_SECRET"
          />
        </label>
        <button type="button" onClick={() => void loadDashboardData()} disabled={isLoading || !secret.trim()}>
          <RefreshCw size={16} aria-hidden="true" />
          Load content
        </button>
      </section>
    );
  }

  function renderLoadFailure() {
    return (
      <section className="admin-content-toolbar admin-review-queue-hero admin-load-failure" aria-label="Content load failed">
        <div>
          <p className="admin-eyebrow">Content load failed</p>
          <h2>The dashboard could not load saved CMS rows</h2>
          <p>{loadError ?? "Check the admin API response and retry."}</p>
          {loadDiagnostics && (
            <details className="admin-advanced admin-review-json">
              <summary>Developer diagnostics</summary>
              <pre>{loadDiagnostics}</pre>
            </details>
          )}
        </div>
        <button type="button" onClick={() => void loadDashboardData()} disabled={isLoading}>
          <RefreshCw size={16} aria-hidden="true" />
          Retry
        </button>
      </section>
    );
  }

  function renderFallbackTabs() {
    return (
      <div className="admin-template-tabs" role="tablist" aria-label="Fallback hook sections">
        {fallbackSections.map((section) => (
          <button key={section.key} type="button" role="tab" aria-selected={fallbackSectionFilter === section.key} className={fallbackSectionFilter === section.key ? "active" : ""} onClick={() => setFallbackSectionFilter(section.key)}>
            {section.label}
          </button>
        ))}
      </div>
    );
  }

  function renderBulkBar() {
    return (
      <div className="admin-content-bulk-bar" aria-label="Bulk row actions">
        <div>
          <strong>{selectedIds.size}</strong>
          <span>selected</span>
        </div>
        <label>
          <span>Status</span>
          <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as GeneratedContentStatus)} disabled={isLoading}>
            {contentStatuses.map((status) => <option key={status} value={status}>{contentStatusLabel(status)}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void applyBulkStatus()} disabled={selectedSavedRows.length === 0 || isLoading}>
          <Save size={15} aria-hidden="true" />
          Apply
        </button>
        <button type="button" onClick={() => setSelectedIds(new Set())} disabled={selectedIds.size === 0 || isLoading}>
          Clear
        </button>
        <button type="button" className="admin-danger-button" onClick={() => void deleteSelectedDrafts()} disabled={selectedSavedRows.length === 0 || isLoading}>
          <Trash2 size={15} aria-hidden="true" />
          Delete drafts
        </button>
      </div>
    );
  }

  function renderContentTable(tableRows: AdminGeneratedContentRow[]) {
    return (
      <div className="admin-content-table-scroll">
        <table className="admin-content-table">
          <thead className="admin-content-table-head">
            <tr>
              <th scope="col">Select</th>
              <th scope="col">Content</th>
              <th scope="col">Runtime</th>
              <th scope="col">Editorial</th>
              <th scope="col">Surface</th>
              <th scope="col">Kind</th>
              <th scope="col">Updated</th>
              <th scope="col">Source</th>
              <th scope="col">Edit</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => {
              const safety = readerSafetyForRow(row);
              const rowClass = contentClassForRow(row);
              return (
                <tr key={row.id} className={`admin-content-row ${selectedRowId === row.id ? "selected" : ""}`} onClick={() => openRow(row)}>
                  <td onClick={(event) => event.stopPropagation()}>
                    <label className="admin-content-row-check">
                      <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleRowSelection(row.id)} aria-label={`Select ${rowTitle(row)}`} />
                    </label>
                  </td>
                  <td className="admin-content-title-cell">
                    <strong className="admin-content-row-title">{rowTitle(row)}</strong>
                    <code className="admin-content-row-key">{row.content_key}</code>
                  </td>
                  <td><span className={`admin-reader-state-pill ${safety.key}`} title={safety.detail}>{safety.label}</span></td>
                  <td><span className={`ui-pill admin-status status-${row.status.toLowerCase()}`}>{contentStatusLabel(row.status)}</span></td>
                  <td className="admin-content-location"><strong>{row.surface}</strong><small>{row.mode}</small></td>
                  <td>{row.block_type || row.event_type || "content"}</td>
                  <td>{row.updated_at?.slice(0, 10) ?? row.created_at?.slice(0, 10) ?? "Local"}</td>
                  <td><span className="ui-pill admin-status">{contentClassLabel(rowClass)}</span><small>{tierForRow(row)}</small></td>
                  <td>
                    <button
                      className="admin-edit-row-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openRow(row);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tableRows.length === 0 && <p className="admin-empty">No rows match these filters.</p>}
      </div>
    );
  }

  function renderReviewTable(tableRows: AdminReviewRecord[]) {
    return (
      <section className="admin-review-queue-layout" aria-label="Review queue">
        <aside className="admin-review-queue-groups" aria-label="Queue families">
          {contentStatuses.map((status) => (
            <button key={status} type="button" className={reviewStatusFilter === status ? "active" : ""} onClick={() => setReviewStatusFilter(status)}>
              <span>{contentStatusLabel(status)}</span>
              <strong>{reviewRows.filter((row) => row.status === status).length}</strong>
            </button>
          ))}
        </aside>
        <div className="admin-review-queue-rows" aria-label="Review rows">
          {tableRows.map((row) => {
            const safety = readerSafetyForRow(row);
            const saved = row.rawGlobalRow;
            return (
              <article key={row.id} className="admin-review-queue-row" onClick={() => saved && openRow(saved)}>
                <div className="admin-review-queue-row-head">
                  <label className="admin-content-row-check" onClick={(event) => event.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(saved?.id ?? row.id)} disabled={!saved} onChange={() => saved && toggleRowSelection(saved.id)} />
                  </label>
                  <div>
                    <h3>{rowTitle(row)}</h3>
                    <code>{row.contentKey}</code>
                  </div>
                  <span className={`ui-pill admin-status status-${row.status.toLowerCase()}`}>{contentStatusLabel(row.status)}</span>
                  <span className="ui-pill admin-status">{contentClassLabel(contentClassForRow(row))}</span>
                  <span className={`admin-reader-state-pill ${safety.key}`}>{safety.label}</span>
                </div>
                <p>{row.summary || row.body || "No preview copy saved."}</p>
                <div className="admin-review-queue-actions">
                  {saved && <button type="button" onClick={(event) => { event.stopPropagation(); openRow(saved); }}>Edit</button>}
                </div>
              </article>
            );
          })}
          {tableRows.length === 0 && <p className="admin-empty">No review rows match these filters.</p>}
        </div>
      </section>
    );
  }

  function renderEditor() {
    if (!draft && !selectedRow) {
      return null;
    }

    const currentDraft = draft ?? (selectedRow ? draftFromRow(selectedRow) : null);
    if (!currentDraft) return null;

    const isVocabularyDraft = draftIsVocabulary(currentDraft);
    const isArticleDraft = draftIsArticle(currentDraft);
    const isSkyPlacementDraft = draftIsSkyPlacement(currentDraft);
    const isNewDraft = !currentDraft.id;
    const vocabularySection = vocabularySectionFromKey(currentDraft.contentKey);
    const contentLevel = contentLevelForAppDisplaySource(currentDraft.appDisplaySource);
    const updateVocabularySection = (nextSection: AdminVocabularySection) => {
      setDraft({
        ...currentDraft,
        contentKey: isNewDraft ? vocabularyContentKey(nextSection, currentDraft.headline) : currentDraft.contentKey
      });
    };
    const updateHeadline = (headline: string) => {
      setDraft({
        ...currentDraft,
        headline,
        contentKey: isVocabularyDraft && isNewDraft ? vocabularyContentKey(vocabularySection, headline) : currentDraft.contentKey
      });
    };

    return (
      <>
      <button type="button" className="admin-editor-backdrop" aria-label="Close editor" onClick={closeEditor} />
      <aside ref={editorRef} className="admin-editor-panel admin-review-detail" role="dialog" aria-modal="true" aria-label="Generated content editor">
        <div className="admin-editor-toolbar">
          <div>
            <p className="admin-eyebrow">{isVocabularyDraft ? "Phrase editor" : isArticleDraft ? "Article editor" : "Content editor"}</p>
            <h2>
              {currentDraft.id
                ? isVocabularyDraft
                  ? "Edit phrase"
                  : isArticleDraft
                    ? "Edit article"
                    : "Edit saved row"
                : isVocabularyDraft
                  ? "Create reusable phrase"
                  : isArticleDraft
                    ? "Create article"
                    : "Author new row"}
            </h2>
          </div>
          <div className="admin-editor-toolbar-actions">
            <span className={`ui-pill admin-status status-${currentDraft.status.toLowerCase()}`}>{contentStatusLabel(currentDraft.status)}</span>
            <button type="button" onClick={closeEditor}>
              Close
            </button>
          </div>
        </div>
        <section className="admin-post-editor">
          {isVocabularyDraft && (
            <div className="admin-editor-guidance" aria-label="Phrase authoring guidance">
              <strong>How vocabulary phrases are organized</strong>
              <p>Choose a section, name the phrase, then write the reusable wording. The internal key is generated from the section and title so phrases stay grouped in the dashboard.</p>
            </div>
          )}
          {isVocabularyDraft && (
            <label className="admin-title-field">
              <span>Phrase section</span>
              <select aria-label="Phrase section" value={vocabularySection} onChange={(event) => updateVocabularySection(event.target.value as AdminVocabularySection)} disabled={!isNewDraft}>
                {vocabularySections.map((section) => <option key={section.key} value={section.key}>{section.label}</option>)}
              </select>
              <small className="admin-field-hint">{vocabularySections.find((section) => section.key === vocabularySection)?.description}</small>
            </label>
          )}
          <label className="admin-title-field">
            <span>{isVocabularyDraft ? "Phrase title" : "Headline"}</span>
            <input aria-label={isVocabularyDraft ? "Phrase title" : "Headline"} value={currentDraft.headline} onChange={(event) => updateHeadline(event.target.value)} placeholder={isVocabularyDraft ? "Example: Moon phase / Balsamic / Reflection" : undefined} />
            {isVocabularyDraft && <small className="admin-field-hint">This is the human name editors see in the table. New rows use it to generate the internal key.</small>}
          </label>
          <label className="admin-review-copy-editor">
            <span>{isVocabularyDraft ? "Editor note or grouping detail" : "Summary"}</span>
            <textarea aria-label={isVocabularyDraft ? "Editor note or grouping detail" : "Summary"} value={currentDraft.summary} onChange={(event) => setDraft({ ...currentDraft, summary: event.target.value })} placeholder={isVocabularyDraft ? "Optional: where this phrase should be used, tone notes, or related variants." : undefined} />
          </label>
          <label className="admin-review-copy-editor">
            <span>{isVocabularyDraft ? "Reusable phrase text" : "Body"}</span>
            <textarea aria-label={isVocabularyDraft ? "Reusable phrase text" : "Body"} value={currentDraft.body} onChange={(event) => setDraft({ ...currentDraft, body: event.target.value })} placeholder={isVocabularyDraft ? "Write the reusable wording or phrase pattern here." : undefined} />
          </label>
          <details className="admin-advanced admin-editor-key-details" open={!isVocabularyDraft}>
            <summary>{isVocabularyDraft ? "Internal generated key" : "Content key"}</summary>
            <label className="admin-title-field">
              <span>{isVocabularyDraft ? "Generated key" : "Content key"}</span>
              <input aria-label={isVocabularyDraft ? "Generated key" : "Content key"} value={currentDraft.contentKey} onChange={(event) => setDraft({ ...currentDraft, contentKey: event.target.value })} disabled={Boolean(currentDraft.id) || isVocabularyDraft} />
              {isVocabularyDraft && <small className="admin-field-hint">Generated from section + title. Existing rows keep their original key so published content stays connected.</small>}
            </label>
          </details>
          {isSkyPlacementDraft && (
            <section className="admin-display-source-panel" aria-label="Sky placement display source">
              <div>
                <p className="admin-eyebrow">Runtime display</p>
                <h3>App Display Source</h3>
                <p>Choose where the reader-facing Sky placement words come from. Content level is derived from this source.</p>
              </div>
              <label className="admin-title-field">
                <span>App display source</span>
                <select
                  aria-label="App display source"
                  value={currentDraft.appDisplaySource}
                  onChange={(event) => setDraft({
                    ...currentDraft,
                    appDisplaySource: event.target.value as AdminAppDisplaySource
                  })}
                >
                  <option value="dashboard-article">This dashboard article</option>
                  <option value="reviewed-phrasebank">Reviewed phrasebank copy</option>
                  <option value="madlib-fallback">Simple fallback copy</option>
                </select>
                <small className="admin-field-hint">
                  {currentDraft.appDisplaySource === "dashboard-article"
                    ? "Uses the saved text from this row."
                    : currentDraft.appDisplaySource === "reviewed-phrasebank"
                      ? "Ignores this row's prose and uses reviewed built-in phrasebank wording."
                      : "Ignores saved/reviewed prose and uses the local madlib fallback."}
                </small>
              </label>
              <div className="admin-content-level-readout">
                <span>Content Level</span>
                <strong className={`ui-pill admin-status ${contentLevel === "source-grounded" ? "status-live" : "status-draft"}`}>
                  {contentLevel}
                </strong>
              </div>
            </section>
          )}
          <fieldset className="admin-metadata-fields">
            <label className="admin-metadata-field">
              <span>Status</span>
              <select aria-label="Status" value={currentDraft.status} onChange={(event) => setDraft({ ...currentDraft, status: event.target.value as GeneratedContentStatus })}>
                {contentStatuses.map((status) => <option key={status} value={status}>{contentStatusLabel(status)}</option>)}
              </select>
            </label>
            <label className="admin-metadata-field">
              <span>Surface</span>
              <select aria-label="Surface" value={currentDraft.surface} onChange={(event) => setDraft({ ...currentDraft, surface: event.target.value as GeneratedContentSurface })}>
                {["sky", "you", "natal", "synastry", "composite", "relationship", "modifier"].map((surface) => <option key={surface} value={surface}>{surface}</option>)}
              </select>
            </label>
            <label className="admin-metadata-field">
              <span>Mode</span>
              <select aria-label="Mode" value={currentDraft.mode} onChange={(event) => setDraft({ ...currentDraft, mode: event.target.value })}>
                {["feed", "in_depth", "article", "card"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </label>
            <label className="admin-metadata-field">
              <span>Lane</span>
              <select aria-label="Lane" value={currentDraft.lane} onChange={(event) => setDraft({ ...currentDraft, lane: event.target.value })}>
                <option value="serving">serving</option>
                <option value="reference">reference</option>
              </select>
            </label>
            <label className="admin-metadata-field">
              <span>Review state</span>
              <input aria-label="Review state" value={currentDraft.reviewState} onChange={(event) => setDraft({ ...currentDraft, reviewState: event.target.value })} />
            </label>
            <label className="admin-metadata-field">
              <span>Block type</span>
              <input aria-label="Block type" value={currentDraft.blockType} onChange={(event) => setDraft({ ...currentDraft, blockType: event.target.value })} />
            </label>
          </fieldset>
          <div className="admin-toolbar-actions">
            <button className="admin-primary-button" type="button" onClick={() => void saveDraft()} disabled={isLoading}>
              <Save size={16} aria-hidden="true" />
              Save
            </button>
            <button type="button" onClick={() => void saveDraft("REVIEWED")} disabled={isLoading}>
              <Check size={16} aria-hidden="true" />
              Reviewed
            </button>
            <button type="button" onClick={() => void saveDraft("LIVE")} disabled={isLoading}>
              <Check size={16} aria-hidden="true" />
              Sign Off
            </button>
          </div>
          {selectedRow && (
            <details className="admin-advanced admin-review-json">
              <summary>Structured fields</summary>
              <pre>{sectionsText({
                id: selectedRow.id,
                contentKey: selectedRow.content_key,
                facts: selectedRow.facts,
                sourceSnapshot: selectedRow.source_snapshot,
                sections: selectedRow.sections
              })}</pre>
            </details>
          )}
        </section>
      </aside>
      </>
    );
  }
}
