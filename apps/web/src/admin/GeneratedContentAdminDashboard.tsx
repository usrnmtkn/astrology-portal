import { Activity, Archive, BarChart3, BookOpenText, Check, Database, Download, Eye, EyeOff, FileText, Flag, KeyRound, LayoutDashboard, Pencil, Plus, RefreshCw, Save, Search, Server, Sparkles, Trash2, TreePine, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { fallbackHookByKey, fallbackHookDefinitions, knowledgeIdsForFallbackHook, lunarCalendarContentKeyDefinitions, type FallbackHookContext, type FallbackHookDefinition, type LunarCalendarContentKeyDefinition, type LunarCalendarContentKeyGroup } from "../content/fallbackHooks";
import { fallbackVocabularyDependencyFamilies, fallbackVocabularyReferenceLanePolicy } from "../content/fallbackVocabularyDependencies";
import { findMetaphorPhraseFlags, metaphorFamilies, metaphorGuidanceSummary, metaphorValidationPhrases } from "../content/metaphorSpecificityPhraseBook";
import { firstReaderFacingCopy, isReaderFacingCopy } from "../content/readerSafety";
import templateCopySeed from "../content/migration-seeds/template-copy-seed.json";
import hookCatalogDescriptionsCsv from "./hook-catalog-descriptions.csv?raw";
import { contentSystemWorkstreams } from "./contentSystemPlan";
import {
  writingLayerLabels,
  writingSurfaceSourceMap,
  writingSurfaceSourceRoleLabels,
  writingSurfaceStatusLabels,
  type WritingSurfaceMapItem,
  type WritingSurfaceStatus
} from "./writingSurfaceSourceMap";
import sourceGroundedDashboardRecords from "../content/finalSourceGroundedDashboardRecords.json" with { type: "json" };
import sourceGroundedReviewCandidates from "../content/sourceGroundedReviewCandidates.json";
import {
  SOURCE_GROUNDED_V2_TEMPLATE_VERSION
} from "../content/sourceGroundedV2";
import { skyHistoricalLookbackSettingId, skyHistoricalLookbackSettingKey } from "../content/skyHistoricalLookback";
import skyContentSnapshot from "../content/skyContentSnapshot.json";
import {
  readGeneratedContentPreviewMode,
  writeGeneratedContentPreviewMode,
  type GeneratedContentMode,
  type GeneratedContentPreviewMode
} from "../services/generatedContent";
import {
  compositeAspectContentKey,
  natalAngleContentKey,
  natalAspectContentKey,
  natalHouseContentKey,
  natalPlacementContentKey,
  natalRulerContentKey,
  natalSignContentKey,
  slugContentPart,
  skyAspectContentKey,
  synastryAspectContentKey,
  transitToNatalAspectContentKey
} from "../services/generatedContentKeys";
import {
  fallbackNatalCardTaglines,
  natalCardTaglineContentKey,
  natalCardTaglinePoints,
  normalizedNatalCardTaglinePoint
} from "../services/natalPlacementTaglines";
import { interpolateTemplateString, type TemplateSlotValues } from "../services/templateInterpolation";
import { getTldrAstroApiHealth, isTldrAstroApiConfigured, tldrAstroApiStatusUrl, type TldrAstroApiHealth } from "../services/tldrastroApi";
import "./admin.css";

type GeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship" | "modifier";
type GeneratedContentSurfaceFilter = GeneratedContentSurface | "all";
type VoiceTemplateSurface = "sky" | "fullMoon" | "newMoon" | "eclipse" | "natal" | "synastry" | "composite";
type AdminDashboardPage = "overview" | "articles" | "content" | "reviewQueue" | "compositeByType" | "connection" | "appBehavior" | "vocabulary" | "slotDictionary" | "knowledge" | "templates" | "hooks" | "releaseNotes";
type AdminAccessStatus = "empty" | "checking" | "valid" | "invalid";
type AdminReviewSurface = "upcomingAspects" | "transitNatal" | "natalChart" | "relationshipLayer";
type AdminGenerationProvider = "claude" | "openai";
type AdminContentStatusFilter = "all" | "DRAFT" | "NEEDS_REVIEW" | "SCHEDULED" | "LIVE" | "ARCHIVED";
type AdminContentQueueFilter = "failed" | "missingSource" | "draft" | "published" | null;
type AdminContentClass = "phrasebank" | "fallback-hook" | "vocab" | "reference" | "legacy" | "user-generated" | "other";
type AdminContentClassFilter = AdminContentClass | "all";
type AdminPhrasebankTierFilter = "all" | "CONFIRMED" | "REVIEWED" | "SESSION_APPROVED_DRAFT" | "none";
type AdminReviewQueueStatusFilter = GeneratedContentStatus | "all";
type AdminReviewQueueEvergreenFilter = "all" | "evergreen" | "hideEvergreen";
type AdminReviewQueueSourceFilter = AdminContentClassFilter;
type AdminReviewQueueFamilyFilter = "all" | "placement" | "aspect" | "ingress" | "retrograde" | "eclipse" | "synastry" | "other";
type AdminReviewQueueGroupKey = `${AdminReviewQueueFamilyFilter}:${string}`;
type AdminContentCategoryFilter = "all" | "Sky" | "Natal Aspects" | "Natal Angles" | "Natal Chart" | "Relationship" | "Condition Modifiers" | "Fallback Templates";
type AdminVocabularyStatusFilter = GeneratedContentStatus | "all";
type AdminFallbackHookSectionFilter = "all" | "sky" | "you" | "friends" | "lunar-calendar" | "settings";
type AdminHookCatalogSelection = { type: "lunar"; key: string } | { type: "fallback"; key: string };
type LunarCoverageFilter = "all" | "lunar-calendar" | "eclipse" | "season" | "transit-fallback";
type SlotDictionarySourceFilter = "all" | "calculated" | "vocabulary" | "fallback";
type SlotDictionaryStatus = "calculated" | "ready" | "draft" | "local" | "missing";
type SlotDictionaryStatusFilter = "all" | SlotDictionaryStatus;
type WritingSurfaceAreaFilter = "all" | WritingSurfaceMapItem["area"];
type WritingSurfaceMapStatusFilter = "all" | WritingSurfaceStatus;
type WritingSurfaceSourceItem = WritingSurfaceMapItem["sources"][number];

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
  releaseNotes: "release-notes"
};

const adminPageByHashKey = Object.fromEntries(
  Object.entries(adminPageHashKeys).map(([page, hashKey]) => [hashKey, page])
) as Record<string, AdminDashboardPage>;
type AdminTemplateDrawerMode = "view" | "edit";
type CompositeRelationshipTypeKey = "romantic" | "friendship" | "family" | "coworkers" | "creative" | "exes" | "complicated";
type AdminContentBlockFilter =
  | "all"
  | "fallback_template"
  | "placement"
  | "angle"
  | "sign"
  | "house"
  | "ruler"
  | "natal_aspect"
  | "sky_aspect"
  | "sky_article"
  | "lunar_calendar"
  | "daily_horoscope"
  | "transit_to_natal_aspect"
  | "synastry_aspect"
  | "composite_aspect"
  | "condition_modifier"
  | "synthesis"
  | "essay";
type ReleaseNoteArea = "Dashboard" | "App";
type ReleaseNote = {
  date: string;
  time: string;
  title: string;
  summary: string;
  areas: ReleaseNoteArea[];
  items: string[];
};
type VoiceTemplateConfig = {
  template: string;
  generationGuide: string;
  bannedWords: string;
  phraseBank: string;
};

type TemplateCopySeedRow = {
  contentId: string;
  fields: {
    title?: string;
    summary?: string;
    body?: string;
    bestMove?: string;
    emptyState?: string;
  };
  contentType?: string;
  status?: string;
};

type AdminContentExportFormat = "csv" | "json";
type AdminContentScope = "settings" | "vocabulary" | "templates" | "context";

type AdminContentExchangeBundle = {
  schema: "tldrastro-admin-content-v1";
  exportedAt: string;
  settings: Partial<Record<VoiceTemplateSurface, VoiceTemplateConfig>>;
  vocabularyRows: Array<{
    id?: string;
    contentKey: string;
    headline: string;
    you?: string;
    friend?: string;
    natal: string;
    sky: string;
    stylePhrase?: string;
    styleShort?: string;
    signNeed?: string;
    story?: string;
    shadow?: string;
    higherExpression?: string;
  }>;
  taglineRows: Array<{
    id?: string;
    contentKey: string;
    point: string;
    headline: string;
    tagline: string;
  }>;
  templateRows: Array<{
    id?: string;
    contentKey: string;
    headline: string;
    summary: string;
    body: string;
  }>;
  contextRows: Array<{
    id?: string;
    contentKey: string;
    hookKey: string;
    label: string;
    description: string;
    surface: string;
    mode: string;
    domain: string;
    requiredFacts: string[];
    knowledgeIdPatterns: string[];
    exampleIds: string[];
    headline: string;
    summary: string;
    body: string;
    bestMove: string;
  }>;
};

type SourceGroundedDashboardRecordBundle = {
  summary?: {
    readyRecords?: number;
    sourceGaps?: number;
    recordsByFamily?: Record<string, number>;
    sourceGapsByFamily?: Record<string, number>;
  };
  sourceGaps?: Array<{
    canonicalKey: string;
    family: string;
    surface: string;
    state: "SOURCE_GAP";
    missing: string[];
  }>;
};

type AdminContentCsvRow = Record<string, string>;

type AdminApiStatusState = {
  state: "idle" | "checking" | "online" | "offline" | "notConfigured";
  checkedAt: string | null;
  latencyMs: number | null;
  health: TldrAstroApiHealth | null;
  error: string | null;
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
  sections: Array<{ heading: string; body: string }> | Record<string, unknown> | null;
  block_type?: AdminContentBlockFilter | null;
  lane?: "serving" | "reference" | string | null;
  review_state?: string | null;
  evergreen?: boolean | null;
  evergreen_at?: string | null;
  evergreen_by?: string | null;
  facts: Record<string, unknown> | null;
  knowledge_ids: string[] | null;
  source_snapshot: Record<string, unknown> | null;
  reviewer_notes: string | null;
  prompt_version: string | null;
  provider: string | null;
  model: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
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
  provider: string | null;
  model: string | null;
  headline: string | null;
  summary: string | null;
  body: string | null;
  error: string | null;
  updated_at: string;
  created_at: string;
};

type AdminGeneratedContentDraft = {
  id?: string;
  contentKey: string;
  surface: GeneratedContentSurface;
  mode: GeneratedContentMode;
  status: GeneratedContentStatus;
  eventType: string;
  targetDate: string;
  headline: string;
  summary: string;
  body: string;
  sectionsJson: string;
  factsJson: string;
  sourceSnapshotJson: string;
  knowledgeIds: string;
  reviewerNotes: string;
};

type AdminVocabularyDraft = {
  headline: string;
  status: GeneratedContentStatus;
  you?: string;
  friend?: string;
  natal: string;
  sky: string;
  stylePhrase?: string;
  styleShort?: string;
  signNeed?: string;
  story?: string;
  shadow?: string;
  higherExpression?: string;
};

type AdminNatalTaglineDraft = {
  id?: string;
  point: string;
  headline: string;
  tagline: string;
};

type AdminVocabularyCardItem = {
  contentKey: string;
  point: string;
  row?: AdminGeneratedContentRow;
  signNeedRow?: AdminGeneratedContentRow;
  storyRow?: AdminGeneratedContentRow;
  shadowRow?: AdminGeneratedContentRow;
  higherExpressionRow?: AdminGeneratedContentRow;
  taglineContentKey?: string;
  kind?: "topic" | "sign-style";
};

type AdminVocabularyCategoryFilter = "all" | "planets" | "houses" | "angles" | "zodiac" | "lunar" | "eclipses" | "career" | "relationship";

type AdminTemplateDraft = {
  headline: string;
  summary: string;
  body: string;
  status: GeneratedContentStatus;
};

type LunarCoverageFieldKey = LunarCalendarContentKeyDefinition["fieldKeys"][number];

type LunarCoverageSummaryItem = {
  group: LunarCalendarContentKeyGroup;
  label: string;
  total: number;
  live: number;
  draft: number;
  empty: number;
  vocabGaps: string[];
};

type AdminSlotDictionaryRow = {
  slot: string;
  label: string;
  group: "Calculated facts" | "Planet language" | "Zodiac language" | "House language" | "Angle language" | "Lunar language" | "Sky language" | "Aspect language" | "Relationship language" | "Transit language" | "Soul language" | "Career language" | "Template structure" | "Timing language";
  source: string;
  editableIn: "Calculated" | "Vocabulary" | "Fallback hooks";
  status: SlotDictionaryStatus;
  description: string;
  examples?: string[];
  action?: {
    label: string;
    page: AdminDashboardPage;
    vocabularyFilter?: AdminVocabularyCategoryFilter;
    fallbackFilter?: AdminFallbackHookSectionFilter;
  };
};

type AdminReviewRecord = {
  id: string;
  source: "global" | "private" | "calculated" | "saved" | "snapshot";
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
  sections: Array<{ heading: string; body: string }>;
  blockType?: AdminContentBlockFilter | null;
  facts: Record<string, unknown> | null;
  knowledgeIds?: string[];
  sourceSnapshot: Record<string, unknown> | null;
  evergreen: boolean;
  evergreenAt: string | null;
  evergreenBy: string | null;
  reviewerNotes: string | null;
  userId?: string;
  subjectId?: string;
  subjectType?: string;
  provider?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  updatedAt: string;
  rawGlobalRow?: AdminGeneratedContentRow;
  rawPrivateRow?: AdminUserGeneratedContentRow;
};

type LocalSkySnapshotAdminRow = {
  id: string;
  contentKey: string;
  aliases?: string[];
  surface?: GeneratedContentSurface;
  mode?: GeneratedContentMode;
  eventType?: string | null;
  targetDate?: string | null;
  headline?: string | null;
  summary?: string | null;
  body?: string | null;
  sections?: unknown;
  blockType?: AdminContentBlockFilter | string | null;
  provider?: string | null;
  sourceSnapshot?: Record<string, unknown> | null;
  model?: string | null;
  updatedAt?: string;
};

type AdminDraftSafety = {
  sourceBodyExcluded?: boolean;
  astrologyBodySent?: boolean;
  tarotNotesExcluded?: boolean;
  businessNotesExcluded?: boolean;
  authoredSourceGenerationAllowed?: boolean;
};

type AdminDraftResult = {
  title?: string;
  draftBody?: string | null;
  appBody?: string | null;
  editStatus?: string;
  sourceType?: string;
  sourceIds?: string[];
  sourcePaths?: string[];
  provider?: string;
  model?: string | null;
  providerKeyPresent?: boolean;
  retryCount?: number | null;
  violations?: string[];
  softWarnings?: string[];
  styleNotes?: string[];
  sourceSafety?: AdminDraftSafety;
  errorType?: string;
  error?: string;
};

type AdminReviewMetadataEdit = {
  targetDate: string;
  surface: GeneratedContentSurface;
  mode: GeneratedContentMode;
  status: GeneratedContentStatus;
  category: Exclude<AdminContentCategoryFilter, "all">;
  blockType: AdminContentBlockFilter;
  orb: string;
  direction: string;
  body1: string;
  sign1: string;
  house1: string;
  aspect: string;
  body2: string;
  sign2: string;
  house2: string;
  placementSign: string;
  placementBody: string;
  placementHouse: string;
  placementRetrograde: boolean;
  rulerBody: string;
  rulerSign: string;
  rulerHouse: string;
  traditionalRulerBody: string;
  traditionalRulerSign: string;
  traditionalRulerHouse: string;
  modernRulerBody: string;
  modernRulerSign: string;
  modernRulerHouse: string;
  lunarArcLayer: string;
  lunarSource: string;
  practice: string;
  reflect: string;
  ritual: string;
  callback: string;
};

type AdminReviewCounts = Record<GeneratedContentStatus, number> & {
  total: number;
};

type AdminReviewRecordsPayload = {
  ok: boolean;
  surface: AdminReviewSurface;
  startDate: string;
  endDate: string;
  prompt: string | null;
  warnings?: string[];
  rows: AdminReviewRecord[];
  counts: AdminReviewCounts;
};

type AdminContentFactsPayload = {
  ok: boolean;
  contentKey: string;
  eventType: string;
  targetDate: string;
  facts: Record<string, unknown>;
  knowledgeIds: string[];
  sourceSnapshot: Record<string, unknown>;
};

type AdminContentStatsPayload = {
  ok: boolean;
  stats: {
    counts: Record<GeneratedContentStatus, number>;
    total: number;
    surface: GeneratedContentSurfaceFilter;
  };
};

const adminSecretStorageKey = "tldrastro:contentAdminSecret";
const adminVoiceTemplateStorageKey = "tldrastro:contentVoiceTemplates";
const adminSlotInfoDismissedStorageKey = "tldrastro:slotDictionaryInfoDismissed";
const adminVoiceTemplateContentKeyPrefix = "admin/voice-template/";

const generatedContentSurfaceLabels: Record<GeneratedContentSurfaceFilter, string> = {
  all: "All",
  sky: "Sky",
  you: "You",
  natal: "Natal",
  synastry: "Synastry",
  composite: "Composite",
  relationship: "Relationship",
  modifier: "Modifier"
};

const reviewSurfaceLabels: Record<AdminReviewSurface, { label: string; description: string }> = {
  upcomingAspects: {
    label: "Upcoming Aspects",
    description: "Current-sky aspects in the selected window, ordered by exact or target date."
  },
  transitNatal: {
    label: "Transits to Natal",
    description: "Personal timing rows where a transit is interpreted against a natal placement."
  },
  natalChart: {
    label: "Natal Chart",
    description: "Natal placements and natal aspects with the reader-facing interpretation attached."
  },
  relationshipLayer: {
    label: "Relationship Layer",
    description: "Synastry, composite, and relationship rows for reviewing two-chart copy."
  }
};

const contentStatusFilters: Array<{ key: AdminContentStatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "NEEDS_REVIEW", label: "Needs Review" },
  { key: "SCHEDULED", label: "Reviewed" },
  { key: "LIVE", label: "Published" },
  { key: "ARCHIVED", label: "Archived" }
];

const contentCategoryFilters: Array<{ key: AdminContentCategoryFilter; label: string }> = [
  { key: "all", label: "All categories" },
  { key: "Sky", label: "Sky" },
  { key: "Natal Aspects", label: "Natal Aspects" },
  { key: "Natal Angles", label: "Natal Angles" },
  { key: "Natal Chart", label: "Natal Chart" },
  { key: "Relationship", label: "Relationship" },
  { key: "Condition Modifiers", label: "Condition Modifiers" }
];

const contentClassFilters: Array<{ key: AdminContentClassFilter; label: string }> = [
  { key: "all", label: "Current rows" },
  { key: "phrasebank", label: "Rich content" },
  { key: "fallback-hook", label: "Fallback hooks" },
  { key: "vocab", label: "Vocabulary / phrases" },
  { key: "reference", label: "References / articles" },
  { key: "user-generated", label: "User-generated" },
  { key: "other", label: "Other current rows" },
  { key: "legacy", label: "Archive" }
];

const phrasebankTierFilters: Array<{ key: AdminPhrasebankTierFilter; label: string }> = [
  { key: "all", label: "All tiers" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "REVIEWED", label: "Reviewed" },
  { key: "SESSION_APPROVED_DRAFT", label: "Session draft" },
  { key: "none", label: "No tier" }
];

function nextGeneratedContentPreviewMode(mode: GeneratedContentPreviewMode): GeneratedContentPreviewMode {
  if (mode === "normal") return "emergency-floor";
  if (mode === "emergency-floor") return "hide-emergency-floor";
  return "normal";
}

function generatedContentPreviewModeLabel(mode: GeneratedContentPreviewMode) {
  if (mode === "emergency-floor") return "Fallback floor";
  if (mode === "hide-emergency-floor") return "Rich rows only";
  return "Normal";
}

function generatedContentPreviewModeDescription(mode: GeneratedContentPreviewMode) {
  if (mode === "emergency-floor") return "Localhost viewer uses only LIVE fallback hooks, slot templates, and vocabulary rows.";
  if (mode === "hide-emergency-floor") return "Localhost viewer hides fallback hooks and slot templates so rich-row gaps are easier to spot.";
  return "Localhost viewer follows the normal LIVE serving hierarchy.";
}

const compositeRelationshipTypes: Array<{ key: CompositeRelationshipTypeKey; label: string }> = [
  { key: "romantic", label: "Romantic" },
  { key: "friendship", label: "Friendship" },
  { key: "family", label: "Family" },
  { key: "coworkers", label: "Coworkers" },
  { key: "creative", label: "Creative" },
  { key: "exes", label: "Exes" },
  { key: "complicated", label: "Complicated" }
];

type ContentBlockFilterOption = {
  key: AdminContentBlockFilter;
  label: string;
  group?: "Fallbacks" | "Sky" | "You" | "Friends" | "General";
  showInEditor?: boolean;
};

const contentBlockFilters: ContentBlockFilterOption[] = [
  { key: "all", label: "All content types" },
  { key: "fallback_template", label: "Fallback hook/template", group: "Fallbacks" },
  { key: "sky_article", label: "Upcoming transit article", group: "Sky" },
  { key: "lunar_calendar", label: "Lunar calendar entry", group: "Sky" },
  { key: "sky_aspect", label: "Sky aspect card", group: "Sky" },
  { key: "daily_horoscope", label: "Daily horoscope", group: "You" },
  { key: "placement", label: "Natal placement page", group: "You" },
  { key: "angle", label: "Natal angle page", group: "You" },
  { key: "sign", label: "Natal sign block", group: "You" },
  { key: "house", label: "Natal house block", group: "You" },
  { key: "ruler", label: "Natal ruler block", group: "You" },
  { key: "natal_aspect", label: "Natal chart aspect", group: "You" },
  { key: "transit_to_natal_aspect", label: "Transit to natal content", group: "You" },
  { key: "synastry_aspect", label: "Synastry aspect", group: "Friends" },
  { key: "composite_aspect", label: "Composite aspect", group: "Friends" },
  { key: "condition_modifier", label: "Condition modifier", group: "General" },
  { key: "synthesis", label: "Generated chart summary", group: "You", showInEditor: false },
  { key: "essay", label: "General article", group: "General" }
];

const contentBlockEditorGroups: Array<NonNullable<ContentBlockFilterOption["group"]>> = ["Fallbacks", "Sky", "You", "Friends", "General"];
const contentListBlockFilterGroups: Array<NonNullable<ContentBlockFilterOption["group"]>> = ["Sky", "You", "Friends", "General"];

const personalizedContentSurfaces = new Set<GeneratedContentSurface>(["you", "natal", "synastry", "composite", "relationship"]);
const personalizedSampleReviewerNote = "INTERNAL CONTENT TEST. This row is for testing templates, voice, and knowledge hooks. Do not publish it as global app content. Real You, Synastry, Composite, and Relationship content must be generated from user-specific chart or bond facts.";

function isPersonalizedSurface(surface: GeneratedContentSurfaceFilter) {
  return surface !== "all" && personalizedContentSurfaces.has(surface);
}

function surfaceOptionLabel(surface: GeneratedContentSurfaceFilter) {
  if (surface === "all" || surface === "sky") {
    return generatedContentSurfaceLabels[surface];
  }

  return `${generatedContentSurfaceLabels[surface]} content`;
}

function surfaceScopeLabel(surface: GeneratedContentSurfaceFilter) {
  if (surface === "sky") {
    return "Global publishable Sky content";
  }

  if (surface === "modifier") {
    return "Shared condition modifier fragments";
  }

  if (surface === "all") {
    return "All rows";
  }

  return "Internal content tests only";
}

function createQueueButtonLabel(surface: GeneratedContentSurfaceFilter) {
  if (surface === "sky" || surface === "all") {
    return "Prepare Sky Drafts";
  }

  return `Prepare ${generatedContentSurfaceLabels[surface]} Test Drafts`;
}

const voiceTemplateLabels: Record<VoiceTemplateSurface, string> = {
  sky: "Sky",
  fullMoon: "Full Moon",
  newMoon: "New Moon",
  eclipse: "Eclipse",
  natal: "Natal Chart",
  synastry: "Synastry",
  composite: "Composite"
};

const fallbackHookSampleContexts: Record<string, FallbackHookContext> = {
  "sky.seasonal-current": { planet: "Sun", sign: "Gemini", signStyle: "curious, verbal, and changeable attention" },
  "sky.lunar-cycle": { planet: "Moon", sign: "Capricorn", signStyle: "practical, contained, and responsibility-aware", signNeed: "wanting something steady enough to hold up over time" },
  "lunar-calendar/day": {
    arcPlainMeaning: "the cycle is waxing toward a full moon in Capricorn",
    currentSeason: "Cancer season",
    currentSunSign: "Cancer",
    eclipseSeason: "no",
    eclipseSeasonEvent: "",
    eclipseSeasonPlainFlag: "",
    eclipseSeasonType: "",
    lunarArcDirection: "waxing",
    lunarArcPosition: "waxing toward the full moon in Capricorn",
    lunarArcTarget: "full moon",
    lunarArcTargetSign: "Capricorn",
    mercuryRetrograde: "no",
    mercuryRetrogradeEndsAt: "",
    mercuryRetrogradeEvent: "",
    mercuryRxPlainFlag: "",
    mercuryRetrogradeSign: "",
    mercuryRx: "no",
    moonPhaseAction: "feed the new direction without forcing it to be complete",
    moonPhasePlainMeaning: "the cycle is gathering energy after the new moon",
    moonPhaseRole: "early build",
    moonPhase: "Waxing Crescent",
    moonSignMode: "protective, receptive, and led by memory or mood",
    moonSign: "Cancer",
    season: "Cancer season",
    seasonSign: "Cancer",
    seasonTheme: "care, memory, belonging, and emotional safety",
    sunSign: "Cancer"
  },
  "lunar-calendar/arc-new-moon": {
    arcTargetSign: "Capricorn",
    currentSeason: "Cancer season",
    eclipseSeason: "no",
    mercuryRx: "no",
    moonPhase: "New Moon",
    moonSign: "Cancer",
    season: "Cancer season",
    seasonSign: "Cancer",
    sixMonthArcConnection: "Protection to belonging",
    sunSign: "Cancer"
  },
  "lunar-calendar/arc-full-moon": {
    currentSeason: "Cancer season",
    eclipseSeason: "no",
    mercuryRx: "no",
    moonPhase: "Full Moon",
    moonSign: "Capricorn",
    oppositeSign: "Cancer",
    season: "Cancer season",
    seasonSign: "Cancer",
    sixMonthArcConnection: "Protection to belonging",
    sunSign: "Cancer",
    twoWeekArcConnection: "Where protecting yourself became isolating yourself."
  },
  "sky.planetary-placement": { planet: "Venus", sign: "Cancer", planetTopic: "connection, taste, and desire", signStyle: "protective, receptive, and memory-led" },
  "sky.aspect-detail": { planetA: "Mercury", aspect: "square", planetB: "Neptune", planetATopic: "thinking and language", planetBTopic: "imagination and blur" },
  "sky.aspect-sign-context": { planetA: "Mercury", signA: "Cancer", signAStyleShort: "protective feeling", planetB: "Neptune", signB: "Aries", signBStyleShort: "fast instinct" },
  "sky.retrograde": { planet: "Pluto", sign: "Aquarius", planetTopic: "power, pressure, and deep change" },
  "you.natal-placement": { planet: "Moon", sign: "Capricorn", house: 6, planetTopic: "needs and reaction", signStyle: "practical, contained, and responsibility-aware" },
  "you.natal-angle-placement": { angle: "Midheaven", sign: "Capricorn", angleTopic: "visibility, work, reputation, and public direction", signStyle: "practical, contained, and responsibility-aware", birthTimeConfidence: "reliable" },
  "you.natal-aspect": { planetA: "Moon", aspect: "trine", planetB: "Saturn", planetATopic: "needs and reaction", planetBTopic: "structure and limits" },
  "you.transit-to-natal": {
    transitPlanet: "Saturn",
    aspect: "square",
    natalPoint: "Venus",
    transitPlanetTopic: "structure and limits",
    natalPointTopic: "connection, taste, and desire",
    transitPlanetWeather: "commitment, limits, timing, responsibility, and reality checks",
    aspectTone: "friction, pressure, and adjustment",
    personalActivation: "Venus: connection, taste, and desire",
    activatedHouse: "7th",
    activatedHouseTopic: "partnership, conflict, attraction, agreements, and direct one-on-one connection",
    timingIntensity: "loud today",
    timingPhase: "building"
  },
  "you.daily-timing": {
    activeTransit: "Saturn square Venus",
    transitPlanet: "Saturn",
    aspect: "square",
    natalPoint: "Venus",
    transitPlanetTopic: "structure and limits",
    natalPointTopic: "connection, taste, and desire",
    transitPlanetWeather: "commitment, limits, timing, responsibility, and reality checks",
    aspectTone: "friction, pressure, and adjustment",
    personalActivation: "Venus: connection, taste, and desire",
    activatedHouse: "7th",
    activatedHouseTopic: "partnership, conflict, attraction, agreements, and direct one-on-one connection",
    timingIntensity: "loud today",
    timingPhase: "building",
    orb: "0°54'",
    window: "today",
    activatedSign: "Libra",
    activatedRuler: "Venus"
  },
  "friends.synastry-contact": { personA: "Avery", planetA: "Venus", aspect: "sextile", personB: "Mira", planetB: "Ascendant", planetATopic: "connection, taste, and desire", planetBTopic: "presence and first impression" },
  "friends.house-overlay": { personA: "Avery", personB: "Mira", planet: "Venus", house: 4, planetTopic: "connection, taste, and desire", houseLifeArea: "home, privacy, and belonging" },
  "friends.composite-aspect": { planetA: "Sun", aspect: "square", planetB: "Moon", planetATopic: "identity and direction", planetBTopic: "needs and reaction" },
  "friends.composite-placement": { planet: "Venus", sign: "Cancer", house: 4, planetTopic: "connection, taste, and desire" },
  "friends.relationship-timing": { transitPlanet: "Pluto", aspect: "opposition", person: "Mira", natalPoint: "Descendant", transitPlanetTopic: "power, pressure, and deep change", natalPointTopic: "partnership and mirroring" },
  "friends.circle-feed": { topic: "saturn" },
  "settings.life-area-focus": { topic: "career", lifeArea: "Career", lifeAreaDescription: "work, responsibility, visibility, and direction" }
};

function normalizedVocabularyKeyPart(value: string | number | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized === "north-node") {
    return "true-node";
  }

  return normalized;
}

function liveVocabularyRowsByContentKey(rows: AdminGeneratedContentRow[]) {
  return new Map(
    rows
      .filter((row) => row.status === "LIVE")
      .map((row) => [row.content_key, row])
  );
}

type AdminPlanetTopicVariant = "you" | "friend" | "sky" | "natal";

const dashboardVocabularyPrefix = "fallback-vocab";

function fallbackVocabularyContentKey(family: string, keyPart: string) {
  return `${dashboardVocabularyPrefix}/${family}/${keyPart}`;
}

function isVocabularyFamilyKey(contentKey: string, family: string) {
  return contentKey.startsWith(`${dashboardVocabularyPrefix}/${family}/`);
}

function topicPhraseForPreview(row: AdminGeneratedContentRow | undefined, variant: AdminPlanetTopicVariant) {
  const sections = objectValue(row?.sections);
  const topic = objectValue(sections?.topic);
  const requested = stringValue(topic?.[variant]);
  const natal = stringValue(topic?.natal) || row?.body || "";

  return requested || natal || row?.body || "";
}

function signStylePhraseForPreview(row: AdminGeneratedContentRow | undefined, short = false) {
  const sections = objectValue(row?.sections);
  const style = objectValue(sections?.style);
  const phrase = stringValue(style?.phrase) || row?.body || "";
  const shortPhrase = stringValue(style?.short) || stringValue(style?.summary) || row?.summary || phrase;

  return short ? shortPhrase : phrase;
}

function vocabularyPhraseForPreview(
  rowsByContentKey: Map<string, AdminGeneratedContentRow>,
  contentKey: string,
  options: { variant?: AdminPlanetTopicVariant; short?: boolean } = {}
) {
  const row = rowsByContentKey.get(contentKey);

  if (!row) {
    return "";
  }

  if (isVocabularyFamilyKey(contentKey, "planet-topic")) {
    return topicPhraseForPreview(row, options.variant ?? "natal");
  }

  if (isVocabularyFamilyKey(contentKey, "sign-style")) {
    return signStylePhraseForPreview(row, options.short);
  }

  if (isVocabularyFamilyKey(contentKey, "sign-need")) {
    const sections = objectValue(row.sections);
    const need = objectValue(sections?.need);
    const phrase = stringValue(need?.phrase) || row.body || "";
    const natal = stringValue(need?.natal) || phrase;
    const sky = stringValue(need?.sky) || natal;

    return options.variant === "natal" ? natal : sky;
  }

  const sections = objectValue(row.sections);
  const topic = objectValue(sections?.topic);
  const note = objectValue(sections?.note);

  return stringValue(topic?.phrase)
    || stringValue(note?.phrase)
    || row.body
    || "";
}

function setResolvedSampleSlot(
  context: FallbackHookContext,
  slot: string,
  value: string
) {
  if (value) {
    context[slot] = value;
  }
}

function resolveFallbackHookSampleContextFromVocabulary(
  hookKey: string,
  rowsByContentKey: Map<string, AdminGeneratedContentRow>
) {
  const context: FallbackHookContext = { ...fallbackHookSampleContextForKey(hookKey) };
  const isSkyHook = hookKey.startsWith("sky.");
  const planetTopicVariant: AdminPlanetTopicVariant = isSkyHook
    ? "sky"
    : hookKey.startsWith("friends.")
      ? "friend"
      : hookKey.startsWith("you.")
        ? "you"
        : "natal";
  const signStyleSlot = (slot: string, signSlot: string, short = false) => {
    const sign = context[signSlot];
    const phrase = vocabularyPhraseForPreview(
      rowsByContentKey,
      fallbackVocabularyContentKey("sign-style", normalizedVocabularyKeyPart(sign)),
      { short }
    );

    setResolvedSampleSlot(context, slot, phrase);
  };
  const signNeedSlot = (slot: string, signSlot: string) => {
    const sign = context[signSlot];
    const phrase = vocabularyPhraseForPreview(
      rowsByContentKey,
      fallbackVocabularyContentKey("sign-need", normalizedVocabularyKeyPart(sign))
    );

    setResolvedSampleSlot(context, slot, phrase);
  };
  const planetTopicSlot = (slot: string, planetSlot: string, variant: AdminPlanetTopicVariant = planetTopicVariant) => {
    const planet = context[planetSlot];
    const phrase = vocabularyPhraseForPreview(
      rowsByContentKey,
      fallbackVocabularyContentKey("planet-topic", normalizedVocabularyKeyPart(planet)),
      { variant }
    );

    setResolvedSampleSlot(context, slot, phrase);
  };

  planetTopicSlot("planetTopic", "planet");
  planetTopicSlot("planetATopic", "planetA");
  planetTopicSlot("planetBTopic", "planetB");
  planetTopicSlot("transitPlanetTopic", "transitPlanet", "sky");
  planetTopicSlot("natalPointTopic", "natalPoint", planetTopicVariant === "friend" ? "friend" : planetTopicVariant === "sky" ? "natal" : "you");
  signStyleSlot("signStyle", "sign");
  signStyleSlot("signAStyle", "signA");
  signStyleSlot("signBStyle", "signB");
  signStyleSlot("signAStyleShort", "signA", true);
  signStyleSlot("signBStyleShort", "signB", true);
  signNeedSlot("signNeed", "sign");

  const house = context.house;
  const houseTopic = vocabularyPhraseForPreview(
    rowsByContentKey,
    fallbackVocabularyContentKey("house-life-area", normalizedVocabularyKeyPart(house))
  );

  setResolvedSampleSlot(context, "houseTopic", houseTopic);
  setResolvedSampleSlot(context, "houseLifeArea", houseTopic);

  const angle = context.angle;
  const angleTopic = vocabularyPhraseForPreview(
    rowsByContentKey,
    fallbackVocabularyContentKey("angle-topic", normalizedVocabularyKeyPart(angle))
  );

  setResolvedSampleSlot(context, "angleTopic", angleTopic);

  const retrogradeNote = vocabularyPhraseForPreview(
    rowsByContentKey,
    fallbackVocabularyContentKey("retrograde-note", normalizedVocabularyKeyPart(context.planet))
  );

  setResolvedSampleSlot(context, "retrogradeNote", retrogradeNote);

  return context;
}

function adminPageTitle(activePage: AdminDashboardPage) {
  if (activePage === "overview") return "Content Studio";
  if (activePage === "articles") return "Articles";
  if (activePage === "releaseNotes") return "Release Notes";
  if (activePage === "connection") return "Connection";
  if (activePage === "appBehavior") return "App Behavior";
  if (activePage === "templates") return "Templates";
  if (activePage === "reviewQueue") return "Review Queue";
  if (activePage === "compositeByType") return "Composite Review";
  if (activePage === "vocabulary") return "Vocabulary & Phrases";
  if (activePage === "slotDictionary") return "Slots";
  if (activePage === "knowledge") return "Fallback Hooks";
  if (activePage === "hooks") return "Surface Map";
  return "Exact Content";
}

function adminPageBreadcrumb(activePage: AdminDashboardPage) {
  if (activePage === "overview") return "Admin / Home";
  if (activePage === "articles") return "Admin / Write / Articles";
  if (activePage === "releaseNotes") return "Admin / Release notes";
  if (activePage === "connection") return "Admin / Connection";
  if (activePage === "appBehavior") return "Admin / App behavior";
  if (activePage === "templates") return "Admin / Composition / Templates";
  if (activePage === "reviewQueue") return "Admin / Publish / Review queue";
  if (activePage === "compositeByType") return "Admin / Write / Composite review";
  if (activePage === "vocabulary") return "Admin / Composition / Vocabulary & phrases";
  if (activePage === "slotDictionary") return "Admin / Composition / Slots";
  if (activePage === "knowledge") return "Admin / Composition / Fallback hooks";
  if (activePage === "hooks") return "Admin / App surfaces / Surface map";
  return "Admin / Write / Exact content";
}

function adminPageDescription(activePage: AdminDashboardPage) {
  if (activePage === "overview") {
    return "Start here when you need to write, compose template language, diagnose a public surface, or publish approved rows.";
  }

  if (activePage === "articles") {
    return "Draft long-form editorial pieces and reusable article excerpts. Article rows live here instead of being mixed into fallback hooks or vocabulary.";
  }

  if (activePage === "releaseNotes") {
    return "Track product updates across the internal dashboard and the public app in one chronological log.";
  }

  if (activePage === "connection") {
    return "Manage admin access, calculation API status, deploy links, and portable settings.";
  }

  if (activePage === "appBehavior") {
    return "Manage app-setting toggles that change how the public app renders content.";
  }

  if (activePage === "templates") {
    return "Edit Mustache templates and voice scaffolds. Use this when sentence structure or slot placement is wrong.";
  }

  if (activePage === "reviewQueue") {
    return "Review authored and generated rows by family, move copy through editorial approval, and lock finished evergreen rows.";
  }

  if (activePage === "compositeByType") {
    return "Review relationship-type composite copy and keep romantic language gated to romantic relationships.";
  }

  if (activePage === "vocabulary") {
    return "Edit reusable words, clauses, and short phrases that fill template slots, such as planet topics, house topics, signs, angles, lunar phrases, and relationship language.";
  }

  if (activePage === "slotDictionary") {
    return "Look up template placeholders. If you are trying to fix prose on a public page, start with Surface Map instead.";
  }

  if (activePage === "knowledge") {
    return "Edit fallback-hook rows by surface. These are the full-sentence safety templates that render when exact content and rich composition miss.";
  }

  if (activePage === "hooks") {
    return "Read-only routing map for public surfaces. Use it to answer which source-grounded files, phrasebank rows, knowledge bundles, and source-based madlibs create each card.";
  }

  return "Create and edit exact authored rows for a specific surface, date, chart factor, or relationship context.";
}

function writingSurfaceStatusClass(status: WritingSurfaceStatus) {
  return `status-${status.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

function writingSurfaceStatusCounts() {
  return writingSurfaceSourceMap.reduce<Record<WritingSurfaceStatus | "total", number>>((counts, item) => {
    counts.total += 1;
    counts[item.status] += 1;
    return counts;
  }, {
    total: 0,
    normalized: 0,
    partial: 0,
    "not-normalized": 0
  });
}

function writingSurfaceEditableSources(surface: WritingSurfaceMapItem) {
  const editableRoles: Array<WritingSurfaceMapItem["sources"][number]["role"]> = [
    "source-grounded",
    "phrasebank",
    "knowledge",
    "madlib-material",
    "stored-source"
  ];
  const editableSources = surface.sources.filter((source) => editableRoles.includes(source.role));

  return editableSources.length ? editableSources : surface.sources.filter((source) => source.role !== "renderer");
}

function writingSurfaceContentCategory(area: WritingSurfaceMapItem["area"]): AdminContentCategoryFilter {
  if (area === "Friends") return "Relationship";
  if (area === "Natal") return "Natal Chart";
  if (area === "Sky" || area === "Transits") return "Sky";

  return "all";
}

function writingSurfaceFallbackSection(area: WritingSurfaceMapItem["area"]): AdminFallbackHookSectionFilter {
  if (area === "Friends") return "friends";
  if (area === "Natal") return "you";
  if (area === "Sky" || area === "Transits") return "sky";
  if (area === "System") return "settings";

  return "all";
}

function writingSurfaceSourceActionLabel(source: WritingSurfaceSourceItem) {
  if (source.role === "source-grounded" || source.role === "stored-source") return "Open Exact Content";
  if (source.role === "knowledge" || source.role === "madlib-material") return "Open Fallback Hooks";
  if (source.role === "phrasebank") return "Find Imported Rows";

  return "File Source";
}

function writingSurfaceSourceActionHelp(source: WritingSurfaceSourceItem) {
  if (source.role === "source-grounded") return "Editable after the source-grounded rows are imported into Exact Content.";
  if (source.role === "stored-source") return "Editable in Exact Content when this source exists as a managed row.";
  if (source.role === "knowledge") return "Editable through the fallback hook or knowledge-row editor.";
  if (source.role === "madlib-material") return "Editable through Fallback Hooks or source-based fallback material.";
  if (source.role === "phrasebank") return "Usually authored in phrasebank files, then imported/synced into the app.";

  return "This is a code/spec file. Edit it in the repo, not in the content dashboard.";
}

function writingSurfaceSourceCanOpen(source: WritingSurfaceSourceItem) {
  return source.role === "source-grounded"
    || source.role === "phrasebank"
    || source.role === "knowledge"
    || source.role === "madlib-material"
    || source.role === "stored-source";
}

function writingSurfaceSourceActionClass(source: WritingSurfaceSourceItem) {
  const opensContent = source.role === "source-grounded" || source.role === "phrasebank" || source.role === "stored-source";

  return `admin-source-action ${opensContent ? "admin-source-action-primary" : "admin-source-action-secondary"}`;
}

function adminHashForPage(page: AdminDashboardPage, params?: URLSearchParams) {
  const query = params?.toString();
  return `#${adminPageHashKeys[page]}${query ? `?${query}` : ""}`;
}

function parseAdminHash(hash: string) {
  const rawHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const queryStart = rawHash.indexOf("?");
  const key = queryStart >= 0 ? rawHash.slice(0, queryStart) : rawHash;
  const query = queryStart >= 0 ? rawHash.slice(queryStart + 1) : "";

  return {
    key,
    params: new URLSearchParams(query)
  };
}

function isAdminContentCategoryFilter(value: string | null): value is AdminContentCategoryFilter {
  return Boolean(value) && contentCategoryFilters.some((filter) => filter.key === value);
}

function isAdminContentClassFilter(value: string | null): value is AdminContentClassFilter {
  return Boolean(value) && contentClassFilters.some((filter) => filter.key === value);
}

function isAdminVocabularyCategoryFilter(value: string | null): value is AdminVocabularyCategoryFilter {
  return Boolean(value) && ([
    "all",
    "planets",
    "houses",
    "angles",
    "zodiac",
    "lunar",
    "eclipses",
    "career",
    "relationship"
  ] as AdminVocabularyCategoryFilter[]).includes(value as AdminVocabularyCategoryFilter);
}

function isAdminFallbackHookSectionFilter(value: string | null): value is AdminFallbackHookSectionFilter {
  return Boolean(value) && fallbackHookSectionFilters.some((filter) => filter.key === value);
}

function normalizedWritingSurfaceAreaFilter(value: string | null): WritingSurfaceAreaFilter | null {
  if (!value) return null;
  if (value === "all") return "all";

  return writingSurfaceSourceMap.find((surface) => surface.area.toLowerCase() === value.toLowerCase())?.area ?? null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function titleFromVocabularyContentKey(contentKey: string) {
  const slug = contentKey.split("/").pop() ?? contentKey;

  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function eclipseCycleHeadline(contentKey: string) {
  const slug = contentKey.split("/").pop() ?? contentKey;
  const labels: Record<string, string> = {
    intro: "Eclipse Cycle > Season Overview",
    lunar: "Eclipse Cycle > Lunar Eclipse",
    solar: "Eclipse Cycle > Solar Eclipse",
    "ritual-note": "Eclipse Cycle > Ritual Guidance"
  };

  return labels[slug] ?? `Eclipse Cycle > ${titleFromVocabularyContentKey(contentKey)}`;
}

function vocabularyHeadline(row: AdminGeneratedContentRow) {
  const headline = row.headline?.trim().replace(/\s+Topic$/i, "");
  const isShortEclipseHeadline = headline && ["Intro", "Lunar", "Solar", "Ritual Note"].includes(headline);

  if (row.content_key.startsWith("vocab/eclipse-cycle/") && (!headline || isShortEclipseHeadline)) {
    return eclipseCycleHeadline(row.content_key);
  }

  return headline || titleFromVocabularyContentKey(row.content_key);
}

function localVocabularyCompanionRow(contentKey: string, point: string, sourceRow?: AdminGeneratedContentRow): AdminGeneratedContentRow {
  const family = vocabularyRowFamily(contentKey);
  const companionLabel = family === "planet-shadow"
    ? "Planet Shadow"
    : family === "house-shadow"
      ? "House Shadow"
      : family === "higher-expression"
        ? "Higher Expression"
        : "Vocabulary";
  const now = new Date().toISOString();

  return {
    id: `local:${contentKey}`,
    content_key: contentKey,
    surface: sourceRow?.surface ?? "natal",
    mode: sourceRow?.mode ?? "feed",
    status: "DRAFT",
    event_type: sourceRow?.event_type ?? "vocabulary",
    target_date: null,
    headline: `${point} ${companionLabel}`,
    summary: null,
    body: "",
    sections: null,
    block_type: sourceRow?.block_type ?? null,
    facts: null,
    knowledge_ids: null,
    source_snapshot: null,
    reviewer_notes: null,
    prompt_version: sourceRow?.prompt_version ?? "vocab-v1",
    provider: null,
    model: null,
    reviewed_at: null,
    published_at: null,
    updated_at: now,
    created_at: now
  };
}

function vocabularyDraftFromRow(row: AdminGeneratedContentRow): AdminVocabularyDraft {
  const sections = objectValue(row.sections);
  const topic = objectValue(sections?.topic);
  const style = objectValue(sections?.style);
  const need = objectValue(sections?.need);
  const story = objectValue(sections?.story);
  const shadow = objectValue(sections?.shadow);
  const higherExpression = objectValue(sections?.higherExpression);
  const family = vocabularyRowFamily(row.content_key);

  return {
    headline: vocabularyHeadline(row),
    status: row.status,
    you: stringValue(topic?.you),
    friend: stringValue(topic?.friend),
    natal: stringValue(topic?.natal) || row.body || "",
    sky: stringValue(topic?.sky),
    stylePhrase: stringValue(style?.phrase) || row.body || "",
    styleShort: stringValue(style?.short) || stringValue(style?.phrase) || row.summary || row.body || "",
    signNeed: stringValue(need?.natal) || stringValue(need?.sky) || stringValue(need?.phrase) || (family === "sign-need" ? row.body || "" : ""),
    story: stringValue(story?.legend) || stringValue(story?.body) || (family === "zodiac-story" ? row.body || "" : ""),
    shadow: stringValue(shadow?.body) || stringValue(shadow?.phrase) || (family === "planet-shadow" || family === "house-shadow" ? row.body || "" : ""),
    higherExpression: stringValue(higherExpression?.body) || stringValue(higherExpression?.phrase) || (family === "higher-expression" ? row.body || "" : "")
  };
}

function vocabularySectionsFromDraft(row: AdminGeneratedContentRow, draftValue: AdminVocabularyDraft) {
  const existingSections = objectValue(row.sections) ?? {};
  const family = vocabularyRowFamily(row.content_key);
  const nextSections: Record<string, unknown> = { ...existingSections };
  const storyText = draftValue.story?.trim() ?? "";
  const signNeedText = draftValue.signNeed?.trim() ?? "";
  const shadowText = draftValue.shadow?.trim() ?? "";
  const higherExpressionText = draftValue.higherExpression?.trim() ?? "";

  if (family === "sign-style") {
    nextSections.style = {
      phrase: draftValue.stylePhrase ?? "",
      short: draftValue.styleShort ?? ""
    };
    nextSections.need = {
      ...(objectValue(existingSections.need) ?? {}),
      natal: signNeedText,
      sky: signNeedText,
      phrase: signNeedText
    };
    nextSections.story = {
      ...(objectValue(existingSections.story) ?? {}),
      legend: storyText
    };
    nextSections.shadow = {
      ...(objectValue(existingSections.shadow) ?? {}),
      body: shadowText
    };
  } else if (family === "zodiac-story") {
    nextSections.story = {
      ...(objectValue(existingSections.story) ?? {}),
      legend: storyText
    };
  } else if (family === "sign-need") {
    nextSections.need = {
      ...(objectValue(existingSections.need) ?? {}),
      natal: signNeedText,
      sky: signNeedText,
      phrase: signNeedText
    };
  } else if (family === "planet-shadow" || family === "house-shadow") {
    nextSections.shadow = {
      ...(objectValue(existingSections.shadow) ?? {}),
      body: shadowText
    };
  } else if (family === "higher-expression") {
    nextSections.higherExpression = {
      ...(objectValue(existingSections.higherExpression) ?? {}),
      body: higherExpressionText
    };
  } else {
    nextSections.topic = {
      you: draftValue.you ?? "",
      friend: draftValue.friend ?? "",
      natal: draftValue.natal,
      sky: draftValue.sky
    };
  }

  return nextSections;
}

function vocabularyBodyFromDraft(row: AdminGeneratedContentRow, draftValue: AdminVocabularyDraft) {
  const family = vocabularyRowFamily(row.content_key);

  if (family === "sign-style") return draftValue.stylePhrase ?? "";
  if (family === "sign-need") return draftValue.signNeed ?? "";
  if (family === "zodiac-story") return draftValue.story ?? "";
  if (family === "planet-shadow" || family === "house-shadow") return draftValue.shadow ?? "";
  if (family === "higher-expression") return draftValue.higherExpression ?? "";
  return draftValue.natal;
}

function vocabularySummaryFromDraft(row: AdminGeneratedContentRow, draftValue: AdminVocabularyDraft) {
  return vocabularyRowFamily(row.content_key) === "sign-style" ? draftValue.styleShort ?? "" : undefined;
}

function vocabularyDraftFromImportRow(row: AdminContentExchangeBundle["vocabularyRows"][number]): AdminVocabularyDraft {
  return {
    headline: row.headline || titleFromVocabularyContentKey(row.contentKey),
    status: "DRAFT",
    you: row.you ?? "",
    friend: row.friend ?? "",
    natal: row.natal ?? "",
    sky: row.sky ?? "",
    stylePhrase: row.stylePhrase || row.natal || "",
    styleShort: row.styleShort || row.sky || row.stylePhrase || row.natal || "",
    signNeed: row.signNeed || row.natal || "",
    story: row.story ?? "",
    shadow: row.shadow ?? "",
    higherExpression: row.higherExpression ?? ""
  };
}

function vocabularyRowKind(contentKey: string): "topic" | "sign-style" {
  return isVocabularyFamilyKey(contentKey, "sign-style") ? "sign-style" : "topic";
}

function vocabularyRowFamily(contentKey: string): "topic" | "single-phrase" | "sign-style" | "sign-need" | "zodiac-story" | "planet-shadow" | "house-shadow" | "higher-expression" {
  if (isVocabularyFamilyKey(contentKey, "sign-style")) return "sign-style";
  if (isVocabularyFamilyKey(contentKey, "sign-need")) return "sign-need";
  if (
    contentKey.startsWith("vocab/relationship-context/") ||
    contentKey.startsWith("fallback-vocab/aspect-verb/") ||
    contentKey.startsWith("fallback-vocab/aspect-feel/") ||
    contentKey.startsWith("fallback-vocab/aspect-adj/")
  ) {
    return "single-phrase";
  }
  if (contentKey.startsWith("vocab/zodiac-story/") || contentKey.startsWith("vocab/zodiac-cycle/")) return "zodiac-story";
  if (contentKey.startsWith("vocab/planet-shadow/")) return "planet-shadow";
  if (contentKey.startsWith("vocab/house-shadow/")) return "house-shadow";
  if (contentKey.startsWith("vocab/higher-expression/")) return "higher-expression";
  return "topic";
}

function isCareerVocabularyContentKey(contentKey: string) {
  if (
    contentKey.startsWith("vocab/house-career/") ||
    contentKey.startsWith("vocab/house-cusp-element/") ||
    contentKey.startsWith("vocab/element-career/") ||
    contentKey.startsWith("vocab/mode-career/") ||
    contentKey.startsWith("vocab/hemisphere/") ||
    contentKey.startsWith("vocab/mc-element/") ||
    contentKey.startsWith("vocab/planet-in-10th/") ||
    contentKey.startsWith("vocab/saturn-mastery/") ||
    contentKey.startsWith("vocab/north-node-mode/")
  ) {
    return true;
  }

  return false;
}

function vocabularyItemCategory(item: Pick<AdminVocabularyCardItem, "contentKey" | "kind" | "taglineContentKey">): AdminVocabularyCategoryFilter {
  if (isCareerVocabularyContentKey(item.contentKey)) {
    return "career";
  }

  if (item.contentKey.startsWith("vocab/relationship-context/") || isVocabularyFamilyKey(item.contentKey, "relationship-context")) {
    return "relationship";
  }

  if (item.contentKey.startsWith("vocab/lunar-phase/") || item.contentKey.startsWith("vocab/lunar-archetype/") || isVocabularyFamilyKey(item.contentKey, "lunar-phase") || isVocabularyFamilyKey(item.contentKey, "lunar-archetype")) {
    return "lunar";
  }

  if (item.contentKey.startsWith("vocab/eclipse-cycle/") || isVocabularyFamilyKey(item.contentKey, "eclipse-cycle")) {
    return "eclipses";
  }

  if (item.kind === "sign-style" || isVocabularyFamilyKey(item.contentKey, "sign-style") || isVocabularyFamilyKey(item.contentKey, "sign-need") || item.contentKey.startsWith("vocab/zodiac-story/") || item.contentKey.startsWith("vocab/zodiac-cycle/") || item.contentKey.startsWith("vocab/higher-expression/sign/") || item.contentKey.startsWith("vocab/higher-expression/zodiac/")) {
    return "zodiac";
  }

  if (isVocabularyFamilyKey(item.contentKey, "house-life-area") || item.contentKey.startsWith("vocab/house-shadow/") || item.contentKey.startsWith("vocab/higher-expression/house/")) {
    return "houses";
  }

  if (isVocabularyFamilyKey(item.contentKey, "angle-topic") || item.contentKey.startsWith("vocab/angle-topic/")) {
    return "angles";
  }

  if (isVocabularyFamilyKey(item.contentKey, "planet-topic") || item.contentKey.startsWith("vocab/planet-shadow/") || item.contentKey.startsWith("vocab/planetary-word-bank/") || item.contentKey.startsWith("vocab/higher-expression/planet/") || item.contentKey.startsWith("vocab/natal-card-tagline/") || item.taglineContentKey) {
    return "planets";
  }

  return "all";
}

function vocabularyRowDisplayStatus(row: AdminGeneratedContentRow | undefined, drafts: Record<string, AdminVocabularyDraft>): GeneratedContentStatus | undefined {
  return row ? drafts[row.id]?.status ?? row.status : undefined;
}

function vocabularyItemStatus(item: AdminVocabularyCardItem, drafts: Record<string, AdminVocabularyDraft> = {}): GeneratedContentStatus {
  return vocabularyRowDisplayStatus(item.row, drafts)
    ?? vocabularyRowDisplayStatus(item.signNeedRow, drafts)
    ?? vocabularyRowDisplayStatus(item.storyRow, drafts)
    ?? vocabularyRowDisplayStatus(item.shadowRow, drafts)
    ?? vocabularyRowDisplayStatus(item.higherExpressionRow, drafts)
    ?? "DRAFT";
}

function vocabularyItemSearchText(item: AdminVocabularyCardItem, draft?: AdminVocabularyDraft | null, taglineDraft?: AdminNatalTaglineDraft | null) {
  return [
    item.contentKey,
    item.point,
    item.kind ?? "",
    vocabularyItemCategory(item),
    draft?.status ?? vocabularyItemStatus(item),
    draft?.headline,
    draft?.you,
    draft?.friend,
    draft?.natal,
    draft?.sky,
    draft?.stylePhrase,
    draft?.styleShort,
    draft?.signNeed,
    draft?.story,
    draft?.shadow,
    draft?.higherExpression,
    taglineDraft?.tagline
  ].filter(Boolean).join(" ").toLowerCase();
}

const signContextAspectCardsSettingKey = "app-setting/sign-context-on-aspect-cards";

function signContextSettingEnabled(row?: AdminGeneratedContentRow | null) {
  const sections = objectValue(row?.sections);
  const enabled = sections?.enabled;

  if (typeof enabled === "boolean") {
    return enabled;
  }

  const normalizedBody = row?.body?.trim().toLowerCase();

  if (normalizedBody && ["off", "false", "disabled", "0"].includes(normalizedBody)) {
    return false;
  }

  return true;
}

function skyHistoricalLookbackSettingEnabled(row?: AdminGeneratedContentRow | null) {
  const sections = objectValue(row?.sections);
  const enabled = sections?.enabled ?? sections?.[skyHistoricalLookbackSettingId];

  if (typeof enabled === "boolean") {
    return enabled;
  }

  if (typeof row?.body === "string") {
    const normalizedBody = row.body.trim().toLowerCase();

    if (["off", "false", "disabled", "0"].includes(normalizedBody)) {
      return false;
    }

    if (["on", "true", "enabled", "1"].includes(normalizedBody)) {
      return true;
    }
  }

  return false;
}

function templateDraftFromRow(row: AdminGeneratedContentRow): AdminTemplateDraft {
  return {
    headline: adminReaderCopyOrEmpty(row.headline ?? ""),
    summary: adminReaderCopyOrEmpty(row.summary ?? ""),
    body: adminReaderCopyOrEmpty(row.body ?? ""),
    status: row.status
  };
}

function taglineValueFromRow(row: AdminGeneratedContentRow) {
  const sections = objectValue(row.sections);
  const tagline = objectValue(sections?.tagline);

  return stringValue(tagline?.natal) || stringValue(tagline?.text) || row.body || "";
}

function pointFromTaglineContentKey(contentKey: string) {
  const slug = contentKey.split("/").pop() ?? contentKey;
  const matchedPoint = natalCardTaglinePoints.find((point) => normalizedNatalCardTaglinePoint(point) === slug);

  return matchedPoint ?? titleFromVocabularyContentKey(contentKey);
}

function taglineDraftFromRow(row: AdminGeneratedContentRow): AdminNatalTaglineDraft {
  const point = pointFromTaglineContentKey(row.content_key);

  return {
    id: row.id,
    point,
    headline: row.headline ?? `${point} Card Tagline`,
    tagline: taglineValueFromRow(row) || fallbackNatalCardTaglines[point] || ""
  };
}

function fallbackTaglineDraft(point: string): AdminNatalTaglineDraft {
  return {
    point,
    headline: `${point} Card Tagline`,
    tagline: fallbackNatalCardTaglines[point] ?? ""
  };
}

function draftMapForVocabularyRows(rows: AdminGeneratedContentRow[]) {
  return Object.fromEntries(rows.map((row) => [row.id, vocabularyDraftFromRow(row)]));
}

function draftMapForTemplateRows(rows: AdminGeneratedContentRow[]) {
  return Object.fromEntries(rows.map((row) => [row.id, templateDraftFromRow(row)]));
}

function draftMapForTaglineRows(rows: AdminGeneratedContentRow[]) {
  return Object.fromEntries(rows.map((row) => [row.content_key, taglineDraftFromRow(row)]));
}

function adminGeneratedContentTargetKey(contentKey: string, targetDate: string | null | undefined, mode: string | null | undefined) {
  return [
    contentKey.trim(),
    targetDate || "",
    mode ?? ""
  ].join("\u0000");
}

function adminGeneratedContentRowTargetKey(row: Pick<AdminGeneratedContentRow, "content_key" | "target_date" | "mode">) {
  return adminGeneratedContentTargetKey(row.content_key, row.target_date, row.mode);
}

function findAdminGeneratedContentRow(
  rows: AdminGeneratedContentRow[],
  target: { id?: string; contentKey: string; targetDate?: string | null; mode?: GeneratedContentMode | string | null }
) {
  const targetKey = target.mode
    ? adminGeneratedContentTargetKey(target.contentKey, target.targetDate ?? null, target.mode)
    : null;

  return rows.find((row) => row.id === target.id || (targetKey ? adminGeneratedContentRowTargetKey(row) === targetKey : row.content_key === target.contentKey));
}

function contextContentKey(hookKey: string) {
  return `fallback-hook/${hookKey}`;
}

const canonicalFallbackTemplateContentKeys: Record<string, string> = {
  "sky.planetary-placement": "slot-template/6B",
  "sky.planetary-placement-retrograde": "slot-template/6A",
  "sky.ingress": "slot-template/6M",
  "sky.aspect-detail": "slot-template/6E",
  "sky.aspect-row": "slot-template/6O",
  "sky.retrograde": "slot-template/6I",
  "sky.station": "slot-template/6H",
  "sky.retrograde-section": "slot-template/6G",
  "you.natal-placement": "slot-template/5K",
  "you.natal-house-placement": "slot-template/5K",
  "you.natal-angle-placement": "slot-template/5L",
  "you.natal-ruler": "slot-template/5H",
  "you.natal-chart-ruler": "slot-template/5H",
  "you.natal-synthesis": "slot-template/5K",
  "you.natal-aspect": "slot-template/5Q",
  "you.transit-to-natal": "slot-template/4A",
  "you.transit-through-house": "slot-template/3B",
  "you.transit-to-angle": "slot-template/4D",
  "friends.composite-aspect": "slot-template/5Q",
  "friends.relationship-timing": "slot-template/4A"
};

function canonicalFallbackTemplateContentKey(hookKey: string) {
  if (hookKey.startsWith("slot-template/")) {
    return hookKey;
  }

  if (hookKey.startsWith("fallback-hook/")) {
    return hookKey;
  }

  return canonicalFallbackTemplateContentKeys[hookKey] ?? null;
}

function fallbackTemplateContentKeysForHook(hookKey: string) {
  if (hookKey.startsWith("slot-template/") || hookKey.startsWith("fallback-hook/")) {
    return [hookKey];
  }

  return [
    canonicalFallbackTemplateContentKey(hookKey),
    contextContentKey(hookKey)
  ].filter((contentKey): contentKey is string => Boolean(contentKey));
}

function findFallbackTemplateRowForHook(rows: AdminGeneratedContentRow[], hookKey: string) {
  for (const contentKey of fallbackTemplateContentKeysForHook(hookKey)) {
    const row = findAdminGeneratedContentRow(rows, {
      contentKey,
      mode: generatedContentModeForFallbackContentKey(contentKey)
    });

    if (row) {
      return row;
    }
  }

  return null;
}

function isFallbackTemplateContentKey(contentKey: string) {
  return contentKey.startsWith("fallback-hook/") || contentKey.startsWith("slot-template/");
}

function isEmergencyFloorReviewRecord(record: Pick<AdminReviewRecord, "contentKey" | "eventType" | "blockType" | "sourceSnapshot" | "rawGlobalRow">) {
  const sourceSnapshot = objectValue(record.sourceSnapshot);
  const rawSourceSnapshot = objectValue(record.rawGlobalRow?.source_snapshot);

  if (sourceSnapshot?.servingFloor === true || rawSourceSnapshot?.servingFloor === true) return true;
  if (sourceSnapshot?.emergencyFloor === true || rawSourceSnapshot?.emergencyFloor === true) return true;

  const contentKey = record.contentKey;
  if (isFallbackTemplateContentKey(contentKey)) return true;

  return contentKey.startsWith("vocab/")
    || contentKey.startsWith("fallback-vocab/")
    || contentKey.startsWith("guide-phrase/")
    || contentKey.startsWith("slot-vocab/")
    || record.eventType === "fallback-hook"
    || record.eventType === "vocabulary"
    || record.blockType === "fallback_template";
}

function fallbackChildBaseHookKey(hookKey: string) {
  const placementMatch = hookKey.match(/^sky\.planetary-placement\/[^/]+\/[^/]+$/);
  if (placementMatch) return "sky.planetary-placement";

  const aspectMatch = hookKey.match(/^sky\.aspect-detail\/[^/]+(?:\/[^/]+)?$/);
  if (aspectMatch) return "sky.aspect-detail";

  return hookKey;
}

function fallbackChildParts(row: Pick<AdminGeneratedContentRow, "content_key">) {
  const hookKey = hookKeyFromFallbackTemplateRow(row);
  const placementMatch = hookKey.match(/^sky\.planetary-placement\/([^/]+)\/([^/]+)$/);

  if (placementMatch) {
    return {
      family: "placement" as const,
      planet: placementMatch[1],
      sign: placementMatch[2]
    };
  }

  const aspectMatch = hookKey.match(/^sky\.aspect-detail\/([^/]+)(?:\/([^/]+))?$/);

  if (aspectMatch) {
    return {
      family: "aspect" as const,
      aspect: aspectMatch[1],
      tier: aspectMatch[2] ?? ""
    };
  }

  return null;
}

function fallbackHookForContextRow(hookKey: string) {
  return fallbackHookByKey(fallbackChildBaseHookKey(hookKey));
}

function fallbackHookSampleContextForKey(hookKey: string): FallbackHookContext {
  const hook = fallbackHookForContextRow(hookKey);

  return fallbackHookSampleContexts[hookKey] ?? (hook ? fallbackHookSampleContexts[hook.key] : undefined) ?? {};
}

function generatedSurfaceForFallbackHook(hookKey: string): GeneratedContentSurface {
  const hook = fallbackHookForContextRow(hookKey);

  if (hook?.domain === "sky") return "sky";
  if (hook?.domain === "relationship") return "relationship";

  return "natal";
}

const extraTemplateCopySeeds: TemplateCopySeedRow[] = [
  {
    contentId: "fallback-hook/sky.aspect-sign-context",
    status: "published",
    contentType: "template",
    fields: {
      title: "Sky Aspect Supporting Sign Line",
      summary: "Right now this runs through {{signA}} and {{signB}}: {{signAStyleShort}} meeting {{signBStyleShort}}.",
      body: "Right now this runs through {{signA}} and {{signB}}: {{signAStyleShort}} meeting {{signBStyleShort}}.",
      bestMove: "Read the aspect through both signs before choosing the next move.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    contentId: "fallback-hook/you.daily-timing",
    status: "published",
    contentType: "template",
    fields: {
      title: "{{activeTransit}}",
      summary: "{{activeTransit}} is the loudest timing signal today. It brings {{aspectTone}} around {{transitPlanetWeather}}. For you, it lands on {{personalActivation}}.",
      body: "Today’s main signal is {{activeTransit}}. This is wider weather around {{transitPlanetWeather}}, moving through {{aspectTone}}.\n\nFor you, it touches {{personalActivation}}. Watch for that theme becoming louder through ordinary moments: a conversation, decision, delay, mood, request, or pressure to respond. The point is not to over-read the day. The point is to notice what asks for attention and choose the cleanest next step.",
      bestMove: "Name the collective weather, then name where it lands personally. Keep the next step practical and proportionate to what is actually happening.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  }
];

const templateCopySeedByContentKey = new Map(
  [
    ...((templateCopySeed as { rows: TemplateCopySeedRow[] }).rows ?? []),
    ...extraTemplateCopySeeds
  ].map((row) => [row.contentId, row])
);

function templateSeedDraftForContentKey(contentKey: string) {
  const seed = templateCopySeedByContentKey.get(contentKey);

  return {
    headline: seed?.fields.title ?? "",
    summary: seed?.fields.summary ?? "",
    body: seed?.fields.body ?? ""
  };
}

function templateSeedForFallbackTemplateRow(row: Pick<AdminGeneratedContentRow, "content_key">) {
  return templateCopySeedByContentKey.get(row.content_key)
    ?? templateCopySeedByContentKey.get(contextContentKey(fallbackChildBaseHookKey(hookKeyFromFallbackTemplateRow(row))))
    ?? null;
}

function isLegacyFallbackTemplateRow(row: Pick<AdminGeneratedContentRow, "content_key" | "prompt_version" | "source_snapshot" | "facts" | "provider" | "model">) {
  const contentKey = row.content_key.toLowerCase();
  const promptVersion = row.prompt_version ?? "";
  const sourceSnapshot = objectValue(row.source_snapshot);
  const sourceName = typeof sourceSnapshot?.source === "string" ? sourceSnapshot.source.toLowerCase() : "";
  const metadata = [
    row.provider,
    row.model,
    promptVersion,
    sourceName,
    JSON.stringify(row.facts ?? {}),
    JSON.stringify(row.source_snapshot ?? {})
  ].join(" ").toLowerCase();

  if (contentKey.startsWith("cc/fallback")) return true;
  if (sourceName.includes("legacy") || sourceName.includes("fallback-template-legacy-restore")) return true;
  if (metadata.includes("legacy copy") || metadata.includes("unsafe copy") || metadata.includes("archived model")) return true;
  if (metadata.includes("replace the headline, summary, and body")) return true;

  return (
    promptVersion !== "fallback-hook-template-v1"
    && promptVersion !== "mustache-madlib-v2.2"
  );
}

function hookSectionForKey(hookKey: string): AdminFallbackHookSectionFilter {
  if (hookKey.startsWith("slot-template/") || hookKey.startsWith("fallback-hook/")) {
    return fallbackHookSectionForRow({
      content_key: hookKey,
      surface: hookKey.startsWith("slot-template/6") ? "sky" : "natal"
    });
  }

  return fallbackHookSectionForRow({
    content_key: contextContentKey(hookKey),
    surface: generatedSurfaceForFallbackHook(hookKey)
  });
}

function fallbackHookSectionForRow(row: Pick<AdminGeneratedContentRow, "content_key" | "surface">): AdminFallbackHookSectionFilter {
  const hook = fallbackHookForContextRow(hookKeyFromFallbackTemplateRow(row));
  const hookLabel = hook?.label.toLowerCase() ?? "";

  if (hookLabel.startsWith("lunar calendar >")) return "lunar-calendar";
  if (hookLabel.startsWith("sky >")) return "sky";
  if (hookLabel.startsWith("natal >")) return "you";
  if (hookLabel.startsWith("you >")) return "you";
  if (hookLabel.startsWith("settings >")) return "settings";
  if (hookLabel.startsWith("friends >")) return "friends";
  if (row.surface === "sky") return "sky";
  if (row.surface === "natal" || row.surface === "you") return "you";
  if (row.surface === "relationship" || row.surface === "synastry" || row.surface === "composite") return "friends";

  return "all";
}

const fallbackHookSectionFilters: Array<{ key: AdminFallbackHookSectionFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "sky", label: "Sky" },
  { key: "you", label: "Natal" },
  { key: "friends", label: "Friends" },
  { key: "lunar-calendar", label: "Lunar Calendar" },
  { key: "settings", label: "Settings" }
];

const baseSlotDictionaryRows: AdminSlotDictionaryRow[] = [
  {
    slot: "{{planet}}",
    label: "Planet name",
    group: "Calculated facts",
    source: "Ephemeris / chart calculation",
    editableIn: "Calculated",
    status: "calculated",
    description: "Literal planet or point name from the active sky, natal chart, or relationship context.",
    examples: ["Moon", "Venus", "Pluto"]
  },
  {
    slot: "{{planetTopic}}",
    label: "Planet topic language",
    group: "Planet language",
    source: "fallback-vocab/planet-topic/{planet}",
    editableIn: "Vocabulary",
    status: "missing",
    description: "Reusable topic phrasing for what a planet governs on Sky, You, Natal, and relationship surfaces.",
    examples: ["fallback-vocab/planet-topic/moon", "fallback-vocab/planet-topic/venus"],
    action: { label: "Open planet vocabulary", page: "vocabulary", vocabularyFilter: "planets" }
  },
  {
    slot: "{{sign}}",
    label: "Zodiac sign name",
    group: "Calculated facts",
    source: "Ephemeris / chart calculation",
    editableIn: "Calculated",
    status: "calculated",
    description: "Literal sign from the calculated placement, Moon event, or season context.",
    examples: ["Aries", "Cancer", "Capricorn"]
  },
  {
    slot: "{{signStyle}}",
    label: "Sign style language",
    group: "Zodiac language",
    source: "fallback-vocab/sign-style/{sign}",
    editableIn: "Vocabulary",
    status: "missing",
    description: "Short reusable texture for how a sign moves, reacts, or changes a planet or event.",
    examples: ["fallback-vocab/sign-style/aries", "fallback-vocab/sign-style/cancer"],
    action: { label: "Open zodiac vocabulary", page: "vocabulary", vocabularyFilter: "zodiac" }
  },
  {
    slot: "{{signNeed}}",
    label: "Sign need language",
    group: "Zodiac language",
    source: "fallback-vocab/sign-need/{sign}",
    editableIn: "Vocabulary",
    status: "missing",
    description: "Reusable language for what a sign wants, protects, or requires in interpretation templates.",
    examples: ["fallback-vocab/sign-need/aries", "fallback-vocab/sign-need/cancer"],
    action: { label: "Open zodiac vocabulary", page: "vocabulary", vocabularyFilter: "zodiac" }
  },
  {
    slot: "{{house}}",
    label: "Natal house number",
    group: "Calculated facts",
    source: "Natal chart calculation",
    editableIn: "Calculated",
    status: "calculated",
    description: "Literal natal house number from the user's chart.",
    examples: ["1st house", "7th house", "12th house"]
  },
  {
    slot: "{{houseTopics}}",
    label: "House topic language",
    group: "House language",
    source: "fallback-vocab/house-life-area/{house}",
    editableIn: "Vocabulary",
    status: "missing",
    description: "Reusable real-life topics for where a placement, transit, or Moon check-in lands in the chart.",
    examples: ["fallback-vocab/house-life-area/1", "fallback-vocab/house-life-area/12"],
    action: { label: "Open house vocabulary", page: "vocabulary", vocabularyFilter: "houses" }
  },
  {
    slot: "{{angle}}",
    label: "Natal angle name",
    group: "Calculated facts",
    source: "Natal chart calculation",
    editableIn: "Calculated",
    status: "calculated",
    description: "Literal chart angle from the user's chart, currently Ascendant or Midheaven for natal angle placement pages.",
    examples: ["Ascendant", "Midheaven"]
  },
  {
    slot: "{{angleTopic}}",
    label: "Angle topic language",
    group: "Angle language",
    source: "fallback-vocab/angle-topic/{angle}",
    editableIn: "Vocabulary",
    status: "missing",
    description: "Reusable topic phrasing for what a natal angle governs, including Midheaven visibility and public direction language.",
    examples: ["fallback-vocab/angle-topic/ascendant", "fallback-vocab/angle-topic/midheaven"],
    action: { label: "Open angle vocabulary", page: "vocabulary", vocabularyFilter: "angles" }
  },
  {
    slot: "{{moonPhase}}",
    label: "Moon phase name",
    group: "Calculated facts",
    source: "Lunar calendar calculation",
    editableIn: "Calculated",
    status: "calculated",
    description: "Literal lunar phase from the calculated lunar calendar day.",
    examples: ["New Moon", "First Quarter", "Full Moon"]
  },
  {
    slot: "{{moonPhaseMeaning}}",
    label: "Moon phase meaning",
    group: "Lunar language",
    source: "vocab/lunar-phase/{phase}",
    editableIn: "Vocabulary",
    status: "missing",
    description: "Reusable phase meaning for templates that need the phase's general function without a full event write-up.",
    examples: ["vocab/lunar-phase/new-moon", "vocab/lunar-phase/last-quarter"],
    action: { label: "Open lunar vocabulary", page: "vocabulary", vocabularyFilter: "lunar" }
  },
  {
    slot: "{{lunarArchetype}}",
    label: "Lunar archetype copy",
    group: "Lunar language",
    source: "fallback-hook/lunation/{phase}/{sign}",
    editableIn: "Fallback hooks",
    status: "missing",
    description: "Moon-sign and phase-specific archetype content used by the Lunar Calendar when exact authored copy is unavailable.",
    examples: ["fallback-hook/lunation/first-quarter/aries", "fallback-hook/lunation/full-moon/cancer"],
    action: { label: "Open lunar fallback hooks", page: "knowledge", fallbackFilter: "lunar-calendar" }
  },
  {
    slot: "{{planet}} + {{sign}}",
    label: "Sky placement child copy",
    group: "Sky language",
    source: "fallback-hook/sky.planetary-placement/{planet}/{sign}",
    editableIn: "Fallback hooks",
    status: "missing",
    description: "Specific collective Sky placement fallback copy used before the generic planetary-placement template.",
    examples: ["fallback-hook/sky.planetary-placement/sun/cancer", "fallback-hook/sky.planetary-placement/lilith/sagittarius"],
    action: { label: "Open Sky fallback hooks", page: "knowledge", fallbackFilter: "sky" }
  },
  {
    slot: "{{aspect}}",
    label: "Sky aspect child copy",
    group: "Aspect language",
    source: "fallback-hook/sky.aspect-detail/{aspect}",
    editableIn: "Fallback hooks",
    status: "missing",
    description: "Aspect-specific fallback copy used before the generic sky.aspect-detail template.",
    examples: ["fallback-hook/sky.aspect-detail/conjunction/feed", "fallback-hook/sky.aspect-detail/square/card"],
    action: { label: "Open Sky fallback hooks", page: "knowledge", fallbackFilter: "sky" }
  },
  {
    slot: "{{personA}} / {{personB}}",
    label: "Relationship names",
    group: "Relationship language",
    source: "Relationship context",
    editableIn: "Calculated",
    status: "calculated",
    description: "Names or labels from the active friend, synastry, or composite context."
  }
];

const slotDictionarySourceFilters: Array<{ key: SlotDictionarySourceFilter; label: string }> = [
  { key: "all", label: "All sources" },
  { key: "calculated", label: "Calculated" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "fallback", label: "Fallback" }
];

const slotDictionaryStatusFilters: Array<{ key: SlotDictionaryStatusFilter; label: string }> = [
  { key: "all", label: "All statuses" },
  { key: "calculated", label: "Calculated" },
  { key: "ready", label: "Ready" },
  { key: "draft", label: "Draft exists" },
  { key: "local", label: "Local only" },
  { key: "missing", label: "Needs rows" }
];

const vocabularyStatusFilters: Array<{ key: AdminVocabularyStatusFilter; label: string }> = [
  { key: "all", label: "All statuses" },
  { key: "DRAFT", label: "Draft" },
  { key: "REVIEWED", label: "Reviewed" },
  { key: "LIVE", label: "Published" },
  { key: "ARCHIVED", label: "Archived" },
  { key: "ERROR", label: "Needs review" }
];

function slotDictionarySourceFilterForRow(row: AdminSlotDictionaryRow): SlotDictionarySourceFilter {
  if (row.editableIn === "Vocabulary") return "vocabulary";
  if (row.editableIn === "Fallback hooks") return "fallback";
  return "calculated";
}

function slotDictionarySourceBadge(row: AdminSlotDictionaryRow) {
  if (row.editableIn === "Vocabulary") return "Vocabulary";
  if (row.editableIn === "Fallback hooks") return "Fallback hook";
  return "Calculated";
}

function slotDictionaryStatusLabel(status: AdminSlotDictionaryRow["status"]) {
  if (status === "calculated") return "Calculated";
  if (status === "ready") return "Ready";
  if (status === "draft") return "Draft exists";
  if (status === "local") return "Local only";
  return "Needs rows";
}

function slotDictionaryStatusTitle(status: AdminSlotDictionaryRow["status"]) {
  if (status === "ready") return "A persisted LIVE row is available for this slot source.";
  if (status === "draft") return "A persisted row exists, but it is not LIVE yet.";
  if (status === "local") return "Only a local built-in placeholder exists; no DB row has been saved.";
  if (status === "missing") return "No matching saved rows were found for this slot source.";
  return "Calculated by the app at render time.";
}

function slotDictionarySearchText(row: AdminSlotDictionaryRow) {
  return [
    row.slot,
    row.label,
    row.group,
    row.source,
    row.editableIn,
    row.status,
    row.description,
    ...(row.examples ?? [])
  ].join(" ").toLowerCase();
}

function slotDictionarySourcePrefix(source: string) {
  return source.includes("{")
    ? source.slice(0, source.indexOf("{"))
    : source;
}

const mustacheSlotPattern = /{{\s*([#/^]?)\s*([a-zA-Z0-9_.-]+)\s*}}/g;

function mustacheSlotsFromText(text?: string | null) {
  if (!text) return [];

  const slots = new Set<string>();
  let match: RegExpExecArray | null;
  mustacheSlotPattern.lastIndex = 0;

  while ((match = mustacheSlotPattern.exec(text)) !== null) {
    const slotName = match[2]?.trim();
    if (!slotName || slotName === ".") continue;
    slots.add(`{{${slotName}}}`);
  }

  return [...slots];
}

function stringifySectionsForSlotScan(sections: AdminGeneratedContentRow["sections"]) {
  if (!sections) return "";
  try {
    return JSON.stringify(sections);
  } catch {
    return "";
  }
}

function mustacheSlotsFromTemplateRow(row: AdminGeneratedContentRow) {
  return new Set([
    ...mustacheSlotsFromText(row.headline),
    ...mustacheSlotsFromText(row.summary),
    ...mustacheSlotsFromText(row.body),
    ...mustacheSlotsFromText(stringifySectionsForSlotScan(row.sections))
  ]);
}

function slotNameFromBraces(slot: string) {
  return slot.replace(/^\{\{/, "").replace(/\}\}$/, "").trim();
}

function readableLabelFromSlotName(name: string) {
  return name
    .replace(/[_.-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slotDictionaryGroupForToken(name: string): AdminSlotDictionaryRow["group"] {
  const normalized = name.toLowerCase();

  if (/(mission|purpose|node|integration|sustaining|developmental|lived|grounded)/.test(normalized)) return "Soul language";
  if (/(career|vocational|work|public|authority|practical|mc|midheaven)/.test(normalized)) return "Career language";
  if (/(transit|transiting|natal_point|natalpoint|orb|window|timing|exact_date|exactdate)/.test(normalized)) return "Transit language";
  if (/(relationship|person_a|persona|person_b|personb|partner|bond|composite|synastry)/.test(normalized)) return "Relationship language";
  if (/(moon|phase|lunation|lunar)/.test(normalized)) return "Lunar language";
  if (/(aspect|conjunction|opposition|square|trine|sextile)/.test(normalized)) return "Aspect language";
  if (/(house|life_area|lifearea)/.test(normalized)) return "House language";
  if (/(angle|ascendant|descendant|ic)/.test(normalized)) return "Angle language";
  if (/(sign|zodiac|dignity|ruler)/.test(normalized)) return "Zodiac language";
  if (/(planet|body|point|chiron|node|sun|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)/.test(normalized)) return "Planet language";
  if (/^(has|is|show|include|with)_/.test(normalized)) return "Template structure";
  if (/(date|time|period|duration|left|window)/.test(normalized)) return "Timing language";
  return "Sky language";
}

function slotDictionaryEditableForToken(name: string): AdminSlotDictionaryRow["editableIn"] {
  const normalized = name.toLowerCase();

  if (/^(has|is|show|include|with)_/.test(normalized)) return "Calculated";
  if (/(person|planet|body|point|sign|house|angle|aspect|orb|date|time|degree|window|relationship_type|relationshiptype|phase|mode)/.test(normalized)) return "Calculated";
  if (/(topic|style|need|language|clause|scene|practice|expression|direction|claim|condition|archetype|meaning|cost|action|response|texture|motif|voice|tone|purpose|career|mission|vocational|authority|integration|discernment)/.test(normalized)) return "Vocabulary";

  return "Fallback hooks";
}

function slotDictionaryActionForDynamicToken(
  name: string,
  editableIn: AdminSlotDictionaryRow["editableIn"],
  group: AdminSlotDictionaryRow["group"]
): AdminSlotDictionaryRow["action"] {
  if (editableIn === "Calculated") return undefined;

  if (editableIn === "Fallback hooks") {
    return { label: "Open fallback hooks", page: "knowledge", fallbackFilter: "all" };
  }

  if (group === "Planet language") return { label: "Open planet vocabulary", page: "vocabulary", vocabularyFilter: "planets" };
  if (group === "Zodiac language") return { label: "Open zodiac vocabulary", page: "vocabulary", vocabularyFilter: "zodiac" };
  if (group === "House language") return { label: "Open house vocabulary", page: "vocabulary", vocabularyFilter: "houses" };
  if (group === "Lunar language") return { label: "Open lunar vocabulary", page: "vocabulary", vocabularyFilter: "lunar" };
  if (group === "Relationship language") return { label: "Open relationship vocabulary", page: "vocabulary", vocabularyFilter: "relationship" };

  return { label: "Open vocabulary", page: "vocabulary", vocabularyFilter: "all" };
}

function slotDictionaryVocabularyRowMatchesToken(row: AdminGeneratedContentRow, tokenName: string) {
  const normalized = tokenName.toLowerCase().replace(/[_.\s]+/g, "-");
  const compact = normalized.replace(/-/g, "");
  const key = row.content_key.toLowerCase();
  const text = [row.headline, row.summary, row.body].join(" ").toLowerCase();

  return key.includes(normalized) || key.replace(/[-_/]/g, "").includes(compact) || text.includes(`{{${tokenName}}}`);
}

function dynamicSlotDictionaryRowsFromTemplates(
  templateRows: AdminGeneratedContentRow[],
  reusableRows: AdminGeneratedContentRow[]
) {
  const rowsBySlot = new Map<string, AdminGeneratedContentRow[]>();

  templateRows
    .filter((row) => isFallbackTemplateContentKey(row.content_key))
    .forEach((row) => {
      mustacheSlotsFromTemplateRow(row).forEach((slot) => {
        const existing = rowsBySlot.get(slot) ?? [];
        existing.push(row);
        rowsBySlot.set(slot, existing);
      });
    });

  return [...rowsBySlot.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([slot, sourceRows]) => {
      const tokenName = slotNameFromBraces(slot);
      const group = slotDictionaryGroupForToken(tokenName);
      const editableIn = slotDictionaryEditableForToken(tokenName);
      const matchingReusableRows = reusableRows.filter((row) => slotDictionaryVocabularyRowMatchesToken(row, tokenName));
      const status: SlotDictionaryStatus = editableIn === "Calculated"
        ? "calculated"
        : editableIn === "Vocabulary"
          ? adminContentReadinessStatus(matchingReusableRows)
          : adminContentReadinessStatus(sourceRows);

      return {
        slot,
        label: readableLabelFromSlotName(tokenName),
        group,
        source: editableIn === "Calculated"
          ? "Calculated at render time"
          : editableIn === "Vocabulary"
            ? `vocabulary or phrase rows for ${tokenName}`
            : "fallback-hook/ or slot-template/ rows",
        editableIn,
        status,
        description: editableIn === "Calculated"
          ? "The app resolves this value from the active sky, chart, relationship, route, or fixture context."
          : editableIn === "Vocabulary"
            ? "Reusable phrase-bank language used by one or more fallback-hook or slot-template rows."
            : "Reusable fallback text or a nested template referenced by saved app copy.",
        examples: [...new Set(sourceRows.map((row) => row.content_key))].slice(0, 4),
        action: slotDictionaryActionForDynamicToken(tokenName, editableIn, group)
      } satisfies AdminSlotDictionaryRow;
    });
}

function placeholderSlotsFromTemplate(value: string) {
  const slots = new Set<string>();
  const placeholderPattern = /\{([a-zA-Z0-9_.-]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = placeholderPattern.exec(value)) !== null) {
    const slotName = match[1]?.trim();
    if (!slotName) continue;
    slots.add(`{{${slotName}}}`);
  }

  return [...slots];
}

function fallbackHookDefinitionSlots(hook: FallbackHookDefinition) {
  const slots = new Set<string>();

  hook.slotKeys?.forEach((slotKey) => slots.add(`{{${slotKey}}}`));
  hook.requiredFacts.forEach((fact) => {
    const tokenName = fact.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (tokenName) slots.add(`{{${tokenName}}}`);
  });
  hook.knowledgeIdTemplates.forEach((template) => {
    placeholderSlotsFromTemplate(template).forEach((slot) => slots.add(slot));
  });
  Object.values(hook.copy).forEach((copyValue) => {
    mustacheSlotsFromText(copyValue).forEach((slot) => slots.add(slot));
  });

  return [...slots];
}

function lunarContentDefinitionSlots(definition: LunarCalendarContentKeyDefinition) {
  return definition.slotKeys.map((slotKey) => `{{${slotKey}}}`);
}

function slotDictionaryRowsFromRuntimeRegistry(
  templateRows: AdminGeneratedContentRow[],
  reusableRows: AdminGeneratedContentRow[]
) {
  const examplesBySlot = new Map<string, Set<string>>();

  function addExample(slot: string, example: string) {
    const examples = examplesBySlot.get(slot) ?? new Set<string>();
    examples.add(example);
    examplesBySlot.set(slot, examples);
  }

  fallbackHookDefinitions.forEach((hook) => {
    fallbackHookDefinitionSlots(hook).forEach((slot) => addExample(slot, hook.key));
  });
  lunarCalendarContentKeyDefinitions.forEach((definition) => {
    lunarContentDefinitionSlots(definition).forEach((slot) => addExample(slot, definition.key));
  });

  return [...examplesBySlot.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([slot, examples]) => {
      const tokenName = slotNameFromBraces(slot);
      const group = slotDictionaryGroupForToken(tokenName);
      const editableIn = slotDictionaryEditableForToken(tokenName);
      const matchingReusableRows = reusableRows.filter((row) => slotDictionaryVocabularyRowMatchesToken(row, tokenName));
      const matchingTemplateRows = templateRows.filter((row) => {
        const key = row.content_key.toLowerCase();
        return [...examples].some((example) => {
          const normalizedExample = example.toLowerCase();
          return key === normalizedExample
            || key === `fallback-hook/${normalizedExample}`
            || key === `slot-template/${normalizedExample}`
            || key.includes(normalizedExample.replace(/\//g, "."))
            || key.includes(normalizedExample);
        });
      });
      const status: SlotDictionaryStatus = editableIn === "Calculated"
        ? "calculated"
        : editableIn === "Vocabulary"
          ? adminContentReadinessStatus(matchingReusableRows)
          : adminContentReadinessStatus(matchingTemplateRows);

      return {
        slot,
        label: readableLabelFromSlotName(tokenName),
        group,
        source: editableIn === "Calculated"
          ? "Runtime hook registry / calculated context"
          : editableIn === "Vocabulary"
            ? `vocabulary or phrase rows for ${tokenName}`
            : "registered fallback-hook or slot-template route",
        editableIn,
        status,
        description: editableIn === "Calculated"
          ? "The active route, sky event, natal chart, friend chart, or relationship context supplies this value at render time."
          : editableIn === "Vocabulary"
            ? "Reusable phrase-bank language required by one or more registered reader surfaces."
            : "Template copy required by one or more registered reader surfaces.",
        examples: [...examples].slice(0, 6),
        action: slotDictionaryActionForDynamicToken(tokenName, editableIn, group)
      } satisfies AdminSlotDictionaryRow;
    });
}

function mergeSlotDictionaryRows(staticRows: AdminSlotDictionaryRow[], dynamicRows: AdminSlotDictionaryRow[]) {
  const rowsBySlot = new Map<string, AdminSlotDictionaryRow>();

  staticRows.forEach((row) => rowsBySlot.set(row.slot, row));
  dynamicRows.forEach((row) => {
    const existing = rowsBySlot.get(row.slot);
    if (!existing) {
      rowsBySlot.set(row.slot, row);
      return;
    }

    rowsBySlot.set(row.slot, {
      ...existing,
      status: existing.status === "calculated" ? existing.status : row.status,
      examples: [...new Set([...(existing.examples ?? []), ...(row.examples ?? [])])].slice(0, 6)
    });
  });

  return [...rowsBySlot.values()].sort((first, second) => {
    const groupSort = first.group.localeCompare(second.group);
    return groupSort || first.slot.localeCompare(second.slot);
  });
}

function fallbackHookSurfaceLabel(row: Pick<AdminGeneratedContentRow, "surface">, hook?: ReturnType<typeof fallbackHookForContextRow>) {
  if (hook?.domain === "natal" && (hook.surface === "you" || row.surface === "you" || row.surface === "natal")) {
    return "natal";
  }

  return hook?.surface ?? row.surface;
}

function generatedContentModeForFallbackHook(hook: FallbackHookDefinition) {
  return hook.mode === "system" ? "feed" : hook.mode;
}

function generatedContentModeForFallbackContentKey(contentKey: string) {
  const child = fallbackChildParts({ content_key: contentKey });

  if (child?.family === "aspect" && child.tier === "expanded") {
    return "in_depth";
  }

  const hook = fallbackHookForContextRow(hookKeyFromFallbackTemplateRow({ content_key: contentKey }));

  return hook ? generatedContentModeForFallbackHook(hook) : "feed";
}

function generatedContentModeForFallbackTemplateRow(row: Pick<AdminGeneratedContentRow, "content_key" | "mode">) {
  const child = fallbackChildParts(row);

  if (child?.family === "aspect" && child.tier === "expanded") {
    return "in_depth";
  }

  return row.mode;
}

function fallbackTemplatePlaceholderRows(savedRows: AdminGeneratedContentRow[] = []) {
  const savedByTargetKey = new Map(savedRows.map((row) => [adminGeneratedContentRowTargetKey(row), row]));
  const now = new Date().toISOString();
  const registeredFallbackTargetKeys = new Set<string>();
  const placeholderRows = fallbackHookDefinitions
    .map((hook) => {
      const contentKey = contextContentKey(hook.key);
      const hookMode = generatedContentModeForFallbackHook(hook);
      const canonicalContentKey = canonicalFallbackTemplateContentKey(hook.key);
      const canonicalRow = canonicalContentKey
        ? findAdminGeneratedContentRow(savedRows, {
          contentKey: canonicalContentKey,
          mode: generatedContentModeForFallbackContentKey(canonicalContentKey)
        })
        : null;
      registeredFallbackTargetKeys.add(adminGeneratedContentTargetKey(contentKey, null, hookMode));
      if (canonicalContentKey) {
        registeredFallbackTargetKeys.add(adminGeneratedContentTargetKey(canonicalContentKey, null, generatedContentModeForFallbackContentKey(canonicalContentKey)));
      }
      if (canonicalRow) {
        return canonicalRow;
      }
      const savedRow = savedByTargetKey.get(adminGeneratedContentTargetKey(contentKey, null, hookMode));

      if (savedRow) {
        return savedRow;
      }
      const seedDraft = templateSeedDraftForContentKey(contentKey);

      return {
        id: `placeholder:${contentKey}`,
        content_key: contentKey,
        surface: generatedSurfaceForFallbackHook(hook.key),
        mode: hookMode,
        status: "DRAFT",
        event_type: "fallback-hook",
        target_date: null,
        headline: seedDraft.headline || hook.copy.headline,
        summary: seedDraft.summary || hook.copy.summary,
        body: seedDraft.body || hook.copy.body,
        sections: [],
        block_type: "fallback_template",
        facts: {
          hook: hook.key,
          surface: hook.surface,
          domain: hook.domain,
          requiredFacts: hook.requiredFacts
        },
        knowledge_ids: [],
        source_snapshot: {
          contentType: "template",
          source: templateCopySeedByContentKey.has(contentKey) ? "template-copy-seed" : "fallback-hook-definition",
          hook: hook.key
        },
        reviewer_notes: "Local placeholder for an unsaved fallback-hook template row.",
        prompt_version: "fallback-hook-template-v1",
        provider: null,
        model: null,
        reviewed_at: null,
        published_at: null,
        updated_at: now,
        created_at: now
      } satisfies AdminGeneratedContentRow;
    });
  const childRows = savedRows.filter((row) => !registeredFallbackTargetKeys.has(adminGeneratedContentRowTargetKey(row)));

  return [...placeholderRows, ...childRows]
    .sort((first, second) => first.content_key.localeCompare(second.content_key));
}

function isFallbackTemplatePlaceholderRow(row: AdminGeneratedContentRow) {
  return row.id.startsWith("placeholder:fallback-hook/");
}

function isLocalPlaceholderGeneratedContentRow(row: AdminGeneratedContentRow) {
  return row.id.startsWith("placeholder:");
}

function adminContentReadinessStatus(rows: AdminGeneratedContentRow[]): Exclude<SlotDictionaryStatus, "calculated"> {
  const persistedRows = rows.filter((row) => !isLocalPlaceholderGeneratedContentRow(row));

  if (persistedRows.some((row) => row.status === "LIVE")) {
    return "ready";
  }

  if (persistedRows.length > 0) {
    return "draft";
  }

  if (rows.some(isLocalPlaceholderGeneratedContentRow)) {
    return "local";
  }

  return "missing";
}

function hookKeyFromFallbackTemplateRow(row: Pick<AdminGeneratedContentRow, "content_key">) {
  return row.content_key.startsWith("fallback-hook/")
    ? row.content_key.replace(/^fallback-hook\//, "")
    : row.content_key;
}

function fallbackChildLabelPart(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function labelForFallbackTemplateRow(row: AdminGeneratedContentRow) {
  const child = fallbackChildParts(row);

  if (child?.family === "placement") {
    return `Sky > Placement / ${fallbackChildLabelPart(child.planet)} in ${fallbackChildLabelPart(child.sign)}`;
  }

  if (child?.family === "aspect") {
    return `Sky > Aspect / ${fallbackChildLabelPart(child.aspect)}${child.tier ? ` / ${fallbackChildLabelPart(child.tier)}` : ""}`;
  }

  const hook = fallbackHookForContextRow(hookKeyFromFallbackTemplateRow(row));

  return hook?.label || row.headline || titleFromVocabularyContentKey(row.content_key);
}

function descriptionForFallbackTemplateRow(row: AdminGeneratedContentRow) {
  const child = fallbackChildParts(row);

  if (child?.family === "placement") {
    return "Specific Sky placement fallback used before the generic planetary-placement template and before local safety-net copy.";
  }

  if (child?.family === "aspect") {
    return "Specific Sky aspect fallback used before the generic aspect-detail template and before local safety-net copy.";
  }

  const hookKey = hookKeyFromFallbackTemplateRow(row);
  const hook = fallbackHookForContextRow(hookKey);

  return hookPlainDescriptions[hookKey] || hook?.description || "Reusable fallback-hook or slot-template row for this app surface.";
}

function previewForFallbackTemplateDraft(draft: AdminTemplateDraft) {
  return compactAdminText(
    [draft.summary, draft.body, draft.headline].find((value) => value && !isAdminImportMetadataText(value)),
    "No fallback copy saved yet."
  );
}

function fallbackTemplatePreviewField(
  contentKey: string,
  field: "headline" | "summary" | "body",
  value: string,
  slots: TemplateSlotValues
) {
  const template = value.trim();

  if (!template) {
    return "";
  }

  return interpolateTemplateString(template, slots, {
    contentKey,
    field
  });
}

function fallbackTemplatePreviewForDraft(
  row: Pick<AdminGeneratedContentRow, "content_key">,
  hookKey: string,
  draft: AdminTemplateDraft,
  previewSlots?: TemplateSlotValues
) {
  const slots = previewSlots ?? fallbackHookSampleContextForKey(hookKey);

  return {
    slots,
    headline: fallbackTemplatePreviewField(row.content_key, "headline", draft.headline, slots),
    summary: fallbackTemplatePreviewField(row.content_key, "summary", draft.summary, slots),
    body: fallbackTemplatePreviewField(row.content_key, "body", draft.body, slots)
  };
}

function fallbackPreviewParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function stringArrayFromCsvValue(value: string | undefined) {
  const text = value?.trim();

  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean);
    }
  } catch {
    return text.split("|").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function contextRowsFromTemplateRows(rows: AdminGeneratedContentRow[]): AdminContentExchangeBundle["contextRows"] {
  const registeredContentKeys = new Set(fallbackHookDefinitions.map((hook) => contextContentKey(hook.key)));
  const topLevelRows = fallbackHookDefinitions.map((hook) => {
    const contentKey = contextContentKey(hook.key);
    const matchedRow = findAdminGeneratedContentRow(rows, {
      contentKey,
      mode: generatedContentModeForFallbackHook(hook)
    });
    const draft = matchedRow ? templateDraftFromRow(matchedRow) : null;
    const sampleContext = fallbackHookSampleContextForKey(hook.key);

    return {
      id: matchedRow?.id,
      contentKey,
      hookKey: hook.key,
      label: hook.label,
      description: hook.description,
      surface: hook.surface,
      mode: hook.mode,
      domain: hook.domain,
      requiredFacts: hook.requiredFacts,
      knowledgeIdPatterns: hook.knowledgeIdTemplates,
      exampleIds: knowledgeIdsForFallbackHook(hook.key, sampleContext),
      headline: draft?.headline || hook.copy.headline,
      summary: draft?.summary || hook.copy.summary,
      body: draft?.body || hook.copy.body,
      bestMove: hook.copy.bestMove
    };
  });
  const childRows = rows
    .filter((row) => isFallbackTemplateContentKey(row.content_key))
    .filter((row) => !registeredContentKeys.has(row.content_key))
    .filter((row) => !isLocalPlaceholderGeneratedContentRow(row))
    .map((row) => {
      const hookKey = hookKeyFromFallbackTemplateRow(row);
      const hook = fallbackHookForContextRow(hookKey);
      const draft = templateDraftFromRow(row);

      return {
        id: row.id,
        contentKey: row.content_key,
        hookKey,
        label: labelForFallbackTemplateRow(row),
        description: descriptionForFallbackTemplateRow(row),
        surface: hook?.surface ?? row.surface,
        mode: row.mode,
        domain: hook?.domain ?? row.surface,
        requiredFacts: hook?.requiredFacts ?? [],
        knowledgeIdPatterns: hook?.knowledgeIdTemplates ?? [],
        exampleIds: [],
        headline: draft.headline,
        summary: draft.summary,
        body: draft.body,
        bestMove: ""
      };
    });

  return [...topLevelRows, ...childRows];
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function csvFromRows(rows: AdminContentCsvRow[]) {
  const columns = [
    "collection",
    "surfaceKey",
    "id",
    "contentKey",
    "hookKey",
    "point",
    "label",
    "description",
    "mode",
    "domain",
    "requiredFacts",
    "knowledgeIdPatterns",
    "exampleIds",
    "headline",
    "summary",
    "body",
    "bestMove",
    "you",
    "friend",
    "natal",
    "sky",
    "stylePhrase",
    "styleShort",
    "signNeed",
    "story",
    "shadow",
    "higherExpression",
    "tagline",
    "template",
    "generationGuide",
    "bannedWords",
    "phraseBank"
  ];

  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column] ?? "")).join(","))
  ].join("\n");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (isQuoted) {
      if (char === "\"" && nextChar === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        isQuoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === "\"") {
      isQuoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);

  const [headers, ...dataRows] = rows.filter((candidate) => candidate.some((value) => value.trim()));

  if (!headers) {
    return [];
  }

  return dataRows.map((dataRow) => Object.fromEntries(
    headers.map((header, index) => [header, dataRow[index] ?? ""])
  ) as AdminContentCsvRow);
}

const hookPlainDescriptions = Object.fromEntries(
  parseCsv(hookCatalogDescriptionsCsv)
    .map((row) => [row.hookKey?.trim(), row.plainDescription?.trim()] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1]))
);

function csvRowsFromContentBundle(bundle: AdminContentExchangeBundle): AdminContentCsvRow[] {
  const settingsRows = (Object.keys(bundle.settings) as VoiceTemplateSurface[]).map((surfaceKey) => ({
    collection: "settings",
    surfaceKey,
    template: bundle.settings[surfaceKey]?.template ?? "",
    generationGuide: bundle.settings[surfaceKey]?.generationGuide ?? "",
    bannedWords: bundle.settings[surfaceKey]?.bannedWords ?? "",
    phraseBank: bundle.settings[surfaceKey]?.phraseBank ?? ""
  }));
  const vocabularyCsvRows = bundle.vocabularyRows.map((row) => ({
    collection: "vocabulary",
    id: row.id ?? "",
    contentKey: row.contentKey,
    headline: row.headline,
    you: row.you ?? "",
    friend: row.friend ?? "",
    natal: row.natal,
    sky: row.sky,
    stylePhrase: row.stylePhrase ?? "",
    styleShort: row.styleShort ?? "",
    signNeed: row.signNeed ?? "",
    story: row.story ?? "",
    shadow: row.shadow ?? "",
    higherExpression: row.higherExpression ?? ""
  }));
  const taglineCsvRows = bundle.taglineRows.map((row) => ({
    collection: "taglines",
    id: row.id ?? "",
    contentKey: row.contentKey,
    point: row.point,
    headline: row.headline,
    tagline: row.tagline
  }));
  const templateCsvRows = bundle.templateRows.map((row) => ({
    collection: "templates",
    id: row.id ?? "",
    contentKey: row.contentKey,
    headline: row.headline,
    summary: row.summary,
    body: row.body
  }));
  const contextCsvRows = bundle.contextRows.map((row) => ({
    collection: "context",
    id: row.id ?? "",
    contentKey: row.contentKey,
    hookKey: row.hookKey,
    label: row.label,
    description: row.description,
    surfaceKey: row.surface,
    mode: row.mode,
    domain: row.domain,
    requiredFacts: JSON.stringify(row.requiredFacts),
    knowledgeIdPatterns: JSON.stringify(row.knowledgeIdPatterns),
    exampleIds: JSON.stringify(row.exampleIds),
    headline: row.headline,
    summary: row.summary,
    body: row.body,
    bestMove: row.bestMove,
  }));

  return [...settingsRows, ...vocabularyCsvRows, ...taglineCsvRows, ...templateCsvRows, ...contextCsvRows];
}

function contentBundleFromCsv(text: string): AdminContentExchangeBundle {
  const csvRows = parseCsv(text);
  const settings: Partial<Record<VoiceTemplateSurface, VoiceTemplateConfig>> = {};
  const vocabularyRows: AdminContentExchangeBundle["vocabularyRows"] = [];
  const taglineRows: AdminContentExchangeBundle["taglineRows"] = [];
  const templateRows: AdminContentExchangeBundle["templateRows"] = [];
  const contextRows: AdminContentExchangeBundle["contextRows"] = [];

  for (const row of csvRows) {
    if (row.collection === "settings" && row.surfaceKey in defaultVoiceTemplates) {
      const surfaceKey = row.surfaceKey as VoiceTemplateSurface;
      settings[surfaceKey] = {
        template: row.template ?? "",
        generationGuide: row.generationGuide ?? "",
        bannedWords: row.bannedWords ?? "",
        phraseBank: row.phraseBank ?? ""
      };
    }

    if (row.collection === "vocabulary" && row.contentKey) {
      vocabularyRows.push({
        id: row.id || undefined,
        contentKey: row.contentKey,
        headline: row.headline ?? "",
        you: row.you ?? "",
        friend: row.friend ?? "",
        natal: row.natal ?? "",
        sky: row.sky ?? "",
        stylePhrase: row.stylePhrase ?? "",
        styleShort: row.styleShort ?? "",
        signNeed: row.signNeed ?? "",
        story: row.story ?? "",
        shadow: row.shadow ?? "",
        higherExpression: row.higherExpression ?? ""
      });
    }

    if (row.collection === "taglines" && row.contentKey) {
      taglineRows.push({
        id: row.id || undefined,
        contentKey: row.contentKey,
        point: row.point || titleFromVocabularyContentKey(row.contentKey),
        headline: row.headline ?? "",
        tagline: row.tagline ?? ""
      });
    }

    if (row.collection === "templates" && row.contentKey) {
      templateRows.push({
        id: row.id || undefined,
        contentKey: row.contentKey,
        headline: row.headline ?? "",
        summary: row.summary ?? "",
        body: row.body ?? ""
      });
    }

    if (row.collection === "context" && (row.hookKey || row.contentKey)) {
      const hookKey = row.hookKey || row.contentKey.replace(/^fallback-hook\//, "");
      const hook = fallbackHookForContextRow(hookKey);
      const requiredFacts = stringArrayFromCsvValue(row.requiredFacts);
      const knowledgeIdPatterns = stringArrayFromCsvValue(row.knowledgeIdPatterns);

      contextRows.push({
        id: row.id || undefined,
        contentKey: row.contentKey || contextContentKey(hookKey),
        hookKey,
        label: row.label || hook?.label || titleFromVocabularyContentKey(hookKey),
        description: row.description || hook?.description || "",
        surface: row.surfaceKey || hook?.surface || "",
        mode: row.mode || row.template || hook?.mode || "",
        domain: row.domain || hook?.domain || "",
        requiredFacts: requiredFacts.length ? requiredFacts : hook?.requiredFacts ?? [],
        knowledgeIdPatterns: knowledgeIdPatterns.length ? knowledgeIdPatterns : hook?.knowledgeIdTemplates ?? [],
        exampleIds: stringArrayFromCsvValue(row.exampleIds),
        headline: row.headline ?? "",
        summary: row.summary ?? "",
        body: row.body ?? "",
        bestMove: row.bestMove ?? ""
      });
    }
  }

  return {
    schema: "tldrastro-admin-content-v1",
    exportedAt: new Date().toISOString(),
    settings,
    vocabularyRows,
    taglineRows,
    templateRows,
    contextRows
  };
}

function contentBundleFromJson(text: string): AdminContentExchangeBundle {
  const parsed = JSON.parse(text) as Partial<AdminContentExchangeBundle>;

  if (parsed.schema !== "tldrastro-admin-content-v1") {
    throw new Error("Import file must use the tldrastro-admin-content-v1 schema.");
  }

  return {
    schema: "tldrastro-admin-content-v1",
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    settings: parsed.settings ?? {},
    vocabularyRows: parsed.vocabularyRows ?? [],
    taglineRows: parsed.taglineRows ?? [],
    templateRows: parsed.templateRows ?? [],
    contextRows: parsed.contextRows ?? []
  };
}

function downloadTextFile(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function contentTypeBadge(row: AdminGeneratedContentRow) {
  const sourceSnapshot = objectValue(row.source_snapshot);
  return stringValue(sourceSnapshot?.contentType);
}

function isEditableTemplateSource(record: AdminReviewRecord) {
  return record.sourceSnapshot?.contentType === "template"
    || record.contentKey.startsWith("fallback-template/")
    || record.blockType === "fallback_template";
}

const lunarCoverageGroupLabels: Record<LunarCalendarContentKeyGroup, string> = {
  "new-moon": "New Moon",
  "full-moon": "Full Moon",
  "first-quarter": "First Quarter",
  "last-quarter": "Last Quarter",
  eclipse: "Eclipse",
  season: "Season",
  "arc-fallback": "Arc Fallback",
  "transit-fallback": "Transit Fallback"
};

const lunarCoverageGroups: LunarCalendarContentKeyGroup[] = [
  "new-moon",
  "full-moon",
  "first-quarter",
  "last-quarter",
  "eclipse",
  "season",
  "arc-fallback",
  "transit-fallback"
];

const lunarCoverageFilterGroups: Record<LunarCoverageFilter, LunarCalendarContentKeyGroup[]> = {
  all: lunarCoverageGroups,
  "lunar-calendar": ["new-moon", "full-moon", "first-quarter", "last-quarter"],
  eclipse: ["eclipse"],
  season: ["season"],
  "transit-fallback": ["transit-fallback"]
};

const lunarCoverageFilters: Array<{ key: LunarCoverageFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "lunar-calendar", label: "Lunar Calendar" },
  { key: "eclipse", label: "Eclipse" },
  { key: "season", label: "Season" },
  { key: "transit-fallback", label: "Transit Fallback" }
];

const zodiacOppositesBySlug: Record<string, string> = {
  aries: "libra",
  taurus: "scorpio",
  gemini: "sagittarius",
  cancer: "capricorn",
  leo: "aquarius",
  virgo: "pisces",
  libra: "aries",
  scorpio: "taurus",
  sagittarius: "gemini",
  capricorn: "cancer",
  aquarius: "leo",
  pisces: "virgo"
};

function lunarCoverageSignPart(definition: LunarCalendarContentKeyDefinition) {
  return definition.key.split("/").at(-1) ?? "";
}

function lunarCoverageVocabDependencies(definition: LunarCalendarContentKeyDefinition) {
  const signPart = lunarCoverageSignPart(definition);
  const dependencies = new Set<string>();

  if (["new-moon", "full-moon", "first-quarter", "last-quarter", "season"].includes(definition.group) && signPart) {
    dependencies.add(fallbackVocabularyContentKey("sign-style", signPart));
  }

  if (["new-moon", "full-moon", "first-quarter", "last-quarter"].includes(definition.group) && signPart) {
    dependencies.add(fallbackVocabularyContentKey("sign-need", signPart));
  }

  if (definition.group === "full-moon" && zodiacOppositesBySlug[signPart]) {
    dependencies.add(fallbackVocabularyContentKey("sign-style", zodiacOppositesBySlug[signPart]));
  }

  if (definition.group === "transit-fallback" && signPart) {
    dependencies.add(fallbackVocabularyContentKey("aspect-verb", signPart));
  }

  return [...dependencies];
}

function lunarCoverageFieldLabel(field: LunarCoverageFieldKey) {
  if (field === "journalPrompt") return "journalPrompt";
  return field;
}

function lunarCoverageFieldFilled(row: AdminGeneratedContentRow | undefined, field: LunarCoverageFieldKey) {
  if (!row) return false;

  if (field === "journalPrompt") {
    const sections = objectValue(row.sections);
    return typeof sections?.journalPrompt === "string" && sections.journalPrompt.trim().length > 0;
  }

  return typeof row[field] === "string" && row[field]?.trim().length > 0;
}

function lunarCoverageDescription(definition: LunarCalendarContentKeyDefinition) {
  if (definition.group === "new-moon") return "Lunar calendar row used for a new moon in this sign.";
  if (definition.group === "full-moon") return "Lunar calendar row used for a full moon in this sign.";
  if (definition.group === "first-quarter") return "Lunar calendar row used when the first quarter Moon is in this sign.";
  if (definition.group === "last-quarter") return "Lunar calendar row used when the last quarter Moon is in this sign.";
  if (definition.group === "eclipse") return "Lunar calendar row used when the selected lunation is an eclipse.";
  if (definition.group === "season") return "Lunar calendar season block used for the current Sun sign.";
  return "Lunar calendar transit note fallback used for an active aspect type.";
}

const releaseNotes: ReleaseNote[] = [
  {
    date: "July 6, 2026",
    time: "4:54 PM EDT",
    title: "Audience-aware vocabulary and safer content updates",
    summary: "Content Ops now separates topic vocabulary by audience while the team tightened the process around live-row imports and targeted vocabulary updates.",
    areas: ["Dashboard", "App"],
    items: [
      "Added You, Friend, Sky, and neutral Natal fallback fields for planet-topic vocabulary so templates can resolve copy by surface without forcing third-person or second-person language everywhere.",
      "Updated app template slots so You pages request You topic copy, friend and relationship surfaces request Friend copy, and Sky surfaces keep collective Sky language.",
      "Updated dashboard fallback previews to resolve slot samples from LIVE vocabulary rows using the same requested to Natal to body fallback chain as runtime.",
      "Identified that the bulk vocabulary importer preserved LIVE status but replaced body and sections wholesale, which caused Sky topic copy to be overwritten by second-person natal phrasing.",
      "Restored the Venus Sky topic phrase and switched recent zodiac-story and house higher-expression authoring updates to targeted DRAFT row patches instead of broad imports."
    ]
  },
  {
    date: "July 5, 2026",
    time: "3:15 PM EDT",
    title: "Provider audit closed for framework drafts",
    summary: "Generated content now stores provider as a first-class column, and the source-backed framework drafts show Claude ownership in Content Ops.",
    areas: ["Dashboard", "App"],
    items: [
      "Added the generated_interpretations provider migration and backfilled existing rows from source snapshots or the Claude default.",
      "Updated source-framework seeding so the five framework drafts write top-level provider instead of relying on source_snapshot metadata.",
      "Removed provider fallbacks from dashboard content reads so Provider reflects the database column directly.",
      "Added Provider to the global Content table and verified the five source-backed framework drafts render as Claude."
    ]
  },
  {
    date: "July 4, 2026",
    time: "4:59 PM EDT",
    title: "Vocabulary taglines and dashboard import/export",
    summary: "Content Ops now manages natal chart card taglines alongside vocabulary phrases, with contextual import/export controls and a Cloud Run console link in Settings.",
    areas: ["Dashboard", "App"],
    items: [
      "Cleaned up the admin dashboard shell with smaller type, flatter panels, denser tables, and Cloud Console-inspired navigation states.",
      "Combined natal phrase, sky phrase, and natal card tagline editing into the Vocabulary tab so planet-card copy can be reviewed in one place.",
      "Added contextual JSON and CSV export/import controls to Settings, Vocabulary, and Templates using compact icon-only download buttons.",
      "Connected natal chart card taglines to dashboard-authored rows while keeping fallback copy for unsaved rows.",
      "Added a Settings Infrastructure block linking directly to the tldrastro-api Cloud Run revisions page for CORS and environment variable checks."
    ]
  },
  {
    date: "July 4, 2026",
    time: "3:05 PM EST",
    title: "Per-user review gate and timing-template coverage",
    summary: "Content Ops now keeps per-user generated rows in review while the app renders approved template copy for daily timing.",
    areas: ["Dashboard", "App"],
    items: [
      "Changed per-user generation so new rows default to Draft unless an authenticated admin explicitly publishes them Live.",
      "Kept per-user Draft rows visible in review records so admins can review personalized daily timing and transit output before publication.",
      "Added the daily timing template fallback and cleaned its timing slots so cards show reader-facing windows and formatted orbs.",
      "Removed stale stored manual-chart aspect meaning reads after the manual_charts cleanup migration."
    ]
  },
  {
    date: "June 6, 2026",
    time: "9:30 PM EST",
    title: "Release notes added to Content Ops",
    summary: "The dashboard now has a dedicated release-notes page for tracking admin and app changes together.",
    areas: ["Dashboard"],
    items: [
      "Added a Release Notes navigation item inside the admin sidebar.",
      "Created a chronological notes view with Dashboard and App tags on each entry.",
      "Designed the page to work without the content-generation secret so status history remains readable."
    ]
  },
  {
    date: "June 6, 2026",
    time: "8:45 PM EST",
    title: "Generated content workflow expanded",
    summary: "Content Ops can now organize review queues, templates, and hook coverage from one dashboard.",
    areas: ["Dashboard", "App"],
    items: [
      "Added review states for draft, reviewed, live, archived, and error content rows.",
      "Connected content hooks to app surfaces that need approved generated or voice-backed copy.",
      "Kept published rows tied to the public app surfaces they support."
    ]
  },
  {
    date: "June 4, 2026",
    time: "4:55 PM EST",
    title: "Voice templates and generation controls",
    summary: "Reusable voice guidance was added for sky, lunar, eclipse, natal, synastry, and composite content families.",
    areas: ["Dashboard"],
    items: [
      "Added editable surface-specific voice templates.",
      "Added banned phrase lists and phrase-bank fields for generation prompts.",
      "Layered row-specific reviewer notes on top of reusable template guidance."
    ]
  },
  {
    date: "June 3, 2026",
    time: "1:20 PM EST",
    title: "Admin generated-content API shipped",
    summary: "The backend admin endpoints now support content creation, review, publishing, and deletion.",
    areas: ["Dashboard", "App"],
    items: [
      "Added authenticated admin endpoints for generated content rows.",
      "Added current-sky fact loading for generation inputs.",
      "Created the path for reviewed content to move from internal review into live app experiences."
    ]
  }
];

const defaultVoiceTemplates: Record<VoiceTemplateSurface, VoiceTemplateConfig> = {
  sky: {
    template: [
      "Use for current sky, daily transits, retrogrades, seasons, lunar cycles, and active aspects.",
      "Keep the headline factual and astrological.",
      "Write in this order: what may be noticeable today, why the astrology explains it, what to do, timing.",
      "Make it actionable. Give one concrete move, such as wait, clarify, write it down, narrow the field, make the call, or choose the next step.",
      "Do not write current sky as a natal personality trait."
    ].join("\n"),
    generationGuide: [
      "Start with the current astrology facts, then use the knowledge base meanings, then apply the TLDR Astro voice.",
      "The first paragraph should describe what the reader may notice in ordinary life.",
      "The second paragraph should explain why the planets, signs, and aspect create that experience.",
      "The final paragraph should give a practical move and the timing window.",
      "If there is a strong aspect to the placement, make the aspect the reason the placement matters today."
    ].join("\n"),
    bannedWords: [
      "same sky, different room",
      "baseline, not today's mood",
      "step into your power",
      "align with your truth",
      "divine timing",
      "highest self",
      "raise your vibration"
    ].join("\n"),
    phraseBank: [
      "You may notice...",
      "This can show up as...",
      "Get it in writing.",
      "Ask the clarifying question.",
      "Let the big decision wait until the aspect clears.",
      "Pick the one idea with a clear next step.",
      "This is strongest today and fades over the next day or so."
    ].join("\n")
  },
  fullMoon: {
    template: [
      "Use for Full Moon articles and in-depth lunar event rows.",
      "Keep the headline astrological and specific, such as Full Moon in Aquarius.",
      "Write as culmination, revelation, release, or a point of emotional clarity.",
      "Name the sign axis when available, because Full Moons work through polarity.",
      "Do not write a Full Moon as a personal guarantee or dramatic prediction."
    ].join("\n"),
    generationGuide: [
      "Open with what may be reaching a peak, becoming visible, or asking to be named.",
      "Explain the Moon sign, the Sun's opposing sign, and any exact aspects that sharpen the event.",
      "Describe the emotional tension in plain language before naming the astrology in detail.",
      "Give one practical release, decision, conversation, or boundary the reader can work with.",
      "Include timing: strongest near the exact Full Moon and felt in the days around it."
    ].join("\n"),
    bannedWords: [
      "manifest",
      "full moon magic",
      "release ritual required",
      "destined",
      "fated",
      "the universe is forcing",
      "everything will be revealed"
    ].join("\n"),
    phraseBank: [
      "Something that has been building may become easier to name.",
      "This is a checkpoint, not a verdict.",
      "Notice what feels louder than usual.",
      "Let the evidence show you what needs attention.",
      "Name the pattern before reacting to it.",
      "The practical move is...",
      "This is strongest around the exact Full Moon and settles over the next few days."
    ].join("\n")
  },
  newMoon: {
    template: [
      "Use for New Moon articles and in-depth lunar event rows.",
      "Keep the headline astrological and specific, such as New Moon in Virgo.",
      "Write as a beginning, reset, seed point, or quiet shift in attention.",
      "Focus on what can be started, clarified, simplified, or intentionally chosen.",
      "Do not overpromise outcomes or write as if intentions guarantee results."
    ].join("\n"),
    generationGuide: [
      "Open with the new cycle and the life theme the sign brings into focus.",
      "Explain the Sun and Moon joined in the same sign, plus any exact aspects shaping the start.",
      "Describe what the reader may feel ready to begin, adjust, or stop carrying.",
      "Give one practical intention or first move that fits the sign and aspects.",
      "Include timing: strongest near the New Moon, unfolding across the coming lunar cycle and larger six-month arc."
    ].join("\n"),
    bannedWords: [
      "manifest your dream life",
      "set powerful intentions",
      "divine timing",
      "highest timeline",
      "call in",
      "quantum leap",
      "new moon magic"
    ].join("\n"),
    phraseBank: [
      "A new cycle begins around...",
      "Start smaller than the fantasy.",
      "Choose the first honest step.",
      "This is a seed point, not a finished result.",
      "Pay attention to what feels newly possible.",
      "The useful move is...",
      "This begins now and develops over the next lunar cycle."
    ].join("\n")
  },
  eclipse: {
    template: [
      "Use for Solar Eclipse and Lunar Eclipse articles or in-depth eclipse rows.",
      "Keep the headline astrological and specific, such as Lunar Eclipse in Pisces.",
      "Write eclipses as accelerated turning points on the nodal axis.",
      "Emphasize observation, integration, and grounding over control.",
      "Do not recommend manifestation or release rituals during eclipse content."
    ].join("\n"),
    generationGuide: [
      "Open by naming that this is not an ordinary lunation; it can close or open a chapter.",
      "Explain the eclipse sign, lunar phase, nodal axis, and any close aspects.",
      "Describe what may be redirected, revealed, interrupted, or made impossible to ignore.",
      "Keep the advice grounded: observe, document what changes, avoid forcing a final answer too quickly.",
      "Include timing: exact date/time if available, plus the larger eclipse season or nodal story when known."
    ].join("\n"),
    bannedWords: [
      "manifest",
      "release ritual",
      "fated soulmate",
      "karmic portal",
      "destiny is forcing",
      "cosmic upgrade",
      "timeline jump"
    ].join("\n"),
    phraseBank: [
      "This is not a regular lunation.",
      "Something may close, open, or redirect faster than expected.",
      "Your job is to notice what is changing before trying to control it.",
      "Let the story clarify before forcing a conclusion.",
      "Track what becomes impossible to ignore.",
      "Stay grounded while the energy settles.",
      "This belongs to a larger eclipse season, not just one day."
    ].join("\n")
  },
  natal: {
    template: [
      "Use for natal placements, natal aspects, houses, chart ruler, and You page chart material.",
      "Describe tendencies, not fixed identity.",
      "Write as an observation: what this person may notice in themselves, why it works that way, where it helps, and where it can become difficult.",
      "Avoid prediction. Avoid telling the person who they are.",
      "Keep the astrology visible enough that the interpretation feels traceable."
    ].join("\n"),
    generationGuide: [
      "Translate the chart factor into lived experience before giving advice.",
      "Explain the internal pattern: what the person tends to feel, remember, want, avoid, or protect.",
      "Name both the useful expression and the pressure point without making the reader feel judged.",
      "If the content is in-depth, include where this pattern may show up in daily life.",
      "Keep every claim traceable to the planet, sign, house, or aspect."
    ].join("\n"),
    bannedWords: [
      "you are",
      "this defines you",
      "broken",
      "trauma response",
      "healing journey",
      "inner child",
      "nervous system"
    ].join("\n"),
    phraseBank: [
      "There can be...",
      "You may recognize this as...",
      "At its best, this gives...",
      "When it becomes difficult...",
      "This often works through...",
      "The useful question is...",
      "Care often feels most believable when..."
    ].join("\n")
  },
  synastry: {
    template: [
      "Use for two-chart relationship contacts, compatibility, friend charts, and Bonds pages.",
      "Write about what happens between the two people, not two separate natal descriptions.",
      "Follow this shape for synastry aspects:",
      "Around them, [emotional/relational experience becomes easier or harder to notice]. They may [specific behavior], which can make it easier to [lived response]. There is something [supportive/challenging/clarifying] here that helps you see [core dynamic].",
      "Their [planet quality] can make it easier/harder to [specific relationship behavior]. When life is [situation], they may [specific effect]. When life is [opposite situation], they can [specific effect]. That kind of [support/pressure/intensity] can help you [growth edge].",
      "The thing to watch is [shadow]. You may both [pattern] before you have really [truth of the aspect].",
      "[Direct advice]. This connection is strongest when [integration], not [avoidance/shadow].",
      "Use names when available. Be direct, specific, and human.",
      "Do not overstate fate, trauma, or permanence."
    ].join("\n"),
    generationGuide: [
      "Treat the contact as a dynamic between two people.",
      "Open with what becomes easier or harder to notice around the other person.",
      "Name the specific behavior one person may bring out and the lived response it creates.",
      "Tie the planet quality to practical relationship behavior, including one supportive condition and one harder condition.",
      "Name the shadow pattern both people can fall into before the real aspect truth is understood.",
      "End with direct advice framed as integration, not avoidance."
    ].join("\n"),
    bannedWords: [
      "soulmate",
      "twin flame",
      "karmic contract",
      "meant to be",
      "toxic",
      "destined",
      "guaranteed"
    ].join("\n"),
    phraseBank: [
      "Around them...",
      "They may...",
      "There is something...",
      "Their [planet quality] can make it easier/harder to...",
      "When life is...",
      "The thing to watch is...",
      "This connection is strongest when..."
    ].join("\n")
  },
  composite: {
    template: [
      "Use for composite chart relationship patterns.",
      "Write about the relationship as its own entity: what the bond tends to create, repeat, protect, avoid, or ask from both people.",
      "Name the purpose of the pattern, the pressure point, and how the relationship can be handled more consciously.",
      "Keep the tone grounded and relational.",
      "Do not turn composite content into individual personality descriptions."
    ].join("\n"),
    generationGuide: [
      "Describe the relationship as a shared pattern rather than either person's individual chart.",
      "Explain what the bond tends to organize around, what it asks from both people, and what it can make harder.",
      "Use practical relationship language, not mystical certainty.",
      "When possible, name what the relationship needs in order to function better.",
      "Avoid declaring the relationship good, bad, doomed, or guaranteed."
    ].join("\n"),
    bannedWords: [
      "this relationship is doomed",
      "perfect match",
      "forever",
      "unbreakable",
      "fated",
      "karmic lesson",
      "divine union"
    ].join("\n"),
    phraseBank: [
      "This bond tends to...",
      "Together, the relationship may create...",
      "The pattern becomes harder when...",
      "The relationship works best when...",
      "Both people may need to...",
      "The pressure point is...",
      "Handled well, this can become..."
    ].join("\n")
  }
};

function loadVoiceTemplates() {
  try {
    const saved = window.localStorage.getItem(adminVoiceTemplateStorageKey);
    const parsed = saved ? JSON.parse(saved) as Partial<Record<VoiceTemplateSurface, string | Partial<VoiceTemplateConfig>>> : {};
    const nextTemplates = { ...defaultVoiceTemplates };

    for (const surfaceKey of Object.keys(defaultVoiceTemplates) as VoiceTemplateSurface[]) {
      const savedValue = parsed[surfaceKey];

      if (typeof savedValue === "string") {
        nextTemplates[surfaceKey] = {
          ...defaultVoiceTemplates[surfaceKey],
          template: savedValue
        };
      } else if (savedValue && typeof savedValue === "object") {
        nextTemplates[surfaceKey] = {
          ...defaultVoiceTemplates[surfaceKey],
          ...savedValue
        };
      }
    }

    return nextTemplates;
  } catch {
    return defaultVoiceTemplates;
  }
}

function voiceTemplateContentKey(surfaceKey: VoiceTemplateSurface) {
  return `${adminVoiceTemplateContentKeyPrefix}${surfaceKey}`;
}

function voiceTemplateSurfaceFromContentKey(contentKey: string) {
  const surfaceKey = contentKey.replace(adminVoiceTemplateContentKeyPrefix, "");

  return surfaceKey in defaultVoiceTemplates ? surfaceKey as VoiceTemplateSurface : null;
}

function voiceTemplateConfigFromRow(row: AdminGeneratedContentRow): VoiceTemplateConfig {
  const sections = objectValue(row.sections);
  const voiceTemplate = objectValue(sections?.voiceTemplate);

  return {
    template: stringValue(voiceTemplate?.template) || row.body || "",
    generationGuide: stringValue(voiceTemplate?.generationGuide) || row.summary || "",
    bannedWords: stringValue(voiceTemplate?.bannedWords),
    phraseBank: stringValue(voiceTemplate?.phraseBank)
  };
}

function voiceTemplateRowPayload(surfaceKey: VoiceTemplateSurface, config: VoiceTemplateConfig) {
  return {
    contentKey: voiceTemplateContentKey(surfaceKey),
    surface: "sky",
    mode: "feed",
    eventType: "voice-setting",
    status: "DRAFT",
    promptVersion: "admin-voice-template-v1",
    headline: voiceTemplateLabels[surfaceKey],
    summary: config.generationGuide,
    body: config.template,
    sections: {
      voiceTemplate: config
    },
    sourceSnapshot: {
      source: "admin-voice-settings",
      surfaceKey
    },
    reviewerNotes: "Admin voice template setting. Used by Templates & Voice when generating drafts."
  };
}

function templateSurfaceFor(surface: GeneratedContentSurface, eventType?: string, contentKey?: string): VoiceTemplateSurface {
  const normalizedEventType = (eventType ?? "").toLowerCase().replaceAll("_", "-");
  const normalizedContentKey = (contentKey ?? "").toLowerCase().replaceAll("_", "-");
  const routingKey = `${normalizedEventType} ${normalizedContentKey}`;

  if (surface === "sky") {
    if (routingKey.includes("eclipse")) {
      return "eclipse";
    }

    if (routingKey.includes("full-moon") || routingKey.includes("fullmoon")) {
      return "fullMoon";
    }

    if (routingKey.includes("new-moon") || routingKey.includes("newmoon")) {
      return "newMoon";
    }

    return "sky";
  }

  if (surface === "synastry" || surface === "relationship") {
    return "synastry";
  }

  if (surface === "composite") {
    return "composite";
  }

  if (surface === "you" || surface === "natal") {
    return "natal";
  }

  return "sky";
}

function templateUsageLabel(surface: VoiceTemplateSurface) {
  switch (surface) {
    case "fullMoon":
      return "Full Moon article rows";
    case "newMoon":
      return "New Moon article rows";
    case "eclipse":
      return "Eclipse article rows";
    case "natal":
      return "You + Natal rows";
    case "synastry":
      return "Synastry + Relationship rows";
    case "composite":
      return "Composite rows";
    case "sky":
    default:
      return "Sky rows";
  }
}

function dateInputValue(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function createAdminDraft(surface: GeneratedContentSurfaceFilter = "sky", date = dateInputValue()): AdminGeneratedContentDraft {
  const resolvedSurface: GeneratedContentSurface = surface === "all" ? "sky" : surface;
  const defaults: Record<GeneratedContentSurface, Pick<AdminGeneratedContentDraft, "contentKey" | "eventType" | "headline" | "mode" | "knowledgeIds">> = {
    sky: {
      contentKey: `sky-daily-${date}`,
      eventType: "daily-sky",
      headline: "Daily Sky",
      mode: "feed",
      knowledgeIds: ""
    },
    you: {
      contentKey: "sample-you-natal-sun-in-aries-9th-house",
      eventType: "natal-placement",
      headline: "Sun in Aries in the 9th house",
      mode: "in_depth",
      knowledgeIds: "natal-sun-in-aries, sun-in-aries, sun-9"
    },
    natal: {
      contentKey: "sample-natal-moon-trine-saturn",
      eventType: "natal-aspect",
      headline: "Moon trine Saturn",
      mode: "in_depth",
      knowledgeIds: "natal-moon-trine-saturn, moon-trine-saturn"
    },
    synastry: {
      contentKey: "sample-synastry-venus-sextile-ascendant",
      eventType: "synastry-contact",
      headline: "Venus sextile Ascendant",
      mode: "in_depth",
      knowledgeIds: "synastry-venus-sextile-ascendant, relationship-venus-sextile-ascendant, venus-sextile-ascendant"
    },
    composite: {
      contentKey: "sample-composite-sun-square-moon",
      eventType: "composite-aspect",
      headline: "Composite Sun square Moon",
      mode: "in_depth",
      knowledgeIds: "composite-sun-square-moon, sun-square-moon"
    },
    relationship: {
      contentKey: "sample-relationship-timing-pluto",
      eventType: "relationship-timing",
      headline: "Pluto relationship timing",
      mode: "feed",
      knowledgeIds: "relationship-timing-pluto, transit-natal-pluto-opposition-descendant"
    },
    modifier: {
      contentKey: "condition.modifier.separating.tldrs",
      eventType: "condition-modifier",
      headline: "Condition modifier",
      mode: "feed",
      knowledgeIds: ""
    }
  };
  const defaultDraft = defaults[resolvedSurface];

  return {
    contentKey: defaultDraft.contentKey,
    surface: resolvedSurface,
    mode: defaultDraft.mode,
    status: "DRAFT",
    eventType: defaultDraft.eventType,
    targetDate: resolvedSurface === "modifier" ? "" : date,
    headline: defaultDraft.headline,
    summary: "",
    body: "",
    sectionsJson: "[]",
    factsJson: JSON.stringify({
      date,
      surface: resolvedSurface,
      note: resolvedSurface === "modifier"
        ? "Shared condition modifier fragment."
        : resolvedSurface === "sky"
        ? "Load current astrology facts before generating."
        : "Internal content test row only. Real content for this surface must be generated from user-specific chart, transit, synastry, or composite facts."
    }, null, 2),
    sourceSnapshotJson: "{}",
    knowledgeIds: defaultDraft.knowledgeIds,
    reviewerNotes: personalizedContentSurfaces.has(resolvedSurface) ? personalizedSampleReviewerNote : ""
  };
}

function adminDraftFromRow(row: AdminGeneratedContentRow): AdminGeneratedContentDraft {
  return {
    id: row.id,
    contentKey: row.content_key,
    surface: row.surface,
    mode: row.mode,
    status: row.status,
    eventType: row.event_type ?? "",
    targetDate: row.target_date ?? "",
    headline: row.headline ?? "",
    summary: row.summary ?? "",
    body: row.body ?? "",
    sectionsJson: JSON.stringify(row.sections ?? [], null, 2),
    factsJson: JSON.stringify(row.facts ?? {}, null, 2),
    sourceSnapshotJson: JSON.stringify(row.source_snapshot ?? {}, null, 2),
    knowledgeIds: (row.knowledge_ids ?? []).join(", "),
    reviewerNotes: row.reviewer_notes ?? ""
  };
}

function adminDateLabel(value: string | null) {
  if (!value) {
    return "No date";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function contentRecordDateLabel(record: AdminReviewRecord) {
  if (record.targetDate) {
    return adminDateLabel(record.targetDate);
  }

  if (record.status === "REVIEWED") {
    return "Missing date";
  }

  return "No date";
}

function contentRecordUpdatedLabel(record: AdminReviewRecord) {
  if (record.targetDate) {
    return adminDateLabel(record.targetDate);
  }

  const dailyHoroscopeDate = dailyHoroscopeDateFromContentKey(record.contentKey);
  if (dailyHoroscopeDate) {
    return adminDateLabel(dailyHoroscopeDate);
  }

  if (record.evergreen) {
    return "Evergreen";
  }

  if (!record.updatedAt) {
    return "No update";
  }

  const date = new Date(record.updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "Updated";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function compactAdminText(value: string | null | undefined, fallback = "No reader-facing copy saved yet.") {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();

  return normalized || fallback;
}

function isAdminImportMetadataText(value: string | null | undefined) {
  const normalized = compactAdminText(value, "").toLowerCase();

  if (!normalized) {
    return false;
  }

  return /^(reviewed|confirmed|draft|live|published|archived)\s*[·•-]/i.test(normalized)
    || normalized.includes("legacy copy: replace")
    || normalized.includes("fallback: unsafe copy")
    || normalized.includes("replace the headline, summary, and body")
    || normalized.includes("saved legacy fallback copy")
    || normalized.includes("archived model");
}

function adminReaderCopyOrEmpty(value: string | null | undefined) {
  return isAdminImportMetadataText(value) ? "" : value ?? "";
}

function normalizeAdminSections(value: AdminGeneratedContentRow["sections"] | undefined): Array<{ heading: string; body: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section, index) => {
      if (!section || typeof section !== "object") {
        return null;
      }

      const entry = section as Record<string, unknown>;
      const heading = typeof entry.heading === "string" && entry.heading.trim() ? entry.heading.trim() : `Section ${index + 1}`;
      const body = typeof entry.body === "string" ? entry.body.trim() : "";

      return body ? { heading, body } : null;
    })
    .filter((section): section is { heading: string; body: string } => Boolean(section));
}

function shallowFactRows(value: Record<string, unknown> | null | undefined) {
  if (!value) {
    return [];
  }

  return Object.entries(value)
    .filter(([, factValue]) => typeof factValue !== "object" || factValue === null)
    .slice(0, 10)
    .map(([key, factValue]) => ({
      label: key.replaceAll("_", " "),
      value: factValue === null || factValue === undefined ? "none" : String(factValue)
    }));
}

function reviewSurfaceForGeneratedSurface(surface: GeneratedContentSurface): AdminReviewSurface {
  if (surface === "sky") {
    return "upcomingAspects";
  }

  if (surface === "you") {
    return "transitNatal";
  }

  if (surface === "natal") {
    return "natalChart";
  }

  return "relationshipLayer";
}

function isUpcomingAspectRecord(record: AdminReviewRecord) {
  const searchable = `${record.contentKey} ${record.eventType ?? ""}`.toLowerCase();

  return record.surface === "sky" && (searchable.includes("aspect") || searchable.includes("transit"));
}

function globalReviewRecord(row: AdminGeneratedContentRow): AdminReviewRecord {
  const sections = normalizeAdminSections(row.sections);

  return {
    id: `global:${row.id}`,
    source: "global",
    surface: row.surface,
    status: row.status,
    mode: row.mode,
    title: row.headline || row.content_key,
    subtitle: `${generatedContentSurfaceLabels[row.surface]} / ${row.mode} / ${adminDateLabel(row.target_date)}`,
    targetDate: row.target_date,
    contentKey: row.content_key,
    eventType: row.event_type,
    summary: row.summary ?? "",
    body: row.body ?? "",
    sections,
    facts: row.facts,
    knowledgeIds: row.knowledge_ids ?? [],
    sourceSnapshot: row.source_snapshot,
    evergreen: Boolean(row.evergreen),
    evergreenAt: row.evergreen_at ?? null,
    evergreenBy: row.evergreen_by ?? null,
    reviewerNotes: row.reviewer_notes,
    provider: row.provider,
    model: row.model,
    promptVersion: row.prompt_version,
    updatedAt: row.updated_at,
    rawGlobalRow: row
  };
}

function savedGlobalRowId(record: AdminReviewRecord) {
  if (record.rawGlobalRow?.id) {
    return record.rawGlobalRow.id;
  }

  const match = record.id.match(/^(?:global|saved):(.+)$/);

  return match?.[1] ?? "";
}

function knowledgeIdsForReviewRecord(record: AdminReviewRecord) {
  return record.rawGlobalRow?.knowledge_ids ?? record.knowledgeIds ?? [];
}

function promptVersionForReviewSave(record: AdminReviewRecord, fallbackPromptVersion?: string) {
  return record.rawGlobalRow?.prompt_version ?? record.promptVersion ?? fallbackPromptVersion;
}

function privateReviewRecord(row: AdminUserGeneratedContentRow): AdminReviewRecord {
  return {
    id: `private:${row.id}`,
    source: "private",
    surface: row.surface,
    status: row.status,
    mode: row.mode,
    title: row.headline || row.content_key,
    subtitle: `${row.subject_type} / ${row.subject_id} / ${adminDateLabel(row.target_date)}`,
    targetDate: row.target_date,
    contentKey: row.content_key,
    eventType: row.event_type,
    summary: row.summary ?? "",
    body: row.body ?? row.error ?? "",
    sections: [],
    facts: null,
    sourceSnapshot: null,
    evergreen: false,
    evergreenAt: null,
    evergreenBy: null,
    reviewerNotes: null,
    userId: row.user_id,
    subjectId: row.subject_id,
    subjectType: row.subject_type,
    provider: row.provider,
    model: row.model,
    updatedAt: row.updated_at,
    rawPrivateRow: row
  };
}

const reviewStatusRank: Record<GeneratedContentStatus, number> = {
  LIVE: 5,
  REVIEWED: 4,
  DRAFT: 3,
  ERROR: 2,
  ARCHIVED: 1
};

function isPhrasebankRecord(record: AdminReviewRecord) {
  const sourceName = typeof record.sourceSnapshot?.source === "string" ? record.sourceSnapshot.source : "";

  return Boolean(phrasebankTierForRecord(record))
    || sourceName === "tldr-astro-phrasebank-20260714"
    || record.model === "compiled-phrasebank-import";
}

function isLegacyGeneratedContentRecord(record: AdminReviewRecord) {
  return record.source === "global" && !isPhrasebankRecord(record);
}

function isArchivedModelRecord(record: AdminReviewRecord) {
  const contentKey = record.contentKey.toLowerCase();
  const sourceSnapshot = objectValue(record.sourceSnapshot);
  const sourceName = typeof sourceSnapshot?.source === "string" ? sourceSnapshot.source.toLowerCase() : "";
  const metadata = [
    record.provider,
    record.model,
    record.promptVersion,
    record.reviewerNotes,
    sourceName,
    JSON.stringify(record.facts ?? {}),
    JSON.stringify(record.sourceSnapshot ?? {}),
    JSON.stringify(record.rawGlobalRow?.facts ?? {}),
    JSON.stringify(record.rawGlobalRow?.source_snapshot ?? {})
  ].join(" ").toLowerCase();

  return contentKey.startsWith("cc/fallback")
    || sourceName.includes("legacy")
    || sourceName.includes("fallback-template-legacy-restore")
    || metadata.includes("legacy copy")
    || metadata.includes("unsafe copy")
    || metadata.includes("archived model")
    || metadata.includes("replace the headline, summary, and body")
    || (isLegacyGeneratedContentRecord(record) && !isArticleReviewRecord(record));
}

function isArticleReviewRecord(record: AdminReviewRecord) {
  const sourceSnapshot = objectValue(record.sourceSnapshot);

  return record.eventType === "article"
    || record.blockType === "essay"
    || record.contentKey.startsWith("article/")
    || sourceSnapshot?.contentType === "article";
}

function contentClassForReviewRecord(record: AdminReviewRecord): AdminContentClass {
  if (record.source === "private") return "user-generated";
  if (isArchivedModelRecord(record)) return "legacy";
  if (isFallbackTemplateRecord(record)) return "fallback-hook";
  if (isVocabularyContentRecord(record)) return "vocab";
  if (isArticleReviewRecord(record)) return "reference";
  if (isReferenceOnlyRecord(record)) return "reference";
  if (isPhrasebankRecord(record)) return "phrasebank";
  if (isLegacyGeneratedContentRecord(record)) return "legacy";
  return "other";
}

function contentClassForGeneratedRow(row: AdminGeneratedContentRow): AdminContentClass {
  const contentKey = row.content_key.toLowerCase();
  const eventType = (row.event_type ?? "").toLowerCase().replaceAll("_", "-");
  const sourceSnapshot = objectValue(row.source_snapshot);
  const sourceName = typeof sourceSnapshot?.source === "string" ? sourceSnapshot.source : "";
  const metadata = [
    row.provider,
    row.model,
    row.prompt_version,
    sourceName,
    JSON.stringify(row.facts ?? {}),
    JSON.stringify(row.source_snapshot ?? {})
  ].join(" ").toLowerCase();
  const factRecord = objectValue(row.facts);
  const hasPhrasebankTier = Boolean(
    objectValue(factRecord?.phrasebank)?.tier
    || sourceSnapshot?.tier
    || sourceName === "tldr-astro-phrasebank-20260714"
    || row.model === "compiled-phrasebank-import"
  );

  if (contentKey.startsWith("cc/fallback")) return "legacy";
  if (
    sourceName.toLowerCase().includes("legacy")
    || metadata.includes("legacy copy")
    || metadata.includes("unsafe copy")
    || metadata.includes("archived model")
    || metadata.includes("replace the headline, summary, and body")
  ) return "legacy";
  if (contentKey.startsWith("fallback-hook/") || eventType === "fallback-hook" || row.block_type === "fallback_template") return "fallback-hook";
  if (contentKey.startsWith("vocab/") || contentKey.startsWith("fallback-vocab/") || eventType === "vocabulary") return "vocab";
  if (contentKey.startsWith("reference/") || sourceSnapshot?.referenceOnly === true) return "reference";
  if (hasPhrasebankTier) return "phrasebank";
  if (row.provider || row.model) return "legacy";
  return "other";
}

function contentClassLabel(contentClass: AdminContentClass) {
  if (contentClass === "phrasebank") return "Phrasebank";
  if (contentClass === "fallback-hook") return "Fallback hooks";
  if (contentClass === "vocab") return "Vocab";
  if (contentClass === "reference") return "Reference";
  if (contentClass === "legacy") return "Archive";
  if (contentClass === "user-generated") return "User-generated";
  return "Other";
}

function compositeRelationshipTypeSections(record: AdminReviewRecord) {
  const sections = objectValue(record.rawGlobalRow?.sections ?? record.sourceSnapshot?.sections);
  const byRelationshipType = objectValue(sections?.byRelationshipType);

  return byRelationshipType;
}

function compositeRelationshipTypeCopy(variant: unknown) {
  const value = objectValue(variant);

  if (!value) return "";

  return [
    stringValue(value.experience),
    stringValue(value.advice),
    stringValue(value.astro)
  ].filter(Boolean).join(" ");
}

function compositeRelationshipTypeCoverage(record: AdminReviewRecord) {
  const byRelationshipType = compositeRelationshipTypeSections(record);

  return compositeRelationshipTypes.map(({ key, label }) => ({
    key,
    label,
    copy: compositeRelationshipTypeCopy(byRelationshipType?.[key])
  }));
}

function reviewRecordSourcePriority(record: AdminReviewRecord) {
  if (isPhrasebankRecord(record)) return 0;
  if (isLegacyGeneratedContentRecord(record)) return 2;
  return 1;
}

function recordMatchesContentClassFilter(record: AdminReviewRecord, filter: AdminContentClassFilter) {
  const recordClass = contentClassForReviewRecord(record);

  if (filter === "all") return recordClass !== "legacy";
  return recordClass === filter;
}

function recordMatchesPhrasebankTierFilter(record: AdminReviewRecord, filter: AdminPhrasebankTierFilter) {
  const tier = phrasebankTierForRecord(record);

  if (filter === "all") return true;
  if (filter === "none") return !tier;
  return tier === filter;
}

function preferredReviewRecord(current: AdminReviewRecord | undefined, next: AdminReviewRecord) {
  if (!current) {
    return next;
  }

  const currentSourcePriority = reviewRecordSourcePriority(current);
  const nextSourcePriority = reviewRecordSourcePriority(next);

  if (nextSourcePriority !== currentSourcePriority) {
    return nextSourcePriority < currentSourcePriority ? next : current;
  }

  const currentRank = reviewStatusRank[current.status] ?? 0;
  const nextRank = reviewStatusRank[next.status] ?? 0;

  if (nextRank !== currentRank) {
    return nextRank > currentRank ? next : current;
  }

  return next.updatedAt > current.updatedAt ? next : current;
}

function normalizedRecordTitle(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isSkyRetrogradeRecord(record: AdminReviewRecord) {
  const eventType = (record.eventType ?? "").toLowerCase();
  const title = normalizedRecordTitle(record.title);
  const contentKey = record.contentKey.toLowerCase();

  return record.surface === "sky" && (
    eventType === "retrograde"
    || contentKey.includes("retrograde")
    || /\brx\b/.test(title)
    || title.includes("retrograde")
  );
}

function contentLibraryDedupeKey(record: AdminReviewRecord) {
  const title = normalizedRecordTitle(record.title || record.contentKey);
  const subject = record.subjectId ?? "";

  if (isFallbackTemplateRecord(record)) {
    return `${record.source}:${record.surface}:${record.contentKey}:${subject}`;
  }

  if (isSkyRetrogradeRecord(record)) {
    return `${record.source}:${record.surface}:retrograde:${title}:${subject}`;
  }

  return `${record.source}:${record.surface}:${title}:${record.targetDate ?? ""}:${subject}`;
}

function dedupeContentLibraryRecords(records: AdminReviewRecord[]) {
  const grouped = new Map<string, AdminReviewRecord>();

  records.forEach((record) => {
    const key = contentLibraryDedupeKey(record);

    grouped.set(key, preferredReviewRecord(grouped.get(key), record));
  });

  return Array.from(grouped.values());
}

function manualEntrySurface(category: AdminContentCategoryFilter, fallbackSurface: GeneratedContentSurfaceFilter): GeneratedContentSurface {
  if (category === "Sky") return "sky";
  if (category === "Natal Aspects" || category === "Natal Angles" || category === "Natal Chart") return "natal";
  if (category === "Relationship") return "relationship";
  if (category === "Fallback Templates") return "sky";
  return fallbackSurface === "all" ? "sky" : fallbackSurface;
}

function manualEntryEventType(category: AdminContentCategoryFilter, surface: GeneratedContentSurface) {
  if (category === "Natal Aspects") return "manual-natal-aspect";
  if (category === "Natal Angles") return "natal-angle-placement";
  if (category === "Natal Chart") return "natal-placement";
  if (category === "Relationship") return "manual-relationship";
  if (surface === "sky") return "upcoming-transit-article";
  return "manual-entry";
}

function manualEntryBlockType(category: AdminContentCategoryFilter, selectedBlockType: AdminContentBlockFilter): AdminContentBlockFilter {
  if (selectedBlockType !== "all" && selectedBlockType !== "fallback_template") {
    return selectedBlockType;
  }

  if (category === "Sky") return "sky_article";
  if (category === "Natal Aspects") return "natal_aspect";
  if (category === "Natal Angles") return "angle";
  if (category === "Natal Chart") return "placement";
  if (category === "Relationship") return "synastry_aspect";
  if (category === "Condition Modifiers") return "condition_modifier";
  if (category === "Fallback Templates") return "fallback_template";

  return "essay";
}

function manualEntryRecord(
  category: AdminContentCategoryFilter,
  fallbackSurface: GeneratedContentSurfaceFilter,
  selectedBlockType: AdminContentBlockFilter = "all"
): AdminReviewRecord {
  const surface = manualEntrySurface(category, fallbackSurface);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const targetDate = surface === "sky" ? dateInputValue(now) : null;
  const eventType = manualEntryEventType(category, surface);
  const title = "Untitled content";
  const blockType = manualEntryBlockType(category, selectedBlockType);

  return {
    id: `manual:${timestamp}`,
    source: "global",
    surface,
    status: "DRAFT",
    mode: surface === "sky" ? "article" : "in_depth",
    title,
    subtitle: `Manual entry / ${generatedContentSurfaceLabels[surface]} / ${adminDateLabel(targetDate)}`,
    targetDate,
    contentKey: `manual-${surface}-${blockType}-${timestamp}`,
    eventType,
    summary: "",
    body: "",
    sections: [],
    facts: {
      source: "manual-entry",
      blockType,
      category: category === "all" ? contentCategoryFilters.find((item) => item.key !== "all" && item.key === "Sky")?.label ?? "Sky" : category
    },
    sourceSnapshot: {
      source: "admin-manual-entry",
      createdAt: now.toISOString()
    },
    evergreen: false,
    evergreenAt: null,
    evergreenBy: null,
    blockType,
    reviewerNotes: "",
    updatedAt: now.toISOString()
  };
}

const natalPlacementBodies = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "North Node",
  "South Node"
];

const reviewQueuePlacementPlanets = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron"
];

const zodiacSigns = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];

const reviewQueueFamilyLabels: Record<AdminReviewQueueFamilyFilter, string> = {
  all: "All",
  placement: "Placement",
  aspect: "Aspect",
  ingress: "Ingress",
  retrograde: "Retrograde",
  eclipse: "Eclipse",
  synastry: "Synastry",
  other: "Other"
};

const reviewQueueStatusFilters: Array<{ key: AdminReviewQueueStatusFilter; label: string }> = [
  { key: "all", label: "All statuses" },
  { key: "ERROR", label: "Needs Review" },
  { key: "DRAFT", label: "Draft" },
  { key: "REVIEWED", label: "Reviewed" },
  { key: "LIVE", label: "Published" },
  { key: "ARCHIVED", label: "Archived" }
];

const reviewQueueEvergreenFilters: Array<{ key: AdminReviewQueueEvergreenFilter; label: string }> = [
  { key: "hideEvergreen", label: "Hide evergreen" },
  { key: "all", label: "All" },
  { key: "evergreen", label: "Evergreen only" }
];

const timeBoundEvergreenPatterns = [
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b20\d{2}\b/,
  /\bthis\s+(?:week|month|year|season|spring|summer|fall|autumn|winter)\b/i,
  /\b(?:until|through|for the next|over the next|during the next)\b/i,
  /\b(?:spring|summer|fall|autumn|winter)\s+(?:season|window)\b/i,
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/,
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b(?:from|between)\s+[^.]{0,40}\b(?:to|and|through)\b/i
];

const skyNatalPhrasingPatterns = [
  /\byou were born\b/i,
  /\byou grow through\b/i,
  /\byour natal\b/i,
  /\bin your chart you\b/i
];

const traditionalRulersBySign: Record<string, string> = {
  aries: "Mars",
  taurus: "Venus",
  gemini: "Mercury",
  cancer: "Moon",
  leo: "Sun",
  virgo: "Mercury",
  libra: "Venus",
  scorpio: "Mars",
  sagittarius: "Jupiter",
  capricorn: "Saturn",
  aquarius: "Saturn",
  pisces: "Jupiter"
};

const modernRulersBySign: Record<string, string> = {
  scorpio: "Pluto",
  aquarius: "Uranus",
  pisces: "Neptune"
};

function normalizeAstroToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function traditionalRulerForSign(sign: string) {
  return traditionalRulersBySign[sign.toLowerCase().trim()] ?? "";
}

function modernRulerForSign(sign: string) {
  return modernRulersBySign[sign.toLowerCase().trim()] ?? "";
}

function isNodePlacement(body: string) {
  const normalized = normalizeAstroToken(body);
  return normalized === "northnode" || normalized === "southnode" || normalized === "truenode";
}

function capitalizeSentence(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function factStringFromSources(record: AdminReviewRecord, keys: string[]) {
  for (const key of keys) {
    const factValue = record.facts?.[key];

    if (typeof factValue === "string" && factValue.trim()) {
      return factValue.trim();
    }

    const sourceValue = record.sourceSnapshot?.[key];

    if (typeof sourceValue === "string" && sourceValue.trim()) {
      return sourceValue.trim();
    }
  }

  return "";
}

function factBooleanFromSources(record: AdminReviewRecord, keys: string[]) {
  for (const key of keys) {
    const factValue = record.facts?.[key];

    if (typeof factValue === "boolean") {
      return factValue;
    }

    if (typeof factValue === "string" && factValue.trim()) {
      return factValue.trim().toLowerCase() === "true";
    }

    const sourceValue = record.sourceSnapshot?.[key];

    if (typeof sourceValue === "boolean") {
      return sourceValue;
    }

    if (typeof sourceValue === "string" && sourceValue.trim()) {
      return sourceValue.trim().toLowerCase() === "true";
    }
  }

  return false;
}

function chartValueString(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function chartBodyName(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const record = value as Record<string, unknown>;
  return chartValueString(record.planet)
    || chartValueString(record.body)
    || chartValueString(record.point)
    || chartValueString(record.node)
    || chartValueString(record.name)
    || chartValueString(record.id);
}

function findBodyPlacementInValue(value: unknown, body: string, visited = new Set<unknown>()): { sign: string; house: string } | null {
  if (!body || !value || typeof value !== "object") {
    return null;
  }

  if (visited.has(value)) {
    return null;
  }

  visited.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findBodyPlacementInValue(item, body, visited);

      if (match) {
        return match;
      }
    }

    return null;
  }

  const record = value as Record<string, unknown>;
  const bodyName = chartBodyName(record);

  if (bodyName && normalizeAstroToken(bodyName) === normalizeAstroToken(body)) {
    const sign = chartValueString(record.sign)
      || chartValueString(record.planetSign)
      || chartValueString(record.bodySign)
      || chartValueString(record.zodiacSign);
    const house = chartValueString(record.house)
      || chartValueString(record.houseNumber)
      || chartValueString(record.wholeSignHouse);

    if (sign || house) {
      return { sign, house };
    }
  }

  for (const nested of Object.values(record)) {
    const match = findBodyPlacementInValue(nested, body, visited);

    if (match) {
      return match;
    }
  }

  return null;
}

function rulerPlacementForRecord(record: AdminReviewRecord, rulerBody: string) {
  return findBodyPlacementInValue(record.sourceSnapshot, rulerBody)
    ?? findBodyPlacementInValue(record.facts, rulerBody)
    ?? { sign: "", house: "" };
}

function formatSkyBodyPosition(body: string, sign: string) {
  const bodyName = body === "Sun" || body === "Moon" || body === "True Node" || body === "North Node" ? `the ${body}` : body;

  return sign ? `${bodyName} in ${sign}` : bodyName;
}

function fallbackReaderTextForReview(record: AdminReviewRecord) {
  if (record.summary.trim()) {
    return record.summary.trim();
  }

  return "";
}

function stripTldrPrefix(value: string) {
  return value.trim().replace(/^tldr\s*:\s*/i, "").trim();
}

function splitLeadingTldr(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^tldr\s*:\s*([\s\S]*?)(?:\n{2,}([\s\S]*)|$)/i);

  if (!match) {
    return {
      tldr: "",
      body: value
    };
  }

  return {
    tldr: match[1]?.trim() ?? "",
    body: match[2]?.trim() ?? ""
  };
}

function reviewTldrForReview(record: AdminReviewRecord) {
  const summary = stripTldrPrefix(record.summary);

  if (summary) {
    return summary;
  }

  return splitLeadingTldr(record.body).tldr;
}

function bodyWithoutLeadingTldr(value: string) {
  const split = splitLeadingTldr(value);

  return split.tldr ? split.body.trim() : value.trim();
}

function normalizeReviewCopy(summary: string, body: string, fallbackBody: string) {
  const splitBody = splitLeadingTldr(body);
  const nextSummary = stripTldrPrefix(summary) || splitBody.tldr;
  const nextBody = bodyWithoutLeadingTldr(splitBody.tldr ? splitBody.body : body) || bodyWithoutLeadingTldr(fallbackBody);

  return {
    summary: nextSummary,
    body: nextBody
  };
}

function normalizeGeneratedDraftCopy(
  generated: {
    tldr?: string;
    summary?: string;
    body?: string;
  },
  fallbackBody: string
) {
  const splitBody = splitLeadingTldr(generated.body?.trim() || "");

  return normalizeReviewCopy(
    generated.tldr?.trim() || splitBody.tldr || generated.summary?.trim() || "",
    generated.body?.trim() || "",
    fallbackBody
  );
}

function stopEditorKeyPropagation(event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  event.stopPropagation();
}

function readerFacingTextForReview(record: AdminReviewRecord) {
  return bodyWithoutLeadingTldr(record.body.trim() || fallbackReaderTextForReview(record));
}

function readerFacingCopyForRecord(record: AdminReviewRecord) {
  return firstReaderFacingCopy([
    bodyWithoutLeadingTldr(record.body),
    stripTldrPrefix(record.summary),
    ...record.sections.map((section) => section.body)
  ]);
}

function reviewRecordPlainText(record: AdminReviewRecord) {
  return [
    record.title,
    record.contentKey,
    record.summary,
    record.body,
    ...record.sections.flatMap((section) => [section.heading, section.body])
  ].join("\n");
}

const unsafeServingMetadataMarkers = [
  "legacy",
  "unsafe",
  "directional",
  "editorial-only",
  "editorial_only",
  "superseded",
  "source-grounded",
  "source_grounded",
  "local-normalized-dashboard-source",
  "normalized-dashboard-source",
  "revoice-pending",
  "revoice_pending",
  "reference-only",
  "raw_quarantine",
  "replace the headline, summary, and body",
  "current full-sentence fallback-hook wording"
];

function recordMetadataText(record: AdminReviewRecord) {
  return [
    record.contentKey,
    record.provider,
    record.model,
    record.promptVersion,
    record.reviewerNotes,
    JSON.stringify(record.facts ?? {}),
    JSON.stringify(record.sourceSnapshot ?? {}),
    JSON.stringify(record.rawGlobalRow?.facts ?? {}),
    JSON.stringify(record.rawGlobalRow?.source_snapshot ?? {})
  ].join(" ").toLowerCase();
}

function recordUnsafeServingMetadataReason(record: AdminReviewRecord) {
  const metadata = recordMetadataText(record);

  if (record.contentKey.toLowerCase().startsWith("cc/fallback")) {
    return "Legacy cc/fallback rows are audit-only and are not part of the reader fallback system.";
  }

  const marker = unsafeServingMetadataMarkers.find((candidate) => metadata.includes(candidate));

  if (marker) {
    return `Metadata marks this row as ${marker.replaceAll("_", " ")}.`;
  }

  return "";
}

function hasTimeBoundEvergreenLanguage(record: AdminReviewRecord) {
  const text = [record.summary, record.body].join("\n");
  const match = timeBoundEvergreenPatterns.find((pattern) => pattern.test(text));

  return match
    ? "Evergreen copy cannot include month names, years, date ranges, or time-window language."
    : "";
}

function hasRevoicePendingProvenance(record: AdminReviewRecord) {
  return valueContainsText(record.sourceSnapshot, "revoice-pending")
    || valueContainsText(record.facts, "revoice-pending")
    || valueContainsText(record.reviewerNotes, "revoice-pending")
    || valueContainsText(record.rawGlobalRow?.source_snapshot, "revoice-pending");
}

function skyNatalPhrasingWarnings(record: AdminReviewRecord) {
  if (record.surface !== "sky") return [];

  const text = [record.summary, record.body].join("\n");
  return skyNatalPhrasingPatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source.replaceAll("\\b", "").replaceAll("\\s+", " "));
}

function readerSafetyBlockReason(record: AdminReviewRecord) {
  const hasAnyCopy = Boolean(record.body.trim() || record.summary.trim() || record.sections.some((section) => section.body.trim()));
  const safeCopy = readerFacingCopyForRecord(record);
  const metadataReason = recordUnsafeServingMetadataReason(record);

  if (isArchivedModelRecord(record)) {
    return "Archived model rows are blocked from reader routes until they are rewritten as current exact content, fallback hooks, or slot templates.";
  }

  if (metadataReason) {
    return metadataReason;
  }

  if (!hasAnyCopy) {
    return "Body is empty.";
  }

  if (!safeCopy) {
    return "Copy looks like metadata, provenance, source notes, or editorial/reference text.";
  }

  return "";
}

function canTransitionReviewRecord(record: AdminReviewRecord, nextStatus: GeneratedContentStatus) {
  if (nextStatus === "REVIEWED" || nextStatus === "LIVE") {
    return readerSafetyBlockReason(record);
  }

  return "";
}

function canMarkEvergreen(record: AdminReviewRecord) {
  if (record.status !== "LIVE") {
    return "Publish before marking evergreen.";
  }

  return readerSafetyBlockReason(record) || hasTimeBoundEvergreenLanguage(record);
}

function reviewQueueFamily(record: AdminReviewRecord): Exclude<AdminReviewQueueFamilyFilter, "all"> {
  const key = record.contentKey.toLowerCase();
  const eventType = (record.eventType ?? "").toLowerCase();
  const blockType = contentBlockType(record);

  if (key.includes("eclipse") || eventType.includes("eclipse")) return "eclipse";
  if (key.includes("retrograde") || eventType.includes("retrograde") || key.includes("station")) return "retrograde";
  if (key.includes("ingress") || eventType.includes("ingress")) return "ingress";
  if (record.surface === "synastry" || record.surface === "relationship" || key.includes("synastry")) return "synastry";
  if (blockType === "placement" || key.includes("planetary-placement") || key.includes(".placement.") || key.includes("-in-")) return "placement";
  if (blockType.endsWith("_aspect") || key.includes("aspect") || /\b(conjunction|sextile|square|trine|opposition)\b/.test(key)) return "aspect";

  return "other";
}

function reviewQueuePlacementPlanet(record: AdminReviewRecord) {
  const search = `${record.contentKey} ${record.title} ${record.eventType ?? ""}`.toLowerCase();
  const factPlanet = factStringFromSources(record, ["planet", "body", "point", "placementBody", "body1"]);
  const matchedFact = reviewQueuePlacementPlanets.find((planet) => normalizeAstroToken(planet) === normalizeAstroToken(factPlanet));

  if (matchedFact) return matchedFact;

  return reviewQueuePlacementPlanets.find((planet) => search.includes(planet.toLowerCase().replace(/\s+/g, "-")) || search.includes(planet.toLowerCase())) ?? "Other";
}

function reviewQueuePlacementSign(record: AdminReviewRecord) {
  const search = `${record.contentKey} ${record.title}`.toLowerCase();
  const factSign = factStringFromSources(record, ["sign", "placementSign", "planetSign", "sign1"]);
  const matchedFact = zodiacSigns.find((sign) => normalizeAstroToken(sign) === normalizeAstroToken(factSign));

  if (matchedFact) return matchedFact;

  return zodiacSigns.find((sign) => search.includes(sign.toLowerCase())) ?? "";
}

function reviewQueueGroupKey(record: AdminReviewRecord): AdminReviewQueueGroupKey {
  const family = reviewQueueFamily(record);

  if (family === "placement") {
    return `placement:${reviewQueuePlacementPlanet(record)}`;
  }

  return `${family}:${family}`;
}

function reviewQueueGroupLabel(groupKey: AdminReviewQueueGroupKey) {
  const [family, detail] = groupKey.split(":");

  if (family === "placement") {
    return `Placement · ${detail}`;
  }

  return reviewQueueFamilyLabels[family as AdminReviewQueueFamilyFilter] ?? detail;
}

function reviewQueueRecordLabel(record: AdminReviewRecord) {
  if (reviewQueueFamily(record) === "placement") {
    const planet = reviewQueuePlacementPlanet(record);
    const sign = reviewQueuePlacementSign(record);

    if (planet && sign) {
      return `${planet} in ${sign}`;
    }
  }

  return record.title || record.contentKey;
}

type AdminReaderSafetyState = {
  key: "reader-ready" | "draft-held" | "reference-held" | "review-held" | "fallback-needed";
  label: string;
  detail: string;
};

function readerSafetyStateForRecord(record: AdminReviewRecord): AdminReaderSafetyState {
  const lane = record.rawGlobalRow?.lane;
  const reviewState = record.rawGlobalRow?.review_state;
  const hasAnyCopy = Boolean(record.body.trim() || record.summary.trim() || record.sections.some((section) => section.body.trim()));
  const hasSafeReaderCopy = Boolean(readerFacingCopyForRecord(record));
  const blockReason = readerSafetyBlockReason(record);

  if (record.status !== "LIVE") {
    return {
      key: "draft-held",
      label: "Not reader-visible",
      detail: `${contentStatusLabel(record.status)} rows stay in the editorial queue.`
    };
  }

  if (lane && lane !== "serving") {
    return {
      key: "reference-held",
      label: "Reference only",
      detail: "Reference lane rows can guide generation, but cannot render to readers."
    };
  }

  if (reviewState) {
    return {
      key: "review-held",
      label: "Review hold",
      detail: `Blocked by review state: ${reviewState}.`
    };
  }

  if (blockReason) {
    return {
      key: "fallback-needed",
      label: hasAnyCopy ? "Blocked from readers" : "No reader copy",
      detail: blockReason
    };
  }

  if (!hasSafeReaderCopy) {
    return {
      key: "fallback-needed",
      label: hasAnyCopy ? "Blocked from readers" : "No reader copy",
      detail: hasAnyCopy
        ? "Saved copy looks like metadata, provenance, or notes, so runtime must use the fallback hook instead."
        : "No reader-facing paragraph is saved, so runtime must use the fallback hook instead."
    };
  }

  return {
    key: "reader-ready",
    label: "Reader-ready",
    detail: "Published serving copy with a safe reader-facing body."
  };
}

function reviewCopyState(record: AdminReviewRecord): "placeholder" | "draft" | "saved" {
  if ((record.status === "REVIEWED" || record.status === "LIVE") && readerFacingTextForReview(record)) {
    return "saved";
  }

  if (record.source === "calculated" && !record.rawGlobalRow) {
    return "placeholder";
  }

  if (!record.body.trim() && !record.summary.trim()) {
    return "placeholder";
  }

  return "draft";
}

function isFallbackTemplateRecord(record: Pick<AdminReviewRecord, "contentKey" | "eventType">) {
  const contentKey = record.contentKey.toLowerCase();

  return contentKey.startsWith("fallback-hook/")
    || contentKey.startsWith("slot-template/")
    || (record.eventType ?? "").toLowerCase().replaceAll("_", "-") === "fallback-hook";
}

function isVocabularyContentRecord(record: Pick<AdminReviewRecord, "contentKey" | "eventType">) {
  const contentKey = record.contentKey.toLowerCase();
  const eventType = (record.eventType ?? "").toLowerCase().replaceAll("_", "-");

  return contentKey.startsWith("vocab/")
    || contentKey.startsWith("fallback-vocab/")
    || eventType === "vocabulary";
}

function hasReferenceOnlySnapshot(record: Pick<AdminReviewRecord, "sourceSnapshot">) {
  const snapshot = objectValue(record.sourceSnapshot);
  const authoredFallback = objectValue(snapshot?.authoredFallback);

  return snapshot?.referenceOnly === true
    || authoredFallback?.mappingAction === "REFERENCE_ONLY";
}

function isReferenceOnlyRecord(record: Pick<AdminReviewRecord, "contentKey" | "sourceSnapshot" | "reviewerNotes" | "body">) {
  const contentKey = record.contentKey.toLowerCase();
  const reviewerNotes = (record.reviewerNotes ?? "").toLowerCase();
  const body = (record.body ?? "").toLowerCase();

  return contentKey.startsWith("reference/")
    || hasReferenceOnlySnapshot(record)
    || reviewerNotes.includes("reference-only")
    || reviewerNotes.includes("reference vocabulary")
    || reviewerNotes.includes("not direct client-facing")
    || body.includes("use as source/reference language")
    || body.includes("not direct client-facing copy");
}

function isSpecializedAdminRecord(record: AdminReviewRecord) {
  return isFallbackTemplateRecord(record)
    || isVocabularyContentRecord(record)
    || isReferenceOnlyRecord(record);
}

function isInternalAdminSettingRecord(record: Pick<AdminReviewRecord, "contentKey" | "eventType">) {
  return record.contentKey.toLowerCase().startsWith(adminVoiceTemplateContentKeyPrefix)
    || (record.eventType ?? "").toLowerCase().replaceAll("_", "-") === "voice-setting";
}

function localSkySnapshotAdminRows(): AdminReviewRecord[] {
  const rows = (skyContentSnapshot as { rows?: LocalSkySnapshotAdminRow[] }).rows ?? [];

  return rows.map((row) => {
    const sourceSnapshot = row.sourceSnapshot ?? null;
    const snapshotFamily = typeof sourceSnapshot?.family === "string" ? sourceSnapshot.family : null;
    const title = row.headline?.trim()
      || titleFromContentKey(row.contentKey)
        .replace(/\bIs\b/u, "in");
    const blockType = contentBlockFilters.some((filter) => filter.key === row.blockType)
      ? row.blockType as AdminContentBlockFilter
      : null;

    return {
      id: `local-snapshot:${row.contentKey}`,
      source: "snapshot",
      surface: row.surface ?? "sky",
      status: "DRAFT",
      mode: row.mode ?? "feed",
      title,
      subtitle: row.summary ?? "",
      targetDate: row.targetDate ?? null,
      contentKey: row.contentKey,
      eventType: row.eventType ?? snapshotFamily,
      summary: row.summary ?? "",
      body: row.body ?? "",
      sections: [],
      blockType,
      facts: null,
      knowledgeIds: Array.isArray(sourceSnapshot?.sourceKeys) ? sourceSnapshot.sourceKeys.filter((key): key is string => typeof key === "string") : [],
      sourceSnapshot,
      evergreen: true,
      evergreenAt: null,
      evergreenBy: null,
      reviewerNotes: "Source-grounded generated snapshot. Facts come from calculated AstrologyFact objects; prose is regenerated from normalized package records.",
      provider: row.provider ?? "local-normalized-dashboard-source",
      model: row.model ?? "deterministic-normalized-snapshot",
      promptVersion: "source-grounded-snapshot",
      updatedAt: row.updatedAt ?? new Date(0).toISOString()
    };
  });
}

function contentCategoryLabel(record: AdminReviewRecord): Exclude<AdminContentCategoryFilter, "all"> {
  const normalizedEventType = (record.eventType ?? "").toLowerCase().replaceAll("_", "-");
  const normalizedContentKey = record.contentKey.toLowerCase();

  if (isFallbackTemplateRecord(record)) {
    return "Fallback Templates";
  }

  if (record.surface === "modifier") {
    return "Condition Modifiers";
  }

  if (record.surface === "sky") {
    return "Sky";
  }

  if (record.surface === "synastry" || record.surface === "composite" || record.surface === "relationship") {
    return "Relationship";
  }

  if (
    normalizedContentKey.startsWith("natal.aspect.")
    || normalizedContentKey.startsWith("natal-aspect-")
    || normalizedEventType.includes("natal-aspect")
    || normalizedContentKey.includes("natal-") && /\b(conjunction|sextile|square|trine|opposition)\b/.test(normalizedContentKey)
  ) {
    return "Natal Aspects";
  }

  if (
    normalizedContentKey.startsWith("natal.angle.")
    || normalizedContentKey.startsWith("natal-angle-")
    || normalizedContentKey.includes("midheaven")
    || normalizedContentKey.includes("ascendant")
    || normalizedEventType.includes("natal-angle")
  ) {
    return "Natal Angles";
  }

  return "Natal Chart";
}

function titleFromContentKey(contentKey: string) {
  const slug = contentKey
    .replace(/^fallback-hook\//, "")
    .split(/[/.]/)
    .filter(Boolean)
    .pop() ?? contentKey;

  return slug
    .replace(/\{\{|\}\}/g, "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || contentKey;
}

function dailyHoroscopeDateFromContentKey(contentKey: string) {
  return contentKey.toLowerCase().match(/you-daily-horoscope-v\d+-(\d{4}-\d{2}-\d{2})$/)?.[1] ?? null;
}

function isDailyHoroscopeRecord(record: Pick<AdminReviewRecord, "contentKey" | "eventType" | "surface">) {
  const normalizedKey = record.contentKey.toLowerCase();
  const normalizedEventType = (record.eventType ?? "").toLowerCase().replaceAll("_", "-");

  return record.surface === "you"
    && (
      normalizedKey.startsWith("you-daily-horoscope-")
      || normalizedEventType.includes("daily-horoscope")
      || normalizedEventType.includes("daily-timing")
      || normalizedEventType.includes("you-update-summary")
    );
}

function contentRecordDisplayTitle(record: AdminReviewRecord) {
  const rawTitle = record.title.trim();

  if (isDailyHoroscopeRecord(record)) {
    const targetDate = record.targetDate ?? dailyHoroscopeDateFromContentKey(record.contentKey);

    return targetDate ? `Daily horoscope · ${adminDateLabel(targetDate)}` : "Daily horoscope";
  }

  if (rawTitle && !rawTitle.includes("{{")) {
    return rawTitle;
  }

  if (isFallbackTemplateRecord(record)) {
    return titleFromContentKey(record.contentKey);
  }

  return contentCategoryLabel(record);
}

function contentRecordKindLabel(record: AdminReviewRecord) {
  if (isFallbackTemplateRecord(record)) return "Fallback hook/template";
  if ((record.eventType ?? "").toLowerCase() === "vocabulary" || record.contentKey.startsWith("vocab/") || record.contentKey.startsWith("fallback-vocab/")) return "Vocabulary";
  if (record.source === "snapshot") return "Source-grounded snapshot";
  if (record.source === "calculated") return "Generated snapshot";
  if (record.rawGlobalRow?.lane === "reference") return "Reference";
  if (record.provider === "manual" || record.source === "saved") return "Authored";

  return contentBlockTypeLabel(record);
}

function contentBlockType(record: AdminReviewRecord): AdminContentBlockFilter {
  const normalizedKey = record.contentKey.toLowerCase();
  const normalizedEventType = (record.eventType ?? "").toLowerCase().replaceAll("_", "-");

  if (isFallbackTemplateRecord(record)) {
    return "fallback_template";
  }

  if (record.surface === "modifier" || normalizedEventType.includes("condition-modifier")) {
    return "condition_modifier";
  }

  const savedType = record.rawGlobalRow?.block_type ?? record.blockType;

  if (savedType && savedType !== "all") {
    return savedType;
  }

  if (normalizedKey.startsWith("natal.placement.") || normalizedEventType.includes("natal-placement")) return "placement";
  if (normalizedKey.startsWith("natal.angle.") || normalizedEventType.includes("natal-angle")) return "angle";
  if (normalizedKey.startsWith("natal.sign.")) return "sign";
  if (normalizedKey.startsWith("natal.house.")) return "house";
  if (normalizedKey.startsWith("natal.ruler.")) return "ruler";
  if (normalizedKey.startsWith("natal.aspect.")) return "natal_aspect";
  if (
    record.surface === "sky"
    && (
      normalizedKey.startsWith("sky.lunar.")
      || normalizedKey.startsWith("sky-lunar-")
      || normalizedKey.includes("lunar")
      || normalizedKey.includes("lunation")
      || normalizedEventType.includes("lunar")
      || normalizedEventType.includes("lunation")
      || normalizedEventType.includes("new-moon")
      || normalizedEventType.includes("full-moon")
    )
  ) return "lunar_calendar";
  if (normalizedKey.startsWith("sky.aspect.")) return "sky_aspect";
  if (normalizedKey.startsWith("sky.article.") || normalizedKey.startsWith("sky-article-")) return "sky_article";
  if (normalizedKey.startsWith("transit.aspect.")) return "transit_to_natal_aspect";
  if (normalizedKey.startsWith("synastry.aspect.")) return "synastry_aspect";
  if (normalizedKey.startsWith("composite.aspect.")) return "composite_aspect";
  if (normalizedKey.startsWith("natal.synthesis.")) return "synthesis";
  if (isDailyHoroscopeRecord(record)) return "daily_horoscope";
  if (record.surface === "sky" && normalizedEventType.includes("current-aspect")) return "sky_aspect";
  if (record.surface === "sky" && (record.mode === "article" || normalizedEventType.includes("transit-article") || normalizedEventType.includes("sky-article"))) return "sky_article";
  if (record.surface === "you" && normalizedEventType.includes("transit-to-natal")) return "transit_to_natal_aspect";
  if ((record.surface === "synastry" || record.surface === "relationship") && normalizedEventType.includes("synastry-aspect")) return "synastry_aspect";
  if (record.surface === "composite" && normalizedEventType.includes("composite-aspect")) return "composite_aspect";
  if (
    normalizedEventType.includes("natal-aspect")
    || normalizedKey.includes("natal-") && /\b(conjunction|sextile|square|trine|opposition)\b/.test(normalizedKey)
  ) {
    return "natal_aspect";
  }

  if (record.surface === "natal") return "essay";
  if (record.surface === "sky") return record.mode === "article" ? "sky_article" : "sky_aspect";

  return "all";
}

function contentBlockTypeLabel(record: AdminReviewRecord) {
  const blockType = contentBlockType(record);

  return contentBlockFilters.find((filter) => filter.key === blockType)?.label ?? "Content";
}

function contentStatusLabel(status: string) {
  if (status === "LIVE") return "Published";
  if (status === "REVIEWED") return "Reviewed";
  if (status === "ERROR") return "Needs Review";
  if (status === "DRAFT") return "Draft";

  return status;
}

function contentRestrictionLabel(record: AdminReviewRecord) {
  if (record.source === "private" || record.userId || record.subjectId) return "Personal";
  if (record.source === "snapshot") return "Snapshot";
  if (record.source === "calculated") return "Pending";

  return "Visible";
}

function appLocationLabel(record: AdminReviewRecord) {
  if (record.surface === "sky") return "Sky";
  if (record.surface === "natal") return "Natal";
  if (record.surface === "you") return "You";
  if (record.surface === "modifier") return "Modifier";
  if (record.surface === "synastry" || record.surface === "composite" || record.surface === "relationship") return "Circle";

  return generatedContentSurfaceLabels[record.surface];
}

function appLocationDetail(record: AdminReviewRecord) {
  if (record.surface === "modifier") return "Condition modifier";
  if (record.surface === "synastry") return "Synastry";
  if (record.surface === "composite") return "Composite";
  if (record.surface === "relationship") return "Relationship";
  if (record.surface === "you") return "Personal chart";

  return contentCategoryLabel(record);
}

function contentSourceLabel(record: AdminReviewRecord) {
  if (record.source === "snapshot") return "Source-grounded generated snapshot";
  if (record.rawGlobalRow?.lane === "reference") return "Reference lane";
  if (record.provider === "manual") return "Manual";
  if (record.provider) return record.provider;
  if (record.source === "private") return "Personal";
  if (record.source === "calculated") return "Local snapshot";

  return "Dashboard";
}

function phrasebankTierForRecord(record: Pick<AdminReviewRecord, "facts" | "sourceSnapshot">) {
  const factTier = record.facts?.phrasebank && typeof record.facts.phrasebank === "object"
    ? (record.facts.phrasebank as Record<string, unknown>).tier
    : null;
  const snapshotTier = record.sourceSnapshot?.tier;
  const tier = typeof factTier === "string"
    ? factTier
    : typeof snapshotTier === "string"
      ? snapshotTier
      : "";

  return tier.toUpperCase();
}

function phrasebankTierLabel(tier: string) {
  if (tier === "CONFIRMED") return "Confirmed";
  if (tier === "SESSION_APPROVED_DRAFT") return "Session draft";
  if (tier === "REVIEWED") return "Reviewed";
  return "";
}

function isPhrasebankSignoffRecord(record: AdminReviewRecord) {
  return Boolean(phrasebankTierForRecord(record)) && record.source !== "private";
}

function phrasebankReviewState(record: AdminReviewRecord) {
  return record.rawGlobalRow?.review_state ?? null;
}

const marieSignoffChecklist = [
  ["Planet in sign", "Natal placements", 120],
  ["Planet in house", "Natal placements", 120],
  ["Planet on the angles", "Natal placements", 48],
  ["Moon detail", "Natal placements", 20],
  ["Lunar nodes", "Natal placements", 24],
  ["Chiron placement + aspect", "Natal placements", 49],
  ["Natal aspects", "Natal placements", 214],
  ["Asteroids / points", "Natal placements", 64],
  ["Transit-to-natal aspect bank", "Transits", 470],
  ["Long-term house transit", "Transits", 84],
  ["Planetary horoscope", "Transits", 60],
  ["Collective Sky card/detail", "Sky", 42],
  ["Sky events", "Sky", 23],
  ["Historical lookback", "Sky", 6],
  ["Lunation by sign", "Sky", 20],
  ["Synastry inter-aspects + overlays", "Relationships", 219],
  ["Composite placements/aspects", "Relationships", 467],
  ["Support/reference parked", "Reference", 91]
] as const;

function recordMetadataLabel(record: AdminReviewRecord) {
  return [
    generatedContentSurfaceLabels[record.surface],
    record.mode.replaceAll("_", " "),
    record.contentKey
  ].filter(Boolean).join(" · ");
}

function isDraftWithCopy(record: AdminReviewRecord) {
  return record.status === "DRAFT" && (record.source === "saved" || record.source === "global" || Boolean(record.body.trim() || record.summary.trim()));
}

function isArchivedRecord(record: AdminReviewRecord) {
  return record.status === "ARCHIVED";
}

function recordMatchesContentStatus(record: AdminReviewRecord, filter: AdminContentStatusFilter) {
  if (filter === "all") return !isArchivedRecord(record);
  if (filter === "DRAFT") return isDraftWithCopy(record);
  if (filter === "NEEDS_REVIEW") return record.status === "ERROR" || (record.status === "DRAFT" && !isDraftWithCopy(record));
  if (filter === "SCHEDULED") return record.status === "REVIEWED";
  if (filter === "LIVE") return record.status === "LIVE";
  if (filter === "ARCHIVED") return isArchivedRecord(record);

  return true;
}

function valueContainsText(value: unknown, pattern: string): boolean {
  if (typeof value === "string") {
    return value.toLowerCase().includes(pattern.toLowerCase());
  }

  if (Array.isArray(value)) {
    return value.some((item) => valueContainsText(item, pattern));
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((item) => valueContainsText(item, pattern));
  }

  return false;
}

function recordDraftStatus(record: AdminReviewRecord) {
  const factStatus = record.facts?.draftStatus ?? record.facts?.draft_status;
  const sourceStatus = record.sourceSnapshot?.draftStatus ?? record.sourceSnapshot?.draft_status;

  return typeof factStatus === "string" ? factStatus : typeof sourceStatus === "string" ? sourceStatus : "";
}

function isFailedQueueRecord(record: AdminReviewRecord) {
  return record.status === "ERROR" || recordDraftStatus(record).toLowerCase() === "failed";
}

function isMissingSourceRecord(record: AdminReviewRecord) {
  return valueContainsText(record.sourceSnapshot, "No authored source IDs")
    || valueContainsText(record.facts, "No authored source IDs")
    || valueContainsText(record.reviewerNotes, "No authored source IDs");
}

function visibleReviewerNotes(record: AdminReviewRecord) {
  const notes = record.reviewerNotes?.trim() ?? "";

  if (!notes) {
    return "";
  }

  const provenanceOnlyPatterns = [
    /^imported from\b/i,
    /^imported from dashboard\b/i,
    /^admin-created\b/i,
    /^admin setting\b/i,
    /^admin voice template setting\b/i,
    /^draft\b.*\bhandoff\b/i,
    /\bsource file\b/i,
    /\buploaded\b/i
  ];

  return provenanceOnlyPatterns.some((pattern) => pattern.test(notes)) ? "" : notes;
}

function recordMatchesQueueFilter(record: AdminReviewRecord, filter: AdminContentQueueFilter) {
  if (filter === "failed") return isFailedQueueRecord(record);
  if (filter === "missingSource") return isMissingSourceRecord(record);
  if (filter === "draft") return isDraftWithCopy(record);
  if (filter === "published") return record.status === "LIVE";

  return true;
}

function contentQueueCounts(records: AdminReviewRecord[]) {
  return {
    failed: records.filter(isFailedQueueRecord).length,
    missingSource: records.filter(isMissingSourceRecord).length,
    draft: records.filter(isDraftWithCopy).length,
    published: records.filter((record) => record.status === "LIVE").length
  } satisfies Record<Exclude<AdminContentQueueFilter, null>, number>;
}

function isFailureQueueRecord(record: AdminReviewRecord) {
  return isFailedQueueRecord(record) || isMissingSourceRecord(record);
}

function contentStatusCounts(records: AdminReviewRecord[]) {
  const activeRecords = records.filter((record) => !isArchivedRecord(record));

  return {
    all: activeRecords.length,
    DRAFT: records.filter((record) => recordMatchesContentStatus(record, "DRAFT")).length,
    NEEDS_REVIEW: records.filter((record) => recordMatchesContentStatus(record, "NEEDS_REVIEW")).length,
    SCHEDULED: records.filter((record) => recordMatchesContentStatus(record, "SCHEDULED")).length,
    LIVE: records.filter((record) => recordMatchesContentStatus(record, "LIVE")).length,
    ARCHIVED: records.filter((record) => recordMatchesContentStatus(record, "ARCHIVED")).length
  } satisfies Record<AdminContentStatusFilter, number>;
}

function reviewCountsForRecords(records: AdminReviewRecord[]): AdminReviewCounts {
  return {
    total: records.length,
    DRAFT: records.filter((record) => record.status === "DRAFT").length,
    REVIEWED: records.filter((record) => record.status === "REVIEWED").length,
    LIVE: records.filter((record) => record.status === "LIVE").length,
    ARCHIVED: records.filter((record) => record.status === "ARCHIVED").length,
    ERROR: records.filter((record) => record.status === "ERROR").length
  };
}

function isUnsavedManualReviewId(recordId: string | null | undefined): recordId is string {
  return typeof recordId === "string" && recordId.startsWith("manual:");
}

function isUnsavedManualReviewRecord(record: AdminReviewRecord) {
  return isUnsavedManualReviewId(record.id) && !savedGlobalRowId(record) && !record.rawPrivateRow;
}

function mergeUnsavedManualReviewRecords(currentRecords: AdminReviewRecord[], nextRecords: AdminReviewRecord[]) {
  const manualRecords = currentRecords.filter(isUnsavedManualReviewRecord);

  if (manualRecords.length === 0) {
    return nextRecords;
  }

  const manualIds = new Set(manualRecords.map((record) => record.id));
  const manualContentKeys = new Set(manualRecords.map((record) => record.contentKey));

  return [
    ...manualRecords,
    ...nextRecords.filter((record) => !manualIds.has(record.id) && !manualContentKeys.has(record.contentKey))
  ];
}

function prependDraftReviewRecord(currentRecords: AdminReviewRecord[], nextRecord: AdminReviewRecord) {
  return [
    nextRecord,
    ...currentRecords.filter(
      (record) => record.id !== nextRecord.id && record.contentKey !== nextRecord.contentKey
    )
  ];
}

function categoryUsesDateFilter(category: AdminContentCategoryFilter) {
  return category === "all" || category === "Sky";
}

function reviewSurfaceUsesDateFilter(surface: AdminReviewSurface) {
  return surface === "upcomingAspects";
}

function reviewSurfacesForCategory(category: AdminContentCategoryFilter) {
  if (category === "Sky") return ["upcomingAspects"] as AdminReviewSurface[];
  if (category === "Relationship") return ["relationshipLayer"] as AdminReviewSurface[];
  if (category === "Natal Aspects" || category === "Natal Angles" || category === "Natal Chart") return ["transitNatal", "natalChart"] as AdminReviewSurface[];
  if (category === "Fallback Templates") return Object.keys(reviewSurfaceLabels) as AdminReviewSurface[];

  return Object.keys(reviewSurfaceLabels) as AdminReviewSurface[];
}

function categoryUsesGlobalSynastryRows(category: AdminContentCategoryFilter) {
  return category === "all" || category === "Relationship" || category === "Fallback Templates";
}

function reviewRecordMergeKey(record: AdminReviewRecord) {
  const source = record.source === "global" || record.source === "saved" ? "global" : record.source;

  return `${source}:${record.surface}:${record.contentKey}:${record.targetDate ?? ""}:${record.subjectId ?? ""}`;
}

function recordOrbLabel(record: AdminReviewRecord) {
  const orb = record.facts?.orb;

  return typeof orb === "number" ? `${orb.toFixed(1)}°` : typeof orb === "string" && orb ? `${orb}°` : "Not set";
}

function recordDirectionLabel(record: AdminReviewRecord) {
  const direction = record.facts?.direction;

  return typeof direction === "string" && direction ? direction : "Not set";
}

function recordAstrologyFactsLabel(record: AdminReviewRecord) {
  const body1 = factStringFromSources(record, ["body1", "planetA", "from", "transitPlanet", "planet", "point"]);
  const sign1 = factStringFromSources(record, ["sign1", "fromSign", "transitSign", "planetASign", "planetSign", "sign"]);
  const aspect = factStringFromSources(record, ["aspect", "type", "aspectType"]);
  const body2 = factStringFromSources(record, ["body2", "planetB", "to", "natalPoint", "pointB"]);
  const sign2 = factStringFromSources(record, ["sign2", "toSign", "natalSign", "planetBSign", "pointSign"]);
  const placementSign = factStringFromSources(record, ["placementSign", "natalSign", "planetSign", "sign"]);
  const placementHouse = factStringFromSources(record, ["placementHouse", "house", "houseNumber"]);

  if (body1 && aspect && body2) {
    const first = formatSkyBodyPosition(body1, sign1);
    const second = formatSkyBodyPosition(body2, sign2);

    return `${capitalizeSentence(first)} ${aspect.toLowerCase()} ${second}`;
  }

  if (body1 && (sign1 || placementSign)) {
    return [
      capitalizeSentence(formatSkyBodyPosition(body1, sign1 || placementSign)),
      placementHouse ? `${placementHouse}H` : ""
    ].filter(Boolean).join(" · ");
  }

  if (placementSign) {
    return `Placement sign: ${placementSign}`;
  }

  return "";
}

function reviewMetadataForRecord(record: AdminReviewRecord): AdminReviewMetadataEdit {
  const orb = record.facts?.orb;
  const placementSign = factStringFromSources(record, ["placementSign", "natalSign", "planetSign", "sign"]);
  const placementBody = factStringFromSources(record, ["placementBody", "planet", "body", "point", "node"]);
  const traditionalRulerBody = factStringFromSources(record, ["traditionalRulerBody", "traditionalRuler", "ruler", "rulerBody", "houseRuler"]) || traditionalRulerForSign(placementSign);
  const modernRulerBody = factStringFromSources(record, ["modernRulerBody", "modernRuler"]) || modernRulerForSign(placementSign);
  const traditionalRulerPlacement = rulerPlacementForRecord(record, traditionalRulerBody);
  const modernRulerPlacement = rulerPlacementForRecord(record, modernRulerBody);

  return {
    targetDate: record.targetDate ?? "",
    surface: record.surface,
    mode: record.mode,
    status: record.status,
    category: contentCategoryLabel(record),
    blockType: contentBlockType(record),
    orb: typeof orb === "number" ? String(orb) : typeof orb === "string" ? orb : "",
    direction: recordDirectionLabel(record) === "Not set" ? "" : recordDirectionLabel(record),
    body1: factStringFromSources(record, ["body1", "planetA", "from", "transitPlanet", "planet", "point"]),
    sign1: factStringFromSources(record, ["sign1", "fromSign", "transitSign", "planetASign", "planetSign", "sign"]),
    house1: factStringFromSources(record, ["house1", "fromHouse", "planetAHouse"]),
    aspect: factStringFromSources(record, ["aspect", "type", "aspectType"]),
    body2: factStringFromSources(record, ["body2", "planetB", "to", "natalPoint", "pointB"]),
    sign2: factStringFromSources(record, ["sign2", "toSign", "natalSign", "planetBSign", "pointSign"]),
    house2: factStringFromSources(record, ["house2", "toHouse", "natalHouse", "planetBHouse"]),
    placementSign,
    placementBody,
    placementHouse: factStringFromSources(record, ["placementHouse", "house", "houseNumber"]),
    placementRetrograde: !isNodePlacement(placementBody) && factBooleanFromSources(record, ["retrograde", "isRetrograde"]),
    rulerBody: traditionalRulerBody,
    rulerSign: factStringFromSources(record, ["rulerSign", "houseRulerSign", "traditionalRulerSign"]) || traditionalRulerPlacement.sign,
    rulerHouse: factStringFromSources(record, ["rulerHouse", "houseRulerHouse", "traditionalRulerHouse"]) || traditionalRulerPlacement.house,
    traditionalRulerBody,
    traditionalRulerSign: factStringFromSources(record, ["traditionalRulerSign"]) || traditionalRulerPlacement.sign,
    traditionalRulerHouse: factStringFromSources(record, ["traditionalRulerHouse"]) || traditionalRulerPlacement.house,
    modernRulerBody,
    modernRulerSign: factStringFromSources(record, ["modernRulerSign"]) || modernRulerPlacement.sign,
    modernRulerHouse: factStringFromSources(record, ["modernRulerHouse"]) || modernRulerPlacement.house,
    lunarArcLayer: factStringFromSources(record, ["lunarArcLayer", "arcLayer", "moonArcLayer"]),
    lunarSource: factStringFromSources(record, ["lunarSource", "dashboardSource", "sourceFamily"]),
    practice: factStringFromSources(record, ["practice"]),
    reflect: factStringFromSources(record, ["reflect", "reflection"]),
    ritual: factStringFromSources(record, ["ritual"]),
    callback: factStringFromSources(record, ["callback", "cycleCallback"])
  };
}

function surfaceForContentCategory(category: Exclude<AdminContentCategoryFilter, "all">): GeneratedContentSurface {
  if (category === "Sky") return "sky";
  if (category === "Relationship") return "relationship";
  if (category === "Condition Modifiers") return "modifier";
  if (category === "Fallback Templates") return "sky";

  return "natal";
}

function statusForReviewSave(record: AdminReviewRecord, requestedStatus: GeneratedContentStatus) {
  return requestedStatus;
}

function adminApiCheckedAtLabel(value: string | null) {
  if (!value) {
    return "Not checked yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function parseAdminJson(value: string, label: string) {
  try {
    return value.trim() ? JSON.parse(value) : {};
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function hasUsableFacts(value: string) {
  try {
    const parsed = JSON.parse(value || "{}") as Record<string, unknown>;

    return Object.keys(parsed).length > 0 && !("note" in parsed);
  } catch {
    return false;
  }
}

class AdminRequestError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "AdminRequestError";
    this.status = status;
    this.payload = payload;
  }
}

function adminErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AdminRequestError && error.status === 401) {
    return "Your saved admin access secret did not match production. Paste the current CONTENT_GENERATION_SECRET, then click Save and Check Access.";
  }

  return error instanceof Error ? error.message : fallback;
}

function isLocalAdminApiRequest(path: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;
  return path.startsWith("/api/admin/") && (hostname === "localhost" || hostname === "127.0.0.1");
}

function adminApiUnavailableHint(path: string) {
  if (!isLocalAdminApiRequest(path)) {
    return "";
  }

  return " The dashboard UI is running, but the local admin API route is not responding. Restart the local dev server, then reload before saving, importing, publishing, or creating rows.";
}

function withAdminApiUnavailableHint(message: string, path: string) {
  const hint = adminApiUnavailableHint(path);
  if (!hint || message.includes("local admin API")) {
    return message;
  }

  return `${message}${hint}`;
}

function canUseLocalAdminApiHealthFallback() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

async function getLocalAdminApiHealthFallback(): Promise<TldrAstroApiHealth | null> {
  if (!canUseLocalAdminApiHealthFallback()) {
    return null;
  }

  const response = await fetch("/api/health", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null) as {
    ok?: boolean;
    status?: string;
    timestamp?: string;
    dependencies?: {
      ephemeris?: {
        ok?: boolean;
        detail?: {
          version?: string | number;
        };
      };
    };
  } | null;

  if (!payload?.ok) {
    return null;
  }

  return {
    ok: true,
    service: "tldrastro-local-admin",
    checkedAt: typeof payload.timestamp === "string" ? payload.timestamp : new Date().toISOString(),
    ephemeris: {
      available: Boolean(payload.dependencies?.ephemeris?.ok),
      library: "local",
      version: payload.dependencies?.ephemeris?.detail?.version,
      path: "/api/health"
    }
  };
}

async function adminJsonRequest<T>(path: string, secret: string, options: RequestInit = {}, timeoutMs = 75000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
        ...(options.headers ?? {})
      }
    });
    const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;

    if (!response.ok) {
      throw new AdminRequestError(withAdminApiUnavailableHint(payload?.error ?? `${response.status} error from ${path.split("?")[0]}.`, path), response.status, payload);
    }

    if (!payload) {
      throw new AdminRequestError(withAdminApiUnavailableHint(`Expected JSON from ${path.split("?")[0]}, but the server returned a non-JSON response. If you are running locally, use the Vercel/API dev server for admin actions.`, path), response.status);
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AdminRequestError(`Request to ${path.split("?")[0]} timed out after ${Math.round(timeoutMs / 1000)} seconds. The provider may still be failing upstream; try again or switch providers.`, 408);
    }

    if (error instanceof AdminRequestError) {
      throw error;
    }

    if (error instanceof TypeError) {
      throw new AdminRequestError(withAdminApiUnavailableHint(`Could not reach ${path.split("?")[0]}.`, path), 0, error);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function GeneratedContentAdminDashboard() {
  const sourceGroundedBundle = sourceGroundedDashboardRecords as SourceGroundedDashboardRecordBundle;
  const sourceGroundedSummary = sourceGroundedBundle.summary ?? {};
  const sourceGroundedGapSamples = (sourceGroundedBundle.sourceGaps ?? []).slice(0, 4);
  const sourceGroundedReviewBundle = sourceGroundedReviewCandidates as {
    summary?: {
      totalCandidates?: number;
      draftCandidatesBySurface?: Record<string, number>;
      classificationCounts?: Record<string, number>;
      eligibleReviewedClausesBySurface?: Record<string, number>;
    };
    fixtures?: Array<{
      id: string;
      label: string;
      surfaceId: string;
      classification: string;
      productionReaderResult: string;
      candidateId: string | null;
    }>;
    candidates?: Array<{
      id: string;
      dashboardLabel: string;
      surfaceId: string;
      sourceTier: string;
      templateId: string;
      templateVersion: string;
      primarySourceIds: string[];
      supportingSourceIds: string[];
      slotProvenance: Array<{ slot: string; sourceId: string; sourceTier: string }>;
      finalPreview: string;
      bannedSeamResults: { passed: boolean; matches: string[] };
      redundancyResults: { passed: boolean; suppressedSlots: string[] };
    }>;
  };
  const sourceGroundedReviewSummary = sourceGroundedReviewBundle.summary ?? {};
  const [secret, setSecret] = useState(() => {
    try {
      return window.localStorage.getItem(adminSecretStorageKey) ?? "";
    } catch {
      return "";
    }
  });
  const [secretDraft, setSecretDraft] = useState(secret);
  const [surface, setSurface] = useState<GeneratedContentSurfaceFilter>("sky");
  const [status, setStatus] = useState<GeneratedContentStatus | "all">("DRAFT");
  const [contentStatusFilter, setContentStatusFilter] = useState<AdminContentStatusFilter>("all");
  const [contentQueueFilter, setContentQueueFilter] = useState<AdminContentQueueFilter>(null);
  const [contentSourceFilter, setContentSourceFilter] = useState<AdminContentClassFilter>("all");
  const [contentTierFilter, setContentTierFilter] = useState<AdminPhrasebankTierFilter>("all");
  const [generatedContentPreviewMode, setGeneratedContentPreviewMode] = useState<GeneratedContentPreviewMode>(readGeneratedContentPreviewMode);
  const [reviewQueueStatusFilter, setReviewQueueStatusFilter] = useState<AdminReviewQueueStatusFilter>("all");
  const [reviewQueueEvergreenFilter, setReviewQueueEvergreenFilter] = useState<AdminReviewQueueEvergreenFilter>("hideEvergreen");
  const [reviewQueueSourceFilter, setReviewQueueSourceFilter] = useState<AdminReviewQueueSourceFilter>("phrasebank");
  const [reviewQueueTierFilter, setReviewQueueTierFilter] = useState<AdminPhrasebankTierFilter>("all");
  const [reviewQueueFamilyFilter, setReviewQueueFamilyFilter] = useState<AdminReviewQueueFamilyFilter>("all");
  const [reviewQueuePlanetFilter, setReviewQueuePlanetFilter] = useState("all");
  const [reviewQueueQuery, setReviewQueueQuery] = useState("");
  const [selectedReviewQueueGroupKey, setSelectedReviewQueueGroupKey] = useState<AdminReviewQueueGroupKey | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<AdminContentCategoryFilter>("all");
  const [contentBlockFilter, setContentBlockFilter] = useState<AdminContentBlockFilter>("all");
  const [reviewSurface, setReviewSurface] = useState<AdminReviewSurface>("upcomingAspects");
  const [dateStart, setDateStart] = useState(() => dateInputValue());
  const [dateEnd, setDateEnd] = useState(() => dateInputValue(addDays(new Date(), 30)));
  const [personQuery, setPersonQuery] = useState("");
  const [rows, setRows] = useState<AdminGeneratedContentRow[]>([]);
  const [vocabularyRows, setVocabularyRows] = useState<AdminGeneratedContentRow[]>([]);
  const [taglineRows, setTaglineRows] = useState<AdminGeneratedContentRow[]>([]);
  const [templateContentRows, setTemplateContentRows] = useState<AdminGeneratedContentRow[]>([]);
  const [lunarCoverageRows, setLunarCoverageRows] = useState<AdminGeneratedContentRow[]>([]);
  const [lunarCoverageLoadedFromDb, setLunarCoverageLoadedFromDb] = useState(false);
  const [signContextSettingRow, setSignContextSettingRow] = useState<AdminGeneratedContentRow | null>(null);
  const [signContextEnabled, setSignContextEnabled] = useState(true);
  const [skyHistoricalLookbackSettingRow, setSkyHistoricalLookbackSettingRow] = useState<AdminGeneratedContentRow | null>(null);
  const [skyHistoricalLookbackEnabled, setSkyHistoricalLookbackEnabled] = useState(false);
  const [vocabularyDrafts, setVocabularyDrafts] = useState<Record<string, AdminVocabularyDraft>>({});
  const [vocabularyCategoryFilter, setVocabularyCategoryFilter] = useState<AdminVocabularyCategoryFilter>("all");
  const [vocabularyStatusFilter, setVocabularyStatusFilter] = useState<AdminVocabularyStatusFilter>("all");
  const [vocabularyQuery, setVocabularyQuery] = useState("");
  const [selectedVocabularyContentKey, setSelectedVocabularyContentKey] = useState<string | null>(null);
  const [taglineDrafts, setTaglineDrafts] = useState<Record<string, AdminNatalTaglineDraft>>({});
  const [templateContentDrafts, setTemplateContentDrafts] = useState<Record<string, AdminTemplateDraft>>({});
  const [templatePreviewSlotDrafts, setTemplatePreviewSlotDrafts] = useState<Record<string, Record<string, string>>>({});
  const [fallbackHookSectionFilter, setFallbackHookSectionFilter] = useState<AdminFallbackHookSectionFilter>("all");
  const [lunarCoverageFilter, setLunarCoverageFilter] = useState<LunarCoverageFilter>("all");
  const [slotDictionaryQuery, setSlotDictionaryQuery] = useState("");
  const [slotDictionarySourceFilter, setSlotDictionarySourceFilter] = useState<SlotDictionarySourceFilter>("all");
  const [slotDictionaryStatusFilter, setSlotDictionaryStatusFilter] = useState<SlotDictionaryStatusFilter>("all");
  const [writingSurfaceAreaFilter, setWritingSurfaceAreaFilter] = useState<WritingSurfaceAreaFilter>("all");
  const [writingSurfaceStatusFilter, setWritingSurfaceStatusFilter] = useState<WritingSurfaceMapStatusFilter>("all");
  const [slotInfoDismissed, setSlotInfoDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(adminSlotInfoDismissedStorageKey) === "true";
    } catch {
      return false;
    }
  });
  const [selectedHookCatalogItem, setSelectedHookCatalogItem] = useState<AdminHookCatalogSelection | null>(null);
  const [selectedTemplateContentId, setSelectedTemplateContentId] = useState<string | null>(null);
  const [selectedFallbackHookKey, setSelectedFallbackHookKey] = useState<string | null>(null);
  const [templateDrawerMode, setTemplateDrawerMode] = useState<AdminTemplateDrawerMode>("view");
  const [reviewRecords, setReviewRecords] = useState<AdminReviewRecord[]>([]);
  const [reviewCounts, setReviewCounts] = useState<AdminReviewCounts>({
    total: 0,
    DRAFT: 0,
    REVIEWED: 0,
    LIVE: 0,
    ARCHIVED: 0,
    ERROR: 0
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [selectedContentRowIds, setSelectedContentRowIds] = useState<Set<string>>(() => new Set());
  const [bulkContentStatus, setBulkContentStatus] = useState<GeneratedContentStatus>("REVIEWED");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewEditTitle, setReviewEditTitle] = useState("");
  const [reviewEditSummary, setReviewEditSummary] = useState("");
  const [reviewEditBody, setReviewEditBody] = useState("");
  const [reviewEditMetadata, setReviewEditMetadata] = useState<AdminReviewMetadataEdit | null>(null);
  const [reviewGenerationProvider, setReviewGenerationProvider] = useState<AdminGenerationProvider>("openai");
  const [isGeneratingReviewDraft, setIsGeneratingReviewDraft] = useState(false);
  const [reviewDraftResults, setReviewDraftResults] = useState<Record<string, AdminDraftResult>>({});
  const [draft, setDraft] = useState<AdminGeneratedContentDraft>(() => createAdminDraft());
  const [message, setMessage] = useState(() => secret.trim()
    ? "Loading content library..."
    : "Add the content generation secret first."
  );
  const [reviewLoadError, setReviewLoadError] = useState<string | null>(secret.trim() ? null : "Add the content generation secret first.");
  const [saveToastMessage, setSaveToastMessage] = useState("");
  const [accessStatus, setAccessStatus] = useState<AdminAccessStatus>(() => secret.trim() ? "checking" : "empty");
  const [isLoading, setIsLoading] = useState(false);
  const [areGenerationInputsOpen, setAreGenerationInputsOpen] = useState(true);
  const [statusMetrics, setStatusMetrics] = useState<Record<GeneratedContentStatus, number>>({
    DRAFT: 0,
    REVIEWED: 0,
    LIVE: 0,
    ARCHIVED: 0,
    ERROR: 0
  });
  const [totalMetricRows, setTotalMetricRows] = useState(0);
  const [voiceTemplates, setVoiceTemplates] = useState<Record<VoiceTemplateSurface, VoiceTemplateConfig>>(() => loadVoiceTemplates());
  const [activeTemplateSurface, setActiveTemplateSurface] = useState<VoiceTemplateSurface>("sky");
  const [voiceSettingsLoadedFromDb, setVoiceSettingsLoadedFromDb] = useState(false);
  const [activePage, setActivePage] = useState<AdminDashboardPage>("overview");
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [localDraftReviewRecords, setLocalDraftReviewRecords] = useState<AdminReviewRecord[]>([]);
  const contentImportInputRef = useRef<HTMLInputElement | null>(null);
  const contentImportScopeRef = useRef<AdminContentScope>("settings");
  const saveToastTimeoutRef = useRef<number | null>(null);
  const vocabularyLoadRequestRef = useRef(0);
  const templateContentLoadRequestRef = useRef(0);
  const vocabularyDraftDirtyRef = useRef(false);
  const templateContentDraftDirtyRef = useRef(false);
  const handledAdminDeepLinkHashRef = useRef<string | null>(null);
  const [apiStatus, setApiStatus] = useState<AdminApiStatusState>({
    state: isTldrAstroApiConfigured ? "idle" : "notConfigured",
    checkedAt: null,
    latencyMs: null,
    health: null,
    error: isTldrAstroApiConfigured ? null : "VITE_TLDRASTRO_API_URL is not configured."
  });
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;
  const currentTemplateContentRows = useMemo(
    () => templateContentRows.filter((row) => !isLegacyFallbackTemplateRow(row)),
    [templateContentRows]
  );
  const currentMustacheTemplateRows = useMemo(
    () => currentTemplateContentRows.filter((row) => row.content_key.startsWith("slot-template/")),
    [currentTemplateContentRows]
  );
  const currentFallbackHookRows = useMemo(
    () => currentTemplateContentRows.filter((row) => row.content_key.startsWith("fallback-hook/")),
    [currentTemplateContentRows]
  );
  const fallbackHookSectionCounts = useMemo(() => {
    const counts = {
      all: currentFallbackHookRows.length,
      sky: 0,
      you: 0,
      friends: 0,
      "lunar-calendar": 0,
      settings: 0
    } satisfies Record<AdminFallbackHookSectionFilter, number>;

    currentFallbackHookRows.forEach((row) => {
      const section = fallbackHookSectionForRow(row);

      if (section !== "all") {
        counts[section] += 1;
      }
    });

    return counts;
  }, [currentFallbackHookRows]);
  const filteredFallbackHookRows = useMemo(() => (
    fallbackHookSectionFilter === "all"
      ? currentFallbackHookRows
      : currentFallbackHookRows.filter((row) => fallbackHookSectionForRow(row) === fallbackHookSectionFilter)
  ), [currentFallbackHookRows, fallbackHookSectionFilter]);
  const duplicateMustacheTemplateKeys = useMemo(() => {
    const counts = new Map<string, number>();

    currentMustacheTemplateRows.forEach((row) => {
      counts.set(row.content_key, (counts.get(row.content_key) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([contentKey]) => contentKey);
  }, [currentMustacheTemplateRows]);
  const isLunarCoverageSelected = false;
  const selectedTemplateContentRow = currentTemplateContentRows.find((row) => row.id === selectedTemplateContentId)
    ?? (selectedFallbackHookKey
      ? findFallbackTemplateRowForHook(currentTemplateContentRows, selectedFallbackHookKey)
      : null);
  const selectedLunarCatalogDefinition = selectedHookCatalogItem?.type === "lunar"
    ? lunarCalendarContentKeyDefinitions.find((definition) => definition.key === selectedHookCatalogItem.key) ?? null
    : null;
  const selectedFallbackCatalogHook = selectedHookCatalogItem?.type === "fallback"
    ? fallbackHookDefinitions.find((hook) => hook.key === selectedHookCatalogItem.key) ?? null
    : null;
  const openHookCatalogItemFromKeyboard = (event: ReactKeyboardEvent<HTMLElement>, item: AdminHookCatalogSelection) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    setSelectedHookCatalogItem(item);
  };

  function setAdminHash(nextHash: string, mode: "push" | "replace" = "push") {
    if (window.location.hash === nextHash) return;

    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    if (mode === "replace") {
      window.history.replaceState(null, "", nextUrl);
    } else {
      window.history.pushState(null, "", nextUrl);
    }
  }

  function navigateAdminPage(page: AdminDashboardPage) {
    setIsCreateMenuOpen(false);
    handledAdminDeepLinkHashRef.current = null;
    setAdminHash(adminHashForPage(page));
    setActivePage(page);
  }

  function handleCreateAction(page: AdminDashboardPage, nextMessage: string) {
    setIsCreateMenuOpen(false);
    navigateAdminPage(page);
    setMessage(nextMessage);
  }

  function openWritingSurfaceSource(surface: WritingSurfaceMapItem, source: WritingSurfaceSourceItem) {
    setIsCreateMenuOpen(false);

    if (source.role === "source-grounded" || source.role === "stored-source" || source.role === "phrasebank") {
      const params = new URLSearchParams({
        category: writingSurfaceContentCategory(surface.area),
        source: source.role === "stored-source" ? "fallback-hook" : "phrasebank",
        q: surface.surface
      });
      setCategoryFilter(writingSurfaceContentCategory(surface.area));
      setContentSourceFilter(source.role === "stored-source" ? "fallback-hook" : "phrasebank");
      setPersonQuery(surface.surface);
      setContentQueueFilter(null);
      setContentStatusFilter("all");
      setAdminHash(adminHashForPage("content", params));
      setActivePage("content");
      setMessage(`Opened Exact Content for ${surface.surface}. Search is set to this surface; clear it if the imported rows use a different title or key.`);
      return;
    }

    if (source.role === "knowledge" || source.role === "madlib-material") {
      const params = new URLSearchParams({
        section: writingSurfaceFallbackSection(surface.area)
      });
      setFallbackHookSectionFilter(writingSurfaceFallbackSection(surface.area));
      setAdminHash(adminHashForPage("knowledge", params));
      setActivePage("knowledge");
      setMessage(`Opened Fallback Hooks for ${surface.area}. Use the hook list to edit the fallback frame or source-based madlib material.`);
      return;
    }

    setMessage(`${source.label} is a file source: ${source.path}. It is visible here for traceability, but it does not have an in-dashboard editor yet.`);
  }

  function closeTemplateContentDrawer() {
    if (/^#fallback-row\//.test(window.location.hash)) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      handledAdminDeepLinkHashRef.current = null;
    }

    setSelectedTemplateContentId(null);
    setSelectedFallbackHookKey(null);
  }

  function openFallbackHookTemplateEditor(hookKey: string, mode: AdminTemplateDrawerMode = "edit") {
    const contentKey = canonicalFallbackTemplateContentKey(hookKey) ?? contextContentKey(hookKey);
    const row = findFallbackTemplateRowForHook(currentTemplateContentRows, hookKey);

    setFallbackHookSectionFilter(hookSectionForKey(hookKey));
    setTemplateDrawerMode(mode);
    setSelectedTemplateContentId(row?.id ?? `placeholder:${contentKey}`);
    setSelectedFallbackHookKey(hookKey);
    setSelectedHookCatalogItem(null);
    setActivePage("knowledge");
    window.history.replaceState(null, "", `#fallback-row/${encodeURIComponent(hookKey)}`);
    setMessage(`Editing ${contentKey}.`);
  }

  async function copyAdminEditorLink(nextUrl: string, label: string) {
    window.history.replaceState(null, "", nextUrl);

    try {
      if (!window.navigator.clipboard) {
        throw new Error("Clipboard API unavailable.");
      }

      await window.navigator.clipboard.writeText(nextUrl);
      setMessage(`Copied link for ${label}.`);
      showSaveToast("Link copied");
    } catch {
      window.prompt("Copy this row link:", nextUrl);
      setMessage(`Copy this link to reopen ${label}.`);
    }
  }

  function copyFallbackHookEditorLink(hookKey: string) {
    const nextUrl = `${window.location.origin}${window.location.pathname}#fallback-row/${encodeURIComponent(hookKey)}`;

    void copyAdminEditorLink(nextUrl, contextContentKey(hookKey));
  }

  async function createFallbackHookDraftFromCatalog(hook: FallbackHookDefinition) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const contentKey = contextContentKey(hook.key);
    const seedDraft = templateSeedDraftForContentKey(contentKey);
    const headline = seedDraft.headline || hook.copy.headline || "";
    const summary = seedDraft.summary || hook.copy.summary || "";
    const body = seedDraft.body || hook.copy.body || "";

    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            contentKey,
            surface: generatedSurfaceForFallbackHook(hook.key),
            mode: generatedContentModeForFallbackHook(hook),
            eventType: "fallback-hook",
            status: "DRAFT",
            headline,
            summary,
            body,
            sections: [],
            facts: {},
            knowledgeIds: [],
            sourceSnapshot: {
              contentType: "template",
              hook: hook.key,
              source: "fallback-hook-catalog"
            },
            promptVersion: "fallback-hook-template-v1",
            blockType: "fallback_template",
            reviewerNotes: ""
          })
        }
      );
      const createdRow = payload.rows?.[0];

      await loadTemplateContentRows({ forceDraftRefresh: true });
      if (createdRow) {
        setTemplateContentDrafts((currentDrafts) => ({
          ...currentDrafts,
          [createdRow.id]: templateDraftFromRow(createdRow)
        }));
        setSelectedTemplateContentId(createdRow.id);
      }
      setFallbackHookSectionFilter(hookSectionForKey(hook.key));
      setTemplateDrawerMode("edit");
      setSelectedFallbackHookKey(hook.key);
      setSelectedHookCatalogItem(null);
      setActivePage("knowledge");
      window.history.replaceState(null, "", `#fallback-row/${encodeURIComponent(hook.key)}`);
      setMessage(`Created ${contentKey} as DRAFT. Review and sign off separately when ready.`);
      showSaveToast("Fallback hook draft created");
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not create fallback hook draft."));
    } finally {
      setIsLoading(false);
    }
  }
  const lunarCoverageRowsByKey = useMemo(() => (
    new Map(lunarCoverageRows.map((row) => [row.content_key, row]))
  ), [lunarCoverageRows]);
  const fallbackTemplateRowsByContentKey = useMemo(() => (
    new Map(currentTemplateContentRows.map((row) => [row.content_key, row]))
  ), [currentTemplateContentRows]);
  const vocabularyRowsByContentKey = useMemo(() => (
    new Map(vocabularyRows.map((row) => [row.content_key, row]))
  ), [vocabularyRows]);
  const lunarCoverageSummaries = useMemo<LunarCoverageSummaryItem[]>(() => (
    lunarCoverageGroups.map((group) => {
      const definitions = lunarCalendarContentKeyDefinitions.filter((definition) => definition.group === group);
      const vocabGaps = new Set<string>();
      let live = 0;
      let draft = 0;
      let empty = 0;

      definitions.forEach((definition) => {
        const row = lunarCoverageRowsByKey.get(definition.key);

        if (!row) {
          empty += 1;
        } else if (row.status === "LIVE") {
          live += 1;
        } else {
          draft += 1;
        }

        if (lunarCoverageLoadedFromDb) {
          lunarCoverageVocabDependencies(definition).forEach((vocabKey) => {
            if (!vocabularyRowsByContentKey.has(vocabKey)) {
              vocabGaps.add(vocabKey);
            }
          });
        }
      });

      return {
        group,
        label: lunarCoverageGroupLabels[group],
        total: definitions.length,
        live,
        draft,
        empty,
        vocabGaps: [...vocabGaps].sort((first, second) => first.localeCompare(second))
      };
    })
  ), [lunarCoverageLoadedFromDb, lunarCoverageRowsByKey, vocabularyRowsByContentKey]);
  const filteredLunarCoverageGroups = useMemo(
    () => lunarCoverageFilterGroups[lunarCoverageFilter],
    [lunarCoverageFilter]
  );
  const canUseApi = secret.trim().length > 0;
  function showSaveToast(nextMessage = "Saved") {
    if (saveToastTimeoutRef.current !== null) {
      window.clearTimeout(saveToastTimeoutRef.current);
    }

    setSaveToastMessage(nextMessage);
    saveToastTimeoutRef.current = window.setTimeout(() => {
      setSaveToastMessage("");
      saveToastTimeoutRef.current = null;
    }, 2600);
  }

  function savedStatusLabel(status: GeneratedContentStatus | undefined) {
    if (status === "LIVE") return "published";
    if (status === "REVIEWED") return "reviewed";
    if (status === "ARCHIVED") return "archived";
    if (status === "ERROR") return "error";
    return "draft";
  }

  const dedupedContentRecords = useMemo(
    () => dedupeContentLibraryRecords(reviewRecords.filter((record) => !isInternalAdminSettingRecord(record))),
    [reviewRecords]
  );
  const localSkySnapshotContentRecords = useMemo(() => localSkySnapshotAdminRows(), []);
  const defaultContentLibraryRecords = useMemo(() => {
    const localDraftContent = localDraftReviewRecords.filter((record) => !isSpecializedAdminRecord(record));
    const localDraftKeys = new Set(localDraftContent.map((record) => record.contentKey));
    const localDraftIds = new Set(localDraftContent.map((record) => record.id));
    const persistedContent = dedupedContentRecords
      .filter((record) => !isSpecializedAdminRecord(record))
      .filter((record) => !localDraftKeys.has(record.contentKey) && !localDraftIds.has(record.id));
    const persistedKeys = new Set([...localDraftKeys, ...persistedContent.map((record) => record.contentKey)]);
    const visibleLocalSnapshots = localSkySnapshotContentRecords.filter((record) => !persistedKeys.has(record.contentKey));

    return [...localDraftContent, ...persistedContent, ...visibleLocalSnapshots];
  }, [dedupedContentRecords, localDraftReviewRecords, localSkySnapshotContentRecords]);
  const filteredContentRecords = useMemo(() => {
    const normalizedPersonQuery = personQuery.trim().toLowerCase();

    return defaultContentLibraryRecords
      .filter((record) => {
        if (!normalizedPersonQuery) return true;

        return [
          record.userId,
          record.subjectId,
          record.subjectType,
          record.contentKey,
          record.title
        ].some((value) => value?.toLowerCase().includes(normalizedPersonQuery));
      })
      .filter((record) => categoryFilter === "all" || contentCategoryLabel(record) === categoryFilter)
      .filter((record) => contentBlockFilter === "all" || contentBlockType(record) === contentBlockFilter)
      .filter((record) => recordMatchesContentClassFilter(record, contentSourceFilter))
      .filter((record) => recordMatchesPhrasebankTierFilter(record, contentTierFilter));
  }, [categoryFilter, contentBlockFilter, contentSourceFilter, contentTierFilter, personQuery, defaultContentLibraryRecords]);
  const allContentRecords = useMemo(() => {
    return filteredContentRecords
      .filter((record) => recordMatchesQueueFilter(record, contentQueueFilter))
      .filter((record) => recordMatchesContentStatus(record, contentStatusFilter))
      .sort((first, second) => {
        const sourcePriorityCompare = reviewRecordSourcePriority(first) - reviewRecordSourcePriority(second);
        if (sourcePriorityCompare) return sourcePriorityCompare;

        const firstDate = first.targetDate ?? "";
        const secondDate = second.targetDate ?? "";

        if (firstDate !== secondDate) {
          return firstDate.localeCompare(secondDate);
        }

        return first.title.localeCompare(second.title);
      });
  }, [contentQueueFilter, contentStatusFilter, filteredContentRecords]);
  const emergencyFloorRecords = useMemo(() => allContentRecords.filter(isEmergencyFloorReviewRecord), [allContentRecords]);
  const visibleContentRecords = useMemo(() => {
    if (generatedContentPreviewMode === "emergency-floor") {
      return allContentRecords.filter(isEmergencyFloorReviewRecord);
    }

    if (generatedContentPreviewMode === "hide-emergency-floor") {
      return allContentRecords.filter((record) => !isEmergencyFloorReviewRecord(record));
    }

    return allContentRecords;
  }, [allContentRecords, generatedContentPreviewMode]);
  const compositeByTypeRecords = useMemo(() => (
    dedupedContentRecords
      .filter((record) => record.surface === "composite")
      .filter((record) => Boolean(compositeRelationshipTypeSections(record)))
      .sort((first, second) => first.contentKey.localeCompare(second.contentKey))
  ), [dedupedContentRecords]);
  const reviewQueueBaseRecords = useMemo(() => dedupedContentRecords, [dedupedContentRecords]);
  const reviewQueueProgress = useMemo(() => {
    const visibleRows = reviewQueueBaseRecords.filter((record) => !isArchivedRecord(record));
    const workingRows = visibleRows.filter((record) => !record.evergreen);

    return {
      total: workingRows.length,
      reviewed: workingRows.filter((record) => reviewStatusRank[record.status] >= reviewStatusRank.REVIEWED).length,
      published: visibleRows.filter((record) => record.status === "LIVE").length,
      evergreen: visibleRows.filter((record) => record.evergreen).length
    };
  }, [reviewQueueBaseRecords]);
  const filteredReviewQueueRecords = useMemo(() => {
    const query = reviewQueueQuery.trim().toLowerCase();

    return reviewQueueBaseRecords
      .filter((record) => reviewQueueStatusFilter === "all" ? !isArchivedRecord(record) : record.status === reviewQueueStatusFilter)
      .filter((record) => {
        if (reviewQueueEvergreenFilter === "all") return true;
        if (reviewQueueEvergreenFilter === "evergreen") return record.evergreen;
        return !record.evergreen;
      })
      .filter((record) => {
        return recordMatchesContentClassFilter(record, reviewQueueSourceFilter);
      })
      .filter((record) => recordMatchesPhrasebankTierFilter(record, reviewQueueTierFilter))
      .filter((record) => reviewQueueFamilyFilter === "all" || reviewQueueFamily(record) === reviewQueueFamilyFilter)
      .filter((record) => reviewQueuePlanetFilter === "all" || reviewQueuePlacementPlanet(record) === reviewQueuePlanetFilter)
      .filter((record) => !query || reviewRecordPlainText(record).toLowerCase().includes(query))
      .sort((first, second) => {
        const sourcePriorityCompare = reviewRecordSourcePriority(first) - reviewRecordSourcePriority(second);
        if (sourcePriorityCompare) return sourcePriorityCompare;

        const familyCompare = reviewQueueGroupLabel(reviewQueueGroupKey(first)).localeCompare(reviewQueueGroupLabel(reviewQueueGroupKey(second)));
        if (familyCompare) return familyCompare;

        return reviewQueueRecordLabel(first).localeCompare(reviewQueueRecordLabel(second));
      });
  }, [reviewQueueBaseRecords, reviewQueueEvergreenFilter, reviewQueueFamilyFilter, reviewQueuePlanetFilter, reviewQueueQuery, reviewQueueSourceFilter, reviewQueueStatusFilter, reviewQueueTierFilter]);
  const reviewQueueGroups = useMemo(() => {
    const groups = new Map<AdminReviewQueueGroupKey, { key: AdminReviewQueueGroupKey; label: string; records: AdminReviewRecord[]; reviewed: number; evergreen: number; total: number }>();

    filteredReviewQueueRecords.forEach((record) => {
      const key = reviewQueueGroupKey(record);
      const group = groups.get(key) ?? {
        key,
        label: reviewQueueGroupLabel(key),
        records: [],
        reviewed: 0,
        evergreen: 0,
        total: 0
      };

      group.records.push(record);
      group.total += 1;
      if (reviewStatusRank[record.status] >= reviewStatusRank.REVIEWED) {
        group.reviewed += 1;
      }
      if (record.evergreen) {
        group.evergreen += 1;
      }
      groups.set(key, group);
    });

    return Array.from(groups.values()).sort((first, second) => first.label.localeCompare(second.label));
  }, [filteredReviewQueueRecords]);
  const activeReviewQueueGroup = reviewQueueGroups.find((group) => group.key === selectedReviewQueueGroupKey) ?? reviewQueueGroups[0] ?? null;
  const activeReviewQueueRecords = activeReviewQueueGroup?.records ?? filteredReviewQueueRecords;
  const selectedReviewQueueRecord = activeReviewQueueRecords.find((record) => record.id === selectedReviewId)
    ?? activeReviewQueueRecords[0]
    ?? null;
  const readerSafetyCounts = useMemo(() => {
    return visibleContentRecords.reduce(
      (counts, record) => {
        const state = readerSafetyStateForRecord(record).key;

        counts[state] += 1;

        if (!isEditableTemplateSource(record) && !isReaderFacingCopy(record.body) && (record.body.trim() || record.summary.trim())) {
          counts.flaggedCopy += 1;
        }

        return counts;
      },
      {
        "reader-ready": 0,
        "draft-held": 0,
        "reference-held": 0,
        "review-held": 0,
        "fallback-needed": 0,
        flaggedCopy: 0
      }
    );
  }, [visibleContentRecords]);
  const previewFilteredContentRecords = useMemo(() => {
    if (generatedContentPreviewMode === "emergency-floor") {
      return filteredContentRecords.filter(isEmergencyFloorReviewRecord);
    }

    if (generatedContentPreviewMode === "hide-emergency-floor") {
      return filteredContentRecords.filter((record) => !isEmergencyFloorReviewRecord(record));
    }

    return filteredContentRecords;
  }, [filteredContentRecords, generatedContentPreviewMode]);
  const cmsStatusCounts = useMemo(() => contentStatusCounts(previewFilteredContentRecords), [previewFilteredContentRecords]);
  const cmsQueueCounts = useMemo(() => contentQueueCounts(previewFilteredContentRecords), [previewFilteredContentRecords]);
  const contentFailureQueueCount = useMemo(() => dedupedContentRecords.filter(isFailureQueueRecord).length, [dedupedContentRecords]);
  const selectedReviewRecord = selectedReviewId
    ? localDraftReviewRecords.find((record) => record.id === selectedReviewId)
      ?? reviewRecords.find((record) => record.id === selectedReviewId)
      ?? visibleContentRecords.find((record) => record.id === selectedReviewId)
      ?? null
    : null;
  const selectableContentRecords = useMemo(() => (
    visibleContentRecords.filter((record) => record.source === "private" ? Boolean(record.rawPrivateRow) : Boolean(savedGlobalRowId(record)))
  ), [visibleContentRecords]);
  const selectedContentRecords = useMemo(() => (
    visibleContentRecords.filter((record) => selectedContentRowIds.has(record.id))
  ), [visibleContentRecords, selectedContentRowIds]);
  const selectedPersistedContentRecords = useMemo(() => (
    selectedContentRecords.filter((record) => record.source === "private" ? Boolean(record.rawPrivateRow) : Boolean(savedGlobalRowId(record)))
  ), [selectedContentRecords]);
  const areAllVisibleContentRowsSelected = selectableContentRecords.length > 0
    && selectableContentRecords.every((record) => selectedContentRowIds.has(record.id));
  const isEditingReviewRecord = Boolean(selectedReviewRecord && editingReviewId === selectedReviewRecord.id);
  const canEditSelectedReviewRecord = Boolean(selectedReviewRecord);
  const selectedReviewCopyState = selectedReviewRecord ? reviewCopyState(selectedReviewRecord) : "placeholder";
  const selectedReviewTldr = selectedReviewRecord
    ? isEditingReviewRecord
      ? reviewEditSummary
      : reviewTldrForReview(selectedReviewRecord)
    : "";
  const selectedReviewText = selectedReviewRecord
    ? isEditingReviewRecord
      ? reviewEditBody
      : readerFacingTextForReview(selectedReviewRecord)
    : "";
  const selectedReviewMetaphorFlags = useMemo(() => {
    if (!selectedReviewRecord) {
      return [];
    }

    return findMetaphorPhraseFlags(
      [
        selectedReviewRecord.title,
        selectedReviewTldr,
        selectedReviewText,
        ...selectedReviewRecord.sections.flatMap((section) => [section.heading, section.body])
      ].join("\n"),
      selectedReviewRecord.contentKey
    );
  }, [selectedReviewRecord, selectedReviewText, selectedReviewTldr]);
  const selectedReviewMetadata = selectedReviewRecord
    ? isEditingReviewRecord
      ? reviewEditMetadata ?? reviewMetadataForRecord(selectedReviewRecord)
      : reviewMetadataForRecord(selectedReviewRecord)
    : null;
  const selectedReviewDraftResult = selectedReviewRecord ? reviewDraftResults[selectedReviewRecord.id] ?? null : null;
  const selectedMetadataCategory = selectedReviewMetadata?.category ?? (selectedReviewRecord ? contentCategoryLabel(selectedReviewRecord) : "Sky");
  const selectedMetadataBlockType = selectedReviewMetadata?.blockType ?? (selectedReviewRecord ? contentBlockType(selectedReviewRecord) : "all");
  const selectedMetadataIsNatal = selectedReviewMetadata?.surface === "natal";
  const selectedMetadataIsNatalPlacement = selectedMetadataCategory === "Natal Chart";
  const selectedMetadataIsNatalAngle = selectedMetadataCategory === "Natal Angles";
  const selectedMetadataIsNatalAspect = selectedMetadataCategory === "Natal Aspects";
  const selectedMetadataIsModularNatalBlock = selectedMetadataIsNatal && selectedMetadataBlockType !== "all" && selectedMetadataBlockType !== "essay";
  const selectedMetadataIsLunarCalendar = selectedMetadataBlockType === "lunar_calendar";
  const selectedMetadataUsesAspectFields = !selectedMetadataIsLunarCalendar && (selectedMetadataBlockType.endsWith("_aspect") || selectedMetadataIsNatalAspect);
  const selectedMetadataIsTimeBasedAspect = selectedMetadataBlockType === "sky_aspect" || selectedMetadataBlockType === "transit_to_natal_aspect";
  const selectedMetadataUsesAspectSigns = selectedMetadataUsesAspectFields && (selectedMetadataIsTimeBasedAspect || ["natal_aspect", "synastry_aspect", "composite_aspect"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesAspectHouses = selectedMetadataUsesAspectFields && ["natal_aspect", "synastry_aspect", "composite_aspect", "transit_to_natal_aspect"].includes(selectedMetadataBlockType);
  const selectedMetadataUsesPlacementBody = (selectedMetadataIsNatalPlacement || selectedMetadataIsNatalAngle) && (!selectedMetadataIsModularNatalBlock || ["placement", "angle", "sign", "house", "synthesis"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesPlacementSign = (selectedMetadataIsNatalPlacement || selectedMetadataIsNatalAngle) && (!selectedMetadataIsModularNatalBlock || ["placement", "angle", "sign", "synthesis"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesPlacementHouse = selectedMetadataIsNatalPlacement && (!selectedMetadataIsModularNatalBlock || ["placement", "house", "synthesis"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesPlacementRuler = selectedMetadataIsNatalPlacement && (!selectedMetadataIsModularNatalBlock || ["placement", "ruler", "synthesis"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesFullRulerPlacement = selectedMetadataIsNatalPlacement && (!selectedMetadataIsModularNatalBlock || ["placement", "synthesis"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesAspectTiming = selectedMetadataUsesAspectFields && selectedMetadataIsTimeBasedAspect;
  const isSelectedReviewPublished = false;
  const approveButtonLabel = selectedReviewRecord?.status === "REVIEWED" ? "Publish Live" : "Approve";
  const isDateFilterActive = categoryUsesDateFilter(categoryFilter);
  const vocabularyCardItems = useMemo<AdminVocabularyCardItem[]>(() => {
    const rowsByContentKey = new Map(vocabularyRows.map((row) => [row.content_key, row]));
    const items: AdminVocabularyCardItem[] = vocabularyRows.flatMap((row) => {
      const family = vocabularyRowFamily(row.content_key);

      const point = pointFromTaglineContentKey(row.content_key);
      const supportsTagline = natalCardTaglinePoints.some((taglinePoint) => normalizedNatalCardTaglinePoint(taglinePoint) === normalizedNatalCardTaglinePoint(point));
      const kind = vocabularyRowKind(row.content_key);
      const houseTopicMatch = row.content_key.match(/^fallback-vocab\/house-life-area\/(.+)$/);
      const planetTopicMatch = row.content_key.match(/^fallback-vocab\/planet-topic\/(.+)$/);
      const signStyleMatch = row.content_key.match(/^fallback-vocab\/sign-style\/(.+)$/);
      const houseKeyForStandalone = row.content_key.match(/^vocab\/(?:house-shadow|higher-expression\/house)\/(.+)$/)?.[1] ?? "";
      const planetKeyForStandalone = row.content_key.match(/^vocab\/(?:planet-shadow|higher-expression\/planet)\/(.+)$/)?.[1] ?? "";
      const signKeyForStandalone = row.content_key.match(/^fallback-vocab\/sign-need\/(.+)$/)?.[1] ?? "";

      if ((family === "house-shadow" || row.content_key.startsWith("vocab/higher-expression/house/")) && rowsByContentKey.has(fallbackVocabularyContentKey("house-life-area", houseKeyForStandalone))) {
        return [];
      }

      if ((family === "planet-shadow" || row.content_key.startsWith("vocab/higher-expression/planet/")) && rowsByContentKey.has(fallbackVocabularyContentKey("planet-topic", planetKeyForStandalone))) {
        return [];
      }

      if (family === "sign-need" && rowsByContentKey.has(fallbackVocabularyContentKey("sign-style", signKeyForStandalone))) {
        return [];
      }

      const houseKey = houseTopicMatch?.[1] ?? "";
      const planetKey = planetTopicMatch?.[1] ?? "";
      const signKey = signStyleMatch?.[1] ?? "";

      const shadowContentKey = planetKey
        ? `vocab/planet-shadow/${planetKey}`
        : houseKey
          ? `vocab/house-shadow/${houseKey}`
          : "";
      const higherExpressionContentKey = planetKey
        ? `vocab/higher-expression/planet/${planetKey}`
        : houseKey
          ? `vocab/higher-expression/house/${houseKey}`
          : signKey
            ? `vocab/higher-expression/sign/${signKey}`
            : "";
      const fallbackHigherExpressionContentKey = signKey ? `vocab/higher-expression/zodiac/${signKey}` : "";
      const savedHigherExpressionRow = higherExpressionContentKey
        ? rowsByContentKey.get(higherExpressionContentKey) ?? (fallbackHigherExpressionContentKey ? rowsByContentKey.get(fallbackHigherExpressionContentKey) : undefined)
        : undefined;

      return [{
        contentKey: row.content_key,
        point,
        row,
        signNeedRow: signKey ? rowsByContentKey.get(fallbackVocabularyContentKey("sign-need", signKey)) : undefined,
        storyRow: signKey ? rowsByContentKey.get(`vocab/zodiac-story/${signKey}`) : undefined,
        shadowRow: shadowContentKey
          ? rowsByContentKey.get(shadowContentKey) ?? localVocabularyCompanionRow(shadowContentKey, point, row)
          : undefined,
        higherExpressionRow: higherExpressionContentKey
          ? savedHigherExpressionRow ?? localVocabularyCompanionRow(higherExpressionContentKey, point, row)
          : undefined,
        taglineContentKey: kind === "topic" && supportsTagline ? natalCardTaglineContentKey(point) : undefined,
        kind
      }];
    });
    const existingPointIds = new Set(items.map((item) => normalizedNatalCardTaglinePoint(item.point)));

    for (const point of natalCardTaglinePoints) {
      if (!existingPointIds.has(normalizedNatalCardTaglinePoint(point))) {
        items.push({
          contentKey: natalCardTaglineContentKey(point),
          point,
          taglineContentKey: natalCardTaglineContentKey(point),
          kind: "topic"
        });
      }
    }

    return items;
  }, [vocabularyRows]);
  const vocabularyCategoryCounts = useMemo(() => {
    const counts = {
      all: vocabularyCardItems.length,
      planets: 0,
      houses: 0,
      angles: 0,
      zodiac: 0,
      lunar: 0,
      eclipses: 0,
      career: 0,
      relationship: 0
    } satisfies Record<AdminVocabularyCategoryFilter, number>;

    vocabularyCardItems.forEach((item) => {
      const category = vocabularyItemCategory(item);

      if (category !== "all") {
        counts[category] += 1;
      }
    });

    return counts;
  }, [vocabularyCardItems]);
  const vocabularyStatusCounts = useMemo(() => {
    const categoryItems = vocabularyCategoryFilter === "all"
      ? vocabularyCardItems
      : vocabularyCardItems.filter((item) => vocabularyItemCategory(item) === vocabularyCategoryFilter);

    return {
      all: categoryItems.length,
      DRAFT: categoryItems.filter((item) => vocabularyItemStatus(item, vocabularyDrafts) === "DRAFT").length,
      REVIEWED: categoryItems.filter((item) => vocabularyItemStatus(item, vocabularyDrafts) === "REVIEWED").length,
      LIVE: categoryItems.filter((item) => vocabularyItemStatus(item, vocabularyDrafts) === "LIVE").length,
      ARCHIVED: categoryItems.filter((item) => vocabularyItemStatus(item, vocabularyDrafts) === "ARCHIVED").length,
      ERROR: categoryItems.filter((item) => vocabularyItemStatus(item, vocabularyDrafts) === "ERROR").length
    } satisfies Record<AdminVocabularyStatusFilter, number>;
  }, [vocabularyCardItems, vocabularyCategoryFilter, vocabularyDrafts]);
  const filteredVocabularyCardItems = useMemo(() => {
    const query = vocabularyQuery.trim().toLowerCase();

    return vocabularyCardItems
      .filter((item) => vocabularyCategoryFilter === "all" || vocabularyItemCategory(item) === vocabularyCategoryFilter)
      .filter((item) => vocabularyStatusFilter === "all" || vocabularyItemStatus(item, vocabularyDrafts) === vocabularyStatusFilter)
      .filter((item) => {
        if (!query) return true;

        const draft = item.row ? vocabularyDrafts[item.row.id] ?? vocabularyDraftFromRow(item.row) : null;
        const matchedTaglineRow = item.taglineContentKey
          ? findAdminGeneratedContentRow(taglineRows, {
            contentKey: item.taglineContentKey,
            mode: "feed"
          })
          : undefined;
        const taglineDraft = item.taglineContentKey
          ? taglineDrafts[item.taglineContentKey] ?? (matchedTaglineRow ? taglineDraftFromRow(matchedTaglineRow) : fallbackTaglineDraft(item.point))
          : null;

        return vocabularyItemSearchText(item, draft, taglineDraft).includes(query);
      });
  }, [taglineDrafts, taglineRows, vocabularyCardItems, vocabularyCategoryFilter, vocabularyDrafts, vocabularyQuery, vocabularyStatusFilter]);
  const selectedVocabularyItem = useMemo(() => (
    selectedVocabularyContentKey
      ? vocabularyCardItems.find((item) => item.contentKey === selectedVocabularyContentKey) ?? null
      : null
  ), [selectedVocabularyContentKey, vocabularyCardItems]);
  const vocabularyCategoryNote = useMemo(() => {
    if (vocabularyCategoryFilter === "eclipses") {
      return "Eclipse rows cover eclipse-season, solar eclipse, lunar eclipse, and ritual guidance language for sky and natal fallback phrasing.";
    }

    if (vocabularyCategoryFilter === "planets") {
      return "Planet rows provide the topic language used when templates need a planet's core theme, shadow, higher expression, or natal-card tagline.";
    }

    if (vocabularyCategoryFilter === "houses") {
      return "House rows provide life-area language, house shadows, and higher-expression phrasing for chart placement templates.";
    }

    if (vocabularyCategoryFilter === "angles") {
      return "Angle rows provide reusable Ascendant and Midheaven topic language for natal angle placement templates.";
    }

    if (vocabularyCategoryFilter === "zodiac") {
      return "Zodiac style is the short tone phrase templates use for a sign, like \"steady and slow to change course.\" It describes the sign's manner or texture, not a full placement interpretation.";
    }

    if (vocabularyCategoryFilter === "lunar") {
      return "Lunar vocabulary rows provide reusable phase and archetype language for lunar calendar templates without replacing event-specific write-ups.";
    }

    if (vocabularyCategoryFilter === "career") {
      return "Career rows provide reusable natal-career language for houses, Midheaven elements, hemispheres, modes, Saturn mastery, North Node growth, and planets in the 10th house.";
    }

    if (vocabularyCategoryFilter === "relationship") {
      return "Relationship rows provide context language for friends, family, coworkers, business contacts, romantic partners, exes, mentors, managers, roommates, and acquaintances.";
    }

    return "Vocabulary rows provide reusable phrases for planets, houses, angles, zodiac signs, lunar/eclipses, relationship, and career archetype copy used by interpolation templates.";
  }, [vocabularyCategoryFilter]);
  const resolvedFallbackHookSampleContexts = useMemo<Record<string, FallbackHookContext>>(() => {
    const rowsByContentKey = liveVocabularyRowsByContentKey(vocabularyRows);

    return Object.fromEntries(
      Object.keys(fallbackHookSampleContexts).map((hookKey) => [
        hookKey,
        resolveFallbackHookSampleContextFromVocabulary(hookKey, rowsByContentKey)
      ])
    );
  }, [vocabularyRows]);
  const missingTaglinePlaceholderRows = useMemo(
    () => missingFallbackTaglineImportRows(taglineRows),
    [taglineDrafts, taglineRows]
  );
  const slotDictionaryRows = useMemo(() => {
    const vocabularyReadiness = (prefix: string) => adminContentReadinessStatus(
      [...vocabularyRows, ...taglineRows].filter((row) => row.content_key.startsWith(prefix))
    );
    const fallbackReadiness = (prefix: string) => adminContentReadinessStatus(
      currentTemplateContentRows.filter((row) => row.content_key.startsWith(prefix))
    );

    const staticRows = baseSlotDictionaryRows.map((row) => {
      if (row.editableIn === "Calculated") {
        return row;
      }

      const sourcePrefix = slotDictionarySourcePrefix(row.source);
      const status = row.editableIn === "Vocabulary"
        ? vocabularyReadiness(sourcePrefix)
        : fallbackReadiness(sourcePrefix);

      return {
        ...row,
        status
      } satisfies AdminSlotDictionaryRow;
    });
    const reusableRows = [...vocabularyRows, ...taglineRows];
    const dynamicRows = dynamicSlotDictionaryRowsFromTemplates(currentTemplateContentRows, reusableRows);
    const registryRows = slotDictionaryRowsFromRuntimeRegistry(currentTemplateContentRows, reusableRows);

    return mergeSlotDictionaryRows(mergeSlotDictionaryRows(staticRows, registryRows), dynamicRows);
  }, [currentTemplateContentRows, taglineRows, vocabularyRows]);
  const slotDictionaryCounts = useMemo(() => ({
    calculated: slotDictionaryRows.filter((row) => row.status === "calculated").length,
    ready: slotDictionaryRows.filter((row) => row.status === "ready").length,
    draft: slotDictionaryRows.filter((row) => row.status === "draft").length,
    local: slotDictionaryRows.filter((row) => row.status === "local").length,
    missing: slotDictionaryRows.filter((row) => row.status === "missing").length
  }), [slotDictionaryRows]);
  const slotDictionarySourceCounts = useMemo(() => ({
    all: slotDictionaryRows.length,
    calculated: slotDictionaryRows.filter((row) => slotDictionarySourceFilterForRow(row) === "calculated").length,
    vocabulary: slotDictionaryRows.filter((row) => slotDictionarySourceFilterForRow(row) === "vocabulary").length,
    fallback: slotDictionaryRows.filter((row) => slotDictionarySourceFilterForRow(row) === "fallback").length
  } satisfies Record<SlotDictionarySourceFilter, number>), [slotDictionaryRows]);
  const slotDictionaryStatusCounts = useMemo(() => ({
    all: slotDictionaryRows.length,
    calculated: slotDictionaryRows.filter((row) => row.status === "calculated").length,
    ready: slotDictionaryRows.filter((row) => row.status === "ready").length,
    draft: slotDictionaryRows.filter((row) => row.status === "draft").length,
    local: slotDictionaryRows.filter((row) => row.status === "local").length,
    missing: slotDictionaryRows.filter((row) => row.status === "missing").length
  } satisfies Record<SlotDictionaryStatusFilter, number>), [slotDictionaryRows]);
  const filteredSlotDictionaryRows = useMemo(() => {
    const query = slotDictionaryQuery.trim().toLowerCase();

    return slotDictionaryRows.filter((row) => {
      const matchesQuery = !query || slotDictionarySearchText(row).includes(query);
      const matchesSource = slotDictionarySourceFilter === "all" || slotDictionarySourceFilterForRow(row) === slotDictionarySourceFilter;
      const matchesStatus = slotDictionaryStatusFilter === "all" || row.status === slotDictionaryStatusFilter;

      return matchesQuery && matchesSource && matchesStatus;
    });
  }, [slotDictionaryQuery, slotDictionaryRows, slotDictionarySourceFilter, slotDictionaryStatusFilter]);
  const hasSlotDictionaryFilters = Boolean(slotDictionaryQuery.trim()) || slotDictionarySourceFilter !== "all" || slotDictionaryStatusFilter !== "all";

  function buildContentExchangeBundle(
    scope: AdminContentScope,
    nextVocabularyRows = vocabularyRows,
    nextTaglineRows = taglineRows,
    nextTemplateRows = templateContentRows,
    nextVoiceTemplates = voiceTemplates
  ): AdminContentExchangeBundle {
    return {
      schema: "tldrastro-admin-content-v1",
      exportedAt: new Date().toISOString(),
      settings: scope === "settings" ? nextVoiceTemplates : {},
      vocabularyRows: scope === "vocabulary" ? nextVocabularyRows.map((row) => {
        const draftValue = vocabularyDrafts[row.id] ?? vocabularyDraftFromRow(row);

        return {
          id: row.id,
          contentKey: row.content_key,
          headline: draftValue.headline,
          you: draftValue.you,
          friend: draftValue.friend,
          natal: draftValue.natal,
          sky: draftValue.sky,
          stylePhrase: draftValue.stylePhrase,
          styleShort: draftValue.styleShort,
          signNeed: draftValue.signNeed,
          story: draftValue.story,
          shadow: draftValue.shadow,
          higherExpression: draftValue.higherExpression
        };
      }) : [],
      taglineRows: scope === "vocabulary" ? natalCardTaglinePoints.map((point) => {
        const contentKey = natalCardTaglineContentKey(point);
        const matchedRow = findAdminGeneratedContentRow(nextTaglineRows, {
          contentKey,
          mode: "feed"
        });
        const draftValue = taglineDrafts[contentKey] ?? (matchedRow ? taglineDraftFromRow(matchedRow) : fallbackTaglineDraft(point));

        return {
          id: matchedRow?.id ?? draftValue.id,
          contentKey,
          point,
          headline: draftValue.headline,
          tagline: draftValue.tagline
        };
      }) : [],
      templateRows: scope === "templates" ? nextTemplateRows.map((row) => {
        const draftValue = templateContentDrafts[row.id] ?? templateDraftFromRow(row);

        return {
          id: row.id,
          contentKey: row.content_key,
          headline: draftValue.headline,
          summary: draftValue.summary,
          body: draftValue.body
        };
      }) : [],
      contextRows: scope === "context" ? contextRowsFromTemplateRows(nextTemplateRows) : []
    };
  }

  async function fetchVocabularyRowsForAdmin() {
    const params = new URLSearchParams({
      status: "all",
      promptVersion: "vocab-v1",
      contentKeyPrefix: "vocab/",
      limit: "200"
    });
    const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?${params}`,
      secret
    );

    return (payload.rows ?? []).sort((first, second) => first.content_key.localeCompare(second.content_key));
  }

  async function fetchTaglineRowsForAdmin() {
    const params = new URLSearchParams({
      status: "all",
      promptVersion: "tagline-v1",
      contentKeyPrefix: "vocab/natal-card-tagline/",
      limit: "200"
    });
    const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?${params}`,
      secret
    );

    return (payload.rows ?? []).sort((first, second) => first.content_key.localeCompare(second.content_key));
  }

  function chooseCurrentTemplateRowForAdmin(
    existing: AdminGeneratedContentRow | undefined,
    candidate: AdminGeneratedContentRow
  ) {
    if (!existing) return candidate;

    const existingIsArchived = isLegacyFallbackTemplateRow(existing) || contentClassForGeneratedRow(existing) === "legacy";
    const candidateIsArchived = isLegacyFallbackTemplateRow(candidate) || contentClassForGeneratedRow(candidate) === "legacy";

    if (existingIsArchived && !candidateIsArchived) return candidate;
    if (!existingIsArchived && candidateIsArchived) return existing;

    return new Date(candidate.updated_at).getTime() > new Date(existing.updated_at).getTime()
      ? candidate
      : existing;
  }

  async function fetchTemplateRowsForAdmin() {
    const prefixes = ["fallback-hook/", "slot-template/"];
    const payloads = await Promise.all(prefixes.map((prefix) => {
      const params = new URLSearchParams({
        status: "all",
        contentKeyPrefix: prefix,
        limit: "1000"
      });

      return adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?${params}`,
        secret
      );
    }));

    const savedRowsByKey = new Map<string, AdminGeneratedContentRow>();

    for (const row of payloads.flatMap((payload) => payload.rows ?? [])) {
      if (!row.content_key.startsWith("fallback-hook/") && !row.content_key.startsWith("slot-template/")) {
        continue;
      }

      const key = row.content_key;
      const existing = savedRowsByKey.get(key);

      savedRowsByKey.set(key, chooseCurrentTemplateRowForAdmin(existing, row));
    }

    const savedRows = Array.from(savedRowsByKey.values())
      .sort((first, second) => first.content_key.localeCompare(second.content_key));

    return fallbackTemplatePlaceholderRows(savedRows);
  }

  async function fetchLunarCoverageRowsForAdmin() {
    const prefixes = ["lunation/", "season/", "transit-fallback/"];
    const payloads = await Promise.all(prefixes.map((prefix) => {
      const params = new URLSearchParams({
        status: "all",
        contentKeyPrefix: prefix,
        limit: "200"
      });

      return adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?${params}`,
        secret
      );
    }));
    const registeredKeys = new Set(lunarCalendarContentKeyDefinitions.map((definition) => definition.key));

    return payloads
      .flatMap((payload) => payload.rows ?? [])
      .filter((row) => registeredKeys.has(row.content_key))
      .sort((first, second) => first.content_key.localeCompare(second.content_key));
  }

  async function fetchSignContextSettingForAdmin() {
    const params = new URLSearchParams({
      status: "all",
      contentKeyPrefix: signContextAspectCardsSettingKey,
      limit: "1"
    });
    const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?${params}`,
      secret
    );

    return findAdminGeneratedContentRow(payload.rows ?? [], {
      contentKey: signContextAspectCardsSettingKey,
      mode: "feed"
    }) ?? null;
  }

  async function fetchSkyHistoricalLookbackSettingForAdmin() {
    const params = new URLSearchParams({
      status: "all",
      contentKeyPrefix: skyHistoricalLookbackSettingKey,
      limit: "1"
    });
    const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?${params}`,
      secret
    );

    return findAdminGeneratedContentRow(payload.rows ?? [], {
      contentKey: skyHistoricalLookbackSettingKey,
      mode: "feed"
    }) ?? null;
  }

  async function fetchGlobalSynastryRowsForAdmin() {
    const params = new URLSearchParams({
      status: "all",
      surface: "synastry",
      limit: "1000"
    });
    const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?${params}`,
      secret
    );

    return payload.rows ?? [];
  }

  function contentScopeFilename(scope: AdminContentScope) {
    if (scope === "settings") return "settings";
    if (scope === "vocabulary") return "vocabulary";
    if (scope === "context") return "context-rows";
    return "templates";
  }

  function triggerContentImport(scope: AdminContentScope) {
    contentImportScopeRef.current = scope;
    contentImportInputRef.current?.click();
  }

  async function downloadManagedContent(format: AdminContentExportFormat, scope: AdminContentScope) {
    if (scope !== "settings" && !canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const [nextVocabularyRows, nextTaglineRows] = scope === "vocabulary"
        ? await Promise.all([fetchVocabularyRowsForAdmin(), fetchTaglineRowsForAdmin()])
        : [vocabularyRows, taglineRows];
      const nextTemplateRows = scope === "templates" || scope === "context" ? await fetchTemplateRowsForAdmin() : templateContentRows;
      let nextVoiceTemplates = voiceTemplates;

      if (scope === "settings" && canUseApi) {
        const dbRows = await fetchVoiceTemplateRowsForAdmin();

        if (dbRows.length > 0) {
          nextVoiceTemplates = { ...voiceTemplates };
          dbRows.forEach((row) => {
            const surfaceKey = voiceTemplateSurfaceFromContentKey(row.content_key);

            if (surfaceKey) {
              nextVoiceTemplates[surfaceKey] = {
                ...nextVoiceTemplates[surfaceKey],
                ...voiceTemplateConfigFromRow(row)
              };
            }
          });
          setVoiceTemplates(nextVoiceTemplates);
          window.localStorage.setItem(adminVoiceTemplateStorageKey, JSON.stringify(nextVoiceTemplates));
          setVoiceSettingsLoadedFromDb(true);
        }
      }

      if (scope === "vocabulary") {
        setVocabularyRows(nextVocabularyRows);
        setVocabularyDrafts(draftMapForVocabularyRows(nextVocabularyRows));
        setTaglineRows(nextTaglineRows);
        setTaglineDrafts(draftMapForTaglineRows(nextTaglineRows));
      }

      if (scope === "templates" || scope === "context") {
        setTemplateContentRows(nextTemplateRows);
        setTemplateContentDrafts(draftMapForTemplateRows(nextTemplateRows));
      }

      const bundle = buildContentExchangeBundle(scope, nextVocabularyRows, nextTaglineRows, nextTemplateRows, nextVoiceTemplates);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filenameScope = contentScopeFilename(scope);

      if (format === "json") {
        downloadTextFile(
          `tldrastro-${filenameScope}-${timestamp}.json`,
          JSON.stringify(bundle, null, 2),
          "application/json"
        );
        setMessage(`Exported ${filenameScope} as JSON.`);
        return;
      }

      downloadTextFile(
        `tldrastro-${filenameScope}-${timestamp}.csv`,
        csvFromRows(csvRowsFromContentBundle(bundle)),
        "text/csv"
      );
      setMessage(`Exported ${filenameScope} as CSV.`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not export dashboard content."));
    } finally {
      setIsLoading(false);
    }
  }

  async function patchGeneratedContentByImportKey(
    importedRow: { id?: string; contentKey: string },
    patch: Record<string, unknown>,
    availableRows: AdminGeneratedContentRow[]
  ) {
    const matchedRow = findAdminGeneratedContentRow(availableRows, {
      id: importedRow.id,
      contentKey: importedRow.contentKey
    });

    if (!matchedRow) {
      throw new Error(`No existing dashboard row matched ${importedRow.contentKey}.`);
    }

    await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      "/api/admin/generated-content",
      secret,
      {
        method: "PATCH",
        body: JSON.stringify({
          id: matchedRow.id,
          ...patch
        })
      }
    );
  }

  async function upsertVocabularyImportRow(
    importedRow: AdminContentExchangeBundle["vocabularyRows"][number],
    patch: Record<string, unknown>,
    availableRows: AdminGeneratedContentRow[]
  ) {
    const matchedRow = findAdminGeneratedContentRow(availableRows, {
      id: importedRow.id,
      contentKey: importedRow.contentKey,
      mode: "in_depth"
    });

    if (matchedRow) {
      await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "PATCH",
          body: JSON.stringify({
            id: matchedRow.id,
            ...patch
          })
        }
      );
      return;
    }

    await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      "/api/admin/generated-content",
      secret,
      {
        method: "POST",
        body: JSON.stringify({
          contentKey: importedRow.contentKey,
          surface: "natal",
          mode: "in_depth",
          eventType: "vocabulary",
          status: "DRAFT",
          promptVersion: "vocab-v1",
          provider: "claude",
          model: "manual",
          ...patch
        })
      }
    );
  }

  async function upsertTaglineImportRow(
    importedRow: AdminContentExchangeBundle["taglineRows"][number],
    availableRows: AdminGeneratedContentRow[]
  ) {
    const matchedRow = findAdminGeneratedContentRow(availableRows, {
      id: importedRow.id,
      contentKey: importedRow.contentKey,
      mode: "feed"
    });
    const patch = {
      headline: importedRow.headline,
      body: importedRow.tagline,
      sections: {
        tagline: {
          natal: importedRow.tagline
        }
      }
    };

    if (matchedRow) {
      await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "PATCH",
          body: JSON.stringify({
            id: matchedRow.id,
            ...patch
          })
        }
      );
      return;
    }

    await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      "/api/admin/generated-content",
      secret,
      {
        method: "POST",
        body: JSON.stringify({
          contentKey: importedRow.contentKey,
          surface: "sky",
          mode: "feed",
          eventType: "tagline",
          status: "DRAFT",
          promptVersion: "tagline-v1",
          ...patch
        })
      }
    );
  }

  function generatedContentImportPayloadForVocabularyRow(
    importedRow: AdminContentExchangeBundle["vocabularyRows"][number],
    availableRows: AdminGeneratedContentRow[]
  ) {
    const matchedRow = findAdminGeneratedContentRow(availableRows, {
      id: importedRow.id,
      contentKey: importedRow.contentKey,
      mode: "in_depth"
    });
    const draft = vocabularyDraftFromImportRow(importedRow);
    const rowShell = {
      content_key: importedRow.contentKey,
      sections: null
    } as AdminGeneratedContentRow;

    return {
      contentKey: importedRow.contentKey,
      surface: matchedRow?.surface ?? "natal",
      mode: matchedRow?.mode ?? "in_depth",
      eventType: "vocabulary",
      status: matchedRow?.status ?? "DRAFT",
      promptVersion: "vocab-v1",
      provider: "claude",
      model: "manual",
      headline: draft.headline,
      summary: vocabularySummaryFromDraft(rowShell, draft),
      body: vocabularyBodyFromDraft(rowShell, draft),
      sections: vocabularySectionsFromDraft(rowShell, draft),
      sourceSnapshot: {
        source: "dashboard-bulk-import",
        contentType: "vocabulary",
        importedAt: new Date().toISOString()
      },
      reviewerNotes: "Imported from dashboard vocabulary upload."
    };
  }

  function generatedContentImportPayloadForTaglineRow(
    importedRow: AdminContentExchangeBundle["taglineRows"][number],
    availableRows: AdminGeneratedContentRow[]
  ) {
    const matchedRow = findAdminGeneratedContentRow(availableRows, {
      id: importedRow.id,
      contentKey: importedRow.contentKey,
      mode: "feed"
    });

    return {
      contentKey: importedRow.contentKey,
      surface: matchedRow?.surface ?? "sky",
      mode: matchedRow?.mode ?? "feed",
      eventType: "tagline",
      status: matchedRow?.status ?? "DRAFT",
      promptVersion: "tagline-v1",
      provider: "claude",
      model: "manual",
      headline: importedRow.headline,
      body: importedRow.tagline,
      sections: {
        tagline: {
          natal: importedRow.tagline
        }
      },
      sourceSnapshot: {
        source: "dashboard-bulk-import",
        contentType: "tagline",
        importedAt: new Date().toISOString()
      },
      reviewerNotes: "Imported from dashboard vocabulary upload."
    };
  }

  function missingFallbackTaglineImportRows(availableRows: AdminGeneratedContentRow[]) {
    const savedTargetKeys = new Set(availableRows.map(adminGeneratedContentRowTargetKey));

    return natalCardTaglinePoints
      .map((point) => {
        const contentKey = natalCardTaglineContentKey(point);
        const draft = fallbackTaglineDraft(point);

        return {
          contentKey,
          point,
          headline: draft.headline,
          tagline: draft.tagline
        };
      })
      .filter((row) => (
        row.tagline.trim().length > 0
        && !savedTargetKeys.has(adminGeneratedContentTargetKey(row.contentKey, null, "feed"))
      ));
  }

  async function bulkUpsertGeneratedContentImportRows(rowsToImport: Array<Record<string, unknown>>) {
    if (rowsToImport.length === 0) {
      return { rows: [], skippedLiveRows: [] };
    }

    const payload = await adminJsonRequest<{
      ok: boolean;
      rows: AdminGeneratedContentRow[];
      skippedLiveRows?: Array<{ contentKey: string; id?: string; status: "LIVE" }>;
    }>(
      "/api/admin/generated-content",
      secret,
      {
        method: "POST",
        body: JSON.stringify({
          rows: rowsToImport
        })
      },
      120000
    );

    return {
      rows: payload.rows ?? [],
      skippedLiveRows: payload.skippedLiveRows ?? []
    };
  }

  async function upsertContextImportRow(
    importedRow: AdminContentExchangeBundle["contextRows"][number],
    availableRows: AdminGeneratedContentRow[]
  ) {
    const hookKey = importedRow.hookKey || importedRow.contentKey.replace(/^fallback-hook\//, "");
    const contentKey = importedRow.contentKey || contextContentKey(hookKey);
    const hook = fallbackHookForContextRow(hookKey);
    const matchedRow = findAdminGeneratedContentRow(availableRows, {
      id: importedRow.id,
      contentKey,
      mode: generatedContentModeForFallbackContentKey(contentKey)
    });
    const patch = {
      headline: importedRow.headline,
      summary: importedRow.summary,
      body: importedRow.body,
      sourceSnapshot: {
        contentType: "template",
        source: "admin-context-import",
        hookKey,
        label: importedRow.label || hook?.label || "",
        description: importedRow.description || hook?.description || "",
        requiredFacts: importedRow.requiredFacts?.length ? importedRow.requiredFacts : hook?.requiredFacts ?? [],
        knowledgeIdPatterns: importedRow.knowledgeIdPatterns?.length ? importedRow.knowledgeIdPatterns : hook?.knowledgeIdTemplates ?? [],
        exampleIds: importedRow.exampleIds ?? []
      }
    };

    if (matchedRow) {
      await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "PATCH",
          body: JSON.stringify({
            id: matchedRow.id,
            ...patch
          })
        }
      );
      return;
    }

    await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      "/api/admin/generated-content",
      secret,
      {
        method: "POST",
        body: JSON.stringify({
          contentKey,
          surface: hook?.surface ?? importedRow.surface ?? "sky",
          mode: hook?.mode ?? importedRow.mode ?? "feed",
          eventType: "fallback-hook",
          status: "DRAFT",
          promptVersion: "fallback-hook-template-v1",
          knowledgeIds: importedRow.exampleIds ?? [],
          ...patch
        })
      }
    );
  }

  async function importManagedContentBundle(bundle: AdminContentExchangeBundle, scope: AdminContentScope) {
    if (scope !== "settings" && !canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      if (scope === "settings") {
        const nextTemplates: Record<VoiceTemplateSurface, VoiceTemplateConfig> = {
          ...voiceTemplates,
          ...bundle.settings
        };

        setVoiceTemplates(nextTemplates);
        window.localStorage.setItem(adminVoiceTemplateStorageKey, JSON.stringify(nextTemplates));
        if (canUseApi) {
          const result = await saveVoiceTemplateRows(nextTemplates);
          setVoiceSettingsLoadedFromDb(true);
          setMessage(`Imported ${Object.keys(bundle.settings).length} settings surfaces and saved ${result?.rows.length ?? 0} admin setting rows.`);
        } else {
          setVoiceSettingsLoadedFromDb(false);
          setMessage(`Imported ${Object.keys(bundle.settings).length} settings surfaces in this browser.`);
        }
        return;
      }

      if (scope === "vocabulary") {
        const availableRows = await fetchVocabularyRowsForAdmin();
        const availableTaglineRows = await fetchTaglineRowsForAdmin();
        const rowsToImport = [
          ...bundle.vocabularyRows.map((row) => generatedContentImportPayloadForVocabularyRow(row, availableRows)),
          ...bundle.taglineRows.map((row) => generatedContentImportPayloadForTaglineRow(row, availableTaglineRows))
        ];

        setMessage(`Uploading ${rowsToImport.length} vocabulary and tagline rows...`);
        const importResult = await bulkUpsertGeneratedContentImportRows(rowsToImport);

        await loadVocabularyRows({ forceDraftRefresh: true });
        setAccessStatus("valid");
        const skippedMessage = importResult.skippedLiveRows.length > 0
          ? ` Skipped ${importResult.skippedLiveRows.length} published rows: ${importResult.skippedLiveRows.map((row) => row.contentKey).join(", ")}.`
          : "";
        setMessage(`Imported ${importResult.rows.length} vocabulary/tagline rows.${skippedMessage}`);
        return;
      }

      if (scope === "context") {
        const availableRows = await fetchTemplateRowsForAdmin();

        for (const row of bundle.contextRows) {
          await upsertContextImportRow(row, availableRows);
        }

        await loadTemplateContentRows({ forceDraftRefresh: true });
        setAccessStatus("valid");
        setMessage(`Imported ${bundle.contextRows.length} context rows.`);
        return;
      }

      const availableRows = await fetchTemplateRowsForAdmin();

      for (const row of bundle.templateRows) {
        await patchGeneratedContentByImportKey(
          row,
          {
            headline: row.headline,
            summary: row.summary,
            body: row.body
          },
          availableRows
        );
      }

      await loadTemplateContentRows({ forceDraftRefresh: true });
      setAccessStatus("valid");
      setMessage(`Imported ${bundle.templateRows.length} template rows.`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not import dashboard content."));
    } finally {
      setIsLoading(false);
    }
  }

  async function importManagedContentFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const scope = contentImportScopeRef.current;
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setMessage(`Reading ${file.name}...`);
      const text = await file.text();
      const bundle = file.name.toLowerCase().endsWith(".csv")
        ? contentBundleFromCsv(text)
        : contentBundleFromJson(text);

      await importManagedContentBundle(bundle, scope);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read import file.");
    }
  }

  async function checkTldrAstroApiStatus() {
    if (!isTldrAstroApiConfigured) {
      const localHealth = await getLocalAdminApiHealthFallback().catch(() => null);
      if (localHealth?.ok) {
        setApiStatus({
          state: "online",
          checkedAt: new Date().toISOString(),
          latencyMs: null,
          health: localHealth,
          error: null
        });
        return;
      }

      setApiStatus({
        state: "notConfigured",
        checkedAt: new Date().toISOString(),
        latencyMs: null,
        health: null,
        error: "VITE_TLDRASTRO_API_URL is not configured."
      });
      return;
    }

    const startedAt = performance.now();
    setApiStatus((current) => ({
      ...current,
      state: "checking",
      error: null
    }));

    try {
      const health = await getTldrAstroApiHealth();

      setApiStatus({
        state: health.ok ? "online" : "offline",
        checkedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - startedAt),
        health,
        error: health.ok ? null : "The API returned an unhealthy response."
      });
    } catch (error) {
      const localHealth = await getLocalAdminApiHealthFallback().catch(() => null);
      if (localHealth?.ok) {
        setApiStatus({
          state: "online",
          checkedAt: new Date().toISOString(),
          latencyMs: Math.round(performance.now() - startedAt),
          health: localHealth,
          error: null
        });
        return;
      }

      setApiStatus({
        state: "offline",
        checkedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - startedAt),
        health: null,
        error: error instanceof Error ? error.message : "Could not reach the TLDR Astro API."
      });
    }
  }

  async function loadStatusMetrics(nextSurface = surface) {
    if (!canUseApi) {
      return;
    }

    const params = new URLSearchParams({ stats: "true" });

    if (nextSurface !== "all") {
      params.set("surface", nextSurface);
    }

    const payload = await adminJsonRequest<AdminContentStatsPayload>(
      `/api/admin/generated-content?${params}`,
      secret
    );

    setStatusMetrics(payload.stats.counts);
    setTotalMetricRows(payload.stats.total);
  }

  async function loadRows(nextStatus = status, nextSurface = surface) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      await loadStatusMetrics(nextSurface);
      const params = new URLSearchParams({
        status: nextStatus,
        limit: "100"
      });

      if (nextSurface !== "all") {
        params.set("surface", nextSurface);
      }

      if (dateStart && nextSurface !== "modifier") {
        params.set("startDate", dateStart);
      }

      if (dateEnd && nextSurface !== "modifier") {
        params.set("endDate", dateEnd);
      }

      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?${params}`,
        secret
      );

      setRows(payload.rows ?? []);
      setMessage(`Loaded ${(payload.rows ?? []).length} ${nextStatus.toLowerCase()} rows. Status totals are current.`);
      setSelectedReviewId((currentId) => isUnsavedManualReviewId(currentId) ? currentId : null);

      if (!payload.rows?.some((row) => row.id === selectedId)) {
        const firstRow = payload.rows?.[0] ?? null;
        setSelectedId(firstRow?.id ?? null);
        if (firstRow) {
          setDraft(adminDraftFromRow(firstRow));
          void loadRowDetails(firstRow.id);
        } else {
          setDraft(createAdminDraft(nextSurface));
        }
      }
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not load generated content."));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadVocabularyRows(options: { forceDraftRefresh?: boolean } = {}) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const requestId = vocabularyLoadRequestRef.current + 1;
    vocabularyLoadRequestRef.current = requestId;
    setIsLoading(true);
    try {
      const [nextRows, initialTaglineRows] = await Promise.all([
        fetchVocabularyRowsForAdmin(),
        fetchTaglineRowsForAdmin()
      ]);

      if (requestId !== vocabularyLoadRequestRef.current) {
        return;
      }

      const refreshDrafts = options.forceDraftRefresh || !vocabularyDraftDirtyRef.current;
      setVocabularyRows(nextRows);
      setTaglineRows(initialTaglineRows);
      if (refreshDrafts) {
        setVocabularyDrafts(draftMapForVocabularyRows(nextRows));
        setTaglineDrafts(draftMapForTaglineRows(initialTaglineRows));
        vocabularyDraftDirtyRef.current = false;
      }
      setAccessStatus("valid");
      setMessage(`Loaded ${nextRows.length} vocabulary rows and ${initialTaglineRows.length} saved tagline rows.${refreshDrafts ? "" : " Kept unsaved local edits."}`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not load vocabulary rows."));
    } finally {
      setIsLoading(false);
    }
  }

  async function createMissingTaglineRows() {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const rowsToCreate = missingFallbackTaglineImportRows(taglineRows);

    if (rowsToCreate.length === 0) {
      setMessage("No missing natal card tagline rows to create.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = await bulkUpsertGeneratedContentImportRows(
        rowsToCreate.map((row) => generatedContentImportPayloadForTaglineRow(row, taglineRows))
      );
      const skippedMessage = payload.skippedLiveRows?.length
        ? ` ${payload.skippedLiveRows.length} LIVE rows were left unchanged.`
        : "";

      await loadVocabularyRows({ forceDraftRefresh: true });
      setMessage(`Created ${payload.rows.length} missing natal card tagline rows.${skippedMessage}`);
      showSaveToast("Missing tagline rows created");
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not create missing natal card tagline rows."));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTemplateContentRows(options: { forceDraftRefresh?: boolean } = {}) {
    if (!canUseApi) {
      const nextRows = fallbackTemplatePlaceholderRows();
      setTemplateContentRows(nextRows);
      if (options.forceDraftRefresh || !templateContentDraftDirtyRef.current) {
        setTemplateContentDrafts(draftMapForTemplateRows(nextRows));
        templateContentDraftDirtyRef.current = false;
      }
      setLunarCoverageRows([]);
      setLunarCoverageLoadedFromDb(false);
      setMessage(`Showing ${nextRows.length} local fallback placeholders. Add the content generation secret to load saved rows.`);
      return;
    }

    const requestId = templateContentLoadRequestRef.current + 1;
    templateContentLoadRequestRef.current = requestId;
    setIsLoading(true);
    try {
      const [savedRows, nextVocabularyRows, nextLunarCoverageRows] = await Promise.all([
        fetchTemplateRowsForAdmin(),
        fetchVocabularyRowsForAdmin(),
        fetchLunarCoverageRowsForAdmin()
      ]);
      const nextRows = savedRows;

      if (requestId !== templateContentLoadRequestRef.current) {
        return;
      }

      const refreshDrafts = options.forceDraftRefresh || !templateContentDraftDirtyRef.current;
      setTemplateContentRows(nextRows);
      setVocabularyRows(nextVocabularyRows);
      if (refreshDrafts) {
        setTemplateContentDrafts(draftMapForTemplateRows(nextRows));
        templateContentDraftDirtyRef.current = false;
      }
      if (!vocabularyDraftDirtyRef.current) {
        setVocabularyDrafts(draftMapForVocabularyRows(nextVocabularyRows));
      }
      setLunarCoverageRows(nextLunarCoverageRows);
      setLunarCoverageLoadedFromDb(true);
      setAccessStatus("valid");
      setMessage(`Loaded ${savedRows.length} saved fallback-hook and slot-template rows. Missing routes stay visible in Surface Map instead of appearing as editable content rows.${refreshDrafts ? "" : " Kept unsaved local edits."}`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      const nextRows = fallbackTemplatePlaceholderRows();
      setTemplateContentRows(nextRows);
      if (options.forceDraftRefresh || !templateContentDraftDirtyRef.current) {
        setTemplateContentDrafts(draftMapForTemplateRows(nextRows));
        templateContentDraftDirtyRef.current = false;
      }
      setLunarCoverageRows([]);
      setLunarCoverageLoadedFromDb(false);
      setMessage(`${adminErrorMessage(error, "Could not load saved fallback hook and slot-template rows.")} Showing ${nextRows.length} local placeholders.`);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchVoiceTemplateRowsForAdmin() {
    const params = new URLSearchParams({
      status: "all",
      contentKeyPrefix: adminVoiceTemplateContentKeyPrefix,
      limit: "50"
    });
    const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?${params}`,
      secret
    );

    return payload.rows ?? [];
  }

  async function loadVoiceTemplateRows() {
    if (!canUseApi) {
      setVoiceSettingsLoadedFromDb(false);
      setMessage("Using browser-local voice settings. Add the content generation secret to load saved admin voice settings.");
      return;
    }

    setIsLoading(true);
    try {
      const dbRows = await fetchVoiceTemplateRowsForAdmin();
      const nextTemplates: Record<VoiceTemplateSurface, VoiceTemplateConfig> = { ...voiceTemplates };

      dbRows.forEach((row) => {
        const surfaceKey = voiceTemplateSurfaceFromContentKey(row.content_key);

        if (surfaceKey) {
          nextTemplates[surfaceKey] = {
            ...nextTemplates[surfaceKey],
            ...voiceTemplateConfigFromRow(row)
          };
        }
      });

      setVoiceTemplates(nextTemplates);
      window.localStorage.setItem(adminVoiceTemplateStorageKey, JSON.stringify(nextTemplates));
      setVoiceSettingsLoadedFromDb(dbRows.length > 0);
      setAccessStatus("valid");
      setMessage(dbRows.length > 0
        ? `Loaded ${dbRows.length} saved voice setting rows.`
        : "No saved voice setting rows found. Using browser-local/default settings."
      );
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setVoiceSettingsLoadedFromDb(false);
      setMessage(adminErrorMessage(error, "Could not load voice settings."));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveVoiceTemplateRows(nextTemplates = voiceTemplates) {
    if (!canUseApi) {
      return null;
    }

    const rowsToImport = (Object.keys(defaultVoiceTemplates) as VoiceTemplateSurface[])
      .map((surfaceKey) => voiceTemplateRowPayload(surfaceKey, nextTemplates[surfaceKey]));

    return bulkUpsertGeneratedContentImportRows(rowsToImport);
  }

  async function loadSignContextSetting() {
    if (!canUseApi) {
      return;
    }

    try {
      const row = await fetchSignContextSettingForAdmin();

      setSignContextSettingRow(row);
      setSignContextEnabled(signContextSettingEnabled(row));
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not load sign context setting."));
    }
  }

  async function loadSkyHistoricalLookbackSetting() {
    if (!canUseApi) {
      return;
    }

    try {
      const row = await fetchSkyHistoricalLookbackSettingForAdmin();

      setSkyHistoricalLookbackSettingRow(row);
      setSkyHistoricalLookbackEnabled(skyHistoricalLookbackSettingEnabled(row));
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not load historical lookback setting."));
    }
  }

  useEffect(() => {
    setAccessStatus(secret.trim() ? "checking" : "empty");
    if (canUseApi) {
      void loadReviewWorkspace();
    }
  }, [secret]);

  useEffect(() => {
    if ((activePage === "content" || activePage === "reviewQueue") && canUseApi) {
      void loadReviewWorkspace();
    }

    if ((activePage === "vocabulary" || activePage === "slotDictionary") && canUseApi) {
      void loadVocabularyRows();
    }

    if (activePage === "knowledge" || activePage === "hooks" || activePage === "slotDictionary") {
      void loadTemplateContentRows();
    }

    if (activePage === "appBehavior" && canUseApi) {
      void loadSignContextSetting();
      void loadSkyHistoricalLookbackSetting();
    }

    if (activePage === "templates") {
      void loadVoiceTemplateRows();
    }

  }, [activePage, canUseApi]);

  useEffect(() => {
    setSelectedContentRowIds((currentIds) => {
      const visibleIds = new Set(visibleContentRecords.map((record) => record.id));
      const nextIds = new Set([...currentIds].filter((id) => visibleIds.has(id)));

      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, [visibleContentRecords]);

  useEffect(() => {
    const openFromHash = () => {
      const hash = window.location.hash;
      const { key: hashKey, params: hashParams } = parseAdminHash(hash);
      const fallbackMatch = hash.match(/^#fallback-row\/(.+)$/);
      const lunarMatch = hash.match(/^#lunar-row\/(.+)$/);
      const pageFromHash = adminPageByHashKey[hashKey] ?? (hash === "#reviewQueue" ? "reviewQueue" : null);

      if (pageFromHash && !fallbackMatch && !lunarMatch) {
        if (pageFromHash === "content") {
          const category = hashParams.get("category");
          const source = hashParams.get("source");
          const query = hashParams.get("q");

          if (isAdminContentCategoryFilter(category)) {
            setCategoryFilter(category);
          }

          if (isAdminContentClassFilter(source)) {
            setContentSourceFilter(source);
          }

          if (query !== null) {
            setPersonQuery(query);
          }
        }

        if (pageFromHash === "vocabulary") {
          const category = hashParams.get("category");
          const query = hashParams.get("q");

          if (isAdminVocabularyCategoryFilter(category)) {
            setVocabularyCategoryFilter(category);
          }

          if (query !== null) {
            setVocabularyQuery(query);
          }
        }

        if (pageFromHash === "knowledge") {
          const section = hashParams.get("section");

          if (isAdminFallbackHookSectionFilter(section)) {
            setFallbackHookSectionFilter(section);
          }
        }

        if (pageFromHash === "hooks") {
          const area = hashParams.get("area");
          const statusFilter = hashParams.get("status");
          const normalizedArea = normalizedWritingSurfaceAreaFilter(area);

          if (normalizedArea) {
            setWritingSurfaceAreaFilter(normalizedArea);
          }

          if (statusFilter === "all" || statusFilter === "normalized" || statusFilter === "partial" || statusFilter === "not-normalized") {
            setWritingSurfaceStatusFilter(statusFilter as WritingSurfaceMapStatusFilter);
          }
        }

        setActivePage(pageFromHash);
        handledAdminDeepLinkHashRef.current = hash;
        return;
      }

      if (!fallbackMatch && !lunarMatch) {
        handledAdminDeepLinkHashRef.current = null;
        return;
      }

      if (fallbackMatch) {
        const hookKey = decodeURIComponent(fallbackMatch[1]);
        const contentKey = canonicalFallbackTemplateContentKey(hookKey) ?? contextContentKey(hookKey);
        const row = findFallbackTemplateRowForHook(currentTemplateContentRows, hookKey);
        const expectedSelectedId = row?.id ?? `placeholder:${contentKey}`;

        if (handledAdminDeepLinkHashRef.current === hash && selectedTemplateContentId === expectedSelectedId) {
          return;
        }

        handledAdminDeepLinkHashRef.current = hash;
        setActivePage("knowledge");
        setFallbackHookSectionFilter(hookSectionForKey(hookKey));
        setTemplateDrawerMode("edit");
        setSelectedTemplateContentId(expectedSelectedId);
        setSelectedFallbackHookKey(hookKey);
        setSelectedHookCatalogItem(null);
        return;
      }

      if (lunarMatch) {
        const key = decodeURIComponent(lunarMatch[1]);
        const definition = lunarCalendarContentKeyDefinitions.find((item) => item.key === key);

        if (!definition) return;

        const row = lunarCoverageRowsByKey.get(definition.key);
        const expectedSelectionKey = row?.id ?? definition.key;

        if (handledAdminDeepLinkHashRef.current === hash && (selectedId === expectedSelectionKey || selectedHookCatalogItem?.key === definition.key)) {
          return;
        }

        handledAdminDeepLinkHashRef.current = hash;

        if (row) {
          setRows((currentRows) => (
            currentRows.some((currentRow) => currentRow.id === row.id)
              ? currentRows
              : [row, ...currentRows]
          ));
          selectRow(row);
          setActivePage("content");
        } else {
          setSelectedHookCatalogItem({ type: "lunar", key: definition.key });
          setActivePage("hooks");
        }
      }
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    window.addEventListener("popstate", openFromHash);

    return () => {
      window.removeEventListener("hashchange", openFromHash);
      window.removeEventListener("popstate", openFromHash);
    };
  }, [currentTemplateContentRows, lunarCoverageRowsByKey, selectedHookCatalogItem?.key, selectedId, selectedTemplateContentId]);

  useEffect(() => {
    void checkTldrAstroApiStatus();
  }, []);

  useEffect(() => {
    return () => {
      if (saveToastTimeoutRef.current !== null) {
        window.clearTimeout(saveToastTimeoutRef.current);
      }
    };
  }, []);

  async function loadReviewWorkspace(nextReviewSurface = reviewSurface, nextStatus = status, nextCategory = categoryFilter) {
    const surfaces = reviewSurfacesForCategory(nextCategory);
    setSelectedId(null);
    setSelectedReviewId((currentId) => isUnsavedManualReviewId(currentId) ? currentId : null);
    setDraft(createAdminDraft(surface));
    if (!canUseApi) {
      const nextMessage = "Add the content generation secret first.";

      setReviewLoadError(nextMessage);
      setMessage(nextMessage);
      return;
    }

    setIsLoading(true);
    setAccessStatus("checking");
    setReviewLoadError(null);
    try {
      const reviewRequests = surfaces.map((reviewSurfaceKey) => {
        const params = new URLSearchParams({
          surface: reviewSurfaceKey,
          status: "all"
        });
        const shouldUseDateWindow = categoryUsesDateFilter(nextCategory) && reviewSurfaceUsesDateFilter(reviewSurfaceKey);

        if (shouldUseDateWindow && dateStart) {
          params.set("startDate", dateStart);
        }

        if (shouldUseDateWindow && dateEnd) {
          params.set("endDate", dateEnd);
        }

        if (personQuery.trim()) {
          params.set("person", personQuery.trim());
        }

        return adminJsonRequest<AdminReviewRecordsPayload>(
          `/api/admin/review-records?${params}`,
          secret
        );
      });
      const reviewResults = await Promise.allSettled(reviewRequests);
      const payloads = reviewResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      const reviewLoadFailures = reviewResults.flatMap((result) => {
        if (result.status === "fulfilled") return [];

        return [adminErrorMessage(result.reason, "Could not load one review surface.")];
      });

      if (payloads.length === 0 && reviewLoadFailures.length > 0) {
        const firstFailure = reviewResults.find((result): result is PromiseRejectedResult => result.status === "rejected");

        throw firstFailure?.reason ?? new Error(reviewLoadFailures[0]);
      }

      const privateParams = new URLSearchParams({
        status: "all",
        limit: "100"
      });

      if (nextCategory === "Sky" && dateStart) {
        privateParams.set("startDate", dateStart);
      }

      if (nextCategory === "Sky" && dateEnd) {
        privateParams.set("endDate", dateEnd);
      }

      const [privateResult, globalSynastryResult] = await Promise.allSettled([
        adminJsonRequest<{ ok: boolean; rows: AdminUserGeneratedContentRow[] }>(
          `/api/admin/user-generated-content?${privateParams}`,
          secret
        ),
        categoryUsesGlobalSynastryRows(nextCategory)
          ? fetchGlobalSynastryRowsForAdmin()
          : Promise.resolve([] as AdminGeneratedContentRow[])
      ]);
      const privateRows = privateResult.status === "fulfilled" ? privateResult.value.rows ?? [] : [];
      const globalSynastryRows = globalSynastryResult.status === "fulfilled" ? globalSynastryResult.value : [];
      const supplementalLoadFailures = [
        privateResult.status === "rejected" ? adminErrorMessage(privateResult.reason, "Could not load personal content rows.") : "",
        globalSynastryResult.status === "rejected" ? adminErrorMessage(globalSynastryResult.reason, "Could not load global synastry rows.") : ""
      ].filter(Boolean);
      const mergedRecords = new Map<string, AdminReviewRecord>();

      payloads.flatMap((payload) => payload.rows ?? []).forEach((record) => {
        const mergeKey = reviewRecordMergeKey(record);
        mergedRecords.set(mergeKey, preferredReviewRecord(mergedRecords.get(mergeKey), record));
      });
      globalSynastryRows.map(globalReviewRecord).forEach((record) => {
        const mergeKey = reviewRecordMergeKey(record);
        mergedRecords.set(mergeKey, preferredReviewRecord(mergedRecords.get(mergeKey), record));
      });
      privateRows.map(privateReviewRecord).forEach((record) => {
        mergedRecords.set(record.id, record);
      });

      const nextRecords = Array.from(mergedRecords.values());
      const nextRecordsForCounts = mergeUnsavedManualReviewRecords(reviewRecords, nextRecords);

      setReviewRecords((currentRecords) => mergeUnsavedManualReviewRecords(currentRecords, nextRecords));
      setReviewCounts(reviewCountsForRecords(nextRecordsForCounts));
      setAccessStatus("valid");
      const prompts = payloads.map((payload) => payload.prompt).filter(Boolean);
      const warnings = payloads.flatMap((payload) => payload.warnings ?? []);
      const warningMessage = [
        reviewLoadFailures.length > 0 ? `${reviewLoadFailures.length} review surface failed.` : "",
        supplementalLoadFailures.length > 0 ? `${supplementalLoadFailures.length} supplemental content request failed.` : "",
        warnings.length > 0 ? `${warnings.length} calculated sky dates were skipped.` : ""
      ].filter(Boolean).join(" ");

      const loadedMessage = prompts[0] && globalSynastryRows.length > 0
        ? `Loaded ${nextRecordsForCounts.length} content rows, including ${globalSynastryRows.length} global synastry rows. ${prompts[0]}`
        : prompts[0] ?? `Loaded ${nextRecordsForCounts.length} content rows.`;

      setMessage(
        `${loadedMessage}${warningMessage ? ` ${warningMessage}` : ""}`
      );
      setReviewLoadError(null);
    } catch (error) {
      const nextMessage = adminErrorMessage(error, "Could not load review records.");

      setReviewRecords((currentRecords) => currentRecords.filter(isUnsavedManualReviewRecord));
      setReviewCounts(reviewCountsForRecords(reviewRecords.filter(isUnsavedManualReviewRecord)));
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setReviewLoadError(nextMessage);
      setMessage(nextMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function saveSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSecret = secretDraft.trim();

    setSecret(nextSecret);
    setAccessStatus(nextSecret ? "checking" : "empty");
    setReviewLoadError(nextSecret ? null : "Add the content generation secret first.");
    setMessage(nextSecret ? "Checking admin access..." : "Add the content generation secret first.");
    try {
      if (nextSecret) {
        window.localStorage.setItem(adminSecretStorageKey, nextSecret);
      } else {
        window.localStorage.removeItem(adminSecretStorageKey);
      }
    } catch {
      return;
    }

    if (nextSecret && nextSecret === secret) {
      void loadReviewWorkspace();
    }
    showSaveToast(nextSecret ? "Admin access saved" : "Admin access cleared");
  }

  async function loadRowDetails(id: string) {
    if (!canUseApi) {
      return;
    }

    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?id=${encodeURIComponent(id)}`,
        secret
      );
      const row = payload.rows?.[0];

      if (row) {
        setDraft(adminDraftFromRow(row));
        setRows((currentRows) => currentRows.map((currentRow) => currentRow.id === row.id ? { ...currentRow, ...row } : currentRow));
      }
    } catch (error) {
      setMessage(adminErrorMessage(error, "Could not load row details."));
    }
  }

  function selectRow(row: AdminGeneratedContentRow) {
    setSelectedId(row.id);
    setDraft(adminDraftFromRow(row));
    void loadRowDetails(row.id);
  }

  function toggleContentRowSelection(record: AdminReviewRecord) {
    setSelectedContentRowIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(record.id)) {
        nextIds.delete(record.id);
      } else {
        nextIds.add(record.id);
      }

      return nextIds;
    });
  }

  function toggleAllVisibleContentRows() {
    setSelectedContentRowIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (areAllVisibleContentRowsSelected) {
        selectableContentRecords.forEach((record) => nextIds.delete(record.id));
      } else {
        selectableContentRecords.forEach((record) => nextIds.add(record.id));
      }

      return nextIds;
    });
  }

  function mergeUpdatedGlobalReviewRow(recordId: string, row: AdminGeneratedContentRow, fallback: AdminReviewRecord) {
    return {
      ...fallback,
      source: "global" as const,
      surface: row.surface,
      mode: row.mode,
      status: row.status,
      eventType: row.event_type,
      targetDate: row.target_date,
      contentKey: row.content_key,
      title: row.headline || fallback.title,
      summary: row.summary ?? fallback.summary,
      body: row.body ?? fallback.body,
      sections: Array.isArray(row.sections) ? row.sections : fallback.sections,
      facts: row.facts ?? fallback.facts,
      knowledgeIds: row.knowledge_ids ?? fallback.knowledgeIds,
      sourceSnapshot: row.source_snapshot ?? fallback.sourceSnapshot,
      reviewerNotes: row.reviewer_notes ?? fallback.reviewerNotes,
      provider: row.provider ?? fallback.provider,
      model: row.model ?? fallback.model,
      promptVersion: row.prompt_version ?? fallback.promptVersion,
      evergreen: Boolean(row.evergreen),
      evergreenAt: row.evergreen_at ?? null,
      evergreenBy: row.evergreen_by ?? null,
      updatedAt: row.updated_at,
      rawGlobalRow: row,
      id: recordId
    };
  }

  function updateReviewRecordFromGlobalRow(record: AdminReviewRecord, row: AdminGeneratedContentRow) {
    setReviewRecords((currentRecords) => {
      const nextRecords = currentRecords.map((currentRecord) => (
        currentRecord.id === record.id ? mergeUpdatedGlobalReviewRow(record.id, row, currentRecord) : currentRecord
      ));

      setReviewCounts(reviewCountsForRecords(nextRecords));
      return nextRecords;
    });
  }

  async function applyBulkContentStatus() {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    if (selectedContentRowIds.size === 0) {
      setMessage("Select rows first.");
      return;
    }

    if (selectedPersistedContentRecords.length === 0) {
      setMessage("Selected rows are calculated placeholders. Save them before changing status in bulk.");
      return;
    }

    setIsLoading(true);
    setMessage(`Updating ${selectedPersistedContentRecords.length} selected row${selectedPersistedContentRecords.length === 1 ? "" : "s"}...`);

    try {
      const results = await Promise.allSettled(selectedPersistedContentRecords.map(async (record) => {
        if (record.source === "private" && record.rawPrivateRow) {
          const payload = await adminJsonRequest<{ ok: boolean; rows: AdminUserGeneratedContentRow[] }>(
            "/api/admin/user-generated-content",
            secret,
            {
              method: "PATCH",
              body: JSON.stringify({
                id: record.rawPrivateRow.id,
                status: bulkContentStatus
              })
            }
          );

          return {
            kind: "private" as const,
            recordId: record.id,
            rawPrivateRow: payload.rows?.[0] ?? record.rawPrivateRow
          };
        }

        const globalRowId = savedGlobalRowId(record);

        if (!globalRowId) {
          throw new Error(`${record.title} is not saved yet.`);
        }

        const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
          "/api/admin/generated-content",
          secret,
          {
            method: "PATCH",
            body: JSON.stringify({
              id: globalRowId,
              status: bulkContentStatus,
              surface: record.surface,
              contentKey: record.contentKey
            })
          }
        );

        return {
          kind: "global" as const,
          recordId: record.id,
          rawGlobalRow: payload.rows?.[0] ?? record.rawGlobalRow
        };
      }));
      const successfulResults = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      const updatedById = new Map(successfulResults.map((result) => [result.recordId, result]));
      const failedCount = results.length - successfulResults.length;
      const skippedCount = selectedContentRowIds.size - selectedPersistedContentRecords.length;

      setReviewRecords((currentRecords) => {
        const nextRecords = currentRecords.map((record) => {
          const update = updatedById.get(record.id);

          if (!update) {
            return record;
          }

          if (update.kind === "private") {
            return {
              ...record,
              status: update.rawPrivateRow.status,
              title: update.rawPrivateRow.headline || record.title,
              summary: update.rawPrivateRow.summary ?? record.summary,
              body: update.rawPrivateRow.body ?? record.body,
              updatedAt: update.rawPrivateRow.updated_at,
              rawPrivateRow: update.rawPrivateRow
            };
          }

          return {
            ...record,
            status: update.rawGlobalRow.status,
            surface: update.rawGlobalRow.surface,
            mode: update.rawGlobalRow.mode,
            eventType: update.rawGlobalRow.event_type,
            targetDate: update.rawGlobalRow.target_date,
            contentKey: update.rawGlobalRow.content_key,
            title: update.rawGlobalRow.headline || record.title,
            summary: update.rawGlobalRow.summary ?? record.summary,
            body: update.rawGlobalRow.body ?? record.body,
            sections: Array.isArray(update.rawGlobalRow.sections) ? update.rawGlobalRow.sections : record.sections,
            facts: update.rawGlobalRow.facts ?? record.facts,
            sourceSnapshot: update.rawGlobalRow.source_snapshot ?? record.sourceSnapshot,
            reviewerNotes: update.rawGlobalRow.reviewer_notes ?? record.reviewerNotes,
            provider: update.rawGlobalRow.provider ?? record.provider,
            model: update.rawGlobalRow.model ?? record.model,
            evergreen: Boolean(update.rawGlobalRow.evergreen),
            evergreenAt: update.rawGlobalRow.evergreen_at ?? null,
            evergreenBy: update.rawGlobalRow.evergreen_by ?? null,
            updatedAt: update.rawGlobalRow.updated_at,
            rawGlobalRow: update.rawGlobalRow
          };
        });

        setReviewCounts(reviewCountsForRecords(nextRecords));
        return nextRecords;
      });
      setSelectedContentRowIds((currentIds) => {
        const nextIds = new Set(currentIds);

        successfulResults.forEach((result) => nextIds.delete(result.recordId));
        return nextIds;
      });

      const parts = [
        `Updated ${successfulResults.length} row${successfulResults.length === 1 ? "" : "s"} to ${contentStatusLabel(bulkContentStatus)}.`,
        skippedCount > 0 ? `${skippedCount} calculated placeholder${skippedCount === 1 ? " was" : "s were"} skipped.` : "",
        failedCount > 0 ? `${failedCount} row${failedCount === 1 ? "" : "s"} failed.` : ""
      ].filter(Boolean);

      setMessage(parts.join(" "));
      showSaveToast(successfulResults.length > 0 ? "Bulk status updated" : "No rows updated");
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not update selected rows."));
    } finally {
      setIsLoading(false);
    }
  }

  async function patchGlobalReviewRecord(record: AdminReviewRecord, patch: Record<string, unknown>) {
    const globalRowId = savedGlobalRowId(record);

    if (!globalRowId) {
      throw new Error(`${record.title} is not saved yet.`);
    }

    const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      "/api/admin/generated-content",
      secret,
      {
        method: "PATCH",
        body: JSON.stringify({
          id: globalRowId,
          surface: record.surface,
          contentKey: record.contentKey,
          ...patch
        })
      }
    );
    const row = payload.rows?.[0];

    if (!row) {
      throw new Error("The admin API did not return the updated row.");
    }

    updateReviewRecordFromGlobalRow(record, row);
    return row;
  }

  async function updateReviewQueueCopy(record: AdminReviewRecord, updates: { summary?: string; body?: string }) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    if (record.source === "private") {
      setMessage("Personal rows still use the main content drawer for editing.");
      return;
    }

    const nextSummary = updates.summary ?? record.summary;
    const nextBody = updates.body ?? record.body;
    const nextRecord = { ...record, summary: nextSummary, body: nextBody };
    const blockReason = readerSafetyBlockReason(nextRecord);
    const metaphorFlags = findMetaphorPhraseFlags(reviewRecordPlainText(nextRecord), nextRecord.contentKey);
    const natalWarnings = skyNatalPhrasingWarnings(nextRecord);

    if (blockReason && (record.status === "REVIEWED" || record.status === "LIVE")) {
      setMessage(`Save blocked for ${record.title}: ${blockReason}`);
      return;
    }

    setIsLoading(true);
    try {
      await patchGlobalReviewRecord(record, {
        summary: nextSummary,
        body: nextBody,
        reviewerNotes: [
          record.reviewerNotes ?? "",
          metaphorFlags.length ? `Metaphor phrasebook flags: ${metaphorFlags.map((flag) => `${flag.contentKey}: "${flag.phrase}"`).join(" | ")}` : "",
          natalWarnings.length ? `Sky-safe warning: possible natal phrasing (${natalWarnings.join(", ")}).` : ""
        ].filter((item) => item.trim()).join("\n")
      });
      setMessage(metaphorFlags.length || natalWarnings.length
        ? "Saved with non-blocking editorial warnings."
        : "Saved queue copy.");
      showSaveToast("Queue row saved");
    } catch (error) {
      setMessage(adminErrorMessage(error, "Could not save queue row."));
    } finally {
      setIsLoading(false);
    }
  }

  async function transitionReviewQueueRecord(record: AdminReviewRecord, nextStatus: GeneratedContentStatus) {
    const blockReason = canTransitionReviewRecord(record, nextStatus);

    if (blockReason) {
      setMessage(`${contentStatusLabel(nextStatus)} blocked for ${record.title}: ${blockReason}`);
      return;
    }

    setIsLoading(true);
    try {
      await patchGlobalReviewRecord(record, {
        status: nextStatus,
        ...(nextStatus === "REVIEWED" || nextStatus === "LIVE" ? { reviewState: null } : {})
      });
      setMessage(`${record.title} marked ${contentStatusLabel(nextStatus)}.`);
      showSaveToast(contentStatusLabel(nextStatus));
    } catch (error) {
      setMessage(adminErrorMessage(error, "Could not update queue status."));
    } finally {
      setIsLoading(false);
    }
  }

  async function setReviewQueueEvergreen(record: AdminReviewRecord, nextEvergreen: boolean) {
    if (!nextEvergreen && !window.confirm("Remove evergreen lock?")) {
      return;
    }

    if (nextEvergreen) {
      const blockReason = canMarkEvergreen(record);

      if (blockReason) {
        setMessage(`Evergreen blocked for ${record.title}: ${blockReason}`);
        return;
      }

      if (hasRevoicePendingProvenance(record) && !window.confirm("This is interim CHANI copy pending your voice — lock anyway?")) {
        return;
      }
    }

    setIsLoading(true);
    try {
      await patchGlobalReviewRecord(record, {
        evergreen: nextEvergreen,
        evergreenBy: nextEvergreen ? "admin" : null
      });
      setMessage(nextEvergreen ? `${record.title} marked evergreen.` : `${record.title} unlocked from evergreen.`);
      showSaveToast(nextEvergreen ? "Evergreen locked" : "Evergreen removed");
    } catch (error) {
      setMessage(adminErrorMessage(error, "Could not update evergreen lock."));
    } finally {
      setIsLoading(false);
    }
  }

  async function applyBulkEvergreen(nextEvergreen: boolean) {
    const records = selectedPersistedContentRecords.filter((record) => record.source !== "private");

    if (records.length === 0) {
      setMessage("Select saved global rows first.");
      return;
    }

    if (!nextEvergreen && !window.confirm("Remove evergreen lock from selected rows?")) {
      return;
    }

    let skipped = 0;
    let warned = 0;
    let updated = 0;

    setIsLoading(true);
    try {
      for (const record of records) {
        if (nextEvergreen) {
          const blockReason = canMarkEvergreen(record);
          if (blockReason) {
            skipped += 1;
            continue;
          }

          if (hasRevoicePendingProvenance(record)) {
            warned += 1;
            continue;
          }
        }

        await patchGlobalReviewRecord(record, {
          evergreen: nextEvergreen,
          evergreenBy: nextEvergreen ? "admin" : null
        });
        updated += 1;
      }

      setMessage(`${updated} row${updated === 1 ? "" : "s"} ${nextEvergreen ? "marked evergreen" : "unlocked"}.${skipped ? ` ${skipped} skipped by guards.` : ""}${warned ? ` ${warned} revoice-pending row${warned === 1 ? "" : "s"} skipped for manual review.` : ""}`);
      showSaveToast(nextEvergreen ? "Bulk evergreen done" : "Bulk unlock done");
    } catch (error) {
      setMessage(adminErrorMessage(error, "Could not update selected evergreen locks."));
    } finally {
      setIsLoading(false);
    }
  }

  function copyLunarCoverageEditorLink(definition: LunarCalendarContentKeyDefinition) {
    const nextUrl = `${window.location.origin}${window.location.pathname}#lunar-row/${encodeURIComponent(definition.key)}`;

    void copyAdminEditorLink(nextUrl, definition.key);
  }

  async function fetchGeneratedContentRowByContentKey(contentKey: string) {
    const params = new URLSearchParams({
      status: "all",
      contentKey,
      limit: "5"
    });
    const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?${params}`,
      secret
    );

    return payload.rows?.find((row) => row.content_key === contentKey) ?? null;
  }

  async function openLunarCoverageEditor(row: AdminGeneratedContentRow | undefined, definition: LunarCalendarContentKeyDefinition) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setSelectedHookCatalogItem(null);

    if (!row) {
      setIsLoading(true);
      try {
        const existingRow = await fetchGeneratedContentRowByContentKey(definition.key);

        if (existingRow) {
          setLunarCoverageRows((currentRows) => (
            currentRows.some((currentRow) => currentRow.id === existingRow.id)
              ? currentRows
              : [existingRow, ...currentRows]
          ));
          setRows((currentRows) => (
            currentRows.some((currentRow) => currentRow.id === existingRow.id)
              ? currentRows
              : [existingRow, ...currentRows]
          ));
          selectRow(existingRow);
          setActivePage("content");
          setMessage(`Opened existing row for ${existingRow.content_key}.`);
          return;
        }

        const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
          "/api/admin/generated-content",
          secret,
          {
            method: "POST",
            body: JSON.stringify({
              contentKey: definition.key,
              surface: "sky",
              mode: "feed",
              eventType: "lunar-calendar",
              headline: definition.label,
              summary: "",
              body: "",
              sections: definition.fieldKeys.includes("journalPrompt") ? { journalPrompt: "" } : {},
              facts: {
                contentType: "lunar-calendar",
                group: definition.group,
                slotKeys: definition.slotKeys
              },
              sourceSnapshot: {
                contentType: "lunar-calendar-coverage",
                keyGroup: definition.group
              },
              promptVersion: "sky-lunar-calendar-v1",
              blockType: "lunar_calendar",
              reviewerNotes: "Admin-created lunar calendar content coverage row."
            })
          }
        );
        const createdRow = payload.rows?.[0];

        if (!createdRow) {
          setMessage(`Could not create ${definition.key}.`);
          return;
        }

        setLunarCoverageRows((currentRows) => (
          currentRows.some((currentRow) => currentRow.id === createdRow.id)
            ? currentRows
            : [createdRow, ...currentRows]
        ));
        setRows((currentRows) => (
          currentRows.some((currentRow) => currentRow.id === createdRow.id)
            ? currentRows
            : [createdRow, ...currentRows]
        ));
        selectRow(createdRow);
        setActivePage("content");
        setMessage(`Created DRAFT row for ${createdRow.content_key}.`);
      } catch (error) {
        if (error instanceof AdminRequestError && error.status === 401) {
          setAccessStatus("invalid");
        }
        setMessage(adminErrorMessage(error, `Could not create ${definition.key}.`));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setRows((currentRows) => (
      currentRows.some((currentRow) => currentRow.id === row.id)
        ? currentRows
        : [row, ...currentRows]
    ));
    selectRow(row);
    setActivePage("content");
    setMessage(`Editing ${row.content_key}.`);
  }

  function updateVocabularyDraft(id: string, patch: Partial<AdminVocabularyDraft>) {
    vocabularyDraftDirtyRef.current = true;
    setVocabularyDrafts((currentDrafts) => ({
      ...currentDrafts,
      [id]: {
        ...(currentDrafts[id] ?? { headline: "", natal: "", sky: "", status: "DRAFT" }),
        ...patch
      }
    }));
  }

  function updateTaglineDraft(contentKey: string, patch: Partial<AdminNatalTaglineDraft>) {
    const point = pointFromTaglineContentKey(contentKey);

    vocabularyDraftDirtyRef.current = true;
    setTaglineDrafts((currentDrafts) => ({
      ...currentDrafts,
      [contentKey]: {
        ...(currentDrafts[contentKey] ?? fallbackTaglineDraft(point)),
        ...patch
      }
    }));
  }

  function updateTemplateContentDraft(id: string, patch: Partial<AdminTemplateDraft>) {
    templateContentDraftDirtyRef.current = true;
    setTemplateContentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [id]: {
        ...(currentDrafts[id] ?? { headline: "", summary: "", body: "", status: "DRAFT" }),
        ...patch
      }
    }));
  }

  function updateTemplatePreviewSlot(contentKey: string, slot: string, value: string) {
    setTemplatePreviewSlotDrafts((currentDrafts) => ({
      ...currentDrafts,
      [contentKey]: {
        ...(currentDrafts[contentKey] ?? {}),
        [slot]: value
      }
    }));
  }

  function resetTemplatePreviewSlots(contentKey: string) {
    setTemplatePreviewSlotDrafts((currentDrafts) => {
      const remainingDrafts = { ...currentDrafts };

      delete remainingDrafts[contentKey];
      return remainingDrafts;
    });
  }

  async function saveVocabularyRow(row: AdminGeneratedContentRow) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const draftValue = vocabularyDrafts[row.id] ?? vocabularyDraftFromRow(row);
    setIsLoading(true);
    try {
      const isSignStyle = vocabularyRowKind(row.content_key) === "sign-style";
      await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "PATCH",
          body: JSON.stringify({
            id: row.id,
            status: draftValue.status,
            headline: draftValue.headline,
            summary: vocabularySummaryFromDraft(row, draftValue),
            body: vocabularyBodyFromDraft(row, draftValue),
            sections: vocabularySectionsFromDraft(row, draftValue)
          })
        }
      );
      await loadVocabularyRows({ forceDraftRefresh: true });
      setMessage(`Saved and re-read ${row.content_key}.`);
      showSaveToast("Vocabulary row saved");
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not save vocabulary row."));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveTaglineRow(contentKey: string) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const point = pointFromTaglineContentKey(contentKey);
    const matchedRow = findAdminGeneratedContentRow(taglineRows, {
      contentKey,
      mode: "feed"
    });
    const draftValue = taglineDrafts[contentKey] ?? (matchedRow ? taglineDraftFromRow(matchedRow) : fallbackTaglineDraft(point));
    const payloadBody = {
      headline: draftValue.headline,
      body: draftValue.tagline,
      sections: {
        tagline: {
          natal: draftValue.tagline
        }
      }
    };

    setIsLoading(true);
    try {
      let createdTaglineStatus: GeneratedContentStatus | undefined;

      if (matchedRow) {
        await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
          "/api/admin/generated-content",
          secret,
          {
            method: "PATCH",
            body: JSON.stringify({
              id: matchedRow.id,
              ...payloadBody
            })
          }
        );
      } else {
        const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
          "/api/admin/generated-content",
          secret,
          {
            method: "POST",
            body: JSON.stringify({
              contentKey,
              surface: "sky",
              mode: "feed",
              eventType: "tagline",
              status: "LIVE",
              promptVersion: "tagline-v1",
              ...payloadBody
            })
          }
        );
        createdTaglineStatus = payload.rows?.[0]?.status;
      }

      await loadVocabularyRows({ forceDraftRefresh: true });
      const createdStatusMessage = createdTaglineStatus
        ? ` Created as ${savedStatusLabel(createdTaglineStatus)}; publish separately when ready.`
        : "";
      setMessage(`Saved and re-read ${contentKey}.${createdStatusMessage}`);
      showSaveToast(createdTaglineStatus ? `Tagline saved as ${savedStatusLabel(createdTaglineStatus)}` : "Tagline saved");
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not save natal card tagline."));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveVocabularyCard(item: AdminVocabularyCardItem) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const patchVocabularyRow = async (row: AdminGeneratedContentRow) => {
      const draftValue = vocabularyDrafts[row.id] ?? vocabularyDraftFromRow(row);
      const nextBody = vocabularyBodyFromDraft(row, draftValue);
      const isLocalCompanionRow = row.id.startsWith("local:");

      if (isLocalCompanionRow && !nextBody.trim()) {
        return;
      }

      await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: isLocalCompanionRow ? "POST" : "PATCH",
          body: JSON.stringify({
            ...(isLocalCompanionRow
              ? {
                  contentKey: row.content_key,
                  surface: row.surface,
                  mode: row.mode,
                  eventType: row.event_type,
                  status: draftValue.status,
                  promptVersion: row.prompt_version
                }
              : { id: row.id, status: draftValue.status }),
            headline: draftValue.headline,
            summary: vocabularySummaryFromDraft(row, draftValue),
            body: nextBody,
            sections: vocabularySectionsFromDraft(row, draftValue)
          })
        }
      );
    };

    setIsLoading(true);
    try {
      let createdTaglineStatus: GeneratedContentStatus | undefined;

      if (item.row) {
        await patchVocabularyRow(item.row);
      }

      if (item.signNeedRow) {
        await patchVocabularyRow(item.signNeedRow);
      }

      if (item.storyRow) {
        await patchVocabularyRow(item.storyRow);
      }

      if (item.shadowRow) {
        await patchVocabularyRow(item.shadowRow);
      }

      if (item.higherExpressionRow) {
        await patchVocabularyRow(item.higherExpressionRow);
      }

      if (item.taglineContentKey) {
        const point = pointFromTaglineContentKey(item.taglineContentKey);
        const matchedRow = findAdminGeneratedContentRow(taglineRows, {
          contentKey: item.taglineContentKey,
          mode: "feed"
        });
        const draftValue = taglineDrafts[item.taglineContentKey] ?? (matchedRow ? taglineDraftFromRow(matchedRow) : fallbackTaglineDraft(point));
        const payloadBody = {
          headline: draftValue.headline,
          body: draftValue.tagline,
          sections: {
            tagline: {
              natal: draftValue.tagline
            }
          }
        };

        if (matchedRow) {
          await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
            "/api/admin/generated-content",
            secret,
            {
              method: "PATCH",
              body: JSON.stringify({
                id: matchedRow.id,
                ...payloadBody
              })
            }
          );
        } else {
          const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
            "/api/admin/generated-content",
            secret,
            {
              method: "POST",
              body: JSON.stringify({
                contentKey: item.taglineContentKey,
                surface: "sky",
                mode: "feed",
                eventType: "tagline",
                status: "LIVE",
                promptVersion: "tagline-v1",
                ...payloadBody
              })
            }
          );
          createdTaglineStatus = payload.rows?.[0]?.status;
        }
      }

      await loadVocabularyRows({ forceDraftRefresh: true });
      const createdStatusMessage = createdTaglineStatus
        ? ` Tagline created as ${savedStatusLabel(createdTaglineStatus)}; publish separately when ready.`
        : "";
      setMessage(`Saved and re-read ${item.point}.${createdStatusMessage}`);
      showSaveToast(createdTaglineStatus ? `Vocabulary card saved; tagline is ${savedStatusLabel(createdTaglineStatus)}` : "Vocabulary card saved");
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not save vocabulary card."));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveTemplateContentRow(row: AdminGeneratedContentRow) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const draftValue = templateContentDrafts[row.id] ?? templateDraftFromRow(row);
    setIsLoading(true);
    try {
      if (isFallbackTemplatePlaceholderRow(row)) {
        const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
          "/api/admin/generated-content",
          secret,
          {
            method: "POST",
            body: JSON.stringify({
              contentKey: row.content_key,
              surface: row.surface,
              mode: row.mode,
              eventType: "fallback-hook",
              status: draftValue.status,
              headline: draftValue.headline,
              summary: draftValue.summary,
              body: draftValue.body,
              sections: [],
              facts: row.facts ?? {},
              knowledgeIds: row.knowledge_ids ?? [],
              sourceSnapshot: row.source_snapshot ?? {},
              promptVersion: row.prompt_version ?? "fallback-hook-template-v1",
              blockType: "fallback_template",
              reviewerNotes: row.reviewer_notes ?? ""
            })
          }
        );
        const createdStatus = payload.rows?.[0]?.status;

        await loadTemplateContentRows({ forceDraftRefresh: true });
        setMessage(`Created and re-read ${row.content_key}. Created as ${savedStatusLabel(createdStatus)}; publish separately when ready.`);
        showSaveToast(`Fallback row saved as ${savedStatusLabel(createdStatus)}`);
        return;
      }

      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "PATCH",
          body: JSON.stringify({
            id: row.id,
            status: draftValue.status,
            headline: draftValue.headline,
            summary: draftValue.summary,
            body: draftValue.body
          })
        }
      );
      const savedStatus = payload.rows?.[0]?.status ?? draftValue.status;

      await loadTemplateContentRows({ forceDraftRefresh: true });
      setMessage(`Saved and re-read ${row.content_key}.`);
      showSaveToast(savedStatus === "LIVE" ? "Fallback row published" : `Fallback row saved as ${savedStatusLabel(savedStatus)}`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not save fallback hook or slot-template row."));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSignContextSetting(nextEnabled = signContextEnabled) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const payloadBody = {
      headline: "Sign context on aspect cards",
      summary: nextEnabled ? "Enabled" : "Disabled",
      body: nextEnabled ? "on" : "off",
      sections: {
        enabled: nextEnabled
      },
      facts: {
        setting: "sign-context-on-aspect-cards"
      },
      sourceSnapshot: {
        contentType: "app-setting",
        setting: "sign-context-on-aspect-cards"
      },
      reviewerNotes: "Admin setting: toggles appended sign-context lines on sky aspect cards and articles."
    };

    setIsLoading(true);
    try {
      if (signContextSettingRow) {
        await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
          "/api/admin/generated-content",
          secret,
          {
            method: "PATCH",
            body: JSON.stringify({
              id: signContextSettingRow.id,
              status: "LIVE",
              ...payloadBody
            })
          }
        );
      } else {
        await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
          "/api/admin/generated-content",
          secret,
          {
            method: "POST",
            body: JSON.stringify({
              contentKey: signContextAspectCardsSettingKey,
              surface: "sky",
              mode: "feed",
              eventType: "app-setting",
              status: "LIVE",
              promptVersion: "app-setting-v1",
              ...payloadBody
            })
          }
        );
      }

      await loadSignContextSetting();
      setMessage(`Sign context on aspect cards is ${nextEnabled ? "on" : "off"}.`);
      showSaveToast("App behavior saved");
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not save sign context setting."));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSkyHistoricalLookbackSetting(nextEnabled = skyHistoricalLookbackEnabled) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const updatedAt = new Date().toISOString();
    const payloadBody = {
      headline: "Historical lookbacks in expanded Sky",
      summary: nextEnabled ? "Enabled" : "Disabled",
      body: nextEnabled ? "on" : "off",
      sections: {
        enabled: nextEnabled,
        [skyHistoricalLookbackSettingId]: nextEnabled
      },
      facts: {
        settingId: skyHistoricalLookbackSettingId,
        value: nextEnabled,
        updatedAt,
        updatedBy: "admin",
        scope: "application",
        userConfigurable: false
      },
      sourceSnapshot: {
        contentType: "app-setting",
        settingId: skyHistoricalLookbackSettingId,
        scope: "application",
        userConfigurable: false,
        auditEvent: "sky-historical-lookback-setting-updated",
        updatedAt
      },
      reviewerNotes: "Admin setting: toggles reviewed historical context beneath eligible expanded collective Sky articles. Default is off; drafts never render."
    };

    setIsLoading(true);
    try {
      if (skyHistoricalLookbackSettingRow) {
        await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
          "/api/admin/generated-content",
          secret,
          {
            method: "PATCH",
            body: JSON.stringify({
              id: skyHistoricalLookbackSettingRow.id,
              status: "LIVE",
              ...payloadBody
            })
          }
        );
      } else {
        await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
          "/api/admin/generated-content",
          secret,
          {
            method: "POST",
            body: JSON.stringify({
              contentKey: skyHistoricalLookbackSettingKey,
              surface: "sky",
              mode: "feed",
              eventType: "app-setting",
              status: "LIVE",
              promptVersion: "app-setting-v1",
              ...payloadBody
            })
          }
        );
      }

      await loadSkyHistoricalLookbackSetting();
      setMessage(`Historical lookbacks in expanded Sky are ${nextEnabled ? "on" : "off"}.`);
      showSaveToast("App behavior saved");
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not save historical lookback setting."));
    } finally {
      setIsLoading(false);
    }
  }

  function beginReviewEdit(record: AdminReviewRecord) {
    const copy = readerFacingTextForReview(record);
    setEditingReviewId(record.id);
    setReviewEditTitle(record.title);
    setReviewEditSummary(reviewTldrForReview(record));
    setReviewEditBody(bodyWithoutLeadingTldr(copy));
    setReviewEditMetadata(reviewMetadataForRecord(record));
  }

  function cancelReviewEdit() {
    setEditingReviewId(null);
    setReviewEditTitle("");
    setReviewEditSummary("");
    setReviewEditBody("");
    setReviewEditMetadata(null);
  }

  function updateReviewMetadata(record: AdminReviewRecord, updates: Partial<AdminReviewMetadataEdit>) {
    if (editingReviewId !== record.id) {
      beginReviewEdit(record);
    }

    setReviewEditMetadata((currentMetadata) => {
      const base = currentMetadata ?? reviewMetadataForRecord(record);
      const next = {
        ...base,
        ...updates
      };

      if (updates.placementSign !== undefined) {
        const nextTraditionalRuler = traditionalRulerForSign(updates.placementSign);
        const nextModernRuler = modernRulerForSign(updates.placementSign);

        if (nextTraditionalRuler && (!currentMetadata || base.rulerBody === traditionalRulerForSign(base.placementSign) || !base.rulerBody.trim())) {
          const rulerPlacement = rulerPlacementForRecord(record, nextTraditionalRuler);
          next.rulerBody = nextTraditionalRuler;
          next.rulerSign = rulerPlacement.sign || next.rulerSign;
          next.rulerHouse = rulerPlacement.house || next.rulerHouse;
          next.traditionalRulerBody = nextTraditionalRuler;
          next.traditionalRulerSign = rulerPlacement.sign || next.traditionalRulerSign;
          next.traditionalRulerHouse = rulerPlacement.house || next.traditionalRulerHouse;
        }

        if (nextModernRuler && (!currentMetadata || base.modernRulerBody === modernRulerForSign(base.placementSign) || !base.modernRulerBody.trim())) {
          const modernPlacement = rulerPlacementForRecord(record, nextModernRuler);
          next.modernRulerBody = nextModernRuler;
          next.modernRulerSign = modernPlacement.sign || next.modernRulerSign;
          next.modernRulerHouse = modernPlacement.house || next.modernRulerHouse;
        } else if (!nextModernRuler) {
          next.modernRulerBody = "";
          next.modernRulerSign = "";
          next.modernRulerHouse = "";
        }
      }

      if (updates.placementBody !== undefined && isNodePlacement(updates.placementBody)) {
        next.placementRetrograde = false;
      }

      return next;
    });
  }

  function closeReviewDrawer() {
    cancelReviewEdit();
    setSelectedReviewId(null);
  }

function factsWithReviewMetadata(record: AdminReviewRecord, metadata: AdminReviewMetadataEdit) {
  const nextFacts: Record<string, unknown> = {
    ...(record.facts ?? {})
  };

    if (metadata.orb.trim()) {
      const numericOrb = Number(metadata.orb);
      nextFacts.orb = Number.isFinite(numericOrb) ? numericOrb : metadata.orb.trim();
    } else {
      delete nextFacts.orb;
    }

    if (metadata.direction.trim()) {
      nextFacts.direction = metadata.direction.trim();
    } else {
      delete nextFacts.direction;
    }

    const setFactAliases = (value: string, keys: string[]) => {
      const normalizedValue = value.trim();

      keys.forEach((key) => {
        if (normalizedValue) {
          nextFacts[key] = normalizedValue;
        } else {
          delete nextFacts[key];
        }
      });
    };

    const setBooleanAliases = (value: boolean | null, keys: string[]) => {
      keys.forEach((key) => {
        if (value === null) {
          delete nextFacts[key];
        } else {
          nextFacts[key] = value;
        }
      });
    };

    setFactAliases(metadata.body1, ["body1", "planetA", "from"]);
    setFactAliases(metadata.sign1, ["sign1", "fromSign", "transitSign", "planetASign"]);
    setFactAliases(metadata.house1, ["house1", "fromHouse", "planetAHouse"]);
    setFactAliases(metadata.aspect, ["aspect", "type", "aspectType"]);
    setFactAliases(metadata.body2, ["body2", "planetB", "to"]);
    setFactAliases(metadata.sign2, ["sign2", "toSign", "natalSign", "planetBSign"]);
    setFactAliases(metadata.house2, ["house2", "toHouse", "planetBHouse"]);
    setFactAliases(metadata.placementSign, ["placementSign", "planetSign", "sign"]);
    setFactAliases(metadata.placementBody, ["planet", "body", "point", "node", "placementBody"]);
    setFactAliases(metadata.placementHouse, ["house", "placementHouse"]);
    setBooleanAliases(isNodePlacement(metadata.placementBody) ? null : metadata.placementRetrograde, ["retrograde", "isRetrograde"]);
    setFactAliases(metadata.rulerBody, ["ruler", "rulerBody", "houseRuler"]);
    setFactAliases(metadata.rulerSign, ["rulerSign", "houseRulerSign"]);
    setFactAliases(metadata.rulerHouse, ["rulerHouse", "houseRulerHouse"]);
    setFactAliases(metadata.traditionalRulerBody || metadata.rulerBody, ["traditionalRuler", "traditionalRulerBody"]);
    setFactAliases(metadata.traditionalRulerSign || metadata.rulerSign, ["traditionalRulerSign"]);
    setFactAliases(metadata.traditionalRulerHouse || metadata.rulerHouse, ["traditionalRulerHouse"]);
    setFactAliases(metadata.modernRulerBody, ["modernRuler", "modernRulerBody"]);
    setFactAliases(metadata.modernRulerSign, ["modernRulerSign"]);
    setFactAliases(metadata.modernRulerHouse, ["modernRulerHouse"]);
    setFactAliases(metadata.lunarArcLayer, ["lunarArcLayer", "arcLayer", "moonArcLayer"]);
    setFactAliases(metadata.lunarSource, ["lunarSource", "dashboardSource", "sourceFamily"]);
    setFactAliases(metadata.practice, ["practice"]);
    setFactAliases(metadata.reflect, ["reflect", "reflection"]);
    setFactAliases(metadata.ritual, ["ritual"]);
    setFactAliases(metadata.callback, ["callback", "cycleCallback"]);
    nextFacts.rulers = [
      (metadata.traditionalRulerBody || metadata.rulerBody) ? {
        system: "traditional",
        body: metadata.traditionalRulerBody || metadata.rulerBody,
        sign: metadata.traditionalRulerSign || metadata.rulerSign || undefined,
        house: metadata.traditionalRulerHouse || metadata.rulerHouse || undefined
      } : null,
      metadata.modernRulerBody ? {
        system: "modern",
        body: metadata.modernRulerBody,
        sign: metadata.modernRulerSign || undefined,
        house: metadata.modernRulerHouse || undefined
      } : null
    ].filter(Boolean);

    return nextFacts;
  }

  function modularNatalReviewPayload(record: AdminReviewRecord, metadata: AdminReviewMetadataEdit) {
    const blockType = metadata.blockType;
    const trimmedBody = metadata.placementBody.trim();
    const trimmedSign = metadata.placementSign.trim();
    const trimmedHouse = metadata.placementHouse.trim();
    const trimmedRuler = metadata.rulerBody.trim();
    const trimmedAspect = metadata.aspect.trim().toLowerCase();
    const trimmedBody1 = metadata.body1.trim();
    const trimmedBody2 = metadata.body2.trim();
    const baseFacts = factsWithReviewMetadata(record, metadata);
    const base = {
      blockType,
      contentKey: record.contentKey,
      eventType: record.eventType || "manual-review",
      facts: baseFacts,
      promptVersion: metadata.category === "Natal Chart"
        ? "natal-placement-v2"
        : metadata.category === "Natal Angles"
          ? "natal-angle-v1"
          : undefined
    };

    if (metadata.surface === "natal" && blockType === "placement" && trimmedBody && trimmedSign && trimmedHouse) {
      return {
        ...base,
        contentKey: natalPlacementContentKey(trimmedBody, trimmedSign, trimmedHouse),
        eventType: "natal-placement",
        facts: {
          ...baseFacts,
          blockType,
          type: "natal-placement",
          body: trimmedBody,
          planet: trimmedBody,
          placementBody: trimmedBody,
          sign: trimmedSign,
          placementSign: trimmedSign,
          house: trimmedHouse,
          placementHouse: trimmedHouse,
          retrograde: metadata.placementRetrograde,
          ruler: trimmedRuler || undefined,
          rulerBody: trimmedRuler || undefined,
          rulerSign: metadata.rulerSign.trim() || undefined,
          rulerHouse: metadata.rulerHouse.trim() || undefined,
          traditionalRuler: metadata.traditionalRulerBody.trim() || trimmedRuler || undefined,
          traditionalRulerBody: metadata.traditionalRulerBody.trim() || trimmedRuler || undefined,
          traditionalRulerSign: metadata.traditionalRulerSign.trim() || metadata.rulerSign.trim() || undefined,
          traditionalRulerHouse: metadata.traditionalRulerHouse.trim() || metadata.rulerHouse.trim() || undefined,
          modernRuler: metadata.modernRulerBody.trim() || undefined,
          modernRulerBody: metadata.modernRulerBody.trim() || undefined,
          modernRulerSign: metadata.modernRulerSign.trim() || undefined,
          modernRulerHouse: metadata.modernRulerHouse.trim() || undefined
        },
        promptVersion: "natal-placement-v2"
      };
    }

    if (metadata.surface === "natal" && blockType === "angle" && trimmedBody && trimmedSign) {
      return {
        ...base,
        contentKey: natalAngleContentKey(trimmedBody, trimmedSign),
        eventType: "natal-angle-placement",
        facts: {
          ...baseFacts,
          blockType,
          type: "natal-angle-placement",
          angle: trimmedBody,
          body: trimmedBody,
          point: trimmedBody,
          placementBody: trimmedBody,
          sign: trimmedSign,
          placementSign: trimmedSign
        },
        promptVersion: "natal-angle-v1"
      };
    }

    if (metadata.surface === "sky" && blockType === "lunar_calendar") {
      const titleSlug = slugContentPart(record.title || record.contentKey || "lunar-calendar");
      const dateSlug = slugContentPart(metadata.targetDate.trim() || record.targetDate || dateInputValue());
      const arcSlug = slugContentPart(metadata.lunarArcLayer.trim() || "lunar");

      return {
        ...base,
        contentKey: `sky.lunar.${arcSlug}.${titleSlug}.${dateSlug}`,
        eventType: "lunar-calendar",
        facts: {
          ...baseFacts,
          blockType,
          type: "lunar-calendar",
          title: record.title,
          headline: record.title,
          targetDate: metadata.targetDate.trim() || record.targetDate || undefined,
          lunarArcLayer: metadata.lunarArcLayer.trim() || undefined,
          lunarSource: metadata.lunarSource.trim() || undefined,
          dashboardSource: metadata.lunarSource.trim() || undefined,
          practice: metadata.practice.trim() || undefined,
          reflect: metadata.reflect.trim() || undefined,
          ritual: metadata.ritual.trim() || undefined,
          callback: metadata.callback.trim() || undefined
        },
        promptVersion: "sky-lunar-calendar-v1"
      };
    }

    if (metadata.surface === "sky" && blockType === "sky_article") {
      const titleSlug = slugContentPart(record.title || record.contentKey || "upcoming-transit");
      const dateSlug = slugContentPart(metadata.targetDate.trim() || record.targetDate || dateInputValue());

      return {
        ...base,
        contentKey: `sky.article.${titleSlug}.${dateSlug}`,
        eventType: "upcoming-transit-article",
        facts: {
          ...baseFacts,
          blockType,
          type: "upcoming-transit-article",
          title: record.title,
          headline: record.title,
          targetDate: metadata.targetDate.trim() || record.targetDate || undefined
        },
        promptVersion: "sky-upcoming-transit-article-v1"
      };
    }

    if (blockType === "all" || blockType === "essay") {
      return base;
    }

    if (metadata.surface === "natal" && blockType === "sign" && trimmedBody && trimmedSign) {
      return {
        ...base,
        contentKey: natalSignContentKey(trimmedBody, trimmedSign),
        eventType: "natal-sign-block",
        facts: {
          blockType,
          body: trimmedBody,
          planet: trimmedBody,
          sign: trimmedSign
        },
        promptVersion: "natal-sign-block-v1"
      };
    }

    if (metadata.surface === "natal" && blockType === "house" && trimmedBody && trimmedHouse) {
      return {
        ...base,
        contentKey: natalHouseContentKey(trimmedBody, trimmedHouse),
        eventType: "natal-house-block",
        facts: {
          blockType,
          body: trimmedBody,
          planet: trimmedBody,
          house: trimmedHouse
        },
        promptVersion: "natal-house-block-v1"
      };
    }

    if (metadata.surface === "natal" && blockType === "ruler" && trimmedRuler) {
      return {
        ...base,
        contentKey: natalRulerContentKey(trimmedRuler),
        eventType: "natal-ruler-block",
        facts: {
          blockType,
          body: trimmedRuler,
          planet: trimmedRuler,
          ruler: trimmedRuler
        },
        promptVersion: "natal-ruler-block-v1"
      };
    }

    if (metadata.surface === "natal" && blockType === "natal_aspect" && trimmedBody1 && trimmedAspect && trimmedBody2) {
      return {
        ...base,
        contentKey: natalAspectContentKey(trimmedBody1, trimmedAspect, trimmedBody2),
        eventType: "natal-aspect",
        facts: {
          ...baseFacts,
          blockType,
          body1: trimmedBody1,
          planetA: trimmedBody1,
          from: trimmedBody1,
          aspect: trimmedAspect,
          type: trimmedAspect,
          aspectType: trimmedAspect,
          body2: trimmedBody2,
          planetB: trimmedBody2,
          to: trimmedBody2
        },
        promptVersion: "natal-aspect-block-v1"
      };
    }

    if (metadata.surface === "sky" && blockType === "sky_aspect" && trimmedBody1 && trimmedAspect && trimmedBody2) {
      return {
        ...base,
        contentKey: skyAspectContentKey(trimmedBody1, trimmedAspect, trimmedBody2),
        eventType: "current-aspect",
        facts: {
          ...baseFacts,
          blockType,
          body1: trimmedBody1,
          planetA: trimmedBody1,
          from: trimmedBody1,
          aspect: trimmedAspect,
          type: trimmedAspect,
          aspectType: trimmedAspect,
          body2: trimmedBody2,
          planetB: trimmedBody2,
          to: trimmedBody2
        },
        promptVersion: "sky-aspect-block-v1"
      };
    }

    if (metadata.surface === "you" && blockType === "transit_to_natal_aspect" && trimmedBody1 && trimmedAspect && trimmedBody2) {
      return {
        ...base,
        contentKey: transitToNatalAspectContentKey(trimmedBody1, trimmedAspect, trimmedBody2),
        eventType: "transit-to-natal",
        facts: {
          ...baseFacts,
          blockType,
          transiting: trimmedBody1,
          transitPlanet: trimmedBody1,
          body1: trimmedBody1,
          aspect: trimmedAspect,
          type: trimmedAspect,
          aspectType: trimmedAspect,
          natal: trimmedBody2,
          natalPoint: trimmedBody2,
          body2: trimmedBody2
        },
        promptVersion: "transit-to-natal-aspect-v1"
      };
    }

    if ((metadata.surface === "synastry" || metadata.surface === "relationship") && blockType === "synastry_aspect" && trimmedBody1 && trimmedAspect && trimmedBody2) {
      return {
        ...base,
        contentKey: synastryAspectContentKey(trimmedBody1, trimmedAspect, trimmedBody2),
        eventType: "synastry-aspect",
        facts: {
          ...baseFacts,
          blockType,
          personABody: trimmedBody1,
          planetA: trimmedBody1,
          body1: trimmedBody1,
          aspect: trimmedAspect,
          type: trimmedAspect,
          aspectType: trimmedAspect,
          personBBody: trimmedBody2,
          planetB: trimmedBody2,
          body2: trimmedBody2
        },
        promptVersion: "synastry-aspect-block-v1"
      };
    }

    if (metadata.surface === "composite" && blockType === "composite_aspect" && trimmedBody1 && trimmedAspect && trimmedBody2) {
      return {
        ...base,
        contentKey: compositeAspectContentKey(trimmedBody1, trimmedAspect, trimmedBody2),
        eventType: "composite-aspect",
        facts: {
          ...baseFacts,
          blockType,
          body1: trimmedBody1,
          planetA: trimmedBody1,
          from: trimmedBody1,
          aspect: trimmedAspect,
          type: trimmedAspect,
          aspectType: trimmedAspect,
          body2: trimmedBody2,
          planetB: trimmedBody2,
          to: trimmedBody2
        },
        promptVersion: "composite-aspect-block-v1"
      };
    }

    if (metadata.surface === "natal" && blockType === "synthesis" && trimmedBody && trimmedSign && trimmedHouse) {
      return {
        ...base,
        contentKey: `natal.synthesis.${record.contentKey.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase()}`,
        eventType: "natal-synthesis-block",
        facts: {
          blockType,
          body: trimmedBody,
          planet: trimmedBody,
          sign: trimmedSign,
          house: trimmedHouse,
          ruler: trimmedRuler || undefined,
          rulerSign: metadata.rulerSign.trim() || undefined,
          rulerHouse: metadata.rulerHouse.trim() || undefined,
          traditionalRuler: metadata.traditionalRulerBody.trim() || trimmedRuler || undefined,
          traditionalRulerSign: metadata.traditionalRulerSign.trim() || metadata.rulerSign.trim() || undefined,
          traditionalRulerHouse: metadata.traditionalRulerHouse.trim() || metadata.rulerHouse.trim() || undefined,
          modernRuler: metadata.modernRulerBody.trim() || undefined,
          modernRulerSign: metadata.modernRulerSign.trim() || undefined,
          modernRulerHouse: metadata.modernRulerHouse.trim() || undefined
        },
        promptVersion: "natal-synthesis-block-v1"
      };
    }

    return base;
  }

  async function saveReviewEdit(record: AdminReviewRecord, requestedStatus?: GeneratedContentStatus) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const isActiveEdit = editingReviewId === record.id;
      const metadata = isActiveEdit ? reviewEditMetadata ?? reviewMetadataForRecord(record) : reviewMetadataForRecord(record);
      const nextStatus = statusForReviewSave(record, requestedStatus ?? metadata.status);
      const nextSurface = metadata.surface;
      const nextMode = metadata.mode;
      const nextTargetDate = metadata.targetDate.trim() || null;
      const modularPayload = modularNatalReviewPayload(record, metadata);
      const nextEventType = modularPayload.eventType !== (record.eventType || "manual-review")
        ? modularPayload.eventType
        : metadata.category !== contentCategoryLabel(record)
          ? manualEntryEventType(metadata.category, nextSurface)
          : record.eventType || "manual-review";
      const nextFacts = modularPayload.facts;

      const normalizedCopy = normalizeReviewCopy(
        isActiveEdit ? reviewEditSummary : reviewTldrForReview(record),
        isActiveEdit ? reviewEditBody : readerFacingTextForReview(record),
        readerFacingTextForReview(record)
      );
      const nextBody = normalizedCopy.body;
      const nextSummary = normalizedCopy.summary;
      const nextTitle = (isActiveEdit ? reviewEditTitle : record.title).trim() || record.title;
      const existingGlobalRowId = savedGlobalRowId(record);
      const nextKnowledgeIds = knowledgeIdsForReviewRecord(record);
      const nextContentKey = existingGlobalRowId ? record.contentKey : modularPayload.contentKey;
      const nextPromptVersion = promptVersionForReviewSave(record, modularPayload.promptVersion);
      const metaphorFlags = findMetaphorPhraseFlags(
        [
          nextTitle,
          nextSummary,
          nextBody,
          ...record.sections.flatMap((section) => [section.heading, section.body])
        ].join("\n"),
        nextContentKey
      );
      const metaphorReviewerNote = metaphorFlags.length
        ? `Metaphor phrasebook flags: ${metaphorFlags.map((flag) => `${flag.contentKey}: "${flag.phrase}" in "${flag.sentence}"`).join(" | ")}`
        : "";
      const nextReviewerNotes = [
        record.reviewerNotes ?? "",
        metaphorReviewerNote
      ].filter((item) => item.trim()).join("\n");

      if (record.source === "private" && record.rawPrivateRow) {
        const payload = await adminJsonRequest<{ ok: boolean; rows: AdminUserGeneratedContentRow[] }>(
          "/api/admin/user-generated-content",
          secret,
          {
            method: "PATCH",
              body: JSON.stringify({
                id: record.rawPrivateRow.id,
                status: nextStatus,
                headline: nextTitle,
                summary: nextSummary,
              body: nextBody
            })
          }
        );
        const row = payload.rows?.[0] ?? null;

        setReviewRecords((currentRecords) => currentRecords.map((currentRecord) => (
          currentRecord.id === record.id
            ? {
                ...currentRecord,
                status: nextStatus,
                title: nextTitle,
                summary: nextSummary,
                body: nextBody,
                updatedAt: row?.updated_at ?? new Date().toISOString(),
                rawPrivateRow: row ?? currentRecord.rawPrivateRow
            }
            : currentRecord
        )));
        setLocalDraftReviewRecords((currentRecords) => currentRecords.filter(
          (currentRecord) => currentRecord.id !== record.id && currentRecord.contentKey !== record.contentKey
        ));
        setEditingReviewId(null);
        setMessage(nextStatus === "LIVE" ? "Published this personal content row." : "Saved personal content edits.");
        showSaveToast(nextStatus === "LIVE" ? "Published" : "Personal content saved");
        return;
      }

      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: existingGlobalRowId ? "PATCH" : "POST",
          body: JSON.stringify({
            id: existingGlobalRowId || undefined,
            contentKey: nextContentKey,
            surface: nextSurface,
            mode: nextMode,
            status: nextStatus,
            eventType: nextEventType,
            targetDate: nextTargetDate,
            headline: nextTitle,
            summary: nextSummary,
            body: nextBody,
            sections: record.sections,
            facts: nextFacts,
            sourceSnapshot: {
              ...(record.sourceSnapshot ?? {}),
              adminReviewSource: record.source,
              savedFromReviewRecordId: record.id
            },
            knowledgeIds: nextKnowledgeIds,
            reviewerNotes: nextReviewerNotes,
            promptVersion: nextPromptVersion,
            blockType: modularPayload.blockType === "all" ? undefined : modularPayload.blockType
          })
        }
      );
      const row = payload.rows?.[0] ?? null;

      if (row) {
        setSelectedId(row.id);
        setDraft(adminDraftFromRow(row));
      }

      setReviewRecords((currentRecords) => currentRecords.map((currentRecord) => (
        currentRecord.id === record.id
          ? {
              ...currentRecord,
              source: "global",
              surface: nextSurface,
              mode: nextMode,
              status: nextStatus,
              eventType: nextEventType,
              contentKey: nextContentKey,
              title: nextTitle,
              targetDate: nextTargetDate,
              summary: nextSummary,
              body: nextBody,
              facts: nextFacts,
              knowledgeIds: row?.knowledge_ids ?? nextKnowledgeIds,
              sourceSnapshot: row?.source_snapshot ?? currentRecord.sourceSnapshot,
              promptVersion: row?.prompt_version ?? nextPromptVersion ?? currentRecord.promptVersion,
              reviewerNotes: row?.reviewer_notes ?? nextReviewerNotes,
              evergreen: Boolean(row?.evergreen ?? currentRecord.evergreen),
              evergreenAt: row?.evergreen_at ?? currentRecord.evergreenAt,
              evergreenBy: row?.evergreen_by ?? currentRecord.evergreenBy,
              rawGlobalRow: row ?? currentRecord.rawGlobalRow
            }
          : currentRecord
      )));
      setLocalDraftReviewRecords((currentRecords) => currentRecords.filter(
        (currentRecord) => currentRecord.id !== record.id && currentRecord.contentKey !== record.contentKey
      ));
      setEditingReviewId(null);
      setMessage(metaphorFlags.length
        ? `Saved with ${metaphorFlags.length} phrase-book flag${metaphorFlags.length === 1 ? "" : "s"} for editorial review.`
        : nextStatus === "LIVE" ? "Saved changes to published copy." : nextStatus === "REVIEWED" ? "Approved this copy for review." : row ? "Saved edits as a draft." : "Saved edits.");
      showSaveToast(metaphorFlags.length
        ? "Saved with wording flags"
        : nextStatus === "LIVE" ? "Published changes saved" : nextStatus === "REVIEWED" ? "Approved for review" : "Draft saved");
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not save edits."));
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteReviewRecord(record: AdminReviewRecord) {
    const existingGlobalRowId = savedGlobalRowId(record);

    if (!existingGlobalRowId) {
      if (!window.confirm("Discard this unsaved content entry?")) {
        return;
      }

      setLocalDraftReviewRecords((currentRecords) => currentRecords.filter(
        (currentRecord) => currentRecord.id !== record.id && currentRecord.contentKey !== record.contentKey
      ));
      setReviewRecords((currentRecords) => currentRecords.filter(
        (currentRecord) => currentRecord.id !== record.id && currentRecord.contentKey !== record.contentKey
      ));
      cancelReviewEdit();
      setSelectedReviewId(null);
      setMessage("Discarded unsaved content entry.");
      return;
    }

    if (record.status === "LIVE") {
      setMessage("Demote to DRAFT before deleting.");
      return;
    }

    if (!window.confirm("Delete this content row? This cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?id=${encodeURIComponent(existingGlobalRowId)}`,
        secret,
        { method: "DELETE" }
      );
      setLocalDraftReviewRecords((currentRecords) => currentRecords.filter(
        (currentRecord) => currentRecord.id !== record.id && currentRecord.contentKey !== record.contentKey
      ));
      setReviewRecords((currentRecords) => currentRecords.filter(
        (currentRecord) => currentRecord.id !== record.id && currentRecord.contentKey !== record.contentKey
      ));
      setDraft(createAdminDraft(surface));
      setSelectedId(null);
      cancelReviewEdit();
      setSelectedReviewId(null);
      setMessage("Deleted content row.");
      await loadRows();
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not delete content row."));
    } finally {
      setIsLoading(false);
    }
  }

  function showReviewDraftValidationError(record: AdminReviewRecord, message: string, violations: string[] = []) {
    setReviewDraftResults((currentResults) => ({
      ...currentResults,
      [record.id]: {
        editStatus: "needs_generation",
        sourceType: "generation_failed",
        provider: reviewGenerationProvider,
        retryCount: 0,
        violations,
        softWarnings: [],
        styleNotes: [],
        errorType: "validation_error",
        error: message
      }
    }));
    setMessage(message);
  }

  async function generateReviewDraft(record: AdminReviewRecord) {
    if (!canUseApi) {
      showReviewDraftValidationError(record, "Add the content generation secret first.");
      return;
    }

    const metadata = editingReviewId === record.id
      ? reviewEditMetadata ?? reviewMetadataForRecord(record)
      : reviewMetadataForRecord(record);
    const modularPayload = modularNatalReviewPayload(record, metadata);
    const nextFacts = modularPayload.facts;

    const missingNatalPlacementFields = [
      !metadata.placementBody.trim() ? "placement body" : "",
      !metadata.placementSign.trim() ? "placement sign" : "",
      !metadata.placementHouse.trim() ? "placement house" : "",
      !metadata.rulerSign.trim() ? "ruler sign" : "",
      !metadata.rulerHouse.trim() ? "ruler house" : ""
    ].filter(Boolean);

    if (
      metadata.surface === "natal"
      && (metadata.blockType === "all" || metadata.blockType === "essay" || metadata.blockType === "placement")
      && missingNatalPlacementFields.length > 0
    ) {
      beginReviewEdit(record);
      setReviewEditMetadata(metadata);
      showReviewDraftValidationError(
        record,
        `Missing required natal placement metadata: ${missingNatalPlacementFields.join(", ")}. The ruler placement comes from this chart, not the sign.`,
        missingNatalPlacementFields
      );
      return;
    }

    if (metadata.surface === "natal" && metadata.blockType === "sign" && (!metadata.placementBody.trim() || !metadata.placementSign.trim())) {
      beginReviewEdit(record);
      setReviewEditMetadata(metadata);
      showReviewDraftValidationError(record, "Sign blocks need only the body and sign before generating.");
      return;
    }

    if (metadata.surface === "natal" && metadata.blockType === "house" && (!metadata.placementBody.trim() || !metadata.placementHouse.trim())) {
      beginReviewEdit(record);
      setReviewEditMetadata(metadata);
      showReviewDraftValidationError(record, "House blocks need only the body and house before generating.");
      return;
    }

    if (metadata.surface === "natal" && metadata.blockType === "ruler" && !metadata.rulerBody.trim()) {
      beginReviewEdit(record);
      setReviewEditMetadata(metadata);
      showReviewDraftValidationError(record, "Ruler blocks need only the ruling body before generating.");
      return;
    }

    if (metadata.blockType.endsWith("_aspect") && (!metadata.body1.trim() || !metadata.aspect.trim() || !metadata.body2.trim())) {
      beginReviewEdit(record);
      setReviewEditMetadata(metadata);
      showReviewDraftValidationError(record, "Aspect blocks need body A, aspect, and body B before generating.");
      return;
    }

    setEditingReviewId(record.id);
    setReviewEditTitle(record.title);
    setReviewEditSummary(reviewTldrForReview(record));
    setReviewEditBody(readerFacingTextForReview(record));
    setReviewEditMetadata(metadata);
    setIsGeneratingReviewDraft(true);
    const nextKnowledgeIds = knowledgeIdsForReviewRecord(record);
    const existingGlobalRowId = savedGlobalRowId(record);
    const nextContentKey = existingGlobalRowId ? record.contentKey : modularPayload.contentKey;
    const nextPromptVersion = promptVersionForReviewSave(record, modularPayload.promptVersion);
    setReviewDraftResults((currentResults) => {
      const nextResults = { ...currentResults };
      delete nextResults[record.id];
      return nextResults;
    });
    setMessage("Generating an admin draft from approved natal source context.");
    try {
      const payload = await adminJsonRequest<{
        ok: boolean;
        generated: {
          headline?: string;
          tldr?: string;
          summary?: string;
          body?: string;
          sections?: Array<{ heading: string; body: string }>;
        model?: string;
        qualityWarning?: string;
        retryCount?: number;
        softWarnings?: string[];
        styleNotes?: string[];
      };
        saved?: AdminGeneratedContentRow[];
        adminDraft?: AdminDraftResult;
      }>(
        "/api/generate-content",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            contentKey: nextContentKey,
            surface: metadata.surface,
            mode: metadata.mode,
            eventType: modularPayload.eventType,
            headline: record.title,
            targetDate: metadata.targetDate.trim() || record.targetDate || undefined,
            facts: {
              ...nextFacts,
              adminGenerationMode: "admin_draft"
            },
            sourceSnapshot: {
              ...(record.sourceSnapshot ?? {}),
              promptVersion: nextPromptVersion,
              adminReviewSource: record.source,
              generatedFromReviewRecordId: record.id
            },
            knowledgeIds: nextKnowledgeIds,
            provider: reviewGenerationProvider,
            allowQualityFallback: true,
            blockType: modularPayload.blockType === "all" ? undefined : modularPayload.blockType,
            voiceNotes: voiceNotesForReviewRecord(record)
          })
        }
      );
      const generated = payload.generated;
      const savedRow = payload.saved?.[0] ?? null;
      const nextTitle = generated.headline?.trim() || record.title;
      const normalizedGeneratedCopy = normalizeGeneratedDraftCopy(generated, fallbackReaderTextForReview(record));
      const nextSummary = normalizedGeneratedCopy.summary;
      const nextBody = normalizedGeneratedCopy.body;
      const generationResult = payload.adminDraft ?? {
        title: nextTitle,
        draftBody: nextBody,
        editStatus: "needs_review",
        sourceType: "generated_draft",
        sourceIds: [],
        provider: reviewGenerationProvider,
        model: generated.model ?? null,
        retryCount: generated.retryCount ?? null,
        violations: [],
        softWarnings: generated.softWarnings ?? [],
        styleNotes: generated.styleNotes ?? []
      };

      setEditingReviewId(record.id);
      setReviewEditTitle(nextTitle);
      setReviewEditSummary(nextSummary || nextBody.split(/\n+/)[0]?.trim() || nextBody);
      setReviewEditBody(nextBody);
      setReviewDraftResults((currentResults) => ({
        ...currentResults,
        [record.id]: generationResult,
        ...(savedRow ? { [savedRow.id]: generationResult } : {})
      }));
      setReviewRecords((currentRecords) => currentRecords.map((currentRecord) => (
        currentRecord.id === record.id
          ? {
              ...currentRecord,
              source: savedRow ? "global" : currentRecord.source,
              status: savedRow?.status ?? "DRAFT",
              title: nextTitle,
              summary: nextSummary,
              body: nextBody,
              contentKey: savedRow?.content_key ?? currentRecord.contentKey,
              eventType: savedRow?.event_type ?? currentRecord.eventType,
              targetDate: savedRow?.target_date ?? currentRecord.targetDate,
              facts: savedRow?.facts ?? currentRecord.facts,
              knowledgeIds: savedRow?.knowledge_ids ?? currentRecord.knowledgeIds,
              sourceSnapshot: savedRow?.source_snapshot ?? currentRecord.sourceSnapshot,
              sections: generated.sections ?? currentRecord.sections,
              model: generated.model ?? currentRecord.model,
              promptVersion: savedRow?.prompt_version ?? nextPromptVersion ?? currentRecord.promptVersion,
              rawGlobalRow: savedRow ?? currentRecord.rawGlobalRow
            }
          : currentRecord
      )));
      if (savedRow) {
        setSelectedId(savedRow.id);
        setDraft(adminDraftFromRow(savedRow));
      }
      setMessage(generated.qualityWarning
        ? `Generated a ${reviewGenerationProvider === "claude" ? "Claude" : "OpenAI"} draft with an editorial warning: ${generated.qualityWarning}`
        : `Generated and saved a ${reviewGenerationProvider === "claude" ? "Claude" : "OpenAI"} draft. Approve it when it looks right.`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      const payload = error instanceof AdminRequestError && error.payload && typeof error.payload === "object"
        ? error.payload as { adminDraft?: AdminDraftResult; errorType?: string; error?: string; violations?: string[] }
        : null;
      setReviewDraftResults((currentResults) => ({
        ...currentResults,
        [record.id]: {
          ...(payload?.adminDraft ?? {}),
          errorType: payload?.errorType,
          error: payload?.error ?? adminErrorMessage(error, "Could not generate a review draft."),
          violations: payload?.adminDraft?.violations ?? payload?.violations ?? [],
          softWarnings: payload?.adminDraft?.softWarnings ?? [],
          styleNotes: payload?.adminDraft?.styleNotes ?? []
        }
      }));
      setMessage(adminErrorMessage(error, "Could not generate a review draft."));
    } finally {
      setIsGeneratingReviewDraft(false);
    }
  }

  function updateDraft<K extends keyof AdminGeneratedContentDraft>(key: K, value: AdminGeneratedContentDraft[K]) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value
    }));
  }

  function updateVoiceTemplate(surfaceKey: VoiceTemplateSurface, key: keyof VoiceTemplateConfig, value: string) {
    setVoiceTemplates((currentTemplates) => ({
      ...currentTemplates,
      [surfaceKey]: {
        ...currentTemplates[surfaceKey],
        [key]: value
      }
    }));
  }

  async function saveVoiceTemplates() {
    try {
      window.localStorage.setItem(adminVoiceTemplateStorageKey, JSON.stringify(voiceTemplates));
    } catch {
      setMessage("Could not save voice templates in this browser.");
      return;
    }

    if (!canUseApi) {
      setVoiceSettingsLoadedFromDb(false);
      setMessage("Voice templates saved in this browser. Add the admin secret to save them for other browsers.");
      showSaveToast("Voice templates saved");
      return;
    }

    setIsLoading(true);
    try {
      const result = await saveVoiceTemplateRows(voiceTemplates);
      setVoiceSettingsLoadedFromDb(true);
      setMessage(`Voice templates saved. ${result?.rows.length ?? 0} admin setting rows updated.`);
      showSaveToast("Voice templates saved");
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Voice templates were saved locally, but not to admin rows."));
    } finally {
      setIsLoading(false);
    }
  }

  async function resetActiveVoiceTemplate() {
    const nextTemplates = {
      ...voiceTemplates,
      [activeTemplateSurface]: defaultVoiceTemplates[activeTemplateSurface]
    };

    setVoiceTemplates(nextTemplates);
    try {
      window.localStorage.setItem(adminVoiceTemplateStorageKey, JSON.stringify(nextTemplates));
    } catch {
      setMessage("Could not reset voice templates in this browser.");
      return;
    }

    if (!canUseApi) {
      setVoiceSettingsLoadedFromDb(false);
      setMessage(`${voiceTemplateLabels[activeTemplateSurface]} voice template reset in this browser.`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await saveVoiceTemplateRows(nextTemplates);
      setVoiceSettingsLoadedFromDb(true);
      setMessage(`${voiceTemplateLabels[activeTemplateSurface]} voice template reset. ${result?.rows.length ?? 0} admin setting rows updated.`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Voice template reset locally, but not in admin rows."));
    } finally {
      setIsLoading(false);
    }
  }

  function voiceNotesFor(surface: GeneratedContentSurface, eventType: string | null | undefined, reviewerNotes = "", contentKey = "") {
    const surfaceKey = templateSurfaceFor(surface, eventType ?? undefined, contentKey);
    const config = voiceTemplates[surfaceKey];
    const template = config.template.trim();
    const generationGuide = config.generationGuide.trim();
    const bannedWords = config.bannedWords.trim();
    const phraseBank = config.phraseBank.trim();
    const rowNotes = reviewerNotes.trim();

    return [
      template ? `SURFACE VOICE TEMPLATE (${voiceTemplateLabels[surfaceKey]})\n${template}` : "",
      generationGuide ? `AI GENERATION GUIDE\nFollow these interpretation rules for this content type:\n${generationGuide}` : "",
      bannedWords ? `BANNED WORDS AND PHRASES\nDo not use these words, phrases, constructions, or close variants:\n${bannedWords}` : "",
      phraseBank ? `LANGUAGE AND PHRASE BANK\nPrefer this kind of language when it fits the facts. Do not force every phrase:\n${phraseBank}` : "",
      rowNotes ? `ROW-SPECIFIC EDITORIAL NOTES\n${rowNotes}` : ""
    ].filter(Boolean).join("\n\n");
  }

  function voiceNotesForDraft(draftWithFacts: AdminGeneratedContentDraft) {
    return voiceNotesFor(draftWithFacts.surface, draftWithFacts.eventType, draftWithFacts.reviewerNotes, draftWithFacts.contentKey);
  }

  function voiceNotesForReviewRecord(record: AdminReviewRecord) {
    const baseNotes = voiceNotesFor(record.surface, record.eventType, record.reviewerNotes ?? "", record.contentKey);

    if (record.surface === "natal") {
      return [
        baseNotes,
        "Write this as natal birth-chart interpretation, not current sky, transit, horoscope, or timing content.",
        "Use the selected natal placement facts and authored astrology source material as the anchor. Keep the copy traceable to the planet, sign, house, ruler, and natal aspects when present.",
        "Do not use visible scaffold labels or section headings inside the reader-facing body, including TLDR, Planetary meaning, How it may show up, How to work with it, Timing, Reflection, or Integration.",
        "Do not write seasonal or active-timing language such as right now, today, this week, current season, next few weeks, this window, strongest around, or during this transit.",
        "For natal placement pages, write in continuous paragraphs. The copy should describe the enduring pattern in the chart and how it can show up in lived experience.",
        "Do not mention schemas, source records, APIs, dashboards, generation process, or backend details."
      ].filter(Boolean).join("\n\n");
    }

    if (record.surface === "sky" && contentBlockType(record) === "lunar_calendar") {
      return [
        baseNotes,
        "Write this as lunar calendar content for the Sky area, not as a generic transit article.",
        "Use authored lunation, season, and sign material as the source family when available.",
        "If an arc layer is provided, honor it: season, New Moon seed, current checkpoint, or Full Moon culmination.",
        "The editor may provide practice, reflect, ritual, and callback fields. Use them as optional editorial material, but do not force a ritual or reflection section when the field is empty.",
        "Write continuous reader-facing paragraphs. Do not expose backend field names, schemas, or dashboard labels inside the copy."
      ].filter(Boolean).join("\n\n");
    }

    if (record.mode === "article") {
      return [
        baseNotes,
        "Write a full upcoming transit article in the longform voice.",
        "Use longer, continuous paragraphs where one full thought deepens as it goes. Do not use punchy fragment stacks, bullets, or markdown headings inside the body.",
        "Do not use visible scaffold labels or section headings inside the reader-facing body, including TLDR, The Astrology, The Shadow, Permission, Integration, Collective Close, What You May Notice, What To Do, Home And Family, or Timing.",
        "Open with a clear human situation, then connect the transit to specific behavior, decisions, pressure points, and what changes in ordinary life.",
        "Name specific behavior rather than stacking emotional language.",
        "Do not use em dashes.",
        "Do not use: this transit invites you to, everything happens for a reason, gentle reminder, the universe is asking you to, hold space, sacred container, divine timing, trust the process, love and light, high vibes only, just be grateful, sit with that, honor your journey, step into your power.",
        "Do not use perform, performance, performing, shrink, or shrinking. Name the actual behavior instead.",
        "Do not mention schemas, source records, APIs, dashboards, generation process, or backend details."
      ].filter(Boolean).join("\n\n");
    }

    return [
      baseNotes,
      "Write a daily astrology transit interpretation in the TLDR Astro voice.",
      "Write clear continuous paragraphs, not bullets and not a visible template.",
      "Do not start the body with TLDR:, Planetary meaning:, How it may show up:, How to work with it:, Timing:, What You May Notice, What To Do, Reflection, Integration, or any similar scaffold label.",
      "In the TLDR paragraph, start with one plain-language situation the reader may notice. Mention the aspect and date only after the human situation is clear.",
      "Keep the factual astrology headline unchanged, but keep the first reader-facing sentence useful without astrology knowledge.",
      "Explain each planet in everyday terms, then explain what this aspect does to that pairing.",
      "Give 2-3 concrete life examples: a bill, boundary, conversation, deadline, commitment, choice, pattern, responsibility, relationship, work, money, emotions, or timing.",
      "Give practical guidance tied directly to the planets and aspect. Avoid slogans, productivity coaching, guru language, and therapist register.",
      "Use soft certainty: may, can, often, more likely, easier, harder.",
      "Avoid: not through X but through Y, this is not dramatic astrology, the invitation is, lean into, step into, honor, release, unlock, universe, cosmic, manifesting.",
      "Do not mention schemas, source records, APIs, dashboards, generation process, natal houses, or private personalization."
    ].filter(Boolean).join("\n\n");
  }

  function showQueue(nextStatus: GeneratedContentStatus | "all", nextSurface = surface) {
    const nextReviewSurface = reviewSurfaceForGeneratedSurface(nextSurface === "all" ? "sky" : nextSurface);

    setActivePage("content");
    setStatus(nextStatus);
    setContentStatusFilter(
      nextStatus === "LIVE"
        ? "LIVE"
        : nextStatus === "REVIEWED"
          ? "SCHEDULED"
          : nextStatus === "DRAFT"
            ? "DRAFT"
            : nextStatus === "ARCHIVED"
              ? "ARCHIVED"
              : "all"
    );
    setSurface(nextSurface);
    setSelectedId(null);
    setDraft(createAdminDraft(nextSurface));
    void loadReviewWorkspace(nextReviewSurface, nextStatus);
  }

  async function loadFactsForDraft(baseDraft = draft, options: { manageLoading?: boolean } = {}) {
    const shouldManageLoading = options.manageLoading ?? true;

    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return baseDraft;
    }

    if (baseDraft.surface !== "sky") {
      setMessage("Automatic fact loading is connected for Sky first. You can still save and edit other surfaces manually for now.");
      return baseDraft;
    }

    if (shouldManageLoading) {
      setIsLoading(true);
    }

    try {
      const payload = await adminJsonRequest<AdminContentFactsPayload>(
        "/api/admin/content-facts",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            contentKey: baseDraft.contentKey,
            surface: baseDraft.surface,
            mode: baseDraft.mode,
            eventType: baseDraft.eventType,
            targetDate: baseDraft.targetDate,
            headline: baseDraft.headline
          })
        }
      );
      const nextDraft: AdminGeneratedContentDraft = {
        ...baseDraft,
        contentKey: payload.contentKey,
        eventType: payload.eventType,
        targetDate: payload.targetDate,
        factsJson: JSON.stringify(payload.facts, null, 2),
        knowledgeIds: payload.knowledgeIds.join(", "),
        sourceSnapshotJson: JSON.stringify(payload.sourceSnapshot, null, 2)
      };

      setDraft(nextDraft);
      setAreGenerationInputsOpen(true);
      setMessage("Loaded the current Sky data for this draft.");
      return nextDraft;
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not load Sky data."));
      return baseDraft;
    } finally {
      if (shouldManageLoading) {
        setIsLoading(false);
      }
    }
  }

  function startNewContent() {
    const nextRecord = manualEntryRecord(categoryFilter, surface, contentBlockFilter);
    const nextMetadata = reviewMetadataForRecord(nextRecord);

    setLocalDraftReviewRecords((currentRecords) => prependDraftReviewRecord(currentRecords, nextRecord));
    setReviewRecords((currentRecords) => prependDraftReviewRecord(currentRecords, nextRecord));
    setReviewCounts((currentCounts) => ({
      ...currentCounts,
      total: currentCounts.total + 1,
      DRAFT: currentCounts.DRAFT + 1
    }));
    setSelectedReviewId(nextRecord.id);
    setEditingReviewId(nextRecord.id);
    setReviewEditTitle(nextRecord.title);
    setReviewEditSummary("");
    setReviewEditBody("");
    setReviewEditMetadata(nextMetadata);
    setSelectedId(null);
    setDraft(createAdminDraft(nextRecord.surface, nextRecord.targetDate ?? dateInputValue()));
    setSurface(nextRecord.surface);
    setStatus("DRAFT");
    setContentStatusFilter("DRAFT");
    setActivePage("content");
    setAreGenerationInputsOpen(true);
    setIsCreateMenuOpen(false);
    setMessage("New content entry ready. Choose its content type, then write or generate a draft.");
  }

  function startNewArticle() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const baseRecord = manualEntryRecord("Sky", "sky", "sky_article");
    const nextRecord: AdminReviewRecord = {
      ...baseRecord,
      id: `manual:article:${timestamp}`,
      title: "Untitled article",
      subtitle: `Article / Draft / ${adminDateLabel(baseRecord.targetDate)}`,
      contentKey: `sky.article.manual.${timestamp}`,
      eventType: "upcoming-transit-article",
      mode: "article",
      blockType: "sky_article",
      facts: {
        ...baseRecord.facts,
        source: "manual-article-entry",
        blockType: "sky_article",
        category: "Sky",
        type: "upcoming-transit-article"
      },
      sourceSnapshot: {
        ...baseRecord.sourceSnapshot,
        source: "admin-article-entry",
        contentType: "article",
        blockType: "sky_article",
        createdAt: now.toISOString()
      }
    };
    const nextMetadata = reviewMetadataForRecord(nextRecord);

    setLocalDraftReviewRecords((currentRecords) => prependDraftReviewRecord(currentRecords, nextRecord));
    setReviewRecords((currentRecords) => prependDraftReviewRecord(currentRecords, nextRecord));
    setReviewCounts((currentCounts) => ({
      ...currentCounts,
      total: currentCounts.total + 1,
      DRAFT: currentCounts.DRAFT + 1
    }));
    setSelectedReviewId(nextRecord.id);
    setEditingReviewId(nextRecord.id);
    setReviewEditTitle(nextRecord.title);
    setReviewEditSummary("");
    setReviewEditBody("");
    setReviewEditMetadata(nextMetadata);
    setSelectedId(null);
    setDraft(createAdminDraft("sky", nextRecord.targetDate ?? dateInputValue()));
    setSurface("sky");
    setStatus("DRAFT");
    setCategoryFilter("Sky");
    setContentBlockFilter("sky_article");
    setContentSourceFilter("all");
    setContentStatusFilter("DRAFT");
    setActivePage((currentPage) => currentPage === "articles" ? "articles" : "content");
    setAreGenerationInputsOpen(true);
    setIsCreateMenuOpen(false);
    setMessage("New article draft ready. Add the headline, summary, body, and article metadata, then save it as DRAFT.");
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>(".admin-editor-drawer .admin-title-field input")?.focus();
    }, 0);
  }

  async function createDraft() {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const facts = parseAdminJson(draft.factsJson, "Facts");
      const sourceSnapshot = parseAdminJson(draft.sourceSnapshotJson, "Source snapshot");
      const factsRecord = facts && typeof facts === "object" && !Array.isArray(facts) ? facts as Record<string, unknown> : {};
      const sourceSnapshotRecord = sourceSnapshot && typeof sourceSnapshot === "object" && !Array.isArray(sourceSnapshot) ? sourceSnapshot as Record<string, unknown> : {};
      const draftBlockType = typeof factsRecord.blockType === "string" && factsRecord.blockType.trim()
        ? factsRecord.blockType.trim()
        : typeof sourceSnapshotRecord.blockType === "string" && sourceSnapshotRecord.blockType.trim()
          ? sourceSnapshotRecord.blockType.trim()
          : draft.mode === "article" && draft.surface === "sky"
            ? "sky_article"
            : undefined;
      const draftPromptVersion = typeof sourceSnapshotRecord.promptVersion === "string" && sourceSnapshotRecord.promptVersion.trim()
        ? sourceSnapshotRecord.promptVersion.trim()
        : undefined;
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            contentKey: draft.contentKey,
            surface: draft.surface,
            mode: draft.mode,
            status: draft.status,
            eventType: draft.eventType,
            targetDate: draft.targetDate || null,
            headline: draft.headline,
            summary: draft.summary,
            body: draft.body,
            sections: parseAdminJson(draft.sectionsJson, "Sections"),
            facts,
            sourceSnapshot,
            ...(draftBlockType ? { blockType: draftBlockType } : {}),
            ...(draftPromptVersion ? { promptVersion: draftPromptVersion } : {}),
            knowledgeIds: draft.knowledgeIds.split(",").map((item) => item.trim()).filter(Boolean),
            reviewerNotes: draft.reviewerNotes
          })
        }
      );
      const row = payload.rows?.[0];

      if (row) {
        setSelectedId(row.id);
        setDraft(adminDraftFromRow(row));
      }

      setMessage("Draft created.");
      showSaveToast("Draft saved");
      await loadRows();
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not create draft."));
    } finally {
      setIsLoading(false);
    }
  }

  async function generateDraft() {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const draftWithFacts = hasUsableFacts(draft.factsJson)
        ? draft
        : await loadFactsForDraft(draft, { manageLoading: false });
      const payload = await adminJsonRequest<{
        ok: boolean;
        generated: {
          headline: string;
          tldr?: string;
          summary: string;
          body: string;
          sections: Array<{ heading: string; body: string }>;
        };
        saved: AdminGeneratedContentRow[];
      }>(
        "/api/generate-content",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            contentKey: draftWithFacts.contentKey,
            surface: draftWithFacts.surface,
            mode: draftWithFacts.mode,
            eventType: draftWithFacts.eventType,
            headline: draftWithFacts.headline,
            targetDate: draftWithFacts.targetDate || undefined,
            facts: parseAdminJson(draftWithFacts.factsJson, "Facts"),
            knowledgeIds: draftWithFacts.knowledgeIds.split(",").map((item) => item.trim()).filter(Boolean),
            sourceSnapshot: parseAdminJson(draftWithFacts.sourceSnapshotJson, "Source snapshot"),
            voiceNotes: voiceNotesForDraft(draftWithFacts)
          })
        }
      );
      const row = payload.saved?.[0];
      const normalizedGeneratedCopy = normalizeGeneratedDraftCopy(payload.generated, draftWithFacts.body || draft.body || draft.summary);
      const normalizedGeneratedRow = row
        ? {
            ...row,
            summary: normalizedGeneratedCopy.summary,
            body: normalizedGeneratedCopy.body
          }
        : null;

      if (normalizedGeneratedRow) {
        setSelectedId(normalizedGeneratedRow.id);
        setDraft(adminDraftFromRow(normalizedGeneratedRow));
      } else {
        setDraft((currentDraft) => ({
          ...currentDraft,
          headline: payload.generated.headline,
          summary: normalizedGeneratedCopy.summary,
          body: normalizedGeneratedCopy.body,
          sectionsJson: JSON.stringify(payload.generated.sections ?? [], null, 2)
        }));
      }

      setMessage("Generated a new draft.");
      await loadRows();
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not generate content."));
    } finally {
      setIsLoading(false);
    }
  }

  async function prepopulateContentQueue(requestedSurface: GeneratedContentSurfaceFilter = "sky") {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{
        ok: boolean;
        surface: GeneratedContentSurfaceFilter;
        targetDate: string;
        inserted: number;
        rows: AdminGeneratedContentRow[];
      }>(
        "/api/admin/prepopulate-content",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            surface: requestedSurface,
            targetDate: dateStart || dateInputValue()
          })
        }
      );
      const nextSurface = requestedSurface;
      const firstRow = payload.rows?.[0] ?? null;

      setSurface(nextSurface);
      setStatus("DRAFT");
      if (firstRow) {
        setSelectedId(firstRow.id);
        setDraft(adminDraftFromRow(firstRow));
      }
      setMessage(requestedSurface === "modifier"
        ? `Prepared ${payload.inserted} condition modifier draft rows.`
        : `Prepared ${payload.inserted} Sky draft rows for ${payload.targetDate}. Open each row and generate the reader-facing copy when you are ready.`);
      await loadRows("DRAFT", nextSurface);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not prepare draft rows."));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveDraft(nextStatus = draft.status) {
    if (nextStatus === "LIVE" && personalizedContentSurfaces.has(draft.surface)) {
      setMessage("Personalized content test rows cannot be published globally. Generate real user or bond scoped content instead.");
      return;
    }

    if (!draft.id) {
      await createDraft();
      return;
    }

    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "PATCH",
          body: JSON.stringify({
            id: draft.id,
            contentKey: draft.contentKey,
            surface: draft.surface,
            mode: draft.mode,
            eventType: draft.eventType,
            targetDate: draft.targetDate || null,
            status: nextStatus,
            headline: draft.headline,
            summary: draft.summary,
            body: draft.body,
            sections: parseAdminJson(draft.sectionsJson, "Sections"),
            facts: parseAdminJson(draft.factsJson, "Facts"),
            knowledgeIds: draft.knowledgeIds.split(",").map((item) => item.trim()).filter(Boolean),
            sourceSnapshot: parseAdminJson(draft.sourceSnapshotJson, "Source snapshot"),
            reviewerNotes: draft.reviewerNotes
          })
        }
      );
      const row = payload.rows?.[0];

      if (row) {
        setDraft(adminDraftFromRow(row));
        setSelectedId(row.id);
      }

      setMessage(nextStatus === "LIVE" ? "Published live." : nextStatus === "ARCHIVED" ? "Archived." : "Saved.");
      showSaveToast(nextStatus === "LIVE" ? "Published" : nextStatus === "ARCHIVED" ? "Archived" : "Draft saved");
      await loadRows();
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not save draft."));
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteDraft() {
    if (!draft.id || !window.confirm("Delete this generated content row? This cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?id=${encodeURIComponent(draft.id)}`,
        secret,
        { method: "DELETE" }
      );
      setDraft(createAdminDraft(surface));
      setSelectedId(null);
      setMessage("Deleted.");
      await loadRows();
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not delete row."));
    } finally {
      setIsLoading(false);
    }
  }

  const createArticleDirectly = activePage === "overview" || activePage === "content" || activePage === "articles";
  const surfaceSourceStatusCounts = writingSurfaceStatusCounts();
  const writingSurfaceAreaOptions = Array.from(new Set(writingSurfaceSourceMap.map((item) => item.area)));
  const filteredWritingSurfaces = writingSurfaceSourceMap.filter((surface) => {
    const matchesArea = writingSurfaceAreaFilter === "all" || surface.area === writingSurfaceAreaFilter;
    const matchesStatus = writingSurfaceStatusFilter === "all" || surface.status === writingSurfaceStatusFilter;

    return matchesArea && matchesStatus;
  });
  const surfaceSourceGroups = filteredWritingSurfaces.reduce<Array<{ area: WritingSurfaceMapItem["area"]; items: WritingSurfaceMapItem[] }>>((groups, item) => {
    const group = groups.find((candidate) => candidate.area === item.area);

    if (group) {
      group.items.push(item);
    } else {
      groups.push({ area: item.area, items: [item] });
    }

    return groups;
  }, []);

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <a className="admin-brand" href="/admin/content">
          <span className="admin-brand-mark">TL</span>
          <span>
            <strong>TLDR Astro</strong>
            <small>Content Ops</small>
          </span>
        </a>

        <nav className="admin-nav" aria-label="Content operations">
          <p className="admin-nav-section-label">Home</p>
          <button
            className={activePage === "overview" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("overview")}
            aria-current={activePage === "overview" ? "page" : undefined}
          >
            <LayoutDashboard size={18} aria-hidden="true" />
            Studio Home
          </button>
          <p className="admin-nav-section-label">Write</p>
          <button
            className={activePage === "articles" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("articles")}
            aria-current={activePage === "articles" ? "page" : undefined}
          >
            <BookOpenText size={18} aria-hidden="true" />
            Articles
          </button>
          <button
            className={activePage === "content" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("content")}
            aria-current={activePage === "content" ? "page" : undefined}
          >
            <FileText size={18} aria-hidden="true" />
            <span className="admin-nav-label">Exact Content</span>
            {contentFailureQueueCount > 0 && <strong className="admin-nav-badge">{contentFailureQueueCount}</strong>}
          </button>
          <button
            className={activePage === "compositeByType" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("compositeByType")}
            aria-current={activePage === "compositeByType" ? "page" : undefined}
          >
            <Database size={18} aria-hidden="true" />
            Composite Review
          </button>
          <p className="admin-nav-section-label">Composition</p>
          <button
            className={activePage === "templates" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("templates")}
            aria-current={activePage === "templates" ? "page" : undefined}
          >
            <Sparkles size={18} aria-hidden="true" />
            Templates
          </button>
          <button
            className={activePage === "slotDictionary" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("slotDictionary")}
            aria-current={activePage === "slotDictionary" ? "page" : undefined}
          >
            <KeyRound size={18} aria-hidden="true" />
            Slots
          </button>
          <button
            className={activePage === "vocabulary" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("vocabulary")}
            aria-current={activePage === "vocabulary" ? "page" : undefined}
          >
            <Database size={18} aria-hidden="true" />
            Vocabulary & Phrases
          </button>
          <button
            className={activePage === "knowledge" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("knowledge")}
            aria-current={activePage === "knowledge" ? "page" : undefined}
          >
            <BookOpenText size={18} aria-hidden="true" />
            Fallback Hooks
          </button>
          <p className="admin-nav-section-label">App surfaces</p>
          <button
            className={activePage === "hooks" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("hooks")}
            aria-current={activePage === "hooks" ? "page" : undefined}
          >
            <LayoutDashboard size={18} aria-hidden="true" />
            Surface Map
          </button>
          <p className="admin-nav-section-label">Publish</p>
          <button
            className={activePage === "reviewQueue" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("reviewQueue")}
            aria-current={activePage === "reviewQueue" ? "page" : undefined}
          >
            <TreePine size={18} aria-hidden="true" />
            Review Queue
          </button>
          <p className="admin-nav-section-label">System</p>
          <button
            className={activePage === "connection" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("connection")}
            aria-current={activePage === "connection" ? "page" : undefined}
          >
            <Server size={18} aria-hidden="true" />
            Connection
          </button>
          <button
            className={activePage === "appBehavior" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("appBehavior")}
            aria-current={activePage === "appBehavior" ? "page" : undefined}
          >
            <Sparkles size={18} aria-hidden="true" />
            App Behavior
          </button>
          <button
            className={activePage === "releaseNotes" ? "active" : ""}
            type="button"
            onClick={() => navigateAdminPage("releaseNotes")}
            aria-current={activePage === "releaseNotes" ? "page" : undefined}
          >
            <BookOpenText size={18} aria-hidden="true" />
            Release Notes
          </button>
        </nav>

        <a className="admin-public-link" href="/">
          <span className="admin-public-dot" aria-hidden="true" />
          Public app live
        </a>
      </aside>

      <section className="admin-main">
        <header className="admin-dashboard-header">
          <div>
            <p className="admin-breadcrumb">
              {adminPageBreadcrumb(activePage)}
            </p>
            <h1>{adminPageTitle(activePage)}</h1>
            <p>{adminPageDescription(activePage)}</p>
          </div>
          <div className="admin-global-actions">
            <div className="admin-create-menu">
              <button
                type="button"
                className="admin-create-button"
                onClick={() => {
                  if (createArticleDirectly) {
                    startNewArticle();
                    return;
                  }
                  setIsCreateMenuOpen((open) => !open);
                }}
                aria-expanded={createArticleDirectly ? undefined : isCreateMenuOpen}
                aria-haspopup={createArticleDirectly ? undefined : "menu"}
              >
                <Plus size={16} aria-hidden="true" />
                {createArticleDirectly ? "New Article" : "Create"}
              </button>
              {!createArticleDirectly && isCreateMenuOpen && (
                <div className="admin-create-menu-panel" role="menu" aria-label="Create content">
                  <button type="button" role="menuitem" aria-label="Create article, long-form editorial copy" onClick={startNewArticle}>
                    <BookOpenText size={15} aria-hidden="true" />
                    <span>
                      Article
                      <small>Long-form editorial copy</small>
                    </span>
                  </button>
                  <button type="button" role="menuitem" aria-label="Create exact content row" onClick={() => handleCreateAction("content", "Exact content rows are for a specific app surface, date, chart factor, or relationship context.")}>
                    <FileText size={15} aria-hidden="true" />
                    <span>
                      Exact content
                      <small>Specific reader-facing row</small>
                    </span>
                  </button>
                  <button type="button" role="menuitem" aria-label="Create reusable phrase or vocabulary row" onClick={() => handleCreateAction("vocabulary", "Vocabulary rows fill slots with reusable words, clauses, and short phrases.")}>
                    <Database size={15} aria-hidden="true" />
                    <span>
                      Reusable phrase
                      <small>Slot language or clause</small>
                    </span>
                  </button>
                  <button type="button" role="menuitem" aria-label="Create template" onClick={() => handleCreateAction("templates", "Templates control sentence structure and where slots appear.")}>
                    <Sparkles size={15} aria-hidden="true" />
                    <span>
                      Template
                      <small>Mustache structure</small>
                    </span>
                  </button>
                  <button type="button" role="menuitem" aria-label="Create fallback hook" onClick={() => handleCreateAction("knowledge", "Fallback hooks are the reusable safety-net templates used when richer content is unavailable.")}>
                    <KeyRound size={15} aria-hidden="true" />
                    <span>
                      Fallback hook
                      <small>Safety-net template</small>
                    </span>
                  </button>
                </div>
              )}
            </div>
            <div className={`admin-api-indicator status-${apiStatus.state}`}>
              <Server size={15} aria-hidden="true" />
              <span>
                {apiStatus.state === "online"
                  ? "API online"
                  : apiStatus.state === "checking"
                    ? "Checking API"
                    : apiStatus.state === "notConfigured"
                      ? "API missing"
                      : "API offline"}
              </span>
              {apiStatus.latencyMs !== null && <small>{apiStatus.latencyMs}ms</small>}
            </div>
          </div>
          {(activePage === "content" || activePage === "reviewQueue") && (
            <div className="admin-header-actions">
              <button type="button" onClick={() => void loadReviewWorkspace()} disabled={isLoading || !canUseApi}>
                <RefreshCw size={16} aria-hidden="true" />
                Reload Content
              </button>
            </div>
          )}
        </header>

        <section className="admin-message-card" aria-live="polite">
          <Sparkles size={18} aria-hidden="true" />
          <span>{message}</span>
          {((activePage === "slotDictionary" && message.includes("fallback-hook placeholders")) || ((activePage === "content" || activePage === "reviewQueue") && !canUseApi)) && (
            <button type="button" onClick={() => navigateAdminPage("connection")}>
              Add secret
            </button>
          )}
        </section>
        {saveToastMessage && (
          <div className="admin-save-toast" role="status" aria-live="polite">
            <Check size={16} aria-hidden="true" />
            <span>{saveToastMessage}</span>
          </div>
        )}
        <input
          ref={contentImportInputRef}
          type="file"
          accept=".csv,.json,application/json,text/csv"
          onChange={(event) => void importManagedContentFile(event)}
          hidden
        />

        {activePage === "overview" ? (
          <section id="dashboard-overview" className="admin-template-panel admin-overview-page" aria-label="Dashboard map">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Authoring workspace</p>
                <h2>Where to Work</h2>
                <p>Use this map to decide whether you are writing final content, editing template structure, filling vocabulary, diagnosing a public surface, or publishing reviewed work.</p>
              </div>
              <div className="admin-release-summary" aria-label="Dashboard migration status">
                <article>
                  <span>Write</span>
                  <strong>3</strong>
                </article>
                <article>
                  <span>Compose</span>
                  <strong>4</strong>
                </article>
                <article>
                  <span>Diagnose</span>
                  <strong>1</strong>
                </article>
                <article>
                  <span>Publish</span>
                  <strong>1</strong>
                </article>
              </div>
            </div>

            <div className="admin-studio-map" aria-label="Editorial workspace map">
              <button type="button" onClick={() => navigateAdminPage("articles")}>
                <BookOpenText size={18} aria-hidden="true" />
                <span>Articles</span>
                <small>Write long-form editorial pieces and article excerpts.</small>
              </button>
              <button type="button" onClick={() => navigateAdminPage("content")}>
                <FileText size={18} aria-hidden="true" />
                <span>Exact Content</span>
                <small>Write a row for a specific surface, chart factor, date, or relationship.</small>
              </button>
              <button type="button" onClick={() => navigateAdminPage("templates")}>
                <Sparkles size={18} aria-hidden="true" />
                <span>Templates</span>
                <small>Fix sentence structure, Mustache fields, and reusable scaffolds.</small>
              </button>
              <button type="button" onClick={() => navigateAdminPage("slotDictionary")}>
                <KeyRound size={18} aria-hidden="true" />
                <span>Slots</span>
                <small>Find the source of a variable and open its editor.</small>
              </button>
              <button type="button" onClick={() => navigateAdminPage("vocabulary")}>
                <Database size={18} aria-hidden="true" />
                <span>Vocabulary</span>
                <small>Edit the words and clauses that fill templates.</small>
              </button>
              <button type="button" onClick={() => navigateAdminPage("knowledge")}>
                <BookOpenText size={18} aria-hidden="true" />
                <span>Fallback Hooks</span>
                <small>Edit safety-net templates used when richer rows miss.</small>
              </button>
              <button type="button" onClick={() => navigateAdminPage("hooks")}>
                <LayoutDashboard size={18} aria-hidden="true" />
                <span>Surface Map</span>
                <small>Diagnose which hook, key, template, and vocab made a public card.</small>
              </button>
              <button type="button" onClick={() => navigateAdminPage("reviewQueue")}>
                <TreePine size={18} aria-hidden="true" />
                <span>Review Queue</span>
                <small>Approve, publish, archive, and audit reader-ready rows.</small>
              </button>
            </div>

            <div className="admin-fallback-row-list admin-source-grounded-summary" aria-label="Dashboard diagnostics">
              <details className="admin-diagnostics-details">
                <summary>System diagnostics</summary>
                <div className="admin-fallback-usage" aria-label="Content system workstreams">
                  {contentSystemWorkstreams.map((workstream) => (
                    <article key={workstream.id}>
                      <span>{workstream.state}</span>
                      <h3>{workstream.title}</h3>
                      <p>{workstream.scope}</p>
                      <small>{workstream.nextAction}</small>
                    </article>
                  ))}
                </div>
                <div className="admin-fallback-row-actions">
                  <span className="ui-pill">source records: {sourceGroundedSummary.readyRecords ?? 0}</span>
                  <span className="ui-pill">source gaps: {sourceGroundedSummary.sourceGaps ?? 0}</span>
                  <span className="ui-pill">draft candidates: {sourceGroundedReviewSummary.totalCandidates ?? 0}</span>
                  <span className="ui-pill">{SOURCE_GROUNDED_V2_TEMPLATE_VERSION}</span>
                </div>
                {sourceGroundedGapSamples.length > 0 && (
                  <ul className="admin-source-gap-list">
                    {sourceGroundedGapSamples.map((gap) => (
                      <li key={gap.canonicalKey}>
                        <strong>{gap.canonicalKey}</strong>
                        <span>{gap.missing.join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </div>
          </section>
        ) : activePage === "articles" ? (
          <section className="admin-template-panel admin-articles-page" aria-label="Articles workspace">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Write</p>
                <h2>Articles</h2>
                <p>Create long-form editorial drafts here. Articles are editable DRAFT rows and stay separate from fallback hooks, templates, and vocabulary.</p>
              </div>
              <div className="admin-template-actions">
                <button type="button" onClick={startNewArticle}>
                  <Plus size={16} aria-hidden="true" />
                  New Article Draft
                </button>
              </div>
            </div>

            <div className="admin-studio-map admin-article-workflow" aria-label="Article workflow">
              <article>
                <BookOpenText size={18} aria-hidden="true" />
                <span>Article</span>
                <small>Reader-facing long-form copy, explainers, and guided editorial pages.</small>
              </article>
              <article>
                <FileText size={18} aria-hidden="true" />
                <span>Article excerpt</span>
                <small>Short support copy that can be quoted or linked from a card.</small>
              </article>
              <article>
                <Archive size={18} aria-hidden="true" />
                <span>Reference source</span>
                <small>Research or imported material that should not render directly to visitors.</small>
              </article>
            </div>

            <section className="admin-fallback-row-list" aria-label="Article authoring guidance">
              <article className="admin-fallback-row">
                <div className="admin-fallback-row-main">
                  <div>
                    <p className="admin-eyebrow">Current state</p>
                    <h3>Start article drafts from this page</h3>
                  </div>
                  <span className="ui-pill admin-template-badge">Editor home</span>
                </div>
                <p>Use New Article Draft for essays, guides, long-form explainers, and reusable editorial excerpts. Use Exact Content only when copy belongs to one specific app card or chart surface.</p>
                <div className="admin-fallback-row-actions">
                  <button type="button" onClick={startNewArticle}>
                    <Plus size={15} aria-hidden="true" />
                    New Article Draft
                  </button>
                  <button type="button" onClick={() => navigateAdminPage("reviewQueue")}>
                    <TreePine size={15} aria-hidden="true" />
                    Open Review Queue
                  </button>
                </div>
              </article>
            </section>
          </section>
        ) : activePage === "releaseNotes" ? (
          <section id="release-notes" className="admin-template-panel admin-release-page" aria-label="Release notes">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Product history</p>
                <h2>Dashboard + App Updates</h2>
                <p>Use this log to keep a plain-English record of what changed, where it landed, and why it matters.</p>
              </div>
              <div className="admin-release-summary" aria-label="Release note coverage">
                <article>
                  <span>Entries</span>
                  <strong>{releaseNotes.length}</strong>
                </article>
                <article>
                  <span>Tracks</span>
                  <strong>Dashboard / App</strong>
                </article>
              </div>
            </div>

            <div className="admin-release-timeline">
              {releaseNotes.map((note) => (
                <article className="admin-release-note" key={`${note.date}-${note.time}-${note.title}`}>
                  <div className="admin-release-date">
                    <time>{note.date}</time>
                    <span>{note.time}</span>
                  </div>
                  <div className="admin-release-card">
                    <div className="admin-release-card-header">
                      <div>
                        <div className="admin-release-tags" aria-label="Release areas">
                          {note.areas.map((area) => (
                            <span className={`ui-pill admin-release-tag admin-release-tag-${area.toLowerCase()}`} key={area}>
                              {area}
                            </span>
                          ))}
                        </div>
                        <h3>{note.title}</h3>
                        <p>{note.summary}</p>
                      </div>
                    </div>
                    <ul>
                      {note.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : activePage === "connection" ? (
          <section className="admin-settings-page" aria-label="Connection settings">
            <section className="admin-settings-grid">
              <section className="admin-secret-panel" aria-label="Admin access">
                <div className="admin-sidebar-section-title">
                  <KeyRound size={15} aria-hidden="true" />
                  Access
                </div>
                <form onSubmit={saveSecret}>
                  <label>
                    <span>CONTENT_GENERATION_SECRET</span>
                    <input
                      type="password"
                      value={secretDraft}
                      onChange={(event) => setSecretDraft(event.target.value)}
                      placeholder="Paste secret"
                    />
                  </label>
                  <button type="submit">
                    <Save size={15} aria-hidden="true" />
                    Save and Check Access
                  </button>
                  {accessStatus !== "empty" && (
                    <p className={`admin-access-note status-${accessStatus}`}>
                      {accessStatus === "checking"
                        ? "Checking access..."
                        : accessStatus === "valid"
                          ? "Access confirmed."
                          : "Access needs the current production secret."}
                    </p>
                  )}
                </form>
              </section>

              <section className={`admin-api-status-card status-${apiStatus.state}`} aria-label="TLDR Astro API status">
                <div className="admin-api-status-main">
                  <span className="admin-api-status-icon">
                    <Server size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="admin-eyebrow">Calculation API</p>
                    <h2>
                      {apiStatus.state === "online"
                        ? "Cloud Run is online"
                        : apiStatus.state === "checking"
                          ? "Checking Cloud Run"
                          : apiStatus.state === "notConfigured"
                            ? "API not configured"
                            : "Cloud Run needs attention"}
                    </h2>
                    <p>{tldrAstroApiStatusUrl || "Missing VITE_TLDRASTRO_API_URL"}</p>
                  </div>
                </div>
                <div className="admin-api-status-grid">
                  <article>
                    <span>Status</span>
                    <strong>{apiStatus.state === "online" ? "Online" : apiStatus.state === "checking" ? "Checking" : apiStatus.state === "notConfigured" ? "Missing env" : "Offline"}</strong>
                  </article>
                  <article>
                    <span>Ephemeris</span>
                    <strong>{apiStatus.health?.ephemeris?.available ? "Available" : "Unknown"}</strong>
                  </article>
                  <article>
                    <span>Latency</span>
                    <strong>{apiStatus.latencyMs === null ? "..." : `${apiStatus.latencyMs}ms`}</strong>
                  </article>
                  <article>
                    <span>Checked</span>
                    <strong>{adminApiCheckedAtLabel(apiStatus.checkedAt)}</strong>
                  </article>
                </div>
                {apiStatus.error && <p className="admin-api-status-error">{apiStatus.error}</p>}
                <button type="button" onClick={() => void checkTldrAstroApiStatus()} disabled={apiStatus.state === "checking"}>
                  <Activity size={16} aria-hidden="true" />
                  Refresh API Status
                </button>
              </section>
            </section>

            <section className="admin-template-panel admin-infrastructure-panel" aria-label="Infrastructure links">
              <div className="admin-template-header">
                <div>
                  <p className="admin-eyebrow">Infrastructure</p>
                  <h2>Deploy Console</h2>
                  <p>
                    <a
                      href="https://console.cloud.google.com/run/detail/us-central1/tldrastro-api/revisions?project=tldrastro-prod"
                      rel="noreferrer"
                      target="_blank"
                    >
                      Cloud Run: tldrastro-api (CORS / env vars)
                    </a>
                  </p>
                  <p className="admin-template-note">Deployed under the hello@goldeneclipse Google account (project tldrastro-prod).</p>
                </div>
              </div>
            </section>

          </section>
        ) : activePage === "appBehavior" ? (
          <section className="admin-settings-page" aria-label="App behavior settings">
            <section className="admin-template-panel" aria-label="Sky aspect card settings">
              <div className="admin-template-header">
                <div>
                  <p className="admin-eyebrow">App-setting toggle</p>
                  <h2>Aspect Card Context</h2>
                  <p>Append an editable sign-context line to sky aspect cards and detail articles when both calculated planet signs are available.</p>
                  <code className="admin-managed-key">{signContextAspectCardsSettingKey}</code>
                </div>
                <div className="admin-template-actions">
                  <label className="admin-setting-switch">
                    <input
                      checked={signContextEnabled}
                      onChange={(event) => setSignContextEnabled(event.target.checked)}
                      type="checkbox"
                    />
                    <span>{signContextEnabled ? "On" : "Off"}</span>
                  </label>
                  <button type="button" onClick={() => void saveSignContextSetting()} disabled={isLoading || !canUseApi}>
                    <Save size={16} aria-hidden="true" />
                    Save Setting
                  </button>
                </div>
              </div>
              <p className="admin-template-note">
                Off means sky aspect bodies render exactly as they did before this sign-context layer.
              </p>
            </section>
            <section className="admin-template-panel" aria-label="Historical lookbacks in expanded Sky settings">
              <div className="admin-template-header">
                <div>
                  <p className="admin-eyebrow">Application content setting</p>
                  <h2>Historical lookbacks in expanded Sky</h2>
                  <p>Show reviewed historical context beneath eligible collective Sky interpretations. This setting affects all readers.</p>
                  <code className="admin-managed-key">{skyHistoricalLookbackSettingKey}</code>
                </div>
                <div className="admin-template-actions">
                  <label className="admin-setting-switch">
                    <input
                      checked={skyHistoricalLookbackEnabled}
                      onChange={(event) => setSkyHistoricalLookbackEnabled(event.target.checked)}
                      type="checkbox"
                    />
                    <span>{skyHistoricalLookbackEnabled ? "On" : "Off"}</span>
                  </label>
                  <button type="button" onClick={() => void saveSkyHistoricalLookbackSetting()} disabled={isLoading || !canUseApi}>
                    <Save size={16} aria-hidden="true" />
                    Save Setting
                  </button>
                </div>
              </div>
              <p className="admin-template-note">
                Default off. Turning this on only displays reviewed, eligible historical records that match the current Sky event; it never promotes drafts or replaces the present interpretation.
              </p>
            </section>
          </section>
        ) : activePage === "slotDictionary" ? (
          <section className="admin-template-panel admin-slot-dictionary-page" aria-label="Slot dictionary">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Composition</p>
                <h2>Slots</h2>
                <p>Use this only when you already know the placeholder you need to inspect, like <code>{"{{planet}}"}</code> or <code>{"{{livedScene}}"}</code>. For a confusing reader-facing page, start with Surface Map.</p>
              </div>
              <div className="admin-template-actions">
                <button type="button" onClick={() => navigateAdminPage("hooks")}>
                  <LayoutDashboard size={16} aria-hidden="true" />
                  Open Surface Map
                </button>
              </div>
            </div>

            <div className="admin-slot-usage-guide" aria-label="Slots versus surface map">
              <article>
                <span>Start here when</span>
                <strong>You need to decode a template slot</strong>
                <p>Slots tells you whether a placeholder is calculated, vocabulary-fed, fallback-fed, missing, or editable elsewhere.</p>
              </article>
              <article>
                <span>Start in Surface Map when</span>
                <strong>A public page reads wrong</strong>
                <p>Surface Map tells you which product surface, prose layer, source file, and edit target created the copy.</p>
              </article>
              <article>
                <span>Editing rule</span>
                <strong>Do not edit by guessing a slot</strong>
                <p>Find the surface first, then follow its edit target to Exact Content, Vocabulary, Knowledge, or Fallback Hooks.</p>
              </article>
            </div>

            <div className="admin-slot-stat-row" aria-label="Slot dictionary coverage">
              <article>
                <span>Calculated</span>
                <strong>{slotDictionaryCounts.calculated}</strong>
              </article>
              <article>
                <span>Ready</span>
                <strong>{slotDictionaryCounts.ready}</strong>
              </article>
              <button
                type="button"
                onClick={() => setSlotDictionaryStatusFilter("draft")}
              >
                <span>Draft exists</span>
                <strong>{slotDictionaryCounts.draft}</strong>
              </button>
              <button
                type="button"
                onClick={() => setSlotDictionaryStatusFilter("local")}
              >
                <span>Local only</span>
                <strong>{slotDictionaryCounts.local}</strong>
              </button>
              <button
                className="is-warning"
                type="button"
                onClick={() => setSlotDictionaryStatusFilter("missing")}
              >
                <span>Missing</span>
                <strong>{slotDictionaryCounts.missing}</strong>
              </button>
            </div>

            {!slotInfoDismissed && (
              <div className="admin-slot-info-row">
                <details>
                  <summary>How slots work</summary>
                  <p><code>{"{{planet}}"}</code>, <code>{"{{sign}}"}</code>, <code>{"{{house}}"}</code>, and <code>{"{{moonPhase}}"}</code> come from chart or sky facts. Slots such as topic language, tone, lived scene, or practical action come from Vocabulary or Fallback Hooks. This page explains ingredients; Surface Map explains which recipe used them.</p>
                </details>
                <button
                  type="button"
                  onClick={() => {
                    setSlotInfoDismissed(true);
                    try {
                      window.localStorage.setItem(adminSlotInfoDismissedStorageKey, "true");
                    } catch {
                      return;
                    }
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="admin-slot-controls admin-filter-toolbar" aria-label="Slot dictionary controls">
              <div className="admin-filter-toolbar-header">
                <div>
                  <p className="admin-eyebrow">Browse slots</p>
                  <strong>{filteredSlotDictionaryRows.length} of {slotDictionaryRows.length}</strong>
                </div>
                {hasSlotDictionaryFilters && (
                  <button
                    className="admin-filter-reset"
                    type="button"
                    onClick={() => {
                      setSlotDictionaryQuery("");
                      setSlotDictionarySourceFilter("all");
                      setSlotDictionaryStatusFilter("all");
                    }}
                  >
                    <X size={15} aria-hidden="true" />
                    Reset
                  </button>
                )}
              </div>

              <label className="admin-search-field admin-slot-search-field">
                <span>Search</span>
                <div className="admin-search-input-shell">
                  <Search size={16} aria-hidden="true" />
                  <input
                    type="search"
                    value={slotDictionaryQuery}
                    onChange={(event) => setSlotDictionaryQuery(event.target.value)}
                    placeholder="Slot, source, or use"
                  />
                  {slotDictionaryQuery.trim() && (
                    <button type="button" onClick={() => setSlotDictionaryQuery("")} aria-label="Clear slot search">
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </label>

              <div className="admin-filter-groups">
                <fieldset className="admin-slot-filter-group admin-segmented-filter" aria-label="Filter by source">
                  <legend>Source</legend>
                  {slotDictionarySourceFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      className={slotDictionarySourceFilter === filter.key ? "active" : ""}
                      onClick={() => setSlotDictionarySourceFilter(filter.key)}
                    >
                      <span>{filter.label}</span>
                      <strong>{slotDictionarySourceCounts[filter.key]}</strong>
                    </button>
                  ))}
                </fieldset>
                <fieldset className="admin-slot-filter-group admin-segmented-filter" aria-label="Filter by status">
                  <legend>Status</legend>
                  {slotDictionaryStatusFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      className={slotDictionaryStatusFilter === filter.key ? "active" : ""}
                      onClick={() => setSlotDictionaryStatusFilter(filter.key)}
                    >
                      <span>{filter.label}</span>
                      <strong>{slotDictionaryStatusCounts[filter.key]}</strong>
                    </button>
                  ))}
                </fieldset>
              </div>
            </div>

            <div className="admin-slot-table-wrap">
              <table className="admin-slot-table">
                <thead>
                  <tr>
                    <th>Slot</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Use</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                {filteredSlotDictionaryRows.map((row) => {
                  const rowAction = row.action;
                  const sourceBadge = slotDictionarySourceBadge(row);
                  const sourceDetail = [
                    row.group,
                    row.source,
                    ...(row.examples ?? [])
                  ].join(" · ");

                  return (
                    <tr key={row.slot}>
                      <td>
                        <code>{row.slot}</code>
                        <span>{row.label}</span>
                      </td>
                      <td>
                        <span className={`ui-pill admin-slot-source-${slotDictionarySourceFilterForRow(row)}`}>
                          {sourceBadge}
                        </span>
                        <details className="admin-slot-row-detail">
                          <summary title={sourceDetail}>{row.group}</summary>
                          <code>{row.source}</code>
                          {row.examples && <small>{row.examples.join(" · ")}</small>}
                        </details>
                      </td>
                      <td>
                        <span
                          className={`ui-pill admin-status admin-slot-status-${row.status}`}
                          title={slotDictionaryStatusTitle(row.status)}
                        >
                          {slotDictionaryStatusLabel(row.status)}
                        </span>
                      </td>
                      <td>
                        <span className="admin-slot-description" title={row.description}>{row.description}</span>
                      </td>
                      <td className="admin-slot-action-cell">
                        {rowAction ? (
                          <button
                            type="button"
                            aria-label={rowAction.label}
                            title={rowAction.label}
                            onClick={() => {
                              if (rowAction.vocabularyFilter) {
                                setVocabularyCategoryFilter(rowAction.vocabularyFilter);
                              }
                              if (rowAction.fallbackFilter) {
                                setFallbackHookSectionFilter(rowAction.fallbackFilter);
                              }
                              setActivePage(rowAction.page);
                            }}
                          >
                            <Eye size={14} aria-hidden="true" />
                            Open
                          </button>
                        ) : (
                          <button type="button" disabled title="This slot is calculated by the app and has no editor.">
                            No editor
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredSlotDictionaryRows.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <span className="admin-template-note">No slots match the current filters.</span>
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </section>
        ) : activePage === "vocabulary" ? (
          <section className="admin-template-panel admin-vocabulary-page" aria-label="Vocabulary content rows">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Composition</p>
                <h2>Vocabulary</h2>
                <p>Edit reusable words, clauses, and short phrases that fill template slots. Use this for language fragments, not full articles or fallback-hook bodies.</p>
              </div>
              <div className="admin-release-summary" aria-label="Vocabulary row count">
                <article>
                  <span>Cards</span>
                  <strong>{vocabularyCardItems.length}</strong>
                </article>
                <article>
                  <span>Taglines</span>
                  <strong>{taglineRows.length}</strong>
                </article>
              </div>
              <div className="admin-template-actions">
                <button className="admin-format-button" type="button" onClick={() => void downloadManagedContent("json", "vocabulary")} disabled={isLoading || !canUseApi} aria-label="Download vocabulary as JSON">
                  <Download size={16} aria-hidden="true" />
                  JSON
                </button>
                <button className="admin-format-button" type="button" onClick={() => void downloadManagedContent("csv", "vocabulary")} disabled={isLoading || !canUseApi} aria-label="Download vocabulary as CSV">
                  <Download size={16} aria-hidden="true" />
                  CSV
                </button>
                <button type="button" onClick={() => triggerContentImport("vocabulary")} disabled={isLoading || !canUseApi}>
                  <Upload size={16} aria-hidden="true" />
                  Import
                </button>
                <button type="button" onClick={() => void createMissingTaglineRows()} disabled={isLoading || !canUseApi || missingTaglinePlaceholderRows.length === 0}>
                  <Plus size={16} aria-hidden="true" />
                  Create Missing Taglines
                </button>
              </div>
            </div>

            <div className="admin-vocabulary-filter-panel" aria-label="Vocabulary category filters">
              <div className="admin-fallback-section-filters" role="tablist" aria-label="Vocabulary categories">
                {([
                  { key: "all", label: "All" },
                  { key: "planets", label: "Planets" },
                  { key: "houses", label: "Houses" },
                  { key: "angles", label: "Angles" },
                  { key: "zodiac", label: "Zodiac" },
                  { key: "lunar", label: "Lunar" },
                  { key: "eclipses", label: "Eclipses" },
                  { key: "career", label: "Career" },
                  { key: "relationship", label: "Relationship" }
                ] as Array<{ key: AdminVocabularyCategoryFilter; label: string }>).map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={vocabularyCategoryFilter === filter.key ? "active" : ""}
                    onClick={() => {
                      setVocabularyCategoryFilter(filter.key);
                      setSelectedVocabularyContentKey(null);
                    }}
                    role="tab"
                    aria-selected={vocabularyCategoryFilter === filter.key}
                  >
                    <span>{filter.label}</span>
                    <strong>{vocabularyCategoryCounts[filter.key]}</strong>
                  </button>
                ))}
              </div>

              <p className="admin-template-note">
                {vocabularyCategoryNote}
              </p>

              <div className="admin-vocabulary-controls admin-filter-toolbar" aria-label="Vocabulary search and status filters">
                <label className="admin-search-field">
                  <span>Search vocabulary</span>
                  <input
                    type="search"
                    value={vocabularyQuery}
                    onChange={(event) => setVocabularyQuery(event.target.value)}
                    placeholder="Search key, headline, copy, or category"
                  />
                </label>
                <fieldset className="admin-slot-filter-group" aria-label="Filter vocabulary by status">
                  <legend>Status</legend>
                  {vocabularyStatusFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      className={vocabularyStatusFilter === filter.key ? "active" : ""}
                      onClick={() => setVocabularyStatusFilter(filter.key)}
                    >
                      <span>{filter.label}</span>
                      <strong>{vocabularyStatusCounts[filter.key]}</strong>
                    </button>
                  ))}
                </fieldset>
                <div className="admin-filter-result-count" aria-live="polite">
                  <strong>{filteredVocabularyCardItems.length}</strong>
                  <span>{filteredVocabularyCardItems.length === 1 ? "row" : "rows"}</span>
                </div>
              </div>
            </div>

            <div className="admin-table-scroll admin-vocabulary-table-scroll">
              <table className="admin-content-table admin-vocabulary-table">
                <thead className="admin-content-table-head">
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Kind</th>
                    <th scope="col">Primary Copy</th>
                    <th scope="col">Extras</th>
                    <th scope="col">Tagline</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVocabularyCardItems.map((item) => {
                    const topicRow = item.row;
                    const rowDraft = topicRow ? vocabularyDrafts[topicRow.id] ?? vocabularyDraftFromRow(topicRow) : null;
                    const topicStatus = rowDraft?.status ?? topicRow?.status;
                    const isSignStyleRow = item.kind === "sign-style";
                    const vocabularyFamily = vocabularyRowFamily(item.contentKey);
                    const vocabularyCategory = vocabularyItemCategory(item);
                    const matchedTaglineRow = item.taglineContentKey
                      ? findAdminGeneratedContentRow(taglineRows, {
                        contentKey: item.taglineContentKey,
                        mode: "feed"
                      })
                      : undefined;
                    const taglineDraft = item.taglineContentKey
                      ? taglineDrafts[item.taglineContentKey] ?? (matchedTaglineRow ? taglineDraftFromRow(matchedTaglineRow) : fallbackTaglineDraft(item.point))
                      : null;
                    const primaryPreview = isSignStyleRow
                      ? rowDraft?.stylePhrase || rowDraft?.styleShort || "No style phrase yet"
                      : rowDraft?.you || rowDraft?.natal || rowDraft?.sky || "No phrase yet";
                    const extraLabels = [
                      item.signNeedRow || vocabularyFamily === "sign-need" ? "Moon sign" : "",
                      item.storyRow || vocabularyFamily === "zodiac-story" ? "Story" : "",
                      item.shadowRow || vocabularyFamily === "planet-shadow" || vocabularyFamily === "house-shadow" ? "Shadow" : "",
                      item.higherExpressionRow || vocabularyFamily === "higher-expression" ? "Higher expression" : ""
                    ].filter(Boolean);

                    return (
                      <tr
                        key={item.contentKey}
                        className={`admin-content-row admin-clickable-table-row ${selectedVocabularyContentKey === item.contentKey ? "selected" : ""}`}
                        onClick={() => setSelectedVocabularyContentKey(item.contentKey)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedVocabularyContentKey(item.contentKey);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        data-vocab-row={item.contentKey}
                      >
                        <td className="admin-vocabulary-item-cell">
                          <strong>{rowDraft?.headline || item.point}</strong>
                          <code>{topicRow?.content_key ?? item.contentKey}</code>
                        </td>
                        <td>
                          <span className="ui-pill admin-status">{vocabularyCategory === "all" ? "Vocabulary" : vocabularyCategory}</span>
                          {isSignStyleRow && <span className="ui-pill admin-status">Zodiac style</span>}
                        </td>
                        <td className="admin-vocabulary-preview-cell">{primaryPreview}</td>
                        <td>
                          <div className="admin-vocabulary-cell-list">
                            {extraLabels.length > 0
                              ? extraLabels.map((label) => <span className="ui-pill admin-status" key={label}>{label}</span>)
                              : <span className="admin-muted-cell">None</span>}
                          </div>
                        </td>
                        <td className="admin-vocabulary-preview-cell">
                          {taglineDraft?.tagline || (item.taglineContentKey ? "Tagline not written" : "Not used")}
                        </td>
                        <td>
                          <div className="admin-vocabulary-cell-list">
                            {topicRow && topicStatus && <span className={`ui-pill admin-status status-${topicStatus.toLowerCase()}`}>{topicStatus}</span>}
                            {item.taglineContentKey && (
                              <span className={`ui-pill admin-status status-${matchedTaglineRow?.status.toLowerCase() ?? "draft"}`}>
                                Tagline {matchedTaglineRow?.status ?? "not saved"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredVocabularyCardItems.length === 0 && (
                <p className="admin-empty">No vocabulary rows match this filter.</p>
              )}
            </div>

            {selectedVocabularyItem && (() => {
              const item = selectedVocabularyItem;
              const topicRow = item.row;
              const rowDraft = topicRow ? vocabularyDrafts[topicRow.id] ?? vocabularyDraftFromRow(topicRow) : null;
              const signNeedDraft = item.signNeedRow ? vocabularyDrafts[item.signNeedRow.id] ?? vocabularyDraftFromRow(item.signNeedRow) : null;
              const storyDraft = item.storyRow ? vocabularyDrafts[item.storyRow.id] ?? vocabularyDraftFromRow(item.storyRow) : null;
              const shadowDraft = item.shadowRow ? vocabularyDrafts[item.shadowRow.id] ?? vocabularyDraftFromRow(item.shadowRow) : null;
              const higherExpressionDraft = item.higherExpressionRow ? vocabularyDrafts[item.higherExpressionRow.id] ?? vocabularyDraftFromRow(item.higherExpressionRow) : null;
              const topicStatus = rowDraft?.status ?? topicRow?.status;
              const signNeedStatus = signNeedDraft?.status ?? item.signNeedRow?.status;
              const storyStatus = storyDraft?.status ?? item.storyRow?.status;
              const shadowStatus = shadowDraft?.status ?? item.shadowRow?.status;
              const higherExpressionStatus = higherExpressionDraft?.status ?? item.higherExpressionRow?.status;
              const isSignStyleRow = item.kind === "sign-style";
              const vocabularyFamily = vocabularyRowFamily(item.contentKey);
              const vocabularyCategory = vocabularyItemCategory(item);
              const isCareerVocabularyRow = vocabularyCategory === "career";
              const showsPrimaryPhraseFields = vocabularyFamily === "topic" || vocabularyFamily === "sign-style";
              const showsSinglePhraseField = vocabularyFamily === "single-phrase";
              const showsSignNeed = vocabularyFamily === "sign-style" || vocabularyFamily === "sign-need" || Boolean(item.signNeedRow);
              const showsZodiacStory = vocabularyFamily === "sign-style" || vocabularyFamily === "zodiac-story" || Boolean(item.storyRow);
              const showsShadow = vocabularyFamily === "sign-style" || vocabularyFamily === "planet-shadow" || vocabularyFamily === "house-shadow" || Boolean(item.shadowRow);
              const showsHigherExpression = vocabularyFamily === "higher-expression" || Boolean(item.higherExpressionRow);
              const matchedTaglineRow = item.taglineContentKey
                ? findAdminGeneratedContentRow(taglineRows, {
                  contentKey: item.taglineContentKey,
                  mode: "feed"
                })
                : undefined;
              const taglineDraft = item.taglineContentKey
                ? taglineDrafts[item.taglineContentKey] ?? (matchedTaglineRow ? taglineDraftFromRow(matchedTaglineRow) : fallbackTaglineDraft(item.point))
                : null;

              return (
                <div className="admin-drawer-backdrop" role="presentation" onClick={() => setSelectedVocabularyContentKey(null)}>
                  <section className="admin-editor-panel admin-editor-drawer admin-vocabulary-drawer" aria-label="Vocabulary row editor" onClick={(event) => event.stopPropagation()}>
                    <div className="admin-editor-toolbar">
                      <div className="admin-drawer-topbar">
                        <p className="admin-eyebrow">Editing vocabulary</p>
                        <button type="button" onClick={() => setSelectedVocabularyContentKey(null)}>
                          <X size={16} aria-hidden="true" />
                          Close
                        </button>
                      </div>
                      <div className="admin-editor-heading">
                        <p className="admin-eyebrow">{topicRow?.prompt_version ?? "tagline-v1"} / {topicRow?.surface ?? "natal card"}</p>
                        <div className="admin-managed-badges">
                          {topicRow && topicStatus && <span className={`ui-pill admin-status status-${topicStatus.toLowerCase()}`}>{topicStatus}</span>}
                          {isSignStyleRow && <span className="ui-pill admin-status">Zodiac style</span>}
                          {vocabularyFamily === "sign-need" && <span className="ui-pill admin-status">Current Moon in sign</span>}
                          {vocabularyFamily === "zodiac-story" && <span className="ui-pill admin-status">Zodiac story</span>}
                          {vocabularyFamily === "planet-shadow" && <span className="ui-pill admin-status">Planet shadow</span>}
                          {vocabularyFamily === "house-shadow" && <span className="ui-pill admin-status">House shadow</span>}
                          {vocabularyFamily === "higher-expression" && <span className="ui-pill admin-status">Higher expression</span>}
                          {vocabularyFamily === "single-phrase" && <span className="ui-pill admin-status">Shared phrase</span>}
                          {item.signNeedRow && signNeedStatus && <span className={`ui-pill admin-status status-${signNeedStatus.toLowerCase()}`}>Current Moon in sign</span>}
                          {item.storyRow && storyStatus && <span className={`ui-pill admin-status status-${storyStatus.toLowerCase()}`}>Zodiac story</span>}
                          {item.shadowRow && shadowStatus && <span className={`ui-pill admin-status status-${shadowStatus.toLowerCase()}`}>{vocabularyItemCategory(item) === "planets" ? "Planet shadow" : "House shadow"}</span>}
                          {item.higherExpressionRow && higherExpressionStatus && <span className={`ui-pill admin-status status-${higherExpressionStatus.toLowerCase()}`}>Higher expression</span>}
                          {vocabularyCategory === "houses" && <span className="ui-pill admin-status">House</span>}
                          {vocabularyCategory === "planets" && <span className="ui-pill admin-status">Planet</span>}
                          {vocabularyCategory === "career" && <span className="ui-pill admin-status">Career</span>}
                          {item.taglineContentKey && (
                            <span className={`ui-pill admin-status status-${matchedTaglineRow?.status.toLowerCase() ?? "draft"}`}>
                              Tagline {matchedTaglineRow?.status ?? "not saved"}
                            </span>
                          )}
                        </div>
                      </div>
                      {rowDraft && topicRow ? (
                        <div className="admin-managed-two-column admin-vocabulary-title-grid">
                          <label className="admin-title-field">
                            <span>Headline</span>
                            <input
                              value={rowDraft.headline}
                              onChange={(event) => updateVocabularyDraft(topicRow.id, { headline: event.target.value })}
                            />
                            <small>{topicRow.content_key}</small>
                          </label>
                          <label className="admin-metadata-field admin-vocabulary-status-field">
                            <span>Status</span>
                            <select
                              className={`admin-status-select status-${rowDraft.status.toLowerCase()}`}
                              value={rowDraft.status}
                              onChange={(event) => updateVocabularyDraft(topicRow.id, { status: event.target.value as GeneratedContentStatus })}
                            >
                              <option value="DRAFT">Draft</option>
                              <option value="REVIEWED">Reviewed</option>
                              <option value="LIVE">Published</option>
                              <option value="ARCHIVED">Archived</option>
                              <option value="ERROR">Needs Review</option>
                            </select>
                            <small>Saved when you click Save Row.</small>
                          </label>
                        </div>
                      ) : (
                        <div className="admin-title-field">
                          <span>Headline</span>
                          <h2>{item.point}</h2>
                          <small>{item.contentKey}</small>
                        </div>
                      )}
                    </div>

                    <div className="admin-vocabulary-drawer-body">
                      {rowDraft && topicRow && showsPrimaryPhraseFields && isSignStyleRow && (
                        <div className="admin-managed-two-column">
                          <label className="admin-field-wide">
                            <span>Zodiac style phrase</span>
                            <textarea
                              value={rowDraft.stylePhrase ?? ""}
                              onChange={(event) => updateVocabularyDraft(topicRow.id, { stylePhrase: event.target.value })}
                              rows={3}
                            />
                          </label>
                          <label className="admin-field-wide">
                            <span>Short style</span>
                            <textarea
                              value={rowDraft.styleShort ?? ""}
                              onChange={(event) => updateVocabularyDraft(topicRow.id, { styleShort: event.target.value })}
                              rows={3}
                            />
                          </label>
                        </div>
                      )}

                      {rowDraft && topicRow && showsPrimaryPhraseFields && isCareerVocabularyRow && (
                        <label className="admin-field-wide">
                          <span>Career vocabulary body</span>
                          <textarea
                            value={rowDraft.natal}
                            onChange={(event) => updateVocabularyDraft(topicRow.id, {
                              natal: event.target.value,
                              ...(rowDraft.status === "DRAFT" ? { status: "LIVE" as GeneratedContentStatus } : {})
                            })}
                            rows={9}
                          />
                        </label>
                      )}

                      {rowDraft && topicRow && showsSinglePhraseField && (
                        <label className="admin-field-wide admin-compact-vocabulary-field">
                          <span>Phrase</span>
                          <textarea
                            value={rowDraft.natal}
                            onChange={(event) => updateVocabularyDraft(topicRow.id, { natal: event.target.value })}
                            rows={3}
                          />
                          <small>Sentence-ready copy for this content key.</small>
                        </label>
                      )}

                      {rowDraft && topicRow && showsPrimaryPhraseFields && !isSignStyleRow && !isCareerVocabularyRow && (
                        <>
                          <div className="admin-managed-two-column">
                            <label className="admin-field-wide">
                              <span>You phrase</span>
                              <textarea
                                value={rowDraft.you ?? ""}
                                onChange={(event) => updateVocabularyDraft(topicRow.id, { you: event.target.value })}
                                rows={3}
                              />
                            </label>
                            <label className="admin-field-wide">
                              <span>Friend phrase</span>
                              <textarea
                                value={rowDraft.friend ?? ""}
                                onChange={(event) => updateVocabularyDraft(topicRow.id, { friend: event.target.value })}
                                rows={3}
                              />
                            </label>
                          </div>
                          <div className="admin-managed-two-column">
                            <label className="admin-field-wide">
                              <span>Natal fallback phrase</span>
                              <textarea
                                value={rowDraft.natal}
                                onChange={(event) => updateVocabularyDraft(topicRow.id, { natal: event.target.value })}
                                rows={3}
                              />
                            </label>
                            <label className="admin-field-wide">
                              <span>Sky phrase</span>
                              <textarea
                                value={rowDraft.sky}
                                onChange={(event) => updateVocabularyDraft(topicRow.id, { sky: event.target.value })}
                                rows={3}
                              />
                            </label>
                          </div>
                        </>
                      )}

                      {rowDraft && topicRow && showsSignNeed && (
                        <label className="admin-field-wide">
                          <span>Current Moon in sign</span>
                          <textarea
                            value={item.signNeedRow ? signNeedDraft?.signNeed ?? "" : rowDraft.signNeed ?? ""}
                            onChange={(event) => updateVocabularyDraft(item.signNeedRow?.id ?? topicRow.id, { signNeed: event.target.value })}
                            rows={2}
                          />
                          <small>Used when the lunar calendar Moon is in this sign. Completes: Moon in this sign days tend to run on...</small>
                        </label>
                      )}

                      {rowDraft && topicRow && (showsZodiacStory || showsShadow) && (
                        <div className="admin-managed-two-column">
                          {showsZodiacStory && (
                            <label className="admin-field-wide">
                              <span>Zodiac story / legend</span>
                              <textarea
                                value={item.storyRow ? storyDraft?.story ?? "" : rowDraft.story ?? ""}
                                onChange={(event) => updateVocabularyDraft(item.storyRow?.id ?? topicRow.id, { story: event.target.value })}
                                rows={4}
                              />
                            </label>
                          )}
                          {showsShadow && (
                            <label className="admin-field-wide">
                              <span>
                                {item.shadowRow?.content_key.startsWith("vocab/planet-shadow/") || vocabularyFamily === "planet-shadow"
                                  ? "Planet shadow"
                                  : item.shadowRow?.content_key.startsWith("vocab/house-shadow/") || vocabularyFamily === "house-shadow"
                                    ? "House shadow"
                                    : "Zodiac shadow"}
                              </span>
                              <textarea
                                value={item.shadowRow ? shadowDraft?.shadow ?? "" : rowDraft.shadow ?? ""}
                                onChange={(event) => updateVocabularyDraft(item.shadowRow?.id ?? topicRow.id, { shadow: event.target.value })}
                                rows={4}
                              />
                            </label>
                          )}
                        </div>
                      )}

                      {rowDraft && topicRow && showsHigherExpression && (
                        <label className="admin-field-wide">
                          <span>Higher expression</span>
                          <textarea
                            value={item.higherExpressionRow ? higherExpressionDraft?.higherExpression ?? "" : rowDraft.higherExpression ?? ""}
                            onChange={(event) => updateVocabularyDraft(item.higherExpressionRow?.id ?? topicRow.id, { higherExpression: event.target.value })}
                            rows={5}
                          />
                        </label>
                      )}

                      {item.taglineContentKey && taglineDraft && (
                        <label className="admin-field-wide">
                          <span>Natal card tagline</span>
                          <textarea
                            value={taglineDraft.tagline}
                            onChange={(event) => updateTaglineDraft(item.taglineContentKey ?? "", { tagline: event.target.value })}
                            rows={2}
                          />
                        </label>
                      )}
                    </div>

                    <div className="admin-vocabulary-drawer-footer admin-template-actions">
                      <button type="button" onClick={() => void saveVocabularyCard(item)} disabled={isLoading}>
                        <Save size={16} aria-hidden="true" />
                        Save Row
                      </button>
                    </div>
                  </section>
                </div>
              );
            })()}
          </section>
        ) : activePage === "knowledge" ? (
          <section className="admin-template-panel admin-knowledge-page" aria-label="Fallback hook rows">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Composition</p>
                <h2>Fallback Hooks</h2>
                <p>Edit the fallback-hook rows that render after exact content and phrase-bank composition miss. Use Templates for Mustache structure and Vocabulary & Phrases for reusable clauses.</p>
              </div>
              <div className="admin-release-summary" aria-label="Fallback hook row count">
                <article>
                  <span>{fallbackHookSectionFilter === "all" ? "Rows" : "Filtered"}</span>
                  <strong>{filteredFallbackHookRows.length}</strong>
                </article>
                <article>
                  <span>Families</span>
                  <strong>fallback-hook/</strong>
                </article>
              </div>
              <div className="admin-template-actions">
                <button className="admin-format-button" type="button" onClick={() => void downloadManagedContent("json", "templates")} disabled={isLoading || !canUseApi} aria-label="Download templates as JSON">
                  <Download size={16} aria-hidden="true" />
                  JSON
                </button>
                <button className="admin-format-button" type="button" onClick={() => void downloadManagedContent("csv", "templates")} disabled={isLoading || !canUseApi} aria-label="Download templates as CSV">
                  <Download size={16} aria-hidden="true" />
                  CSV
                </button>
                <button type="button" onClick={() => triggerContentImport("templates")} disabled={isLoading || !canUseApi}>
                  <Upload size={16} aria-hidden="true" />
                  Import
                </button>
              </div>
            </div>

            <div className="admin-fallback-usage" aria-label="How fallback rows are used">
                <article>
                  <span>Edit here</span>
                  <p>Use this page for current <code>fallback-hook/</code> routes only.</p>
                </article>
                <article>
                  <span>Use other editors for</span>
                  <p>Templates, articles, rich readings, archived rows, and vocabulary fragments each have their own editor.</p>
                </article>
                <article>
                  <span>Preview first</span>
                  <p>Open a row to preview the rendered sentence with sample slot values before publishing.</p>
                </article>
                <article>
                  <span>Diagnose route</span>
                  <p>Use Surface Map when you need to know which hook or surface called this row.</p>
                </article>
            </div>

            <div className="admin-fallback-section-filters" role="tablist" aria-label="Fallback hook sections">
              {fallbackHookSectionFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={fallbackHookSectionFilter === filter.key ? "active" : ""}
                  onClick={() => {
                    setFallbackHookSectionFilter(filter.key);
                    closeTemplateContentDrawer();
                  }}
                  role="tab"
                  aria-selected={fallbackHookSectionFilter === filter.key}
                >
                  <span>{filter.label}</span>
                  <strong>{fallbackHookSectionCounts[filter.key]}</strong>
                </button>
              ))}
            </div>

            {!isLunarCoverageSelected && (
              <div className="admin-fallback-row-list" aria-label="Fallback hook rows">
                {filteredFallbackHookRows.map((row) => {
                  const rowDraft = templateContentDrafts[row.id] ?? templateDraftFromRow(row);
                  const badge = contentTypeBadge(row);
                  const hookKey = hookKeyFromFallbackTemplateRow(row);
                  const hook = fallbackHookForContextRow(hookKey);
                  const isSelected = row.id === selectedTemplateContentId || selectedTemplateContentRow?.id === row.id;
                  const isLocalOnly = isLocalPlaceholderGeneratedContentRow(row);
                  const isLegacyFallback = isLegacyFallbackTemplateRow(row);

                  const openTemplateRow = (mode: AdminTemplateDrawerMode) => {
                    setTemplateDrawerMode(mode);
                    setSelectedTemplateContentId(row.id);
                    setSelectedFallbackHookKey(hookKey);
                    window.history.replaceState(null, "", `#fallback-row/${encodeURIComponent(hookKey)}`);
                  };

                  return (
                    <article
                      className={`admin-fallback-row ${isSelected ? "selected" : ""}`}
                      data-template-row={row.content_key}
                      key={row.id}
                    >
                      <div className="admin-fallback-row-main">
                        <div>
                          <p className="admin-eyebrow">{row.prompt_version ?? "unknown prompt"} / {fallbackHookSurfaceLabel(row, hook)}</p>
                          <h3>{labelForFallbackTemplateRow(row)}</h3>
                          <code>{row.content_key}</code>
                        </div>
                        <div className="admin-managed-badges">
                          {badge && <span className="ui-pill admin-template-badge">{badge}</span>}
                          {hook?.domain && <span className="ui-pill admin-template-badge">{hook.domain}</span>}
                          {isLegacyFallback && <span className="ui-pill admin-status status-archived">Archived model</span>}
                          {isLocalOnly ? (
                            <span className="ui-pill admin-status admin-slot-status-local">Local only</span>
                          ) : (
                            <span className={`ui-pill admin-status status-${row.status.toLowerCase()}`}>{row.status}</span>
                          )}
                        </div>
                      </div>
                      <p>{descriptionForFallbackTemplateRow(row)}</p>
                      {isLegacyFallback && (
                        <p className="admin-template-note admin-publication-note">Archived model: blocked from reader routes until rewritten as current fallback-hook or slot-template wording.</p>
                      )}
                      <small>{previewForFallbackTemplateDraft(rowDraft)}</small>
                      <div className="admin-fallback-row-actions">
                        <button type="button" onClick={() => openTemplateRow("view")} title={`View ${row.content_key} inside the dashboard`}>
                          <Eye size={15} aria-hidden="true" />
                          View in dashboard
                        </button>
                        <button type="button" onClick={() => openTemplateRow("edit")} title={`Edit ${row.content_key}`}>
                          <Pencil size={15} aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                    </article>
                  );
                })}
                {filteredFallbackHookRows.length === 0 && (
                  <p className="admin-empty">No fallback-hook rows match this section.</p>
                )}
              </div>
            )}

            {isLunarCoverageSelected && (
            <section className="admin-lunar-coverage" aria-label="Lunar calendar content coverage">
              <div className="admin-lunar-coverage-heading">
                <div>
                  <p className="admin-eyebrow">Lunar calendar</p>
                  <h3>Content Coverage</h3>
                </div>
                <p className="admin-template-note">Registered lunar calendar keys are checked against saved rows and vocabulary dependencies. Empty rows are listed without creating content.</p>
              </div>

              <div className="admin-lunar-coverage-filter" role="tablist" aria-label="Lunar content coverage filters">
                {lunarCoverageFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={lunarCoverageFilter === filter.key ? "active" : ""}
                    onClick={() => setLunarCoverageFilter(filter.key)}
                    role="tab"
                    aria-selected={lunarCoverageFilter === filter.key}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="admin-lunar-coverage-summary" aria-label="Lunar coverage summary">
                {lunarCoverageSummaries.filter((summary) => filteredLunarCoverageGroups.includes(summary.group)).map((summary) => (
                  <article key={summary.group}>
                    <span>{summary.label}</span>
                    <strong>{summary.live} of {summary.total} LIVE</strong>
                    <small>{summary.draft} DRAFT / {summary.empty} empty</small>
                    {!lunarCoverageLoadedFromDb && (
                      <small>DB coverage not loaded</small>
                    )}
                    {summary.vocabGaps.length > 0 && (
                      <details>
                        <summary>{summary.vocabGaps.length} vocab gaps</summary>
                        <div>
                          {summary.vocabGaps.map((vocabKey) => (
                            <code key={vocabKey}>{vocabKey}</code>
                          ))}
                        </div>
                      </details>
                    )}
                  </article>
                ))}
              </div>

              <div className="admin-lunar-coverage-groups">
                {filteredLunarCoverageGroups.map((group) => {
                  const definitions = lunarCalendarContentKeyDefinitions.filter((definition) => definition.group === group);

                  return (
                    <section key={group} aria-label={`${lunarCoverageGroupLabels[group]} lunar content rows`}>
                      <div className="admin-lunar-coverage-group-heading">
                        <h4>{lunarCoverageGroupLabels[group]}</h4>
                        <span>{definitions.length} keys</span>
                      </div>
                      <div className="admin-lunar-coverage-row-list">
                        {definitions.map((definition) => {
                          const row = lunarCoverageRowsByKey.get(definition.key);
                          const rowStatus = row?.status ?? "empty";

                          return (
                            <article className="admin-lunar-coverage-row" data-lunar-coverage-key={definition.key} key={definition.key}>
                              <div>
                                <strong>{definition.label}</strong>
                                <code>{definition.key}</code>
                              </div>
                              <div className="admin-lunar-field-states" aria-label={`${definition.label} field coverage`}>
                                {definition.fieldKeys.map((field) => {
                                  const filled = lunarCoverageFieldFilled(row, field);

                                  return (
                                    <span className={filled ? "is-filled" : "is-empty"} key={field}>
                                      {lunarCoverageFieldLabel(field)}: {filled ? "filled" : "empty"}
                                    </span>
                                  );
                                })}
                              </div>
                              <div className="admin-lunar-coverage-row-actions">
                                <span className={`ui-pill admin-status status-${rowStatus.toLowerCase()}`}>{rowStatus}</span>
                                <button type="button" onClick={() => void openLunarCoverageEditor(row, definition)}>
                                  <Pencil size={15} aria-hidden="true" />
                                  Edit Row
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
            )}

            {selectedTemplateContentRow && (
              <div className="admin-drawer-backdrop" role="presentation" onClick={closeTemplateContentDrawer}>
                <section
                  className="admin-editor-panel admin-template-drawer admin-editor-drawer"
                  aria-label={templateDrawerMode === "view" ? "Fallback hook preview" : "Fallback hook editor"}
                  onClick={(event) => event.stopPropagation()}
                >
                  {(() => {
                    const row = selectedTemplateContentRow;
                    const rowDraft = templateContentDrafts[row.id] ?? templateDraftFromRow(row);
                    const hookKey = hookKeyFromFallbackTemplateRow(row);
                    const hook = fallbackHookForContextRow(hookKey);
                    const badge = contentTypeBadge(row);
                    const seed = templateSeedForFallbackTemplateRow(row);
                    const isViewMode = templateDrawerMode === "view";
                    const isLocalOnly = isLocalPlaceholderGeneratedContentRow(row);
                    const isLegacyFallback = isLegacyFallbackTemplateRow(row);
                    const previewSlotDefaults = fallbackHookSampleContextForKey(hookKey);
                    const previewSlotDraft = templatePreviewSlotDrafts[row.content_key] ?? {};
                    const previewSlots = Object.fromEntries(
                      Object.entries(previewSlotDefaults).map(([slot, value]) => [slot, previewSlotDraft[slot] ?? String(value ?? "")])
                    );
                    const renderedPreview = fallbackTemplatePreviewForDraft(row, hookKey, rowDraft, previewSlots);
                    const renderedParagraphs = fallbackPreviewParagraphs(renderedPreview.body);

                    return (
                      <>
                        <div className="admin-editor-toolbar">
                          <div className="admin-drawer-topbar">
                            <p className="admin-eyebrow">{isViewMode ? "Fallback hook preview" : "Fallback hook editor"}</p>
                            <button type="button" onClick={closeTemplateContentDrawer}>
                              <X size={16} aria-hidden="true" />
                              Close
                            </button>
                          </div>
                          <div className="admin-editor-heading">
                            <div>
                              <p className="admin-eyebrow">{row.prompt_version ?? "unknown prompt"} / {fallbackHookSurfaceLabel(row, hook)}</p>
                              <h2>{labelForFallbackTemplateRow(row)}</h2>
                            </div>
                            <div className="admin-managed-badges">
                              {badge && <span className="ui-pill admin-template-badge">{badge}</span>}
                              {hook?.domain && <span className="ui-pill admin-template-badge">{hook.domain}</span>}
                              {isLegacyFallback && <span className="ui-pill admin-status status-archived">Archived model</span>}
                              {isLocalOnly && <span className="ui-pill admin-status admin-slot-status-local">Local only</span>}
                              {isViewMode ? (
                                !isLocalOnly && <span className={`ui-pill admin-status status-${rowDraft.status.toLowerCase()}`}>{rowDraft.status}</span>
                              ) : (
                                <label className="admin-status-select-label">
                                  <span>Status</span>
                                  <select
                                    className={`admin-status-select status-${rowDraft.status.toLowerCase()}`}
                                    value={rowDraft.status}
                                    onChange={(event) => updateTemplateContentDraft(row.id, { status: event.target.value as GeneratedContentStatus })}
                                  >
                                    <option value="DRAFT">Draft</option>
                                    <option value="REVIEWED">Reviewed</option>
                                    <option value="LIVE">Published</option>
                                    <option value="ARCHIVED">Archived</option>
                                  </select>
                                </label>
                              )}
                            </div>
                          </div>
                          <code className="admin-managed-key">{row.content_key}</code>
                          <p className="admin-template-note">{descriptionForFallbackTemplateRow(row)}</p>
                          {isLegacyFallback && (
                            <p className="admin-template-note admin-publication-note">Archived model: blocked from reader routes until rewritten as current fallback-hook or slot-template wording.</p>
                          )}
                          <p className="admin-template-note admin-publication-note">
                            Runtime order: exact content wins first, phrase-bank composition wins second, and this fallback hook renders only when both miss.
                          </p>
                        </div>

                        <div className="admin-template-drawer-body">
                          {isViewMode ? (
                            <>
                              <section className="admin-template-slot-preview admin-template-slot-editor" aria-label="Editable sample variables">
                                {Object.entries(renderedPreview.slots).map(([slot, value]) => (
                                  <label key={slot}>
                                    <span>{slot}</span>
                                    <input
                                      value={String(value ?? "")}
                                      onChange={(event) => updateTemplatePreviewSlot(row.content_key, slot, event.target.value)}
                                    />
                                  </label>
                                ))}
                              </section>

                              <section className="admin-template-rendered-preview" aria-label="Rendered fallback preview">
                                <article>
                                  <span>Headline</span>
                                  <h3>{renderedPreview.headline || "No fallback copy saved yet."}</h3>
                                </article>
                                <article>
                                  <span>Summary</span>
                                  <p>{renderedPreview.summary || "No fallback copy saved yet."}</p>
                                </article>
                                <article>
                                  <span>Body</span>
                                  {renderedParagraphs.length > 0 ? (
                                    renderedParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                                  ) : (
                                    <p>No fallback copy saved yet.</p>
                                  )}
                                </article>
                              </section>
                            </>
                          ) : (
                            <>
                              <label className="admin-field-wide">
                                <span>Headline</span>
                                <textarea
                                  value={rowDraft.headline}
                                  onChange={(event) => updateTemplateContentDraft(row.id, { headline: event.target.value })}
                                  rows={3}
                                />
                              </label>

                              <label className="admin-field-wide">
                                <span>Summary</span>
                                <textarea
                                  value={rowDraft.summary}
                                  onChange={(event) => updateTemplateContentDraft(row.id, { summary: event.target.value })}
                                  rows={5}
                                />
                              </label>

                              <label className="admin-field-wide">
                                <span>Body</span>
                                <textarea
                                  value={rowDraft.body}
                                  onChange={(event) => updateTemplateContentDraft(row.id, { body: event.target.value })}
                                  rows={12}
                                />
                              </label>
                            </>
                          )}

                          {seed && (
                            <div className="admin-template-seed-context" aria-label="Template support copy">
                              <article>
                                <span>Best move</span>
                                <p>{seed.fields.bestMove || "No best move seed saved for this template."}</p>
                              </article>
                              <article>
                                <span>Empty state</span>
                                <p>{seed.fields.emptyState || "If no approved content exists, leave the product surface blank."}</p>
                              </article>
                            </div>
                          )}

                          <div className="admin-template-actions">
                            {isViewMode ? (
                              <>
                                {Object.keys(previewSlotDefaults).length > 0 && (
                                  <button type="button" onClick={() => resetTemplatePreviewSlots(row.content_key)}>
                                    <RefreshCw size={16} aria-hidden="true" />
                                    Reset Variables
                                  </button>
                                )}
                                <button type="button" onClick={() => setTemplateDrawerMode("edit")}>
                                  <Pencil size={16} aria-hidden="true" />
                                  Edit Row
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => setTemplateDrawerMode("view")}>
                                  <Eye size={16} aria-hidden="true" />
                                  View in dashboard
                                </button>
                                <button type="button" onClick={() => void saveTemplateContentRow(row)} disabled={isLoading}>
                                  <Save size={16} aria-hidden="true" />
                                  Save Row
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </section>
              </div>
            )}
          </section>
        ) : activePage === "hooks" ? (
          <section id="content-hooks" className="admin-template-panel admin-hooks-page" aria-label="Content hook catalog">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">App surfaces</p>
                <h2>Surface Map</h2>
                <p>Use this read-only map when the public app shows wrong copy. It shows the exact prose sources behind each surface and whether that surface is normalized into the two-layer writing model.</p>
              </div>
              <div className="admin-template-actions">
                <button className="admin-format-button" type="button" onClick={() => void downloadManagedContent("json", "context")} disabled={isLoading || !canUseApi} aria-label="Download context rows as JSON">
                  <Download size={16} aria-hidden="true" />
                  JSON
                </button>
                <button className="admin-format-button" type="button" onClick={() => void downloadManagedContent("csv", "context")} disabled={isLoading || !canUseApi} aria-label="Download context rows as CSV">
                  <Download size={16} aria-hidden="true" />
                  CSV
                </button>
                <button type="button" onClick={() => triggerContentImport("context")} disabled={isLoading || !canUseApi}>
                  <Upload size={16} aria-hidden="true" />
                  Import
                </button>
              </div>
            </div>

            <section className="admin-writing-source-map" aria-label="Writing surface source map">
              <div className="admin-writing-map-quickstart" aria-label="How to use Surface Map">
                <article>
                  <span>1</span>
                  <strong>Find the public surface</strong>
                  <p>Filter by Friends, Natal, Sky, Transits, or System. Pick the card matching the screen where the copy appears.</p>
                </article>
                <article>
                  <span>2</span>
                  <strong>Check the prose layer</strong>
                  <p>Source-grounded is authored or reviewed. Madlib fallback is a source-based sentence frame. Empty slots should be omitted.</p>
                </article>
                <article>
                  <span>3</span>
                  <strong>Open the edit target</strong>
                  <p>Use the highlighted edit-source list before digging into render paths, hooks, or route diagnostics.</p>
                </article>
              </div>

              <div className="admin-writing-map-flow" aria-label="Two-layer prose model">
                <article>
                  <span>Layer 1</span>
                  <strong>Source-grounded</strong>
                  <p>Authored, reviewed, or source-shaped prose already normalized into the surface slots.</p>
                </article>
                <article>
                  <span>Layer 2</span>
                  <strong>Madlib fallback</strong>
                  <p>Sentence frames filled from source-based knowledge, phrase banks, vocabulary, and lived-experience lists.</p>
                </article>
                <article>
                  <span>Never render</span>
                  <strong>Raw material</strong>
                  <p>Vocabulary arrays, authoring notes, directional scaffolds, and emergency placeholder paragraphs stay out of the reader UI.</p>
                </article>
              </div>

              <div className="admin-writing-map-stats" aria-label="Surface normalization counts">
                <article>
                  <span>Total surfaces</span>
                  <strong>{surfaceSourceStatusCounts.total}</strong>
                </article>
                <article>
                  <span>Normalized</span>
                  <strong>{surfaceSourceStatusCounts.normalized}</strong>
                </article>
                <article>
                  <span>Partial</span>
                  <strong>{surfaceSourceStatusCounts.partial}</strong>
                </article>
                <article>
                  <span>Not normalized</span>
                  <strong>{surfaceSourceStatusCounts["not-normalized"]}</strong>
                </article>
              </div>

              <div className="admin-writing-map-controls admin-filter-toolbar" aria-label="Surface map filters">
                <div className="admin-filter-toolbar-header">
                  <div>
                    <p className="admin-eyebrow">Browse surfaces</p>
                    <strong>{filteredWritingSurfaces.length} of {writingSurfaceSourceMap.length}</strong>
                  </div>
                  {(writingSurfaceAreaFilter !== "all" || writingSurfaceStatusFilter !== "all") && (
                    <button
                      className="admin-filter-reset"
                      type="button"
                      onClick={() => {
                        setWritingSurfaceAreaFilter("all");
                        setWritingSurfaceStatusFilter("all");
                      }}
                    >
                      <X size={15} aria-hidden="true" />
                      Reset
                    </button>
                  )}
                </div>
                <fieldset className="admin-slot-filter-group admin-segmented-filter" aria-label="Filter surfaces by area">
                  <legend>Area</legend>
                  <button
                    type="button"
                    className={writingSurfaceAreaFilter === "all" ? "active" : ""}
                    aria-pressed={writingSurfaceAreaFilter === "all"}
                    onClick={() => setWritingSurfaceAreaFilter("all")}
                  >
                    <span>All</span>
                    <strong>{writingSurfaceSourceMap.length}</strong>
                  </button>
                  {writingSurfaceAreaOptions.map((area) => (
                    <button
                      key={area}
                      type="button"
                      className={writingSurfaceAreaFilter === area ? "active" : ""}
                      aria-pressed={writingSurfaceAreaFilter === area}
                      onClick={() => setWritingSurfaceAreaFilter(area)}
                    >
                      <span>{area}</span>
                      <strong>{writingSurfaceSourceMap.filter((surface) => surface.area === area).length}</strong>
                    </button>
                  ))}
                </fieldset>
                <fieldset className="admin-slot-filter-group admin-segmented-filter" aria-label="Filter surfaces by normalization status">
                  <legend>Status</legend>
                  <button
                    type="button"
                    className={writingSurfaceStatusFilter === "all" ? "active" : ""}
                    aria-pressed={writingSurfaceStatusFilter === "all"}
                    onClick={() => setWritingSurfaceStatusFilter("all")}
                  >
                    <span>All</span>
                    <strong>{writingSurfaceSourceMap.length}</strong>
                  </button>
                  {(["normalized", "partial", "not-normalized"] as WritingSurfaceStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={writingSurfaceStatusFilter === status ? "active" : ""}
                      aria-pressed={writingSurfaceStatusFilter === status}
                      onClick={() => setWritingSurfaceStatusFilter(status)}
                    >
                      <span>{writingSurfaceStatusLabels[status]}</span>
                      <strong>{surfaceSourceStatusCounts[status]}</strong>
                    </button>
                  ))}
                </fieldset>
              </div>

              <div className="admin-writing-map-groups">
                {surfaceSourceGroups.map((group) => (
                  <section className="admin-writing-map-group" key={group.area} aria-label={`${group.area} writing surfaces`}>
                    <div className="admin-lunar-coverage-heading">
                      <div>
                        <p className="admin-eyebrow">{group.area}</p>
                        <h3>{group.area} surfaces</h3>
                      </div>
                    </div>
                    <div className="admin-writing-surface-grid">
                      {group.items.map((surface) => {
                        const editableSources = writingSurfaceEditableSources(surface);

                        return (
                          <article className="admin-writing-surface-card" key={surface.id}>
                            <header>
                              <div>
                                <p className="admin-eyebrow">{surface.area}</p>
                                <h4>{surface.surface}</h4>
                              </div>
                              <span className={`ui-pill admin-writing-status ${writingSurfaceStatusClass(surface.status)}`}>
                                {writingSurfaceStatusLabels[surface.status]}
                              </span>
                            </header>

                            <section className="admin-writing-edit-target" aria-label={`${surface.surface} edit target`}>
                              <p className="admin-eyebrow">Edit target</p>
                              <div className="admin-writing-edit-list">
                                {editableSources.map((source) => (
                                  <div key={`${surface.id}-editable-${source.path}`}>
                                    <span>{writingSurfaceSourceRoleLabels[source.role]}</span>
                                    <div className="admin-writing-edit-source-body">
                                      <code>{source.path}</code>
                                      <small>{writingSurfaceSourceActionHelp(source)}</small>
                                      <button
                                        className={writingSurfaceSourceActionClass(source)}
                                        type="button"
                                        disabled={!writingSurfaceSourceCanOpen(source)}
                                        onClick={() => openWritingSurfaceSource(surface, source)}
                                      >
                                        <Pencil size={14} aria-hidden="true" />
                                        {writingSurfaceSourceActionLabel(source)}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>

                            <dl className="admin-writing-surface-facts">
                              <div>
                                <dt>Visible layer order</dt>
                                <dd>{surface.visibleLayerOrder.map((layer) => writingLayerLabels[layer]).join(" -> ")}</dd>
                              </div>
                              <div>
                                <dt>Required slots</dt>
                                <dd>{surface.requiredSlots.join(", ")}</dd>
                              </div>
                              <div>
                                <dt>Current path</dt>
                                <dd>{surface.currentRenderPath}</dd>
                              </div>
                              <div>
                                <dt>Risk</dt>
                                <dd>{surface.risk}</dd>
                              </div>
                            </dl>

                            <div className="admin-writing-source-list" aria-label={`${surface.surface} source files`}>
                              {surface.sources.map((source) => (
                                <div key={`${surface.id}-${source.path}`}>
                                  <span>{writingSurfaceSourceRoleLabels[source.role]}</span>
                                  <code>{source.path}</code>
                                </div>
                              ))}
                            </div>

                            <p className="admin-writing-next-action">{surface.nextAction}</p>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
                {filteredWritingSurfaces.length === 0 && (
                  <p className="admin-template-note">No surfaces match the selected filters.</p>
                )}
              </div>
            </section>

            <div className="admin-fallback-usage admin-hook-resolution-legacy" aria-label="Legacy hook resolution">
              <article>
                <span>Hook catalog note</span>
                <p>The table below is still useful for locating fallback-hook rows, but hooks should become routers and madlib inputs, not a third prose layer.</p>
              </article>
              <article>
                <span>Source-grounded first</span>
                <p>Exact authored rows, reviewed phrasebank records, and knowledge bundles should fill normalized surface slots before fallback runs.</p>
              </article>
              <article>
                <span>Madlib second</span>
                <p>Fallback rows should compose sentences from source-based phrases and lived-experience lists.</p>
              </article>
              <article>
                <span>Use this for</span>
                <p>Finding the editor. This page diagnoses routes; it is not where you write the final copy.</p>
              </article>
            </div>

            <section className="admin-lunar-hook-catalog" aria-label="Lunar calendar hook catalog">
              <div className="admin-lunar-coverage-heading">
                <div>
                  <p className="admin-eyebrow">Lunar calendar</p>
                  <h3>Registered Content Keys</h3>
                </div>
                <p className="admin-template-note">Structural descriptions for the lunar calendar keys registered in code.</p>
              </div>
              <div className="admin-table-scroll admin-lunar-hook-table" role="region" aria-label="Registered lunar calendar content keys" tabIndex={0}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Group</th>
                      <th scope="col">Content key</th>
                      <th scope="col">Description</th>
                      <th scope="col">Editable fields</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lunarCalendarContentKeyDefinitions.map((definition) => (
                      <tr
                        className="admin-clickable-table-row"
                        key={definition.key}
                        onClick={() => setSelectedHookCatalogItem({ type: "lunar", key: definition.key })}
                        onKeyDown={(event) => openHookCatalogItemFromKeyboard(event, { type: "lunar", key: definition.key })}
                        role="button"
                        tabIndex={0}
                      >
                        <td>{lunarCoverageGroupLabels[definition.group]}</td>
                        <td><code>{definition.key}</code></td>
                        <td>{lunarCoverageDescription(definition)}</td>
                        <td>
                          <div className="admin-inline-code-list">
                            {definition.fieldKeys.map((fieldKey) => (
                              <code key={fieldKey}>{lunarCoverageFieldLabel(fieldKey)}</code>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="admin-hook-table-wrap">
              <div className="admin-lunar-coverage-heading">
                <div>
                  <p className="admin-eyebrow">Hook catalog</p>
                  <h3>Fallback Hook Routes</h3>
                </div>
                <p className="admin-template-note">Scrollable route index for app surfaces, required facts, lookup IDs, and fallback-hook or slot-template patterns.</p>
              </div>
              <div className="admin-table-scroll admin-hook-table" role="region" aria-label="Fallback hook routes" tabIndex={0}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Area</th>
                      <th scope="col">Hook</th>
                      <th scope="col">Key</th>
                      <th scope="col">Needs</th>
                      <th scope="col">Looks for</th>
                      <th scope="col">Saved row</th>
                      <th scope="col">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
              {fallbackHookDefinitions.map((hook) => {
                const sampleContext = resolvedFallbackHookSampleContexts[hook.key] ?? fallbackHookSampleContexts[hook.key] ?? {};
                const sampleIds = knowledgeIdsForFallbackHook(hook.key, sampleContext);
                const plainDescription = hookPlainDescriptions[hook.key] || hook.description;
                const savedHookRow = fallbackTemplateRowsByContentKey.get(contextContentKey(hook.key));
                const hookArea = hook.label.startsWith("Lunar Calendar >")
                  ? "Lunar Calendar"
                  : hook.domain === "natal" && hook.surface === "you"
                    ? "Natal"
                    : hook.surface;

                return (
                  <tr
                    className="admin-clickable-table-row"
                    key={hook.key}
                    onClick={() => setSelectedHookCatalogItem({ type: "fallback", key: hook.key })}
                    onKeyDown={(event) => openHookCatalogItemFromKeyboard(event, { type: "fallback", key: hook.key })}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <span className="admin-hook-area">{hookArea}</span>
                      <small>{hook.domain} / {hook.mode}</small>
                    </td>
                    <td>
                      <strong>{hook.label}</strong>
                      <p>{plainDescription}</p>
                    </td>
                    <td><code>{hook.key}</code></td>
                    <td>
                      <div className="admin-inline-code-list">
                        {hook.requiredFacts.map((fact) => (
                          <code key={fact}>{fact}</code>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="admin-inline-code-list">
                        {hook.knowledgeIdTemplates.map((template) => (
                          <code key={template}>{template}</code>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`ui-pill admin-status ${savedHookRow ? `status-${savedHookRow.status.toLowerCase()}` : ""}`}>
                        {savedHookRow ? contentStatusLabel(savedHookRow.status) : "Missing"}
                      </span>
                    </td>
                    <td>
                      {sampleIds.length} example{sampleIds.length === 1 ? "" : "s"}
                    </td>
                  </tr>
                );
              })}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedHookCatalogItem && (
              <div className="admin-drawer-backdrop" role="presentation" onClick={() => setSelectedHookCatalogItem(null)}>
                <section
                  className="admin-editor-panel admin-template-drawer admin-editor-drawer admin-hook-catalog-drawer"
                  aria-label="Hook catalog detail"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="admin-editor-toolbar">
                    <div className="admin-drawer-topbar">
                      <p className="admin-eyebrow">{selectedHookCatalogItem.type === "lunar" ? "Registered content key" : "Fallback hook route"}</p>
                      <button type="button" onClick={() => setSelectedHookCatalogItem(null)}>
                        <X size={16} aria-hidden="true" />
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="admin-template-drawer-body">
                    {selectedLunarCatalogDefinition ? (() => {
                      const savedRow = lunarCoverageRowsByKey.get(selectedLunarCatalogDefinition.key);
                      const vocabDependencies = lunarCoverageVocabDependencies(selectedLunarCatalogDefinition);

                      return (
                        <>
                          <div className="admin-hook-detail-header">
                            <p className="admin-eyebrow">{lunarCoverageGroupLabels[selectedLunarCatalogDefinition.group]}</p>
                            <h3>{selectedLunarCatalogDefinition.label}</h3>
                            <code>{selectedLunarCatalogDefinition.key}</code>
                            <p>{lunarCoverageDescription(selectedLunarCatalogDefinition)}</p>
                            <div className="admin-hook-detail-actions">
                              <button type="button" onClick={() => void openLunarCoverageEditor(savedRow, selectedLunarCatalogDefinition)}>
                                <Pencil size={15} aria-hidden="true" />
                                Open Row Editor
                              </button>
                              <button type="button" onClick={() => copyLunarCoverageEditorLink(selectedLunarCatalogDefinition)}>
                                <KeyRound size={15} aria-hidden="true" />
                                Copy Link to Row
                              </button>
                            </div>
                          </div>

                          <div className="admin-hook-detail-grid">
                            <article>
                              <span>Saved row</span>
                              <strong>{savedRow ? savedRow.status : lunarCoverageLoadedFromDb ? "Missing" : "Not loaded"}</strong>
                            </article>
                            <article>
                              <span>Group</span>
                              <strong>{lunarCoverageGroupLabels[selectedLunarCatalogDefinition.group]}</strong>
                            </article>
                          </div>

                          <section className="admin-hook-detail-section">
                            <h4>Editable fields</h4>
                            <div className="admin-inline-code-list">
                              {selectedLunarCatalogDefinition.fieldKeys.map((fieldKey) => (
                                <code key={fieldKey}>{lunarCoverageFieldLabel(fieldKey)}</code>
                              ))}
                            </div>
                          </section>

                          <section className="admin-hook-detail-section">
                            <h4>Template slots</h4>
                            <div className="admin-inline-code-list">
                              {selectedLunarCatalogDefinition.slotKeys.map((slotKey) => (
                                <code key={slotKey}>{slotKey}</code>
                              ))}
                            </div>
                          </section>

                          <section className="admin-hook-detail-section">
                            <h4>Vocabulary dependencies</h4>
                            {vocabDependencies.length > 0 ? (
                              <div className="admin-inline-code-list">
                                {vocabDependencies.map((vocabKey) => (
                                  <code key={vocabKey}>{vocabKey}</code>
                                ))}
                              </div>
                            ) : (
                              <p>No vocabulary dependencies registered for this key.</p>
                            )}
                          </section>
                        </>
                      );
                    })() : selectedFallbackCatalogHook ? (() => {
                      const sampleContext = resolvedFallbackHookSampleContexts[selectedFallbackCatalogHook.key]
                        ?? fallbackHookSampleContextForKey(selectedFallbackCatalogHook.key);
                      const sampleIds = knowledgeIdsForFallbackHook(selectedFallbackCatalogHook.key, sampleContext);
                      const plainDescription = hookPlainDescriptions[selectedFallbackCatalogHook.key] || selectedFallbackCatalogHook.description;
                      const savedFallbackHookRow = fallbackTemplateRowsByContentKey.get(contextContentKey(selectedFallbackCatalogHook.key));

                      return (
                        <>
                          <div className="admin-hook-detail-header">
                            <p className="admin-eyebrow">{selectedFallbackCatalogHook.domain} / {selectedFallbackCatalogHook.mode}</p>
                            <h3>{selectedFallbackCatalogHook.label}</h3>
                            <code>{selectedFallbackCatalogHook.key}</code>
                            <p>{plainDescription}</p>
                            <div className="admin-hook-detail-actions">
                              {savedFallbackHookRow ? (
                                <button type="button" onClick={() => openFallbackHookTemplateEditor(selectedFallbackCatalogHook.key, "edit")}>
                                  <Pencil size={15} aria-hidden="true" />
                                  Open Fallback Row
                                </button>
                              ) : (
                                <button type="button" onClick={() => void createFallbackHookDraftFromCatalog(selectedFallbackCatalogHook)} disabled={isLoading || !canUseApi}>
                                  <Plus size={15} aria-hidden="true" />
                                  Author Draft
                                </button>
                              )}
                              <button type="button" onClick={() => copyFallbackHookEditorLink(selectedFallbackCatalogHook.key)}>
                                <KeyRound size={15} aria-hidden="true" />
                                Copy Link to Row
                              </button>
                            </div>
                          </div>

                          <div className="admin-hook-detail-grid">
                            <article>
                              <span>Saved row</span>
                              <strong>{savedFallbackHookRow ? contentStatusLabel(savedFallbackHookRow.status) : "Missing"}</strong>
                            </article>
                            <article>
                              <span>Surface</span>
                              <strong>{selectedFallbackCatalogHook.surface}</strong>
                            </article>
                            <article>
                              <span>Domain</span>
                              <strong>{selectedFallbackCatalogHook.domain}</strong>
                            </article>
                            <article>
                              <span>Mode</span>
                              <strong>{selectedFallbackCatalogHook.mode}</strong>
                            </article>
                          </div>

                          <section className="admin-hook-detail-section">
                            <h4>Required facts</h4>
                            <div className="admin-inline-code-list">
                              {selectedFallbackCatalogHook.requiredFacts.map((fact) => (
                                <code key={fact}>{fact}</code>
                              ))}
                            </div>
                          </section>

                          <section className="admin-hook-detail-section">
                            <h4>Knowledge IDs checked first</h4>
                            <div className="admin-inline-code-list">
                              {selectedFallbackCatalogHook.knowledgeIdTemplates.map((template) => (
                                <code key={template}>{template}</code>
                              ))}
                            </div>
                          </section>

                          <section className="admin-hook-detail-section">
                            <h4>Example lookups</h4>
                            <div className="admin-inline-code-list">
                              {sampleIds.map((sampleId) => (
                                <code key={sampleId}>{sampleId}</code>
                              ))}
                            </div>
                          </section>

                          <section className="admin-hook-detail-section">
                            <h4>Fallback hook patterns</h4>
                            <dl className="admin-hook-pattern-list">
                              <div>
                                <dt>Headline</dt>
                                <dd>{selectedFallbackCatalogHook.copy.headline || "empty"}</dd>
                              </div>
                              <div>
                                <dt>Summary</dt>
                                <dd>{selectedFallbackCatalogHook.copy.summary || "empty"}</dd>
                              </div>
                              <div>
                                <dt>Body</dt>
                                <dd>{selectedFallbackCatalogHook.copy.body || "empty"}</dd>
                              </div>
                              <div>
                                <dt>Best move</dt>
                                <dd>{selectedFallbackCatalogHook.copy.bestMove || "empty"}</dd>
                              </div>
                            </dl>
                          </section>
                        </>
                      );
                    })() : (
                      <p className="admin-empty">This hook is no longer registered.</p>
                    )}
                  </div>
                </section>
              </div>
            )}
          </section>
        ) : activePage === "templates" ? (
          <section id="voice-templates" className="admin-template-panel admin-template-page" aria-label="Template library and AI draft controls">
            <section className="admin-phrasebook-panel" aria-label="Mustache template library">
              <div className="admin-section-heading-row">
                <div>
                  <p className="admin-eyebrow">Composition</p>
                  <h2>Mustache Template Library</h2>
                  <p>Edit <code>slot-template/</code> rows here. These hold sentence structure and slot placement; Fallback Hooks hold route-specific safety copy.</p>
                </div>
                <span className="ui-pill">{currentMustacheTemplateRows.length} templates</span>
              </div>

              {duplicateMustacheTemplateKeys.length > 0 && (
                <p className="admin-template-note admin-publication-note">
                  Duplicate template IDs detected: {duplicateMustacheTemplateKeys.join(", ")}. Keep one current row per template key before publishing.
                </p>
              )}

              <div className="admin-fallback-row-list" aria-label="Mustache templates">
                {currentMustacheTemplateRows.map((row) => {
                  const rowDraft = templateContentDrafts[row.id] ?? templateDraftFromRow(row);
                  const badge = contentTypeBadge(row);

                  const openTemplateRow = (mode: AdminTemplateDrawerMode) => {
                    setTemplateDrawerMode(mode);
                    setSelectedTemplateContentId(row.id);
                    setSelectedFallbackHookKey(row.content_key);
                    setActivePage("knowledge");
                    window.history.replaceState(null, "", `#fallback-row/${encodeURIComponent(row.content_key)}`);
                  };

                  return (
                    <article className="admin-fallback-row" data-template-row={row.content_key} key={row.id}>
                      <div className="admin-fallback-row-main">
                        <div>
                          <p className="admin-eyebrow">{row.prompt_version ?? "template"} / {fallbackHookSurfaceLabel(row)}</p>
                          <h3>{labelForFallbackTemplateRow(row)}</h3>
                          <code>{row.content_key}</code>
                        </div>
                        <div className="admin-managed-badges">
                          {badge && <span className="ui-pill admin-template-badge">{badge}</span>}
                          <span className={`ui-pill admin-status status-${row.status.toLowerCase()}`}>{row.status}</span>
                        </div>
                      </div>
                      <p>{descriptionForFallbackTemplateRow(row)}</p>
                      <small>{previewForFallbackTemplateDraft(rowDraft)}</small>
                      <div className="admin-fallback-row-actions">
                        <button type="button" onClick={() => openTemplateRow("view")} title={`View ${row.content_key} inside the dashboard`}>
                          <Eye size={15} aria-hidden="true" />
                          View template
                        </button>
                        <button type="button" onClick={() => openTemplateRow("edit")} title={`Edit ${row.content_key}`}>
                          <Pencil size={15} aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                    </article>
                  );
                })}
                {currentMustacheTemplateRows.length === 0 && (
                  <p className="admin-empty">No slot-template rows are loaded.</p>
                )}
              </div>
            </section>

            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">AI draft controls</p>
                <h2>{voiceTemplateLabels[activeTemplateSurface]}</h2>
                <p>Set the reusable instructions the generator should follow when creating this type of astrology content. Save here first, then go back to Content Review and generate drafts.</p>
              </div>
              <div className="admin-template-actions">
                <button type="button" onClick={() => void saveVoiceTemplates()} disabled={isLoading}>
                  <Save size={16} aria-hidden="true" />
                  Save Templates
                </button>
                <button type="button" onClick={() => void resetActiveVoiceTemplate()} disabled={isLoading}>
                  Reset {voiceTemplateLabels[activeTemplateSurface]}
                </button>
              </div>
            </div>

            <section className="admin-voice-settings-panel" aria-label="Voice settings import and export">
              <div className="admin-template-header">
                <div>
                  <p className="admin-eyebrow">Portable voice settings</p>
                  <h3>Import / Export Voice Settings</h3>
                  <p>Download or restore the voice templates and generation guidance for this dashboard.</p>
                </div>
                <div className="admin-template-actions">
                  <button className="admin-format-button" type="button" onClick={() => void downloadManagedContent("json", "settings")} disabled={isLoading} aria-label="Download voice settings as JSON">
                    <Download size={16} aria-hidden="true" />
                    JSON
                  </button>
                  <button className="admin-format-button" type="button" onClick={() => void downloadManagedContent("csv", "settings")} disabled={isLoading} aria-label="Download voice settings as CSV">
                    <Download size={16} aria-hidden="true" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerContentImport("settings")}
                    disabled={isLoading}
                  >
                    <Upload size={16} aria-hidden="true" />
                    Import Settings
                  </button>
                </div>
              </div>
              <div className="admin-release-summary" aria-label="Voice settings export coverage">
                <article>
                  <span>Surfaces</span>
                  <strong>{Object.keys(voiceTemplates).length}</strong>
                </article>
                <article>
                  <span>Format</span>
                  <strong>CSV / JSON</strong>
                </article>
                <article>
                  <span>Storage</span>
                  <strong>{voiceSettingsLoadedFromDb ? "Admin rows" : "Browser"}</strong>
                </article>
              </div>
            </section>

            <div className="admin-template-tabs" role="tablist" aria-label="Template surface">
              {(Object.keys(voiceTemplateLabels) as VoiceTemplateSurface[]).map((surfaceKey) => (
                <button
                  key={surfaceKey}
                  type="button"
                  className={surfaceKey === activeTemplateSurface ? "active" : ""}
                  onClick={() => setActiveTemplateSurface(surfaceKey)}
                  role="tab"
                  aria-selected={surfaceKey === activeTemplateSurface}
                >
                  {voiceTemplateLabels[surfaceKey]}
                </button>
              ))}
            </div>

            <label className="admin-field-wide">
              <span>{voiceTemplateLabels[activeTemplateSurface]} template and voice</span>
              <textarea
                value={voiceTemplates[activeTemplateSurface].template}
                onChange={(event) => updateVoiceTemplate(activeTemplateSurface, "template", event.target.value)}
                rows={16}
              />
            </label>

            <label className="admin-field-wide admin-template-guide-field">
              <span>AI generation guide</span>
              <textarea
                value={voiceTemplates[activeTemplateSurface].generationGuide}
                onChange={(event) => updateVoiceTemplate(activeTemplateSurface, "generationGuide", event.target.value)}
                rows={10}
              />
            </label>

            <div className="admin-template-two-column">
              <label className="admin-field-wide">
                <span>Banned words and phrases</span>
                <textarea
                  value={voiceTemplates[activeTemplateSurface].bannedWords}
                  onChange={(event) => updateVoiceTemplate(activeTemplateSurface, "bannedWords", event.target.value)}
                  rows={9}
                />
              </label>

              <label className="admin-field-wide">
                <span>Language and phrase bank</span>
                <textarea
                  value={voiceTemplates[activeTemplateSurface].phraseBank}
                  onChange={(event) => updateVoiceTemplate(activeTemplateSurface, "phraseBank", event.target.value)}
                  rows={9}
                />
              </label>
            </div>

            <div className="admin-template-guidance">
              <article>
                <span>Used by</span>
                <strong>{templateUsageLabel(activeTemplateSurface)}</strong>
              </article>
              <article>
                <span>Applied when</span>
                <strong>You click Generate</strong>
              </article>
              <article>
                <span>Row notes</span>
                <strong>Still layered on top</strong>
              </article>
            </div>

            <section className="admin-phrasebook-panel" aria-label="Metaphor and specificity phrase book">
              <div className="admin-section-heading-row">
                <div>
                  <p className="admin-eyebrow">Authoritative wording guide</p>
                  <h3>Metaphor & Specificity</h3>
                  <p>Use the concrete behavior before the metaphor. These flags are advisory and stay attached to reviewer notes.</p>
                </div>
                <span className="ui-pill">{metaphorValidationPhrases.length} validation phrases</span>
              </div>
              <div className="admin-phrasebook-grid">
                <article>
                  <span>Final editorial test</span>
                  <ul>
                    {metaphorGuidanceSummary.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <article>
                  <span>Generation flags</span>
                  <div className="admin-token-list">
                    {metaphorValidationPhrases.map((phrase) => (
                      <code key={phrase}>{phrase}</code>
                    ))}
                  </div>
                </article>
              </div>
              <div className="admin-phrasebook-families">
                {metaphorFamilies.slice(0, 6).map((family) => (
                  <article key={family.name}>
                    <span>{family.name}</span>
                    <p>{family.useFor}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-phrasebook-panel" aria-label="Fallback vocabulary dependency map">
              <div className="admin-section-heading-row">
                <div>
                  <p className="admin-eyebrow">Fallback vocabulary wiring</p>
                  <h3>Generation Dependencies</h3>
                  <p>{fallbackVocabularyReferenceLanePolicy}</p>
                </div>
              </div>
              <div className="admin-dependency-map-grid">
                {fallbackVocabularyDependencyFamilies.map((family) => (
                  <article key={family.id}>
                    <span>{family.label}</span>
                    <code>{family.required.join(" + ")}</code>
                    {family.optional.length ? <small>Optional: {family.optional.join(" + ")}</small> : null}
                    <p>{family.selection}</p>
                  </article>
                ))}
              </div>
            </section>

            <p className="admin-template-note">
              These templates shape the AI draft before review. With admin access, Save Templates also writes durable admin setting rows; without it, changes stay in this browser.
            </p>
          </section>
        ) : activePage === "reviewQueue" ? (
          <>
            <section className="admin-content-toolbar admin-review-queue-hero" aria-label="Review queue progress">
              <div>
                <p className="admin-eyebrow">Editorial workflow</p>
                <h2>Reviewed {reviewQueueProgress.reviewed} / {reviewQueueProgress.total} · Published {reviewQueueProgress.published} · Evergreen {reviewQueueProgress.evergreen}</h2>
                <p>Drafts and review holds stay out of reader routes. Published is the admin label for the internal LIVE serving status.</p>
              </div>
              <div className="admin-new-actions" aria-label="Bulk evergreen actions">
                <button type="button" onClick={() => void applyBulkEvergreen(true)} disabled={isLoading || selectedPersistedContentRecords.length === 0}>
                  <TreePine size={16} aria-hidden="true" />
                  Mark Evergreen
                </button>
                <button type="button" onClick={() => void applyBulkEvergreen(false)} disabled={isLoading || selectedPersistedContentRecords.length === 0}>
                  <X size={16} aria-hidden="true" />
                  Remove Evergreen
                </button>
              </div>
            </section>

            <section className="admin-content-filters admin-review-queue-filters" aria-label="Review queue filters">
              <label>
                <span>Status</span>
                <select value={reviewQueueStatusFilter} onChange={(event) => setReviewQueueStatusFilter(event.target.value as AdminReviewQueueStatusFilter)}>
                  {reviewQueueStatusFilters.map((filter) => (
                    <option key={filter.key} value={filter.key}>{filter.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Evergreen</span>
                <select value={reviewQueueEvergreenFilter} onChange={(event) => setReviewQueueEvergreenFilter(event.target.value as AdminReviewQueueEvergreenFilter)}>
                  {reviewQueueEvergreenFilters.map((filter) => (
                    <option key={filter.key} value={filter.key}>{filter.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Content class</span>
                <select value={reviewQueueSourceFilter} onChange={(event) => setReviewQueueSourceFilter(event.target.value as AdminReviewQueueSourceFilter)}>
                  {contentClassFilters.map((filter) => (
                    <option key={filter.key} value={filter.key}>{filter.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tier</span>
                <select value={reviewQueueTierFilter} onChange={(event) => setReviewQueueTierFilter(event.target.value as AdminPhrasebankTierFilter)}>
                  {phrasebankTierFilters.map((filter) => (
                    <option key={filter.key} value={filter.key}>{filter.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Family</span>
                <select value={reviewQueueFamilyFilter} onChange={(event) => setReviewQueueFamilyFilter(event.target.value as AdminReviewQueueFamilyFilter)}>
                  {(Object.keys(reviewQueueFamilyLabels) as AdminReviewQueueFamilyFilter[]).map((family) => (
                    <option key={family} value={family}>{reviewQueueFamilyLabels[family]}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Planet</span>
                <select value={reviewQueuePlanetFilter} onChange={(event) => setReviewQueuePlanetFilter(event.target.value)}>
                  <option value="all">All planets</option>
                  {reviewQueuePlacementPlanets.map((planet) => (
                    <option key={planet} value={planet}>{planet}</option>
                  ))}
                </select>
              </label>
              <label className="admin-review-queue-search">
                <span>Search</span>
                <div className="admin-search-input-shell">
                  <Search size={15} aria-hidden="true" />
                  <input value={reviewQueueQuery} onChange={(event) => setReviewQueueQuery(event.target.value)} placeholder="Title, content key, body text" />
                </div>
              </label>
            </section>

            <section className="admin-reader-safety-panel" aria-label="Final sign-off checklist">
              <div>
                <p className="admin-eyebrow">Final sign-off</p>
                <h3>Phrasebank checklist</h3>
                <p>Reviewed and session draft rows stay DRAFT or review-held until a row is explicitly signed off.</p>
              </div>
              <div className="admin-status-grid">
                {marieSignoffChecklist.map(([label, group, count]) => (
                  <div className="admin-status-card" key={`${group}-${label}`}>
                    <span>{group}</span>
                    <strong>{label}</strong>
                    <small>{count} rows</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-review-queue-layout" aria-label="Review queue">
              <aside className="admin-review-queue-groups" aria-label="Queue families">
                {reviewQueueGroups.length === 0 ? (
                  <p>No rows match these filters.</p>
                ) : reviewQueueGroups.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    className={activeReviewQueueGroup?.key === group.key ? "active" : ""}
                    onClick={() => setSelectedReviewQueueGroupKey(group.key)}
                  >
                    <span>{group.label}</span>
                    <small>{group.reviewed}/{group.total} reviewed · {group.evergreen} evergreen</small>
                  </button>
                ))}
              </aside>

              <div className="admin-review-queue-rows" aria-label="Review rows">
                {activeReviewQueueRecords.length === 0 ? (
                  <section className="admin-empty-state">
                    <p>No review rows in this group.</p>
                  </section>
                ) : activeReviewQueueRecords.map((record) => {
                  const transitionBlock = canTransitionReviewRecord(record, "REVIEWED");
                  const publishBlock = canTransitionReviewRecord(record, "LIVE");
                  const evergreenBlock = canMarkEvergreen(record);
                  const isSelectableRecord = record.source !== "private" && Boolean(savedGlobalRowId(record));
                  const phrasebankTier = phrasebankTierForRecord(record);
                  const phrasebankTierText = phrasebankTierLabel(phrasebankTier);
                  const recordContentClass = contentClassForReviewRecord(record);

                  return (
                    <article
                      key={record.id}
                      className={`admin-review-queue-row ${record.id === selectedReviewQueueRecord?.id ? "selected" : ""}`}
                      onClick={() => setSelectedReviewId(record.id)}
                    >
                      <div className="admin-review-queue-row-head">
                        <label className="admin-content-row-check" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedContentRowIds.has(record.id)}
                            disabled={isLoading || !isSelectableRecord}
                            onChange={() => toggleContentRowSelection(record)}
                            aria-label={`Select ${record.title}`}
                          />
                        </label>
                        <div>
                          <h3>{reviewQueueRecordLabel(record)}</h3>
                          <code>{record.contentKey}</code>
                        </div>
                        <span className={`ui-pill admin-status status-${record.status.toLowerCase()}`}>{contentStatusLabel(record.status)}</span>
                        <span className="ui-pill admin-status">{contentClassLabel(recordContentClass)}</span>
                        {phrasebankTierText ? (
                          <span className="ui-pill admin-status">{phrasebankTierText}</span>
                        ) : null}
                        {isArchivedModelRecord(record) ? (
                          <span className="ui-pill admin-status status-archived">Archive</span>
                        ) : null}
                        <button
                          type="button"
                          className={`admin-evergreen-toggle ${record.evergreen ? "active" : ""}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void setReviewQueueEvergreen(record, !record.evergreen);
                          }}
                          disabled={isLoading || (!record.evergreen && Boolean(evergreenBlock))}
                          title={record.evergreen ? "Remove evergreen lock" : evergreenBlock || "Mark evergreen"}
                        >
                          <TreePine size={16} aria-hidden="true" />
                          <span>{record.evergreen ? "Evergreen" : "Set Evergreen"}</span>
                        </button>
                      </div>
                      <label>
                        <span>Summary</span>
                        <textarea
                          defaultValue={record.summary}
                          rows={3}
                          onBlur={(event) => {
                            if (event.currentTarget.value !== record.summary) {
                              void updateReviewQueueCopy(record, { summary: event.currentTarget.value });
                            }
                          }}
                          onKeyDown={stopEditorKeyPropagation}
                        />
                      </label>
                      <label>
                        <span>Body</span>
                        <textarea
                          defaultValue={record.body}
                          rows={5}
                          onBlur={(event) => {
                            if (event.currentTarget.value !== record.body) {
                              void updateReviewQueueCopy(record, { body: event.currentTarget.value });
                            }
                          }}
                          onKeyDown={stopEditorKeyPropagation}
                        />
                      </label>
                      <div className="admin-review-queue-actions">
                        <button type="button" onClick={() => void transitionReviewQueueRecord(record, "ERROR")} disabled={isLoading}>
                          Needs Review
                        </button>
                        <button type="button" onClick={() => void transitionReviewQueueRecord(record, "DRAFT")} disabled={isLoading}>
                          Draft
                        </button>
                        <button type="button" onClick={() => void transitionReviewQueueRecord(record, "REVIEWED")} disabled={isLoading || Boolean(transitionBlock)} title={transitionBlock || "Mark reviewed"}>
                          <Check size={15} aria-hidden="true" />
                          Mark Reviewed
                        </button>
                        <button type="button" onClick={() => void transitionReviewQueueRecord(record, "LIVE")} disabled={isLoading || Boolean(publishBlock)} title={publishBlock || "Publish"}>
                          <Upload size={15} aria-hidden="true" />
                          Publish
                        </button>
                        {isPhrasebankSignoffRecord(record) ? (
                          <button type="button" onClick={() => void transitionReviewQueueRecord(record, "LIVE")} disabled={isLoading || Boolean(publishBlock)} title={publishBlock || "Final sign-off: publish and clear review hold"}>
                            <Check size={15} aria-hidden="true" />
                            Sign Off
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              <aside className="admin-review-queue-meta" aria-label="Focused row details">
                {selectedReviewQueueRecord ? (() => {
                  const phraseFlags = findMetaphorPhraseFlags(reviewRecordPlainText(selectedReviewQueueRecord), selectedReviewQueueRecord.contentKey);
                  const safetyBlock = readerSafetyBlockReason(selectedReviewQueueRecord);
                  const timeBoundBlock = hasTimeBoundEvergreenLanguage(selectedReviewQueueRecord);
                  const skyWarnings = skyNatalPhrasingWarnings(selectedReviewQueueRecord);

                  return (
                    <>
                      <p className="admin-eyebrow">Focused row</p>
                      <h3>{selectedReviewQueueRecord.title}</h3>
                      <dl>
                        <div>
                          <dt>Status</dt>
                          <dd>{contentStatusLabel(selectedReviewQueueRecord.status)}</dd>
                        </div>
                        <div>
                          <dt>Family</dt>
                          <dd>{reviewQueueGroupLabel(reviewQueueGroupKey(selectedReviewQueueRecord))}</dd>
                        </div>
                        <div>
                          <dt>Source</dt>
                          <dd>{hasRevoicePendingProvenance(selectedReviewQueueRecord) ? "Revoice pending" : "Voiced"}</dd>
                        </div>
                        <div>
                          <dt>Evergreen</dt>
                          <dd>{selectedReviewQueueRecord.evergreen ? `Locked${selectedReviewQueueRecord.evergreenAt ? ` · ${adminDateLabel(selectedReviewQueueRecord.evergreenAt.slice(0, 10))}` : ""}` : "Not locked"}</dd>
                        </div>
                      </dl>
                      <div className={`admin-reader-state-pill ${safetyBlock ? "fallback-needed" : "reader-ready"}`}>
                        {safetyBlock || "Reader-facing copy passes basic safety checks."}
                      </div>
                      {timeBoundBlock && <p className="admin-review-warning">{timeBoundBlock}</p>}
                      {skyWarnings.length > 0 && <p className="admin-review-warning">Sky-safe warning: possible natal phrasing in a sky row.</p>}
                      {phraseFlags.length > 0 && (
                        <div className="admin-phrasebook-flags">
                          <strong>Phrasebook flags</strong>
                          <ul>
                            {phraseFlags.slice(0, 5).map((flag) => (
                              <li key={`${flag.contentKey}-${flag.phrase}`}>
                                <code>{flag.phrase}</code>
                                <small>{flag.sentence}</small>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                })() : (
                  <p>Select a row to inspect its review guards.</p>
                )}
              </aside>
            </section>
          </>
        ) : activePage === "compositeByType" ? (
          <section id="composite-by-type" className="admin-template-panel admin-template-page" aria-label="Composite relationship type coverage">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Relationship-aware composite</p>
                <h2>Composite by Type</h2>
                <p>Type-aware rows keep the single-voice body as fallback. Romantic variants are only safe for explicitly romantic relationships; non-romantic relationships fall back to friendship when runtime asks for typed copy.</p>
              </div>
              <span className="ui-pill admin-status">{compositeByTypeRecords.length} typed rows</span>
            </div>

            <div className="admin-fallback-usage" aria-label="Composite runtime behavior">
              <article>
                <span>Default</span>
                <p>The row body remains the single-voice fallback for every pair and relationship type.</p>
              </article>
              <article>
                <span>Typed fields</span>
                <p><code>sections.byRelationshipType</code> stores <code>experience</code>, <code>advice</code>, and <code>astro</code>.</p>
              </article>
              <article>
                <span>Romantic gate</span>
                <p>Romantic copy only renders when the manual chart relationship type is explicitly romantic.</p>
              </article>
            </div>

            <div className="admin-template-card-list">
              {compositeByTypeRecords.length === 0 ? (
                <p className="admin-empty">No composite rows with relationship-type sections are loaded yet.</p>
              ) : compositeByTypeRecords.map((record) => {
                const coverage = compositeRelationshipTypeCoverage(record);
                const presentCount = coverage.filter((item) => item.copy).length;

                return (
                  <article className="admin-template-card" key={record.id}>
                    <div className="admin-section-heading-row">
                      <div>
                        <p className="admin-eyebrow">{contentStatusLabel(record.status)} / {phrasebankTierLabel(phrasebankTierForRecord(record)) || "No tier"}</p>
                        <h3>{record.title}</h3>
                        <code>{record.contentKey}</code>
                      </div>
                      <div className="admin-template-actions">
                        <span className="ui-pill admin-status">{presentCount}/{compositeRelationshipTypes.length} typed</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReviewId(record.id);
                            setActivePage("content");
                          }}
                        >
                          <Pencil size={15} aria-hidden="true" />
                          Open Row
                        </button>
                      </div>
                    </div>
                    <section className="admin-template-rendered-preview" aria-label="Single voice fallback">
                      <article>
                        <span>Single-voice fallback</span>
                        <p>{record.body || record.summary || "No fallback body saved."}</p>
                      </article>
                    </section>
                    <div className="admin-dependency-map-grid">
                      {coverage.map((item) => (
                        <article key={`${record.id}-${item.key}`}>
                          <span>{item.label}{item.key === "romantic" ? " / gated" : ""}</span>
                          <strong>{item.copy ? "Authored" : "Falls back"}</strong>
                          <p>{item.copy || "Uses the single-voice composite bank for this relationship type."}</p>
                        </article>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <>
            <section className="admin-content-toolbar" aria-label="Content controls">
              <div className="admin-content-toolbar-copy">
                <p className="admin-eyebrow">Content library</p>
                <h2>Exact Content</h2>
                <p>
                  {isLoading && visibleContentRecords.length === 0
                    ? "Loading phrasebank content."
                    : generatedContentPreviewMode === "emergency-floor"
                    ? `${visibleContentRecords.length} fallback floor rows shown in preview.`
                    : generatedContentPreviewMode === "hide-emergency-floor"
                    ? `${visibleContentRecords.length} rows shown; fallback floor hidden.`
                    : `${cmsStatusCounts.all} reader-facing rows shown.`
                  }
                </p>
              </div>
              <div className="admin-new-actions" aria-label="Content admin shortcuts">
                <button
                  type="button"
                  className={`admin-emergency-floor-toggle mode-${generatedContentPreviewMode}`}
                  onClick={() => {
                    const nextMode = nextGeneratedContentPreviewMode(generatedContentPreviewMode);
                    setGeneratedContentPreviewMode(nextMode);
                    writeGeneratedContentPreviewMode(nextMode);
                  }}
                  aria-label={`Localhost viewer preview mode: ${generatedContentPreviewModeLabel(generatedContentPreviewMode)}`}
                  title={generatedContentPreviewModeDescription(generatedContentPreviewMode)}
                >
                  {generatedContentPreviewMode === "hide-emergency-floor" ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  <span>Preview</span>
                  <strong>{generatedContentPreviewModeLabel(generatedContentPreviewMode)}</strong>
                </button>
                <button type="button" onClick={() => navigateAdminPage("reviewQueue")}>
                  <Check size={16} aria-hidden="true" />
                  Review Queue
                </button>
                <button type="button" onClick={startNewArticle}>
                  <Plus size={16} aria-hidden="true" />
                  New Article
                </button>
                <button type="button" onClick={() => navigateAdminPage("articles")}>
                  <BookOpenText size={16} aria-hidden="true" />
                  Articles
                </button>
                <button type="button" onClick={() => navigateAdminPage("templates")}>
                  <Sparkles size={16} aria-hidden="true" />
                  Templates
                </button>
                <button type="button" onClick={() => navigateAdminPage("vocabulary")}>
                  <BookOpenText size={16} aria-hidden="true" />
                  Vocabulary
                </button>
                <button type="button" onClick={() => navigateAdminPage("knowledge")}>
                  <FileText size={16} aria-hidden="true" />
                  Fallback hooks
                </button>
                <button type="button" onClick={() => navigateAdminPage("hooks")}>
                  <KeyRound size={16} aria-hidden="true" />
                  Surface Map
                </button>
              </div>
            </section>

            <section className="admin-content-filters" aria-label="Content list filters">
              <div className="admin-queue-chips" role="tablist" aria-label="Content queue filters">
                {([
                  { key: "failed", label: "Failed", count: cmsQueueCounts.failed },
                  { key: "missingSource", label: "Missing source", count: cmsQueueCounts.missingSource },
                  { key: "draft", label: "Draft", count: cmsQueueCounts.draft },
                  { key: "published", label: "Published", count: cmsQueueCounts.published }
                ] as Array<{ key: Exclude<AdminContentQueueFilter, null>; label: string; count: number }>).map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={contentQueueFilter === filter.key ? "active" : ""}
                    onClick={() => {
                      setContentQueueFilter(contentQueueFilter === filter.key ? null : filter.key);
                      setContentStatusFilter("all");
                    }}
                    role="tab"
                    aria-selected={contentQueueFilter === filter.key}
                  >
                    <span>{filter.label}</span>
                    <strong>{filter.count}</strong>
                  </button>
                ))}
              </div>
              <div className="admin-status-pills" role="tablist" aria-label="Status">
                {contentStatusFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={contentStatusFilter === filter.key ? "active" : ""}
                    onClick={() => setContentStatusFilter(filter.key)}
                    role="tab"
                    aria-selected={contentStatusFilter === filter.key}
                  >
                    <span>{filter.label}</span>
                    <strong>{cmsStatusCounts[filter.key]}</strong>
                  </button>
                ))}
              </div>
              <div className="admin-review-filter-grid">
                <label>
                  <span>Start date</span>
                  <input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} disabled={!isDateFilterActive} />
                </label>
                <label>
                  <span>End date</span>
                  <input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} disabled={!isDateFilterActive} />
                </label>
                <label>
                  <span>Content class</span>
                  <select value={contentSourceFilter} onChange={(event) => setContentSourceFilter(event.target.value as AdminContentClassFilter)}>
                    {contentClassFilters.map((filter) => (
                      <option key={filter.key} value={filter.key}>{filter.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Tier</span>
                  <select value={contentTierFilter} onChange={(event) => setContentTierFilter(event.target.value as AdminPhrasebankTierFilter)}>
                    {phrasebankTierFilters.map((filter) => (
                      <option key={filter.key} value={filter.key}>{filter.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Category</span>
                  <select
                    value={categoryFilter}
                    onChange={(event) => {
                      const nextCategory = event.target.value as AdminContentCategoryFilter;
                      setCategoryFilter(nextCategory);

                      if (nextCategory === "Fallback Templates") {
                        setContentBlockFilter("fallback_template");
                        void loadReviewWorkspace(reviewSurface, status, nextCategory);
                      } else if (contentBlockFilter === "fallback_template") {
                        setContentBlockFilter("all");
                      }
                    }}
                  >
                    {contentCategoryFilters.map((category) => (
                      <option key={category.key} value={category.key}>{category.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Block type</span>
                  <select value={contentBlockFilter} onChange={(event) => setContentBlockFilter(event.target.value as AdminContentBlockFilter)}>
                    <option value="all">All content types</option>
                    {contentListBlockFilterGroups.map((group) => (
                      <optgroup key={group} label={group}>
                        {contentBlockFilters.filter((filter) => filter.group === group).map((filter) => (
                          <option key={filter.key} value={filter.key}>{filter.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Search content</span>
                  <input value={personQuery} onChange={(event) => setPersonQuery(event.target.value)} placeholder="Title, app area, content key" />
                </label>
                <button type="button" onClick={() => void loadReviewWorkspace()} disabled={isLoading || !canUseApi}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Apply Filters
                </button>
              </div>
            </section>

            <section className="admin-reader-safety-panel" aria-label="Reader safety status">
              <div>
                <p className="admin-eyebrow">Reader safety</p>
                <h3>Runtime Readiness</h3>
                <p>Reader routes only serve Published rows in the serving lane with no review hold and safe reader-facing copy. Everything else must remain editorial or fall back locally.</p>
              </div>
              <div className="admin-reader-safety-grid">
                <article className="reader-ready">
                  <span>Reader-ready</span>
                  <strong>{readerSafetyCounts["reader-ready"]}</strong>
                </article>
                <article>
                  <span>Draft/editorial</span>
                  <strong>{readerSafetyCounts["draft-held"]}</strong>
                </article>
                <article>
                  <span>Reference/review held</span>
                  <strong>{readerSafetyCounts["reference-held"] + readerSafetyCounts["review-held"]}</strong>
                </article>
                <article className={readerSafetyCounts["fallback-needed"] ? "needs-fallback" : ""}>
                  <span>Fallback needed</span>
                  <strong>{readerSafetyCounts["fallback-needed"]}</strong>
                </article>
              </div>
            </section>

            <section className="admin-workbench admin-review-workspace">
              <aside className="admin-list-panel" aria-label="Generated content records">
                <div className="admin-panel-header">
                  <div>
                    <p className="admin-eyebrow">Record list</p>
                    <h2>Content</h2>
                  </div>
                  <BarChart3 size={18} aria-hidden="true" />
                </div>

                <div className="admin-content-bulk-bar" aria-label="Bulk row actions">
                  <div>
                    <strong>{selectedContentRowIds.size}</strong>
                    <span>selected</span>
                    {selectedContentRowIds.size > selectedPersistedContentRecords.length && (
                      <small>{selectedContentRowIds.size - selectedPersistedContentRecords.length} placeholder{selectedContentRowIds.size - selectedPersistedContentRecords.length === 1 ? "" : "s"} skipped</small>
                    )}
                  </div>
                  <label>
                    <span>Status</span>
                    <select
                      value={bulkContentStatus}
                      onChange={(event) => setBulkContentStatus(event.target.value as GeneratedContentStatus)}
                      disabled={isLoading}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="REVIEWED">Reviewed</option>
                      <option value="LIVE">Published</option>
                      <option value="ARCHIVED">Archived</option>
                      <option value="ERROR">Needs Review</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void applyBulkContentStatus()}
                    disabled={isLoading || selectedPersistedContentRecords.length === 0}
                  >
                    <Check size={15} aria-hidden="true" />
                    Apply
                  </button>
                  <button type="button" onClick={() => setSelectedContentRowIds(new Set())} disabled={isLoading || selectedContentRowIds.size === 0}>
                    <X size={15} aria-hidden="true" />
                    Clear
                  </button>
                </div>

                <div className="admin-content-table-scroll">
                  <table className="admin-content-table">
                    <colgroup>
                      <col className="admin-content-col-select" />
                      <col className="admin-content-col-title" />
                      <col className="admin-content-col-status" />
                      <col className="admin-content-col-provider" />
                      <col className="admin-content-col-visibility" />
                      <col className="admin-content-col-location" />
                      <col className="admin-content-col-date" />
                      <col className="admin-content-col-category" />
                    </colgroup>
                    <thead className="admin-content-table-head">
                      <tr>
                        <th scope="col">
                          <label className="admin-content-row-check">
                            <input
                              type="checkbox"
                              checked={areAllVisibleContentRowsSelected}
                              onChange={toggleAllVisibleContentRows}
                              disabled={isLoading || selectableContentRecords.length === 0}
                              aria-label={areAllVisibleContentRowsSelected ? "Deselect all visible saved rows" : "Select all visible saved rows"}
                            />
                          </label>
                        </th>
                        <th scope="col">Content</th>
                        <th scope="col">Runtime</th>
                        <th scope="col">Editorial</th>
                        <th scope="col">Surface</th>
                        <th scope="col">Kind</th>
                        <th scope="col">Updated</th>
                        <th scope="col">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleContentRecords.map((record) => {
                        const isSelectableRecord = record.source === "private" ? Boolean(record.rawPrivateRow) : Boolean(savedGlobalRowId(record));
                        const readerSafety = readerSafetyStateForRecord(record);
                        const rowContentClass = contentClassForReviewRecord(record);
                        const openRecord = () => {
                          setSelectedReviewId(record.id);
                          cancelReviewEdit();
                          if (record.rawGlobalRow) {
                            setSelectedId(record.rawGlobalRow.id);
                            setDraft(adminDraftFromRow(record.rawGlobalRow));
                            void loadRowDetails(record.rawGlobalRow.id);
                          }
                        };

                        return (
                          <tr
                            key={record.id}
                            className={`admin-content-row ${record.id === selectedReviewRecord?.id ? "selected" : ""}`}
                            onClick={openRecord}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openRecord();
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            title={`${contentRecordDisplayTitle(record)} · ${record.contentKey} · ${readerSafety.detail}`}
                          >
                            <td className="admin-content-select-cell" onClick={(event) => event.stopPropagation()}>
                              <label className="admin-content-row-check" title={isSelectableRecord ? "Select row" : "Save this calculated row before bulk status changes"} onClick={(event) => event.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedContentRowIds.has(record.id)}
                                  disabled={isLoading || !isSelectableRecord}
                                  onChange={() => toggleContentRowSelection(record)}
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label={`Select ${contentRecordDisplayTitle(record)}`}
                                />
                              </label>
                            </td>
                            <td className="admin-content-title-cell">
                              <strong className="admin-content-row-title">{contentRecordDisplayTitle(record)}</strong>
                              <code className="admin-content-row-key">{record.contentKey}</code>
                              {record.title.includes("{{") && (
                                <small className="admin-content-row-meta">{record.title}</small>
                              )}
                            </td>
                            <td className="admin-content-badge-cell">
                              <span className={`admin-reader-state-pill ${readerSafety.key}`} title={readerSafety.detail}>
                                {readerSafety.label}
                              </span>
                            </td>
                            <td className="admin-content-badge-cell">
                              <span className={`ui-pill admin-status status-${record.status.toLowerCase()}`}>{contentStatusLabel(record.status)}</span>
                            </td>
                            <td className="admin-content-location">
                              <strong>{appLocationLabel(record)}</strong>
                              <small>{record.surface === "natal" ? contentBlockTypeLabel(record) : appLocationDetail(record)}</small>
                            </td>
                            <td className="admin-content-row-section">{contentRecordKindLabel(record)}</td>
                            <td className={`admin-content-row-date ${record.status === "REVIEWED" && !record.targetDate && !record.evergreen ? "missing" : ""}`}>
                              {contentRecordUpdatedLabel(record)}
                            </td>
                            <td className="admin-content-row-section">
                              <span className="ui-pill admin-status">{contentClassLabel(rowContentClass)}</span>
                              <small>{contentSourceLabel(record)}</small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {visibleContentRecords.length === 0 && (
                    <p className={`admin-empty${!isLoading && reviewLoadError ? " admin-empty-error" : ""}`}>
                      {isLoading
                        ? "Loading content records..."
                        : reviewLoadError
                        ? `Content could not load: ${reviewLoadError}`
                        : generatedContentPreviewMode === "hide-emergency-floor" && emergencyFloorRecords.length > 0
                        ? "Only fallback floor rows match these filters. Turn the fallback floor back on to inspect them."
                        : generatedContentPreviewMode === "emergency-floor"
                        ? "No fallback floor rows match these filters."
                        : "No content records match these filters yet."}
                    </p>
                  )}
                </div>
              </aside>
            </section>

            {selectedReviewRecord && (
              <div className="admin-drawer-backdrop" role="presentation" onClick={closeReviewDrawer}>
                <section className="admin-editor-panel admin-review-detail admin-editor-drawer" aria-label="Generated content record detail" onClick={(event) => event.stopPropagation()}>
                  <div className="admin-editor-toolbar">
                    <div className="admin-drawer-topbar">
                      <p className="admin-eyebrow">{isEditingReviewRecord ? "Edit mode" : "Row preview"}</p>
                      <button type="button" onClick={closeReviewDrawer}>
                        <X size={16} aria-hidden="true" />
                        Close
                      </button>
                    </div>
                    <div className="admin-editor-heading">
                      <p className="admin-eyebrow">Post editor</p>
                      <span className={`ui-pill admin-mode-pill ${isEditingReviewRecord ? "is-editing" : "is-preview"}`}>
                        {isEditingReviewRecord ? "Edit mode" : "Read-only preview"}
                      </span>
                      <span className={`ui-pill admin-status status-${selectedReviewRecord.status.toLowerCase()}`}>{contentStatusLabel(selectedReviewRecord.status)}</span>
                      {phrasebankTierLabel(phrasebankTierForRecord(selectedReviewRecord)) ? (
                        <span className="ui-pill admin-status">{phrasebankTierLabel(phrasebankTierForRecord(selectedReviewRecord))}</span>
                      ) : null}
                      {isArchivedModelRecord(selectedReviewRecord) ? (
                        <span className="ui-pill admin-status status-archived">Archive</span>
                      ) : null}
                    </div>
                    <label className="admin-title-field">
                      <span>Title</span>
                      <input
                        value={isEditingReviewRecord ? reviewEditTitle : selectedReviewRecord.title}
                        onKeyDownCapture={stopEditorKeyPropagation}
                        onChange={(event) => {
                          setReviewEditTitle(event.target.value);
                        }}
                        readOnly={!isEditingReviewRecord}
                      />
                      <small>{selectedReviewRecord.subtitle}</small>
                      {visibleReviewerNotes(selectedReviewRecord) ? (
                        <small className="admin-reviewer-notes-line">
                          <strong>Reviewer notes:</strong>
                          <span>{visibleReviewerNotes(selectedReviewRecord)}</span>
                        </small>
                      ) : null}
                      {recordAstrologyFactsLabel(selectedReviewRecord) ? (
                        <small className="admin-astro-facts-line">{recordAstrologyFactsLabel(selectedReviewRecord)}</small>
                      ) : null}
                      {isPhrasebankSignoffRecord(selectedReviewRecord) ? (
                        <small className="admin-astro-facts-line">
                          Phrasebank tier: {phrasebankTierLabel(phrasebankTierForRecord(selectedReviewRecord)) || phrasebankTierForRecord(selectedReviewRecord)}
                          {phrasebankReviewState(selectedReviewRecord) ? ` · Review hold: ${phrasebankReviewState(selectedReviewRecord)}` : " · No review hold"}
                        </small>
                      ) : null}
                    </label>
                    <div className="admin-toolbar-actions">
                      <button type="button" onClick={() => void saveReviewEdit(selectedReviewRecord, "ERROR")} disabled={!canEditSelectedReviewRecord || isLoading} title="Mark this content as needing review.">
                        <Flag size={16} aria-hidden="true" />
                        Needs Review
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void saveReviewEdit(selectedReviewRecord, "REVIEWED");
                        }}
                        disabled={!canEditSelectedReviewRecord || isLoading || selectedReviewRecord.status === "REVIEWED"}
                        title="Approve this draft for review. This does not publish it live."
                      >
                        <Check size={16} aria-hidden="true" />
                        Approve Draft
                      </button>
                      {isEditingReviewRecord ? (
                        <>
                          <button type="button" onClick={cancelReviewEdit} disabled={isLoading}>
                            <X size={16} aria-hidden="true" />
                            Cancel
                          </button>
                          <button className="admin-primary-button" type="button" onClick={() => void saveReviewEdit(selectedReviewRecord)} disabled={isLoading}>
                            <Save size={16} aria-hidden="true" />
                            {selectedReviewRecord.status === "LIVE" ? "Save Changes" : "Save Draft"}
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => beginReviewEdit(selectedReviewRecord)} disabled={!canEditSelectedReviewRecord || isLoading}>
                          <Pencil size={16} aria-hidden="true" />
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          void saveReviewEdit(selectedReviewRecord, "LIVE");
                        }}
                        disabled={!canEditSelectedReviewRecord || isLoading}
                      >
                        <Check size={16} aria-hidden="true" />
                        Publish
                      </button>
                      {isPhrasebankSignoffRecord(selectedReviewRecord) ? (
                        <button
                          type="button"
                          onClick={() => {
                            void saveReviewEdit(selectedReviewRecord, "LIVE");
                          }}
                          disabled={!canEditSelectedReviewRecord || isLoading}
                          title="Publish this signed-off row and clear the review hold."
                        >
                          <Check size={16} aria-hidden="true" />
                          Sign Off
                        </button>
                      ) : null}
                      {selectedReviewRecord.source !== "private" && (
                        <button
                          className="admin-danger-button"
                          type="button"
                          onClick={() => {
                            void deleteReviewRecord(selectedReviewRecord);
                          }}
                          disabled={isLoading || (Boolean(savedGlobalRowId(selectedReviewRecord)) && selectedReviewRecord.status === "LIVE")}
                          title={
                            savedGlobalRowId(selectedReviewRecord) && selectedReviewRecord.status === "LIVE"
                              ? "Demote to DRAFT before deleting."
                              : savedGlobalRowId(selectedReviewRecord)
                                ? "Delete this content row."
                                : "Discard this unsaved content entry."
                          }
                        >
                          <Trash2 size={16} aria-hidden="true" />
                          {savedGlobalRowId(selectedReviewRecord) ? "Delete" : "Discard"}
                        </button>
                      )}
                    </div>
                  </div>

                  <section className="admin-post-editor">
                    <section className="admin-review-copy-workspace">
                      <div className="admin-review-copy-heading">
                        <div>
                          <p className="admin-eyebrow">Body</p>
                          <h3>Copy</h3>
                        </div>
                      </div>

                      <div className="admin-review-generation-bar">
                        <label>
                          <span>Provider</span>
                          <select value={reviewGenerationProvider} onChange={(event) => setReviewGenerationProvider(event.target.value as AdminGenerationProvider)} disabled={!isEditingReviewRecord || isGeneratingReviewDraft || isSelectedReviewPublished}>
                            <option value="openai">OpenAI</option>
                            <option value="claude">Claude</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => void generateReviewDraft(selectedReviewRecord)}
                          disabled={!isEditingReviewRecord || !canEditSelectedReviewRecord || isGeneratingReviewDraft || isSelectedReviewPublished}
                          title={
                            !isEditingReviewRecord
                              ? "Enter edit mode before generating new copy."
                              : isSelectedReviewPublished
                                ? "Move this row back to Draft before regenerating approved copy."
                                : undefined
                          }
                        >
                          <Sparkles size={16} aria-hidden="true" />
                          {isGeneratingReviewDraft ? "Generating..." : "Generate Draft"}
                        </button>
                      </div>

                      {selectedReviewDraftResult && (
                        <div className={`admin-generation-diagnostics ${selectedReviewDraftResult.errorType ? "has-error" : ""}`}>
                          <div>
                            <span>Draft status</span>
                            <strong>{selectedReviewDraftResult.errorType ? "Generation failed" : selectedReviewDraftResult.editStatus ?? "needs_review"}</strong>
                          </div>
                          <div>
                            <span>Provider</span>
                            <strong>{selectedReviewDraftResult.provider ?? reviewGenerationProvider}{selectedReviewDraftResult.model ? ` · ${selectedReviewDraftResult.model}` : ""}</strong>
                          </div>
                          <div>
                            <span>Retry count</span>
                            <strong>{selectedReviewDraftResult.retryCount ?? 0}</strong>
                          </div>
                          <div>
                            <span>Sources</span>
                            <strong>
                              {(() => {
                                const sourceIds = selectedReviewDraftResult.sourceIds?.length
                                  ? selectedReviewDraftResult.sourceIds
                                  : knowledgeIdsForReviewRecord(selectedReviewRecord);

                                return sourceIds.length ? sourceIds.join(", ") : "No source IDs returned";
                              })()}
                            </strong>
                          </div>
                          <div>
                            <span>Safety checks</span>
                            <ul>
                              <li className={selectedReviewDraftResult.sourceSafety?.sourceBodyExcluded ? "pass" : "fail"}>sourceBody excluded</li>
                              <li className={selectedReviewDraftResult.sourceSafety?.astrologyBodySent ? "pass" : "fail"}>astrologyBody sent</li>
                              <li className={selectedReviewDraftResult.sourceSafety?.tarotNotesExcluded ? "pass" : "fail"}>tarotNotes excluded</li>
                              <li className={selectedReviewDraftResult.sourceSafety?.businessNotesExcluded ? "pass" : "fail"}>businessNotes excluded</li>
                            </ul>
                          </div>
                          <div>
                            <span>Hard violations</span>
                            <strong>{selectedReviewDraftResult.violations?.length ? selectedReviewDraftResult.violations.join(", ") : "None"}</strong>
                          </div>
                          <div>
                            <span>Soft warnings</span>
                            <strong>{selectedReviewDraftResult.softWarnings?.length ? selectedReviewDraftResult.softWarnings.join(", ") : "None"}</strong>
                          </div>
                          <div>
                            <span>Style notes</span>
                            <strong>{selectedReviewDraftResult.styleNotes?.length ? selectedReviewDraftResult.styleNotes.join(", ") : "None"}</strong>
                          </div>
                          {selectedReviewDraftResult.error && (
                            <p>{selectedReviewDraftResult.error}</p>
                          )}
                        </div>
                      )}

                      {selectedReviewMetaphorFlags.length > 0 && (
                        <aside className="admin-phrasebook-flags" aria-label="Metaphor phrase book flags">
                          <div>
                            <p className="admin-eyebrow">Editorial wording flags</p>
                            <strong>{selectedReviewMetaphorFlags.length} phrase-book match{selectedReviewMetaphorFlags.length === 1 ? "" : "es"}</strong>
                          </div>
                          <ul>
                            {selectedReviewMetaphorFlags.slice(0, 4).map((flag) => (
                              <li key={`${flag.phrase}-${flag.sentence}`}>
                                <code>{flag.phrase}</code>
                                <span>{flag.sentence}</span>
                              </li>
                            ))}
                          </ul>
                          <small>Flag only. Save keeps the text intact and adds this to reviewer notes.</small>
                        </aside>
                      )}

                      <label className="admin-review-tldr-editor">
                        <span>TLDR</span>
                        <textarea
                          rows={4}
                          value={selectedReviewTldr}
                          placeholder="Optional short reader-facing TLDR."
                          readOnly={!isEditingReviewRecord}
                          onKeyDownCapture={stopEditorKeyPropagation}
                          onChange={(event) => {
                            setReviewEditSummary(stripTldrPrefix(event.target.value));
                          }}
                        />
                      </label>

                      <label className="admin-review-copy-editor">
                        <span>Body</span>
                        <textarea
                          rows={18}
                          value={selectedReviewText}
                          readOnly={!isEditingReviewRecord}
                          onKeyDownCapture={stopEditorKeyPropagation}
                          onChange={(event) => {
                            const nextCopy = event.target.value;
                            const splitCopy = splitLeadingTldr(nextCopy);

                            if (splitCopy.tldr) {
                              setReviewEditSummary((currentSummary) => currentSummary.trim() ? currentSummary : splitCopy.tldr);
                              setReviewEditBody(splitCopy.body);
                            } else {
                              setReviewEditBody(nextCopy);
                            }
                          }}
                        />
                      </label>
                    </section>

                    <aside className="admin-metadata-sidebar" aria-label="Content metadata">
                      <h3>Metadata</h3>
                      <fieldset className="admin-metadata-fields" disabled={!isEditingReviewRecord}>
                        <label className="admin-metadata-field">
                          <span>Exact date</span>
                          <input
                            type="date"
                            value={selectedReviewMetadata?.targetDate ?? ""}
                            onChange={(event) => updateReviewMetadata(selectedReviewRecord, { targetDate: event.target.value })}
                          />
                        </label>
                        <label className="admin-metadata-field">
                          <span>Status</span>
                          <select
                            value={selectedReviewMetadata?.status ?? selectedReviewRecord.status}
                            onChange={(event) => updateReviewMetadata(selectedReviewRecord, { status: event.target.value as GeneratedContentStatus })}
                          >
                            <option value="DRAFT">Draft</option>
                            <option value="ERROR">Needs Review</option>
                            <option value="REVIEWED">Reviewed</option>
                            <option value="LIVE">Published</option>
                            <option value="ARCHIVED">Archived</option>
                          </select>
                        </label>
                        <label className="admin-metadata-field">
                          <span>App area</span>
                          <select
                            value={selectedReviewMetadata?.surface ?? selectedReviewRecord.surface}
                            onChange={(event) => updateReviewMetadata(selectedReviewRecord, { surface: event.target.value as GeneratedContentSurface })}
                          >
                            <option value="sky">Sky</option>
                            <option value="you">You</option>
                            <option value="natal">Natal</option>
                            <option value="relationship">Circle</option>
                            <option value="modifier">Modifier</option>
                            <option value="synastry">Synastry</option>
                            <option value="composite">Composite</option>
                          </select>
                        </label>
                        <label className="admin-metadata-field">
                          <span>Category</span>
                          <select
                            value={selectedReviewMetadata?.category ?? contentCategoryLabel(selectedReviewRecord)}
                            onChange={(event) => {
                              const nextCategory = event.target.value as Exclude<AdminContentCategoryFilter, "all">;
                              updateReviewMetadata(selectedReviewRecord, {
                                category: nextCategory,
                                surface: surfaceForContentCategory(nextCategory),
                                ...(nextCategory === "Sky" ? { blockType: "sky_article" as AdminContentBlockFilter, mode: "article" as GeneratedContentMode } : {}),
                                ...(nextCategory === "Natal Angles" ? { blockType: "angle" as AdminContentBlockFilter } : {}),
                                ...(nextCategory === "Natal Chart" ? { blockType: "placement" as AdminContentBlockFilter } : {}),
                                ...(nextCategory === "Fallback Templates" ? { blockType: "fallback_template" as AdminContentBlockFilter, mode: "feed" as GeneratedContentMode } : {})
                              });
                            }}
                          >
                            <option value="Sky">Sky</option>
                            <option value="Natal Aspects">Natal Aspects</option>
                            <option value="Natal Angles">Natal Angles</option>
                            <option value="Natal Chart">Natal Chart</option>
                            <option value="Relationship">Relationship</option>
                            <option value="Condition Modifiers">Condition Modifiers</option>
                            <option value="Fallback Templates">Fallback hooks + templates</option>
                          </select>
                        </label>
                        <label className="admin-metadata-field">
                          <span>Block type</span>
                          <select
                            value={selectedReviewMetadata?.blockType ?? contentBlockType(selectedReviewRecord)}
                            onChange={(event) => updateReviewMetadata(selectedReviewRecord, { blockType: event.target.value as AdminContentBlockFilter })}
                          >
                            {contentBlockEditorGroups.map((group) => (
                              <optgroup key={group} label={group}>
                                {contentBlockFilters
                                  .filter((filter) => filter.group === group && filter.showInEditor !== false)
                                  .map((filter) => (
                                    <option key={filter.key} value={filter.key}>{filter.label}</option>
                                  ))}
                              </optgroup>
                            ))}
                          </select>
                        </label>
                        <label className="admin-metadata-field">
                          <span>Format</span>
                          <select
                            value={selectedReviewMetadata?.mode ?? selectedReviewRecord.mode}
                            onChange={(event) => updateReviewMetadata(selectedReviewRecord, { mode: event.target.value as GeneratedContentMode })}
                          >
                            <option value="feed">Feed</option>
                            <option value="in_depth">In depth</option>
                            <option value="article">Article</option>
                          </select>
                        </label>
                        {selectedMetadataIsLunarCalendar && (
                          <>
                            <label className="admin-metadata-field">
                              <span>Arc layer</span>
                              <select
                                value={selectedReviewMetadata?.lunarArcLayer ?? ""}
                                onChange={(event) => updateReviewMetadata(selectedReviewRecord, { lunarArcLayer: event.target.value })}
                              >
                                <option value="">Not set</option>
                                <option value="season">Season</option>
                                <option value="new_moon_seed">New Moon seed</option>
                                <option value="current_checkpoint">Current checkpoint</option>
                                <option value="full_moon_culmination">Full Moon culmination</option>
                              </select>
                            </label>
                            <label className="admin-metadata-field">
                              <span>Dashboard source</span>
                              <select
                                value={selectedReviewMetadata?.lunarSource ?? ""}
                                onChange={(event) => updateReviewMetadata(selectedReviewRecord, { lunarSource: event.target.value })}
                              >
                                <option value="">Not set</option>
                                <option value="authored_lunation">Authored lunation</option>
                                <option value="authored_season">Authored season</option>
                                <option value="authored_sign">Authored sign</option>
                              </select>
                            </label>
                            <label className="admin-metadata-field">
                              <span>Practice</span>
                              <textarea
                                value={selectedReviewMetadata?.practice ?? ""}
                                placeholder="Optional practice prompt."
                                onChange={(event) => updateReviewMetadata(selectedReviewRecord, { practice: event.target.value })}
                              />
                            </label>
                            <label className="admin-metadata-field">
                              <span>Reflect</span>
                              <textarea
                                value={selectedReviewMetadata?.reflect ?? ""}
                                placeholder="Optional reflection prompt."
                                onChange={(event) => updateReviewMetadata(selectedReviewRecord, { reflect: event.target.value })}
                              />
                            </label>
                            <label className="admin-metadata-field">
                              <span>Ritual</span>
                              <textarea
                                value={selectedReviewMetadata?.ritual ?? ""}
                                placeholder="Optional ritual notes."
                                onChange={(event) => updateReviewMetadata(selectedReviewRecord, { ritual: event.target.value })}
                              />
                            </label>
                            <label className="admin-metadata-field">
                              <span>Callback</span>
                              <textarea
                                value={selectedReviewMetadata?.callback ?? ""}
                                placeholder="Optional callback to an earlier or later lunation."
                                onChange={(event) => updateReviewMetadata(selectedReviewRecord, { callback: event.target.value })}
                              />
                            </label>
                          </>
                        )}
                        {selectedMetadataUsesAspectFields && (
                          <>
                            {selectedMetadataUsesAspectTiming && (
                              <>
                                <label className="admin-metadata-field">
                                  <span>Orb</span>
                                  <input
                                    value={selectedReviewMetadata?.orb ?? ""}
                                    placeholder={recordOrbLabel(selectedReviewRecord)}
                                    onChange={(event) => updateReviewMetadata(selectedReviewRecord, { orb: event.target.value })}
                                  />
                                </label>
                                <label className="admin-metadata-field">
                                  <span>Forming/separating</span>
                                  <select
                                    value={selectedReviewMetadata?.direction ?? ""}
                                    onChange={(event) => updateReviewMetadata(selectedReviewRecord, { direction: event.target.value })}
                                  >
                                    <option value="">Not set</option>
                                    <option value="forming">Forming</option>
                                    <option value="separating">Separating</option>
                                    <option value="exact">Exact</option>
                                  </select>
                                </label>
                              </>
                            )}
                            <label className="admin-metadata-field">
                              <span>Planet/body A</span>
                              <input
                                value={selectedReviewMetadata?.body1 ?? ""}
                                placeholder="Mercury"
                                onChange={(event) => updateReviewMetadata(selectedReviewRecord, { body1: event.target.value })}
                              />
                            </label>
                            {selectedMetadataUsesAspectSigns && (
                              <label className="admin-metadata-field">
                                <span>Sign A</span>
                                <input
                                  value={selectedReviewMetadata?.sign1 ?? ""}
                                  placeholder="Cancer"
                                  onChange={(event) => updateReviewMetadata(selectedReviewRecord, { sign1: event.target.value })}
                                />
                              </label>
                            )}
                            {selectedMetadataUsesAspectHouses && (
                              <label className="admin-metadata-field">
                                <span>House A</span>
                                <input
                                  value={selectedReviewMetadata?.house1 ?? ""}
                                  placeholder="3"
                                  onChange={(event) => updateReviewMetadata(selectedReviewRecord, { house1: event.target.value })}
                                />
                              </label>
                            )}
                            <label className="admin-metadata-field">
                              <span>Aspect</span>
                              <input
                                value={selectedReviewMetadata?.aspect ?? ""}
                                placeholder="sextile"
                                onChange={(event) => updateReviewMetadata(selectedReviewRecord, { aspect: event.target.value })}
                              />
                            </label>
                            <label className="admin-metadata-field">
                              <span>Planet/body B</span>
                              <input
                                value={selectedReviewMetadata?.body2 ?? ""}
                                placeholder="Mars"
                                onChange={(event) => updateReviewMetadata(selectedReviewRecord, { body2: event.target.value })}
                              />
                            </label>
                            {selectedMetadataUsesAspectSigns && (
                              <label className="admin-metadata-field">
                                <span>Sign B</span>
                                <input
                                  value={selectedReviewMetadata?.sign2 ?? ""}
                                  placeholder="Taurus"
                                  onChange={(event) => updateReviewMetadata(selectedReviewRecord, { sign2: event.target.value })}
                                />
                              </label>
                            )}
                            {selectedMetadataUsesAspectHouses && (
                              <label className="admin-metadata-field">
                                <span>House B</span>
                                <input
                                  value={selectedReviewMetadata?.house2 ?? ""}
                                  placeholder="10"
                                  onChange={(event) => updateReviewMetadata(selectedReviewRecord, { house2: event.target.value })}
                                />
                              </label>
                            )}
                          </>
                        )}
                        {(selectedMetadataUsesPlacementBody
                          || selectedMetadataUsesPlacementSign
                          || selectedMetadataUsesPlacementHouse
                          || selectedMetadataUsesPlacementRuler) && (
                          <>
                            {selectedMetadataUsesPlacementBody && (
                              <label className="admin-metadata-field">
                                <span>Placement body</span>
                                <select
                                  value={selectedReviewMetadata?.placementBody ?? ""}
                                  onChange={(event) => updateReviewMetadata(selectedReviewRecord, { placementBody: event.target.value })}
                                >
                                  <option value="">Select body</option>
                                  {natalPlacementBodies.map((body) => (
                                    <option key={body} value={body}>{body}</option>
                                  ))}
                                </select>
                              </label>
                            )}
                            {selectedMetadataUsesPlacementSign && (
                              <label className="admin-metadata-field">
                                <span>Placement sign</span>
                                <input
                                  value={selectedReviewMetadata?.placementSign ?? ""}
                                  placeholder="Aquarius"
                                  onChange={(event) => updateReviewMetadata(selectedReviewRecord, { placementSign: event.target.value })}
                                />
                              </label>
                            )}
                            {selectedMetadataUsesPlacementHouse && (
                              <label className="admin-metadata-field">
                                <span>Placement house</span>
                                <input
                                  value={selectedReviewMetadata?.placementHouse ?? ""}
                                  inputMode="numeric"
                                  placeholder="9"
                                  onChange={(event) => updateReviewMetadata(selectedReviewRecord, { placementHouse: event.target.value })}
                                />
                              </label>
                            )}
                            {selectedMetadataUsesPlacementBody && !selectedMetadataIsModularNatalBlock && (
                              <label className="admin-metadata-field admin-metadata-checkbox">
                                <span>Retrograde</span>
                                <input
                                  type="checkbox"
                                  checked={Boolean(selectedReviewMetadata?.placementRetrograde)}
                                  disabled={isNodePlacement(selectedReviewMetadata?.placementBody ?? "")}
                                  onChange={(event) => updateReviewMetadata(selectedReviewRecord, { placementRetrograde: event.target.checked })}
                                />
                              </label>
                            )}
                            {selectedMetadataUsesPlacementRuler && (
                              <label className="admin-metadata-field">
                                <span>Traditional ruler</span>
                                <input
                                  value={selectedReviewMetadata?.rulerBody ?? ""}
                                  placeholder="Saturn"
                                  onChange={(event) => updateReviewMetadata(selectedReviewRecord, {
                                    rulerBody: event.target.value,
                                    traditionalRulerBody: event.target.value
                                  })}
                                />
                              </label>
                            )}
                            {selectedMetadataUsesFullRulerPlacement && (
                              <>
                                <label className="admin-metadata-field">
                                  <span>Ruler sign</span>
                                  <input
                                    value={selectedReviewMetadata?.rulerSign ?? ""}
                                    placeholder="Virgo"
                                    onChange={(event) => updateReviewMetadata(selectedReviewRecord, {
                                      rulerSign: event.target.value,
                                      traditionalRulerSign: event.target.value
                                    })}
                                  />
                                </label>
                                <label className="admin-metadata-field">
                                  <span>Ruler house</span>
                                  <input
                                    value={selectedReviewMetadata?.rulerHouse ?? ""}
                                    inputMode="numeric"
                                    placeholder="4"
                                    onChange={(event) => updateReviewMetadata(selectedReviewRecord, {
                                      rulerHouse: event.target.value,
                                      traditionalRulerHouse: event.target.value
                                    })}
                                  />
                                </label>
                              </>
                            )}
                            {selectedMetadataUsesPlacementRuler && (
                              <label className="admin-metadata-field">
                                <span>Modern ruler</span>
                                <input
                                  value={selectedReviewMetadata?.modernRulerBody ?? ""}
                                  placeholder="Uranus"
                                  onChange={(event) => updateReviewMetadata(selectedReviewRecord, { modernRulerBody: event.target.value })}
                                />
                              </label>
                            )}
                            {selectedMetadataUsesFullRulerPlacement && Boolean(selectedReviewMetadata?.modernRulerBody?.trim()) && (
                              <>
                                <label className="admin-metadata-field">
                                  <span>Modern ruler sign</span>
                                  <input
                                    value={selectedReviewMetadata?.modernRulerSign ?? ""}
                                    placeholder="Scorpio"
                                    onChange={(event) => updateReviewMetadata(selectedReviewRecord, { modernRulerSign: event.target.value })}
                                  />
                                </label>
                                <label className="admin-metadata-field">
                                  <span>Modern ruler house</span>
                                  <input
                                    value={selectedReviewMetadata?.modernRulerHouse ?? ""}
                                    inputMode="numeric"
                                    placeholder="6"
                                    onChange={(event) => updateReviewMetadata(selectedReviewRecord, { modernRulerHouse: event.target.value })}
                                  />
                                </label>
                              </>
                            )}
                          </>
                        )}
                      </fieldset>
                      <details className="admin-advanced admin-review-json">
                        <summary>Structured fields</summary>
                        <pre>{JSON.stringify({
                          id: selectedReviewRecord.id,
                          contentKey: selectedReviewRecord.contentKey,
                          eventType: selectedReviewRecord.eventType,
                          mode: selectedReviewRecord.mode,
                          userId: selectedReviewRecord.userId,
                          subjectId: selectedReviewRecord.subjectId,
                          subjectType: selectedReviewRecord.subjectType,
                          facts: selectedReviewRecord.facts,
                          sourceSnapshot: selectedReviewRecord.sourceSnapshot,
                          reviewerNotes: selectedReviewRecord.reviewerNotes,
                          provider: selectedReviewRecord.provider,
                          model: selectedReviewRecord.model,
                          updatedAt: selectedReviewRecord.updatedAt
                        }, null, 2)}</pre>
                      </details>
                    </aside>
                    </section>
                </section>
              </div>
            )}
          </>
        )}
      </section>

    </main>
  );
}
