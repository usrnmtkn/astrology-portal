import { Activity, Archive, BarChart3, BookOpenText, Check, Database, Download, FileText, Flag, KeyRound, LayoutDashboard, Pencil, Plus, RefreshCw, Save, Server, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { fallbackHookDefinitions, knowledgeIdsForFallbackHook, type FallbackHookContext } from "../content/fallbackHooks";
import type { GeneratedContentMode } from "../services/generatedContent";
import {
  compositeAspectContentKey,
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
import { getTldrAstroApiHealth, isTldrAstroApiConfigured, tldrAstroApiStatusUrl, type TldrAstroApiHealth } from "../services/tldrastroApi";
import "./admin.css";

type GeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";
type GeneratedContentSurfaceFilter = GeneratedContentSurface | "all";
type VoiceTemplateSurface = "sky" | "fullMoon" | "newMoon" | "eclipse" | "natal" | "synastry" | "composite";
type AdminDashboardPage = "content" | "settings" | "vocabulary" | "knowledge" | "privateRows" | "templates" | "hooks" | "releaseNotes";
type AdminAccessStatus = "empty" | "checking" | "valid" | "invalid";
type AdminReviewSurface = "upcomingAspects" | "transitNatal" | "natalChart" | "relationshipLayer";
type AdminGenerationProvider = "claude" | "openai";
type AdminContentStatusFilter = "all" | "DRAFT" | "NEEDS_REVIEW" | "SCHEDULED" | "LIVE" | "ARCHIVED";
type AdminContentCategoryFilter = "all" | "Sky" | "Natal Aspects" | "Natal Chart" | "Relationship";
type AdminContentBlockFilter =
  | "all"
  | "placement"
  | "sign"
  | "house"
  | "ruler"
  | "natal_aspect"
  | "sky_aspect"
  | "sky_article"
  | "lunar_calendar"
  | "transit_to_natal_aspect"
  | "synastry_aspect"
  | "composite_aspect"
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

type AdminContentExportFormat = "csv" | "json";
type AdminContentScope = "settings" | "vocabulary" | "templates";

type AdminContentExchangeBundle = {
  schema: "tldrastro-admin-content-v1";
  exportedAt: string;
  settings: Partial<Record<VoiceTemplateSurface, VoiceTemplateConfig>>;
  vocabularyRows: Array<{
    id?: string;
    contentKey: string;
    headline: string;
    natal: string;
    sky: string;
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
  facts: Record<string, unknown> | null;
  knowledge_ids: string[] | null;
  source_snapshot: Record<string, unknown> | null;
  reviewer_notes: string | null;
  prompt_version: string | null;
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
  natal: string;
  sky: string;
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
  taglineContentKey?: string;
};

type AdminTemplateDraft = {
  headline: string;
  summary: string;
  body: string;
};

type AdminReviewRecord = {
  id: string;
  source: "global" | "private" | "calculated" | "saved";
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
  sourceSnapshot: Record<string, unknown> | null;
  reviewerNotes: string | null;
  userId?: string;
  subjectId?: string;
  subjectType?: string;
  provider?: string | null;
  model?: string | null;
  updatedAt: string;
  rawGlobalRow?: AdminGeneratedContentRow;
  rawPrivateRow?: AdminUserGeneratedContentRow;
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

const generatedContentSurfaceLabels: Record<GeneratedContentSurfaceFilter, string> = {
  all: "All",
  sky: "Sky",
  you: "You",
  natal: "Natal",
  synastry: "Synastry",
  composite: "Composite",
  relationship: "Relationship"
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
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "LIVE", label: "Published" },
  { key: "ARCHIVED", label: "Archived" }
];

const contentCategoryFilters: Array<{ key: AdminContentCategoryFilter; label: string }> = [
  { key: "all", label: "All categories" },
  { key: "Sky", label: "Sky" },
  { key: "Natal Aspects", label: "Natal Aspects" },
  { key: "Natal Chart", label: "Natal Chart" },
  { key: "Relationship", label: "Relationship" }
];

type ContentBlockFilterOption = {
  key: AdminContentBlockFilter;
  label: string;
  group?: "Sky" | "You" | "Friends" | "General";
  showInEditor?: boolean;
};

const contentBlockFilters: ContentBlockFilterOption[] = [
  { key: "all", label: "All content types" },
  { key: "sky_article", label: "Upcoming transit article", group: "Sky" },
  { key: "lunar_calendar", label: "Lunar calendar entry", group: "Sky" },
  { key: "sky_aspect", label: "Sky aspect card", group: "Sky" },
  { key: "placement", label: "Natal placement page", group: "You" },
  { key: "sign", label: "Natal sign block", group: "You" },
  { key: "house", label: "Natal house block", group: "You" },
  { key: "ruler", label: "Natal ruler block", group: "You" },
  { key: "natal_aspect", label: "Natal chart aspect", group: "You" },
  { key: "transit_to_natal_aspect", label: "Transit to natal update", group: "You" },
  { key: "synastry_aspect", label: "Synastry aspect", group: "Friends" },
  { key: "composite_aspect", label: "Composite aspect", group: "Friends" },
  { key: "synthesis", label: "Generated chart summary", group: "You", showInEditor: false },
  { key: "essay", label: "General article", group: "General" }
];

const contentBlockEditorGroups: Array<NonNullable<ContentBlockFilterOption["group"]>> = ["Sky", "You", "Friends", "General"];

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
  "sky.seasonal-current": { planet: "Sun", sign: "Gemini" },
  "sky.lunar-cycle": { planet: "Moon", sign: "Capricorn" },
  "sky.planetary-placement": { planet: "Venus", sign: "Cancer" },
  "sky.aspect-detail": { planetA: "Mercury", aspect: "square", planetB: "Neptune" },
  "sky.retrograde": { planet: "Pluto", sign: "Aquarius" },
  "you.natal-placement": { planet: "Moon", sign: "Capricorn", house: 6 },
  "you.natal-aspect": { planetA: "Moon", aspect: "trine", planetB: "Saturn" },
  "you.transit-to-natal": { transitPlanet: "Saturn", aspect: "square", natalPoint: "Venus" },
  "friends.synastry-contact": { planetA: "Venus", aspect: "sextile", planetB: "Ascendant" },
  "friends.house-overlay": { planet: "Venus", house: 4 },
  "friends.composite-aspect": { planetA: "Sun", aspect: "square", planetB: "Moon" },
  "friends.composite-placement": { planet: "Venus", sign: "Cancer", house: 4 },
  "friends.relationship-timing": { transitPlanet: "Pluto", aspect: "opposition", natalPoint: "Descendant" },
  "friends.circle-feed": { topic: "saturn" },
  "settings.life-area-focus": { topic: "career" }
};

function adminPageTitle(activePage: AdminDashboardPage) {
  if (activePage === "releaseNotes") return "Release Notes";
  if (activePage === "settings") return "Settings";
  if (activePage === "vocabulary") return "Vocabulary";
  if (activePage === "knowledge") return "Templates";
  return "Content";
}

function adminPageBreadcrumb(activePage: AdminDashboardPage) {
  if (activePage === "releaseNotes") return "Admin / Release notes";
  if (activePage === "settings") return "Admin / Settings";
  if (activePage === "vocabulary") return "Admin / Vocabulary";
  if (activePage === "knowledge") return "Admin / Templates";
  return "Admin / Content";
}

function adminPageDescription(activePage: AdminDashboardPage) {
  if (activePage === "releaseNotes") {
    return "Track product updates across the internal dashboard and the public app in one chronological log.";
  }

  if (activePage === "settings") {
    return "Manage generation templates, voice guidance, access, calculation API status, and app content hooks.";
  }

  if (activePage === "vocabulary") {
    return "Manage dashboard-authored vocabulary rows that feed interpolation slots in app copy.";
  }

  if (activePage === "knowledge") {
    return "Review and edit fallback template rows that fill content hooks when specific authored copy is missing.";
  }

  return "Manage every generated or authored astrology entry from one filtered CMS list.";
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

function vocabularyHeadline(row: AdminGeneratedContentRow) {
  const headline = row.headline?.trim().replace(/\s+Topic$/i, "");

  return headline || titleFromVocabularyContentKey(row.content_key);
}

function vocabularyDraftFromRow(row: AdminGeneratedContentRow): AdminVocabularyDraft {
  const sections = objectValue(row.sections);
  const topic = objectValue(sections?.topic);

  return {
    headline: vocabularyHeadline(row),
    natal: stringValue(topic?.natal) || row.body || "",
    sky: stringValue(topic?.sky) || stringValue(topic?.natal) || row.body || ""
  };
}

function templateDraftFromRow(row: AdminGeneratedContentRow): AdminTemplateDraft {
  return {
    headline: row.headline ?? "",
    summary: row.summary ?? "",
    body: row.body ?? ""
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
    "point",
    "headline",
    "summary",
    "body",
    "natal",
    "sky",
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
    natal: row.natal,
    sky: row.sky
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

  return [...settingsRows, ...vocabularyCsvRows, ...taglineCsvRows, ...templateCsvRows];
}

function contentBundleFromCsv(text: string): AdminContentExchangeBundle {
  const csvRows = parseCsv(text);
  const settings: Partial<Record<VoiceTemplateSurface, VoiceTemplateConfig>> = {};
  const vocabularyRows: AdminContentExchangeBundle["vocabularyRows"] = [];
  const taglineRows: AdminContentExchangeBundle["taglineRows"] = [];
  const templateRows: AdminContentExchangeBundle["templateRows"] = [];

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
        natal: row.natal ?? "",
        sky: row.sky ?? ""
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
  }

  return {
    schema: "tldrastro-admin-content-v1",
    exportedAt: new Date().toISOString(),
    settings,
    vocabularyRows,
    taglineRows,
    templateRows
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
    templateRows: parsed.templateRows ?? []
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

const releaseNotes: ReleaseNote[] = [
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

function templateSurfaceFor(surface: GeneratedContentSurface, eventType?: string): VoiceTemplateSurface {
  const normalizedEventType = (eventType ?? "").toLowerCase().replaceAll("_", "-");

  if (surface === "sky") {
    if (normalizedEventType.includes("eclipse")) {
      return "eclipse";
    }

    if (normalizedEventType.includes("full-moon") || normalizedEventType.includes("fullmoon")) {
      return "fullMoon";
    }

    if (normalizedEventType.includes("new-moon") || normalizedEventType.includes("newmoon")) {
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
    }
  };
  const defaultDraft = defaults[resolvedSurface];

  return {
    contentKey: defaultDraft.contentKey,
    surface: resolvedSurface,
    mode: defaultDraft.mode,
    status: "DRAFT",
    eventType: defaultDraft.eventType,
    targetDate: date,
    headline: defaultDraft.headline,
    summary: "",
    body: "",
    sectionsJson: "[]",
    factsJson: JSON.stringify({
      date,
      surface: resolvedSurface,
      note: resolvedSurface === "sky"
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

function compactAdminText(value: string | null | undefined, fallback = "No reader-facing copy saved yet.") {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();

  return normalized || fallback;
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

function generatedSurfaceForReviewSurface(surface: AdminReviewSurface): GeneratedContentSurfaceFilter {
  if (surface === "upcomingAspects") return "sky";
  if (surface === "transitNatal") return "you";
  if (surface === "natalChart") return "natal";

  return "all";
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
    sourceSnapshot: row.source_snapshot,
    reviewerNotes: row.reviewer_notes,
    model: row.model,
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

function preferredReviewRecord(current: AdminReviewRecord | undefined, next: AdminReviewRecord) {
  if (!current) {
    return next;
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
  if (category === "Natal Aspects" || category === "Natal Chart") return "natal";
  if (category === "Relationship") return "relationship";
  return fallbackSurface === "all" ? "sky" : fallbackSurface;
}

function manualEntryEventType(category: AdminContentCategoryFilter, surface: GeneratedContentSurface) {
  if (category === "Natal Aspects") return "manual-natal-aspect";
  if (category === "Natal Chart") return "natal-placement";
  if (category === "Relationship") return "manual-relationship";
  if (surface === "sky") return "upcoming-transit-article";
  return "manual-entry";
}

function manualEntryRecord(category: AdminContentCategoryFilter, fallbackSurface: GeneratedContentSurfaceFilter): AdminReviewRecord {
  const surface = manualEntrySurface(category, fallbackSurface);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const targetDate = surface === "sky" ? dateInputValue(now) : null;
  const eventType = manualEntryEventType(category, surface);
  const title = "Untitled content";
  const blockType: AdminContentBlockFilter = surface === "sky" ? "sky_article" : category === "Natal Chart" ? "placement" : "essay";

  return {
    id: `manual:${timestamp}`,
    source: "global",
    surface,
    status: "DRAFT",
    mode: surface === "sky" ? "article" : "in_depth",
    title,
    subtitle: `Manual entry / ${generatedContentSurfaceLabels[surface]} / ${adminDateLabel(targetDate)}`,
    targetDate,
    contentKey: `manual-${surface}-${timestamp}`,
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

function readerFacingTextForReview(record: AdminReviewRecord) {
  return bodyWithoutLeadingTldr(record.body.trim() || fallbackReaderTextForReview(record));
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

function contentCategoryLabel(record: AdminReviewRecord): Exclude<AdminContentCategoryFilter, "all"> {
  const normalizedEventType = (record.eventType ?? "").toLowerCase().replaceAll("_", "-");
  const normalizedContentKey = record.contentKey.toLowerCase();

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

  return "Natal Chart";
}

function contentBlockType(record: AdminReviewRecord): AdminContentBlockFilter {
  const savedType = record.rawGlobalRow?.block_type ?? record.blockType;

  if (savedType && savedType !== "all") {
    return savedType;
  }

  const normalizedKey = record.contentKey.toLowerCase();
  const normalizedEventType = (record.eventType ?? "").toLowerCase().replaceAll("_", "-");

  if (normalizedKey.startsWith("natal.placement.") || normalizedEventType.includes("natal-placement")) return "placement";
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
  if (status === "REVIEWED") return "Scheduled";
  if (status === "ERROR") return "Needs Review";
  if (status === "DRAFT") return "Draft";

  return status;
}

function contentRestrictionLabel(record: AdminReviewRecord) {
  if (record.source === "private" || record.userId || record.subjectId) return "Personal";
  if (record.source === "calculated") return "Pending";

  return "Visible";
}

function appLocationLabel(record: AdminReviewRecord) {
  if (record.surface === "sky") return "Sky";
  if (record.surface === "natal") return "Natal";
  if (record.surface === "you") return "You";
  if (record.surface === "synastry" || record.surface === "composite" || record.surface === "relationship") return "Circle";

  return generatedContentSurfaceLabels[record.surface];
}

function appLocationDetail(record: AdminReviewRecord) {
  if (record.surface === "synastry") return "Synastry";
  if (record.surface === "composite") return "Composite";
  if (record.surface === "relationship") return "Relationship";
  if (record.surface === "you") return "Personal chart";

  return contentCategoryLabel(record);
}

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

function categoryUsesDateFilter(category: AdminContentCategoryFilter) {
  return category === "all" || category === "Sky";
}

function reviewSurfaceUsesDateFilter(surface: AdminReviewSurface) {
  return surface === "upcomingAspects";
}

function reviewSurfacesForCategory(category: AdminContentCategoryFilter) {
  if (category === "Sky") return ["upcomingAspects"] as AdminReviewSurface[];
  if (category === "Relationship") return ["relationshipLayer"] as AdminReviewSurface[];
  if (category === "Natal Aspects" || category === "Natal Chart") return ["transitNatal", "natalChart"] as AdminReviewSurface[];

  return Object.keys(reviewSurfaceLabels) as AdminReviewSurface[];
}

function categoryUsesGlobalSynastryRows(category: AdminContentCategoryFilter) {
  return category === "all" || category === "Relationship";
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
      throw new AdminRequestError(payload?.error ?? `${response.status} error from ${path.split("?")[0]}.`, response.status, payload);
    }

    if (!payload) {
      throw new AdminRequestError(`Expected JSON from ${path.split("?")[0]}, but the server returned a non-JSON response. If you are running locally, use the Vercel/API dev server for admin actions.`, response.status);
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AdminRequestError(`Request to ${path.split("?")[0]} timed out after ${Math.round(timeoutMs / 1000)} seconds. The provider may still be failing upstream; try again or switch providers.`, 408);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function GeneratedContentAdminDashboard() {
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
  const [vocabularyDrafts, setVocabularyDrafts] = useState<Record<string, AdminVocabularyDraft>>({});
  const [taglineDrafts, setTaglineDrafts] = useState<Record<string, AdminNatalTaglineDraft>>({});
  const [templateContentDrafts, setTemplateContentDrafts] = useState<Record<string, AdminTemplateDraft>>({});
  const [privateRows, setPrivateRows] = useState<AdminUserGeneratedContentRow[]>([]);
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
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewEditTitle, setReviewEditTitle] = useState("");
  const [reviewEditSummary, setReviewEditSummary] = useState("");
  const [reviewEditBody, setReviewEditBody] = useState("");
  const [reviewEditMetadata, setReviewEditMetadata] = useState<AdminReviewMetadataEdit | null>(null);
  const [reviewGenerationProvider, setReviewGenerationProvider] = useState<AdminGenerationProvider>("openai");
  const [isGeneratingReviewDraft, setIsGeneratingReviewDraft] = useState(false);
  const [reviewDraftResults, setReviewDraftResults] = useState<Record<string, AdminDraftResult>>({});
  const [draft, setDraft] = useState<AdminGeneratedContentDraft>(() => createAdminDraft());
  const [message, setMessage] = useState("Use filters or search to narrow the content library.");
  const [accessStatus, setAccessStatus] = useState<AdminAccessStatus>(() => secret.trim() ? "checking" : "empty");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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
  const [activePage, setActivePage] = useState<AdminDashboardPage>("content");
  const contentImportInputRef = useRef<HTMLInputElement | null>(null);
  const [contentImportScope, setContentImportScope] = useState<AdminContentScope>("settings");
  const [apiStatus, setApiStatus] = useState<AdminApiStatusState>({
    state: isTldrAstroApiConfigured ? "idle" : "notConfigured",
    checkedAt: null,
    latencyMs: null,
    health: null,
    error: isTldrAstroApiConfigured ? null : "VITE_TLDRASTRO_API_URL is not configured."
  });
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;
  const canUseApi = secret.trim().length > 0;
  const dedupedContentRecords = useMemo(() => dedupeContentLibraryRecords(reviewRecords), [reviewRecords]);
  const filteredContentRecords = useMemo(() => {
    const normalizedPersonQuery = personQuery.trim().toLowerCase();

    return dedupedContentRecords
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
      .filter((record) => contentBlockFilter === "all" || contentBlockType(record) === contentBlockFilter);
  }, [categoryFilter, contentBlockFilter, personQuery, dedupedContentRecords]);
  const allContentRecords = useMemo(() => {
    return filteredContentRecords
      .filter((record) => recordMatchesContentStatus(record, contentStatusFilter))
      .sort((first, second) => {
        const firstDate = first.targetDate ?? "";
        const secondDate = second.targetDate ?? "";

        if (firstDate !== secondDate) {
          return firstDate.localeCompare(secondDate);
        }

        return first.title.localeCompare(second.title);
      });
  }, [contentStatusFilter, filteredContentRecords]);
  const cmsStatusCounts = useMemo(() => contentStatusCounts(filteredContentRecords), [filteredContentRecords]);
  const selectedReviewRecord = allContentRecords.find((record) => record.id === selectedReviewId) ?? null;
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
  const selectedMetadataIsNatalAspect = selectedMetadataCategory === "Natal Aspects";
  const selectedMetadataIsModularNatalBlock = selectedMetadataIsNatal && selectedMetadataBlockType !== "all" && selectedMetadataBlockType !== "essay";
  const selectedMetadataIsLunarCalendar = selectedMetadataBlockType === "lunar_calendar";
  const selectedMetadataUsesAspectFields = !selectedMetadataIsLunarCalendar && (selectedMetadataBlockType.endsWith("_aspect") || (!selectedMetadataIsNatalPlacement && !selectedMetadataIsModularNatalBlock) || selectedMetadataIsNatalAspect);
  const selectedMetadataIsTimeBasedAspect = selectedMetadataBlockType === "sky_aspect" || selectedMetadataBlockType === "transit_to_natal_aspect";
  const selectedMetadataUsesAspectSigns = selectedMetadataUsesAspectFields && (selectedMetadataIsTimeBasedAspect || ["natal_aspect", "synastry_aspect", "composite_aspect"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesAspectHouses = selectedMetadataUsesAspectFields && ["natal_aspect", "synastry_aspect", "composite_aspect", "transit_to_natal_aspect"].includes(selectedMetadataBlockType);
  const selectedMetadataUsesPlacementBody = selectedMetadataIsNatalPlacement && (!selectedMetadataIsModularNatalBlock || ["placement", "sign", "house", "synthesis"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesPlacementSign = selectedMetadataIsNatalPlacement && (!selectedMetadataIsModularNatalBlock || ["placement", "sign", "synthesis"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesPlacementHouse = selectedMetadataIsNatalPlacement && (!selectedMetadataIsModularNatalBlock || ["placement", "house", "synthesis"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesPlacementRuler = selectedMetadataIsNatalPlacement && (!selectedMetadataIsModularNatalBlock || ["placement", "ruler", "synthesis"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesFullRulerPlacement = selectedMetadataIsNatalPlacement && (!selectedMetadataIsModularNatalBlock || ["placement", "synthesis"].includes(selectedMetadataBlockType));
  const selectedMetadataUsesAspectTiming = selectedMetadataUsesAspectFields && selectedMetadataIsTimeBasedAspect;
  const isSelectedReviewPublished = false;
  const approveButtonLabel = selectedReviewRecord?.status === "REVIEWED" ? "Publish Live" : "Approve";
  const isDateFilterActive = categoryUsesDateFilter(categoryFilter);
  const vocabularyCardItems = useMemo<AdminVocabularyCardItem[]>(() => {
    const items: AdminVocabularyCardItem[] = vocabularyRows.map((row) => {
      const point = pointFromTaglineContentKey(row.content_key);
      const supportsTagline = natalCardTaglinePoints.some((taglinePoint) => normalizedNatalCardTaglinePoint(taglinePoint) === normalizedNatalCardTaglinePoint(point));

      return {
        contentKey: row.content_key,
        point,
        row,
        taglineContentKey: supportsTagline ? natalCardTaglineContentKey(point) : undefined
      };
    });
    const existingPointIds = new Set(items.map((item) => normalizedNatalCardTaglinePoint(item.point)));

    for (const point of natalCardTaglinePoints) {
      if (!existingPointIds.has(normalizedNatalCardTaglinePoint(point))) {
        items.push({
          contentKey: natalCardTaglineContentKey(point),
          point,
          taglineContentKey: natalCardTaglineContentKey(point)
        });
      }
    }

    return items;
  }, [vocabularyRows]);

  function buildContentExchangeBundle(
    scope: AdminContentScope,
    nextVocabularyRows = vocabularyRows,
    nextTaglineRows = taglineRows,
    nextTemplateRows = templateContentRows
  ): AdminContentExchangeBundle {
    return {
      schema: "tldrastro-admin-content-v1",
      exportedAt: new Date().toISOString(),
      settings: scope === "settings" ? voiceTemplates : {},
      vocabularyRows: scope === "vocabulary" ? nextVocabularyRows.map((row) => {
        const draftValue = vocabularyDrafts[row.id] ?? vocabularyDraftFromRow(row);

        return {
          id: row.id,
          contentKey: row.content_key,
          headline: draftValue.headline,
          natal: draftValue.natal,
          sky: draftValue.sky
        };
      }) : [],
      taglineRows: scope === "vocabulary" ? natalCardTaglinePoints.map((point) => {
        const contentKey = natalCardTaglineContentKey(point);
        const matchedRow = nextTaglineRows.find((row) => row.content_key === contentKey);
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
      }) : []
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

  async function fetchTemplateRowsForAdmin() {
    const params = new URLSearchParams({
      status: "all",
      contentKeyPrefix: "fallback-hook/",
      limit: "200"
    });
    const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
      `/api/admin/generated-content?${params}`,
      secret
    );

    return (payload.rows ?? [])
      .filter((row) => row.content_key.startsWith("fallback-hook/"))
      .sort((first, second) => first.content_key.localeCompare(second.content_key));
  }

  async function fetchGlobalSynastryRowsForAdmin() {
    const params = new URLSearchParams({
      status: "all",
      surface: "synastry",
      promptVersion: "synastry-kb-v1",
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
    return "templates";
  }

  function triggerContentImport(scope: AdminContentScope) {
    setContentImportScope(scope);
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
      const nextTemplateRows = scope === "templates" ? await fetchTemplateRowsForAdmin() : templateContentRows;

      if (scope === "vocabulary") {
        setVocabularyRows(nextVocabularyRows);
        setVocabularyDrafts(draftMapForVocabularyRows(nextVocabularyRows));
        setTaglineRows(nextTaglineRows);
        setTaglineDrafts(draftMapForTaglineRows(nextTaglineRows));
      }

      if (scope === "templates") {
        setTemplateContentRows(nextTemplateRows);
        setTemplateContentDrafts(draftMapForTemplateRows(nextTemplateRows));
      }

      const bundle = buildContentExchangeBundle(scope, nextVocabularyRows, nextTaglineRows, nextTemplateRows);
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
    const matchedRow = availableRows.find((row) => row.id === importedRow.id || row.content_key === importedRow.contentKey);

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

  async function upsertTaglineImportRow(
    importedRow: AdminContentExchangeBundle["taglineRows"][number],
    availableRows: AdminGeneratedContentRow[]
  ) {
    const matchedRow = availableRows.find((row) => row.id === importedRow.id || row.content_key === importedRow.contentKey);
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
          status: "LIVE",
          promptVersion: "tagline-v1",
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
        setMessage(`Imported ${Object.keys(bundle.settings).length} settings surfaces.`);
        return;
      }

      if (scope === "vocabulary") {
        const availableRows = await fetchVocabularyRowsForAdmin();
        const availableTaglineRows = await fetchTaglineRowsForAdmin();

        for (const row of bundle.vocabularyRows) {
          await patchGeneratedContentByImportKey(
            row,
            {
              headline: row.headline,
              body: row.natal,
              sections: {
                topic: {
                  natal: row.natal,
                  sky: row.sky
                }
              }
            },
            availableRows
          );
        }

        for (const row of bundle.taglineRows) {
          await upsertTaglineImportRow(row, availableTaglineRows);
        }

        await loadVocabularyRows();
        setAccessStatus("valid");
        setMessage(`Imported ${bundle.vocabularyRows.length} vocabulary rows and ${bundle.taglineRows.length} tagline rows.`);
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

      await loadTemplateContentRows();
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
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const bundle = file.name.toLowerCase().endsWith(".csv")
        ? contentBundleFromCsv(text)
        : contentBundleFromJson(text);

      await importManagedContentBundle(bundle, contentImportScope);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read import file.");
    }
  }

  async function checkTldrAstroApiStatus() {
    if (!isTldrAstroApiConfigured) {
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

      if (dateStart) {
        params.set("startDate", dateStart);
      }

      if (dateEnd) {
        params.set("endDate", dateEnd);
      }

      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?${params}`,
        secret
      );

      setRows(payload.rows ?? []);
      setMessage(`Loaded ${(payload.rows ?? []).length} ${nextStatus.toLowerCase()} rows. Status totals are current.`);
      setSelectedReviewId(null);

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

  async function loadVocabularyRows() {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const [nextRows, nextTaglineRows] = await Promise.all([
        fetchVocabularyRowsForAdmin(),
        fetchTaglineRowsForAdmin()
      ]);

      setVocabularyRows(nextRows);
      setVocabularyDrafts(draftMapForVocabularyRows(nextRows));
      setTaglineRows(nextTaglineRows);
      setTaglineDrafts(draftMapForTaglineRows(nextTaglineRows));
      setAccessStatus("valid");
      setMessage(`Loaded ${nextRows.length} vocabulary rows and ${nextTaglineRows.length} tagline rows.`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not load vocabulary rows."));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTemplateContentRows() {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: "all",
        contentKeyPrefix: "fallback-hook/",
        limit: "200"
      });
      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?${params}`,
        secret
      );
      const nextRows = (payload.rows ?? [])
        .filter((row) => row.content_key.startsWith("fallback-hook/"))
        .sort((first, second) => first.content_key.localeCompare(second.content_key));

      setTemplateContentRows(nextRows);
      setTemplateContentDrafts(draftMapForTemplateRows(nextRows));
      setAccessStatus("valid");
      setMessage(`Loaded ${nextRows.length} fallback template rows.`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not load fallback template rows."));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPrivateRows(nextReviewSurface = reviewSurface) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const privateSurface = generatedSurfaceForReviewSurface(nextReviewSurface);
      const params = new URLSearchParams({
        status: "all",
        limit: "100"
      });

      if (privateSurface !== "all") {
        params.set("surface", privateSurface);
      }

      if (dateStart) {
        params.set("startDate", dateStart);
      }

      if (dateEnd) {
        params.set("endDate", dateEnd);
      }

      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminUserGeneratedContentRow[] }>(
        `/api/admin/user-generated-content?${params}`,
        secret
      );

      setPrivateRows(payload.rows ?? []);
      setMessage(`Loaded ${(payload.rows ?? []).length} personal content rows for the selected review window.`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not load personal content rows."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setAccessStatus(secret.trim() ? "checking" : "empty");
    if (canUseApi) {
      void loadReviewWorkspace();
    }
  }, [secret]);

  useEffect(() => {
    if (activePage === "vocabulary" && canUseApi) {
      void loadVocabularyRows();
    }

    if (activePage === "knowledge" && canUseApi) {
      void loadTemplateContentRows();
    }

  }, [activePage, canUseApi]);

  useEffect(() => {
    void checkTldrAstroApiStatus();
  }, []);

  async function loadReviewWorkspace(nextReviewSurface = reviewSurface, nextStatus = status) {
    const surfaces = reviewSurfacesForCategory(categoryFilter);
    setSelectedId(null);
    setSelectedReviewId(null);
    setDraft(createAdminDraft(surface));
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    setAccessStatus("checking");
    try {
      const payloads = await Promise.all(surfaces.map((reviewSurfaceKey) => {
        const params = new URLSearchParams({
          surface: reviewSurfaceKey,
          status: "all"
        });
        const shouldUseDateWindow = reviewSurfaceUsesDateFilter(reviewSurfaceKey);

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
      }));
      const privateParams = new URLSearchParams({
        status: "all",
        limit: "100"
      });

      if (categoryFilter === "Sky" && dateStart) {
        privateParams.set("startDate", dateStart);
      }

      if (categoryFilter === "Sky" && dateEnd) {
        privateParams.set("endDate", dateEnd);
      }

      const privatePayload = await adminJsonRequest<{ ok: boolean; rows: AdminUserGeneratedContentRow[] }>(
        `/api/admin/user-generated-content?${privateParams}`,
        secret
      );
      const globalSynastryRows = categoryUsesGlobalSynastryRows(categoryFilter)
        ? await fetchGlobalSynastryRowsForAdmin()
        : [];
      const mergedRecords = new Map<string, AdminReviewRecord>();

      payloads.flatMap((payload) => payload.rows ?? []).forEach((record) => {
        const mergeKey = reviewRecordMergeKey(record);
        mergedRecords.set(mergeKey, preferredReviewRecord(mergedRecords.get(mergeKey), record));
      });
      globalSynastryRows.map(globalReviewRecord).forEach((record) => {
        const mergeKey = reviewRecordMergeKey(record);
        mergedRecords.set(mergeKey, preferredReviewRecord(mergedRecords.get(mergeKey), record));
      });
      (privatePayload.rows ?? []).map(privateReviewRecord).forEach((record) => {
        mergedRecords.set(record.id, record);
      });

      const nextRecords = Array.from(mergedRecords.values());

      setReviewRecords(nextRecords);
      setPrivateRows(privatePayload.rows ?? []);
      setReviewCounts({
        total: nextRecords.length,
        DRAFT: nextRecords.filter((record) => record.status === "DRAFT").length,
        REVIEWED: nextRecords.filter((record) => record.status === "REVIEWED").length,
        LIVE: nextRecords.filter((record) => record.status === "LIVE").length,
        ARCHIVED: nextRecords.filter((record) => record.status === "ARCHIVED").length,
        ERROR: nextRecords.filter((record) => record.status === "ERROR").length
      });
      setAccessStatus("valid");
      const prompts = payloads.map((payload) => payload.prompt).filter(Boolean);

      setMessage(
        prompts[0] && globalSynastryRows.length > 0
          ? `Loaded ${nextRecords.length} content rows, including ${globalSynastryRows.length} global synastry rows. ${prompts[0]}`
          : prompts[0] ?? `Loaded ${nextRecords.length} content rows.`
      );
    } catch (error) {
      setReviewRecords([]);
      setReviewCounts({
        total: 0,
        DRAFT: 0,
        REVIEWED: 0,
        LIVE: 0,
        ARCHIVED: 0,
        ERROR: 0
      });
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not load review records."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isPreviewOpen) {
      return;
    }

    function closePreviewOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
      }
    }

    window.addEventListener("keydown", closePreviewOnEscape);
    return () => window.removeEventListener("keydown", closePreviewOnEscape);
  }, [isPreviewOpen]);

  function saveSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSecret = secretDraft.trim();

    setSecret(nextSecret);
    setAccessStatus(nextSecret ? "checking" : "empty");
    setMessage(nextSecret ? "Checking admin access..." : "Use filters or search to narrow the content library.");
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

  function updateVocabularyDraft(id: string, patch: Partial<AdminVocabularyDraft>) {
    setVocabularyDrafts((currentDrafts) => ({
      ...currentDrafts,
      [id]: {
        ...(currentDrafts[id] ?? { headline: "", natal: "", sky: "" }),
        ...patch
      }
    }));
  }

  function updateTaglineDraft(contentKey: string, patch: Partial<AdminNatalTaglineDraft>) {
    const point = pointFromTaglineContentKey(contentKey);

    setTaglineDrafts((currentDrafts) => ({
      ...currentDrafts,
      [contentKey]: {
        ...(currentDrafts[contentKey] ?? fallbackTaglineDraft(point)),
        ...patch
      }
    }));
  }

  function updateTemplateContentDraft(id: string, patch: Partial<AdminTemplateDraft>) {
    setTemplateContentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [id]: {
        ...(currentDrafts[id] ?? { headline: "", summary: "", body: "" }),
        ...patch
      }
    }));
  }

  async function saveVocabularyRow(row: AdminGeneratedContentRow) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const draftValue = vocabularyDrafts[row.id] ?? vocabularyDraftFromRow(row);
    setIsLoading(true);
    try {
      await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "PATCH",
          body: JSON.stringify({
            id: row.id,
            headline: draftValue.headline,
            body: draftValue.natal,
            sections: {
              topic: {
                natal: draftValue.natal,
                sky: draftValue.sky
              }
            }
          })
        }
      );
      await loadVocabularyRows();
      setMessage(`Saved and re-read ${row.content_key}.`);
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
    const matchedRow = taglineRows.find((row) => row.content_key === contentKey);
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
        await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
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
      }

      await loadVocabularyRows();
      setMessage(`Saved and re-read ${contentKey}.`);
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

    setIsLoading(true);
    try {
      if (item.row) {
        const draftValue = vocabularyDrafts[item.row.id] ?? vocabularyDraftFromRow(item.row);

        await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
          "/api/admin/generated-content",
          secret,
          {
            method: "PATCH",
            body: JSON.stringify({
              id: item.row.id,
              headline: draftValue.headline,
              body: draftValue.natal,
              sections: {
                topic: {
                  natal: draftValue.natal,
                  sky: draftValue.sky
                }
              }
            })
          }
        );
      }

      if (item.taglineContentKey) {
        const point = pointFromTaglineContentKey(item.taglineContentKey);
        const matchedRow = taglineRows.find((row) => row.content_key === item.taglineContentKey);
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
          await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
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
        }
      }

      await loadVocabularyRows();
      setMessage(`Saved and re-read ${item.point}.`);
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
      await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: "PATCH",
          body: JSON.stringify({
            id: row.id,
            headline: draftValue.headline,
            summary: draftValue.summary,
            body: draftValue.body
          })
        }
      );
      await loadTemplateContentRows();
      setMessage(`Saved and re-read ${row.content_key}.`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not save fallback template row."));
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
      promptVersion: metadata.category === "Natal Chart" ? "natal-placement-v2" : undefined
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
        setEditingReviewId(null);
        setMessage(nextStatus === "LIVE" ? "Published this personal content row." : "Saved personal content edits.");
        return;
      }

      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        "/api/admin/generated-content",
        secret,
        {
          method: existingGlobalRowId ? "PATCH" : "POST",
          body: JSON.stringify({
            id: existingGlobalRowId || undefined,
            contentKey: modularPayload.contentKey,
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
            knowledgeIds: [],
            reviewerNotes: record.reviewerNotes ?? "",
            promptVersion: modularPayload.promptVersion,
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
              contentKey: modularPayload.contentKey,
              title: nextTitle,
              targetDate: nextTargetDate,
              summary: nextSummary,
              body: nextBody,
              facts: nextFacts,
              rawGlobalRow: row ?? currentRecord.rawGlobalRow
            }
          : currentRecord
      )));
      setEditingReviewId(null);
      setMessage(nextStatus === "LIVE" ? "Saved changes to published copy." : nextStatus === "REVIEWED" ? "Approved this copy for review." : row ? "Saved edits as a draft." : "Saved edits.");
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(adminErrorMessage(error, "Could not save edits."));
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
            contentKey: modularPayload.contentKey,
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
              promptVersion: modularPayload.promptVersion,
              adminReviewSource: record.source,
              generatedFromReviewRecordId: record.id
            },
            knowledgeIds: [],
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
              sourceSnapshot: savedRow?.source_snapshot ?? currentRecord.sourceSnapshot,
              sections: generated.sections ?? currentRecord.sections,
              model: generated.model ?? currentRecord.model,
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

  function saveVoiceTemplates() {
    try {
      window.localStorage.setItem(adminVoiceTemplateStorageKey, JSON.stringify(voiceTemplates));
      setMessage("Voice templates saved. New generations will use these notes.");
    } catch {
      setMessage("Could not save voice templates in this browser.");
    }
  }

  function resetActiveVoiceTemplate() {
    const nextTemplates = {
      ...voiceTemplates,
      [activeTemplateSurface]: defaultVoiceTemplates[activeTemplateSurface]
    };

    setVoiceTemplates(nextTemplates);
    try {
      window.localStorage.setItem(adminVoiceTemplateStorageKey, JSON.stringify(nextTemplates));
    } catch {
      return;
    }
    setMessage(`${voiceTemplateLabels[activeTemplateSurface]} voice template reset.`);
  }

  function voiceNotesFor(surface: GeneratedContentSurface, eventType: string | null | undefined, reviewerNotes = "") {
    const surfaceKey = templateSurfaceFor(surface, eventType ?? undefined);
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
    return voiceNotesFor(draftWithFacts.surface, draftWithFacts.eventType, draftWithFacts.reviewerNotes);
  }

  function voiceNotesForReviewRecord(record: AdminReviewRecord) {
    const baseNotes = voiceNotesFor(record.surface, record.eventType, record.reviewerNotes ?? "");

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
        "Write a full upcoming transit article in Marie Satori's voice.",
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
    const nextRecord = manualEntryRecord(categoryFilter, surface);

    setReviewRecords((currentRecords) => [nextRecord, ...currentRecords.filter((record) => record.id !== nextRecord.id)]);
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
    setSelectedId(null);
    setDraft(createAdminDraft(nextRecord.surface, nextRecord.targetDate ?? dateInputValue()));
    setSurface(nextRecord.surface);
    setStatus("DRAFT");
    setContentStatusFilter("DRAFT");
    setActivePage("content");
    setAreGenerationInputsOpen(true);
    setMessage("New content entry ready. Choose its content type, then write or generate a draft.");
  }

  async function createDraft() {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
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
            facts: parseAdminJson(draft.factsJson, "Facts"),
            sourceSnapshot: parseAdminJson(draft.sourceSnapshotJson, "Source snapshot"),
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

  async function prepopulateContentQueue() {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const requestedSurface: GeneratedContentSurfaceFilter = "sky";

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
      setMessage(`Prepared ${payload.inserted} Sky draft rows for ${payload.targetDate}. Open each row and generate the reader-facing copy when you are ready.`);
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
          <button
            className={activePage === "content" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("content")}
            aria-current={activePage === "content" ? "page" : undefined}
          >
            <FileText size={18} aria-hidden="true" />
            Content
          </button>
          <button
            className={activePage === "settings" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("settings")}
            aria-current={activePage === "settings" ? "page" : undefined}
          >
            <Sparkles size={18} aria-hidden="true" />
            Settings
          </button>
          <button
            className={activePage === "vocabulary" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("vocabulary")}
            aria-current={activePage === "vocabulary" ? "page" : undefined}
          >
            <Database size={18} aria-hidden="true" />
            Vocabulary
          </button>
          <button
            className={activePage === "knowledge" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("knowledge")}
            aria-current={activePage === "knowledge" ? "page" : undefined}
          >
            <BookOpenText size={18} aria-hidden="true" />
            Templates
          </button>
          <button
            className={activePage === "releaseNotes" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("releaseNotes")}
            aria-current={activePage === "releaseNotes" ? "page" : undefined}
          >
            <BookOpenText size={18} aria-hidden="true" />
            Release Notes
          </button>
        </nav>

        <a className="admin-public-link" href="/">
          Public app
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
          {activePage === "content" && (
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
        </section>
        <input
          ref={contentImportInputRef}
          type="file"
          accept=".csv,.json,application/json,text/csv"
          onChange={(event) => void importManagedContentFile(event)}
          hidden
        />

        {activePage === "releaseNotes" ? (
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
        ) : activePage === "settings" ? (
          <section className="admin-settings-page" aria-label="Content settings">
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

            <section className="admin-template-panel" aria-label="Settings import and export">
              <div className="admin-template-header">
                <div>
                  <p className="admin-eyebrow">Portable settings</p>
                  <h2>Import / Export Settings</h2>
                  <p>Download or restore the voice templates and generation guidance for this dashboard.</p>
                </div>
                <div className="admin-release-summary" aria-label="Settings export coverage">
                  <article>
                    <span>Surfaces</span>
                    <strong>{Object.keys(voiceTemplates).length}</strong>
                  </article>
                  <article>
                    <span>Format</span>
                    <strong>CSV / JSON</strong>
                  </article>
                </div>
              </div>
              <div className="admin-template-actions">
                <button className="admin-format-button" type="button" onClick={() => void downloadManagedContent("json", "settings")} disabled={isLoading} aria-label="Download settings as JSON">
                  <Download size={16} aria-hidden="true" />
                  JSON
                </button>
                <button className="admin-format-button" type="button" onClick={() => void downloadManagedContent("csv", "settings")} disabled={isLoading} aria-label="Download settings as CSV">
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
            </section>

            <section id="voice-templates" className="admin-template-panel admin-template-page" aria-label="Content voice templates">
              <div className="admin-template-header">
                <div>
                  <p className="admin-eyebrow">Templates and voice</p>
                  <h2>{voiceTemplateLabels[activeTemplateSurface]}</h2>
                </div>
                <div className="admin-template-actions">
                  <button type="button" onClick={saveVoiceTemplates}>
                    <Save size={16} aria-hidden="true" />
                    Save Templates
                  </button>
                  <button type="button" onClick={resetActiveVoiceTemplate}>
                    Reset {voiceTemplateLabels[activeTemplateSurface]}
                  </button>
                </div>
              </div>

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
                  rows={10}
                />
              </label>

              <label className="admin-field-wide admin-template-guide-field">
                <span>AI generation guide</span>
                <textarea
                  value={voiceTemplates[activeTemplateSurface].generationGuide}
                  onChange={(event) => updateVoiceTemplate(activeTemplateSurface, "generationGuide", event.target.value)}
                  rows={7}
                />
              </label>

              <div className="admin-template-two-column">
                <label className="admin-field-wide">
                  <span>Banned words and phrases</span>
                  <textarea
                    value={voiceTemplates[activeTemplateSurface].bannedWords}
                    onChange={(event) => updateVoiceTemplate(activeTemplateSurface, "bannedWords", event.target.value)}
                    rows={7}
                  />
                </label>

                <label className="admin-field-wide">
                  <span>Language and phrase bank</span>
                  <textarea
                    value={voiceTemplates[activeTemplateSurface].phraseBank}
                    onChange={(event) => updateVoiceTemplate(activeTemplateSurface, "phraseBank", event.target.value)}
                    rows={7}
                  />
                </label>
              </div>
            </section>

            <section id="content-hooks" className="admin-template-panel admin-hooks-page" aria-label="Content hook catalog">
              <div className="admin-template-header">
                <div>
                  <p className="admin-eyebrow">Content hooks</p>
                  <h2>Named Content Points</h2>
                </div>
              </div>

              <div className="admin-hooks-grid">
                {fallbackHookDefinitions.map((hook) => {
                  const sampleContext = fallbackHookSampleContexts[hook.key] ?? {};
                  const sampleIds = knowledgeIdsForFallbackHook(hook.key, sampleContext);

                  return (
                    <article className="admin-hook-card" key={hook.key}>
                      <div className="admin-hook-card-header">
                        <div>
                          <p className="admin-eyebrow">{hook.surface} / {hook.mode}</p>
                          <h3>{hook.label}</h3>
                        </div>
                        <span>{hook.domain}</span>
                      </div>
                      <p>{hook.description}</p>
                      <dl className="admin-hook-meta">
                        <div>
                          <dt>Hook key</dt>
                          <dd>{hook.key}</dd>
                        </div>
                        <div>
                          <dt>Required facts</dt>
                          <dd>{hook.requiredFacts.map((fact) => <code key={fact}>{fact}</code>)}</dd>
                        </div>
                        <div>
                          <dt>Example IDs</dt>
                          <dd>{sampleIds.map((sampleId) => <code key={sampleId}>{sampleId}</code>)}</dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            </section>
          </section>
        ) : activePage === "vocabulary" ? (
          <section className="admin-template-panel admin-vocabulary-page" aria-label="Vocabulary content rows">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Prompt version vocab-v1</p>
                <h2>Planet Vocabulary</h2>
                <p>Edit the phrases used by template interpolation and the taglines shown on natal chart cards.</p>
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
              </div>
            </div>

            <div className="admin-managed-row-list">
              {vocabularyCardItems.map((item) => {
                const topicRow = item.row;
                const rowDraft = topicRow ? vocabularyDrafts[topicRow.id] ?? vocabularyDraftFromRow(topicRow) : null;
                const matchedTaglineRow = item.taglineContentKey
                  ? taglineRows.find((row) => row.content_key === item.taglineContentKey)
                  : undefined;
                const taglineDraft = item.taglineContentKey
                  ? taglineDrafts[item.taglineContentKey] ?? (matchedTaglineRow ? taglineDraftFromRow(matchedTaglineRow) : fallbackTaglineDraft(item.point))
                  : null;

                return (
                  <article className="admin-managed-row-card" data-vocab-row={item.contentKey} key={item.contentKey}>
                    <header>
                      <div>
                        <p className="admin-eyebrow">{topicRow?.prompt_version ?? "tagline-v1"} / {topicRow?.surface ?? "natal card"}</p>
                        {rowDraft && topicRow ? (
                          <label className="admin-managed-title">
                            <span>Headline</span>
                            <input
                              value={rowDraft.headline}
                              onChange={(event) => updateVocabularyDraft(topicRow.id, { headline: event.target.value })}
                            />
                          </label>
                        ) : (
                          <h3>{item.point}</h3>
                        )}
                      </div>
                      <div className="admin-managed-badges">
                        {topicRow && <span className={`ui-pill admin-status status-${topicRow.status.toLowerCase()}`}>{topicRow.status}</span>}
                        {item.taglineContentKey && (
                          <span className={`ui-pill admin-status status-${matchedTaglineRow?.status.toLowerCase() ?? "draft"}`}>
                            Tagline {matchedTaglineRow?.status ?? "not saved"}
                          </span>
                        )}
                      </div>
                    </header>

                    <code className="admin-managed-key">{topicRow?.content_key ?? item.contentKey}</code>

                    {rowDraft && topicRow && (
                      <div className="admin-managed-two-column">
                        <label className="admin-field-wide">
                          <span>Natal phrase</span>
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

                    <div className="admin-template-actions">
                      <button type="button" onClick={() => void saveVocabularyCard(item)} disabled={isLoading}>
                        <Save size={16} aria-hidden="true" />
                        Save Row
                      </button>
                    </div>
                  </article>
                );
              })}
              {vocabularyCardItems.length === 0 && (
                <p className="admin-empty">No vocabulary rows were found.</p>
              )}
            </div>
          </section>
        ) : activePage === "knowledge" ? (
          <section className="admin-template-panel admin-knowledge-page" aria-label="Fallback template content rows">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Fallback hooks</p>
                <h2>Template Knowledge Rows</h2>
                <p>Edit the dashboard-managed fallback-hook rows that the app can use after specific generated content misses.</p>
              </div>
              <div className="admin-release-summary" aria-label="Template row count">
                <article>
                  <span>Rows</span>
                  <strong>{templateContentRows.length}</strong>
                </article>
                <article>
                  <span>Prefix</span>
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

            <div className="admin-managed-row-list">
              {templateContentRows.map((row) => {
                const rowDraft = templateContentDrafts[row.id] ?? templateDraftFromRow(row);
                const badge = contentTypeBadge(row);

                return (
                  <article className="admin-managed-row-card admin-template-content-card" data-template-row={row.content_key} key={row.id}>
                    <header>
                      <div>
                        <p className="admin-eyebrow">{row.prompt_version ?? "unknown prompt"} / {row.surface}</p>
                        <label className="admin-managed-title">
                          <span>Headline</span>
                          <input
                            value={rowDraft.headline}
                            onChange={(event) => updateTemplateContentDraft(row.id, { headline: event.target.value })}
                          />
                        </label>
                      </div>
                      <div className="admin-managed-badges">
                        {badge && <span className="ui-pill admin-template-badge">{badge}</span>}
                        <span className={`ui-pill admin-status status-${row.status.toLowerCase()}`}>{row.status}</span>
                      </div>
                    </header>

                    <code className="admin-managed-key">{row.content_key}</code>

                    <label className="admin-field-wide">
                      <span>Summary</span>
                      <textarea
                        value={rowDraft.summary}
                        onChange={(event) => updateTemplateContentDraft(row.id, { summary: event.target.value })}
                        rows={3}
                      />
                    </label>

                    <label className="admin-field-wide">
                      <span>Body</span>
                      <textarea
                        value={rowDraft.body}
                        onChange={(event) => updateTemplateContentDraft(row.id, { body: event.target.value })}
                        rows={6}
                      />
                    </label>

                    <div className="admin-template-actions">
                      <button type="button" onClick={() => void saveTemplateContentRow(row)} disabled={isLoading}>
                        <Save size={16} aria-hidden="true" />
                        Save Row
                      </button>
                    </div>
                  </article>
                );
              })}
              {templateContentRows.length === 0 && (
                <p className="admin-empty">No fallback-hook template rows were found.</p>
              )}
            </div>
          </section>
        ) : activePage === "privateRows" ? (
          <section className="admin-template-panel admin-private-page" aria-label="Personal generated content rows">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Natal and person-specific content</p>
                <h2>Provider + Model Audit</h2>
                <p>These rows can be tied to individual people, natal charts, or relationship subjects. Use this read-only view to confirm whether Claude or OpenAI wrote a saved interpretation.</p>
              </div>
              <div className="admin-release-summary" aria-label="Personal generated row count">
                <article>
                  <span>Rows</span>
                  <strong>{privateRows.length}</strong>
                </article>
                <article>
                  <span>Scope</span>
                  <strong>Personal</strong>
                </article>
              </div>
            </div>

            <div className="admin-private-row-list">
              {privateRows.map((row) => (
                <article className="admin-private-row-card" key={row.id}>
                  <header>
                    <div>
                      <p className="admin-eyebrow">{row.subject_type} / {row.surface} / {row.mode}</p>
                      <h3>{row.headline || row.content_key}</h3>
                    </div>
                    <span className={`ui-pill admin-status status-${row.status.toLowerCase()}`}>{row.status}</span>
                  </header>
                  <div className="admin-provider-meta" aria-label="AI provider and model">
                    <span>Provider: <strong>{row.provider || "unknown"}</strong></span>
                    <span>Model: <strong>{row.model || "unknown"}</strong></span>
                  </div>
                  <p>{row.summary || row.body || row.error || "No generated body saved yet."}</p>
                  <dl className="admin-private-meta">
                    <div>
                      <dt>User</dt>
                      <dd>{row.user_id}</dd>
                    </div>
                    <div>
                      <dt>Subject</dt>
                      <dd>{row.subject_id}</dd>
                    </div>
                    <div>
                      <dt>Content key</dt>
                      <dd>{row.content_key}</dd>
                    </div>
                    <div>
                      <dt>Target date</dt>
                      <dd>{adminDateLabel(row.target_date)}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{new Date(row.updated_at).toLocaleString()}</dd>
                    </div>
                  </dl>
                </article>
              ))}
              {privateRows.length === 0 && (
                <p className="admin-empty">No personal content rows have been saved yet.</p>
              )}
            </div>
          </section>
        ) : activePage === "hooks" ? (
          <section id="content-hooks" className="admin-template-panel admin-hooks-page" aria-label="Content hook catalog">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Hook catalog</p>
                <h2>Named Content Points</h2>
                <p>These are the app surfaces that need LIVE generated content or approved voice-backed copy. Use the labels below to identify what needs a generated row, template, or source-backed rewrite.</p>
              </div>
              <div className="admin-template-actions">
                <button type="button" onClick={() => setActivePage("content")}>
                  <LayoutDashboard size={16} aria-hidden="true" />
                  Back to Content
                </button>
              </div>
            </div>

            <div className="admin-hooks-grid">
              {fallbackHookDefinitions.map((hook) => {
                const sampleContext = fallbackHookSampleContexts[hook.key] ?? {};
                const sampleIds = knowledgeIdsForFallbackHook(hook.key, sampleContext);

                return (
                  <article className="admin-hook-card" key={hook.key}>
                    <div className="admin-hook-card-header">
                      <div>
                        <p className="admin-eyebrow">{hook.surface} / {hook.mode}</p>
                        <h3>{hook.label}</h3>
                      </div>
                      <span>{hook.domain}</span>
                    </div>
                    <p>{hook.description}</p>
                    <dl className="admin-hook-meta">
                      <div>
                        <dt>Hook key</dt>
                        <dd>{hook.key}</dd>
                      </div>
                      <div>
                        <dt>Required facts</dt>
                        <dd>
                          {hook.requiredFacts.map((fact) => (
                            <code key={fact}>{fact}</code>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt>Knowledge ID patterns</dt>
                        <dd>
                          {hook.knowledgeIdTemplates.map((template) => (
                            <code key={template}>{template}</code>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt>Example IDs</dt>
                        <dd>
                          {sampleIds.map((sampleId) => (
                            <code key={sampleId}>{sampleId}</code>
                          ))}
                        </dd>
                      </div>
                    </dl>
                    <div className="admin-hook-guidance" aria-label={`${hook.label} generation guidance`}>
                      <div>
                        <span>Headline pattern</span>
                        <p>{hook.copy.headline}</p>
                      </div>
                      <div>
                        <span>Summary pattern</span>
                        <p>{hook.copy.summary}</p>
                      </div>
                      <div>
                        <span>Body pattern</span>
                        <p>{hook.copy.body}</p>
                      </div>
                      <div>
                        <span>Best move</span>
                        <p>{hook.copy.bestMove}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : activePage === "templates" ? (
          <section id="voice-templates" className="admin-template-panel admin-template-page" aria-label="Content voice templates">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Generation controls</p>
                <h2>{voiceTemplateLabels[activeTemplateSurface]}</h2>
                <p>Set the reusable instructions the generator should follow when creating this type of astrology content. Save here first, then go back to Content Review and generate drafts.</p>
              </div>
              <div className="admin-template-actions">
                <button type="button" onClick={saveVoiceTemplates}>
                  <Save size={16} aria-hidden="true" />
                  Save Templates
                </button>
                <button type="button" onClick={resetActiveVoiceTemplate}>
                  Reset {voiceTemplateLabels[activeTemplateSurface]}
                </button>
              </div>
            </div>

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

            <p className="admin-template-note">
              These templates are saved in this browser for now. They shape the AI draft before review, while the knowledge base and current astrology facts keep the interpretation grounded.
            </p>
          </section>
        ) : (
          <>
            <section className="admin-content-toolbar" aria-label="Content filters">
              <div>
                <p className="admin-eyebrow">Content library</p>
                <h2>All Entries</h2>
                <p>{cmsStatusCounts.all} entries across generated, authored, global, and personal content.</p>
              </div>
              <div className="admin-new-actions" aria-label="New content">
                <button type="button" onClick={() => void prepopulateContentQueue()} disabled={isLoading}>
                  <Sparkles size={16} aria-hidden="true" />
                  Add Sky Aspect Drafts
                </button>
                <button type="button" onClick={() => void startNewContent()} disabled={isLoading}>
                  <Plus size={16} aria-hidden="true" />
                  New Content
                </button>
              </div>
            </section>

            <section className="admin-content-filters" aria-label="Content list filters">
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
                  <span>Category</span>
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as AdminContentCategoryFilter)}>
                    {contentCategoryFilters.map((category) => (
                      <option key={category.key} value={category.key}>{category.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Block type</span>
                  <select value={contentBlockFilter} onChange={(event) => setContentBlockFilter(event.target.value as AdminContentBlockFilter)}>
                    <option value="all">All content types</option>
                    {contentBlockEditorGroups.map((group) => (
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

            <section className="admin-workbench admin-review-workspace">
              <aside className="admin-list-panel" aria-label="Generated content records">
                <div className="admin-panel-header">
                  <div>
                    <p className="admin-eyebrow">Record list</p>
                    <h2>Content</h2>
                  </div>
                  <BarChart3 size={18} aria-hidden="true" />
                </div>

                <div className="admin-content-table-scroll">
                  <table className="admin-content-table">
                    <colgroup>
                      <col className="admin-content-col-title" />
                      <col className="admin-content-col-status" />
                      <col className="admin-content-col-visibility" />
                      <col className="admin-content-col-location" />
                      <col className="admin-content-col-date" />
                      <col className="admin-content-col-category" />
                    </colgroup>
                    <thead className="admin-content-table-head">
                      <tr>
                        <th scope="col">Content</th>
                        <th scope="col">Status</th>
                        <th scope="col">Visibility</th>
                        <th scope="col">Lives in</th>
                        <th scope="col">Date</th>
                        <th scope="col">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allContentRecords.map((record) => {
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
                            title={`${record.title} · ${recordMetadataLabel(record)}`}
                          >
                            <td className="admin-content-title-cell">
                              <strong className="admin-content-row-title">{record.title}</strong>
                            </td>
                            <td className="admin-content-badge-cell">
                              <span className={`ui-pill admin-status status-${record.status.toLowerCase()}`}>{contentStatusLabel(record.status)}</span>
                            </td>
                            <td className="admin-content-badge-cell">
                              <span className={`ui-pill admin-restriction-pill restriction-${contentRestrictionLabel(record).toLowerCase()}`}>{contentRestrictionLabel(record)}</span>
                            </td>
                            <td className="admin-content-location">
                              <strong>{appLocationLabel(record)}</strong>
                              <small>{record.surface === "natal" ? contentBlockTypeLabel(record) : appLocationDetail(record)}</small>
                            </td>
                            <td className={`admin-content-row-date ${record.status === "REVIEWED" && !record.targetDate ? "missing" : ""}`}>
                              {contentRecordDateLabel(record)}
                            </td>
                            <td className="admin-content-row-section">{contentCategoryLabel(record)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {allContentRecords.length === 0 && (
                    <p className="admin-empty">No content records match these filters yet.</p>
                  )}
                </div>
              </aside>
            </section>

            {selectedReviewRecord && (
              <div className="admin-drawer-backdrop" role="presentation" onClick={closeReviewDrawer}>
                <section className="admin-editor-panel admin-review-detail admin-editor-drawer" aria-label="Generated content record detail" onClick={(event) => event.stopPropagation()}>
                  <>
                    <div className="admin-editor-toolbar">
                      <div className="admin-drawer-topbar">
                        <p className="admin-eyebrow">Editing in place</p>
                        <button type="button" onClick={closeReviewDrawer}>
                          <X size={16} aria-hidden="true" />
                          Close
                        </button>
                      </div>
                      <div className="admin-editor-heading">
                        <p className="admin-eyebrow">Post editor</p>
                        <span className={`ui-pill admin-status status-${selectedReviewRecord.status.toLowerCase()}`}>{contentStatusLabel(selectedReviewRecord.status)}</span>
                      </div>
                      <label className="admin-title-field">
                        <span>Title</span>
                        <input
                          value={isEditingReviewRecord ? reviewEditTitle : selectedReviewRecord.title}
                          onChange={(event) => {
                            if (!isEditingReviewRecord) {
                              beginReviewEdit(selectedReviewRecord);
                            }
                            setReviewEditTitle(event.target.value);
                          }}
                          readOnly={!canEditSelectedReviewRecord}
                        />
                        <small>{selectedReviewRecord.subtitle}</small>
                        {recordAstrologyFactsLabel(selectedReviewRecord) ? (
                          <small className="admin-astro-facts-line">{recordAstrologyFactsLabel(selectedReviewRecord)}</small>
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
                          <select value={reviewGenerationProvider} onChange={(event) => setReviewGenerationProvider(event.target.value as AdminGenerationProvider)} disabled={isGeneratingReviewDraft || isSelectedReviewPublished}>
                            <option value="openai">OpenAI</option>
                            <option value="claude">Claude</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => void generateReviewDraft(selectedReviewRecord)}
                          disabled={!canEditSelectedReviewRecord || isGeneratingReviewDraft || isSelectedReviewPublished}
                          title={isSelectedReviewPublished ? "Move this row back to Draft before regenerating approved copy." : undefined}
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
                            <strong>{selectedReviewDraftResult.sourceIds?.length ? selectedReviewDraftResult.sourceIds.join(", ") : "No authored source IDs returned"}</strong>
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

                      <label className="admin-review-tldr-editor">
                        <span>TLDR</span>
                        <textarea
                          rows={4}
                          value={selectedReviewTldr}
                          placeholder="Optional short reader-facing TLDR."
                          readOnly={!canEditSelectedReviewRecord}
                          onChange={(event) => {
                            if (!isEditingReviewRecord && selectedReviewRecord) {
                              beginReviewEdit(selectedReviewRecord);
                            }
                            setReviewEditSummary(stripTldrPrefix(event.target.value));
                          }}
                        />
                      </label>

                      <label className="admin-review-copy-editor">
                        <span>Body</span>
                        <textarea
                          rows={18}
                          value={selectedReviewText}
                          readOnly={!canEditSelectedReviewRecord}
                          onChange={(event) => {
                            if (!isEditingReviewRecord && selectedReviewRecord) {
                              beginReviewEdit(selectedReviewRecord);
                            }
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
                      <div className="admin-metadata-fields">
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
                            <option value="REVIEWED">Scheduled</option>
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
                                ...(nextCategory === "Natal Chart" ? { blockType: "placement" as AdminContentBlockFilter } : {})
                              });
                            }}
                          >
                            <option value="Sky">Sky</option>
                            <option value="Natal Aspects">Natal Aspects</option>
                            <option value="Natal Chart">Natal Chart</option>
                            <option value="Relationship">Relationship</option>
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
                      </div>
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
                  </>
                </section>
              </div>
            )}
          </>
        )}
      </section>

      {isPreviewOpen && (
        <div className="admin-preview-modal" role="dialog" aria-modal="true" aria-label="User preview">
          <div className="admin-preview-modal-shell">
            <header className="admin-preview-modal-header">
              <div>
                <p className="admin-eyebrow">User preview</p>
                <h2>{draft.headline || "Untitled"}</h2>
                <small>{draft.surface} / {draft.mode} / {draft.targetDate || "No date"}</small>
              </div>
              <button type="button" onClick={() => setIsPreviewOpen(false)} aria-label="Close preview">
                <X size={22} aria-hidden="true" />
              </button>
            </header>

            <article className="admin-preview-page">
              <p className="admin-eyebrow">User preview</p>
              <h1>{draft.headline || "Untitled"}</h1>
              {draft.summary && <strong>{draft.summary}</strong>}
              {draft.body ? (
                draft.body.split(/\n{2,}/).filter(Boolean).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))
              ) : (
                <p className="admin-preview-empty">No body copy yet.</p>
              )}
            </article>
          </div>
        </div>
      )}
    </main>
  );
}
