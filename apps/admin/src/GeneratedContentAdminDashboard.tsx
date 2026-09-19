import { useStudioCustomVariables } from "./studioCustomVariableClient";
import { clearStudioEditorReturn, rememberStudioEditorReturn, studioEditorReturnContext } from "./studioEditorReturn";
import type { HouseTransitEditorSource } from "./HouseTransitWriteupEditor";
import { ZODIAC_SEASON_SOURCE_STARTERS, isZodiacSeasonSourceKey } from "../../web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
import "./studio-system.css";
import { StudioTabs, StudioButton, StudioIconButton, StudioInput, StudioTextarea } from "./StudioControls";
import { ArticleBlockStyleFields } from "./ArticleBlockStyleFields";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { getStudioPalette, getStudioTheme, saveStudioPalette, saveStudioTheme, studioShellAttributes } from "./studioTheme";
import { AdminContentTable, AdminDataTable, AdminFilterBar } from "./AdminBrowseComponents";
import { PageLoading } from "../../web/src/components/PageLoading";
import { reviewWorkBucket, skyWritingIssues } from "../../web/src/content/contentReviewReadiness";
import { transitNatalContactFromFields, transitNatalContactReady, transitNatalContactContentKey, transitNatalExactContentKey, transitNatalExactSourceDraft, transitNatalSharedFallbackKey, transitNatalStarterCopy } from "./transitNatalSources";
import { friendsTransitCardDestinations, friendsTransitCompositionQuery, matchesBondEffectContactSearch, transitNatalSearchSelection, matchesTransitNatalContactSearch } from "./bondEffectPageAssembly";
import FriendsTransitSectionFinder from "./FriendsTransitSectionFinder";
import { isDynamicTransitNatalExactKey } from "../../web/src/content/transitNatalIdentity";
import { isTransitNatalFamilyKey, isTransitNatalSituationKey, packagedTransitOpenMode, transitNatalLiveServingSource } from "./transitNatalEditorScope";
import { currentSkySummaryWording, skyDailySummaryFields, skySummaryTemplateErrors, type SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";
import { skyDebilityFields, skyDebilityTemplateErrors } from "../../web/src/content/skyDebilityCatalog";
import { refreshContentPublications } from "../../web/src/services/contentPublications";
import { installContentPublications, isContentRetired, subscribeToContentPublications, validContentPublication } from "../../web/src/content/contentPublicationState";
import { recoverContentStudioCopy } from "./contentStudioCopyRecovery";
import { lunarContentIdentity } from "./lunarCalendarContent";
import type { SkyForecastPeriod } from "./skyForecastTemplates";
import ContentLiveStatusBadge, { ContentLiveStatusProvider, useContentLiveStatusLoader, useContentLiveStatusResults, type LiveStatus } from "./ContentLiveStatus";
import { mergeContentInventory } from "./contentStudioState";
import {
  studioInventoryQuery,
  studioInventoryQueryKey,
  studioInventoryRequestPath,
  type StudioInventoryQuery
} from "./studioSectionInventory";
import { isContentStudioReferenceSource } from "../../web/src/content/contentStudioSourceRole";
import {
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  BookOpenText,
  Braces,
  CalendarDays,
  Check,
  Copy,
  Database,
  FileText,
  Flag,
  KeyRound,
  Menu,
  Moon,
  Orbit,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  Server,
  Sparkles,
  Sun,
  Trash2,
  Users,
  X
} from "lucide-react";
import { Fragment, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { isReaderFacingCopy } from "../../web/src/content/readerSafety";
import { renderCmsTemplatePreview, validateCmsTemplate } from "../../web/src/content/cmsTemplateValidation";
import { announceContentUpdate } from "../../web/src/services/contentUpdateSignal";
import {
  readLiveOmittedSectionQueue,
  subscribeToLiveOmittedSectionQueue,
  type LiveOmittedSectionReviewItem
} from "../../web/src/services/conditionalSectionReviewQueue";
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
  relatedAspectPassages,
  relatedHousePassages,
  relatedLunationHoroscopes,
  skyLunationContextForRow,
  skyPlacementBodies,
  skyPlacementSigns,
  skyWriteupContextForRow,
  skyWriteupSubjectTypeForRow
} from "./skyWriteupRelations";
import {
  ownerApprovedReplacementLabel,
  ownerApprovedSkyPlacementArticleKey
} from "./skyPlacementServingStatus";
import {
  effectivePackageRecord,
  houseHoroscopeCoreHeadline,
  natalPlanetInSignTemplateHeadline,
  natalPlanetInSignTemplateTitle,
  packageDraftChanges,
  renderWorkspacePreview,
  setPackageValueAt,
  skyFallbackIdentity,
  skyPlacementCompositionOptions,
  skyPlacementFallbackSectionOutline,
  skyPlacementFrameTemplateKey,
  skyFallbackWorkspace
} from "./skyFallbackWorkspace";
import { articleAppDestination, isAstro101ContentRow, isSkyWriteupContentRow } from "./articleWorkspace";
import {
  ASTRO_101_KIND_LABELS,
  ASTRO_101_KINDS,
  astro101BodyFromSections,
  astro101BlocksFromSections,
  astro101ContentKey,
  astro101HasReaderCopy,
  astro101HubTitleFromSections,
  astro101IntroFromSections,
  astro101KindFromSections,
  astro101PublicationIssue,
  astro101ReaderPath,
  astro101SlugFromFacts,
  astro101Slugify,
  astro101SlugTail,
  isAstro101Kind,
  type Astro101Kind
} from "../../web/src/content/astro101";
import { contentWiringStatus, isPublishedButUnwired } from "./contentWiringStatus";
import { fallbackHookDisplayTitle } from "./fallbackHookTitle";
import type { FallbackHookEditorGuidanceBuilder } from "./DailyFallbackWorkspaceGuide";
import type { DailyGlanceContext, DailyGlancePairEdits } from "./DailyGlanceStudio";
import {
  dailyGlanceContextSearchParams,
  dailyGlancePackageField,
  dailyGlancePairs,
  dailyGlanceSelector,
  type DailyGlancePair
} from "./dailyGlanceAdmin";
import { isCompositionTemplateRow } from "./compositionTemplateClassifier";
import {
  AdminAccessGate,
  AdminPageHeader
} from "./AdminStudioPrimitives";
import {
  natalPlacementHouses,
  natalPlacementMotions,
  natalPlacementPlanets,
  natalPlacementPointLabel,
  natalPlacementSelectionFromText,
  natalPlacementResolverDependencyKeys,
  natalPlacementSigns,
  ordinalHouse,
  type NatalPlacementHouse,
  type NatalPlacementMotion,
  type NatalPlacementPlanet,
  type NatalPlacementSign
} from "./natalPlacementSources";
import {
  natalAspectContentKeyPrefix,
  natalAspectTheyNameVariable,
  type NatalAspectSelection,
  type NatalAspectSourceDraft
} from "./natalAspectSources";
import {
  contentDestinations,
  contentMotion,
  sortPlacementRows,
  type ContentDestinationFilter,
  type ContentMotionFilter,
  type ContentPlacementSort
} from "./contentMotion";
import {
  transitNatalAspects,
  transitNatalHouses,
  transitNatalLabel,
  transitNatalPlanets,
  transitNatalPointGroups,
  transitNatalPoints,
  transitNatalSigns,
  type TransitNatalAspect,
  type TransitNatalContact,
  type TransitNatalHouse,
  type TransitNatalPlanet,
  type TransitNatalPoint,
  type TransitNatalSelection,
  type TransitNatalSign
} from "./transitNatalSources";
import {
  houseTransitHouses,
  houseTransitLabel,
  houseTransitPlanets,
  houseTransitSigns,
  houseTransitSourceGroups,
  renderHouseTransitPreview,
  type HouseTransitMotion,
  type HouseTransitSelection,
  type HouseTransitSource
} from "./houseTransitSources";

import type {
  WritingSurfaceAdminAccess,
  WritingSurfaceMapItem,
  WritingSurfaceSource
} from "./writingSurfaceSourceMap";
import type { CompositionEditorContext } from "./CompositionMapWorkspace";
import type { SkyPlacementSelection } from "./skyPlacementAssembly";
import { memoByObject, naturalCollator } from "./derivedCache";
// Presentation layers that must ship with the dashboard itself. The production
// route is served by @tldr/web, which lazy-loads this component and never ran
// apps/admin/src/main.tsx, so anything imported only there was missing in prod.

const TransitNatalReaderPreview = lazy(() => import("./TransitNatalReaderPreview"));
const TransitNatalPreviewOptions = lazy(() => import("./TransitNatalReaderPreview").then(module => ({ default: module.TransitNatalPreviewOptions })));
const TransitNatalExactSourceAction = lazy(() => import("./TransitNatalReaderPreview").then(module => ({ default: module.TransitNatalExactSourceAction })));
const PersonalTransitAiWriter = lazy(() => import("./PersonalTransitAiWriter"));
const BondEffectPagePreview = lazy(() => import("./BondEffectPagePreview"));
const FriendsBetweenYouTwoComposition = lazy(() => import("./FriendsBetweenYouTwoComposition"));
const ImportedArticleHoroscopesEditor = lazy(() => import("./ImportedArticleHoroscopesEditor"));
const StudioEditorReviewPanels = lazy(() => import('./StudioEditorReviewPanels'));
const SkyDailySummaryStudio = lazy(() => import("./SkyDailySummaryStudio").then(module => ({ default: module.SkyDailySummaryStudio })));
const SkyDebilityStudio = lazy(() => import("./SkyDebilityStudio").then(module => ({ default: module.SkyDebilityStudio })));
const LunarCalendarWorkspace = lazy(() => import("./LunarCalendarWorkspace"));
const CompositionMapWorkspace = lazy(() => import("./CompositionMapWorkspace"));
const SkyPlacementComposition = lazy(() => import("./SkyPlacementComposition"));
const SkyFallbackFieldsEditor = lazy(() => import("./SkyFallbackFieldsEditor"));
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
const PackagedHookCatalogResults = lazy(async () => {
  const module = await import("./PackagedHookCatalogResults");
  return { default: module.PackagedHookCatalogResults };
});
const SkyV4StudioReviewPanel = lazy(() => import("./SkyV4StudioReviewPanel"));
import { AdminPaginatedCollection } from "./AdminPaginatedCollection";
import AdminFilterDisclosure from "./AdminFilterDisclosure";
const StudioVariableInsert = lazy(() => import("./StudioVariableInsert"));
const StudioVariables = lazy(() => import("./StudioVariables"));
const SkyForecastTemplateStudio = lazy(() => import("./SkyForecastTemplateStudio"));
const CalendarOverviewEditor = lazy(() => import("./CalendarOverviewEditor"));
const TemplateVariablesRail = lazy(() => import("./TemplateVariablesRail"));
const NatalPlacementReaderPreview = lazy(() => import("./NatalPlacementReaderPreview"));
import type { NatalEditableRow, NatalSourceEdits } from "./NatalPlacementSourceEditor";
const NatalPlacementSourceFinder = lazy(() => import("./NatalPlacementSourceFinder"));
const NatalAspectSourceFinder = lazy(() => import("./NatalAspectSourceFinder"));
const DailyFallbackWorkspaceGuide = lazy(() => import("./DailyFallbackWorkspaceGuide"));
const DailyGlanceStudio = lazy(async () => {
  const module = await import("./DailyGlanceStudio");
  return { default: module.DailyGlanceStudio };
});
const HouseTransitWriteupEditor = lazy(() => import("./HouseTransitWriteupEditor"));
const DailyGlancePairEditor = lazy(async () => {
  const module = await import("./DailyGlanceStudio");
  return { default: module.DailyGlancePairEditor };
});
const UnresolvedContentReview = lazy(async () => {
  const module = await import("./UnresolvedContentReview");
  return { default: module.UnresolvedContentReview };
});

const contentTablePageSize = 50;
const reviewQueuePageSize = 25;
const compositeReviewPageSize = 10;

type GeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship" | "modifier" | "friends" | "year_ahead" | "education";
type GeneratedContentMode = "feed" | "in_depth" | "article" | "card" | string;
type AdminDashboardPage =
  | "articles"
  | "astro101"
  | "skyWriteups"
  | "calendarWriteups"
  | "compatibility"
  | "content"
  | "reviewQueue"
  | "unresolvedContent"
  | "compositeByType"
  | "connection"
  | "compositionMap"
  | "vocabulary"
  | "variables"
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
type AdminContentRole = "authored-content" | "generated-content" | "fallback-output" | "fallback-helper" | "template-pattern" | "source-material" | "legacy-generated" | "unknown";
type AdminAspectContext = {
  key: "sky-transit" | "transit-to-natal" | "natal" | "relationship" | "unknown";
  label: string;
  detail: string;
};
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
type AdminContentCategoryFilter = "all" | "Sky" | "Calendar Aspects" | "Personal Transits" | "House Transits" | "Natal Aspects" | "Natal Angles" | "Natal Chart" | "Relationship" | "Condition Modifiers" | "Fallback Hooks" | "Fallback Templates";
type AdminFallbackHookSectionFilter = "all" | "daily" | "sky" | "you" | "friends" | "lunar-calendar" | "settings";
type AdminFallbackRowSort = "title-asc" | "title-desc" | "type";
type WritingSurfaceAreaFilter = "all" | "sky" | "you" | "friends" | "calendar" | "reports" | "settings";
type WritingSurfaceStatusFilter = "all" | "complete" | "partial" | "missing";
type AdminWritingSurfaceMapPayload = {
  schema: "admin-writing-surface-map/v1";
  surfaces: WritingSurfaceMapItem[];
  access: Record<string, WritingSurfaceAdminAccess>;
  roleLabels: Partial<Record<WritingSurfaceSource["role"], string>>;
};
type AdminArticlePointFilter = "all" | "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto" | "other";
type AdminSkyWriteupSubjectFilter = "all" | "planet" | "angle" | "point";
type SkyWriteupWorkspaceView = "daily-summary" | "catalog" | "transits-to-natal" | "house-transits";
type CalendarWriteupWorkspaceView = "daily-sky" | SkyForecastPeriod;
const calendarWriteupWorkspaceTabs: { value: CalendarWriteupWorkspaceView; label: string }[] = [
  { value: "daily-sky", label: "Daily Sky" },
  { value: "weekly-sky", label: "Weekly Sky" },
  { value: "monthly-sky", label: "Monthly Sky" }
];
const skyWriteupWorkspaceTabs: { value: SkyWriteupWorkspaceView; label: string }[] = [
  { value: "daily-summary", label: "Daily Sky Summary" },
  { value: "catalog", label: "Placements & lunations" },
  { value: "transits-to-natal", label: "Personal Transits" },
  { value: "house-transits", label: "House Transits" }
];
type AdminCompatibilitySectionFilter = "all" | "content" | "fallback-hooks" | "vocabulary" | "slots";
type AdminCompatibilitySort = "updated-desc" | "updated-asc" | "title-asc" | "status" | "source";
type AdminCompatibilityCreateKind = "content" | "vocabulary" | "fallback-hook" | "template";
type SkyVoiceQueueView = "ready" | "changes" | "sources" | "all" | "composite" | "upcoming" | "needs-review" | "audit" | "live-omissions";
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
  inventory_only?: boolean;
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

type AdminContentReviewEventRow = {
  fingerprint: string;
  surface: LiveOmittedSectionReviewItem["surface"];
  event_date: string;
  event_kind: string | null;
  sign: string | null;
  rising_sign: string | null;
  section_id: string;
  omitted_content_key: string;
  fallback_content_key: string | null;
  reason: "missing-or-ineligible";
  first_seen_at: string;
  last_seen_at: string;
  occurrence_count: number;
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
  { type: "fallback"; key: string; label: string; section: Exclude<AdminFallbackHookSectionFilter, "all">; definition: FallbackHookDefinition };
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
    memoryReceipt?: unknown;
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

export type AdminDraft = {
  updatedAt?: string | null;
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

function liveOmissionSurfaceLabel(surface: LiveOmittedSectionReviewItem["surface"]) {
  return surface === "you-daily" ? "You daily" : "Weekly horoscope";
}

function liveOmissionDateLabel(item: LiveOmittedSectionReviewItem) {
  const date = new Date(item.eventDate);
  if (!Number.isFinite(date.getTime())) return item.eventDate;
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: item.timeZone || "UTC"
    }).format(date);
  } catch {
    return item.eventDate;
  }
}

function liveOmissionIdentity(item: LiveOmittedSectionReviewItem) {
  return [item.surface, item.eventDate.slice(0, 10), item.risingSign ?? "", item.sectionId, item.omittedContentKey].join("|");
}

function sharedLiveOmissionItem(row: AdminContentReviewEventRow): LiveOmittedSectionReviewItem {
  const eventKind = row.event_kind ?? undefined;
  const risingSign = row.rising_sign ?? undefined;
  const eventLabel = eventKind === "eclipse-solar"
    ? "Solar Eclipse"
    : eventKind === "eclipse-lunar"
      ? "Lunar Eclipse"
      : eventKind === "new-moon"
        ? "New Moon"
        : eventKind === "full-moon"
          ? "Full Moon"
          : "Horoscope";
  return {
    queueId: row.fingerprint,
    id: "conditional-section-omitted",
    status: "needs_review",
    surface: row.surface,
    headline: risingSign ? `${eventLabel} for ${risingSign.replace(/(^|-)([a-z])/gu, (_match, separator, letter) => `${separator}${letter.toUpperCase()}`)} Rising` : eventLabel,
    eventDate: `${row.event_date}T12:00:00.000Z`,
    eventKind,
    sign: row.sign ?? undefined,
    risingSign,
    sectionId: row.section_id,
    omittedContentKey: row.omitted_content_key,
    fallbackContentKey: row.fallback_content_key,
    reason: row.reason,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    occurrenceCount: row.occurrence_count
  };
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
  astro101: "astro-101",
  skyWriteups: "sky-writeups",
  calendarWriteups: "calendar-writeups",
  compatibility: "compatibility",
  content: "exact-content",
  reviewQueue: "review-queue",
  unresolvedContent: "unresolved-content",
  compositeByType: "composite-review",
  connection: "connection",
  compositionMap: "composition-map",
  vocabulary: "vocabulary",
  slotDictionary: "slots",
  variables: "variables",
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

type AdminNavItem = {
  page: AdminDashboardPage;
  label: string;
  icon: typeof Check;
  key?: string;
  category?: AdminContentCategoryFilter;
  section?: AdminFallbackHookSectionFilter;
  group?: "Publish" | "Write" | "Compose";
};

const compositionPages: AdminDashboardPage[] = ["compositionMap", "templates", "slotDictionary", "vocabulary", "knowledge", "hooks"];
const compositionTabs: AdminNavItem[] = [
  { page: "compositionMap", label: "Map", icon: Database },
  { page: "templates", label: "Templates", icon: Sparkles },
  { page: "slotDictionary", label: "Slots", icon: KeyRound },
  { page: "vocabulary", label: "Vocabulary", icon: BookOpenText },
  { page: "knowledge", label: "Fallback Hooks", icon: FileText },
  { page: "hooks", label: "Surface Map", icon: Flag }
];
const primaryAdminNavItems: AdminNavItem[] = [
  { page: "variables", label: "Variables", icon: KeyRound, group: "Compose" },
  { page: "reviewQueue", label: "Review Queue", icon: Check, group: "Publish" },
  { page: "unresolvedContent", label: "Unresolved Content", icon: Flag, group: "Publish" },
  { page: "content", label: "Content Library", icon: BookOpenText, group: "Write" },
  { page: "content", label: "Natal Chart", icon: Orbit, key: "natal-chart", category: "Natal Chart", group: "Write" },
  { page: "content", label: "Natal Aspects", icon: ArrowLeftRight, key: "natal-aspects", category: "Natal Aspects", group: "Write" },
  { page: "skyWriteups", label: "Sky Write-ups", icon: Moon, group: "Write" },
  { page: "calendarWriteups", label: "Calendar Write-ups", icon: CalendarDays, group: "Write" },
  { page: "content", label: "Calendar Aspects", icon: CalendarDays, key: "calendar-aspects", category: "Calendar Aspects", group: "Write" },
  { page: "articles", label: "Articles", icon: FileText, group: "Write" },
  { page: "astro101", label: "Astro 101", icon: BookOpen, group: "Write" },
  { page: "compatibility", label: "Compatibility", icon: Users, group: "Write" },
  { page: "compositeByType", label: "Composite Review", icon: Users, group: "Write" },
  { page: "compositionMap", label: "Composition", icon: Sparkles, group: "Compose" },
  { page: "aspectPatternCoverage", label: "Aspect Patterns", icon: BookOpenText, group: "Compose" }
];
const primaryAdminNavGroups = ["Publish", "Write", "Compose"] as const;
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
const fallbackArchitectureV3ReviewStatuses = ["needs_review", "approved", "approved_reuse", "deprecated"] as const;
const fallbackArchitectureV3ReaderEligibleReviews = new Set<string>(["approved", "approved_reuse"]);
const skyV4CanonicalStagePackage = "SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30";
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
  { key: "Calendar Aspects", label: "Calendar Aspects" },
  { key: "Personal Transits", label: "Personal Transits (Transit to Natal)" },
  { key: "House Transits", label: "House Transits" },
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
  { key: "daily", label: "Daily" },
  { key: "sky", label: "Sky" },
  { key: "you", label: "Natal" },
  { key: "friends", label: "Friends" },
  { key: "lunar-calendar", label: "Lunar Calendar" },
  { key: "settings", label: "Settings" }
];
const fallbackRowSortOptions: Array<{ key: AdminFallbackRowSort; label: string }> = [
  { key: "title-asc", label: "Title A–Z" },
  { key: "title-desc", label: "Title Z–A" },
  { key: "type", label: "Type (grouped)" }
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
const skyWriteupSubjectFilters: Array<{ key: AdminSkyWriteupSubjectFilter; label: string }> = [
  { key: "all", label: "All planets, angles, and points" },
  { key: "planet", label: "Planets and lunations" },
  { key: "angle", label: "Angles" },
  { key: "point", label: "Points" }
];
const skyWriteupMotionFilters: Array<{ key: ContentMotionFilter; label: string }> = [
  { key: "all", label: "All motion" },
  { key: "retrograde", label: "Retrograde" },
  { key: "direct", label: "Direct" },
  { key: "unspecified", label: "No motion-specific copy" }
];
const skyWriteupDestinationFilters: Array<{ key: ContentDestinationFilter; label: string }> = [
  { key: "all", label: "All reader uses" },
  { key: "sky", label: "Sky" },
  { key: "calendar", label: "Calendar" }
];
const skyWriteupSortOptions: Array<{ key: ContentPlacementSort; label: string }> = [
  { key: "updated-desc", label: "Recently updated" },
  { key: "title-asc", label: "Title A–Z" },
  { key: "title-desc", label: "Title Z–A" },
  { key: "retrograde-first", label: "Retrograde first" },
  { key: "direct-first", label: "Direct first" }
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
  { key: "slots", label: "Templates & slots", description: "Patterns and source rows used to assemble compatibility copy." }
];
const compatibilitySortOptions: Array<{ key: AdminCompatibilitySort; label: string }> = [
  { key: "updated-desc", label: "Newest updated" },
  { key: "updated-asc", label: "Oldest updated" },
  { key: "title-asc", label: "Planet + sign pair A-Z" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source class" }
];
const relationshipTypes = ["romantic", "friendship", "family", "coworkers", "creative", "exes", "complicated"];
function adminHashForPage(page: AdminDashboardPage, params?: URLSearchParams) {
  const query = params?.toString();
  return `#${adminPageHashKeys[page]}${query ? `?${query}` : ""}`;
}

function canonicalAdminRoute(page: AdminDashboardPage, input = new URLSearchParams()) {
  const params = new URLSearchParams(input);
  const view = params.get("view");
  if (page === "knowledge" && params.get("section") === "lunar-calendar"
    || page === "skyWriteups" && view === "daily-sky" && params.get("section") === "lunar-calendar") {
    page = "calendarWriteups";
    params.set("view", "daily-sky");
    params.delete("section");
  } else if (page === "skyWriteups" && (view === "weekly-sky" || view === "monthly-sky")) {
    page = "calendarWriteups";
  } else if (page === "skyWriteups" && view === "daily-sky") {
    params.set("view", "daily-summary");
  }
  if (page === "calendarWriteups") params.delete("audience");
  return { page, params };
}

function parseAdminHash() {
  const rawHash = window.location.hash || "#review-queue";
  const hashBody = rawHash.replace(/^#/, "");
  const [key = "review-queue", query = ""] = hashBody.split("?");
  const params = new URLSearchParams(query);
  if (key === "compatibility") params.set("view", "compatibility");
  if (key === "composite-review") params.set("view", "composite");
  return canonicalAdminRoute(adminPageByHashKey[key] ?? "reviewQueue", params);
}

function adminPageTitle(activePage: AdminDashboardPage) {
  switch (activePage) {
    case "articles": return "Articles";
    case "astro101": return "Astro 101";
    case "skyWriteups": return "Sky Write-ups";
    case "calendarWriteups": return "Calendar Write-ups";
    case "compatibility": return "Compatibility";
    case "content": return "Content Library";
    case "reviewQueue": return "Review Queue";
    case "unresolvedContent": return "Unresolved Content";
    case "compositeByType": return "Composite Review";
    case "connection": return "Connection";
    case "compositionMap": return "Composition Map";
    case "vocabulary": return "Vocabulary & Phrases";
    case "variables": return "Variables";
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

type AdminBreadcrumbItem = {
  label: string;
  page?: AdminDashboardPage;
};

function adminPageBreadcrumbItems(activePage: AdminDashboardPage): AdminBreadcrumbItem[] {
  switch (activePage) {
    case "articles": return [{ label: "Admin", page: "reviewQueue" }, { label: "Write", page: "content" }, { label: "Articles" }];
    case "astro101": return [{ label: "Admin", page: "reviewQueue" }, { label: "Write", page: "content" }, { label: "Astro 101" }];
    case "skyWriteups": return [{ label: "Admin", page: "reviewQueue" }, { label: "Write", page: "content" }, { label: "Sky write-ups" }];
    case "calendarWriteups": return [{ label: "Admin", page: "reviewQueue" }, { label: "Write", page: "content" }, { label: "Calendar write-ups" }];
    case "compatibility": return [{ label: "Admin", page: "reviewQueue" }, { label: "Write", page: "content" }, { label: "Compatibility" }];
    case "content": return [{ label: "Admin", page: "reviewQueue" }, { label: "Write", page: "content" }, { label: "Content library" }];
    case "reviewQueue": return [{ label: "Admin", page: "reviewQueue" }, { label: "Publish", page: "reviewQueue" }, { label: "Review queue" }];
    case "unresolvedContent": return [{ label: "Admin", page: "reviewQueue" }, { label: "Publish", page: "reviewQueue" }, { label: "Unresolved content" }];
    case "compositeByType": return [{ label: "Admin", page: "reviewQueue" }, { label: "Write", page: "content" }, { label: "Composite review" }];
    case "connection": return [{ label: "Admin", page: "reviewQueue" }, { label: "Connection" }];
    case "compositionMap": return [{ label: "Admin", page: "reviewQueue" }, { label: "Composition", page: "compositionMap" }, { label: "Map" }];
    case "vocabulary": return [{ label: "Admin", page: "reviewQueue" }, { label: "Composition", page: "compositionMap" }, { label: "Vocabulary & phrases" }];
    case "variables": return [{ label: "Admin", page: "reviewQueue" }, { label: "Variables" }];
    case "slotDictionary": return [{ label: "Admin", page: "reviewQueue" }, { label: "Composition", page: "compositionMap" }, { label: "Slots" }];
    case "knowledge": return [{ label: "Admin", page: "reviewQueue" }, { label: "Composition", page: "compositionMap" }, { label: "Fallback articles & passages" }];
    case "templates": return [{ label: "Admin", page: "reviewQueue" }, { label: "Composition", page: "compositionMap" }, { label: "Templates" }];
    case "hooks": return [{ label: "Admin", page: "reviewQueue" }, { label: "Composition", page: "compositionMap" }, { label: "Surface map" }];
    case "sourceDrafts": return [{ label: "Admin", page: "reviewQueue" }, { label: "App surfaces", page: "compositionMap" }, { label: "Sky aspect drafts" }];
    case "aspectPatternCoverage": return [{ label: "Admin", page: "reviewQueue" }, { label: "Language System", page: "aspectPatternCoverage" }, { label: "Aspect Patterns" }];
    case "aspectPatternActivationCoverage": return [{ label: "Admin", page: "reviewQueue" }, { label: "Language System", page: "aspectPatternCoverage" }, { label: "Aspect Pattern Activation" }];
    case "aspectDiagnostics": return [{ label: "Admin", page: "reviewQueue" }, { label: "Diagnostics", page: "aspectDiagnostics" }, { label: "Aspect patterns" }];
    case "users": return [{ label: "Admin", page: "reviewQueue" }, { label: "Users" }];
    case "reportFulfillment": return [{ label: "Admin", page: "reviewQueue" }, { label: "Operations", page: "connection" }, { label: "Report fulfillment" }];
    default: return [{ label: "Admin", page: "reviewQueue" }, { label: "Home" }];
  }
}

function adminPageDescription(activePage: AdminDashboardPage) {
  switch (activePage) {
    case "articles":
      return "Write and manage standalone articles.";
    case "astro101":
      return "Manage Astro 101 education pages served on /learn.";
    case "skyWriteups":
      return "Edit planetary placements, lunations, aspects, and horoscopes.";
    case "calendarWriteups":
      return "Manage daily, weekly, and monthly Calendar writing.";
    case "reviewQueue":
      return "Review, approve, and publish content.";
    case "unresolvedContent":
      return "See every package record that is still blocked from serving.";
    case "content":
      return "Find and edit every saved content row.";
    case "compositionMap":
      return "Start with any reader-facing surface in the app, then follow its editorial sources, runtime path, templates, and calculated facts.";
    case "knowledge":
      return "Edit backup copy used when primary content is unavailable.";
    case "vocabulary":
      return "Edit reusable words and phrases used across the app.";
    case "variables":
      return "Search calculated facts and editable prose, and find where each variable can be used.";
    case "slotDictionary":
      return "See what fills each template variable.";
    case "templates":
      return "Edit the patterns used to assemble reader copy.";
    case "compositeByType":
      return "Review composite write-ups by relationship type.";
    case "compatibility":
      return "Edit compatibility copy and its supporting parts.";
    case "hooks":
      return "See which app surfaces request each content key.";
    case "sourceDrafts":
      return "Review unpublished Current Sky aspect drafts.";
    case "aspectPatternCoverage":
      return "Edit natal and Active Now aspect-pattern copy.";
    case "aspectPatternActivationCoverage":
      return "Edit Active Now aspect-pattern copy.";
    case "aspectDiagnostics":
      return "Inspect how natal aspect patterns are detected and ranked.";
    case "users":
      return "Review user-created content and its status.";
    case "reportFulfillment":
      return "Monitor report orders, delivery, and quality.";
    case "connection":
      return "Check Content Studio access and API health.";
    default:
      return "Manage app content.";
  }
}

function contentStatusLabel(status: GeneratedContentStatus) {
  if (status === "LIVE") return "Live";
  if (status === "ERROR") return "Needs review";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function packageReviewStatusLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "approved_reuse") return "Approved for reuse";
  return "Needs review";
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
  return draft.blockType === "vocabulary_phrase"
    || draft.contentKey.startsWith("vocab/")
    || draft.contentKey.startsWith("fallback-vocab/")
    || draftPackageRecord(draft).content_role === "vocabulary"
    || draft.sourceSnapshot?.content_role === "vocabulary";
}

function draftIsArticle(draft: AdminDraft) {
  return draft.mode === "article"
    || draft.blockType === "sky_article"
    || draft.contentKey.startsWith("sky/article/")
    || draft.contentKey.startsWith("sky-article/");
}

function draftIsFallbackHook(draft: AdminDraft) {
  return draft.blockType === "fallback_hook"
    || draft.contentKey.startsWith("fallback-hook/")
    || draftPackageRecord(draft).content_role === "fallback_hook";
}

function draftIsTemplate(draft: AdminDraft) {
  return draft.blockType === "template"
    || draft.blockType === "fallback_template"
    || draft.contentKey.startsWith("slot-template/")
    || draft.contentKey.startsWith("fallback-template/");
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
  const packageRecord = rowPackageRecord(row);
  const skyV4ReviewCategory = typeof packageRecord.studio_review_category === "string"
    ? packageRecord.studio_review_category
    : "";
  const outsideSkyV4WritingReview = skyV4ReviewCategory === "configuration"
    || (skyV4ReviewCategory === "owner-approved-reader-copy" && packageRecord.owner_approved === true);

  return !outsideSkyV4WritingReview && (
    isContentStudioReferenceSource(row.content_key, row.source_snapshot ?? {})
    || sourceType === "owner-resource-review"
    || (["DRAFT", "REVIEWED"].includes(row.status) && Boolean(row.review_state))
  );
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
  return row.mode === "article"
    && row.lane === "serving"
    && !isSkyWriteupContentRow(row)
    && !isAstro101ContentRow(row)
    && !isRetiredAdminRow(row);
}

function isAstro101LibraryRow(row: AdminGeneratedContentRow) {
  return !isRetiredAdminRow(row) && isAstro101ContentRow(row);
}

function isSkyWriteupLibraryRow(row: AdminGeneratedContentRow) {
  return !isRetiredAdminRow(row) && isSkyWriteupContentRow(row);
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
    summary: row.provider === "manual" && /^(REVIEWED|CONFIRMED|DRAFT) · /.test(row.summary ?? "") ? normalizeText(row.body) : normalizeText(row.summary),
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

function astro101KindForDraft(draft: Pick<AdminDraft, "contentKey" | "sections">): Astro101Kind {
  const fromSections = astro101KindFromSections(draft.sections);
  if (fromSections) return fromSections;
  const fromKey = draft.contentKey.match(/^education\/astro-101\/([^/]+)\//u)?.[1];
  return isAstro101Kind(fromKey) ? fromKey : "article";
}

function withAstro101Placement(draft: AdminDraft, next: {
  kind?: Astro101Kind;
  slugTail?: string;
  hubTitle?: string;
} = {}): AdminDraft {
  const kind = next.kind ?? astro101KindForDraft(draft);
  const existingTail = astro101SlugTail(draft.facts);
  const fallbackTail = existingTail && existingTail !== "new-page" ? existingTail : "";
  const slugTail = astro101Slugify(next.slugTail ?? (fallbackTail || draft.headline)) || "new-page";
  const readerPath = astro101ReaderPath(kind, slugTail);
  const sections: Record<string, unknown> = { ...(objectRecord(draft.sections) ?? {}), kind };
  if (next.hubTitle !== undefined) {
    if (next.hubTitle.trim()) sections.hubTitle = next.hubTitle.trim();
    else delete sections.hubTitle;
  }
  return {
    ...draft,
    surface: "education",
    mode: "article",
    contentKey: draft.id ? draft.contentKey : astro101ContentKey(kind, slugTail),
    sections,
    facts: { ...(objectRecord(draft.facts) ?? {}), slug: readerPath },
    sourceSnapshot: {
      ...(draft.sourceSnapshot ?? {}),
      appDestination: readerPath
    }
  };
}

function finalizeAstro101Draft(draft: AdminDraft): AdminDraft {
  const placed = withAstro101Placement(draft);
  const assembled = astro101BodyFromSections(placed.sections);
  return {
    ...placed,
    body: placed.body.trim() || assembled
  };
}

function createAstro101Draft(kind: Astro101Kind): AdminDraft {
  return withAstro101Placement({
    id: null,
    contentKey: astro101ContentKey(kind, "new-page"),
    surface: "education",
    mode: "article",
    status: "DRAFT",
    headline: "",
    summary: "",
    body: "",
    lane: "serving",
    reviewState: "EDITORIAL_REVIEW_REQUIRED",
    blockType: "essay",
    promptVersion: "manual-admin",
    sections: { kind, intro: "", blocks: [] },
    facts: { slug: astro101ReaderPath(kind, "new-page") },
    reviewerNotes: "",
    sourceSnapshot: {
      contentType: "authored-article",
      contentSystem: "authored",
      content_role: "authored-content",
      contentLevel: "owner-authored",
      authoringSource: "admin-dashboard"
    }
  }, { kind, slugTail: "new-page" });
}

function draftPackageRecord(draft: AdminDraft) {
  const sections = objectRecord(draft.sections);
  return objectRecord(sections?.packageRecord) ?? {};
}

function draftPackageProposal(draft: AdminDraft) {
  const sections = objectRecord(draft.sections);
  return objectRecord(sections?.packageDraft);
}

function draftEditablePackageRecord(draft: AdminDraft) {
  return effectivePackageRecord(draft.sections);
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
  if (isAstro101ContentRow({ content_key: draft.contentKey, facts: draft.facts })) return false;
  return draft.sourceSnapshot?.sourcePackage === "tldrastro-fallback-architecture-v3"
    || draft.facts?.fallbackArchitectureV3 === true
    || Boolean(draftPackageRecord(draft).content_role);
}

function packageReviewStatusForDraft(draft: AdminDraft) {
  if (draft.sourceSnapshot?.review_status === "deprecated" || draft.facts?.review_status === "deprecated") return "deprecated";
  if (objectRecord(objectRecord(draft.sections)?.packageDraft) && !writesPersonalTransitExactCopy(draft)) return "needs_review";
  return sourceSnapshotString(draft.sourceSnapshot, "review_status")
    || (typeof draft.facts?.review_status === "string" ? draft.facts.review_status : "")
    || (typeof draftPackageRecord(draft).review_status === "string" ? draftPackageRecord(draft).review_status as string : "")
    || "needs_review";
}

function draftWithPackageReviewStatus(draft: AdminDraft, reviewStatus: string): AdminDraft {
  const proposal = draftPackageProposal(draft);
  const sections = { ...(draft.sections ?? {}) };
  const nextRecord = {
    ...(proposal && writesPersonalTransitExactCopy(draft) ? proposal : draftPackageRecord(draft)),
    review_status: reviewStatus
  };
  if (writesPersonalTransitExactCopy(draft)) delete sections.packageDraft;
  return {
    ...draft,
    sourceSnapshot: {
      ...(draft.sourceSnapshot ?? {}),
      review_status: reviewStatus
    },
    facts: {
      ...(draft.facts ?? {}),
      review_status: reviewStatus
    },
    sections: {
      ...sections,
      packageRecord: nextRecord,
      ...(proposal && !writesPersonalTransitExactCopy(draft) ? { packageDraft: { ...proposal, review_status: reviewStatus } } : {})
    }
  };
}

function draftHasPackageProposal(draft: AdminDraft) {
  return Boolean(objectRecord(objectRecord(draft.sections)?.packageDraft));
}

function packageEditorialNotesForDraft(draft: AdminDraft) {
  const editableRecord = draftEditablePackageRecord(draft);
  return typeof editableRecord.editorial_notes === "string" ? editableRecord.editorial_notes as string : "";
}

function packageFieldString(draft: AdminDraft, key: string) {
  const sections = objectRecord(draft.sections);
  const proposalValue = draftPackageProposal(draft)?.[key];
  const sectionValue = sections?.[key];
  const packageValue = draftPackageRecord(draft)[key];
  return typeof proposalValue === "string"
    ? proposalValue
    : typeof sectionValue === "string"
      ? sectionValue
      : typeof packageValue === "string"
        ? packageValue
        : "";
}

function writesPersonalTransitExactCopy(draft: AdminDraft) {
  return draft.contentKey.startsWith("authored/transit-return/")
    || (draft.contentKey.startsWith("authored/transit-aspect/") && draft.contentKey.split("/").length === 8);
}

function setPackageSectionField(draft: AdminDraft, key: string, value: string): AdminDraft {
  draft = invalidateContentStudioReview(draft);
  const copySection = writesPersonalTransitExactCopy(draft) || (!draft.id && (draft.contentKey.startsWith(natalAspectContentKeyPrefix) || draftPackageRecord(draft).render_policy === "personal-transit-exact-v1")) ? "packageRecord" : "packageDraft";
  const proposal = draftPackageProposal(draft) ?? structuredClone(draftPackageRecord(draft));
  const sections = { ...(draft.sections ?? {}) };
  if (copySection === "packageRecord") delete sections.packageDraft;
  return {
    ...draft,
    body: key === "body_you" ? value : draft.body,
    sections: {
      ...sections,
      [copySection]: {
        ...proposal,
        [key]: value
      }
    }
  };
}

function setPackageRecordField(draft: AdminDraft, key: string, value: string): AdminDraft {
  draft = invalidateContentStudioReview(draft);
  const copySection = writesPersonalTransitExactCopy(draft) || (!draft.id && (draft.contentKey.startsWith(natalAspectContentKeyPrefix) || draftPackageRecord(draft).render_policy === "personal-transit-exact-v1")) ? "packageRecord" : "packageDraft";
  const proposal = draftPackageProposal(draft) ?? structuredClone(draftPackageRecord(draft));
  const sections = { ...(draft.sections ?? {}) };
  if (copySection === "packageRecord") delete sections.packageDraft;
  return {
    ...draft,
    sections: {
      ...sections,
      [copySection]: {
        ...proposal,
        [key]: value
      }
    }
  };
}

function invalidateContentStudioReview(draft: AdminDraft): AdminDraft {
  const sections = objectRecord(draft.sections) ?? {};
  if (!objectRecord(sections.contentStudioReview)) return draft;
  return {
    ...draft,
    sections: {
      ...sections,
      contentStudioReview: null
    }
  };
}

async function contentStudioReviewCopySha256(draft: AdminDraft) {
  const payload = JSON.stringify({
    headline: draft.headline,
    summary: draft.summary,
    body: draft.body
  });
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

  if (sourceContentSystem === "cms-surface-override" || contentKey.startsWith("cms/") || contentKey.startsWith("authored/sky-lunation-macro/") || contentKey.startsWith("education/astro-101/")) {
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

  if (
    blockType === "template" ||
    blockType === "fallback_template" ||
    contentKey.startsWith("slot-template/") ||
    contentKey.startsWith("fallback-template/") ||
    sourceRole === "template" ||
    sourceContentType === "template"
  ) {
    return "template-pattern";
  }

  const contentClass = contentClassForRow(row);
  if (sourceContentSystem === "authored" || sourceContentType === "authored-content" || sourceRole === "authored-card") return "authored-content";
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
        shortLabel: "Authored",
        detail: "Finished reader-facing copy. When this row is published, it can serve as authored app content."
      };
    case "generated-content":
      return {
        label: "Generated content",
        shortLabel: "Generated",
        detail: "AI-generated prose. A published row can serve only when the app has no higher-priority approved authored or reviewed package copy."
      };
    case "fallback-output":
      return {
        label: "Fallback hook/output",
        shortLabel: "Fallback hook",
        detail: "Fallback-system copy or a fallback hook row. It is eligible only when its fallback review status is reviewed or approved."
      };
    case "fallback-helper":
      return {
        label: "Fallback source/helper",
        shortLabel: "Fallback helper",
        detail: "Ingredient text for fallback generation. Helper clauses such as core_behavior and house_synthesis must not be promoted as authored write-ups by themselves."
      };
    case "template-pattern":
      return {
        label: "Template pattern",
        shortLabel: "Template",
        detail: "An assembly pattern that combines variables and reviewed source phrases into reader copy. It is a scaffold, not a finished article."
      };
    case "source-material":
      return {
        label: "Source material",
        shortLabel: "Reference",
        detail: "Reference material for editors and resolvers. It should not render directly in the reader."
      };
    case "legacy-generated":
      return {
        label: "Legacy generated",
        shortLabel: "Legacy",
        detail: "Older generated copy. Review carefully before promoting it to authored content."
      };
    default:
      return {
        label: "Unclassified",
        shortLabel: "Unclassified",
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
  const facts = objectRecord(row.facts);
  const factPoint = [facts?.point, facts?.planet, facts?.body]
    .find((value) => typeof value === "string" && value.trim()) as string | undefined;
  const keyMatch = normalizedKey.match(/^sky[./-](?:placement|article)[./-]([a-z-]+)/)
    ?? normalizedKey.match(/^sky[./-]([a-z-]+)[./-][a-z-]+(?:[./-]rx)?$/);
  const headlineMatch = normalizeText(row.headline).toLowerCase().match(/^(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\b/);
  const candidate = factPoint?.toLowerCase().replace(/-/g, " ")
    || keyMatch?.[1]?.replace(/-/g, " ")
    || headlineMatch?.[1]
    || "";
  const point = candidate.split(/\s+/)[0];

  return articlePointFilters.some((filter) => filter.key === point) && point !== "all"
    ? point as AdminArticlePointFilter
    : "other";
}

function rowSearchTextUncached(row: AdminGeneratedContentRow) {
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

function visibleRowSearchTextUncached(row: AdminGeneratedContentRow) {
  return [
    row.content_key,
    rowTitle(row),
    rowTypeLabel(row),
    row.headline,
    row.surface,
    row.mode,
    row.block_type,
    row.event_type,
    row.prompt_version,
    row.provider
  ].join(" ").toLowerCase();
}

function skyWriteupSearchTextUncached(row: AdminGeneratedContentRow) {
  return [
    rowSearchText(row),
    rowTitle(row),
    ...(row.knowledge_ids ?? []),
    row.reviewer_notes
  ].join(" ").toLowerCase();
}

function fallbackHookVisibleSearchTextUncached(row: AdminGeneratedContentRow) {
  return [
    row.content_key,
    rowTitle(row),
    row.headline,
    row.summary,
    row.body,
    row.surface,
    row.mode,
    row.block_type,
    row.event_type,
    fallbackSectionForKey(row.content_key, row.surface),
    JSON.stringify(row.sections ?? {})
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

function matchesFallbackLibrarySearch(contentKey: string, haystack: string, search: string) {
  return matchesAdminSearch(haystack, search)
    || matchesBondEffectContactSearch(contentKey, search)
    || matchesTransitNatalContactSearch(contentKey, search);
}

function isCompatibilityRow(row: AdminGeneratedContentRow) {
  const contentKey = row.content_key.toLowerCase();
  return contentKey.startsWith("compatibility.")
    || contentKey.startsWith("compatibility/")
    || contentKey.startsWith("authored/compat-")
    || row.event_type === "friends.compatibility.planet-card"
    || row.block_type === "compatibility_planet_card"
    || /^fallback-hook\/(?:friends|relationship|synastry)[./-]/.test(contentKey)
    || contentKey.startsWith("fallback-hook/pair-daily/")
    || contentKey.startsWith("vocab/relationship/")
    || contentKey.startsWith("slot-template/compatibility/");
}

function compatibilitySectionForRow(row: AdminGeneratedContentRow): AdminCompatibilitySectionFilter {
  const contentClass = contentClassForRow(row);
  if (contentClass === "fallback-hook") return "fallback-hooks";
  if (contentClass === "vocab") return "vocabulary";
  if (row.content_key.startsWith("slot-template/") || row.block_type === "template") return "slots";
  return "content";
}

function compatibilityPlanetForRow(row: AdminGeneratedContentRow): AdminArticlePointFilter {
  const identity = compatibilityBrowseIdentityForRow(row);
  const sourceSnapshot = row.source_snapshot ?? {};
  const facts = row.facts ?? {};
  const explicitPlanet = identity?.planet
    || (typeof sourceSnapshot.planet === "string" ? sourceSnapshot.planet : "")
    || (typeof facts.planet === "string" ? facts.planet : "");
  const structuredIdentity = `${explicitPlanet} ${row.content_key}`.toLowerCase().replace(/[-_/.:]+/g, " ");
  const planet = articlePointFilters.find((filter) => (
    filter.key !== "all"
    && filter.key !== "other"
    && new RegExp(`\\b${filter.key}\\b`).test(structuredIdentity)
  ));
  return planet?.key ?? "other";
}

type CompatibilityBrowseIdentity = {
  planet: string;
  readerSign: string;
  friendSign: string;
  title: string;
  detail: string;
  sortValue: string;
};

function compatibilityBrowseIdentity(
  contentKey: string,
  facts: Record<string, unknown> | null | undefined = null,
  sourceSnapshot: Record<string, unknown> | null | undefined = null
): CompatibilityBrowseIdentity | null {
  const slashMatch = contentKey.match(/^authored\/compat-(?:deep|pair)\/([^/]+)\/([^/]+)\/([^/]+)$/i);
  const dotMatch = contentKey.match(/^compatibility[./]([^./]+)[./]([^./]+)[./]([^./]+)$/i);
  const keyMatch = slashMatch ?? dotMatch;
  const explicitPlanet = typeof sourceSnapshot?.planet === "string"
    ? sourceSnapshot.planet
    : typeof facts?.planet === "string"
      ? facts.planet
      : "";
  const explicitReaderSign = typeof sourceSnapshot?.readerSign === "string"
    ? sourceSnapshot.readerSign
    : typeof facts?.readerSign === "string"
      ? facts.readerSign
      : "";
  const explicitFriendSign = typeof sourceSnapshot?.otherSign === "string"
    ? sourceSnapshot.otherSign
    : typeof facts?.otherSign === "string"
      ? facts.otherSign
      : "";
  const planetKey = keyMatch?.[1] || explicitPlanet;
  const readerSignKey = keyMatch?.[2] || explicitReaderSign;
  const friendSignKey = keyMatch?.[3] || explicitFriendSign;
  if (!planetKey || !readerSignKey || !friendSignKey) return null;

  const planet = titleFromKey(planetKey);
  const readerSign = titleFromKey(readerSignKey);
  const friendSign = titleFromKey(friendSignKey);
  return {
    planet,
    readerSign,
    friendSign,
    title: `${planet} · ${readerSign} → ${friendSign}`,
    detail: `You: ${readerSign} · Friend: ${friendSign}`,
    sortValue: `${planet} ${readerSign} ${friendSign}`.toLowerCase()
  };
}

function compatibilityBrowseIdentityForRow(row: AdminGeneratedContentRow) {
  return compatibilityBrowseIdentity(row.content_key, row.facts, row.source_snapshot);
}

function reverseCompatibilityContentKey(contentKey: string) {
  const slashMatch = contentKey.match(/^(authored\/compat-(?:deep|pair)\/[^/]+\/)([^/]+)\/([^/]+)$/i);
  if (slashMatch) return `${slashMatch[1]}${slashMatch[3]}/${slashMatch[2]}`;

  const compactMatch = contentKey.match(/^(compatibility)([./])([^./]+)([./])([^./]+)([./])([^./]+)$/i);
  if (!compactMatch) return null;
  return `${compactMatch[1]}${compactMatch[2]}${compactMatch[3]}${compactMatch[4]}${compactMatch[7]}${compactMatch[6]}${compactMatch[5]}`;
}

function reverseCompatibilityRow(
  currentRow: AdminGeneratedContentRow,
  candidateRows: AdminGeneratedContentRow[]
) {
  const currentIdentity = compatibilityBrowseIdentityForRow(currentRow);
  if (!currentIdentity || currentIdentity.readerSign === currentIdentity.friendSign) return null;

  const normalizeIdentityPart = (value: string) => value.trim().toLowerCase();
  const currentPlanet = normalizeIdentityPart(currentIdentity.planet);
  const reverseReaderSign = normalizeIdentityPart(currentIdentity.friendSign);
  const reverseFriendSign = normalizeIdentityPart(currentIdentity.readerSign);
  const exactReverseKey = reverseCompatibilityContentKey(currentRow.content_key)?.toLowerCase() ?? null;

  return candidateRows
    .filter((row) => row.id !== currentRow.id)
    .map((row) => ({ row, identity: compatibilityBrowseIdentityForRow(row) }))
    .filter(({ identity }) => identity
      && normalizeIdentityPart(identity.planet) === currentPlanet
      && normalizeIdentityPart(identity.readerSign) === reverseReaderSign
      && normalizeIdentityPart(identity.friendSign) === reverseFriendSign)
    .sort((left, right) => {
      const leftExact = exactReverseKey && left.row.content_key.toLowerCase() === exactReverseKey ? 1 : 0;
      const rightExact = exactReverseKey && right.row.content_key.toLowerCase() === exactReverseKey ? 1 : 0;
      if (leftExact !== rightExact) return rightExact - leftExact;
      const leftPublished = left.row.status === "LIVE" ? 1 : 0;
      const rightPublished = right.row.status === "LIVE" ? 1 : 0;
      if (leftPublished !== rightPublished) return rightPublished - leftPublished;
      return (right.row.updated_at ?? right.row.created_at ?? "")
        .localeCompare(left.row.updated_at ?? left.row.created_at ?? "");
    })[0]?.row ?? null;
}

function compatibilityVisibleSearchText(row: AdminGeneratedContentRow) {
  const identity = compatibilityBrowseIdentityForRow(row);
  return [
    visibleRowSearchText(row),
    identity?.title,
    identity?.detail,
    identity ? `${identity.planet} ${identity.readerSign} ${identity.friendSign}` : ""
  ].join(" ").toLowerCase();
}

function compatibilitySortValue(row: AdminGeneratedContentRow, sort: AdminCompatibilitySort) {
  const browseTitle = compatibilityBrowseIdentityForRow(row)?.sortValue ?? rowTitle(row).toLowerCase();
  if (sort === "title-asc") return browseTitle;
  if (sort === "status") return `${row.status}-${browseTitle}`;
  if (sort === "source") return `${contentClassForRow(row)}-${browseTitle}`;
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

function transitNatalPointSelectOptions() {
  return transitNatalPointGroups.map((group) => (
    <optgroup key={group.label} label={group.label}>
      {group.values.map((point) => <option value={point} key={point}>{titleFromKey(point)}</option>)}
    </optgroup>
  ));
}

function vocabularyUsageDetails(contentKey: string) {
  const [, family = "", ...subjectParts] = contentKey.split("/");
  const subject = subjectParts.map(titleFromKey).join(" / ");
  const uses: Record<string, { label: string; description: string }> = {
    "dodont-moon-do": {
      label: "Daily Moon suggestion",
      description: `Can appear in the Do list when the Moon is in ${subject}.`
    },
    "dodont-moon-dont": {
      label: "Daily Moon caution",
      description: `Can appear in the Don't list when the Moon is in ${subject}.`
    },
    "dodont-do": {
      label: "Daily transit suggestion",
      description: `Can appear in a personalized Do list when ${subject || "this placement"} is selected.`
    },
    "dodont-shadow": {
      label: "Daily transit caution",
      description: `Can appear in a personalized Don't list when ${subject || "this placement"} is selected.`
    },
    "house-jurisdiction": {
      label: "House topic",
      description: `Supplies the topic for ${subject ? `${subject} house` : "a calculated house"} fallback copy.`
    },
    "house-topic": {
      label: "House topic",
      description: `Supplies the topic for ${subject ? `${subject} house` : "a calculated house"} fallback copy.`
    },
    "planet-function": {
      label: "Natal planet meaning",
      description: `Supplies reusable meaning for ${subject || "a calculated planet"} in natal fallback copy.`
    },
    "sky-planet-function": {
      label: "Sky planet meaning",
      description: `Supplies reusable meaning for ${subject || "a calculated planet"} in current-Sky fallback copy.`
    },
    "sign-need": {
      label: "Sign need",
      description: `Supplies the core need associated with ${subject || "a calculated sign"}.`
    },
    "sign-style": {
      label: "Sign style",
      description: `Supplies reusable style language for ${subject || "a calculated sign"}.`
    }
  };
  return uses[family] ?? {
    label: titleFromKey(family || "Reusable phrase"),
    description: subject
      ? `The fallback system can insert this saved phrase when it selects ${subject}.`
      : "The fallback system can insert this saved phrase into a complete reader passage."
  };
}

function templateDestinationLabel(contentKey: string) {
  if (contentKey.startsWith("slot-template/compatibility/")) return "Compatibility";

  const slotId = contentKey.match(/^slot-template\/([^/]+)$/u)?.[1]?.toUpperCase();
  if (!slotId) return "Reader copy";
  if (/^2[A-Z]$/u.test(slotId)) return "Natal Moon";
  if (slotId === "3A" || /^6[A-D]$/u.test(slotId)) return "Current Sky placement";
  if (/^3[B-E]$/u.test(slotId) || /^4[A-I]$/u.test(slotId)) return "Personalized transit";
  if (/^5[A-K]$/u.test(slotId)) return "Natal placement";
  if (/^5[L-O]$/u.test(slotId)) return "Natal angle";
  if (/^5[P-S]$/u.test(slotId)) return "Natal aspect";
  if (/^6[E-F]$/u.test(slotId)) return "Current Sky aspect";
  if (/^6[G-L]$/u.test(slotId)) return "Retrograde timeline";
  if (slotId === "6M") return "Current Sky event";
  if (slotId === "6N") return "Sky detail";
  if (slotId === "6O") return "Calendar";
  return "Reader copy";
}

function templateDisplayName(contentKey: string, headline: string) {
  const destination = templateDestinationLabel(contentKey);
  let name = normalizeText(headline) || titleFromKey(contentKey);

  name = name
    .replace(/^compatibility\s+/iu, "")
    .replace(/^current[- ]sky\s+(?:aspect:\s*)?/iu, "")
    .replace(/^collective\s+planet\s+in\s+sign:\s*/iu, "")
    .replace(/^personalized\s+planet\/sign\/house:\s*/iu, "")
    .replace(/^natal\s+aspect:\s*/iu, "")
    .replace(/^angles:\s*/iu, "")
    .replace(/^moon\s+(?:sign|phase):\s*/iu, "")
    .replace(/^placement\s+core:\s*/iu, "")
    .replace(/\s+(?:slot|template|voice scaffold)$/iu, "")
    .trim();

  if (destination === "Current Sky placement") name = name.replace(/^current\s+/iu, "");
  if (destination === "Calendar") name = name.replace(/^calendar\s+/iu, "");

  if (!name) name = "Template";
  return `${destination} · ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
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
  // A published edition is the new baseline. Retained draft history must not
  // restart autosave or create a fresh revision merely by reopening it.
  if (draft.status === "LIVE") return compiledSkyArticleEditionForDraft(draft);
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
type AdminHookCatalogDomain = "sky" | "you" | "friends" | "modifier";
type AdminHookCatalogIndexPayload = {
  schemaVersion: 1;
  packageVersion: string;
  rows: Array<{ key: string; surface: AdminHookCatalogDomain; label?: string }>;
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

  const definitions = payload.rows.map(({ key, surface, label: packagedLabel }) => {
    const label = packagedLabel ?? fallbackHookDisplayTitle(key) ?? titleFromKey(key);
    const persistedSurface: GeneratedContentSurface = surface === "friends" ? "relationship" : surface;
    return {
      key,
      label,
      // "friends" is the catalog section; persisted content uses the
      // relationship surface so saved edits remain compatible with the API.
      surface: persistedSurface,
      mode: "feed",
      copy: { headline: label, summary: "", body: "" }
    };
  });
  return { definitions, packageVersion: payload.packageVersion };
}

async function loadAdminHookCatalogBodies(surface: AdminHookCatalogDomain): Promise<Map<string, string>> {
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

function rowTitleUncached(row: AdminGeneratedContentRow | AdminReviewRecord | AdminUserGeneratedContentRow) {
  if ("content_key" in row) {
    const lunar = lunarContentIdentity(row.content_key);
    if (lunar) return lunar.title;
    const structuredIdentity = skyFallbackIdentity(row.content_key);
    if (structuredIdentity) return structuredIdentity.title;
    const fallbackHookTitle = fallbackHookDisplayTitle(row.content_key);
    if (fallbackHookTitle) return fallbackHookTitle;
    if (row.content_key.startsWith("slot-template/")) return templateDisplayName(row.content_key, normalizeText(row.headline));
    const natalTemplateTitle = natalPlanetInSignTemplateTitle(row.content_key, normalizeText(row.headline));
    if (natalTemplateTitle) return natalTemplateTitle;
    return normalizeText(row.headline) || titleFromKey(row.content_key);
  }
  const natalTemplateTitle = natalPlanetInSignTemplateTitle(row.contentKey, normalizeText(row.title));
  if (natalTemplateTitle) return natalTemplateTitle;
  const structuredIdentity = skyFallbackIdentity(row.contentKey);
  if (structuredIdentity) return structuredIdentity.title;
  const fallbackHookTitle = fallbackHookDisplayTitle(row.contentKey);
  if (fallbackHookTitle) return fallbackHookTitle;
  return normalizeText(row.title) || normalizeText(row.summary) || titleFromKey(row.contentKey);
}

function rowBody(row: AdminGeneratedContentRow | AdminReviewRecord | AdminUserGeneratedContentRow) {
  return "content_key" in row ? normalizeText(row.body) : normalizeText(row.body);
}

function aspectContextForFields({
  contentKey,
  surface,
  mode,
  blockType,
  eventType,
  sourceSnapshot
}: {
  contentKey: string;
  surface: GeneratedContentSurface;
  mode: GeneratedContentMode;
  blockType?: string | null;
  eventType?: string | null;
  sourceSnapshot?: Record<string, unknown> | null;
}): AdminAspectContext | null {
  const sourceContentType = sourceSnapshotString(sourceSnapshot, "contentType");
  const sourceType = sourceSnapshotString(sourceSnapshot, "sourceType");
  const marker = [contentKey, surface, mode, blockType, eventType, sourceContentType, sourceType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const hasAspectMarker = /(?:^|[./_ -])aspect(?:$|[./_ -])/u.test(marker);

  if (!hasAspectMarker) return null;

  if (
    surface === "synastry"
    || surface === "relationship"
    || /(?:^|[./_ -])(?:synastry|relationship)[./_ -].*aspect|aspect.*(?:synastry|relationship)/u.test(marker)
  ) {
    return {
      key: "relationship",
      label: "Relationship aspect · synastry",
      detail: "A connection between placements in two people's charts."
    };
  }

  if (
    /personal[./_ -]transit[./_ -]aspect|transit[./_ -](?:to[./_ -])?natal|authored\/transit-aspect/u.test(marker)
    || (/(?:^|[./_ -])transit[./_ -]aspect/u.test(marker) && surface !== "sky")
  ) {
    return {
      key: "transit-to-natal",
      label: "Transit aspect · natal contact",
      detail: "A moving planet making an aspect to a placement in a person's natal chart."
    };
  }

  if (
    surface === "sky"
    || contentKey.toLowerCase().startsWith("sky.aspect.")
    || blockType === "sky_aspect"
    || eventType === "collective-aspect-card"
  ) {
    return {
      key: "sky-transit",
      label: "Transit aspect · current sky",
      detail: "Two bodies in the current sky making an aspect to each other."
    };
  }

  if (
    surface === "natal"
    || /natal[./_ -]aspect|aspect[./_ -]natal/u.test(marker)
  ) {
    return {
      key: "natal",
      label: "Natal aspect · birth chart",
      detail: "Two placements making an aspect within one natal chart."
    };
  }

  return {
    key: "unknown",
    label: "Aspect · context not recorded",
    detail: "This row is an aspect, but its saved metadata does not say whether it is natal, transit, or relationship copy."
  };
}

function aspectContextForRowUncached(row: AdminGeneratedContentRow | AdminReviewRecord) {
  if ("content_key" in row) {
    return aspectContextForFields({
      contentKey: row.content_key,
      surface: row.surface,
      mode: row.mode,
      blockType: row.block_type,
      eventType: row.event_type,
      sourceSnapshot: row.source_snapshot
    });
  }

  return aspectContextForFields({
    contentKey: row.contentKey,
    surface: row.surface,
    mode: row.mode,
    blockType: row.blockType,
    eventType: row.eventType,
    sourceSnapshot: row.sourceSnapshot
  });
}

function aspectContextForDraft(draft: AdminDraft) {
  return aspectContextForFields({
    contentKey: draft.contentKey,
    surface: draft.surface,
    mode: draft.mode,
    blockType: draft.blockType,
    sourceSnapshot: draft.sourceSnapshot
  });
}

function rowTypeLabelUncached(row: AdminGeneratedContentRow) {
  const structuredIdentity = skyFallbackIdentity(row.content_key);
  if (structuredIdentity) return structuredIdentity.typeLabel;
  if (row.content_key.startsWith("slot-template/")) return `Copy pattern for ${templateDestinationLabel(row.content_key).toLowerCase()}`;
  const aspectContext = aspectContextForRow(row);
  if (aspectContext) return aspectContext.label;
  if (row.content_key.startsWith("authored/career-transit-house/")) return "Transit house passage";
  if (row.content_key.startsWith("authored/career-placement/")) return "Natal placement passage";
  if (row.content_key.startsWith("authored/career-transit/")) return "Personal transit passage";
  return contentClassLabel(contentClassForRow(row));
}

function compareFallbackRows(left: AdminGeneratedContentRow, right: AdminGeneratedContentRow, sort: AdminFallbackRowSort) {
  const compare = (first: string, second: string) => naturalCollator.compare(first, second);
  const titleDifference = compare(rowTitle(left), rowTitle(right));

  if (sort === "title-desc") return -titleDifference || compare(right.content_key, left.content_key);
  if (sort === "type") {
    return compare(rowTypeLabel(left), rowTypeLabel(right))
      || titleDifference
      || compare(left.content_key, right.content_key);
  }
  return titleDifference || compare(left.content_key, right.content_key);
}

function contentClassForRowUncached(row: AdminGeneratedContentRow | AdminReviewRecord): AdminContentClass {
  const contentKey = "content_key" in row ? row.content_key : row.contentKey;
  if (contentKey.startsWith("authored/sky-lunation-macro/")) return "phrasebank";
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

  if (isContentStudioReferenceSource(contentKey, sourceSnapshot ?? {})) return "reference";
  if (provider === "manual" && sourceSnapshotString(sourceSnapshot, "sourceFile").includes("authored-library")) return "phrasebank";
  if (rowIsFallbackArchitectureV3(row)) {
    const packageRole = sourceRole || String(rowPackageRecord(row).content_role ?? "").toLowerCase().replace(/_/g, "-");
    if (packageRole === "fallback-hook" || packageRole === "template") return "fallback-hook";
    if (packageRole === "vocabulary") return "vocab";
    if (packageRole === "fallback-source" || packageRole === "source-material") return "reference";
    if (packageRole === "full-copy" || packageRole === "authored-card") return "phrasebank";
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

  if (isContentStudioReferenceSource(draft.contentKey, draft.sourceSnapshot ?? {})) {
    return {
      ...draft.sourceSnapshot,
      content_role: draft.contentKey.startsWith("source/") ? "fallback_source" : draft.sourceSnapshot?.content_role,
      review_status: fallbackHookReviewStatusForDraft(draft)
    };
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

function isCalendarAspectContentRow(row: AdminGeneratedContentRow | AdminReviewRecord) {
  const contentKey = "content_key" in row ? row.content_key : row.contentKey;
  return contentKey.startsWith("sky-card/")
    || contentKey.startsWith("fallback-hook/sky-aspect-sign/")
    || contentKey.startsWith("sky.aspect.");
}

function contentCategoryForRow(row: AdminGeneratedContentRow | AdminReviewRecord): AdminContentCategoryFilter {
  const contentKey = "content_key" in row ? row.content_key : row.contentKey;
  const surface = "content_key" in row ? row.surface : row.surface;
  const blockType = "content_key" in row ? row.block_type : row.blockType;

  if (isCalendarAspectContentRow(row)) return "Calendar Aspects";

  if (
    contentKey.startsWith("fallback-hook/transit-house-event-")
    || contentKey.startsWith("fallback-hook/transit-effect-hard/")
    || contentKey.startsWith("fallback-hook/transit-effect-soft/")
    || contentKey.startsWith("authored/transit-aspect/")
    || contentKey === "fallback-template/transit.aspect"
    || contentKey.startsWith("cms/personal-transit-aspect")
  ) return "Personal Transits";
  if (
    contentKey.startsWith("authored/transit-house/")
    || contentKey.startsWith("authored/transit-house-intro/")
    || contentKey.startsWith("authored/transit-house-sign/")
    || contentKey.startsWith("fallback-hook/transit-house-retro-overlay/")
    || contentKey.startsWith("fallback-hook/transit-effect-house/")
    || contentKey === "fallback-template/transit.house"
  ) return "House Transits";
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

function housePassageAvailabilityLabel(availability: "Reader-ready" | "Source candidate") {
  return availability === "Reader-ready" ? "Complete horoscope" : "Supporting passage";
}

function fallbackSectionForKey(key: string, surface?: string): Exclude<AdminFallbackHookSectionFilter, "all"> {
  if (key.startsWith("fallback-hook/daily-headline/") || key.startsWith("fallback-hook/daily-body/") || key.startsWith("fallback-hook/pair-daily/")) return "daily";
  if (key.startsWith("authored/calendar-weekly-moon/") || key.includes("lunar") || key.startsWith("lunation/") || key.startsWith("season/") || key.startsWith("season-arc/") || key.startsWith("transit-fallback/")) return "lunar-calendar";
  if (key.includes("settings") || surface === "settings") return "settings";
  if (key.includes("friends") || key.includes("synastry") || key.includes("relationship") || key.includes("bond-effect") || surface === "friends" || surface === "relationship" || surface === "synastry" || surface === "composite") return "friends";
  if (key.includes("natal") || key.includes("you") || surface === "you" || surface === "natal") return "you";
  return "sky";
}

function surfaceAreaForFallbackSection(section: AdminFallbackHookSectionFilter): WritingSurfaceAreaFilter {
  if (section === "lunar-calendar") return "calendar";
  if (section === "daily") return "all";
  return section;
}

function areaForWritingSurface(item: WritingSurfaceMapItem): WritingSurfaceAreaFilter {
  if (item.area === "Friends") return "friends";
  if (item.area === "Natal" || item.area === "Transits") return "you";
  if (item.area === "Reports") return "reports";
  if (item.area === "System") return "settings";
  if (item.surface.includes("Calendar")) return "calendar";
  return "sky";
}

function statusForWritingSurface(item: WritingSurfaceMapItem, accessById: Record<string, WritingSurfaceAdminAccess>): WritingSurfaceStatusFilter {
  const access = accessById[item.id];
  if (!access) return "missing";
  return access.editability === "editable" ? "complete" : access.editability === "partial" ? "partial" : "missing";
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

    if ([400, 409, 422].includes(error.status) && error.details) return error.details;
    return `${error.path} failed with HTTP ${error.status}${error.details ? `: ${error.details}` : "."}`;
  }

  return error instanceof Error ? error.message : "Could not load admin content.";
}

async function adminJsonRequest<T>(path: string, secret: string, options: RequestInit = {}) {
  const method = options.method ?? "GET";
  const normalizedSecret = normalizeAdminSecret(secret);
  const controller = new AbortController();
  const externalSignal = options.signal;
  let timedOut = false;
  const abortFromCaller = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abortFromCaller();
  else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, path === "/api/admin/sky-draft-writing" ? 305_000 : 10_000);
  let response: Response;
  let payload: unknown;

  try {
    response = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...adminCredentialHeaders(normalizedSecret),
        ...options.headers
      }
    });
    payload = await response.json().catch(() => null);
  } catch (error) {
    if (timedOut) {
      throw new AdminRequestError(`${path} timed out. Your edit was not reported as saved.`, {
        status: 408,
        path,
        method,
        details: "The request timed out. Reload before retrying so you do not overwrite a late response."
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  }

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

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AdminRequestError("Invalid response schema.", {
      status: response.status, path, method,
      details: "Expected a JSON object. The response was empty or invalid."
    });
  }
  return payload as T;
}

const generatedContentPageRetryDelaysMs = [350, 1_000];

function isRetryableAdminReadError(error: unknown) {
  if (!(error instanceof AdminRequestError)) return true;
  return error.status === 200 || error.status === 408 || error.status === 429 || error.status >= 500;
}

async function loadGeneratedContentPage(path: string, secret: string, signal?: AbortSignal) {
  for (let attempt = 0; ; attempt += 1) {
    if (signal?.aborted) throw signal.reason ?? new Error("Content inventory load was cancelled.");
    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[]; nextCursor?: string | null }>(path, secret, { signal });
      assertRowsPayload(payload, path);
      return payload;
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error;
      const retryDelay = generatedContentPageRetryDelaysMs[attempt];
      if (retryDelay === undefined || !isRetryableAdminReadError(error)) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
    }
  }
}

async function loadAllGeneratedContentRows(
  secret: string,
  query: StudioInventoryQuery,
  onPage?: (rows: AdminGeneratedContentRow[], complete: boolean) => void,
  signal?: AbortSignal
) {
  const pageSize = query.scope === "compatibility" ? 500 : 400;
  const allRows: AdminGeneratedContentRow[] = [];
  const prefixPages: Array<string | null> = query.prefixes.length ? query.prefixes : [null];
  let lastEmitAt = 0;

  for (let prefixIndex = 0; prefixIndex < prefixPages.length; prefixIndex += 1) {
    const prefix = prefixPages[prefixIndex];
    let cursor: string | null = null;
    for (let page = 0; page < 125; page += 1) {
      if (signal?.aborted) throw signal.reason ?? new Error("Content inventory load was cancelled.");
      const result = await loadGeneratedContentPage(
        studioInventoryRequestPath(
          prefix ? { ...query, prefixes: [prefix] } : { ...query, prefixes: [] },
          pageSize,
          cursor
        ),
        secret,
        signal
      );
      const pageRows = assertRowsPayload(result, "/api/admin/generated-content");
      allRows.push(...pageRows);
      const complete = !result.nextCursor && prefixIndex === prefixPages.length - 1;
      const now = Date.now();
      if (complete || page === 0 && prefixIndex === 0 || now - lastEmitAt >= 600) {
        lastEmitAt = now;
        onPage?.(dedupeGeneratedContentRows(allRows), complete);
      }
      if (!result.nextCursor) break;
      cursor = result.nextCursor ?? null;
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
  const packageRecord = rowPackageRecord(row);
  const packageDraft = objectRecord(objectRecord(row.sections)?.packageDraft);
  const editablePackageRecord = packageDraft ?? packageRecord;
  const isVocabularyRow = row.block_type === "vocabulary_phrase"
    || row.content_key.startsWith("vocab/")
    || row.content_key.startsWith("fallback-vocab/")
    || packageRecord.content_role === "vocabulary";
  const canonicalHeadline = typeof editablePackageRecord.headline === "string" ? editablePackageRecord.headline : normalizeText(row.headline);
  const importedSummary = row.provider === "manual" && /^(REVIEWED|CONFIRMED|DRAFT) · /.test(row.summary ?? "") ? row.summary : null;
  const canonicalSummary = importedSummary ? "" : typeof editablePackageRecord.summary === "string" ? editablePackageRecord.summary : normalizeText(row.summary);
  const canonicalBody = typeof editablePackageRecord.body === "string"
    ? editablePackageRecord.body
    : typeof editablePackageRecord.body_you === "string"
      ? editablePackageRecord.body_you
      : normalizeText(row.body);
  return {
    id: row.id.startsWith("package:") ? null : row.id,
    updatedAt: row.updated_at,
    contentKey: row.content_key,
    surface: row.surface,
    mode: row.mode,
    status: row.status,
    headline: natalPlanetInSignTemplateHeadline(
      row.content_key,
      houseHoroscopeCoreHeadline(row.content_key, canonicalHeadline)
    ),
    summary: canonicalSummary,
    body: canonicalBody
      || (isVocabularyRow && typeof editablePackageRecord.body === "string" ? editablePackageRecord.body : ""),
    lane: row.lane ?? "serving",
    reviewState: row.review_state ?? "",
    blockType: row.block_type ?? "",
    promptVersion: row.prompt_version ?? "manual-admin",
    sections: objectRecord(row.sections),
    facts: row.facts ?? null,
    reviewerNotes: row.reviewer_notes ?? "",
    sourceSnapshot: importedSummary ? { ...row.source_snapshot, importSummary: importedSummary } : row.source_snapshot ?? null
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


/* Per-row derivations are pure in the row object, so each runs once per row.
   See derivedCache.ts for why this matters at 9,000 rows. */
const rowTitle = memoByObject(rowTitleUncached);
const rowTypeLabel = memoByObject(rowTypeLabelUncached);
const contentClassForRow = memoByObject(contentClassForRowUncached);
const rowSearchText = memoByObject(rowSearchTextUncached);
const visibleRowSearchText = memoByObject(visibleRowSearchTextUncached);
const skyWriteupSearchText = memoByObject(skyWriteupSearchTextUncached);
const fallbackHookVisibleSearchText = memoByObject(fallbackHookVisibleSearchTextUncached);
const aspectContextForRow = memoByObject(aspectContextForRowUncached);

export function GeneratedContentAdminDashboard() {
  const [studioTheme, setStudioTheme] = useState(getStudioTheme);
  const [studioPalette, setStudioPalette] = useState(getStudioPalette);
  function toggleStudioTheme() {
    const next = studioTheme === "dark" ? "light" : "dark";
    setStudioTheme(next);
    saveStudioTheme(next);
  }
  function toggleStudioPalette() {
    const next = studioPalette === "green" ? "neutral" : "green";
    setStudioPalette(next);
    saveStudioPalette(next);
  }
  const [secret, setSecret, setTransientCredential] = useSavedSecret();
  const [variableCreateRequest, setVariableCreateRequest] = useState(0);
  const [secretInput, setSecretInput] = useState(secret);
  const loadCalendarPreviewRows = useCallback(async (keys: string[]) => {
    const query = new URLSearchParams({ status: "all", visibility: "all", limit: "1000" });
    keys.forEach(key => query.append("contentKeys", key));
    const payload = await adminJsonRequest<{ rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?${query}`, secret);
    if (!Array.isArray(payload.rows) || payload.rows.length >= 1000 || payload.rows.some(row => !keys.includes(row.content_key) || row.inventory_only)) {
      throw new Error("Could not verify the full saved Calendar sources.");
    }
    return payload.rows;
  }, [secret]);
  const [activePage, setActivePage] = useState<AdminDashboardPage>(() => parseAdminHash().page);
  const friendsTransitAudience = parseAdminHash().params.get("audience") === "friends";
  const [rows, setRows] = useState<AdminGeneratedContentRow[]>([]);
  const [allRowsLoaded, setAllRowsLoaded] = useState(false);
  const [reviewRows, setReviewRows] = useState<AdminReviewRecord[]>([]);
  const [, setPublicationVersion] = useState(0);
  useEffect(() => {
    const unsubscribe = subscribeToContentPublications(() => setPublicationVersion((version) => version + 1));
    void refreshContentPublications(true);
    return unsubscribe;
  }, []);
  const [userRows, setUserRows] = useState<AdminUserGeneratedContentRow[]>([]);
  const [facts, setFacts] = useState<AdminContentFact[]>([]);
  const [message, setMessage] = useState("");
  const [loadState, setLoadState] = useState<AdminLoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadDiagnostics, setLoadDiagnostics] = useState<string | null>(null);
  // Inventory reads have their own loadState; only an editor/action request blocks writing.
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  // A plain "Loaded …" confirmation is useful once; warnings and errors stay until dismissed.
  useEffect(() => {
    if (loadState !== "loaded" || !/^Loaded /u.test(message) || message.includes("Partial load:")) return;
    const timer = window.setTimeout(() => setMessage((current) => current === message ? "" : current), 4000);
    return () => window.clearTimeout(timer);
  }, [message, loadState]);
  const [operationsNavOpen, setOperationsNavOpen] = useState<boolean | null>(null);
  const [isDesktopNav, setIsDesktopNav] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktopNav(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [contentStatusFilter, setContentStatusFilter] = useState<"LIVE" | "NOT_LIVE" | "all">("all");
  const [contentLibraryView, setContentLibraryView] = useState<ContentLibraryView>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<GeneratedContentStatus | "all">("all");
  const [skyVoiceQueueView, setSkyVoiceQueueView] = useState<SkyVoiceQueueView>("ready");
  const [liveOmittedSections, setLiveOmittedSections] = useState<LiveOmittedSectionReviewItem[]>(() => readLiveOmittedSectionQueue());
  const [sharedLiveOmittedSections, setSharedLiveOmittedSections] = useState<LiveOmittedSectionReviewItem[]>([]);
  const [sharedLiveOmittedSectionsLoaded, setSharedLiveOmittedSectionsLoaded] = useState(false);
  const [skyReviewHorizon, setSkyReviewHorizon] = useState<SkyReviewHorizon | null>(null);
  const [skyReviewHorizonError, setSkyReviewHorizonError] = useState<string | null>(null);
  const [contentClassFilter, setContentClassFilter] = useState<AdminContentClassFilter>("all");
  const [tierFilter, setTierFilter] = useState<AdminPhrasebankTierFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<AdminContentCategoryFilter>("all");
  const [showReferenceRows, setShowReferenceRows] = useState(false);
  const [showRetiredRows, setShowRetiredRows] = useState(false);
  const [query, setQuery] = useState("");
  const [friendsActivationQuery, setFriendsActivationQuery] = useState("");
  const [guidedReviewKey, setGuidedReviewKey] = useState<string | null>(() => {
    const { page, params } = parseAdminHash();
    return page === "content" && params.get("from") === "unresolved" ? params.get("q") : null;
  });
  const [natalPlacementPlanet, setNatalPlacementPlanet] = useState<NatalPlacementPlanet | "">("");
  const [natalPlacementSign, setNatalPlacementSign] = useState<NatalPlacementSign | "">("");
  const [natalPlacementHouse, setNatalPlacementHouse] = useState<NatalPlacementHouse | "">("");
  const [natalPlacementMotion, setNatalPlacementMotion] = useState<NatalPlacementMotion>("direct");
  const [natalSourcesLoading, setNatalSourcesLoading] = useState(false);
  const [natalAspectFirst, setNatalAspectFirst] = useState("");
  const [natalAspectName, setNatalAspectName] = useState("");
  const [natalAspectSecond, setNatalAspectSecond] = useState("");
  const [fallbackSectionFilter, setFallbackSectionFilter] = useState<AdminFallbackHookSectionFilter>("all");
  const friendsBetweenYouTwoWorkspace = friendsTransitAudience
    && fallbackSectionFilter === "friends"
    && (parseAdminHash().params.get("workspace") === "between-you-two" || query.includes("bond-effect"));
  // The title field and the composition describe one selection, so entering the
  // workspace writes the pairing the map is showing into the route instead of leaving
  // an empty field beside a populated map. Seeding once per visit keeps a field the
  // owner clears available for typing, and a pairing already in the route is kept.
  const betweenYouTwoSeededRef = useRef(false);
  useEffect(() => {
    if (!friendsBetweenYouTwoWorkspace) {
      betweenYouTwoSeededRef.current = false;
      return;
    }
    if (betweenYouTwoSeededRef.current) return;
    betweenYouTwoSeededRef.current = true;
    if (query.trim() || parseAdminHash().params.get("q")?.trim()) return;
    persistBetweenYouTwoRoute(friendsTransitCompositionQuery(query));
  }, [friendsBetweenYouTwoWorkspace, query]);
  const [fallbackRowSort, setFallbackRowSort] = useState<AdminFallbackRowSort>("type");
  const [surfaceAreaFilter, setSurfaceAreaFilter] = useState<WritingSurfaceAreaFilter>("all");
  const [surfaceStatusFilter, setSurfaceStatusFilter] = useState<WritingSurfaceStatusFilter>("all");
  const [vocabularyCategory, setVocabularyCategory] = useState<AdminVocabularyCategoryFilter>("planets");
  const [articleStatusFilter, setArticleStatusFilter] = useState<GeneratedContentStatus | "all">("LIVE");
  const [articlePointFilter, setArticlePointFilter] = useState<AdminArticlePointFilter>("all");
  const [skyPlacementBody, setSkyPlacementBody] = useState("all");
  const [skyPlacementSign, setSkyPlacementSign] = useState("all");
  const [skyWriteupSubjectFilter, setSkyWriteupSubjectFilter] = useState<AdminSkyWriteupSubjectFilter>("all");
  const [skyWriteupQuery, setSkyWriteupQuery] = useState("");
  const [skyWriteupMotionFilter, setSkyWriteupMotionFilter] = useState<ContentMotionFilter>("all");
  const [skyWriteupDestinationFilter, setSkyWriteupDestinationFilter] = useState<ContentDestinationFilter>("all");
  const [skyWriteupSort, setSkyWriteupSort] = useState<ContentPlacementSort>("updated-desc");
  const [skyWriteupWorkspaceView, setSkyWriteupWorkspaceView] = useState<SkyWriteupWorkspaceView>("catalog");
  const [calendarWriteupWorkspaceView, setCalendarWriteupWorkspaceView] = useState<CalendarWriteupWorkspaceView>("daily-sky");
  const [transitReadingContext, setTransitReadingContext] = useState<import("./transitNatalSources").TransitNatalReadingContext>({});
  const [transitNatalPlanet, setTransitNatalPlanet] = useState<TransitNatalPlanet | "">("");
  const [transitNatalSign, setTransitNatalSign] = useState<TransitNatalSign | "">("");
  const [transitNatalTransitHouse, setTransitNatalTransitHouse] = useState<TransitNatalHouse | "">("");
  const [transitNatalAspect, setTransitNatalAspect] = useState<TransitNatalAspect | "">("");
  const [transitNatalPoint, setTransitNatalPoint] = useState<TransitNatalPoint | "">("");
  const [transitNatalNatalHouse, setTransitNatalNatalHouse] = useState<TransitNatalHouse | "">("");
  const [transitNatalLiveServing, setTransitNatalLiveServing] = useState<{ contentKey: string; field: string } | null>(null);
  const [transitNatalQuery, setTransitNatalQuery] = useState("");
  const [houseTransitPlanet, setHouseTransitPlanet] = useState<TransitNatalPlanet | "">("");
  const [houseTransitSign, setHouseTransitSign] = useState<TransitNatalSign | "">("");
  const [houseTransitHouse, setHouseTransitHouse] = useState<TransitNatalHouse | "">("");
  const [houseTransitMotion, setHouseTransitMotion] = useState<HouseTransitMotion>("direct");
  const [houseTransitEditor, setHouseTransitEditor] = useState<{ title: string; audience: "you" | "friends"; sources: HouseTransitEditorSource[] } | null>(null);
  const [houseTransitOpening, setHouseTransitOpening] = useState(false);
  const houseTransitOpenRequest = useRef(0);
  const houseTransitEditorDrafts = useRef(new Map<string, { draft: AdminDraft; source: HouseTransitEditorSource; kind: HouseTransitSource["id"] }>());
  const houseTransitCloseGuard = useRef<(() => boolean) | null>(null);
  const [transitNatalSourceBodies, setTransitNatalSourceBodies] = useState<Map<string, string>>(() => new Map());
  const [articleContentSystemFilter, setArticleContentSystemFilter] = useState<AdminContentSystemFilter>("all");
  const [articleQuery, setArticleQuery] = useState("");
  const [astro101Query, setAstro101Query] = useState("");
  const [compatibilitySectionFilter, setCompatibilitySectionFilter] = useState<AdminCompatibilitySectionFilter>("all");
  const [compatibilityStatusFilter, setCompatibilityStatusFilter] = useState<GeneratedContentStatus | "all">("all");
  const [compatibilityPlanetFilter, setCompatibilityPlanetFilter] = useState<AdminArticlePointFilter>("all");
  const [compatibilitySort, setCompatibilitySort] = useState<AdminCompatibilitySort>("updated-desc");
  const [compatibilityQuery, setCompatibilityQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkStatus, setBulkStatus] = useState<GeneratedContentStatus>("REVIEWED");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [editorSourceRow, setEditorSourceRow] = useState<AdminGeneratedContentRow | null>(null);
  const [dailyGlanceContext, setDailyGlanceContext] = useState<DailyGlanceContext | null>(null);
  const [dailyGlanceContextError, setDailyGlanceContextError] = useState<string | null>(null);
  const [dailyGlanceContextLoading, setDailyGlanceContextLoading] = useState(false);
  const [dailyGlancePairSelector, setDailyGlancePairSelector] = useState<string | null>(null);
  const [skyWriteupParentId, setSkyWriteupParentId] = useState<string | null>(null);
  const [skyRelatedAspectQuery, setSkyRelatedAspectQuery] = useState("");
  const [skyFallbackPreviewFacts, setSkyFallbackPreviewFacts] = useState<Record<string, string>>({});
  const [skyFallbackVariableTarget, setSkyFallbackVariableTarget] = useState("");
  const [skyWritingContext, setSkyWritingContext] = useState<{ fieldPath?: string; selection?: SkyPlacementSelection }>({});
  const [templateVariableReferenceOpen, setTemplateVariableReferenceOpen] = useState(false);
  const [buildVariableReferences, setBuildVariableReferences] = useState<typeof import("./templateVariableReference").templateVariableReferences | null>(null);
  const [calendarCreateRequest, setCalendarCreateRequest] = useState(0);
  const [templateVariableQuery, setTemplateVariableQuery] = useState("");
  const [selectedTemplateVariableName, setSelectedTemplateVariableName] = useState<string | null>(null);
  const [selectedTemplateVariableSourceId, setSelectedTemplateVariableSourceId] = useState<string | null>(null);
  const [compositionEditorContext, setCompositionEditorContext] = useState<CompositionEditorContext | null>(null);
  const [skyArticleEditionForm, setSkyArticleEditionForm] = useState<SkyArticleEditionForm | null>(null);
  const [skyArticleEditor, setSkyArticleEditor] = useState<SkyArticleEditorState | null>(null);
  const [draft, setDraft] = useState<AdminDraft | null>(null);
  const customVariableLibrary = useStudioCustomVariables(secret, Boolean(secret));
  const [fallbackHookEditorGuidanceBuilder, setFallbackHookEditorGuidanceBuilder] = useState<FallbackHookEditorGuidanceBuilder | null>(null);
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
  const acceptedHashRef = useRef(window.location.hash || "#review-queue");
  const routeNavigationGuardRef = useRef<() => boolean>(() => true);
  const guidedReviewOpenedRef = useRef("");
  const sourceOpenRequestRef = useRef(0);
  const openExactTransitNatalSourceRef = useRef<(selection: TransitNatalContact & Partial<Pick<TransitNatalSelection, "sign" | "transitHouse" | "natalHouse">>) => Promise<void>>(async () => {});
  const transitNatalSelectionRef = useRef({
    planet: "" as TransitNatalPlanet | "",
    aspect: "" as TransitNatalAspect | "",
    natalPoint: "" as TransitNatalPoint | "",
    sign: "" as TransitNatalSign | "",
    transitHouse: "" as TransitNatalHouse | "",
    natalHouse: "" as TransitNatalHouse | ""
  });
  const transitExactDismissedKeyRef = useRef<string | null>(null);
  const pendingExactAiCopyRef = useRef<{ key: string; you?: string; friend?: string } | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const variableInsertionRef = useRef<{ element: HTMLTextAreaElement; start: number; end: number } | null>(null);
  const editorReturnFocusRef = useRef<HTMLElement | null>(null);
  const [editorSaveError, setEditorSaveError] = useState("");
  const editorBaselineRef = useRef<string | null>(null);
  const editorSavedInputRef = useRef<string | null>(null);
  const hookCatalogRequestRef = useRef<Promise<{ definitions: FallbackHookDefinition[]; packageVersion: string }> | null>(null);
  const hookBodyPackagesRef = useRef(new Map<AdminHookCatalogDomain, Map<string, string>>());
  const hookBodyRequestsRef = useRef(new Map<AdminHookCatalogDomain, Promise<Map<string, string>>>());
  const natalUnsavedSourcesRef = useRef(new Set<string>());
  const editorSessionRef = useRef(0);
  const skyArticleSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const skyArticleWorkspaceSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const articleAutosaveRowRef = useRef<AdminGeneratedContentRow | null>(null);
  const workspaceAutosaveRowRef = useRef<AdminGeneratedContentRow | null>(null);
  const skyArticleAutosaveSequenceRef = useRef(0);
  const skyArticleWorkspaceAutosaveSequenceRef = useRef(0);
  const dashboardLoadSequenceRef = useRef(0);
  const dashboardLoadControllerRef = useRef<AbortController | null>(null);
  const loadedInventoryKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!draft || buildVariableReferences) return;
    let active = true;
    void import("./templateVariableReference")
      .then(module => { if (active) setBuildVariableReferences(() => module.templateVariableReferences); })
      .catch(() => { if (active) setEditorSaveError("The variable reference could not load. Reload Studio to try again."); });
    return () => { active = false; };
  }, [Boolean(draft), buildVariableReferences]);

  useEffect(() => {
    if (!draft || !draftIsFallbackHook(draft)) return;

    let active = true;
    void import("./DailyFallbackWorkspaceGuide")
      .then((module) => module.loadFallbackHookEditorGuidance())
      .then((builder) => {
        if (active) setFallbackHookEditorGuidanceBuilder(() => builder);
      })
      .catch(() => {
        if (active) setFallbackHookEditorGuidanceBuilder(null);
      });

    return () => {
      active = false;
    };
  }, [draft?.blockType, draft?.contentKey]);

  useEffect(() => {
    setLiveOmittedSections(readLiveOmittedSectionQueue());
    return subscribeToLiveOmittedSectionQueue(setLiveOmittedSections);
  }, []);

  const visibleLiveOmittedSections = useMemo(() => {
    const sharedIdentities = new Set(sharedLiveOmittedSections.map(liveOmissionIdentity));
    return [
      ...sharedLiveOmittedSections,
      ...liveOmittedSections.filter((item) => !sharedIdentities.has(liveOmissionIdentity(item)))
    ].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
  }, [liveOmittedSections, sharedLiveOmittedSections]);

  const editableRowsByContentKey = useMemo(() => new Map(rows.map((row) => [row.content_key, row])), [rows]);
  const [compositionCatalog, setCompositionCatalog] = useState<AdminGeneratedContentRow[]>([]);
  useEffect(() => {
    if (!["compositionMap", "skyWriteups"].includes(activePage) || !secret.trim()) return;
    let cancelled = false;
    void adminJsonRequest<{ ok: boolean; rows?: Array<{ content_key: string; headline: string | null; role: string }> }>("/api/admin/content-live-status", secret, {
      method: "POST", body: JSON.stringify({ action: "composition-catalog" })
    }).then((payload) => {
      if (cancelled) return;
      setCompositionCatalog((payload.rows ?? []).map((item) => ({
        id: `package:${item.content_key}`, content_key: item.content_key, headline: item.headline ?? item.content_key,
        body: null, summary: null, surface: "sky", status: "DRAFT", sections: null,
        inventory_only: true, block_type: item.role === "template" ? "fallback_template" : "fallback_hook"
      } as AdminGeneratedContentRow)));
    }).catch((error) => { if (!cancelled) setMessage(dashboardErrorMessage(error)); });
    return () => { cancelled = true; };
  }, [activePage, secret]);
  const compositionRows = useMemo(() => {
    const savedKeys = new Set(rows.filter((row) => !row.id.startsWith("package:")).map((row) => row.content_key));
    const ids = new Set(rows.map((row) => row.id));
    return [...rows, ...compositionCatalog.filter((row) => !savedKeys.has(row.content_key) && !ids.has(row.id))];
  }, [rows, compositionCatalog]);
  const visibleRows = useMemo(() => rows.filter((row) => (
    (showReferenceRows
      || (activePage === "reviewQueue" && isContentStudioReferenceSource(row.content_key, row.source_snapshot ?? {}))
      || (activePage === "content" && categoryFilter === "Calendar Aspects")
      || (showRetiredRows && isRetiredAdminRow(row))
      || isCompositionPage(activePage)
      || (activePage === "skyWriteups" && isSkyWriteupLibraryRow(row))
      || !isPassiveReferenceAdminRow(row))
    && !row.id.startsWith("package:")
    && !row.content_key.startsWith("studio-variable/")
    && (showRetiredRows || !isRetiredAdminRow(row))
  )), [rows, activePage, categoryFilter, showReferenceRows, showRetiredRows]);
  const savedFallbackRows = useMemo(
    () => visibleRows.filter((row) => contentClassForRow(row) === "fallback-hook" || row.content_key.startsWith("authored/calendar-weekly-moon/")),
    [visibleRows]
  );
  const dailyGlanceWriteups = useMemo(
    () => dailyGlancePairs(savedFallbackRows),
    [savedFallbackRows]
  );
  const selectedDailyGlancePair = dailyGlancePairSelector
    ? dailyGlanceWriteups.find((pair) => pair.selector === dailyGlancePairSelector) ?? null
    : null;
  const savedContentKeys = useMemo(() => new Set(visibleRows.map((row) => row.content_key)), [visibleRows]);
  const vocabRows = useMemo(
    () => visibleRows.filter((row) => contentClassForRow(row) === "vocab"),
    [visibleRows]
  );
  const slotEditableRows = useMemo(
    () => visibleRows.filter((row) => {
      const contentClass = contentClassForRow(row);
      return contentClass === "vocab" || contentClass === "fallback-hook" || isCompositionTemplateRow(row);
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
  const astro101Rows = useMemo(
    () => visibleRows.filter(isAstro101LibraryRow).sort((left, right) => left.content_key.localeCompare(right.content_key)),
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
  const filteredSkyWriteupRows = useMemo(() => sortPlacementRows(skyWriteupRows.filter((row) => (
    (skyPlacementBody === "all" || skyWriteupContextForRow(row)?.planet === skyPlacementBody)
    && (skyPlacementSign === "all" || skyWriteupContextForRow(row)?.sign === skyPlacementSign || /^sky-placement\/retrograde\/[^/]+$/.test(row.content_key))
    && (skyWriteupSubjectFilter === "all" || skyWriteupSubjectTypeForRow(row) === skyWriteupSubjectFilter)
    && (skyWriteupMotionFilter === "all" || /^sky-placement\/article\//u.test(row.content_key) || contentMotion(row) === skyWriteupMotionFilter)
    && (skyWriteupDestinationFilter === "all" || contentDestinations(row).has(skyWriteupDestinationFilter))
    && matchesAdminSearch(skyWriteupSearchText(row), skyWriteupQuery)
  )), skyWriteupSort), [skyPlacementBody, skyPlacementSign, skyWriteupDestinationFilter, skyWriteupMotionFilter, skyWriteupQuery, skyWriteupRows, skyWriteupSort, skyWriteupSubjectFilter]);
  const publishedButUnwiredSkyRows = useMemo(
    () => skyWriteupRows.filter(isPublishedButUnwired),
    [skyWriteupRows]
  );
  const filteredArticleRows = useMemo(() => articleRows.filter((row) => {
    return (articleStatusFilter === "all" || row.status === articleStatusFilter)
      && (articlePointFilter === "all" || articlePointForRow(row) === articlePointFilter)
      && (articleContentSystemFilter === "all" || contentSystemForRole(contentRoleForRecord(row)) === articleContentSystemFilter)
      && matchesAdminSearch(visibleRowSearchText(row), articleQuery);
  }), [articleRows, articleStatusFilter, articlePointFilter, articleContentSystemFilter, articleQuery]);
  const filteredAstro101Rows = useMemo(() => astro101Rows.filter((row) => (
    matchesAdminSearch(visibleRowSearchText(row), astro101Query)
  )), [astro101Query, astro101Rows]);
  const compatibilityRows = useMemo(
    () => rows.filter((row) => !isRetiredAdminRow(row) && isCompatibilityRow(row)),
    [rows]
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
        && matchesAdminSearch(compatibilityVisibleSearchText(row), compatibilitySearch)
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
  // Keep an open editor attached to its canonical saved row even when a save
  // changes status/lane metadata and the row no longer matches the current
  // visible filters. Otherwise a successful save can make `selectedRow`
  // disappear, leaving the editor permanently marked as unsaved. Keep a source snapshot
  // too: a package source is absent from the database inventory by design.
  const selectedRow = rows.find((row) => row.id === selectedRowId)
    ?? (editorSourceRow?.id === selectedRowId ? editorSourceRow : null);
  const calendarAspectFilterScopeActive = activePage === "content" && categoryFilter === "Calendar Aspects";
  const reviewQueueRows = useMemo(() => {
    const rowsByKey = new Map<string, AdminReviewRecord>();

    visibleRows
      .filter(generatedRowNeedsReviewQueue)
      .forEach((row) => rowsByKey.set(row.content_key, reviewRecordFromGeneratedRow(row)));
    reviewRows.forEach((row) => {
      const saved = rows.find((candidate) => candidate.id === row.id || candidate.content_key === row.contentKey);
      rowsByKey.set(row.contentKey || row.id, saved ? reviewRecordFromGeneratedRow(saved) : row);
    });

    return [...rowsByKey.values()];
  }, [reviewRows, visibleRows, rows]);
  const [statusFiltersOpen, setStatusFiltersOpen] = useState(false);
  const loadLiveStatus = useContentLiveStatusLoader(async (ids) => {
    const result = await adminJsonRequest<{ ok: boolean; statuses: LiveStatus[] }>("/api/admin/content-live-status", secret, { method: "POST", body: JSON.stringify({ ids }) });
    if (!Array.isArray(result.statuses)) throw new Error("Could not verify content status.");
    return result.statuses;
  }, secret);
  const statusCountRows = useMemo(() => visibleRows.filter((row) =>
    (contentLibraryView === "all" || isCompatibilityRow(row))
    && (calendarAspectFilterScopeActive || contentClassFilter === "all" || contentClassForRow(row) === contentClassFilter)
    && (calendarAspectFilterScopeActive || tierFilter === "all" || tierForRow(row) === tierFilter)
    && (categoryFilter === "all" || contentCategoryForRow(row) === categoryFilter)
    && matchesFallbackLibrarySearch(row.content_key, visibleRowSearchText(row), query.trim().toLowerCase())
  ), [visibleRows, contentLibraryView, calendarAspectFilterScopeActive, contentClassFilter, tierFilter, categoryFilter, query]);
  const liveStatusResults = useContentLiveStatusResults(loadLiveStatus, statusCountRows,
    activePage === "content" && (statusFiltersOpen || contentStatusFilter !== "all"));
  const statusChecking = !liveStatusResults || liveStatusResults.pending > 0;
  const liveCount = liveStatusResults ? [...liveStatusResults.statuses.values()].filter((status) => status.live).length : 0;
  const filteredRows = useMemo(() => statusCountRows.filter((row) =>
    contentStatusFilter === "all" || liveStatusResults?.statuses.get(row.id)?.live === (contentStatusFilter === "LIVE")
  ), [statusCountRows, liveStatusResults, contentStatusFilter]);
  const normalizedContentLibraryQuery = query.trim().toLowerCase();
  const contentLibraryTransitContact = transitNatalSearchSelection(query);
  const contentLibraryTransitShortcut: "transits-to-natal" | "house-transits" | null = contentLibraryTransitContact
    || categoryFilter === "Personal Transits"
    || /(?:personal[- /]transit|transit[- /]to[- /]natal)/u.test(normalizedContentLibraryQuery)
      ? "transits-to-natal"
      : categoryFilter === "House Transits" || /house[- /]transit/u.test(normalizedContentLibraryQuery)
        ? "house-transits"
        : null;
  const filteredReviewRows = useMemo(() => reviewQueueRows.filter((row) => {
    const aspectContext = aspectContextForRow(row);
    const haystack = [row.contentKey, row.title, row.summary, row.body, row.surface, row.mode, row.blockType, aspectContext?.label].join(" ").toLowerCase();
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
  function workflowBucket(row: AdminReviewRecord) {
    return reviewWorkBucket(row.rawGlobalRow ?? { content_key: row.contentKey, status: row.status, body: row.body,
      block_type: row.blockType, source_snapshot: row.sourceSnapshot });
  }
  const workflowReviewRows = filteredReviewRows.filter(row => {
    const bucket = workflowBucket(row);
    if (skyVoiceQueueView === "sources") return bucket === "source";
    if (skyVoiceQueueView === "ready") return bucket === "ready";
    if (skyVoiceQueueView === "changes") return bucket === "changes";
    return bucket !== "source";
  });
  const filteredCompositeReviewRows = useMemo(
    () => filteredReviewRows.filter(row => isCompositeRelationshipRow(row) && workflowBucket(row) !== "source"),
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
      && (!friendsBetweenYouTwoWorkspace || /bond-effect-/u.test(row.content_key))
      && matchesFallbackLibrarySearch(row.content_key, fallbackHookVisibleSearchText(row), query)
  )).sort((left, right) => compareFallbackRows(left, right, fallbackRowSort)), [savedFallbackRows, fallbackSectionFilter, fallbackRowSort, query, friendsBetweenYouTwoWorkspace]);
  const filteredHookCatalog = useMemo(() => {
    const search = query.trim().toLowerCase();

    return hookCatalogItems.filter((item) => {
      const saved = savedHookKeys.has(item.key) || savedHookKeys.has(canonicalFallbackContentKey(item.key));
      const itemArea = surfaceAreaForFallbackSection(item.section);
      const itemStatus: WritingSurfaceStatusFilter = saved ? "complete" : "missing";

      return (fallbackSectionFilter === "all" || item.section === fallbackSectionFilter)
        && (!friendsBetweenYouTwoWorkspace || /bond-effect-/u.test(item.key))
        && (surfaceAreaFilter === "all" || itemArea === surfaceAreaFilter)
        && (surfaceStatusFilter === "all" || itemStatus === surfaceStatusFilter)
        && (!search || matchesFallbackLibrarySearch(item.key, `${item.key} ${item.label} ${item.section} ${item.type}`, search));
    });
  }, [hookCatalogItems, savedHookKeys, fallbackSectionFilter, surfaceAreaFilter, surfaceStatusFilter, query, friendsBetweenYouTwoWorkspace]);
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
    () => rows.filter(isCompositionTemplateRow),
    [rows]
  );
  const filteredTemplateRows = useMemo(
    () => templateRows.filter((row) => matchesAdminSearch(visibleRowSearchText(row), query)),
    [templateRows, query]
  );
  const vocabularyCategoryRows = useMemo(() => {
    return vocabRows.filter((row) => {
      const [, explicitSection] = row.content_key.split("/");
      const rowCategory = isVocabularySection(explicitSection)
        ? explicitSection
        : vocabularySectionFromKey(`${row.content_key}/${row.headline ?? ""}/${row.summary ?? ""}`);
      return rowCategory === vocabularyCategory;
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
    () => rows.filter((row) => selectedIds.has(row.id) && !row.id.startsWith("package:")),
    [rows, selectedIds]
  );
  const hasAccessIssue = loadState === "accessDenied" || loadState === "idle";
  const hasLoadFailure = loadState === "error";
  const isInitialDashboardLoad = loadState === "loading" && rows.length === 0;

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
    const surface: AdminHookCatalogDomain = item.definition.surface === "relationship"
      ? "friends"
      : item.definition.surface === "modifier"
        ? "modifier"
        : item.definition.surface === "you"
          ? "you"
          : "sky";
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
    if (!message || loadState === "loading") return;
    const isErrorMessage = loadState === "error" || loadState === "accessDenied";
    const timeout = window.setTimeout(() => {
      setMessage((current) => current === message ? "" : current);
    }, isErrorMessage ? 14_000 : 7_000);
    return () => window.clearTimeout(timeout);
  }, [loadState, message]);

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

  const studioListQuery = useMemo(() => studioInventoryQuery({
    page: activePage,
    categoryFilter,
    fallbackSectionFilter,
    skyWriteupWorkspaceView,
    friendsTransitAudience,
    betweenYouTwoWorkspace: friendsBetweenYouTwoWorkspace,
    showReferenceRows,
    showRetiredRows
  }), [
    activePage,
    categoryFilter,
    fallbackSectionFilter,
    friendsBetweenYouTwoWorkspace,
    friendsTransitAudience,
    showReferenceRows,
    showRetiredRows,
    skyWriteupWorkspaceView
  ]);
  const studioListQueryKey = studioInventoryQueryKey(studioListQuery);

  useEffect(() => {
    if (loadState !== "loaded" || !secret.trim()) return;
    if (loadedInventoryKeyRef.current === studioListQueryKey) return;
    setLoadError(null);
    let cancelled = false;
    const controller = new AbortController();
    const query = studioListQuery;
    const queryKey = studioListQueryKey;
    void loadAllGeneratedContentRows(
      secret,
      query,
      (loadedRows, complete) => {
        if (cancelled) return;
        setRows((current) => mergeContentInventory(current, loadedRows));
        if (complete) {
          loadedInventoryKeyRef.current = queryKey;
          setAllRowsLoaded(true);
        }
      },
      controller.signal
    )
      .then((allRows) => {
        if (cancelled) return;
        setRows((current) => mergeContentInventory(current, allRows));
        loadedInventoryKeyRef.current = queryKey;
        setAllRowsLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(dashboardErrorMessage(error));
        setMessage(dashboardErrorMessage(error));
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [loadState, secret, studioListQuery, studioListQueryKey]);

  useEffect(() => {
    if (loadState !== "loaded" || activePage !== "content" || categoryFilter !== "Natal Chart" || !natalPlacementPlanet || !natalPlacementSign || !secret.trim()) return;
    const controller = new AbortController();
    setNatalSourcesLoading(true);
    const params = new URLSearchParams({ status: "all", visibility: "all", limit: "200" });
    natalPlacementResolverDependencyKeys(natalPlacementPlanet, natalPlacementSign, natalPlacementHouse, natalPlacementMotion)
      .forEach((key) => params.append("contentKeys", key));
    void adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(`/api/admin/generated-content?${params}`, secret, { signal: controller.signal })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setRows((current) => {
          const merged = new Map(current.map((row) => [row.id, row]));
          for (const row of payload.rows ?? []) {
            const previous = merged.get(row.id);
            if (!previous || previous.inventory_only || (row.updated_at ?? "") >= (previous.updated_at ?? "")) merged.set(row.id, row);
          }
          return [...merged.values()];
        });
      })
      .catch((error) => { if (!controller.signal.aborted) setMessage(dashboardErrorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setNatalSourcesLoading(false); });
    return () => { controller.abort(); setNatalSourcesLoading(false); };
  }, [activePage, categoryFilter, natalPlacementPlanet, natalPlacementSign, natalPlacementHouse, natalPlacementMotion, secret, loadState, allRowsLoaded]);

  routeNavigationGuardRef.current = () => confirmNatalNavigation() && closeEditor();

  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash || "#review-queue";
      if (handledHashRef.current === hash) return;
      if (!routeNavigationGuardRef.current()) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${acceptedHashRef.current}`);
        return;
      }
      handledHashRef.current = hash;
      acceptedHashRef.current = hash;
      const { page, params } = parseAdminHash();
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      applyAdminRouteState(page, params);
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
    if (activePage !== "content" || !guidedReviewKey || !allRowsLoaded) return;
    if (guidedReviewOpenedRef.current === guidedReviewKey) return;
    const guidedRow = rows.find((row) => row.content_key === guidedReviewKey);
    if (!guidedRow) return;
    guidedReviewOpenedRef.current = guidedReviewKey;
    openRow(guidedRow);
    window.requestAnimationFrame(() => {
      if (!editorRef.current) return;
      editorRef.current.scrollTop = 0;
      editorRef.current.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }, [activePage, allRowsLoaded, guidedReviewKey, rows]);

  useEffect(() => {
    void refreshHookCatalog();
    void fetch("/generated/admin-writing-surface-map-v1.json")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Writing surface map returned HTTP ${response.status}.`);
        return response.json() as Promise<AdminWritingSurfaceMapPayload>;
      })
      .then((payload) => {
        if (payload.schema !== "admin-writing-surface-map/v1") throw new Error("Writing surface map schema is unsupported.");
        setWritingSurfaces(payload.surfaces);
        setWritingSurfaceAccess(payload.access);
        setWritingSurfaceRoleLabels(payload.roleLabels);
      })
      .catch(() => {
        setWritingSurfaces([]);
        setWritingSurfaceAccess({});
        setWritingSurfaceRoleLabels({});
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activePage !== "skyWriteups" || !["transits-to-natal", "house-transits"].includes(skyWriteupWorkspaceView) || transitNatalSourceBodies.size > 0) return;
    let cancelled = false;
    void loadAdminHookCatalogBodies("sky")
      .then((bodies) => {
        if (!cancelled) setTransitNatalSourceBodies(bodies);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Could not load transit-to-natal source rows.");
      });
    return () => { cancelled = true; };
  }, [activePage, skyWriteupWorkspaceView, transitNatalSourceBodies.size]);

  transitNatalSelectionRef.current = {
    planet: transitNatalPlanet,
    aspect: transitNatalAspect,
    natalPoint: transitNatalPoint,
    sign: transitNatalSign,
    transitHouse: transitNatalTransitHouse,
    natalHouse: transitNatalNatalHouse
  };

  useEffect(() => {
    if (activePage !== "skyWriteups" || skyWriteupWorkspaceView !== "transits-to-natal") return;
    const contact = { planet: transitNatalPlanet, aspect: transitNatalAspect, natalPoint: transitNatalPoint };
    if (!transitNatalContactReady(contact)) return;
    const selection = {
      ...contact,
      ...(transitNatalSign ? { sign: transitNatalSign } : {}),
      ...(transitNatalTransitHouse ? { transitHouse: transitNatalTransitHouse } : {}),
      ...(transitNatalNatalHouse ? { natalHouse: transitNatalNatalHouse } : {})
    };
    const key = transitNatalExactContentKey(selection);
    if (!key) return;
    if (draft?.contentKey === key) return;
    if (houseTransitEditor || skyArticleEditor) return;
    if (transitExactDismissedKeyRef.current === key) return;
    if (!isTransitNatalSituationKey(key) && !key.startsWith("authored/transit-return/")) return;
    void openExactTransitNatalSourceRef.current(selection);
  }, [
    activePage,
    skyWriteupWorkspaceView,
    transitNatalPlanet,
    transitNatalAspect,
    transitNatalPoint,
    transitNatalSign,
    transitNatalTransitHouse,
    transitNatalNatalHouse,
    draft,
    selectedRowId,
    houseTransitEditor,
    skyArticleEditor
  ]);
  openExactTransitNatalSourceRef.current = openExactTransitNatalSource;

  useEffect(() => {
    const pending = pendingExactAiCopyRef.current;
    if (!pending || !draft || draft.contentKey !== pending.key) return;
    pendingExactAiCopyRef.current = null;
    let next = draft;
    if (pending.you) next = setPackageSectionField(next, "body_you", pending.you);
    if (pending.friend) next = setPackageSectionField(next, "body_they", pending.friend);
    if (next !== draft) setDraft(next);
  }, [draft]);

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
        void loadDashboardData(nextToken, false, "session");
      });
      const accessToken = await loadOwnerSessionAccessToken();

      if (!cancelled && accessToken) {
        activeSessionToken = accessToken;
        const result = await loadDashboardData(accessToken, false, "session");
        // A storage/network failure must keep its error and retry credential.
        // Try emergency access only when the server actually rejected the account.
        if (result !== "accessDenied" || !emergencySecret.trim()) return;
      }

      if (!cancelled && emergencySecret.trim()) {
        await loadDashboardData(emergencySecret, false, "secret");
      } else if (!cancelled) {
        setLoadState("idle");
        setIsLoading(false);
        setMessage("Sign in with the owner account or use the emergency access key.");
      }

    })();

    return () => {
      cancelled = true;
      dashboardLoadControllerRef.current?.abort();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!skyArticleEditor || !secret.trim()) return;
    const changes = skyArticleEditionFieldChanges(skyArticleEditor.baseEdition, skyArticleEditor.fields);
    if (changes.length === 0 && skyArticleEditor.saveState === "saved") {
      setSkyArticleEditor((current) => current ? { ...current, saveState: "saved", error: null } : current);
      return;
    }

    const editorSession = editorSessionRef.current;
    const sequence = ++skyArticleAutosaveSequenceRef.current;
    setSkyArticleEditor((current) => current ? { ...current, saveState: "unsaved", error: null } : current);
    const timeout = window.setTimeout(() => {
      skyArticleSaveQueueRef.current = skyArticleSaveQueueRef.current.catch(() => {}).then(async () => {
        if (sequence !== skyArticleAutosaveSequenceRef.current) return;
        try {
          setSkyArticleEditor((current) => current ? { ...current, saveState: "saving", error: null } : current);
          const revised = await reviseSkyArticleEdition(skyArticleEditor.baseEdition, skyArticleEditor.fields);
          const persistedArticleRow = articleAutosaveRowRef.current;
          const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
            method: "PATCH",
            body: JSON.stringify({
              id: persistedArticleRow?.id ?? skyArticleEditor.rowId,
              ...(persistedArticleRow?.updated_at ? { expectedUpdatedAt: persistedArticleRow.updated_at } : {}),
              ownerAction: "save-sky-article-edition-revision",
              sections: { skyArticleEdition: revised }
            })
          });
          const saved = payload.rows?.[0];
          if (!saved) throw new Error("The saved article revision was not returned.");
          setRows((current) => [saved, ...current.filter((row) => row.id !== saved.id)]);
          if (editorSession !== editorSessionRef.current) return;
          articleAutosaveRowRef.current = saved;
          if (sequence !== skyArticleAutosaveSequenceRef.current) return;
          setEditorSourceRow(saved);
          setSelectedRowId(saved.id);
          const savedDraft = draftFromRow(saved);
          rememberSavedDraft(savedDraft);
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
      });
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
    if (form.saveState === "idle" && !form.workspaceId && !workspaceAutosaveRowRef.current && !form.tldr.trim() && authoredSlotValues.length === 0) return;

    const editorSession = editorSessionRef.current;
    const sequence = ++skyArticleWorkspaceAutosaveSequenceRef.current;
    setSkyArticleEditionForm((current) => current ? { ...current, saveState: "unsaved" } : current);
    const timeout = window.setTimeout(() => {
      skyArticleWorkspaceSaveQueueRef.current = skyArticleWorkspaceSaveQueueRef.current.catch(() => {}).then(async () => {
        if (sequence !== skyArticleWorkspaceAutosaveSequenceRef.current) return;
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
          const persistedWorkspaceRow = workspaceAutosaveRowRef.current;
          const requestBody = persistedWorkspaceRow ? {
            id: persistedWorkspaceRow.id,
            ...(persistedWorkspaceRow?.updated_at ? { expectedUpdatedAt: persistedWorkspaceRow.updated_at } : {}),
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
            method: persistedWorkspaceRow ? "PATCH" : "POST",
            body: JSON.stringify(requestBody)
          });
          const saved = payload.rows?.[0];
          if (!saved) throw new Error("The saved article workspace was not returned.");
          setRows((current) => [saved, ...current.filter((row) => row.id !== saved.id)]);
          if (editorSession !== editorSessionRef.current) return;
          workspaceAutosaveRowRef.current = saved;
          if (sequence !== skyArticleWorkspaceAutosaveSequenceRef.current) return;
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
      });
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [secret, selectedRow, skyArticleEditionForm?.facts, skyArticleEditionForm?.tldr, skyArticleEditionForm?.slotValues, skyArticleEditionForm?.workspaceId]);

  function persistBetweenYouTwoRoute(nextQuery: string, nextActivate = friendsActivationQuery) {
    setQuery(nextQuery);
    setFriendsActivationQuery(nextActivate);
    const params = new URLSearchParams({ section: "friends", audience: "friends", workspace: "between-you-two" });
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextActivate.trim()) params.set("activate", nextActivate.trim());
    setAdminHash(adminHashForPage("knowledge", params), "replace");
  }

  function setAdminHash(nextHash: string, mode: "push" | "replace" = "push") {
    if (window.location.hash === nextHash) return;
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    if (mode === "replace") {
      window.history.replaceState(null, "", nextUrl);
    } else {
      window.history.pushState(null, "", nextUrl);
    }
    handledHashRef.current = "";
    acceptedHashRef.current = nextHash;
  }

  function applyAdminRouteState(page: AdminDashboardPage, params: URLSearchParams) {
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
    const openedFromUnresolved = page === "content" && params.get("from") === "unresolved";
    const natalPlanet = params.get("planet") as NatalPlacementPlanet | null;
    const natalSign = params.get("sign") as NatalPlacementSign | null;
    const natalHouse = params.get("house") as NatalPlacementHouse | null;
    const natalMotion = params.get("motion") as NatalPlacementMotion | null;
    const natalAspectFirstParam = params.get("first") ?? "";
    const natalAspectNameParam = params.get("aspect") ?? "";
    const natalAspectSecondParam = params.get("second") ?? "";
    const transitPlanet = params.get("transit") as TransitNatalPlanet | null;
    const transitSign = params.get("sign") as TransitNatalSign | null;
    const transitHouse = params.get("transitHouse") as TransitNatalHouse | null;
    const transitAspect = params.get("aspect") as TransitNatalAspect | null;
    const natalPoint = params.get("natal") as TransitNatalPoint | null;
    const transitNatalHouse = params.get("natalHouse") as TransitNatalHouse | null;
    const houseTransitMotionParam = params.get("motion") as HouseTransitMotion | null;

    setActivePage(page);
    setCategoryFilter(category && categoryFilters.some((filter) => filter.key === category) ? category : "all");
    setShowReferenceRows(page === "content" && category === "Calendar Aspects");
    setContentLibraryView(page === "content" && view === "compatibility" ? "compatibility" : "all");
    setSkyVoiceQueueView(
      page === "reviewQueue" && ["ready", "changes", "sources", "all", "composite", "upcoming", "needs-review", "audit", "live-omissions"].includes(view ?? "")
        ? view as SkyVoiceQueueView
        : "ready"
    );
    setContentClassFilter(source && contentClassFilters.some((filter) => filter.key === source) ? source : "all");
    if (openedFromUnresolved) revealUnresolvedContentRow();
    guidedReviewOpenedRef.current = "";
    setGuidedReviewKey(openedFromUnresolved ? search : null);
    setQuery(search ?? "");
    setFriendsActivationQuery(params.get("activate") ?? "");
    setNatalPlacementPlanet(page === "content" && natalPlanet && natalPlacementPlanets.includes(natalPlanet) ? natalPlanet : "");
    setNatalPlacementSign(page === "content" && natalSign && natalPlacementSigns.includes(natalSign) ? natalSign : "");
    setNatalPlacementHouse(page === "content" && natalHouse && natalPlacementHouses.includes(natalHouse) ? natalHouse : "");
    setNatalPlacementMotion(page === "content" && natalMotion && natalPlacementMotions.includes(natalMotion) ? natalMotion : "direct");
    setNatalAspectFirst(page === "content" && category === "Natal Aspects" ? natalAspectFirstParam : "");
    setNatalAspectName(page === "content" && category === "Natal Aspects" ? natalAspectNameParam : "");
    setNatalAspectSecond(page === "content" && category === "Natal Aspects" ? natalAspectSecondParam : "");
    setSkyWriteupWorkspaceView(
      page === "skyWriteups" && skyWriteupWorkspaceTabs.some(tab => tab.value === view)
        ? view as SkyWriteupWorkspaceView : "catalog"
    );
    setCalendarWriteupWorkspaceView(page === "calendarWriteups" && (view === "weekly-sky" || view === "monthly-sky") ? view : "daily-sky");
    setTransitReadingContext(page === "skyWriteups" && view === "transits-to-natal" ? {
      ...(params.get("pass") ? { pass: Number(params.get("pass")) } : {}),
      ...(params.get("variant") ? { variant: Number(params.get("variant")) } : {}),
      ...(params.has("retrograde") ? { isRetrograde: params.get("retrograde") === "true" } : {}),
      ...(params.get("window") ? { window: params.get("window")! } : {})
    } : {});
    setTransitNatalPlanet(page === "skyWriteups" && transitPlanet && transitNatalPlanets.includes(transitPlanet) ? transitPlanet : "");
    setTransitNatalSign(page === "skyWriteups" && transitSign && transitNatalSigns.includes(transitSign) ? transitSign : "");
    setTransitNatalTransitHouse(page === "skyWriteups" && transitHouse && transitNatalHouses.includes(transitHouse) ? transitHouse : "");
    setTransitNatalAspect(page === "skyWriteups" && transitAspect && transitNatalAspects.includes(transitAspect) ? transitAspect : "");
    setTransitNatalPoint(page === "skyWriteups" && natalPoint && transitNatalPoints.includes(natalPoint) ? natalPoint : "");
    setTransitNatalNatalHouse(page === "skyWriteups" && transitNatalHouse && transitNatalHouses.includes(transitNatalHouse) ? transitNatalHouse : "");
    setHouseTransitPlanet(page === "skyWriteups" && view === "house-transits" && transitPlanet && houseTransitPlanets.includes(transitPlanet) ? transitPlanet : "");
    setHouseTransitSign(page === "skyWriteups" && view === "house-transits" && transitSign && houseTransitSigns.includes(transitSign) ? transitSign : "");
    setHouseTransitHouse(page === "skyWriteups" && view === "house-transits" && transitHouse && houseTransitHouses.includes(transitHouse) ? transitHouse : "");
    setHouseTransitMotion(page === "skyWriteups" && view === "house-transits" && houseTransitMotionParam === "retrograde" ? "retrograde" : "direct");
    setFallbackSectionFilter(section && fallbackSections.some((filter) => filter.key === section) ? section : "all");
    setSurfaceAreaFilter(area && ["all", "sky", "you", "friends", "calendar", "reports", "settings"].includes(area) ? area : "all");
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

  async function copyContentKey(contentKey: string) {
    try {
      await navigator.clipboard.writeText(contentKey);
      setMessage(`Copied ${contentKey}`);
    } catch {
      setMessage("Copy is unavailable in this browser; select the key text instead.");
    }
  }

  function closeVariablesRail() {
    setTemplateVariableReferenceOpen(false);
    setSelectedTemplateVariableName(null);
    setSelectedTemplateVariableSourceId(null);
  }

  function hasPendingArticleChanges() {
    return Boolean(
      skyArticleEditor && skyArticleEditor.saveState !== "saved"
      || skyArticleEditionForm && ["unsaved", "saving", "error"].includes(skyArticleEditionForm.saveState)
    );
  }

  function confirmNatalNavigation() {
    return natalUnsavedSourcesRef.current.size === 0
      || window.confirm("Discard the unsaved changes in the natal source editors?");
  }

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      const draftChanged = draft && JSON.stringify(draft) !== editorBaselineRef.current && JSON.stringify(draft) !== editorSavedInputRef.current;
      if (!draftChanged && !hasPendingArticleChanges() && natalUnsavedSourcesRef.current.size === 0) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [draft, skyArticleEditor, skyArticleEditionForm]);

  function closeEditor() {
    if (houseTransitEditor && houseTransitCloseGuard.current && !houseTransitCloseGuard.current()) return false;
    const hasOpenEditor = Boolean(
      selectedRow
      || draft
      || compositionEditorContext
      || skyArticleEditor
      || skyArticleEditionForm
    );
    if (isLoading && hasOpenEditor) {
      setMessage("Finish the current editor operation before leaving this section.");
      return false;
    }
    const persistedDraft = selectedRow ? draftFromRow(selectedRow) : null;
    const serializedDraft = draft ? JSON.stringify(draft) : "";
    const matchesSavedDraft = Boolean(draft && (
      serializedDraft === editorBaselineRef.current
      || serializedDraft === editorSavedInputRef.current
      || (!editorBaselineRef.current && persistedDraft && serializedDraft === JSON.stringify(persistedDraft))
    ));
    const hasDraftContent = Boolean(draft && (
      persistedDraft
      || draft.headline.trim()
      || draft.summary.trim()
      || draft.body.trim()
    ));
    const hasUnsavedChanges = Boolean(draft && !matchesSavedDraft && hasDraftContent);
    if ((hasUnsavedChanges || hasPendingArticleChanges()) && !window.confirm("Discard the unsaved changes in this editor?")) {
      return false;
    }
    if (draft?.contentKey) transitExactDismissedKeyRef.current = draft.contentKey;
    sourceOpenRequestRef.current += 1;
    setTemplateVariableReferenceOpen(false);
    setTemplateVariableQuery("");
    setSelectedTemplateVariableName(null);
    setSelectedTemplateVariableSourceId(null);
    setCompositionEditorContext(null);
    setSelectedRowId(null);
    setDraft(null);
    setHouseTransitEditor(null);
    setHouseTransitOpening(false);
    houseTransitEditorDrafts.current.clear();
    houseTransitOpenRequest.current += 1;
    editorBaselineRef.current = null;
    editorSavedInputRef.current = null;
    setSkyWriteupParentId(null);
    setSkyRelatedAspectQuery("");
    setSkyArticleEditionForm(null);
    editorSessionRef.current += 1;
    skyArticleAutosaveSequenceRef.current += 1;
    skyArticleWorkspaceAutosaveSequenceRef.current += 1;
    setSkyArticleEditor(null);
    window.requestAnimationFrame(() => {
      const returnTarget = editorReturnFocusRef.current;
      editorReturnFocusRef.current = null;
      if (returnTarget?.isConnected) returnTarget.focus();
    });
    return true;
  }

  function revealUnresolvedContentRow() {
    setContentStatusFilter("all");
    setTierFilter("all");
    setShowReferenceRows(true);
    setShowRetiredRows(true);
  }

  function navigateAdminPage(page: AdminDashboardPage, params?: URLSearchParams, options: { keepEditorOpen?: boolean } = {}) {
    setIsCreateMenuOpen(false);
    setIsMobileNavOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (!options.keepEditorOpen) {
      if (!confirmNatalNavigation()) return;
      if (!closeEditor()) return;
    }
    const route = canonicalAdminRoute(page, params);
    applyAdminRouteState(page, params ?? new URLSearchParams());
    applyAdminRouteState(route.page, route.params);
    setAdminHash(adminHashForPage(route.page, route.params));
  }

  function openTransitNatalContactFromSearch(contact: TransitNatalContact, audienceFriends: boolean) {
    const params = new URLSearchParams({
      view: "transits-to-natal",
      transit: contact.planet,
      aspect: contact.aspect,
      natal: contact.natalPoint
    });
    if (audienceFriends) params.set("audience", "friends");
    navigateAdminPage("skyWriteups", params);
  }

  function renderFriendsTransitSectionFinder(
    currentSection: "between-you-two" | "active-for-name" | "house-transit",
    variant: "page" | "embedded",
    search: string,
    onSearch: (value: string) => void,
    parts: "all" | "search" | "destinations" = "all"
  ) {
    return (
      <FriendsTransitSectionFinder
        currentSection={currentSection}
        onOpenActiveForName={() => {
          const destinations = friendsTransitCardDestinations(search);
          if (!destinations.contact) return;
          openTransitNatalContactFromSearch(destinations.contact, true);
        }}
        onOpenBetweenYouTwoOpening={() => {
          const destinations = friendsTransitCardDestinations(search);
          if (!destinations.betweenYouTwoOpeningKey) return;
          const params = new URLSearchParams({ section: "friends", audience: "friends", workspace: "between-you-two" });
          if (search.trim()) params.set("q", search.trim());
          navigateAdminPage("knowledge", params, { keepEditorOpen: true });
          void openContentKeyRow(destinations.betweenYouTwoOpeningKey, "Between you two opening", false, "body_they");
        }}
        onOpenHouseTransit={() => {
          navigateAdminPage("skyWriteups", new URLSearchParams({ view: "house-transits", audience: "friends" }));
        }}
        onQueryChange={onSearch}
        query={search}
        variant={variant}
        parts={parts}
      />
    );
  }

  function navigatePrimaryAdminItem(item: AdminNavItem) {
    if (item.page === "content") {
      setContentLibraryView("all");
      setContentStatusFilter("all");
      setContentClassFilter("all");
      setTierFilter("all");
      setCategoryFilter(item.category ?? "all");
      setQuery("");
      setNatalPlacementPlanet("");
      setNatalPlacementSign("");
      setNatalPlacementHouse("");
      setNatalAspectFirst("");
      setNatalAspectName("");
      setNatalAspectSecond("");
    }
    navigateAdminPage(
      item.page,
      item.category ? new URLSearchParams({ category: item.category })
        : item.section ? new URLSearchParams({ section: item.section }) : undefined
    );
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

  async function loadDashboardData(secretOverride?: string, persistOnSuccess = false, credentialKind?: "session" | "secret") {
    const loadSequence = ++dashboardLoadSequenceRef.current;
    dashboardLoadControllerRef.current?.abort();
    const loadController = new AbortController();
    dashboardLoadControllerRef.current = loadController;
    const normalizedSecret = normalizeAdminSecret(secretOverride ?? secret);
    const requestCredentialKind = credentialKind ?? (adminCredentialHeaders(normalizedSecret)["x-content-admin-session"] ? "session" : "secret");
    setTransientCredential(normalizedSecret);
    if (!normalizedSecret) {
      setLoadState("idle");
      setLoadError("Admin access is required before content can load.");
      setLoadDiagnostics(null);
      setMessage("Sign in with the owner account or use the emergency access key.");
      return "idle" as const;
    }

    setLoadState("loading");
    setLoadError(null);
    setLoadDiagnostics(null);
    setMessage("");
    setSourceDraftLoadState("loading");
    setSourceDraftError(null);
    try {
      const inventoryQuery = studioListQuery;
      const inventoryQueryKey = studioInventoryQueryKey(inventoryQuery);
      const [generatedResult, reviewResult, usersResult, sourceDraftResult, runtimeReviewResult] = await Promise.allSettled([
        loadAllGeneratedContentRows(
          normalizedSecret,
          inventoryQuery,
          (loadedRows, complete) => {
            if (loadSequence !== dashboardLoadSequenceRef.current || loadController.signal.aborted) return;
            setRows((current) => mergeContentInventory(current, loadedRows));
            if (complete) {
              loadedInventoryKeyRef.current = inventoryQueryKey;
              setAllRowsLoaded(true);
            }
          },
          loadController.signal
        ),
        adminJsonRequest<{ ok: boolean; rows?: AdminReviewRecord[]; records?: AdminReviewRecord[]; counts?: unknown }>("/api/admin/review-records?surface=upcomingAspects&status=all", normalizedSecret, { signal: loadController.signal }),
        adminJsonRequest<{ ok: boolean; rows: AdminUserGeneratedContentRow[] }>("/api/admin/user-generated-content?status=all&limit=100", normalizedSecret, { signal: loadController.signal }),
        loadAdminSourceDraftCatalog(normalizedSecret),
        adminJsonRequest<{ ok: boolean; rows: AdminContentReviewEventRow[] }>("/api/admin/content-review-events?limit=250", normalizedSecret, { signal: loadController.signal })
      ]);

      if (loadSequence !== dashboardLoadSequenceRef.current || loadController.signal.aborted) return "cancelled" as const;
      if (generatedResult.status === "rejected") {
        throw generatedResult.reason;
      }

      const review: { ok?: boolean; rows?: AdminReviewRecord[]; records?: AdminReviewRecord[]; counts?: unknown } = reviewResult.status === "fulfilled" ? reviewResult.value : { rows: [] };
      const usersPayload = usersResult.status === "fulfilled" ? usersResult.value : { rows: [] };
      const generatedRows = generatedResult.value;
      const reviewRowsPayload = review.rows ?? review.records ?? [];
      setRows((current) => mergeContentInventory(current, generatedRows, false));
      loadedInventoryKeyRef.current = inventoryQueryKey;
      setAllRowsLoaded(true);
      setReviewRows(reviewRowsPayload.map((record: AdminReviewRecord) => {
        const rawGlobalRow = generatedRows.find((row) => row.id === record.id || row.content_key === record.contentKey);
        return { ...record, rawGlobalRow };
      }));
      setUserRows(usersPayload.rows ?? []);
      if (runtimeReviewResult.status === "fulfilled") {
        setSharedLiveOmittedSections(runtimeReviewResult.value.rows.map(sharedLiveOmissionItem));
        setSharedLiveOmittedSectionsLoaded(true);
      } else {
        setSharedLiveOmittedSections([]);
        setSharedLiveOmittedSectionsLoaded(false);
      }
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
      if (partialWarnings.length) setMessage(`Partial load: ${partialWarnings.join(", ")}.`);
      return "loaded" as const;
    } catch (error) {
      if (loadSequence !== dashboardLoadSequenceRef.current || loadController.signal.aborted) return "cancelled" as const;
      const accessDenied = error instanceof AdminRequestError && error.status === 401;
      const nextMessage = accessDenied
        ? requestCredentialKind === "session"
          ? "This signed-in account does not have Content Studio access. Sign in with the owner account or use the emergency access key."
          : "Admin access was denied. Sign in with the owner account or paste the current emergency access key."
        : dashboardErrorMessage(error);
      if (accessDenied && requestCredentialKind === "secret" && normalizedSecret === normalizeAdminSecret(secret)) setSecret("");
      setLoadState(accessDenied ? "accessDenied" : "error");
      setLoadError(nextMessage);
      setLoadDiagnostics(error instanceof AdminRequestError ? `${error.method} ${error.path} -> HTTP ${error.status}${error.details ? ` (${error.details})` : ""}` : null);
      setMessage(nextMessage);
      return accessDenied ? "accessDenied" as const : "error" as const;
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

  function rememberSavedDraft(saved: AdminDraft) {
    setDraft(saved);
    const serialized = JSON.stringify(saved);
    editorBaselineRef.current = serialized;
    editorSavedInputRef.current = serialized;
  }

  async function runSkyDraftWriting(contentKey: string, action: "generate" | "recheck", row?: AdminGeneratedContentRow | null) {
    setIsLoading(true);
    setEditorSaveError("");
    const writingSession = editorSessionRef.current;
    setMessage(action === "generate" ? "Generating one draft and checking its writing…" : "Checking saved writing. Your text will not be rewritten…");
    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[]; issues: string[] }>("/api/admin/sky-draft-writing", secret, {
        method: "POST", body: JSON.stringify({ contentKey, action, ...(row?.updated_at ? { expectedUpdatedAt: row.updated_at } : {}) })
      });
      const saved = payload.rows?.[0];
      if (!payload.ok || !saved || saved.content_key !== contentKey) throw new Error("Writing result was not confirmed. Refresh this draft.");
      setRows(current => dedupeGeneratedContentRows([...current.filter(candidate => candidate.id !== saved.id), saved]));
      if (writingSession === editorSessionRef.current) {
        setEditorSourceRow(saved);
        setSelectedRowId(saved.id);
        rememberSavedDraft(draftFromRow(saved));
      }
      setSkyReviewHorizon(current => current ? { ...current, occurrences: current.occurrences.map(occurrence => occurrence.contentKey === contentKey
        ? { ...occurrence, row: saved, reviewStatus: payload.issues.length ? "draft_needs_work" : "ready_for_owner" } : occurrence) } : current);
      setMessage(payload.issues.length ? "Draft saved. Review the writing issues below, edit, and run checks again." : "Writing checks passed. Read the complete draft, then approve it when ready.");
    } catch (error) {
      setEditorSaveError(dashboardErrorMessage(error));
      setMessage("Writing work did not complete. Your saved writing is preserved.");
      try {
        const latest = await adminJsonRequest<{ rows: AdminGeneratedContentRow[] }>(`/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(contentKey)}&limit=1`, secret);
        const saved = latest.rows?.[0];
        if (saved) {
          setRows(current => dedupeGeneratedContentRows([...current.filter(candidate => candidate.id !== saved.id), saved]));
          if (writingSession === editorSessionRef.current) {
            setEditorSourceRow(saved); setSelectedRowId(saved.id); rememberSavedDraft(draftFromRow(saved));
          }
        }
      } catch { /* Keep the original error and saved text; Refresh is available. */ }
    } finally { setIsLoading(false); }
  }

  async function approveAndScheduleSkyRow(row: AdminGeneratedContentRow) {
    setEditorSaveError("");
    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
        method: "PATCH",
        body: JSON.stringify({ id: row.id, ...(row.updated_at ? { expectedUpdatedAt: row.updated_at } : {}), ownerAction: "approve-and-schedule" })
      });
      const saved = payload.rows?.[0];
      if (!payload.ok || !saved || saved.id !== row.id || saved.content_key !== row.content_key
        || saved.status !== (row.block_type === "sky_placement" ? "REVIEWED" : "LIVE")) {
        throw new Error("Approval was not confirmed. Try again.");
      }
      setRows((current) => current.map((candidate) => candidate.id === saved.id ? saved : candidate));
      if (selectedRowId === saved.id) {
        setEditorSourceRow(saved);
        const savedDraft = draftFromRow(saved);
        rememberSavedDraft(savedDraft);
      }
      announceContentUpdate({ contentKey: saved.content_key, published: saved.status === "LIVE", updatedAt: saved.updated_at ?? new Date().toISOString() });
      setSkyReviewHorizon((current) => current ? {
        ...current,
        occurrences: current.occurrences.map((occurrence) => occurrence.row?.id === saved.id
          ? { ...occurrence, row: saved, reviewStatus: "approved_scheduled" }
          : occurrence)
      } : current);
      setMessage(`${row.content_key} approved. ${row.block_type === "sky_placement" ? "Package release required." : "Eligible for matching Sky configurations."}`);
    } catch (error) {
      const feedback = dashboardErrorMessage(error);
      setEditorSaveError(feedback);
      setMessage(feedback);
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
      const workspaceInventoryRow = rows.find((row) => row.content_key === skyArticleWorkspaceContentKey(payload.facts));
      const workspaceRow = workspaceInventoryRow ? await hydrateGeneratedContentRow(workspaceInventoryRow) : null;
      const workspace = skyArticleWorkspaceForm(workspaceRow ?? undefined);
      workspaceAutosaveRowRef.current = workspaceRow;
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
        templateSections: templateRow.sections,
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
        body: JSON.stringify({ id: row.id, ...(row.updated_at ? { expectedUpdatedAt: row.updated_at } : {}), ownerAction: "approve-sky-article-edition" })
      });
      const saved = payload.rows?.[0];
      if (!saved) throw new Error("The approved edition was not returned by the content API.");
      setRows((current) => current.map((candidate) => candidate.id === saved.id ? saved : candidate));
      const savedDraft = draftFromRow(saved);
      rememberSavedDraft(savedDraft);
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
        body: JSON.stringify({ id: revisionRow.id, ...(revisionRow.updated_at ? { expectedUpdatedAt: revisionRow.updated_at } : {}), ownerAction })
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

  async function saveDraft(
    nextStatus?: GeneratedContentStatus,
    draftOverride?: AdminDraft,
    sourceLifecycleAction?: "archive" | "restore",
    updateEditor = true,
    recoveryAttempt = false,
    propagateError = false
  ) {
    setEditorSaveError("");
    const activeDraft = draftOverride ?? draft;
    const editorDraftAtSave = draft;
    const editorSessionAtSave = editorSessionRef.current;
    const recoveryBaseline = editorBaselineRef.current;
    if (!activeDraft) return null;
    const isNewCompatibilityCard = !activeDraft.id && activeDraft.blockType === "compatibility_planet_card";
    const compatibilityIdentity = compatibilityBrowseIdentity(activeDraft.contentKey, activeDraft.facts, activeDraft.sourceSnapshot);
    if (isNewCompatibilityCard && !compatibilityIdentity) {
      setMessage("Choose the planet and both signs before saving.");
      return null;
    }
    if (isNewCompatibilityCard && rows.some((row) => row.content_key === activeDraft.contentKey)) {
      setMessage("That Compatibility card already exists. Open its saved row.");
      return null;
    }
    const status = nextStatus ?? activeDraft.status;
    if (status === "LIVE" && activeDraft.sourceSnapshot?.governanceState === "needs-owner-decision") {
      setMessage("This source draft still needs an explicit owner decision. Save it as Draft or Reviewed; the general editor cannot make it reader-serving.");
      return null;
    }
    const astro101Draft = isAstro101ContentRow({ content_key: activeDraft.contentKey, facts: activeDraft.facts })
      ? finalizeAstro101Draft(activeDraft)
      : activeDraft;
    if (status === "LIVE") {
      const educationIssue = astro101PublicationIssue({
        contentKey: astro101Draft.contentKey,
        surface: astro101Draft.surface,
        headline: astro101Draft.headline,
        body: astro101Draft.body,
        sections: astro101Draft.sections,
        facts: astro101Draft.facts
      });
      if (educationIssue) {
        setMessage(educationIssue);
        return null;
      }
    }
    setIsLoading(true);
    const draftForSave = { ...astro101Draft, status };
    const isPackageDraft = draftIsFallbackArchitectureV3(draftForSave);
    const isGuidedHeldReview = isPackageDraft && guidedReviewKey === draftForSave.contentKey;
    const persistedRow = draftForSave.id ? rows.find((row) => row.id === draftForSave.id) : null;
    const expectedUpdatedAt = draftForSave.updatedAt ?? persistedRow?.updated_at ?? undefined;

    try {
      const body = isPackageDraft
        ? {
            id: draftForSave.id ?? undefined,
            ...(!draftForSave.id ? {
              contentKey: draftForSave.contentKey,
              surface: draftForSave.surface === "friends" ? "relationship" : draftForSave.surface,
              mode: draftForSave.mode,
              status: "DRAFT" as GeneratedContentStatus,
              eventType: draftEventType(draftForSave),
              blockType: draftForSave.blockType || null,
              lane: "reference",
              reviewState: "needs-review",
              promptVersion: draftForSave.promptVersion || "manual-admin"
            } : {}),
            headline: draftForSave.headline,
            summary: draftForSave.summary,
            body: draftForSave.body,
            sections: draftForSave.sections ?? {},
            facts: draftForSave.facts ?? {},
            reviewerNotes: draftForSave.reviewerNotes,
            sourceSnapshot: draftSourceSnapshot(draftForSave),
            reviewStatus: isGuidedHeldReview ? "needs_review" : packageReviewStatusForDraft(draftForSave),
            sourceLifecycleAction,
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
            lane: status === "LIVE" ? "serving" : draftForSave.lane,
            reviewState: status === "LIVE" || status === "REVIEWED" ? null : draftForSave.reviewState || null,
            blockType: draftForSave.blockType || null,
            promptVersion: draftForSave.promptVersion || "manual-admin",
            eventType: persistedRow?.event_type ?? draftEventType(draftForSave),
            sections: draftForSave.sections ?? {},
            facts: draftForSave.facts ?? {},
            reviewerNotes: draftForSave.reviewerNotes,
            sourceSnapshot: draftSourceSnapshot(draftForSave)
          };
      const method = draftForSave.id ? "PATCH" : "POST";
      const versionedBody = method === "PATCH" && expectedUpdatedAt ? { ...body, expectedUpdatedAt } : body;
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
        method,
        body: JSON.stringify(versionedBody)
      });
      const saved = payload.ok && Array.isArray(payload.rows) ? payload.rows[0] : null;
      const savedDraft = saved ? draftFromRow(saved) : null;
      if (!saved || !savedDraft || saved.content_key !== draftForSave.contentKey || (!isPackageDraft && (
        (draftForSave.id && saved.id !== draftForSave.id)
        || (status === "LIVE" && saved.lane !== "serving")
        || (["LIVE", "REVIEWED"].includes(status) && saved.review_state)
        || (["status", "headline", "summary", "body"] as const).some((field) => saved[field] !== draftForSave[field])
      )) || (isPackageDraft && draftHasPackageProposal(draftForSave) && !draftHasPackageProposal(savedDraft) && !writesPersonalTransitExactCopy(draftForSave))) {
        throw new Error("Save did not return the saved row.");
      }
      setRows((current) => {
        const without = current.filter((row) => row.id !== saved.id && !(row.id.startsWith("package:") && row.content_key === saved.content_key));
        return [saved, ...without];
      });
      if (updateEditor && editorSessionAtSave === editorSessionRef.current) {
        setEditorSourceRow(saved);
        setSelectedRowId(saved.id);
        const serializedSaved = JSON.stringify(savedDraft);
        editorBaselineRef.current = serializedSaved;
        editorSavedInputRef.current = serializedSaved;
        setDraft((current) => {
          // A response acknowledges the submitted version, not newer typing.
          if (current && current !== editorDraftAtSave && current.contentKey === activeDraft.contentKey) {
            if (writesPersonalTransitExactCopy(current)) {
              const { packageDraft: _discarded, ...savedSections } = objectRecord(savedDraft.sections) ?? {};
              const proposal = draftPackageProposal(current);
              return {
                ...current,
                id: savedDraft.id,
                updatedAt: savedDraft.updatedAt,
                sections: {
                  ...savedSections,
                  packageRecord: {
                    ...draftPackageRecord(savedDraft),
                    ...(proposal ?? {})
                  }
                }
              };
            }
            const proposal = draftPackageProposal(current);
            const savedRecord = draftPackageRecord(savedDraft);
            return { ...current, id: savedDraft.id, updatedAt: savedDraft.updatedAt,
              ...(proposal && savedRecord ? { sections: { ...current.sections, packageDraft: { ...proposal,
                ...Object.fromEntries(["owner_approved", "serving_enabled"].filter(flag => Object.hasOwn(proposal, flag)).map(flag => [flag, savedRecord[flag]]))
              } } } : {}) };
          }
          return savedDraft;
        });
      }
      announceContentUpdate({ contentKey: saved.content_key, published: saved.status === "LIVE", updatedAt: saved.updated_at ?? new Date().toISOString() });
      setMessage(sourceLifecycleAction === "archive"
        ? `${draftForSave.contentKey} archived. It no longer serves and can be restored here.`
        : sourceLifecycleAction === "restore"
          ? `${draftForSave.contentKey} restored as a non-serving draft for review.`
          : `${draftForSave.contentKey} saved as ${contentStatusLabel(saved.status)}.`);
      return saved;
    } catch (error) {
      // A timed-out publish may have committed, or only metadata may have
      // advanced. Refresh the version and rebase text once, with CAS on retry.
      if (!recoveryAttempt && updateEditor && !sourceLifecycleAction && activeDraft.id
        && draftHasPackageProposal(activeDraft) && recoveryBaseline
        && error instanceof AdminRequestError && [408, 409, 504].includes(error.status)) {
        try {
          const payload = await adminJsonRequest<{ rows: AdminGeneratedContentRow[] }>(
            `/api/admin/generated-content?id=${encodeURIComponent(activeDraft.id)}&status=all&visibility=all&limit=1`, secret);
          const latest = payload.rows.find((row) => row.id === activeDraft.id);
          if (!latest || latest.inventory_only) throw new Error("Could not reload the saved version. Your edits are still here; try saving again.");
          const baseline = JSON.parse(recoveryBaseline) as AdminDraft;
          if (baseline.id !== activeDraft.id || baseline.contentKey !== activeDraft.contentKey) throw error;
          if (latest.status === "ARCHIVED") throw new Error("This source was archived while you were editing. Your edits are still here; restore the saved source before applying them.");
          const latestDraft = draftFromRow(latest);
          const proposal = recoverContentStudioCopy(
            draftEditablePackageRecord(baseline), draftEditablePackageRecord(activeDraft), draftEditablePackageRecord(latestDraft));
          const fields = recoverContentStudioCopy(
            { headline: baseline.headline, summary: baseline.summary, body: baseline.body, reviewerNotes: baseline.reviewerNotes },
            { headline: activeDraft.headline, summary: activeDraft.summary, body: activeDraft.body, reviewerNotes: activeDraft.reviewerNotes },
            { headline: latestDraft.headline, summary: latestDraft.summary, body: latestDraft.body, reviewerNotes: latestDraft.reviewerNotes });
          const recovered = { ...latestDraft, ...fields, sections: { ...latestDraft.sections, packageDraft: proposal, contentStudioReview: null } } as AdminDraft;
          return await saveDraft(nextStatus, recovered, undefined, updateEditor, true);
        } catch (recoveryError) { error = recoveryError; }
      }
      const feedback = dashboardErrorMessage(error);
      setEditorSaveError(feedback);
      setMessage(feedback);
      if (propagateError) throw error;
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDailyGlanceContext(input: { date: string; person: string; timeZone: string }) {
    setDailyGlanceContextLoading(true);
    setDailyGlanceContextError(null);

    try {
      const params = dailyGlanceContextSearchParams(input);
      const payload = await adminJsonRequest<{
        ok: boolean;
        prompt?: string | null;
        rows?: AdminReviewRecord[];
        warnings?: string[];
      }>(`/api/admin/review-records?${params.toString()}`, secret);
      const record = payload.rows?.[0];
      if (!record) {
        throw new Error(payload.prompt || payload.warnings?.[0] || "No Daily At-a-Glance source was available for that chart and local date.");
      }

      const facts = objectRecord(record.facts);
      const chart = objectRecord(facts?.chart);
      const moon = objectRecord(facts?.moon);
      const driver = objectRecord(facts?.driver);
      const selector = typeof facts?.selector === "string" ? facts.selector : "";
      const headlineKey = typeof facts?.headlineKey === "string" ? facts.headlineKey : "";
      const passageKey = typeof facts?.passageKey === "string" ? facts.passageKey : "";
      const detailLine = typeof facts?.detailLine === "string" ? facts.detailLine : "";
      if (!chart || !moon || !driver || !selector || !headlineKey || !passageKey || !detailLine) {
        throw new Error("The calculated Daily At-a-Glance response is missing its source identity or astrology facts.");
      }

      setDailyGlanceContext({
        date: record.targetDate ?? input.date,
        timeZone: typeof facts?.timeZone === "string" ? facts.timeZone : input.timeZone,
        chart: {
          id: String(chart.id ?? ""),
          name: String(chart.name ?? input.person),
          birthTimeKnown: chart.birthTimeKnown === true
        },
        moon: {
          sign: String(moon.sign ?? ""),
          degree: Number(moon.degree ?? 0)
        },
        driver: {
          kind: driver.kind === "house" ? "house" : "aspect",
          label: String(driver.label ?? "Daily source"),
          ...(typeof driver.orb === "number" ? { orb: driver.orb } : {})
        },
        selector,
        headlineKey,
        passageKey,
        detailLine
      });
    } catch (error) {
      setDailyGlanceContext(null);
      setDailyGlanceContextError(dashboardErrorMessage(error));
    } finally {
      setDailyGlanceContextLoading(false);
    }
  }

  async function openDailyGlancePair(selector: string) {
    editorReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const pair = dailyGlanceWriteups.find((candidate) => candidate.selector === selector);
    setSelectedRowId(null);
    setDraft(null);
    if (!pair) {
      setMessage(`Could not find the Daily At-a-Glance sources for ${selector}.`);
      return;
    }
    setIsLoading(true);
    try {
      await Promise.all([
        hydrateGeneratedContentRow(pair.headlineRow as AdminGeneratedContentRow),
        hydrateGeneratedContentRow(pair.passageRow as AdminGeneratedContentRow)
      ]);
      setDailyGlancePairSelector(selector);
    } catch (error) {
      setMessage(dashboardErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  function closeDailyGlancePairEditor() {
    setDailyGlancePairSelector(null);
    window.requestAnimationFrame(() => editorReturnFocusRef.current?.focus());
  }

  async function saveDailyGlancePairEdits(pair: DailyGlancePair, edits: DailyGlancePairEdits) {
    const headlineChanged = edits.headlineYou !== dailyGlancePackageField(pair.headlineRow, "body_you")
      || edits.headlineThey !== dailyGlancePackageField(pair.headlineRow, "body_they");
    const passageChanged = edits.passageYou !== dailyGlancePackageField(pair.passageRow, "body_you")
      || edits.passageThey !== dailyGlancePackageField(pair.passageRow, "body_they");
    if (!headlineChanged && !passageChanged) {
      setMessage("The Daily At-a-Glance headline and passage already match the saved sources.");
      return;
    }

    let headlineSaved = !headlineChanged;
    let passageSaved = !passageChanged;
    if (headlineChanged) {
      const headlineDraft = setPackageSectionField(
        setPackageSectionField(draftFromRow(pair.headlineRow as AdminGeneratedContentRow), "body_you", edits.headlineYou),
        "body_they",
        edits.headlineThey
      );
      headlineSaved = Boolean(await saveDraft(undefined, headlineDraft));
    }
    if (headlineSaved && passageChanged) {
      const passageDraft = setPackageSectionField(
        setPackageSectionField(draftFromRow(pair.passageRow as AdminGeneratedContentRow), "body_you", edits.passageYou),
        "body_they",
        edits.passageThey
      );
      passageSaved = Boolean(await saveDraft(undefined, passageDraft));
    }

    setSelectedRowId(null);
    setDraft(null);
    setDailyGlancePairSelector(pair.selector);
    if (headlineSaved && passageSaved) {
      setMessage("Daily At-a-Glance headline and passage saved together as review proposals.");
    } else if (headlineSaved) {
      setMessage("The headline saved, but the passage did not. Review the connection before retrying the passage.");
    } else {
      setMessage("The Daily At-a-Glance write-up was not saved.");
    }
  }

  async function retireContentEverywhere(action: "retire" | "publish" = "retire") {
    if (!draft?.id || !draft.updatedAt) return;
    setIsLoading(true);
    setEditorSaveError("");
    try {
      const result = await adminJsonRequest<{ ok: boolean; publication: unknown }>("/api/admin/content-publication", secret, {
        method: "POST", body: JSON.stringify({ action, contentKey: draft.contentKey, id: draft.id, expectedUpdatedAt: draft.updatedAt })
      });
      if (!result.ok || !validContentPublication(result.publication) || result.publication.content_key !== draft.contentKey
        || result.publication.state !== (action === "publish" ? "live" : "retired")) throw new Error("Publication change was not confirmed.");
      installContentPublications([result.publication]);
      announceContentUpdate({ contentKey: draft.contentKey, published: action === "publish", updatedAt: new Date().toISOString() });
      setMessage(action === "retire" ? `${draft.contentKey} retired everywhere. Devices apply the retirement when they reconnect.` : `${draft.contentKey} published again.`);
    } catch (error) { setEditorSaveError(dashboardErrorMessage(error)); }
    finally { setIsLoading(false); }
  }

  async function approvePackageRevision(row: AdminGeneratedContentRow, updateEditor = true) {
    setEditorSaveError("");
    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
        method: "PATCH",
        body: JSON.stringify({ id: row.id, ...(row.updated_at ? { expectedUpdatedAt: row.updated_at } : {}), ownerAction: "approve-package-revision" })
      });
      const published = payload.rows?.[0];
      if (!payload.ok || !published || published.content_key !== row.content_key || published.status !== "LIVE") {
        throw new Error("Publication was not confirmed. Your revision is saved; try Save & publish again.");
      }
      const publishedDraft = draftFromRow(published);
      if (draftHasPackageProposal(publishedDraft)) {
        throw new Error("The API returned an unpublished revision. Your revision is saved; try Save & publish again.");
      }
      setRows((current) => [published, ...current.filter((item) => item.id !== published.id && item.id !== row.id)]);
      if (updateEditor) {
        setEditorSourceRow(published);
        setSelectedRowId(published.id);
        rememberSavedDraft(publishedDraft);
      }
      announceContentUpdate({
        contentKey: published.content_key,
        published: published.status === "LIVE",
        updatedAt: published.updated_at ?? new Date().toISOString()
      });
      setMessage(`${published.content_key} approved and published to the app.`);
      return published;
    } catch (error) {
      setEditorSaveError(dashboardErrorMessage(error));
      setMessage(dashboardErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function applyBulkStatus() {
    if (selectedSavedRows.length === 0) return;
    // Inventory rows omit proposals. Hydrate before deciding which publish
    // action applies, otherwise a saved revision can be mistaken for a status-only change.
    let actionRows: AdminGeneratedContentRow[];
    setIsLoading(true);
    try { actionRows = await Promise.all(selectedSavedRows.map((row) => hydrateGeneratedContentRow(row))); }
    catch (error) { setMessage(dashboardErrorMessage(error)); return; }
    finally { setIsLoading(false); }
    const packageRows = actionRows.filter(rowIsFallbackArchitectureV3);
    if (packageRows.length > 0 && !["DRAFT", "LIVE"].includes(bulkStatus)) {
      setMessage("Package rows support saving drafts or publishing in bulk. Reviewed and Archived require their governed package workflow.");
      return;
    }
    if (bulkStatus === "LIVE") {
      const blocked = actionRows.filter(row => isContentStudioReferenceSource(row.content_key, row.source_snapshot ?? {})
        || row.block_type === "sky_placement" || skyWritingIssues(row).length > 0);
      if (blocked.length) { setMessage("Some selected rows need writing checks or a separate source/package review. Open those rows and complete their next action before publishing."); return; }
      const nonServingSourceRows = packageRows.filter((row) => {
        const snapshot = sourceSnapshotForRow(row);
        const facts = objectRecord("facts" in row ? row.facts : null);
        const role = String(
          rowPackageRecord(row).content_role
          ?? snapshot?.content_role
          ?? facts?.content_role
          ?? ""
        ).trim().toLowerCase().replace(/-/g, "_");
        return ["fallback_source", "source_material"].includes(role);
      });
      if (nonServingSourceRows.length > 0) {
        setMessage(`${nonServingSourceRows.length} selected source-material row${nonServingSourceRows.length === 1 ? " is" : "s are"} an ingredient, not exact reader copy. Remove ${nonServingSourceRows.length === 1 ? "it" : "them"} from the selection before publishing.`);
        return;
      }
      const governedSkyRows = packageRows.filter((row) => {
        const record = rowPackageRecord(row);
        return record.source_package === skyV4CanonicalStagePackage
          || sourceSnapshotString(sourceSnapshotForRow(row), "sourcePackage") === skyV4CanonicalStagePackage;
      });
      if (governedSkyRows.length > 0) {
        setMessage(`${governedSkyRows.length} selected SKY V4 row${governedSkyRows.length === 1 ? " requires" : "s require"} the hash-bound owner approval flow and cannot use bulk publish.`);
        return;
      }
    }
    setIsLoading(true);
    try {
      const updates = await Promise.allSettled(actionRows.map((row) => {
        const isPackageRow = rowIsFallbackArchitectureV3(row);
        const hasProposal = Boolean(objectRecord(objectRecord(row.sections)?.packageDraft));
        const requestBody = isPackageRow
          ? bulkStatus === "LIVE" && hasProposal
            ? { id: row.id, ownerAction: "approve-package-revision" }
            : { id: row.id, reviewStatus: bulkStatus === "LIVE" ? "approved" : "needs_review" }
          : {
              id: row.id,
              status: bulkStatus,
              reviewState: bulkStatus === "LIVE" || bulkStatus === "REVIEWED" ? null : row.review_state ?? null
            };
        return adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>("/api/admin/generated-content", secret, {
          method: "PATCH",
          body: JSON.stringify(row.updated_at ? { ...requestBody, expectedUpdatedAt: row.updated_at } : requestBody)
        });
      }));
      const updatedRows = updates.flatMap((result) => result.status === "fulfilled" ? result.value.rows ?? [] : []);
      const failedIds = actionRows.filter((_, index) => updates[index].status === "rejected").map((row) => row.id);
      updatedRows.forEach((row) => announceContentUpdate({
        contentKey: row.content_key,
        published: row.status === "LIVE",
        updatedAt: row.updated_at ?? new Date().toISOString()
      }));
      setRows((current) => current.map((row) => updatedRows.find((updated) => updated.id === row.id) ?? row));
      setSelectedIds(new Set(failedIds));
      const failure = updates.find((result) => result.status === "rejected");
      setMessage(`Updated ${updatedRows.length} rows. ${failedIds.length ? `${failedIds.length} failed and remain selected: ${failure?.status === "rejected" ? dashboardErrorMessage(failure.reason) : "Retry the selected rows."}` : "All selected changes saved."}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update selected rows.");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteSelectedDrafts(targetRows = selectedSavedRows) {
    const deletable = targetRows.filter((row) => row.status !== "LIVE");
    if (deletable.length === 0) {
      setMessage("Published rows are protected. Demote before deleting.");
      return;
    }
    setIsLoading(true);
    try {
      const results = await Promise.allSettled(deletable.map((row) => adminJsonRequest<{ ok: boolean }>(`/api/admin/generated-content?id=${encodeURIComponent(row.id)}${row.updated_at ? `&expectedUpdatedAt=${encodeURIComponent(row.updated_at)}` : ""}`, secret, {
        method: "DELETE"
      })));
      const deleted = deletable.filter((_, index) => results[index].status === "fulfilled");
      const failed = deletable.filter((_, index) => results[index].status === "rejected");
      setRows((current) => current.filter((row) => !deleted.some((item) => item.id === row.id)));
      setSelectedIds(new Set(failed.map((row) => row.id)));
      if (deleted.some((row) => row.id === selectedRowId)) {
        setDraft(null);
        setSelectedRowId(null);
      }
      deleted.forEach((row) => announceContentUpdate({ contentKey: row.content_key, published: false, updatedAt: new Date().toISOString() }));
      const failure = results.find((result) => result.status === "rejected");
      setMessage(`Deleted ${deleted.length} non-published rows.${failed.length ? ` ${failed.length} failed and remain selected: ${failure?.status === "rejected" ? dashboardErrorMessage(failure.reason) : "Retry the selected rows."}` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete selected rows.");
    } finally {
      setIsLoading(false);
    }
  }

  async function hydrateGeneratedContentRow(row: AdminGeneratedContentRow, refresh = false, followPublishedRevision = false) {
    if (!row.inventory_only && !refresh) return row;
    const selector = row.id.startsWith("package:") ? `contentKeys=${encodeURIComponent(row.content_key)}` : `id=${encodeURIComponent(row.id)}`;
    const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?${selector}&status=all&visibility=all&limit=1`,
      secret
    );
    let hydrated = payload.rows?.find((candidate) => candidate.id === row.id || row.id.startsWith("package:") && candidate.content_key === row.content_key);
    const publishedTarget = hydrated?.source_snapshot?.targetRowId;
    if ((row.id.startsWith("package:") || followPublishedRevision || refresh && row.status !== "ARCHIVED") && hydrated?.status === "ARCHIVED"
      && hydrated.review_state === "published-revision" && typeof publishedTarget === "string") {
      const target = await adminJsonRequest<{ rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?id=${encodeURIComponent(publishedTarget)}&status=all&visibility=all&limit=1`, secret);
      hydrated = target.rows?.find((candidate) => candidate.id === publishedTarget);
    }
    if (!hydrated || hydrated.inventory_only) {
      throw new Error(`Could not load the full content document for ${row.content_key}.`);
    }
    setRows((current) => mergeContentInventory(current.filter((candidate) => candidate.id !== row.id || row.id === hydrated.id), [hydrated]));
    return hydrated;
  }

  async function openRow(row: AdminGeneratedContentRow, compositionContext: CompositionEditorContext | null = null, fieldPath?: string, placementSelection?: SkyPlacementSelection, preservingParentDraft = false): Promise<boolean> {
    const replacingUnsavedEditor = draft && row.id !== draft.id && (
      JSON.stringify(draft) !== editorBaselineRef.current && JSON.stringify(draft) !== editorSavedInputRef.current
      || hasPendingArticleChanges()
    );
    if (replacingUnsavedEditor && !preservingParentDraft && !window.confirm("Discard the unsaved changes in this editor?")) return false;
    // Capture focus and the owner's decision before loading disables controls.
    if (document.activeElement instanceof HTMLElement && !editorRef.current?.contains(document.activeElement)) {
      editorReturnFocusRef.current = document.activeElement;
    }
    if (row.inventory_only || !row.id.startsWith("package:")) {
      setIsLoading(true);
      try {
        row = await hydrateGeneratedContentRow(row, true, Boolean(placementSelection));
      } catch (error) {
        setEditorSaveError(dashboardErrorMessage(error));
        setMessage(dashboardErrorMessage(error));
        return false;
      } finally { setIsLoading(false); }
    }
    const nextDraft = draftFromRow(row);
    setEditorSaveError("");
    rememberSavedDraft(nextDraft);
    const edition = compiledSkyArticleEditionForDraft(nextDraft);
    const baseEdition = skyArticleRevisionBaseForDraft(nextDraft);
    setDailyGlancePairSelector(null);
    setEditorSourceRow(row);
    setSelectedRowId(row.id);
    setCompositionEditorContext(compositionContext);
    setSkyWritingContext({ fieldPath, selection: placementSelection ?? (activePage === "skyWriteups" ? { planet: skyPlacementBody, sign: skyPlacementSign, motion: skyWriteupMotionFilter } : undefined) });
    setSkyWriteupParentId(null);
    setSkyRelatedAspectQuery("");
    setSkyFallbackPreviewFacts({});
    setSkyFallbackVariableTarget("");
    setTemplateVariableReferenceOpen(false);
    setTemplateVariableQuery("");
    setSelectedTemplateVariableName(null);
    setSelectedTemplateVariableSourceId(null);
    editorSessionRef.current += 1;
    skyArticleAutosaveSequenceRef.current += 1;
    articleAutosaveRowRef.current = row;
    workspaceAutosaveRowRef.current = null;
    skyArticleWorkspaceAutosaveSequenceRef.current += 1;
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
    scrollEditorToTop(fieldPath);
    return true;
  }

  async function resolveLiveTransitNatalServingSource(preferredField?: string) {
    const current = transitNatalSelectionRef.current;
    const contact = transitNatalContactFromFields(current.planet, current.aspect, current.natalPoint);
    if (!contact) return null;
    const payload = await adminJsonRequest<{ ok: boolean; rendered?: { paragraphs?: Array<{ sources?: Array<{ contentKey?: string; field?: string }> }>; sourceKeys?: string[] } }>(
      "/api/admin/transit-natal-preview",
      secret,
      {
        method: "POST",
        body: JSON.stringify({
          ...transitReadingContext,
          ...contact,
          ...(current.sign ? { sign: current.sign } : {}),
          ...(current.transitHouse ? { transitHouse: current.transitHouse } : {}),
          ...(current.natalHouse ? { natalHouse: current.natalHouse } : {}),
          voice: friendsTransitAudience ? "{{Name}}" : "you"
        })
      }
    );
    return transitNatalLiveServingSource(payload.rendered, preferredField);
  }

  async function openContentKeyRow(contentKey: string, label: string, openTemplatePreview = false, fieldPath?: string, options?: { resolvedLiveSource?: boolean }) {
    const originatingHash = window.location.hash;
    const requestId = ++sourceOpenRequestRef.current;
    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[]; packageSource?: Record<string, unknown> | null }>(
        `/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(contentKey)}&limit=1&includePackageSource=true`,
        secret
      );
      if (!Array.isArray(payload.rows) || payload.rows.some(candidate => candidate.content_key !== contentKey)) throw new Error("The selected source could not be verified.");
      const row = payload.rows.find(candidate => candidate.content_key === contentKey);
      if (requestId !== sourceOpenRequestRef.current || window.location.hash !== originatingHash) return;
      if (!row && payload.packageSource) {
        if (packagedTransitOpenMode(finderTransitNatalExactKey(), contentKey) === "exact") {
          await openPackagedTransitSource(payload.packageSource, contentKey, fieldPath);
          return;
        }
        await openPackagedFallbackSource(payload.packageSource, contentKey, label, fieldPath);
        return;
      }
      if (!row) {
        const current = transitNatalSelectionRef.current;
        const contact = transitNatalContactFromFields(current.planet, current.aspect, current.natalPoint);
        const assumedFamily = contact ? transitNatalSharedFallbackKey(contact) : null;
        if (!options?.resolvedLiveSource && (isTransitNatalFamilyKey(contentKey) || contentKey === assumedFamily)) {
          const serving = await resolveLiveTransitNatalServingSource(fieldPath);
          if (requestId !== sourceOpenRequestRef.current || window.location.hash !== originatingHash) return;
          if (serving?.contentKey && serving.contentKey !== contentKey) {
            await openContentKeyRow(serving.contentKey, label, false, serving.field || fieldPath, { resolvedLiveSource: true });
            return;
          }
        }
        throw new Error(`${label} is not materialized in Content Studio (${contentKey}).`);
      }
      setRows((current) => [row, ...current.filter(candidate => candidate.id !== row.id)]);
      if (!await openRow(row, null, fieldPath)) return;
      if (openTemplatePreview) setTemplateVariableReferenceOpen(true);
      setMessage(openTemplatePreview
        ? `Opened the assembled reader preview for ${label}. Colored sections link to their atomic sources.`
        : `Opened ${label}. The source card explains which other reader pages use this writing.`);
    } catch (error) {
      if (requestId !== sourceOpenRequestRef.current || window.location.hash !== originatingHash) return;
      setMessage(error instanceof Error ? error.message : `Could not open ${label}.`);
    } finally {
      if (requestId === sourceOpenRequestRef.current) setIsLoading(false);
    }
  }

  /**
   * Opening a different row from inside the editor always leaves a named way back.
   * Every in-editor Edit and Open control routes through here so no control can
   * replace the row the owner is writing on without recording its parent.
   */
  async function openFromEditor(destinationContentKey: string, open: () => Promise<boolean | void> | boolean | void, options: { parentDraft?: AdminDraft | null; saveReturns?: boolean } = {}): Promise<boolean> {
    const parentDraft = options.parentDraft ?? draft;
    if (!parentDraft || parentDraft.contentKey === destinationContentKey) return await open() !== false;
    const parentBaseline = editorBaselineRef.current;
    const parentSavedInput = editorSavedInputRef.current;
    const parentRow = editorSourceRow;
    const parentSelection = selectedRowId;
    const parentContext = skyWritingContext;
    const parentComposition = compositionEditorContext;
    const parentVariablesOpen = templateVariableReferenceOpen;
    const parentVariableName = selectedTemplateVariableName;
    const parentVariableSource = selectedTemplateVariableSourceId;
    const previousReturn = studioEditorReturnContext();
    // Registered before the row loads so the destination's first render already
    // carries the way back instead of waiting for an unrelated re-render.
    rememberStudioEditorReturn({ childContentKey: destinationContentKey, label: parentDraft.headline || parentDraft.contentKey, saveReturns: options.saveReturns === true, returnToParent: () => {
      setDraft(parentDraft); editorBaselineRef.current = parentBaseline; editorSavedInputRef.current = parentSavedInput;
      setEditorSourceRow(parentRow); setSelectedRowId(parentSelection); setSkyWritingContext(parentContext);
      setCompositionEditorContext(parentComposition); setTemplateVariableReferenceOpen(parentVariablesOpen);
      setSelectedTemplateVariableName(parentVariableName); setSelectedTemplateVariableSourceId(parentVariableSource);
      setEditorSaveError(""); editorSessionRef.current += 1;
    } });
    if (await open() === false) {
      if (previousReturn) rememberStudioEditorReturn(previousReturn); else clearStudioEditorReturn();
      return false;
    }
    return true;
  }

  async function createNatalPlacementOverride(contentKey: string, label: string, body: string) {
    const { natalPlacementOverrideDraft } = await import("./NatalPlacementSourceFinder");
    setSelectedRowId(null);
    setCompositionEditorContext(null);
    setDraft(natalPlacementOverrideDraft(contentKey, label, body));
    setMessage(`Created a draft exact override for ${label}. It will not replace the composed reader copy until it is reviewed and published.`);
    scrollEditorToTop();
  }

  function createNatalAspectSource(nextDraft: NatalAspectSourceDraft) {
    setSelectedRowId(null);
    setCompositionEditorContext(null);
    setDraft(nextDraft);
    setMessage(`Created a draft exact passage for ${nextDraft.headline}. Write and review both You and Friend copy before publishing.`);
    scrollEditorToTop();
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
      if (!await openRow(row)) return;
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
    editorSessionRef.current += 1;
    skyArticleAutosaveSequenceRef.current += 1;
    skyArticleWorkspaceAutosaveSequenceRef.current += 1;
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
    editorSessionRef.current += 1;
    skyArticleAutosaveSequenceRef.current += 1;
    skyArticleWorkspaceAutosaveSequenceRef.current += 1;
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

  function scrollEditorToTop(fieldPath?: string) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const editorScroller = editorRef.current?.querySelector<HTMLElement>(".admin-post-editor") ?? editorRef.current;
        const field = fieldPath && Array.from(editorRef.current?.querySelectorAll<HTMLTextAreaElement>("textarea[data-sky-field]") ?? []).find(element => element.dataset.skyField === fieldPath);
        if (field) {
          field.focus({ preventScroll: true });
          field.scrollIntoView({ block: "center", behavior: "auto" });
        } else editorScroller?.scrollTo({ top: 0, behavior: "auto" });
      });
    });
  }

  function confirmSkyEditorNavigation() {
    const unsaved = draft && JSON.stringify(draft) !== editorBaselineRef.current && JSON.stringify(draft) !== editorSavedInputRef.current;
    return !(unsaved || hasPendingArticleChanges()) || window.confirm("Discard the unsaved changes in this editor?");
  }

  function openRelatedSkyRow(parentId: string, row: AdminGeneratedContentRow) {
    if (row.inventory_only) {
      setIsLoading(true);
      void hydrateGeneratedContentRow(row)
        .then((hydrated) => openRelatedSkyRow(parentId, hydrated))
        .catch((error) => setMessage(dashboardErrorMessage(error)))
        .finally(() => setIsLoading(false));
      return;
    }
    if (!confirmSkyEditorNavigation()) return;
    const nextDraft = draftFromRow(row);
    setSkyWriteupParentId(parentId);
    setEditorSourceRow(row);
    setSelectedRowId(row.id);
    rememberSavedDraft(nextDraft);
    scrollEditorToTop();
  }

  function returnToSkyWriteup() {
    if (!confirmSkyEditorNavigation()) return;
    const parent = rows.find((row) => row.id === skyWriteupParentId);
    if (!parent) {
      setMessage("The parent Sky write-up is no longer available in the loaded rows.");
      setSkyWriteupParentId(null);
      return;
    }
    const nextDraft = draftFromRow(parent);
    setEditorSourceRow(parent);
    setSelectedRowId(parent.id);
    rememberSavedDraft(nextDraft);
    setSkyWriteupParentId(null);
    setSkyRelatedAspectQuery("");
    scrollEditorToTop();
  }

  async function openHookDraft(item: HookCatalogItem) {
    const contentKey = canonicalFallbackContentKey(item.key);
    setMessage(`Loading source wording for ${item.label}…`);
    try {
      const saved = savedFallbackRows.find((row) => row.content_key === contentKey || hookKeyFromSavedRow(row) === item.key);
      if (saved) {
        navigateAdminPage("knowledge", new URLSearchParams({ section: item.section, q: query }), { keepEditorOpen: true });
        openRow(saved);
        setMessage(`Opened ${item.label}.`);
        return;
      }

      const body = await hookBodyFor(item);
      navigateAdminPage("knowledge", new URLSearchParams({ section: item.section, q: query }), { keepEditorOpen: true });
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
    }
  }

  function handleCreateAction(page: AdminDashboardPage, nextMessage: string, calendarSign?: string) {
    const isCalendarWriteup = page === "knowledge" && lunarWorkspaceActive;
    if (isCalendarWriteup && !calendarSign) {
      setIsCreateMenuOpen(false);
      setCalendarCreateRequest(value => value + 1);
      return;
    }
    const usedVariants = new Set(rows.filter(row => lunarContentIdentity(row.content_key)?.sign === calendarSign && row.content_key.startsWith("authored/calendar-weekly-moon/")).map(row => lunarContentIdentity(row.content_key)!.variant));
    const nextVariant = [1, 2, 3, 4].find(variant => !usedVariants.has(variant) && !(calendarSign === "cancer" && variant === 1));
    if (calendarSign && !nextVariant) { setMessage("All four variants already exist for this sign. Edit or restore an existing passage."); return; }
    const newMoonKey = calendarSign ? `authored/calendar-weekly-moon/${calendarSign}${nextVariant === 1 ? "" : `/variant-${nextVariant}`}` : "authored/calendar-weekly-moon/new-entry";
    navigateAdminPage(page, isCalendarWriteup ? new URLSearchParams({ section: "lunar-calendar" }) : undefined, { keepEditorOpen: true });
    setIsCreateMenuOpen(false);
    setSelectedRowId(null);
    setMessage(nextMessage);
    if (page === "articles") {
      setDraft({
        id: null,
        contentKey: "article/manual/new-row",
        surface: "sky",
        mode: "article",
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
        sourceSnapshot: {
          contentType: "authored-article",
          contentSystem: "authored",
          content_role: "authored-content",
          contentLevel: "owner-authored",
          authoringSource: "admin-dashboard"
        }
      });
      return;
    }
    if (page === "astro101") {
      setDraft(createAstro101Draft("article"));
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
        sourceSnapshot: {
          contentType: "authored-content",
          contentSystem: "authored",
          content_role: "authored-content",
          contentLevel: "owner-authored",
          authoringSource: "admin-dashboard"
        }
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
        sourceSnapshot: {
          contentType: "vocab",
          contentSystem: "fallback",
          content_role: "vocabulary",
          contentLevel: "source-grounded",
          authoringSource: "admin-dashboard"
        }
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
        sourceSnapshot: {
          contentType: "template",
          contentSystem: "fallback",
          content_role: "template",
          contentLevel: "source-grounded",
          authoringSource: "admin-dashboard"
        }
      });
      return;
    }
    if (page === "knowledge") {
      setDraft({
        id: null,
        contentKey: isCalendarWriteup ? newMoonKey : "fallback-hook/manual/new-hook",
        surface: "sky",
        mode: isCalendarWriteup ? "in_depth" : "feed",
        status: "DRAFT",
        headline: isCalendarWriteup ? lunarContentIdentity(newMoonKey)?.title ?? "" : "",
        summary: "",
        body: "",
        lane: "reference",
        reviewState: "EDITORIAL_REVIEW_REQUIRED",
        blockType: "fallback_hook",
        promptVersion: "fallback-hook-template-v1",
        sections: isCalendarWriteup ? { packageRecord: { contentKey: newMoonKey, content_role: "full_copy", body: "", focus: "", strategy: "", review_status: "needs_review" } } : null,
        facts: null,
        reviewerNotes: "",
        sourceSnapshot: {
          contentType: "fallback-system",
          content_role: isCalendarWriteup ? "full_copy" : "fallback_hook",
          ...(isCalendarWriteup ? { sourcePackage: "tldrastro-fallback-architecture-v3" } : {}),
          review_status: "needs_review",
          hook: "manual/new-hook",
          contentSystem: "fallback",
          contentLevel: "madlib-fallback",
          authoringSource: "admin-dashboard"
        }
      });
    }
  }

  function openCalendarWritingSource(row: AdminGeneratedContentRow) {
    return openFromEditor(row.content_key, () => openRow(row, null, "body", undefined, Boolean(draft)), { saveReturns: true });
  }

  async function openSkyForecastTemplate(period: SkyForecastPeriod, field?: string) {
    const fieldPath = field ? `calendarOverview.${field}` : undefined;
    if (fieldPath && draft?.contentKey === `slot-template/calendar/${period.split("-")[0]}-overview/v1`) {
      setSkyWritingContext({ fieldPath }); scrollEditorToTop(fieldPath); return;
    }
    if (!closeEditor()) return;
    const originatingHash = window.location.hash;
    const requestId = ++sourceOpenRequestRef.current;
    setIsLoading(true);
    try {
      const { skyForecastTemplates } = await import("./skyForecastTemplates");
      if (requestId !== sourceOpenRequestRef.current || window.location.hash !== originatingHash) return;
      const template = skyForecastTemplates[period];
      const payload = await adminJsonRequest<{ rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(template.contentKey)}&limit=1`, secret);
      if (!Array.isArray(payload.rows) || payload.rows.some(row => row.content_key !== template.contentKey)) throw new Error("Could not verify the saved template.");
      if (requestId !== sourceOpenRequestRef.current || window.location.hash !== originatingHash) return;
      const saved = payload.rows[0];
      if (saved) {
        setRows(current => [saved, ...current.filter(row => row.id !== saved.id)]);
        if (!await openRow(saved)) return;
      } else {
        rememberSavedDraft({
          id: null, contentKey: template.contentKey, surface: "sky", mode: "card", status: "DRAFT",
          headline: template.headline, body: template.body,
          summary: template.description,
          lane: "reference", reviewState: "EDITORIAL_REVIEW_REQUIRED", blockType: "fallback_template",
          promptVersion: "manual-admin", sections: null, facts: null, reviewerNotes: "",
          sourceSnapshot: { contentType: "template", contentSystem: "fallback", content_role: "template", authoringSource: "admin-dashboard" }
        });
      }
      setMessage("");
      setSkyWritingContext({ fieldPath });
      scrollEditorToTop(fieldPath);
    } catch (error) {
      if (requestId === sourceOpenRequestRef.current && window.location.hash === originatingHash) setMessage(dashboardErrorMessage(error));
    } finally {
      if (requestId === sourceOpenRequestRef.current) setIsLoading(false);
    }
  }

  async function openSkySummaryField(field: SkySummaryField, initialBody?: string) {
    if (draft && JSON.stringify(draft) !== editorBaselineRef.current && JSON.stringify(draft) !== editorSavedInputRef.current
      && !window.confirm("Discard the unsaved changes in this editor?")) return;
    setIsLoading(true);
    try {
      const { skySummaryCandidateReceipt, loadSkySummarySourceBank } = await import("./skySummarySourceBank");
      const suppliedBank = initialBody !== undefined && /^cms\/sky-daily-summary\/(sun|moon)\//u.test(field.key)
        ? await loadSkySummarySourceBank() : undefined;
      const candidateReceipt = suppliedBank && initialBody !== undefined ? skySummaryCandidateReceipt(field.key, initialBody, suppliedBank) : undefined;
      const result = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(field.key)}&limit=1`, secret);
      if (!Array.isArray(result.rows)) throw new Error("Could not load the saved summary wording. Please try again.");
      const moonSource = /^cms\/sky-daily-summary\/moon\/[^/]+\/[^/]+$/u.test(field.key)
        ? (await (await import("./skyMoonSummarySources")).loadSkyMoonSummarySources()).rows.find(row => row.key === field.key) : undefined;
      let existing = result.rows.find(row => row.content_key === field.key);
      if (!existing && field.key.startsWith("cms/sky-daily-summary/ingress/")) {
        const { ingressTldrSourceKeys, publishedIngressTldr } = await import("./skyIngressTldrSources");
        const [planet, sign] = field.label.split(" enters ");
        const sources = await Promise.all(ingressTldrSourceKeys(planet, sign).map(async key => {
          const response = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
            `/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(key)}&limit=1`, secret);
          if (!Array.isArray(response.rows)) throw new Error("Could not check the existing ingress TLDR. Please try again.");
          return response.rows;
        }));
        existing = publishedIngressTldr(sources.flat(), planet, sign);
      }
      if (existing) {
        const current = { ...existing, body: currentSkySummaryWording(existing.content_key, existing.body ?? "") };
        setRows(rows => [current, ...rows.filter(row => row.id !== current.id)]);
        const opened = await openRow(current);
        if (opened && initialBody !== undefined) setDraft(previous => previous ? { ...previous, body: initialBody,
          sourceSnapshot: { ...previous.sourceSnapshot, ...(candidateReceipt ? { suppliedBank: candidateReceipt } : {}) }
        } : previous);
      } else {
        const { importedSkySummary, skySummaryImportProvenance } = await import("./skySummaryImportedCopy");
        const nextDraft: AdminDraft = {
          id: null, contentKey: field.key, surface: "sky", mode: "card", status: "DRAFT",
          headline: field.label, summary: "", body: initialBody ?? (field.body || importedSkySummary(field.key) || ""), lane: "serving", reviewState: "EDITORIAL_REVIEW_REQUIRED",
          blockType: "essay", promptVersion: "cms-surface-template-v1", sections: null, facts: null, reviewerNotes: "",
          sourceSnapshot: {
            contentType: "mustache-template", contentSystem: "cms-surface-override", contentLevel: "owner-authored",
            authoringSource: "admin-dashboard", cmsSurfaceId: field.key.startsWith("cms/sky-debility/") ? "sky-debility-card" : "sky-daily-summary",
            readerLocation: field.key.startsWith("cms/sky-debility/") ? "Sky → Without their tools card" : "Sky → Daily Sky Summary; Calendar → Sun introduction",
            allowedSlots: field.allowedSlots,
            ...(initialBody !== undefined && candidateReceipt ? { suppliedBank: candidateReceipt } : {}),
            ...(moonSource ? { moonSource, sourceAttachment: "daily-sky-summary-moon-system-v6-owner-phrases-audited.md" } : {}),
            ...(importedSkySummary(field.key) !== undefined ? { suppliedCopy: skySummaryImportProvenance } : {})
          }
        };
        rememberSavedDraft(nextDraft);
        setSelectedRowId(null);
        setCompositionEditorContext(null);
        setSkyArticleEditor(null);
        setSkyArticleEditionForm(null);
        setDailyGlancePairSelector(null);
        setEditorSaveError("");
      }
      setMessage(`Opened ${field.label}. Save & publish makes your edits live in one step.`);
      scrollEditorToTop();
    } catch (error) {
      setMessage(dashboardErrorMessage(error));
    } finally {
      setIsLoading(false);
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

  function handleCompatibilityCreateAction(kind: AdminCompatibilityCreateKind) {
    if (document.activeElement instanceof HTMLElement && !editorRef.current?.contains(document.activeElement)) {
      editorReturnFocusRef.current = document.activeElement;
    }
    navigateAdminPage("compatibility", undefined, { keepEditorOpen: true });
    setIsCreateMenuOpen(false);
    setSelectedRowId(null);
    setCompatibilitySectionFilter(kind === "fallback-hook" ? "fallback-hooks" : kind === "vocabulary" ? "vocabulary" : kind === "template" ? "slots" : "content");
    setCompatibilityPlanetFilter("all");
    setMessage(
      kind === "content" ? "New compatibility card copy started."
      : kind === "vocabulary" ? "New compatibility phrase started."
      : kind === "fallback-hook" ? "New compatibility fallback hook started."
      : "New compatibility template started."
    );

    if (kind === "content") {
      rememberSavedDraft({
        id: null,
        contentKey: "authored/compat-pair/draft",
        surface: "relationship",
        mode: "card",
        status: "DRAFT",
        headline: "",
        summary: "",
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
          contentSystem: "authored",
          content_role: "authored-content",
          contentLevel: "source-grounded",
          authoringSource: "admin-dashboard",
          route: "friends.compatibility",
          planet: "",
          readerSign: "",
          otherSign: ""
        }
      });
      return;
    }

    const singletonKey = kind === "fallback-hook"
      ? "fallback-hook/friends.compatibility.planet-card"
      : kind === "template"
        ? "slot-template/compatibility/planet-card"
        : null;
    const existingSingleton = singletonKey ? rows.find((row) => row.content_key === singletonKey) : null;
    if (existingSingleton) {
      openRow(existingSingleton);
      setMessage(`${rowTitle(existingSingleton)} already exists. Its saved record is open.`);
      return;
    }

    if (kind === "vocabulary") {
      rememberSavedDraft({
        id: null,
        contentKey: "vocab/relationship/draft",
        surface: "relationship",
        mode: "feed",
        status: "DRAFT",
        headline: "",
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
          route: "friends.compatibility"
        }
      });
      return;
    }

    if (kind === "fallback-hook") {
      rememberSavedDraft({
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

    rememberSavedDraft({
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
        contentSystem: "fallback",
        content_role: "template",
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
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
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

  const natalChartWorkspaceActive = activePage === "content" && categoryFilter === "Natal Chart";
  const natalAspectWorkspaceActive = activePage === "content" && categoryFilter === "Natal Aspects";
  const calendarAspectWorkspaceActive = activePage === "content" && categoryFilter === "Calendar Aspects";
  const lunarWorkspaceActive = activePage === "calendarWriteups" && calendarWriteupWorkspaceView === "daily-sky";
  const inventoryLoading = loadState === "loading"
    || (activePage === "skyWriteups" && loadState === "loaded" && !allRowsLoaded && !loadError);
  const currentPageTitle = natalChartWorkspaceActive
    ? "Natal Chart Write-ups"
    : natalAspectWorkspaceActive
      ? "Natal Aspect Write-ups"
      : calendarAspectWorkspaceActive
        ? "Calendar Aspect Cards"
        : friendsBetweenYouTwoWorkspace
          ? "Between you two"
        : adminPageTitle(activePage);
  const currentPageDescription = natalChartWorkspaceActive
    ? "Find the exact writing for a planet or point in its sign and house."
    : natalAspectWorkspaceActive
      ? "Find and edit the exact writing for two natal bodies and their aspect."
      : calendarAspectWorkspaceActive
        ? "Edit composed Calendar cards and their reusable sign-specific aspect passages."
        : friendsBetweenYouTwoWorkspace
          ? "Edit the live Friends Transits article: opening, What this activates, Active for Name, and Where it lands."
        : adminPageDescription(activePage);
  const currentPageBreadcrumbs = natalChartWorkspaceActive
    ? [{ label: "Admin", page: "reviewQueue" as AdminDashboardPage }, { label: "Write", page: "content" as AdminDashboardPage }, { label: "Natal chart" }]
    : natalAspectWorkspaceActive
      ? [{ label: "Admin", page: "reviewQueue" as AdminDashboardPage }, { label: "Write", page: "content" as AdminDashboardPage }, { label: "Natal aspects" }]
      : calendarAspectWorkspaceActive
        ? [{ label: "Admin", page: "reviewQueue" as AdminDashboardPage }, { label: "Write", page: "content" as AdminDashboardPage }, { label: "Calendar aspects" }]
      : friendsBetweenYouTwoWorkspace
        ? [{ label: "Admin", page: "reviewQueue" as AdminDashboardPage }, { label: "Write", page: "skyWriteups" as AdminDashboardPage }, { label: "Friends Transits" }, { label: "Between you two" }]
      : adminPageBreadcrumbItems(activePage);

  const nav = (
    <aside className="admin-sidebar" data-mobile-open={isMobileNavOpen ? "true" : "false"}>
      <div className="admin-sidebar-chrome">
      <a className="admin-brand" href="#review-queue" onClick={() => navigateAdminPage("reviewQueue")}>
        <span className="admin-brand-mark">TLDR</span>
        <span>
          <strong>Content Studio</strong>
          <small>Phrasebank admin</small>
        </span>
      </a>
      <div className="admin-theme-controls">
      <StudioButton type="button" className="admin-theme-toggle" onClick={toggleStudioTheme} aria-label={`Switch to ${studioTheme === "dark" ? "light" : "dark"} theme`}>
        {studioTheme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        <span>{studioTheme === "dark" ? "Light theme" : "Dark theme"}</span>
      </StudioButton>
      <StudioButton type="button" className="admin-palette-toggle" onClick={toggleStudioPalette} aria-label={`Switch to ${studioPalette === "green" ? "black and white" : "green"} chrome`}>
        <Palette size={16} aria-hidden="true" />
        <span>{studioPalette === "green" ? "Black and white" : "Green theme"}</span>
      </StudioButton>
      <StudioIconButton
        className="admin-mobile-nav-toggle"
        type="button"
        aria-controls="admin-content-navigation"
        aria-expanded={isMobileNavOpen}
        aria-label={isMobileNavOpen ? "Hide Content Studio navigation" : "Open Content Studio navigation"}
        onClick={() => setIsMobileNavOpen((open) => !open)}
      >
        {isMobileNavOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </StudioIconButton>
      </div>
      </div>
      <nav id="admin-content-navigation" className="admin-nav" aria-label="Content operations">
        {primaryAdminNavGroups.map((group) => (
        <section className="admin-nav-section" aria-label={group} key={group}>
          <p className="admin-eyebrow">{group}</p>
          {primaryAdminNavItems.filter((item) => item.group === group).map((item) => {
            const Icon = item.icon;
            const isActive = item.section
              ? activePage === item.page && fallbackSectionFilter === item.section
              : item.category
              ? activePage === item.page && categoryFilter === item.category
              : item.page === "content"
                ? activePage === "content" && categoryFilter !== "Natal Chart" && categoryFilter !== "Natal Aspects" && categoryFilter !== "Calendar Aspects"
                : item.page === "compositionMap"
                  ? isCompositionPage(activePage) && !(activePage === "knowledge" && fallbackSectionFilter === "lunar-calendar")
                  : item.page === "skyWriteups"
                    ? activePage === item.page && skyWriteupWorkspaceView === "catalog"
                  : activePage === item.page;
            return (
              <Fragment key={item.key ?? item.page}>
                <StudioButton
                  type="button"
                  title={item.category === "Natal Chart"
                    ? "Planets and points in signs and houses"
                    : item.category === "Natal Aspects"
                      ? "Exact aspects between two natal planets or points"
                      : undefined}
                  onClick={() => navigatePrimaryAdminItem(item)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                </StudioButton>
                {(item.page === "calendarWriteups" || item.page === "skyWriteups") && (
                  <div className="admin-nav-workspace-group" hidden={activePage !== item.page}
                    aria-label={`${item.label} sections`}>
                    {(item.page === "calendarWriteups" ? calendarWriteupWorkspaceTabs : [
                      skyWriteupWorkspaceTabs[0],
                      { value: "transits-to-natal", label: "Transit to Natal Charts" },
                      skyWriteupWorkspaceTabs[3]
                    ]).map(tab => <StudioButton key={tab.value} type="button"
                      onClick={() => navigateAdminPage(item.page, new URLSearchParams({ view: tab.value }))}
                      aria-current={activePage === item.page && (item.page === "calendarWriteups" ? calendarWriteupWorkspaceView : skyWriteupWorkspaceView) === tab.value ? "page" : undefined}>
                      <span>{tab.label}</span>
                    </StudioButton>)}
                  </div>
                )}
                {item.page === "skyWriteups" && (
                  <>
                    <StudioButton
                      type="button"
                      title="Friends > Transits reader-facing copy"
                      onClick={() => navigateAdminPage("skyWriteups", new URLSearchParams({ view: "transits-to-natal", audience: "friends" }))}
                      aria-current={friendsTransitAudience ? "page" : undefined}
                    >
                      <Users size={16} aria-hidden="true" />
                      <span>Friends Transits</span>
                    </StudioButton>
                    <div className="admin-nav-workspace-group" hidden={!(activePage === "skyWriteups" || friendsTransitAudience)} aria-label="Friends Transits sections">
                      <StudioButton
                        type="button"
                        title="Edit the bond-effect passages shown under Friends > Transits > Between you two"
                        onClick={() => navigateAdminPage("knowledge", new URLSearchParams({ section: "friends", audience: "friends", workspace: "between-you-two" }))}
                        aria-current={friendsBetweenYouTwoWorkspace ? "page" : undefined}
                      >
                        <span>Between you two</span>
                      </StudioButton>
                      <StudioButton
                        type="button"
                        title="Edit Friend View Copy for the personal transits shown as Active for the selected friend"
                        onClick={() => navigateAdminPage("skyWriteups", new URLSearchParams({ view: "transits-to-natal", audience: "friends" }))}
                        aria-current={friendsTransitAudience && activePage === "skyWriteups" && skyWriteupWorkspaceView === "transits-to-natal" ? "page" : undefined}
                      >
                        <span>Active for {"{{Name}}"}</span>
                      </StudioButton>
                      <StudioButton
                        type="button"
                        title="Edit the house-transit passages shown under Friends > Transits > Where it lands"
                        onClick={() => navigateAdminPage("skyWriteups", new URLSearchParams({ view: "house-transits", audience: "friends" }))}
                        aria-current={friendsTransitAudience && activePage === "skyWriteups" && skyWriteupWorkspaceView === "house-transits" ? "page" : undefined}
                      >
                        <span>House transit</span>
                      </StudioButton>
                    </div>
                  </>
                )}
              </Fragment>
            );
          })}
        </section>
        ))}
        <details
          className="admin-nav-advanced"
          open={operationsNavOpen ?? (isDesktopNav || advancedAdminNavItems.some((item) => item.page === activePage))}
          onToggle={(event) => setOperationsNavOpen(event.currentTarget.open)}
        >
          <AdminDisclosureSummary className="admin-eyebrow">Operations</AdminDisclosureSummary>
          <section className="admin-nav-section" aria-label="Operations and advanced tools">
            <StudioButton type="button" onClick={() => { window.location.href = "/admin/content/memory"; }}>
              <Orbit size={16} aria-hidden="true" />
              <span>Memory graph</span>
            </StudioButton>
            {advancedAdminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <StudioButton key={item.page} type="button" onClick={() => navigateAdminPage(item.page)} aria-current={activePage === item.page ? "page" : undefined}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                </StudioButton>
              );
            })}
          </section>
        </details>
      </nav>
      <section
        className={`admin-sidebar-status is-${inventoryLoading ? "pending" : loadState === "loaded" ? "ok" : loadState === "accessDenied" || loadState === "error" ? "error" : "pending"}`}
        aria-label="Admin status"
        title={`Fallback package ${hookCatalogPackageVersion}`}
      >
        <span className="admin-sidebar-status-dot" aria-hidden="true" />
        <span>
          {inventoryLoading
            ? `Loading… ${rows.length.toLocaleString()} rows`
            : loadState === "loaded"
              ? `Connected · ${rows.length.toLocaleString()} rows`
              : loadState === "accessDenied"
                ? "Access denied"
                : loadState === "error"
                  ? "Connection error"
                  : secret.trim()
                    ? "Access saved"
                    : "Not connected"}
        </span>
        <StudioButton type="button" className="admin-sidebar-status-link" onClick={() => navigateAdminPage("connection")}>Connection</StudioButton>
      </section>
    </aside>
  );

  return (
    <ContentLiveStatusProvider value={loadLiveStatus}>
    <main className="admin-dashboard" {...studioShellAttributes(studioTheme, studioPalette)}>
      {nav}
      <section className={`admin-main${isCreateMenuOpen ? " admin-create-menu-open" : ""}`}>
        {message && (
          <div
            className={loadState === "error" || loadState === "accessDenied" ? "admin-page-notice" : `admin-save-toast ${message.includes("Partial load:") || loadState === "idle" ? "is-warning" : ""}`}
            role={loadState === "error" || loadState === "accessDenied" ? "alert" : "status"}
          >
            <span>{message}</span>
            <StudioButton type="button" onClick={() => setMessage("")} aria-label="Dismiss notification">
              <X size={16} aria-hidden="true" />
            </StudioButton>
          </div>
        )}
        <AdminPageHeader
          breadcrumbs={currentPageBreadcrumbs.map((item, index) => ({
            key: `${item.label}-${index}`,
            label: item.label,
            current: !item.page,
            href: item.page ? adminHashForPage(item.page) : undefined,
            onSelect: item.page ? () => navigateAdminPage(item.page as AdminDashboardPage) : undefined
          }))}
          createActions={activePage === "variables" ? [{ key: "variable", label: "Create variable", description: "Name, write, and tag your own variable", icon: KeyRound, onSelect: () => { setVariableCreateRequest(value => value + 1); setIsCreateMenuOpen(false); } }] : [
            {
              key: "article",
              label: "Create article",
              description: "Author a reader-facing row",
              icon: FileText,
              onSelect: () => handleCreateAction("articles", "Create article opened in Articles.")
            },
            {
              key: "content",
              label: "Create content row",
              description: "Add a saved row to the library",
              icon: BookOpenText,
              onSelect: () => handleCreateAction("content", "Create content row opened.")
            },
            {
              key: "vocabulary",
              label: "Create reusable phrase",
              description: "Vocab namespace row",
              icon: Sparkles,
              onSelect: () => handleCreateAction("vocabulary", "Create reusable phrase opened in Vocabulary.")
            },
            {
              key: "template",
              label: "Create template",
              description: "Reusable reader-copy pattern",
              icon: KeyRound,
              onSelect: () => handleCreateAction("templates", "Create template opened.")
            },
            {
              key: "fallback",
              label: lunarWorkspaceActive ? "Create Calendar write-up" : "Create fallback hook",
              description: lunarWorkspaceActive ? "Choose a Moon sign and start a separate draft" : "Saved route fallback",
              icon: Flag,
              onSelect: () => handleCreateAction("knowledge", "Create fallback hook opened.")
            }
          ]}
          createDisabled={hasAccessIssue || hasLoadFailure || isInitialDashboardLoad}
          createMenuOpen={isCreateMenuOpen}
          description={currentPageDescription}
          onCloseCreateMenu={() => setIsCreateMenuOpen(false)}
          onToggleCreateMenu={() => setIsCreateMenuOpen((open) => !open)}
          title={currentPageTitle}
        />

        {hasAccessIssue && activePage !== "connection" && (
          <AdminAccessGate
            disabled={isLoading || !normalizeAdminSecret(secretInput)}
            onChange={setSecretInput}
            onSubmit={submitAdminSecret}
            value={secretInput}
          />
        )}
        {hasLoadFailure && renderLoadFailure()}

        {isInitialDashboardLoad && (
          <section className="admin-content-toolbar admin-review-queue-hero admin-initial-loading" aria-label="Loading saved content" aria-live="polite">
            <PageLoading message="Loading saved content…" />
          </section>
        )}

        {(activePage === "connection" || (!hasAccessIssue && !hasLoadFailure)) && (
        <div className="admin-loaded-workspace" hidden={isInitialDashboardLoad} aria-busy={loadState === "loading"}>

        {isCompositionPage(activePage) && !(activePage === "knowledge" && fallbackSectionFilter === "lunar-calendar") && (
          <nav className="admin-template-tabs admin-composition-tabs" aria-label="Composition workspace">
            {compositionTabs.map((item) => (
              <StudioButton key={item.page} type="button" className={activePage === item.page ? "active" : ""} aria-current={activePage === item.page ? "page" : undefined} onClick={() => navigateAdminPage(item.page)}>
                {item.label}
              </StudioButton>
            ))}
          </nav>
        )}

        {activePage === "variables" && <><Suspense fallback={<PageLoading message="Loading variables…" />}><StudioVariables secret={secret} customVariables={customVariableLibrary.variables} onCustomChange={customVariableLibrary.setVariables} customError={customVariableLibrary.error} customLoading={customVariableLibrary.loading} onReloadCustom={customVariableLibrary.reload} createRequest={variableCreateRequest} onCreateHandled={() => setVariableCreateRequest(0)} onOpenSource={(key, _label, field) => void openRow(rows.find(row => row.content_key === key) ?? { id: `package:${key}`, content_key: key, inventory_only: true } as AdminGeneratedContentRow, null, field)} /></Suspense>{renderEditor()}</>}

        {activePage === "reviewQueue" && (
          <section className="admin-template-page">
            <section className="admin-review-queue-commandbar" aria-label="Review queue progress">
              <div className="admin-review-queue-commandbar-copy">
                <p className="admin-eyebrow">Editorial workflow</p>
                <h2>Review, sign off, publish</h2>
                <p>Create writing, run checks, review, and publish. Source material has its own library.</p>
              </div>
              <div className="admin-new-actions">
                <StudioButton type="button" onClick={() => void loadDashboardData()} disabled={isLoading}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Refresh
                </StudioButton>
                <StudioButton type="button" onClick={() => void applyBulkStatus()} disabled={selectedSavedRows.length === 0 || isLoading}>
                  <Check size={16} aria-hidden="true" />
                  Apply bulk
                </StudioButton>
              </div>
            </section>
            <nav className="admin-sky-voice-tabs admin-review-view-tabs" aria-label="Review queue views">
              {([['ready', 'Ready for review'], ['changes', 'Needs changes'], ['sources', 'Source library']] as const).map(([view, label]) => (
                <StudioButton key={view} type="button" className={skyVoiceQueueView === view ? "active" : ""} onClick={() => setSkyVoiceQueueView(view)}>{label}</StudioButton>
              ))}
              <StudioButton type="button" className={skyVoiceQueueView === "all" ? "active" : ""} onClick={() => setSkyVoiceQueueView("all")}>
                All review
              </StudioButton>
              <StudioButton type="button" className={skyVoiceQueueView === "live-omissions" ? "active" : ""} onClick={() => setSkyVoiceQueueView("live-omissions")}>
                Live with omitted sections
                <strong>{visibleLiveOmittedSections.length}</strong>
              </StudioButton>
              <StudioButton type="button" className={skyVoiceQueueView === "composite" ? "active" : ""} onClick={() => setSkyVoiceQueueView("composite")}>
                Composite
                <strong>{filteredCompositeReviewRows.length}</strong>
              </StudioButton>
              <StudioButton type="button" className={skyVoiceQueueView === "upcoming" ? "active" : ""} onClick={() => { setSkyVoiceQueueView("upcoming"); if (!skyReviewHorizon) void loadSkyReviewHorizon(); }}>
                Missing writing / upcoming
                {skyReviewHorizon ? <strong>{skyReviewHorizon.counts.occurrences}</strong> : null}
              </StudioButton>
              <StudioButton type="button" className={skyVoiceQueueView === "needs-review" ? "active" : ""} onClick={() => setSkyVoiceQueueView("needs-review")}>
                Sky voice: needs review
                <strong>{skyVoiceNeedsReviewRows.length}</strong>
              </StudioButton>
              <StudioButton type="button" className={skyVoiceQueueView === "audit" ? "active" : ""} onClick={() => setSkyVoiceQueueView("audit")}>
                Sky voice: audit sample
                <strong>{skyVoiceAuditRows.length}</strong>
              </StudioButton>
            </nav>
            {(["ready", "changes", "sources", "all", "composite"].includes(skyVoiceQueueView)) && (
              <AdminFilterDisclosure summary="Status, class, tier, and search">
                <section className="admin-content-filters admin-review-queue-filters" aria-label="Review queue filters">
                  <div className="admin-review-filter-grid">
                    <label>
                      <span>Status</span>
                      <AdminSelect aria-label="Review status" value={reviewStatusFilter} onChange={(event) => setReviewStatusFilter(event.target.value as GeneratedContentStatus | "all")}>
                        <option value="all">All statuses</option>
                        {contentStatuses.map((status) => <option key={status} value={status}>{contentStatusLabel(status)}</option>)}
                      </AdminSelect>
                    </label>
                    <label>
                      <span>Evergreen</span>
                      <AdminSelect aria-label="Evergreen">
                        <option>All rows</option>
                        <option>Evergreen only</option>
                        <option>Hide evergreen</option>
                      </AdminSelect>
                    </label>
                    <label>
                      <span>Content class</span>
                      <AdminSelect aria-label="Review content class" value={contentClassFilter} onChange={(event) => setContentClassFilter(event.target.value as AdminContentClassFilter)}>
                        {contentClassFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
                      </AdminSelect>
                    </label>
                    <label>
                      <span>Tier</span>
                      <AdminSelect aria-label="Review tier" value={tierFilter} onChange={(event) => setTierFilter(event.target.value as AdminPhrasebankTierFilter)}>
                        {tierFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
                      </AdminSelect>
                    </label>
                    <label className="admin-review-queue-search">
                      <span>Search</span>
                      <div className="admin-search-input-shell">
                        <Search size={15} aria-hidden="true" />
                        <StudioInput aria-label="Search review queue" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Key, title, body, surface" />
                      </div>
                    </label>
                  </div>
                </section>
              </AdminFilterDisclosure>
            )}
            {(["ready", "changes", "sources", "all", "composite"].includes(skyVoiceQueueView)) && renderBulkBar()}
            {["ready", "changes", "sources", "all"].includes(skyVoiceQueueView) && renderReviewTable(workflowReviewRows)}
            {skyVoiceQueueView === "live-omissions" && renderLiveOmittedSectionsQueue()}
            {skyVoiceQueueView === "composite" && renderReviewTable(filteredCompositeReviewRows)}
            {skyVoiceQueueView === "upcoming" && renderSkyReviewHorizon()}
            {skyVoiceQueueView === "needs-review" && renderSkyVoiceQueue(skyVoiceNeedsReviewRows, "Cards held by the judge for a fast editorial decision.")}
            {skyVoiceQueueView === "audit" && renderSkyVoiceQueue(skyVoiceAuditRows, "Random auto-publish sample for periodic voice auditing. Refresh to draw another sample.")}
            {renderEditor()}
          </section>
        )}

        {activePage === "unresolvedContent" && (
          <Suspense fallback={null}>
            <UnresolvedContentReview
              credential={secret}
              contentLibraryReady={allRowsLoaded && loadState === "loaded"}
              editableRowsByContentKey={editableRowsByContentKey}
              onFindInContentLibrary={(contentKey) => {
                revealUnresolvedContentRow();
                guidedReviewOpenedRef.current = "";
                setGuidedReviewKey(contentKey);
                setQuery(contentKey);
                navigateAdminPage("content", new URLSearchParams({ q: contentKey, from: "unresolved" }));
              }}
            />
          </Suspense>
        )}

        {activePage === "content" && (
          <section className={`admin-template-page${!natalChartWorkspaceActive && !natalAspectWorkspaceActive && !calendarAspectWorkspaceActive ? " admin-library-workspace" : ""}`}>
            {!natalChartWorkspaceActive && !natalAspectWorkspaceActive && (
              <section className="admin-content-toolbar admin-content-library-toolbar" aria-label="Content controls">
                {calendarAspectWorkspaceActive ? <span className="admin-field-hint">{filteredRows.length} aspect cards</span> : <>
                <details className="admin-library-guide">
                  <AdminDisclosureSummary>{filteredRows.length} content rows · About this library</AdminDisclosureSummary>
                  <p>Browse articles, phrasebank copy, vocabulary, templates, fallback hooks, and source rows. The Status column shows whether readers can currently receive each copy.</p>
                </details>
<details className="admin-library-tools"><AdminDisclosureSummary>Library tools</AdminDisclosureSummary><div className="admin-new-actions" aria-label="Content admin shortcuts">
                <StudioButton type="button" onClick={() => navigateAdminPage("reviewQueue")}>
                  <Check size={16} aria-hidden="true" />
                  Review Queue
                </StudioButton>
                <StudioButton type="button" onClick={() => handleCreateAction("content", "New content row started.")}>
                  <Plus size={16} aria-hidden="true" />
                  New content row
                </StudioButton>
                <StudioButton type="button" onClick={() => navigateAdminPage("knowledge")}>
                  <FileText size={16} aria-hidden="true" />
                  Fallback hooks
                </StudioButton>
                <StudioButton type="button" onClick={exportEditedFallbackArchitectureRows}>
                  Export edited rows
                </StudioButton>
              </div></details>
                </>}
              </section>
            )}
            {natalChartWorkspaceActive
              ? (
                <>
                  {renderNatalPlacementSourceFinder()}
                  {renderEditor()}
                </>
              )
              : natalAspectWorkspaceActive
                ? (
                  <>
                    {renderNatalAspectSourceFinder()}
                    {renderEditor()}
                  </>
                )
              : (
                <>
                  {contentLibraryTransitShortcut && (
                    <section className="admin-reader-safety-panel" aria-label="Transit writing workspace shortcut">
                      <div>
                        <p className="admin-eyebrow">Assembled transit writing</p>
                        <h3>{contentLibraryTransitShortcut === "transits-to-natal" ? "Transit to Natal Charts" : "House Transits"}</h3>
                        <p>{contentLibraryTransitContact
                          ? `Open the ${transitNatalLabel(contentLibraryTransitContact)} write-up. The live Friends Active for {{Name}} card uses this three-part aspect unless a six-part situation is published.`
                          : "These reader cards are assembled from several reusable rows. Open the dedicated workspace to preview the complete card and edit every passage inside it."}</p>
                      </div>
                      <div className="admin-new-actions">
                        <StudioButton type="button" onClick={() => {
                          if (contentLibraryTransitShortcut === "transits-to-natal" && contentLibraryTransitContact) {
                            openTransitNatalContactFromSearch(contentLibraryTransitContact, friendsTransitAudience);
                            return;
                          }
                          navigateAdminPage("skyWriteups", new URLSearchParams({ view: contentLibraryTransitShortcut }));
                        }}>
                          {contentLibraryTransitContact
                            ? `Open ${transitNatalLabel(contentLibraryTransitContact)}`
                            : `Open ${contentLibraryTransitShortcut === "transits-to-natal" ? "Transit to Natal Charts" : "House Transits"}`}
                        </StudioButton>
                      </div>
                    </section>
                  )}
                  {renderContentFilters()}
                  <details className="admin-library-guide admin-status-guide" role="region" aria-label="Content status definitions">
                    <AdminDisclosureSummary>What readers can see</AdminDisclosureSummary>
                    <p><strong>Live</strong> means readers can currently receive this copy. <strong>Not live</strong> means readers cannot currently receive this copy.</p>
                  </details>
                  {renderBulkBar()}
                  <section className="admin-workbench admin-review-workspace">
                    {renderEditor()}
                    <aside className="admin-list-panel" aria-label="Generated content records">
                      {renderContentTable(filteredRows, false, true)}
                    </aside>
                  </section>
                </>
              )}
          </section>
        )}

        {activePage === "calendarWriteups" && (
          <section className="admin-template-page">
            <h2 className="sr-only">Calendar writing workspaces</h2>
            <StudioTabs label="Calendar Write-ups workspaces" value={calendarWriteupWorkspaceView}
              tabs={calendarWriteupWorkspaceTabs}
              onValueChange={view => navigateAdminPage("calendarWriteups", new URLSearchParams({ view }))}>
              <Suspense fallback={<PageLoading message="Loading Calendar template…" />}><SkyForecastTemplateStudio period={calendarWriteupWorkspaceView} rows={rows} busy={isLoading}
                loadRows={loadCalendarPreviewRows} draft={draft}
                onEditSource={row => void openCalendarWritingSource(row as AdminGeneratedContentRow)}
                onEditOverview={field => void openSkyForecastTemplate(calendarWriteupWorkspaceView, field)}
                onOpen={period => void openSkyForecastTemplate(period)} editor={calendarWriteupWorkspaceView === "daily-sky" ? null : renderEditor()} /></Suspense>
              {calendarWriteupWorkspaceView === "daily-sky" && (
                <Suspense fallback={<PageLoading message="Loading Moon-sign write-ups…" />}>
                  <LunarCalendarWorkspace rows={rows} query={query} onQuery={setQuery} createRequest={calendarCreateRequest}
                    onCreateRequestHandled={() => setCalendarCreateRequest(0)} isLoading={isLoading || loadState !== "loaded"}
                    editor={renderEditor()} onEdit={row => openRow(row as AdminGeneratedContentRow)}
                    onLoad={row => hydrateGeneratedContentRow(row as AdminGeneratedContentRow)}
                    onCreate={sign => handleCreateAction("knowledge", "Draft opened. Nothing has been saved yet.", sign)} />
                </Suspense>
              )}
            </StudioTabs>
          </section>
        )}

        {activePage === "skyWriteups" && (
          <section className="admin-template-page">
            <h2 className="sr-only">Sky writing workspaces</h2>
            <StudioTabs label="Sky Write-ups workspaces" value={skyWriteupWorkspaceView}
              tabs={skyWriteupWorkspaceTabs} onValueChange={view => {
                const params = new URLSearchParams();
                if (view !== "catalog") {
                  params.set("view", view);
                  if (friendsTransitAudience && (view === "transits-to-natal" || view === "house-transits")) params.set("audience", "friends");
                }
                navigateAdminPage("skyWriteups", params);
              }}>
            {skyWriteupWorkspaceView === "daily-summary" ? (
              <>
                <Suspense fallback={<PageLoading message="Loading Daily Sky Summary editor…" />}>
                  <SkyDailySummaryStudio rows={rows} onEdit={(field, initialBody) => void openSkySummaryField(field, initialBody)} busy={isLoading} />
                </Suspense>
                <Suspense fallback={<PageLoading message="Loading Without their tools editor…" />}>
                  <SkyDebilityStudio rows={rows} onEdit={(field, initialBody) => void openSkySummaryField(field, initialBody)} busy={isLoading} />
                </Suspense>
                {renderEditor()}
              </>
            ) : skyWriteupWorkspaceView === "transits-to-natal" ? (
              <>
                {renderTransitNatalSourceFinder()}
                {renderEditor()}
              </>
            ) : skyWriteupWorkspaceView === "house-transits" ? (
              <>
                {renderHouseTransitSourceFinder()}
                {renderEditor()}
              </>
            ) : (
              <>
                <section className="studio-section admin-content-filters admin-sky-filters" aria-label="Sky write-up filters">
                  <div className="admin-review-filter-grid admin-filter-form admin-filter-form--three">
                    <label>
                      <span>Planet or point</span>
                      <AdminSelect aria-label="Sky placement planet or point" value={skyPlacementBody} onChange={(event) => setSkyPlacementBody(event.target.value)}>
                        <option value="all">All planets and points</option>
                        {skyPlacementBodies.map((body) => <option key={body} value={body}>{titleFromKey(body)}</option>)}
                      </AdminSelect>
                    </label>
                    <label>
                      <span>Zodiac sign</span>
                      <AdminSelect aria-label="Sky placement zodiac sign" value={skyPlacementSign} onChange={(event) => setSkyPlacementSign(event.target.value)}>
                        <option value="all">All signs</option>
                        {skyPlacementSigns.map((sign) => <option key={sign} value={sign}>{titleFromKey(sign)}</option>)}
                      </AdminSelect>
                    </label>
                    <label>
                      <span>Motion</span>
                      <AdminSelect aria-label="Sky write-up motion" value={skyWriteupMotionFilter} onChange={(event) => setSkyWriteupMotionFilter(event.target.value as ContentMotionFilter)}>
                        {skyWriteupMotionFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
                      </AdminSelect>
                    </label>
                    <label className="admin-filter-search">
                      <span>Search by keyword</span>
                      <StudioInput
                        aria-label="Search Sky write-ups"
                        type="search"
                        value={skyWriteupQuery}
                        onChange={(event) => setSkyWriteupQuery(event.target.value)}
                        placeholder="Search write-ups"
                      />
                    </label>
                  </div>
                  <details className="admin-filter-options">
                    <AdminDisclosureSummary>More filters</AdminDisclosureSummary>
                    <div className="admin-review-filter-grid admin-filter-form admin-filter-form--three">
                      <label>
                        <span>Content group</span>
                        <AdminSelect
                          aria-label="Sky write-up type"
                          value={skyWriteupSubjectFilter}
                          onChange={(event) => setSkyWriteupSubjectFilter(event.target.value as AdminSkyWriteupSubjectFilter)}
                        >
                          {skyWriteupSubjectFilters.map((filter) => (
                            <option key={filter.key} value={filter.key}>{filter.label}</option>
                          ))}
                        </AdminSelect>
                      </label>
                      <label>
                        <span>Reader use</span>
                        <AdminSelect aria-label="Sky write-up reader use" value={skyWriteupDestinationFilter} onChange={(event) => setSkyWriteupDestinationFilter(event.target.value as ContentDestinationFilter)}>
                          {skyWriteupDestinationFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
                        </AdminSelect>
                      </label>
                      <label>
                        <span>Sort</span>
                        <AdminSelect aria-label="Sort Sky write-ups" value={skyWriteupSort} onChange={(event) => setSkyWriteupSort(event.target.value as ContentPlacementSort)}>
                          {skyWriteupSortOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                        </AdminSelect>
                      </label>
                    </div>
                  </details>
                  <div className="admin-filter-actions">
                    <p className="admin-filter-result-count" aria-live="polite">
                      {skyPlacementBody !== "all" && skyPlacementSign !== "all"
                        ? <>Composition sources below · <strong>{filteredSkyWriteupRows.length}</strong> matching library rows</>
                        : <><strong>{filteredSkyWriteupRows.length}</strong> of {skyWriteupRows.length} shown</>}
                    </p>
                    <StudioButton
                      type="button"
                      onClick={() => {
                        setSkyPlacementBody("all");
                        setSkyPlacementSign("all");
                        setSkyWriteupSubjectFilter("all");
                        setSkyWriteupMotionFilter("all");
                        setSkyWriteupDestinationFilter("all");
                        setSkyWriteupSort("updated-desc");
                        setSkyWriteupQuery("");
                      }}
                      disabled={
                        skyPlacementBody === "all" && skyPlacementSign === "all" && skyWriteupSubjectFilter === "all"
                        && skyWriteupMotionFilter === "all"
                        && skyWriteupDestinationFilter === "all"
                        && skyWriteupSort === "updated-desc"
                        && !skyWriteupQuery.trim()
                      }
                    >
                      Clear filters
                    </StudioButton>
                  </div>
                {(skyPlacementBody === "all" || skyPlacementSign === "all") && <p className="admin-natal-placement-prompt">Choose a planet and zodiac sign above to preview and edit its complete write-up.</p>}
                </section>
                {secret.trim() && !hasAccessIssue && skyPlacementBody !== "all" && skyPlacementSign !== "all" && (
                  <Suspense fallback={<PageLoading message="Loading Composition Map…" />}>
                    <SkyPlacementComposition onEditField={(row, path, selection) => openRow(row as AdminGeneratedContentRow, null, path, selection)} rows={compositionRows} selection={{ planet: skyPlacementBody, sign: skyPlacementSign, motion: skyWriteupMotionFilter }} onEditRow={row => void openRow(row as AdminGeneratedContentRow)} onLoadRow={row => hydrateGeneratedContentRow(row as AdminGeneratedContentRow)} />
                  </Suspense>
                )}
                {publishedButUnwiredSkyRows.length > 0 && (
                  <section className="admin-wiring-notice" aria-label="Published Sky write-ups not connected to the app">
                    <div>
                      <p className="admin-eyebrow">Not live</p>
                      <h3>{publishedButUnwiredSkyRows.length} approved write-ups have no reader call site</h3>
                      <p>These rows are reported separately from retired content. They are not safe-deletion candidates: publishing finished the editorial step, but the app integration was never completed.</p>
                    </div>
                    <code>{publishedButUnwiredSkyRows.slice(0, 3).map((row) => row.content_key).join(" · ")}</code>
                  </section>
                )}
                <section className="admin-workbench admin-review-workspace">
                  {renderEditor()}
                  <aside className="admin-list-panel" aria-label="Sky write-up rows">
                    {filteredSkyWriteupRows.length > 0
                      ? renderContentTable(filteredSkyWriteupRows, false, true)
                      : (
                        <p className="admin-empty">
                          {skyWriteupQuery.trim()
                            ? `No Sky write-ups match “${skyWriteupQuery.trim()}”. Try another keyword or clear the filters.`
                            : skyPlacementBody !== "all" && skyPlacementSign !== "all"
                              ? "Use the Composition Map above to edit the sources for this placement. There are no additional matching library rows."
                              : "No Sky write-ups match these filters. Try another filter or clear the filters."}
                        </p>
                      )}
                  </aside>
                </section>
              </>
            )}
            </StudioTabs>
          </section>
        )}

        {activePage === "articles" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar admin-collection-toolbar">
              <div>
                <span className="admin-field-hint">{filteredArticleRows.length} of {articleRows.length} articles</span>
              </div>
              <StudioButton type="button" onClick={() => handleCreateAction("articles", "New article draft started.")}>
                <Plus size={16} aria-hidden="true" />
                New Article
              </StudioButton>
            </section>
            {renderArticleFilters()}
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Article rows">
                {renderContentTable(filteredArticleRows, true)}
              </aside>
            </section>
          </section>
        )}

        {activePage === "astro101" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar admin-collection-toolbar">
              <div>
                <span className="admin-field-hint">{filteredAstro101Rows.length} of {astro101Rows.length} Astro 101 pages</span>
              </div>
              <div className="admin-new-actions" aria-label="Create Astro 101 pages">
                <StudioButton type="button" onClick={() => {
                  navigateAdminPage("astro101", undefined, { keepEditorOpen: true });
                  setSelectedRowId(null);
                  setDraft(createAstro101Draft("chapter"));
                  setMessage("New chapter draft started. It stays a draft until you write and publish it.");
                }}>
                  <Plus size={16} aria-hidden="true" />
                  New chapter
                </StudioButton>
                <StudioButton type="button" onClick={() => {
                  navigateAdminPage("astro101", undefined, { keepEditorOpen: true });
                  setSelectedRowId(null);
                  setDraft(createAstro101Draft("article"));
                  setMessage("New article draft started. It stays a draft until you write and publish it.");
                }}>
                  <Plus size={16} aria-hidden="true" />
                  New article
                </StudioButton>
              </div>
            </section>
            <AdminFilterBar
              label="Astro 101 filters"
              searchLabel="Search Astro 101"
              query={astro101Query}
              onQueryChange={setAstro101Query}
              placeholder="Search headline, key, or body"
              activeFilterCount={astro101Query.trim() ? 1 : 0}
              filters={<></>}
              actions={<></>}
            />
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Astro 101 rows">
                {renderContentTable(filteredAstro101Rows, true)}
              </aside>
            </section>
          </section>
        )}

        {activePage === "compatibility" && (
          <section className="admin-template-page">
            <section className="admin-content-toolbar admin-collection-toolbar">
              <div>
                <span className="admin-field-hint">{filteredCompatibilityRows.length} of {compatibilityRows.length} rows</span>
              </div>
              <div className="admin-new-actions" aria-label="Compatibility shortcuts">
                <StudioButton type="button" onClick={() => navigateAdminPage("knowledge", new URLSearchParams({ section: "friends", q: "pair-daily" }))}>
                  <Users size={16} aria-hidden="true" />
                  Daily between you two
                </StudioButton>
                <StudioButton type="button" onClick={() => handleCompatibilityCreateAction("content")}>
                  <Plus size={16} aria-hidden="true" />
                  Card copy
                </StudioButton>
                <StudioButton type="button" onClick={() => handleCompatibilityCreateAction("vocabulary")}>
                  <Sparkles size={16} aria-hidden="true" />
                  Phrase
                </StudioButton>
                <StudioButton type="button" onClick={() => handleCompatibilityCreateAction("fallback-hook")}>
                  <FileText size={16} aria-hidden="true" />
                  Fallback
                </StudioButton>
                <StudioButton type="button" onClick={() => handleCompatibilityCreateAction("template")}>
                  <KeyRound size={16} aria-hidden="true" />
                  Template
                </StudioButton>
              </div>
            </section>
            {renderCompatibilityFilters()}
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Compatibility rows">
                {filteredCompatibilityRows.length > 0
                  ? renderContentTable(filteredCompatibilityRows, false, false, true)
                  : (
                    <section className="admin-empty-state admin-compatibility-empty" aria-live="polite">
                      <strong>No Compatibility rows match this view</strong>
                      <p>
                        {compatibilityRows.length === 0
                          ? "No Compatibility records loaded. Retry the inventory or check the connection."
                          : `Current filters: ${compatibilitySections.find((section) => section.key === compatibilitySectionFilter)?.label ?? "All compatibility"}, ${compatibilityStatusFilter === "all" ? "all statuses" : contentStatusLabel(compatibilityStatusFilter)}, ${compatibilityPlanetFilter === "all" ? "all planets" : titleFromKey(compatibilityPlanetFilter)}${compatibilityQuery.trim() ? `, search “${compatibilityQuery.trim()}”` : ""}.`}
                      </p>
                      <div className="admin-toolbar-actions">
                        <StudioButton type="button" onClick={clearCompatibilityFilters}>
                          Clear Compatibility filters
                        </StudioButton>
                        {compatibilityRows.length === 0 && (
                          <StudioButton type="button" onClick={() => void loadDashboardData()} disabled={isLoading}>
                            <RefreshCw size={16} aria-hidden="true" />
                            Retry inventory
                          </StudioButton>
                        )}
                      </div>
                    </section>
                  )}
              </aside>
            </section>
          </section>
        )}

        {activePage === "knowledge" && fallbackSectionFilter !== "lunar-calendar" && (
          <section className="admin-template-page admin-fallback-library">
            <section className="studio-surface studio-section admin-fallback-library-controls" aria-label="Fallback library controls">
              {!friendsBetweenYouTwoWorkspace && (
              <header className="studio-section-header">
                <div>
                  <p className="admin-eyebrow">Reader fallback library</p>
                  <h2 className="sr-only">Fallback Articles &amp; Passages</h2>
                  <p>Find complete articles, house horoscopes, aspects, and supporting fallback rows by their reader-facing astrology title.</p>
                </div>
                <StudioButton type="button" onClick={() => navigateAdminPage("hooks")}>
                  <KeyRound size={16} aria-hidden="true" />
                  Open Surface Map
                </StudioButton>
              </header>
              )}
              {friendsBetweenYouTwoWorkspace && (
                <>
                  <h2 className="sr-only">Between you two</h2>
                  {renderFriendsTransitSectionFinder("between-you-two", "page", query, (value) => persistBetweenYouTwoRoute(value), "search")}
                  <Suspense fallback={<PageLoading compact message="Opening the Between you two composition…" />}>
                    <FriendsBetweenYouTwoComposition
                      query={query}
                      activationQuery={friendsActivationQuery}
                      secret={secret}
                      onQueryChange={(value) => persistBetweenYouTwoRoute(value)}
                      onActivationChange={(value) => persistBetweenYouTwoRoute(query, value)}
                      onOpenOpening={(contentKey) => {
                        void openContentKeyRow(contentKey, "Between you two opening", false, "body_they");
                      }}
                      onOpenSource={(sourceKey, label, field) => void openFromEditor(sourceKey, () => openContentKeyRow(sourceKey, label, false, field))}
                    />
                  </Suspense>
                  <section className="admin-editor-guidance admin-contextual-editor-guidance" aria-label="Open another Friends Transits editor">
                    <header className="studio-section-header">
                      <div>
                        <p className="admin-eyebrow">Friends Transits</p>
                        <p>Opening, What this activates, Active for {"{{Name}}"}, and Where it lands are different editors. Use these cards after you have read the compiled write-up.</p>
                      </div>
                      <StudioButton type="button" onClick={() => navigateAdminPage("hooks")}>
                        <KeyRound size={16} aria-hidden="true" />
                        Open Surface Map
                      </StudioButton>
                    </header>
                    {renderFriendsTransitSectionFinder("between-you-two", "page", friendsTransitCompositionQuery(query), (value) => persistBetweenYouTwoRoute(value), "destinations")}
                  </section>
                  <section className="admin-editor-guidance admin-contextual-editor-guidance" aria-label="Friends Transits Between you two context">
                    <p className="admin-eyebrow">Friends Transits · Between you two</p>
                    <strong>These passages feed the live “Between you two” transit cards.</strong>
                    <p>Exact aspect rows are preferred for the first matching card. Family and variant rows are shared fallback/rotation sources, so editing one of those can affect more than one friend pair.</p>
                  </section>
                </>
              )}
              {renderFallbackTabs()}
              {fallbackSectionFilter === "daily" && (
                <Suspense fallback={null}>
                  <DailyFallbackWorkspaceGuide onShowFamily={showDailyHookFamily} />
                </Suspense>
              )}
              <section className="admin-content-filters" aria-label="Fallback row controls">
                <div className="admin-fallback-library-filter-grid">
                  {!friendsBetweenYouTwoWorkspace && (
                  <label>
                    <span>Search fallback articles and passages</span>
                    <StudioInput aria-label="Search fallback articles and passages" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Planet, sign, aspect, house, or content key" />
                  </label>
                  )}
                  <label>
                    <span>Sort rows</span>
                    <AdminSelect aria-label="Sort fallback rows" value={fallbackRowSort} onChange={(event) => setFallbackRowSort(event.target.value as AdminFallbackRowSort)}>
                      {fallbackRowSortOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </AdminSelect>
                  </label>
                </div>
              </section>
            </section>
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Fallback hook rows and package sources">
                {filteredFallbackRows.length > 0 && (
                  fallbackRowSort === "type" || fallbackSectionFilter === "daily"
                    ? renderFallbackContentGroups(filteredFallbackRows)
                    : renderContentTable(filteredFallbackRows, false, true)
                )}
                {filteredHookCatalog.length > 0
                  && (Boolean(query.trim()) || fallbackSectionFilter === "friends")
                  && !(fallbackSectionFilter === "daily" && !query.includes("pair-daily")) && (
                  <Suspense fallback={<PageLoading message="Loading packaged source phrases…" />}>
                    <PackagedHookCatalogResults
                      items={filteredHookCatalog}
                      savedKeys={savedHookKeys}
                      resetKey={`hook-catalog:${fallbackSectionFilter}:${query}:${filteredHookCatalog.length}`}
                      onOpen={(item) => void openHookDraft(item as HookCatalogItem)}
                    />
                  </Suspense>
                )}
                {filteredFallbackRows.length === 0 && (filteredHookCatalog.length === 0 || (!query.trim() && fallbackSectionFilter !== "friends")) && <p className="admin-empty">No rows match these filters.</p>}
              </aside>
            </section>
          </section>
        )}

        {activePage === "hooks" && (
          <section className="admin-template-page">
            <section className="studio-section studio-surface" aria-label="Surface directory filters">
              <span className="admin-field-hint">{writingSurfaces.length} mapped surfaces</span>
              <label className="admin-field-wide">
                <span>Find a reader surface or content source</span>
                <StudioInput aria-label="Search reader surfaces" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sky aspect, weekly horoscope, calendar, synastry…" />
              </label>
              <div className="admin-status-pills" role="group" aria-label="Filter surfaces by area">
                {[
                  ["all", "All"],
                  ["sky", "Sky"],
                  ["you", "You"],
                  ["friends", "Friends"],
                  ["calendar", "Calendar"],
                  ["reports", "Reports"],
                  ["settings", "Settings"]
                ].map(([key, label]) => (
                  <StudioButton key={key} type="button" aria-pressed={surfaceAreaFilter === key} className={surfaceAreaFilter === key ? "active" : ""} onClick={() => navigateSurfaceMapFilters({ area: key as WritingSurfaceAreaFilter })}>
                    <span>{label}</span>
                  </StudioButton>
                ))}
              </div>
              <div className="admin-status-pills" role="group" aria-label="Filter surfaces by admin editability">
                {[
                  ["all", "All"],
                  ["complete", "Editable"],
                  ["partial", "Runtime gaps"],
                  ["missing", "Unmapped"]
                ].map(([key, label]) => (
                  <StudioButton key={key} type="button" aria-pressed={surfaceStatusFilter === key} className={surfaceStatusFilter === key ? "active" : ""} onClick={() => navigateSurfaceMapFilters({ status: key as WritingSurfaceStatusFilter })}>
                    <span>{label}</span>
                  </StudioButton>
                ))}
              </div>
            </section>
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
                    {access?.editability !== "editable" && <p className="admin-surface-warning"><strong>Still to wire:</strong> {item.nextAction}</p>}
                    <div className="admin-surface-actions" aria-label={`${item.surface} editing destinations`}>
                      {access?.routes.map((route) => (
                        <a key={`${item.id}-${route.hash}`} href={route.hash} className={route.purpose === "reader-copy" ? "admin-source-action admin-source-action-primary" : "admin-source-action"} title={route.note}>
                          {route.label}
                        </a>
                      ))}
                      {access?.cmsStarters?.map((starter) => (
                        <StudioButton
                          key={`${item.id}-${starter.contentKey}`}
                          type="button"
                          className="admin-source-action"
                          onClick={() => openCmsStarter(item, starter)}
                        >
                          <Plus size={15} aria-hidden="true" />
                          {starter.label}
                        </StudioButton>
                      ))}
                    </div>
                    <details className="admin-surface-sources">
                      <AdminDisclosureSummary>Content sources ({item.sources.length})</AdminDisclosureSummary>
                      <p>{item.currentRenderPath}</p>
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
              <AdminDisclosureSummary>Supporting fallback-hook catalog ({savedHookCatalogCount}/{hookCatalogItems.length} saved)</AdminDisclosureSummary>
              {renderFallbackTabs()}
              <section className="admin-fallback-row-list" aria-label="Hook catalog">
                {hookCatalogLoadState === "loading" && <PageLoading message="Loading hook catalog…" />}
                {hookCatalogLoadState === "error" && <div className="admin-empty-state" role="alert"><p>{hookCatalogError ?? "Could not load the hook catalog."}</p><StudioButton type="button" onClick={() => void refreshHookCatalog()}><RefreshCw size={15} aria-hidden="true" />Retry catalog</StudioButton></div>}
                {filteredHookCatalog.map((item) => {
                  const saved = savedHookKeys.has(item.key) || savedHookKeys.has(canonicalFallbackContentKey(item.key));
                  const itemKey = canonicalFallbackContentKey(item.key);
                  return (
                    <article key={`${item.type}-${item.key}`} className="admin-fallback-row" role="button" tabIndex={0} onClick={() => void openHookDraft(item)} onKeyDown={(event) => onCatalogKeyDown(event, item)}>
                      <div className="admin-fallback-row-main"><p className="admin-eyebrow">{item.section} / {item.type}</p><h3>{item.label}</h3><code>{itemKey}</code></div>
                      <div className="admin-fallback-row-actions"><span className={`ui-pill admin-status ${saved ? "status-live" : "status-draft"}`}>{saved ? "Saved row" : "Needs row"}</span><StudioButton type="button" onClick={(event) => { event.stopPropagation(); void openHookDraft(item); }}><Plus size={15} aria-hidden="true" />Author</StudioButton></div>
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
              <StudioButton type="button" onClick={() => navigateAdminPage("hooks", new URLSearchParams({ area: "sky" }))}><Flag size={16} aria-hidden="true" />Back to Sky surfaces</StudioButton>
            </section>
            <label className="admin-field-wide studio-surface">
              <span>Search by planet, point, aspect, phrase, or source key</span>
              <StudioInput aria-label="Search Sky aspect drafts" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sun trine Chiron" />
            </label>
            {sourceDraftLoadState === "loading" && <PageLoading message="Loading held source drafts…" />}
            {sourceDraftLoadState === "error" && (
              <div className="admin-empty-state" role="alert"><p>{sourceDraftError ?? "Could not load source drafts."}</p><StudioButton type="button" onClick={() => void refreshSourceDraftCatalog()}><RefreshCw size={15} aria-hidden="true" />Retry</StudioButton></div>
            )}
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Held Sky aspect source drafts">
                <div className="admin-content-table-scroll">
                  {filteredSourceDrafts.length > 0 ? (
                    <AdminDataTable label="Held Sky aspect source drafts" columns={["Passage", "Key", "Status", "Source", "Actions"]}>
                      {filteredSourceDrafts.map((item) => {
                        const saved = savedContentKeys.has(item.id) || savedContentKeys.has(item.canonicalId);
                        return (
                          <tr key={item.id} className="admin-fallback-row">
                            <td data-label="Passage">
                              <p className="admin-eyebrow">{item.bodyB} / {item.aspect} / {item.bodyA}</p>
                              <strong>{titleFromKey(item.bodyB)} {titleFromKey(item.aspect)} {titleFromKey(item.bodyA)}</strong>
                              <p>{item.body.split("\n")[0]}</p>
                            </td>
                            <td data-label="Key"><code>{item.id}</code></td>
                            <td data-label="Status">
                              <span className="admin-field-hint">{saved ? "Saved draft" : "Source only"}</span>
                              <span className="ui-pill admin-status status-draft">Not live</span>
                            </td>
                            <td data-label="Source"><small>{item.sourcePath}</small></td>
                            <td data-label="Actions">
                              <StudioButton type="button" onClick={() => openSourceDraft(item)}>{saved ? "Edit" : "Open draft"}</StudioButton>
                            </td>
                          </tr>
                        );
                      })}
                    </AdminDataTable>
                  ) : <p className="admin-empty">No held Sky aspect drafts match this search.</p>}
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
            <nav className="admin-category-nav" aria-label="Vocabulary categories">
              {vocabularySections.map(({ key, label }) => (
                <a
                  key={key}
                  href={adminHashForPage("vocabulary", vocabularyCategoryParams(key))}
                  aria-current={vocabularyCategory === key ? "page" : undefined}
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
            </nav>
            <label className="admin-field-wide studio-surface">
              <span>Search vocabulary</span>
              <StudioInput aria-label="Search vocabulary" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Namespace, phrase, key" />
            </label>
            <section className="admin-workbench admin-review-workspace">
              {renderEditor()}
              <aside className="admin-list-panel" aria-label="Vocabulary rows">
                {renderContentTable(filteredVocabularyRows)}
              </aside>
            </section>
          </section>
        )}

        {activePage === "compositionMap" && (
          <Suspense fallback={<PageLoading message="Loading Composition Map…" />}>
            <CompositionMapWorkspace
              onEditField={(row, path, selection) => openRow(row as AdminGeneratedContentRow, null, path, selection)}
              key={new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("surface") ?? "all"}
              initialSurfaceId={new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("surface") ?? undefined}
              rows={compositionRows}
              onLoadRow={(row) => hydrateGeneratedContentRow(row as AdminGeneratedContentRow)}
              onEditRow={(row, context) => openRow(row as AdminGeneratedContentRow, context ?? null)}
              onStartCmsRow={openCmsStarter}
              editor={renderEditor()}
            />
          </Suspense>
        )}

        {activePage === "templates" && (
          <section className="admin-template-page">
            <section className="admin-phrasebook-panel" aria-label="Reader copy template library">
              <div className="admin-section-heading-row">
                <div>
                  <p className="admin-eyebrow">Composition</p>
                  <h2>Reader copy templates</h2>
                  <p>Each row is a reusable pattern for one app destination. Its title shows where it is used.</p>
                </div>
                <span className="ui-pill admin-status">{templateRows.length} saved</span>
              </div>
            </section>
            <label className="admin-field-wide studio-surface">
              <span>Search templates</span>
              <StudioInput aria-label="Search templates" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Destination, template name, or key" />
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
            <section className="studio-section studio-surface" aria-label="Slot filters and source types">
              <div className="admin-status-pills">
                <StudioButton type="button" className="active"><span>Editable slot rows</span><strong>{slotEditableRows.length}</strong></StudioButton>
                <StudioButton type="button"><span>Needs rows</span><strong>{Math.max(0, hookCatalogItems.length - savedHookCatalogCount)}</strong></StudioButton>
              </div>
              <label className="admin-field-wide">
                <span>Search slot-backed rows</span>
                <StudioInput aria-label="Search slot-backed rows" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Slot, vocab, fallback, or template key" />
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
            </section>
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
              {compositeRows.length === 0 && <p className="admin-empty studio-surface">No composite rows with relationship-type sections are loaded yet.</p>}
              {renderEditor()}
              <AdminPaginatedCollection
                items={compositeRows}
                label="Composite Review"
                pageSize={compositeReviewPageSize}
                resetKey={`${compositeRows.length}:${compositeRows[0]?.id ?? ""}:${compositeRows.at(-1)?.id ?? ""}`}
              >
                {(visibleCompositeRows) => <>{visibleCompositeRows.map((row) => (
                <article className="admin-template-card" key={row.id}>
                  <div className="admin-section-heading-row">
                    <div>
                      <p className="admin-eyebrow">{contentStatusLabel(row.status)} / {tierForRow(row)}</p>
                      <h3>{rowTitle(row)}</h3>
                      <code>{row.content_key}</code>
                    </div>
                    <StudioButton type="button" onClick={() => openRow(row)}>Edit</StudioButton>
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
                ))}</>}
              </AdminPaginatedCollection>
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
              <StudioButton type="button" onClick={submitAdminSecret} disabled={isLoading || !normalizeAdminSecret(secretInput)}>
                <RefreshCw size={16} aria-hidden="true" />
                Check Access
              </StudioButton>
            </section>
            <label className="admin-field-wide studio-surface">
              <span>CONTENT_GENERATION_SECRET</span>
              <StudioInput
                type="password"
                value={secretInput}
                onChange={(event) => setSecretInput(event.target.value)}
                placeholder="Paste secret value or CONTENT_GENERATION_SECRET=value"
              />
            </label>
          </section>
        )}

        {activePage === "aspectPatternCoverage" && (
          <Suspense fallback={<PageLoading message="Loading aspect-pattern tools…" />}>
            <AspectPatternWriteups initialKind="natal" secret={secret} />
          </Suspense>
        )}

        {activePage === "aspectPatternActivationCoverage" && (
          <Suspense fallback={<PageLoading message="Loading aspect-pattern tools…" />}>
            <AspectPatternWriteups initialKind="activation" secret={secret} />
          </Suspense>
        )}

        {activePage === "aspectDiagnostics" && (
          <Suspense fallback={<PageLoading message="Loading aspect diagnostics…" />}>
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
              <AdminDataTable label="User content" columns={["Content", "User", "Subject", "Surface", "Status", "Updated"]} className="admin-user-content-table">

                  {userRows.map((row) => (
                    <tr key={row.id} className="admin-content-row">
                      <td className="admin-content-title-cell" data-label="Content">
                        <strong className="admin-content-row-title">{rowTitle(row)}</strong>
                        <code className="admin-content-row-key">{row.content_key}</code>
                      </td>
                      <td data-label="User"><code>{row.user_id}</code></td>
                      <td className="admin-content-location" data-label="Subject"><strong>{row.subject_type}</strong><small>{row.subject_id}</small></td>
                      <td className="admin-content-location" data-label="Surface"><strong>{row.surface}</strong><small>{row.mode}</small></td>
                      <td data-label="Status"><ContentLiveStatusBadge row={{ id: `user:${row.id}`, updated_at: row.updated_at }} /></td>
                      <td data-label="Updated">{row.updated_at?.slice(0, 10) ?? row.created_at?.slice(0, 10) ?? "Local"}</td>
                    </tr>
                  ))}

</AdminDataTable>
              {userRows.length === 0 && <p className="admin-empty">No user-generated rows are loaded.</p>}
            </div>
          </section>
        )}

        {activePage === "reportFulfillment" && (
          <Suspense fallback={<PageLoading message="Loading report fulfillment…" />}>
            <ReportFulfillmentAdminPanel secret={secret} />
          </Suspense>
        )}

        </div>
        )}

      </section>
    </main>
    </ContentLiveStatusProvider>
  );

  function updateNatalPlacementSelection(next: {
    planet?: NatalPlacementPlanet | "";
    sign?: NatalPlacementSign | "";
    house?: NatalPlacementHouse | "";
    motion?: NatalPlacementMotion;
  }) {
    if (!confirmNatalNavigation()) return;
    const planet = next.planet ?? natalPlacementPlanet;
    const sign = next.sign ?? natalPlacementSign;
    const house = next.house ?? natalPlacementHouse;
    const motion = next.motion ?? natalPlacementMotion;
    setNatalPlacementPlanet(planet);
    setNatalPlacementSign(sign);
    setNatalPlacementHouse(house);
    setNatalPlacementMotion(motion);

    const params = new URLSearchParams();
    params.set("category", "Natal Chart");
    if (query.trim()) params.set("q", query.trim());
    if (planet) params.set("planet", planet);
    if (sign) params.set("sign", sign);
    if (house) params.set("house", house);
    if (motion === "retrograde") params.set("motion", motion);
    setAdminHash(adminHashForPage("content", params), "replace");
  }

  function handleContentSearchChange(value: string) {
    setQuery(value);
    if (categoryFilter !== "Natal Chart") return;
    const selection = natalPlacementSelectionFromText(value);
    if (selection.planet || selection.sign || selection.house || selection.motion) {
      updateNatalPlacementSelection(selection);
    }
  }

  async function saveNatalSource(source: NatalEditableRow, edits: NatalSourceEdits, publish: boolean) {
    const row = rows.find((candidate) => candidate.id === source.id)
      ?? (source.id?.startsWith("package:") ? rows.find((candidate) => candidate.content_key === source.content_key && !candidate.id.startsWith("package:")) : undefined);
    if (!row || row.inventory_only) return false;
    let revised: AdminDraft = { ...draftFromRow(row), id: row.id.startsWith("package:") ? null : row.id, updatedAt: source.updated_at };
    for (const [field, value] of Object.entries(edits)) {
      revised = field === "body_you" || field === "body_they"
        ? setPackageSectionField(revised, field, value)
        : setPackageRecordField(revised, field, value);
    }
    const alreadySaved = Object.entries(edits).every(([field, value]) => draftEditablePackageRecord(draftFromRow(row))[field] === value)
      && draftHasPackageProposal(draftFromRow(row));
    const saved = alreadySaved ? row : await saveDraft(undefined, revised, undefined, false);
    if (!saved) return false;
    if (row.id.startsWith("package:")) setRows((current) => current.filter((candidate) => candidate.id !== row.id));
    return publish ? Boolean(await approvePackageRevision(saved, false)) : true;
  }

  function renderNatalPlacementSourceFinder() {
    if (categoryFilter !== "Natal Chart") return null;
    return (
      <Suspense fallback={<PageLoading message="Loading natal placement finder…" />}>
        <NatalPlacementSourceFinder
          house={natalPlacementHouse}
          isLoading={isLoading || natalSourcesLoading}
          motion={natalPlacementMotion}
          onCreateOverride={createNatalPlacementOverride}
          onSaveSource={saveNatalSource}
          onDirtyChange={(key, dirty) => {
            if (dirty) natalUnsavedSourcesRef.current.add(key);
            else natalUnsavedSourcesRef.current.delete(key);
          }}
          onOpenSource={(contentKey, label, previewTemplate) => void openContentKeyRow(contentKey, label, previewTemplate)}
          onOpenEmptyHouseCompositions={() => navigateAdminPage("compositionMap", new URLSearchParams({ surface: "natal-empty-house" }))}
          onSelectionChange={updateNatalPlacementSelection}
          planet={natalPlacementPlanet}
          rows={rows}
          secret={secret}
          sign={natalPlacementSign}
        />
      </Suspense>
    );
  }

  function updateNatalAspectSelection(next: Partial<NatalAspectSelection>) {
    const first = next.first ?? natalAspectFirst;
    const aspect = next.aspect ?? natalAspectName;
    const second = next.second ?? natalAspectSecond;
    setNatalAspectFirst(first);
    setNatalAspectName(aspect);
    setNatalAspectSecond(second);

    const params = new URLSearchParams({ category: "Natal Aspects" });
    if (first) params.set("first", first);
    if (aspect) params.set("aspect", aspect);
    if (second) params.set("second", second);
    setAdminHash(adminHashForPage("content", params), "replace");
  }

  function renderNatalAspectSourceFinder() {
    if (categoryFilter !== "Natal Aspects") return null;
    return (
      <Suspense fallback={<PageLoading message="Loading natal aspect finder…" />}>
        <NatalAspectSourceFinder
          aspect={natalAspectName}
          first={natalAspectFirst}
          isLoading={isLoading}
          onCreateSource={createNatalAspectSource}
          onOpenSource={(contentKey, label) => void openContentKeyRow(contentKey, label)}
          onSelectionChange={updateNatalAspectSelection}
          rows={rows}
          second={natalAspectSecond}
        />
      </Suspense>
    );
  }

  function skySourceForCandidates(candidateKeys: string[], audience: "you" | "friends" = friendsTransitAudience ? "friends" : "you") {
    for (const contentKey of candidateKeys) {
      const savedRow = rows.find((row) => row.content_key === contentKey);
      const savedReviewStatus = savedRow ? sourceSnapshotString(savedRow.source_snapshot, "review_status") : "";
      if (savedRow?.body && savedRow.status !== "ARCHIVED" && savedReviewStatus !== "deprecated") {
        const sections = objectRecord(savedRow.sections);
        const packageRecord = objectRecord(sections?.packageRecord);
        const audienceKey = audience === "friends" ? "body_they" : "body_you";
        const hasAudienceField = Boolean(
          (packageRecord && Object.prototype.hasOwnProperty.call(packageRecord, audienceKey))
          || (sections && Object.prototype.hasOwnProperty.call(sections, audienceKey))
        );
        const packageAudienceBody = packageRecord?.[audienceKey];
        const sectionAudienceBody = sections?.[audienceKey];
        const audienceBody = typeof packageAudienceBody === "string"
          ? packageAudienceBody.trim()
          : typeof sectionAudienceBody === "string"
            ? sectionAudienceBody.trim()
            : "";
        if (audienceBody && isReaderFacingCopy(audienceBody)) {
          return { contentKey, text: audienceBody, savedRow };
        }
        if (audience === "friends" && hasAudienceField) continue;
        return { contentKey, text: savedRow.body, savedRow };
      }
      const body = transitNatalSourceBodies.get(contentKey);
      if (body) return { contentKey, text: body, savedRow: null };
    }
    return null;
  }

  function renderSkyAssemblySource(source: {
    id: string;
    label: string;
    scope: string;
    candidateKeys: string[];
    optional?: boolean;
  }, readOnly = false) {
    const resolved = skySourceForCandidates(source.candidateKeys);
    const sourceReaderDestination = skyWriteupWorkspaceView === "transits-to-natal"
      ? friendsTransitAudience ? "Friends → Transits → Active for {{Name}}" : "You → Personal Transits"
      : friendsTransitAudience ? "Friends → Transits → Where it lands" : "You → House Transits";
    return (
      <article className="admin-natal-source-card" key={source.id}>
        <div className="admin-natal-source-card-copy">
          <div className="admin-natal-source-card-heading">
            <h4>{source.label}</h4>
            {resolved?.savedRow
              ? <ContentLiveStatusBadge row={resolved.savedRow} />
              : resolved
                ? <ContentLiveStatusBadge row={{ id: `package:${resolved.contentKey}` }} />
                : source.optional && <span className="ui-pill admin-status status-draft">Optional</span>}
          </div>
          <p>{source.scope}</p>
          <p className="admin-reader-destination-line"><strong>Where readers see this:</strong> {sourceReaderDestination}</p>
          <code>{resolved?.contentKey ?? source.candidateKeys.join(" → ")}</code>
          <blockquote className={!resolved ? "missing" : ""}>{resolved?.text ?? (source.optional ? "No optional passage is saved for this selection." : "No saved passage is available for this source path.")}</blockquote>
        </div>
        {!readOnly && <StudioButton
          type="button"
          onClick={() => resolved && void openSkySourceRow(resolved.contentKey, source.label)}
          disabled={!resolved || isLoading || houseTransitOpening}
        >
          {resolved ? "Edit source row" : source.optional ? "Optional row unavailable" : "Source row unavailable"}
        </StudioButton>}
      </article>
    );
  }

  function updateTransitNatalSelection(next: Partial<{
    planet: TransitNatalPlanet | "";
    sign: TransitNatalSign | "";
    transitHouse: TransitNatalHouse | "";
    aspect: TransitNatalAspect | "";
    natalPoint: TransitNatalPoint | "";
    natalHouse: TransitNatalHouse | "";
  }>) {
    const planet = next.planet ?? transitNatalPlanet;
    const sign = next.sign ?? transitNatalSign;
    const transitHouse = next.transitHouse ?? transitNatalTransitHouse;
    const aspect = next.aspect ?? transitNatalAspect;
    const natalPoint = next.natalPoint ?? transitNatalPoint;
    const natalHouse = next.natalHouse ?? transitNatalNatalHouse;

    setTransitNatalPlanet(planet);
    setTransitNatalSign(sign);
    setTransitNatalTransitHouse(transitHouse);
    setTransitNatalAspect(aspect);
    setTransitNatalPoint(natalPoint);
    setTransitNatalNatalHouse(natalHouse);
    setTransitNatalLiveServing(null);
    transitNatalSelectionRef.current = { planet, aspect, natalPoint, sign, transitHouse, natalHouse };

    const params = new URLSearchParams({ view: "transits-to-natal" });
    if (planet) params.set("transit", planet);
    if (sign) params.set("sign", sign);
    if (transitHouse) params.set("transitHouse", transitHouse);
    if (aspect) params.set("aspect", aspect);
    if (natalPoint) params.set("natal", natalPoint);
    if (natalHouse) params.set("natalHouse", natalHouse);
    if (friendsTransitAudience) params.set("audience", "friends");
    if (transitReadingContext.pass !== undefined) params.set("pass", String(transitReadingContext.pass));
    if (transitReadingContext.variant !== undefined) params.set("variant", String(transitReadingContext.variant));
    if (transitReadingContext.isRetrograde !== undefined) params.set("retrograde", String(transitReadingContext.isRetrograde));
    if (transitReadingContext.window) params.set("window", transitReadingContext.window);
    setAdminHash(adminHashForPage("skyWriteups", params), "replace");
    const contact = transitNatalContactFromFields(planet, aspect, natalPoint);
    if (draft && contact) {
      const nextSelection = {
        ...contact,
        ...(sign ? { sign } : {}),
        ...(transitHouse ? { transitHouse } : {}),
        ...(natalHouse ? { natalHouse } : {})
      };
      const nextKey = transitNatalExactContentKey(nextSelection);
      if (nextKey && nextKey !== draft.contentKey) void openExactTransitNatalSourceRef.current(nextSelection);
    }
  }

  async function openSkySourceRow(contentKey: string, label: string) {
    const savedRow = rows.find((row) => row.content_key === contentKey);
    if (savedRow) {
      openRow(savedRow);
      setMessage(`Opened ${label}.`);
      return;
    }

    const definition = fallbackHookDefinitions.find((candidate) => candidate.key === contentKey);
    const body = transitNatalSourceBodies.get(contentKey);
    if (!definition || !body) {
      setMessage(`${label} is not available as an editable Content Studio source (${contentKey}).`);
      return;
    }

    setSelectedRowId(null);
    setDraft(emptyDraftForHook({
      type: "fallback",
      key: contentKey,
      label,
      section: fallbackSectionForKey(contentKey, definition.surface),
      definition: {
        ...definition,
        copy: { ...definition.copy, body }
      }
    }));
    setMessage(`Opened ${label}. Saving creates the editable Content Studio row; it does not publish unreviewed wording.`);
  }

  function finderTransitNatalExactKey() {
    const current = transitNatalSelectionRef.current;
    const contact = transitNatalContactFromFields(current.planet, current.aspect, current.natalPoint);
    if (!contact) return null;
    return transitNatalExactContentKey({
      ...contact,
      ...(current.sign ? { sign: current.sign } : {}),
      ...(current.transitHouse ? { transitHouse: current.transitHouse } : {}),
      ...(current.natalHouse ? { natalHouse: current.natalHouse } : {})
    });
  }

  async function openPackagedTransitSource(source: Record<string, unknown>, contentKey: string, fieldPath?: string, options?: { skipUnsavedPrompt?: boolean }) {
    const requestId = sourceOpenRequestRef.current;
    const { transitNatalPackagedSourceDraft } = await import("./transitNatalPackagedSource");
    if (requestId !== sourceOpenRequestRef.current) return;
    // Family soft/hard and SHARE-served sibling keys must use openPackagedFallbackSource.
    if (finderTransitNatalExactKey() !== contentKey) return;
    const packagedDraft = transitNatalPackagedSourceDraft(source, contentKey);
    if (!options?.skipUnsavedPrompt && !confirmSkyEditorNavigation()) return;
    setSelectedRowId(null);
    setCompositionEditorContext(null);
    setDraft(packagedDraft);
    setMessage("Opened the complete packaged source as a draft. Saving does not publish changes.");
    scrollEditorToTop(fieldPath);
  }

  async function openPackagedFallbackSource(source: Record<string, unknown>, contentKey: string, label: string, fieldPath?: string) {
    const { transitNatalPackagedSourceDraft } = await import("./transitNatalPackagedSource");
    const packagedDraft = transitNatalPackagedSourceDraft(source, contentKey);
    if (!confirmSkyEditorNavigation()) return;
    setSelectedRowId(null);
    setCompositionEditorContext(null);
    setDraft(packagedDraft);
    setMessage(`Opened ${label} from the packaged source. Saving keeps a draft; it does not publish.`);
    scrollEditorToTop(fieldPath);
  }

  async function openExactTransitNatalSource(selection: TransitNatalContact & Partial<Pick<TransitNatalSelection, "sign" | "transitHouse" | "natalHouse">>) {
    const key = transitNatalExactContentKey(selection);
    if (!key) return;
    if (draft && draft.contentKey === key && (selectedRowId || draft.id || draft.body || draft.headline)) {
      return;
    }
    transitExactDismissedKeyRef.current = null;
    const requestId = ++sourceOpenRequestRef.current;
    setIsLoading(true);
    try {
      // Fetch before creating: a saved draft or publication must never be replaced by a blank starter.
      const payload = await adminJsonRequest<{ rows: AdminGeneratedContentRow[]; packageSource?: Record<string, unknown> | null }>(
        `/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(key)}&limit=1&includePackageSource=true`, secret);
      if (requestId !== sourceOpenRequestRef.current) return;
      if (finderTransitNatalExactKey() !== key) return;
      if (!Array.isArray(payload.rows) || payload.rows.some(candidate => candidate.content_key !== key)) throw new Error("The exact passage could not be verified.");
      const row = payload.rows.find(candidate => candidate.content_key === key);
      if (row) { await openRow(row); return; }
      if (payload.packageSource) {
        await openPackagedTransitSource(payload.packageSource, key, undefined, {
          skipUnsavedPrompt: Boolean(draft && draft.contentKey !== key)
        });
        return;
      }
      const parentKey = transitNatalContactContentKey(selection);
      const sharedKey = transitNatalSharedFallbackKey(selection);
      let starter = { body_you: "", body_they: "" };
      const starterKeys = [parentKey, sharedKey].filter((candidate, index, list): candidate is string => Boolean(candidate) && candidate !== key && list.indexOf(candidate) === index);
      for (const starterKey of starterKeys) {
        const starterPayload = await adminJsonRequest<{ rows: AdminGeneratedContentRow[]; packageSource?: Record<string, unknown> | null }>(
          `/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(starterKey)}&limit=1&includePackageSource=true`, secret);
        if (requestId !== sourceOpenRequestRef.current) return;
        if (finderTransitNatalExactKey() !== key) return;
        if (!Array.isArray(starterPayload.rows) || starterPayload.rows.some(candidate => candidate.content_key !== starterKey)) {
          throw new Error("The shared fallback passage could not be verified.");
        }
        const starterRow = starterPayload.rows.find(candidate => candidate.content_key === starterKey);
        const starterRecord = objectRecord(objectRecord(starterRow?.sections)?.packageRecord);
        const rowHasCopy = Boolean(
          typeof starterRecord?.body_you === "string" && starterRecord.body_you.trim()
          || typeof starterRecord?.body === "string" && starterRecord.body.trim()
        );
        starter = transitNatalStarterCopy(rowHasCopy && starterRecord ? starterRecord : starterPayload.packageSource);
        if (starter.body_you.trim() || starter.body_they.trim()) break;
      }
      if (!(draft && draft.contentKey !== key) && !confirmSkyEditorNavigation()) return;
      setSelectedRowId(null);
      setCompositionEditorContext(null);
      const nextDraft = transitNatalExactSourceDraft(selection, starter);
      rememberSavedDraft(nextDraft);
      setMessage(key.split("/").length === 8
        ? (starter.body_you.trim()
          ? "You and Friend below start from existing aspect writing. Save keeps a draft for this six-part situation only. Approve & publish makes it live; the three-part aspect write-up stays unchanged."
          : "No write-up is saved for this six-part situation yet. You and Friend below are for this sign and houses only. Save keeps a draft. Approve & publish makes it live; the three-part aspect write-up stays unchanged.")
        : (starter.body_you.trim()
        ? "You and Friend below start from the shared fallback currently in the preview. Save keeps a draft for this aspect only. Approve & publish makes it live; the shared source stays unchanged."
        : "No write-up is saved for this contact yet. You and Friend below are for this aspect only. Save keeps a draft. Approve & publish makes it live; shared fallback writing stays unchanged."));
      scrollEditorToTop();
    } catch (error) {
      if (requestId !== sourceOpenRequestRef.current) return;
      setMessage(error instanceof Error ? error.message : "Could not open the exact transit passage.");
    } finally { if (requestId === sourceOpenRequestRef.current) setIsLoading(false); }
  }

  function updateTransitReadingContext(next: Partial<import("./transitNatalSources").TransitNatalReadingContext>) {
    const context = { ...transitReadingContext, ...next };
    setTransitReadingContext(context);
    const params = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    for (const [field, param] of [["pass", "pass"], ["variant", "variant"], ["isRetrograde", "retrograde"], ["window", "window"]] as const) {
      if (context[field] === undefined) params.delete(param); else params.set(param, String(context[field]));
    }
    setAdminHash(adminHashForPage("skyWriteups", params), "replace");
  }

  function renderTransitNatalSourceFinder() {
    const contact = transitNatalContactFromFields(transitNatalPlanet, transitNatalAspect, transitNatalPoint);
    const contactReady = Boolean(contact);
    const exactSelection = contact ? {
      ...contact,
      ...(transitNatalSign ? { sign: transitNatalSign } : {}),
      ...(transitNatalTransitHouse ? { transitHouse: transitNatalTransitHouse } : {}),
      ...(transitNatalNatalHouse ? { natalHouse: transitNatalNatalHouse } : {})
    } : null;
    const exactKey = exactSelection ? transitNatalExactContentKey(exactSelection) : null;
    const liveSourceKey = transitNatalLiveServing?.contentKey ?? (contact ? transitNatalSharedFallbackKey(contact) : null);
    const liveSourceField = transitNatalLiveServing?.field ?? (friendsTransitAudience ? "body_they" : "body_you");
    const previewReady = Boolean(contactReady);
    const selection = previewReady && contact ? {
      ...transitReadingContext,
      ...contact,
      sign: transitNatalSign as TransitNatalSign,
      transitHouse: transitNatalTransitHouse,
      natalHouse: transitNatalNatalHouse
    } : null;

    return (
      <section className="admin-natal-placement-finder admin-transit-finder" aria-label="Personal Transits source finder">
        <div className="admin-natal-placement-finder-heading">
          <div>
            <p className="admin-eyebrow">{friendsTransitAudience ? "Friends Transits · Active for {{Name}}" : "Personal Transits workspace"}</p>
            <h3>{contact ? transitNatalLabel(contact) : "Find a Personal Transit write-up"}</h3>
            <p>{friendsTransitAudience
              ? "This is the editor for Friends > Transits > Active for {{Name}}. Choose transiting planet, aspect, and natal planet or chart point. Fill current sign and both houses to save a six-part situation. Leave 4-6 blank to save the three-part aspect only."
              : "Choose transiting planet, aspect, and natal planet or chart point, including Ascendant and Midheaven. Fill current sign and both houses to save a six-part situation. Leave 4-6 blank to save the three-part aspect only. Shared fallback writing is a separate advanced edit."}</p>
            <p><strong>Editable lifecycle:</strong> Save creates or updates a passage. Archive removes it from active use; Restore reopens it as a draft.</p>
          </div>
        </div>

        {friendsTransitAudience && renderFriendsTransitSectionFinder("active-for-name", "embedded", transitNatalQuery, (value) => {
          setTransitNatalQuery(value);
          const hit = transitNatalSearchSelection(value);
          if (!hit) return;
          updateTransitNatalSelection({
            planet: hit.planet,
            aspect: hit.aspect,
            natalPoint: hit.natalPoint,
            sign: "",
            transitHouse: "",
            natalHouse: ""
          });
        })}
        {friendsTransitAudience && (
          <Suspense fallback={<PageLoading compact message="Opening the Between you two composition…" />}>
            <FriendsBetweenYouTwoComposition
              query={transitNatalQuery}
              activationQuery={friendsActivationQuery}
              secret={secret}
              onQueryChange={(value) => {
                setTransitNatalQuery(value);
                const hit = transitNatalSearchSelection(value);
                if (!hit) return;
                updateTransitNatalSelection({
                  planet: hit.planet,
                  aspect: hit.aspect,
                  natalPoint: hit.natalPoint,
                  sign: "",
                  transitHouse: "",
                  natalHouse: ""
                });
              }}
              onActivationChange={setFriendsActivationQuery}
              onOpenOpening={(contentKey) => {
                const params = new URLSearchParams({ section: "friends", audience: "friends", workspace: "between-you-two" });
                if (transitNatalQuery.trim()) params.set("q", transitNatalQuery.trim());
                navigateAdminPage("knowledge", params, { keepEditorOpen: true });
                void openContentKeyRow(contentKey, "Between you two opening", false, "body_they");
              }}
              onOpenSource={(sourceKey, label, field) => void openFromEditor(sourceKey, () => openContentKeyRow(sourceKey, label, false, field))}
            />
          </Suspense>
        )}

        {!friendsTransitAudience && (
        <label className="admin-title-field">
          <span>Search this transit</span>
          <StudioInput
            aria-label="Search this transit"
            value={transitNatalQuery}
            onChange={(event) => {
              const value = event.target.value;
              setTransitNatalQuery(value);
              const hit = transitNatalSearchSelection(value);
              if (!hit) return;
              updateTransitNatalSelection({
                planet: hit.planet,
                aspect: hit.aspect,
                natalPoint: hit.natalPoint,
                sign: "",
                transitHouse: "",
                natalHouse: ""
              });
            }}
            placeholder="Mars conjunct Moon"
          />
          <small className="admin-field-hint">Type the reader title, such as Mars conjunct Moon. This selects the three-part aspect. The live Friends card may use a published family write-up until an exact conjunction row is saved.</small>
        </label>
        )}

        <div className="admin-natal-placement-selectors admin-filter-form admin-filter-form--three">
          <label>
            <span>1. Transiting planet</span>
            <AdminSelect aria-label="Transiting planet" value={transitNatalPlanet} onChange={(event) => updateTransitNatalSelection({ planet: event.target.value as TransitNatalPlanet | "" })}>
              <option value="">Choose transiting planet</option>
              {transitNatalPlanets.map((planet) => <option value={planet} key={planet}>{titleFromKey(planet)}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>2. Aspect</span>
            <AdminSelect aria-label="Transit to natal aspect" value={transitNatalAspect} onChange={(event) => updateTransitNatalSelection({ aspect: event.target.value as TransitNatalAspect | "" })}>
              <option value="">Choose aspect</option>
              {transitNatalAspects.map((aspect) => <option value={aspect} key={aspect}>{titleFromKey(aspect)}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>3. Natal planet or point</span>
            <AdminSelect aria-label="Natal planet or point" value={transitNatalPoint} onChange={(event) => updateTransitNatalSelection({ natalPoint: event.target.value as TransitNatalPoint | "" })}>
              <option value="">Choose natal planet or point</option>
              {transitNatalPointSelectOptions()}
            </AdminSelect>
          </label>
          <label>
            <span>4. Current sign</span>
            <AdminSelect aria-label="Transit zodiac sign" value={transitNatalSign} onChange={(event) => updateTransitNatalSelection({ sign: event.target.value as TransitNatalSign | "" })}>
              <option value="">Leave blank to omit from this draft</option>
              {transitNatalSigns.map((sign) => <option value={sign} key={sign}>{titleFromKey(sign)}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>5. Transit house</span>
            <AdminSelect aria-label="Transit house" value={transitNatalTransitHouse} onChange={(event) => updateTransitNatalSelection({ transitHouse: event.target.value as TransitNatalHouse | "" })}>
              <option value="">Leave blank to omit from this draft</option>
              {transitNatalHouses.map((house) => <option value={house} key={house}>{house}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>6. Natal house</span>
            <AdminSelect aria-label="Natal point house" value={transitNatalNatalHouse} onChange={(event) => updateTransitNatalSelection({ natalHouse: event.target.value as TransitNatalHouse | "" })}>
              <option value="">Leave blank to omit from this draft</option>
              {transitNatalHouses.map((house) => <option value={house} key={house}>{house}</option>)}
            </AdminSelect>
          </label>
        </div>

        {liveSourceKey && contact && (
          <section className="admin-natal-source-card" aria-label="Live reader write-up">
            <header className="admin-natal-source-card-heading">
              <div>
                <p className="admin-eyebrow">Live reader write-up</p>
                <strong>{transitNatalLabel(contact)}</strong>
              </div>
            </header>
            <p>
              {exactKey && exactKey.split("/").length === 8
                ? "The published Friends card still uses this source. Edit live opens that packaged source. The six-part editor is a separate save and does not overwrite it."
                : "The current Friends Active for {{Name}} card uses this published source. Edit live opens that packaged source. Saving it does not change the three-part or six-part write-up below."}
            </p>
            <p><code>{liveSourceKey}</code></p>
            <StudioButton
              type="button"
              onClick={() => void openContentKeyRow(
                liveSourceKey,
                `Live ${transitNatalLabel(contact)}`,
                false,
                liveSourceField
              )}
            >
              Edit live {transitNatalLabel(contact)}
            </StudioButton>
          </section>
        )}
        {exactKey && exactKey.split("/").length === 8 && contact && (
          <p>
            <StudioButton type="button" onClick={() => updateTransitNatalSelection({ sign: "", transitHouse: "", natalHouse: "" })}>
              Open three-part {transitNatalLabel(contact)}
            </StudioButton>
          </p>
        )}
        {exactKey && <p className="admin-natal-placement-prompt" role="status">
          <strong>{exactKey.split("/").length === 8 ? "Write-up destination: six-part situation." : "Write-up destination: three-part aspect."}</strong>
          {" "}
          <code>{exactKey}</code>
          {exactKey.split("/").length === 8
            ? " Fields 1-6 are locked into this save. Clear current sign or a house to write the three-part aspect instead."
            : " Set current sign and both houses to write the six-part situation for this contact."}
        </p>}

        {exactKey && exactSelection && contact && <Suspense fallback={<PageLoading compact message="Opening this transit…" />}><TransitNatalExactSourceAction
          contentKey={exactKey}
          title={transitNatalLabel(contact)}
          transiting={contact.planet}
          natal={contact.natalPoint}
          aspect={contact.aspect}
          sign={transitNatalSign}
          transitHouse={transitNatalTransitHouse}
          natalHouse={transitNatalNatalHouse}
          secret={secret}
          disabled={isLoading}
          onOpen={() => void openExactTransitNatalSource(exactSelection)}
          onUseYou={(text) => {
            pendingExactAiCopyRef.current = { key: exactKey, ...(pendingExactAiCopyRef.current?.key === exactKey ? pendingExactAiCopyRef.current : {}), you: text };
            void openExactTransitNatalSource(exactSelection);
          }}
          onUseFriend={(text) => {
            pendingExactAiCopyRef.current = { key: exactKey, ...(pendingExactAiCopyRef.current?.key === exactKey ? pendingExactAiCopyRef.current : {}), friend: text };
            void openExactTransitNatalSource(exactSelection);
          }}
          onOpenNext={(next) => updateTransitNatalSelection({
            planet: next.transiting as TransitNatalPlanet,
            aspect: next.aspect as TransitNatalAspect,
            natalPoint: next.natal as TransitNatalPoint
          })}
        /></Suspense>}

        <Suspense fallback={null}><TransitNatalPreviewOptions context={transitReadingContext} onChange={updateTransitReadingContext} /></Suspense>

        {!contactReady && <p className="admin-natal-placement-prompt">Choose transiting planet, aspect, and natal planet or chart point to open this transit's You and Friend write-up.</p>}
        {selection && contact && <Suspense fallback={<PageLoading message="Loading reader preview…" />}><TransitNatalReaderPreview secret={secret} selection={selection} voice={friendsTransitAudience ? "{{Name}}" : "you"} onOpenExact={() => void openExactTransitNatalSource(exactSelection ?? contact)} onOpenSource={(key, label, field) => void openContentKeyRow(key, label, key.startsWith("fallback-template/"), field)} onServingPreview={setTransitNatalLiveServing} /></Suspense>}
        {contactReady && <p className="admin-field-hint">{exactKey && exactKey.split("/").length === 8
          ? "The reader preview uses eligible published writing, not saved drafts. After you save and publish this six-part situation, matching readings can use it. Shared source edits still affect every reading that uses them."
          : "The reader preview uses eligible published writing, not saved drafts. Aspect-specific passages keep separate contacts independent. Shared source edits affect every reading that uses them. Signs and houses stay in the preview until you fill all six finder fields, which switches the save destination to the six-part situation."}</p>}

      </section>
    );
  }

  function updateHouseTransitSelection(next: Partial<{
    planet: TransitNatalPlanet | "";
    sign: TransitNatalSign | "";
    house: TransitNatalHouse | "";
    motion: HouseTransitMotion;
  }>) {
    if (!closeEditor()) return;
    const planet = next.planet ?? houseTransitPlanet;
    const sign = next.sign ?? houseTransitSign;
    const house = next.house ?? houseTransitHouse;
    const motion = next.motion ?? houseTransitMotion;

    setHouseTransitPlanet(planet);
    setHouseTransitSign(sign);
    setHouseTransitHouse(house);
    setHouseTransitMotion(motion);

    const params = new URLSearchParams({ view: "house-transits", motion });
    if (planet) params.set("transit", planet);
    if (sign) params.set("sign", sign);
    if (house) params.set("transitHouse", house);
    if (friendsTransitAudience) params.set("audience", "friends");
    setAdminHash(adminHashForPage("skyWriteups", params), "replace");
  }

  async function openHouseTransitWriteup(selection: HouseTransitSelection, sources: HouseTransitSource[]) {
    if (!closeEditor()) return;
    const originatingHash = window.location.hash;
    const editorSession = editorSessionRef.current;
    const requestId = ++houseTransitOpenRequest.current;
    setHouseTransitOpening(true);
    setMessage("Loading complete House Transit write-up…");
    try {
      // Read full documents afresh. Inventory bodies and composed previews are not editable originals.
      const loaded = await Promise.all(sources.map(async source => {
        const key = source.candidateKeys[0];
        const payload = await adminJsonRequest<{ rows: AdminGeneratedContentRow[]; packageSource?: Record<string, unknown> | null }>(
          `/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(key)}&limit=1&includePackageSource=true`, secret);
        if (!Array.isArray(payload.rows) || payload.rows.some(row => row.content_key !== key || row.inventory_only)) {
          throw new Error(`Could not load the complete source for ${source.label}.`);
        }
        let row = payload.rows[0];
        if (row?.status === "ARCHIVED" && row.review_state === "published-revision") {
          row = await hydrateGeneratedContentRow(row, true, true);
        }
        let sourceDraft: AdminDraft;
        if (row) {
          sourceDraft = draftFromRow(row);
        } else if (payload.packageSource) {
          const { transitNatalPackagedSourceDraft } = await import("./transitNatalPackagedSource");
          sourceDraft = transitNatalPackagedSourceDraft(payload.packageSource, key);
        } else {
          const record = { contentKey: key, content_role: source.id === "retrograde" ? "fallback_hook" : "full_copy",
            surface: "you|friends", body_you: "", body_they: "", review_status: "needs_review" };
          sourceDraft = { id: null, contentKey: key, headline: source.label, summary: "", body: "", surface: "you", mode: "in_depth",
            status: "DRAFT", lane: "reference", reviewState: "needs-review", blockType: "fallback_hook", promptVersion: "manual-admin",
            reviewerNotes: "", sections: { packageRecord: record }, facts: { fallbackArchitectureV3: true, review_status: "needs_review" },
            sourceSnapshot: { contentType: key.startsWith("authored/") ? "authored-content" : "fallback-system", contentSystem: "fallback",
              content_role: record.content_role, review_status: "needs_review", sourcePackage: "tldrastro-fallback-architecture-v3" } };
        }
        const fields = houseTransitEditableFields(sourceDraft, source.id, row?.body);
        return { row, draft: sourceDraft, kind: source.id, source: { key, label: source.label, scope: source.scope, optional: source.optional, ...fields,
          ...(source.id === "legacy" ? { friendsUnavailable: "This older passage is used only in You. Friends uses the sign-specific composition when available." } : {}) } };
      }));
      if (requestId !== houseTransitOpenRequest.current || originatingHash !== window.location.hash || editorSession !== editorSessionRef.current) return;
      houseTransitEditorDrafts.current = new Map(loaded.map(item => [item.source.key, item]));
      setRows(current => mergeContentInventory(current, loaded.flatMap(item => item.row ? [item.row] : [])));
      setSelectedRowId(null);
      setDraft(null);
      setDailyGlancePairSelector(null);
      setCompositionEditorContext(null);
      setHouseTransitEditor({ title: houseTransitLabel(selection), audience: friendsTransitAudience ? "friends" : "you", sources: loaded.map(item => item.source) });
      setMessage("");
    } catch (error) {
      if (requestId === houseTransitOpenRequest.current && originatingHash === window.location.hash) setMessage(dashboardErrorMessage(error));
    } finally {
      if (requestId === houseTransitOpenRequest.current) setHouseTransitOpening(false);
    }
  }

  function houseTransitEditableFields(sourceDraft: AdminDraft, kind: HouseTransitSource["id"], rawBody?: string | null) {
    const record = effectivePackageRecord(sourceDraft.sections);
    return { body_you: kind !== "legacy" && typeof record.body_you === "string" ? record.body_you
      : typeof record.body === "string" ? record.body : typeof record.body_they === "string" ? "" : rawBody ?? "",
      body_they: kind === "legacy" ? "" : typeof record.body_they === "string" ? record.body_they
        : ["house-core", "sign-synthesis"].includes(kind) && typeof record.body === "string" ? record.body : "" };
  }

  async function saveHouseTransitPassage(key: string, edits: { body_you: string; body_they: string }) {
    const captured = houseTransitEditorDrafts.current.get(key);
    if (!captured) throw new Error("This write-up editor is no longer open. Reopen it before saving.");
    const baseline = captured.draft;
    if (baseline.id && !baseline.updatedAt) throw new Error("The saved source version is missing. Reopen the write-up before saving.");
    let revised = baseline;
    if (edits.body_you !== captured.source.body_you) revised = setPackageSectionField(revised, captured.kind === "legacy" ? "body" : "body_you", edits.body_you);
    if (captured.kind !== "legacy" && edits.body_they !== captured.source.body_they) revised = setPackageSectionField(revised, "body_they", edits.body_they);
    const acknowledge = (saved: AdminGeneratedContentRow | null) => {
      if (!saved || saved.content_key !== key || saved.inventory_only || !saved.updated_at
        || (baseline.id && (saved.id !== baseline.id || saved.updated_at === baseline.updatedAt))) return false;
      const savedDraft = draftFromRow(saved);
      const fields = houseTransitEditableFields(savedDraft, captured.kind, saved.body);
      if (fields.body_you !== edits.body_you || fields.body_they !== edits.body_they) return false;
      houseTransitEditorDrafts.current.set(key, { ...captured, draft: savedDraft, source: { ...captured.source, ...fields } });
      return true;
    };
    try {
      const saved = await saveDraft(undefined, revised, undefined, false, false, true);
      if (!acknowledge(saved)) throw new Error("The save response did not confirm the complete passage. Your edits are still here; reopen the saved source to check it.");
    } catch (error) {
      // An uncertain response may follow a committed write. A reread can acknowledge
      // identical text, but never graft a newer version onto conflicting local edits.
      if (error instanceof AdminRequestError && [408, 504].includes(error.status)) {
        const payload = await adminJsonRequest<{ rows: AdminGeneratedContentRow[] }>(
          `/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(key)}&limit=1`, secret);
        const saved = payload.rows?.find(row => row.content_key === key) ?? null;
        if (acknowledge(saved)) {
          setRows(current => mergeContentInventory(current, [saved!]));
          return;
        }
      }
      throw new Error(dashboardErrorMessage(error));
    }
  }

  function renderHouseTransitSourceFinder() {
    const selectionComplete = Boolean(houseTransitPlanet && houseTransitSign && houseTransitHouse);
    const selection = selectionComplete ? {
      planet: houseTransitPlanet,
      sign: houseTransitSign,
      house: houseTransitHouse,
      motion: houseTransitMotion
    } as HouseTransitSelection : null;
    const sourcesReady = loadState === "loaded" && allRowsLoaded;
    const groups = selection && sourcesReady ? houseTransitSourceGroups(selection) : [];
    const preview = selection && sourcesReady ? renderHouseTransitPreview(selection, (candidateKeys) => {
      const source = skySourceForCandidates(candidateKeys);
      return source ? { key: source.contentKey, text: source.text } : null;
    }) : null;
    const compositionGroup = groups.find((group) => group.key === "composition");
    const alternateGroup = groups.find((group) => group.key === "alternate");
    const legacySource = alternateGroup?.sources.find((source) => source.id === "legacy");
    const servingLegacy = Boolean(legacySource && preview?.sourceKeys.some((key) => legacySource.candidateKeys.includes(key)));
    const visibleCompositionSources = servingLegacy && legacySource ? [legacySource] : compositionGroup?.sources ?? [];
    const advancedSources = alternateGroup?.sources.filter((source) => !servingLegacy || source.id !== "legacy") ?? [];

    return (
      <section className="admin-natal-placement-finder admin-transit-finder" aria-label="House Transits source finder">
        <div className="admin-natal-placement-finder-heading">
          <div>
            <p className="admin-eyebrow">{friendsTransitAudience ? "Friends Transits · Where it lands" : "House Transits workspace"}</p>
            <h3>{selection ? houseTransitLabel(selection) : "Find a House Transit write-up"}</h3>
            <p>{friendsTransitAudience
              ? "This is the editor for Friends > Transits > Where it lands. The preview prefers Friends copy for the evergreen house passage, current-sign passage, and retrograde overlay when those sources have separate audience versions."
              : "Choose a planet, sign, and house to preview the complete House Transit and edit its passages."}</p>
            <p><strong>Editable lifecycle:</strong> Save creates or updates a passage. Archive removes it from active use; Restore reopens it as a draft.</p>
          </div>
          {selection && <code>transit/{selection.planet}-{selection.sign}/{selection.house}h/{selection.motion}</code>}
        </div>

        {friendsTransitAudience && renderFriendsTransitSectionFinder("house-transit", "embedded", transitNatalQuery, setTransitNatalQuery)}

        <div className="admin-natal-placement-selectors admin-filter-form admin-filter-form--four">
          <label>
            <span>1. Transiting planet</span>
            <AdminSelect aria-label="House Transit planet" value={houseTransitPlanet} onChange={(event) => updateHouseTransitSelection({ planet: event.target.value as TransitNatalPlanet | "" })}>
              <option value="">Choose transiting planet</option>
              {houseTransitPlanets.map((planet) => <option value={planet} key={planet}>{titleFromKey(planet)}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>2. Current sign</span>
            <AdminSelect aria-label="House Transit zodiac sign" value={houseTransitSign} onChange={(event) => updateHouseTransitSelection({ sign: event.target.value as TransitNatalSign | "" })}>
              <option value="">Choose current sign</option>
              {houseTransitSigns.map((sign) => <option value={sign} key={sign}>{titleFromKey(sign)}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>3. Reader's house</span>
            <AdminSelect aria-label="House Transit house" value={houseTransitHouse} onChange={(event) => updateHouseTransitSelection({ house: event.target.value as TransitNatalHouse | "" })}>
              <option value="">Choose reader's house</option>
              {houseTransitHouses.map((house) => <option value={house} key={house}>{house}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>4. Current motion</span>
            <AdminSelect aria-label="House Transit motion" value={houseTransitMotion} onChange={(event) => updateHouseTransitSelection({ motion: event.target.value as HouseTransitMotion })}>
              <option value="direct">Direct</option>
              <option value="retrograde">Retrograde</option>
            </AdminSelect>
          </label>
        </div>

        {!selection && <p className="admin-natal-placement-prompt">Choose the planet, sign, and house to preview the reader's House Transit and open its exact source rows.</p>}
        {selection && !sourcesReady && (
          <section aria-label="House Transit content loading" aria-busy={!loadError}>
            {loadError ? <p role="alert">{loadError}</p> : <PageLoading message="Loading House Transit passages…" />}
            {loadError && <StudioButton type="button" onClick={() => void loadDashboardData()}>Retry</StudioButton>}
          </section>
        )}
        {selection && preview && (
          <section className="admin-natal-source-group" aria-label="Effective House Transit reader preview">
            <header><div className="admin-page-heading">
              <p className="admin-eyebrow">Effective reader preview</p>
              <h3>What you see</h3>
              <p>The dates and motion are calculated facts. The writing comes from the editable passages listed below.</p>
            </div></header>
            <article className="admin-natal-source-card">
              <div className="admin-natal-source-card-copy">
                <div className="admin-natal-source-card-heading">
                  <h4>{preview.headline}</h4>
                  <span className={`ui-pill admin-status ${preview.complete ? "status-live" : "status-draft"}`}>{preview.complete ? "Complete composition" : "Source passage required"}</span>
                </div>
                <blockquote>{preview.body}</blockquote>
                <code>{preview.sourceKeys.join(" · ")}</code>
                {!preview.complete && <p>Missing: {preview.missing.join(", ")}</p>}
                {preview.optionalMissing.length > 0 && <p>Optional passage omitted: {preview.optionalMissing.join(", ")}</p>}
              </div>
            </article>
          </section>
        )}

        {compositionGroup && (
          <section className="admin-natal-source-group">
            <header><div className="admin-page-heading">
              <h3>{compositionGroup.label}</h3>
              <p>{servingLegacy ? "This reader card is currently stored as one complete editable passage." : compositionGroup.description}</p>
            </div>
              <StudioButton type="button" disabled={isLoading || houseTransitOpening} onClick={() => selection && void openHouseTransitWriteup(selection, visibleCompositionSources)}>
                Edit complete write-up
              </StudioButton>
            </header>
            <div className="admin-natal-source-grid">{visibleCompositionSources.map(source => renderSkyAssemblySource(source, true))}</div>
          </section>
        )}
        {alternateGroup && advancedSources.length > 0 && (
          <details className="admin-workspace-details admin-natal-source-group admin-natal-source-advanced">
            <AdminDisclosureSummary>{alternateGroup.label}</AdminDisclosureSummary>
            <p>{alternateGroup.description}</p>
            <div className="admin-natal-source-grid">{advancedSources.map(source => renderSkyAssemblySource(source))}</div>
          </details>
        )}
      </section>
    );
  }

  function renderContentFilters() {
    return (
      <AdminFilterBar
        activeFilterCount={[contentStatusFilter !== "all", categoryFilter !== "all" && !calendarAspectWorkspaceActive, contentClassFilter !== "all", tierFilter !== "all", showReferenceRows && !calendarAspectWorkspaceActive, showRetiredRows].filter(Boolean).length}
        label="Content list filters"
        searchLabel={calendarAspectWorkspaceActive ? "Find an aspect" : "Search content"}
        query={query}
        onQueryChange={handleContentSearchChange}
        placeholder={calendarAspectWorkspaceActive ? "Mercury sextile Mars" : "Search by title, surface, kind, or content key"}
        tabs={<>
        {!calendarAspectWorkspaceActive && (
        <div className="admin-filter-choices" role="group" aria-label="Content Library saved views">
          <StudioButton type="button" aria-pressed={contentLibraryView === "all"} className={contentLibraryView === "all" ? "active" : ""} onClick={() => setContentLibraryView("all")}>
            Editorial content
          </StudioButton>
          <StudioButton type="button" aria-pressed={contentLibraryView === "compatibility"} className={contentLibraryView === "compatibility" ? "active" : ""} onClick={() => setContentLibraryView("compatibility")}>
            Compatibility
          </StudioButton>
        </div>
        )}
        </>}
        filters={<>
          {!calendarAspectWorkspaceActive && (
          <label>
            <span>Category</span>
            <AdminSelect aria-label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as AdminContentCategoryFilter)}>
              {categoryFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </AdminSelect>
          </label>
          )}
          {!calendarAspectWorkspaceActive && (
          <label>
            <span>Content class</span>
            <AdminSelect aria-label="Content class" value={contentClassFilter} onChange={(event) => setContentClassFilter(event.target.value as AdminContentClassFilter)}>
              {contentClassFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </AdminSelect>
          </label>
          )}
          {!calendarAspectWorkspaceActive && (
          <label>
            <span>Tier</span>
            <AdminSelect aria-label="Tier" value={tierFilter} onChange={(event) => setTierFilter(event.target.value as AdminPhrasebankTierFilter)}>
              {tierFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </AdminSelect>
          </label>
          )}
        </>}
        actions={<>
          <StudioButton type="button" onClick={() => void loadDashboardData()} disabled={isLoading}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh rows
          </StudioButton>
          <StudioButton
            type="button"
            onClick={() => {
              setContentStatusFilter("all");
              setContentLibraryView("all");
              setCategoryFilter(calendarAspectWorkspaceActive ? "Calendar Aspects" : "all");
              setContentClassFilter("all");
              setTierFilter("all");
              setShowReferenceRows(calendarAspectWorkspaceActive);
              setShowRetiredRows(false);
              setQuery("");
              setNatalPlacementPlanet("");
              setNatalPlacementSign("");
              setNatalPlacementHouse("");
            }}
          >
            Clear filters
          </StudioButton>
        </>}
        secondary={<>
        <details className="admin-advanced" onToggle={(event) => setStatusFiltersOpen(event.currentTarget.open)}><AdminDisclosureSummary>Editorial filters</AdminDisclosureSummary>
        <div className="admin-status-pills" role="group" aria-label="Reader status">
          {(["all", "LIVE", "NOT_LIVE"] as const).map((status) => (
            <StudioButton key={status} type="button" aria-pressed={contentStatusFilter === status} className={contentStatusFilter === status ? "active" : ""} onClick={() => setContentStatusFilter(status)}>
              <span>{status === "all" ? "All" : status === "LIVE" ? "Live" : "Not live"}</span>
              <strong>{status === "all" ? statusCountRows.length : statusChecking ? "…" : status === "LIVE" ? liveCount : liveStatusResults.statuses.size - liveCount}</strong>
            </StudioButton>
          ))}
        </div>
        {statusFiltersOpen && statusChecking && <p role="status" className="admin-field-hint">Checking reader status…</p>}
        {Boolean(liveStatusResults?.failed) && <p role="status" className="admin-field-hint">Status unavailable for {liveStatusResults?.failed} entries. Refresh rows to retry.</p>}
        </details>
          {!calendarAspectWorkspaceActive && (
          <StudioButton type="button" aria-pressed={showReferenceRows} className={showReferenceRows ? "active" : ""} onClick={() => setShowReferenceRows((current) => !current)}>
            {showReferenceRows ? "Hide reference" : "Show reference"}
          </StudioButton>
          )}
          <StudioButton type="button" aria-pressed={showRetiredRows} className={showRetiredRows ? "active" : ""} onClick={() => setShowRetiredRows((current) => !current)}>
            Show retired
          </StudioButton>
        </>}
      />
    );
  }

  function renderArticleFilters() {
    return (
      <AdminFilterBar
        activeFilterCount={[articleStatusFilter !== "all", articlePointFilter !== "all", articleContentSystemFilter !== "all"].filter(Boolean).length}
        label="Article filters" searchLabel="Search articles" query={articleQuery}
        onQueryChange={setArticleQuery} placeholder="Search by title, surface, kind, or content key"
        filters={<>
          <label>
            <span>Status</span>
            <AdminSelect aria-label="Article status" value={articleStatusFilter} onChange={(event) => setArticleStatusFilter(event.target.value as GeneratedContentStatus | "all")}>
              <option value="all">All statuses</option>
              {contentStatuses.map((status) => <option key={status} value={status}>{contentStatusLabel(status)}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>Planet or point</span>
            <AdminSelect aria-label="Article planet or point" value={articlePointFilter} onChange={(event) => setArticlePointFilter(event.target.value as AdminArticlePointFilter)}>
              {articlePointFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>Content system</span>
            <AdminSelect aria-label="Article content system" value={articleContentSystemFilter} onChange={(event) => setArticleContentSystemFilter(event.target.value as AdminContentSystemFilter)}>
              {contentSystemFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </AdminSelect>
          </label>
        </>}
        actions={<>
          <StudioButton
            type="button"
            onClick={() => {
              setArticleStatusFilter("LIVE");
              setArticlePointFilter("all");
              setArticleContentSystemFilter("all");
              setArticleQuery("");
            }}
          >
            Clear filters
          </StudioButton>
        </>}
      />
    );
  }

  function clearCompatibilityFilters() {
    setCompatibilitySectionFilter("all");
    setCompatibilityStatusFilter("all");
    setCompatibilityPlanetFilter("all");
    setCompatibilitySort("updated-desc");
    setCompatibilityQuery("");
  }

  function renderCompatibilityFilters() {
    return (
      <AdminFilterBar
        activeFilterCount={[compatibilityStatusFilter !== "all", compatibilityPlanetFilter !== "all", compatibilitySort !== "updated-desc"].filter(Boolean).length}
        label="Compatibility filters" searchLabel="Search compatibility" query={compatibilityQuery}
        onQueryChange={setCompatibilityQuery} placeholder="Search by sign pair, planet, hook, or key"
        tabs={<>
        <div className="admin-filter-choices" role="group" aria-label="Compatibility sections">
          {compatibilitySections.map((section) => (
            <StudioButton
              key={section.key}
              type="button"
                            aria-pressed={compatibilitySectionFilter === section.key}
              className={compatibilitySectionFilter === section.key ? "active" : ""}
              title={section.description}
              onClick={() => setCompatibilitySectionFilter(section.key)}
            >
              <span>{section.label}</span>
              <strong>{compatibilityCounts[section.key]}</strong>
            </StudioButton>
          ))}
        </div>
        </>}
        filters={<>
          <label>
            <span>Status</span>
            <AdminSelect aria-label="Compatibility status" value={compatibilityStatusFilter} onChange={(event) => setCompatibilityStatusFilter(event.target.value as GeneratedContentStatus | "all")}>
              <option value="all">All statuses</option>
              {contentStatuses.map((status) => <option key={status} value={status}>{contentStatusLabel(status)}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>Planet or point</span>
            <AdminSelect aria-label="Compatibility planet or point" value={compatibilityPlanetFilter} onChange={(event) => setCompatibilityPlanetFilter(event.target.value as AdminArticlePointFilter)}>
              {articlePointFilters.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>Sort</span>
            <AdminSelect aria-label="Compatibility sort" value={compatibilitySort} onChange={(event) => setCompatibilitySort(event.target.value as AdminCompatibilitySort)}>
              {compatibilitySortOptions.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
            </AdminSelect>
          </label>
        </>}
        actions={<>
          <StudioButton
            type="button"
            onClick={clearCompatibilityFilters}
          >
            Clear filters
          </StudioButton>
        </>}
      />
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
              <AdminDisclosureSummary>Developer diagnostics</AdminDisclosureSummary>
              <pre>{loadDiagnostics}</pre>
            </details>
          )}
        </div>
        <StudioButton type="button" onClick={() => void loadDashboardData()} disabled={isLoading}>
          <RefreshCw size={16} aria-hidden="true" />
          Retry
        </StudioButton>
      </section>
    );
  }

  function renderFallbackTabs() {
    return (
      <div className="admin-filter-choices" role="group" aria-label="Fallback hook sections">
        {fallbackSections.map((section) => (
          <StudioButton key={section.key} type="button" aria-pressed={fallbackSectionFilter === section.key} className={fallbackSectionFilter === section.key ? "active" : ""} onClick={() => activePage === "hooks" ? navigateSurfaceMapFilters({ section: section.key }) : navigateAdminPage("knowledge", new URLSearchParams({ section: section.key, q: query }))}>
            {section.label}
          </StudioButton>
        ))}
      </div>
    );
  }

  function showDailyHookFamily(nextQuery: "daily-headline" | "daily-body" | "pair-daily") {
    setFallbackSectionFilter("daily");
    setFallbackRowSort("type");
    setQuery(nextQuery);
    setDailyGlancePairSelector(null);
    setSelectedRowId(null);
  }

  function renderBulkBar() {
    if (selectedIds.size === 0) return null;

    return (
      <div className="admin-content-bulk-bar" aria-label="Bulk row actions">
        <div>
          <strong>{selectedIds.size}</strong>
          <span>selected</span>
        </div>
        <label>
          <span>Status</span>
          <AdminSelect value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as GeneratedContentStatus)} disabled={isLoading}>
            {contentStatuses.map((status) => <option key={status} value={status}>{contentStatusLabel(status)}</option>)}
          </AdminSelect>
        </label>
        <StudioButton type="button" onClick={() => void applyBulkStatus()} disabled={selectedSavedRows.length === 0 || isLoading}>
          <Save size={15} aria-hidden="true" />
          Apply
        </StudioButton>
        <StudioButton type="button" onClick={() => setSelectedIds(new Set())} disabled={selectedIds.size === 0 || isLoading}>
          Clear
        </StudioButton>
        <StudioButton type="button" className="admin-danger-button" onClick={() => void deleteSelectedDrafts()} disabled={selectedSavedRows.length === 0 || isLoading}>
          <Trash2 size={15} aria-hidden="true" />
          Delete drafts
        </StudioButton>
      </div>
    );
  }

  function renderFallbackContentGroups(tableRows: AdminGeneratedContentRow[]) {
    const groups = [
      { key: "pair-personal", label: "Between You Two · personal clauses", description: "You and Friend versions selected separately from each person’s daily driver." },
      { key: "pair-assembly", label: "Between You Two · assembly frames", description: "Openings, optional shared bridges, bond details, and closing advice." },
      { key: "articles", label: "Sky Placement articles", description: "Complete placement articles." },
      { key: "houses", label: "House horoscopes", description: "House-specific reader passages." },
      { key: "sky-aspects", label: "Sky aspects", description: "Current-sky aspect passages." },
      { key: "personal-transits", label: "Transits to natal", description: "Personal transit passages." },
      { key: "supporting", label: "Supporting fallback rows", description: "Other atomic sources used by fallback renderers." }
    ] as const;
    const groupedRows = new Map(groups.map((group) => [group.key, [] as AdminGeneratedContentRow[]]));
    tableRows.forEach((row) => {
      if (dailyGlanceSelector(row.content_key)) return;
      const groupKey = row.content_key.startsWith("fallback-hook/pair-daily/clause/")
            ? "pair-personal"
            : row.content_key.startsWith("fallback-hook/pair-daily/")
              ? "pair-assembly"
              : skyFallbackIdentity(row.content_key)?.groupKey ?? "supporting";
      groupedRows.get(groupKey)?.push(row);
    });
    const visibleGroups = groups.filter((group) => (groupedRows.get(group.key)?.length ?? 0) > 0);

    const showDailyGlanceStudio = fallbackSectionFilter === "daily";
    if (visibleGroups.length === 0 && !showDailyGlanceStudio) return <p className="admin-empty">{contentStatusFilter !== "all" && statusChecking ? "Checking reader status…" : "No rows match these filters."}</p>;

    return (
      <div className="admin-sky-edition-fields" aria-label="Fallback content grouped by reader use">
        {showDailyGlanceStudio && (
          <Suspense fallback={<PageLoading message="Loading the paired Daily At-a-Glance editor…" />}>
            <DailyGlanceStudio
              context={dailyGlanceContext}
              contextError={dailyGlanceContextError}
              contextLoading={dailyGlanceContextLoading}
              pairs={dailyGlanceWriteups}
              query={query}
              onLoadContext={loadDailyGlanceContext}
              onOpenPair={openDailyGlancePair}
            />
          </Suspense>
        )}
        {visibleGroups.map((group) => {
          const rows = groupedRows.get(group.key) ?? [];
          return (
            <section className="admin-hook-detail-section" aria-label={group.label} key={group.key}>
              <div className="admin-section-heading-row">
                <div>
                  <h3>{group.label}</h3>
                  <p>{group.description}</p>
                </div>
                <p>{rows.length} {rows.length === 1 ? "row" : "rows"}</p>
              </div>
              {renderContentTable(rows, false, true)}
            </section>
          );
        })}
      </div>
    );
  }

  function renderContentTable(
    tableRows: AdminGeneratedContentRow[],
    showArticleDestination = false,
    showWiringReason = false,
    showCompatibilityIdentity = false
  ) {
    const resetKey = [
      activePage,
      tableRows.length,
      tableRows[0]?.id ?? "",
      tableRows.at(-1)?.id ?? "",
      query,
      articleQuery,
      compatibilityQuery,
      contentStatusFilter,
      reviewStatusFilter,
      contentClassFilter,
      tierFilter,
      categoryFilter,
      compatibilitySectionFilter,
      compatibilityStatusFilter,
      compatibilityPlanetFilter,
      fallbackSectionFilter,
      vocabularyCategory
    ].join(":");

    return (
      <AdminPaginatedCollection items={tableRows} label="Content rows" pageSize={contentTablePageSize} resetKey={resetKey}>
        {(visibleTableRows) => <AdminContentTable
          showDestination={showArticleDestination}
          emptyMessage={activePage === "content" && contentStatusFilter !== "all" && statusChecking ? "Checking reader status…" : "No rows match these filters."}
          rows={visibleTableRows.map((row) => {
              const rowClass = contentClassForRow(row);
              const rowRole = contentRoleDetails(contentRoleForRecord(row));
              const destination = showArticleDestination ? articleAppDestination(row) : null;
              const wiring = showWiringReason ? contentWiringStatus(row) : null;
              const compatibilityIdentity = showCompatibilityIdentity ? compatibilityBrowseIdentityForRow(row) : null;
              const placement = activePage === "skyWriteups" ? skyWriteupContextForRow(row) : null;
              const lunation = placement ? skyLunationContextForRow(row) : null;
              const placementLabel = placement?.sign && !row.content_key.includes("/station/")
                ? lunation ? `${titleFromKey(placement.sign)} ${titleFromKey(lunation.kind)}`
                  : `${titleFromKey(placement.planet)} in ${titleFromKey(placement.sign)}${contentMotion(row) === "unspecified" ? "" : ` · ${titleFromKey(contentMotion(row))}`}`
                : null;
              const displayTitle = placementLabel ?? compatibilityIdentity?.title ?? rowTitle(row);
              const placementKind = placement ? row.content_key.startsWith("sky/article-template/") ? "Placement template"
                : row.content_key.startsWith("sky/article-edition/") ? "Saved placement edition"
                  : lunation ? "Lunation macro" : "Sky placement" : null;
              return {
                id: row.id,
                title: displayTitle,
                kind: placementKind ?? (compatibilityIdentity ? `${compatibilityIdentity.detail} · ${rowTypeLabel(row)}` : rowTypeLabel(row)),
                contentKey: row.content_key,
                status: <ContentLiveStatusBadge row={row} />,
                destination,
                selected: selectedRowId === row.id,
                checked: selectedIds.has(row.id),
                onSelect: () => toggleRowSelection(row.id),
                onOpen: () => openRow(row),
                details: <>
                  <p className="admin-field-hint">Editorial stage: {contentStatusLabel(row.status)}</p>
                  <p className="admin-field-hint">{rowRole.label} · {contentClassLabel(rowClass)} · {tierForRow(row)}</p>
                  {wiring && <p className="admin-field-hint">{wiring.detail}</p>}
                </>
              };
          })}
        />}
      </AdminPaginatedCollection>
    );
  }

  function renderReviewTable(tableRows: AdminReviewRecord[]) {
    return (
      <section className="admin-review-queue-layout" aria-label="Review queue">
        <aside className="admin-review-queue-groups" aria-label="Queue families">
          {contentStatuses.map((status) => (
            <StudioButton key={status} type="button" className={reviewStatusFilter === status ? "active" : ""} aria-pressed={reviewStatusFilter === status} onClick={() => setReviewStatusFilter(status)}>
              <span>{contentStatusLabel(status)}</span>
              <strong>{tableRows.filter((row) => row.status === status).length}</strong>
            </StudioButton>
          ))}
        </aside>
        <AdminPaginatedCollection
          items={tableRows}
          label="Review queue"
          pageSize={reviewQueuePageSize}
          resetKey={`${reviewStatusFilter}:${contentClassFilter}:${tierFilter}:${query}:${tableRows.length}`}
        >
          {(visibleTableRows) => <div className="admin-review-queue-rows" aria-label="Review rows">
            <AdminContentTable showDestination={false} emptyMessage="No review rows match these filters." rows={visibleTableRows.map((row) => {
              const saved = row.rawGlobalRow;
              const aspectContext = aspectContextForRow(row);
              return {
                id: row.id,
                title: rowTitle(row),
                kind: aspectContext?.label ?? contentCategoryForRow(row),
                contentKey: row.contentKey,
                status: <ContentLiveStatusBadge row={saved ?? { id: null }} />,
                selected: Boolean(saved && selectedRowId === saved.id),
                checked: selectedIds.has(saved?.id ?? row.id),
                onSelect: () => saved && toggleRowSelection(saved.id),
                onOpen: saved ? () => openRow(saved) : undefined,
                details: <p className="admin-review-preview">{row.summary || row.body || "No preview copy saved."}</p>
              };
            })} />
          </div>}

        </AdminPaginatedCollection>
      </section>
    );
  }

  function renderLiveOmittedSectionsQueue() {
    return (
      <section className="admin-sky-voice-queue" aria-label="Live with omitted sections">
        <p className="studio-surface admin-sky-voice-description">
          Read-only runtime QA. Each horoscope listed here stayed live with its approved evergreen copy; only the unavailable conditional section was omitted. {sharedLiveOmittedSectionsLoaded ? "Authenticated observations are shared across production, with this device's local fallback merged in." : "The shared endpoint is unavailable, so this view is showing this device's local fallback."} Review metadata is never exposed to readers.
        </p>
        <div className="admin-content-table-scroll">
          {visibleLiveOmittedSections.length > 0 ? (
            <AdminDataTable label="Live horoscopes with omitted sections" columns={["Horoscope", "Surface", "Omitted section", "Seen", "Details"]}>
              {visibleLiveOmittedSections.map((item) => (
                <tr key={item.queueId} className="admin-sky-voice-card">
                  <td data-label="Horoscope">
                    <strong>{item.headline || "Horoscope served with an omitted section"}</strong>
                    <code>{item.omittedContentKey}</code>
                    <div className="admin-review-queue-meta-strip">
                      <span className="ui-pill admin-status status-live">Horoscope stayed live</span>
                      <span className="ui-pill admin-status status-reviewed">Needs copy review</span>
                    </div>
                  </td>
                  <td data-label="Surface">{liveOmissionSurfaceLabel(item.surface)} · {liveOmissionDateLabel(item)}</td>
                  <td data-label="Omitted section">{item.sectionId}</td>
                  <td data-label="Seen">{item.occurrenceCount} {item.occurrenceCount === 1 ? "time" : "times"} · {item.sign || "Sign not recorded"} · {item.risingSign || "Rising not recorded"}</td>
                  <td data-label="Details">
                    <p><strong>Reason</strong> {item.reason === "missing-or-ineligible" ? "The conditional source row was missing or not reader-eligible." : item.reason}</p>
                    <p><strong>Fallback</strong> {item.fallbackContentKey || "No replacement section was inserted; approved evergreen copy continued without it."}</p>
                    <p><strong>Last seen</strong> {new Date(item.lastSeenAt).toLocaleString()}</p>
                  </td>
                </tr>
              ))}
            </AdminDataTable>
          ) : (
            <p className="admin-empty">No live horoscope has omitted a conditional section in the available review history.</p>
          )}
        </div>
      </section>
    );
  }

  function renderSkyVoiceQueue(tableRows: AdminGeneratedContentRow[], description: string) {
    return (
      <section className="admin-sky-voice-queue" aria-label="Sky voice queue">
        <p className="studio-surface admin-sky-voice-description">{description}</p>
        <div className="admin-content-table-scroll">
          {tableRows.length > 0 ? (
            <AdminDataTable label="Sky voice queue" columns={["Card", "Status", "Facts", "Copy", "Actions"]}>
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
                  <tr key={row.id} className="admin-sky-voice-card">
                    <td data-label="Card">
                      <h3>{row.headline || placement || pair || "Sky voice card"}</h3>
                      <code>{row.content_key}</code>
                    </td>
                    <td data-label="Status">
                      <ContentLiveStatusBadge row={row} />
                      <span className="ui-pill admin-status">Judge {row.judge_score ?? "-"}/3</span>
                    </td>
                    <td data-label="Facts">
                      <dl className="admin-sky-voice-facts">
                        <div><dt>{isPlacement ? "Placement" : "Pair"}</dt><dd>{isPlacement ? placement || "Not recorded" : pair || "Not recorded"}</dd></div>
                        <div><dt>{isPlacement ? "Kind" : "Aspect"}</dt><dd>{isPlacement ? (isPlacementTopper ? "Current topper" : "Collective placement") : String(facts?.aspect ?? "Not recorded")}</dd></div>
                        <div><dt>{isPlacement ? "Sign" : "Signs"}</dt><dd>{isPlacement ? String(facts?.sign ?? "Not recorded") : signs || "Not recorded"}</dd></div>
                        {isPlacementTopper ? <div><dt>Contact</dt><dd>{topperContact || "Not recorded"}</dd></div> : null}
                      </dl>
                    </td>
                    <td data-label="Copy">
                      <p className="admin-sky-voice-body">{row.body || "No card body saved."}</p>
                      <div className="admin-sky-voice-judge">
                        <p><strong>Why</strong> {row.judge_why || "No judge rationale saved."}</p>
                        <p><strong>Weakest</strong> {weakest || "No weakest beat recorded."}</p>
                      </div>
                    </td>
                    <td data-label="Actions">
                      <div className="admin-review-queue-actions">
                        <StudioButton type="button" onClick={() => openRow(row)}>Edit</StudioButton>
                        {skyWritingIssues(row).length === 0 && ["DRAFT", "REVIEWED"].includes(row.status)
                          ? <StudioButton type="button" onClick={() => void approveAndScheduleSkyRow(row)} disabled={isLoading}>{row.block_type === "sky_placement" ? "Approve for package" : "Approve & schedule"}</StudioButton>
                          : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </AdminDataTable>
          ) : <p className="admin-empty">No sky voice cards are in this view.</p>}
        </div>
      </section>
    );
  }

  function renderSkyReviewHorizon() {
    if (skyReviewHorizonError) {
      return (
        <section className="admin-sky-voice-queue">
          <p className="admin-empty">{skyReviewHorizonError}</p>
          <StudioButton type="button" onClick={() => void loadSkyReviewHorizon()} disabled={isLoading}>Try again</StudioButton>
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
        <div className="studio-surface studio-section admin-sky-horizon-summary">
          <div>
            <p className="admin-eyebrow">Calculated occurrence inventory</p>
            <h3>{skyReviewHorizon.startDate} through {skyReviewHorizon.endDate}</h3>
            <p>{skyReviewHorizon.counts.aspectCandidates} aspect cards and {skyReviewHorizon.counts.placementCandidates} placement cards are reused across {skyReviewHorizon.counts.activeWindows} active windows. Dates come from calculated daily Sky snapshots; copy is never duplicated per day.</p>
            <p><strong>{skyReviewHorizon.generationPlan.reusableCandidatesMissingDrafts} generated sign-specific drafts are missing.</strong> This is not the same as a reader-facing source gap because approved exact-aspect and phrasebook fallbacks may still cover the event. Generate only the drafts you need. Approved existing writing may already cover these configurations. Generate one missing draft below, or write it manually. Each generation uses the configured writer. Writing checks are automatic; editorial approval is yours.</p>
          </div>
          <StudioButton type="button" onClick={() => void loadSkyReviewHorizon()} disabled={isLoading}>
            <RefreshCw size={16} aria-hidden="true" /> Recalculate
          </StudioButton>
        </div>
        <p className="studio-surface admin-sky-voice-description">This view is inventory and review status only. Loading it makes zero writer or reviewer calls and changes no approval or serving state.</p>
        <div className="admin-content-table-scroll">
          <AdminDataTable label="Upcoming Sky review inventory" columns={["Occurrence", "Status", "Windows", "Copy", "Actions"]}>
            {skyReviewHorizon.occurrences.map((occurrence) => {
              const row = occurrence.row;
              const canApprove = row && skyWritingIssues(row).length === 0 && ["DRAFT", "REVIEWED"].includes(row.status);
              const ownerApprovedArticleKey = ownerApprovedSkyPlacementArticleKey(occurrence.contentKey);
              const statusLabel = ownerApprovedArticleKey
                ? ownerApprovedReplacementLabel
                : statusLabels[occurrence.reviewStatus];
              return (
                <tr key={occurrence.contentKey} className="admin-sky-voice-card">
                  <td data-label="Occurrence">
                    <h3>{occurrence.label}</h3>
                    <code>{occurrence.contentKey}</code>
                  </td>
                  <td data-label="Status">
                    <span className="ui-pill admin-status">{statusLabel}</span>
                    <span className="ui-pill admin-status">{occurrence.kind}</span>
                  </td>
                  <td data-label="Windows">
                    <p>First active: {occurrence.windows[0]?.startDate ?? "Not calculated"}</p>
                    <p>Last active: {occurrence.windows.at(-1)?.endDate ?? "Not calculated"}</p>
                    <p>{occurrence.activeDates.length} active days · {occurrence.windows.length} windows</p>
                    {ownerApprovedArticleKey ? <p>Reader source: <code>{ownerApprovedArticleKey}</code></p> : null}
                  </td>
                  <td data-label="Copy">
                    <p className="admin-sky-voice-body">{row?.body || "No writing is saved for this configuration. Generate a draft or write it manually, then review it before publication."}</p>
                  </td>
                  <td data-label="Actions">
                    <div className="admin-review-queue-actions">
                      {ownerApprovedArticleKey ? (
                        <StudioButton type="button" onClick={() => void openServingFallbackRow(ownerApprovedArticleKey, occurrence)} disabled={isLoading}>
                          Edit serving article
                        </StudioButton>
                      ) : null}
                      {row ? <StudioButton type="button" onClick={() => openRow(row)}>Edit</StudioButton> : null}
                      {!row ? <><StudioButton type="button" disabled={isLoading} onClick={() => void runSkyDraftWriting(occurrence.contentKey, "generate")}>Generate draft</StudioButton><StudioButton type="button" onClick={() => openMissingSkyDraft(occurrence)}>Write manually</StudioButton></> : null}
                      {canApprove ? <StudioButton type="button" onClick={() => void approveAndScheduleSkyRow(row)} disabled={isLoading}>{row.block_type === "sky_placement" ? "Approve for package" : "Approve & schedule"}</StudioButton> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </AdminDataTable>
        </div>
      </section>
    );
  }

  function renderEditor() {
    if (houseTransitEditor) {
      return <Suspense fallback={<PageLoading message="Loading write-up editor…" />}>
        <HouseTransitWriteupEditor
          title={houseTransitEditor.title}
          initialAudience={houseTransitEditor.audience}
          sources={houseTransitEditor.sources}
          registerCloseGuard={guard => { houseTransitCloseGuard.current = guard; }}
          onClose={() => { setHouseTransitEditor(null); houseTransitEditorDrafts.current.clear(); }}
          onSave={saveHouseTransitPassage}
        />
      </Suspense>;
    }
    if (selectedDailyGlancePair) {
      return (
        <Suspense fallback={null}>
          <DailyGlancePairEditor
            context={dailyGlanceContext}
            isSaving={isLoading}
            pair={selectedDailyGlancePair}
            onClose={closeDailyGlancePairEditor}
            onSave={saveDailyGlancePairEdits}
          />
        </Suspense>
      );
    }
    if (!draft && !selectedRow) {
      return null;
    }

    const currentDraft = draft ?? (selectedRow ? draftFromRow(selectedRow) : null);
    if (!currentDraft) return null;

    const ownerApprovedArticleKey = ownerApprovedSkyPlacementArticleKey(currentDraft.contentKey);
    const aspectContext = aspectContextForDraft(currentDraft);

    const isVocabularyDraft = draftIsVocabulary(currentDraft);
    const isArticleDraft = draftIsArticle(currentDraft);
    const isAstro101Draft = isAstro101ContentRow({ content_key: currentDraft.contentKey, facts: currentDraft.facts });
    const astro101Blocks = astro101BlocksFromSections(currentDraft.sections);
    const astro101Intro = astro101IntroFromSections(currentDraft.sections);
    const articleBodyStyle = typeof objectRecord(currentDraft.sections)?.bodyStyle === "string"
      ? String(objectRecord(currentDraft.sections)?.bodyStyle)
      : "";
    const showArticleStyleEditor = isAstro101Draft
      || isArticleDraft
      || currentDraft.blockType === "essay"
      || astro101Blocks.length > 0;
    const isFallbackHookDraft = draftIsFallbackHook(currentDraft);
    const isTemplateDraft = draftIsTemplate(currentDraft) && !(lunarContentIdentity(currentDraft.contentKey) && !currentDraft.body.includes("{{"));
    const isPackageDraft = draftIsFallbackArchitectureV3(currentDraft);
    const isGuidedHeldReview = isPackageDraft && guidedReviewKey === currentDraft.contentKey;
    const guidedReviewDecision = objectRecord(objectRecord(currentDraft.sections)?.contentStudioReview);
    const isReferenceDraft = isContentStudioReferenceSource(currentDraft.contentKey, currentDraft.sourceSnapshot ?? {});
    const isGovernedSkyDraft = ["sky_aspect", "sky_placement"].includes(currentDraft.blockType);
    const persistedDraft = selectedRow ? draftFromRow(selectedRow) : null;
    const serializedCurrentDraft = JSON.stringify(currentDraft);
    const draftMatchesSavedState = serializedCurrentDraft === editorBaselineRef.current
      || serializedCurrentDraft === editorSavedInputRef.current;
    const draftHasUnsavedChanges = editorBaselineRef.current || editorSavedInputRef.current
      ? !draftMatchesSavedState
      : persistedDraft
        ? serializedCurrentDraft !== JSON.stringify(persistedDraft)
        : Boolean(currentDraft.headline.trim() || currentDraft.summary.trim() || currentDraft.body.trim());
    const skyDraftHasUnsavedCopy = Boolean(selectedRow && isGovernedSkyDraft && (
      (["headline", "summary", "body"] as const).some((field) => currentDraft[field] !== (selectedRow[field] ?? ""))
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
    const sourceIsArchived = isPackageDraft
      ? packageReviewStatus === "deprecated"
      : currentDraft.status === "ARCHIVED";
    const packageRecord = draftPackageRecord(currentDraft);
    const editablePackageRecord = draftEditablePackageRecord(currentDraft);
    const isSkyPlacementFrameTemplate = currentDraft.contentKey === skyPlacementFrameTemplateKey;
    const isExactNatalAspectDraft = currentDraft.contentKey.startsWith(natalAspectContentKeyPrefix);
    const skyPlacementTemplateOptions = skyPlacementCompositionOptions(effectivePackageRecord(currentDraft.sections));
    const skyFallbackEditor = skyFallbackWorkspace(currentDraft.contentKey, currentDraft.sections);
    const skyFallbackContentIdentity = skyFallbackIdentity(currentDraft.contentKey);
    const isSkyPlacementSource = /^sky-placement\/(?:article|retrograde|seasonal-context)\//u.test(currentDraft.contentKey);
    const SkyRelatedContainer = isSkyPlacementSource ? "details" : "section";
    const SkyChangesContainer = isSkyPlacementSource ? "details" : "section";
    const effectiveSkyFallbackVariableTarget = skyFallbackEditor?.fields.some((field) => field.key === skyFallbackVariableTarget)
      ? skyFallbackVariableTarget
      : skyFallbackEditor?.fields.find((field) => field.key === "fact_line")?.key ?? skyFallbackEditor?.fields[0]?.key ?? "";
    const effectiveSkyFallback: Record<string, any> = {
      ...effectivePackageRecord(currentDraft.sections),
      _studioVariables: customVariableLibrary.variables,
      _studioVariablesLoading: customVariableLibrary.loading,
      _studioVariablesError: customVariableLibrary.error
    };
    const isSkyV4OverlaySettings = currentDraft.contentKey === "sky-v4/settings/contextual-overlays";
    const skyV4OverlaysEnabled = effectiveSkyFallback.contextualTransitOverlaysEnabled !== false;
    const skyV4FallbackOverlayEnabled = effectiveSkyFallback.includeContextualOverlayInFallbackHook === true;
    const isSkyV4StudioRecord = Boolean(effectiveSkyFallback.source_baseline_sha256 && effectiveSkyFallback.studio_source_baseline);
    const packageHasProposal = draftHasPackageProposal(currentDraft);
    const packageIsSkyV4Governed = packageRecord.source_package === skyV4CanonicalStagePackage
      || sourceSnapshotString(currentDraft.sourceSnapshot, "sourcePackage") === skyV4CanonicalStagePackage;
    const packageContentRole = String(
      packageRecord.content_role
      ?? currentDraft.sourceSnapshot?.content_role
      ?? objectRecord(currentDraft.facts)?.content_role
      ?? ""
    ).trim().toLowerCase().replace(/-/g, "_");
    const packageRoleCanServeExactCopy = !["fallback_source", "source_material"].includes(packageContentRole);
    const isPersonalTransitExactDraft = isPackageDraft
      && (currentDraft.contentKey.startsWith("authored/transit-aspect/")
        || currentDraft.contentKey.startsWith("authored/transit-return/"));
    const isPersonalTransitSituationDraft = isPersonalTransitExactDraft
      && currentDraft.contentKey.split("/").length === 8;
    const packageCanApproveRevision = isPackageDraft
      && packageHasProposal
      && !isGuidedHeldReview
      && packageRoleCanServeExactCopy
      && !isPersonalTransitSituationDraft;
    const packageApprovalPublishes = isPackageDraft
      && !packageHasProposal
      && !isGuidedHeldReview
      && !packageIsSkyV4Governed
      && packageRoleCanServeExactCopy
      && fallbackArchitectureV3ReaderEligibleReviews.has(packageReviewStatus);
    const packageStatusAfterSave: GeneratedContentStatus = packageApprovalPublishes || packageCanApproveRevision ? "LIVE" : "DRAFT";
    const packageWillPublishOnSave = packageApprovalPublishes && currentDraft.status !== "LIVE";
    const natalAspectMissingCopy = isExactNatalAspectDraft && !["body", "body_you", "body_they"].some((field) => packageFieldString(currentDraft, field).trim());
    const transitNatalMissingCopy = isPersonalTransitExactDraft && (
      currentDraft.contentKey.startsWith("authored/transit-return/")
        ? !["body", "body_you"].some((field) => packageFieldString(currentDraft, field).trim())
        : !["body_you", "body_they"].every((field) => packageFieldString(currentDraft, field).trim())
    );
    const transitNatalHasExactOwnerApproval = objectRecord(draftPackageRecord(currentDraft).approval)?.approvalLevel === "exact_owner_approved";
    const transitNatalCanApprovePublish = isPersonalTransitExactDraft
      && (!packageHasProposal || isPersonalTransitSituationDraft)
      && !packageCanApproveRevision
      && !isGuidedHeldReview
      && !packageIsSkyV4Governed
      && packageRoleCanServeExactCopy
      && (!fallbackArchitectureV3ReaderEligibleReviews.has(packageReviewStatus) || !transitNatalHasExactOwnerApproval);
    const seasonSourceRows = ZODIAC_SEASON_SOURCE_STARTERS.map((record: Record<string, any>) => rows.find(row => row.content_key === record.contentKey) ?? {
      id: `package:${record.contentKey}`, content_key: record.contentKey, headline: record.headline, body: "", summary: "", surface: "sky", status: "DRAFT", inventory_only: true, block_type: "fallback_hook", sections: { packageRecord: record }
    } as AdminGeneratedContentRow);
    const hasTransitContactContext = activePage === "skyWriteups"
      && skyWriteupWorkspaceView === "transits-to-natal"
      && transitNatalContactReady({
        planet: transitNatalPlanet || undefined,
        aspect: transitNatalAspect || undefined,
        natalPoint: transitNatalPoint || undefined
      });
    const hasTransitTemplatePreviewContext = hasTransitContactContext && Boolean(transitNatalSign);
    const variableReferences = buildVariableReferences?.({
      Headline: currentDraft.headline,
      Summary: currentDraft.summary,
      Body: currentDraft.body,
      body_you: packageFieldString(currentDraft, "body_you"),
      body_they: packageFieldString(currentDraft, "body_they"),
      ...(hasTransitTemplatePreviewContext ? { Available: "{{transitTitle}} {{natalTitle}} {{aspectName}} {{signTitle}} {{timeOpen}}" } : {})
    }, effectiveSkyFallback, true) ?? [];
    const baseFallbackEditorGuidance = isFallbackHookDraft && !skyFallbackEditor && fallbackHookEditorGuidanceBuilder
      ? fallbackHookEditorGuidanceBuilder({
          contentKey: currentDraft.contentKey,
          grammarFrame: typeof packageRecord.grammar_frame === "string" ? packageRecord.grammar_frame : undefined,
          bodyYou: packageFieldString(currentDraft, "body_you") || currentDraft.body,
          displayTitle: fallbackHookDisplayTitle(currentDraft.contentKey) ?? undefined
        })
      : null;
    const fallbackEditorGuidance = baseFallbackEditorGuidance && skyFallbackContentIdentity
      ? {
          ...baseFallbackEditorGuidance,
          area: skyFallbackContentIdentity.groupLabel,
          title: isTransitNatalSituationKey(currentDraft.contentKey)
            ? (currentDraft.headline.trim() || skyFallbackContentIdentity.title)
            : skyFallbackContentIdentity.title,
          description: skyFallbackContentIdentity.description
            ?? baseFallbackEditorGuidance.description
        }
      : baseFallbackEditorGuidance;
    const templatePreviewPackage = isPackageDraft
      ? {
          ...draftEditablePackageRecord(currentDraft),
          _studioVariables: customVariableLibrary.variables,
          _studioVariablesLoading: customVariableLibrary.loading,
          _studioVariablesError: customVariableLibrary.error,
          headline: currentDraft.headline,
          summary: currentDraft.summary,
          body: currentDraft.body,
          body_you: packageFieldString(currentDraft, "body_you") || currentDraft.body,
          body_they: packageFieldString(currentDraft, "body_they")
        }
      : null;
    const templatePreviewRow = selectedRow && (isTemplateDraft || hasTransitTemplatePreviewContext) ? {
      ...selectedRow,
      headline: currentDraft.headline,
      summary: currentDraft.summary,
      body: currentDraft.body,
      surface: currentDraft.surface,
      status: currentDraft.status,
      block_type: currentDraft.blockType,
      sections: templatePreviewPackage
        ? { ...(currentDraft.sections ?? {}), packageRecord: templatePreviewPackage }
        : currentDraft.sections,
      source_snapshot: currentDraft.sourceSnapshot
    } : null;
    const hasNatalTemplatePreviewContext = categoryFilter === "Natal Chart"
      && Boolean(natalPlacementPlanet && natalPlacementSign)
      && (currentDraft.contentKey === `fallback-template/natal.planet-in-sign/${natalPlacementPlanet}`
        || currentDraft.contentKey === "fallback-template/natal.planet-in-sign"
        || currentDraft.contentKey === "fallback-template/natal.node-in-sign"
        || currentDraft.contentKey === "fallback-template/natal.angle-in-sign"
        || currentDraft.contentKey === "fallback-template/natal.modifier.retrograde"
        || currentDraft.contentKey === "fallback-template/natal.house-context");
    const natalTemplatePreviewOptions = hasNatalTemplatePreviewContext ? {
      exampleValues: {
        planetTitle: natalPlacementPointLabel(natalPlacementPlanet),
        planetRef: `${["sun", "moon", "north-node", "south-node"].includes(natalPlacementPlanet) ? "the " : ""}${natalPlacementPointLabel(natalPlacementPlanet)}`,
        planetRefCap: `${["sun", "moon", "north-node", "south-node"].includes(natalPlacementPlanet) ? "The " : ""}${natalPlacementPointLabel(natalPlacementPlanet)}`,
        angleTitle: natalPlacementPointLabel(natalPlacementPlanet),
        signTitle: titleFromKey(natalPlacementSign),
        ...(natalPlacementHouse ? { houseOrdinal: ordinalHouse(natalPlacementHouse) } : {}),
        possessive: "Your",
        possessiveLow: "your"
      },
      includeOptionalSources: true
    } : undefined;
    const normalizedTemplateVariableQuery = templateVariableQuery.trim().toLowerCase();
    const filteredVariableReferences = normalizedTemplateVariableQuery
      ? variableReferences.filter((variable) => [
          variable.name,
          variable.label,
          variable.meaning,
          variable.example,
          variable.source,
          ...variable.fields
        ].some((value) => value.toLowerCase().includes(normalizedTemplateVariableQuery)))
      : variableReferences;
    const skyFallbackChanges = packageDraftChanges(currentDraft.sections);
    const skyFallbackPreview = skyFallbackEditor
      ? renderWorkspacePreview(skyFallbackEditor.fields, skyFallbackPreviewFacts)
      : [];
    const packageRole = packageContentRole;
    const isAuthoredPackageCard = isPackageDraft
      && packageRole === "authored_card"
      && currentDraft.contentKey.startsWith("sky-article/");
    const vocabularyUsage = isVocabularyDraft ? vocabularyUsageDetails(currentDraft.contentKey) : null;
    const vocabularyTheyValue = isVocabularyDraft ? packageFieldString(currentDraft, "body_they") : "";
    const vocabularyHasTheyVersion = vocabularyTheyValue.trim().length > 0;
    const isContinuousSkyPackage = isPackageDraft && packageRecord.render_policy === "sky-placement-continuous-v2";
    const isAuthoredTransitAspectDraft = isPackageDraft
      && currentDraft.contentKey.startsWith("authored/transit-aspect/");
    const isExactTransitReturnDraft = isPackageDraft
      && currentDraft.contentKey.startsWith("authored/transit-return/");
    const isExactPersonalTransitDraft = isAuthoredTransitAspectDraft || isExactTransitReturnDraft;
    const isBondEffectDraft = currentDraft.contentKey.startsWith("fallback-hook/bond-effect-");
    const bondEffectParts = isBondEffectDraft ? currentDraft.contentKey.split("/") : [];
    const bondEffectKind = bondEffectParts[1]?.slice("bond-effect-".length) ?? "";
    const bondEffectPlanet = bondEffectParts[2] ?? "";
    const showPackageBodyYou = isPackageDraft
      && !isVocabularyDraft
      && !isContinuousSkyPackage
      && (typeof editablePackageRecord.body_you === "string"
        || typeof objectRecord(currentDraft.sections)?.body_you === "string"
        || isExactTransitReturnDraft);
    const showPackageBodyThey = isPackageDraft
      && !isVocabularyDraft
      && !isExactTransitReturnDraft
      && (isAuthoredTransitAspectDraft
        || typeof editablePackageRecord.body_they === "string"
        || typeof objectRecord(currentDraft.sections)?.body_they === "string");
    const isYouOnlyNatalExactDraft = categoryFilter === "Natal Chart"
      && packageRecord.reader_only === true
      && packageRecord.render_policy === "reader-only-exact-lived-v1";
    const showNatalFriendEditor = isYouOnlyNatalExactDraft
      && Boolean(natalPlacementPlanet && natalPlacementSign && natalPlacementHouse);
    const showGenericBody = isVocabularyDraft || !isPackageDraft || (!showPackageBodyYou && !isContinuousSkyPackage);
    const showSummaryField = !isPackageDraft || typeof editablePackageRecord.summary === "string" || Boolean(currentDraft.summary.trim());
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
    const isSkySummaryDraft = currentDraft.contentKey.startsWith("cms/sky-daily-summary/")
      || currentDraft.contentKey.startsWith("cms/sky-debility/");
    const summaryBuiltin = [...skyDailySummaryFields, ...skyDebilityFields].find(field => field.key === currentDraft.contentKey);
    const matchesBuiltinSummary = Boolean(summaryBuiltin?.body && currentDraft.body.trim() === summaryBuiltin.body.trim());
    const editorStatusRow = { id: currentDraft.id ?? (matchesBuiltinSummary ? `builtin:${currentDraft.contentKey}` : selectedRow?.id.startsWith("package:") ? selectedRow.id : null), updated_at: currentDraft.updatedAt };
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
    cmsTemplateValidation.errors.push(...skySummaryTemplateErrors(currentDraft.contentKey, currentDraft.body));
    cmsTemplateValidation.errors.push(...skyDebilityTemplateErrors(currentDraft.contentKey, currentDraft.body));
    const cmsCanSignOff = !isCmsSurfaceDraft || cmsTemplateValidation.errors.length === 0;
    const cmsReaderEligible = isCmsSurfaceDraft
      && currentDraft.status === "LIVE"
      && currentDraft.lane === "serving"
      && !currentDraft.reviewState
      && cmsCanSignOff;
    const importedHoroscopeSections = objectRecord(currentDraft.sections?.articleHoroscopes);
    const savedHoroscopeSections = objectRecord(objectRecord(selectedRow?.sections)?.articleHoroscopes);
    const savedHoroscopeText = [selectedRow?.body, savedHoroscopeSections?.heading, savedHoroscopeSections?.introduction,
      ...(Array.isArray(savedHoroscopeSections?.passages) ? savedHoroscopeSections.passages.map((passage: {body?:string}) => passage.body) : [])].filter(Boolean).join("\n\n");
    const skyArticleTemplateFields = isSkyArticleTemplate && selectedRow
      ? skyArticleTemplatePlaceholders(savedHoroscopeText).filter((placeholder) => placeholder.name !== "risingBlocks")
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
    const skyArticleEditionHouseCoverage = Array.isArray(savedHoroscopeSections?.passages) && savedHoroscopeSections.passages.length ? savedHoroscopeSections.passages.length : new Set(skyArticleEditionHouseRows.map((passage) => passage.house)).size;
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
      const nextDraft = invalidateContentStudioReview({
        ...currentDraft,
        headline,
        contentKey: isVocabularyDraft && isNewDraft ? vocabularyContentKey(vocabularySection, headline) : currentDraft.contentKey
      });
      setDraft(isPackageDraft ? setPackageRecordField(nextDraft, "headline", headline) : nextDraft);
    };
    const updateSummary = (summary: string) => {
      const nextDraft = invalidateContentStudioReview({ ...currentDraft, summary });
      setDraft(isPackageDraft ? setPackageRecordField(nextDraft, lunarContentIdentity(currentDraft.contentKey) ? "editorial_notes" : "summary", summary) : nextDraft);
    };
    const updateVocabularyBody = (body: string) => {
      const nextDraft = { ...currentDraft, body };
      setDraft(isPackageDraft ? setPackageRecordField(nextDraft, "body", body) : nextDraft);
    };
    const completeGuidedContentReview = async () => {
      if (!isGuidedHeldReview || draftHasUnsavedChanges) {
        setMessage("Save the exact copy before completing owner review.");
        return;
      }
      const reviewedAt = new Date().toISOString();
      const copySha256 = await contentStudioReviewCopySha256(currentDraft);
      const reviewedDraft: AdminDraft = {
        ...currentDraft,
        sections: {
          ...(currentDraft.sections ?? {}),
          contentStudioReview: {
            schema: "content-studio-editorial-review/v1",
            decision: "approved-exact-copy",
            copySha256,
            reviewedAt,
            statement: `I approve the exact held copy identified by SHA-256 ${copySha256} and authorize its governed source implementation in the next package deployment. This decision does not directly change serving state.`
          }
        }
      };
      const saved = await saveDraft(undefined, reviewedDraft);
      if (saved) setMessage("Owner copy review recorded. The row is still held and ready for governed source implementation.");
    };
    const rememberVariableSelection = (element: EventTarget | null) => {
      if (element instanceof HTMLTextAreaElement && (element.dataset.skyField || element.dataset.calendarField)) {
        variableInsertionRef.current = { element, start: element.selectionStart, end: element.selectionEnd };
      }
    };
    const insertDraftToken = (token: string) => {
      const saved = variableInsertionRef.current;
      const element = saved && editorRef.current?.contains(saved.element)
        ? saved.element
        : editorRef.current?.querySelector<HTMLTextAreaElement>('textarea[data-sky-field="body_you"],textarea[data-sky-field="body"],textarea[data-calendar-field]');
      if (!element) return;
      const start = saved?.element === element ? saved.start : element.selectionStart ?? element.value.length;
      const end = saved?.element === element ? saved.end : element.selectionEnd ?? start;
      const next = element.value.slice(0, start) + token + element.value.slice(end);
      const field = element.dataset.skyField;
      const calendarField = element.dataset.calendarField;
      if (field === "body_you" || field === "body_they") setDraft(setPackageSectionField(currentDraft, field, next));
      else if (calendarField) {
        const overview = currentDraft.sections?.calendarOverview && typeof currentDraft.sections.calendarOverview === "object"
          ? currentDraft.sections.calendarOverview as Record<string, unknown>
          : {};
        setDraft({ ...currentDraft, sections: { ...currentDraft.sections, calendarOverview: { ...overview, [calendarField]: next } } });
      } else updateGenericBody(next);
      requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + token.length, start + token.length); });
    };
    const openSharedSeasonSource = (key: string) => openFromEditor(key, () => openRow(
      rows.find(row => row.content_key === key) ?? { id: `package:${key}`, content_key: key, inventory_only: true } as AdminGeneratedContentRow,
      null, "body", undefined, true
    ), { parentDraft: currentDraft, saveReturns: true });
    const updateGenericBody = (body: string) => {
      const nextDraft = invalidateContentStudioReview({ ...currentDraft, body });
      setDraft(isPackageDraft && typeof editablePackageRecord.body === "string"
        ? setPackageRecordField(nextDraft, "body", body)
        : nextDraft);
    };
    const updateSkyArticleFields = (next: Partial<SkyArticleEditableFields>) => {
      setSkyArticleEditor((current) => current ? {
        ...current,
        fields: { ...current.fields, ...next },
        saveState: "unsaved",
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
    const updateSourceLifecycle = async () => {
      if (!currentDraft.id) return;
      const lifecycleAction = sourceIsArchived ? "restore" : "archive";
      if (isPackageDraft) {
        await saveDraft(undefined, currentDraft, lifecycleAction);
      } else {
        await saveDraft(sourceIsArchived ? "DRAFT" : "ARCHIVED", currentDraft, lifecycleAction);
      }
    };
    const updatePackageEditorialNotes = (editorialNotes: string) => {
      setDraft(setPackageRecordField(currentDraft, "editorial_notes", editorialNotes));
    };
    const updateSkyFallbackField = (field: string, value: unknown) => {
      const sections = objectRecord(currentDraft.sections) ?? {};
      const original = objectRecord(sections.packageRecord) ?? {};
      const currentPackageDraft = Object.keys(objectRecord(sections.packageDraft) ?? {}).length
        ? objectRecord(sections.packageDraft) ?? {}
        : structuredClone(original);
      setDraft(invalidateContentStudioReview({
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
      }));
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
      const originalReviewStatus = typeof draftPackageRecord(currentDraft).review_status === "string"
        ? draftPackageRecord(currentDraft).review_status as string
        : "needs_review";
      setDraft({
        ...currentDraft,
        sections: withoutDraft,
        sourceSnapshot: {
          ...(currentDraft.sourceSnapshot ?? {}),
          review_status: originalReviewStatus
        },
        facts: {
          ...(currentDraft.facts ?? {}),
          review_status: originalReviewStatus
        }
      });
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
      const { packageDraft: _discarded, ...sectionsWithoutDraft } = currentDraft.sections ?? {};
      setDraft({
        ...currentDraft,
        headline: typeof original.headline === "string" ? original.headline : currentDraft.headline,
        summary: typeof original.summary === "string" ? original.summary : currentDraft.summary,
        body: typeof original.body === "string" ? original.body : typeof original.body_you === "string" ? original.body_you : currentDraft.body,
        sections: {
          ...sectionsWithoutDraft,
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
    const fallbackHookEditorTitle = fallbackHookDisplayTitle(currentDraft.contentKey);
    const compatibilityIdentity = compatibilityBrowseIdentity(
      currentDraft.contentKey,
      currentDraft.facts,
      currentDraft.sourceSnapshot
    );
    const reverseCompatibility = compatibilityIdentity && selectedRow
      ? reverseCompatibilityRow(selectedRow, rows)
      : null;
    const reverseCompatibilityIdentity = reverseCompatibility
      ? compatibilityBrowseIdentityForRow(reverseCompatibility)
      : null;
    const isCompatibilityCardDraft = currentDraft.blockType === "compatibility_planet_card" || Boolean(compatibilityIdentity);
    const isCompatibilityWorkspaceDraft = isCompatibilityCardDraft
      || sourceSnapshotString(currentDraft.sourceSnapshot, "route") === "friends.compatibility"
      || sourceSnapshotString(currentDraft.sourceSnapshot, "contentFamily").includes("friends.compatibility")
      || /compatibility|compat-/i.test(currentDraft.contentKey);
    const compatibilityDraftPlanet = sourceSnapshotString(currentDraft.sourceSnapshot, "planet")
      || (typeof currentDraft.facts?.planet === "string" ? currentDraft.facts.planet : "");
    const compatibilityDraftReaderSign = sourceSnapshotString(currentDraft.sourceSnapshot, "readerSign")
      || (typeof currentDraft.facts?.readerSign === "string" ? currentDraft.facts.readerSign : "");
    const compatibilityDraftFriendSign = sourceSnapshotString(currentDraft.sourceSnapshot, "otherSign")
      || (typeof currentDraft.facts?.otherSign === "string" ? currentDraft.facts.otherSign : "");
    const updateCompatibilityDraftIdentity = (field: "planet" | "readerSign" | "otherSign", value: string) => {
      const nextIdentity = {
        planet: field === "planet" ? value : compatibilityDraftPlanet,
        readerSign: field === "readerSign" ? value : compatibilityDraftReaderSign,
        otherSign: field === "otherSign" ? value : compatibilityDraftFriendSign
      };
      const isComplete = Boolean(nextIdentity.planet && nextIdentity.readerSign && nextIdentity.otherSign);
      const planetTitle = titleFromKey(nextIdentity.planet);
      const readerTitle = titleFromKey(nextIdentity.readerSign);
      const friendTitle = titleFromKey(nextIdentity.otherSign);
      setDraft({
        ...currentDraft,
        contentKey: isComplete
          ? `authored/compat-pair/${nextIdentity.planet}/${nextIdentity.readerSign}/${nextIdentity.otherSign}`
          : "authored/compat-pair/draft",
        headline: isComplete ? `${planetTitle} compatibility: ${readerTitle} + ${friendTitle}` : "",
        summary: currentDraft.summary,
        facts: {
          ...(currentDraft.facts ?? {}),
          ...nextIdentity
        },
        sourceSnapshot: {
          ...(currentDraft.sourceSnapshot ?? {}),
          ...nextIdentity
        }
      });
    };
    const compatibilityDraftCollision = isNewDraft && compatibilityIdentity
      ? rows.find((row) => row.content_key === currentDraft.contentKey) ?? null
      : null;
    const compatibilityDraftIdentityFields: Array<{
      field: "planet" | "readerSign" | "otherSign";
      label: string;
      value: string;
      options: readonly string[];
    }> = [
      { field: "planet", label: "Planet", value: compatibilityDraftPlanet, options: articlePointFilters.filter(({ key }) => key !== "all" && key !== "other").map(({ key }) => key) },
      { field: "readerSign", label: "Reader sign", value: compatibilityDraftReaderSign, options: natalPlacementSigns },
      { field: "otherSign", label: "Friend sign", value: compatibilityDraftFriendSign, options: natalPlacementSigns }
    ];
    const authoringBrief = isNewDraft
      ? isCompatibilityCardDraft
        ? {
            eyebrow: "Creating reader-facing copy",
            title: "Compatibility card",
            description: "Write the directional card shown to the reader whose sign is listed first. The reversed sign order is a separate record.",
            required: "Compatibility write-up"
          }
        : isVocabularyDraft
          ? {
              eyebrow: "Creating a reusable ingredient",
              title: isCompatibilityWorkspaceDraft ? "Compatibility phrase" : "Reusable phrase",
              description: "Write a short phrase the app can combine with other reviewed copy. This is not a standalone article.",
              required: "Reusable phrase"
            }
          : isFallbackHookDraft
            ? {
                eyebrow: "Creating emergency reader copy",
                title: isCompatibilityWorkspaceDraft ? "Compatibility fallback" : "Fallback passage",
                description: isCompatibilityWorkspaceDraft
                  ? "Write the safe passage used only when the preferred authored compatibility copy is unavailable."
                  : "Write safe reader copy used only when the preferred authored source is unavailable.",
                required: "Fallback reader copy"
              }
            : isTemplateDraft
              ? {
                  eyebrow: "Creating an assembly pattern",
                  title: isCompatibilityWorkspaceDraft ? "Compatibility template" : "Reader-copy template",
                  description: isCompatibilityWorkspaceDraft
                    ? "Arrange literal wording and {{variables}} into the pattern the app uses to build a compatibility card."
                    : "Arrange literal wording and {{variables}} into the pattern the app uses to build reader copy.",
                  required: "Template pattern"
                }
              : isArticleDraft
                ? {
                    eyebrow: "Creating reader-facing copy",
                    title: "Article",
                    description: "Write the complete standalone article, including its title, optional TL;DR, and full body.",
                    required: "Article body"
                  }
              : {
                  eyebrow: "Creating reader-facing copy",
                  title: "Content row",
                  description: "Name the row and write the main copy before moving it through editorial review.",
                  required: "Full passage"
                }
      : null;
    const lunarIdentity = lunarContentIdentity(currentDraft.contentKey);
    const headlineFieldLabel = isSkySummaryDraft ? "Editor name" : lunarIdentity ? "Editor name" : fallbackEditorGuidance?.headlineLabel
      ?? (isAstro101Draft
        ? "Card title"
        : isVocabularyDraft
        ? "Phrase title"
        : isAuthoredPackageCard || isArticleDraft
          ? "Article title"
          : isCompatibilityCardDraft
            ? "Card title"
            : isFallbackHookDraft
              ? "Fallback name"
              : isTemplateDraft
                ? "Template name"
                : "Title / headline");
    const summaryFieldLabel = lunarIdentity ? "Source notes (not reader copy)" : fallbackEditorGuidance?.summaryLabel
      ?? (isAstro101Draft
        ? "Card subtitle"
        : isVocabularyDraft
        ? "Editor note (optional)"
        : isSkyArticleSourceDraft
          ? "TL;DR"
          : isCompatibilityCardDraft
            ? "TL;DR (optional)"
            : isFallbackHookDraft
              ? "When this fallback is used (optional)"
              : isTemplateDraft
                ? "Template purpose (optional)"
                : "TL;DR / summary");
    const bodyFieldLabel = isReferenceDraft ? "Source text" : isSkySummaryDraft ? "Summary wording" : lunarIdentity ? "Full lunar passage" : isYouOnlyNatalExactDraft
      ? "You view exact copy"
      : isVocabularyDraft && isPackageDraft
      ? vocabularyHasTheyVersion ? "You version" : "Variable value"
      : isVocabularyDraft
        ? "Reusable phrase"
        : isAuthoredPackageCard || isArticleDraft
          ? "Article body"
          : fallbackEditorGuidance?.bodyLabel
            ?? (isCompatibilityCardDraft
              ? "Compatibility write-up"
              : isFallbackHookDraft
                ? "Fallback reader copy"
                : isTemplateDraft
                  ? "Template pattern"
                  : "Full passage / body");
    const bodyFieldPlaceholder = isVocabularyDraft
      ? "Write the reusable wording or phrase pattern here."
      : isTemplateDraft
        ? "Example: {{readerSign}} and {{friendSign}} connect through…"
        : isFallbackHookDraft
          ? "Write the complete fallback passage readers can safely receive."
          : isCompatibilityCardDraft
            ? "Write the complete directional compatibility reading."
            : undefined;
    const astro101PublishReady = astro101HasReaderCopy(currentDraft)
      && Boolean(currentDraft.headline.trim())
      && Boolean(astro101SlugFromFacts(currentDraft.facts) || astro101Slugify(currentDraft.headline));
    const publishReady = (isAstro101Draft ? astro101PublishReady : Boolean(currentDraft.body.trim())) && (!isNewDraft || isCmsSurfaceDraft);
    const reviewComplete = currentDraft.status === "REVIEWED" && !draftHasUnsavedChanges;
    const compatibilityNewDraftReady = !isNewDraft || !isCompatibilityWorkspaceDraft || Boolean(
      currentDraft.headline.trim()
      && currentDraft.body.trim()
      && (!isCompatibilityCardDraft || (compatibilityIdentity && !compatibilityDraftCollision))
    );
    const compositionContextValue = compositionEditorContext
      ? compositionEditorContext.sourceField === "headline"
        ? currentDraft.headline
        : compositionEditorContext.sourceField === "body_they"
          ? packageFieldString(currentDraft, "body_they") || currentDraft.body
          : packageFieldString(currentDraft, "body_you") || currentDraft.body
      : "";
    const fieldMetrics = (value: string) => {
      const wordCount = value.trim() ? value.trim().split(/\s+/u).length : 0;
      return `${wordCount} ${wordCount === 1 ? "word" : "words"} · ${value.length} ${value.length === 1 ? "character" : "characters"}`;
    };
    const unchangedSkySource = isSkyPlacementSource && selectedRow?.id.startsWith("package:") && !draftHasUnsavedChanges && !packageHasProposal;
    const editorHeading = !currentDraft.id && currentDraft.contentKey.startsWith("authored/calendar-weekly-moon/") ? `New ${lunarIdentity?.title ?? "Moon-in-sign write-up"}` : isSkySummaryDraft || selectedRow?.id.startsWith("package:") ? `Edit ${currentDraft.headline}` : currentDraft.id
      ? isVocabularyDraft
        ? "Edit phrase"
        : compatibilityIdentity
          ? `Edit ${compatibilityIdentity.title}`
        : isTemplateDraft
          ? `Edit ${selectedRow ? rowTitle(selectedRow) : currentDraft.headline || "template"}`
        : isArticleDraft
          ? `Edit ${currentDraft.headline || "article"}`
          : fallbackHookEditorTitle
            ? `Edit ${fallbackHookEditorTitle}`
            : selectedRow
              ? `Edit ${rowTitle(selectedRow)}`
              : currentDraft.headline.trim()
                ? `Edit ${currentDraft.headline.trim()}`
                : `Edit ${titleFromKey(currentDraft.contentKey)}`
      : currentDraft.sections?.packageOriginalRecord
        ? `Edit ${currentDraft.headline || "packaged source"}`
      : isVocabularyDraft
        ? "Create reusable phrase"
        : isArticleDraft
          ? "Create article"
          : isCompatibilityCardDraft
            ? "Create compatibility card"
            : isFallbackHookDraft
              ? isExactPersonalTransitDraft
                ? (isTransitNatalSituationKey(currentDraft.contentKey)
                  ? (currentDraft.id ? "Edit this six-part situation" : "Write this six-part situation")
                  : `Write ${currentDraft.headline || "this transit"}`)
                : isCompatibilityWorkspaceDraft ? "Create compatibility fallback" : "Create fallback passage"
              : isTemplateDraft
                ? isCompatibilityWorkspaceDraft ? "Create compatibility template" : "Create reader-copy template"
                : "Create saved row";
    const editorUseLabel = isSkyPlacementSource ? (currentDraft.contentKey.includes("/retrograde/") ? "Retrograde writing" : "Shared placement writing") : lunarContentIdentity(currentDraft.contentKey)?.destination ?? aspectContext?.label
      ?? (selectedRow
        ? contentCategoryForRow(selectedRow)
        : isArticleDraft
          ? "Articles"
          : isVocabularyDraft
            ? "Vocabulary & phrases"
            : isTemplateDraft
              ? "Templates & assembly"
              : "Content Studio");
    const editorReaderDestination =
      activePage === "skyWriteups" && skyWriteupWorkspaceView === "transits-to-natal"
        ? friendsTransitAudience ? "Friends → Transits → Active for {{Name}}" : "You → Personal Transits"
        : activePage === "skyWriteups" && skyWriteupWorkspaceView === "house-transits"
          ? friendsTransitAudience ? "Friends → Transits → Where it lands" : "You → House Transits"
          : friendsBetweenYouTwoWorkspace
            ? "Friends → Transits → Between you two"
            : null;
    const isNewCompatibilityWorkspaceDraft = isNewDraft && isCompatibilityWorkspaceDraft;
    const showVocabularyGuidance = isVocabularyDraft && !isNewCompatibilityWorkspaceDraft;
    const showFallbackGuidance = Boolean(fallbackEditorGuidance) && !isNewCompatibilityWorkspaceDraft;
    const showTemplateGuidance = isTemplateDraft && !isNewCompatibilityWorkspaceDraft;
    const hasEditorBrief = Boolean(authoringBrief)
      || showVocabularyGuidance
      || Boolean(isVocabularyDraft && vocabularyUsage)
      || showFallbackGuidance
      || isAuthoredPackageCard
      || showTemplateGuidance;
    // One line of orientation above the copy fields; the full guidance stays one click away.
    const editorBrief: { title: string; hint: string | null } = showFallbackGuidance && fallbackEditorGuidance
      ? { title: fallbackEditorGuidance.title, hint: fallbackEditorGuidance.writingRule }
      : authoringBrief
        ? { title: authoringBrief.title, hint: authoringBrief.description }
        : showVocabularyGuidance
          ? { title: isPackageDraft ? "Edit this variable value" : "Create a reusable phrase", hint: vocabularyUsage ? `Used by the app as ${vocabularyUsage.label}` : null }
          : isAuthoredPackageCard
            ? { title: "Exact source shown in Reader Preview", hint: "Saving updates this row and the Composition Map preview together." }
            : showTemplateGuidance
              ? { title: "Assembly pattern, not final prose", hint: "Check the complete result in Reader preview before publishing." }
              : { title: "How this row is used", hint: null };
    const isSharedSeasonSource = isZodiacSeasonSourceKey(currentDraft.contentKey);
    const seasonSourceUsage = "Calendar, Sky and other supported templates";
    const editorDetailsSummary = [
      isSharedSeasonSource ? "Shared zodiac season source" : currentDraft.surface,
      currentDraft.mode,
      currentDraft.lane,
      isPackageDraft ? packageReviewStatusLabel(packageReviewStatus) : null
    ].filter(Boolean).join(" · ");
    const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (isLoading) return;
        if (templateVariableReferenceOpen) {
          if (selectedTemplateVariableSourceId) setSelectedTemplateVariableSourceId(null);
          else if (selectedTemplateVariableName) setSelectedTemplateVariableName(null);
          else closeVariablesRail();
          return;
        }
        closeEditor();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = editorRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [href], [tabindex]:not([tabindex="-1"])'
      )).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    return (
      <>
      <StudioButton type="button" className="admin-editor-backdrop" aria-label="Close editor" onClick={closeEditor} disabled={isLoading} />
      <aside ref={editorRef} className={`admin-editor-panel admin-review-detail${templateVariableReferenceOpen ? " has-variables-rail" : ""}`} role="dialog" aria-modal="true" aria-label="Generated content editor" aria-busy={isLoading} onKeyDown={handleEditorKeyDown} onSelectCapture={event => rememberVariableSelection(event.target)} onBlurCapture={event => rememberVariableSelection(event.target)}>
        {skyWriteupParent && (
          <StudioButton type="button" className="admin-sky-writeup-back" onClick={returnToSkyWriteup} disabled={isLoading}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to {rowTitle(skyWriteupParent)}
          </StudioButton>
        )}
        <header className="admin-editor-toolbar admin-editor-header">
          <h2>{editorHeading}</h2>
          <StudioButton className="admin-editor-close" type="button" onClick={closeEditor} disabled={isLoading} autoFocus aria-label="Close" title="Close editor">
            <X size={18} aria-hidden="true" />
          </StudioButton>
          <div className="admin-editor-meta">
            <div className="admin-editor-context-line">
              <ContentLiveStatusBadge label="Reader status" row={editorStatusRow} unsaved={draftHasUnsavedChanges && !(!currentDraft.id && matchesBuiltinSummary)} />
              <span className={aspectContext ? "admin-aspect-context-pill" : undefined} title={aspectContext?.detail}>{editorUseLabel}</span>
              {editorReaderDestination && editorReaderDestination !== editorUseLabel && <span className="admin-editor-reader-destination">{editorReaderDestination}</span>}
            </div>
            <div className="admin-editor-toolbar-actions">
              {(variableReferences.length > 0 || hasTransitTemplatePreviewContext || isTemplateDraft || /^sky-placement\/article\/[^/]+\/[^/]+$/u.test(currentDraft.contentKey) || currentDraft.contentKey.startsWith("slot-template/calendar/")) && (
                <StudioButton type="button" onClick={() => {
                  // Placement articles use their scoped picker and textarea cursor.
                  const articlePicker = editorRef.current?.querySelector<HTMLDetailsElement>("[data-sky-article-variable-picker]");
                  if (articlePicker) {
                    setTemplateVariableReferenceOpen(false);
                    articlePicker.open = true;
                    articlePicker.scrollIntoView({ block: "start", behavior: "smooth" });
                    articlePicker.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
                    return;
                  }
                  setSelectedTemplateVariableName(null);
                  setSelectedTemplateVariableSourceId(null);
                  setTemplateVariableReferenceOpen(true);
                }}>
                  <Braces size={16} aria-hidden="true" />
                  {/^sky-placement\/article\/[^/]+\/[^/]+$/u.test(currentDraft.contentKey) ? "Variables" : <>{isTemplateDraft ? "Reader preview & variables" : "Variables"} ({variableReferences.length})</>}
                </StudioButton>
              )}
            </div>
          </div>
        </header>
        <section className="admin-post-editor">
          {isPackageDraft && !skyFallbackEditor && <Suspense fallback={<PageLoading message="Loading variables…" />}><StudioVariableInsert variables={customVariableLibrary.variables} context={effectiveSkyFallback} disabled={isLoading} loading={customVariableLibrary.loading} error={customVariableLibrary.error} onRetry={customVariableLibrary.reload} onInsert={insertDraftToken} /></Suspense>}

          {guidedReviewKey === currentDraft.contentKey && (
            <section className="admin-guided-content-review" aria-label="Guided unresolved-content review">
              <div>
                <p className="admin-eyebrow">Opened from Unresolved Content</p>
                <h3>Review this exact horoscope</h3>
                <p>You are in the exact held row you selected. The populated <strong>Headline</strong> and <strong>Body</strong> fields below are the copy under review.</p>
              </div>
              <ol>
                <li><strong>Read:</strong> the Headline and the complete Body from beginning to end.</li>
                <li><strong>Check:</strong> astrological accuracy, your preferred voice, repeated ideas, and any unfinished placeholders.</li>
                <li><strong>If you edit:</strong> click Save held draft, then reread the saved copy.</li>
                <li><strong>When it is correct:</strong> record owner copy review below. The row stays at <code>needs_review</code> and cannot serve.</li>
              </ol>
              <div className="admin-guided-review-decision" role="status">
                <strong>{guidedReviewDecision ? "Owner copy review recorded" : draftHasUnsavedChanges ? "Save before completing review" : "Ready for your decision"}</strong>
                <span>{guidedReviewDecision
                  ? `Exact copy SHA-256: ${String(guidedReviewDecision.copySha256 ?? "unavailable")}`
                  : draftHasUnsavedChanges
                    ? "Your edits are only in this browser until you save them."
                    : "This records approval of the exact held copy for a later governed source update. It does not publish."}</span>
              </div>
              <code>{currentDraft.contentKey}</code>
              <div className="admin-toolbar-actions">
                {!guidedReviewDecision && <StudioButton className="admin-primary-button" type="button" onClick={() => void completeGuidedContentReview()} disabled={isLoading || draftHasUnsavedChanges || !currentDraft.body.trim()}>
                  <Check size={16} aria-hidden="true" />
                  Record owner copy review
                </StudioButton>}
                <StudioButton type="button" onClick={() => navigateAdminPage("unresolvedContent")}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  Back to Unresolved Content
                </StudioButton>
              </div>
            </section>
          )}
          {hasTransitContactContext && (
            <div className="admin-editor-guidance" aria-label="Selected transit context">
              <p>Selected transit: {titleFromKey(transitNatalPlanet)} {transitNatalAspect} natal {titleFromKey(transitNatalPoint)}{transitNatalSign ? `, ${titleFromKey(transitNatalPlanet)} in ${titleFromKey(transitNatalSign)}` : ""}{transitNatalTransitHouse ? `, ${ordinalHouse(transitNatalTransitHouse)} house` : ""}{transitNatalNatalHouse ? `, natal ${ordinalHouse(transitNatalNatalHouse)} house` : ""}.</p>
              <p><code>{currentDraft.contentKey}</code></p>
              <fieldset className="admin-natal-placement-selectors admin-filter-form admin-filter-form--three" aria-label="Write-up contact">
                <legend className="sr-only">Write-up contact</legend>
                <label>
                  <span>Transiting planet</span>
                  <AdminSelect aria-label="Write-up transiting planet" value={transitNatalPlanet} onChange={(event) => updateTransitNatalSelection({ planet: event.target.value as TransitNatalPlanet | "" })}>
                    <option value="">Choose transiting planet</option>
                    {transitNatalPlanets.map((planet) => <option value={planet} key={planet}>{titleFromKey(planet)}</option>)}
                  </AdminSelect>
                </label>
                <label>
                  <span>Aspect</span>
                  <AdminSelect aria-label="Write-up aspect" value={transitNatalAspect} onChange={(event) => updateTransitNatalSelection({ aspect: event.target.value as TransitNatalAspect | "" })}>
                    <option value="">Choose aspect</option>
                    {(transitNatalPoint === "lilith" ? ["conjunction", "opposition"] : transitNatalAspects).map((aspect) => <option value={aspect} key={aspect}>{titleFromKey(aspect)}</option>)}
                  </AdminSelect>
                </label>
                <label>
                  <span>Natal planet or point</span>
                  <AdminSelect aria-label="Write-up natal planet or point" value={transitNatalPoint} onChange={(event) => updateTransitNatalSelection({ natalPoint: event.target.value as TransitNatalPoint | "" })}>
                    <option value="">Choose natal planet or point</option>
                    {transitNatalPointSelectOptions()}
                  </AdminSelect>
                </label>
                <label>
                  <span>Current sign</span>
                  <AdminSelect aria-label="Write-up current sign" value={transitNatalSign} onChange={(event) => updateTransitNatalSelection({ sign: event.target.value as TransitNatalSign | "" })}>
                    <option value="">Leave blank for three-part aspect</option>
                    {transitNatalSigns.map((sign) => <option value={sign} key={sign}>{titleFromKey(sign)}</option>)}
                  </AdminSelect>
                </label>
                <label>
                  <span>Transit house</span>
                  <AdminSelect aria-label="Write-up transit house" value={transitNatalTransitHouse} onChange={(event) => updateTransitNatalSelection({ transitHouse: event.target.value as TransitNatalHouse | "" })}>
                    <option value="">Leave blank for three-part aspect</option>
                    {transitNatalHouses.map((house) => <option value={house} key={house}>{house}</option>)}
                  </AdminSelect>
                </label>
                <label>
                  <span>Natal house</span>
                  <AdminSelect aria-label="Write-up natal house" value={transitNatalNatalHouse} onChange={(event) => updateTransitNatalSelection({ natalHouse: event.target.value as TransitNatalHouse | "" })}>
                    <option value="">Leave blank for three-part aspect</option>
                    {transitNatalHouses.map((house) => <option value={house} key={house}>{house}</option>)}
                  </AdminSelect>
                </label>
              </fieldset>
              <p className="admin-field-hint">{isTransitNatalSituationKey(currentDraft.contentKey)
                ? <>This editor is the six-part situation. Changing any of the six fields opens that destination. Insert <code>{"{{aspectWord}}"}</code> and <code>{"{{untilDate}}"}</code> where the calculated aspect and window belong.</>
                : <>This editor is the three-part aspect. Set current sign and both houses to open the six-part situation instead. Insert <code>{"{{aspectWord}}"}</code> and <code>{"{{untilDate}}"}</code> where the calculated aspect and window belong.</>}</p>
              <p>{isNewDraft && isExactPersonalTransitDraft && !currentDraft.sections?.packageOriginalRecord
                ? (packageFieldString(currentDraft, "body_you").trim() || currentDraft.body.trim()
                  ? (isExactTransitReturnDraft
                    ? "The You field below starts from existing return writing. Save keeps a draft for this return only. Approve & publish makes it live."
                    : isTransitNatalSituationKey(currentDraft.contentKey)
                      ? "You and Friend below start from existing aspect writing. Save keeps a draft for this six-part situation only. Approve & publish makes it live. The three-part aspect write-up stays unchanged."
                      : "You and Friend below start from the shared fallback currently in the preview. Save keeps a draft for this aspect only. Approve & publish makes it live. The shared source is not changed.")
                  : (isExactTransitReturnDraft
                    ? "No write-up is saved for this return yet. The You field below is for this return only. Save keeps a draft. Approve & publish makes it live."
                    : isTransitNatalSituationKey(currentDraft.contentKey)
                      ? "No write-up is saved for this six-part situation yet. You and Friend below are for this sign and houses only. Save keeps a draft. Approve & publish makes it live."
                      : "No write-up is saved for this exact contact yet. You and Friend below are for this aspect only. Save keeps a draft. Approve & publish makes it live."))
                : isExactPersonalTransitDraft
                  ? (isExactTransitReturnDraft
                    ? "The You field belongs to this return. Changing planet, aspect, or natal point opens that contact instead. Signs, houses, and dates come from the calculated chart."
                    : isTransitNatalSituationKey(currentDraft.contentKey)
                      ? "These You and Friend fields belong to this six-part situation. Save writes this key only."
                      : "These You and Friend fields belong to the selected three-part aspect. Signs and houses are part of the six-part destination, not this save.")
                : "This source is shared by matching readings. Edit its words here; signs, houses, and dates come from the calculated chart. Variables opens a preview using the transit selected above."}</p>
            </div>
          )}
          {(isBondEffectDraft || (isExactPersonalTransitDraft && isDynamicTransitNatalExactKey(currentDraft.contentKey))) && <Suspense fallback={null}><PersonalTransitAiWriter
            defaultOpen
            transiting={isBondEffectDraft ? bondEffectPlanet : transitNatalPlanet}
            natal={isBondEffectDraft ? "" : transitNatalPoint}
            aspect={isBondEffectDraft ? bondEffectKind : transitNatalAspect}
            sign={isBondEffectDraft ? "" : transitNatalSign}
            transitHouse={isBondEffectDraft ? "" : transitNatalTransitHouse}
            natalHouse={isBondEffectDraft ? "" : transitNatalNatalHouse}
            contentKey={currentDraft.contentKey}
            youText={isExactTransitReturnDraft
              ? (packageFieldString(currentDraft, "body_you") || packageFieldString(currentDraft, "body") || currentDraft.body)
              : (packageFieldString(currentDraft, "body_you") || currentDraft.body)}
            friendText={isExactTransitReturnDraft ? "" : packageFieldString(currentDraft, "body_they")}
            disabled={isLoading}
            onUseYou={(text) => setDraft((current) => {
              if (!current) return current;
              if (current.contentKey.startsWith("authored/transit-return/")) {
                return setPackageSectionField(setPackageSectionField(current, "body", text), "body_you", text);
              }
              return setPackageSectionField(current, "body_you", text);
            })}
            onUseFriend={(text) => setDraft((current) => current && !current.contentKey.startsWith("authored/transit-return/")
              ? setPackageSectionField(current, "body_they", text)
              : current)}
            onOpenNext={isBondEffectDraft ? undefined : (next) => updateTransitNatalSelection({
              planet: next.transiting as TransitNatalPlanet,
              aspect: next.aspect as TransitNatalAspect,
              natalPoint: next.natal as TransitNatalPoint
            })}
          /></Suspense>}
          {isNewDraft && isCompatibilityCardDraft && (
            <fieldset className="admin-metadata-fields admin-compatibility-identity-fields" aria-label="Compatibility card identity">
              <legend>Choose the exact card first</legend>
              <p className="admin-field-hint">Choose the planet and direction. The reader sign comes first.</p>
              {compatibilityDraftIdentityFields.map(({ field, label, value, options }) => (
                <label className="admin-metadata-field" key={field}>
                  <span>{label}</span>
                  <AdminSelect aria-label={`Compatibility card ${label.toLowerCase()}`} value={value} onChange={(event) => updateCompatibilityDraftIdentity(field, event.target.value)}>
                    <option value="">Choose {label.toLowerCase()}</option>
                    {options.map((option) => <option key={option} value={option}>{titleFromKey(option)}</option>)}
                  </AdminSelect>
                </label>
              ))}
              {compatibilityIdentity && (
                <div className="admin-compatibility-identity-preview" role="status">
                  <strong>{compatibilityIdentity.title}</strong>
                  <span>{compatibilityIdentity.detail}</span>
                </div>
              )}
              {compatibilityDraftCollision && (
                <div className="admin-inline-warning" role="alert">
                  <strong>This card already exists.</strong>
                  <StudioButton type="button" onClick={() => void openFromEditor(compatibilityDraftCollision.content_key, () => openRow(compatibilityDraftCollision), { parentDraft: currentDraft })}>Open saved record</StudioButton>
                </div>
              )}
            </fieldset>
          )}
          {ownerApprovedArticleKey && (
            <section className="admin-editor-guidance" aria-label="Reader source status">
              <strong>{ownerApprovedReplacementLabel}</strong>
              <p>
                Readers receive <code>{ownerApprovedArticleKey}</code>, not this generated candidate.
              </p>
              <StudioButton
                type="button"
                onClick={() => void openOwnerApprovedSkyPlacementArticle(ownerApprovedArticleKey, currentDraft.headline || titleFromKey(currentDraft.contentKey))}
                disabled={isLoading}
              >
                Open owner-approved source
              </StudioButton>
            </section>
          )}
          {compatibilityIdentity && !isNewDraft && (
            <section className="admin-editor-guidance admin-contextual-editor-guidance" aria-label="Compatibility record identity">
              <p className="admin-eyebrow">Exact compatibility record</p>
              <strong>{compatibilityIdentity.title}</strong>
              <p><strong>You:</strong> {compatibilityIdentity.readerSign} · <strong>Friend:</strong> {compatibilityIdentity.friendSign}</p>
              <p>The arrow shows the direction of the saved copy. Reversing the two signs opens a different record because the reader and friend wording changes.</p>
              <div className="admin-toolbar-actions admin-compatibility-reverse-actions">
                <StudioButton
                  type="button"
                  onClick={() => {
                    if (!reverseCompatibility) return;
                    void openFromEditor(reverseCompatibility.content_key, () => openRow(reverseCompatibility), { parentDraft: currentDraft });
                    setMessage(`${reverseCompatibilityIdentity?.title ?? "Reverse compatibility record"} opened.`);
                  }}
                  disabled={!reverseCompatibility || draftHasUnsavedChanges || isLoading}
                  title={!reverseCompatibility
                    ? "No saved reverse record is available for this planet and sign pair."
                    : draftHasUnsavedChanges
                      ? "Save your changes before opening the reverse record."
                      : `Open ${reverseCompatibilityIdentity?.title ?? "the reverse compatibility record"}`}
                >
                  <ArrowLeftRight size={16} aria-hidden="true" />
                  {reverseCompatibilityIdentity
                    ? `Open reverse · ${reverseCompatibilityIdentity.readerSign} → ${reverseCompatibilityIdentity.friendSign}`
                    : "Reverse record unavailable"}
                </StudioButton>
              </div>
            </section>
          )}
          {hasEditorBrief && (
            <details className="admin-editor-brief" aria-label="Editing guidance">
              <AdminDisclosureSummary>
                <span className="admin-editor-brief-line">
                  <strong>{editorBrief.title}</strong>
                </span>
              </AdminDisclosureSummary>
              <div className="admin-editor-brief-body">
              {authoringBrief && (
                <section className="admin-editor-guidance admin-authoring-brief" aria-label="What you are creating">
                  <p className="admin-eyebrow">{authoringBrief.eyebrow}</p>
                  <strong>{authoringBrief.title}</strong>
                  <p>{authoringBrief.description}</p>
                  <div className="admin-authoring-steps" role="list" aria-label="Authoring steps">
                    <span role="listitem"><b>1</b> Write {authoringBrief.required.toLowerCase()}</span>
                    <span role="listitem"><b>2</b> Save draft</span>
                    <span role="listitem"><b>3</b> Review, then publish</span>
                  </div>
                </section>
              )}
              {isVocabularyDraft && !(isNewDraft && isCompatibilityWorkspaceDraft) && (
                <div className="admin-editor-guidance" aria-label="Phrase authoring guidance">
                  <strong>{isPackageDraft ? "Edit this variable value" : "Create a reusable phrase"}</strong>
                  <p>{isPackageDraft
                    ? "This is one saved ingredient the app can insert into a larger fallback passage. Edit the variable value below; the empty article fields and publishing controls do not apply to this row."
                    : "Choose a section, name the phrase, then write the reusable wording. The internal key is generated from the section and title so phrases stay grouped in the dashboard."}</p>
                </div>
              )}
              {isVocabularyDraft && vocabularyUsage && (
                <section className="admin-content-role-panel admin-vocabulary-usage" aria-label="Variable usage">
                  <div>
                    <p className="admin-eyebrow">Used by the app as</p>
                    <h3>{vocabularyUsage.label}</h3>
                  </div>
                  <p>{vocabularyUsage.description}</p>
                  <p><strong>Reader behavior:</strong> the app combines this phrase with other approved ingredients. It is not shown as a standalone article.</p>
                </section>
              )}
              {fallbackEditorGuidance && !(isNewDraft && isCompatibilityWorkspaceDraft) && (
                <section className="admin-editor-guidance admin-contextual-editor-guidance" aria-label="How this source is used">
                  <p className="admin-eyebrow">{fallbackEditorGuidance.area}</p>
                  <strong>{fallbackEditorGuidance.title}</strong>
                  <p>{fallbackEditorGuidance.description}</p>
                  {fallbackEditorGuidance.example && (
                    <div className="admin-contextual-copy-example">
                      <span>Example in a reading</span>
                      <q>{fallbackEditorGuidance.example}</q>
                    </div>
                  )}
                  <p><strong>Writing shape:</strong> {fallbackEditorGuidance.writingRule}</p>
                  {fallbackEditorGuidance.audienceLabel && (
                    <div className="admin-editor-audience-note" role="note" aria-label={fallbackEditorGuidance.audienceLabel}>
                      <strong>{fallbackEditorGuidance.audienceLabel}</strong>
                      <p>{fallbackEditorGuidance.audienceHint}</p>
                    </div>
                  )}
                  {isBondEffectDraft && (
                    <p>
                      This row is only the opening on the Friends Between you two page. The assembled page below also includes What this activates and a calculated astrology line.
                    </p>
                  )}
                </section>
              )}
              {isAuthoredPackageCard && (
                <div className="admin-editor-guidance" aria-label="Reader source guidance">
                  <strong>Edit the exact source shown in Reader Preview</strong>
                  <p>The article headline and body below are the saved fields used by the selected template. Saving updates this source row and the Composition Map preview together.</p>
                </div>
              )}
              {isTemplateDraft && !(isNewDraft && isCompatibilityWorkspaceDraft) && (
                <div className="admin-editor-guidance" aria-label="Template source guidance">
                  <strong>Assembly pattern, not final prose</strong>
                  <p>The template pattern combines fixed words, <code>{"{{variables}}"}</code>, and reviewed source phrases. Use Reader Preview to check the complete result before publishing the pattern.</p>
                </div>
              )}
              </div>
            </details>
          )}
          {compositionEditorContext && (
            <section className="admin-editor-guidance admin-contextual-editor-guidance admin-reader-sentence-context" aria-label="Reader sentence context">
              <p className="admin-eyebrow">In the reader preview · {compositionEditorContext.audience === "they" ? "They" : "You"}</p>
              <strong>{compositionEditorContext.templateLabel} · {compositionEditorContext.fieldLabel}</strong>
              <div className="admin-contextual-copy-example">
                <span>Full reader sentence</span>
                <q>
                  {compositionEditorContext.before}
                  <mark>{compositionContextValue || compositionEditorContext.active}</mark>
                  {compositionEditorContext.after}
                </q>
              </div>
              <p>The highlighted words are the source you are editing. The surrounding words come from the template and other variables.</p>
            </section>
          )}
          {skyFallbackEditor && (
            <section className={`admin-fallback-diagnostic-panel${isSkyPlacementSource ? " admin-sky-placement-source-workspace" : ""}`} aria-label={skyFallbackEditor.title}>
              <header className="admin-sky-related-heading admin-fallback-diagnostic-heading">
                {!isSkyPlacementSource && <div>
                  <p className="admin-eyebrow">Reader source workspace</p>
                  <h3>{skyFallbackContentIdentity?.title ?? skyFallbackEditor.title}</h3>
                  <p><strong>{skyFallbackContentIdentity?.typeLabel ?? skyFallbackEditor.title}.</strong> Save & publish makes this exact revision live. Save draft keeps unfinished changes for later.</p>
                </div>}
                <details className="admin-workspace-details">
                  <AdminDisclosureSummary>Source details</AdminDisclosureSummary>
                  <dl className="admin-hook-pattern-list">
                    <div><dt>Serving key</dt><dd><code>{currentDraft.contentKey}</code></dd></div>
                    <div><dt>Render policy</dt><dd>{String(effectiveSkyFallback.render_policy ?? "Package renderer")}</dd></div>
                    <div><dt>Current approval</dt><dd>{String(packageRecord.review_status ?? packageReviewStatus)}</dd></div>
                    <div><dt>Proposal</dt><dd>{skyFallbackChanges.length ? `${skyFallbackChanges.length} changed field${skyFallbackChanges.length === 1 ? "" : "s"}` : "No changes"}</dd></div>
                  </dl>
                  <p className="admin-field-hint" role="note"><strong>Safe editing boundary:</strong> Save draft keeps your changes Not live. Save &amp; publish approves and publishes the current revision; the original approved source remains in version history.</p>
                </details>
              </header>

              <Suspense fallback={<PageLoading message="Loading writing editor…" />}>
                <SkyFallbackFieldsEditor key={currentDraft.contentKey} contentKey={currentDraft.contentKey}
                  kind={skyFallbackEditor.kind} fields={skyFallbackEditor.fields} initialField={skyWritingContext.fieldPath} selection={skyWritingContext.selection}
                  source={effectiveSkyFallback}
                  onLoadSource={async key => {
                    const row = await hydrateGeneratedContentRow({ id: `package:${key}`, content_key: key, inventory_only: true } as AdminGeneratedContentRow);
                    return row ? effectivePackageRecord(row.sections) : undefined;
                  }}
                  disabled={isLoading} onChange={updateSkyFallbackField}
                  onOpenSource={(key, path) => isZodiacSeasonSourceKey(key) ? void openSharedSeasonSource(key) : void openFromEditor(key, () => openRow(
                    rows.find(row => row.content_key === key) ?? { id: `package:${key}`, content_key: key, inventory_only: true } as AdminGeneratedContentRow,
                    null, path, skyWritingContext.selection
                  ), { parentDraft: currentDraft })} />
              </Suspense>

              {isSkyV4StudioRecord && (
                <SkyChangesContainer className="admin-workspace-details">
                  {isSkyPlacementSource && <AdminDisclosureSummary>Source history and validation</AdminDisclosureSummary>}
                <Suspense fallback={null}>
                  <SkyV4StudioReviewPanel
                    secret={secret}
                    contentKey={currentDraft.contentKey}
                    effectiveRecord={effectiveSkyFallback}
                    showGroupedEditor={false}
                    disabled={isLoading}
                  />
                </Suspense>
                </SkyChangesContainer>
              )}

              {!isSkyPlacementSource && <section className="admin-hook-detail-section admin-copy-preview" aria-label="Rendered fallback preview">
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
                  <p className="admin-field-hint">Unfilled tokens remain visible until this workspace is opened from a calculated Sky occurrence.</p>
                )}
              </section>}

              {skyFallbackEditor.variables.length > 0 && (
                <section className="admin-hook-detail-section admin-calculated-facts" aria-label="Calculated facts">
                  <div>
                    <p className="admin-eyebrow">Engine-supplied values</p>
                    <h3>Calculated facts</h3>
                    <p>These tokens are the only variables. The article fields below are complete reader paragraphs.</p>
                  </div>
                  <label className="admin-field-wide">
                    <span>Insert into article field</span>
                    <AdminSelect aria-label="Calculated fact target field" value={effectiveSkyFallbackVariableTarget} onChange={(event) => setSkyFallbackVariableTarget(event.target.value)}>
                      {skyFallbackEditor.fields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                    </AdminSelect>
                  </label>
                  <div className="admin-token-list" role="group" aria-label="Available calculated facts">
                    {skyFallbackEditor.variables.map((variable) => (
                      <StudioButton type="button" key={variable} onClick={() => insertSkyFallbackVariable(variable)}>{`{{${variable}}}`}</StudioButton>
                    ))}
                  </div>
                </section>
              )}


              {skyFallbackChanges.length > 0 && (
                <SkyChangesContainer className="admin-hook-detail-section" aria-label="Review fallback changes">
                  {isSkyPlacementSource && <AdminDisclosureSummary>Review changes ({skyFallbackChanges.length})</AdminDisclosureSummary>}
                  <div className="admin-fallback-diagnostic-heading">
                    <div>
                      <p className="admin-eyebrow">Review diff</p>
                      <h3>{skyFallbackChanges.length === 1 ? "1 proposed change" : `${skyFallbackChanges.length} proposed changes`}</h3>
                    </div>
                    <div className="admin-toolbar-actions">
                      <StudioButton type="button" className="admin-secondary-button" onClick={exportSkyFallbackProposal}>Export proposal</StudioButton>
                      <StudioButton type="button" className="admin-secondary-button" onClick={discardSkyFallbackProposal}>Discard proposal</StudioButton>
                    </div>
                  </div>
                  {skyFallbackChanges.map((change) => (
                    <article className="admin-sky-article-diff" key={change.key}>
                      <div><strong>{change.label} · package original</strong><p>{change.before}</p></div>
                      <div><strong>{change.label} · proposal</strong><p>{change.after}</p></div>
                    </article>
                  ))}
                </SkyChangesContainer>
              )}
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
                  <StudioInput
                    aria-label="Sky article reference date"
                    type="date"
                    value={skyArticleEditionForm.referenceDate}
                    onChange={(event) => {
                      if (hasPendingArticleChanges() && !window.confirm("Discard the unsaved article draft before changing its date?")) return;
                      editorSessionRef.current += 1;
                      skyArticleWorkspaceAutosaveSequenceRef.current += 1;
                      workspaceAutosaveRowRef.current = null;
                      setSkyArticleEditionForm({
                      ...skyArticleEditionForm,
                      referenceDate: event.target.value,
                      facts: null,
                      tldr: "",
                      slotValues: {},
                      slotGeneration: null,
                      factBlockedSlots: [],
                      saveState: "idle",
                      workspaceId: null
                    });
                    }}
                  />
                  <small className="admin-field-hint">The ephemeris uses this date to identify the active sign and complete residency window.</small>
                </label>
                <StudioButton type="button" onClick={() => void loadSkyArticleEditionFacts(selectedRow)} disabled={isLoading}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Load calculated facts
                </StudioButton>
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
                    <StudioButton
                      type="button"
                      onClick={() => void generateSkyArticleEditionSlots(selectedRow)}
                      disabled={isLoading}
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      Generate unfinished fields
                    </StudioButton>
                    <p className="admin-field-hint">
                      Explicit action only. Sends this approved template, calculated facts, and unfinished field names to the configured writing provider. Fixed owner prose is never rewritten.
                    </p>
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
                    <StudioTextarea
                      aria-label="Sky article edition TL;DR"
                      value={skyArticleEditionForm.tldr}
                      onChange={(event) => setSkyArticleEditionForm({
                        ...skyArticleEditionForm,
                        tldr: event.target.value,
                        saveState: "unsaved"
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
                          <StudioTextarea
                            aria-label={`Template field ${placeholder.name}`}
                            value={skyArticleEditionForm.slotValues[placeholder.name] ?? ""}
                            disabled={engineOwned}
                            onChange={(event) => setSkyArticleEditionForm({
                              ...skyArticleEditionForm,
                              slotValues: { ...skyArticleEditionForm.slotValues, [placeholder.name]: event.target.value },
                              saveState: "unsaved"
                            })}
                            placeholder={placeholder.description || `Write the ${placeholder.name} edition passage.`}
                          />
                          {placeholder.description && <small className="admin-field-hint">{placeholder.description}</small>}
                          {!engineOwned && skyArticleEditionForm.slotValues[placeholder.name] === undefined && (
                            <StudioButton type="button" onClick={() => setSkyArticleEditionForm({
                              ...skyArticleEditionForm,
                              slotValues: { ...skyArticleEditionForm.slotValues, [placeholder.name]: "" },
                              saveState: "unsaved"
                            })}>
                              Deliberately leave this block blank
                            </StudioButton>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <div className="admin-toolbar-actions">
                    <StudioButton
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
                    </StudioButton>
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
                  {skyArticleEditor.error && <div>
                    <p className="admin-inline-error">{skyArticleEditor.error}</p>
                    <StudioButton type="button" onClick={() => updateSkyArticleFields({})}>Retry save</StudioButton>
                  </div>}

                  <label className="admin-title-field">
                    <span>Headline</span>
                    <StudioInput
                      aria-label="Sky article headline"
                      value={skyArticleEditor.fields.headline}
                      onChange={(event) => updateSkyArticleFields({ headline: event.target.value })}
                    />
                  </label>
                  <label className="admin-review-copy-editor">
                    <span>TL;DR</span>
                    <StudioTextarea
                      aria-label="Sky article TL;DR"
                      value={skyArticleEditor.fields.tldr}
                      onChange={(event) => updateSkyArticleFields({ tldr: event.target.value })}
                    />
                    <small className="admin-field-hint">Written explicitly. It appears in the Transits list and at the top of the full reading.</small>
                  </label>
                  <label className="admin-review-copy-editor">
                    <span>General article</span>
                    <StudioTextarea
                      aria-label="Sky article general copy"
                      value={skyArticleEditor.fields.body}
                      onChange={(event) => updateSkyArticleFields({ body: event.target.value })}
                    />
                  </label>

                  <details className="admin-workspace-details admin-sky-related-group admin-diagnostics-details">
                    <AdminDisclosureSummary>
                      <span>House passages</span>
                      <strong>{skyArticleEditor.fields.housePassages.length}/12 complete</strong>
                    </AdminDisclosureSummary>
                    <div className="admin-sky-house-grid admin-lunar-coverage-row-list">
                      {skyArticleEditor.fields.housePassages.map((passage) => (
                        <label className="admin-review-copy-editor" key={passage.contentKey}>
                          <span>{ordinalLabel(passage.house)} House{passage.risingSign ? ` · ${titleFromKey(passage.risingSign)} Rising` : ""}</span>
                          <StudioTextarea
                            aria-label={`Sky article House ${passage.house}`}
                            value={passage.body}
                            onChange={(event) => updateSkyArticleHouse(passage.contentKey, event.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </details>

                  {skyArticleEditor.fields.aspectPassages.length > 0 && (
                    <details className="admin-workspace-details admin-sky-related-group admin-diagnostics-details">
                      <AdminDisclosureSummary>
                        <span>Natal-aspect passages</span>
                        <strong>{skyArticleEditor.fields.aspectPassages.length}</strong>
                      </AdminDisclosureSummary>
                      <div className="admin-sky-aspect-list admin-lunar-coverage-row-list">
                        {skyArticleEditor.fields.aspectPassages.map((passage) => (
                          <label className="admin-review-copy-editor" key={passage.contentKey}>
                            <span>{titleFromKey(passage.natalPoint)} · {titleFromKey(passage.aspect)}</span>
                            <StudioTextarea
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
                    <p className="admin-copy-preview">{skyArticleEditor.fields.body}</p>
                  </section>

                  <div className="admin-toolbar-actions admin-sky-article-actions">
                    <span>{skyArticleChanges.length} changed field{skyArticleChanges.length === 1 ? "" : "s"}</span>
                    {skyArticleChanges.length > 0 ? (
                      <StudioButton
                        type="button"
                        onClick={() => setSkyArticleEditor((current) => current ? { ...current, reviewOpen: !current.reviewOpen } : current)}
                      >
                        Review {skyArticleChanges.length} change{skyArticleChanges.length === 1 ? "" : "s"}
                      </StudioButton>
                    ) : selectedRow && currentDraft.status !== "LIVE" ? (
                      <StudioButton type="button" onClick={() => void approveSkyArticleEdition(selectedRow)} disabled={isLoading}>
                        <Check size={16} aria-hidden="true" />
                        Approve &amp; publish complete edition
                      </StudioButton>
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
                      <StudioButton
                        className="admin-primary-button"
                        type="button"
                        onClick={() => void publishSkyArticleChanges()}
                        disabled={isLoading || skyArticleEditor.saveState !== "saved" || skyArticleChanges.length === 0}
                        title={skyArticleEditor.saveState !== "saved" ? "Wait for autosave to finish before publishing." : "Publish the complete validated article revision."}
                      >
                        <Check size={16} aria-hidden="true" />
                        Publish changes
                      </StudioButton>
                    </section>
                  )}
                </div>
              )}
            </section>
          )}
          {isVocabularyDraft && (
            <label className="admin-title-field">
              <span>Phrase section</span>
              <AdminSelect aria-label="Phrase section" value={vocabularySection} onChange={(event) => updateVocabularySection(event.target.value as AdminVocabularySection)} disabled={!isNewDraft}>
                {vocabularySections.map((section) => <option key={section.key} value={section.key}>{section.label}</option>)}
              </AdminSelect>
              <small className="admin-field-hint">{vocabularySections.find((section) => section.key === vocabularySection)?.description}</small>
            </label>
          )}
          {!compiledSkyArticleEdition && !skyFallbackEditor && (
            <section className="studio-surface studio-section admin-editor-copy-section" aria-label="Content name and summary">
              <label className="admin-title-field">
                <span>{headlineFieldLabel}</span>
                <StudioInput aria-label={headlineFieldLabel} value={currentDraft.headline} onChange={(event) => updateHeadline(event.target.value)} placeholder={isVocabularyDraft ? "Example: Moon phase / Balsamic / Reflection" : undefined} />
                {fallbackEditorGuidance && <small className="admin-field-hint">{fallbackEditorGuidance.headlineHint}</small>}
                {isVocabularyDraft && <small className="admin-field-hint">{isPackageDraft ? "This label helps editors find the phrase. The stable source key remains unchanged." : "This is the human name editors see in the table. New rows use it to generate the internal key."}</small>}
                {isAstro101Draft && <small className="admin-field-hint">Title on the Learn hub card and at the top of the article.</small>}
                {!fallbackEditorGuidance && !isVocabularyDraft && !isAstro101Draft && !isAuthoredPackageCard && <small className="admin-field-hint">{isSkySummaryDraft || lunarIdentity || isTemplateDraft || isFallbackHookDraft ? "Editor-facing name used to find this source in Content Studio." : "Title shown to readers."}</small>}
              </label>
              {isAstro101Draft && (
                <>
                  <label className="admin-title-field">
                    <span>Card type</span>
                    <AdminSelect
                      aria-label="Astro 101 card type"
                      value={astro101KindForDraft(currentDraft)}
                      onChange={(event) => setDraft(withAstro101Placement(currentDraft, { kind: event.target.value as Astro101Kind }))}
                    >
                      {ASTRO_101_KINDS.map((kind) => (
                        <option key={kind} value={kind}>{ASTRO_101_KIND_LABELS[kind]}</option>
                      ))}
                    </AdminSelect>
                    <small className="admin-field-hint">Choose where this card sits on Learn. Leave Resources as a draft until the article is written.</small>
                  </label>
                  <label className="admin-title-field">
                    <span>Reader path</span>
                    <StudioInput
                      aria-label="Astro 101 reader path"
                      value={astro101SlugTail(currentDraft.facts)}
                      onChange={(event) => setDraft(withAstro101Placement(currentDraft, { slugTail: event.target.value }))}
                    />
                    <small className="admin-field-hint">{astro101SlugFromFacts(currentDraft.facts) || "Path is generated from this slug when you save."}</small>
                  </label>
                  <label className="admin-title-field">
                    <span>Hub section title</span>
                    <StudioInput
                      aria-label="Astro 101 hub section title"
                      value={astro101HubTitleFromSections(currentDraft.sections, astro101KindForDraft(currentDraft))}
                      onChange={(event) => setDraft(withAstro101Placement(currentDraft, { hubTitle: event.target.value }))}
                    />
                    <small className="admin-field-hint">Heading above this group of cards. Blank groups, including Resources, do not appear on /learn.</small>
                  </label>
                </>
              )}
              {!(isVocabularyDraft && isPackageDraft) && showSummaryField && !isSkySummaryDraft && (
                <label className="admin-review-copy-editor">
                  <span>{summaryFieldLabel}</span>
                  <StudioTextarea className="admin-copy-field-summary" aria-label={summaryFieldLabel} value={currentDraft.summary} onChange={(event) => updateSummary(event.target.value)} placeholder={isVocabularyDraft ? "Optional: where this phrase should be used, tone notes, or related variants." : isSkyArticleSourceDraft ? "Write the explicit TL;DR for this article edition." : undefined} />
                  <small className="admin-field-metrics">{fieldMetrics(currentDraft.summary)}</small>
                  {isAstro101Draft && <small className="admin-field-hint">Shown under the title on the Learn hub card. Leave blank if the card should have no subtitle.</small>}
                  {fallbackEditorGuidance && <small className="admin-field-hint">{fallbackEditorGuidance.summaryHint}</small>}
                  {isSkyArticleSourceDraft && <small className="admin-field-hint">Saved as non-serving source copy until the complete edition is compiled, reviewed, and published.</small>}
                  {!fallbackEditorGuidance && !isVocabularyDraft && !isAstro101Draft && !isSkyArticleSourceDraft && <small className="admin-field-hint">{isSkySummaryDraft || lunarIdentity || isTemplateDraft || isFallbackHookDraft ? "Internal context for editors. Readers do not receive this field." : "Optional short takeaway."}</small>}
                </label>
              )}
            </section>
          )}
          {showPackageBodyYou && !skyFallbackEditor && (
            <label className="admin-review-copy-editor" data-reader-audience="you">
              <span>{fallbackEditorGuidance?.bodyYouLabel ?? "You view copy"}</span>
              <StudioTextarea
                data-sky-field="body_you"
                aria-label={fallbackEditorGuidance?.bodyYouLabel ?? "You view copy"}
                value={isExactTransitReturnDraft
                  ? (packageFieldString(currentDraft, "body_you") || packageFieldString(currentDraft, "body") || currentDraft.body)
                  : packageFieldString(currentDraft, "body_you")}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft(isExactTransitReturnDraft
                    ? setPackageSectionField(setPackageSectionField(currentDraft, "body", value), "body_you", value)
                    : setPackageSectionField(currentDraft, "body_you", value));
                }}
              />
              {fallbackEditorGuidance && <small className="admin-field-hint">{fallbackEditorGuidance.bodyYouHint}</small>}
              {!fallbackEditorGuidance && <small className="admin-field-hint">{isExactTransitReturnDraft
                ? "Used when someone reads this return in You."
                : "Used when someone reads their own natal chart in You."}</small>}
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
              <StudioTextarea
                aria-label={`Continuous Sky ${label}`}
                value={typeof editablePackageRecord[field] === "string" ? editablePackageRecord[field] as string : ""}
                onChange={(event) => setDraft(setPackageRecordField(currentDraft, field, event.target.value))}
              />
            </label>
          ))}
          {showPackageBodyThey && !skyFallbackEditor && (
            <label className="admin-review-copy-editor" data-reader-audience="they">
              <span>{fallbackEditorGuidance?.bodyTheyLabel ?? "Friend view copy"}</span>
              {isExactNatalAspectDraft && (
                <small className="admin-field-hint" id="natal-aspect-they-name-hint" role="note">
                  Name variable: <code>{natalAspectTheyNameVariable}</code>. Enter it exactly where the person&apos;s name should appear; the app replaces it with their name.
                </small>
              )}
              {isAuthoredTransitAspectDraft && (
                <small className="admin-field-hint" id="transit-aspect-they-name-hint" role="note">
                  Friends uses this complete third-person passage. Use <code>{"{{Name}}"}</code> where the person&apos;s name belongs. If this field is blank, the reader falls back to the legacy automatic conversion of the You passage.
                </small>
              )}
              <StudioTextarea
                data-sky-field="body_they"
                aria-describedby={isExactNatalAspectDraft
                  ? "natal-aspect-they-name-hint"
                  : isAuthoredTransitAspectDraft ? "transit-aspect-they-name-hint" : undefined}
                aria-label={fallbackEditorGuidance?.bodyTheyLabel ?? "Friend view copy"}
                value={packageFieldString(currentDraft, "body_they")}
                onChange={(event) => setDraft(setPackageSectionField(currentDraft, "body_they", event.target.value))}
              />
              {fallbackEditorGuidance && <small className="admin-field-hint">{fallbackEditorGuidance.bodyTheyHint}</small>}
              {!fallbackEditorGuidance && !isAuthoredTransitAspectDraft && <small className="admin-field-hint">Used when the app describes this person to a friend or another chart viewer.</small>}
              {!fallbackEditorGuidance && isAuthoredTransitAspectDraft && <small className="admin-field-hint">This is the editable Friends version of the standalone Transit to Natal write-up. Write it as its own complete passage rather than mechanically changing pronouns in the You copy.</small>}
            </label>
          )}
          {isBondEffectDraft && (
            <Suspense fallback={<PageLoading compact message="Opening the Friends page…" />}>
              <BondEffectPagePreview
                contentKey={currentDraft.contentKey}
                youText={packageFieldString(currentDraft, "body_you")}
                theyText={packageFieldString(currentDraft, "body_they")}
                secret={secret}
                previewNatalPoint={contentLibraryTransitContact?.natalPoint}
                onOpenSource={(sourceKey, label, field) => void openFromEditor(sourceKey, () => openContentKeyRow(sourceKey, label, false, field))}
              />
            </Suspense>
          )}
          {selectedRow && <Suspense fallback={<PageLoading message="Loading publication checks…" />}><StudioEditorReviewPanels row={selectedRow} credential={secret} unsaved={draftHasUnsavedChanges} busy={isLoading}
            isPackageDraft={isPackageDraft} articleSaveState={skyArticleEditor?.saveState}
            onWritingAction={(action) => void runSkyDraftWriting(selectedRow.content_key, action, selectedRow)} /></Suspense>}
          {currentDraft.contentKey.startsWith("slot-template/calendar/") && <Suspense fallback={null}><CalendarOverviewEditor
            draft={currentDraft} initialField={skyWritingContext.fieldPath} onChange={next => setDraft(invalidateContentStudioReview(next))} /></Suspense>}
          {!compiledSkyArticleEdition && showGenericBody && !skyFallbackEditor && (
            <label className="admin-review-copy-editor studio-surface">
              <span>{bodyFieldLabel} <em className="admin-required-marker">Required</em></span>
              <StudioTextarea
                className="admin-copy-field-body"
                data-sky-field="body"
                aria-label={bodyFieldLabel}
                value={currentDraft.body}
                onChange={(event) => isVocabularyDraft ? updateVocabularyBody(event.target.value) : updateGenericBody(event.target.value)}
                placeholder={bodyFieldPlaceholder}
              />
              <small className="admin-field-metrics">{fieldMetrics(currentDraft.body)}</small>
              {isReferenceDraft ? <small className="admin-field-hint">Background for writing finished cards. This text is never published directly.</small> : fallbackEditorGuidance && <small className="admin-field-hint">{fallbackEditorGuidance.bodyHint}</small>}
              {!isReferenceDraft && !fallbackEditorGuidance && !isVocabularyDraft && !isAuthoredPackageCard && <small className="admin-field-hint">{isTemplateDraft ? "The assembly pattern the app renders. Keep variable names inside double braces." : "Full write-up shown to readers."}</small>}
              {isYouOnlyNatalExactDraft && <small className="admin-field-hint">This exact override is used only in You. The Friends version is composed from separate Friend source writing below.</small>}
              {isVocabularyDraft && isPackageDraft && <small className="admin-field-hint">{vocabularyHasTheyVersion
                ? "Used when the app speaks directly to the person reading their own chart."
                : "This is the exact editable phrase the fallback resolver reads. Saving updates the stored package value and its dashboard copy together."}</small>}
            </label>
          )}
          {showArticleStyleEditor && (
            <ArticleBlockStyleFields
              allowAdd
              blocks={astro101Blocks}
              bodyStyle={articleBodyStyle}
              intro={astro101Intro}
              showIntro={isAstro101Draft}
              onBodyStyleChange={(style) => {
                const sections = { ...(currentDraft.sections ?? {}), bodyStyle: style };
                setDraft({ ...currentDraft, sections });
              }}
              onBlocksChange={(blocks) => {
                const sections = { ...(currentDraft.sections ?? {}), blocks };
                setDraft(isAstro101Draft ? { ...currentDraft, sections } : {
                  ...currentDraft,
                  sections,
                  body: blocks.map((block) => [block.heading, block.body].filter(Boolean).join("\n")).join("\n\n")
                });
              }}
              onIntroChange={(value) => {
                const sections = { ...(currentDraft.sections ?? {}), intro: value };
                setDraft({ ...currentDraft, sections });
              }}
            />
          )}
          {showNatalFriendEditor && natalPlacementPlanet && natalPlacementSign && (
            <section className="admin-editor-guidance admin-natal-friend-editor" aria-label="Friends natal copy and sources">
              <div>
                <p className="admin-eyebrow">Friends view</p>
                <h3>Edit the copy a friend sees</h3>
                <p>The exact copy above is You-only. Friends is composed from separate third-person passages. Open a colored section below to edit the source that actually supplies that part of the Friends write-up.</p>
              </div>
              <Suspense fallback={<PageLoading message="Loading Friends copy…" />}>
                <NatalPlacementReaderPreview
                  house={natalPlacementHouse}
                  initialAudience="they"
                  key={`friend-editor-${natalPlacementPlanet}-${natalPlacementSign}-${natalPlacementHouse}-${natalPlacementMotion}`}
                  motion={natalPlacementMotion}
                  onCreateOverride={createNatalPlacementOverride}
                  onOpenSource={(contentKey, label, previewTemplate) => void openFromEditor(contentKey, () => openContentKeyRow(contentKey, label, previewTemplate))}
                  planet={natalPlacementPlanet}
                  rows={rows}
                  secret={secret}
                  sign={natalPlacementSign}
                />
              </Suspense>
            </section>
          )}
          {isVocabularyDraft && isPackageDraft && vocabularyHasTheyVersion && !skyFallbackEditor && (
            <label className="admin-review-copy-editor">
              <span>They version</span>
              <StudioTextarea
                aria-label="They version"
                value={vocabularyTheyValue}
                onChange={(event) => setDraft(setPackageSectionField(currentDraft, "body_they", event.target.value))}
                placeholder="Write the version used when the app describes another person."
              />
              <small className="admin-field-hint">Used when the app describes someone else in Friends, Compatibility, or another person-focused view.</small>
            </label>
          )}
          {isCmsSurfaceDraft && (
            <div className="admin-editor-guidance" aria-label="CMS surface template guidance">
              <strong>Reader-facing CMS override</strong>
              <p>A published row replaces prose on the named app surface immediately. Astrology facts remain calculated by the app and can enter this copy only through the allowed slots below.</p>
              <p><strong>Allowed slots:</strong> {cmsAllowedSlots.length > 0 ? cmsAllowedSlots.map((slot) => isSkySummaryDraft ? `{${slot}}` : `{{${slot}}}`).join(", ") : "This row has no calculated slots."}</p>
              <p>Save & publish makes your wording live in one step. Save draft keeps an unfinished revision for later.</p>
              <p><strong>Reader status:</strong> <ContentLiveStatusBadge row={editorStatusRow} unsaved={draftHasUnsavedChanges && !(!currentDraft.id && matchesBuiltinSummary)} /></p>
              {cmsTemplateValidation.errors.length > 0 ? (
                <div role="alert" aria-label="CMS template errors">
                  <strong>Fix before Sign Off</strong>
                  <ul>{cmsTemplateValidation.errors.map((error) => <li key={error}>{error}</li>)}</ul>
                </div>
              ) : (
                <div aria-label="CMS template preview">
                  <strong>Preview with representative chart facts</strong>
                  {!isSkySummaryDraft && currentDraft.headline.trim() && <h4>{renderCmsTemplatePreview(currentDraft.headline, cmsTemplateValidation.previewSlots, "headline")}</h4>}
                  {!isSkySummaryDraft && currentDraft.summary.trim() && <p>{renderCmsTemplatePreview(currentDraft.summary, cmsTemplateValidation.previewSlots, "summary")}</p>}
                  <p>{renderCmsTemplatePreview(currentDraft.body, cmsTemplateValidation.previewSlots, "body")}</p>
                  {cmsTemplateValidation.usedSlots.length > 0 && <small>Slots used: {cmsTemplateValidation.usedSlots.map((slot) => isSkySummaryDraft ? `{${slot}}` : `{{${slot}}}`).join(", ")}</small>}
                </div>
              )}
            </div>
          )}
          {!skyWriteupContext && importedHoroscopeSections && <Suspense fallback={<PageLoading message="Loading horoscope fields…" />}>
            <ImportedArticleHoroscopesEditor sections={currentDraft.sections} onChange={sections => setDraft(invalidateContentStudioReview({...currentDraft, sections, status: "DRAFT", reviewState: "owner-review-required"}))} />
          </Suspense>}
          {skyWriteupContext && selectedRow && (
            <SkyRelatedContainer className="admin-workspace-details admin-sky-related-editor admin-fallback-diagnostic-panel" aria-label="Related reader horoscope passages">
              {isSkyPlacementSource && <AdminDisclosureSummary>Aspects and horoscopes</AdminDisclosureSummary>}
              <header className="admin-sky-related-heading admin-fallback-diagnostic-heading">
                <div>
                  <h3 className={isSkyPlacementSource ? "sr-only" : undefined}>{skyLunationContext ? "Lunation passages" : "Reader horoscopes"}</h3>
                </div>
                <dl className="admin-hook-pattern-list">
                  <div><dt>{skyLunationContext ? "Lunation" : "Placement"}</dt><dd>{skyLunationContext ? `${titleFromKey(skyLunationContext.sign)} ${titleFromKey(skyLunationContext.kind)}` : `${titleFromKey(skyWriteupContext.planet)}${skyWriteupContext.sign ? ` in ${titleFromKey(skyWriteupContext.sign)}` : ""}`}</dd></div>
                  {skyLunationContext && (
                    <div><dt>Eclipse</dt><dd>{skyLunationContext.eclipse === "none" ? "Not an eclipse" : `${titleFromKey(skyLunationContext.eclipse)} eclipse`}</dd></div>
                  )}
                  <div><dt>Aspect passages</dt><dd>{skyAspectPassages.length}</dd></div>
                  {skyLunationContext ? (
                    <div><dt>Rising horoscopes</dt><dd>{sourceReadyLunationHoroscopes}/12 source-ready</dd></div>
                  ) : (
                    <>
                      <div><dt>Complete horoscopes</dt><dd>{Array.isArray(importedHoroscopeSections?.passages) ? importedHoroscopeSections.passages.length : populatedSkyHouses}/12</dd></div>
                      <div><dt>Supporting passages</dt><dd>{candidateSkyHouses}/12 houses</dd></div>
                    </>
                  )}
                </dl>
              </header>

              <details className="admin-workspace-details admin-sky-related-group admin-diagnostics-details" open={Boolean(skyFallbackEditor) && !isSkyPlacementSource}>
                <AdminDisclosureSummary>
                  <span>Aspect passages</span>
                  {" "}
                  <strong>{skyAspectPassages.length} rows</strong>
                </AdminDisclosureSummary>
                <label className="admin-sky-related-search">
                  <span>Find an aspect passage</span>
                  <div className="admin-search-input-shell">
                    <Search size={15} aria-hidden="true" />
                    <StudioInput
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
                        <StudioButton type="button" onClick={() => openRelatedSkyRow(selectedRow.id, row)}>
                          Edit reusable source
                        </StudioButton>

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

              {importedHoroscopeSections ? (
                <Suspense fallback={<PageLoading message="Loading horoscope fields…" />}>
                  <ImportedArticleHoroscopesEditor sections={currentDraft.sections} onChange={sections => setDraft(invalidateContentStudioReview({...currentDraft, sections, status: "DRAFT", reviewState: "owner-review-required"}))} />
                </Suspense>
              ) : skyLunationContext ? (
                <details className="admin-workspace-details admin-sky-related-group admin-diagnostics-details" open={Boolean(skyFallbackEditor) && !isSkyPlacementSource}>
                  <AdminDisclosureSummary>
                    <span>Rising-sign horoscopes</span>
                    {" "}
                    <strong>{sourceReadyLunationHoroscopes}/12 source-ready</strong>
                  </AdminDisclosureSummary>
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
                              <StudioButton type="button" onClick={() => openRelatedSkyRow(selectedRow.id, source.row)}>
                                Edit source
                              </StudioButton>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </details>
              ) : (
                <details className="admin-workspace-details admin-sky-related-group admin-diagnostics-details" open={Boolean(skyFallbackEditor) && !isSkyPlacementSource}>
                  <AdminDisclosureSummary>
                    <span>House horoscopes</span>
                    {" "}
                    <strong>{populatedSkyHouses}/12 complete</strong>
                  </AdminDisclosureSummary>
                  <p className="admin-sky-related-help">
                    Only complete, approved house horoscopes appear in the app.
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
                                <span>{passage.kind} · {housePassageAvailabilityLabel(passage.availability)}</span>
                                <code>{passage.row.content_key}</code>
                                <p>{passage.row.body || "No passage body saved."}</p>
                              </div>
                              <StudioButton type="button" onClick={() => openRelatedSkyRow(selectedRow.id, passage.row)}>
                                Edit passage
                              </StudioButton>
                            </div>
                          ))}
                        </article>
                      );
                    })}
                  </div>
                </details>
              )}
            </SkyRelatedContainer>
          )}
          <details className="admin-editor-details" aria-label="Details">
            <AdminDisclosureSummary>
              <span>Details</span>
              <span className="admin-editor-details-summary">{editorDetailsSummary}</span>
            </AdminDisclosureSummary>
            <div className="admin-editor-details-body">
            {!fallbackEditorGuidance && !(isNewDraft && isCompatibilityWorkspaceDraft) && <section className="admin-content-role-panel" aria-label="Content role">
              <div>
                <p className="admin-eyebrow">Content role</p>
                <h3>{skyFallbackContentIdentity?.typeLabel ?? contentRole.label}</h3>
              </div>
              <p>{skyFallbackContentIdentity
                ? skyFallbackContentIdentity.description
                  ?? `Reader-facing ${skyFallbackContentIdentity.groupLabel.toLowerCase()} content. Its internal fallback key remains visible for traceability.`
                : contentRole.detail}</p>
              {contentRole.label === "Fallback source/helper" && (
                <p><strong>Reader rule:</strong> this text can support the fallback system, but it cannot appear as a standalone authored write-up.</p>
              )}
            </section>}
            {skyFallbackContentIdentity?.typeLabel === "Sky Placement fallback article section" && (
              <section className="admin-content-role-panel" aria-label="Sky Placement fallback article structure">
                <div>
                  <p className="admin-eyebrow">Fallback article structure</p>
                  <h3>Four sections readers receive</h3>
                </div>
                <p>The labels below describe complete pieces of reader copy. They are not calculated variables.</p>
                <dl className="admin-hook-pattern-list">
                  {skyPlacementFallbackSectionOutline.map((section) => (
                    <div key={section.key}>
                      <dt>{section.label}</dt>
                      <dd>{section.description}</dd>
                    </div>
                  ))}
                </dl>
                <p className="admin-field-hint">Stored field names remain <code>tagline</code>, <code>hook</code>, <code>lived</code>, and <code>turn</code> for runtime compatibility.</p>
              </section>
            )}
            {fallbackDiagnostic && !isVocabularyDraft && (
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
            {isPackageDraft && (isVocabularyDraft ? (
              <section className="admin-package-edit-panel admin-vocabulary-settings" aria-label="Variable settings">
                <div>
                  <span>Approval status</span>
                  <span
                    aria-label="Approval status"
                    className={`ui-pill admin-status ${fallbackArchitectureV3ReaderEligibleReviews.has(packageReviewStatus) ? "status-live" : "status-draft"}`}
                  >
                    {packageReviewStatusLabel(packageReviewStatus)}
                  </span>
                </div>
                <label>
                  <span>Approval</span>
                  <AdminSelect aria-label="Variable approval" value={packageReviewStatus} onChange={(event) => updatePackageReviewStatus(event.target.value)}>
                    {fallbackArchitectureV3ReviewStatuses.map((reviewStatus) => (
                      <option key={reviewStatus} value={reviewStatus}>
                        {reviewStatus === "needs_review" ? "Needs review" : reviewStatus === "approved_reuse" ? "Approved for reuse" : reviewStatus === "deprecated" ? "Retired (not for reuse)" : "Approved for use"}
                      </option>
                    ))}
                  </AdminSelect>
                  <small className="admin-field-hint">Approval allows the resolver to use this phrase as an ingredient. It does not turn it into a standalone article.</small>
                </label>
                <label className="admin-package-notes-field">
                  <span>Editor notes (optional)</span>
                  <StudioTextarea aria-label="Editor notes" value={packageEditorialNotesForDraft(currentDraft)} onChange={(event) => updatePackageEditorialNotes(event.target.value)} placeholder="Add context for another editor; readers never see these notes." />
                </label>
              </section>
            ) : (
              <section className="admin-package-edit-panel" aria-label="Package row details">
                <div>
                  <span>Role</span>
                  <strong>{packageRole || "package row"}</strong>
                </div>
                <div>
                  <span>Approval status</span>
                  <span
                    aria-label="Approval status"
                    className={`ui-pill admin-status ${fallbackArchitectureV3ReaderEligibleReviews.has(packageReviewStatus) ? "status-live" : "status-draft"}`}
                  >
                    {packageReviewStatusLabel(packageReviewStatus)}
                  </span>
                </div>
                <label>
                  <span>Approval</span>
                  <AdminSelect aria-label="Approval" value={packageReviewStatus} onChange={(event) => updatePackageReviewStatus(event.target.value)} disabled={packageHasProposal || isGuidedHeldReview || packageIsSkyV4Governed}>
                    {fallbackArchitectureV3ReviewStatuses.map((reviewStatus) => <option key={reviewStatus} value={reviewStatus}>{packageReviewStatusLabel(reviewStatus)}</option>)}
                  </AdminSelect>
                  {!packageHasProposal && !isGuidedHeldReview && !packageIsSkyV4Governed && packageRoleCanServeExactCopy && <small className="admin-field-hint">Approved copy becomes live when Save &amp; publish completes.</small>}
                  {!packageHasProposal && !isGuidedHeldReview && !packageIsSkyV4Governed && !packageRoleCanServeExactCopy && <small className="admin-field-hint">Source material cannot be published.</small>}
                  {packageHasProposal && !packageIsSkyV4Governed && packageRoleCanServeExactCopy && <small className="admin-field-hint">Save &amp; publish makes your exact edits live in one step. Save draft keeps the revision Not live.</small>}
                  {packageHasProposal && !packageIsSkyV4Governed && !packageRoleCanServeExactCopy && <small className="admin-field-hint">Save this source-material revision for review. Source ingredients cannot publish as exact reader copy.</small>}
                  {packageIsSkyV4Governed && <small className="admin-field-hint">Save & publish approves this exact revision and makes it live. The original approved source remains in version history.</small>}
                  {isGuidedHeldReview && <small className="admin-field-hint">Locked at needs_review in this review flow. Use “Record owner copy review” above when the exact copy is correct; publication remains a separate governed step.</small>}
                </label>
                <label className="admin-package-notes-field">
                  <span>Editorial notes</span>
                  <StudioTextarea aria-label="Editorial notes" value={packageEditorialNotesForDraft(currentDraft)} onChange={(event) => updatePackageEditorialNotes(event.target.value)} />
                </label>
              </section>
            ))}
            {isSkyPlacementFrameTemplate && (
              <section className="admin-content-role-panel admin-sky-placement-composition" aria-label="Sky Placement fallback composition">
                <div>
                  <p className="admin-eyebrow">Sky Placement fallback composition</p>
                  <h3>Educational sections</h3>
                </div>
                <p>These switches set the global defaults for every canonical Sky Placement fallback page. Individual articles do not override them here.</p>
                <label className="admin-composition-option">
                  <StudioInput
                    type="checkbox"
                    checked={skyPlacementTemplateOptions.includePlanetLore}
                    onChange={(event) => updateSkyFallbackField("compositionOptions.includePlanetLore", event.target.checked)}
                  />
                  <span>
                    <strong>Include planet explanation</strong>
                    <small>Shows the reviewed <code>sky-placement-frame/&#123;planet&#125;</code> section.</small>
                  </span>
                </label>
                <label className="admin-composition-option">
                  <StudioInput
                    type="checkbox"
                    checked={skyPlacementTemplateOptions.includeSignLore}
                    onChange={(event) => updateSkyFallbackField("compositionOptions.includeSignLore", event.target.checked)}
                  />
                  <span>
                    <strong>Include sign history and symbolism</strong>
                    <small>Shows the reviewed <code>sky-placement-lore/&#123;sign&#125;</code> section.</small>
                  </span>
                </label>
                <p className="admin-field-hint"><strong>Review rule:</strong> changing a switch creates a non-serving package proposal. It does not change reader pages until the proposal is approved, regenerated, and deployed.</p>
              </section>
            )}
            {isSkyV4OverlaySettings && (
              <section className="admin-content-role-panel" aria-label="SKY V4 contextual overlay settings">
                <div>
                  <p className="admin-eyebrow">SKY V4 preview settings</p>
                  <h3>Contextual transit overlays</h3>
                </div>
                <p>These independent switches affect the canonical stage preview only. They do not change stored Hook copy and cannot enable serving.</p>
                <label className="admin-composition-option">
                  <StudioInput
                    type="checkbox"
                    checked={skyV4OverlaysEnabled}
                    onChange={(event) => updateSkyFallbackField("contextualTransitOverlaysEnabled", event.target.checked)}
                  />
                  <span>
                    <strong>Use contextual transit overlays</strong>
                    <small>Default ON. Adds up to two exact, trigger-matched reviewed overlays to a full page.</small>
                  </span>
                </label>
                <label className="admin-composition-option">
                  <StudioInput
                    type="checkbox"
                    checked={skyV4FallbackOverlayEnabled}
                    disabled={!skyV4OverlaysEnabled}
                    onChange={(event) => updateSkyFallbackField("includeContextualOverlayInFallbackHook", event.target.checked)}
                  />
                  <span>
                    <strong>Include transit context in fallback hook</strong>
                    <small>Default OFF. Inserts at most one eligible overlay after Opening without modifying the saved fallback fields.</small>
                  </span>
                </label>
                <p className="admin-field-hint"><strong>Limits:</strong> two overlays on a full page; one in a fallback. Exact aspect and event suppression remains read-only.</p>
              </section>
            )}
            {!(isVocabularyDraft && isPackageDraft) && (
              <div className="admin-editor-metadata" aria-label="Row metadata">
                <dl className="admin-editor-meta-summary">
                  <div><dt>{isSharedSeasonSource ? "Used in" : "Surface"}</dt><dd>{isSharedSeasonSource ? seasonSourceUsage : currentDraft.surface}</dd></div>
                  <div><dt>Mode</dt><dd>{currentDraft.mode}</dd></div>
                  <div><dt>Lane</dt><dd>{currentDraft.lane}</dd></div>
                  <div><dt>Block type</dt><dd>{currentDraft.blockType || "—"}</dd></div>
                  {currentDraft.reviewState && <div><dt>Review state</dt><dd>{currentDraft.reviewState}</dd></div>}
                </dl>
                <details className="admin-advanced admin-editor-settings">
                  <AdminDisclosureSummary>{isPackageDraft ? "Publishing settings" : "Edit metadata"}</AdminDisclosureSummary>
                  <fieldset className="admin-metadata-fields">
                  <label className="admin-metadata-field">
                    <span>{isPackageDraft ? "Reader status after save" : "Status"}</span>
                    {isPackageDraft ? (
                      <span
                        aria-label="Reader status after save"
                        className={`ui-pill admin-status ${packageStatusAfterSave === "LIVE" ? "status-live" : "status-draft"}`}
                      >
                        {packageStatusAfterSave === "LIVE" ? "Live" : "Not live"}
                      </span>
                    ) : (
                      <AdminSelect aria-label="Status" value={currentDraft.status} onChange={(event) => setDraft({ ...currentDraft, status: event.target.value as GeneratedContentStatus })} disabled={Boolean(compiledSkyArticleEdition)}>
                        {contentStatuses.map((status) => <option key={status} value={status}>{contentStatusLabel(status)}</option>)}
                      </AdminSelect>
                    )}
                    <small className="admin-field-hint">
                      {isPackageDraft
                        ? packageHasProposal
                          ? packageRoleCanServeExactCopy
                            ? "Save & publish makes your exact edits live in one step. Choose Save draft to keep a revision Not live."
                            : "This saved revision is source material and cannot become exact reader copy."
                          : packageWillPublishOnSave
                          ? "This copy is approved. Save to publish it to readers."
                          : currentDraft.status === "LIVE"
                            ? "This approved copy is live for readers."
                            : "Approval controls reader availability. Set review status to approved, then Save to publish."
                        : "This is the editorial workflow stage. The Status badge checks the copy readers can receive."}
                    </small>
                  </label>
                  {!isSharedSeasonSource && <label className="admin-metadata-field">
                    <span>Surface</span>
                    <AdminSelect aria-label="Surface" value={currentDraft.surface} onChange={(event) => setDraft({ ...currentDraft, surface: event.target.value as GeneratedContentSurface })} disabled={isPackageDraft}>
                      {["sky", "you", "natal", "synastry", "composite", "relationship", "modifier", "year_ahead", "education"].map((surface) => <option key={surface} value={surface}>{surface}</option>)}
                    </AdminSelect>
                  </label>}
                  <label className="admin-metadata-field">
                    <span>Mode</span>
                    <AdminSelect aria-label="Mode" value={currentDraft.mode} onChange={(event) => setDraft({ ...currentDraft, mode: event.target.value })} disabled={isPackageDraft}>
                      {["feed", "in_depth", "article", "card"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                    </AdminSelect>
                  </label>
                  <label className="admin-metadata-field">
                    <span>Lane</span>
                    <AdminSelect aria-label="Lane" value={currentDraft.lane} onChange={(event) => setDraft({ ...currentDraft, lane: event.target.value })} disabled={isPackageDraft}>
                      <option value="serving">serving</option>
                      <option value="reference">reference</option>
                    </AdminSelect>
                  </label>
                  <label className="admin-metadata-field">
                    <span>Review state</span>
                    <StudioInput aria-label="Review state" value={currentDraft.reviewState} onChange={(event) => setDraft({ ...currentDraft, reviewState: event.target.value })} disabled={isPackageDraft} />
                  </label>
                  {isFallbackHookDraft && !isPackageDraft && (
                    <label className="admin-metadata-field">
                      <span>Fallback review status</span>
                      <AdminSelect aria-label="Fallback review status" value={fallbackReviewStatus} onChange={(event) => updateFallbackReviewStatus(event.target.value)}>
                        {fallbackHookReviewStatuses.map((reviewStatus) => <option key={reviewStatus} value={reviewStatus}>{reviewStatus}</option>)}
                      </AdminSelect>
                    </label>
                  )}
                  <label className="admin-metadata-field">
                    <span>Block type</span>
                    <StudioInput aria-label="Block type" value={currentDraft.blockType} onChange={(event) => setDraft({ ...currentDraft, blockType: event.target.value })} disabled={isPackageDraft} />
                  </label>
                  </fieldset>
                </details>
              </div>
            )}
            <details className="admin-advanced admin-editor-key-details">
              <AdminDisclosureSummary>{isVocabularyDraft && isPackageDraft ? "Internal source details" : isVocabularyDraft ? "Internal generated key" : "Content key"}</AdminDisclosureSummary>
              <div className="admin-disclosure-content">
              <label className="admin-title-field">
                <span className="sr-only">{isVocabularyDraft && isPackageDraft ? "Source key" : isVocabularyDraft ? "Generated key" : "Content key"}</span>
                <StudioInput aria-label={isVocabularyDraft && isPackageDraft ? "Source key" : isVocabularyDraft ? "Generated key" : "Content key"} value={currentDraft.contentKey} onChange={(event) => setDraft({ ...currentDraft, contentKey: event.target.value, ...(isPackageDraft ? { sections: { ...currentDraft.sections, packageRecord: { ...draftPackageRecord(currentDraft), contentKey: event.target.value }, ...(draftPackageProposal(currentDraft) ? { packageDraft: { ...draftPackageProposal(currentDraft), contentKey: event.target.value } } : {}) } } : {}) })} disabled={Boolean(currentDraft.id) || isVocabularyDraft || (isPackageDraft && !lunarWorkspaceActive)} />
                {isVocabularyDraft && <small className="admin-field-hint">{isPackageDraft ? "The app uses this stable key to request the phrase. It cannot be renamed from Content Studio." : "Generated from section + title. Existing rows keep their original key so published content stays connected."}</small>}
              </label>
              <StudioButton type="button" className="admin-editor-key-copy" onClick={() => void copyContentKey(currentDraft.contentKey)} aria-label={`Copy key ${currentDraft.contentKey}`} title={currentDraft.contentKey}>
                <Copy size={14} aria-hidden="true" />Copy key
              </StudioButton>
              {isVocabularyDraft && isPackageDraft && <p className="admin-field-hint">Package role: <code>{packageRole || "vocabulary"}</code></p>}
                          </div>
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
                <p className="admin-field-hint">
                  Published is a status. Authored, generated, and fallback are provenance systems; publication never changes one system into another.
                </p>
              </section>
            )}

            {selectedRow && (
              <details className="admin-advanced admin-review-json">
                <AdminDisclosureSummary>Structured fields</AdminDisclosureSummary>
                <pre>{sectionsText({
                  id: selectedRow.id,
                  contentKey: selectedRow.content_key,
                  facts: selectedRow.facts,
                  sourceSnapshot: selectedRow.source_snapshot,
                  sections: selectedRow.sections
                })}</pre>
              </details>
            )}
            </div>
          </details>
        </section>
        {editorSaveError && <div className="admin-inline-warning" role="alert">{editorSaveError}</div>}
        {!compiledSkyArticleEdition && <div className={`admin-toolbar-actions admin-editor-savebar${isLoading ? " is-saving" : ""}`} aria-busy={isLoading}>
          <span className={`admin-editor-save-state ${isLoading ? "is-saving" : draftHasUnsavedChanges || isNewDraft && !unchangedSkySource || packageWillPublishOnSave ? "is-unsaved" : "is-saved"}`} aria-live="polite">
            {isLoading
              ? "Saving…"
              : packageHasProposal && !isPersonalTransitSituationDraft
                ? draftHasUnsavedChanges
                  ? "Unsaved revision"
                  : "Draft saved · Not live"
                  : packageWillPublishOnSave
                  ? natalAspectMissingCopy || transitNatalMissingCopy ? "Write the passage before publishing" : "Ready to publish"
                  : unchangedSkySource
                    ? "No changes"
                    : isNewDraft
                    ? "New draft"
                    : draftHasUnsavedChanges
                      ? "Unsaved changes"
                      : isContentRetired(currentDraft.contentKey) ? "Retired everywhere" : "All changes saved"}
          </span>
          <StudioButton
            className={packageCanApproveRevision ? "admin-publish-button" : "admin-primary-button"}
            type="button"
            onClick={() => void (async () => {
              if (packageCanApproveRevision) {
                const saved = draftHasUnsavedChanges || !selectedRow ? await saveDraft() : selectedRow;
                if (saved) await approvePackageRevision(saved);
              } else {
                await saveDraft(isCmsSurfaceDraft ? "LIVE" : undefined);
              }
            })()}
            disabled={isLoading || unchangedSkySource || Boolean(compiledSkyArticleEdition) || !compatibilityNewDraftReady || (isCmsSurfaceDraft && (!cmsCanSignOff || !publishReady)) || (packageWillPublishOnSave && (natalAspectMissingCopy || transitNatalMissingCopy)) || (!isNewDraft && !draftHasUnsavedChanges && !packageWillPublishOnSave && !packageCanApproveRevision && !(isCmsSurfaceDraft && currentDraft.status !== "LIVE"))}
            title={packageWillPublishOnSave && (natalAspectMissingCopy || transitNatalMissingCopy) ? "Write the passage before publishing." : !compatibilityNewDraftReady ? "Complete the Compatibility identity and copy." : undefined}
          >
            <Save size={16} aria-hidden="true" />
            {isGuidedHeldReview
              ? "Save held draft"
              : isCmsSurfaceDraft || packageCanApproveRevision || unchangedSkySource
                ? "Save & publish"
                : packageHasProposal
                ? "Save draft"
                : packageWillPublishOnSave
                  ? "Save & publish"
                  : "Save"}
          </StudioButton>
          {(isCmsSurfaceDraft || isPackageDraft && packageCanApproveRevision || unchangedSkySource) && (
            <StudioButton
              className="admin-secondary-button"
              type="button"
              onClick={() => void saveDraft(isCmsSurfaceDraft ? "DRAFT" : undefined)}
              disabled={isLoading || unchangedSkySource || (!isNewDraft && !draftHasUnsavedChanges)}
              title="Keep this revision Not live."
            >
              <Save size={16} aria-hidden="true" />
              Save draft
            </StudioButton>
          )}
          {transitNatalCanApprovePublish && (
            <StudioButton
              className="admin-publish-button"
              type="button"
              onClick={() => void saveDraft(undefined, draftWithPackageReviewStatus(currentDraft, "approved"))}
              disabled={isLoading || unchangedSkySource || transitNatalMissingCopy}
              title={transitNatalMissingCopy
                ? currentDraft.contentKey.startsWith("authored/transit-return/")
                  ? "Write the return passage before publishing."
                  : "Write both You and Friend passages before publishing."
                : "Approve this exact contact and make it live on You and Friends."}
            >
              <Check size={16} aria-hidden="true" />
              Approve & publish
            </StudioButton>
          )}
          {transitNatalCanApprovePublish && (
            <p className="admin-savebar-next-step">Save keeps a draft. Approve &amp; publish makes this exact contact live.</p>
          )}
          {isPackageDraft && packageHasProposal && !packageCanApproveRevision && !packageIsSkyV4Governed && (
            <p className="admin-savebar-next-step">This row is source material; save it for review rather than publishing it as exact reader copy.</p>
          )}
          {isPackageDraft && !isNewDraft && !skyFallbackEditor && draftHasUnsavedChanges && (
            <StudioButton type="button" className="admin-secondary-button" onClick={revertPackageDraft} disabled={isLoading}>
              Revert to package original
            </StudioButton>
          )}
          {currentDraft.id && !currentDraft.id.startsWith("package:") && !rows.find((row) => row.id === currentDraft.id)?.target_date && (
            <StudioButton type="button" className={isContentRetired(currentDraft.contentKey) ? "admin-secondary-button" : "admin-danger-button"} disabled={isLoading || draftHasUnsavedChanges}
              onClick={() => void retireContentEverywhere(isContentRetired(currentDraft.contentKey) ? "publish" : "retire")}
              title={isContentRetired(currentDraft.contentKey) ? "Restore this saved version for readers." : "Retire this content key across Studio, bundled writing, and synced offline copies."}>
              {isContentRetired(currentDraft.contentKey) ? "Publish again" : "Retire everywhere"}
            </StudioButton>
          )}
          {currentDraft.id && (
            <StudioButton
              className={sourceIsArchived ? undefined : "admin-danger-button"}
              type="button"
              onClick={() => void updateSourceLifecycle()}
              disabled={isLoading || draftHasUnsavedChanges}
              title={draftHasUnsavedChanges ? "Save or revert your changes before changing this source's lifecycle." : undefined}
            >
              {sourceIsArchived ? "Restore as draft" : "Archive source"}
            </StudioButton>
          )}
          {selectedRow && selectedRow.status !== "LIVE" && lunarWorkspaceActive && (
            <StudioButton type="button" className="admin-danger-button" disabled={isLoading || draftHasUnsavedChanges} onClick={() => void deleteSelectedDrafts([selectedRow])}>
              Delete draft
            </StudioButton>
          )}
          {!isPackageDraft && !isCmsSurfaceDraft && isNewDraft && (
            <p className="admin-savebar-next-step">Save this draft before review or publication.</p>
          )}
          {!isPackageDraft && !isCmsSurfaceDraft && !isNewDraft && (
            <>
              <StudioButton className="admin-review-button" type="button" onClick={() => void saveDraft("REVIEWED")} disabled={isLoading || !publishReady || reviewComplete}>
                <Check size={16} aria-hidden="true" />
                {reviewComplete ? "Reviewed" : "Mark reviewed"}
              </StudioButton>
              {isGovernedSkyDraft && selectedRow ? (
                <StudioButton className="admin-publish-button" type="button" onClick={() => void approveAndScheduleSkyRow(selectedRow)} disabled={isLoading || skyDraftHasUnsavedCopy || skyWritingIssues(selectedRow).length > 0} title={skyDraftHasUnsavedCopy ? "Save and revalidate copy edits before approval." : currentDraft.blockType === "sky_placement" ? "Approve this copy for governed package import. This does not publish it." : "Approve this reusable card for calculated matching Sky configurations."}>
                  <Check size={16} aria-hidden="true" />
                  {currentDraft.blockType === "sky_placement" ? "Approve for package" : "Approve & schedule"}
                </StudioButton>
              ) : isContentStudioReferenceSource(currentDraft.contentKey, currentDraft.sourceSnapshot ?? {}) ? (
                <small className="admin-field-hint">Source material cannot be published.</small>
              ) : (
                <StudioButton className="admin-publish-button" type="button" onClick={() => void saveDraft("LIVE")} disabled={isLoading || !cmsCanSignOff || !publishReady} title={!publishReady ? (isAstro101Draft ? "Write the article before publishing." : "Add the required main copy before publishing.") : !cmsCanSignOff ? "Fix the CMS template errors before publishing." : "Make this reviewed source eligible for its app surface."}>
                  <Check size={16} aria-hidden="true" />
                  Publish to app
                </StudioButton>
              )}
            </>
          )}
        </div>}
      </aside>
      {templateVariableReferenceOpen && (
        <Suspense fallback={null}>
          <TemplateVariablesRail
            references={variableReferences}
            filteredReferences={filteredVariableReferences}
            query={templateVariableQuery}
            onQueryChange={setTemplateVariableQuery}
            rows={[...(hasNatalTemplatePreviewContext
              ? rows.filter((row) => natalPlacementResolverDependencyKeys(natalPlacementPlanet as NatalPlacementPlanet, natalPlacementSign as NatalPlacementSign, natalPlacementHouse, natalPlacementMotion).includes(row.content_key))
              : rows).filter(row => !isZodiacSeasonSourceKey(row.content_key)), ...seasonSourceRows]}
            onInsert={insertDraftToken}
            templateContentKey={currentDraft.contentKey}
            templatePreviewRow={templatePreviewRow}
            reviewTemplateRow={templatePreviewRow ?? {
              id: currentDraft.id ?? "draft-template",
              content_key: currentDraft.contentKey,
              headline: currentDraft.headline,
              summary: currentDraft.summary,
              body: currentDraft.body,
              surface: currentDraft.surface,
              status: currentDraft.status,
              block_type: currentDraft.blockType,
              sections: currentDraft.sections,
              source_snapshot: currentDraft.sourceSnapshot
            }}
            previewOptions={hasTransitTemplatePreviewContext ? {
              destination: friendsTransitAudience ? "Friends Transits" : "Personal Transits",
              initialAudience: friendsTransitAudience ? "they" : "you",
              exampleValues: {
                transitTitle: titleFromKey(transitNatalPlanet), natalTitle: titleFromKey(transitNatalPoint),
                transitRef: `${titleFromKey(transitNatalPlanet)} in ${titleFromKey(transitNatalSign)}`,
                aspectName: transitNatalAspect,
                aspectWord: transitNatalAspect === "conjunction" ? "conjunct" : transitNatalAspect === "opposition" ? "opposite" : transitNatalAspect,
                untilDate: (transitReadingContext.window ?? "September 30").replace(/^until\s+/iu, ""),
                Name: "{{Name}}",
                signTitle: titleFromKey(transitNatalSign),
                timeOpen: transitReadingContext.window ?? "Currently", timeInline: transitReadingContext.window ?? "currently", otherPoss: "{{Name}}'s"
              }
            } : natalTemplatePreviewOptions}
            selectedVariableName={selectedTemplateVariableName}
            selectedSourceId={selectedTemplateVariableSourceId}
            onSelectVariable={setSelectedTemplateVariableName}
            onSelectSource={setSelectedTemplateVariableSourceId}
            onEditSource={(row) => isZodiacSeasonSourceKey(row.content_key) ? void openSharedSeasonSource(row.content_key) : void openFromEditor(row.content_key, () => openRow(row as AdminGeneratedContentRow), { parentDraft: currentDraft, saveReturns: true })}
            onClose={closeVariablesRail}
            onKeyDown={handleEditorKeyDown}
          />
        </Suspense>
      )}
      </>
    );
  }
}
