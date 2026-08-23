import {
  ArrowLeft,
  BarChart3,
  BookOpenText,
  Check,
  Database,
  FileText,
  Flag,
  KeyRound,
  Moon,
  Plus,
  RefreshCw,
  Save,
  Search,
  Server,
  Sparkles,
  Trash2,
  Users
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { isReaderFacingCopy } from "../../web/src/content/readerSafety";
import { renderCmsTemplatePreview, validateCmsTemplate } from "../../web/src/content/cmsTemplateValidation";
import { announceContentUpdate } from "../../web/src/services/contentUpdateSignal";
import { adminCredentialHeaders, adminSecretStorageKey, normalizeAdminSecret } from "./adminSecret";
import { loadOwnerSessionAccessToken, watchOwnerSessionAccessToken } from "./ownerSession";
import {
  SKY_ARTICLE_COMPILER_VERSION,
  compileSkyArticleEdition,
  reviseSkyArticleEdition,
  skyArticleEditableFields,
  skyArticleEditionFieldChanges,
  skyArticleEditionRecord,
  skyArticleTemplatePlaceholders,
  type CompiledSkyArticleEdition,
  type SkyArticleAspectPassage,
  type SkyArticleEditableFields,
  type SkyArticleFieldChange,
  type SkyArticleHousePassage
} from "../../web/src/content/skyArticleTemplateCompiler";
import {
  personalTransitAspectCmsStarter,
  relatedAspectPassages,
  relatedHousePassages,
  relatedLunationHoroscopes,
  skyLunationContextForRow,
  skyWriteupContextForRow
} from "./skyWriteupRelations";
import {
  ownerApprovedReplacementLabel,
  ownerApprovedSkyPlacementArticleKey
} from "./skyPlacementServingStatus";
import {
  effectivePackageRecord,
  packageDraftChanges,
  renderWorkspacePreview,
  setPackageValueAt,
  skyFallbackIdentity,
  skyFallbackWorkspace
} from "./skyFallbackWorkspace";
import type {
  WritingSurfaceAdminAccess,
  WritingSurfaceMapItem,
  WritingSurfaceSource
} from "./writingSurfaceSourceMap";
import "./admin.css";

const AspectPatternDiagnostics = lazy(async () => {
  const module = await import("./AspectPatternDiagnostics");
  return { default: module.AspectPatternDiagnostics };
});
const AspectPatternWriteups = lazy(async () => {
  const module = await import("./AspectPatternWriteups");
  return { default: module.AspectPatternWriteups };
});
const ReportFulfillmentAdminPanel = lazy(async () => {
  const module = await import("./ReportFulfillmentAdminPanel");
  return { default: module.ReportFulfillmentAdminPanel };
});

type GeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship" | "modifier" | "friends";
type GeneratedContentMode = "feed" | "in_depth" | "article" | "card" | string;
type AdminDashboardPage =
  | "articles"
  | "skyWriteups"
  | "compatibility"
  | "content"
  | "reviewQueue"
  | "compositeByType"
  | "connection"
  | "vocabulary"
  | "slotDictionary"
  | "knowledge"
  | "templates"
  | "hooks"
  | "sourceDrafts"
  | "aspectPatternCoverage"
  | "aspectPatternActivationCoverage"
  | "aspectDiagnostics"
  | "users"
  | "reportFulfillment";
type AdminContentClass = "phrasebank" | "generated" | "fallback-hook" | "vocab" | "reference" | "legacy" | "user-generated" | "other";
type AdminContentClassFilter = AdminContentClass | "all";
type AdminContentRole = "authored-content" | "generated-content" | "fallback-output" | "fallback-helper" | "source-material" | "legacy-generated" | "unknown";
type AdminContentSystemFilter = "all" | "authored" | "generated" | "fallback";
type AdminReaderReadinessKey = "reader-ready" | "draft-held" | "reference-held" | "review-held" | "fallback-needed" | "needs-source-material";
type AdminFallbackCompositionDiagnostic = {
  title: string;
  status: string;
  body: string;
  template: string;
  slots: string[];
  sourceLanes: string[];
  action: string;
};
type AdminPhrasebankTier = "CONFIRMED" | "REVIEWED" | "SESSION_APPROVED_DRAFT" | "none";
type AdminPhrasebankTierFilter = AdminPhrasebankTier | "all";
type AdminContentCategoryFilter = "all" | "Sky" | "Natal Aspects" | "Natal Angles" | "Natal Chart" | "Relationship" | "Condition Modifiers" | "Fallback Hooks" | "Fallback Templates";
type AdminFallbackHookSectionFilter = "all" | "sky" | "you" | "friends" | "lunar-calendar" | "settings";
type WritingSurfaceAreaFilter = "all" | "sky" | "you" | "friends" | "calendar" | "settings";
type WritingSurfaceStatusFilter = "all" | "complete" | "partial" | "missing";
type AdminArticlePointFilter = "all" | "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto" | "other";
type AdminCompatibilitySectionFilter = "all" | "content" | "fallback-hooks" | "vocabulary" | "slots";
type AdminCompatibilitySort = "updated-desc" | "updated-asc" | "title-asc" | "status" | "source";
type AdminCompatibilityCreateKind = "content" | "vocabulary" | "fallback-hook" | "template";
type SkyVoiceQueueView = "all" | "composite" | "upcoming" | "needs-review" | "audit";
type ContentLibraryView = "all" | "compatibility";
type SkyReviewHorizonOccurrence = {
  kind: "aspect" | "placement";
  contentKey: string;
  label: string;
  facts: Record<string, string>;
  activeDates: string[];
  windows: Array<{ startDate: string; endDate: string }>;
  reviewStatus: "missing_draft" | "ready_for_owner" | "approved_scheduled" | "rejected" | "generation_error" | "draft_needs_work";
  row: AdminGeneratedContentRow | null;
};
type SkyReviewHorizon = {
  startDate: string;
  endDate: string;
  snapshotCount: number;
  calculationMethod: string;
  counts: { occurrences: number; aspectCandidates: number; placementCandidates: number; activeWindows: number };
  reviewCounts: Record<string, number>;
  generationPlan: {
    status: "authorization_required";
    reusableCandidatesMissingDrafts: number;
    writerCalls: number;
    reviewerCalls: number;
    minimumSuccessfulCalls: number;
    contentKeys: string[];
    note: string;
  };
  occurrences: SkyReviewHorizonOccurrence[];
};
type FallbackHookDefinition = {
  key: string;
  label: string;
  surface: GeneratedContentSurface;
  mode: GeneratedContentMode;
  copy: {
    headline: string;
    summary: string;
    body: string;
  };
};

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
  judge_score?: number | null;
  judge_verdict?: string | null;
  judge_gate?: "auto-publish" | "human-review" | "regenerate" | null;
  judge_why?: string | null;
  reviewer_notes?: string | null;
  prompt_version?: string | null;
  provider?: string | null;
  model?: string | null;
  reviewed_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
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
  { type: "fallback"; key: string; label: string; section: AdminFallbackHookSectionFilter; definition: FallbackHookDefinition };
type AdminLoadState = "idle" | "loading" | "loaded" | "accessDenied" | "error";

type SkyArticleEditionFacts = {
  schema: "tldrastro-sky-article-engine-facts-v1";
  calculationSource: string;
  generatedAt: string;
  referenceTimeZone: string;
  planet: string;
  sign: string;
  entryYear: number;
  validFrom: string;
  validTo: string;
  transitStartInstant: string;
  transitEndInstant: string;
  slotValues: Record<string, string>;
};

type SkyArticleEditionForm = {
  referenceDate: string;
  facts: SkyArticleEditionFacts | null;
  tldr: string;
  slotValues: Record<string, string>;
  slotGeneration: {
    provider: string;
    model: string;
    responseId: string | null;
    generatedAt: string;
    requestedSlots: string[];
    generationMetadata?: unknown;
  } | null;
  factBlockedSlots: Array<{ name: string; description?: string }>;
  saveState: "idle" | "saved" | "saving" | "unsaved" | "error";
  workspaceId: string | null;
};

type SkyArticleEditorState = {
  baseEdition: CompiledSkyArticleEdition;
  error: string | null;
  fields: SkyArticleEditableFields;
  reviewOpen: boolean;
  rowId: string;
  saveState: "saved" | "saving" | "unsaved" | "error";
};

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
  sections: Record<string, unknown> | null;
  facts: Record<string, unknown> | null;
  reviewerNotes: string;
  sourceSnapshot: Record<string, unknown> | null;
};

type AdminVocabularySection = "planets" | "signs" | "natal" | "relationship" | "career";
type AdminVocabularyCategoryFilter = AdminVocabularySection;

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
  articles: "articles",
  skyWriteups: "sky-writeups",
  compatibility: "compatibility",
  content: "exact-content",
  reviewQueue: "review-queue",
  compositeByType: "composite-review",
  connection: "connection",
  vocabulary: "vocabulary",
  slotDictionary: "slots",
  knowledge: "fallback-hooks",
  templates: "templates",
  hooks: "surface-map",
  sourceDrafts: "source-drafts",
  aspectPatternCoverage: "content/aspect-patterns",
  aspectPatternActivationCoverage: "content/aspect-patterns/activation",
  aspectDiagnostics: "diagnostics/aspect-patterns",
  users: "users",
  reportFulfillment: "report-fulfillment"
};

const adminPageByHashKey = {
  ...Object.fromEntries(
    Object.entries(adminPageHashKeys).map(([page, hashKey]) => [hashKey, page])
  ),
  home: "reviewQueue",
  review: "reviewQueue",
  "app-behavior": "reviewQueue",
  "release-notes": "reviewQueue",
  "content/aspect-pattern-activation": "aspectPatternActivationCoverage"
} as Record<string, AdminDashboardPage>;

type AdminNavItem = { page: AdminDashboardPage; label: string; icon: typeof Check };

const compositionPages: AdminDashboardPage[] = ["templates", "slotDictionary", "vocabulary", "knowledge", "hooks"];
const compositionTabs: AdminNavItem[] = [
  { page: "templates", label: "Templates", icon: Sparkles },
  { page: "slotDictionary", label: "Slots", icon: KeyRound },
  { page: "vocabulary", label: "Vocabulary", icon: BookOpenText },
  { page: "knowledge", label: "Fallback Hooks", icon: FileText },
  { page: "hooks", label: "Surface Map", icon: Flag }
];
const primaryAdminNavItems: AdminNavItem[] = [
  { page: "reviewQueue", label: "Review Queue", icon: Check },
  { page: "content", label: "Content Library", icon: BookOpenText },
  { page: "skyWriteups", label: "Sky Write-ups", icon: Moon },
  { page: "articles", label: "Articles", icon: FileText },
  { page: "compatibility", label: "Compatibility", icon: Users },
  { page: "compositeByType", label: "Composite Review", icon: Users },
  { page: "templates", label: "Templates", icon: Sparkles },
  { page: "aspectPatternCoverage", label: "Aspect Patterns", icon: BookOpenText }
];
const advancedAdminNavItems: AdminNavItem[] = [
  { page: "sourceDrafts", label: "Sky Aspect Drafts", icon: FileText },
  { page: "users", label: "Users", icon: Users },
  { page: "reportFulfillment", label: "Reports", icon: BarChart3 },
  { page: "connection", label: "Connection", icon: Server },
  { page: "aspectDiagnostics", label: "Diagnostics", icon: BarChart3 }
];

function isCompositionPage(page: AdminDashboardPage) {
  return compositionPages.includes(page);
}

