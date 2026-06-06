import { Archive, BarChart3, Check, Eye, FileText, KeyRound, LayoutDashboard, Plus, RefreshCw, Save, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { fallbackHookDefinitions, knowledgeIdsForFallbackHook, type FallbackHookContext } from "../content/fallbackHooks";
import type { GeneratedContentMode } from "../services/generatedContent";
import "./admin.css";

type GeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";
type VoiceTemplateSurface = "sky" | "fullMoon" | "newMoon" | "eclipse" | "natal" | "synastry" | "composite";
type AdminDashboardPage = "review" | "templates" | "hooks";
type VoiceTemplateConfig = {
  template: string;
  generationGuide: string;
  bannedWords: string;
  phraseBank: string;
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
    surface: GeneratedContentSurface | "all";
  };
};

const adminSecretStorageKey = "tldrastro:contentAdminSecret";
const adminVoiceTemplateStorageKey = "tldrastro:contentVoiceTemplates";

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
  "friends.relationship-timing": { transitPlanet: "Pluto", aspect: "opposition", natalPoint: "Descendant" },
  "friends.circle-feed": { topic: "saturn" },
  "settings.life-area-focus": { topic: "career" }
};

function adminPageTitle(activePage: AdminDashboardPage) {
  if (activePage === "templates") return "Templates & Voice";
  if (activePage === "hooks") return "Content Hooks";
  return "Generated Content";
}

function adminPageBreadcrumb(activePage: AdminDashboardPage) {
  if (activePage === "templates") return "Admin / Content generation / Templates & voice";
  if (activePage === "hooks") return "Admin / Content generation / Content hooks";
  return "Admin / Content generation / Review queue";
}

function adminPageDescription(activePage: AdminDashboardPage) {
  if (activePage === "templates") {
    return "Define the voice layer OpenAI should use for each astrology content family before drafts are generated.";
  }

  if (activePage === "hooks") {
    return "Review the named hook points the app uses when a surface needs approved generated or voice-backed copy.";
  }

  return "Generate, review, approve, publish, archive, and delete OpenAI-written astrology content before it appears in the public app.";
}

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

