import { Activity, Archive, BarChart3, BookOpenText, Check, Database, Eye, FileText, KeyRound, LayoutDashboard, Pencil, Plus, RefreshCw, Save, Server, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { fallbackHookDefinitions, knowledgeIdsForFallbackHook, type FallbackHookContext } from "../content/fallbackHooks";
import type { GeneratedContentMode } from "../services/generatedContent";
import { getTldrAstroApiHealth, isTldrAstroApiConfigured, tldrAstroApiStatusUrl, type TldrAstroApiHealth } from "../services/tldrastroApi";
import "./admin.css";

type GeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";
type GeneratedContentSurfaceFilter = GeneratedContentSurface | "all";
type VoiceTemplateSurface = "sky" | "fullMoon" | "newMoon" | "eclipse" | "natal" | "synastry" | "composite";
type AdminDashboardPage = "content" | "settings" | "privateRows" | "templates" | "hooks" | "releaseNotes";
type AdminAccessStatus = "empty" | "checking" | "valid" | "invalid";
type AdminReviewSurface = "upcomingAspects" | "transitNatal" | "natalChart" | "relationshipLayer";
type AdminGenerationProvider = "claude" | "openai";
type AdminContentStatusFilter = "all" | "DRAFT" | "NEEDS_REVIEW" | "SCHEDULED" | "LIVE";
type AdminContentCategoryFilter = "all" | "Sky" | "Natal Aspects" | "Natal Chart" | "Relationship";
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
  { key: "LIVE", label: "Published" }
];

const contentCategoryFilters: Array<{ key: AdminContentCategoryFilter; label: string }> = [
  { key: "all", label: "All categories" },
  { key: "Sky", label: "Sky" },
  { key: "Natal Aspects", label: "Natal Aspects" },
  { key: "Natal Chart", label: "Natal Chart" },
  { key: "Relationship", label: "Relationship" }
];

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
  return "Content";
}

function adminPageBreadcrumb(activePage: AdminDashboardPage) {
  if (activePage === "releaseNotes") return "Admin / Release notes";
  if (activePage === "settings") return "Admin / Settings";
  return "Admin / Content";
}

function adminPageDescription(activePage: AdminDashboardPage) {
  if (activePage === "releaseNotes") {
    return "Track product updates across the internal dashboard and the public app in one chronological log.";
  }

  if (activePage === "settings") {
    return "Manage generation templates, voice guidance, access, calculation API status, and app content hooks.";
  }

  return "Manage every generated or authored astrology entry from one filtered CMS list.";
}

const releaseNotes: ReleaseNote[] = [
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
      "Name the shared feeling, the friction, what each person may expect, and the practical thing they need to understand.",
      "Use names when available. Be direct, specific, and human.",
      "Do not overstate fate, trauma, or permanence."
    ].join("\n"),
    generationGuide: [
      "Treat the contact as a dynamic between two people.",
      "Explain what one person activates in the other and how that may feel from both sides.",
      "For supportive aspects, name what feels easy and what still needs care.",
      "For challenging aspects, name the mismatch, expectation, or recurring tension in concrete terms.",
      "End with a practical relational move, such as naming expectations, slowing down, or separating intent from impact."
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
      "This can feel easy because...",
      "The tension is that...",
      "One person may expect...",
      "The other person may experience...",
      "This works best when both people...",
      "Name the expectation before it becomes resentment.",
      "The practical move is..."
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

function manualEntrySurface(category: AdminContentCategoryFilter, fallbackSurface: GeneratedContentSurfaceFilter): GeneratedContentSurface {
  if (category === "Sky") return "sky";
  if (category === "Natal Aspects" || category === "Natal Chart") return "natal";
  if (category === "Relationship") return "relationship";
  return fallbackSurface === "all" ? "sky" : fallbackSurface;
}

function manualEntryEventType(category: AdminContentCategoryFilter, surface: GeneratedContentSurface) {
  if (category === "Natal Aspects") return "manual-natal-aspect";
  if (category === "Natal Chart") return "manual-natal-chart";
  if (category === "Relationship") return "manual-relationship";
  if (surface === "sky") return "manual-sky";
  return "manual-entry";
}

function manualEntryRecord(category: AdminContentCategoryFilter, fallbackSurface: GeneratedContentSurfaceFilter): AdminReviewRecord {
  const surface = manualEntrySurface(category, fallbackSurface);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const targetDate = surface === "sky" ? dateInputValue(now) : null;
  const eventType = manualEntryEventType(category, surface);
  const title = "Untitled content";

  return {
    id: `manual:${timestamp}`,
    source: "global",
    surface,
    status: "DRAFT",
    mode: surface === "sky" ? "feed" : "in_depth",
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
      category: category === "all" ? contentCategoryFilters.find((item) => item.key !== "all" && item.key === "Sky")?.label ?? "Sky" : category
    },
    sourceSnapshot: {
      source: "admin-manual-entry",
      createdAt: now.toISOString()
    },
    reviewerNotes: "",
    updatedAt: now.toISOString()
  };
}