const contentStatuses: GeneratedContentStatus[] = ["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "ERROR"];
const fallbackHookReviewStatuses = ["needs_review", "reviewed", "approved", "approved_reuse", "deprecated", "rejected"] as const;
const fallbackArchitectureV3Provider = "tldrastro-fallback-architecture-v3";
const fallbackArchitectureV3ReviewStatuses = ["needs_review", "approved", "approved_reuse"] as const;
const contentClassFilters: Array<{ key: AdminContentClassFilter; label: string }> = [
  { key: "all", label: "All classes" },
  { key: "phrasebank", label: "Authored app copy" },
  { key: "generated", label: "Generated prose" },
  { key: "fallback-hook", label: "Fallback articles & passages" },
  { key: "vocab", label: "Fallback source phrases" },
  { key: "reference", label: "Source material" },
  { key: "legacy", label: "Legacy generated rows" },
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
  { key: "Fallback Hooks", label: "Fallback Articles & Passages" },
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
const contentSystemFilters: Array<{ key: AdminContentSystemFilter; label: string }> = [
  { key: "all", label: "All content systems" },
  { key: "authored", label: "Authored copy" },
  { key: "generated", label: "Generated prose" },
  { key: "fallback", label: "Fallback/supporting copy" }
];
const compatibilitySections: Array<{ key: AdminCompatibilitySectionFilter; label: string; description: string }> = [
  { key: "all", label: "All compatibility", description: "Every saved row that supports compatibility copy." },
  { key: "content", label: "App card copy", description: "Reader-facing compatibility rows that can replace the built-in phrasebank copy." },
  { key: "fallback-hooks", label: "Simple fallbacks", description: "Saved fallback routes used only when reviewed prose is unavailable." },
  { key: "vocabulary", label: "Reusable phrases", description: "Relationship and compatibility phrase rows available to templates and review." },
  { key: "slots", label: "Templates & slots", description: "Mustache templates and slot-backed rows used to assemble compatibility copy." }
];
const compatibilitySortOptions: Array<{ key: AdminCompatibilitySort; label: string }> = [
  { key: "updated-desc", label: "Newest updated" },
  { key: "updated-asc", label: "Oldest updated" },
  { key: "title-asc", label: "Title A-Z" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source class" }
];
const relationshipTypes = ["romantic", "friendship", "family", "coworkers", "creative", "exes", "complicated"];

function adminHashForPage(page: AdminDashboardPage, params?: URLSearchParams) {
  const query = params?.toString();
  return `#${adminPageHashKeys[page]}${query ? `?${query}` : ""}`;
}

function parseAdminHash() {
  const rawHash = window.location.hash || "#review-queue";
  const hashBody = rawHash.replace(/^#/, "");
  const [key = "review-queue", query = ""] = hashBody.split("?");
  const params = new URLSearchParams(query);
  if (key === "compatibility") params.set("view", "compatibility");
  if (key === "composite-review") params.set("view", "composite");
  return {
    page: adminPageByHashKey[key] ?? "reviewQueue",
    params
  };
}

function adminPageTitle(activePage: AdminDashboardPage) {
  switch (activePage) {
    case "articles": return "Articles";
    case "skyWriteups": return "Sky Write-ups";
    case "compatibility": return "Compatibility";
    case "content": return "Content Library";
    case "reviewQueue": return "Review Queue";
    case "compositeByType": return "Composite Review";
    case "connection": return "Connection";
    case "vocabulary": return "Vocabulary & Phrases";
    case "slotDictionary": return "Slots";
    case "knowledge": return "Fallback Articles & Passages";
    case "templates": return "Templates";
    case "hooks": return "Surface Map";
    case "sourceDrafts": return "Sky Aspect Drafts";
    case "aspectPatternCoverage": return "Aspect Patterns";
    case "aspectPatternActivationCoverage": return "Aspect Pattern Activation";
    case "aspectDiagnostics": return "Aspect Pattern Diagnostics";
    case "users": return "Users";
    case "reportFulfillment": return "Report Fulfillment";
    default: return "Content Studio";
  }
}

function adminPageBreadcrumb(activePage: AdminDashboardPage) {
  switch (activePage) {
    case "articles": return "Admin / Write / Articles";
    case "skyWriteups": return "Admin / Write / Sky write-ups";
    case "compatibility": return "Admin / Write / Compatibility";
    case "content": return "Admin / Write / Content library";
    case "reviewQueue": return "Admin / Publish / Review queue";
    case "compositeByType": return "Admin / Write / Composite review";
    case "connection": return "Admin / Connection";
    case "vocabulary": return "Admin / Composition / Vocabulary & phrases";
    case "slotDictionary": return "Admin / Composition / Slots";
    case "knowledge": return "Admin / Composition / Fallback articles & passages";
    case "templates": return "Admin / Composition / Templates";
    case "hooks": return "Admin / Composition / Surface map";
    case "sourceDrafts": return "Admin / App surfaces / Sky aspect drafts";
    case "aspectPatternCoverage": return "Admin / Language System / Aspect Patterns";
    case "aspectPatternActivationCoverage": return "Admin / Language System / Aspect Pattern Activation";
    case "aspectDiagnostics": return "Admin / Diagnostics / Aspect patterns";
    case "users": return "Admin / Users";
    case "reportFulfillment": return "Admin / Operations / Report fulfillment";
    default: return "Admin / Home";
  }
}

function adminPageDescription(activePage: AdminDashboardPage) {
  switch (activePage) {
    case "skyWriteups":
      return "Planetary placements and lunations in one editorial workflow, with the main write-up, related aspects, and personalized horoscopes together.";
    case "reviewQueue":
      return "Phrasebank-first publishing queue with content-class, tier, evergreen, and bulk sign-off controls.";
    case "content":
      return "The full editable library: saved content rows plus source rows ready to review, filter, edit, or promote.";
    case "knowledge":
      return "Complete fallback articles, house passages, aspects, and supporting rows, grouped by what readers receive.";
    case "vocabulary":
      return "Reusable vocab namespaces and phrase rows for generation, taglines, and relationship context.";
    case "slotDictionary":
      return "Editable source rows that fill app slots: reusable vocab, fallback hooks, and template scaffolds.";
    case "templates":
      return "Mustache scaffolds and structured templates used to assemble app copy.";
    case "compositeByType":
      return "Composite relationship copy grouped by relationship type, with gated romantic variants separated.";
    case "compatibility":
      return "Compatibility content, fallback hooks, vocabulary, slots, and templates in one searchable review surface.";
    case "hooks":
      return "Every public surface and runtime hook request, with saved coverage separated from local placeholders.";
    case "sourceDrafts":
      return "Held Current Sky aspect passages, searchable by planet or aspect and editable without making them reader-eligible.";
    case "aspectPatternCoverage":
      return "Editable natal and Active Now aspect-pattern write-ups with resolver previews, validation, and authored/fallback comparison.";
    case "aspectPatternActivationCoverage":
      return "Editable Active Now aspect-pattern write-ups with resolver previews, validation, and authored/fallback comparison.";
    case "aspectDiagnostics":
      return "Read-only detector, relationship, and ranking diagnostics for natal aspect patterns.";
    case "users":
      return "Read-mostly user-generated rows by subject, surface, status, and latest update.";
    case "reportFulfillment":
      return "Orders, gate pass rates, retries, judge scores, exceptions, delivery time, token spend, and sampled audits.";
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

function vocabularyCategoryFromParams(page: AdminDashboardPage, params: URLSearchParams): AdminVocabularyCategoryFilter {
  const category = params.get("category");
  return page === "vocabulary" && category && isVocabularySection(category) ? category : "planets";
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

function draftIsFallbackHook(draft: AdminDraft) {
  return draft.blockType === "fallback_hook" || draft.contentKey.startsWith("fallback-hook/");
}

function draftIsTemplate(draft: AdminDraft) {
  return draft.blockType === "template" || draft.blockType === "fallback_template" || draft.contentKey.startsWith("slot-template/");
}

function contentSystemForRole(role: AdminContentRole): Exclude<AdminContentSystemFilter, "all"> {
  if (role === "authored-content") return "authored";
  if (role === "generated-content" || role === "legacy-generated") return "generated";
  return "fallback";
}

function contentLevelForRole(role: AdminContentRole) {
  const system = contentSystemForRole(role);
  if (system === "authored") return "source-grounded";
  if (system === "generated") return "generated";
  return "madlib-fallback";
}

function contentSystemLabel(system: Exclude<AdminContentSystemFilter, "all">) {
  if (system === "authored") return "Authored";
  if (system === "generated") return "Generated";
  return "Fallback/supporting";
}

function sourceSnapshotForRow(row: AdminGeneratedContentRow | AdminReviewRecord) {
  return "content_key" in row ? row.source_snapshot : row.sourceSnapshot;
}

function rowContentKey(row: AdminGeneratedContentRow | AdminReviewRecord) {
  return "content_key" in row ? row.content_key : row.contentKey;
}

function rowBlockType(row: AdminGeneratedContentRow | AdminReviewRecord) {
  return "content_key" in row ? row.block_type : row.blockType;
}

function rowPromptVersion(row: AdminGeneratedContentRow | AdminReviewRecord) {
  return "content_key" in row ? row.prompt_version : row.promptVersion;
}

function sourceSnapshotString(snapshot: Record<string, unknown> | null | undefined, key: string) {
  const value = snapshot?.[key];
  return typeof value === "string" ? value : "";
}

function sourceSnapshotNumber(snapshot: Record<string, unknown> | null | undefined, key: string) {
  const value = snapshot?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function generatedRowNeedsReviewQueue(row: AdminGeneratedContentRow) {
  const sourceType = sourceSnapshotString(row.source_snapshot, "sourceType");

  return sourceType === "owner-resource-review"
    || (["DRAFT", "REVIEWED"].includes(row.status) && Boolean(row.review_state));
}

const retiredReviewStates = new Set([
  "legacy-natal-aspect-decommissioned",
  "retired-promoted-emergency-floor",
  "legacy-dashboard-source-disabled"
]);

function isRetiredAdminRow(row: AdminGeneratedContentRow) {
  const packageRecord = rowPackageRecord(row);
  const packageReviewStatus = sourceSnapshotString(row.source_snapshot, "review_status")
    || (typeof packageRecord.review_status === "string" ? packageRecord.review_status : "");
  return row.status === "ARCHIVED"
    || retiredReviewStates.has(row.review_state ?? "")
    || packageReviewStatus === "superseded";
}

function isPassiveReferenceAdminRow(row: AdminGeneratedContentRow) {
  const sourceType = sourceSnapshotString(row.source_snapshot, "sourceType");
  const reviewState = (row.review_state ?? "").toLowerCase();
  const isActiveOwnerReview = sourceType === "owner-resource-review"
    || reviewState === "owner-review-required"
    || reviewState === "needs-review"
    || reviewState === "needs_review";
  return !isActiveOwnerReview && (
    row.lane === "reference"
    || reviewState === "fallback-system-reference"
    || sourceSnapshotString(row.source_snapshot, "lane") === "reference"
  );
}

function isArticleLibraryRow(row: AdminGeneratedContentRow) {
  return (row.mode === "article" || row.block_type === "sky_article")
    && row.lane === "serving"
    && !isRetiredAdminRow(row);
}

function isSkyWriteupLibraryRow(row: AdminGeneratedContentRow) {
  const key = row.content_key.toLowerCase();
  return !isRetiredAdminRow(row) && (
    row.block_type === "sky_placement"
    || row.block_type === "sky_article"
    || /^sky\.placement\./u.test(key)
    || /^sky[/-](?:placement|article)[/-]/u.test(key)
    || /^sky-article\//u.test(key)
    || /^authored\/sky-lunation-macro\//u.test(key)
  );
}

function reviewRecordFromGeneratedRow(row: AdminGeneratedContentRow): AdminReviewRecord {
  return {
    id: row.id,
    source: row.provider ?? (sourceSnapshotString(row.source_snapshot, "sourceType") || "generated_interpretations"),
    surface: row.surface,
    status: row.status,
    mode: row.mode,
    title: normalizeText(row.headline) || titleFromKey(row.content_key),
    subtitle: normalizeText(row.summary),
    targetDate: row.target_date,
    contentKey: row.content_key,
    eventType: row.event_type,
    summary: normalizeText(row.summary),
    body: normalizeText(row.body),
    sections: row.sections,
    blockType: row.block_type,
    facts: row.facts,
    sourceSnapshot: row.source_snapshot,
    reviewerNotes: row.reviewer_notes,
    provider: row.provider,
    model: row.model,
    promptVersion: row.prompt_version,
    updatedAt: row.updated_at,
    rawGlobalRow: row
  };
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function draftPackageRecord(draft: AdminDraft) {
  const sections = objectRecord(draft.sections);
  return objectRecord(sections?.packageRecord) ?? {};
}

function draftPackageOriginalRecord(draft: AdminDraft) {
  const sections = objectRecord(draft.sections);
  return objectRecord(sections?.packageOriginalRecord) ?? draftPackageRecord(draft);
}

function rowPackageRecord(row: AdminGeneratedContentRow | AdminReviewRecord) {
  const sections = "content_key" in row ? objectRecord(row.sections) : objectRecord(row.sections);
  return objectRecord(sections?.packageRecord) ?? {};
}

function rowIsFallbackArchitectureV3(row: AdminGeneratedContentRow | AdminReviewRecord) {
  const provider = "content_key" in row ? row.provider : row.provider;
  const sourceSnapshot = sourceSnapshotForRow(row);
  const facts = "content_key" in row ? row.facts : row.facts;
  return provider === fallbackArchitectureV3Provider
    || sourceSnapshotString(sourceSnapshot, "sourcePackage") === "tldrastro-fallback-architecture-v3"
    || objectRecord(facts)?.fallbackArchitectureV3 === true;
}

function draftIsFallbackArchitectureV3(draft: AdminDraft) {
  return draft.sourceSnapshot?.sourcePackage === "tldrastro-fallback-architecture-v3"
    || draft.facts?.fallbackArchitectureV3 === true
    || Boolean(draftPackageRecord(draft).content_role);
}

function packageReviewStatusForDraft(draft: AdminDraft) {
  return sourceSnapshotString(draft.sourceSnapshot, "review_status")
    || (typeof draft.facts?.review_status === "string" ? draft.facts.review_status : "")
    || (typeof draftPackageRecord(draft).review_status === "string" ? draftPackageRecord(draft).review_status as string : "")
    || "needs_review";
}

function packageEditorialNotesForDraft(draft: AdminDraft) {
  return typeof draftPackageRecord(draft).editorial_notes === "string" ? draftPackageRecord(draft).editorial_notes as string : "";
}

function packageFieldString(draft: AdminDraft, key: string) {
  const sections = objectRecord(draft.sections);
  const sectionValue = sections?.[key];
  const packageValue = draftPackageRecord(draft)[key];
  return typeof sectionValue === "string" ? sectionValue : typeof packageValue === "string" ? packageValue : "";
}

function setPackageSectionField(draft: AdminDraft, key: string, value: string): AdminDraft {
  return {
    ...draft,
    sections: {
      ...(draft.sections ?? {}),
      [key]: value,
      packageRecord: {
        ...draftPackageRecord(draft),
        [key]: value
      }
    }
  };
}

function setPackageRecordField(draft: AdminDraft, key: string, value: string): AdminDraft {
  return {
    ...draft,
    sections: {
      ...(draft.sections ?? {}),
      packageRecord: {
        ...draftPackageRecord(draft),
        [key]: value
      }
    }
  };
}

function normalizedSourceRole(snapshot: Record<string, unknown> | null | undefined) {
  return [
    sourceSnapshotString(snapshot, "contentRole"),
    sourceSnapshotString(snapshot, "content_role"),
    sourceSnapshotString(snapshot, "sourceRole"),
    sourceSnapshotString(snapshot, "source_role"),
    sourceSnapshotString(snapshot, "role")
  ].find(Boolean)
    ?.trim()
    .toLowerCase()
    .replace(/_/g, "-") ?? "";
}

function normalizedSourceContentType(snapshot: Record<string, unknown> | null | undefined) {
  return [
    sourceSnapshotString(snapshot, "contentType"),
    sourceSnapshotString(snapshot, "content_type"),
    sourceSnapshotString(snapshot, "type")
  ].find(Boolean)
    ?.trim()
    .toLowerCase()
    .replace(/_/g, "-") ?? "";
}

function contentRoleForRecord(row: AdminGeneratedContentRow | AdminReviewRecord): AdminContentRole {
  const contentKey = rowContentKey(row);
  const blockType = rowBlockType(row);
  const promptVersion = rowPromptVersion(row);
  const provider = "content_key" in row ? row.provider : row.provider;
  const eventType = "content_key" in row ? row.event_type : row.eventType;
  const sourceSnapshot = sourceSnapshotForRow(row);
  const sourceText = JSON.stringify(sourceSnapshot ?? {});
  const sourceContentType = normalizedSourceContentType(sourceSnapshot);
  const sourceBucket = sourceSnapshotString(sourceSnapshot, "bucket").toLowerCase();
  const sourceTargetFamily = sourceSnapshotString(sourceSnapshot, "targetContentFamily").toLowerCase();
  const sourceContentSystem = sourceSnapshotString(sourceSnapshot, "contentSystem").toLowerCase().replace(/_/g, "-");
  const sourceRole = normalizedSourceRole(sourceSnapshot);

  if (sourceContentSystem === "cms-surface-override" || contentKey.startsWith("cms/")) {
    return "authored-content";
  }

  if (
    contentKey.startsWith("fallback-hook/") ||
    blockType === "fallback_hook" ||
    promptVersion === "fallback-hook-template-v1" ||
    sourceRole === "fallback-hook" ||
    sourceContentType === "fallback-hook"
  ) {
    return "fallback-output";
  }

  if (
    sourceRole === "fallback-helper" ||
    sourceRole === "fallback-source" ||
    sourceText.includes('"core_behavior"') ||
    sourceText.includes('"house_synthesis"') ||
    sourceText.includes('"clauses"') ||
    contentKey.startsWith("vocab/") ||
    contentKey.startsWith("vocab.") ||
    contentKey.startsWith("fallback-vocab/") ||
    contentKey.startsWith("guide-phrase/") ||
    eventType === "vocab" ||
    sourceContentType === "vocab" ||
    sourceContentType === "vocabulary" ||
    sourceBucket === "vocab" ||
    sourceTargetFamily === "vocab" ||
    blockType === "vocabulary_phrase"
  ) {
    return "fallback-helper";
  }

  const contentClass = contentClassForRow(row);
  if (sourceContentSystem === "authored") return "authored-content";
  if (sourceContentSystem === "generated" || contentClass === "generated") return "generated-content";
  if (contentClass === "reference") return "source-material";
  if (contentClass === "legacy" || (provider && !/phrasebank|migration|local-normalized-dashboard-source|manual-admin/i.test(provider))) return "legacy-generated";
  if (contentClass === "phrasebank") return "authored-content";
  return "unknown";
}

function contentRoleForDraft(draft: AdminDraft): AdminContentRole {
  return contentRoleForRecord({
    id: draft.id ?? "draft",
    content_key: draft.contentKey,
    surface: draft.surface,
    mode: draft.mode,
    status: draft.status,
    event_type: draftEventType(draft),
    target_date: null,
    headline: draft.headline,
    summary: draft.summary,
    body: draft.body,
    block_type: draft.blockType,
    lane: draft.lane,
    review_state: draft.reviewState,
    prompt_version: draft.promptVersion,
    sections: draft.sections,
    facts: draft.facts,
    source_snapshot: draft.sourceSnapshot
  });
}

function contentRoleDetails(role: AdminContentRole) {
  switch (role) {
    case "authored-content":
      return {
        label: "Authored content",
        detail: "Finished reader-facing copy. When this row is published, it can serve as authored app content."
      };
    case "generated-content":
      return {
        label: "Generated content",
        detail: "AI-generated prose. A published row can serve only when the app has no higher-priority approved authored or reviewed package copy."
      };
    case "fallback-output":
      return {
        label: "Fallback hook/output",
        detail: "Fallback-system copy or a fallback hook row. It is eligible only when its fallback review status is reviewed or approved."
      };
    case "fallback-helper":
      return {
        label: "Fallback source/helper",
        detail: "Ingredient text for fallback generation. Helper clauses such as core_behavior and house_synthesis must not be promoted as authored write-ups by themselves."
      };
    case "source-material":
      return {
        label: "Source material",
        detail: "Reference material for editors and resolvers. It should not render directly in the reader."
      };
    case "legacy-generated":
      return {
        label: "Legacy generated",
        detail: "Older generated copy. Review carefully before promoting it to authored content."
      };
    default:
      return {
        label: "Unclassified",
        detail: "The dashboard cannot confidently classify this row yet."
      };
  }
}

function sourceLaneFragmentsForAdmin(value: string | undefined | null) {
  return normalizeText(value)
    .split(/;\s*|(?<=[.!?])\s+/u)
    .map((part) => part.replace(/[“”"]/gu, "").replace(/[.!?]$/u, "").trim())
    .filter((part) => {
      if (!part) return false;
      const wordCount = part.split(/\s+/u).filter(Boolean).length;
      return wordCount >= 2 && wordCount <= 28;
    });
}

function hasEnoughSourceForFallbackAdmin(value: string | undefined | null) {
  const fragments = sourceLaneFragmentsForAdmin(value);
  if (fragments.length >= 2) return true;
  const wordCount = fragments[0]?.split(/\s+/u).filter(Boolean).length ?? 0;
  return wordCount >= 6;
}

function rowNeedsSourceMaterial(row: AdminGeneratedContentRow | AdminReviewRecord | AdminUserGeneratedContentRow) {
  if (!("source_snapshot" in row || "sourceSnapshot" in row)) return false;
  const role = contentRoleForRecord(row);
  if (role !== "fallback-helper" && role !== "source-material") return false;

  const body = rowBody(row);
  const summary = normalizeText(row.summary);
  const headline = "content_key" in row ? normalizeText(row.headline) : rowTitle(row);
  const sourceSnapshot = sourceSnapshotForRow(row);
  const sourceText = sourceSnapshotText(sourceSnapshot);
  const candidate = [body, summary, sourceText, headline].filter(Boolean).join("; ");
  return !hasEnoughSourceForFallbackAdmin(candidate);
}

function sourceSnapshotText(snapshot: Record<string, unknown> | null | undefined) {
  try {
    return JSON.stringify(snapshot ?? {});
  } catch {
    return "";
  }
}

function draftTouchesNatalPlacementFallback(draft: AdminDraft) {
  const sourceText = sourceSnapshotText(draft.sourceSnapshot).toLowerCase();
  const identity = [
    draft.contentKey,
    draft.headline,
    draft.surface,
    draft.mode,
    draft.blockType,
    draft.promptVersion,
    sourceText
  ].join(" ").toLowerCase().replace(/[-_/.:]+/g, " ");

  return (
    identity.includes("natal placement") ||
    identity.includes("natal placements") ||
    (identity.includes("placement") && identity.includes("body sign story")) ||
    (identity.includes("placement") && identity.includes("house development")) ||
    identity.includes("core behavior") ||
    identity.includes("house synthesis") ||
    /^sky\.placement\./i.test(draft.contentKey) ||
    /^sky[./-](?:placement|article)[./-]/i.test(draft.contentKey)
  );
}

function fallbackCompositionDiagnosticForDraft(draft: AdminDraft, role: AdminContentRole): AdminFallbackCompositionDiagnostic | null {
  if (draftTouchesNatalPlacementFallback(draft)) {
    return {
      title: "Placement fallback check",
      status: "Source-material gated",
      body: "Natal placement fallback composes source lanes into reader prose. Empty or tiny helper lanes are flagged as Needs source material instead of being stretched into final copy.",
      template: "natal.placement",
      slots: ["primary.body_sign_story", "primary.house_development", "modifiers"],
      sourceLanes: ["core_behavior -> body_sign_story", "house_development / house_synthesis -> house section"],
      action: "Add or improve the source phrase lanes when fallback is too thin. Use an authored article row when you want exact final prose."
    };
  }

  if (role === "fallback-helper") {
    return {
      title: "Fallback ingredient check",
      status: "Source ingredient",
      body: "This row is source material for the fallback system. It can be searched, reviewed, and improved here, but it should not be treated as final authored reader copy.",
      template: "Fallback resolver",
      slots: ["Reusable phrase/source lane"],
      sourceLanes: ["Reviewed helper text"],
      action: "Keep the wording simple and composable. Use an authored article row when you want final prose to display exactly as written."
    };
  }

  if (role === "fallback-output") {
    return {
      title: "Fallback hook check",
      status: "Fallback-system row",
      body: "This row belongs to the fallback system. It may provide hook prose or resolver output, but it is not an authored dashboard article.",
      template: "Fallback resolver",
      slots: ["Template", "Source phrases", "Runtime facts"],
      sourceLanes: ["Fallback hooks", "Vocabulary/source rows"],
      action: "Edit the hook or its source phrases here. Set fallback review status to reviewed or approved when it is ready to be used."
    };
  }

  return null;
}

function articlePointForRow(row: AdminGeneratedContentRow): AdminArticlePointFilter {
  const normalizedKey = row.content_key.toLowerCase();
  const keyMatch = normalizedKey.match(/^sky[./-](?:placement|article)[./-]([a-z-]+)/)
    ?? normalizedKey.match(/^sky[./-]([a-z-]+)[./-][a-z-]+(?:[./-]rx)?$/);
  const headlineMatch = normalizeText(row.headline).toLowerCase().match(/^(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\b/);
  const candidate = keyMatch?.[1]?.replace(/-/g, " ") || headlineMatch?.[1] || "";
  const point = candidate.split(/\s+/)[0];

  return articlePointFilters.some((filter) => filter.key === point) && point !== "all"
    ? point as AdminArticlePointFilter
    : "other";
}

function rowSearchText(row: AdminGeneratedContentRow) {
  return [
    row.content_key,
    row.headline,
    row.summary,
    row.body,
    row.surface,
    row.mode,
    row.block_type,
    row.event_type,
    row.prompt_version,
    row.provider,
    JSON.stringify(row.facts ?? {}),
    JSON.stringify(row.source_snapshot ?? {})
  ].join(" ").toLowerCase();
}

function visibleRowSearchText(row: AdminGeneratedContentRow) {
  return [
    row.content_key,
    row.headline,
    row.surface,
    row.mode,
    row.block_type,
    row.event_type,
    row.prompt_version,
    row.provider
  ].join(" ").toLowerCase();
}

function fallbackHookVisibleSearchText(row: AdminGeneratedContentRow) {
  return [
    row.content_key,
    row.headline,
    row.surface,
    row.mode,
    row.block_type,
    row.event_type,
    fallbackSectionForKey(row.content_key, row.surface)
  ].join(" ").toLowerCase();
}

function matchesAdminSearch(haystack: string, search: string) {
  const normalizeSearchText = (value: string) => value.toLowerCase().replace(/[-_/.:,"{}[\]]+/g, " ");
  const tokens = search
    .trim()
    .toLowerCase()
    .replace(/[-_/.:,"{}[\]]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const normalizedHaystack = normalizeSearchText(haystack);
  return tokens.every((token) => normalizedHaystack.includes(token));
}

function isCompatibilityRow(row: AdminGeneratedContentRow) {
  const identity = [
    row.content_key,
    row.event_type,
    row.block_type,
    row.prompt_version,
    row.headline
  ].join(" ").toLowerCase().replace(/[-_/.:]+/g, " ");
  return row.content_key.startsWith("compatibility.")
    || row.event_type === "friends.compatibility.planet-card"
    || row.block_type === "compatibility_planet_card"
    || /\bcompatibility\b/.test(identity)
    || /^fallback-hook\/(?:friends|relationship|synastry)[./-]/.test(row.content_key)
    || row.content_key.startsWith("vocab/relationship/")
    || row.content_key.startsWith("slot-template/compatibility/");
}

function compatibilitySectionForRow(row: AdminGeneratedContentRow): AdminCompatibilitySectionFilter {
  const contentClass = contentClassForRow(row);
  if (contentClass === "fallback-hook") return "fallback-hooks";
  if (contentClass === "vocab") return "vocabulary";
  if (row.content_key.startsWith("slot-template/") || row.block_type === "template") return "slots";
  return "content";
}

function compatibilityPlanetForRow(row: AdminGeneratedContentRow): AdminArticlePointFilter {
  const sourceSnapshot = row.source_snapshot ?? {};
  const facts = row.facts ?? {};
  const explicitPlanet = typeof sourceSnapshot.planet === "string" ? sourceSnapshot.planet : typeof facts.planet === "string" ? facts.planet : "";
  const normalized = `${explicitPlanet} ${rowSearchText(row)}`.toLowerCase().replace(/[-_/.:]+/g, " ");
  const planet = articlePointFilters.find((filter) => filter.key !== "all" && filter.key !== "other" && new RegExp(`\\b${filter.key}\\b`).test(normalized));
  return planet?.key ?? "other";
}

function compatibilitySortValue(row: AdminGeneratedContentRow, sort: AdminCompatibilitySort) {
  if (sort === "title-asc") return rowTitle(row).toLowerCase();
  if (sort === "status") return `${row.status}-${rowTitle(row).toLowerCase()}`;
  if (sort === "source") return `${contentClassForRow(row)}-${rowTitle(row).toLowerCase()}`;
  return row.updated_at ?? row.created_at ?? "";
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

function ordinalLabel(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

const skyArticleSigns = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
] as const;

function skyArticleTemplatePlanet(row: Pick<AdminGeneratedContentRow, "content_key" | "headline">) {
  const keyPlanet = row.content_key.match(/^sky\/article-template\/([a-z-]+)\/(?:ingress|structure)$/u)?.[1]
    ?? row.content_key.match(/^sky-article-template\/([a-z-]+)\/(?:ingress|structure)$/u)?.[1];
  if (keyPlanet && keyPlanet !== "slow-mover") return keyPlanet;
  const headlinePlanet = normalizeText(row.headline).match(/(?:article\s+—\s+)?([A-Za-z-]+)\s+(?:Enters|in)\b/u)?.[1];
  return headlinePlanet ? headlinePlanet.toLowerCase() : null;
}

function isSkyArticleTemplateRow(row: AdminGeneratedContentRow | null | undefined) {
  return Boolean(row && (
    /^sky\/article-template\//u.test(row.content_key)
    || /^sky-article-template\//u.test(row.content_key)
    || row.event_type === "sky-article-template"
  ) && skyArticleTemplatePlanet(row));
}

function compiledSkyArticleEditionForDraft(draft: AdminDraft) {
  return skyArticleEditionRecord(draft.sections?.skyArticleEdition);
}

function skyArticleRevisionBaseForDraft(draft: AdminDraft) {
  return skyArticleEditionRecord(draft.sections?.skyArticleRevisionBase)
    ?? compiledSkyArticleEditionForDraft(draft);
}

function skyArticleWorkspaceContentKey(facts: Pick<SkyArticleEditionFacts, "planet" | "sign" | "entryYear">) {
  return `sky-article-workspace/${facts.planet}/${facts.sign}/${facts.entryYear}`;
}

function skyArticleWorkspaceForm(row: AdminGeneratedContentRow | undefined) {
  const sections = objectRecord(row?.sections);
  const workspace = objectRecord(sections?.skyArticleWorkspace);
  if (!row || row.event_type !== "sky-article-edition-workspace" || !workspace) return null;
  const tldr = typeof workspace.tldr === "string" ? workspace.tldr : "";
  const slotValues = objectRecord(workspace.slotValues);
  return {
    row,
    tldr,
    slotValues: Object.fromEntries(Object.entries(slotValues ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
  };
}

function isApprovedSkyRelationRow(row: AdminGeneratedContentRow) {
  const reviewStatus = sourceSnapshotString(row.source_snapshot, "review_status");
  return row.status === "LIVE"
    && (row.lane ?? "serving") === "serving"
    && !row.review_state
    && (!reviewStatus || ["approved", "approved_reuse", "reviewed"].includes(reviewStatus));
}

function risingSignForTransitHouse(sign: string, house: number) {
  const signIndex = skyArticleSigns.indexOf(sign as typeof skyArticleSigns[number]);
  if (signIndex < 0 || house < 1 || house > 12) return null;
  return skyArticleSigns[(signIndex - (house - 1) + 12) % 12];
}

function skyArticleAspectPassage(row: AdminGeneratedContentRow, planet: string): SkyArticleAspectPassage | null {
  const match = row.content_key.toLowerCase().match(new RegExp(`^authored/transit-aspect/${planet}/([^/]+)/([^/]+)$`, "u"));
  if (!match || !row.body?.trim()) return null;
  return {
    contentKey: row.content_key,
    natalPoint: match[1],
    aspect: match[2],
    body: row.body.trim()
  };
}

type AdminHookCatalogLoadState = "idle" | "loading" | "loaded" | "error";
type AdminHookCatalogIndexPayload = {
  schemaVersion: 1;
  packageVersion: string;
  rows: Array<{ key: string; surface: GeneratedContentSurface }>;
};
type AdminHookCatalogBodyPayload = {
  schemaVersion: 1;
  rows: Array<{ key: string; body: string }>;
};
type AdminSourceDraft = {
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
const adminHookCatalogRoot = `${import.meta.env.BASE_URL}generated`;

async function adminHookCatalogJson<T>(fileName: string): Promise<T> {
  const response = await fetch(`${adminHookCatalogRoot}/${fileName}`, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Hook catalog package ${fileName} failed with HTTP ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

async function loadAdminHookCatalogIndex(): Promise<{ definitions: FallbackHookDefinition[]; packageVersion: string }> {
  const payload = await adminHookCatalogJson<AdminHookCatalogIndexPayload>("admin-hook-catalog-index-v1.json");
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.rows)) {
    throw new Error("Hook catalog index failed validation.");
  }

  if (typeof payload.packageVersion !== "string" || !payload.packageVersion) {
    throw new Error("Hook catalog index is missing its package version.");
  }

  const definitions = payload.rows.map(({ key, surface }) => {
    const label = titleFromKey(key);
    return {
      key,
      label,
      surface,
      mode: "feed",
      copy: { headline: label, summary: "", body: "" }
    };
  });
  return { definitions, packageVersion: payload.packageVersion };
}

async function loadAdminHookCatalogBodies(surface: GeneratedContentSurface): Promise<Map<string, string>> {
  const domain = surface === "modifier" ? "modifier" : surface;
  const payload = await adminHookCatalogJson<AdminHookCatalogBodyPayload>(`admin-hook-catalog-${domain}-v1.json`);
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.rows)) {
    throw new Error(`Hook catalog ${domain} package failed validation.`);
  }

  return new Map(payload.rows.map(({ key, body }) => [key, body]));
}

async function loadAdminSourceDraftCatalog(secret: string): Promise<AdminSourceDraft[]> {
  const payload = await adminJsonRequest<{ ok: boolean; rows: AdminSourceDraft[] }>("/api/admin/generated-content?sourceDrafts=sky-aspects", secret);
  if (!Array.isArray(payload.rows)) {
    throw new Error("Source draft catalog failed validation.");
  }
  return payload.rows;
}

function rowTitle(row: AdminGeneratedContentRow | AdminReviewRecord | AdminUserGeneratedContentRow) {
  if ("content_key" in row) {
    const structuredIdentity = skyFallbackIdentity(row.content_key);
    if (structuredIdentity) return structuredIdentity.title;
    return normalizeText(row.headline) || titleFromKey(row.content_key);
  }
  const structuredIdentity = skyFallbackIdentity(row.contentKey);
  if (structuredIdentity) return structuredIdentity.title;
  return normalizeText(row.title) || normalizeText(row.summary) || titleFromKey(row.contentKey);
}

function rowBody(row: AdminGeneratedContentRow | AdminReviewRecord | AdminUserGeneratedContentRow) {
  return "content_key" in row ? normalizeText(row.body) : normalizeText(row.body);
}

function rowTypeLabel(row: AdminGeneratedContentRow) {
  const structuredIdentity = skyFallbackIdentity(row.content_key);
  if (structuredIdentity) return structuredIdentity.typeLabel;
  if (row.content_key.startsWith("authored/career-natal-aspect/")) return "Natal aspect passage";
  if (row.content_key.startsWith("authored/career-transit-house/")) return "Transit house passage";
  if (row.content_key.startsWith("authored/career-placement/")) return "Natal placement passage";
  if (row.content_key.startsWith("authored/career-transit/")) return "Personal transit passage";
  return contentClassLabel(contentClassForRow(row));
}

function contentClassForRow(row: AdminGeneratedContentRow | AdminReviewRecord): AdminContentClass {
  const contentKey = "content_key" in row ? row.content_key : row.contentKey;
  const blockType = "content_key" in row ? row.block_type : row.blockType;
  const promptVersion = "content_key" in row ? row.prompt_version : row.promptVersion;
  const provider = "content_key" in row ? row.provider : row.provider;
  const sourceSnapshot = "content_key" in row ? row.source_snapshot : row.sourceSnapshot;
  const flags = Array.isArray(sourceSnapshot?.flags) ? sourceSnapshot.flags.join(" ") : JSON.stringify(sourceSnapshot ?? {});
  const sourceContentType = normalizedSourceContentType(sourceSnapshot);
  const sourceBucket = sourceSnapshotString(sourceSnapshot, "bucket").toLowerCase();
  const sourceTargetFamily = sourceSnapshotString(sourceSnapshot, "targetContentFamily").toLowerCase();
  const sourceRole = normalizedSourceRole(sourceSnapshot);
  const eventType = "content_key" in row ? row.event_type : row.eventType;

  if (rowIsFallbackArchitectureV3(row)) {
    const packageRole = sourceRole || String(rowPackageRecord(row).content_role ?? "").toLowerCase().replace(/_/g, "-");
    if (packageRole === "fallback-hook" || packageRole === "template") return "fallback-hook";
    if (packageRole === "vocabulary") return "vocab";
    if (packageRole === "fallback-source" || packageRole === "source-material") return "reference";
    if (packageRole === "full-copy") return "phrasebank";
  }

  if (
    contentKey.startsWith("fallback-hook/") ||
    blockType === "fallback_template" ||
    blockType === "fallback_hook" ||
    promptVersion === "fallback-hook-template-v1" ||
    sourceRole === "fallback-hook" ||
    sourceContentType === "fallback-hook"
  ) return "fallback-hook";
  if (
    contentKey.startsWith("vocab/") ||
    contentKey.startsWith("vocab.") ||
    contentKey.startsWith("fallback-vocab/") ||
    contentKey.startsWith("guide-phrase/") ||
    eventType === "vocab" ||
    sourceContentType === "vocab" ||
    sourceContentType === "vocabulary" ||
    sourceBucket === "vocab" ||
    sourceTargetFamily === "vocab" ||
    blockType === "vocabulary_phrase" ||
    promptVersion === "vocab-v1" ||
    promptVersion === "tagline-v1"
  ) return "vocab";
  if (
    sourceRole === "fallback-source" ||
    sourceRole === "source-material" ||
    sourceContentType === "source-material" ||
    sourceBucket === "source-material" ||
    eventType === "fallback-source"
  ) return "reference";
  if (
    sourceContentType === "sky-aspect-card" ||
    sourceContentType === "sky-placement-card" ||
    sourceContentType === "sky-placement-topper" ||
    sourceSnapshotString(sourceSnapshot, "contentSystem").toLowerCase() === "generated" ||
    /^sky-(?:aspect-card|placement-(?:card|topper))-v\d+$/i.test(promptVersion ?? "") ||
    /^(?:collective-aspect-card|collective-placement-card|collective-placement-topper)$/i.test(eventType ?? "")
  ) return "generated";
  if (contentKey.startsWith("compatibility.") || eventType === "friends.compatibility.planet-card") return "phrasebank";
  if (/REFERENCE_ONLY_NEVER_SERVE_VERBATIM|PARAPHRASE_PENDING|BLOCKLIST_MATCH/i.test(flags)) return "reference";
  if (provider && !/phrasebank|migration|local-normalized-dashboard-source|manual-admin/i.test(provider)) return "legacy";
  if (/^(natal|composite|transit|sky|synastry|relationship|you)[./-]/i.test(contentKey)) return "phrasebank";
  if (contentKey.includes("aspect") || contentKey.includes("placement") || contentKey.includes("synastry")) return "phrasebank";
  return "other";
}

function contentClassLabel(value: AdminContentClass) {
  return contentClassFilters.find((filter) => filter.key === value)?.label ?? "Other";
}

function draftEventType(draft: AdminDraft) {
  if (draft.blockType === "fallback_hook" || draft.contentKey.startsWith("fallback-hook/")) return "fallback-hook";
  if (draft.blockType === "fallback_template") return "fallback-template";
  if (draft.blockType === "vocabulary_phrase" || draft.contentKey.startsWith("vocab/") || draft.contentKey.startsWith("fallback-vocab/") || draft.contentKey.startsWith("guide-phrase/")) return "vocab";
  if (draft.blockType === "template" || draft.contentKey.startsWith("slot-template/")) return "slot-template";
  if (draft.blockType === "sky_article" || draft.mode === "article") return "sky_article";
  if (draft.blockType === "sky_aspect") return "collective-aspect-card";
  if (draft.blockType === "sky_placement") return "collective-placement-card";
  return draft.blockType || "manual-content";
}

function fallbackHookReviewStatusForDraft(draft: AdminDraft, status: GeneratedContentStatus = draft.status) {
  if (status === "LIVE") return "approved";
  if (status === "REVIEWED") return "reviewed";
  if (status === "ARCHIVED") return "deprecated";

  const explicitReviewStatus = sourceSnapshotString(draft.sourceSnapshot, "review_status")
    || sourceSnapshotString(draft.sourceSnapshot, "reviewStatus");

  if (explicitReviewStatus) {
    return explicitReviewStatus;
  }

  return "needs_review";
}

function fallbackHookSourceSnapshot(draft: AdminDraft, status: GeneratedContentStatus = draft.status) {
  const hook = draft.contentKey.replace(/^fallback-hook\//, "");

  return {
    ...(draft.sourceSnapshot ?? {}),
    contentType: "fallback-system",
    content_role: "fallback_hook",
    review_status: fallbackHookReviewStatusForDraft(draft, status),
    hook,
    authoringSource: "admin-dashboard",
    contentSystem: "fallback",
    contentLevel: "madlib-fallback"
  };
}

function fallbackTemplateSourceSnapshot(draft: AdminDraft) {
  return {
    ...(draft.sourceSnapshot ?? {}),
    contentType: "fallback-system",
    content_role: "template",
    authoringSource: "admin-dashboard",
    contentSystem: "fallback",
    contentLevel: "madlib-fallback"
  };
}

function draftSourceSnapshot(draft: AdminDraft) {
  if (draftIsFallbackArchitectureV3(draft)) {
    return draft.sourceSnapshot ?? {};
  }

  if (draft.blockType === "fallback_hook" || draft.contentKey.startsWith("fallback-hook/")) {
    return fallbackHookSourceSnapshot(draft);
  }

  if (draft.blockType === "fallback_template") {
    return fallbackTemplateSourceSnapshot(draft);
  }

  if (draft.sourceSnapshot?.contentSystem === "cms-surface-override" || draft.contentKey.startsWith("cms/")) {
    return {
      ...(draft.sourceSnapshot ?? {}),
      contentType: "mustache-template",
      authoringSource: "admin-dashboard",
      contentSystem: "cms-surface-override",
      contentLevel: "owner-authored"
    };
  }

  return {
    ...(draft.sourceSnapshot ?? {}),
    contentType: draftEventType(draft),
    authoringSource: "admin-dashboard",
    contentSystem: contentSystemForRole(contentRoleForDraft(draft)),
    contentLevel: contentLevelForRole(contentRoleForDraft(draft))
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

  if (contentKey.startsWith("fallback-hook/") || blockType === "fallback_hook") return "Fallback Hooks";
  if (blockType === "fallback_template" || contentKey.startsWith("slot-template/")) return "Fallback Templates";
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

  if (rowNeedsSourceMaterial(row)) return { key: "needs-source-material", label: "Needs source material", detail: "Fallback/source lane is empty or too thin to compose reader prose." };
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

function surfaceAreaForFallbackSection(section: AdminFallbackHookSectionFilter): WritingSurfaceAreaFilter {
  if (section === "lunar-calendar") return "calendar";
  return section;
}

function areaForWritingSurface(item: WritingSurfaceMapItem): WritingSurfaceAreaFilter {
  if (item.area === "Friends") return "friends";
  if (item.area === "Natal" || item.area === "Transits") return "you";
  if (item.area === "System") return "settings";
  if (item.surface.includes("Calendar")) return "calendar";
  return "sky";
}

function statusForWritingSurface(item: WritingSurfaceMapItem, accessById: Record<string, WritingSurfaceAdminAccess>): WritingSurfaceStatusFilter {
  const access = accessById[item.id];
  if (!access) return "missing";
  return access.editability === "editable" ? "complete" : "partial";
}

function canonicalFallbackContentKey(key: string) {
  return key.startsWith("fallback-hook/") ? key : `fallback-hook/${key}`;
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

function isCompositeRelationshipRow(row: AdminGeneratedContentRow | AdminReviewRecord) {
  return row.surface === "composite" || rowContentKey(row).includes("composite") || rowBlockType(row) === "composite_aspect";
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

    return `${error.path} failed with HTTP ${error.status}${error.details ? `: ${error.details}` : "."}`;
  }

  return error instanceof Error ? error.message : "Could not load admin content.";
}

async function adminJsonRequest<T>(path: string, secret: string, options: RequestInit = {}) {
  const method = options.method ?? "GET";
  const normalizedSecret = normalizeAdminSecret(secret);
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...adminCredentialHeaders(normalizedSecret),
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

async function loadAllGeneratedContentRows(secret: string, visibility: "editorial" | "all" = "editorial") {
  const pageSize = 1000;
  const allRows: AdminGeneratedContentRow[] = [];

  for (let offset = 0; offset < 50000; offset += pageSize) {
    const result = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?status=all&visibility=${visibility}&limit=${pageSize}&offset=${offset}`,
      secret
    );
    const pageRows = assertRowsPayload(result, "/api/admin/generated-content");

    allRows.push(...pageRows);
    if (pageRows.length < pageSize) {
      break;
    }
  }

  return dedupeGeneratedContentRows(allRows);
}

function dedupeGeneratedContentRows(rows: AdminGeneratedContentRow[]) {
  const byId = new Map<string, AdminGeneratedContentRow>();
  rows.forEach((row) => {
    const key = row.id || row.content_key;
    if (!byId.has(key)) {
      byId.set(key, row);
    }
  });
  return [...byId.values()];
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
    sections: objectRecord(row.sections),
    facts: row.facts ?? null,
    reviewerNotes: row.reviewer_notes ?? "",
    sourceSnapshot: row.source_snapshot ?? null
  };
}

function emptyDraftForHook(item: HookCatalogItem): AdminDraft {
  const fallbackCopy = item.definition.copy;
  const hook = item.key;
  return {
    id: null,
    contentKey: canonicalFallbackContentKey(hook),
    surface: item.definition.surface,
    mode: item.definition.mode,
    status: "DRAFT",
    headline: fallbackCopy?.headline ?? item.label,
    summary: fallbackCopy?.summary ?? "",
    body: fallbackCopy?.body ?? "",
    lane: "reference",
    reviewState: "EDITORIAL_REVIEW_REQUIRED",
    blockType: "fallback_hook",
    promptVersion: "fallback-hook-template-v1",
    sections: null,
    facts: null,
    reviewerNotes: "",
    sourceSnapshot: {
      contentType: "fallback-system",
      content_role: "fallback_hook",
      review_status: "needs_review",
      hook,
      contentSystem: "fallback",
      contentLevel: "madlib-fallback",
      authoringSource: "admin-dashboard"
    }
  };
}

function useSavedSecret() {
  const [secret, setSecret] = useState(() => {
    const localSecret = normalizeAdminSecret(getLocalContentGenerationSecret());

    try {
      return normalizeAdminSecret(window.localStorage.getItem(adminSecretStorageKey) ?? localSecret);
    } catch {
      return localSecret;
    }
  });

  function saveSecret(nextSecret: string) {
    const normalizedSecret = normalizeAdminSecret(nextSecret);
    setSecret(normalizedSecret);
    try {
      if (normalizedSecret) {
        window.localStorage.setItem(adminSecretStorageKey, normalizedSecret);
      } else {
        window.localStorage.removeItem(adminSecretStorageKey);
      }
    } catch {
      // Keep the in-memory field usable.
    }
  }

  function setTransientCredential(nextCredential: string) {
    setSecret(normalizeAdminSecret(nextCredential));
  }

  return [secret, saveSecret, setTransientCredential] as const;
}

export function GeneratedContentAdminDashboard() {
  const [secret, setSecret, setTransientCredential] = useSavedSecret();
  const [secretInput, setSecretInput] = useState(secret);
  const [activePage, setActivePage] = useState<AdminDashboardPage>(() => parseAdminHash().page);
  const [rows, setRows] = useState<AdminGeneratedContentRow[]>([]);
  const [allRowsLoaded, setAllRowsLoaded] = useState(false);
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
  const [contentLibraryView, setContentLibraryView] = useState<ContentLibraryView>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<GeneratedContentStatus | "all">("all");
  const [skyVoiceQueueView, setSkyVoiceQueueView] = useState<SkyVoiceQueueView>("all");
  const [skyReviewHorizon, setSkyReviewHorizon] = useState<SkyReviewHorizon | null>(null);
  const [skyReviewHorizonError, setSkyReviewHorizonError] = useState<string | null>(null);
  const [contentClassFilter, setContentClassFilter] = useState<AdminContentClassFilter>("all");
  const [tierFilter, setTierFilter] = useState<AdminPhrasebankTierFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<AdminContentCategoryFilter>("all");
  const [showReferenceRows, setShowReferenceRows] = useState(false);
  const [showRetiredRows, setShowRetiredRows] = useState(false);
  const [query, setQuery] = useState("");
  const [fallbackSectionFilter, setFallbackSectionFilter] = useState<AdminFallbackHookSectionFilter>("all");
  const [surfaceAreaFilter, setSurfaceAreaFilter] = useState<WritingSurfaceAreaFilter>("all");
  const [surfaceStatusFilter, setSurfaceStatusFilter] = useState<WritingSurfaceStatusFilter>("all");
  const [vocabularyCategory, setVocabularyCategory] = useState<AdminVocabularyCategoryFilter>("planets");
  const [articleStatusFilter, setArticleStatusFilter] = useState<GeneratedContentStatus | "all">("LIVE");
  const [articlePointFilter, setArticlePointFilter] = useState<AdminArticlePointFilter>("all");
  const [articleContentSystemFilter, setArticleContentSystemFilter] = useState<AdminContentSystemFilter>("all");
  const [articleQuery, setArticleQuery] = useState("");
  const [compatibilitySectionFilter, setCompatibilitySectionFilter] = useState<AdminCompatibilitySectionFilter>("all");
  const [compatibilityStatusFilter, setCompatibilityStatusFilter] = useState<GeneratedContentStatus | "all">("all");
  const [compatibilityPlanetFilter, setCompatibilityPlanetFilter] = useState<AdminArticlePointFilter>("all");
  const [compatibilitySort, setCompatibilitySort] = useState<AdminCompatibilitySort>("updated-desc");
  const [compatibilityQuery, setCompatibilityQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkStatus, setBulkStatus] = useState<GeneratedContentStatus>("REVIEWED");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [skyWriteupParentId, setSkyWriteupParentId] = useState<string | null>(null);
  const [skyRelatedAspectQuery, setSkyRelatedAspectQuery] = useState("");
  const [skyFallbackPreviewFacts, setSkyFallbackPreviewFacts] = useState<Record<string, string>>({});
  const [skyFallbackVariableTarget, setSkyFallbackVariableTarget] = useState("");
  const [skyArticleEditionForm, setSkyArticleEditionForm] = useState<SkyArticleEditionForm | null>(null);
  const [skyArticleEditor, setSkyArticleEditor] = useState<SkyArticleEditorState | null>(null);
  const [draft, setDraft] = useState<AdminDraft | null>(null);
  const [fallbackHookDefinitions, setFallbackHookDefinitions] = useState<FallbackHookDefinition[]>([]);
  const [hookCatalogPackageVersion, setHookCatalogPackageVersion] = useState("loading");
  const [hookCatalogLoadState, setHookCatalogLoadState] = useState<AdminHookCatalogLoadState>("idle");
  const [hookCatalogError, setHookCatalogError] = useState<string | null>(null);
  const [sourceDrafts, setSourceDrafts] = useState<AdminSourceDraft[]>([]);
  const [sourceDraftLoadState, setSourceDraftLoadState] = useState<AdminHookCatalogLoadState>("idle");
  const [sourceDraftError, setSourceDraftError] = useState<string | null>(null);
  const [writingSurfaces, setWritingSurfaces] = useState<WritingSurfaceMapItem[]>([]);
  const [writingSurfaceAccess, setWritingSurfaceAccess] = useState<Record<string, WritingSurfaceAdminAccess>>({});
  const [writingSurfaceRoleLabels, setWritingSurfaceRoleLabels] = useState<Partial<Record<WritingSurfaceSource["role"], string>>>({});
  const handledHashRef = useRef("");
  const editorRef = useRef<HTMLElement | null>(null);
  const hookCatalogRequestRef = useRef<Promise<{ definitions: FallbackHookDefinition[]; packageVersion: string }> | null>(null);
  const hookBodyPackagesRef = useRef(new Map<GeneratedContentSurface, Map<string, string>>());
  const hookBodyRequestsRef = useRef(new Map<GeneratedContentSurface, Promise<Map<string, string>>>());
  const skyArticleAutosaveSequenceRef = useRef(0);
  const skyArticleWorkspaceAutosaveSequenceRef = useRef(0);

  const visibleRows = useMemo(() => rows.filter((row) => (
    (showReferenceRows
      || (showRetiredRows && isRetiredAdminRow(row))
      || isCompositionPage(activePage)
      || (activePage === "skyWriteups" && isSkyWriteupLibraryRow(row))
      || !isPassiveReferenceAdminRow(row))
    && (showRetiredRows || !isRetiredAdminRow(row))
  )), [rows, activePage, showReferenceRows, showRetiredRows]);
  const savedFallbackRows = useMemo(
    () => visibleRows.filter((row) => contentClassForRow(row) === "fallback-hook"),
    [visibleRows]
  );
  const savedContentKeys = useMemo(() => new Set(visibleRows.map((row) => row.content_key)), [visibleRows]);
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
    () => visibleRows.filter(isArticleLibraryRow),
    [visibleRows]
  );
  const skyWriteupRows = useMemo(
    () => visibleRows.filter(isSkyWriteupLibraryRow).sort((left, right) => {
      const leftIsLunation = Boolean(skyLunationContextForRow(left));
      const rightIsLunation = Boolean(skyLunationContextForRow(right));
      return Number(leftIsLunation) - Number(rightIsLunation)
        || rowTitle(left).localeCompare(rowTitle(right));
    }),
    [visibleRows]
  );
  const filteredArticleRows = useMemo(() => articleRows.filter((row) => {
    return (articleStatusFilter === "all" || row.status === articleStatusFilter)
      && (articlePointFilter === "all" || articlePointForRow(row) === articlePointFilter)
      && (articleContentSystemFilter === "all" || contentSystemForRole(contentRoleForRecord(row)) === articleContentSystemFilter)
      && matchesAdminSearch(visibleRowSearchText(row), articleQuery);
  }), [articleRows, articleStatusFilter, articlePointFilter, articleContentSystemFilter, articleQuery]);
  const compatibilityRows = useMemo(
    () => visibleRows.filter(isCompatibilityRow),
    [visibleRows]
  );
  const compatibilityCounts = useMemo(() => {
    const counts: Record<AdminCompatibilitySectionFilter, number> = {
      all: compatibilityRows.length,
      content: 0,
      "fallback-hooks": 0,
      vocabulary: 0,
      slots: 0
    };
    compatibilityRows.forEach((row) => {
      counts[compatibilitySectionForRow(row)] += 1;
    });
    return counts;
  }, [compatibilityRows]);
  const filteredCompatibilityRows = useMemo(() => {
    const compatibilitySearch = compatibilityQuery.trim().toLowerCase();
    return compatibilityRows
      .filter((row) => (
        (compatibilitySectionFilter === "all" || compatibilitySectionForRow(row) === compatibilitySectionFilter)
        && (compatibilityStatusFilter === "all" || row.status === compatibilityStatusFilter)
        && (compatibilityPlanetFilter === "all" || compatibilityPlanetForRow(row) === compatibilityPlanetFilter)
        && matchesAdminSearch(visibleRowSearchText(row), compatibilitySearch)
      ))
      .sort((a, b) => {
        if (compatibilitySort === "updated-desc") {
          return compatibilitySortValue(b, compatibilitySort).localeCompare(compatibilitySortValue(a, compatibilitySort));
        }
        return compatibilitySortValue(a, compatibilitySort).localeCompare(compatibilitySortValue(b, compatibilitySort));
      });
  }, [compatibilityRows, compatibilitySectionFilter, compatibilityStatusFilter, compatibilityPlanetFilter, compatibilitySort, compatibilityQuery]);
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
    }))
  ], [fallbackHookDefinitions]);
  const savedHookKeys = useMemo(
    () => new Set(savedFallbackRows.map((row) => hookKeyFromSavedRow(row)).concat(savedFallbackRows.map((row) => row.content_key))),
    [savedFallbackRows]
  );
  const savedHookCatalogCount = useMemo(
    () => hookCatalogItems.filter((item) => savedHookKeys.has(item.key) || savedHookKeys.has(canonicalFallbackContentKey(item.key))).length,
    [hookCatalogItems, savedHookKeys]
  );
  const selectedRow = visibleRows.find((row) => row.id === selectedRowId) ?? null;
  const reviewQueueRows = useMemo(() => {
    const rowsByKey = new Map<string, AdminReviewRecord>();

    visibleRows
      .filter(generatedRowNeedsReviewQueue)
      .forEach((row) => rowsByKey.set(row.content_key, reviewRecordFromGeneratedRow(row)));
    reviewRows.forEach((row) => rowsByKey.set(row.contentKey || row.id, row));

    return [...rowsByKey.values()];
  }, [reviewRows, visibleRows]);
  const statusCounts = useMemo(() => {
    const counts: Record<GeneratedContentStatus | "all", number> = { all: visibleRows.length, DRAFT: 0, REVIEWED: 0, LIVE: 0, ARCHIVED: 0, ERROR: 0 };
    visibleRows.forEach((row) => counts[row.status] += 1);
    return counts;
  }, [visibleRows]);
  const readerCounts = useMemo(() => {
    const counts: Record<AdminReaderReadinessKey, number> = {
      "reader-ready": 0,
      "draft-held": 0,
      "reference-held": 0,
      "review-held": 0,
      "fallback-needed": 0,
      "needs-source-material": 0
    };
    visibleRows.forEach((row) => {
      const key = readerSafetyForRow(row).key as AdminReaderReadinessKey;
      counts[key] += 1;
    });
    return counts;
  }, [visibleRows]);
  const filteredRows = useMemo(() => visibleRows.filter((row) => {
    const rowClass = contentClassForRow(row);
    const rowTier = tierForRow(row);
    const rowCategory = contentCategoryForRow(row);

    const search = query.trim().toLowerCase();

    return (contentLibraryView === "all" || isCompatibilityRow(row))
      && (contentStatusFilter === "all" || row.status === contentStatusFilter)
      && (contentClassFilter === "all" || rowClass === contentClassFilter)
      && (tierFilter === "all" || rowTier === tierFilter)
      && (categoryFilter === "all" || rowCategory === categoryFilter)
      && matchesAdminSearch(visibleRowSearchText(row), search);
  }), [visibleRows, contentLibraryView, contentStatusFilter, contentClassFilter, tierFilter, categoryFilter, query]);
  const filteredReviewRows = useMemo(() => reviewQueueRows.filter((row) => {
    const haystack = [row.contentKey, row.title, row.summary, row.body, row.surface, row.mode, row.blockType].join(" ").toLowerCase();
    return (reviewStatusFilter === "all" || row.status === reviewStatusFilter)
      && (contentClassFilter === "all" || contentClassForRow(row) === contentClassFilter)
      && (tierFilter === "all" || tierForRow(row) === tierFilter)
      && matchesAdminSearch(haystack, query);
  }).sort((first, second) => {
    const firstPriority = sourceSnapshotNumber(first.sourceSnapshot, "reviewPriority");
    const secondPriority = sourceSnapshotNumber(second.sourceSnapshot, "reviewPriority");
    if (firstPriority !== null || secondPriority !== null) {
      const priorityDifference = (firstPriority ?? Number.MAX_SAFE_INTEGER) - (secondPriority ?? Number.MAX_SAFE_INTEGER);
      if (priorityDifference !== 0) return priorityDifference;
      const firstSequence = sourceSnapshotNumber(first.sourceSnapshot, "reviewSequence") ?? Number.MAX_SAFE_INTEGER;
      const secondSequence = sourceSnapshotNumber(second.sourceSnapshot, "reviewSequence") ?? Number.MAX_SAFE_INTEGER;
      if (firstSequence !== secondSequence) return firstSequence - secondSequence;
    }
    return 0;
  }), [reviewQueueRows, reviewStatusFilter, contentClassFilter, tierFilter, query]);
  const filteredCompositeReviewRows = useMemo(
    () => filteredReviewRows.filter(isCompositeRelationshipRow),
    [filteredReviewRows]
  );
  const skyVoiceNeedsReviewRows = useMemo(
    () => visibleRows.filter((row) => (
      ["sky_aspect", "sky_placement"].includes(row.block_type ?? "")
      && ["DRAFT", "REVIEWED"].includes(row.status)
      && row.judge_gate === "human-review"
      && Boolean(row.review_state)
      && row.review_state !== "sky-placement-topper-inactive"
    )),
    [visibleRows]
  );
  const skyVoiceAuditRows = useMemo(
    () => visibleRows
      .filter((row) => (
        ["sky_aspect", "sky_placement"].includes(row.block_type ?? "")
        && row.judge_gate === "auto-publish"
        && row.review_state !== "sky-placement-topper-inactive"
      ))
      .map((row) => ({ row, order: Math.random() }))
      .sort((a, b) => a.order - b.order)
      .slice(0, 5)
      .map(({ row }) => row),
    [visibleRows]
  );
  const filteredFallbackRows = useMemo(() => savedFallbackRows.filter((row) => (
    (fallbackSectionFilter === "all" || fallbackSectionForKey(row.content_key, row.surface) === fallbackSectionFilter)
      && matchesAdminSearch(fallbackHookVisibleSearchText(row), query)
  )), [savedFallbackRows, fallbackSectionFilter, query]);
  const filteredHookCatalog = useMemo(() => {
    const search = query.trim().toLowerCase();

    return hookCatalogItems.filter((item) => {
      const saved = savedHookKeys.has(item.key) || savedHookKeys.has(canonicalFallbackContentKey(item.key));
      const itemArea = surfaceAreaForFallbackSection(item.section);
      const itemStatus: WritingSurfaceStatusFilter = saved ? "complete" : "missing";

      return (fallbackSectionFilter === "all" || item.section === fallbackSectionFilter)
        && (surfaceAreaFilter === "all" || itemArea === surfaceAreaFilter)
        && (surfaceStatusFilter === "all" || itemStatus === surfaceStatusFilter)
        && (!search || matchesAdminSearch(`${item.key} ${item.label} ${item.section} ${item.type}`, search));
    });
  }, [hookCatalogItems, savedHookKeys, fallbackSectionFilter, surfaceAreaFilter, surfaceStatusFilter, query]);
  const filteredWritingSurfaces = useMemo(() => writingSurfaces.filter((item) => {
    const itemArea = areaForWritingSurface(item);
    const itemStatus = statusForWritingSurface(item, writingSurfaceAccess);
    const access = writingSurfaceAccess[item.id];
    const searchText = [
      item.surface,
      item.area,
      item.currentRenderPath,
      item.sources.map((source) => `${source.label} ${source.path}`).join(" "),
      access?.readerLocation ?? "",
      access?.routes.map((route) => `${route.label} ${route.note}`).join(" ") ?? ""
    ].join(" ");
    return (surfaceAreaFilter === "all" || itemArea === surfaceAreaFilter)
      && (surfaceStatusFilter === "all" || itemStatus === surfaceStatusFilter)
      && matchesAdminSearch(searchText, query);
  }), [writingSurfaces, writingSurfaceAccess, surfaceAreaFilter, surfaceStatusFilter, query]);
  const filteredSourceDrafts = useMemo(() => sourceDrafts.filter((item) => matchesAdminSearch([
    item.id,
    item.canonicalId,
    item.bodyA,
    item.bodyB,
    item.aspect,
    item.body,
    item.sourcePath
  ].join(" "), query)), [sourceDrafts, query]);
  const templateRows = useMemo(
    () => rows.filter((row) => row.content_key.startsWith("slot-template/")),
    [rows]
  );
  const filteredTemplateRows = useMemo(
    () => templateRows.filter((row) => matchesAdminSearch(visibleRowSearchText(row), query)),
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
      const [, explicitSection] = row.content_key.split("/");
      if (isVocabularySection(explicitSection) && explicitSection === vocabularyCategory) {
        return true;
      }
      const haystack = `${row.content_key} ${row.headline ?? ""} ${row.summary ?? ""} ${row.body ?? ""} ${JSON.stringify(row.source_snapshot ?? {})}`
        .toLowerCase()
        .replace(/[-_/.:]+/g, " ");
      return needles.length === 0 || needles.some((needle) => new RegExp(`(^|\\s)${needle.replace(/\s+/g, "\\s+")}(\\s|$)`).test(haystack));
    });
  }, [vocabRows, vocabularyCategory]);
  const filteredVocabularyRows = useMemo(
    () => vocabularyCategoryRows.filter((row) => matchesAdminSearch(visibleRowSearchText(row), query)),
    [vocabularyCategoryRows, query]
  );
  const filteredSlotEditableRows = useMemo(
    () => slotEditableRows.filter((row) => matchesAdminSearch(visibleRowSearchText(row), query)),
    [slotEditableRows, query]
  );
  const selectedSavedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.id)),
    [rows, selectedIds]
  );
  const hasAccessIssue = loadState === "accessDenied" || (!secret.trim() && loadState !== "loaded");
  const hasLoadFailure = loadState === "error";

  async function refreshHookCatalog() {
    setHookCatalogLoadState("loading");
    setHookCatalogError(null);
    if (!hookCatalogRequestRef.current) {
      hookCatalogRequestRef.current = loadAdminHookCatalogIndex();
    }
    try {
      const { definitions, packageVersion } = await hookCatalogRequestRef.current;
      setFallbackHookDefinitions(definitions);
      setHookCatalogPackageVersion(packageVersion);
      setHookCatalogLoadState("loaded");
    } catch (error) {
      setFallbackHookDefinitions([]);
      setHookCatalogPackageVersion("unavailable");
      setHookCatalogLoadState("error");
      setHookCatalogError(error instanceof Error ? error.message : "Could not load the hook catalog.");
    } finally {
      hookCatalogRequestRef.current = null;
    }
  }

  async function refreshSourceDraftCatalog() {
    setSourceDraftLoadState("loading");
    setSourceDraftError(null);
    try {
      setSourceDrafts(await loadAdminSourceDraftCatalog(secret));
      setSourceDraftLoadState("loaded");
    } catch (error) {
      setSourceDrafts([]);
      setSourceDraftLoadState("error");
      setSourceDraftError(error instanceof Error ? error.message : "Could not load the source draft catalog.");
    }
  }

  async function hookBodyFor(item: HookCatalogItem) {
    const surface = item.definition.surface;
    let bodies = hookBodyPackagesRef.current.get(surface);
    if (!bodies) {
      let request = hookBodyRequestsRef.current.get(surface);
      if (!request) {
        request = loadAdminHookCatalogBodies(surface);
        hookBodyRequestsRef.current.set(surface, request);
      }
      try {
        bodies = await request;
        hookBodyPackagesRef.current.set(surface, bodies);
      } finally {
        hookBodyRequestsRef.current.delete(surface);
      }
    }

    if (!bodies.has(item.key)) {
      throw new Error(`Hook catalog body is missing for ${item.key}.`);
    }
    return bodies.get(item.key) ?? "";
  }

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [activePage]);

  useEffect(() => {
    const needsExtendedInventory = activePage === "skyWriteups" || isCompositionPage(activePage) || showReferenceRows || showRetiredRows;
    if (!needsExtendedInventory || allRowsLoaded || loadState !== "loaded" || !secret.trim()) return;
    let cancelled = false;
    setIsLoading(true);
    void loadAllGeneratedContentRows(secret, "all")
      .then((allRows) => {
        if (cancelled) return;
        setRows(allRows);
        setAllRowsLoaded(true);
        setMessage(`Loaded the extended ${allRows.length}-row inventory for Composition and advanced visibility.`);
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage(dashboardErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
      setIsLoading(false);
    };
  }, [activePage, showReferenceRows, showRetiredRows, allRowsLoaded, loadState, secret]);

  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash || "#review-queue";
      if (handledHashRef.current === hash) return;
      handledHashRef.current = hash;
      const { page, params } = parseAdminHash();
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      closeEditor();
      setActivePage(page);

      const category = params.get("category") as AdminContentCategoryFilter | null;
      const source = params.get("source") as AdminContentClassFilter | null;
      const search = params.get("q");
      const section = params.get("section") as AdminFallbackHookSectionFilter | null;
      const area = params.get("area") as WritingSurfaceAreaFilter | null;
      const status = params.get("status") as WritingSurfaceStatusFilter | null;
      const view = params.get("view");
      const compatibilitySection = params.get("section") as AdminCompatibilitySectionFilter | null;
      const compatibilityPlanet = params.get("planet") as AdminArticlePointFilter | null;
      const compatibilitySortParam = params.get("sort") as AdminCompatibilitySort | null;

      setCategoryFilter(category && categoryFilters.some((filter) => filter.key === category) ? category : "all");
      setContentLibraryView(page === "content" && view === "compatibility" ? "compatibility" : "all");
      setSkyVoiceQueueView(page === "reviewQueue" && view === "composite" ? "composite" : "all");
      setContentClassFilter(source && contentClassFilters.some((filter) => filter.key === source) ? source : "all");
      setQuery(search ?? "");
      setFallbackSectionFilter(section && fallbackSections.some((filter) => filter.key === section) ? section : "all");
      setSurfaceAreaFilter(area && ["all", "sky", "you", "friends", "calendar", "settings"].includes(area) ? area : "all");
      setSurfaceStatusFilter(status && ["all", "complete", "partial", "missing"].includes(status) ? status : "all");
      setVocabularyCategory(vocabularyCategoryFromParams(page, params));
      if (page === "compatibility") {
        setCompatibilitySectionFilter(compatibilitySection && compatibilitySections.some((filter) => filter.key === compatibilitySection) ? compatibilitySection : "all");
        setCompatibilityStatusFilter(status && (status === "all" || contentStatuses.includes(status as GeneratedContentStatus)) ? status as GeneratedContentStatus | "all" : "all");
        setCompatibilityPlanetFilter(compatibilityPlanet && articlePointFilters.some((filter) => filter.key === compatibilityPlanet) ? compatibilityPlanet : "all");
        setCompatibilitySort(compatibilitySortParam && compatibilitySortOptions.some((filter) => filter.key === compatibilitySortParam) ? compatibilitySortParam : "updated-desc");
        setCompatibilityQuery(search ?? "");
      } else {
        setCompatibilitySectionFilter("all");
        setCompatibilityStatusFilter("all");
        setCompatibilityPlanetFilter("all");
        setCompatibilitySort("updated-desc");
        setCompatibilityQuery("");
      }
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
    void refreshHookCatalog();
    void import("./writingSurfaceSourceMap").then((module) => {
      setWritingSurfaces(module.writingSurfaceSourceMap);
      setWritingSurfaceAccess(module.writingSurfaceAdminAccess);
      setWritingSurfaceRoleLabels(module.writingSurfaceSourceRoleLabels);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const emergencySecret = secret;
    let cancelled = false;
    let activeSessionToken = "";
    let unsubscribe = () => {};

    void (async () => {
      setLoadState("loading");
      unsubscribe = watchOwnerSessionAccessToken((nextToken) => {
        if (cancelled || nextToken === activeSessionToken) return;
        activeSessionToken = nextToken;
        setTransientCredential(nextToken);
        void loadDashboardData(nextToken, false, "session");
      });
      const accessToken = await loadOwnerSessionAccessToken();

      if (!cancelled && accessToken) {
        activeSessionToken = accessToken;
        setTransientCredential(accessToken);
        if (await loadDashboardData(accessToken, false, "session")) return;
      }

      if (!cancelled && emergencySecret.trim()) {
        setTransientCredential(emergencySecret);
        await loadDashboardData(emergencySecret, false, "secret");
      } else if (!cancelled) {
        setLoadState("idle");
      }

    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!skyArticleEditor || !secret.trim()) return;
    const changes = skyArticleEditionFieldChanges(skyArticleEditor.baseEdition, skyArticleEditor.fields);
    if (changes.length === 0) {
      setSkyArticleEditor((current) => current ? { ...current, saveState: "saved", error: null } : current);
      return;
    }

    const sequence = ++skyArticleAutosaveSequenceRef.current;
    setSkyArticleEditor((current) => current ? { ...current, saveState: "unsaved", error: null } : current);
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          setSkyArticleEditor((current) => current ? { ...current, saveState: "saving", error: null } : current);
          const revised = await reviseSkyArticleEdition(skyArticleEditor.baseEdition, skyArticleEditor.fields);
          const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
            method: "PATCH",
            body: JSON.stringify({
              id: skyArticleEditor.rowId,
              ownerAction: "save-sky-article-edition-revision",
              sections: { skyArticleEdition: revised }
            })
          });
          if (sequence !== skyArticleAutosaveSequenceRef.current) return;
          const saved = payload.rows?.[0];
          if (!saved) throw new Error("The saved article revision was not returned.");
          setRows((current) => [saved, ...current.filter((row) => row.id !== saved.id)]);
          setSelectedRowId(saved.id);
          setDraft(draftFromRow(saved));
          setSkyArticleEditor((current) => current ? {
            ...current,
            rowId: saved.id,
            saveState: "saved",
            error: null
          } : current);
        } catch (error) {
          if (sequence !== skyArticleAutosaveSequenceRef.current) return;
          setSkyArticleEditor((current) => current ? {
            ...current,
            saveState: "error",
            error: error instanceof Error ? error.message : "Could not autosave the article revision."
          } : current);
        }
      })();
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [secret, skyArticleEditor?.baseEdition, skyArticleEditor?.fields, skyArticleEditor?.rowId]);

  useEffect(() => {
    const form = skyArticleEditionForm;
    const templateRow = selectedRow;
    if (!form?.facts || !templateRow || !isSkyArticleTemplateRow(templateRow) || !secret.trim()) return;
    const facts = form.facts;
    const authoredSlotValues = Object.entries(form.slotValues).filter(([name, value]) => (
      !Object.prototype.hasOwnProperty.call(facts.slotValues, name) && value.trim()
    ));
    if (!form.tldr.trim() && authoredSlotValues.length === 0) return;

    const sequence = ++skyArticleWorkspaceAutosaveSequenceRef.current;
    setSkyArticleEditionForm((current) => current ? { ...current, saveState: "unsaved" } : current);
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          setSkyArticleEditionForm((current) => current ? { ...current, saveState: "saving" } : current);
          const workspace = {
            schema: "tldrastro-sky-article-workspace-v1",
            targetContentKey: `sky-article/${facts.planet}/${facts.sign}/${facts.entryYear}`,
            templateKey: templateRow.content_key.replace(/^sky-article-template\//u, "sky/article-template/"),
            referenceDate: form.referenceDate,
            facts,
            tldr: form.tldr,
            slotValues: form.slotValues
          };
          const requestBody = form.workspaceId ? {
            id: form.workspaceId,
            headline: `${titleFromKey(facts.planet)} in ${titleFromKey(facts.sign)} article draft`,
            summary: form.tldr,
            sections: { skyArticleWorkspace: workspace },
            reviewState: "owner-review-required"
          } : {
            contentKey: skyArticleWorkspaceContentKey(facts),
            surface: "sky",
            mode: "article",
            status: "DRAFT",
            eventType: "sky-article-edition-workspace",
            headline: `${titleFromKey(facts.planet)} in ${titleFromKey(facts.sign)} article draft`,
            summary: form.tldr,
            body: "",
            sections: { skyArticleWorkspace: workspace },
            lane: "reference",
            reviewState: "owner-review-required",
            blockType: "sky_article",
            promptVersion: "sky-article-owner-workspace-v1",
            provider: "owner-edited-sky-article",
            model: "manual",
            sourceSnapshot: {
              review_status: "needs_review",
              contentType: "sky-article-edition-workspace",
              targetContentKey: workspace.targetContentKey
            }
          };
          const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
            method: form.workspaceId ? "PATCH" : "POST",
            body: JSON.stringify(requestBody)
          });
          if (sequence !== skyArticleWorkspaceAutosaveSequenceRef.current) return;
          const saved = payload.rows?.[0];
          if (!saved) throw new Error("The saved article workspace was not returned.");
          setRows((current) => [saved, ...current.filter((row) => row.id !== saved.id)]);
          setSkyArticleEditionForm((current) => current ? {
            ...current,
            workspaceId: saved.id,
            saveState: "saved"
          } : current);
        } catch (error) {
          if (sequence !== skyArticleWorkspaceAutosaveSequenceRef.current) return;
          setSkyArticleEditionForm((current) => current ? { ...current, saveState: "error" } : current);
          setMessage(error instanceof Error ? error.message : "Could not autosave the article workspace.");
        }
      })();
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [secret, selectedRow, skyArticleEditionForm?.facts, skyArticleEditionForm?.tldr, skyArticleEditionForm?.slotValues, skyArticleEditionForm?.workspaceId]);

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
    setSkyWriteupParentId(null);
    setSkyRelatedAspectQuery("");
    setSkyArticleEditionForm(null);
    skyArticleAutosaveSequenceRef.current += 1;
    setSkyArticleEditor(null);
  }

  function navigateAdminPage(page: AdminDashboardPage, params?: URLSearchParams, options: { keepEditorOpen?: boolean } = {}) {
    setIsCreateMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (!options.keepEditorOpen) {
      closeEditor();
    }
    if (page !== activePage && !params?.has("q")) {
      setQuery("");
    }
    setActivePage(page);
    setAdminHash(adminHashForPage(page, params));
  }

  function navigateSurfaceMapFilters(nextFilters: {
    area?: WritingSurfaceAreaFilter;
    section?: AdminFallbackHookSectionFilter;
    status?: WritingSurfaceStatusFilter;
  }) {
    const area = nextFilters.area ?? surfaceAreaFilter;
    const section = nextFilters.section ?? fallbackSectionFilter;
    const status = nextFilters.status ?? surfaceStatusFilter;
    const params = new URLSearchParams();
    const search = query.trim();
    if (section !== "all") params.set("section", section);
    if (area !== "all") params.set("area", area);
    if (status !== "all") params.set("status", status);
    if (search) params.set("q", search);

    setFallbackSectionFilter(section);
    setSurfaceAreaFilter(area);
    setSurfaceStatusFilter(status);
    navigateAdminPage("hooks", params, { keepEditorOpen: true });
  }

  function vocabularyCategoryParams(category: AdminVocabularyCategoryFilter) {
    const params = new URLSearchParams();
    const search = query.trim();
    if (category !== "planets") params.set("category", category);
    if (search) params.set("q", search);

    return params;
  }

  function navigateVocabularyCategory(category: AdminVocabularyCategoryFilter) {
    const params = vocabularyCategoryParams(category);
    setVocabularyCategory(category);
    navigateAdminPage("vocabulary", params, { keepEditorOpen: true });
  }

  async function loadDashboardData(secretOverride?: string, persistOnSuccess = false, credentialKind: "session" | "secret" = "secret") {
    const normalizedSecret = normalizeAdminSecret(secretOverride ?? secret);
    if (!normalizedSecret) {
      setLoadState("idle");
      setLoadError("Admin access is required before content can load.");
      setLoadDiagnostics(null);
      setMessage("Sign in with the owner account or use the emergency access key.");
      return false;
    }

    setLoadState("loading");
    setLoadError(null);
    setLoadDiagnostics(null);
    setSourceDraftLoadState("loading");
    setSourceDraftError(null);
    setIsLoading(true);
    try {
      const needsExtendedInventory = isCompositionPage(activePage) || showReferenceRows || showRetiredRows;
      const [generatedResult, reviewResult, usersResult, sourceDraftResult] = await Promise.allSettled([
        loadAllGeneratedContentRows(normalizedSecret, needsExtendedInventory ? "all" : "editorial"),
        adminJsonRequest<{ ok: boolean; rows?: AdminReviewRecord[]; records?: AdminReviewRecord[]; counts?: unknown }>("/api/admin/review-records?surface=upcomingAspects&status=all", normalizedSecret),
        adminJsonRequest<{ ok: boolean; rows: AdminUserGeneratedContentRow[] }>("/api/admin/user-generated-content?status=all&limit=100", normalizedSecret),
        loadAdminSourceDraftCatalog(normalizedSecret)
      ]);

      if (generatedResult.status === "rejected") {
        throw generatedResult.reason;
      }

      const review: { ok?: boolean; rows?: AdminReviewRecord[]; records?: AdminReviewRecord[]; counts?: unknown } = reviewResult.status === "fulfilled" ? reviewResult.value : { rows: [] };
      const usersPayload = usersResult.status === "fulfilled" ? usersResult.value : { rows: [] };
      const generatedRows = generatedResult.value;
      const reviewRowsPayload = review.rows ?? review.records ?? [];
      setRows(generatedRows);
      setAllRowsLoaded(needsExtendedInventory);
      setReviewRows(reviewRowsPayload.map((record: AdminReviewRecord) => {
        const rawGlobalRow = generatedRows.find((row) => row.id === record.id || row.content_key === record.contentKey);
        return { ...record, rawGlobalRow };
      }));
      setUserRows(usersPayload.rows ?? []);
      if (sourceDraftResult.status === "fulfilled") {
        setSourceDrafts(sourceDraftResult.value);
        setSourceDraftLoadState("loaded");
        setSourceDraftError(null);
      } else {
        setSourceDrafts([]);
        setSourceDraftLoadState("error");
        setSourceDraftError(dashboardErrorMessage(sourceDraftResult.reason));
      }
      setFacts([]);

      if (persistOnSuccess) {
        setSecret(normalizedSecret);
        setSecretInput(normalizedSecret);
      }

      const partialWarnings = [
        reviewResult.status === "rejected" ? "review records failed" : "",
        usersResult.status === "rejected" ? "user rows failed" : "",
        sourceDraftResult.status === "rejected" ? "Sky source drafts failed" : ""
      ].filter(Boolean);
      setLoadState("loaded");
      setMessage(`Loaded ${generatedRows.length} saved rows, ${reviewRowsPayload.length} review records, and ${usersPayload.rows?.length ?? 0} user rows.${partialWarnings.length ? ` Partial load: ${partialWarnings.join(", ")}.` : ""}`);
      return true;
    } catch (error) {
      const accessDenied = error instanceof AdminRequestError && error.status === 401;
      const nextMessage = accessDenied
        ? credentialKind === "session"
          ? "This signed-in account does not have Content Studio access. Sign in with the owner account or use the emergency access key."
          : "Admin access was denied. Sign in with the owner account or paste the current emergency access key."
        : dashboardErrorMessage(error);
      if (accessDenied && credentialKind === "secret" && normalizedSecret === normalizeAdminSecret(secret)) setSecret("");
      setLoadState(accessDenied ? "accessDenied" : "error");
      setLoadError(nextMessage);
      setLoadDiagnostics(error instanceof AdminRequestError ? `${error.method} ${error.path} -> HTTP ${error.status}${error.details ? ` (${error.details})` : ""}` : null);
      setMessage(nextMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  function submitAdminSecret() {
    const normalizedSecret = normalizeAdminSecret(secretInput);
    if (!normalizedSecret) {
      const nextMessage = "Paste the secret value, not the words CONTENT_GENERATION_SECRET.";
      setLoadState("accessDenied");
      setLoadError(nextMessage);
      setLoadDiagnostics(null);
      setMessage(nextMessage);
      return;
    }
    void loadDashboardData(normalizedSecret, true);
  }

  async function loadSkyReviewHorizon() {
    if (!secret.trim()) {
      setSkyReviewHorizonError("Admin access is required before the 90-day inventory can load.");
      return;
    }
    setIsLoading(true);
    setSkyReviewHorizonError(null);
    try {
      const payload = await adminJsonRequest<{ ok: boolean; horizon: SkyReviewHorizon }>(
        "/api/admin/sky-review-horizon?days=91",
        secret
      );
      setSkyReviewHorizon(payload.horizon);
      setMessage(`Calculated ${payload.horizon.counts.occurrences} reusable Sky candidates across ${payload.horizon.snapshotCount} days. No model calls were made.`);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Could not calculate the 90-day Sky inventory.";
      setSkyReviewHorizonError(nextMessage);
      setMessage(nextMessage);
    } finally {
      setIsLoading(false);
    }
  }

  async function approveAndScheduleSkyRow(row: AdminGeneratedContentRow) {
    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
        method: "PATCH",
        body: JSON.stringify({ id: row.id, ownerAction: "approve-and-schedule" })
      });
      const saved = payload.rows?.[0];
      if (saved) {
        setRows((current) => current.map((candidate) => candidate.id === saved.id ? saved : candidate));
        if (selectedRowId === saved.id) setDraft(draftFromRow(saved));
        announceContentUpdate({ contentKey: saved.content_key, published: saved.status === "LIVE", updatedAt: saved.updated_at ?? new Date().toISOString() });
        setSkyReviewHorizon((current) => current ? {
          ...current,
          occurrences: current.occurrences.map((occurrence) => occurrence.row?.id === saved.id
            ? { ...occurrence, row: saved, reviewStatus: "approved_scheduled" }
            : occurrence)
        } : current);
      }
      setMessage(`${row.content_key} approved. It is eligible only when current calculated Sky facts select this reusable configuration.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not approve and schedule the Sky row.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSkyArticleEditionFacts(templateRow: AdminGeneratedContentRow) {
    const planet = skyArticleTemplatePlanet(templateRow);
    if (!planet || !skyArticleEditionForm) return;
    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{ ok: boolean; facts: SkyArticleEditionFacts }>(
        `/api/admin/sky-article-facts?planet=${encodeURIComponent(planet)}&date=${encodeURIComponent(skyArticleEditionForm.referenceDate)}`,
        secret
      );
      const workspace = skyArticleWorkspaceForm(rows.find((row) => row.content_key === skyArticleWorkspaceContentKey(payload.facts)));
      const authoredSource = rows.find((row) => row.content_key === `sky/article-edition/${payload.facts.planet}/${payload.facts.sign}`);
      setSkyArticleEditionForm((current) => current ? {
        ...current,
        facts: payload.facts,
        tldr: workspace?.tldr ?? authoredSource?.summary?.trim() ?? current.tldr,
        slotValues: { ...current.slotValues, ...(workspace?.slotValues ?? {}), ...payload.facts.slotValues },
        workspaceId: workspace?.row.id ?? null,
        saveState: workspace ? "saved" : "idle"
      } : current);
      setMessage(`Loaded the calculated ${titleFromKey(payload.facts.planet)} in ${titleFromKey(payload.facts.sign)} residency window.${workspace ? " Your saved article draft is restored." : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load calculated Sky article facts.");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateSkyArticleEditionSlots(templateRow: AdminGeneratedContentRow) {
    const form = skyArticleEditionForm;
    if (!form?.facts) {
      setMessage("Load calculated edition facts before generating unfinished fields.");
      return;
    }
    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{
        ok: boolean;
        slotValues: Record<string, string>;
        blockedSlots: Array<{ name: string; description?: string }>;
        facts: SkyArticleEditionFacts;
        generation: SkyArticleEditionForm["slotGeneration"];
        message?: string;
      }>("/api/admin/sky-article-template-slots", secret, {
        method: "POST",
        body: JSON.stringify({
          templateId: templateRow.id,
          referenceDate: form.referenceDate,
          existingSlotValues: form.slotValues
        })
      });
      setSkyArticleEditionForm((current) => {
        if (!current) return current;
        const slotValues = { ...current.slotValues };
        for (const [name, value] of Object.entries(payload.slotValues ?? {})) {
          if (!Object.prototype.hasOwnProperty.call(slotValues, name)) slotValues[name] = value;
        }
        return {
          ...current,
          facts: payload.facts,
          slotValues: { ...slotValues, ...payload.facts.slotValues },
          slotGeneration: payload.generation,
          factBlockedSlots: payload.blockedSlots ?? []
        };
      });
      const count = Object.keys(payload.slotValues ?? {}).length;
      setMessage(payload.message ?? (
        count > 0
          ? `Generated ${count} unfinished template field${count === 1 ? "" : "s"} as an owner-review draft.`
          : "There were no unfinished AI-eligible template fields."
      ));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate unfinished Sky article fields.");
    } finally {
      setIsLoading(false);
    }
  }

  async function createSkyArticleEdition(templateRow: AdminGeneratedContentRow) {
    const form = skyArticleEditionForm;
    const facts = form?.facts;
    if (!form || !facts) {
      setMessage("Load calculated edition facts before compiling the article.");
      return;
    }
    const context = { planet: facts.planet, sign: facts.sign };
    const relationRows = relatedHousePassages(rows, context)
      .filter((passage) => isApprovedSkyRelationRow(passage.row));
    const housePassages: SkyArticleHousePassage[] = Array.from({ length: 12 }, (_, index) => index + 1)
      .flatMap((house) => {
        const passage = relationRows.find((candidate) => candidate.house === house);
        return passage?.row.body?.trim() ? [{
          house,
          risingSign: risingSignForTransitHouse(facts.sign, house),
          contentKey: passage.row.content_key,
          body: passage.row.body.trim()
        }] : [];
      });
    const aspectPassages = relatedAspectPassages(rows, context)
      .filter(isApprovedSkyRelationRow)
      .map((row) => skyArticleAspectPassage(row, facts.planet))
      .filter((passage): passage is SkyArticleAspectPassage => Boolean(passage));

    setIsLoading(true);
    try {
      const edition = await compileSkyArticleEdition({
        templateBody: templateRow.body ?? "",
        templateKey: templateRow.content_key.replace(/^sky-article-template\//u, "sky/article-template/"),
        planet: facts.planet,
        sign: facts.sign,
        tldr: form.tldr,
        entryYear: facts.entryYear,
        validFrom: facts.validFrom,
        validTo: facts.validTo,
        transitStartInstant: facts.transitStartInstant,
        transitEndInstant: facts.transitEndInstant,
        slotValues: form.slotValues,
        housePassages,
        aspectPassages
      });
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[]; skippedLiveRows?: Array<{ contentKey: string }> }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            rows: [{
              contentKey: edition.contentKey,
              surface: "sky",
              mode: "article",
              status: "DRAFT",
              eventType: "sky-article-edition",
              headline: edition.headline,
              summary: edition.tldr,
              body: edition.body,
              sections: { skyArticleEdition: edition },
              facts: {
                planet: facts.planet,
                sign: facts.sign,
                validFrom: facts.validFrom,
                validTo: facts.validTo,
                calculationSource: facts.calculationSource,
                calculationGeneratedAt: facts.generatedAt
              },
              sourceSnapshot: {
                contentType: "compiled-sky-article-edition",
                content_role: "authored_card",
                review_status: "needs_review",
                templateKey: edition.templateKey,
                templateHash: edition.templateHash,
                fixedProseHash: edition.fixedProseHash,
                compiledHash: edition.compiledHash,
                engineFacts: facts,
                slotGeneration: form.slotGeneration
              },
              lane: "reference",
              reviewState: "owner-review-required",
              blockType: "sky_article",
              promptVersion: SKY_ARTICLE_COMPILER_VERSION,
              provider: "owner-compiled-sky-article",
              model: "deterministic-template-compiler"
            }]
          })
        }
      );
      if (payload.skippedLiveRows?.length) {
        throw new Error(`${edition.contentKey} is already published. Demote the existing edition before replacing it.`);
      }
      const saved = payload.rows?.[0];
      if (!saved) throw new Error("The compiled edition was not returned by the content API.");
      setRows((current) => [saved, ...current.filter((row) => row.id !== saved.id)]);
      setSkyArticleEditionForm(null);
      openRow(saved);
      setMessage(`${edition.contentKey} compiled as a non-serving draft. Review the exact result before approving it.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not compile the Sky article edition.");
    } finally {
      setIsLoading(false);
    }
  }

  async function approveSkyArticleEdition(row: AdminGeneratedContentRow) {
    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
        method: "PATCH",
        body: JSON.stringify({ id: row.id, ownerAction: "approve-sky-article-edition" })
      });
      const saved = payload.rows?.[0];
      if (!saved) throw new Error("The approved edition was not returned by the content API.");
      setRows((current) => current.map((candidate) => candidate.id === saved.id ? saved : candidate));
      setDraft(draftFromRow(saved));
      announceContentUpdate({ contentKey: saved.content_key, published: saved.status === "LIVE", updatedAt: saved.updated_at ?? new Date().toISOString() });
      setMessage(`${saved.content_key} is approved and reader-eligible for its calculated validity window.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not approve the Sky article edition.");
    } finally {
      setIsLoading(false);
    }
  }

  async function publishSkyArticleChanges() {
    if (!skyArticleEditor || skyArticleEditor.saveState !== "saved") return;
    const revisionRow = rows.find((row) => row.id === skyArticleEditor.rowId);
    if (!revisionRow) {
      setMessage("The saved article revision is no longer available. Reopen the article before publishing.");
      return;
    }
    const changes = skyArticleEditionFieldChanges(skyArticleEditor.baseEdition, skyArticleEditor.fields);
    if (changes.length === 0) {
      setMessage("There are no article changes to publish.");
      return;
    }
    setIsLoading(true);
    try {
      const ownerAction = revisionRow.event_type === "sky-article-edition-revision"
        ? "publish-sky-article-edition-revision"
        : "approve-sky-article-edition";
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
        method: "PATCH",
        body: JSON.stringify({ id: revisionRow.id, ownerAction })
      });
      const saved = payload.rows?.[0];
      if (!saved) throw new Error("The published article edition was not returned.");
      setRows((current) => [saved, ...current.filter((row) => row.id !== saved.id && row.id !== revisionRow.id)]);
      openRow(saved);
      announceContentUpdate({ contentKey: saved.content_key, published: true, updatedAt: saved.updated_at ?? new Date().toISOString() });
      setMessage(`${saved.content_key} published with ${changes.length} reviewed change${changes.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not publish the article changes.");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveDraft(nextStatus?: GeneratedContentStatus) {
    if (!draft) return;
    const status = nextStatus ?? draft.status;
    if (status === "LIVE" && draft.sourceSnapshot?.governanceState === "needs-owner-decision") {
      setMessage("This source draft still needs an explicit owner decision. Save it as Draft or Reviewed; the general editor cannot make it reader-serving.");
      return;
    }
    setIsLoading(true);
    const draftForSave = { ...draft, status };
    const isPackageDraft = draftIsFallbackArchitectureV3(draftForSave);

    try {
      const body = isPackageDraft
        ? {
            id: draftForSave.id ?? undefined,
            headline: draftForSave.headline,
            summary: draftForSave.summary,
            body: draftForSave.body,
            sections: draftForSave.sections ?? {},
            facts: draftForSave.facts ?? {},
            reviewerNotes: draftForSave.reviewerNotes,
            sourceSnapshot: draftSourceSnapshot(draftForSave),
            reviewStatus: packageReviewStatusForDraft(draftForSave),
            editorialNotes: packageEditorialNotesForDraft(draftForSave)
          }
        : {
            id: draftForSave.id ?? undefined,
            contentKey: draftForSave.contentKey,
            surface: draftForSave.surface === "friends" ? "relationship" : draftForSave.surface,
            mode: draftForSave.mode,
            status,
            headline: draftForSave.headline,
            summary: draftForSave.summary,
            body: draftForSave.body,
            lane: draftForSave.lane,
            reviewState: status === "LIVE" || status === "REVIEWED" ? null : draftForSave.reviewState || null,
            blockType: draftForSave.blockType || null,
            promptVersion: draftForSave.promptVersion || "manual-admin",
            eventType: draftEventType(draftForSave),
            sections: draftForSave.sections ?? {},
            facts: draftForSave.facts ?? {},
            reviewerNotes: draftForSave.reviewerNotes,
            sourceSnapshot: draftSourceSnapshot(draftForSave)
          };
      const method = draftForSave.id ? "PATCH" : "POST";
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
        announceContentUpdate({ contentKey: saved.content_key, published: saved.status === "LIVE", updatedAt: saved.updated_at ?? new Date().toISOString() });
      }
      setMessage(`${draftForSave.contentKey} saved as ${contentStatusLabel(saved?.status ?? status)}.`);
    } catch (error) {
      setMessage(dashboardErrorMessage(error));
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
      updatedRows.forEach((row) => announceContentUpdate({
        contentKey: row.content_key,
        published: row.status === "LIVE",
        updatedAt: row.updated_at ?? new Date().toISOString()
      }));
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
    const nextDraft = draftFromRow(row);
    const edition = compiledSkyArticleEditionForDraft(nextDraft);
    const baseEdition = skyArticleRevisionBaseForDraft(nextDraft);
    setSelectedRowId(row.id);
    setDraft(nextDraft);
    setSkyWriteupParentId(null);
    setSkyRelatedAspectQuery("");
    setSkyFallbackPreviewFacts({});
    setSkyFallbackVariableTarget("");
    skyArticleAutosaveSequenceRef.current += 1;
    setSkyArticleEditor(edition && baseEdition ? {
      baseEdition,
      fields: skyArticleEditableFields(edition),
      rowId: row.id,
      saveState: "saved",
      error: null,
      reviewOpen: false
    } : null);
    setSkyArticleEditionForm(isSkyArticleTemplateRow(row) ? {
      referenceDate: new Date().toISOString().slice(0, 10),
      facts: null,
      tldr: "",
      slotValues: {},
      slotGeneration: null,
      factBlockedSlots: [],
      saveState: "idle",
      workspaceId: null
    } : null);
  }

  async function openServingFallbackRow(contentKey: string, occurrence: SkyReviewHorizonOccurrence) {
    setIsLoading(true);
    try {
      const existing = rows.find((row) => row.content_key === contentKey);
      const row = existing ?? (await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?status=all&contentKey=${encodeURIComponent(contentKey)}&limit=1`,
        secret
      )).rows?.find((candidate) => candidate.content_key === contentKey);
      if (!row) throw new Error(`The serving source ${contentKey} is not materialized in Content Studio.`);
      if (!existing) setRows((current) => [row, ...current]);
      openRow(row);
      setSkyFallbackPreviewFacts({
        ...occurrence.facts,
        entryDate: occurrence.windows[0]?.startDate ?? "",
        exitDate: occurrence.windows.at(-1)?.endDate ?? ""
      });
      setMessage(`Opened the reader source for ${occurrence.label}. Changes remain non-serving until separately approved and landed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open the serving fallback row.");
    } finally {
      setIsLoading(false);
    }
  }

  async function openOwnerApprovedSkyPlacementArticle(contentKey: string, label: string) {
    setIsLoading(true);
    try {
      const existing = rows.find((row) => row.content_key === contentKey);
      const row = existing ?? (await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(contentKey)}&limit=1`,
        secret
      )).rows?.find((candidate) => candidate.content_key === contentKey);
      if (!row) throw new Error(`The owner-approved source ${contentKey} is not materialized in Content Studio.`);
      if (!existing) setRows((current) => [row, ...current]);
      setShowReferenceRows(true);
      openRow(row);
      setMessage(`Opened the owner-approved article for ${label}. Changes remain non-serving until separately approved and landed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open the owner-approved Sky Placement article.");
    } finally {
      setIsLoading(false);
    }
  }

  function openMissingSkyDraft(occurrence: SkyReviewHorizonOccurrence) {
    setSelectedRowId(null);
    setSkyWriteupParentId(null);
    setSkyRelatedAspectQuery("");
    setSkyArticleEditionForm(null);
    skyArticleAutosaveSequenceRef.current += 1;
    setSkyArticleEditor(null);
    setDraft({
      id: null,
      contentKey: occurrence.contentKey,
      surface: "sky",
      mode: "feed",
      status: "DRAFT",
      headline: occurrence.label,
      summary: "",
      body: "",
      lane: "serving",
      reviewState: "EDITORIAL_REVIEW_REQUIRED",
      blockType: occurrence.kind === "aspect" ? "sky_aspect" : "sky_placement",
      promptVersion: "manual-admin",
      sections: null,
      facts: occurrence.facts,
      reviewerNotes: "Created manually from the calculated 90-day Sky inventory.",
      sourceSnapshot: {
        contentType: occurrence.kind === "aspect" ? "owner-authored-sky-aspect" : "owner-authored-sky-placement",
        content_role: "authored_card",
        review_status: "needs_review",
        authoringSource: "admin-dashboard-sky-horizon",
        activeWindows: occurrence.windows
      }
    });
    setMessage(`${occurrence.label} opened as a new manual draft. Add the missing writing, then save it for review.`);
    scrollEditorToTop();
  }

  function openSourceDraft(item: AdminSourceDraft) {
    const saved = rows.find((row) => row.content_key === item.id || row.content_key === item.canonicalId);
    if (saved) {
      openRow(saved);
      setMessage(`${item.id} already has a saved dashboard row.`);
      return;
    }

    setSelectedRowId(null);
    setSkyWriteupParentId(null);
    setSkyRelatedAspectQuery("");
    setSkyArticleEditionForm(null);
    skyArticleAutosaveSequenceRef.current += 1;
    setSkyArticleEditor(null);
    setDraft({
      id: null,
      contentKey: item.id,
      surface: "sky",
      mode: "in_depth",
      status: "DRAFT",
      headline: `${titleFromKey(item.bodyB)} ${titleFromKey(item.aspect)} ${titleFromKey(item.bodyA)}`,
      summary: "",
      body: item.body,
      lane: "reference",
      reviewState: "NEEDS_OWNER_DECISION",
      blockType: "sky_aspect",
      promptVersion: "held-source-draft-v1",
      sections: null,
      facts: { bodyA: item.bodyA, bodyB: item.bodyB, aspect: item.aspect },
      reviewerNotes: "Held source draft. Editing or saving does not authorize reader serving.",
      sourceSnapshot: {
        contentType: "sky-aspect-source-draft",
        content_role: "source_material",
        contentSystem: "authored",
        contentLevel: "source-grounded",
        authorityClass: item.authorityClass,
        governanceState: item.governanceState,
        surfacePermission: item.surfacePermission,
        sourcePath: item.sourcePath,
        canonicalId: item.canonicalId,
        provenance: item.provenance
      }
    });
    setMessage(`${item.id} opened as a held draft. It remains non-serving until a separate owner approval action.`);
    scrollEditorToTop();
  }

  function scrollEditorToTop() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const editorScroller = editorRef.current?.querySelector<HTMLElement>(".admin-post-editor") ?? editorRef.current;
        editorScroller?.scrollTo({ top: 0, behavior: "auto" });
      });
    });
  }

  function openRelatedSkyRow(parentId: string, row: AdminGeneratedContentRow) {
    setSkyWriteupParentId(parentId);
    setSelectedRowId(row.id);
    setDraft(draftFromRow(row));
    scrollEditorToTop();
  }

  function returnToSkyWriteup() {
    const parent = rows.find((row) => row.id === skyWriteupParentId);
    if (!parent) {
      setMessage("The parent Sky write-up is no longer available in the loaded rows.");
      setSkyWriteupParentId(null);
      return;
    }
    setSelectedRowId(parent.id);
    setDraft(draftFromRow(parent));
    setSkyWriteupParentId(null);
    setSkyRelatedAspectQuery("");
    scrollEditorToTop();
  }

  async function openHookDraft(item: HookCatalogItem) {
    const saved = savedFallbackRows.find((row) => row.content_key === canonicalFallbackContentKey(item.key) || hookKeyFromSavedRow(row) === item.key);
    if (saved) {
      navigateAdminPage("knowledge", undefined, { keepEditorOpen: true });
      openRow(saved);
      return;
    }

    setIsLoading(true);
    setMessage(`Loading source wording for ${item.label}…`);
    try {
      const body = await hookBodyFor(item);
      navigateAdminPage("knowledge", undefined, { keepEditorOpen: true });
      setSelectedRowId(null);
      setDraft(emptyDraftForHook({
        ...item,
        definition: {
          ...item.definition,
          copy: { ...item.definition.copy, body }
        }
      }));
      setMessage(`Source wording loaded for ${item.label}.`);
    } catch (error) {
      setMessage(error instanceof Error ? `${error.message} Select Author to retry.` : "Could not load source wording. Select Author to retry.");
    } finally {
      setIsLoading(false);
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
        sections: null,
        facts: null,
        reviewerNotes: "",
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
        sections: null,
        facts: null,
        reviewerNotes: "",
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
        sections: null,
        facts: null,
        reviewerNotes: "",
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
        sections: null,
        facts: null,
        reviewerNotes: "",
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
        lane: "reference",
        reviewState: "EDITORIAL_REVIEW_REQUIRED",
        blockType: "fallback_hook",
        promptVersion: "fallback-hook-template-v1",
        sections: null,
        facts: null,
        reviewerNotes: "",
        sourceSnapshot: {
          contentType: "fallback-system",
          content_role: "fallback_hook",
          review_status: "needs_review",
          hook: "manual/new-hook",
          contentSystem: "fallback",
          contentLevel: "madlib-fallback",
          authoringSource: "admin-dashboard"
        }
      });
    }
  }

  function openCmsStarter(
    surfaceItem: WritingSurfaceMapItem,
    starter: NonNullable<WritingSurfaceAdminAccess["cmsStarters"]>[number]
  ) {
    navigateAdminPage("content", undefined, { keepEditorOpen: true });
    setSelectedRowId(null);
    setDraft({
      id: null,
      contentKey: starter.contentKey,
      surface: starter.surface,
      mode: "card",
      status: "DRAFT",
      headline: starter.headline,
      summary: "",
      body: "",
      lane: "serving",
      reviewState: "EDITORIAL_REVIEW_REQUIRED",
      blockType: "essay",
      promptVersion: "cms-surface-template-v1",
      sections: null,
      facts: null,
      reviewerNotes: "",
      sourceSnapshot: {
        contentType: "mustache-template",
        contentSystem: "cms-surface-override",
        contentLevel: "owner-authored",
        authoringSource: "admin-dashboard",
        cmsSurfaceId: surfaceItem.id,
        readerLocation: writingSurfaceAccess[surfaceItem.id]?.readerLocation ?? "",
        allowedSlots: starter.allowedSlots
      }
    });
    setMessage(`${starter.label} opened as a non-serving draft. Use only the listed calculated slots, then publish when the wording is approved.`);
    scrollEditorToTop();
  }

  function openSkyAspectCmsStarter(row: AdminGeneratedContentRow, context: NonNullable<ReturnType<typeof skyWriteupContextForRow>>) {
    const starter = personalTransitAspectCmsStarter(row, context);
    const surfaceItem = writingSurfaces.find((item) => item.id === "personal-transit-detail");
    const baseStarter = writingSurfaceAccess["personal-transit-detail"]?.cmsStarters?.[0];

    if (!starter || !surfaceItem || !baseStarter) {
      setMessage("This source row does not map to a personalized transit-aspect CMS override.");
      return;
    }

    openCmsStarter(surfaceItem, {
      label: "Edit house-aware reader override",
      contentKey: starter.contentKey,
      surface: "you",
      headline: starter.headline,
      allowedSlots: [...baseStarter.allowedSlots]
    });
    setDraft((current) => current ? {
      ...current,
      sourceSnapshot: {
        ...(current.sourceSnapshot ?? {}),
        transitAspectSourceKey: starter.sourceContentKey,
        calculatedHouseContext: true
      }
    } : current);
  }

  function handleCompatibilityCreateAction(kind: AdminCompatibilityCreateKind) {
    navigateAdminPage("compatibility", undefined, { keepEditorOpen: true });
    setIsCreateMenuOpen(false);
    setSelectedRowId(null);
    setCompatibilitySectionFilter(kind === "fallback-hook" ? "fallback-hooks" : kind === "vocabulary" ? "vocabulary" : kind === "template" ? "slots" : "content");
    setCompatibilityPlanetFilter("venus");
    setMessage(
      kind === "content" ? "New compatibility card copy started."
      : kind === "vocabulary" ? "New compatibility phrase started."
      : kind === "fallback-hook" ? "New compatibility fallback hook started."
      : "New compatibility template started."
    );

    if (kind === "content") {
      setDraft({
        id: null,
        contentKey: "compatibility.venus.aries.libra",
        surface: "relationship",
        mode: "card",
        status: "DRAFT",
        headline: "Venus compatibility: Aries + Libra",
        summary: "Reader-facing compatibility card copy for Venus between Aries and Libra.",
        body: "",
        lane: "serving",
        reviewState: "EDITORIAL_REVIEW_REQUIRED",
        blockType: "compatibility_planet_card",
        promptVersion: "manual-admin",
        sections: null,
        facts: null,
        reviewerNotes: "",
        sourceSnapshot: {
          contentType: "friends.compatibility.planet-card",
          contentLevel: "source-grounded",
          authoringSource: "admin-dashboard",
          route: "friends.compatibility",
          planet: "venus",
          readerSign: "aries",
          otherSign: "libra"
        }
      });
      return;
    }

    if (kind === "vocabulary") {
      setDraft({
        id: null,
        contentKey: "vocab/relationship/compatibility-phrase",
        surface: "relationship",
        mode: "feed",
        status: "DRAFT",
        headline: "Compatibility phrase",
        summary: "Reusable phrase for compatibility writing and templates.",
        body: "",
        lane: "reference",
        reviewState: "EDITORIAL_REVIEW_REQUIRED",
        blockType: "vocabulary_phrase",
        promptVersion: "manual-admin",
        sections: null,
        facts: null,
        reviewerNotes: "",
        sourceSnapshot: {
          contentType: "vocab",
          bucket: "vocab",
          contentLevel: "source-grounded",
          authoringSource: "admin-dashboard",
          family: "compatibility",
          route: "friends.compatibility",
          planet: "venus"
        }
      });
      return;
    }

    if (kind === "fallback-hook") {
      setDraft({
        id: null,
        contentKey: "fallback-hook/friends.compatibility.planet-card",
        surface: "friends",
        mode: "card",
        status: "DRAFT",
        headline: "Compatibility card fallback",
        summary: "Simple fallback route for compatibility cards when reviewed copy is unavailable.",
        body: "",
        lane: "reference",
        reviewState: "EDITORIAL_REVIEW_REQUIRED",
        blockType: "fallback_hook",
        promptVersion: "fallback-hook-template-v1",
        sections: null,
        facts: null,
        reviewerNotes: "",
        sourceSnapshot: {
          contentType: "fallback-system",
          content_role: "fallback_hook",
          review_status: "needs_review",
          hook: "friends.compatibility.planet-card",
          contentLevel: "madlib-fallback",
          contentSystem: "fallback",
          authoringSource: "admin-dashboard",
          route: "friends.compatibility"
        }
      });
      return;
    }

    setDraft({
      id: null,
      contentKey: "slot-template/compatibility/planet-card",
      surface: "relationship",
      mode: "card",
      status: "DRAFT",
      headline: "Compatibility planet card template",
      summary: "Template or slot scaffold used by compatibility card copy.",
      body: "",
      lane: "reference",
      reviewState: "EDITORIAL_REVIEW_REQUIRED",
      blockType: "template",
      promptVersion: "manual-admin",
      sections: null,
      facts: null,
      reviewerNotes: "",
      sourceSnapshot: {
        contentType: "template",
        contentFamily: "friends.compatibility.planet-card",
        contentLevel: "source-grounded",
        authoringSource: "admin-dashboard",
        route: "friends.compatibility",
        planet: "venus"
      }
    });
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
    void openHookDraft(item);
  }

  function exportEditedFallbackArchitectureRows() {
    const editedRows = rows
      .filter((row) => rowIsFallbackArchitectureV3(row))
      .map((row) => {
        const record = rowPackageRecord(row);
        const sections = objectRecord(row.sections) ?? {};
        const packageDraft = objectRecord(sections.packageDraft);
        const current = {
          contentKey: row.content_key,
          headline: row.headline ?? "",
          summary: row.summary ?? "",
          body: row.body ?? "",
          body_you: typeof sections.body_you === "string" ? sections.body_you : null,
          body_they: typeof sections.body_they === "string" ? sections.body_they : null,
          review_status: sourceSnapshotString(row.source_snapshot, "review_status") || String(record.review_status ?? ""),
          editorial_notes: typeof record.editorial_notes === "string" ? record.editorial_notes : "",
          package_original: packageDraft ? record : null,
          proposed_record: packageDraft,
          structured_changes: packageDraft ? packageDraftChanges(sections) : []
        };
        const original = {
          headline: typeof record.headline === "string" ? record.headline : "",
          summary: typeof record.summary === "string" ? record.summary : "",
          body: typeof record.body === "string" ? record.body : typeof record.body_you === "string" ? record.body_you : "",
          body_you: typeof record.body_you === "string" ? record.body_you : null,
          body_they: typeof record.body_they === "string" ? record.body_they : null,
          review_status: typeof record.review_status === "string" ? record.review_status : "",
          editorial_notes: typeof record.editorial_notes === "string" ? record.editorial_notes : "",
          package_original: null,
          proposed_record: null,
          structured_changes: []
        };
        return {
          current,
          original,
          changed: JSON.stringify(current) !== JSON.stringify({ contentKey: current.contentKey, ...original })
        };
      })
      .filter((entry) => entry.changed)
      .map((entry) => entry.current);

    const blob = new Blob([JSON.stringify({
      schema: "tldrastro-fallback-architecture-v3-dashboard-edits",
      exportedAt: new Date().toISOString(),
      rows: editedRows
    }, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `tldrastro-fallback-architecture-v3-dashboard-edits-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(href);
    setMessage(`Exported ${editedRows.length} edited package rows.`);
  }

  const nav = (
    <aside className="admin-sidebar">
      <a className="admin-brand" href="#review-queue" onClick={() => navigateAdminPage("reviewQueue")}>
        <span className="admin-brand-mark">TL</span>
        <span>
          <strong>Content Studio</strong>
          <small>Phrasebank admin</small>
        </span>
      </a>
      <nav className="admin-nav" aria-label="Content operations">
        <section className="admin-nav-section" aria-label="Content">
          <p className="admin-eyebrow">Content</p>
          {primaryAdminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.page === "templates" ? isCompositionPage(activePage) : activePage === item.page;
            return (
              <button key={item.page} type="button" onClick={() => navigateAdminPage(item.page)} aria-current={isActive ? "page" : undefined}>
                <Icon size={16} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </section>
        <details className="admin-nav-advanced" open={advancedAdminNavItems.some((item) => item.page === activePage) || undefined}>
          <summary className="admin-eyebrow">Operations / Advanced</summary>
          <section className="admin-nav-section" aria-label="Operations and advanced tools">
            {advancedAdminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.page} type="button" onClick={() => navigateAdminPage(item.page)} aria-current={activePage === item.page ? "page" : undefined}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </section>
        </details>
      </nav>
      <section className="admin-sidebar-status" aria-label="Admin status">
        <span className={`ui-pill admin-status ${loadState === "loaded" ? "status-live" : loadState === "accessDenied" || loadState === "error" ? "status-error" : "status-draft"}`}>
          {loadState === "loaded"
            ? "Access verified"
            : loadState === "loading"
            ? "Loading"
            : loadState === "accessDenied"
            ? "Access denied"
            : secret.trim()
            ? "Access saved"
            : "Local only"}
        </span>
        <small>{loadState === "loaded" ? `${rows.length} saved rows loaded` : "Rows not loaded"}</small>
        <small>Fallback package {hookCatalogPackageVersion}</small>
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

        {isCompositionPage(activePage) && (
          <nav className="admin-template-tabs admin-composition-tabs" aria-label="Composition workspace">
            {compositionTabs.map((item) => (
              <button key={item.page} type="button" className={activePage === item.page ? "active" : ""} aria-current={activePage === item.page ? "page" : undefined} onClick={() => navigateAdminPage(item.page)}>
                {item.label}
              </button>
            ))}
          </nav>
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
            <nav className="admin-sky-voice-tabs" aria-label="Review queue views">
              <button type="button" className={skyVoiceQueueView === "all" ? "active" : ""} onClick={() => setSkyVoiceQueueView("all")}>
                All review
              </button>
              <button type="button" className={skyVoiceQueueView === "composite" ? "active" : ""} onClick={() => setSkyVoiceQueueView("composite")}>
                Composite
                <strong>{filteredCompositeReviewRows.length}</strong>
              </button>
              <button type="button" className={skyVoiceQueueView === "upcoming" ? "active" : ""} onClick={() => { setSkyVoiceQueueView("upcoming"); if (!skyReviewHorizon) void loadSkyReviewHorizon(); }}>
                Upcoming 90 days
                {skyReviewHorizon ? <strong>{skyReviewHorizon.counts.occurrences}</strong> : null}
              </button>
              <button type="button" className={skyVoiceQueueView === "needs-review" ? "active" : ""} onClick={() => setSkyVoiceQueueView("needs-review")}>
                Sky voice: needs review
                <strong>{skyVoiceNeedsReviewRows.length}</strong>
              </button>
              <button type="button" className={skyVoiceQueueView === "audit" ? "active" : ""} onClick={() => setSkyVoiceQueueView("audit")}>
                Sky voice: audit sample
                <strong>{skyVoiceAuditRows.length}</strong>
              </button>
            </nav>
            {(skyVoiceQueueView === "all" || skyVoiceQueueView === "composite") && <section className="admin-content-filters admin-review-queue-filters" aria-label="Review queue filters">
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
            </section>}
            {(skyVoiceQueueView === "all" || skyVoiceQueueView === "composite") && renderBulkBar()}
            {skyVoiceQueueView === "all" && renderReviewTable(filteredReviewRows)}
            {skyVoiceQueueView === "composite" && renderReviewTable(filteredCompositeReviewRows)}
            {skyVoiceQueueView === "upcoming" && renderSkyReviewHorizon()}
            {skyVoiceQueueView === "needs-review" && renderSkyVoiceQueue(skyVoiceNeedsReviewRows, "Cards held by the judge for a fast editorial decision.")}
            {skyVoiceQueueView === "audit" && renderSkyVoiceQueue(skyVoiceAuditRows, "Random auto-publish sample for periodic voice auditing. Refresh to draw another sample.")}
            {renderEditor()}
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
                <button type="button" onClick={exportEditedFallbackArchitectureRows}>
                  Export edited rows
                </button>
              </div>
            </section>
            {renderContentFilters()}
            <section className="admin-reader-safety-panel" aria-label="Reader safety status">
              <div>
                <p className="admin-eyebrow">Reader safety</p>
                <h3>Runtime Readiness</h3>
                <p>Reader routes serve Published authored rows first. When authored copy is missing, fallback needs enough source material to compose safe prose.</p>
              </div>
              <div className="admin-reader-safety-grid">
                <article className="reader-ready"><span>Reader-ready</span><strong>{readerCounts["reader-ready"]}</strong></article>
                <article><span>Draft/editorial</span><strong>{readerCounts["draft-held"]}</strong></article>
                <article><span>Reference/review held</span><strong>{readerCounts["reference-held"] + readerCounts["review-held"]}</strong></article>
                <article className={readerCounts["needs-source-material"] ? "needs-fallback" : ""}><span>Needs source material</span><strong>{readerCounts["needs-source-material"]}</strong></article>
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

        {activePage === "skyWriteups" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Sky editorial workspace</p>
                <h2>Placements and lunations</h2>
                <p>
                  {skyWriteupRows.filter((row) => !skyLunationContextForRow(row)).length} planetary placement write-ups and {skyWriteupRows.filter((row) => skyLunationContextForRow(row)).length} lunation write-ups. Open one row to review its main copy, aspects, and personalized horoscopes in reading order.
                </p>
              </div>
            </section>
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Sky write-up rows">
                {renderContentTable(skyWriteupRows)}
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
                <p>{filteredArticleRows.length} of {articleRows.length} article rows shown. Filter by status, planet, content system, or text.</p>
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

        {activePage === "compatibility" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Compatibility workspace</p>
                <h2>Compatibility</h2>
                <p>{filteredCompatibilityRows.length} of {compatibilityRows.length} compatibility rows shown across content, fallback hooks, vocabulary, slots, and templates.</p>
              </div>
              <div className="admin-new-actions" aria-label="Compatibility shortcuts">
                <button type="button" onClick={() => handleCompatibilityCreateAction("content")}>
                  <Plus size={16} aria-hidden="true" />
                  Card copy
                </button>
                <button type="button" onClick={() => handleCompatibilityCreateAction("vocabulary")}>
                  <Sparkles size={16} aria-hidden="true" />
                  Phrase
                </button>
                <button type="button" onClick={() => handleCompatibilityCreateAction("fallback-hook")}>
                  <FileText size={16} aria-hidden="true" />
                  Fallback
                </button>
                <button type="button" onClick={() => handleCompatibilityCreateAction("template")}>
                  <KeyRound size={16} aria-hidden="true" />
                  Template
                </button>
              </div>
            </section>
            <section className="admin-reader-safety-panel" aria-label="Compatibility sections summary">
              <div>
                <p className="admin-eyebrow">Compatibility sections</p>
                <h3>Search and edit the full support system</h3>
                <p>Use this surface when a compatibility card needs app copy, reusable phrases, a simple fallback, or a template reviewed together.</p>
              </div>
              <div className="admin-reader-safety-grid admin-compatibility-summary-grid">
                {compatibilitySections.filter((section) => section.key !== "all").map((section) => (
                  <article key={section.key} className={compatibilityCounts[section.key] ? "reader-ready" : ""}>
                    <span>{section.label}</span>
                    <strong>{compatibilityCounts[section.key]}</strong>
                  </article>
                ))}
              </div>
            </section>
            {renderCompatibilityFilters()}
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Compatibility rows">
                {renderContentTable(filteredCompatibilityRows)}
              </aside>
            </section>
          </section>
        )}

        {activePage === "knowledge" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Reader fallback library</p>
                <h2>Fallback Articles &amp; Passages</h2>
                <p>Find complete articles, house horoscopes, aspects, and supporting fallback rows by their reader-facing astrology title.</p>
              </div>
              <button type="button" onClick={() => navigateAdminPage("hooks")}>
                <KeyRound size={16} aria-hidden="true" />
                Open Surface Map
              </button>
            </section>
            {renderFallbackTabs()}
            <label className="admin-field-wide">
              <span>Search fallback articles and passages</span>
              <input aria-label="Search fallback articles and passages" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Planet, sign, aspect, house, or content key" />
            </label>
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Saved fallback hook rows">
                {renderFallbackContentGroups(filteredFallbackRows)}
              </aside>
            </section>
          </section>
        )}

        {activePage === "hooks" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Reader surface directory</p>
                <h2>Surface Map</h2>
                <p>Start with the place a reader sees the writing, then open the exact dashboard workspace that edits it. Surfaces with local reviewed fallbacks include a CMS starter for a LIVE-first prose override.</p>
              </div>
              <span className="ui-pill admin-status">{writingSurfaces.length} mapped surfaces</span>
            </section>
            <label className="admin-field-wide">
              <span>Find a reader surface or content source</span>
              <input aria-label="Search reader surfaces" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sky aspect, weekly horoscope, calendar, synastry…" />
            </label>
            <div className="admin-status-pills" role="group" aria-label="Filter surfaces by area">
              {[
                ["all", "All"],
                ["sky", "Sky"],
                ["you", "You"],
                ["friends", "Friends"],
                ["calendar", "Calendar"],
                ["settings", "Settings"]
              ].map(([key, label]) => (
                <button key={key} type="button" aria-pressed={surfaceAreaFilter === key} className={surfaceAreaFilter === key ? "active" : ""} onClick={() => navigateSurfaceMapFilters({ area: key as WritingSurfaceAreaFilter })}>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="admin-status-pills" role="group" aria-label="Filter surfaces by admin editability">
              {[
                ["all", "All"],
                ["complete", "Editable"],
                ["partial", "Runtime gaps"],
                ["missing", "Unmapped"]
              ].map(([key, label]) => (
                <button key={key} type="button" aria-pressed={surfaceStatusFilter === key} className={surfaceStatusFilter === key ? "active" : ""} onClick={() => navigateSurfaceMapFilters({ status: key as WritingSurfaceStatusFilter })}>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <section className="admin-surface-directory" aria-label="Reader surface content directory">
              {filteredWritingSurfaces.length === 0 && (
                <div className="admin-empty-state"><p>No mapped reader surfaces match these filters.</p></div>
              )}
              {filteredWritingSurfaces.map((item) => {
                const access = writingSurfaceAccess[item.id];
                const editability = statusForWritingSurface(item, writingSurfaceAccess);
                return (
                  <article key={item.id} className="admin-surface-card">
                    <div className="admin-section-heading-row">
                      <div>
                        <p className="admin-eyebrow">{areaForWritingSurface(item)} / {editability === "complete" ? "editable" : editability === "partial" ? "partly editable" : "unmapped"}</p>
                        <h3>{item.surface}</h3>
                        <p className="admin-surface-location"><strong>Reader location:</strong> {access?.readerLocation ?? "Not documented"}</p>
                      </div>
                      <span className={`ui-pill admin-status ${editability === "complete" ? "status-live" : "status-draft"}`}>
                        {editability === "complete" ? "Dashboard editable" : editability === "partial" ? "Runtime gap" : "No admin route"}
                      </span>
                    </div>
                    <p>{item.currentRenderPath}</p>
                    {access?.editability === "partial" && <p className="admin-surface-warning"><strong>Still to wire:</strong> {item.nextAction}</p>}
                    <div className="admin-surface-actions" aria-label={`${item.surface} editing destinations`}>
                      {access?.routes.map((route) => (
                        <a key={`${item.id}-${route.hash}`} href={route.hash} className={route.purpose === "reader-copy" ? "admin-source-action admin-source-action-primary" : "admin-source-action"} title={route.note}>
                          {route.label}
                        </a>
                      ))}
                      {access?.cmsStarters?.map((starter) => (
                        <button
                          key={`${item.id}-${starter.contentKey}`}
                          type="button"
                          className="admin-source-action"
                          onClick={() => openCmsStarter(item, starter)}
                        >
                          <Plus size={15} aria-hidden="true" />
                          {starter.label}
                        </button>
                      ))}
                    </div>
                    <details className="admin-surface-sources">
                      <summary>Content sources ({item.sources.length})</summary>
                      <ul>
                        {item.sources.map((source) => (
                          <li key={`${item.id}-${source.role}-${source.path}`}>
                            <span>{writingSurfaceRoleLabels[source.role] ?? source.role}</span>
                            <strong>{source.label}</strong>
                            <code>{source.path}</code>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </article>
                );
              })}
            </section>
            <details className="admin-surface-supporting-catalog">
              <summary>Supporting fallback-hook catalog ({savedHookCatalogCount}/{hookCatalogItems.length} saved)</summary>
              {renderFallbackTabs()}
              <section className="admin-fallback-row-list" aria-label="Hook catalog">
                {hookCatalogLoadState === "loading" && <div className="admin-empty-state" role="status"><p>Loading hook catalog…</p></div>}
                {hookCatalogLoadState === "error" && <div className="admin-empty-state" role="alert"><p>{hookCatalogError ?? "Could not load the hook catalog."}</p><button type="button" onClick={() => void refreshHookCatalog()}><RefreshCw size={15} aria-hidden="true" />Retry catalog</button></div>}
                {filteredHookCatalog.map((item) => {
                  const saved = savedHookKeys.has(item.key) || savedHookKeys.has(canonicalFallbackContentKey(item.key));
                  return (
                    <article key={`${item.type}-${item.key}`} className="admin-fallback-row" role="button" tabIndex={0} onClick={() => void openHookDraft(item)} onKeyDown={(event) => onCatalogKeyDown(event, item)}>
                      <div className="admin-fallback-row-main"><p className="admin-eyebrow">{item.section} / {item.type}</p><h3>{item.label}</h3><code>{canonicalFallbackContentKey(item.key)}</code></div>
                      <div className="admin-fallback-row-actions"><span className={`ui-pill admin-status ${saved ? "status-live" : "status-draft"}`}>{saved ? "Saved row" : "Needs row"}</span><button type="button" disabled={isLoading} onClick={(event) => { event.stopPropagation(); void openHookDraft(item); }}><Plus size={15} aria-hidden="true" />Author</button></div>
                    </article>
                  );
                })}
              </section>
            </details>
          </section>
        )}

        {activePage === "sourceDrafts" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar">
              <div>
                <p className="admin-eyebrow">Current Sky / held source material</p>
                <h2>Sky Aspect Drafts</h2>
                <p>{filteredSourceDrafts.length} of {sourceDrafts.length} passages shown. These drafts are searchable and editable here, but saving one does not approve it or make it visible to readers.</p>
              </div>
              <button type="button" onClick={() => navigateAdminPage("hooks", new URLSearchParams({ area: "sky" }))}><Flag size={16} aria-hidden="true" />Back to Sky surfaces</button>
            </section>
            <label className="admin-field-wide">
              <span>Search by planet, point, aspect, phrase, or source key</span>
              <input aria-label="Search Sky aspect drafts" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sun trine Chiron" />
            </label>
            {sourceDraftLoadState === "loading" && <div className="admin-empty-state" role="status"><p>Loading held source drafts…</p></div>}
            {sourceDraftLoadState === "error" && (
              <div className="admin-empty-state" role="alert"><p>{sourceDraftError ?? "Could not load source drafts."}</p><button type="button" onClick={() => void refreshSourceDraftCatalog()}><RefreshCw size={15} aria-hidden="true" />Retry</button></div>
            )}
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Held Sky aspect source drafts">
                <div className="admin-fallback-row-list">
                  {filteredSourceDrafts.map((item) => {
                    const saved = savedContentKeys.has(item.id) || savedContentKeys.has(item.canonicalId);
                    return (
                      <article key={item.id} className="admin-fallback-row" role="button" tabIndex={0} onClick={() => openSourceDraft(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openSourceDraft(item); } }}>
                        <div className="admin-fallback-row-main">
                          <p className="admin-eyebrow">{item.bodyB} / {item.aspect} / {item.bodyA}</p>
                          <h3>{titleFromKey(item.bodyB)} {titleFromKey(item.aspect)} {titleFromKey(item.bodyA)}</h3>
                          <code>{item.id}</code>
                          <p>{item.body.split("\n")[0]}</p>
                          <small>{item.sourcePath}</small>
                        </div>
                        <div className="admin-fallback-row-actions">
                          <span className={`ui-pill admin-status ${saved ? "status-live" : "status-draft"}`}>{saved ? "Saved draft" : "Source only"}</span>
                          <span className="ui-pill admin-status status-draft">Not serving</span>
                          <button type="button" onClick={(event) => { event.stopPropagation(); openSourceDraft(item); }}>{saved ? "Edit" : "Open draft"}</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </aside>
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
                <a
                  key={key}
                  href={adminHashForPage("vocabulary", vocabularyCategoryParams(key))}
                  role="tab"
                  aria-selected={vocabularyCategory === key}
                  className={vocabularyCategory === key ? "active" : ""}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateVocabularyCategory(key);
                  }}
                  onPointerDown={(event) => {
                    if (event.button === 0) {
                      navigateVocabularyCategory(key);
                    }
                  }}
                >
                  {label}
                </a>
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
              <input aria-label="Search templates" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Template name, key, or source" />
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
              <button type="button"><span>Needs rows</span><strong>{Math.max(0, hookCatalogItems.length - savedHookCatalogCount)}</strong></button>
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
              <button type="button" onClick={submitAdminSecret} disabled={isLoading || !normalizeAdminSecret(secretInput)}>
                <RefreshCw size={16} aria-hidden="true" />
                Check Access
              </button>
            </section>
            <label className="admin-field-wide">
              <span>CONTENT_GENERATION_SECRET</span>
              <input
                type="password"
                value={secretInput}
                onChange={(event) => setSecretInput(event.target.value)}
                placeholder="Paste secret value or CONTENT_GENERATION_SECRET=value"
              />
            </label>
          </section>
        )}

        {activePage === "aspectPatternCoverage" && (
          <Suspense fallback={<p className="admin-loading-state" role="status">Loading aspect-pattern tools…</p>}>
            <AspectPatternWriteups initialKind="natal" secret={secret} />
          </Suspense>
        )}

        {activePage === "aspectPatternActivationCoverage" && (
          <Suspense fallback={<p className="admin-loading-state" role="status">Loading aspect-pattern tools…</p>}>
            <AspectPatternWriteups initialKind="activation" secret={secret} />
          </Suspense>
        )}

        {activePage === "aspectDiagnostics" && (
          <Suspense fallback={<p className="admin-loading-state" role="status">Loading aspect diagnostics…</p>}>
            <AspectPatternDiagnostics />
          </Suspense>
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
              <table className="admin-content-table admin-user-content-table">
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

        {activePage === "reportFulfillment" && (
          <Suspense fallback={<p className="admin-loading-state" role="status">Loading report fulfillment…</p>}>
            <ReportFulfillmentAdminPanel secret={secret} />
          </Suspense>
        )}

      </section>
    </main>
  );

  function renderContentFilters() {
    return (
      <section className="admin-content-filters" aria-label="Content list filters">
        <div className="admin-template-tabs" role="tablist" aria-label="Content Library saved views">
          <button type="button" role="tab" aria-selected={contentLibraryView === "all"} className={contentLibraryView === "all" ? "active" : ""} onClick={() => setContentLibraryView("all")}>
            Editorial content
          </button>
          <button type="button" role="tab" aria-selected={contentLibraryView === "compatibility"} className={contentLibraryView === "compatibility" ? "active" : ""} onClick={() => setContentLibraryView("compatibility")}>
            Compatibility
          </button>
        </div>
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
            <input aria-label="Search content" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, surface, kind, content key" />
          </label>
          <button type="button" onClick={() => void loadDashboardData()} disabled={isLoading}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh rows
          </button>
          <button type="button" aria-pressed={showReferenceRows} className={showReferenceRows ? "active" : ""} onClick={() => setShowReferenceRows((current) => !current)}>
            Show reference
          </button>
          <button type="button" aria-pressed={showRetiredRows} className={showRetiredRows ? "active" : ""} onClick={() => setShowRetiredRows((current) => !current)}>
            Show retired
          </button>
          <button
            type="button"
            onClick={() => {
              setContentStatusFilter("all");
              setContentLibraryView("all");
              setCategoryFilter("all");
              setContentClassFilter("all");
              setTierFilter("all");
              setShowReferenceRows(false);
              setShowRetiredRows(false);
              setQuery("");
            }}
          >
            Clear filters
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
            <span>Content system</span>
            <select aria-label="Article content system" value={articleContentSystemFilter} onChange={(event) => setArticleContentSystemFilter(event.target.value as AdminContentSystemFilter)}>
              {contentSystemFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </select>
          </label>
          <label>
            <span>Search articles</span>
            <input aria-label="Search articles" value={articleQuery} onChange={(event) => setArticleQuery(event.target.value)} placeholder="Title, surface, kind, content key" />
          </label>
          <button
            type="button"
            onClick={() => {
              setArticleStatusFilter("LIVE");
              setArticlePointFilter("all");
              setArticleContentSystemFilter("all");
              setArticleQuery("");
            }}
          >
            Clear filters
          </button>
        </div>
      </section>
    );
  }

  function renderCompatibilityFilters() {
    return (
      <section className="admin-content-filters" aria-label="Compatibility filters">
        <div className="admin-template-tabs" role="tablist" aria-label="Compatibility sections">
          {compatibilitySections.map((section) => (
            <button
              key={section.key}
              type="button"
              role="tab"
              aria-selected={compatibilitySectionFilter === section.key}
              className={compatibilitySectionFilter === section.key ? "active" : ""}
              title={section.description}
              onClick={() => setCompatibilitySectionFilter(section.key)}
            >
              <span>{section.label}</span>
              <strong>{compatibilityCounts[section.key]}</strong>
            </button>
          ))}
        </div>
        <div className="admin-review-filter-grid">
          <label>
            <span>Status</span>
            <select aria-label="Compatibility status" value={compatibilityStatusFilter} onChange={(event) => setCompatibilityStatusFilter(event.target.value as GeneratedContentStatus | "all")}>
              <option value="all">All statuses</option>
              {contentStatuses.map((status) => <option key={status} value={status}>{contentStatusLabel(status)}</option>)}
            </select>
          </label>
          <label>
            <span>Planet or point</span>
            <select aria-label="Compatibility planet or point" value={compatibilityPlanetFilter} onChange={(event) => setCompatibilityPlanetFilter(event.target.value as AdminArticlePointFilter)}>
              {articlePointFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Compatibility sort" value={compatibilitySort} onChange={(event) => setCompatibilitySort(event.target.value as AdminCompatibilitySort)}>
              {compatibilitySortOptions.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </select>
          </label>
          <label>
            <span>Search compatibility</span>
            <input aria-label="Search compatibility" value={compatibilityQuery} onChange={(event) => setCompatibilityQuery(event.target.value)} placeholder="Sign pair, planet, hook, vocab, slot, or key" />
          </label>
          <button
            type="button"
            onClick={() => {
              setCompatibilitySectionFilter("all");
              setCompatibilityStatusFilter("all");
              setCompatibilityPlanetFilter("all");
              setCompatibilitySort("updated-desc");
              setCompatibilityQuery("");
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
          <p>Sign in to TLDR Astro with the owner account. The emergency access key remains available if account access is unavailable.</p>
        </div>
        <label className="admin-access-inline-field">
          <span>Emergency access key</span>
          <input
            aria-label="Secret"
            type="password"
            value={secretInput}
            onChange={(event) => setSecretInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitAdminSecret();
              }
            }}
            placeholder="Paste emergency access key"
          />
        </label>
        <button type="button" onClick={submitAdminSecret} disabled={isLoading || !normalizeAdminSecret(secretInput)}>
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
          <button key={section.key} type="button" role="tab" aria-selected={fallbackSectionFilter === section.key} className={fallbackSectionFilter === section.key ? "active" : ""} onClick={() => activePage === "hooks" ? navigateSurfaceMapFilters({ section: section.key }) : setFallbackSectionFilter(section.key)}>
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

  function renderFallbackContentGroups(tableRows: AdminGeneratedContentRow[]) {
    const groups = [
      { key: "articles", label: "Sky Placement articles" },
      { key: "houses", label: "House horoscopes" },
      { key: "sky-aspects", label: "Sky aspects" },
      { key: "personal-transits", label: "Transits to natal" },
      { key: "supporting", label: "Supporting fallback rows" }
    ] as const;
    const groupedRows = new Map(groups.map((group) => [group.key, [] as AdminGeneratedContentRow[]]));
    tableRows.forEach((row) => {
      const groupKey = skyFallbackIdentity(row.content_key)?.groupKey ?? "supporting";
      groupedRows.get(groupKey)?.push(row);
    });
    const visibleGroups = groups.filter((group) => (groupedRows.get(group.key)?.length ?? 0) > 0);

    if (visibleGroups.length === 0) return <p className="admin-empty">No rows match these filters.</p>;

    return (
      <div className="admin-sky-edition-fields" aria-label="Fallback content grouped by reader use">
        {visibleGroups.map((group) => {
          const rows = groupedRows.get(group.key) ?? [];
          return (
            <section className="admin-hook-detail-section" aria-label={group.label} key={group.key}>
              <div className="admin-section-heading-row">
                <h3>{group.label}</h3>
                <p>{rows.length} rows</p>
              </div>
              {renderContentTable(rows)}
            </section>
          );
        })}
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
              const rowRole = contentRoleDetails(contentRoleForRecord(row));
              return (
                <tr key={row.id} className={`admin-content-row ${selectedRowId === row.id ? "selected" : ""}`} onClick={() => openRow(row)}>
                  <td onClick={(event) => event.stopPropagation()}>
                    <label className="admin-content-row-check">
                      <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleRowSelection(row.id)} aria-label={`Select ${rowTitle(row)}`} />
                    </label>
                  </td>
                  <td className="admin-content-title-cell">
                    <strong className="admin-content-row-title">{rowTitle(row)}</strong>
                    <small className="admin-content-type-label admin-field-hint">{rowTypeLabel(row)}</small>
                    <code className="admin-content-row-key">{row.content_key}</code>
                  </td>
                  <td><span className={`admin-reader-state-pill ${safety.key}`} title={safety.detail}>{safety.label}</span></td>
                  <td><span className={`ui-pill admin-status status-${row.status.toLowerCase()}`}>{contentStatusLabel(row.status)}</span></td>
                  <td className="admin-content-location"><strong>{row.surface}</strong><small>{row.mode}</small></td>
                  <td>{row.block_type || row.event_type || "content"}</td>
                  <td>{row.updated_at?.slice(0, 10) ?? row.created_at?.slice(0, 10) ?? "Local"}</td>
                  <td>
                    <span className="ui-pill admin-status" title={rowRole.detail}>{rowRole.label}</span>
                    <small>{contentClassLabel(rowClass)} · {tierForRow(row)}</small>
                  </td>
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
              <strong>{reviewQueueRows.filter((row) => row.status === status).length}</strong>
            </button>
          ))}
        </aside>
        <div className="admin-review-queue-rows" aria-label="Review rows">
          {tableRows.map((row) => {
            const safety = readerSafetyForRow(row);
            const saved = row.rawGlobalRow;
            const rowRole = contentRoleDetails(contentRoleForRecord(row));
            return (
              <article key={row.id} className="admin-review-queue-row" onClick={() => saved && openRow(saved)}>
                <div className="admin-review-queue-row-head">
                  <label className="admin-content-row-check" onClick={(event) => event.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(saved?.id ?? row.id)} disabled={!saved} onChange={() => saved && toggleRowSelection(saved.id)} />
                  </label>
                  <div className="admin-review-queue-copy">
                    <h3>{rowTitle(row)}</h3>
                    <code>{row.contentKey}</code>
                  </div>
                  <div className="admin-review-queue-meta-strip">
                    <span className={`ui-pill admin-status status-${row.status.toLowerCase()}`}>{contentStatusLabel(row.status)}</span>
                    <span className="ui-pill admin-status">{contentClassLabel(contentClassForRow(row))}</span>
                    <span className="ui-pill admin-status" title={rowRole.detail}>{rowRole.label}</span>
                    <span className={`admin-reader-state-pill ${safety.key}`}>{safety.label}</span>
                  </div>
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

  function renderSkyVoiceQueue(tableRows: AdminGeneratedContentRow[], description: string) {
    return (
      <section className="admin-sky-voice-queue" aria-label="Sky voice queue">
        <p className="admin-sky-voice-description">{description}</p>
        <div className="admin-sky-voice-cards">
          {tableRows.map((row) => {
            const source = objectRecord(row.source_snapshot);
            const isPlacement = row.block_type === "sky_placement";
            const isPlacementTopper = row.event_type === "collective-placement-topper";
            const judge = isPlacement
              ? objectRecord(
                  isPlacementTopper
                    ? source?.skyPlacementTopperJudge
                    : source?.skyPlacementJudge
                )
              : objectRecord(source?.skyAspectJudge);
            const rowFacts = objectRecord(row.facts);
            const facts = isPlacement
              ? rowFacts
              : objectRecord(rowFacts?.cardFacts) ?? objectRecord(source?.cardFacts);
            const pair = [facts?.a, facts?.b].filter(Boolean).join(" / ");
            const signs = [facts?.signA, facts?.signB].filter(Boolean).join(" / ");
            const placement = [facts?.planet, facts?.sign].filter(Boolean).join(" in ");
            const topperContact = isPlacementTopper
              ? [facts?.aspect, facts?.other, facts?.otherSign ? `in ${facts.otherSign}` : ""].filter(Boolean).join(" ")
              : "";
            const weakest = typeof judge?.weakest === "string" ? judge.weakest : "";
            return (
              <article key={row.id} className="admin-sky-voice-card">
                <header>
                  <div>
                    <h3>{row.headline || placement || pair || "Sky voice card"}</h3>
                    <code>{row.content_key}</code>
                  </div>
                  <div className="admin-review-queue-meta-strip">
                    <span className={`ui-pill admin-status status-${row.status.toLowerCase()}`}>{contentStatusLabel(row.status)}</span>
                    <span className="ui-pill admin-status">Judge {row.judge_score ?? "-"}/3</span>
                  </div>
                </header>
                <dl className="admin-sky-voice-facts">
                  <div><dt>{isPlacement ? "Placement" : "Pair"}</dt><dd>{isPlacement ? placement || "Not recorded" : pair || "Not recorded"}</dd></div>
                  <div><dt>{isPlacement ? "Kind" : "Aspect"}</dt><dd>{isPlacement ? (isPlacementTopper ? "Current topper" : "Collective placement") : String(facts?.aspect ?? "Not recorded")}</dd></div>
                  <div><dt>{isPlacement ? "Sign" : "Signs"}</dt><dd>{isPlacement ? String(facts?.sign ?? "Not recorded") : signs || "Not recorded"}</dd></div>
                  {isPlacementTopper ? <div><dt>Contact</dt><dd>{topperContact || "Not recorded"}</dd></div> : null}
                </dl>
                <div className="admin-sky-voice-body">{row.body || "No card body saved."}</div>
                <div className="admin-sky-voice-judge">
                  <p><strong>Why</strong>{row.judge_why || "No judge rationale saved."}</p>
                  <p><strong>Weakest</strong>{weakest || "No weakest beat recorded."}</p>
                </div>
                <div className="admin-review-queue-actions">
                  <button type="button" onClick={() => openRow(row)}>Edit</button>
                  {row.judge_score === 3 && row.judge_gate === "human-review" && row.status !== "LIVE"
                    ? <button type="button" onClick={() => void approveAndScheduleSkyRow(row)} disabled={isLoading}>Approve &amp; schedule</button>
                    : null}
                </div>
              </article>
            );
          })}
          {tableRows.length === 0 && <p className="admin-empty">No sky voice cards are in this view.</p>}
        </div>
      </section>
    );
  }

  function renderSkyReviewHorizon() {
    if (skyReviewHorizonError) {
      return (
        <section className="admin-sky-voice-queue">
          <p className="admin-empty">{skyReviewHorizonError}</p>
          <button type="button" onClick={() => void loadSkyReviewHorizon()} disabled={isLoading}>Try again</button>
        </section>
      );
    }
    if (!skyReviewHorizon) {
      return <section className="admin-sky-voice-queue"><p className="admin-empty">Calculating 91 daily Sky snapshots. This makes no model calls.</p></section>;
    }
    const statusLabels: Record<SkyReviewHorizonOccurrence["reviewStatus"], string> = {
      missing_draft: "Missing generated draft",
      ready_for_owner: "Ready for owner",
      approved_scheduled: "Approved for matching Sky",
      rejected: "Rejected / archived",
      generation_error: "Generation error",
      draft_needs_work: "Draft needs work"
    };
    return (
      <section className="admin-sky-voice-queue" aria-label="Upcoming 90-day Sky review inventory">
        <div className="admin-sky-horizon-summary">
          <div>
            <p className="admin-eyebrow">Calculated occurrence inventory</p>
            <h3>{skyReviewHorizon.startDate} through {skyReviewHorizon.endDate}</h3>
            <p>{skyReviewHorizon.counts.aspectCandidates} aspect cards and {skyReviewHorizon.counts.placementCandidates} placement cards are reused across {skyReviewHorizon.counts.activeWindows} active windows. Dates come from calculated daily Sky snapshots; copy is never duplicated per day.</p>
            <p><strong>{skyReviewHorizon.generationPlan.reusableCandidatesMissingDrafts} generated sign-specific drafts are missing.</strong> This is not the same as a reader-facing source gap because approved exact-aspect and phrasebook fallbacks may still cover the event. A complete first-pass generation run would require at least {skyReviewHorizon.generationPlan.writerCalls} writer and {skyReviewHorizon.generationPlan.reviewerCalls} reviewer calls. This screen does not start them.</p>
          </div>
          <button type="button" onClick={() => void loadSkyReviewHorizon()} disabled={isLoading}>
            <RefreshCw size={16} aria-hidden="true" /> Recalculate
          </button>
        </div>
        <p className="admin-sky-voice-description">This view is inventory and review status only. Loading it makes zero writer or reviewer calls and changes no approval or serving state.</p>
        <div className="admin-sky-voice-cards">
          {skyReviewHorizon.occurrences.map((occurrence) => {
            const row = occurrence.row;
            const canApprove = row?.judge_score === 3 && row.judge_gate === "human-review" && row.status !== "LIVE";
            const ownerApprovedArticleKey = ownerApprovedSkyPlacementArticleKey(occurrence.contentKey);
            const statusLabel = ownerApprovedArticleKey
              ? ownerApprovedReplacementLabel
              : statusLabels[occurrence.reviewStatus];
            return (
              <article key={occurrence.contentKey} className="admin-sky-voice-card">
                <header>
                  <div>
                    <h3>{occurrence.label}</h3>
                    <code>{occurrence.contentKey}</code>
                  </div>
                  <div className="admin-review-queue-meta-strip">
                    <span className="ui-pill admin-status">{statusLabel}</span>
                    <span className="ui-pill admin-status">{occurrence.kind}</span>
                  </div>
                </header>
                <dl className="admin-sky-voice-facts">
                  <div><dt>First active</dt><dd>{occurrence.windows[0]?.startDate ?? "Not calculated"}</dd></div>
                  <div><dt>Last active</dt><dd>{occurrence.windows.at(-1)?.endDate ?? "Not calculated"}</dd></div>
                  <div><dt>Active days</dt><dd>{occurrence.activeDates.length}</dd></div>
                  <div><dt>Windows</dt><dd>{occurrence.windows.length}</dd></div>
                  {ownerApprovedArticleKey
                    ? <div><dt>Reader source</dt><dd><code>{ownerApprovedArticleKey}</code></dd></div>
                    : null}
                </dl>
                <div className="admin-sky-voice-body">{row?.body || "No saved draft exists yet. Create a manual draft to write this card, or run the separately authorized generation job."}</div>
                <div className="admin-review-queue-actions">
                  {ownerApprovedArticleKey ? (
                    <button type="button" onClick={() => void openServingFallbackRow(ownerApprovedArticleKey, occurrence)} disabled={isLoading}>
                      Edit serving article
                    </button>
                  ) : null}
                  {row ? <button type="button" onClick={() => openRow(row)}>Edit</button> : null}
                  {!row ? <button type="button" onClick={() => openMissingSkyDraft(occurrence)}>Create draft</button> : null}
                  {canApprove ? <button type="button" onClick={() => void approveAndScheduleSkyRow(row)} disabled={isLoading}>Approve &amp; schedule</button> : null}
                </div>
              </article>
            );
          })}
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

    const ownerApprovedArticleKey = ownerApprovedSkyPlacementArticleKey(currentDraft.contentKey);

    const isVocabularyDraft = draftIsVocabulary(currentDraft);
    const isArticleDraft = draftIsArticle(currentDraft);
    const isFallbackHookDraft = draftIsFallbackHook(currentDraft);
    const isTemplateDraft = draftIsTemplate(currentDraft);
    const isPackageDraft = draftIsFallbackArchitectureV3(currentDraft);
    const isGovernedSkyDraft = ["sky_aspect", "sky_placement"].includes(currentDraft.blockType);
    const skyDraftHasUnsavedCopy = Boolean(selectedRow && isGovernedSkyDraft && (
      currentDraft.headline !== (selectedRow.headline ?? "")
      || currentDraft.summary !== (selectedRow.summary ?? "")
      || currentDraft.body !== (selectedRow.body ?? "")
      || JSON.stringify(currentDraft.sections ?? {}) !== JSON.stringify(selectedRow.sections ?? {})
    ));
    const isNewDraft = !currentDraft.id;
    const vocabularySection = vocabularySectionFromKey(currentDraft.contentKey);
    const rawContentRole = contentRoleForDraft(currentDraft);
    const contentRole = contentRoleDetails(rawContentRole);
    const contentSystem = contentSystemForRole(rawContentRole);
    const fallbackDiagnostic = fallbackCompositionDiagnosticForDraft(currentDraft, rawContentRole);
    const fallbackReviewStatus = sourceSnapshotString(currentDraft.sourceSnapshot, "review_status")
      || sourceSnapshotString(currentDraft.sourceSnapshot, "reviewStatus")
      || fallbackHookReviewStatusForDraft(currentDraft);
    const packageReviewStatus = packageReviewStatusForDraft(currentDraft);
    const packageRecord = draftPackageRecord(currentDraft);
    const skyFallbackEditor = skyFallbackWorkspace(currentDraft.contentKey, currentDraft.sections);
    const skyFallbackContentIdentity = skyFallbackIdentity(currentDraft.contentKey);
    const effectiveSkyFallbackVariableTarget = skyFallbackEditor?.fields.some((field) => field.key === skyFallbackVariableTarget)
      ? skyFallbackVariableTarget
      : skyFallbackEditor?.fields.find((field) => field.key === "fact_line")?.key ?? skyFallbackEditor?.fields[0]?.key ?? "";
    const effectiveSkyFallback = effectivePackageRecord(currentDraft.sections);
    const skyFallbackChanges = packageDraftChanges(currentDraft.sections);
    const skyFallbackPreview = skyFallbackEditor
      ? renderWorkspacePreview(skyFallbackEditor.fields, skyFallbackPreviewFacts)
      : [];
    const packageRole = typeof packageRecord.content_role === "string" ? packageRecord.content_role : "";
    const isContinuousSkyPackage = isPackageDraft && packageRecord.render_policy === "sky-placement-continuous-v2";
    const showPackageBodyYou = isPackageDraft && !isContinuousSkyPackage && ("body_you" in packageRecord || "body_you" in (currentDraft.sections ?? {}));
    const showPackageBodyThey = isPackageDraft && ("body_they" in packageRecord || "body_they" in (currentDraft.sections ?? {}));
    const showGenericBody = !isPackageDraft || (!showPackageBodyYou && !isContinuousSkyPackage);
    const skyWriteupParent = skyWriteupParentId ? rows.find((row) => row.id === skyWriteupParentId) ?? null : null;
    const skyWriteupContext = selectedRow ? skyWriteupContextForRow(selectedRow) : null;
    const skyLunationContext = selectedRow ? skyLunationContextForRow(selectedRow) : null;
    const skyHousePassages = skyWriteupContext && !skyLunationContext ? relatedHousePassages(rows, skyWriteupContext) : [];
    const skyLunationHoroscopes = skyLunationContext ? relatedLunationHoroscopes(rows, skyLunationContext) : [];
    const sourceReadyLunationHoroscopes = skyLunationHoroscopes.filter((horoscope) => horoscope.sourceReady).length;
    const skyReaderReadyHousePassages = skyHousePassages.filter((passage) => (
      passage.availability === "Reader-ready" && isApprovedSkyRelationRow(passage.row)
    ));
    const skyAspectPassages = skyWriteupContext ? relatedAspectPassages(rows, skyWriteupContext) : [];
    const filteredSkyAspectPassages = skyAspectPassages.filter((row) => matchesAdminSearch(
      `${row.content_key} ${row.headline ?? ""} ${row.body ?? ""}`,
      skyRelatedAspectQuery
    ));
    const populatedSkyHouses = new Set(skyReaderReadyHousePassages.map((passage) => passage.house)).size;
    const candidateSkyHouses = new Set(skyHousePassages
      .filter((passage) => passage.availability === "Source candidate")
      .map((passage) => passage.house)).size;
    const isSkyArticleTemplate = isSkyArticleTemplateRow(selectedRow);
    const compiledSkyArticleEdition = compiledSkyArticleEditionForDraft(currentDraft);
    const isSkyArticleSourceDraft = draftEventType(currentDraft) === "sky-article-edition-source";
    const skyArticleChanges = skyArticleEditor
      ? skyArticleEditionFieldChanges(skyArticleEditor.baseEdition, skyArticleEditor.fields)
      : [];
    const isCmsSurfaceDraft = currentDraft.sourceSnapshot?.contentSystem === "cms-surface-override" || currentDraft.contentKey.startsWith("cms/");
    const cmsAllowedSlots = Array.isArray(currentDraft.sourceSnapshot?.allowedSlots)
      ? currentDraft.sourceSnapshot.allowedSlots.filter((slot): slot is string => typeof slot === "string")
      : [];
    const cmsTemplateValidation = validateCmsTemplate({
      allowedSlots: cmsAllowedSlots,
      headline: currentDraft.headline,
      summary: currentDraft.summary,
      body: currentDraft.body
    });
    const cmsCanSignOff = !isCmsSurfaceDraft || cmsTemplateValidation.errors.length === 0;
    const cmsReaderEligible = isCmsSurfaceDraft
      && currentDraft.status === "LIVE"
      && currentDraft.lane === "serving"
      && !currentDraft.reviewState
      && cmsCanSignOff;
    const skyArticleTemplateFields = isSkyArticleTemplate && selectedRow
      ? skyArticleTemplatePlaceholders(selectedRow.body ?? "").filter((placeholder) => placeholder.name !== "risingBlocks")
      : [];
    const skyArticleEditionFacts = skyArticleEditionForm?.facts ?? null;
    const skyArticleEditionContext = skyArticleEditionFacts
      ? { planet: skyArticleEditionFacts.planet, sign: skyArticleEditionFacts.sign }
      : null;
    const skyArticleEditionHouseRows = skyArticleEditionContext
      ? relatedHousePassages(rows, skyArticleEditionContext).filter((passage) => (
          passage.availability === "Reader-ready" && isApprovedSkyRelationRow(passage.row)
        ))
      : [];
    const skyArticleEditionHouseCoverage = new Set(skyArticleEditionHouseRows.map((passage) => passage.house)).size;
    const skyArticleEditionAspectCount = skyArticleEditionContext
      ? relatedAspectPassages(rows, skyArticleEditionContext).filter(isApprovedSkyRelationRow).length
      : 0;
    const skyArticleEditionMissingTemplateFields = skyArticleTemplateFields.filter((field) => (
      !Object.prototype.hasOwnProperty.call(skyArticleEditionForm?.slotValues ?? {}, field.name)
    ));
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
    const updateSkyArticleFields = (next: Partial<SkyArticleEditableFields>) => {
      setSkyArticleEditor((current) => current ? {
        ...current,
        fields: { ...current.fields, ...next },
        reviewOpen: false
      } : current);
    };
    const updateSkyArticleHouse = (contentKey: string, body: string) => {
      if (!skyArticleEditor) return;
      updateSkyArticleFields({
        housePassages: skyArticleEditor.fields.housePassages.map((passage) => (
          passage.contentKey === contentKey ? { ...passage, body } : passage
        ))
      });
    };
    const updateSkyArticleAspect = (contentKey: string, body: string) => {
      if (!skyArticleEditor) return;
      updateSkyArticleFields({
        aspectPassages: skyArticleEditor.fields.aspectPassages.map((passage) => (
          passage.contentKey === contentKey ? { ...passage, body } : passage
        ))
      });
    };
    const updateFallbackReviewStatus = (reviewStatus: string) => {
      setDraft({
        ...currentDraft,
        sourceSnapshot: {
          ...(currentDraft.sourceSnapshot ?? {}),
          review_status: reviewStatus
        }
      });
    };
    const updatePackageReviewStatus = (reviewStatus: string) => {
      setDraft({
        ...currentDraft,
        sourceSnapshot: {
          ...(currentDraft.sourceSnapshot ?? {}),
          review_status: reviewStatus
        },
        facts: {
          ...(currentDraft.facts ?? {}),
          review_status: reviewStatus
        },
        sections: {
          ...(currentDraft.sections ?? {}),
          packageRecord: {
            ...draftPackageRecord(currentDraft),
            review_status: reviewStatus
          }
        }
      });
    };
    const updatePackageEditorialNotes = (editorialNotes: string) => {
      setDraft({
        ...currentDraft,
        sections: {
          ...(currentDraft.sections ?? {}),
          packageRecord: {
            ...draftPackageRecord(currentDraft),
            editorial_notes: editorialNotes
          }
        }
      });
    };
    const updateSkyFallbackField = (field: string, value: string) => {
      const sections = objectRecord(currentDraft.sections) ?? {};
      const original = objectRecord(sections.packageRecord) ?? {};
      const currentPackageDraft = Object.keys(objectRecord(sections.packageDraft) ?? {}).length
        ? objectRecord(sections.packageDraft) ?? {}
        : structuredClone(original);
      setDraft({
        ...currentDraft,
        sections: {
          ...sections,
          packageDraft: setPackageValueAt(currentPackageDraft, field, value)
        },
        sourceSnapshot: {
          ...(currentDraft.sourceSnapshot ?? {}),
          review_status: "needs_review"
        },
        facts: {
          ...(currentDraft.facts ?? {}),
          review_status: "needs_review"
        }
      });
    };
    const insertSkyFallbackVariable = (variable: string) => {
      if (!skyFallbackEditor || !effectiveSkyFallbackVariableTarget) return;
      const target = skyFallbackEditor.fields.find((field) => field.key === effectiveSkyFallbackVariableTarget);
      if (!target) return;
      const spacer = target.value && !/\s$/u.test(target.value) ? " " : "";
      updateSkyFallbackField(target.key, `${target.value}${spacer}{{${variable}}}`);
    };
    const discardSkyFallbackProposal = () => {
      const sections = objectRecord(currentDraft.sections) ?? {};
      const { packageDraft: _discarded, ...withoutDraft } = sections;
      setDraft({ ...currentDraft, sections: withoutDraft });
    };
    const exportSkyFallbackProposal = () => {
      const sections = objectRecord(currentDraft.sections) ?? {};
      const payload = {
        schema: "tldrastro-fallback-architecture-v3-dashboard-edit-v2",
        exportedAt: new Date().toISOString(),
        contentKey: currentDraft.contentKey,
        packageOriginal: objectRecord(sections.packageRecord),
        proposedRecord: objectRecord(sections.packageDraft),
        changes: packageDraftChanges(sections)
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `${currentDraft.contentKey.replace(/[^a-z0-9]+/giu, "-")}-proposal.json`;
      link.click();
      URL.revokeObjectURL(href);
      setMessage(`Exported the ${currentDraft.contentKey} proposal with its package original and field diff.`);
    };
    const revertPackageDraft = () => {
      const original = draftPackageOriginalRecord(currentDraft);
      setDraft({
        ...currentDraft,
        headline: typeof original.headline === "string" ? original.headline : currentDraft.headline,
        summary: typeof original.summary === "string" ? original.summary : currentDraft.summary,
        body: typeof original.body === "string" ? original.body : typeof original.body_you === "string" ? original.body_you : currentDraft.body,
        sections: {
          ...(currentDraft.sections ?? {}),
          body_you: original.body_you ?? null,
          body_they: original.body_they ?? null,
          packageRecord: original
        },
        sourceSnapshot: {
          ...(currentDraft.sourceSnapshot ?? {}),
          review_status: typeof original.review_status === "string" ? original.review_status : packageReviewStatus
        },
        facts: {
          ...(currentDraft.facts ?? {}),
          review_status: typeof original.review_status === "string" ? original.review_status : packageReviewStatus
        }
      });
    };

    return (
      <>
      <button type="button" className="admin-editor-backdrop" aria-label="Close editor" onClick={closeEditor} />
      <aside ref={editorRef} className="admin-editor-panel admin-review-detail" role="dialog" aria-modal="true" aria-label="Generated content editor">
        {skyWriteupParent && (
          <button type="button" className="admin-sky-writeup-back" onClick={returnToSkyWriteup}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to {rowTitle(skyWriteupParent)}
          </button>
        )}
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
          {isFallbackHookDraft && !skyFallbackEditor && (
            <div className="admin-editor-guidance" aria-label="Fallback hook guidance">
              <strong>Fallback system hook</strong>
              <p>This row supports the fallback system. It should stay simple, safe, and reviewable; it is not treated as an authored dashboard article.</p>
            </div>
          )}
          {isTemplateDraft && (
            <div className="admin-editor-guidance" aria-label="Template source guidance">
              <strong>Fallback source material</strong>
              <p>Templates and slots assemble fallback language from reviewed source phrases. Edit them as scaffolds, not as final authored reader prose.</p>
            </div>
          )}
          {isCmsSurfaceDraft && (
            <div className="admin-editor-guidance" aria-label="CMS surface template guidance">
              <strong>Reader-facing CMS override</strong>
              <p>A published row replaces prose on the named app surface immediately. Astrology facts remain calculated by the app and can enter this copy only through the allowed slots below.</p>
              <p><strong>Allowed slots:</strong> {cmsAllowedSlots.length > 0 ? cmsAllowedSlots.map((slot) => `{{${slot}}}`).join(", ") : "This row has no calculated slots."}</p>
              <p>Save as Draft while editing. Publish only when the exact wording is approved; draft and reviewed rows remain invisible to readers.</p>
              <p><strong>Reader status:</strong> {cmsReaderEligible ? "LIVE and reader-eligible." : "Not serving. The existing approved fallback remains visible."}</p>
              {cmsTemplateValidation.errors.length > 0 ? (
                <div role="alert" aria-label="CMS template errors">
                  <strong>Fix before Sign Off</strong>
                  <ul>{cmsTemplateValidation.errors.map((error) => <li key={error}>{error}</li>)}</ul>
                </div>
              ) : (
                <div aria-label="CMS template preview">
                  <strong>Preview with representative chart facts</strong>
                  {currentDraft.headline.trim() && <h4>{renderCmsTemplatePreview(currentDraft.headline, cmsTemplateValidation.previewSlots, "headline")}</h4>}
                  {currentDraft.summary.trim() && <p>{renderCmsTemplatePreview(currentDraft.summary, cmsTemplateValidation.previewSlots, "summary")}</p>}
                  <p>{renderCmsTemplatePreview(currentDraft.body, cmsTemplateValidation.previewSlots, "body")}</p>
                  {cmsTemplateValidation.usedSlots.length > 0 && <small>Slots used: {cmsTemplateValidation.usedSlots.map((slot) => `{{${slot}}}`).join(", ")}</small>}
                </div>
              )}
            </div>
          )}
          <section className="admin-content-role-panel" aria-label="Content role">
            <div>
              <p className="admin-eyebrow">Content role</p>
              <h3>{skyFallbackContentIdentity?.typeLabel ?? contentRole.label}</h3>
            </div>
            <p>{skyFallbackContentIdentity
              ? `Reader-facing ${skyFallbackContentIdentity.groupLabel.toLowerCase()} content. Its internal fallback key remains visible for traceability.`
              : contentRole.detail}</p>
            {contentRole.label === "Fallback source/helper" && (
              <p><strong>Reader rule:</strong> this text can support the fallback system, but it cannot appear as a standalone authored write-up.</p>
            )}
          </section>
          {ownerApprovedArticleKey && (
            <section className="admin-editor-guidance" aria-label="Reader source status">
              <strong>{ownerApprovedReplacementLabel}</strong>
              <p>
                Readers receive <code>{ownerApprovedArticleKey}</code>, not this generated candidate.
              </p>
              <button
                type="button"
                onClick={() => void openOwnerApprovedSkyPlacementArticle(ownerApprovedArticleKey, currentDraft.headline || titleFromKey(currentDraft.contentKey))}
                disabled={isLoading}
              >
                Open owner-approved source
              </button>
            </section>
          )}
          {skyFallbackEditor && (
            <section className="admin-fallback-diagnostic-panel" aria-label={skyFallbackEditor.title}>
              <header className="admin-sky-related-heading admin-fallback-diagnostic-heading">
                <div>
                  <p className="admin-eyebrow">Reader source workspace</p>
                  <h3>{skyFallbackContentIdentity?.title ?? skyFallbackEditor.title}</h3>
                  <p><strong>{skyFallbackContentIdentity?.typeLabel ?? skyFallbackEditor.title}.</strong> See the complete reader copy, calculated facts, related passages, and every proposed change in one place.</p>
                </div>
                <dl className="admin-hook-pattern-list">
                  <div><dt>Serving key</dt><dd><code>{currentDraft.contentKey}</code></dd></div>
                  <div><dt>Render policy</dt><dd>{String(effectiveSkyFallback.render_policy ?? "Package renderer")}</dd></div>
                  <div><dt>Current approval</dt><dd>{String(packageRecord.review_status ?? packageReviewStatus)}</dd></div>
                  <div><dt>Proposal</dt><dd>{skyFallbackChanges.length ? `${skyFallbackChanges.length} changed field${skyFallbackChanges.length === 1 ? "" : "s"}` : "No changes"}</dd></div>
                </dl>
              </header>

              <div className="admin-editor-guidance" role="note">
                <strong>Safe editing boundary</strong>
                <p>The package original remains immutable. Saving here creates a non-serving proposal with <code>needs_review</code> status. It does not change the app until the exact diff is owner-approved, landed in source, regenerated, and deployed.</p>
              </div>

              <section className="admin-hook-detail-section admin-copy-preview" aria-label="Rendered fallback preview">
                <p className="admin-eyebrow">Reader preview</p>
                <h3>{skyFallbackContentIdentity?.title || currentDraft.headline || titleFromKey(currentDraft.contentKey)}</h3>
                {skyFallbackEditor.fields.find((field) => field.key === "fact_line") ? (
                  <p className="admin-field-hint">{renderWorkspacePreview(
                    [{ ...skyFallbackEditor.fields.find((field) => field.key === "fact_line")!, key: "date_line" }],
                    skyFallbackPreviewFacts
                  )[0] ?? skyFallbackEditor.fields.find((field) => field.key === "fact_line")?.value}</p>
                ) : null}
                {skyFallbackPreview.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}
                {skyFallbackEditor.variables.some((variable) => !skyFallbackPreviewFacts[variable]) && (
                  <small className="admin-field-hint">Unfilled tokens remain visible until this workspace is opened from a calculated Sky occurrence.</small>
                )}
              </section>

              {skyFallbackEditor.variables.length > 0 && (
                <section className="admin-hook-detail-section admin-calculated-facts" aria-label="Calculated facts">
                  <div>
                    <p className="admin-eyebrow">Engine-supplied values</p>
                    <h3>Calculated facts</h3>
                    <p>These tokens are the only variables. The article fields below are complete reader paragraphs.</p>
                  </div>
                  <label className="admin-field-wide">
                    <span>Insert into article field</span>
                    <select aria-label="Calculated fact target field" value={effectiveSkyFallbackVariableTarget} onChange={(event) => setSkyFallbackVariableTarget(event.target.value)}>
                      {skyFallbackEditor.fields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                    </select>
                  </label>
                  <div className="admin-token-list" role="group" aria-label="Available calculated facts">
                    {skyFallbackEditor.variables.map((variable) => (
                      <button type="button" key={variable} onClick={() => insertSkyFallbackVariable(variable)}>{`{{${variable}}}`}</button>
                    ))}
                  </div>
                </section>
              )}

              <section className="admin-sky-edition-fields" aria-label="Editable fallback fields">
                <header>
                  <p className="admin-eyebrow">Editable copy</p>
                  <h3>{skyFallbackEditor.kind === "article" ? "Article paragraphs" : "Aspect audience versions"}</h3>
                  <p>{skyFallbackEditor.kind === "article"
                    ? "Each field is a section of the complete article, not a reusable variable."
                    : "Each field is the complete aspect passage for its named reader surface."}</p>
                </header>
                {skyFallbackEditor.fields.map((field) => (
                  <label className="admin-review-copy-editor" key={field.key}>
                    <span>{field.label}</span>
                    <small className="admin-field-hint">Internal source field: <code>{field.key}</code></small>
                    <textarea
                      aria-label={`Fallback field ${field.label}`}
                      value={field.value}
                      onChange={(event) => updateSkyFallbackField(field.key, event.target.value)}
                    />
                  </label>
                ))}
              </section>

              <section className="admin-hook-detail-section" aria-label="Review fallback changes">
                <div className="admin-fallback-diagnostic-heading">
                  <div>
                    <p className="admin-eyebrow">Review diff</p>
                    <h3>{skyFallbackChanges.length ? "Proposed changes" : "Nothing changed"}</h3>
                  </div>
                  {skyFallbackChanges.length > 0 && (
                    <div className="admin-toolbar-actions">
                      <button type="button" onClick={exportSkyFallbackProposal}>Export proposal</button>
                      <button type="button" onClick={discardSkyFallbackProposal}>Discard proposal</button>
                    </div>
                  )}
                </div>
                {skyFallbackChanges.map((change) => (
                  <article className="admin-sky-article-diff" key={change.key}>
                    <div><strong>{change.label} · package original</strong><p>{change.before}</p></div>
                    <div><strong>{change.label} · proposal</strong><p>{change.after}</p></div>
                  </article>
                ))}
              </section>
            </section>
          )}
          {isSkyArticleTemplate && selectedRow && skyArticleEditionForm && (
            <section className="admin-sky-edition-builder admin-fallback-diagnostic-panel" aria-label="Create an article edition from this template">
              <header className="admin-sky-related-heading admin-fallback-diagnostic-heading">
                <div>
                  <p className="admin-eyebrow">Executable article template</p>
                  <h3>Create a complete edition</h3>
                  <p>
                    The template remains non-serving. Content Studio combines its fixed prose with calculated residency facts,
                    edition-specific fields, twelve approved house horoscopes, and approved natal-aspect passages.
                  </p>
                </div>
                <div>
                  <code>{selectedRow.content_key}</code>
                  <p className="admin-field-hint" aria-live="polite">
                    {skyArticleEditionForm.saveState === "saving" ? "Saving draft…"
                      : skyArticleEditionForm.saveState === "unsaved" ? "Unsaved changes"
                        : skyArticleEditionForm.saveState === "error" ? "Autosave failed"
                          : skyArticleEditionForm.saveState === "saved" ? "Draft saved automatically" : "Not saved yet"}
                  </p>
                </div>
              </header>
              <div className="admin-sky-edition-facts-row">
                <label className="admin-title-field">
                  <span>Reference date</span>
                  <input
                    aria-label="Sky article reference date"
                    type="date"
                    value={skyArticleEditionForm.referenceDate}
                    onChange={(event) => setSkyArticleEditionForm({
                      ...skyArticleEditionForm,
                      referenceDate: event.target.value,
                      facts: null,
                      tldr: "",
                      slotValues: {},
                      slotGeneration: null,
                      factBlockedSlots: [],
                      saveState: "idle",
                      workspaceId: null
                    })}
                  />
                  <small className="admin-field-hint">The ephemeris uses this date to identify the active sign and complete residency window.</small>
                </label>
                <button type="button" onClick={() => void loadSkyArticleEditionFacts(selectedRow)} disabled={isLoading}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Load calculated facts
                </button>
              </div>
              {skyArticleEditionFacts && (
                <>
                  <dl className="admin-hook-pattern-list">
                    <div><dt>Calculated placement</dt><dd>{titleFromKey(skyArticleEditionFacts.planet)} in {titleFromKey(skyArticleEditionFacts.sign)}</dd></div>
                    <div><dt>Validity window</dt><dd>{skyArticleEditionFacts.validFrom} through {skyArticleEditionFacts.validTo}</dd></div>
                    <div><dt>House coverage</dt><dd>{skyArticleEditionHouseCoverage}/12 approved</dd></div>
                    <div><dt>Aspect passages</dt><dd>{skyArticleEditionAspectCount} approved</dd></div>
                  </dl>
                  <section className="admin-hook-detail-section" aria-label="Article completion checklist">
                    <p className="admin-eyebrow">Publication checklist</p>
                    <ul>
                      <li>{skyArticleEditionForm.tldr.trim() ? "✓" : "○"} Explicit TL;DR</li>
                      <li>{skyArticleEditionMissingTemplateFields.length === 0 ? "✓" : "○"} Article fields ({skyArticleTemplateFields.length - skyArticleEditionMissingTemplateFields.length}/{skyArticleTemplateFields.length})</li>
                      <li>{skyArticleEditionHouseCoverage === 12 ? "✓" : "○"} House passages ({skyArticleEditionHouseCoverage}/12)</li>
                      <li>✓ Calculated residency facts</li>
                    </ul>
                  </section>
                  <div className="admin-toolbar-actions">
                    <button
                      type="button"
                      onClick={() => void generateSkyArticleEditionSlots(selectedRow)}
                      disabled={isLoading}
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      Generate unfinished fields
                    </button>
                    <small className="admin-field-hint">
                      Explicit action only. Sends this approved template, calculated facts, and unfinished field names to the configured writing provider. Fixed owner prose is never rewritten.
                    </small>
                  </div>
                  {skyArticleEditionForm.slotGeneration && (
                    <p className="admin-field-hint">
                      Drafted {skyArticleEditionForm.slotGeneration.requestedSlots.length} field{skyArticleEditionForm.slotGeneration.requestedSlots.length === 1 ? "" : "s"} with {skyArticleEditionForm.slotGeneration.provider} / {skyArticleEditionForm.slotGeneration.model}. Review every field before compilation.
                    </p>
                  )}
                  {skyArticleEditionForm.factBlockedSlots.length > 0 && (
                    <p className="admin-field-hint">
                      Not sent to the model because they require governed dates, aspects, or historical sources: {skyArticleEditionForm.factBlockedSlots.map((slot) => slot.name).join(", ")}.
                    </p>
                  )}
                  <label className="admin-review-copy-editor">
                    <span>TL;DR · explicit edition copy</span>
                    <textarea
                      aria-label="Sky article edition TL;DR"
                      value={skyArticleEditionForm.tldr}
                      onChange={(event) => setSkyArticleEditionForm({
                        ...skyArticleEditionForm,
                        tldr: event.target.value
                      })}
                      placeholder="Write the short TL;DR shown in the Transits list and at the top of the full reading."
                    />
                    <small className="admin-field-hint">
                      This is a separately written part of the same canonical article. The app will not derive it from the opening or generate another card at runtime.
                    </small>
                  </label>
                  <div className="admin-sky-edition-fields">
                    {skyArticleTemplateFields.map((placeholder) => {
                      const engineOwned = Object.prototype.hasOwnProperty.call(skyArticleEditionFacts.slotValues, placeholder.name);
                      const generated = skyArticleEditionForm.slotGeneration?.requestedSlots.includes(placeholder.name) ?? false;
                      return (
                        <label className="admin-review-copy-editor" key={placeholder.name}>
                          <span>{placeholder.name}{engineOwned ? " · calculated" : generated ? " · AI draft" : ""}</span>
                          <textarea
                            aria-label={`Template field ${placeholder.name}`}
                            value={skyArticleEditionForm.slotValues[placeholder.name] ?? ""}
                            disabled={engineOwned}
                            onChange={(event) => setSkyArticleEditionForm({
                              ...skyArticleEditionForm,
                              slotValues: { ...skyArticleEditionForm.slotValues, [placeholder.name]: event.target.value }
                            })}
                            placeholder={placeholder.description || `Write the ${placeholder.name} edition passage.`}
                          />
                          {placeholder.description && <small className="admin-field-hint">{placeholder.description}</small>}
                          {!engineOwned && skyArticleEditionForm.slotValues[placeholder.name] === undefined && (
                            <button type="button" onClick={() => setSkyArticleEditionForm({
                              ...skyArticleEditionForm,
                              slotValues: { ...skyArticleEditionForm.slotValues, [placeholder.name]: "" }
                            })}>
                              Deliberately leave this block blank
                            </button>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <div className="admin-toolbar-actions">
                    <button
                      className="admin-primary-button"
                      type="button"
                      onClick={() => void createSkyArticleEdition(selectedRow)}
                      disabled={isLoading || skyArticleEditionHouseCoverage < 12 || !skyArticleEditionForm.tldr.trim() || skyArticleEditionMissingTemplateFields.length > 0}
                      title={skyArticleEditionHouseCoverage < 12
                        ? "All 12 approved house horoscopes are required before compilation."
                        : !skyArticleEditionForm.tldr.trim()
                          ? "Write the edition TL;DR before compilation."
                          : skyArticleEditionMissingTemplateFields.length > 0
                            ? `Complete or deliberately leave blank: ${skyArticleEditionMissingTemplateFields.map((field) => field.name).join(", ")}.`
                          : "Compile a non-serving edition draft."}
                    >
                      <Plus size={16} aria-hidden="true" />
                      Compile edition draft
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
          {compiledSkyArticleEdition && (
            <section className="admin-sky-edition-builder admin-fallback-diagnostic-panel" aria-label="Compiled Sky article edition">
              <div className="admin-fallback-diagnostic-heading">
                <div>
                  <p className="admin-eyebrow">Compiled article edition</p>
                  <h3>{compiledSkyArticleEdition.planet} in {compiledSkyArticleEdition.sign}</h3>
                </div>
                <strong>{compiledSkyArticleEdition.validFrom} through {compiledSkyArticleEdition.validTo}</strong>
              </div>
              <p>This saved row contains no unresolved placeholders and includes all twelve house horoscopes. It remains dark until you use the explicit approval action below.</p>
              <div className="admin-hook-detail-section">
                <strong>TL;DR</strong>
                <p>{compiledSkyArticleEdition.tldr}</p>
              </div>
              <dl className="admin-hook-pattern-list">
                <div><dt>Template</dt><dd>{compiledSkyArticleEdition.templateKey}</dd></div>
                <div><dt>Template hash</dt><dd><code>{compiledSkyArticleEdition.templateHash.slice(0, 12)}</code></dd></div>
                <div><dt>Compiled hash</dt><dd><code>{compiledSkyArticleEdition.compiledHash.slice(0, 12)}</code></dd></div>
                <div><dt>House horoscopes</dt><dd>{compiledSkyArticleEdition.housePassages.length}/12</dd></div>
                <div><dt>Aspect passages</dt><dd>{compiledSkyArticleEdition.aspectPassages.length}</dd></div>
              </dl>
              {skyArticleEditor && (
                <div className="admin-sky-article-editor" aria-label="Edit Sky article">
                  <header className="admin-sky-related-heading admin-fallback-diagnostic-heading">
                    <div>
                      <p className="admin-eyebrow">Article editor</p>
                      <h3>Edit the reader experience</h3>
                      <p>Drafts save automatically. Readers continue to receive the current published edition until you review and publish all changes together.</p>
                    </div>
                    <strong aria-live="polite">
                      {skyArticleEditor.saveState === "saving" ? "Saving…"
                        : skyArticleEditor.saveState === "unsaved" ? "Unsaved changes"
                          : skyArticleEditor.saveState === "error" ? "Autosave failed"
                            : "Saved"}
                    </strong>
                  </header>
                  {skyArticleEditor.error && <p className="admin-inline-error">{skyArticleEditor.error}</p>}

                  <label className="admin-title-field">
                    <span>Headline</span>
                    <input
                      aria-label="Sky article headline"
                      value={skyArticleEditor.fields.headline}
                      onChange={(event) => updateSkyArticleFields({ headline: event.target.value })}
                    />
                  </label>
                  <label className="admin-review-copy-editor">
                    <span>TL;DR</span>
                    <textarea
                      aria-label="Sky article TL;DR"
                      value={skyArticleEditor.fields.tldr}
                      onChange={(event) => updateSkyArticleFields({ tldr: event.target.value })}
                    />
                    <small className="admin-field-hint">Written explicitly. It appears in the Transits list and at the top of the full reading.</small>
                  </label>
                  <label className="admin-review-copy-editor">
                    <span>General article</span>
                    <textarea
                      aria-label="Sky article general copy"
                      value={skyArticleEditor.fields.body}
                      onChange={(event) => updateSkyArticleFields({ body: event.target.value })}
                    />
                  </label>

                  <details className="admin-sky-related-group admin-diagnostics-details">
                    <summary>
                      <span>House passages</span>
                      <strong>{skyArticleEditor.fields.housePassages.length}/12 complete</strong>
                    </summary>
                    <div className="admin-sky-house-grid admin-lunar-coverage-row-list">
                      {skyArticleEditor.fields.housePassages.map((passage) => (
                        <label className="admin-review-copy-editor" key={passage.contentKey}>
                          <span>{ordinalLabel(passage.house)} House{passage.risingSign ? ` · ${titleFromKey(passage.risingSign)} Rising` : ""}</span>
                          <textarea
                            aria-label={`Sky article House ${passage.house}`}
                            value={passage.body}
                            onChange={(event) => updateSkyArticleHouse(passage.contentKey, event.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </details>

                  {skyArticleEditor.fields.aspectPassages.length > 0 && (
                    <details className="admin-sky-related-group admin-diagnostics-details">
                      <summary>
                        <span>Natal-aspect passages</span>
                        <strong>{skyArticleEditor.fields.aspectPassages.length}</strong>
                      </summary>
                      <div className="admin-sky-aspect-list admin-lunar-coverage-row-list">
                        {skyArticleEditor.fields.aspectPassages.map((passage) => (
                          <label className="admin-review-copy-editor" key={passage.contentKey}>
                            <span>{titleFromKey(passage.natalPoint)} · {titleFromKey(passage.aspect)}</span>
                            <textarea
                              aria-label={`Sky article ${passage.natalPoint} ${passage.aspect}`}
                              value={passage.body}
                              onChange={(event) => updateSkyArticleAspect(passage.contentKey, event.target.value)}
                            />
                          </label>
                        ))}
                      </div>
                    </details>
                  )}

                  <section className="admin-hook-detail-section" aria-label="Reader preview">
                    <p className="admin-eyebrow">Reader preview</p>
                    <h3>{skyArticleEditor.fields.headline}</h3>
                    <p><strong>TL;DR:</strong> {skyArticleEditor.fields.tldr}</p>
                    <div className="admin-copy-preview">{skyArticleEditor.fields.body}</div>
                  </section>

                  <div className="admin-toolbar-actions admin-sky-article-sticky-actions">
                    <span>{skyArticleChanges.length} changed field{skyArticleChanges.length === 1 ? "" : "s"}</span>
                    {skyArticleChanges.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSkyArticleEditor((current) => current ? { ...current, reviewOpen: !current.reviewOpen } : current)}
                      >
                        Review {skyArticleChanges.length} change{skyArticleChanges.length === 1 ? "" : "s"}
                      </button>
                    ) : selectedRow && currentDraft.status !== "LIVE" ? (
                      <button type="button" onClick={() => void approveSkyArticleEdition(selectedRow)} disabled={isLoading}>
                        <Check size={16} aria-hidden="true" />
                        Approve &amp; publish complete edition
                      </button>
                    ) : (
                      <span>Published copy is unchanged.</span>
                    )}
                  </div>

                  {skyArticleEditor.reviewOpen && (
                    <section className="admin-sky-article-review" aria-label="Review Sky article changes">
                      <header>
                        <p className="admin-eyebrow">Before publishing</p>
                        <h3>Review only what changed</h3>
                      </header>
                      {skyArticleChanges.map((change: SkyArticleFieldChange) => (
                        <article className="admin-hook-detail-section" key={change.fieldId}>
                          <h4>{change.label}</h4>
                          <div className="admin-sky-article-diff">
                            <div><strong>Current live copy</strong><p>{change.before || "Empty"}</p></div>
                            <div><strong>Proposed copy</strong><p>{change.after || "Empty"}</p></div>
                          </div>
                        </article>
                      ))}
                      <button
                        className="admin-primary-button"
                        type="button"
                        onClick={() => void publishSkyArticleChanges()}
                        disabled={isLoading || skyArticleEditor.saveState !== "saved" || skyArticleChanges.length === 0}
                        title={skyArticleEditor.saveState !== "saved" ? "Wait for autosave to finish before publishing." : "Publish the complete validated article revision."}
                      >
                        <Check size={16} aria-hidden="true" />
                        Publish changes
                      </button>
                    </section>
                  )}
                </div>
              )}
            </section>
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
          {!compiledSkyArticleEdition && !skyFallbackEditor && (
            <label className="admin-title-field">
              <span>{isVocabularyDraft ? "Phrase title" : "Headline"}</span>
              <input aria-label={isVocabularyDraft ? "Phrase title" : "Headline"} value={currentDraft.headline} onChange={(event) => updateHeadline(event.target.value)} placeholder={isVocabularyDraft ? "Example: Moon phase / Balsamic / Reflection" : undefined} />
              {isVocabularyDraft && <small className="admin-field-hint">This is the human name editors see in the table. New rows use it to generate the internal key.</small>}
            </label>
          )}
          {!compiledSkyArticleEdition && !skyFallbackEditor && (
            <label className="admin-review-copy-editor">
              <span>{isVocabularyDraft ? "Editor note or grouping detail" : isSkyArticleSourceDraft ? "TL;DR" : "Summary"}</span>
              <textarea aria-label={isVocabularyDraft ? "Editor note or grouping detail" : isSkyArticleSourceDraft ? "Sky article TL;DR" : "Summary"} value={currentDraft.summary} onChange={(event) => setDraft({ ...currentDraft, summary: event.target.value })} placeholder={isVocabularyDraft ? "Optional: where this phrase should be used, tone notes, or related variants." : isSkyArticleSourceDraft ? "Write the explicit TL;DR for this article edition." : undefined} />
              {isSkyArticleSourceDraft && <small className="admin-field-hint">Saved as non-serving source copy until the complete edition is compiled, reviewed, and published.</small>}
            </label>
          )}
          {showPackageBodyYou && !skyFallbackEditor && (
            <label className="admin-review-copy-editor">
              <span>body_you</span>
              <textarea aria-label="body_you" value={packageFieldString(currentDraft, "body_you")} onChange={(event) => setDraft(setPackageSectionField(currentDraft, "body_you", event.target.value))} />
            </label>
          )}
          {isContinuousSkyPackage && !skyFallbackEditor && ([
            ["opening", "Opening"],
            ["tension", "Tension"],
            ["development", "Development"],
            ["close", "Close"]
          ] as const).map(([field, label]) => (
            <label className="admin-review-copy-editor" key={field}>
              <span>{label}</span>
              <textarea
                aria-label={`Continuous Sky ${label}`}
                value={typeof packageRecord[field] === "string" ? packageRecord[field] as string : ""}
                onChange={(event) => setDraft(setPackageRecordField(currentDraft, field, event.target.value))}
              />
            </label>
          ))}
          {showPackageBodyThey && !skyFallbackEditor && (
            <label className="admin-review-copy-editor">
              <span>body_they</span>
              <textarea aria-label="body_they" value={packageFieldString(currentDraft, "body_they")} onChange={(event) => setDraft(setPackageSectionField(currentDraft, "body_they", event.target.value))} />
            </label>
          )}
          {!compiledSkyArticleEdition && showGenericBody && !skyFallbackEditor && (
            <label className="admin-review-copy-editor">
              <span>{isVocabularyDraft ? "Reusable phrase text" : "Body"}</span>
              <textarea aria-label={isVocabularyDraft ? "Reusable phrase text" : "Body"} value={currentDraft.body} onChange={(event) => setDraft({ ...currentDraft, body: event.target.value })} placeholder={isVocabularyDraft ? "Write the reusable wording or phrase pattern here." : undefined} />
            </label>
          )}
          {skyWriteupContext && selectedRow && (
            <section className="admin-sky-related-editor admin-fallback-diagnostic-panel" aria-label="Related reader horoscope passages">
              <header className="admin-sky-related-heading admin-fallback-diagnostic-heading">
                <div>
                  <p className="admin-eyebrow">{skyLunationContext ? "Lunation workspace" : "Reader horoscope passages"}</p>
                  <h3>{skyLunationContext ? "Review the write-up, aspects, and rising-sign horoscopes" : "Review the personalized copy from this Sky write-up"}</h3>
                  <p>
                    {skyLunationContext
                      ? "The macro write-up stays first. Moon-to-natal aspect passages follow it, and the twelve rising-sign horoscope compositions stay at the bottom. Editing a source opens the canonical row the app actually uses."
                      : "These rows are selected after the app knows which house this placement activates and whether it aspects a natal placement. Editing a passage here opens its canonical saved row."}
                  </p>
                </div>
                <dl className="admin-hook-pattern-list">
                  <div><dt>{skyLunationContext ? "Lunation" : "Placement"}</dt><dd>{skyLunationContext ? `${titleFromKey(skyLunationContext.sign)} ${titleFromKey(skyLunationContext.kind)}` : `${titleFromKey(skyWriteupContext.planet)}${skyWriteupContext.sign ? ` in ${titleFromKey(skyWriteupContext.sign)}` : ""}`}</dd></div>
                  <div><dt>Aspect passages</dt><dd>{skyAspectPassages.length}</dd></div>
                  {skyLunationContext ? (
                    <div><dt>Rising horoscopes</dt><dd>{sourceReadyLunationHoroscopes}/12 source-ready</dd></div>
                  ) : (
                    <>
                      <div><dt>Reader-ready houses</dt><dd>{populatedSkyHouses}/12</dd></div>
                      <div><dt>Source candidates</dt><dd>{candidateSkyHouses}/12 houses</dd></div>
                    </>
                  )}
                </dl>
              </header>

              <details className="admin-sky-related-group admin-diagnostics-details" open={Boolean(skyFallbackEditor)}>
                <summary>
                  <span>Aspect passages</span>
                  {" "}
                  <strong>{skyAspectPassages.length} rows</strong>
                </summary>
                <p className="admin-sky-related-help">
                  These passages can appear beneath the horoscope when the transiting Moon or placement aspects something in the reader’s natal chart.
                </p>
                <label className="admin-sky-related-search">
                  <span>Find an aspect passage</span>
                  <div className="admin-search-input-shell">
                    <Search size={15} aria-hidden="true" />
                    <input
                      aria-label="Find an aspect passage"
                      value={skyRelatedAspectQuery}
                      onChange={(event) => setSkyRelatedAspectQuery(event.target.value)}
                      placeholder="Natal planet, aspect, title, or wording"
                    />
                  </div>
                </label>
                <div className="admin-sky-aspect-list admin-lunar-coverage-row-list">
                  {filteredSkyAspectPassages.map((row) => (
                    <article className="admin-sky-related-row admin-hook-detail-section" key={row.id}>
                      <div>
                        <strong>{rowTitle(row)}</strong>
                        <code>{row.content_key}</code>
                        <p>{row.body || "No aspect passage body saved."}</p>
                      </div>
                      <div className="admin-surface-actions">
                        <button type="button" onClick={() => openRelatedSkyRow(selectedRow.id, row)}>
                          Edit reusable source
                        </button>
                        <button type="button" onClick={() => openSkyAspectCmsStarter(row, skyWriteupContext)}>
                          Edit house-aware reader override
                        </button>
                      </div>
                    </article>
                  ))}
                  {!filteredSkyAspectPassages.length && (
                    <p className="admin-empty">
                      {skyAspectPassages.length ? "No aspect passages match this search." : "No natal-aspect passages are saved for this placement."}
                    </p>
                  )}
                </div>
              </details>

              {skyLunationContext ? (
                <details className="admin-sky-related-group admin-diagnostics-details" open={Boolean(skyFallbackEditor)}>
                  <summary>
                    <span>Rising-sign horoscopes</span>
                    {" "}
                    <strong>{sourceReadyLunationHoroscopes}/12 source-ready</strong>
                  </summary>
                  <p className="admin-sky-related-help">
                    The app assembles these twelve horoscopes from the saved frame, house opening, house jurisdiction, and lunation-sign focus below. Exact-date ruler and retrograde layers are calculated later, so the dashboard does not store twelve duplicate final articles.
                  </p>
                  <div className="admin-sky-house-grid admin-lunar-coverage-row-list">
                    {skyLunationHoroscopes.map((horoscope) => (
                      <article key={horoscope.risingSign} className={`admin-hook-detail-section ${horoscope.sourceReady ? "has-passage" : "is-missing"}`}>
                        <header className="admin-fallback-diagnostic-heading">
                          <strong>{titleFromKey(horoscope.risingSign)} Rising · {ordinalLabel(horoscope.house)} House</strong>
                          <span>{horoscope.sourceReady ? "Source-ready" : "Missing required source"}</span>
                        </header>
                        <div className="admin-copy-preview">
                          {horoscope.preview
                            ? horoscope.preview.split(/\n{2,}/u).map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                            : <p>No base horoscope preview can be assembled yet.</p>}
                        </div>
                        <div className="admin-sky-aspect-list">
                          {horoscope.sources.map((source) => (
                            <div className="admin-sky-related-row admin-hook-detail-section" key={`${source.role}-${source.row.id}`}>
                              <div>
                                <span>{source.role}</span>
                                <code>{source.row.content_key}</code>
                              </div>
                              <button type="button" onClick={() => openRelatedSkyRow(selectedRow.id, source.row)}>
                                Edit source
                              </button>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </details>
              ) : (
                <details className="admin-sky-related-group admin-diagnostics-details" open={Boolean(skyFallbackEditor)}>
                  <summary>
                    <span>House horoscopes</span>
                    {" "}
                    <strong>{populatedSkyHouses}/12 reader-ready</strong>
                  </summary>
                  <p className="admin-sky-related-help">
                    Only an approved complete Sky house horoscope can serve on this placement page. House introductions, generic house passages, and older sign-specific transit passages remain visible as source candidates; the app will not substitute them silently.
                  </p>
                  <div className="admin-sky-house-grid admin-lunar-coverage-row-list">
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((house) => {
                      const passages = skyHousePassages.filter((passage) => passage.house === house);
                      return (
                        <article key={house} className={`admin-hook-detail-section ${passages.length ? "has-passage" : "is-missing"}`}>
                          <header className="admin-fallback-diagnostic-heading">
                            <strong>{ordinalLabel(house)} House</strong>
                            <span>{passages.length ? `${passages.length} field${passages.length === 1 ? "" : "s"}` : "Not saved"}</span>
                          </header>
                          {passages.map((passage) => (
                            <div className="admin-sky-related-row admin-hook-detail-section" key={passage.row.id}>
                              <div>
                                <span>{passage.kind} · {passage.availability}</span>
                                <code>{passage.row.content_key}</code>
                                <p>{passage.row.body || "No passage body saved."}</p>
                              </div>
                              <button type="button" onClick={() => openRelatedSkyRow(selectedRow.id, passage.row)}>
                                Edit passage
                              </button>
                            </div>
                          ))}
                          {!passages.length && <p>No house-horoscope row matches this placement and sign.</p>}
                        </article>
                      );
                    })}
                  </div>
                </details>
              )}
            </section>
          )}
          {fallbackDiagnostic && (
            <section className="admin-fallback-diagnostic-panel" aria-label="Fallback composition check">
              <div className="admin-fallback-diagnostic-heading">
                <div>
                  <p className="admin-eyebrow">Fallback system</p>
                  <h3>{fallbackDiagnostic.title}</h3>
                </div>
                <strong>{fallbackDiagnostic.status}</strong>
              </div>
              <p>{fallbackDiagnostic.body}</p>
              <div className="admin-fallback-diagnostic-grid">
                <div>
                  <span>Template</span>
                  <code>{fallbackDiagnostic.template}</code>
                </div>
                <div>
                  <span>Assembled slots</span>
                  <ul>
                    {fallbackDiagnostic.slots.map((slot) => <li key={slot}><code>{slot}</code></li>)}
                  </ul>
                </div>
                <div>
                  <span>Source lanes</span>
                  <ul>
                    {fallbackDiagnostic.sourceLanes.map((lane) => <li key={lane}><code>{lane}</code></li>)}
                  </ul>
                </div>
              </div>
              <p><strong>Fix path:</strong> {fallbackDiagnostic.action}</p>
            </section>
          )}
          {isPackageDraft && (
            <section className="admin-package-edit-panel" aria-label="Package row details">
              <div>
                <span>content key</span>
                <code>{currentDraft.contentKey}</code>
              </div>
              <div>
                <span>role</span>
                <strong>{packageRole || "package row"}</strong>
              </div>
              <label>
                <span>review status</span>
                <select aria-label="Package review status" value={packageReviewStatus} onChange={(event) => updatePackageReviewStatus(event.target.value)} disabled={Boolean(skyFallbackEditor)}>
                  {fallbackArchitectureV3ReviewStatuses.map((reviewStatus) => <option key={reviewStatus} value={reviewStatus}>{reviewStatus}</option>)}
                </select>
                {skyFallbackEditor && <small className="admin-field-hint">Copy proposals stay at needs_review until the source diff receives separate owner approval.</small>}
              </label>
              <label className="admin-package-notes-field">
                <span>editorial notes</span>
                <textarea aria-label="Editorial notes" value={packageEditorialNotesForDraft(currentDraft)} onChange={(event) => updatePackageEditorialNotes(event.target.value)} />
              </label>
            </section>
          )}
          <details className="admin-advanced admin-editor-key-details" open={!isVocabularyDraft}>
            <summary>{isVocabularyDraft ? "Internal generated key" : "Content key"}</summary>
            <label className="admin-title-field">
              <span>{isVocabularyDraft ? "Generated key" : "Content key"}</span>
              <input aria-label={isVocabularyDraft ? "Generated key" : "Content key"} value={currentDraft.contentKey} onChange={(event) => setDraft({ ...currentDraft, contentKey: event.target.value })} disabled={Boolean(currentDraft.id) || isVocabularyDraft || isPackageDraft} />
              {isVocabularyDraft && <small className="admin-field-hint">Generated from section + title. Existing rows keep their original key so published content stays connected.</small>}
            </label>
          </details>
          {isArticleDraft && (
            <section className="admin-display-source-panel" aria-label="Article content system">
              <div>
                <p className="admin-eyebrow">Reader behavior</p>
                <h3>Content System</h3>
                <p>Reader pages distinguish authored, generated, and fallback copy. On Sky aspects, approved authored and reviewed package copy always outrank generated prose.</p>
              </div>
              <div className="admin-content-level-readout">
                <span>System</span>
                <strong className={`ui-pill admin-status ${contentSystem === "authored" ? "status-live" : contentSystem === "generated" ? "status-reviewed" : "status-draft"}`}>
                  {contentSystemLabel(contentSystem)}
                </strong>
              </div>
              <small className="admin-field-hint">
                Published is a status. Authored, generated, and fallback are provenance systems; publication never changes one system into another.
              </small>
            </section>
          )}
          <fieldset className="admin-metadata-fields">
            <label className="admin-metadata-field">
              <span>Status</span>
              <select aria-label="Status" value={currentDraft.status} onChange={(event) => setDraft({ ...currentDraft, status: event.target.value as GeneratedContentStatus })} disabled={isPackageDraft || Boolean(compiledSkyArticleEdition)}>
                {contentStatuses.map((status) => <option key={status} value={status}>{contentStatusLabel(status)}</option>)}
              </select>
              <small className="admin-field-hint">
                {isPackageDraft
                  ? "Derived from package review status when saved."
                  : "Published maps to LIVE and means reader-eligible within this provenance system; it does not outrank a higher-priority system."}
              </small>
            </label>
            <label className="admin-metadata-field">
              <span>Surface</span>
              <select aria-label="Surface" value={currentDraft.surface} onChange={(event) => setDraft({ ...currentDraft, surface: event.target.value as GeneratedContentSurface })} disabled={isPackageDraft}>
                {["sky", "you", "natal", "synastry", "composite", "relationship", "modifier"].map((surface) => <option key={surface} value={surface}>{surface}</option>)}
              </select>
            </label>
            <label className="admin-metadata-field">
              <span>Mode</span>
              <select aria-label="Mode" value={currentDraft.mode} onChange={(event) => setDraft({ ...currentDraft, mode: event.target.value })} disabled={isPackageDraft}>
                {["feed", "in_depth", "article", "card"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </label>
            <label className="admin-metadata-field">
              <span>Lane</span>
              <select aria-label="Lane" value={currentDraft.lane} onChange={(event) => setDraft({ ...currentDraft, lane: event.target.value })} disabled={isPackageDraft}>
                <option value="serving">serving</option>
                <option value="reference">reference</option>
              </select>
            </label>
            <label className="admin-metadata-field">
              <span>Review state</span>
              <input aria-label="Review state" value={currentDraft.reviewState} onChange={(event) => setDraft({ ...currentDraft, reviewState: event.target.value })} disabled={isPackageDraft} />
            </label>
            {isFallbackHookDraft && (
              <label className="admin-metadata-field">
                <span>Fallback review status</span>
                <select aria-label="Fallback review status" value={fallbackReviewStatus} onChange={(event) => updateFallbackReviewStatus(event.target.value)}>
                  {fallbackHookReviewStatuses.map((reviewStatus) => <option key={reviewStatus} value={reviewStatus}>{reviewStatus}</option>)}
                </select>
              </label>
            )}
            <label className="admin-metadata-field">
              <span>Block type</span>
              <input aria-label="Block type" value={currentDraft.blockType} onChange={(event) => setDraft({ ...currentDraft, blockType: event.target.value })} disabled={isPackageDraft} />
            </label>
          </fieldset>
          {!compiledSkyArticleEdition && <div className="admin-toolbar-actions">
            <button className="admin-primary-button" type="button" onClick={() => void saveDraft(isCmsSurfaceDraft && currentDraft.status === "LIVE" ? "DRAFT" : undefined)} disabled={isLoading || Boolean(compiledSkyArticleEdition)}>
              <Save size={16} aria-hidden="true" />
              Save
            </button>
            {isPackageDraft && !skyFallbackEditor && (
              <button type="button" onClick={revertPackageDraft} disabled={isLoading}>
                Revert to package original
              </button>
            )}
            {!isPackageDraft && (
              <>
                <button type="button" onClick={() => void saveDraft("REVIEWED")} disabled={isLoading}>
                  <Check size={16} aria-hidden="true" />
                  Reviewed
                </button>
                {isGovernedSkyDraft && selectedRow ? (
                  <button type="button" onClick={() => void approveAndScheduleSkyRow(selectedRow)} disabled={isLoading || skyDraftHasUnsavedCopy} title={skyDraftHasUnsavedCopy ? "Save and revalidate copy edits before approval." : "Approve this reusable card for calculated matching Sky configurations."}>
                    <Check size={16} aria-hidden="true" />
                    Approve &amp; schedule
                  </button>
                ) : (
                  <button type="button" onClick={() => void saveDraft("LIVE")} disabled={isLoading || !cmsCanSignOff} title={!cmsCanSignOff ? "Fix the CMS template errors before Sign Off." : undefined}>
                    <Check size={16} aria-hidden="true" />
                    Sign Off
                  </button>
                )}
              </>
            )}
          </div>}
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