function createAdminDraft(date = dateInputValue()): AdminGeneratedContentDraft {
  return {
    contentKey: `sky-daily-${date}`,
    surface: "sky",
    mode: "feed",
    status: "DRAFT",
    eventType: "daily_sky",
    targetDate: date,
    headline: "",
    summary: "",
    body: "",
    sectionsJson: "[]",
    factsJson: JSON.stringify({
      date,
      note: "Add the current astrology facts that should guide this interpretation."
    }, null, 2),
    sourceSnapshotJson: "{}",
    knowledgeIds: "",
    reviewerNotes: ""
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

async function adminJsonRequest<T>(path: string, secret: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
      ...(options.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => null) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with ${response.status}.`);
  }

  return payload;
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
  const [surface, setSurface] = useState<GeneratedContentSurface | "all">("sky");
  const [status, setStatus] = useState<GeneratedContentStatus | "all">("DRAFT");
  const [rows, setRows] = useState<AdminGeneratedContentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminGeneratedContentDraft>(() => createAdminDraft());
  const [message, setMessage] = useState("Enter the content generation secret to review drafts.");
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
  const [activePage, setActivePage] = useState<AdminDashboardPage>("review");
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;
  const canUseApi = secret.trim().length > 0;

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
        limit: "75"
      });

      if (nextSurface !== "all") {
        params.set("surface", nextSurface);
      }

      const payload = await adminJsonRequest<{ ok: boolean; rows: AdminGeneratedContentRow[] }>(
        `/api/admin/generated-content?${params}`,
        secret
      );

      setRows(payload.rows ?? []);
      setMessage(`Loaded ${(payload.rows ?? []).length} ${nextStatus.toLowerCase()} rows. Status totals are current.`);

      if (!payload.rows?.some((row) => row.id === selectedId)) {
        const firstRow = payload.rows?.[0] ?? null;
        setSelectedId(firstRow?.id ?? null);
        if (firstRow) {
          setDraft(adminDraftFromRow(firstRow));
          void loadRowDetails(firstRow.id);
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load generated content.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (canUseApi) {
      void loadRows();
    }
  }, [secret]);

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
    try {
      if (nextSecret) {
        window.localStorage.setItem(adminSecretStorageKey, nextSecret);
      } else {
        window.localStorage.removeItem(adminSecretStorageKey);
      }
    } catch {
      return;
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
      setMessage(error instanceof Error ? error.message : "Could not load row details.");
    }
  }

  function selectRow(row: AdminGeneratedContentRow) {
    setSelectedId(row.id);
    setDraft(adminDraftFromRow(row));
    void loadRowDetails(row.id);
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

  function voiceNotesForDraft(draftWithFacts: AdminGeneratedContentDraft) {
    const surfaceKey = templateSurfaceFor(draftWithFacts.surface, draftWithFacts.eventType);
    const config = voiceTemplates[surfaceKey];
    const template = config.template.trim();
    const generationGuide = config.generationGuide.trim();
    const bannedWords = config.bannedWords.trim();
    const phraseBank = config.phraseBank.trim();
    const rowNotes = draftWithFacts.reviewerNotes.trim();

    return [
      template ? `SURFACE VOICE TEMPLATE (${voiceTemplateLabels[surfaceKey]})\n${template}` : "",
      generationGuide ? `AI GENERATION GUIDE\nFollow these interpretation rules for this content type:\n${generationGuide}` : "",
      bannedWords ? `BANNED WORDS AND PHRASES\nDo not use these words, phrases, constructions, or close variants:\n${bannedWords}` : "",
      phraseBank ? `LANGUAGE AND PHRASE BANK\nPrefer this kind of language when it fits the facts. Do not force every phrase:\n${phraseBank}` : "",
      rowNotes ? `ROW-SPECIFIC EDITORIAL NOTES\n${rowNotes}` : ""
    ].filter(Boolean).join("\n\n");
  }

  function showQueue(nextStatus: GeneratedContentStatus | "all", nextSurface = surface) {
    setActivePage("review");
    setStatus(nextStatus);
    setSurface(nextSurface);
    void loadRows(nextStatus, nextSurface);
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
      setMessage("Loaded current Sky facts. You can generate now.");
      return nextDraft;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load astrology facts.");
      return baseDraft;
    } finally {
      if (shouldManageLoading) {
        setIsLoading(false);
      }
    }
  }

  async function startNewContent() {
    const nextDraft = createAdminDraft();

    setDraft(nextDraft);
    setSelectedId(null);
    setSurface(nextDraft.surface);
    setStatus(nextDraft.status);
    setActivePage("review");
    setAreGenerationInputsOpen(true);
    setMessage("New Sky draft ready. Loading astrology facts...");
    await loadFactsForDraft(nextDraft);
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
      setMessage(error instanceof Error ? error.message : "Could not create draft.");
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

      setMessage("Generated a new OpenAI draft.");
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate content.");
    } finally {
      setIsLoading(false);
    }
  }

  async function prepopulateSkyQueue() {
    if (!canUseApi) {
      setMessage("Add the content generation secret first.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = await adminJsonRequest<{
        ok: boolean;
        targetDate: string;
        inserted: number;
        rows: AdminGeneratedContentRow[];
      }>(
        "/api/admin/prepopulate-content",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            surface: "sky",
            targetDate: draft.targetDate || dateInputValue()
          })
        }
      );

      setSurface("sky");
      setStatus("DRAFT");
      setMessage(`Created ${payload.inserted} Sky draft rows for ${payload.targetDate}. Open each row and click Generate when you are ready for OpenAI copy.`);
      await loadRows("DRAFT", "sky");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the Sky review queue.");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveDraft(nextStatus = draft.status) {
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
      setMessage(error instanceof Error ? error.message : "Could not save draft.");
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
      setDraft(createAdminDraft());
      setSelectedId(null);
      setMessage("Deleted.");
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete row.");
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
            className={activePage === "review" && surface === "sky" && status === "DRAFT" ? "active" : ""}
            type="button"
            onClick={() => showQueue("DRAFT", "sky")}
            disabled={!canUseApi}
            aria-current={activePage === "review" && surface === "sky" && status === "DRAFT" ? "page" : undefined}
          >
            <LayoutDashboard size={18} aria-hidden="true" />
            Content Review
          </button>
          <button
            className={activePage === "templates" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("templates")}
            aria-current={activePage === "templates" ? "page" : undefined}
          >
            <Sparkles size={18} aria-hidden="true" />
            Templates & Voice
          </button>
          <button
            className={activePage === "hooks" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("hooks")}
            aria-current={activePage === "hooks" ? "page" : undefined}
          >
            <KeyRound size={18} aria-hidden="true" />
            Content Hooks
          </button>
          <button
            className={activePage === "review" && status === "DRAFT" && !(surface === "sky") ? "active" : ""}
            type="button"
            onClick={() => showQueue("DRAFT")}
            disabled={!canUseApi}
            aria-current={activePage === "review" && status === "DRAFT" && !(surface === "sky") ? "page" : undefined}
          >
            <FileText size={18} aria-hidden="true" />
            Drafts
          </button>
          <button
            className={activePage === "review" && status === "LIVE" ? "active" : ""}
            type="button"
            onClick={() => showQueue("LIVE")}
            disabled={!canUseApi}
            aria-current={activePage === "review" && status === "LIVE" ? "page" : undefined}
          >
            <Eye size={18} aria-hidden="true" />
            Live Content
          </button>
          <button
            className={activePage === "review" && status === "REVIEWED" ? "active" : ""}
            type="button"
            onClick={() => showQueue("REVIEWED")}
            disabled={!canUseApi}
            aria-current={activePage === "review" && status === "REVIEWED" ? "page" : undefined}
          >
            <Check size={18} aria-hidden="true" />
            Reviewed
          </button>
        </nav>

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
              Save Secret
            </button>
          </form>
        </section>

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
          {activePage === "review" && (
            <div className="admin-header-actions">
              <button type="button" onClick={() => void loadRows()} disabled={isLoading || !canUseApi}>
                <RefreshCw size={16} aria-hidden="true" />
                Refresh
              </button>
              <button className="admin-primary-button" type="button" onClick={() => void startNewContent()}>
                <Plus size={16} aria-hidden="true" />
                New Content
              </button>
              <button type="button" onClick={() => void prepopulateSkyQueue()} disabled={isLoading || !canUseApi}>
                <Sparkles size={16} aria-hidden="true" />
                Create Sky Queue
              </button>
            </div>
          )}
        </header>

        <section className="admin-message-card" aria-live="polite">
          <Sparkles size={18} aria-hidden="true" />
          <span>{message}</span>
        </section>

        {activePage === "hooks" ? (
          <section id="content-hooks" className="admin-template-panel admin-hooks-page" aria-label="Content hook catalog">
            <div className="admin-template-header">
              <div>
                <p className="admin-eyebrow">Hook catalog</p>
                <h2>Named Content Points</h2>
                <p>These are the app surfaces that need LIVE generated content or approved voice-backed copy. Use the labels below to identify what needs a generated row, template, or source-backed rewrite.</p>
              </div>
              <div className="admin-template-actions">
                <button type="button" onClick={() => setActivePage("review")}>
                  <LayoutDashboard size={16} aria-hidden="true" />
                  Back to Review
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
                <p>Set the reusable instructions OpenAI should follow when generating this type of astrology content. Save here first, then go back to Content Review and generate drafts.</p>
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
              These templates are saved in this browser for now. They shape the OpenAI draft before review, while the knowledge base and current astrology facts keep the interpretation grounded.
            </p>
          </section>
        ) : (
          <>
            <section className="admin-metrics" aria-label="Content status summary">
              <article>
                <span>Total rows</span>
                <strong>{totalMetricRows}</strong>
                <small>{surface === "all" ? "All surfaces" : surface}</small>
              </article>
              <article>
                <span>Drafts</span>
                <strong>{statusMetrics.DRAFT}</strong>
                <small>Needs editorial review</small>
              </article>
              <article>
                <span>Reviewed</span>
                <strong>{statusMetrics.REVIEWED}</strong>
                <small>Ready to publish</small>
              </article>
              <article>
                <span>Live</span>
                <strong>{statusMetrics.LIVE}</strong>
                <small>Visible in app</small>
              </article>
              <article>
                <span>Errors</span>
                <strong>{statusMetrics.ERROR}</strong>
                <small>Needs attention</small>
              </article>
            </section>

            <section className="admin-workbench">
          <aside className="admin-list-panel" aria-label="Generated content list">
            <div className="admin-panel-header">
              <div>
                <p className="admin-eyebrow">Review queue</p>
                <h2>Content Rows</h2>
              </div>
              <BarChart3 size={18} aria-hidden="true" />
            </div>

            <div className="admin-controls">
              <label>
                <span>Surface</span>
                <select value={surface} onChange={(event) => {
                  const nextSurface = event.target.value as GeneratedContentSurface | "all";
                  setSurface(nextSurface);
                  void loadRows(status, nextSurface);
                }}>
                  <option value="all">All</option>
                  <option value="sky">Sky</option>
                  <option value="you">You</option>
                  <option value="natal">Natal</option>
                  <option value="synastry">Synastry</option>
                  <option value="composite">Composite</option>
                  <option value="relationship">Relationship</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={status} onChange={(event) => {
                  const nextStatus = event.target.value as GeneratedContentStatus | "all";
                  setStatus(nextStatus);
                  void loadRows(nextStatus, surface);
                }}>
                  <option value="DRAFT">Draft</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="LIVE">Live</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="ERROR">Error</option>
                  <option value="all">All</option>
                </select>
              </label>
            </div>

            <div className="admin-row-list">
              {rows.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  className={`admin-row-card ${row.id === selectedId ? "selected" : ""}`}
                  onClick={() => selectRow(row)}
                >
                  <span className={`admin-status status-${row.status.toLowerCase()}`}>{row.status}</span>
                  <strong>{row.headline || row.content_key}</strong>
                  <small>{row.surface} / {row.mode} / {adminDateLabel(row.target_date)}</small>
                </button>
              ))}
              {rows.length === 0 && (
                <p className="admin-empty">No rows match this filter yet.</p>
              )}
            </div>
          </aside>

          <section className="admin-editor-panel" aria-label="Generated content editor">
            <div className="admin-editor-toolbar">
              <div>
                <p className="admin-eyebrow">{selectedRow ? "Editing existing row" : "Creating new row"}</p>
                <h2>{draft.headline || draft.contentKey}</h2>
                <small>{draft.surface} / {draft.mode} / {draft.targetDate || "No date"}</small>
              </div>
              <div className="admin-toolbar-actions">
                <button type="button" onClick={() => setIsPreviewOpen(true)}>
                  <Eye size={16} aria-hidden="true" />
                  Preview
                </button>
                <button type="button" onClick={() => void loadFactsForDraft()} disabled={isLoading || !canUseApi}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Load Facts
                </button>
                <button type="button" onClick={generateDraft} disabled={isLoading || !canUseApi}>
                  <Sparkles size={16} aria-hidden="true" />
                  Generate
                </button>
                <button type="button" onClick={() => void saveDraft()} disabled={isLoading || !canUseApi}>
                  <Save size={16} aria-hidden="true" />
                  Save
                </button>
                <button type="button" onClick={() => void saveDraft("REVIEWED")} disabled={isLoading || !draft.id}>
                  <Check size={16} aria-hidden="true" />
                  Reviewed
                </button>
                <button className="admin-live-button" type="button" onClick={() => void saveDraft("LIVE")} disabled={isLoading || !draft.id}>
                  <Check size={16} aria-hidden="true" />
                  Publish
                </button>
                <button type="button" onClick={() => void saveDraft("ARCHIVED")} disabled={isLoading || !draft.id}>
                  <Archive size={16} aria-hidden="true" />
                  Archive
                </button>
                <button className="admin-danger-button" type="button" onClick={() => void deleteDraft()} disabled={isLoading || !draft.id}>
                  <Trash2 size={16} aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>

            <div className="admin-editor-grid">
              <section className="admin-edit-card">
                <div className="admin-form-grid">
                  <label>
                    <span>Content key</span>
                    <input value={draft.contentKey} onChange={(event) => updateDraft("contentKey", event.target.value)} />
                  </label>
                  <label>
                    <span>Surface</span>
                    <select value={draft.surface} onChange={(event) => updateDraft("surface", event.target.value as GeneratedContentSurface)}>
                      <option value="sky">Sky</option>
                      <option value="you">You</option>
                      <option value="natal">Natal</option>
                      <option value="synastry">Synastry</option>
                      <option value="composite">Composite</option>
                      <option value="relationship">Relationship</option>
                    </select>
                  </label>
                  <label>
                    <span>Mode</span>
                    <select value={draft.mode} onChange={(event) => updateDraft("mode", event.target.value as GeneratedContentMode)}>
                      <option value="feed">Feed</option>
                      <option value="in_depth">In-depth</option>
                      <option value="article">Article</option>
                    </select>
                  </label>
                  <label>
                    <span>Status</span>
                    <select value={draft.status} onChange={(event) => updateDraft("status", event.target.value as GeneratedContentStatus)}>
                      <option value="DRAFT">Draft</option>
                      <option value="REVIEWED">Reviewed</option>
                      <option value="LIVE">Live</option>
                      <option value="ARCHIVED">Archived</option>
                      <option value="ERROR">Error</option>
                    </select>
                  </label>
                  <label>
                    <span>Event type</span>
                    <input value={draft.eventType} onChange={(event) => updateDraft("eventType", event.target.value)} />
                  </label>
                  <label>
                    <span>Target date</span>
                    <input type="date" value={draft.targetDate} onChange={(event) => updateDraft("targetDate", event.target.value)} />
                  </label>
                </div>

                <label className="admin-field-wide">
                  <span>Headline</span>
                  <input value={draft.headline} onChange={(event) => updateDraft("headline", event.target.value)} />
                </label>
                <label className="admin-field-wide">
                  <span>Summary</span>
                  <textarea value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} rows={3} />
                </label>
                <label className="admin-field-wide">
                  <span>Body</span>
                  <textarea value={draft.body} onChange={(event) => updateDraft("body", event.target.value)} rows={12} />
                </label>
                <label className="admin-field-wide">
                  <span>Reviewer notes / extra voice notes</span>
                  <textarea value={draft.reviewerNotes} onChange={(event) => updateDraft("reviewerNotes", event.target.value)} rows={3} />
                </label>
              </section>

              <details
                className="admin-advanced admin-generation-inputs"
                open={areGenerationInputsOpen}
                onToggle={(event) => setAreGenerationInputsOpen(event.currentTarget.open)}
              >
                <summary>Generation inputs</summary>
                <label>
                  <span>Knowledge IDs, comma separated</span>
                  <input value={draft.knowledgeIds} onChange={(event) => updateDraft("knowledgeIds", event.target.value)} />
                </label>
                <label>
                  <span>Facts JSON</span>
                  <textarea value={draft.factsJson} onChange={(event) => updateDraft("factsJson", event.target.value)} rows={8} />
                </label>
                <label>
                  <span>Source snapshot JSON</span>
                  <textarea value={draft.sourceSnapshotJson} onChange={(event) => updateDraft("sourceSnapshotJson", event.target.value)} rows={8} />
                </label>
                <label>
                  <span>Sections JSON</span>
                  <textarea value={draft.sectionsJson} onChange={(event) => updateDraft("sectionsJson", event.target.value)} rows={6} />
                </label>
              </details>
            </div>
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