const skyBodyClauses: Record<string, string> = {
  Sun: "your identity and vitality",
  Moon: "your feelings and safety",
  Mercury: "your thinking and communication",
  Venus: "what you want and how you connect",
  Mars: "your drive and action",
  Jupiter: "your growth and appetite for risk",
  Saturn: "your need for structure and commitment",
  Uranus: "your need for change and freedom",
  Neptune: "your imagination and sensitivity",
  Pluto: "control and what you can't release",
  Chiron: "the tender place that wants healing",
  "True Node": "your direction and what you're moving toward",
  "North Node": "your direction and what you're moving toward"
};

const aspectVerbs: Record<string, string> = {
  trine: "trines",
  sextile: "sextiles",
  square: "squares",
  opposition: "opposes",
  conjunction: "conjoins"
};

const bodyActionLines: Record<string, string> = {
  Sun: "Good window to make the choice that actually reflects who you are.",
  Moon: "Good window to name what you feel and choose what steadies you.",
  Mercury: "Good day to make the call or send the thing you've been sitting on.",
  Venus: "Good window to ask for what feels good, fair, and connective.",
  Mars: "Good window to act on the decision instead of circling it.",
  Jupiter: "Good window to take the growth step without making it bigger than it needs to be.",
  Saturn: "Good window to commit to something or say the serious thing out loud.",
  Uranus: "Good window to change the stale pattern without blowing everything up.",
  Neptune: "Good window to listen to the feeling, then give it one clear shape.",
  Pluto: "Good window to be honest about what you are gripping and loosen one finger.",
  Chiron: "Good window to treat the sore spot with more skill than shame.",
  "True Node": "Good window to choose the next right direction, even if it is small.",
  "North Node": "Good window to choose the next right direction, even if it is small."
};

const bodyWatchLines: Record<string, string> = {
  Sun: "Watch for making it about pride when it needs to be about truth.",
  Moon: "Watch for reacting from fear before you know what you actually need.",
  Mercury: "Watch for saying the fast thing before you have the clean thought.",
  Venus: "Watch for smoothing things over instead of asking for what you want.",
  Mars: "Watch for forcing movement just because sitting still feels uncomfortable.",
  Jupiter: "Watch for overpromising because the bigger version feels more exciting.",
  Saturn: "Watch for turning a real responsibility into a wall.",
  Uranus: "Watch for needing freedom so badly that you skip the consequence.",
  Neptune: "Watch for confusing a feeling with a fact.",
  Pluto: "Watch for the urge to control what needs to be trusted or released.",
  Chiron: "Watch for protecting the wound so tightly that nothing can heal.",
  "True Node": "Watch for avoiding the direction that is already asking for you.",
  "North Node": "Watch for avoiding the direction that is already asking for you."
};

function capitalizeSentence(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function factString(record: AdminReviewRecord, keys: string[]) {
  for (const key of keys) {
    const value = record.facts?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function skyBodyClause(body: string) {
  return skyBodyClauses[body] ?? body.toLowerCase();
}

function skyBodyAction(body: string) {
  return bodyActionLines[body] ?? "Good window to use the opening while it is available.";
}

function skyBodyWatch(body: string) {
  return bodyWatchLines[body] ?? "Watch for turning a simple signal into a bigger story than it needs to be.";
}

function formatSkyBodyPosition(body: string, sign: string) {
  const bodyName = body === "Sun" || body === "Moon" || body === "True Node" || body === "North Node" ? `the ${body}` : body;

  return sign ? `${bodyName} in ${sign}` : bodyName;
}

function skyAspectDirectionLabel(direction: string) {
  return direction.toLowerCase() === "separating" ? "separating" : "forming";
}

function skyAspectToneClause(body1: string, aspect: string, body2: string) {
  const first = skyBodyClause(body1);
  const second = skyBodyClause(body2);

  if (aspect === "trine" || aspect === "sextile") {
    return `${capitalizeSentence(first)} and ${second} are on the same side today`;
  }

  if (aspect === "opposition") {
    return `${capitalizeSentence(first)} and ${second} are pulling against each other`;
  }

  if (aspect === "square") {
    return `${capitalizeSentence(first)} and ${second} are pressing on each other`;
  }

  if (aspect === "conjunction") {
    return `${capitalizeSentence(first)} and ${second} are moving through the same doorway today`;
  }

  return `${capitalizeSentence(first)} and ${second} are interacting today`;
}

function skyAspectActionLine(body1: string, aspect: string, body2: string) {
  const pairKey = `${body1}|${aspect}|${body2}`;
  const reversePairKey = `${body2}|${aspect}|${body1}`;
  const specificLines: Record<string, string> = {
    "Moon|trine|Saturn": "Good window to commit to something or say the serious thing out loud.",
    "Saturn|trine|Moon": "Good window to commit to something or say the serious thing out loud.",
    "Mercury|sextile|Mars": "Good day to make the call or send the thing you've been sitting on.",
    "Mars|sextile|Mercury": "Good day to make the call or send the thing you've been sitting on.",
    "Venus|opposition|Pluto": "Watch for the urge to control a connection instead of trusting it.",
    "Pluto|opposition|Venus": "Watch for the urge to control a connection instead of trusting it."
  };

  if (specificLines[pairKey] || specificLines[reversePairKey]) {
    return specificLines[pairKey] ?? specificLines[reversePairKey];
  }

  if (aspect === "trine" || aspect === "sextile") {
    return skyBodyAction(body1);
  }

  if (aspect === "square" || aspect === "opposition") {
    return skyBodyWatch(body2);
  }

  if (aspect === "conjunction") {
    return `${skyBodyAction(body1)} Just do not let one feeling become the whole room.`;
  }

  return skyBodyAction(body1);
}

function skyAspectFallbackCopy(record: AdminReviewRecord) {
  const body1 = factString(record, ["from", "body1", "planetA", "transitPlanet"]) || record.title.split(/\s+/)[0] || "This transit";
  const body2 = factString(record, ["to", "body2", "planetB", "natalPoint"]) || record.title.split(/\s+/).at(-1) || "another point";
  const aspect = factString(record, ["aspect", "type"]) || record.title.toLowerCase().match(/\b(trine|sextile|square|opposition|conjunction)\b/)?.[1] || "contacts";
  const sign1 = factString(record, ["fromSign", "sign1", "transitSign"]);
  const sign2 = factString(record, ["toSign", "sign2", "natalSign"]);
  const direction = skyAspectDirectionLabel(factString(record, ["direction"]));
  const date = adminDateLabel(factString(record, ["exactDate", "targetDate"]) || record.targetDate);
  const toneClause = skyAspectToneClause(body1, aspect, body2);
  const aspectVerb = aspectVerbs[aspect] ?? "contacts";
  const mechanicalLine = `${capitalizeSentence(formatSkyBodyPosition(body1, sign1))} ${aspectVerb} ${formatSkyBodyPosition(body2, sign2)}, ${direction} through ${date}.`;
  const actionLine = skyAspectActionLine(body1, aspect, body2);

  return `TLDR: ${toneClause}. ${mechanicalLine} ${actionLine}`;
}

function shouldUseDeterministicPlaceholder(record: AdminReviewRecord) {
  return record.source === "calculated" && !record.rawGlobalRow;
}

function fallbackReaderTextForReview(record: AdminReviewRecord) {
  if (record.surface === "sky" && shouldUseDeterministicPlaceholder(record)) {
    return skyAspectFallbackCopy(record);
  }

  if (record.summary.trim()) {
    return record.summary.trim();
  }

  const title = record.title.trim() || record.contentKey;
  const surface = generatedContentSurfaceLabels[record.surface].toLowerCase();

  return `${title} is active in the selected ${surface} window.`;
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

  return split.tldr ? split.body : value;
}

function normalizeReviewCopy(summary: string, body: string, fallbackBody: string) {
  const splitBody = splitLeadingTldr(body);
  const nextSummary = stripTldrPrefix(summary) || splitBody.tldr;
  const nextBody = (splitBody.tldr ? splitBody.body : body).trim() || bodyWithoutLeadingTldr(fallbackBody).trim() || fallbackBody.trim();

  return {
    summary: nextSummary,
    body: nextBody
  };
}

function readerFacingTextForReview(record: AdminReviewRecord) {
  if (shouldUseDeterministicPlaceholder(record)) {
    return fallbackReaderTextForReview(record);
  }

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
    normalizedEventType.includes("natal-aspect")
    || normalizedContentKey.includes("natal-") && /\b(conjunction|sextile|square|trine|opposition)\b/.test(normalizedContentKey)
  ) {
    return "Natal Aspects";
  }

  return "Natal Chart";
}

function contentStatusLabel(status: string) {
  if (status === "LIVE") return "Published";
  if (status === "REVIEWED") return "Scheduled";
  if (status === "ERROR") return "Needs Review";
  if (status === "DRAFT") return "Draft";

  return status;
}

function isDraftWithCopy(record: AdminReviewRecord) {
  return record.status === "DRAFT" && (record.source === "saved" || record.source === "global" || Boolean(record.body.trim() || record.summary.trim()));
}

function recordMatchesContentStatus(record: AdminReviewRecord, filter: AdminContentStatusFilter) {
  if (filter === "all") return true;
  if (filter === "DRAFT") return isDraftWithCopy(record);
  if (filter === "NEEDS_REVIEW") return record.status === "ERROR" || (record.status === "DRAFT" && !isDraftWithCopy(record));
  if (filter === "SCHEDULED") return record.status === "REVIEWED";
  if (filter === "LIVE") return record.status === "LIVE";

  return true;
}

function contentStatusCounts(records: AdminReviewRecord[]) {
  return {
    all: records.length,
    DRAFT: records.filter((record) => recordMatchesContentStatus(record, "DRAFT")).length,
    NEEDS_REVIEW: records.filter((record) => recordMatchesContentStatus(record, "NEEDS_REVIEW")).length,
    SCHEDULED: records.filter((record) => recordMatchesContentStatus(record, "SCHEDULED")).length,
    LIVE: records.filter((record) => recordMatchesContentStatus(record, "LIVE")).length
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

function recordOrbLabel(record: AdminReviewRecord) {
  const orb = record.facts?.orb;

  return typeof orb === "number" ? `${orb.toFixed(1)}°` : typeof orb === "string" && orb ? `${orb}°` : "Not set";
}

function recordDirectionLabel(record: AdminReviewRecord) {
  const direction = record.facts?.direction;

  return typeof direction === "string" && direction ? direction : "Not set";
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

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminRequestError";
    this.status = status;
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
      throw new AdminRequestError(payload?.error ?? `${response.status} error from ${path.split("?")[0]}.`, response.status);
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
  const [reviewSurface, setReviewSurface] = useState<AdminReviewSurface>("upcomingAspects");
  const [dateStart, setDateStart] = useState(() => dateInputValue());
  const [dateEnd, setDateEnd] = useState(() => dateInputValue(addDays(new Date(), 30)));
  const [personQuery, setPersonQuery] = useState("");
  const [rows, setRows] = useState<AdminGeneratedContentRow[]>([]);
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
  const [reviewGenerationProvider, setReviewGenerationProvider] = useState<AdminGenerationProvider>("claude");
  const [isGeneratingReviewDraft, setIsGeneratingReviewDraft] = useState(false);
  const [draft, setDraft] = useState<AdminGeneratedContentDraft>(() => createAdminDraft());
  const [message, setMessage] = useState("Enter the content generation secret to review drafts.");
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
  const [apiStatus, setApiStatus] = useState<AdminApiStatusState>({
    state: isTldrAstroApiConfigured ? "idle" : "notConfigured",
    checkedAt: null,
    latencyMs: null,
    health: null,
    error: isTldrAstroApiConfigured ? null : "VITE_TLDRASTRO_API_URL is not configured."
  });
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;
  const canUseApi = secret.trim().length > 0;
  const allContentRecords = useMemo(() => {
    const normalizedPersonQuery = personQuery.trim().toLowerCase();

    return reviewRecords
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
      .filter((record) => recordMatchesContentStatus(record, contentStatusFilter))
      .filter((record) => categoryFilter === "all" || contentCategoryLabel(record) === categoryFilter)
      .sort((first, second) => {
        const firstDate = first.targetDate ?? "";
        const secondDate = second.targetDate ?? "";

        if (firstDate !== secondDate) {
          return firstDate.localeCompare(secondDate);
        }

        return first.title.localeCompare(second.title);
      });
  }, [categoryFilter, contentStatusFilter, personQuery, reviewRecords]);
  const cmsStatusCounts = useMemo(() => contentStatusCounts(reviewRecords), [reviewRecords]);
  const selectedReviewRecord = allContentRecords.find((record) => record.id === selectedReviewId) ?? allContentRecords[0] ?? null;
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
  const isSelectedReviewPublished = false;
  const approveButtonLabel = selectedReviewRecord?.status === "REVIEWED" ? "Publish Live" : "Approve";
  const isDateFilterActive = categoryUsesDateFilter(categoryFilter);

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
      const mergedRecords = new Map<string, AdminReviewRecord>();

      payloads.flatMap((payload) => payload.rows ?? []).forEach((record) => {
        const mergeKey = `${record.source}:${record.surface}:${record.contentKey}:${record.targetDate ?? ""}:${record.subjectId ?? ""}`;
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

      setMessage(prompts[0] ?? `Loaded ${nextRecords.length} content rows.`);
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
    setMessage(nextSecret ? "Checking admin access..." : "Enter the content generation secret to review drafts.");
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

  function beginReviewEdit(record: AdminReviewRecord) {
    const copy = readerFacingTextForReview(record);
    setEditingReviewId(record.id);
    setReviewEditTitle(record.title);
    setReviewEditSummary(reviewTldrForReview(record));
    setReviewEditBody(bodyWithoutLeadingTldr(copy));
  }

  function cancelReviewEdit() {
    setEditingReviewId(null);
    setReviewEditTitle("");
    setReviewEditSummary("");
    setReviewEditBody("");
  }

  async function saveReviewEdit(record: AdminReviewRecord, requestedStatus?: GeneratedContentStatus) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const nextStatus = statusForReviewSave(record, requestedStatus ?? record.status);
      const isActiveEdit = editingReviewId === record.id;
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
            contentKey: record.contentKey,
            surface: record.surface,
            mode: record.mode,
            status: nextStatus,
            eventType: record.eventType || "manual-review",
            targetDate: record.targetDate || null,
            headline: nextTitle,
            summary: nextSummary,
            body: nextBody,
            sections: record.sections,
            facts: record.facts ?? {},
            sourceSnapshot: {
              ...(record.sourceSnapshot ?? {}),
              adminReviewSource: record.source,
              savedFromReviewRecordId: record.id
            },
            knowledgeIds: [],
            reviewerNotes: record.reviewerNotes ?? ""
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
              status: nextStatus,
              title: nextTitle,
              summary: nextSummary,
              body: nextBody,
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

  async function generateReviewDraft(record: AdminReviewRecord) {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    const fallbackText = fallbackReaderTextForReview(record);
    setEditingReviewId(record.id);
    setReviewEditTitle(record.title);
    setReviewEditSummary(splitLeadingTldr(fallbackText).tldr);
    setReviewEditBody(bodyWithoutLeadingTldr(fallbackText));
    setIsGeneratingReviewDraft(true);
    setMessage("Generating a draft. The deterministic placeholder is loaded while the provider responds.");
    try {
      const payload = await adminJsonRequest<{
        ok: boolean;
        generated: {
          headline?: string;
          summary?: string;
          body?: string;
          sections?: Array<{ heading: string; body: string }>;
          model?: string;
          qualityWarning?: string;
        };
        saved?: AdminGeneratedContentRow[];
      }>(
        "/api/generate-content",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            contentKey: record.contentKey,
            surface: record.surface,
            mode: record.mode,
            eventType: record.eventType || "manual-review",
            headline: record.title,
            targetDate: record.targetDate || undefined,
            facts: record.facts ?? {},
            sourceSnapshot: {
              ...(record.sourceSnapshot ?? {}),
              adminReviewSource: record.source,
              generatedFromReviewRecordId: record.id
            },
            knowledgeIds: [],
            provider: reviewGenerationProvider,
            save: false,
            allowQualityFallback: true,
            voiceNotes: [
              voiceNotesFor(record.surface, record.eventType, record.reviewerNotes ?? ""),
              "Write a daily astrology transit interpretation in the TLDR Astro voice.",
              "Use this structure in clear paragraphs, not bullets: TLDR, Planetary meaning, How it may show up, How to work with it, Timing.",
              "The body text shown to the editor must start with 'TLDR:' and then use visible labels before each following paragraph: Planetary meaning:, How it may show up:, How to work with it:, Timing:.",
              "In the TLDR paragraph, start with one plain-language situation the reader may notice. Mention the aspect and date only after the human situation is clear.",
              "Keep the factual astrology headline unchanged, but keep the first reader-facing sentence useful without astrology knowledge.",
              "Explain each planet in everyday terms, then explain what this aspect does to that pairing.",
              "Give 2-3 concrete life examples: a bill, boundary, conversation, deadline, commitment, choice, pattern, responsibility, relationship, work, money, emotions, or timing.",
              "Give practical guidance tied directly to the planets and aspect. Avoid slogans, productivity coaching, guru language, and therapist register.",
              "Use soft certainty: may, can, often, more likely, easier, harder.",
              "Avoid: not through X but through Y, this is not dramatic astrology, the invitation is, lean into, step into, honor, release, unlock, universe, cosmic, manifesting.",
              "Do not mention schemas, source records, APIs, dashboards, generation process, natal houses, or private personalization."
            ].filter(Boolean).join("\n\n")
          })
        }
      );
      const generated = payload.generated;
      const savedRow = payload.saved?.[0] ?? null;
      const nextTitle = generated.headline?.trim() || record.title;
      const normalizedGeneratedCopy = normalizeReviewCopy(
        generated.summary?.trim() || "",
        generated.body?.trim() || "",
        fallbackReaderTextForReview(record)
      );
      const nextSummary = normalizedGeneratedCopy.summary;
      const nextBody = normalizedGeneratedCopy.body;

      setEditingReviewId(record.id);
      setReviewEditTitle(nextTitle);
      setReviewEditSummary(nextSummary || nextBody.split(/\n+/)[0]?.trim() || nextBody);
      setReviewEditBody(nextBody);
      setReviewRecords((currentRecords) => currentRecords.map((currentRecord) => (
        currentRecord.id === record.id
          ? {
              ...currentRecord,
              title: nextTitle,
              summary: nextSummary,
              body: nextBody,
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
        : `Generated a ${reviewGenerationProvider === "claude" ? "Claude" : "OpenAI"} draft. Save or publish when it looks right.`);
    } catch (error) {
      if (error instanceof AdminRequestError && error.status === 401) {
        setAccessStatus("invalid");
      }
      setMessage(`${adminErrorMessage(error, "Could not generate a review draft.")} The deterministic placeholder is loaded for editing.`);
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

  function showQueue(nextStatus: GeneratedContentStatus | "all", nextSurface = surface) {
    const nextReviewSurface = reviewSurfaceForGeneratedSurface(nextSurface === "all" ? "sky" : nextSurface);

    setActivePage("content");
    setStatus(nextStatus);
    setContentStatusFilter(nextStatus === "LIVE" ? "LIVE" : nextStatus === "REVIEWED" ? "SCHEDULED" : nextStatus === "DRAFT" ? "DRAFT" : "all");
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
    setMessage("Manual entry ready. Add a title and body, then save or publish.");
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

      if (row) {
        setSelectedId(row.id);
        setDraft(adminDraftFromRow(row));
      } else {
        setDraft((currentDraft) => ({
          ...currentDraft,
          headline: payload.generated.headline,
          summary: payload.generated.summary,
          body: payload.generated.body,
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
                            <span className={`admin-release-tag admin-release-tag-${area.toLowerCase()}`} key={area}>
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
                    <span className={`admin-status status-${row.status.toLowerCase()}`}>{row.status}</span>
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
                <p>{reviewCounts.total} rows across generated, authored, global, and personal content.</p>
              </div>
              <div className="admin-new-actions" aria-label="New content">
                <button type="button" onClick={() => void prepopulateContentQueue()} disabled={isLoading || !canUseApi}>
                  <Sparkles size={16} aria-hidden="true" />
                  Add Sky Drafts
                </button>
                <button type="button" onClick={() => void startNewContent()} disabled={isLoading || !canUseApi}>
                  <Plus size={16} aria-hidden="true" />
                  Manual Entry
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
                  <span>Person or subject</span>
                  <input value={personQuery} onChange={(event) => setPersonQuery(event.target.value)} placeholder="User, chart, content key" />
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

                <div className="admin-content-table">
                  <div className="admin-content-table-head" aria-hidden="true">
                    <span>Title</span>
                    <span>Status</span>
                  </div>
                  {allContentRecords.map((record) => (
                    <button
                      type="button"
                      key={record.id}
                      className={`admin-content-row ${record.id === selectedReviewRecord?.id ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedReviewId(record.id);
                        cancelReviewEdit();
                        if (record.rawGlobalRow) {
                          setSelectedId(record.rawGlobalRow.id);
                          setDraft(adminDraftFromRow(record.rawGlobalRow));
                          void loadRowDetails(record.rawGlobalRow.id);
                        }
                      }}
                    >
                      <span className="admin-content-row-title">{record.title}</span>
                      <span className={`admin-status status-${record.status.toLowerCase()}`}>{contentStatusLabel(record.status)}</span>
                      <span className="admin-content-row-meta">{contentCategoryLabel(record)} · {adminDateLabel(record.targetDate)}</span>
                    </button>
                  ))}
                  {allContentRecords.length === 0 && (
                    <p className="admin-empty">No content records match these filters yet.</p>
                  )}
                </div>
              </aside>

              <section className="admin-editor-panel admin-review-detail" aria-label="Generated content record detail">
                {selectedReviewRecord ? (
                  <>
                    <div className="admin-editor-toolbar">
                      <div className="admin-editor-heading">
                        <p className="admin-eyebrow">Post editor</p>
                        <span className={`admin-status status-${selectedReviewRecord.status.toLowerCase()}`}>{contentStatusLabel(selectedReviewRecord.status)}</span>
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
                      </label>
                      <div className="admin-toolbar-actions">
                        <button type="button" onClick={() => void saveReviewEdit(selectedReviewRecord, "ERROR")} disabled={!canEditSelectedReviewRecord || isLoading}>
                          <Eye size={16} aria-hidden="true" />
                          Flag
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
                            <option value="claude">Claude</option>
                            <option value="openai">OpenAI</option>
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
                      <dl>
                        <div>
                          <dt>Exact date</dt>
                          <dd>{adminDateLabel(selectedReviewRecord.targetDate)}</dd>
                        </div>
                        <div>
                          <dt>Orb</dt>
                          <dd>{recordOrbLabel(selectedReviewRecord)}</dd>
                        </div>
                        <div>
                          <dt>Forming/separating</dt>
                          <dd>{recordDirectionLabel(selectedReviewRecord)}</dd>
                        </div>
                        <div>
                          <dt>Surface</dt>
                          <dd>{generatedContentSurfaceLabels[selectedReviewRecord.surface]}</dd>
                        </div>
                        <div>
                          <dt>Category</dt>
                          <dd>{contentCategoryLabel(selectedReviewRecord)}</dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>{contentStatusLabel(selectedReviewRecord.status)}</dd>
                        </div>
                      </dl>
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
                ) : (
                  <div className="admin-review-empty-detail">
                    <p className="admin-eyebrow">No record selected</p>
                    <h2>Choose a content row.</h2>
                    <p>Use the date range and review surface filters to load the person and time window you want to audit.</p>
                  </div>
                )}
              </section>
            </section>
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
